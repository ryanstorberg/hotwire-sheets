import { canScroll } from "../platform/scroll.js";

// Wheel events have no portable "fingers released" phase. A sharp fall in
// magnitude identifies the momentum tail; tiny packets must not postpone
// settlement forever. Direct touch/pointer input uses its actual release event.
export class WheelIntent {
  reset() { this.peak = 0; this.started = this.last = 0; this.direction = 0; }
  observe(event, delta, now) {
    const magnitude = Math.abs(delta), direction = Math.sign(delta);
    if (!this.last || now - this.last > 120 || direction !== this.direction) {
      this.peak = 0; this.started = now;
    }
    this.last = now; this.direction = direction; this.event = event;
    this.peak = Math.max(this.peak || 0, magnitude);
    return now - this.started >= 60 && this.peak >= 8 && magnitude <= this.peak * .2;
  }
}

const guards = new WeakMap();
export function clearWheelTail(doc) { guards.get(doc)?.(); }

// Keep the rest of one wheel burst from interrupting a decision or dismissing
// the exposed parent. This owns input only: it never leaves an overlay or a
// scroll lock over the parent. A pause, reversal, or renewed push releases it.
export function guardWheelTail(sheet, event) {
  if (!event) return;
  const { doc, win, axis } = sheet;
  guards.get(doc)?.();
  const abort = new win.AbortController();
  let last = win.performance.now(), magnitude = Math.abs(axis === "y" ? event.deltaY : event.deltaX);
  const direction = Math.sign(axis === "y" ? event.deltaY : event.deltaX);
  let timer;
  const release = () => {
    abort.abort(); win.clearTimeout(timer);
    if (guards.get(doc) === release) guards.delete(doc);
    if (!sheet.swipeCommitted) delete sheet.view.dataset.sheetGestureSettling;
  };
  const renew = () => { win.clearTimeout(timer); timer = win.setTimeout(release, 120); };
  doc.addEventListener("wheel", next => {
    const delta = axis === "y" ? next.deltaY : next.deltaX, size = Math.abs(delta), now = win.performance.now();
    const cross = axis === "y" ? next.deltaX : next.deltaY;
    if (next.ctrlKey || Math.abs(cross) > size || now-last > 120 || delta*direction < 0 || size > magnitude*1.75+2) { release(); return; }
    last = now; magnitude = size; renew();
    const exposed = sheet.stack.top;
    if (exposed && exposed !== sheet && canScroll(next.target, exposed.content, axis, delta)) return;
    if (next.cancelable) next.preventDefault();
    next.stopImmediatePropagation();
  }, { capture: true, passive: false, signal: abort.signal });
  for (const name of ["pointerdown", "touchstart"]) doc.addEventListener(name, release, { capture: true, passive: true, signal: abort.signal });
  sheet.abort.signal.addEventListener("abort", release, { once: true, signal: abort.signal });
  guards.set(doc, release); renew();
}
