import { canScroll } from "../platform/scroll.js";
import { rubberBand } from "./physics.js";
import { WheelIntent } from "./wheel-intent.js";

const interactive = 'input,textarea,select,button,a,[contenteditable="true"],[data-sheet-no-drag]';

export function blocksDragStart(target) {
  if (target.closest("[data-sheet-no-drag]")) return true;
  const control = target.closest(interactive);
  return !!control && !control.matches("button[data-sheet-drag],a[data-sheet-drag]");
}

export class Gesture {
  constructor(sheet, signal) {
    this.sheet = sheet;
    this.wheelIntent = new WheelIntent();
    const { content, doc } = sheet;
    const listen = (target, name, handler, options = {}) => target.addEventListener(name, handler, { ...options, signal });
    listen(doc, "pointerdown", (event) => {
      if (event.pointerType === "touch" || event.button !== 0 || !event.isPrimary) return;
      this.begin(event.clientX, event.clientY, event.target, event.pointerId);
    });
    listen(doc, "pointermove", (event) => { if (event.pointerId === this.session?.id) this.move(event.clientX, event.clientY, event); });
    listen(doc, "pointerup", (event) => { if (event.pointerId === this.session?.id) this.end(); });
    listen(doc, "pointercancel", () => this.end(true));
    listen(doc, "touchstart", (event) => {
      if (event.touches.length !== 1) { this.end(true); return; }
      const touch = event.touches[0];
      this.begin(touch.clientX, touch.clientY, event.target, "touch");
      if (this.session && sheet.options.preventEdgeSwipe && (touch.clientX < 28 || touch.clientX > sheet.win.innerWidth - 28) && event.cancelable) event.preventDefault();
    }, { passive: false });
    listen(doc, "touchmove", (event) => {
      if (event.touches.length !== 1) { this.end(true); return; }
      if (this.session?.id === "touch") this.move(event.touches[0].clientX, event.touches[0].clientY, event);
    }, { passive: false });
    listen(doc, "touchend", () => this.end());
    listen(doc, "touchcancel", () => this.end(true));
    listen(doc, "wheel", (event) => this.wheel(event), { passive: false });
    listen(content, "dragstart", (event) => {
      // Native link/image dragging would cancel the sheet's pointer gesture.
      if (this.session && (event.target.matches("img") || event.target.closest("[data-sheet-drag]"))) event.preventDefault();
    });
    listen(doc, "click", (event) => {
      if (event.detail && sheet.win.performance.now() < this.suppressClickUntil) { event.preventDefault(); event.stopImmediatePropagation(); }
    }, { capture: true });
    signal.addEventListener("abort", () => this.cancel(), { once: true });
  }

  region(target) {
    const sheet = this.sheet;
    if (!(target instanceof sheet.win.Element)) return null;
    if (target.closest('[data-sheet-backdrop][data-sheet-swipeable="false"]')) return null;
    const owner = target.closest("[data-sheet-content]");
    if (owner === sheet.content) return "content";
    if (owner || !sheet.options.swipeFromOutside || sheet.stack.top !== sheet || sheet.stack.islands(sheet).some(element => element.contains(target)) || sheet.stack.externalContents().some(element => element.contains(target))) return null;
    const view = target.closest("[data-sheet-view]");
    return !view || view === sheet.view ? "outside" : null;
  }

  begin(x, y, target, id) {
    const sheet = this.sheet;
    if (!sheet.isOpen || sheet.swipeCommitted || !sheet.options.draggable || !sheet.stack.canInteract(sheet) || this.session) return;
    const region = this.region(target);
    if (!region) return;
    if (target.closest("[data-sheet-no-drag]")) return;
    const handle = target.closest("[data-sheet-handle]");
    if (!handle && (sheet.options.handleOnly || blocksDragStart(target))) return;
    this.session = { id, start: sheet.axis === "y" ? y : x, cross: sheet.axis === "y" ? x : y,
      last: sheet.axis === "y" ? y : x, time: sheet.win.performance.now(), target, handle, region,
      position: sheet.position, velocity: 0, dragging: false };
  }

  move(x, y, event) {
    const s = this.session, sheet = this.sheet;
    if (!s) return;
    if (!sheet.stack.canInteract(sheet) || (s.region === "outside" && sheet.stack.top !== sheet)) { this.end(true); return; }
    const point = sheet.axis === "y" ? y : x, cross = sheet.axis === "y" ? x : y;
    if (!s.dragging && Math.max(Math.abs(point - s.start), Math.abs(cross - s.cross)) < 6) return;
    if (!s.dragging && Math.abs(cross - s.cross) > Math.abs(point - s.start)) {
      const axis = sheet.axis === "y" ? "x" : "y", delta = s.cross-cross;
      if (!canScroll(s.target, sheet.content, axis, delta)) {
        if (!sheet.allowsOverscroll(axis, delta)) { if (event.cancelable) event.preventDefault(); }
        else this.transferPointer(x, y, event, axis, s);
      }
      this.session = null; return;
    }
    const movement = point - s.last;
    if (this.passBoundary(-movement, s.target)) {
      this.end();
      this.transferPointer(x, y, event, sheet.axis, { ...s, start: s.last });
      return;
    }
    // The native view owns the entire touch sequence, including chaining from
    // the feed to its dismissal detent. A second boundary owner would trap it.
    if (sheet.nativeMotion && s.id === "touch" && sheet.view.contains(s.target) && !s.transferred) return;
    if (!s.dragging && !s.handle) {
      const scrollable = canScroll(s.target, sheet.content, sheet.axis, -movement);
      // Scroll ownership persists unless this presentation explicitly supports
      // continuing through either article boundary to dismiss the sheet.
      const boundaryExit = sheet.canDismissAtScrollBoundary(s.target, -movement);
      if (scrollable || (s.scrolling && !boundaryExit)) {
        s.scrolling = true;
        if (!scrollable && event.cancelable) event.preventDefault();
        s.start = s.last = point; s.position = sheet.position; s.time = sheet.win.performance.now();
        return;
      }
      if (s.scrolling) { s.scrolling = false; s.start = s.last; }
    }
    if (event.cancelable === false) return;
    event.preventDefault();
    if (!s.dragging) {
      s.dragging = true;
      sheet.prepareDrag(s.target, -movement);
      s.position = sheet.position;
      sheet.setState("dragging");
      sheet.emit("drag-start");
    }
    const now = sheet.win.performance.now(), elapsed = Math.max(1, now - s.time);
    const velocity = -movement * sheet.motionSign / sheet.motionScale / elapsed;
    s.velocity = elapsed > 80 ? velocity : s.velocity * 0.4 + velocity * 0.6;
    s.time = now; s.last = point;
    const raw = s.position - (point - s.start) * sheet.motionSign / sheet.motionScale;
    const min = sheet.options.dismissible && sheet.options.swipeToDismiss ? 0 : Math.min(...sheet.points);
    const position = rubberBand(raw, min, sheet.extent, sheet.extent);
    sheet.position = sheet.options.swipeOvershoot ? position : Math.min(sheet.extent, position);
    sheet.paint();
  }

  end(cancelled = false) {
    const session = this.session;
    this.session = null;
    if (!session?.dragging) return;
    this.suppressClickUntil = this.sheet.win.performance.now() + 250;
    const velocity = this.sheet.win.performance.now() - session.time > 100 ? 0 : session.velocity;
    this.sheet.emit("drag-end", { cancelled, velocity });
    if (cancelled) this.sheet.snapTo(this.sheet.detent, { reason: "cancel" });
    else this.sheet.settle(velocity);
  }

  wheel(event, transferred = false) {
    const sheet = this.sheet;
    if (sheet.swipeCommitted) { if (event.cancelable && sheet.view.contains(event.target)) event.preventDefault(); return; }
    if (!sheet.options.wheel || !sheet.options.draggable || !sheet.isOpen || !sheet.stack.canInteract(sheet) || event.ctrlKey || event.defaultPrevented) return;
    const region = transferred ? "content" : this.region(event.target);
    if (!region) return;
    // A moving nonmodal sheet can uncover a page button under the pointer.
    // Only new gestures belong to that control; keep consuming a claimed swipe.
    if (region === "outside" && !this.wheeling && blocksDragStart(event.target)) return;
    if (event.target.closest("[data-sheet-no-drag]")) return;
    if (sheet.options.handleOnly && !event.target.closest("[data-sheet-handle]")) return;
    // ScrollSnapMotion arbitrates native input. Do not retain a separate wheel
    // ownership flag when a feed reaches its boundary or a child uncovers it.
    // WebKit's native scroll packets are noncancelable after the first one.
    // Becoming cancelable again starts a new physical gesture, even if the
    // preceding momentum hasn't left a full debounce interval between them.
    if (event.cancelable && this.lastWheelCancelable === false) this.wheelScrolling = false;
    this.lastWheelCancelable = event.cancelable;
    const raw = sheet.axis === "y" ? event.deltaY : event.deltaX;
    const cross = sheet.axis === "y" ? event.deltaX : event.deltaY;
    if (Math.abs(cross) > Math.abs(raw)) {
      const axis = sheet.axis === "y" ? "x" : "y";
      if (!canScroll(event.target, sheet.content, axis, cross)) {
        if (!sheet.allowsOverscroll(axis, cross)) { if (event.cancelable) event.preventDefault(); }
        else if (sheet.ancestorSheet?.axis === axis) sheet.ancestorSheet.gesture.wheel(event, true);
      }
      return;
    }
    if (raw === 0) return;
    if (this.passBoundary(raw, event.target)) {
      if (this.wheeling) { this.cancel(); sheet.emit("drag-end", { input: "wheel" }); sheet.settle(0); }
      const parent = sheet.ancestorSheet;
      if (parent?.axis === sheet.axis) parent.gesture.wheel(event, true);
      return;
    }
    if (sheet.nativeMotion && sheet.view.contains(event.target) && !this.wheeling && !transferred) return;
    const scrollable = canScroll(event.target, sheet.content, sheet.axis, raw);
    const boundaryExit = sheet.canDismissAtScrollBoundary(event.target, raw);
    if ((!this.wheeling && scrollable) || (this.wheelScrolling && !boundaryExit)) {
      this.wheelScrolling = true;
      if (!scrollable && event.cancelable) event.preventDefault();
      this.scheduleWheelEnd();
      return;
    }
    this.wheelScrolling = false;
    // Once the first packet is claimed, the sheet owns this wheel gesture.
    // Some browsers make its later packets noncancelable; keep consuming their
    // movement instead of reducing a whole swipe to its first few pixels.
    // An unclaimed native scroll must still stay with the browser.
    if (event.cancelable === false && !this.wheeling) return;
    const delta = raw * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? sheet.extent : 1);
    const tail = this.wheelIntent.observe(event, delta, sheet.win.performance.now());
    if (event.cancelable) event.preventDefault();
    if (!this.wheeling) { sheet.prepareDrag(event.target, raw); sheet.setState("dragging"); sheet.emit("drag-start", { input: "wheel" }); }
    this.wheeling = true;
    const min = sheet.options.dismissible && sheet.options.swipeToDismiss ? 0 : Math.min(...sheet.points);
    const position = rubberBand(sheet.position + delta * sheet.motionSign / sheet.motionScale, min, sheet.extent, sheet.extent);
    sheet.position = sheet.options.swipeOvershoot ? position : Math.min(sheet.extent, position);
    sheet.paint();
    if (sheet.commitSwipe("wheel", event)) return;
    if (tail) { sheet.finishInput("wheel", event); return; }
    this.scheduleWheelEnd();
  }

  transferPointer(x, y, event, axis, session) {
    const parent = this.sheet.ancestorSheet;
    if (parent?.axis !== axis || !parent.stack.canInteract(parent)) return;
    parent.gesture.begin(this.sheet.axis === "x" ? session.start : session.cross, this.sheet.axis === "y" ? session.start : session.cross, parent.content, session.id);
    if (parent.gesture.session) { parent.gesture.session.transferred = true; parent.gesture.move(x, y, event); }
  }

  passBoundary(delta, target) {
    const sheet = this.sheet;
    if (target && canScroll(target, sheet.content, sheet.axis, delta)) return false;
    if (!sheet.allowsOverscroll(sheet.axis, delta)) return false;
    return delta * sheet.motionSign > 0 ? sheet.position >= sheet.extent - .5 && !sheet.options.oppositeEdgeDismiss : !sheet.options.swipeToDismiss && sheet.position <= Math.min(...sheet.points) + .5;
  }

  scheduleWheelEnd() {
    const sheet = this.sheet;
    sheet.win.clearTimeout(this.wheelTimer);
    this.wheelTimer = sheet.win.setTimeout(() => {
      const movedSheet = this.wheeling;
      this.wheeling = false;
      this.wheelScrolling = false;
      this.lastWheelCancelable = undefined;
      if (movedSheet) {
        sheet.emit("drag-end", { input: "wheel" });
        sheet.settle(0);
      }
    }, 120);
  }

  cancel() { this.session = null; this.wheeling = false; this.wheelScrolling = false; this.wheelIntent.reset(); this.lastWheelCancelable = undefined; this.sheet.win.clearTimeout(this.wheelTimer); }
}
