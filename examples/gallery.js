import { Application } from "@hotwired/stimulus";
import * as Turbo from "@hotwired/turbo";
import { DepthPage } from "./depth-page.js";
const built = new URL(location.href).searchParams.get("assets") === "built";
const { Sheet } = await import(built ? "hotwire-sheets" : "/src/index.js");
const { SheetController } = await import(built ? "hotwire-sheets/stimulus" : "/src/stimulus/index.js");

// These responsive presentations use the public Sheet lifecycle. Their styling
// and application controls are example code, not additional engine defaults.
function presentationOptions(kind) {
  const width = innerWidth;
  const height = "var(--sheet-viewport-height, 100dvh)", viewportWidth = "var(--sheet-viewport-width, 100vw)";
  const base = { detents: ["content"] };
  switch (kind) {
    case "top": return { ...base, edge: "top" };
    case "card": return { ...base, edge: "top", spring: { stiffness: 260, damping: 20, mass: 1 } };
    case "detached": return { ...base, oppositeEdgeDismiss: true };
    case "sidebar": return { edge: "left", detents: [`min(calc(${viewportWidth} * .9), 325px)`] };
    case "toast": return { detents: width >= 1000 ? ["372px"] : ["content"], edge: width >= 1000 ? "right" : "top", modal: false, autofocus: false, restoreFocus: false, closeOnOutside: false };
    case "stacking": return width >= 700 ? { edge: "right", detents: [`min(calc(${viewportWidth} * .8), 700px)`], initialFocus: ".profile-dismiss" } : { edge: "bottom", detents: [`min(500px, calc(${height} * .9))`], initialFocus: ".profile-dismiss" };
    case "depth": return { detents: [.974], stackEffect: true, scrollSnap: true, initialFocus: ".profile-dismiss" };
    case "persistent": return { detents: ["76px", 1], modal: false, autofocus: false, closeOnOutside: false, swipeToDismiss: false };
    case "detents": return { detents: [`max(1px, calc(${height} * .66 - 60px))`, width >= 800 ? `calc(${height} * .95)` : `calc(${height} - 6px)`], initialFocus: ".handle", scrollSnap: true };
    case "keyboard": return { detents: [`calc(${height} - ${width >= 800 ? 64 : 6}px)`], oppositeEdgeDismiss: true };
    case "page": case "parallax": return { edge: "right", detents: [1] };
    case "mobile-comments": return { detents: [`max(1px, calc(${height} * .66 - 60px))`, `calc(${height} - 6px)`] };
    case "lightbox": return { detents: [1] };
    case "long": return { detents: [1], scrollEndDismiss: true };
    case "page-bottom": return { detents: [1], draggable: false, wheel: false, swipeToDismiss: false, closeOnEscape: false, closeOnOutside: false };
    default: return base;
  }
}

class PresentationController extends SheetController {
  connect() {
    this.kind = this.element.dataset.presentation;
    this.optionsValue = presentationOptions(this.kind);
    super.connect();
    this.timer = null;
    const on = (target, name, handler) => target?.addEventListener(name, handler, { signal: this.lifecycle.signal });
    on(this.sheet.view, "click", event => this.action(event));
    on(this.element, "sheet:progress", event => this.progress(event));
    on(this.element, "sheet:open", () => this.opened());
    on(this.element, "sheet:close", () => this.resetPresentation());
    for (const event of ["sheet:open", "sheet:close", "sheet:detent-change"]) {
      on(this.element, event, () => { if (this.resizePending) this.resizePresentation(); });
    }
    on(this.sheet.view, "input", event => this.input(event));
    on(this.sheet.content, "pointerenter", () => { this.hovered = true; clearTimeout(this.timer); });
    on(this.sheet.content, "pointerleave", () => { this.hovered = false; this.scheduleToast(); });
    on(this.sheet.content, "focusin", () => clearTimeout(this.timer));
    on(this.sheet.content, "focusout", () => queueMicrotask(() => this.scheduleToast()));
    const scroll = this.sheet.content.querySelector("[data-sheet-body]");
    on(scroll, "scroll", () => {
      this.sheet.content.querySelector(".profile-topbar")?.toggleAttribute("data-scrolled", scroll.scrollTop > 250);
      if (this.kind === "parallax") this.sheet.view.style.setProperty("--parallax-cover-offset", `${Math.min(300, scroll.scrollTop * .25)}px`);
    });
    if (this.sheet.isOpen) {
      this.progress({ target: this.element, detail: { progress: this.sheet.progress, position: this.sheet.position } });
      this.opened();
    }
    on(window, "resize", () => {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => this.resizePresentation(), 100);
    });
  }

  resizePresentation() {
    if (!this.sheet) return;
    if (this.kind === "mobile-comments" && innerWidth >= 1000) this.sheet.close({ immediate: true });
    const options = presentationOptions(this.kind);
    if (JSON.stringify(options) === JSON.stringify(this.optionsValue)) { this.resizePending = false; return; }
    // Height changes are handled by the viewport-relative detents. A real
    // layout breakpoint can update the same instance once its gesture ends.
    if (!["closed", "open"].includes(this.sheet.state)) { this.resizePending = true; return; }
    this.resizePending = false;
    this.optionsValue = options;
  }

  action(event) {
    const control = event.target.closest("[data-presentation-action]");
    if (!control) return;
    const action = control.dataset.presentationAction;
    if (action === "cycle") this.sheet.detent === this.sheet.options.detents.length - 1 ? this.sheet.close() : this.sheet.snapTo(this.sheet.detent + 1);
    if (action === "expand") this.sheet.snapTo(1);
    if (action === "collapse") this.sheet.snapTo(0);
    if (action === "play") {
      const playing = control.getAttribute("aria-pressed") !== "true";
      for (const button of this.sheet.content.querySelectorAll(".play-toggle")) { button.setAttribute("aria-pressed", playing); button.setAttribute("aria-label", playing ? "Pause" : "Play"); }
    }
    if (action === "previous-track" || action === "next-track") this.sheet.content.querySelector('input[type="range"]').value = 0;
    if (action === "save") {
      const form = this.sheet.content.querySelector("form");
      if (form.reportValidity()) { this.element.dataset.savedProduct = JSON.stringify(Object.fromEntries(new FormData(form))); this.sheet.close({ reason: "save" }); }
    }
  }

  input(event) {
    if (this.kind !== "detents" || event.target.type !== "search") return;
    const query = event.target.value.trim().toLowerCase();
    const contacts = [...this.sheet.content.querySelectorAll("[data-contact]")];
    for (const contact of contacts) contact.hidden = !contact.textContent.toLowerCase().includes(query);
    this.sheet.content.querySelector(".empty-contacts").hidden = contacts.some(contact => !contact.hidden);
  }

  opened() { this.scheduleToast(); }
  scheduleToast() {
    clearTimeout(this.timer);
    if (this.kind !== "toast" || !this.sheet?.isOpen || this.hovered || this.sheet.content.contains(document.activeElement)) return;
    this.timer = setTimeout(() => this.sheet.close({ reason: "timeout" }), 5000);
  }

  progress(event) {
    if (event.target !== this.element) return;
    const { progress, position } = event.detail;
    if (this.kind === "persistent") {
      const expanded = position > 100;
      this.sheet.content.toggleAttribute("data-expanded", expanded);
      this.sheet.content.querySelector(".player-mini").inert = expanded;
      this.sheet.content.querySelector(".player-full").inert = !expanded;
    }
    if (this.kind === "depth" && this.element.id === "depth") {
      const gallery = document.getElementById("page");
      if (gallery && this.sheet.isOpen) {
        this.depthPage ||= new DepthPage(gallery);
        this.depthPage.update(progress, this.sheet.viewport);
      } else {
        this.depthPage?.destroy();
        this.depthPage = null;
      }
    }
    if (this.kind === "parallax") {
      const target = this.element.id === "parallax" ? document.getElementById("page") : document.getElementById("parallax-content");
      target?.toggleAttribute("data-gallery-parallax", progress > 0);
      target?.style.setProperty("--gallery-parallax", `${-innerWidth * .25 * progress}px`);
    }
  }

  resetPresentation() {
    clearTimeout(this.timer);
    this.sheet.view.style.removeProperty("--parallax-cover-offset");
    this.depthPage?.destroy();
    this.depthPage = null;
    if (this.kind === "parallax") {
      const target = this.element.id === "parallax" ? document.getElementById("page") : document.getElementById("parallax-content");
      target?.removeAttribute("data-gallery-parallax"); target?.style.removeProperty("--gallery-parallax");
    }
  }

  disconnect() { this.resetPresentation(); clearTimeout(this.resizeTimer); super.disconnect(); }
}
const application = Application.start();
application.register("sheet", PresentationController);
window.lab = { Sheet, Turbo, application, get: id => Sheet.get(document.getElementById(id)) };
if (new URLSearchParams(location.search).has('input-debug')) await import('./input-debug.js');
