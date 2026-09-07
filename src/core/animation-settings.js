export const animationPresets = Object.freeze({
  gentle: Object.freeze({ stiffness: 560, damping: 68, mass: 1.85 }),
  smooth: Object.freeze({ stiffness: 580, damping: 60, mass: 1.35 }),
  snappy: Object.freeze({ stiffness: 350, damping: 34, mass: .9 }),
  brisk: Object.freeze({ stiffness: 350, damping: 28, mass: .65 }),
  bouncy: Object.freeze({ stiffness: 240, damping: 19, mass: .7 }),
  elastic: Object.freeze({ stiffness: 260, damping: 20, mass: 1 })
});

export function animationSettings(value, spring = {}) {
  const settings = typeof value === "string" ? { preset: value } : { ...value };
  if (settings.preset && !animationPresets[settings.preset]) throw new TypeError(`Unknown animation preset: ${settings.preset}`);
  const result = { ...spring, ...(settings.preset ? animationPresets[settings.preset] : {}), ...settings };
  for (const key of ["stiffness", "damping", "mass", "precision"]) {
    if (result[key] != null && (!Number.isFinite(result[key]) || result[key] <= 0)) throw new RangeError(`${key} must be positive`);
  }
  for (const key of ["duration", "delay"]) {
    if (result[key] != null && (!Number.isFinite(result[key]) || result[key] < 0)) throw new RangeError(`${key} must be nonnegative`);
  }
  if (result.initialVelocity != null && !Number.isFinite(result.initialVelocity)) throw new RangeError("initialVelocity must be finite");
  return result;
}

const curves = { ease: [.25, .1, .25, 1], "ease-in": [.42, 0, 1, 1], "ease-out": [0, 0, .58, 1], "ease-in-out": [.42, 0, .58, 1] };
export function easingAt(progress, easing = "linear") {
  if (easing === "linear") return progress;
  const curve = curves[easing] || /^cubic-bezier\(([^)]+)\)$/.exec(easing)?.[1].split(",").map(Number);
  if (!curve || curve.length !== 4 || curve.some(n => !Number.isFinite(n)) || curve[0] < 0 || curve[0] > 1 || curve[2] < 0 || curve[2] > 1) throw new TypeError(`Unsupported easing: ${easing}`);
  const bezier = (t, a, b) => 3 * (1-t) ** 2 * t * a + 3 * (1-t) * t ** 2 * b + t ** 3;
  let low = 0, high = 1;
  for (let i = 0; i < 20; i++) { const t = (low + high) / 2; if (bezier(t, curve[0], curve[2]) < progress) low = t; else high = t; }
  return bezier((low + high) / 2, curve[1], curve[3]);
}
