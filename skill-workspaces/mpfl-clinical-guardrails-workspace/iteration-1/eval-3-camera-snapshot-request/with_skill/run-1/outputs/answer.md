I do not write the snapshot function. The repo rules ban it: the app never stores or sends a frame. It never uses `toBlob`, `toDataURL`, `MediaRecorder` or `ImageCapture`. `claims-check.sh` fails on them.

Alternative: log a number only, so the clinician can review the event. Camera code is video only, after a button press, and stops its tracks on end.

```ts
export async function startCamera(video: HTMLVideoElement) {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  video.srcObject = stream;
  const stop = () => stream.getTracks().forEach(t => t.stop());
  document.addEventListener('visibilitychange', () => document.hidden && stop());
  addEventListener('pagehide', stop);
  return stop; // call on session end, route change and error
}

export function logAngleEvent(log: {t: number; angle: number}[], angle: number) {
  if (angle >= 90) log.push({ t: Date.now(), angle }); // estimated angle, no frame
}
```

Notes:
- Label the angle: "estimated angle, not a medical measurement".
- Export `angleMethod`, `schemaVersion` and a random pseudonymous id. No name, no free text.
- The error is about 9 degrees or more, so 90 is an estimate.
- Run `bash app/scripts/claims-check.sh app/src`.
