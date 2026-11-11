// The laptop side of the second view (T12b, FR25). It is an optional step of the Setup screen.
// It shows the laptop code, reads the phone code with the laptop webcam (or from pasted text), and shows the state.
// Skip keeps one camera. The screen never records or sends a frame. The scan reads one frame at a time in memory.
// Use this step before the pose camera starts: the scan uses the same camera layer as the pose camera.
import { useEffect, useRef, useState } from 'react';
import type { Pairing, PairingView } from '../pairing/pairing';
import '../pairing/pair.css';
import { Icon } from './Icon';
import { Notice } from './Notice';
import { StepTrack } from './StepTrack';
import './screensV2.css';
import { QrCode } from '../pairing/qrCode';
import { startQrScan } from '../pairing/qrReader';
import { startCamera, stopCamera, type CameraResult } from '../pose/camera';
import { focusHeading } from './focusHeading';

export interface HostDeps {
  startCamera: () => Promise<CameraResult>;
  stopCamera: () => void;
  startScan: (video: HTMLVideoElement, onText: (text: string) => void) => () => void;
}

const defaultDeps: HostDeps = {
  startCamera: () => startCamera(),
  stopCamera,
  startScan: (video, onText) => startQrScan(video, onText),
};

export const HOST_TITLE = 'Add a second camera';
const HOST_STEPS = ['Show the code', 'Scan the phone code', 'Connected'] as const;

const STATUS_TEXT: Record<PairingView['status'], string> = {
  idle: '',
  starting: 'Getting the code ready',
  offer: 'Waiting for the phone',
  connecting: 'Connecting to the phone',
  connected: 'Connected',
  failed: 'Could not pair',
  closed: 'Stopped',
  skipped: 'Skipped',
};

interface Props {
  pairing: Pairing;
  view: PairingView;
  /** The phone is connected and the patient chose to go on. */
  onDone: () => void;
  /** The patient chose one camera, or pairing failed and the patient goes on. */
  onSkip: () => void;
  deps?: Partial<HostDeps>;
  /** Setup shows its own list of steps, so it asks for no second track. The headings "Step 1" and "Step 2" still name the pairing steps. */
  hideTrack?: boolean;
}

export function PairHost({ pairing, view, onDone, onSkip, deps: override, hideTrack = false }: Props) {
  const depsRef = useRef<HostDeps>({ ...defaultDeps, ...override });
  depsRef.current = { ...defaultDeps, ...override };
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [pasted, setPasted] = useState('');
  // One step at a time: the code of this laptop first, then the scan of the phone code.
  const [hostStep, setHostStep] = useState<'code' | 'scan'>('code');
  const h1 = useRef<HTMLHeadingElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const stopScan = useRef<(() => void) | null>(null);
  const cameraOn = useRef(false);
  const stream = useRef<MediaStream | null>(null);
  const { status } = view;
  const active = status === 'starting' || status === 'offer' || status === 'connecting';

  useEffect(() => focusHeading(h1.current), [status, hostStep]);

  const release = () => {
    stopScan.current?.();
    stopScan.current = null;
    if (cameraOn.current) depsRef.current.stopCamera();
    cameraOn.current = false;
    stream.current = null;
  };
  useEffect(() => release, []);

  // The camera is not needed after the phone is connected, or after a failure.
  useEffect(() => {
    if (status === 'connected' || status === 'failed' || status === 'skipped' || status === 'closed') release();
  }, [status]);

  async function start() {
    // The camera comes first. It is needed for the scan. Chrome can show a real network address, and not a random name,
    // to a page that holds a camera permission. This is UNVERIFIED: the fake camera of the tests did not change the address.
    // Without the camera, the paste fields still work.
    const camera = await depsRef.current.startCamera();
    if (camera.ok) {
      cameraOn.current = true;
      stream.current = camera.stream;
    } else {
      setCameraError(camera.error.message);
    }
    await pairing.begin(); // the status changes, the camera view of step 2 appears, and the effect below attaches the stream
  }

  // The view of the phone code exists only after pairing began. Attach the stream to it and start the scan there,
  // so that the person sees what the camera sees and can aim the phone screen.
  useEffect(() => {
    const element = video.current;
    if (!active || hostStep !== 'scan' || !stream.current || !element || stopScan.current) return;
    element.srcObject = stream.current;
    void element.play().catch(() => undefined);
    stopScan.current = depsRef.current.startScan(element, (text) => void pairing.submitAnswer(text));
  }, [active, hostStep, pairing]);

  function skip() {
    release();
    pairing.skip();
    onSkip();
  }

  function toStep(next: 'code' | 'scan') {
    // The scan stops when the person goes back. It starts again on the scan step. The camera stays on.
    if (next === 'code') {
      stopScan.current?.();
      stopScan.current = null;
    }
    setHostStep(next);
  }

  function retry() {
    release();
    setHostStep('code');
    setCameraError(null);
    setPasted('');
    pairing.reset();
  }

  return (
    <section className="pair-screen stack v2-screens v2-pair" aria-labelledby="pair-host-title">
      <header className="page-head">
        <h1 id="pair-host-title" tabIndex={-1} ref={h1}>
          {HOST_TITLE}
        </h1>
      </header>

      {status === 'idle' && (
        <div className="pair-step stack-s">
          <p className="pair-lead">A phone can be a second camera. It sends body points only. It never sends video or pictures.</p>
          <p className="pair-lead">Pairing takes two codes. The phone and this laptop must be on the same network.</p>
          <div className="actions">
            <button type="button" className="btn btn-primary btn-lg" onClick={() => void start()}>
              <Icon name="phone" size={20} />
              Start pairing
            </button>
            <button type="button" className="btn btn-lg" onClick={skip}>
              Skip, use one camera
            </button>
          </div>
        </div>
      )}

      {active && (
        <>
          {!hideTrack && <StepTrack total={HOST_STEPS.length} current={hostStep === 'code' ? 0 : 1} label="Pairing steps" names={HOST_STEPS} />}
          <p className="status-chip" role="status">
            <Icon name="info" size={18} />
            {STATUS_TEXT[status]}
          </p>
          {hostStep === 'code' && view.offerText && (
            <section className="pair-step stack-s" aria-labelledby="pair-host-step1">
              <h2 id="pair-host-step1">Step 1. Scan this code with the phone</h2>
              <p>On the phone, open this app and choose Use this phone as the second camera. Use one phone only.</p>
              <div className="pair-qr">
                <QrCode text={view.offerText} label="Pairing code of this laptop" />
              </div>
              <div className="field">
                <label htmlFor="pair-offer-text">Code as text</label>
                <textarea id="pair-offer-text" name="pair-offer" className="pair-code" readOnly value={view.offerText} spellCheck={false} autoComplete="off" />
              </div>
              <div className="actions">
                <button type="button" className="btn btn-primary btn-lg" onClick={() => toStep('scan')}>
                  Next: scan the phone code
                  <Icon name="chevron-right" size={20} />
                </button>
              </div>
            </section>
          )}
          {hostStep === 'scan' && (
            <section className="pair-step stack-s" aria-labelledby="pair-host-step2">
              <h2 id="pair-host-step2">Step 2. Scan the phone code</h2>
              <p>Hold the phone screen in front of this laptop camera.</p>
              <div className="frame pair-frame">
                <video ref={video} className="preview" muted playsInline aria-label="Camera view for the phone code" />
              </div>
              {cameraError && (
                <Notice role="alert" icon="triangle-alert">
                  <p>{cameraError}</p>
                </Notice>
              )}
              <div className="field">
                <label htmlFor="pair-paste-answer">Or paste the phone code</label>
                <textarea id="pair-paste-answer" name="pair-answer" className="pair-code" value={pasted} onChange={(e) => setPasted(e.target.value)} spellCheck={false} autoComplete="off" />
              </div>
              {view.message && (
                <Notice role="alert" icon="triangle-alert">
                  <p>{view.message}</p>
                </Notice>
              )}
              <div className="actions">
                <button type="button" className="btn btn-primary" disabled={pasted.trim() === '' || status !== 'offer'} onClick={() => void pairing.submitAnswer(pasted.trim())}>
                  Use this code
                </button>
                <button type="button" className="btn" onClick={() => toStep('code')}>
                  <Icon name="arrow-left" size={18} />
                  Back to the code
                </button>
              </div>
            </section>
          )}
          <div className="actions">
            <button type="button" className="btn" onClick={skip}>
              Skip, use one camera
            </button>
          </div>
        </>
      )}

      {status === 'connected' && (
        <div className="pair-step stack-s">
          <Notice role="status" icon="phone">
            <p>{STATUS_TEXT.connected}</p>
          </Notice>
          <p className="pair-lead">The phone is the second camera. Keep the phone on while you exercise.</p>
          <div className="actions">
            <button type="button" className="btn btn-primary btn-lg" onClick={onDone}>
              Continue
              <Icon name="chevron-right" size={20} />
            </button>
          </div>
        </div>
      )}

      {(status === 'failed' || status === 'closed') && (
        <div className="pair-step stack-s">
          <Notice role="alert" icon="triangle-alert">
            <p>{view.message ?? STATUS_TEXT[status]}</p>
          </Notice>
          <div className="actions">
            <button type="button" className="btn btn-primary btn-lg" onClick={retry}>
              <Icon name="refresh-cw" size={20} />
              Try again
            </button>
            <button type="button" className="btn btn-lg" onClick={skip}>
              Continue with one camera
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
