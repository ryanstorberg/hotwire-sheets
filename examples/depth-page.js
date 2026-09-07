// Present the visible page as one viewport-sized layer, regardless of the
// document's length or scroll position. The placeholder preserves native
// document geometry for the core's scroll lock and later restoration.
export class DepthPage {
  constructor(element) {
    this.element = element;
    this.scroll = Math.max(0, -element.getBoundingClientRect().top);
    this.originalScroll = element.scrollTop;
    this.placeholder = element.ownerDocument.createElement("div");
    this.placeholder.dataset.galleryDepthPlaceholder = "";
    this.placeholder.setAttribute("aria-hidden", "true");
    this.placeholder.style.height = `${element.offsetHeight}px`;
    element.before(this.placeholder);
  }

  update(progress, viewport) {
    const { element } = this;
    const geometry = `${viewport.width}:${viewport.height}:${viewport.top}:${viewport.left}`;
    if (geometry !== this.geometry) {
      this.geometry = geometry;
      for (const key of ["width", "height", "top", "left"]) element.style.setProperty(`--gallery-viewport-${key}`, `${viewport[key]}px`);
      element.setAttribute("data-gallery-depth", "");
      this.placeholder.style.height = `${element.scrollHeight}px`;
      element.scrollTop = this.scroll;
    }
    element.style.setProperty("--gallery-depth", progress);
  }

  destroy() {
    this.element.removeAttribute("data-gallery-depth");
    this.element.style.removeProperty("--gallery-depth");
    for (const key of ["width", "height", "top", "left"]) this.element.style.removeProperty(`--gallery-viewport-${key}`);
    this.element.scrollTop = this.originalScroll;
    this.placeholder.remove();
  }
}
