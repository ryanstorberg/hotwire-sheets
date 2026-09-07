/** WAAPI with a persisted final frame. Cancel leaves the pre-animation styles intact. */
export function animate(element, keyframes, options = {}) {
  if (!element) return null;
  const settings = { duration: 500, easing: "cubic-bezier(0.25, 1, 0.25, 1)", ...options };
  const end = Object.fromEntries(Object.entries(keyframes).map(([key, values]) => [key, Array.isArray(values) ? values.at(-1) : values]));
  if (!element.animate) { Object.assign(element.style, end); return null; }
  const animation = element.animate(keyframes, { ...settings, fill: "both" });
  animation.finished.then(() => { Object.assign(element.style, end); animation.cancel(); }, () => {});
  return animation;
}
