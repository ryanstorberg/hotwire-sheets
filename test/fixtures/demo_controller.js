import { Controller } from "@hotwired/stimulus";

const artwork = [
  { file: "alpine", title: "Alpine Morning", alt: "Alpine Morning — geometric mountain peaks reflected in a still lake" },
  { file: "desert", title: "Desert Light", alt: "Desert Light — warm dunes beneath a circular sun" },
  { file: "coast", title: "Coastal Calm", alt: "Coastal Calm — a curved shoreline and a setting sun" }
];

// Presentation-specific behavior stays in the examples, outside the sheet engine.
export default class extends Controller {
  static values = { kind: String };

  connect() {
    this.abort = new AbortController();
    this.view = this.element.querySelector("[data-sheet-view]");
    this.body = this.view.querySelector("[data-sheet-body]");
    this.index = 0;
    this.zoomed = false;
    const on = (target, event, handler) => target.addEventListener(event, handler, { signal: this.abort.signal });
    on(this.element, "sheet:open", (event) => {
      if (event.target !== this.element) return;
      this.sheet = event.detail.sheet;
      if (this.kindValue === "toast") this.scheduleDismiss();
    });
    on(this.element, "sheet:close", () => this.reset());
    on(document, "turbo:before-cache", () => this.reset());
    on(document, "turbo:before-render", () => this.reset());

    if (this.kindValue === "toast") {
      const content = this.view.querySelector("[data-sheet-content]");
      on(content, "pointerenter", () => { this.hovered = true; this.clearTimer(); });
      on(content, "pointerleave", () => { this.hovered = false; this.scheduleDismiss(); });
      on(content, "focusin", () => this.clearTimer());
      on(content, "focusout", () => queueMicrotask(() => this.scheduleDismiss()));
    }
    if (this.kindValue === "lightbox") {
      on(this.view, "click", (event) => {
        const action = event.target.closest("[data-demo-action]")?.dataset.demoAction;
        if (!action) return;
        if (action === "zoom") this.zoomed = !this.zoomed;
        else { this.index = (this.index + (action === "next" ? 1 : -1) + artwork.length) % artwork.length; this.zoomed = false; }
        this.renderImage();
      });
      on(this.view, "keydown", (event) => {
        if (event.defaultPrevented || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
        event.preventDefault();
        this.index = (this.index + (event.key === "ArrowRight" ? 1 : -1) + artwork.length) % artwork.length;
        this.zoomed = false;
        this.renderImage();
      });
    }
    if (this.kindValue === "parallax") {
      this.gallery = document.getElementById("page");
      on(this.element, "sheet:progress", (event) => {
        this.gallery?.style.setProperty("--gallery-parallax", `${-event.detail.progress * innerWidth * 0.22}px`);
        this.gallery?.toggleAttribute("data-parallax-active", event.detail.progress > 0);
      });
      on(this.body, "scroll", () => {
        cancelAnimationFrame(this.frame);
        this.frame = requestAnimationFrame(() => this.view.style.setProperty("--parallax-scroll", `${Math.min(220, this.body.scrollTop * 0.25)}px`));
      });
    }
  }

  clearTimer() { clearTimeout(this.timer); }

  scheduleDismiss() {
    this.clearTimer();
    if (!this.sheet?.isOpen || this.hovered || this.view.contains(document.activeElement)) return;
    this.timer = setTimeout(() => this.sheet.close({ reason: "timeout" }), 7000);
  }

  renderImage() {
    const item = artwork[this.index];
    const image = this.view.querySelector("[data-lightbox-image]");
    image.src = `/test/fixtures/art/${item.file}.svg`;
    image.alt = item.alt;
    this.view.querySelector("[data-lightbox-caption]").textContent = item.title;
    this.view.querySelector("[data-lightbox-count]").textContent = `${this.index + 1} / ${artwork.length}`;
    const zoom = this.view.querySelector('[data-demo-action="zoom"]');
    zoom.setAttribute("aria-pressed", String(this.zoomed));
    zoom.setAttribute("aria-label", this.zoomed ? "Reset image zoom" : "Zoom image");
    this.body.toggleAttribute("data-zoomed", this.zoomed);
    this.body.scrollTo(0, 0);
  }

  reset() {
    this.clearTimer();
    cancelAnimationFrame(this.frame);
    if (this.kindValue === "lightbox") { this.index = 0; this.zoomed = false; this.renderImage(); }
    if (this.kindValue === "parallax") {
      this.gallery?.style.removeProperty("--gallery-parallax");
      this.gallery?.removeAttribute("data-parallax-active");
      this.view.style.removeProperty("--parallax-scroll");
    }
  }

  disconnect() { this.reset(); this.abort.abort(); }
}
