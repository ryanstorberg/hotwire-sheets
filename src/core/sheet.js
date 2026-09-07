import { sheetOptions } from "./sheet-options.js";
import { animationSettings } from "./animation-settings.js";
import { register, registryFor, resolveComponent, behavior, jsonAttribute, getElement } from "./registry.js";
import { Outlet, updateOutlets } from "./outlet.js";
import { autoFocusTarget } from "../platform/components.js";
import { createThemeColorDimmingOverlay } from "../platform/theme-color.js";
import { Animator } from "./animator.js";
import { motionEffects } from "./motion-effects.js";
import { ScrollSnapMotion } from "./scroll-snap.js";
import { Gesture } from "./gesture.js";
import { guardWheelTail, clearWheelTail } from "./wheel-intent.js";
import { adjacentDetent, nearestDetent, resolveDetents } from "./detents.js";
import { clamp } from "./physics.js";
import { frameTask } from "./scheduler.js";
import { stackFor } from "./stack.js";
import { canScroll } from "../platform/scroll.js";
import { focusInitial, keepFocusVisible, preventNativeFocusScroll } from "../platform/focus.js";
import { observeViewport, readViewport } from "../platform/viewport.js";

const instances = new WeakMap();
let sequence = 0;

export class Sheet {
  static get(element) { return instances.get(element); }

  constructor(root, options = {}) {
    if (instances.has(root)) throw new Error("A Sheet is already connected to this root");
    this.rawOptions = { ...options };
    this.options = sheetOptions(options);
    this.root = root;
    this.doc = root.ownerDocument;
    this.win = this.doc.defaultView;
    resolveDetents(this.options.detents, 1000, 100, value => this.resolveLength(value));
    this.view = root.querySelector("[data-sheet-view]");
    this.content = this.view?.querySelector("[data-sheet-content]");
    if (!this.content) throw new Error("Sheet requires data-sheet-view and data-sheet-content descendants");
    if (!root.id) {
      let id;
      do { id = `hotwire-sheet-${++sequence}`; } while (this.doc.getElementById(id));
      root.id = id;
    }
    this.content.id ||= `${root.id}-content`;
    this.root.setAttribute("data-sheet-root", "");
    this.axis = ["top", "bottom"].includes(this.options.edge) ? "y" : "x";
    this.sign = ["bottom", "right"].includes(this.options.edge) ? 1 : -1;
    this.endDismissal = false;
    this.view.dataset.sheetEdge = this.options.edge;
    this.view.dataset.sheetModal = String(this.options.modal);
    this.view.dataset.sheetStackEffect = String(this.options.stackEffect);
    if (this.options.contentPlacement) this.view.dataset.sheetPlacement = this.options.contentPlacement;
    this.original = new Map([this.view, this.content].map((node) => [node, {
      style: node.getAttribute("style"), role: node.getAttribute("role"), tabindex: node.getAttribute("tabindex"),
      modal: node.getAttribute("aria-modal")
    }]));
    this.content.setAttribute("role", this.options.sheetRole || this.content.getAttribute("role") || "dialog");
    this.content.setAttribute("tabindex", this.content.getAttribute("tabindex") || "-1");
    this.configureInteractionStyles();
    if (this.options.modal && ["dialog", "alertdialog"].includes(this.content.role)) this.content.setAttribute("aria-modal", "true");
    else this.content.removeAttribute("aria-modal");
    this.abort = new this.win.AbortController();
    const signal = this.abort.signal;
    preventNativeFocusScroll(this.content, () => this.options.nativeFocusScrollPrevention, signal);
    this.stack = stackFor(this.doc);
    this.unregister = register(this, "sheet", this.options.componentId);
    this.stackGroup = resolveComponent(this.doc, this.options.forComponent || this.options.stack, root.parentElement, "sheetStack");
    this.animator = new Animator(this.win, (frames, duration) => motionEffects(this, frames, duration));
    this.gesture = new Gesture(this, signal);
    this.position = 0;
    this.progress = 0;
    this.detent = this.options.initialDetent;
    this.state = "closed";
    this.view.hidden = true;
    this.viewport = readViewport(this.win);
    this.paint = frameTask(this.win, () => { this.nativeMotion?.jump(this.position, true); this.render(this.position); });
    this.refresh = frameTask(this.win, () => this.measure());
    // Switching exit edges uses the animation backend; article scrolling stays native.
    this.nativeMotion = this.options.scrollSnap && !this.options.contentPlacement && !this.options.scrollEndDismiss && !this.options.oppositeEdgeDismiss && this.win.CSS?.supports("scroll-snap-type", "y mandatory") ? new ScrollSnapMotion(this) : null;
    this.resize = new this.win.ResizeObserver(this.refresh);
    this.mutations = new this.win.MutationObserver(() => { this.observeContent(); this.refresh(); });
    this.mutations.observe(this.content, { childList: true, characterData: true, subtree: true });
    this.observeContent();
    observeViewport(this.win, (viewport) => { this.viewport = viewport; this.refresh(); }, signal);
    this.doc.addEventListener("click", (event) => this.click(event), { signal });
    this.view.addEventListener("pointerdown", (event) => {
      this.outsidePointerDown = event.target === this.view || event.target.matches("[data-sheet-backdrop]");
    }, { signal });
    this.content.addEventListener("keydown", (event) => this.handleKey(event), { signal });
    this.content.addEventListener("focusin", event => {
      this.options.onFocusInside?.({ nativeEvent: event });
      this.win.requestAnimationFrame(() => { if (this.isOpen && this.options.nativeFocusScrollPrevention) keepFocusVisible(this); });
    }, { signal });
    instances.set(root, this);
    this.setState("closed");
    this.syncTriggers();
    this.outlets = [];
    if (options.travelAnimation || options.stackingAnimation) this.primaryOutlet = this.outlet(this.content, { travelAnimation: options.travelAnimation, stackingAnimation: options.stackingAnimation });
    for (const element of [this.view, ...this.view.querySelectorAll("[data-sheet-travel-animation], [data-sheet-stacking-animation]")]) if (element.hasAttribute("data-sheet-travel-animation") || element.hasAttribute("data-sheet-stacking-animation")) this.outlets.push(new Outlet(element, { forComponent: element.dataset.sheetFor || this, travelAnimation: jsonAttribute(element, "data-sheet-travel-animation"), stackingAnimation: jsonAttribute(element, "data-sheet-stacking-animation") }));
    const title = this.content.querySelector("[data-sheet-title]"), description = this.content.querySelector("[data-sheet-description]");
    if (title && !this.content.hasAttribute("aria-labelledby")) { title.id ||= `${root.id}-title`; this.content.setAttribute("aria-labelledby", title.id); }
    if (description && !this.content.hasAttribute("aria-describedby")) { description.id ||= `${root.id}-description`; this.content.setAttribute("aria-describedby", description.id); }
    if (options.defaultPresented || options.presented) this.win.queueMicrotask(() => { if (this.state !== "destroyed") this.open(); });
  }

  get isOpen() { return this.state !== "closed" && this.state !== "destroyed"; }
  get presented() { return this.isOpen; }
  set presented(value) { value ? this.open() : this.close(); }
  get activeDetent() { return this.isOpen ? this.detent + 1 : 0; }
  set activeDetent(index) { this.setActiveDetent(index); }
  setActiveDetent(index, options = {}) {
    if (!Number.isInteger(index) || index < 0 || index > this.options.detents.length) throw new RangeError("activeDetent includes closed at 0");
    return index === 0 ? this.close(options) : this.isOpen ? this.snapTo(index - 1, options) : this.open({ ...options, detent: index - 1 });
  }
  outlet(element, options = {}) { const outlet = new Outlet(element, { ...options, forComponent: this }); this.outlets.push(outlet); return outlet; }
  get motionSign() { return this.endDismissal ? -this.sign : this.sign; }
  get motionScale() {
    if (this.options.contentPlacement) {
      const dimension = this.viewport[this.axis === "y" ? "height" : "width"];
      const placement = this.options.contentPlacement;
      const start = placement === (this.axis === "y" ? "top" : "left") ? 0 : placement === (this.axis === "y" ? "bottom" : "right") ? dimension - this.extent : (dimension - this.extent) / 2;
      return (this.motionSign > 0 ? dimension - start : start + this.extent) / this.extent;
    }
    return this.endDismissal || this.options.oppositeEdgeDismiss ? this.viewport[this.axis === "y" ? "height" : "width"] / this.extent : 1;
  }

  scrollEndBody(target) {
    return [...this.content.querySelectorAll("[data-sheet-body]")].find(body =>
      (!target || body.contains(target)) && body.scrollHeight > body.clientHeight + 1);
  }

  canDismissAtScrollBoundary(target, delta) {
    if (!(this.options.scrollEndDismiss || this.options.oppositeEdgeDismiss) || !this.options.dismissible || !this.options.swipeToDismiss || Math.abs(this.position - this.extent) > 0.5) return false;
    if (this.options.oppositeEdgeDismiss) return !canScroll(target, this.content, this.axis, delta);
    const body = this.scrollEndBody(target);
    return !!body && (delta < 0 ? body.scrollTop <= 1 : delta > 0 && body.scrollTop >= body.scrollHeight - body.clientHeight - 1);
  }

  prepareDrag(target, delta) {
    this.animator.cancel();
    this.nativeMotion?.cancel();
    // Choose the exit only at rest. Interruptions must keep the presented direction.
    if (Math.abs(this.position - this.extent) <= 0.5) this.endDismissal = delta * this.sign > 0 && this.canDismissAtScrollBoundary(target, delta);
  }

  emit(name, detail = {}, cancelable = false) {
    if (name === "open" || name === "close") this.options.onPresentedChange?.(name === "open");
    if (name === "open" || name === "close" || name === "detent-change") this.options.onActiveDetentChange?.(this.activeDetent);
    return this.root.dispatchEvent(new this.win.CustomEvent(`sheet:${name}`, {
      bubbles: true, cancelable, detail: { sheet: this, detent: this.detent, ...detail }
    }));
  }

  setState(state) {
    if (["open", "closed", "destroyed", "opening"].includes(state)) {
      this.swipeCommitted = false;
      delete this.view.dataset.sheetGestureSettling;
    }
    const moving = !["open", "closed", "destroyed"].includes(state), wasMoving = !["open", "closed", "destroyed"].includes(this.state);
    this.state = state; this.root.dataset.sheetState = state; this.view.dataset.sheetState = state;
    const status = ({ closed: "idleOutside", opening: "entering", open: "idleInside", dragging: "stepping", settling: "stepping", closing: "exiting", destroyed: "idleOutside" })[state];
    if (status !== this.travelStatus) { this.travelStatus = status; this.options.onTravelStatusChange?.(status); this.emit("travel-status-change", { status }); }
    if (moving !== wasMoving) { this.options[moving ? "onTravelStart" : "onTravelEnd"]?.(); this.emit(moving ? "travel-start" : "travel-end"); }
    if (state === "open" || state === "closed") this.endDismissal = false;
    if (state === "open") this.nativeMotion?.points();
  }

  syncTriggers() {
    for (const trigger of this.doc.querySelectorAll("[data-sheet-open], [data-sheet-action]")) {
      if (trigger.dataset.sheetOpen !== this.root.id && resolveComponent(this.doc, trigger.dataset.sheetFor, trigger) !== this) continue;
      trigger.setAttribute("aria-expanded", String(this.isOpen));
      trigger.setAttribute("aria-controls", this.content.id);
      trigger.setAttribute("aria-haspopup", ["dialog", "alertdialog"].includes(this.content.role) ? "dialog" : "false");
    }
  }

  observeContent() {
    this.resize.disconnect();
    for (const node of [this.content, ...this.content.children, ...this.content.querySelectorAll("[data-sheet-body] > *")]) this.resize.observe(node);
  }

  measure() {
    if (!this.isOpen) return;
    const previousGeometry = this.motionGeometry;
    const viewport = this.viewport = readViewport(this.win);
    for (const key of ["width", "height", "top", "left", "keyboard"]) this.view.style.setProperty(`--sheet-viewport-${key}`, `${viewport[key]}px`);
    const style = this.win.getComputedStyle(this.content);
    const vertical = this.axis === "y";
    const padding = (parseFloat(vertical ? style.paddingTop : style.paddingLeft) || 0) + (parseFloat(vertical ? style.paddingBottom : style.paddingRight) || 0);
    const borders = (parseFloat(vertical ? style.borderTopWidth : style.borderLeftWidth) || 0) + (parseFloat(vertical ? style.borderBottomWidth : style.borderRightWidth) || 0);
    let natural = padding + borders, chrome = padding + borders;
    const children = [...this.content.children].filter((node) => this.win.getComputedStyle(node).position !== "absolute" && node.getClientRects().length);
    const gaps = Math.max(0, children.length - 1) * (parseFloat(style.rowGap) || 0);
    if (vertical) { natural += gaps; chrome += gaps; }
    for (const child of children) {
      const childStyle = this.win.getComputedStyle(child);
      const margin = (parseFloat(vertical ? childStyle.marginTop : childStyle.marginLeft) || 0) + (parseFloat(vertical ? childStyle.marginBottom : childStyle.marginRight) || 0);
      const length = vertical ? Math.max(child.scrollHeight, child.offsetHeight) : Math.max(child.scrollWidth, child.offsetWidth);
      if (vertical) natural += length + margin;
      else natural = Math.max(natural, length + padding + borders + margin);
      if (!child.matches("[data-sheet-body]")) chrome += (vertical ? child.offsetHeight : 0) + margin;
    }
    if (!children.length) natural = vertical ? this.content.scrollHeight : this.content.scrollWidth;
    const dimension = vertical ? viewport.height : viewport.width;
    this.points = resolveDetents(this.options.detents, dimension, Math.max(1, natural), value => this.resolveLength(value));
    this.extent = Math.max(...this.points);
    this.motionGeometry = `${viewport.width}:${viewport.height}:${this.points.join(",")}`;
    this.view.style.setProperty("--sheet-extent", `${this.extent}px`);
    this.view.style.setProperty("--sheet-chrome", `${chrome}px`);
    this.updateBodySize();
    this.nativeMotion?.measure();
    if (previousGeometry && previousGeometry !== this.motionGeometry) this.animator.complete?.(this.state === "closing" ? 0 : this.points[this.detent]);
    if (this.state === "open") this.render(this.points[this.detent]);
    else this.render(this.position);
    // A scroll-dependent header can resize without changing the sheet's
    // geometry. Do not scroll back to an old focused trigger on those updates.
    if (this.state === "open" && previousGeometry !== this.motionGeometry) keepFocusVisible(this);
  }

  updateBodySize() {
    if (this.points) this.view.style.setProperty("--sheet-body-available", `${this.points[this.detent]}px`);
  }

  writePosition(position) {
    this.view.style.setProperty("--sheet-offset", `${((this.extent || 0) - position) * this.motionSign * this.motionScale}px`);
    this.view.style.setProperty("--sheet-progress", clamp(position / (this.extent || 1), 0, 1).toFixed(5));
    this.view.style.setProperty("--sheet-visible", `${position}px`);
  }

  render(position) {
    // Input and spring rebounds cannot travel inward past the fully open
    // anchor. Translating beyond it exposes a gap along the attached edge.
    if (!this.options.swipeOvershoot) position = Math.min(position, this.extent || 0);
    this.position = position;
    this.progress = clamp(position / (this.extent || 1), 0, 1);
    this.writePosition(position);
    // Motion only updates transforms/custom properties. Modality changes on stack transitions.
    this.stack.items.forEach((sheet, index) => {
      const depth = this.stack.items.slice(index + 1).filter(item => !sheet.stackGroup || item.stackGroup === sheet.stackGroup).reduce((sum, item) => sum + item.progress, 0);
      sheet.view.style.setProperty("--sheet-stack-depth", depth.toFixed(5));
    });
    updateOutlets(this.doc);
    const values = [0, ...(this.points || []).map(point => point / (this.extent || 1))];
    const exact = values.findIndex(value => Math.abs(value - this.progress) < .00001);
    const higher = values.findIndex(value => value > this.progress);
    const range = exact >= 0 ? { start: exact, end: exact } : { start: Math.max(0, higher - 1), end: higher < 0 ? values.length - 1 : higher };
    if (range.start !== this.travelRange?.start || range.end !== this.travelRange?.end) { this.travelRange = range; this.options.onTravelRangeChange?.(range); this.emit("travel-range-change", { range }); }
    const travel = { progress: this.progress, range, progressAtDetents: values };
    this.options.onTravel?.(travel);
    this.emit("travel", travel);
    if (this.themeOverlay) {
      const backdrop = this.view.querySelector("[data-sheet-backdrop]");
      const outlet = this.outlets.find(outlet => outlet.element === backdrop);
      this.themeOverlay.setDimmingOverlayOpacity(Number(outlet?.styles(this, position).opacity ?? this.progress) * this.themeAlpha);
    }
    this.emit("progress", { progress: this.progress, position });
  }

  async open({ detent = this.detent, trigger = this.doc.activeElement, immediate = false, reason = "api" } = {}) {
    if (this.state === "destroyed") return false;
    clearWheelTail(this.doc);
    this.checkDetent(detent);
    if (this.isOpen && this.state !== "closing") return this.snapTo(detent, { immediate, reason });
    if (!this.emit("before-open", { reason, detent }, true)) return false;
    const resetScroll = !this.isOpen && this.options.scrollEndDismiss;
    const returningFromEnd = this.endDismissal;
    this.returnFocus = trigger;
    if (this.options.portal && !this.placeholder) {
      this.placeholder = this.doc.createComment("hotwire-sheet-portal");
      this.view.before(this.placeholder);
      (getElement(this.doc, this.options.container) || this.doc.body).append(this.view);
    }
    this.view.hidden = false;
    this.detent = detent;
    this.setState("opening");
    this.measure();
    // Hidden scroll containers may ignore scrollTop writes. Reset after layout,
    // before focusing or displaying the first entrance animation frame.
    if (resetScroll) for (const body of this.content.querySelectorAll("[data-sheet-body]")) body.scrollTop = 0;
    this.stack.add(this);
    if (this.options.themeColorDimming === "auto" && /AppleWebKit/.test(this.win.navigator.userAgent) && !/Chrome|Chromium/.test(this.win.navigator.userAgent)) {
      const backdrop = this.view.querySelector("[data-sheet-backdrop]");
      if (backdrop && !this.themeOverlay) {
        const color = this.win.getComputedStyle(backdrop).backgroundColor, channels = color.match(/[\d.]+/g)?.map(Number) || [0, 0, 0];
        this.themeAlpha = channels[3] ?? 1;
        this.themeOverlay = createThemeColorDimmingOverlay({ dimmingColor: `rgb(${channels.slice(0,3).join(",")})`, document: this.doc });
      }
    }
    this.syncTriggers();
    if (this.options.autofocus && !this.options.onPresentAutoFocus) focusInitial(this);
    const completed = await this.animateTo(this.points[detent], 0, immediate);
    if (completed && this.state === "opening") {
      this.setState("open");
      this.render(this.points[this.detent]);
      const focus = behavior(this.root, "sheet:present-auto-focus", this.options.onPresentAutoFocus, { focus: this.options.autofocus });
      if (focus.focus && (this.options.onPresentAutoFocus || autoFocusTarget(this, "present"))) focusInitial(this);
      if (!returningFromEnd) keepFocusVisible(this);
      this.emit("open", { reason });
      return true;
    }
    return false;
  }

  async close({ immediate = false, reason = "api", force = false, restoreFocus = this.options.restoreFocus } = {}) {
    if (!this.isOpen) return false;
    if (!force && !this.emit("before-close", { reason }, true)) {
      if (this.state === "dragging") this.snapTo(this.detent, { reason: "cancel" });
      return false;
    }
    this.gesture.cancel();
    // Like the Long Sheet presentation, explicit dismissal exits toward the
    // closer end of the article. Never flip an already moving sheet.
    if (this.options.scrollEndDismiss && this.state === "open" && Math.abs(this.position - this.extent) <= 0.5) {
      const body = this.scrollEndBody();
      this.endDismissal ||= !!body && body.scrollTop > (body.scrollHeight - body.clientHeight) / 2;
    }
    this.setState("closing");
    if (immediate) { this.animator.cancel(); this.nativeMotion?.cancel(); this.finishClose(reason, restoreFocus); return true; }
    const completed = await this.animateTo(0, 0, false);
    if (completed && this.state === "closing") { this.finishClose(reason, restoreFocus); return true; }
    return false;
  }

  finishClose(reason, restoreFocus) {
    const wasTop = this.stack.top === this;
    this.setState("closed");
    this.paint.cancel();
    this.view.hidden = true;
    this.render(0);
    this.stack.remove(this);
    // Leave the view in the portal while connected. Reparenting its Turbo Frames
    // on every close would repeatedly connect/disconnect nested controllers.
    this.syncTriggers();
    this.themeOverlay?.destroy(); this.themeOverlay = null;
    const focus = behavior(this.root, "sheet:dismiss-auto-focus", this.options.onDismissAutoFocus, { focus: restoreFocus });
    const target = autoFocusTarget(this, "dismiss") || this.returnFocus;
    if (focus.focus && wasTop && target?.isConnected && !target.closest("[inert]")) target.focus({ preventScroll: true });
    this.emit("close", { reason });
  }

  checkDetent(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this.options.detents.length) throw new RangeError("detent index is out of range");
  }

  async snapTo(index, { immediate = false, velocity = 0, reason = "api" } = {}) {
    this.checkDetent(index);
    if (!this.isOpen) { this.detent = index; return false; }
    const previous = this.detent;
    const returningFromEnd = this.endDismissal;
    this.detent = index;
    this.setState("settling");
    this.updateBodySize();
    const completed = await this.animateTo(this.points[index], velocity, immediate);
    if (completed && this.state === "settling") {
      this.setState("open");
      this.render(this.points[index]);
      if (index !== previous) this.emit("detent-change", { previousDetent: previous, reason });
      // Settling a short/canceled pull at the same detent must preserve the
      // reader's scroll position, including after focus returns from a child.
      if (!returningFromEnd && index !== previous) keepFocusVisible(this);
      return true;
    }
    return false;
  }

  settle(velocity) {
    const index = nearestDetent(this.position, velocity, this.points, {
      dismissible: this.options.dismissible && this.options.swipeToDismiss, current: this.detent
    });
    if (index === -1) return this.close({ reason: "swipe" });
    return this.snapTo(index, { velocity, reason: "gesture" });
  }

  commitSwipe(input, event) {
    if (this.state !== "dragging" || !this.options.dismissible || !this.options.swipeToDismiss || this.position > Math.min(...this.points) * .5) return false;
    this.swipeCommitted = true;
    this.finishInput(input, event, true);
    return true;
  }

  finishInput(input, event, dismiss = false) {
    this.paint.cancel();
    this.render(this.position);
    this.gesture.cancel();
    this.nativeMotion?.cancel();
    this.view.dataset.sheetGestureSettling = "true";
    if (input === "wheel") guardWheelTail(this, event);
    this.emit("drag-end", { input });
    if (dismiss) this.close({ reason: "swipe", immediate: this.position < .5 });
    else this.settle(0);
  }

  animateTo(target, velocity, immediate) {
    this.paint.cancel();
    const key = this.state === "opening" ? "enteringAnimationSettings" : this.state === "closing" ? "exitingAnimationSettings" : "steppingAnimationSettings";
    const settings = this.currentAnimationSettings = animationSettings(this.options[key], this.options.spring);
    if (settings.track && this.options.tracks) this.endDismissal = settings.track !== this.options.edge;
    if (this.nativeMotion) return this.nativeMotion.to(target, immediate || settings.skip, this.options[key] == null ? null : settings);
    this.animator.cancel();
    return this.animator.to(this.position, target, velocity, settings, (value) => this.render(value), immediate);
  }

  resolveLength(value) {
    if (typeof value !== "string" || !this.win.CSS.supports("width", value) || /^(auto|inherit|initial|unset|none|fit-content|max-content|min-content)$/.test(value)) throw new TypeError(`Invalid CSS detent: ${value}`);
    const probe = this.doc.createElement("div");
    probe.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;box-sizing:content-box;padding:0;border:0;width:${value};height:0;`;
    (this.view || this.root).append(probe);
    const pixels = parseFloat(this.win.getComputedStyle(probe).width);
    probe.remove();
    if (!(pixels > 0)) throw new RangeError(`Detent must resolve to a positive length: ${value}`);
    return pixels;
  }

  setOptions(options) {
    const raw = { ...this.rawOptions, ...options }, next = sheetOptions(raw);
    const geometry = ["edge", "tracks", "contentPlacement", "detents", "detentMode", "scrollSnap", "oppositeEdgeDismiss", "scrollEndDismiss"];
    const rebuild = geometry.some(key => JSON.stringify(next[key]) !== JSON.stringify(this.options[key]));
    if (rebuild && !["closed", "open"].includes(this.state)) throw new Error("Update sheet geometry while it is resting");
    if (next.draggable !== this.options.draggable && !["closed", "open"].includes(this.state)) throw new Error("Update swipe availability while the sheet is resting");
    const locked = this.options.lockScroll;
    if (rebuild) { this.gesture.cancel(); this.nativeMotion?.destroy(); this.nativeMotion = null; }
    this.rawOptions = raw; this.options = next;
    this.axis = ["top", "bottom"].includes(next.edge) ? "y" : "x";
    this.sign = ["bottom", "right"].includes(next.edge) ? 1 : -1;
    this.view.dataset.sheetEdge = next.edge;
    this.view.dataset.sheetModal = String(next.modal);
    this.view.dataset.sheetStackEffect = String(next.stackEffect);
    this.configureInteractionStyles();
    if (next.contentPlacement) this.view.dataset.sheetPlacement = next.contentPlacement; else delete this.view.dataset.sheetPlacement;
    this.content.setAttribute("role", next.sheetRole || "dialog");
    next.modal && ["dialog", "alertdialog"].includes(this.content.role) ? this.content.setAttribute("aria-modal", "true") : this.content.removeAttribute("aria-modal");
    this.stackGroup = resolveComponent(this.doc, next.forComponent || next.stack, this.root.parentElement, "sheetStack");
    this.detent = Math.min(this.detent, next.detents.length - 1);
    if (rebuild && next.scrollSnap && !next.contentPlacement && !next.scrollEndDismiss && !next.oppositeEdgeDismiss) this.nativeMotion = new ScrollSnapMotion(this);
    this.stack.optionsChanged(this, { lockScroll: locked });
    if (Object.hasOwn(options, "travelAnimation") || Object.hasOwn(options, "stackingAnimation")) {
      const effects = { travelAnimation: next.travelAnimation, stackingAnimation: next.stackingAnimation };
      if (this.primaryOutlet) this.primaryOutlet.setOptions(effects);
      else this.primaryOutlet = this.outlet(this.content, effects);
    }
    this.syncTriggers(); this.measure();
    if (options.presented !== undefined) return options.presented ? this.open() : this.close();
    if (options.activeDetent !== undefined) return this.setActiveDetent(options.activeDetent);
    return Promise.resolve(true);
  }

  step(action = {}) {
    if (action.detent != null) return this.setActiveDetent(action.detent, { reason: "trigger" });
    const count = this.options.detents.length + 1;
    const index = (this.activeDetent + (action.direction === "down" ? -1 : 1) + count) % count;
    return this.setActiveDetent(index, { reason: "trigger" });
  }

  allowsOverscroll(axis, delta) {
    // Modal isolation and disabled elastic travel imply trapping at the edge.
    if (this.options.inert || !this.options.swipeOvershoot) return false;
    const trap = this.options.swipeTrap;
    return !(typeof trap === "boolean" ? trap : trap?.[axis]);
  }

  configureInteractionStyles() {
    if (this.rawOptions.swipeTrap == null && this.rawOptions.swipeOvershoot == null) return;
    for (const element of [this.view, this.content, ...this.content.querySelectorAll("[data-sheet-body]")]) {
      if (!this.original.has(element)) this.original.set(element, { style: element.getAttribute("style"), role: element.getAttribute("role"), tabindex: element.getAttribute("tabindex"), modal: element.getAttribute("aria-modal") });
      for (const axis of ["x", "y"]) element.style[axis === "x" ? "overscrollBehaviorX" : "overscrollBehaviorY"] = !this.options.swipeOvershoot ? "none" : this.allowsOverscroll(axis, 1) ? "auto" : "contain";
    }
  }

  get ancestorSheet() {
    return this.stack.items.slice(0, this.stack.items.indexOf(this)).reverse().find(sheet => sheet.content.contains(this.root) || sheet.root.contains(this.root));
  }

  outside(event, kind = "click") {
    const alert = this.options.sheetRole === "alertdialog";
    const values = behavior(this.root, `sheet:${kind === "escape" ? "escape-key-down" : "click-outside"}`, this.options[kind === "escape" ? "onEscapeKeyDown" : "onClickOutside"], {
      dismiss: this.options.dismissible && (kind === "escape" ? this.options.closeOnEscape : this.options.closeOnOutside), stopOverlayPropagation: true, ...(kind === "escape" ? { nativePreventDefault: true } : {})
    }, event);
    if (kind === "escape" && values.nativePreventDefault) event.preventDefault();
    if (!alert && values.dismiss) this.close({ reason: kind === "escape" ? "escape" : "outside" });
    return alert || values.stopOverlayPropagation;
  }

  click(event) {
    if (event.defaultPrevented || this.state === "destroyed" || !(event.target instanceof this.win.Element)) return;
    // WebKit may synthesize the post-drag click on the backdrop (the common
    // ancestor of press/release targets). Suppress it at the document boundary.
    if (event.detail && this.win.performance.now() < this.gesture.suppressClickUntil && this.view.contains(event.target)) {
      event.preventDefault();
      return;
    }
    const actionTrigger = event.target.closest("[data-sheet-action]");
    if (actionTrigger && resolveComponent(this.doc, actionTrigger.dataset.sheetFor, actionTrigger) === this) {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button > 0) return;
      const values = behavior(actionTrigger, "sheet:press", jsonAttribute(actionTrigger, "data-sheet-on-press", this.options.onPress), { forceFocus: true, runAction: true }, event);
      if (values.forceFocus) actionTrigger.focus({ preventScroll: true });
      if (!values.runAction) return;
      event.preventDefault();
      const action = jsonAttribute(actionTrigger, "data-sheet-action", "present");
      if (action === "present") this.open({ trigger: actionTrigger, reason: "trigger" });
      else if (action === "dismiss") this.close({ reason: "trigger" });
      else this.step(typeof action === "object" ? action : {});
      return;
    }
    const trigger = event.target.closest("[data-sheet-open]");
    if (trigger?.dataset.sheetOpen === this.root.id) {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button > 0) return;
      const values = behavior(trigger, "sheet:press", jsonAttribute(trigger, "data-sheet-on-press", this.options.onPress), { forceFocus: true, runAction: true }, event);
      if (values.forceFocus) trigger.focus({ preventScroll: true });
      if (!values.runAction) return;
      event.preventDefault();
      this.open({ trigger, reason: "trigger" });
      return;
    }
    if (!this.isOpen || !this.stack.canInteract(this) || !this.view.contains(event.target)) return;
    if (event.target.closest("[data-sheet-view]") !== this.view) return;
    if (event.target.closest("[data-sheet-close]")) { event.preventDefault(); this.close({ reason: "close-button" }); }
    // Outside events are routed once by the shared stack, including click-through views.
  }

  handleKey(event) {
    if (!event.target.closest("[data-sheet-handle]") || event.defaultPrevented) return;
    let index;
    if (event.key === "Home") index = this.points.indexOf(Math.min(...this.points));
    else if (event.key === "End") index = this.points.indexOf(Math.max(...this.points));
    else if (["ArrowUp", "ArrowRight"].includes(event.key)) index = adjacentDetent(this.points, this.detent, 1);
    else if (["ArrowDown", "ArrowLeft"].includes(event.key)) index = adjacentDetent(this.points, this.detent, -1);
    if (index != null) { event.preventDefault(); this.snapTo(index, { reason: "keyboard" }); }
  }

  destroy() {
    if (this.state === "destroyed") return;
    this.close({ immediate: true, force: true, reason: "disconnect", restoreFocus: false });
    this.abort.abort();
    this.nativeMotion?.destroy();
    this.animator.cancel();
    this.paint.cancel();
    this.refresh.cancel();
    this.resize.disconnect();
    this.mutations.disconnect();
    if (this.placeholder?.parentNode) this.placeholder.replaceWith(this.view);
    else if (this.placeholder) this.view.remove();
    this.placeholder = null;
    for (const [node, saved] of this.original) {
      for (const [attribute, key] of [["style", "style"], ["role", "role"], ["tabindex", "tabindex"], ["aria-modal", "modal"]]) {
        if (saved[key] === null) node.removeAttribute(attribute); else node.setAttribute(attribute, saved[key]);
      }
    }
    this.setState("destroyed");
    this.outlets.forEach(outlet => outlet.destroy());
    this.unregister();
    instances.delete(this.root);
  }
}
