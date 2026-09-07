const locks = new WeakMap();
const properties = ["position", "top", "left", "width", "overflow", "padding-right", "box-sizing"];

export function lockScroll(doc) {
  let lock = locks.get(doc);
  if (lock) { lock.count++; return; }
  const win = doc.defaultView, body = doc.body;
  const saved = properties.map((key) => [key, body.style.getPropertyValue(key), body.style.getPropertyPriority(key)]);
  const gap = Math.max(0, win.innerWidth - doc.documentElement.clientWidth);
  const horizontalGap = Math.max(0, win.innerHeight - doc.documentElement.clientHeight);
  lock = { count: 1, saved, x: win.scrollX, y: win.scrollY, body };
  locks.set(doc, lock);
  lock.variables = ["--x-collapsed-scrollbar-thickness", "--y-collapsed-scrollbar-thickness"].map(key => [key, doc.documentElement.style.getPropertyValue(key)]);
  doc.documentElement.style.setProperty("--x-collapsed-scrollbar-thickness", `${horizontalGap}px`);
  doc.documentElement.style.setProperty("--y-collapsed-scrollbar-thickness", `${gap}px`);
  const padding = parseFloat(win.getComputedStyle(body).paddingRight) || 0;
  Object.assign(body.style, { position: "fixed", top: `${-lock.y}px`, left: `${-lock.x}px`, width: "100%", overflow: "hidden", boxSizing: "border-box" });
  if (gap) body.style.paddingRight = `${padding + gap}px`;
}

export function unlockScroll(doc) {
  const lock = locks.get(doc);
  if (!lock || --lock.count > 0) return;
  for (const [key, value, priority] of lock.saved) {
    if (value) lock.body.style.setProperty(key, value, priority);
    else lock.body.style.removeProperty(key);
  }
  const style = doc.documentElement.style;
  for (const [key, value] of lock.variables) value ? style.setProperty(key, value) : style.removeProperty(key);
  const behavior = style.getPropertyValue("scroll-behavior"), priority = style.getPropertyPriority("scroll-behavior");
  style.setProperty("scroll-behavior", "auto", "important");
  doc.defaultView.scrollTo(lock.x, lock.y);
  if (behavior) style.setProperty("scroll-behavior", behavior, priority);
  else style.removeProperty("scroll-behavior");
  locks.delete(doc);
}

// delta is the intended native scroll offset, not the finger's direction.
export function canScroll(target, boundary, axis, delta) {
  const win = boundary.ownerDocument.defaultView;
  for (let node = target; node && boundary.contains(node); node = node.parentElement) {
    const style = win.getComputedStyle(node);
    const overflow = axis === "y" ? style.overflowY : style.overflowX;
    if (/(auto|scroll)/.test(overflow)) {
      const direction = axis === "x" && style.direction === "rtl" ? -1 : 1;
      const position = axis === "y" ? node.scrollTop : node.scrollLeft * direction;
      const movement = delta * direction;
      const max = axis === "y" ? node.scrollHeight - node.clientHeight : node.scrollWidth - node.clientWidth;
      if ((movement < 0 && position > 0.5) || (movement > 0 && position < max - 0.5)) return true;
    }
    if (node === boundary) break;
  }
  return false;
}
