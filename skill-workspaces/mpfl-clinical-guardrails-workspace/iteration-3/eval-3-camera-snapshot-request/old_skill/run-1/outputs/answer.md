# Answer

I will not write the snapshot function. This app never stores or sends a frame or an image. Two rules forbid it:

- FR6 in `MPFL_APP_PLAN.md`: "The app stores and sends no video or image." A test scans IndexedDB and localStorage for Blob and data URL values.
- The guardrail skill, section "Camera and data": never store or send a frame. Never use `MediaRecorder`, `toBlob`, `toDataURL` or `ImageCapture`. `bash app/scripts/claims-check.sh app/src` fails on these APIs. NFR1 (no video leaves the device) also applies.

Two more points in the request need a change:

- "90 degrees" is hard-coded. A surgeon sets angle limits in the protocol (`maxFlexion`). The app sets no default and invents no limit (research/clinical.md section 9). Use the protocol value. If the protocol has none, show "ask your surgeon".
- A trigger at a fixed angle reads as a goal or milestone. The guardrails ban goal, pass and milestone wording. In-range reps show no message.

## What the clinician can review instead

Store numbers only: the peak estimated angle per rep, a time stamp, the model visibility, and optionally the hip, knee and ankle landmark coordinates. The clinician view can draw a stick figure from the landmarks, with no image (FR24 describes this replay). Exports carry `angleMethod`, `schemaVersion` and a random pseudonymous id (FR14).

Every angle must show next to it: "estimated angle, not a medical measurement".

## Code (no frame is read, copied or stored)

```ts
// src/lib/session/peakRecorder.ts
// The camera feeds the pose model only. The code keeps numbers, never pixels.

export interface Landmark { x: number; y: number; visibility: number }
export interface PeakRecord {
  repIndex: number;
  peakFlexionDeg: number;          // estimated angle, not a medical measurement
  atMs: number;
  landmarks: { hip: Landmark; knee: Landmark; ankle: Landmark }; // numbers only
}

export async function startCamera(video: HTMLVideoElement): Promise<MediaStream> {
  // Call this only from a button press, after the explanation text (NFR9).
  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  video.srcObject = stream;
  await video.play();
  return stream;
}

export function stopCamera(stream: MediaStream | null): void {
  stream?.getTracks().forEach((t) => t.stop());
}
// The caller must run stopCamera on session end, visibilitychange,
// pagehide, route change and error.

// Pure function: records one peak per rep. It does not decide pass or fail.
export function makePeakRecorder(save: (r: PeakRecord) => void) {
  let repIndex = 0;
  let peak: PeakRecord | null = null;

  return {
    // Call each pose result. A null angle means a low-visibility frame (FR7).
    onAngle(angleDeg: number | null, atMs: number, lm: PeakRecord["landmarks"]) {
      if (angleDeg === null) return;
      if (!peak || angleDeg > peak.peakFlexionDeg) {
        peak = { repIndex, peakFlexionDeg: angleDeg, atMs, landmarks: lm };
      }
    },
    // Call when the rep counter (FR8 state machine) ends a rep.
    onRepEnd() {
      if (peak) save(peak);
      peak = null;
      repIndex += 1;
    },
  };
}
```

Notes for the caller:

- `save` writes the record to the session store (IndexedDB). Rep start and end come from the FR8 state machine, with the protocol `maxFlexion` and `returnWithinDeg`. A rep above `maxFlexion` plus the margin is not counted and shows "stop at your limit, do not push".
- The clinician opens the exported JSON (FR15) and sees the peak angle per rep with the label "estimated angle, not a medical measurement". The stick-figure replay is a later feature (FR24, M2).
- The session screen keeps its visible Stop button and the "knee gave way or hurts" button (FR11).
- Add a test that scans IndexedDB and localStorage for Blob and data URL values, and run `claims-check.sh` after the change.
- If the clinician needs images, that is a product decision that changes FR6 and NFR1. The decision needs the surgeon, a privacy review and consent. It is not a code change. Mark it PROPOSAL and do not build it until then.
