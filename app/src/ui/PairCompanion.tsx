// The phone as the second camera (T12b, FR25). Text first, then the camera, then the codes, then landmarks only.
// The phone shows no picture of the person and sends none. The scan of the laptop code shows the camera view of the code only.
// Steps: intro, scan the laptop code, show the phone code, run, stopped or failed.
import { useCallback, useEffect, useRef, useState } from 'react';
import { FALLBACK_TEXT } from '../lib/pairing';
import { createThrottle, landmarksMessage, SEND_HZ } from '../pairing/frameMessage';
import '../pairing/pair.css';
import { Icon } from './Icon';
import { Notice } from './Notice';
import { PairSteps } from './PairSteps';
import { QrCode } from '../pairing/qrCode';
import { startQrScan } from '../pairing/qrReader';
import { createCompanionLink, type CompanionLink } from '../pairing/rtcLink';
import { startCamera, stopCamera, type CameraResult } from '../pose/camera';
import { cameraSource, type LandmarkSource } from '../pose/source';

export interface CompanionDeps {
  createLink: () => CompanionLink;
  createSource: () => LandmarkSource;
  startCamera: () => Promise<CameraResult>;
  stopCamera: () => void;
  startScan: (video: HTMLVideoElement, onText: (text: string) => void) => () => void;
  wakeLock: () => Promise<{ release(): Promise<void> } | null>;
  now: () => number;
}

const defaultDeps: CompanionDeps = {
  createLink: () => createCompanionLink(),
  createSource: () => cameraSource({ view: 'front', facingMode: 'environment' }),
  startCamera: () => startCamera({ facingMode: 'environment' }),
  stopCamera,
  startScan: (video, onText) => startQrScan(video, onText),
  wakeLock: async () => {
    try {
      return (await navigator.wakeLock?.request('screen')) ?? null;
    } catch {
      return null; // the screen can still turn off. The page works the same.
    }
  },
  now: () => performance.now(),
};

type Step = 'intro' | 'scan' | 'answer' | 'run' | 'stopped' | 'failed';

export const COMPANION_TITLE = 'Use this phone as the second camera';

interface Props {
  onExit: () => void;
  deps?: Partial<CompanionDeps>;
}

export function PairCompanion({ onExit, deps: override }: Props) {
  const deps = { ...defaultDeps, ...override };
  const depsRef = useRef(deps);
  depsRef.current = deps;
  const [step, setStep] = useState<Step>('intro');
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [pasted, setPasted] = useState('');
  const h1 = useRef<HTMLHeadingElement>(null);
  const viewfinder = useRef<HTMLVideoElement>(null);
  const hiddenVideo = useRef<HTMLVideoElement>(null);
  const link = useRef<CompanionLink | null>(null);
  const source = useRef<LandmarkSource | null>(null);
  const stopScan = useRef<(() => void) | null>(null);
  const wake = useRef<{ release(): Promise<void> } | null>(null);
  const cameraOn = useRef(false);
  const unsubscribe = useRef<(() => void) | null>(null);

  // The heading takes the focus on each step, so that a screen reader reads the new step.
  useEffect(() => h1.current?.focus(), [step]);

  const releaseAll = useCallback(() => {
    stopScan.current?.();
    stopScan.current = null;
    source.current?.stop();
    source.current = null;
    unsubscribe.current?.();
    unsubscribe.current = null;
    link.current?.close();
    link.current = null;
    if (cameraOn.current) depsRef.current.stopCamera();
    cameraOn.current = false;
    void wake.current?.release().catch(() => undefined);
    wake.current = null;
  }, []);

  // Every way out stops the camera, the link and the wake lock.
  useEffect(() => releaseAll, [releaseAll]);

  const giveUp = useCallback(
    (message: string) => {
      releaseAll();
      setError(message);
      setStep('failed');
    },
    [releaseAll],
  );

  // The run step starts when the video element of the step exists.
  useEffect(() => {
    if (step !== 'run' || source.current) return;
    const mine = depsRef.current.createSource();
    source.current = mine;
    const allow = createThrottle(SEND_HZ);
    void (async () => {
      wake.current = await depsRef.current.wakeLock();
      const result = await mine.start((landmarks, timeMs) => {
        if (!landmarks || !allow(timeMs) || !link.current) return;
        const message = landmarksMessage(landmarks, mine.view, timeMs, mine.aspect());
        if (link.current.send(message)) setSending(true); // the same value after the first call: no render
      }, hiddenVideo.current);
      if (!result.ok && source.current === mine) giveUp(result.error.message);
    })();
  }, [step, giveUp]);

  function resumeScan() {
    const video = viewfinder.current;
    if (video && cameraOn.current) stopScan.current = depsRef.current.startScan(video, (text) => void acceptOffer(text));
  }

  async function acceptOffer(text: string) {
    stopScan.current?.();
    stopScan.current = null;
    const next = depsRef.current.createLink();
    link.current = next;
    const result = await next.acceptOffer(text); // the scan camera stays on until now, so that the browser can show the real address
    if (!result.ok) {
      next.close();
      link.current = null;
      if (result.code === 'not-ready' || result.code === 'peer-error') return giveUp(FALLBACK_TEXT);
      setError('This is not the code of the laptop. Scan the code on the laptop screen again.');
      return resumeScan();
    }
    if (cameraOn.current) depsRef.current.stopCamera();
    cameraOn.current = false;
    setError(null);
    setAnswer(result.value);
    setStep('answer');
    unsubscribe.current = next.subscribe((state) => {
      if (state.kind === 'connected') setStep('run');
      else if (state.kind === 'failed') giveUp(state.text);
      else if (state.kind === 'closed') {
        releaseAll();
        setStep('stopped');
      }
    });
  }

  async function beginScan() {
    setStep('scan');
    const camera = await depsRef.current.startCamera();
    if (!camera.ok) {
      setError(camera.error.message);
      return;
    }
    cameraOn.current = true;
    const video = viewfinder.current;
    if (!video) return;
    video.srcObject = camera.stream;
    void video.play().catch(() => undefined);
    resumeScan();
  }

  function stop() {
    releaseAll();
    setStep('stopped');
  }

  const stepIndex = step === 'intro' ? 0 : step === 'scan' || step === 'answer' ? 1 : step === 'run' ? 2 : null;

  return (
    <section className="pair-screen stack" aria-labelledby="pair-companion-title">
      <header className="page-head">
        <h1 id="pair-companion-title" tabIndex={-1} ref={h1}>
          {COMPANION_TITLE}
        </h1>
      </header>

      {stepIndex !== null && <PairSteps current={stepIndex} />}

      {step === 'intro' && (
        <div className="card stack-s">
          <p className="pair-lead">This phone becomes the second camera of the app on your laptop. It sends body points only. It never sends video or pictures.</p>
          <p className="pair-lead">Put the phone upright in front of you, so that it sees your legs. The screen stays on while the phone works.</p>
          <div className="actions">
            <button type="button" className="btn btn-primary btn-lg" onClick={() => void beginScan()}>
              <Icon name="camera" size={20} />
              Scan the laptop code
            </button>
            <button type="button" className="btn btn-lg" onClick={onExit}>
              Back
            </button>
          </div>
        </div>
      )}

      {step === 'scan' && (
        <div className="card stack-s">
          <p className="pair-lead">Point the rear camera at the code on the laptop screen.</p>
          <div className="frame pair-frame">
            <video ref={viewfinder} className="preview" muted playsInline aria-label="Camera view for the laptop code" />
          </div>
          {error && (
            <Notice role="alert" icon="triangle-alert">
              <p>{error}</p>
            </Notice>
          )}
          <div className="field">
            <label htmlFor="pair-paste-offer">Or paste the laptop code</label>
            <textarea id="pair-paste-offer" name="pair-offer" className="pair-code" value={pasted} onChange={(e) => setPasted(e.target.value)} spellCheck={false} autoComplete="off" />
          </div>
          <div className="actions">
            <button type="button" className="btn btn-primary btn-lg" disabled={pasted.trim() === ''} onClick={() => void acceptOffer(pasted.trim())}>
              Use this code
            </button>
            <button type="button" className="btn btn-lg" onClick={() => { releaseAll(); setStep('intro'); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {step === 'answer' && answer && (
        <div className="card stack-s">
          <p className="pair-lead">Show this code to the laptop. On the laptop, choose Scan the phone code.</p>
          <div className="pair-qr">
            <QrCode text={answer} label="Pairing code of this phone" />
          </div>
          <div className="field">
            <label htmlFor="pair-answer-text">Code as text</label>
            <textarea id="pair-answer-text" name="pair-answer" className="pair-code" readOnly value={answer} spellCheck={false} autoComplete="off" />
          </div>
          <Notice role="status" icon="info">
            <p>Waiting for the laptop</p>
          </Notice>
          <div className="actions">
            <button type="button" className="btn btn-lg" onClick={stop}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {step === 'run' && (
        <div className="card stack-s">
          <Notice role="status" icon="phone">
            <p>{sending ? 'Sending' : 'Connected'}</p>
          </Notice>
          <p className="pair-lead">The camera is on. The phone sends body points only. It shows no video and sends none.</p>
          <video ref={hiddenVideo} className="pair-offscreen" muted playsInline aria-hidden="true" />
          <button type="button" className="btn btn-primary btn-lg btn-block pair-btn-stop" onClick={stop}>
            <Icon name="square" size={22} fill="currentColor" />
            Stop
          </button>
        </div>
      )}

      {step === 'stopped' && (
        <div className="card stack-s">
          <Notice role="status" icon="info">
            <p>Stopped</p>
          </Notice>
          <p className="pair-lead">The camera is off. You can close this page.</p>
          <div className="actions">
            <button type="button" className="btn btn-primary btn-lg" onClick={onExit}>
              Back
            </button>
          </div>
        </div>
      )}

      {step === 'failed' && (
        <div className="card stack-s">
          <Notice role="alert" icon="triangle-alert">
            <p>{error ?? FALLBACK_TEXT}</p>
          </Notice>
          <div className="actions">
            <button type="button" className="btn btn-primary btn-lg" onClick={() => { setError(null); setStep('intro'); }}>
              <Icon name="refresh-cw" size={20} />
              Try again
            </button>
            <button type="button" className="btn btn-lg" onClick={onExit}>
              Back
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
