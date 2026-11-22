type FrameWindow = { self: object; top: object | null; document: { documentElement: { hidden: boolean | string } } };

export function renderUnlessFramed(win: FrameWindow, render: () => void): void {
  let framed: boolean;
  try {
    framed = win.top !== win.self;
  } catch {
    framed = true;
  }
  if (framed) {
    win.document.documentElement.hidden = true;
    return;
  }
  render();
}
