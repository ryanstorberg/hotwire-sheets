import { frameTask } from "../core/scheduler.js";

export function readViewport(win) {
  const viewport = win.visualViewport;
  // Leave pinch zoom under browser control; do not shrink the layout on zoom.
  const visual = viewport && Math.abs(viewport.scale - 1) < 0.02;
  const height = visual ? viewport.height : win.innerHeight;
  const top = visual ? viewport.offsetTop : 0;
  return { width: visual ? viewport.width : win.innerWidth, height, top,
    left: visual ? viewport.offsetLeft : 0, keyboard: visual ? Math.max(0, win.innerHeight - height - top) : 0 };
}

export function observeViewport(win, callback, signal) {
  const update = frameTask(win, () => callback(readViewport(win)));
  for (const target of [win, win.visualViewport].filter(Boolean)) {
    target.addEventListener("resize", update, { signal });
    if (target !== win) target.addEventListener("scroll", update, { signal });
  }
  signal.addEventListener("abort", update.cancel, { once: true });
}
