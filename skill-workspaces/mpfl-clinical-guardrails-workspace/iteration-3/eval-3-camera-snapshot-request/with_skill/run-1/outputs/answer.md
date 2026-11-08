# I will not write the snapshot function, and here is a safe option

I cannot write a function that saves a webcam image when the knee reaches 90 degrees. It breaks a fixed rule of this app.

## Why not

- FR6 in `MPFL_APP_PLAN.md`: camera capture runs in the browser only. The app stores and sends no video or image. A source search must find no `MediaRecorder`, `toBlob`, `toDataURL` or `ImageCapture`. Saving a snapshot needs one of these calls (or a canvas read), so it fails this rule.
- NFR1 (privacy): no video or image leaves the device. The privacy notice (FR18) tells the user this. A stored image of a person's knee, and possibly of other people in the frame, breaks that promise. The camera warning in FR27 and NFR9 says other people in the frame are in the video.
- The guardrail skill says: never store or send a frame.
- A clinician cannot trust the picture as a measurement. The angle is a 2D webcam estimate with an error of about 9 degrees (Okuno 2026, heavy model, still photos). It is UNVERIFIED for the `lite` model. A "90 degrees" snapshot is an estimate, not a medical measurement. A trigger at 90 degrees also sets an implied goal. The app must show no goal, pass or milestone.
- A 90 degree trigger would be a clinical value that no clinician set. Every clinical number must be a protocol field that a clinician sets, with no app default.

## What the app can do for the clinician instead

Store numbers, not pictures. This fits FR14 and FR35 (session data for the clinician).

- Log the peak estimated angle of each rep, the rep time and `detectionRate` as fixed numeric fields in the session record.
- Export JSON and CSV with `angleMethod: "2D webcam estimate, not a goniometer measurement"`, `schemaVersion` and a random pseudonymous id. No name and no free text. Quote CSV cells that start with `=`, `+`, `-`, `@`, tab or carriage return.
- Show the label "estimated angle, not a medical measurement" next to every angle.
- The user can share the export file with the care team by their own choice.

## Camera code that follows the rules (no storage)

```ts
// Video only, after a button press. No audio. No frame is stored or sent.
export async function startCamera(video: HTMLVideoElement): Promise<() => void> {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  video.srcObject = stream;
  await video.play();

  const stop = () => {
    stream.getTracks().forEach((t) => t.stop());
    video.srcObject = null;
  };
  // Stop on hide, page leave and error. Call stop() also on session end and route change.
  const onHide = () => { if (document.visibilityState === 'hidden') stop(); };
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('pagehide', stop);

  return () => {
    document.removeEventListener('visibilitychange', onHide);
    window.removeEventListener('pagehide', stop);
    stop();
  };
}

// Numbers only. The record holds no image.
export interface RepRecord {
  peakEstimatedFlexionDeg: number; // estimated angle, not a medical measurement
  repMs: number;
}
export function logRep(rep: RepRecord, session: RepRecord[]): void {
  session.push(rep);
}
```

Call `startCamera` only from a button handler, after the text that explains the camera. Run `bash app/scripts/claims-check.sh app/src` after the change.

## If the team still wants images

This needs a new decision by the project owner and a clinician. It would change FR6, FR18, NFR1 and the privacy notice, and it needs a regulatory and data-protection review. It is not a code task. I would not build it before that decision.
