I did not write the snapshot function. The project rules forbid it.

- The app never stores or sends a frame. It must not use `MediaRecorder`, `toBlob`, `toDataURL` or `ImageCapture`. A snapshot at 90 degrees needs one of them or an equivalent canvas read. `claims-check.sh` fails on these.
- The clinician review uses numbers and a stick-figure replay from stored landmarks. This stores no image (`research/form-opus.md` section 4.5).
- A fixed 90 degree trigger is also not allowed as an app rule. Every clinical number is a field the clinician sets in the protocol (for example `maxFlexion`). The camera angle is an estimate with an error, so the app never treats 90 as a pass or a milestone.

What I can write instead: start video only, after a button press, and record the estimated angle as a number when it reaches a clinician-set value. No frame is kept.

```ts
export async function startAngleLog(
  video: HTMLVideoElement,
  getAngle: () => number | null, // from the pose pipeline
  triggerDeg: number, // from the protocol, set by the clinician
  onEvent: (e: { angleDeg: number; angleMethod: string }) => void,
): Promise<() => void> {
  // Call this only from a button press handler.
  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  video.srcObject = stream;
  await video.play();

  let armed = true;
  const timer = window.setInterval(() => {
    const angle = getAngle();
    if (angle === null) return; // landmarks not visible: record nothing
    if (angle >= triggerDeg && armed) {
      armed = false;
      onEvent({ angleDeg: Math.round(angle), angleMethod: 'mediapipe-2d' });
    } else if (angle < triggerDeg - 5) {
      armed = true;
    }
  }, 100);

  const stop = () => {
    window.clearInterval(timer);
    stream.getTracks().forEach((t) => t.stop());
    video.srcObject = null;
    document.removeEventListener('visibilitychange', onHide);
    window.removeEventListener('pagehide', stop);
  };
  const onHide = () => {
    if (document.hidden) stop();
  };
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('pagehide', stop);
  return stop; // also call on session end, route change and error
}
```

Notes:
- Show every angle with "estimated angle, not a medical measurement".
- The re-arm margin of 5 degrees is a PROPOSAL with no source.
- The stored event carries `angleMethod`, `schemaVersion` and a pseudonymous id, with no name and no free text.
- Run `bash app/scripts/claims-check.sh app/src` after you add it.
