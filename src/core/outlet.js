import { registryFor, register, resolveComponent } from "./registry.js";
import { clamp } from "./physics.js";
import { frameTask } from "./scheduler.js";

const transforms = new Set(["translate", "translateX", "translateY", "translateZ", "scale", "scaleX", "scaleY", "scaleZ", "rotate", "rotateX", "rotateY", "rotateZ", "skew", "skewX", "skewY"]);
const kebab = key => key.startsWith("--") ? key : key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
export function tween(start, end, progress) {
  if (typeof start === "number" && typeof end === "number") return start + (end - start) * progress;
  const a = String(start), b = String(end), pattern = /-?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi;
  const av = a.match(pattern)?.map(Number), bv = b.match(pattern)?.map(Number);
  if (!av || av.length !== bv?.length || a.replace(pattern, "#") !== b.replace(pattern, "#")) return `calc((${a}) * ${1-progress} + (${b}) * ${progress})`;
  let index = 0;
  return a.replace(pattern, () => String(av[index] + (bv[index] - av[index++]) * progress));
}
export function animationStyle(definition, progress) {
  const style = {}, parts = [];
  for (const [key, value] of Object.entries(definition || {})) {
    if (value == null || key === "clipBoundary") continue;
    let result = typeof value === "function" ? value({ progress, tween: (a, b) => tween(a, b, progress) }) : Array.isArray(value) ? tween(value[0], value[1], progress) : value;
    if (result == null) continue;
    if (transforms.has(key)) {
      if (typeof result === "number" && !key.startsWith("scale")) result = `${result}${key.startsWith("translate") ? "px" : "deg"}`;
      parts.push(`${key}(${result})`);
    } else style[key === "clipBorderRadius" ? "borderRadius" : key === "clipTransformOrigin" ? "transformOrigin" : key] = result;
  }
  if (parts.length) style.transform = `${style.transform || ""} ${parts.join(" ")}`.trim();
  return style;
}

// The page is clipped before its transform, using a viewport-sized wrapper.
// Dimensions are captured at activation/resize, never on each animation frame.
class ViewportClip {
  constructor(element) {
    this.element = element; this.doc = element.ownerDocument; this.win = this.doc.defaultView;
    this.style = element.getAttribute("style");
    const rect = element.getBoundingClientRect();
    this.placeholder = this.doc.createElement("div");
    Object.assign(this.placeholder.style, { height: `${element.offsetHeight}px`, width: `${element.offsetWidth}px`, pointerEvents: "none" });
    this.wrapper = this.doc.createElement("div"); this.wrapper.dataset.sheetClipBoundary = "";
    Object.assign(this.wrapper.style, { position: "fixed", inset: "0", overflow: "clip", isolation: "isolate" });
    element.before(this.placeholder, this.wrapper); this.wrapper.append(element);
    Object.assign(element.style, { position: "absolute", top: `${rect.top}px`, left: `${rect.left}px`, width: `${rect.width}px`, margin: "0" });
    this.resize = frameTask(this.win, () => this.measure());
    this.win.addEventListener("resize", this.resize, { passive: true });
  }
  measure() {
    // Re-evaluate the authored layout on resize, before the next paint. The
    // temporary flow measurement must not include its own placeholder.
    const current = this.element.getAttribute("style");
    this.placeholder.style.display = "none";
    this.placeholder.before(this.element);
    this.style == null ? this.element.removeAttribute("style") : this.element.setAttribute("style", this.style);
    const rect = this.element.getBoundingClientRect();
    Object.assign(this.placeholder.style, { height: `${this.element.offsetHeight}px`, width: `${this.element.offsetWidth}px`, display: "" });
    this.wrapper.append(this.element);
    this.element.setAttribute("style", current || "");
    Object.assign(this.element.style, { top: `${rect.top}px`, left: `${rect.left}px`, width: `${rect.width}px` });
  }
  destroy() {
    this.win.removeEventListener("resize", this.resize); this.resize.cancel();
    this.placeholder.replaceWith(this.element); this.wrapper.remove();
    this.style == null ? this.element.removeAttribute("style") : this.element.setAttribute("style", this.style);
  }
}

export class SheetStack {
  constructor(root, { componentId } = {}) {
    this.root = root; this.doc = root.ownerDocument; this.kind = "stack";
    this.outlets = new Set();
    this.unregister = register(this, "sheetStack", componentId);
    // HTML selectors use kebab case, while dataset uses camel case.
    root.dataset.sheetStack = this.componentId;
  }
  get sheets() { return [...registryFor(this.doc).components.values()].filter(component => component.stackGroup === this && component.isOpen); }
  get progress() { return this.sheets.reduce((sum, sheet) => sum + sheet.progress, 0); }
  outlet(element, options = {}) { const outlet = new Outlet(element, { ...options, forComponent: this }); this.outlets.add(outlet); return outlet; }
  destroy() { this.outlets.forEach(outlet => outlet.destroy()); this.outlets.clear(); this.unregister(); delete this.root.dataset.sheetStack; }
}

export class Outlet {
  constructor(element, options = {}) {
    this.element = element; this.doc = element.ownerDocument; this.win = this.doc.defaultView;
    this.options = options; this.saved = new Map(); this.kind = "outlet";
    registryFor(this.doc).outlets.add(this);
    this.update();
  }
  get owner() {
    const reference = this.options.forComponent;
    return resolveComponent(this.doc, reference, this.element) || resolveComponent(this.doc, reference, this.element, "sheetStack");
  }
  progress(changed, position) {
    const owner = this.owner;
    const value = sheet => sheet === changed ? clamp(position / (sheet.extent || 1), 0, 1) : sheet.progress;
    if (!owner) return { travel: 0, stacking: 0 };
    if (owner.kind === "stack") {
      // The first Sheet is the stack's base. Outlets react to sheets above it.
      return { travel: 0, stacking: owner.sheets.slice(1).reduce((sum, sheet) => sum + value(sheet), 0) };
    }
    const items = owner.stack.items, above = items.slice(items.indexOf(owner) + 1).filter(sheet => !owner.stackGroup || sheet.stackGroup === owner.stackGroup);
    return { travel: value(owner) || 0, stacking: owner.isOpen ? above.reduce((sum, sheet) => sum + value(sheet), 0) : 0 };
  }
  styles(changed, position) {
    const p = this.progress(changed, position);
    const travel = animationStyle(this.options.travelAnimation, p.travel), stacking = animationStyle(this.options.stackingAnimation, p.stacking);
    if (this.element.matches("[data-sheet-backdrop]") && this.options.travelAnimation && Object.hasOwn(this.options.travelAnimation, "opacity") && this.options.travelAnimation.opacity == null) travel.opacity = 1;
    return { ...travel, ...stacking, ...((travel.transform || stacking.transform) ? { transform: [travel.transform, stacking.transform].filter(Boolean).join(" ") } : {}) };
  }
  target(active) {
    const clip = this.options.travelAnimation?.clipBoundary || this.options.stackingAnimation?.clipBoundary;
    if (clip === "layout-viewport" && active && !this.clip) this.clip = new ViewportClip(this.element);
    return this.clip?.wrapper || this.element;
  }
  apply(style, target) {
    for (const [key, value] of Object.entries(style)) {
      const property = key === "transform" && this.owner?.content === target ? "--sheet-outlet-transform" : kebab(key);
      if (target === this.element && !this.saved.has(property)) this.saved.set(property, [target.style.getPropertyValue(property), target.style.getPropertyPriority(property)]);
      target.style.setProperty(property, String(value));
    }
  }
  update() {
    if (this.playing && this.playing.playState !== "idle") return;
    this.playing = null;
    const p = this.progress(), active = p.travel > 0 || p.stacking > 0;
    const target = this.target(active), owner = this.owner;
    const definition = this.options.travelAnimation;
    const timelineEligible = owner?.isOpen && owner.nativeMotion && owner.content !== target && this.win.ScrollTimeline && definition && !this.options.stackingAnimation && !this.clip &&
      Object.entries(definition).every(([key, value]) => (key === "opacity" || transforms.has(key)) && Array.isArray(value));
    if (timelineEligible && !this.timelineAnimation) {
      const timeline = new this.win.ScrollTimeline({ source: owner.view, axis: owner.axis });
      const from = owner.sign > 0 ? 0 : 1, to = 1-from;
      this.timelineAnimation = target.animate([animationStyle(definition, from), animationStyle(definition, to)], { timeline, fill: "both", id: "hotwire-sheet-scroll-outlet" });
    } else if (!timelineEligible) {
      this.timelineAnimation?.cancel(); this.timelineAnimation = null;
      this.apply(this.styles(), target);
    }
    if (!active && this.clip) { this.clip.destroy(); this.clip = null; }
  }
  setOptions(options) {
    this.timelineAnimation?.cancel(); this.timelineAnimation = null;
    this.playing?.cancel(); this.playing = null;
    this.clip?.destroy(); this.clip = null;
    this.restoreStyles(); this.options = { ...this.options, ...options }; this.update();
  }
  animate(changed, frames, duration) {
    if (!this.owner || !this.element.animate) return null;
    const start = this.styles(changed, frames[0].position), end = this.styles(changed, frames.at(-1).position);
    if (JSON.stringify(start) === JSON.stringify(end)) return null;
    const target = this.target(true), animation = target.animate(frames.map(frame => ({ ...this.styles(changed, frame.position), offset: frame.time / duration })), { duration, fill: "both", easing: "linear", id: "hotwire-sheet-outlet" });
    this.playing = animation;
    const release = () => { if (this.playing === animation) { this.playing = null; this.update(); } };
    animation.addEventListener("cancel", release, { once: true });
    // Committing is coordinated by Sheet; its render after cancellation owns the final frame.
    return animation;
  }
  destroy() {
    this.timelineAnimation?.cancel(); this.timelineAnimation = null;
    this.playing?.cancel(); this.playing = null;
    this.clip?.destroy(); this.clip = null;
    this.restoreStyles();
    registryFor(this.doc).outlets.delete(this);
  }
  restoreStyles() {
    for (const [key, [value, priority]] of this.saved) value ? this.element.style.setProperty(key, value, priority) : this.element.style.removeProperty(key);
    this.saved.clear();
  }
}

export function updateOutlets(doc) { for (const outlet of registryFor(doc).outlets) outlet.update(); }
export function animateOutlets(sheet, frames, duration, primary) { return [...registryFor(sheet.doc).outlets].filter(outlet => outlet.element !== primary).map(outlet => outlet.animate(sheet, frames, duration)).filter(Boolean); }
