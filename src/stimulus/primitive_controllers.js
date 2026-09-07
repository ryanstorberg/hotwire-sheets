import { Controller } from "@hotwired/stimulus";
import { Scroll, SheetStack, Outlet, Island, ExternalOverlay, Fixed, AutoFocusTarget } from "../index.js";

function controllerFor(Primitive) {
  return class extends Controller {
    static values = { options: Object };
    connect() {
      if (this.lifecycle?.signal.aborted) this.suspended = false;
      if (this.primitive || this.suspended) return;
      this.primitive = new Primitive(this.element, this.optionsValue);
      this.lifecycle = new AbortController();
      document.addEventListener("turbo:before-cache", () => { this.suspended = true; this.release(); }, { signal: this.lifecycle.signal });
      document.addEventListener("turbo:before-render", () => { this.suspended = true; this.release(); }, { signal: this.lifecycle.signal });
      document.addEventListener("turbo:render", () => { this.suspended = false; if (!this.primitive && this.element.isConnected) this.primitive = new Primitive(this.element, this.optionsValue); }, { signal: this.lifecycle.signal });
    }
    optionsValueChanged(value) { this.primitive?.setOptions?.(value); }
    release() { this.primitive?.destroy(); this.primitive = null; }
    disconnect() { if (this.element.isConnected) return; this.lifecycle?.abort(); this.release(); }
  };
}
export class ScrollController extends controllerFor(Scroll) {
  get scroll() { return this.primitive; }
  to(event) { event?.preventDefault(); this.scroll?.scrollTo(event.params); }
  by(event) { event?.preventDefault(); this.scroll?.scrollBy(event.params); }
}
export const SheetStackController = controllerFor(SheetStack);
export const OutletController = controllerFor(Outlet);
export const IslandController = controllerFor(Island);
export const ExternalOverlayController = controllerFor(ExternalOverlay);
export const FixedController = controllerFor(Fixed);
export const AutoFocusTargetController = controllerFor(AutoFocusTarget);
