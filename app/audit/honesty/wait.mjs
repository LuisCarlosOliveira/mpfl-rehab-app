export async function waitForText(read, text, ms, sleep, now = () => performance.now()) {
  const t0 = now();
  let got = '';
  while (now() - t0 < ms) {
    got = await read();
    if (got.trim() === text) return;
    await sleep(150);
  }
  throw new Error(`h1 is "${got}", wanted "${text}"`);
}
