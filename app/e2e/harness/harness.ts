import { startCamera, stopCamera, stopOnLeave } from '../../src/pose/camera';
import { createLandmarker } from '../../src/pose/landmarker';

const w = window as unknown as Record<string, unknown>;
const violations: string[] = [];
document.addEventListener('securitypolicyviolation', (e) => {
  violations.push(`${e.violatedDirective} ${e.blockedURI}`);
});
w.__violations = violations;

let stream: MediaStream | undefined;
w.__camera = {
  async start() {
    const r = await startCamera();
    if (r.ok) {
      stream = r.stream;
      const v = document.getElementById('v') as HTMLVideoElement;
      v.srcObject = r.stream;
      await v.play();
      return { ok: true };
    }
    return r;
  },
  stop: stopCamera,
  leave: stopOnLeave,
  states: () => stream?.getTracks().map((t) => t.readyState) ?? [],
};
w.__landmarker = {
  async init() {
    const l = await createLandmarker();
    // A blank canvas goes through the real model and WASM. No person is in it.
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const out = l.detect(c as unknown as HTMLVideoElement, 1);
    l.close();
    return { initialised: true, landmarks: out };
  },
};
