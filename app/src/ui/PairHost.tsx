// The laptop side of the second view (T12b, FR25). It is an optional step of the Setup screen.
// It shows the laptop code, reads the phone code with the laptop webcam (or from pasted text), and shows the state.
// Skip keeps one camera. The screen never records or sends a frame. The scan reads one frame at a time in memory.
// Use this step before the pose camera starts: the scan uses the same camera layer as the pose camera.
import { useEffect, useRef, useState } from 'react';
import type { Pairing, PairingView } from '../pairing/pairing';
import '../pairing/pair.css';
import { QrCode } from '../pairing/qrCode';
import { startQrScan } from '../pairing/qrReader';
import { startCamera, stopCamera, type CameraResult } from '../pose/camera';

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
}

export function PairHost({ pairing, view, onDone, onSkip, deps: override }: Props) {
  const depsRef = useRef<HostDeps>({ ...defaultDeps, ...override });
  depsRef.current = { ...defaultDeps, ...override };
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [pasted, setPasted] = useState('');
  const h1 = useRef<HTMLHeadingElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const stopScan = useRef<(() => void) | null>(null);
  const cameraOn = useRef(false);
  const { status } = view;

  useEffect(() => h1.current?.focus(), [status]);

  const release = () => {
    stopScan.current?.();
    stopScan.current = null;
    if (cameraOn.current) depsRef.current.stopCamera();
    cameraOn.current = false;
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
      if (video.current) {
        video.current.srcObject = camera.stream;
        void video.current.play().catch(() => undefined);
      }
      stopScan.current = depsRef.current.startScan(video.current ?? document.createElement('video'), (text) => void pairing.submitAnswer(text));
    } else {
      setCameraError(camera.error.message);
    }
    await pairing.begin();
  }

  function skip() {
    release();
    pairing.skip();
    onSkip();
  }

  function retry() {
    release();
    setCameraError(null);
    setPasted('');
    pairing.reset();
  }

  const active = status === 'starting' || status === 'offer' || status === 'connecting';

  return (
    <section className="pair-screen" aria-labelledby="pair-host-title">
      <h1 id="pair-host-title" tabIndex={-1} ref={h1}>
        {HOST_TITLE}
      </h1>

      {status === 'idle' && (
        <>
          <p className="pair-lead">A phone can be a second camera. It sends body points only. It never sends video or pictures.</p>
          <p className="pair-lead">Pairing takes two codes. The phone and this laptop must be on the same network.</p>
          <div className="pair-actions">
            <button type="button" className="pair-btn pair-btn-primary" onClick={() => void start()}>
              Start pairing
            </button>
            <button type="button" className="pair-btn" onClick={skip}>
              Skip, use one camera
            </button>
          </div>
        </>
      )}

      {active && (
        <>
          <p role="status" className="pair-status">{STATUS_TEXT[status]}</p>
          {view.offerText && (
            <div className="pair-block">
              <h2>Step 1. Scan this code with the phone</h2>
              <p>On the phone, open this app and choose Use this phone as the second camera.</p>
              <div className="pair-qr">
                <QrCode text={view.offerText} label="Pairing code of this laptop" />
              </div>
              <div className="pair-field">
                <label htmlFor="pair-offer-text">Code as text</label>
                <textarea id="pair-offer-text" className="pair-code" readOnly value={view.offerText} />
              </div>
            </div>
          )}
          <div className="pair-block">
            <h2>Step 2. Scan the phone code</h2>
            <p>Hold the phone screen in front of this laptop camera.</p>
            <video ref={video} className="pair-video" muted playsInline aria-label="Camera view for the phone code" />
            {cameraError && <p role="alert">{cameraError}</p>}
            <div className="pair-field">
              <label htmlFor="pair-paste-answer">Or paste the phone code</label>
              <textarea id="pair-paste-answer" className="pair-code" value={pasted} onChange={(e) => setPasted(e.target.value)} spellCheck={false} autoComplete="off" />
            </div>
            {view.message && <p role="alert">{view.message}</p>}
            <div className="pair-actions">
              <button type="button" className="pair-btn pair-btn-primary" disabled={pasted.trim() === '' || status !== 'offer'} onClick={() => void pairing.submitAnswer(pasted.trim())}>
                Use this code
              </button>
            </div>
          </div>
          <div className="pair-actions">
            <button type="button" className="pair-btn" onClick={skip}>
              Skip, use one camera
            </button>
          </div>
        </>
      )}

      {status === 'connected' && (
        <>
          <p role="status" className="pair-status">{STATUS_TEXT.connected}</p>
          <p className="pair-lead">The phone is the second camera. Keep the phone on while you exercise.</p>
          <div className="pair-actions">
            <button type="button" className="pair-btn pair-btn-primary" onClick={onDone}>
              Continue
            </button>
          </div>
        </>
      )}

      {(status === 'failed' || status === 'closed') && (
        <>
          <p role="alert" className="pair-status">
            {view.message ?? STATUS_TEXT[status]}
          </p>
          <div className="pair-actions">
            <button type="button" className="pair-btn pair-btn-primary" onClick={retry}>
              Try again
            </button>
            <button type="button" className="pair-btn" onClick={skip}>
              Continue with one camera
            </button>
          </div>
        </>
      )}
    </section>
  );
}
