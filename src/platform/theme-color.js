import { animate } from "../core/animate.js";
import { easingAt } from "../core/animation-settings.js";
const states = new WeakMap();
function color(value, doc) {
  const el = doc.createElement("span"); el.style.color = value;
  if (!el.style.color) throw new TypeError(`Invalid color: ${value}`);
  doc.head.append(el);
  const result = doc.defaultView.getComputedStyle(el).color.match(/[\d.]+/g)?.map(Number);
  el.remove();
  if (!result || result.length < 3) throw new TypeError("Theme colors must resolve to RGB");
  return result;
}
function stateFor(doc) {
  if (!states.has(doc)) states.set(doc, { base: null, overlays: new Set() });
  return states.get(doc);
}
function paint(doc) {
  const state = stateFor(doc), meta = doc.querySelector('meta[name="theme-color"]');
  if (!meta || !state.base) return;
  let result = [...state.base];
  for (const overlay of state.overlays) result = result.map((v, index) => v * (1-overlay.opacity) + overlay.color[index] * overlay.opacity);
  meta.content = `rgb(${result.slice(0, 3).map(Math.round).join(", ")})`;
}
export function updateThemeColor(value, doc = globalThis.document) {
  if (!doc) return;
  const state = stateFor(doc); state.base = color(value, doc).slice(0, 3);
  const meta = doc.querySelector('meta[name="theme-color"]');
  if (meta) { if (state.overlays.size) paint(doc); else meta.content = value; }
}
export function createThemeColorDimmingOverlay({ element, dimmingColor = "rgb(0, 0, 0)", document: doc = element?.ownerDocument || globalThis.document } = {}) {
  if (!doc) return { setDimmingOverlayOpacity() {}, animateDimmingOverlayOpacity() { return null; }, destroy() {} };
  const win = doc.defaultView, state = stateFor(doc), meta = doc.querySelector('meta[name="theme-color"]');
  if (!state.overlays.size) state.base = color(meta?.content || win.getComputedStyle(doc.body).backgroundColor || "#ffffff", doc).slice(0, 3);
  const overlay = { opacity: 0, color: color(dimmingColor, doc) }; state.overlays.add(overlay);
  let frame, animation;
  const set = (opacity, style = true) => { overlay.opacity = Math.max(0, Math.min(1, opacity)); if (element && style) element.style.opacity = String(overlay.opacity); paint(doc); };
  return {
    setDimmingOverlayOpacity(opacity) { win.cancelAnimationFrame(frame); animation?.cancel(); set(opacity); },
    animateDimmingOverlayOpacity({ keyframes, duration = 500, easing = "cubic-bezier(0.25, 1, 0.25, 1)" }) {
      win.cancelAnimationFrame(frame); animation?.cancel();
      if (win.matchMedia("(prefers-reduced-motion: reduce)").matches) duration = 0;
      animation = animate(element, { opacity: keyframes }, { duration, easing });
      const start = win.performance.now();
      const tick = now => { const progress = duration ? Math.min(1, (now-start)/duration) : 1; set(keyframes[0] + (keyframes[1]-keyframes[0])*easingAt(progress, easing), !animation); if (progress < 1) frame = win.requestAnimationFrame(tick); };
      tick(start); return animation;
    },
    destroy() { win.cancelAnimationFrame(frame); animation?.cancel(); state.overlays.delete(overlay); paint(doc); }
  };
}
