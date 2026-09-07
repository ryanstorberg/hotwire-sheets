/** A CSS length, viewport fraction, or the measured content size. */
export type Detent = "content" | number | string;
export type Edge = "bottom" | "top" | "left" | "right";
export type ComponentId = string;
export type ComponentReference = ComponentId | Sheet | SheetStack | Scroll | "closest";
export interface SpringOptions { stiffness?: number; damping?: number; mass?: number }
export type AnimationPreset = "gentle" | "smooth" | "snappy" | "brisk" | "bouncy" | "elastic";
export interface AnimationSettings extends SpringOptions {
  preset?: AnimationPreset; easing?: "spring" | "linear" | "ease" | "ease-in" | "ease-out" | "ease-in-out" | `cubic-bezier(${string})`;
  duration?: number; delay?: number; initialVelocity?: number; precision?: number;
  track?: Edge; contentMove?: boolean; skip?: boolean;
}
export interface BehaviorEvent<T> { nativeEvent: Event | null; changeDefault(changes: Partial<T>): void }
export type Behavior<T> = Partial<T> | ((event: BehaviorEvent<T> & T) => void);
export type AnimationDefinition = Record<string, string | number | null | undefined | [string | number, string | number] | ((args: { progress: number; tween(start: string | number, end: string | number): string | number }) => string | number | null | undefined)>;
export interface TravelRange { start: number; end: number }
export interface TravelData { progress: number; range: TravelRange; progressAtDetents: number[] }
export type TravelStatus = "idleOutside" | "entering" | "idleInside" | "stepping" | "exiting";
export interface SheetOptions {
  edge?: Edge; detents?: Detent[] | string; initialDetent?: number;
  /** Silk-style input detents are intermediate points; full content and closed are implicit. */
  detentMode?: "open" | "silk";
  componentId?: ComponentId; forComponent?: ComponentReference; stack?: ComponentReference;
  sheetRole?: string; defaultPresented?: boolean; presented?: boolean;
  defaultActiveDetent?: number; activeDetent?: number;
  onPresentedChange?(presented: boolean): void; onActiveDetentChange?(activeDetent: number): void;
  contentPlacement?: Edge | "center"; tracks?: Edge | ["top", "bottom"] | ["bottom", "top"] | ["left", "right"] | ["right", "left"];
  modal?: boolean; inertOutside?: boolean; dismissible?: boolean;
  swipeToDismiss?: boolean; swipeDismissal?: boolean; swipeFromOutside?: boolean; swipeable?: boolean;
  swipeTrap?: boolean | { x?: boolean; y?: boolean }; swipeOvershoot?: boolean; swipe?: boolean;
  scrollEndDismiss?: boolean; oppositeEdgeDismiss?: boolean;
  closeOnEscape?: boolean; closeOnOutside?: boolean; draggable?: boolean;
  handleOnly?: boolean; wheel?: boolean; preventEdgeSwipe?: boolean; nativeEdgeSwipePrevention?: boolean;
  restoreFocus?: boolean; autofocus?: boolean; initialFocus?: string | HTMLElement;
  portal?: boolean; container?: HTMLElement | string | null; stackEffect?: boolean;
  trapFocus?: boolean; lockScroll?: boolean; inert?: boolean;
  spring?: SpringOptions; animation?: "waapi" | "raf"; scrollSnap?: boolean | "auto";
  enteringAnimationSettings?: AnimationPreset | AnimationSettings;
  exitingAnimationSettings?: AnimationPreset | AnimationSettings;
  steppingAnimationSettings?: AnimationPreset | AnimationSettings;
  onTravelStatusChange?(status: TravelStatus): void; onTravelRangeChange?(range: TravelRange): void;
  onTravel?(data: TravelData): void; onTravelStart?(): void; onTravelEnd?(): void;
  onPresentAutoFocus?: Behavior<{ focus: boolean }>; onDismissAutoFocus?: Behavior<{ focus: boolean }>;
  onClickOutside?: Behavior<{ dismiss: boolean; stopOverlayPropagation: boolean }>;
  onEscapeKeyDown?: Behavior<{ dismiss: boolean; stopOverlayPropagation: boolean; nativePreventDefault: boolean }>;
  onFocusInside?(event: { nativeEvent: Event }): void;
  nativeFocusScrollPrevention?: boolean;
  onPress?: Behavior<{ forceFocus: boolean; runAction: boolean }>;
  themeColorDimming?: false | "auto";
  travelAnimation?: AnimationDefinition | null; stackingAnimation?: AnimationDefinition | null;
}
export interface TransitionOptions { immediate?: boolean; reason?: string }
export class Sheet {
  constructor(root: HTMLElement, options?: SheetOptions);
  static get(element: HTMLElement): Sheet | undefined;
  readonly root: HTMLElement; readonly view: HTMLElement; readonly content: HTMLElement; readonly componentId: ComponentId;
  readonly isOpen: boolean;
  readonly state: "closed" | "opening" | "open" | "dragging" | "settling" | "closing" | "destroyed";
  readonly detent: number; readonly progress: number; readonly position: number; readonly points: number[];
  readonly options: SheetOptions;
  /** Includes closed at 0. Legacy detent/snapTo remain zero-based open positions. */
  activeDetent: number; presented: boolean;
  open(options?: TransitionOptions & { detent?: number; trigger?: Element | null }): Promise<boolean>;
  close(options?: TransitionOptions & { force?: boolean; restoreFocus?: boolean }): Promise<boolean>;
  snapTo(index: number, options?: TransitionOptions & { velocity?: number }): Promise<boolean>;
  setActiveDetent(index: number, options?: TransitionOptions): Promise<boolean>;
  setOptions(options: Partial<SheetOptions>): Promise<boolean>;
  step(action?: { direction?: "up" | "down"; detent?: number }): Promise<boolean>;
  outlet(element: HTMLElement, options: Omit<OutletOptions, "forComponent">): Outlet;
  refresh(): void; destroy(): void;
}
export type ScrollSkip = "default" | "auto" | boolean;
export interface ScrollToOptions { progress?: number; distance?: number; animationSettings?: { skip?: ScrollSkip } }
export interface ScrollData { progress: number; distance: number; availableDistance: number; nativeEvent: Event }
export interface ScrollOptions {
  componentId?: ComponentId; componentRef?: { current: Scroll | null } | null;
  axis?: "x" | "y"; pageScroll?: boolean; nativePageScrollReplacement?: boolean | "auto";
  safeArea?: "none" | "layout-viewport" | "visual-viewport";
  scrollGestureTrap?: boolean | { x?: boolean; y?: boolean; xStart?: boolean; xEnd?: boolean; yStart?: boolean; yEnd?: boolean };
  scrollGestureOvershoot?: boolean; scrollGesture?: boolean | "auto";
  onScroll?(data: ScrollData): void; onScrollStart?: Behavior<{ dismissKeyboard: boolean }>;
  onScrollEnd?(event: { nativeEvent: Event }): void;
  nativeFocusScrollPrevention?: boolean; onFocusInside?: Behavior<{ scrollIntoView: boolean }>;
  scrollAnimationSettings?: { skip?: "auto" | boolean };
  scrollAnchoring?: boolean; scrollSnapType?: "none" | "proximity" | "mandatory";
  scrollPadding?: string; scrollTimelineName?: string; nativeScrollbar?: boolean;
  onPress?: Behavior<{ forceFocus: boolean; runAction: boolean }>;
}
export class Scroll {
  constructor(root: HTMLElement, options?: ScrollOptions);
  static get(element: HTMLElement): Scroll | undefined;
  readonly root: HTMLElement; readonly view: HTMLElement; readonly content: HTMLElement; readonly componentId: ComponentId; readonly scroller: HTMLElement;
  getProgress(): number; getDistance(): number; getAvailableDistance(): number;
  scrollTo(options: ScrollToOptions): void; scrollBy(options: ScrollToOptions): void;
  setOptions(options: Partial<ScrollOptions>): void; refresh(): void; destroy(): void;
}
export interface OutletOptions { forComponent?: ComponentReference; travelAnimation?: AnimationDefinition | null; stackingAnimation?: AnimationDefinition | null }
export class Outlet {
  constructor(element: HTMLElement, options?: OutletOptions);
  setOptions(options: Partial<OutletOptions>): void; update(): void; destroy(): void;
}
export class SheetStack {
  constructor(root: HTMLElement, options?: { componentId?: ComponentId });
  readonly componentId: ComponentId; readonly sheets: Sheet[]; readonly progress: number;
  outlet(element: HTMLElement, options?: Omit<OutletOptions, "forComponent">): Outlet;
  destroy(): void;
}
export type ContentGetter = string | (() => Element | null | undefined);
export interface IslandOptions { forComponent?: ComponentReference | ComponentReference[]; disabled?: boolean; contentGetter?: ContentGetter }
export class Island {
  constructor(root: HTMLElement, options?: IslandOptions);
  setOptions(options: Partial<IslandOptions>): void; destroy(): void;
}
export interface ExternalOverlayOptions { disabled?: boolean; selfManagedInertOutside?: boolean; contentGetter?: ContentGetter }
export class ExternalOverlay {
  constructor(root: HTMLElement, options?: ExternalOverlayOptions);
  setOptions(options: Partial<ExternalOverlayOptions>): void; destroy(): void;
}
export class AutoFocusTarget {
  constructor(element: HTMLElement, options: { forComponent?: ComponentId | Sheet; timing: "present" | "dismiss" | Array<"present" | "dismiss"> });
  setOptions(options: { forComponent?: ComponentId | Sheet; timing?: "present" | "dismiss" | Array<"present" | "dismiss"> }): void;
  destroy(): void;
}
export class Fixed { constructor(root: HTMLElement); destroy(): void }
export class VisuallyHidden { constructor(element: HTMLElement); destroy(): void }
export function createComponentId(prefix?: string): ComponentId;
export function getPageScrollData(document?: Document): { pageScrollContainer: HTMLElement | undefined; nativePageScrollReplaced: boolean };
export function observePageScrollData(callback: (data: ReturnType<typeof getPageScrollData>) => void, options?: { document?: Document; signal?: AbortSignal }): () => void;
export function observeMediaQuery(query: string, callback: (matches: boolean) => void, options?: { window?: Window; signal?: AbortSignal }): () => void;
export function updateThemeColor(color: string, document?: Document): void;
export function createThemeColorDimmingOverlay(options?: { element?: HTMLElement; dimmingColor?: string; document?: Document }): {
  setDimmingOverlayOpacity(opacity: number): void;
  animateDimmingOverlayOpacity(options: { keyframes: [number, number]; duration?: number; easing?: string }): Animation | null;
  destroy(): void;
};
export function animate(element: HTMLElement | null, keyframes: Record<string, [string | number, string | number]>, options?: { duration?: number; easing?: string }): Animation | null;
export const animationPresets: Readonly<Record<AnimationPreset, Readonly<Required<SpringOptions>>>>;
export function tween(start: string | number, end: string | number, progress: number): string | number;
export function resolveDetents(detents: Detent[], viewport: number, content: number, resolveLength?: (css: string) => number): number[];
export function nearestDetent(position: number, velocity: number, points: number[], options?: { dismissible?: boolean; current?: number }): number;
export function springAt(time: number, from: number, to: number, velocity?: number, options?: SpringOptions): { position: number; velocity: number };
export function rubberBand(value: number, min: number, max: number, dimension?: number): number;
