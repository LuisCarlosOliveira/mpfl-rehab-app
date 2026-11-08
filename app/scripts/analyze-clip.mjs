// Runs the real pose pipeline of the app on a local video file and writes numbers only.
// Usage: node scripts/analyze-clip.mjs <video> --leg left|right --exercise heel-slide|mini-squat|straight-leg-raise|seated-hold
//          [--reference <csv>] [--target <deg>] [--max-flexion <deg>] [--hold-seconds <s>] [--out <folder>]
//          [--baseline <deg> | --baseline-from <s>-<s>] [--return-within <deg>] [--camera-side left|right]
// The resting angle (baseline) comes from the first steady window of the clip, with the real rule of the app.
// Steps: ffprobe, ffmpeg (capped size, own fps), vite build and preview on port 4185, a Chromium page.
// Privacy: no frame or image is written. Any request to a foreign origin stops the run (exit 3).
// Exit codes: 0 done, 2 bad input, 3 a foreign request or a run error.
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { agreementFromReference, ClipInputError, parseArgs, readReference, resolveReturnWithin, summarize, textSummary } from './clip-lib.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(here, '..');
// Port 4185 by default. Set CLIP_PORT when another process uses it.
const PORT = Number(process.env.CLIP_PORT ?? 4185);
const ORIGIN = `http://127.0.0.1:${PORT}`;
const MAX_SIDE = 640;
const LOCAL_SCHEMES = ['data:', 'blob:'];

function probe(file) {
  const json = JSON.parse(
    execFileSync('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', file], { encoding: 'utf8' }),
  );
  const v = json.streams.find((s) => s.codec_type === 'video');
  if (!v) throw new ClipInputError('The file has no video stream.');
  const [num, den] = v.avg_frame_rate.split('/').map(Number);
  const fps = den ? num / den : 0;
  if (!(fps > 0)) throw new ClipInputError('ffprobe gave no frame rate for this file.');
  const rotation = Number(v.side_data_list?.find((d) => d.rotation !== undefined)?.rotation ?? v.tags?.rotate ?? 0);
  return {
    duration_s: Number(v.duration ?? json.format.duration),
    fps,
    width: v.width,
    height: v.height,
    rotation_deg: rotation,
    codec: v.codec_name,
  };
}

function convert(file, target, fps) {
  // ffmpeg turns the picture upright by itself, so the scale rule uses the upright size.
  const scale = `scale=w='if(gt(iw,ih),min(${MAX_SIDE},iw),-2)':h='if(gt(iw,ih),-2,min(${MAX_SIDE},ih))'`;
  execFileSync(
    'ffmpeg',
    ['-v', 'error', '-y', '-i', file, '-an', '-vf', scale, '-r', String(fps), '-c:v', 'libvpx', '-crf', '8', '-b:v', '4M', '-deadline', 'realtime', '-cpu-used', '8', '-pix_fmt', 'yuv420p', target],
    { stdio: 'inherit' },
  );
}

// A busy port would make us read the page of another server. Stop instead.
function assertPortFree() {
  return new Promise((resolvePort, reject) => {
    const probeServer = createServer();
    probeServer.once('error', () => reject(new Error(`Port ${PORT} is busy. Set CLIP_PORT to a free port.`)));
    probeServer.listen(PORT, '127.0.0.1', () => probeServer.close(() => resolvePort()));
  });
}

async function waitFor(url) {
  let lastStatus = 'none';
  for (let i = 0; i < 100; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
      lastStatus = res.status;
    } catch (error) {
      lastStatus = String(error.cause?.message ?? error.cause ?? error.message);
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`The preview server did not start at ${url} (last status ${lastStatus})`);
}

async function runInBrowser(config, dist) {
  await assertPortFree();
  const { chromium } = await import('@playwright/test');
  const vite = join(appDir, 'node_modules/vite/bin/vite.js');
  const preview = spawn(process.execPath, [vite, 'preview', '--outDir', dist, '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
    cwd: appDir,
    stdio: process.env.CLIP_DEBUG ? 'inherit' : 'ignore',
  });
  const foreign = [];
  let browser;
  try {
    await waitFor(`${ORIGIN}/clip-page.html`);
    browser = await chromium.launch();
    const context = await browser.newContext();
    await context.route('**/*', (route) => {
      const url = route.request().url();
      if (url.startsWith(ORIGIN + '/') || LOCAL_SCHEMES.some((s) => url.startsWith(s))) return route.continue();
      foreign.push(url);
      return route.abort();
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => console.error('Page error:', e.message));
    await page.goto(`${ORIGIN}/clip-page.html`);
    await page.waitForFunction(() => typeof window.runClip === 'function');
    const result = await page.evaluate((c) => window.runClip(c), config);
    if (foreign.length > 0) throw new Error(`Foreign request blocked: ${foreign.join(', ')}`);
    return result;
  } catch (error) {
    if (foreign.length > 0) error.foreign = foreign;
    throw error;
  } finally {
    await browser?.close();
    preview.kill(); // this PID is the one that we started
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!existsSync(args.file)) throw new ClipInputError(`Cannot read the file: ${args.file}`);
  const refs = args.reference ? readReference(readFileSync(args.reference, 'utf8')) : null;
  const info = probe(args.file);
  const name = basename(args.file, extname(args.file)).replace(/[^A-Za-z0-9._-]/g, '_');
  const outDir = resolve(appDir, args.out);

  const scratch = mkdtempSync(join(tmpdir(), 'mpfl-clip-'));
  try {
    const dist = join(scratch, 'dist');
    execFileSync(process.execPath, [join(appDir, 'node_modules/vite/bin/vite.js'), 'build', '--config', join(here, 'clip-vite.config.mjs')], {
      cwd: appDir,
      env: { ...process.env, CLIP_OUT_DIR: dist },
      stdio: 'inherit',
    });
    convert(args.file, join(dist, 'clip.webm'), info.fps);

    // The example protocol gives the return value when the option is missing. Only this tool does that.
    const example = JSON.parse(readFileSync(join(appDir, 'src/lib/protocol/example-protocol.json'), 'utf8'));
    const returnWithin = resolveReturnWithin(args, example);
    if (returnWithin.source === 'example protocol') {
      console.log(`Return value ${returnWithin.value} degrees: default taken from the example protocol (PROPOSAL, not clinical). Use --return-within to change it.`);
    }
    const baselineConfig = args.baseline ?? (args.baselineFrom ? { fromMs: args.baselineFrom.fromS * 1000, toMs: args.baselineFrom.toS * 1000 } : null);
    const exercise = {
      kind: args.kind,
      targetFlexion: args.target,
      ...(returnWithin.value === null ? {} : { returnWithinDeg: returnWithin.value }),
      ...(args.maxFlexion === null ? {} : { maxFlexion: args.maxFlexion }),
      holdSeconds: args.holdSeconds,
    };
    const run = await runInBrowser({ videoUrl: '/clip.webm', fps: info.fps, leg: args.leg, cameraSide: args.cameraSide, exercise, baseline: baselineConfig }, dist);

    const summary = summarize(run.frames, { videoFps: info.fps, processingMs: run.processingMs, minVisibility: run.minVisibility });
    const clipInfo = {
      baseline: run.baseline,
      returnWithin,
      countBlock: run.pipeline.countBlock ?? null,
      sessionStartS: run.sessionStartS,
      legRole: run.pipeline.legRole ?? null,
      identity: run.identity,
    };
    const agreement = refs ? agreementFromReference(run.frames, refs) : null;
    const report = {
      tool: 'analyze-clip',
      notes: [
        'Numbers only. No frame or image is stored.',
        'Angles are estimated flexion in degrees (0 is a straight leg). They are not a medical measurement.',
        'The processing speed is an offline value (seek, then detect). It is not the speed on a phone.',
        'One clip is a smoke test, not validation.',
      ],
      input: { name: basename(args.file), ...info },
      converted: { width: run.width, height: run.height, duration_s: run.duration_s },
      options: { leg: args.leg, cameraSide: args.cameraSide, baseline: args.baseline, baselineFrom: args.baselineFrom, returnWithin, exercise: args.exercise, target: args.target, maxFlexion: args.maxFlexion, holdSeconds: args.holdSeconds },
      summary: { ...summary, medianDetectMs: run.medianDetectMs },
      baseline: run.baseline,
      sessionStartS: run.sessionStartS,
      identity: run.identity,
      pipeline: run.pipeline,
      agreement,
      frames: run.frames,
    };
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, `${name}.json`), JSON.stringify(report, null, 1));
    const text = textSummary(name, args, summary, agreement, clipInfo);
    writeFileSync(join(outDir, `${name}.txt`), text + '\n');
    console.log(text);
    console.log(`Written: ${join(outDir, name)}.json and .txt`);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

main().catch((error) => {
  if (error instanceof ClipInputError) {
    console.error(error.message);
    process.exit(2);
  }
  console.error(error.foreign ? `Privacy stop. Foreign request: ${error.foreign.join(', ')}` : error.stack ?? error);
  process.exit(3);
});
