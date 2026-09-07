import { animationSettings } from "./animation-settings.js";
const edges = ["top", "bottom", "left", "right"];
export function sheetOptions(options) {
  const value = { edge: "bottom", detents: ["content"], initialDetent: 0, modal: true,
    dismissible: true, swipeToDismiss: true, closeOnEscape: true, closeOnOutside: true,
    draggable: true, handleOnly: false, wheel: true, swipeFromOutside: true, preventEdgeSwipe: false,
    scrollEndDismiss: false, oppositeEdgeDismiss: false, restoreFocus: true, autofocus: true,
    portal: true, stackEffect: false, spring: {}, animation: "waapi", scrollSnap: false,
    swipeOvershoot: false, swipeTrap: true, nativeFocusScrollPrevention: true, ...options };
  for (const [alias, key] of Object.entries({ swipe: "draggable", swipeDismissal: "swipeToDismiss", nativeEdgeSwipePrevention: "preventEdgeSwipe", inertOutside: "modal", swipeable: "swipeFromOutside" })) {
    if (options[alias] != null) value[key] = options[alias];
  }
  const tracks = options.tracks == null ? null : [options.tracks].flat();
  if (tracks && (!tracks.length || tracks.length > 2 || !tracks.every(track => edges.includes(track)) || (tracks.length === 2 && !["bottom,top", "left,right"].includes([...tracks].sort().join(","))))) throw new TypeError("tracks must be an edge or two opposing edges");
  if (tracks) { value.edge = tracks[0]; value.oppositeEdgeDismiss = tracks.length === 2; }
  else if (options.contentPlacement && options.contentPlacement !== "center") value.edge = options.contentPlacement;
  if (options.contentPlacement && ![...edges, "center"].includes(options.contentPlacement)) throw new TypeError("Invalid contentPlacement");
  if (options.detentMode === "silk") value.detents = [...(options.detents == null ? [] : [options.detents].flat()), "content"];
  if (options.defaultActiveDetent != null || options.activeDetent > 0) value.initialDetent = (options.activeDetent || options.defaultActiveDetent) - 1;
  for (const key of ["trapFocus", "lockScroll", "inert"]) value[key] ??= value.modal;
  if (value.sheetRole === "alertdialog") { value.swipeToDismiss = false; value.closeOnOutside = false; value.closeOnEscape = false; }
  if (!edges.includes(value.edge)) throw new TypeError("edge must be top, bottom, left, or right");
  if (!["waapi", "raf"].includes(value.animation)) throw new TypeError("animation must be waapi or raf");
  if (![true, false, "auto"].includes(value.scrollSnap)) throw new TypeError("scrollSnap must be a boolean or auto");
  for (const key of ["swipeFromOutside", "scrollEndDismiss", "oppositeEdgeDismiss", "swipeOvershoot"]) if (typeof value[key] !== "boolean") throw new TypeError(`${key} must be a boolean`);
  if (value.oppositeEdgeDismiss && value.detents?.length !== 1 && !tracks) throw new TypeError("oppositeEdgeDismiss requires one open detent (use tracks for multiple detents)");
  if (value.scrollEndDismiss && (value.edge !== "bottom" || value.detents?.length !== 1)) throw new TypeError("scrollEndDismiss requires a bottom sheet with one open detent");
  if (!Array.isArray(value.detents) || !value.detents.length) throw new TypeError("detents must be a nonempty array");
  if (!Number.isInteger(value.initialDetent) || value.initialDetent < 0 || value.initialDetent >= value.detents.length) throw new RangeError("initialDetent is a zero-based detent index");
  for (const setting of [value.enteringAnimationSettings, value.exitingAnimationSettings, value.steppingAnimationSettings]) animationSettings(setting, value.spring);
  return value;
}
