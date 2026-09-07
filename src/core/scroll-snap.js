import { clamp } from "./physics.js";
import { canScroll } from "../platform/scroll.js";
import { blocksDragStart } from "./gesture.js";
import { WheelIntent } from "./wheel-intent.js";

// The view is a real scroll container. Its compositor scroll offset moves the
// surface; markers give CSS Scroll Snap the open detents and optional dismissal.
export class ScrollSnapMotion {
  constructor(sheet) {
    this.sheet = sheet;
    this.view = sheet.view;
    const direction = sheet.win.getComputedStyle(sheet.content).direction;
    this.view.dataset.sheetScrollSnap = "true";
    sheet.content.style.direction = direction;
    this.track = sheet.doc.createElement("div");
    this.track.dataset.sheetSnapTrack = "";
    this.track.setAttribute("aria-hidden", "true");
    this.view.append(this.track);
    this.markers = [];
    this.wheelIntent = new WheelIntent();
    this.abort = new sheet.win.AbortController();
    const signal = this.abort.signal;
    sheet.abort.signal.addEventListener("abort", () => this.abort.abort(), { once: true, signal });
    this.view.addEventListener("scroll", () => this.changed(), { signal, passive: true });
    this.view.addEventListener("scrollend", () => this.ended(), { signal });
    this.view.addEventListener("wheel", event => {
      if (event.ctrlKey) return;
      if (sheet.swipeCommitted) { if (event.cancelable) event.preventDefault(); return; }
      // A nonmodal gesture that began on the page stays with its manual owner.
      if (sheet.gesture.wheeling) { if (event.cancelable) event.preventDefault(); return; }
      const delta = (sheet.axis === "y" ? event.deltaY : event.deltaX) * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? sheet.extent : 1);
      if (sheet.gesture.passBoundary(delta, event.target) && sheet.ancestorSheet?.axis === sheet.axis) { sheet.ancestorSheet.gesture.wheel(event, true); return; }
      if (!this.allows(event.target, delta, "wheel")) { if (event.cancelable) event.preventDefault(); }
      else if (!event.defaultPrevented) {
        this.lastWheel = event;
        this.interact(event.target, delta);
        if (this.input) {
          this.inputType = "wheel";
          const tail = this.wheelIntent.observe(event, delta, sheet.win.performance.now());
          sheet.render(this.position);
          if (!sheet.commitSwipe("wheel", event) && tail) sheet.finishInput("wheel", event);
        }
      }
    }, { signal, passive: false });
    this.view.addEventListener("touchstart", event => {
      const touch = event.touches[0];
      this.touch = touch && (sheet.axis === "y" ? touch.clientY : touch.clientX);
      this.touchActive = true; this.inputType = "touch";
    }, { signal, passive: true });
    this.view.addEventListener("touchmove", event => {
      if (event.touches.length !== 1 || this.touch == null) return;
      const point = sheet.axis === "y" ? event.touches[0].clientY : event.touches[0].clientX;
      if (!this.allows(event.target, this.touch - point, "touch")) { if (event.cancelable) event.preventDefault(); }
      else if (!event.defaultPrevented) this.interact(event.target, this.touch - point);
      this.touch = point;
    }, { signal, passive: false });
    this.view.addEventListener("touchend", () => {
      this.touchActive = false;
      if (this.input) { sheet.render(this.position); if (!sheet.commitSwipe("touch")) sheet.finishInput("touch"); }
    }, { signal, passive: true });
    this.view.addEventListener("touchcancel", () => {
      this.touchActive = false;
      if (this.input) { this.cancel(); sheet.emit("drag-end", { input: "touch", cancelled: true }); sheet.snapTo(sheet.detent, { reason: "cancel" }); }
    }, { signal, passive: true });
  }

  interact(target, delta) {
    const { sheet } = this;
    if (!delta || (sheet.content.contains(target) && canScroll(target, sheet.content, sheet.axis, delta))) return;
    // Momentum at the far end of a fully expanded feed cannot move the view.
    // Starting a drag here would disable that feed until the wheel stream idles.
    if (!this.operation && this.position >= sheet.extent - .5 && delta * sheet.sign > 0) return;
    if (this.operation || this.animating) this.cancel();
    if (!this.input) {
      // A fresh touch can interrupt an uncommitted return animation. Restore
      // native user scrolling before handing this gesture to the browser.
      delete this.view.dataset.sheetGestureSettling;
      this.input = true;
      // Let the compositor consume the actual gesture before choosing a snap
      // destination. Directional wheel snapping otherwise treats a tiny pull
      // as a request for the next marker (or refuses chained input entirely).
      this.view.dataset.sheetSnapSuspended = "true";
      sheet.setState("dragging");
      sheet.emit("drag-start", { input: "scroll" });
    }
    this.lastInput = sheet.win.performance.now();
    this.scheduleEnd();
  }

  allows(target, delta, input) {
    const { sheet } = this;
    // Content and backdrop are the same native scrolling surface. Switching
    // engines as the sheet crosses the pointer loses the wheel transaction.
    const region = sheet.gesture.region(target);
    if (!sheet.isOpen || sheet.swipeCommitted || !sheet.stack.canInteract(sheet) || !region) return false;
    if (region === "outside" && blocksDragStart(target)) return false;
    if (sheet.content.contains(target) && canScroll(target, sheet.content, sheet.axis, delta)) return true;
    if (!sheet.options.draggable || (input === "wheel" && !sheet.options.wheel) || target.closest("[data-sheet-no-drag]")) return false;
    if (sheet.options.handleOnly && !target.closest("[data-sheet-handle]")) return false;
    if (input === "touch" && !target.closest("[data-sheet-handle]") && blocksDragStart(target)) return false;
    return true;
  }

  get offset() { return this.sheet.axis === "y" ? this.view.scrollTop : this.view.scrollLeft; }
  offsetFor(position) { return this.sheet.sign > 0 ? position : this.sheet.extent - position; }
  get position() { return clamp(this.sheet.sign > 0 ? this.offset : this.sheet.extent - this.offset, 0, this.sheet.extent); }

  measure() {
    const { sheet } = this;
    const geometry = `${sheet.viewport.width}:${sheet.viewport.height}:${sheet.extent}:${sheet.points.join(",")}`;
    const changed = this.geometry !== geometry;
    this.geometry = geometry;
    this.track.style.width = `${sheet.viewport.width + (sheet.axis === "x" ? sheet.extent : 0)}px`;
    this.track.style.height = `${sheet.viewport.height + (sheet.axis === "y" ? sheet.extent : 0)}px`;
    this.points();
    if (changed && !this.operation && sheet.state !== "dragging") this.jump(sheet.state === "open" ? sheet.points[sheet.detent] : sheet.position);
    if (changed && this.operation) {
      this.operation.target = sheet.state === "closing" ? 0 : sheet.points[sheet.detent];
      this.scroll(this.operation.target, "smooth");
    }
  }

  points() {
    const { sheet } = this;
    const closed = (sheet.options.dismissible && sheet.options.swipeToDismiss) || sheet.state === "closing" || sheet.state === "opening";
    const positions = [...new Set([...(closed ? [0] : []), ...sheet.points])];
    const signature = `${sheet.extent}:${positions.join(",")}`;
    if (signature === this.signature) return;
    this.signature = signature;
    this.markers.forEach(marker => marker.remove());
    this.markers = positions.map(position => {
      const marker = sheet.doc.createElement("div");
      marker.dataset.sheetSnapPoint = String(position);
      marker.setAttribute("aria-hidden", "true");
      marker.style[sheet.axis === "y" ? "top" : "left"] = `${this.offsetFor(position)}px`;
      this.view.append(marker);
      return marker;
    });
  }

  scroll(position, behavior = "instant") {
    this.view.scrollTo({ [this.sheet.axis === "y" ? "top" : "left"]: this.offsetFor(position), behavior });
  }

  jump(position, dragging = false) {
    this.view.dataset.sheetSnapSuspended = "true";
    this.scroll(clamp(position, 0, this.sheet.extent));
    if (!dragging) delete this.view.dataset.sheetSnapSuspended;
  }

  changed() {
    const { sheet } = this;
    // A queued scroll from an earlier transition must not replace a newer
    // pointer/wheel position before Gesture's next animation-frame write.
    if (sheet.gesture.session?.dragging || sheet.gesture.wheeling) return;
    if (!sheet.isOpen || this.animating) return;
    // Browser scrolling owns direct travel up to the dismissal threshold.
    // Once committed, programmatic scrolling finishes without waiting for the
    // remaining wheel momentum or allowing it to reverse the decision.
    if (Math.abs(this.position - sheet.position) < 0.5) return;
    this.lastScroll = sheet.win.performance.now();
    if (!this.operation && sheet.state !== "dragging") {
      sheet.setState("dragging");
      sheet.emit("drag-start", { input: "scroll" });
    }
    sheet.render(this.position);
    if (this.input && (this.inputType === "wheel" || !this.touchActive) && sheet.commitSwipe(this.inputType || "scroll", this.lastWheel)) return;
    this.scheduleEnd();
  }

  scheduleEnd() {
    this.sheet.win.clearTimeout(this.timer);
    this.timer = this.sheet.win.setTimeout(() => this.ended(), 160);
  }

  ended() {
    const { sheet } = this;
    if (sheet.gesture.session?.dragging || sheet.gesture.wheeling) return;
    if (this.input && this.inputType === "touch" && this.touchActive) return;
    if (this.input && sheet.isOpen) {
      if (sheet.win.performance.now() - Math.max(this.lastInput, this.lastScroll || 0) < 150) { this.scheduleEnd(); return; }
      this.input = false;
      // Read the final native offset before re-enabling snap or starting the
      // requested transition; queued scroll events can trail the last packet.
      sheet.render(this.position);
      sheet.emit("drag-end", { input: "scroll" });
      sheet.settle(0);
      return;
    }
    if (!sheet.isOpen || (!this.operation && this.view.hasAttribute("data-sheet-snap-suspended"))) return;
    if (this.operation) {
      const operation = this.operation;
      if (Math.abs(this.position - operation.target) > 1) {
        // Focus and content reflow can interrupt browser smooth scrolling.
        // Once genuinely idle, finish the requested destination instead of
        // leaving its transition promise and modal state pending forever.
        if (sheet.win.performance.now() - Math.max(operation.started, this.lastScroll || 0) < 150) { this.scheduleEnd(); return; }
        this.jump(operation.target);
      }
      this.operation = null;
      delete this.view.dataset.sheetSnapSuspended;
      sheet.render(operation.target);
      operation.resolve(true);
      return;
    }
    if (sheet.state === "dragging") {
      sheet.emit("drag-end", { input: "scroll" });
      sheet.settle(0);
    }
  }

  async to(target, immediate = false, settings = null) {
    this.cancel();
    this.points();
    const { sheet } = this;
    // Native gestures and detents can use an authored WAAPI spring/easing for
    // programmatic transitions. The physical scroll offset is committed once.
    if (settings && !immediate) {
      this.animating = true;
      this.view.dataset.sheetSnapSuspended = "true";
      const completed = await sheet.animator.to(sheet.position, target, 0, settings, value => sheet.render(value));
      if (this.animating) { this.jump(completed ? target : sheet.position); this.animating = false; }
      return completed;
    }
    if (immediate || sheet.win.matchMedia("(prefers-reduced-motion: reduce)").matches || Math.abs(this.position - target) < 1) {
      this.jump(target);
      sheet.render(target);
      return Promise.resolve(true);
    }
    return new Promise(resolve => {
      this.operation = { target, resolve, started: sheet.win.performance.now() };
      // Re-enabling mandatory snapping at a partial offset immediately resnaps
      // the view before scrollTo can animate. Restore CSS snap at the destination.
      this.view.dataset.sheetSnapSuspended = "true";
      this.scroll(target, "smooth");
      this.scheduleEnd();
    });
  }

  cancel() {
    this.sheet.win.clearTimeout(this.timer);
    this.input = false;
    this.wheelIntent.reset();
    if (this.animating) { this.sheet.animator.cancel(); this.jump(this.sheet.position, true); this.animating = false; }
    const operation = this.operation;
    this.operation = null;
    if (operation) {
      this.jump(this.position, true);
      operation.resolve(false);
    }
  }

  destroy() {
    this.cancel();
    this.abort.abort();
    this.track.remove();
    this.markers.forEach(marker => marker.remove());
    delete this.view.dataset.sheetScrollSnap;
    delete this.view.dataset.sheetSnapSuspended;
    this.view.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }
}
