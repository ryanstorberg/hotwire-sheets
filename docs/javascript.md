# JavaScript API

The core has no Rails, Turbo, Stimulus, or React dependency. Import `Sheet` and the structural CSS, then connect it to ordinary HTML.

```html
<button data-sheet-open="profile">View profile</button>
<div id="profile" data-sheet-root>
  <div data-sheet-view hidden>
    <div data-sheet-backdrop></div>
    <section data-sheet-content aria-labelledby="profile-title">
      <div data-sheet-handle tabindex="0" aria-label="Resize sheet"></div>
      <h2 id="profile-title">Profile</h2>
      <div data-sheet-body>Scrollable content</div>
      <button type="button" data-sheet-close>Close</button>
    </section>
  </div>
</div>
```

```js
import { Sheet } from "hotwire-sheets"

const root = document.getElementById("profile")
const sheet = new Sheet(root, { detents: [0.4, 0.9] })
await sheet.open()
await sheet.snapTo(1)
await sheet.close()
sheet.destroy()
```

When Stimulus owns the root, retrieve it with `Sheet.get(root)` instead of constructing a second instance. Retrieve after the controller connects; before that, the result is `undefined`.

## Methods

| Method | Arguments | Result |
| --- | --- | --- |
| `new Sheet(root, options)` | Root HTMLElement, [options](options.md) | Connected instance; starts closed |
| `Sheet.get(root)` | Root HTMLElement | Instance or `undefined` |
| `open(options)` | `detent`, `trigger`, `immediate`, `reason` | `Promise<boolean>` |
| `close(options)` | `force`, `restoreFocus`, `immediate`, `reason` | `Promise<boolean>` |
| `snapTo(index, options)` | Zero-based index, `velocity`, `immediate`, `reason` | `Promise<boolean>` |
| `refresh()` | None | Schedules a measurement on the next frame |
| `destroy()` | None | Synchronously releases resources; idempotent |

Transition promises resolve `true` for a completed transition and `false` for canceled, interrupted, or inapplicable transitions. `open()` on an open sheet snaps to the requested detent. `snapTo()` on a closed sheet stores the requested index for its next opening and resolves `false`. Invalid detent indices reject the transition promise with a range error.

`immediate` defaults to false. `reason` defaults to `"api"`. `open` defaults to the current detent and uses the active element as its return-focus trigger. `close({ force: true })` bypasses the cancelable before-close event. Set `restoreFocus: false` for navigation-driven closes. `snapTo` velocity is measured in pixels per millisecond.

## Readable state

| Property | Meaning |
| --- | --- |
| `root`, `view`, `content` | The associated DOM elements |
| `state` | `closed`, `opening`, `open`, `dragging`, `settling`, `closing`, `destroyed` |
| `isOpen` | True while presented, including animation and dragging |
| `detent` | Current requested detent index |
| `position` | Current visible length in pixels; capped at maximum extent, with outward rubber banding allowed below zero |
| `progress` | Normalized position relative to maximum extent, clamped to 0–1 |
| `points` | Resolved detent lengths after the first measurement |

Treat these as read-only, apart from the explicit `presented` and `activeDetent` setters described below. The root and view also expose `data-sheet-state` for CSS and automation.

## Events

Events bubble from the **root** as `CustomEvent`s. Each detail object includes `sheet` and `detent`.

| Event | Timing | Additional detail |
| --- | --- | --- |
| `sheet:before-open` | Before presentation; cancelable | `reason`, requested `detent` |
| `sheet:open` | Opening completes | `reason` |
| `sheet:before-close` | Before closing; cancelable | `reason` |
| `sheet:close` | Closing completes or forced cleanup finishes | `reason` |
| `sheet:detent-change` | A snap to a different detent completes | `previousDetent`, `reason` |
| `sheet:progress` | A rendered position changes or is measured | `position`, `progress` |
| `sheet:drag-start` | A drag takes control | Input lifecycle notification |
| `sheet:drag-end` | Drag ends | Input lifecycle notification |

Keep progress handlers light. Read geometry during setup or resize rather than forcing layout every animation frame. If sheets are nested in your root markup, filter `event.target === root` to ignore a child's bubbling events.

```js
root.addEventListener("sheet:before-close", event => {
  if (event.target === root && formIsDirty()) event.preventDefault()
})

root.addEventListener("sheet:close", event => {
  if (event.target === root) console.log(event.detail.reason)
})
```

Typical reasons include `api`, `trigger`, `close-button`, `outside`, `escape`, `swipe`, `gesture`, `keyboard`, `navigation`, and `disconnect`. Applications may supply their own reason strings.

## TypeScript

The npm exports include declarations for `Sheet`, `SheetOptions`, `Detent`, `SpringOptions`, and `TransitionOptions`.

```ts
import { Sheet, type SheetOptions } from "hotwire-sheets"
const options: SheetOptions = { detents: ["content", "80%"] }
const sheet = new Sheet(document.querySelector<HTMLElement>("#profile")!, options)
```

Lower-level exported utilities are `resolveDetents`, `nearestDetent`, `springAt`, and `rubberBand`. Most applications should use `Sheet` rather than coordinating those pieces themselves.

## Controlled state and triggers

```js
sheet.presented = true;
await sheet.setActiveDetent(2); // Closed-inclusive: second open position.
await sheet.setOptions({ onEscapeKeyDown: { dismiss: false } });
sheet.presented = false;
```

`presented` reads presentation state and its setter opens/closes the sheet. `activeDetent` includes closed at zero; its setter calls `setActiveDetent`. Use `setActiveDetent(index, transitionOptions)` when you need a completion promise. Legacy `detent` and `snapTo(index)` continue to use zero-based open positions.

`step({ direction: "up" })` or `step({ direction: "down" })` cycles through the closed and open positions. `step({ detent: 2 })` selects an explicit closed-inclusive detent. `setOptions(partialOptions)` updates configuration. Update geometry or swipe availability while resting; controlled presentation can interrupt ongoing transitions.

```html
<button data-sheet-for="profile" data-sheet-action="present">Open</button>
<button data-sheet-for="profile" data-sheet-action='{"type":"step","direction":"down"}'>Previous size</button>
<button data-sheet-for="profile" data-sheet-action="dismiss">Close</button>
```

`data-sheet-for` can name a `componentId`, or be omitted inside its sheet root. `data-sheet-open` and `data-sheet-close` remain supported. Trigger press behavior can be customized with `data-sheet-on-press` JSON or the instance's `onPress` hook.

## Extended events

Travel events are `sheet:travel-status-change`, `sheet:travel-range-change`, `sheet:travel-start`, `sheet:travel-end`, and `sheet:travel`. The travel event carries `progress`, `range`, and `progressAtDetents`. Status/range events carry `status`/`range` respectively.

Behavior events are `sheet:present-auto-focus`, `sheet:dismiss-auto-focus`, `sheet:click-outside`, `sheet:escape-key-down`, and `sheet:press`. Their detail exposes the behavior fields, `nativeEvent`, and `changeDefault({...})`; these events customize the default action through that method rather than `preventDefault()`. The existing before-open/before-close events remain cancelable.

## Additional exports

The core also exports `Scroll`, `Outlet`, `SheetStack`, `Island`, `ExternalOverlay`, `Fixed`, `AutoFocusTarget`, `VisuallyHidden`, `animate`, `animationPresets`, `tween`, `createComponentId`, `getPageScrollData`, `observePageScrollData`, `observeMediaQuery`, `updateThemeColor`, and `createThemeColorDimmingOverlay`. Their options and return types ship in the TypeScript declarations.

See [Scroll](scroll.md), [animation APIs](animations.md), and [auxiliary primitives](primitives.md) for complete usage. The browser entry point can be imported during server rendering; no DOM is accessed until a DOM-dependent instance is constructed. Functions whose purpose is observing the browser provide an explicit server fallback.
