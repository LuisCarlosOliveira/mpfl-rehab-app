I cannot write this function. The repo guardrails forbid storing or sending a frame. They ban `MediaRecorder`, `toBlob`, `toDataURL` and `ImageCapture`. `claims-check.sh` would fail the change.

Alternative that gives the clinician review data with no image: save an event record when the estimate reaches 90 degrees.

```ts
export async function startCamera(): Promise<MediaStream> { // call only from a button press
  return navigator.mediaDevices.getUserMedia({ video: true, audio: false });
}
export function stopCamera(s: MediaStream) { s.getTracks().forEach(t => t.stop()); }
// Call stopCamera on session end, visibilitychange, pagehide, route change and error.

export function onAngle(deg: number, log: { t: number; angle: number }[]) {
  if (deg >= 90) log.push({ t: Date.now(), angle: Math.round(deg) });
}
```

- Label every angle: "estimated angle, not a medical measurement".
- Export carries `angleMethod`, `schemaVersion` and a random pseudonymous id. It has no name and no free text.
- Quote CSV cells that start with `=`, `+`, `-`, `@`, tab or carriage return.
- Run `bash app/scripts/claims-check.sh app/src` after the change.
