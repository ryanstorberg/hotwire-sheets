export function resolveDetents(detents, viewport, content, resolveLength) {
  if (!Array.isArray(detents) || detents.length === 0) throw new TypeError("detents must be a nonempty array");
  if (!(viewport > 0) || !Number.isFinite(viewport)) throw new RangeError("viewport must be positive");
  return detents.map((value) => {
    let pixels;
    if (value === "content") pixels = content;
    else if (typeof value === "number" && value > 0 && value <= 1) pixels = value * viewport;
    else if (typeof value === "string" && /^(?:\d+\.?\d*|\.\d+)(?:px|%)$/.test(value)) {
      pixels = parseFloat(value) * (value.endsWith("%") ? viewport / 100 : 1);
    } else if (typeof value === "string" && resolveLength) pixels = resolveLength(value);
    else throw new TypeError(`Invalid detent: ${value}. Use content, a fraction (0, 1], or a CSS length (pass a resolver outside a browser).`);
    if (!Number.isFinite(pixels) || pixels <= 0) throw new RangeError("detents must resolve to positive lengths");
    return Math.min(viewport, Math.max(1, pixels));
  });
}

// Keep the caller's indices, including when content changes or detents coincide.
export function nearestDetent(position, velocity, points, { dismissible = true, current = 0 } = {}) {
  const projected = position + Math.max(-3, Math.min(3, velocity)) * 180;
  const candidates = points.map((value, index) => ({ value, index }));
  if (dismissible) candidates.push({ value: 0, index: -1 });
  candidates.sort((a, b) => Math.abs(a.value - projected) - Math.abs(b.value - projected) ||
    (a.index === current ? -1 : b.index === current ? 1 : a.index - b.index));
  return candidates[0].index;
}

export function adjacentDetent(points, current, direction) {
  const sorted = points.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
  const position = sorted.findIndex((point) => point.index === current);
  return sorted[Math.max(0, Math.min(sorted.length - 1, position + direction))].index;
}
