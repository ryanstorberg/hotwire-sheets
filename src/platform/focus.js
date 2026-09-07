const selector = 'a[href],area[href],button,input:not([type="hidden"]),select,textarea,iframe,[tabindex],[contenteditable="true"],audio[controls],video[controls],summary';

export function focusable(container) {
  return [...container.querySelectorAll(selector)].filter((element) =>
    element.tabIndex >= 0 && !element.matches(":disabled") && !element.closest("[inert]") &&
    element.getClientRects().length && element.ownerDocument.defaultView.getComputedStyle(element).visibility !== "hidden"
  ).sort((a, b) => (a.tabIndex || Infinity) - (b.tabIndex || Infinity));
}

export function focusInitial(sheet) {
  const explicit = sheet.options.initialFocus;
  const target = typeof explicit === "string" ? sheet.content.querySelector(explicit) : explicit;
  (target || autoFocusTarget(sheet, "present") || sheet.content.querySelector("[autofocus], [data-sheet-autofocus]") || focusable(sheet.content)[0] || sheet.content).focus({ preventScroll: true });
}

// Focus before the browser's pointer default, so it does not independently
// scroll the layout viewport underneath the visual-viewport adjustment.
export function preventNativeFocusScroll(container, enabled, signal) {
  container.addEventListener("pointerdown", event => {
    const target = event.target;
    if (!enabled() || event.defaultPrevented || event.button !== 0 || !target.matches?.('textarea,input')) return;
    if (target.tagName === "INPUT" && !["text", "search", "url", "email", "tel", "password", "number"].includes(target.type)) return;
    if (target.disabled || target.ownerDocument.activeElement === target) return;
    event.preventDefault();
    target.focus({ preventScroll: true });
  }, { signal });
}

export function keepFocusVisible(sheet) {
  // During entry, transformed controls are still outside the viewport. Scrolling
  // to compensate clips the article's top until the animation finishes.
  // Opening and detent transitions reveal focus again at their resting position.
  if (sheet.state !== "open") return;
  const target = sheet.doc.activeElement;
  if (!sheet.content.contains(target) || !target?.getBoundingClientRect) return;
  for (let node = target.parentElement; node && sheet.content.contains(node); node = node.parentElement) {
    if (node.scrollHeight <= node.clientHeight) continue;
    const rect = target.getBoundingClientRect(), bounds = node.getBoundingClientRect();
    const bottom = Math.min(bounds.bottom, sheet.viewport.top + sheet.viewport.height) - 12;
    const top = Math.max(bounds.top, sheet.viewport.top) + 12;
    if (rect.bottom > bottom) node.scrollTop += rect.bottom - bottom;
    else if (rect.top < top) node.scrollTop -= top - rect.top;
  }
}
import { autoFocusTarget } from "./components.js";
