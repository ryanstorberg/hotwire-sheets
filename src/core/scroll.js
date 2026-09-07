import { clamp } from "./physics.js";
import { frameTask } from "./scheduler.js";
import { behavior, jsonAttribute, register, resolveComponent } from "./registry.js";
import { preventNativeFocusScroll } from "../platform/focus.js";
import { canScroll } from "../platform/scroll.js";

const instances = new WeakMap(), pageScrolls = new WeakMap();
export function getPageScrollData(doc = globalThis.document) {
  const replacement = doc && pageScrolls.get(doc);
  return { pageScrollContainer: replacement?.scroller || doc?.body, nativePageScrollReplaced: !!replacement };
}
export function observePageScrollData(callback, { document: doc = globalThis.document, signal } = {}) {
  const update = () => callback(getPageScrollData(doc));
  update();
  doc?.addEventListener("sheets:page-scroll-change", update, { signal });
  return () => doc?.removeEventListener("sheets:page-scroll-change", update);
}

/** Native scrolling, with scroll snap, viewport safety and explicit gesture chaining. */
export class Scroll {
  static get(element) { return instances.get(element); }
  constructor(root, options = {}) {
    if (instances.has(root)) throw new Error("A Scroll is already connected to this root");
    this.root = root; this.doc = root.ownerDocument; this.win = this.doc.defaultView;
    this.view = root.matches("[data-scroll-view]") ? root : root.querySelector("[data-scroll-view]");
    this.content = this.view?.querySelector("[data-scroll-content]");
    if (!this.content) throw new Error("Scroll requires data-scroll-view and data-scroll-content");
    this.original = new Map([this.view, this.content].map(node => [node, node.getAttribute("style")]));
    this.abort = new this.win.AbortController();
    this.options = {};
    this.unregister = register(this, "scroll", options.componentId);
    this.refresh = frameTask(this.win, () => this.measure());
    this.notify = frameTask(this.win, () => {
      const detail = { progress: this.getProgress(), distance: this.getDistance(), availableDistance: this.getAvailableDistance(), nativeEvent: this.lastEvent };
      this.options.onScroll?.(detail);
      this.root.dispatchEvent(new this.win.CustomEvent("scroll:progress", { bubbles: true, detail }));
    });
    this.setOptions(options);
    const signal = this.abort.signal;
    preventNativeFocusScroll(this.view, () => this.options.nativeFocusScrollPrevention, signal);
    this.eventTarget.addEventListener("scroll", event => this.scrolled(event), { signal, passive: true });
    this.eventTarget.addEventListener("scrollend", event => this.ended(event), { signal });
    const inputTarget = this.options.pageScroll && !this.replaced ? this.doc : this.view;
    inputTarget.addEventListener("wheel", event => this.gesture(event, event.deltaX, event.deltaY), { signal, passive: false });
    inputTarget.addEventListener("touchstart", event => { const t = event.touches[0]; this.touch = t && [t.clientX, t.clientY]; }, { signal, passive: true });
    inputTarget.addEventListener("touchmove", event => {
      if (!this.touch || event.touches.length !== 1) return;
      const t = event.touches[0], previous = this.touch; this.touch = [t.clientX, t.clientY];
      this.gesture(event, previous[0] - t.clientX, previous[1] - t.clientY);
    }, { signal, passive: false });
    inputTarget.addEventListener("keydown", event => {
      if (this.options.scrollGesture !== false || event.target.closest?.('input,textarea,select,button,a,[contenteditable="true"]')) return;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) event.preventDefault();
    }, { signal });
    this.view.addEventListener("focusin", event => this.focusInside(event), { signal });
    this.doc.addEventListener("click", event => this.click(event), { signal });
    this.resize = new this.win.ResizeObserver(this.refresh);
    this.resize.observe(this.view); this.resize.observe(this.content);
    this.win.addEventListener("resize", this.refresh, { signal, passive: true });
    this.win.visualViewport?.addEventListener("resize", this.refresh, { signal, passive: true });
    this.win.visualViewport?.addEventListener("scroll", this.refresh, { signal, passive: true });
    instances.set(root, this);
    if (options.componentRef) options.componentRef.current = this;
    this.measure();
  }

  setOptions(options) {
    const next = { axis: "y", pageScroll: false, nativePageScrollReplacement: false, safeArea: "visual-viewport", scrollGestureTrap: false,
      scrollGestureOvershoot: true, scrollGesture: "auto", nativeFocusScrollPrevention: true, scrollAnimationSettings: { skip: "auto" },
      scrollAnchoring: true, scrollSnapType: "none", scrollPadding: "auto", scrollTimelineName: "none", nativeScrollbar: true, ...this.options, ...options };
    if (!["x", "y"].includes(next.axis)) throw new TypeError("Scroll axis must be x or y");
    if (!["none", "layout-viewport", "visual-viewport"].includes(next.safeArea)) throw new TypeError("Invalid Scroll safeArea");
    if (!["none", "proximity", "mandatory"].includes(next.scrollSnapType)) throw new TypeError("Invalid scrollSnapType");
    if (this.eventTarget && (next.pageScroll !== this.options.pageScroll || next.nativePageScrollReplacement !== this.options.nativePageScrollReplacement)) throw new Error("Recreate Scroll to change its page scroll owner");
    if (next.nativePageScrollReplacement && !next.pageScroll) throw new TypeError("nativePageScrollReplacement requires pageScroll");
    this.options = next;
    this.axis = next.axis;
    if (!this.eventTarget) {
      const mobile = /Android|iPhone|iPad|iPod/.test(this.win.navigator.userAgent) || (this.win.navigator.platform === "MacIntel" && this.win.navigator.maxTouchPoints > 1);
      this.replaced = next.pageScroll && (next.nativePageScrollReplacement === true || (next.nativePageScrollReplacement === "auto" && (!mobile || this.win.matchMedia("(display-mode: standalone)").matches)));
      if (this.replaced) {
        if (pageScrolls.has(this.doc)) throw new Error("Only one replacement page Scroll can be active");
        this.pageStyle = this.doc.documentElement.getAttribute("style");
        this.pagePosition = [this.win.scrollX, this.win.scrollY];
        Object.assign(this.view.style, { position: "fixed", inset: "0", width: "100%", height: "100%" });
        this.doc.documentElement.style.overflow = "hidden";
        pageScrolls.set(this.doc, this);
      }
      if (next.pageScroll && !this.replaced) this.scroller = this.doc.scrollingElement;
      else {
        this.marker = this.doc.createComment("hotwire-scroll-content"); this.content.before(this.marker);
        this.scroller = this.doc.createElement("div"); this.scroller.dataset.scrollViewport = "";
        this.safeContent = this.doc.createElement("div"); this.safeContent.dataset.scrollSafeContent = "";
        this.content.before(this.scroller); this.scroller.append(this.safeContent); this.safeContent.append(this.content);
        this.view.style.overflow = "hidden";
      }
      this.eventTarget = next.pageScroll && !this.replaced ? this.win : this.scroller;
      if (this.replaced) this.doc.dispatchEvent(new this.win.CustomEvent("sheets:page-scroll-change"));
    }
    this.view.dataset.scrollAxis = this.axis;
    this.view.dataset.scrollNativeScrollbar = String(next.nativeScrollbar);
    this.view.dataset.scrollPage = String(next.pageScroll && !this.replaced);
    if (!this.marker && !this.scrollerStyleSaved) { this.scrollerStyle = this.scroller.getAttribute("style"); this.scrollerStyleSaved = true; }
    const style = this.scroller.style;
    style.scrollSnapType = next.scrollSnapType === "none" ? "none" : `${this.axis} ${next.scrollSnapType}`;
    style.scrollPadding = next.scrollPadding;
    style.scrollTimelineName = next.scrollTimelineName;
    style.scrollTimelineAxis = this.axis;
    style.overflowAnchor = next.scrollAnchoring ? "auto" : "none";
    style.scrollbarWidth = next.nativeScrollbar ? "auto" : "none";
    if (this.marker) {
      style.overflowX = this.axis === "x" && next.scrollGesture !== false ? "auto" : "hidden";
      style.overflowY = this.axis === "y" && next.scrollGesture !== false ? "auto" : "hidden";
    } else {
      if (!this.pageOverflow) this.pageOverflow = [style.overflowX, style.overflowY];
      [style.overflowX, style.overflowY] = next.scrollGesture === false ? ["hidden", "hidden"] : this.pageOverflow;
    }
    for (const axis of ["x", "y"]) style[axis === "x" ? "overscrollBehaviorX" : "overscrollBehaviorY"] = !next.scrollGestureOvershoot ? "none" : this.traps(axis, -1) && this.traps(axis, 1) ? "contain" : "auto";
    this.refresh?.();
  }

  getDistance() { return this.axis === "y" ? this.scroller.scrollTop : Math.abs(this.scroller.scrollLeft); }
  getAvailableDistance() { return Math.max(0, this.axis === "y" ? this.scroller.scrollHeight - this.scroller.clientHeight : this.scroller.scrollWidth - this.scroller.clientWidth); }
  getProgress() { return clamp(this.getDistance() / (this.getAvailableDistance() || 1), 0, 1); }
  scrollTo({ progress, distance, animationSettings = {} } = {}) {
    if (progress == null && distance == null) throw new TypeError("scrollTo requires progress or distance");
    const target = distance ?? progress * this.getAvailableDistance();
    if (!Number.isFinite(target)) throw new RangeError("Scroll destination must be finite");
    let skip = animationSettings.skip ?? "default";
    if (skip === "default") skip = this.options.scrollAnimationSettings.skip ?? "auto";
    if (skip === "auto") skip = this.win.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rtl = this.axis === "x" && this.win.getComputedStyle(this.scroller).direction === "rtl";
    this.scroller.scrollTo({ [this.axis === "y" ? "top" : "left"]: clamp(target, 0, this.getAvailableDistance()) * (rtl ? -1 : 1), behavior: skip ? "instant" : "smooth" });
  }
  scrollBy({ progress, distance, ...options } = {}) { this.scrollTo({ ...options, distance: this.getDistance() + (distance ?? (progress ?? 0) * this.getAvailableDistance()) }); }

  traps(axis, delta) {
    if (!this.options.scrollGestureOvershoot) return true;
    const trap = this.options.scrollGestureTrap;
    return typeof trap === "boolean" ? trap : !!(trap?.[`${axis}${delta < 0 ? "Start" : "End"}`] ?? trap?.[axis]);
  }
  gesture(event, dx, dy) {
    if (event.ctrlKey || event.defaultPrevented) return;
    const axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y", delta = axis === "x" ? dx : dy;
    if (!delta) return;
    const logicalDelta = axis === "x" && this.win.getComputedStyle(this.scroller).direction === "rtl" ? -delta : delta;
    const distance = axis === this.axis ? this.getDistance() : 0, max = axis === this.axis ? this.getAvailableDistance() : 0;
    const atEnd = logicalDelta < 0 ? distance <= .5 : distance >= max - .5;
    if (this.options.scrollGesture !== false && canScroll(event.target, this.scroller, axis, delta)) return;
    // Let actual scrolling remain native; only intercept forbidden boundary packets.
    if (this.options.scrollGesture === false || (atEnd && this.traps(axis, logicalDelta))) {
      if (event.cancelable) event.preventDefault();
      event.stopPropagation();
    }
  }
  scrolled(event) {
    if (!this.scrolling) {
      this.scrolling = true;
      const value = behavior(this.root, "scroll:start", this.options.onScrollStart, { dismissKeyboard: false });
      if (value.dismissKeyboard && this.view.contains(this.doc.activeElement)) this.doc.activeElement.blur();
    }
    this.lastEvent = event;
    this.notify();
    this.win.clearTimeout(this.endTimer);
    this.endTimer = this.win.setTimeout(() => this.ended(event), 160);
  }
  ended(event) {
    if (!this.scrolling) return;
    this.scrolling = false; this.win.clearTimeout(this.endTimer);
    this.options.onScrollEnd?.({ nativeEvent: event });
    this.root.dispatchEvent(new this.win.CustomEvent("scroll:end", { bubbles: true, detail: { nativeEvent: event } }));
  }
  measure() {
    const bounds = this.view.getBoundingClientRect(), visual = this.win.visualViewport;
    const size = this.axis === "y" ? this.win.innerHeight : this.win.innerWidth;
    const start = this.options.safeArea === "visual-viewport" ? (this.axis === "y" ? visual?.offsetTop : visual?.offsetLeft) || 0 : 0;
    const end = start + (this.options.safeArea === "visual-viewport" ? (this.axis === "y" ? visual?.height : visual?.width) || size : size);
    const after = this.options.safeArea === "none" ? 0 : Math.max(0, (this.axis === "y" ? bounds.bottom : bounds.right) - end);
    const before = this.options.safeArea === "none" ? 0 : Math.max(0, start - (this.axis === "y" ? bounds.top : bounds.left));
    this.view.style.setProperty("--scroll-safe-start", `${before}px`);
    this.view.style.setProperty("--scroll-safe-end", `${after}px`);
    if (this.focusScrollAllowed !== false && this.view.contains(this.doc.activeElement)) this.reveal(this.doc.activeElement);
  }
  focusInside(event) {
    const values = behavior(this.root, "scroll:focus-inside", this.options.onFocusInside, { scrollIntoView: true }, event);
    this.focusScrollAllowed = values.scrollIntoView;
    if (this.options.nativeFocusScrollPrevention) event.target.focus?.({ preventScroll: true });
    if (values.scrollIntoView) this.win.requestAnimationFrame(() => this.reveal(event.target));
  }
  reveal(target) {
    if (!target?.isConnected) return;
    const rect = target.getBoundingClientRect(), view = this.view.getBoundingClientRect(), visual = this.win.visualViewport;
    const vertical = this.axis === "y", startKey = vertical ? "top" : "left", endKey = vertical ? "bottom" : "right";
    let start = view[startKey], end = view[endKey];
    if (this.options.safeArea !== "none") {
      const offset = this.options.safeArea === "visual-viewport" ? (vertical ? visual?.offsetTop : visual?.offsetLeft) || 0 : 0;
      const size = this.options.safeArea === "visual-viewport" ? (vertical ? visual?.height : visual?.width) : null;
      start = Math.max(start, offset); end = Math.min(end, offset + (size || (vertical ? this.win.innerHeight : this.win.innerWidth)));
    }
    const delta = rect[endKey] > end ? rect[endKey] - end : rect[startKey] < start ? rect[startKey] - start : 0;
    if (delta) this.scrollBy({ distance: delta, animationSettings: { skip: true } });
  }
  click(event) {
    const trigger = event.target.closest?.("[data-scroll-action]");
    if (!trigger || event.defaultPrevented || event.metaKey || event.ctrlKey || event.button > 0) return;
    if (resolveComponent(this.doc, trigger.dataset.scrollFor, trigger, "scroll") !== this) return;
    const values = behavior(trigger, "scroll:press", jsonAttribute(trigger, "data-scroll-on-press", this.options.onPress), { forceFocus: true, runAction: true }, event);
    if (values.forceFocus) trigger.focus({ preventScroll: true });
    if (!values.runAction) return;
    event.preventDefault();
    const action = jsonAttribute(trigger, "data-scroll-action", {});
    if (action.type === "scroll-to") this.scrollTo(action);
    else if (action.type === "scroll-by") this.scrollBy(action);
  }
  destroy() {
    this.abort.abort(); this.resize.disconnect(); this.refresh.cancel(); this.notify.cancel(); this.win.clearTimeout(this.endTimer);
    this.unregister(); instances.delete(this.root);
    for (const [node, style] of this.original) style == null ? node.removeAttribute("style") : node.setAttribute("style", style);
    if (this.marker) { this.marker.replaceWith(this.content); this.scroller.remove(); }
    else this.scrollerStyle == null ? this.scroller.removeAttribute("style") : this.scroller.setAttribute("style", this.scrollerStyle);
    if (this.replaced) {
      pageScrolls.delete(this.doc);
      this.pageStyle == null ? this.doc.documentElement.removeAttribute("style") : this.doc.documentElement.setAttribute("style", this.pageStyle);
      this.win.scrollTo(...this.pagePosition);
      this.doc.dispatchEvent(new this.win.CustomEvent("sheets:page-scroll-change"));
    }
    if (this.options.componentRef?.current === this) this.options.componentRef.current = null;
    for (const key of ["scrollAxis", "scrollNativeScrollbar", "scrollPage"]) delete this.view.dataset[key];
  }
}
