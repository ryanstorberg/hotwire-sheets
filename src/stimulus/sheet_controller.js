import { Controller } from "@hotwired/stimulus";
import { Sheet } from "../index.js";

// Rails/Turbo lifecycle belongs here; the core only knows about the DOM.
export default class extends Controller {
  static values = { options: Object, detents: Array, initialDetent: Number, edge: String, modal: Boolean, open: Boolean };

  connect() {
    const options = { ...this.optionsValue };
    for (const key of ["detents", "initialDetent", "edge", "modal"]) {
      const has = `has${key[0].toUpperCase()}${key.slice(1)}Value`;
      if (this[has]) options[key] = this[`${key}Value`];
    }
    this.sheet = new Sheet(this.element, options);
    this.lifecycle = new AbortController();
    const signal = this.lifecycle.signal;
    document.addEventListener("turbo:before-cache", () => this.suspend(), { signal });
    document.addEventListener("turbo:before-render", () => this.suspend(), { signal });
    document.addEventListener("turbo:render", () => this.restore(), { signal });
    this.element.addEventListener("turbo:frame-load", () => this.sheet.refresh(), { signal });
    if (this.element.dataset.sheetResumeDetent != null) this.restore();
    else if (this.openValue) this.sheet.open({ immediate: true });
  }

  disconnect() { this.lifecycle?.abort(); this.sheet?.destroy(); this.sheet = null; }

  suspend() {
    if (this.element.hasAttribute("data-turbo-permanent") && this.sheet.isOpen) this.element.dataset.sheetResumeDetent = this.sheet.detent;
    this.sheet.close({ immediate: true, force: true, reason: "navigation", restoreFocus: false });
    // The cached HTML must contain the view so a restored controller can find it.
    if (this.sheet.placeholder?.parentNode) {
      this.sheet.placeholder.replaceWith(this.sheet.view);
      this.sheet.placeholder = null;
    }
  }

  restore() {
    const detent = this.element.dataset.sheetResumeDetent;
    if (detent == null || !this.sheet) return;
    delete this.element.dataset.sheetResumeDetent;
    this.sheet.open({ detent: Number(detent), immediate: true });
  }

  open(event) { event?.preventDefault(); return this.sheet?.open({ trigger: event?.currentTarget }); }
  close(event) { event?.preventDefault(); return this.sheet?.close(); }
  toggle(event) { return this.sheet?.isOpen ? this.close(event) : this.open(event); }
  snap(event) { return this.sheet?.snapTo(Number(event.params.detent)); }
  openValueChanged(value) { if (this.sheet) value ? this.sheet.open() : this.sheet.close(); }
  optionsValueChanged(value) { if (this.sheet) this.sheet.setOptions(value); }
}
