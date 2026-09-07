import { clamp } from "./physics.js";
import { animateOutlets } from "./outlet.js";

// Read authored transforms once, then hand concrete matrix and opacity
// keyframes to WAAPI. The primary surface can move independently of JS frames.
export function motionEffects(sheet, frames, duration) {
  // A fixed dialog shell may keep navigation outside the animated article.
  // The shell still owns gestures, focus, measurement, and modal semantics.
  const content = sheet.content.querySelector(":scope > [data-sheet-motion]") || sheet.content;
  if (sheet.options.animation === "raf" || !content.animate) return [];
  const { win, view, extent } = sheet;
  const saved = sheet.position;
  const extraTransform = content.style.getPropertyValue("--sheet-outlet-transform");
  content.style.removeProperty("--sheet-outlet-transform");
  const positions = [...new Set([Math.min(0, ...frames.map(frame => frame.position)), 0, extent])].sort((a, b) => a - b);
  const snapshots = positions.map(position => {
    sheet.writePosition(position);
    const style = win.getComputedStyle(content);
    const matrix = new win.DOMMatrix(style.transform === "none" ? undefined : style.transform);
    if (sheet.nativeMotion) matrix[sheet.axis === "y" ? "m42" : "m41"] += (sheet.nativeMotion.position - position) * sheet.motionSign;
    return { position, matrix, opacity: Number(style.opacity) };
  });
  sheet.writePosition(saved);
  if (extraTransform) content.style.setProperty("--sheet-outlet-transform", extraTransform);
  const keys = ["m11", "m12", "m13", "m14", "m21", "m22", "m23", "m24", "m31", "m32", "m33", "m34", "m41", "m42", "m43", "m44"];
  const keyframes = frames.map(frame => {
    const position = sheet.currentAnimationSettings?.contentMove === false ? sheet.state === "opening" ? frames.at(-1).position : saved : sheet.options.swipeOvershoot ? frame.position : Math.min(frame.position, extent);
    const end = snapshots.findIndex((sample, i) => i > 0 && sample.position >= position);
    const b = snapshots[end < 0 ? snapshots.length - 1 : end], a = snapshots[Math.max(0, (end < 0 ? snapshots.length - 1 : end) - 1)];
    const ratio = (position - a.position) / (b.position - a.position || 1);
    const matrix = keys.map(key => a.matrix[key] + (b.matrix[key] - a.matrix[key]) * ratio);
    const style = { offset: frame.time / duration, transform: `matrix3d(${matrix.join(",")})`, opacity: clamp(a.opacity + (b.opacity - a.opacity) * ratio, 0, 1) };
    for (const outlet of sheet.outlets || []) if (outlet.element === content) {
      const extra = outlet.styles(sheet, frame.position);
      Object.assign(style, extra, extra.transform ? { transform: `${style.transform} ${extra.transform}` } : {});
    }
    return style;
  });
  const timing = { duration, easing: "linear", fill: "both" };
  const animations = [content.animate(keyframes, { ...timing, id: "hotwire-sheet-surface" })];
  const opacityFrames = frames.map(frame => ({ offset: frame.time / duration, opacity: clamp(frame.position / extent, 0, 1) }));
  // Stationary chrome can fade on the same compositor timeline as a separate
  // moving image/article, without multiplying that surface's own opacity.
  for (const element of sheet.content.querySelectorAll(":scope > [data-sheet-motion-fade]")) {
    animations.push(element.animate(opacityFrames, { ...timing, id: "hotwire-sheet-fade" }));
  }
  const backdrop = view.querySelector(":scope > [data-sheet-backdrop]");
  const customBackdrop = sheet.outlets?.some(outlet => outlet.element === backdrop && outlet.options.travelAnimation && Object.hasOwn(outlet.options.travelAnimation, "opacity"));
  if (backdrop && sheet.options.modal && !customBackdrop) animations.push(backdrop.animate(opacityFrames, { ...timing, id: "hotwire-sheet-backdrop" }));
  animations.push(...animateOutlets(sheet, frames, duration, content));
  // WebKit can expose a timeline time newer than the last presented frame.
  // On interruption, continue from the actual presented matrix to avoid a jump.
  animations.position = () => {
    const matrix = new win.DOMMatrix(win.getComputedStyle(content).transform);
    const a = snapshots.find(sample => sample.position === 0), b = snapshots.at(-1);
    const distance = keys.reduce((sum, key) => sum + (b.matrix[key] - a.matrix[key]) ** 2, 0);
    if (distance < 1e-12) return sheet.position;
    return keys.reduce((sum, key) => sum + (matrix[key] - a.matrix[key]) * (b.matrix[key] - a.matrix[key]), 0) / distance * extent;
  };
  return animations;
}
