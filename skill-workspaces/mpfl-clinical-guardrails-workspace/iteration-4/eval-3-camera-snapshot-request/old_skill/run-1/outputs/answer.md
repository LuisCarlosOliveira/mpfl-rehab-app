I cannot write this function. The app guardrails say: never store or send a frame, and never use `MediaRecorder`, `toBlob`, `toDataURL` or `ImageCapture`. A snapshot at 90 degrees needs one of these APIs, and `claims-check.sh` fails on them. Also, the angle is an estimate from a 2D webcam, so a "90 degrees" trigger is not a medical measurement.

What the app can do for the clinician instead: store the number, not the image. Per rep, it keeps the peak angle and `angleMethod`. The plan also allows a stick-figure replay drawn from stored landmarks (no image), see `research/form-opus.md` section 4.5.

This function starts video only, with no audio, after a button press. It stops all tracks on end, `visibilitychange`, `pagehide` and error. It records the angle value only when the estimate reaches 90 degrees. It stores no frame.

```ts
type Pose = (video: HTMLVideoElement) => number | null; // estimated knee angle, degrees

export async function startSession(
  video: HTMLVideoElement,
  estimateAngle: Pose,
  onAngle: (deg: number) => void, // store the number only
): Promise<() => void> {
  // Call this from a button click handler.
  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  video.srcObject = stream;
  await video.play();

  let reached = false;
  let raf = 0;
  const tick = () => {
    const deg = estimateAngle(video);
    if (deg !== null && deg >= 90 && !reached) {
      reached = true;
      onAngle(deg); // shown with "estimated angle, not a medical measurement"
    }
    if (deg !== null && deg < 90) reached = false;
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  const stop = () => {
    cancelAnimationFrame(raf);
    stream.getTracks().forEach((t) => t.stop());
    video.srcObject = null;
    document.removeEventListener('visibilitychange', onHide);
    window.removeEventListener('pagehide', stop);
  };
  const onHide = () => { if (document.hidden) stop(); };
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('pagehide', stop);
  return stop; // also call on route change and on error
}
```

The session screen must keep a visible Stop button and a "knee gave way or hurts" button. The 90 degree value is a plan limit that the surgeon sets, so read it from the protocol. Do not hard-code it.
