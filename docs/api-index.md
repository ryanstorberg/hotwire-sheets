# API index

This index lists the component options and utility functions available in Hotwire Sheets. Use the linked guides for defaults, signatures, and complete examples. Serializable options also work through Rails helpers in snake_case.

See [core concepts](concepts.md), [options](options.md), [Rails helpers](rails.md), [JavaScript API](javascript.md), [animation APIs](animations.md), and [coverage](coverage.md).

## Components

| Component or part | JavaScript / Rails API |
| --- | --- |
| Sheet | Sheet / hotwire_sheet |
| Sheet triggers | data-sheet-action / hotwire_sheet_trigger |
| Sheet outlets | Outlet / hotwire_sheet_outlet |
| Portal | portal and container options |
| Sheet options | Sheet options / data-sheet-view |
| Backdrop | data-sheet-backdrop / sheet.backdrop |
| Sheet content | data-sheet-content / sheet.content |
| Bleeding background | data-sheet-bleeding-background / sheet.bleeding_background |
| Handle | data-sheet-handle / sheet.handle |
| Title | data-sheet-title / sheet.title |
| Description | data-sheet-description / sheet.description |
| Special wrapper | data-sheet-special-wrapper |
| Special content | data-sheet-special-content |
| Scroll | Scroll / hotwire_scroll |
| Scroll triggers | data-scroll-action / hotwire_scroll_trigger |
| Scroll options | Scroll options / scroll.view |
| Scroll content | data-scroll-content / scroll.content |
| SheetStack | SheetStack / hotwire_sheet_stack |
| Stack outlets | Outlet / stack.outlet |
| AutoFocusTarget | AutoFocusTarget / hotwire_sheet_auto_focus |
| Island | Island / hotwire_sheet_island |
| Island content | data-island-content |
| Fixed | Fixed / hotwire_sheet_fixed |
| Fixed content | data-fixed-content |
| VisuallyHidden | VisuallyHidden / .sheet-visually-hidden |
| ExternalOverlay | ExternalOverlay / hotwire_sheet_external_overlay |

## Sheet

| Property or action | API | Notes |
| --- | --- | --- |
| `componentId` | componentId |  |
| `forComponent` | forComponent | Serializable IDs or JavaScript instances; DOM ancestry supplies closest association. |
| `sheetRole` | sheetRole |  |
| `defaultPresented` | defaultPresented |  |
| `presented` | presented |  |
| `onPresentedChange` | onPresentedChange |  |
| `defaultActiveDetent` | defaultActiveDetent | Closed-inclusive numbering; legacy detent/snapTo keep open-position indices. |
| `activeDetent` | activeDetent | Closed-inclusive numbering; legacy detent/snapTo keep open-position indices. |
| `onActiveDetentChange` | onActiveDetentChange | Closed-inclusive numbering; legacy detent/snapTo keep open-position indices. |

## Sheet triggers

| Property or action | API | Notes |
| --- | --- | --- |
| `forComponent` | forComponent | Serializable IDs or JavaScript instances; DOM ancestry supplies closest association. |
| `action` | action |  |
| `onPress` | onPress |  |
| `travelAnimation` | Outlet definitions or data-sheet-*-animation | Functions in JavaScript; arrays/constants can be serialized from Rails. |
| `stackingAnimation` | Outlet definitions or data-sheet-*-animation | Functions in JavaScript; arrays/constants can be serialized from Rails. |

## Sheet outlets

| Property or action | API | Notes |
| --- | --- | --- |
| `forComponent` | forComponent | Serializable IDs or JavaScript instances; DOM ancestry supplies closest association. |
| `travelAnimation` | Outlet definitions or data-sheet-*-animation | Functions in JavaScript; arrays/constants can be serialized from Rails. |
| `stackingAnimation` | Outlet definitions or data-sheet-*-animation | Functions in JavaScript; arrays/constants can be serialized from Rails. |

## Portal

| Property or action | API | Notes |
| --- | --- | --- |
| `container` | container |  |

## Sheet options

| Property or action | API | Notes |
| --- | --- | --- |
| `forComponent` | forComponent | Serializable IDs or JavaScript instances; DOM ancestry supplies closest association. |
| `contentPlacement` | contentPlacement |  |
| `tracks` | tracks |  |
| `detents` | detents | Supply every open position, including "content" for full-content sizing. |
| `swipeTrap` | swipeTrap | Axis-aware boundary propagation; native scroll chaining follows browser cancellation rules. |
| `swipeOvershoot` | swipeOvershoot | Opt-in here to preserve existing attached-edge behavior; native elasticity depends on the browser. |
| `swipeDismissal` | swipeDismissal |  |
| `swipe` | swipe |  |
| `nativeEdgeSwipePrevention` | nativeEdgeSwipePrevention | Cancels qualifying edge touch starts; physical browser gesture prevention is best-effort. |
| `enteringAnimationSettings` | enteringAnimationSettings |  |
| `exitingAnimationSettings` | exitingAnimationSettings |  |
| `steppingAnimationSettings` | steppingAnimationSettings |  |
| `onTravelStatusChange` | onTravelStatusChange |  |
| `onTravelRangeChange` | onTravelRangeChange |  |
| `onTravel` | onTravel |  |
| `onTravelStart` | onTravelStart |  |
| `onTravelEnd` | onTravelEnd |  |
| `inertOutside` | inertOutside |  |
| `onPresentAutoFocus` | onPresentAutoFocus |  |
| `onDismissAutoFocus` | onDismissAutoFocus |  |
| `onClickOutside` | onClickOutside |  |
| `onEscapeKeyDown` | onEscapeKeyDown |  |
| `onFocusInside` | onFocusInside |  |
| `nativeFocusScrollPrevention` | nativeFocusScrollPrevention | Pointer focus uses preventScroll; browser/keyboard/iframe limitations still apply. |

## Backdrop

| Property or action | API | Notes |
| --- | --- | --- |
| `swipeable` | swipeable |  |
| `themeColorDimming` | themeColorDimming | Sheet option or programmatic dimming overlay; WebKit automatic mode. |
| `travelAnimation` | Outlet definitions or data-sheet-*-animation | Functions in JavaScript; arrays/constants can be serialized from Rails. |
| `stackingAnimation` | Outlet definitions or data-sheet-*-animation | Functions in JavaScript; arrays/constants can be serialized from Rails. |

## Sheet content

| Property or action | API | Notes |
| --- | --- | --- |
| `travelAnimation` | Outlet definitions or data-sheet-*-animation | Functions in JavaScript; arrays/constants can be serialized from Rails. |
| `stackingAnimation` | Outlet definitions or data-sheet-*-animation | Functions in JavaScript; arrays/constants can be serialized from Rails. |

## Bleeding background

| Property or action | API | Notes |
| --- | --- | --- |
| `travelAnimation` | Outlet definitions or data-sheet-*-animation | Functions in JavaScript; arrays/constants can be serialized from Rails. |
| `stackingAnimation` | Outlet definitions or data-sheet-*-animation | Functions in JavaScript; arrays/constants can be serialized from Rails. |

## Handle

| Property or action | API | Notes |
| --- | --- | --- |
| `forComponent` | forComponent | Serializable IDs or JavaScript instances; DOM ancestry supplies closest association. |
| `action` | action |  |
| `onPress` | onPress |  |
| `travelAnimation` | Outlet definitions or data-sheet-*-animation | Functions in JavaScript; arrays/constants can be serialized from Rails. |
| `stackingAnimation` | Outlet definitions or data-sheet-*-animation | Functions in JavaScript; arrays/constants can be serialized from Rails. |

## Title

| Property or action | API | Notes |
| --- | --- | --- |
| `travelAnimation` | Outlet definitions or data-sheet-*-animation | Functions in JavaScript; arrays/constants can be serialized from Rails. |
| `stackingAnimation` | Outlet definitions or data-sheet-*-animation | Functions in JavaScript; arrays/constants can be serialized from Rails. |

## Description

| Property or action | API | Notes |
| --- | --- | --- |
| `travelAnimation` | Outlet definitions or data-sheet-*-animation | Functions in JavaScript; arrays/constants can be serialized from Rails. |
| `stackingAnimation` | Outlet definitions or data-sheet-*-animation | Functions in JavaScript; arrays/constants can be serialized from Rails. |

## Scroll

| Property or action | API | Notes |
| --- | --- | --- |
| `componentId` | componentId |  |
| `componentRef` | Scroll instance / componentRef.current | No React ref dependency. |
| `getProgress` | getProgress |  |
| `getDistance` | getDistance |  |
| `getAvailableDistance` | getAvailableDistance |  |
| `scrollTo` | scrollTo |  |
| `scrollBy` | scrollBy |  |

## Scroll triggers

| Property or action | API | Notes |
| --- | --- | --- |
| `forComponent` | forComponent | Serializable IDs or JavaScript instances; DOM ancestry supplies closest association. |
| `action` | action |  |
| `onPress` | onPress |  |

## Scroll options

| Property or action | API | Notes |
| --- | --- | --- |
| `forComponent` | forComponent | Serializable IDs or JavaScript instances; DOM ancestry supplies closest association. |
| `axis` | axis |  |
| `pageScroll` | pageScroll |  |
| `nativePageScrollReplacement` | nativePageScrollReplacement |  |
| `safeArea` | safeArea |  |
| `scrollGestureTrap` | scrollGestureTrap |  |
| `scrollGestureOvershoot` | scrollGestureOvershoot |  |
| `scrollGesture` | scrollGesture |  |
| `onScroll` | onScroll |  |
| `onScrollStart` | onScrollStart |  |
| `onScrollEnd` | onScrollEnd |  |
| `nativeFocusScrollPrevention` | nativeFocusScrollPrevention | Pointer focus uses preventScroll; browser/keyboard/iframe limitations still apply. |
| `onFocusInside` | onFocusInside |  |
| `scrollAnimationSettings` | scrollAnimationSettings |  |
| `scrollAnchoring` | scrollAnchoring |  |
| `scrollSnapType` | scrollSnapType |  |
| `scrollPadding` | scrollPadding |  |
| `scrollTimelineName` | scrollTimelineName |  |
| `nativeScrollbar` | nativeScrollbar |  |

## SheetStack

| Property or action | API | Notes |
| --- | --- | --- |
| `componentId` | componentId |  |

## Stack outlets

| Property or action | API | Notes |
| --- | --- | --- |
| `forComponent` | forComponent | Serializable IDs or JavaScript instances; DOM ancestry supplies closest association. |
| `stackingAnimation` | Outlet definitions or data-sheet-*-animation | Functions in JavaScript; arrays/constants can be serialized from Rails. |

## AutoFocusTarget

| Property or action | API | Notes |
| --- | --- | --- |
| `forComponent` | forComponent | Serializable IDs or JavaScript instances; DOM ancestry supplies closest association. |
| `timing` | timing |  |

## Island

| Property or action | API | Notes |
| --- | --- | --- |
| `forComponent` | forComponent | Serializable IDs or JavaScript instances; DOM ancestry supplies closest association. |
| `disabled` | disabled |  |
| `contentGetter` | contentGetter |  |

## ExternalOverlay

| Property or action | API | Notes |
| --- | --- | --- |
| `disabled` | disabled |  |
| `selfManagedInertOutside` | selfManagedInertOutside |  |
| `contentGetter` | contentGetter |  |

## createComponentId

| Property or action | API | Notes |
| --- | --- | --- |
| `function` | createComponentId |  |

## Page scroll subscriptions

| Property or action | API | Notes |
| --- | --- | --- |
| `function` | getPageScrollData / observePageScrollData | Subscriptions return cleanup functions. |

## Media query subscriptions

| Property or action | API | Notes |
| --- | --- | --- |
| `function` | observeMediaQuery | Subscriptions return cleanup functions. |

## updateThemeColor

| Property or action | API | Notes |
| --- | --- | --- |
| `function` | updateThemeColor |  |

## Theme color dimming

| Property or action | API | Notes |
| --- | --- | --- |
| `function` | createThemeColorDimmingOverlay | Subscriptions return cleanup functions. |

## animate

| Property or action | API | Notes |
| --- | --- | --- |
| `function` | animate |  |

## Guides and downloadable documentation

Installation is covered in [getting started](getting-started.md). [Styling](styling.md) covers HTML composition, CSS layers, Tailwind ordering, viewport sizing, and default styles. [Primitives](primitives.md) covers stacks, focus, and external overlays. The [examples](examples.md) and [recipes](recipes.md) show all 16 presentations.

Download individual Markdown pages, [llms.txt](llms.txt), the bundled [docs-full.md](docs-full.md), or the [machine-readable API inventory](api-inventory.json).
