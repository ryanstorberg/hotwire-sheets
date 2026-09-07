export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function rubberBand(value, min, max, dimension = 600) {
  const bound = clamp(value, min, max);
  const excess = value - bound;
  return bound + Math.sign(excess) * dimension * (1 - 1 / (Math.abs(excess) * 0.55 / dimension + 1));
}

// Analytical damped spring. Time in seconds, velocity in pixels/second.
// Sampling by elapsed time makes the trajectory independent of frame rate.
export function springAt(time, from, to, velocity = 0, { stiffness = 420, damping = 38, mass = 1 } = {}) {
  const w = Math.sqrt(stiffness / mass);
  const z = damping / (2 * Math.sqrt(stiffness * mass));
  const x = from - to;
  if (z < 1 - 1e-5) {
    const wd = w * Math.sqrt(1 - z * z);
    const a = (velocity + z * w * x) / wd;
    const decay = Math.exp(-z * w * time);
    const c = Math.cos(wd * time), s = Math.sin(wd * time);
    return { position: to + decay * (x * c + a * s), velocity: decay * ((a * wd - z * w * x) * c - (x * wd + z * w * a) * s) };
  }
  if (z > 1 + 1e-5) {
    const r1 = -w * (z - Math.sqrt(z * z - 1)), r2 = -w * (z + Math.sqrt(z * z - 1));
    const a = (velocity - r2 * x) / (r1 - r2), b = x - a;
    return { position: to + a * Math.exp(r1 * time) + b * Math.exp(r2 * time), velocity: a * r1 * Math.exp(r1 * time) + b * r2 * Math.exp(r2 * time) };
  }
  const a = velocity + w * x, decay = Math.exp(-w * time);
  return { position: to + (x + a * time) * decay, velocity: (a - w * (x + a * time)) * decay };
}
