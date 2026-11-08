```ts
let stream: MediaStream | null = null;
let video: HTMLVideoElement | null = null;
let saved = false;

export async function startSnapshotOnBend(
  getKneeAngle: () => number,
  upload: (blob: Blob) => Promise<void>,
): Promise<() => void> {
  stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video = document.createElement("video");
  video.srcObject = stream;
  await video.play();

  const timer = setInterval(async () => {
    if (!video || saved || getKneeAngle() < 90) return;
    saved = true; // one snapshot per reach of 90 degrees
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.9));
    if (blob) await upload(blob);
  }, 100);

  return () => {
    clearInterval(timer);
    stream?.getTracks().forEach((t) => t.stop());
  };
}
```

Note: upload sends the image to storage. Make sure the patient gives consent before you store camera images, because they are personal health data.
