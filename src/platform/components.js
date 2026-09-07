import { registryFor, getElement } from "../core/registry.js";
import { stackFor } from "../core/stack.js";
import { canScroll } from "./scroll.js";

function trapScroll(element, signal) {
  element.addEventListener("wheel", event => {
    if (event.ctrlKey) return;
    const axis = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? "x" : "y", delta = axis === "x" ? event.deltaX : event.deltaY;
    if (!canScroll(event.target, element, axis, delta) && event.cancelable) event.preventDefault();
    event.stopPropagation();
  }, { signal, passive: false });
  let point;
  element.addEventListener("touchstart", event => { const t = event.touches[0]; point = t && [t.clientX, t.clientY]; }, { signal, passive: true });
  element.addEventListener("touchmove", event => {
    if (event.touches.length !== 1 || !point) return;
    const t = event.touches[0], dx = point[0] - t.clientX, dy = point[1] - t.clientY, axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    if (!canScroll(event.target, element, axis, axis === "x" ? dx : dy) && event.cancelable) event.preventDefault();
    point = [t.clientX, t.clientY]; event.stopPropagation();
  }, { signal, passive: false });
}

class RegisteredRegion {
  constructor(root, options, collection) {
    this.root = root; this.doc = root.ownerDocument; this.options = { ...options }; this.collection = collection;
    this.abort = new this.doc.defaultView.AbortController();
    registryFor(this.doc)[collection].add(this);
    this.observer = new this.doc.defaultView.MutationObserver(() => stackFor(this.doc).updateInert());
    this.observer.observe(this.doc.body, { childList: true, subtree: true });
    stackFor(this.doc).updateInert();
  }
  get content() { return getElement(this.doc, this.options.contentGetter, this.root.querySelector("[data-island-content]") || this.root); }
  get active() { return !this.options.disabled && this.content?.isConnected; }
  setOptions(options) { Object.assign(this.options, options); stackFor(this.doc).updateInert(); }
  destroy() { this.abort.abort(); this.observer.disconnect(); registryFor(this.doc)[this.collection].delete(this); stackFor(this.doc).updateInert(); }
}
export class Island extends RegisteredRegion {
  constructor(root, options = {}) { super(root, options, "islands"); if (!options.contentGetter) trapScroll(this.content, this.abort.signal); }
  matches(sheet) {
    const refs = this.options.forComponent;
    return !refs || [refs].flat().some(ref => ref === sheet || ref === sheet.componentId || ref === sheet.stackGroup || ref === sheet.stackGroup?.componentId);
  }
}
export class ExternalOverlay extends RegisteredRegion {
  constructor(root, options = {}) { super(root, { selfManagedInertOutside: true, ...options }, "overlays"); }
}
export class AutoFocusTarget {
  constructor(element, options = {}) {
    this.element = element; this.doc = element.ownerDocument;
    this.setOptions(options);
    registryFor(this.doc).focusTargets.add(this);
  }
  setOptions(options) {
    const timing = [options.timing ?? this.timing].flat();
    if (!timing.length || !timing.every(t => ["present", "dismiss"].includes(t))) throw new TypeError("AutoFocusTarget timing must be present, dismiss, or both");
    this.timing = timing;
    if (Object.hasOwn(options, "forComponent")) this.forComponent = options.forComponent;
  }
  destroy() { registryFor(this.doc).focusTargets.delete(this); }
}
export function autoFocusTarget(sheet, timing) {
  return [...registryFor(sheet.doc).focusTargets].find(target => (!target.forComponent || target.forComponent === sheet || target.forComponent === sheet.componentId) && target.timing.includes(timing) && target.element.isConnected && !target.element.matches(":disabled") && !target.element.closest("[inert]") && target.element.getClientRects().length)?.element;
}

/** Escape transformed ancestors while keeping the original DOM insertion point for teardown. */
export class Fixed {
  constructor(root) {
    this.root = root; this.doc = root.ownerDocument; this.content = root.querySelector("[data-fixed-content]") || root;
    this.style = root.getAttribute("style"); this.parent = root.parentNode; this.next = root.nextSibling;
    this.placeholder = this.doc.createComment("hotwire-fixed"); root.before(this.placeholder);
    // A body-level viewport layer is independent of animated outlet transforms.
    this.doc.body.append(root); root.style.position = "fixed";
    this.abort = new this.doc.defaultView.AbortController(); trapScroll(this.content, this.abort.signal);
    this.observer = new this.doc.defaultView.MutationObserver(() => {
      // A Frame/Stream can remove the original owner without a page-level
      // Turbo event. Return the portal to that detached subtree so Stimulus
      // receives its normal disconnect and cannot leave floating UI behind.
      if (!this.placeholder.isConnected && this.root.isConnected) this.destroy();
    });
    this.observer.observe(this.doc.body, { childList: true, subtree: true });
  }
  destroy() { this.abort.abort(); this.observer.disconnect(); if (this.placeholder.parentNode) this.placeholder.replaceWith(this.root); this.style == null ? this.root.removeAttribute("style") : this.root.setAttribute("style", this.style); }
}
export class VisuallyHidden {
  constructor(element) { this.element = element; this.previous = element.classList.contains("sheet-visually-hidden"); element.classList.add("sheet-visually-hidden"); }
  destroy() { if (!this.previous) this.element.classList.remove("sheet-visually-hidden"); }
}

export function observeMediaQuery(query, callback, { window: win = globalThis.window, signal } = {}) {
  const media = win?.matchMedia(query), update = () => callback(media?.matches || false);
  update(); media?.addEventListener("change", update, { signal });
  return () => media?.removeEventListener("change", update);
}
