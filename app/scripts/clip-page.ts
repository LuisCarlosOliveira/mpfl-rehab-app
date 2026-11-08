// Page for scripts/analyze-clip.mjs. It runs the real pose code of the app on a video file,
// one frame at a time, and returns numbers only. It never draws, stores or sends a frame.
import { flexion, kneeAngle, MIN_VISIBILITY, selectLeg, type Landmark, type Side } from '../src/lib/angle';
import { createPipeline } from '../src/lib/exercises';
import type { Exercise } from '../src/lib/protocol';
import { median } from '../src/pose/loop';
import { createLandmarker } from '../src/pose/landmarker';

interface RunConfig {
  videoUrl: string;
  fps: number;
  leg: Side;
  exercise: Exercise;
}

const JOINTS = { leftHip: 23, leftKnee: 25, leftAnkle: 27, rightHip: 24, rightKnee: 26, rightAnkle: 28 } as const;
const r4 = (v: number) => Math.round(v * 1e4) / 1e4;

function seek(video: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Seek to ${t} s timed out`)), 15_000);
    video.addEventListener(
      'seeked',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
    video.currentTime = t;
  });
}

async function runClip({ videoUrl, fps, leg, exercise }: RunConfig) {
  const video = document.getElementById('clip') as HTMLVideoElement;
  video.src = videoUrl;
  await new Promise<void>((resolve, reject) => {
    video.onloadeddata = () => resolve();
    video.onerror = () => reject(new Error('The browser cannot decode the converted video.'));
  });
  const aspect = video.videoWidth / video.videoHeight;
  const made = createPipeline(exercise, leg, aspect);
  if (!made.ok) throw new Error(`Exercise setup failed: ${made.reason} (${made.missing})`);
  const landmarker = await createLandmarker();

  const count = Math.floor(video.duration * fps);
  const frames: object[] = [];
  const detectMs: number[] = [];
  const t0 = performance.now();
  for (let i = 0; i < count; i++) {
    await seek(video, (i + 0.5) / fps);
    // The landmarker needs strictly rising timestamps. Whole milliseconds are enough up to 1000 fps.
    const timeMs = Math.round((i * 1000) / fps);
    const d0 = performance.now();
    const marks: Landmark[] | null = landmarker.detect(video, timeMs);
    detectMs.push(performance.now() - d0);

    const out = made.pipeline.step(marks, timeMs);
    let raw: number | null = null;
    let rawKnee: number | null = null;
    let visibility: number[] = [];
    if (marks) {
      const [hip, knee, ankle] = selectLeg(marks, leg);
      rawKnee = kneeAngle(hip, knee, ankle, aspect);
      raw = flexion(rawKnee);
      visibility = [hip, knee, ankle].map((p) => r4(p.visibility ?? 1));
    }
    const points = marks
      ? Object.fromEntries(
          Object.entries(JOINTS).map(([name, id]) => {
            const p = marks[id]!;
            return [name, { x: r4(p.x), y: r4(p.y), visibility: r4(p.visibility ?? 1) }];
          }),
        )
      : null;
    frames.push({
      time_s: r4(timeMs / 1000),
      points,
      kneeAngleRaw: rawKnee === null ? null : r4(rawKnee),
      flexionRaw: raw === null ? null : r4(raw),
      flexionFiltered: out.flexion === null ? null : r4(out.flexion),
      event: out.event,
      allVisible: raw !== null,
      visibility,
    });
  }
  const processingMs = performance.now() - t0;
  landmarker.close();
  return {
    frames,
    processingMs,
    medianDetectMs: median(detectMs),
    width: video.videoWidth,
    height: video.videoHeight,
    duration_s: video.duration,
    pipeline: made.pipeline.summary(),
    minVisibility: MIN_VISIBILITY,
  };
}

(window as unknown as { runClip: typeof runClip }).runClip = runClip;
