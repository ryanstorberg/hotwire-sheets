# Options

Rails helpers accept snake_case keys. JavaScript accepts camelCase keys. For a Stimulus root, use `data-sheet-options-value` with a JSON object in camelCase. Structural Stimulus values override the same keys inside that object.

## Layout and detents

| Rails / JavaScript | Default | Values and behavior |
| --- | --- | --- |
| `edge` | `"bottom"` | `"top"`, `"bottom"`, `"left"`, `"right"` |
| `detents` | `["content"]` | Nonempty array of positive visible lengths |
| `initial_detent` / `initialDetent` | `0` | Zero-based index into the declared detents |
| `portal` | `true` | Moves the view to the document body on first open |
| `stack_effect` / `stackEffect` | `false` | Bottom-sheet scale effect responding to sheets above it |

```ruby
detents: ["content", 0.6, "90%", "320px"]
```

Numbers in `(0, 1]` represent fractions of the visual viewport. Pixel strings represent pixels. Percent strings represent viewport percentages. `"content"` measures intrinsic content size. All resolved sizes are clamped to the viewport; vertical sheets use height, horizontal sheets use width. Other positive CSS lengths such as `"18rem"`, `"60dvh"`, and `"calc(100dvh - 24px)"` are resolved in the browser. `0`, negative values, and `"auto"` are not accepted.

Legacy `detent`/`snapTo()` indices follow declaration order even if content changes size or two detents resolve to the same size. In that API, zero is the first open detent. The closed-inclusive `activeDetent`/`setActiveDetent()` API uses zero for closed. Call `close()` to dismiss without an index. Arrow keys on a handle move through resolved size order, and Home/End select the smallest/largest detent.

## Gestures and dismissal

| Rails / JavaScript | Default | Behavior |
| --- | --- | --- |
| `dismissible` | `true` | Allows Escape, outside-click, and gesture dismissal |
| `swipe_to_dismiss` / `swipeToDismiss` | `true` | Includes closed among gesture destinations |
| `scroll_end_dismiss` / `scrollEndDismiss` | `false` | Lets a bottom sheet with one open detent exit upward when scrolling continues past its body's end; enabled in Long Sheet |
| `opposite_edge_dismiss` / `oppositeEdgeDismiss` | `false` | Allows swipe dismissal through either end of the sheet's axis; requires one open detent; enabled in Sheet with Keyboard and Detached Sheet |
| `close_on_escape` / `closeOnEscape` | `true` | Escape dismisses the frontmost sheet |
| `close_on_outside` / `closeOnOutside` | `true` | Outside click dismisses the frontmost sheet |
| `draggable` | `true` | Allows pointer/touch drag movement |
| `handle_only` / `handleOnly` | `false` | Restricts drag starts to handles |
| `wheel` | `true` | Allows a new wheel gesture at a scroll boundary to move the sheet; an existing content-scroll burst retains ownership |
| `swipe_from_outside` / `swipeFromOutside` | `true` | Accepts drag and wheel input outside the frontmost sheet, including its backdrop and the page behind nonmodal sheets |
| `prevent_edge_swipe` / `preventEdgeSwipe` | `false` | Attempts to cancel touches near horizontal screen edges |

`dismissible: false` still allows an explicit close button or `close()` call. To veto closing for unsaved work, cancel `sheet:before-close`. `draggable` and `wheel` are separate switches. Set both to false for a dialog that moves only through explicit API calls.

Outside swipes use the sheet's edge direction and detent/dismissal rules. Only the frontmost sheet accepts them. `swipe_from_outside: false` limits gestures to its content; `handle_only: true` limits them further to handles. Inputs, unmarked buttons/links, `data-sheet-no-drag` regions, and external `data-sheet-island` overlays keep their own interactions. Once a wheel gesture starts moving a nonmodal sheet, it continues if the sheet uncovers an ordinary page button or link beneath the pointer. New gestures over those controls remain protected. Nonmodal sheets preserve ordinary page clicks; an accepted drag suppresses the resulting click so it cannot activate a background control or dismiss a second sheet. A persistent sheet with `swipe_to_dismiss: false` changes detents without closing.

Use `data-sheet-no-drag` on a custom control or region that must keep its own gestures. Interactive descendants such as inputs are already excluded from drag initiation. Add `data-sheet-drag` to a button or link that should also accept swipes, as in Sidebar's navigation items. A normal click still activates the control; a recognized drag suppresses its click and native link dragging. The marker respects `handle_only`, `draggable`, and enclosing `data-sheet-no-drag` regions, and never opts editable descendants into dragging. Native scrolling that the browser has claimed may remain noncancelable; a handle is the most reliable drag surface.

With `scroll_end_dismiss: true`, the article scrolls normally between its boundaries. At the beginning, continued downward swiping dismisses through the bottom; at the end, continued upward swiping dismisses through the top. Wheel input follows the same directions and stays with either exit even if the article moves away from the pointer. A short pull springs back, while sufficient distance or velocity dismisses. Close buttons, Escape, and `close()` exit upward when the resting article is scrolled past halfway, and downward otherwise. Reopening starts at the beginning and enters from below. Gesture guards and cancelable `sheet:before-close` still apply; touch handoff requires a cancelable event.

This option requires `edge: :bottom` and one detent, typically `detents: [1]`. It uses WAAPI (or the selected frame fallback) even when `scroll_snap: true` is supplied, because its dismissal edge changes with reading position; scrolling inside the article remains native. Other presentations retain their usual boundary ownership.

With `opposite_edge_dismiss: true`, a bottom sheet can exit through the top or bottom. Top, left, and right sheets similarly accept dismissal at either end of their axis. Swipes may start on the surface or backdrop; scrollable content scrolls first, then continued cancelable input at its boundary can move the sheet. Inputs and protected regions retain their own gestures. A short or canceled pull returns to the open position, and dismissal vetoes still apply. Reopening uses the configured entrance edge. Close buttons and Escape use that edge unless an opposite exit is already moving.

This mode uses one viewport length for travel in either direction, with WAAPI/frame motion even if `scroll_snap: true` is also set. Custom centered presentations must incorporate `--sheet-offset` into their transform so they physically follow both directions. It does not reset form data or content scroll position when reopening.

## Dismissal commitment

Wheel-driven travel commits to dismissal once it reaches the midpoint between closed and the smallest open detent. The exit animation then completes without waiting for the trackpad momentum stream to stop. With one open detent, that means halfway through the dismissal travel. With several detents, the lower open positions remain available instead of being skipped on the way down.

A sharp drop in wheel magnitude identifies the weak momentum tail of a shorter pull. That pull settles promptly to its nearest detent; tiny continued packets do not keep resetting the settling timer. The remainder of the same burst cannot reverse a committed exit or dismiss the exposed parent. A pause, direction reversal, or renewed push releases the wheel guard. The guard owns input, not an invisible modal layer or a background scroll lock.

Touch and pointer drags follow the finger until release. Native touch release settles immediately, including when the finger pauses before release. Canceled drags restore their detent, and a new touch can interrupt an uncommitted return animation. `dismissible: false`, `swipe_to_dismiss: false`, alert dialogs, and `sheet:before-close` vetoes retain their existing behavior. An explicit `open()` can still interrupt an exit.

## Modality and focus

| Rails / JavaScript | Default | Behavior |
| --- | --- | --- |
| `modal` | `true` | Supplies modal dialog semantics and modality defaults |
| `trap_focus` / `trapFocus` | Follows `modal` | Keeps keyboard focus within active scopes |
| `lock_scroll` / `lockScroll` | Follows `modal` | Locks document scrolling while presented |
| `inert` | Follows `modal` | Makes unrelated background content inert |
| `autofocus` | `true` | Moves focus into the sheet when it opens |
| `restore_focus` / `restoreFocus` | `true` | Returns focus after dismissing the frontmost sheet |
| `initial_focus` / `initialFocus` | Unset | Selector within the content; JavaScript also accepts an element |

These flags are independent. Turning off `inert` does not automatically turn off the focus trap. A nonmodal player usually uses `modal: false, autofocus: false, close_on_outside: false`. A notification additionally uses `restore_focus: false` so its timer cannot pull focus away from the current task.

## Motion backends

| Rails / JavaScript | Default | Behavior |
| --- | --- | --- |
| `animation` | `"waapi"` | Browser-owned transform/opacity spring animation; `"raf"` selects the JavaScript fallback |
| `scroll_snap` / `scrollSnap` | `false` | Native CSS Scroll Snap detents on all four edges; native scroll timing by default; phase settings can select WAAPI transitions |

```erb
<%= hotwire_sheet(id: "contacts", detents: [0.4, 0.9], scroll_snap: true) do |sheet| %>
  <%= sheet.content do %>
    <%= sheet.handle %>
    <%= sheet.title "Contacts" %>
    <%= sheet.body do %><p>Your contacts go here.</p><% end %>
    <%= sheet.close %>
  <% end %>
<% end %>
```

Both backends use the same lifecycle and detent APIs. Native snapping is opt-in because it changes gesture and settling feel. Its generated view/track geometry should retain the structural CSS; use the default WAAPI backend for custom transforms such as a centered card or detached presentation. If CSS Scroll Snap is unavailable, the sheet uses the animation backend. If WAAPI is unavailable, it falls back to frame animation.

The default WAAPI backend snapshots authored transforms and interpolates their matrices. Avoid `!important` on animated `transform`/`opacity`, which overrides browser animations. Use `animation: "raf"` for nonlinear CSS transforms or effects that must be recalculated on every JavaScript frame. See [architecture](architecture.md#gpu-acceleration-and-high-refresh-rates) for acceleration, frame pacing, and benchmark details.

## Spring motion

```erb
<%= hotwire_sheet(id: "panel",
      spring: { stiffness: 420, damping: 38, mass: 1 }) do |sheet| %>
  <%# content %>
<% end %>
```

All three values must be positive finite numbers. More stiffness pulls toward the destination more strongly; more damping reduces oscillation; more mass increases inertia. Omitted entries use the values above. These parameters apply to WAAPI and frame animation. Native snap uses browser scroll timing unless explicit phase animation settings are supplied. Both modes respect `prefers-reduced-motion`; public transition calls can also use `immediate: true`.

## Rails-only arguments

| Argument | Default | Meaning |
| --- | --- | --- |
| `id:` | Required | Stable unique DOM ID |
| `open:` | `false` | Present after the Stimulus controller connects |
| `html:` | `{}` | Root attributes, including `data:` and classes |
| `label:` | Unset | Accessible dialog name when no title is used |
| `description:` | Unset | Default text for `sheet.description` |

Unknown Rails option keys raise an error. The JavaScript constructor validates edges, detents, starting indices, and spring values; use its TypeScript declarations to catch misspelled keys.

## Stimulus values

The built-in controller recognizes `options`, `detents`, `initialDetent`, `edge`, `modal`, and `open`. For example:

```html
<div id="panel" data-controller="sheet"
     data-sheet-detents-value='[0.4,0.9]'
     data-sheet-initial-detent-value="0"
     data-sheet-options-value='{"handleOnly":true,"closeOnOutside":false}'>
  <!-- view and content -->
</div>
```

Configuration is read on connect. Changing `data-sheet-open-value` presents or dismisses a connected sheet. Changes to `data-sheet-options-value` call `setOptions`. Geometry and swipe-availability changes must be made while the sheet rests. Separate structural Stimulus values are initial configuration; use the options object or `setOptions()` for live changes. The gallery also demonstrates rebuilding responsive presentations when their structure changes.

## Extended Sheet options

These options configure presentation state, placement, interaction, and animation. All serializable options are accepted by the Rails helper in snake_case.

| JavaScript option | Default | Behavior |
| --- | --- | --- |
| `componentId` | Root DOM ID | Associates triggers, outlets, focus targets, and islands |
| `forComponent` / `stack` | Closest named stack when present | Stack ID, instance, or `"closest"` |
| `sheetRole` | `"dialog"` | Content ARIA role; `"alertdialog"` disables gesture, outside, and Escape dismissal |
| `defaultPresented` | `false` | Presents after initialization |
| `presented` | Unset | Initial controlled state; update using `setOptions`, the setter, or Stimulus open value |
| `defaultActiveDetent` | `1` in closed-inclusive numbering | Initial open position; closed remains separate until presentation |
| `activeDetent` | Unset | Controlled detent; zero means closed, one means the first open position |
| `contentPlacement` | Derived from `edge` / `tracks` | An edge or `"center"`; cross-axis alignment is centered |
| `tracks` | Derived from `edge` | An edge or two opposing edges; the first track is the default entrance |
| `container` | Document body | Portal destination; element or selector in JavaScript, selector in Rails |
| `swipe` | `true` | Alias for `draggable` |
| `swipeDismissal` | `true` except alert dialogs | Alias for `swipeToDismiss` |
| `swipeable` | `true` | Alias for backdrop/outside gesture availability; a backdrop may also use `data-sheet-swipeable="false"` |
| `swipeTrap` | `true` | Boolean or `{ x, y }`; allows boundary propagation when false and modality permits it |
| `swipeOvershoot` | `false` | Opt-in elastic movement past the largest open extent; use a bleeding background for an attached surface |
| `nativeEdgeSwipePrevention` | `false` | Alias for edge-swipe prevention |
| `inertOutside` | `true` | Alias for modal defaults, including inertness, focus trapping, and scroll locking |
| `nativeFocusScrollPrevention` | `true` | Manages pointer focus without native viewport scrolling; iframe and browser keyboard limitations still apply |
| `themeColorDimming` | `false` | `"auto"` blends the backdrop with the theme-color meta tag in WebKit |
| `travelAnimation`, `stackingAnimation` | Unset | [Outlet definitions](animations.md) on the content |
| `enteringAnimationSettings` | Legacy spring / native timing | Entry preset or settings object |
| `exitingAnimationSettings` | Legacy spring / native timing | Exit preset or settings object |
| `steppingAnimationSettings` | Legacy spring / native timing | Detent transition preset or settings object |

`swipeOvershoot` intentionally remains opt-in to preserve the anchored behavior of existing applications. `swipeTrap` cannot allow interactions through an inert modal scope, and disabling overshoot traps boundary gestures. Native scroll chaining remains subject to browser cancellation and elasticity support. Supported two-track placement uses the WAAPI gesture backend; one-track native sheets retain their existing physical scroll geometry.

## Callbacks and behavior hooks

`onPresentedChange(boolean)` and `onActiveDetentChange(number)` report completed state changes. `onTravelStatusChange` reports `idleOutside`, `entering`, `idleInside`, `stepping`, or `exiting`. `onTravelRangeChange({ start, end })` reports closed-inclusive detent bounds. `onTravel({ progress, range, progressAtDetents })` runs with rendered motion; `onTravelStart()` and `onTravelEnd()` bracket travel. Supply functions in JavaScript.

Behavior hooks accept an option object or a JavaScript callback whose event exposes `nativeEvent` and `changeDefault(options)`:

| Hook | Default options |
| --- | --- |
| `onPresentAutoFocus` | `{ focus: true }` |
| `onDismissAutoFocus` | `{ focus: true }` |
| `onClickOutside` | `{ dismiss: true, stopOverlayPropagation: true }` |
| `onEscapeKeyDown` | `{ dismiss: true, stopOverlayPropagation: true, nativePreventDefault: true }` |
| `onPress` | `{ forceFocus: true, runAction: true }` |

Legacy `autofocus`, `restoreFocus`, `closeOnOutside`, `closeOnEscape`, and `dismissible` flags supply the defaults when customized. Alert dialogs always block outside/Escape dismissal, even if a callback requests it. `onFocusInside({ nativeEvent })` is a notification callback. The [Scroll](scroll.md) variant additionally offers configurable reveal behavior.

```erb
<%= hotwire_sheet(id: "notification", modal: false,
      on_escape_key_down: { dismiss: false, stop_overlay_propagation: false },
      on_click_outside: { dismiss: false, stop_overlay_propagation: false }) do |sheet| %>
  <%= sheet.content do %><%= sheet.title "Saved" %><% end %>
<% end %>
```

This lets the nonmodal notification stay open while an underlying sheet handles Escape or an outside click. The callback/behavior events also have DOM equivalents; see [JavaScript API](javascript.md).
