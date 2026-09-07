# Animation APIs

The library uses the Web Animations API for timed surface motion and CSS Scroll Snap for native detent travel. Animation playback has no fixed 60 Hz cap. Actual compositing and frame rate depend on the browser, display, hardware, and animated properties.

## Separate transition settings

```erb
<%= hotwire_sheet(id: "account",
      entering_animation_settings: "elastic",
      exiting_animation_settings: { easing: "ease-in", duration: 220 },
      stepping_animation_settings: "snappy") do |sheet| %>
  <%= sheet.content do %>
    <%= sheet.title "Account" %>
    <%= sheet.close %>
  <% end %>
<% end %>
```

JavaScript names are `enteringAnimationSettings`, `exitingAnimationSettings`, and `steppingAnimationSettings`. Each accepts a preset name or an object. The legacy `spring` setting supplies values when a phase does not override them.

| Setting | Meaning |
| --- | --- |
| `preset` | `gentle`, `smooth`, `snappy`, `brisk`, `bouncy`, or `elastic` |
| `easing: "spring"` | Analytical spring using `stiffness`, `damping`, and `mass` |
| `initialVelocity` | Initial spring velocity in pixels per second |
| `precision` | Spring position settlement tolerance in pixels |
| `easing` | `linear`, `ease`, `ease-in`, `ease-out`, `ease-in-out`, or `cubic-bezier(...)` |
| `duration` | Milliseconds for a timed easing; default 500 when selecting a timed easing |
| `delay` | Milliseconds before motion begins |
| `track` | Entry/exit direction for a sheet with two `tracks`; does not apply to stepping |
| `contentMove: false` | Entry places the content at its destination while associated effects animate; exit leaves content at its current detent until dismissal |
| `skip: true` | Completes immediately |

Reduced motion skips sheet transitions. `animationPresets` exports six immutable spring configurations for common transitions. A native snap sheet without phase settings uses browser smooth scrolling. Supplying phase settings uses WAAPI for that programmatic transition and commits the physical scroll offset afterward. User input still uses native snapping.

## Travel and stacking outlets

An `Outlet` animates an existing element. It can be a title, handle, backdrop, page, trigger, or application element; an extra wrapper is unnecessary unless viewport clipping is requested.

```js
const effect = sheet.outlet(document.querySelector("#background"), {
  travelAnimation: {
    scale: [1, .94],
    translateY: ["0px", "12px"],
    transformOrigin: "50% 0"
  },
  stackingAnimation: {
    opacity: ({ progress }) => Math.max(.4, 1 - progress * .15)
  }
});
```

`new Outlet(element, { forComponent: "account", ... })` can associate an element outside the sheet root. `new SheetStack(root, { componentId: "pages" }).outlet(element, {...})` creates an outlet driven by sheets above that stack's first sheet. A sheet outlet's stacking progress sums the travel progress of associated sheets above it. A sheet’s travel progress is zero when closed and one at its largest extent; stacking progress can exceed one.

```erb
<%= hotwire_sheet_outlet(for_component: "account",
      travel_animation: { scale: [1, 0.94], opacity: [1, 0.8] },
      html: { id: "background" }) do %>
  <%= render "page" %>
<% end %>
```

Property names use camelCase in JavaScript and snake_case in Ruby. Values can be a constant, a two-value array, or a JavaScript function receiving `{ progress, tween }`. `null` and `undefined` leave a property alone. On the backdrop, `travelAnimation: { opacity: null }` disables the default fade and keeps it opaque. `tween(start, end)` interpolates numbers and compatible CSS values using the current progress. Functions must be synchronous and free of side effects; the library samples them to construct animations.

Individual transforms are composed into one transform: `translate`, `translateX/Y/Z`, `scale`, `scaleX/Y/Z`, `rotate`, `rotateX/Y/Z`, and `skew`, `skewX/Y`. Use a string with units for translations or rotations, or numbers for pixels/degrees. Scales are unitless. `travelAnimation` on a Sheet's options composes with its structural travel transform.

For plain markup inside a sheet, use JSON-valued `data-sheet-travel-animation` and `data-sheet-stacking-animation`. The same attributes work on the view and its descendant parts. Functions must be attached through JavaScript, not embedded in JSON.

## Native scroll timelines

Simple transform/opacity array outlets attached to a native snap sheet use a `ScrollTimeline` when available. The primary content retains its structural positioning and composes its outlet transform through the progress path. Their visual progress follows the browser's scrolling timeline. Other effects update from sheet progress, and timed transitions compile outlet frames into WAAPI animations. Native timeline support is feature-detected; there is no browser-name assumption. See [ScrollTimeline](https://developer.mozilla.org/en-US/docs/Web/API/ScrollTimeline/ScrollTimeline).

Callbacks, theme-color updates, and CSS properties that require layout or paint still involve the main thread. Choosing `height`, `top`, `borderRadius`, or a shadow does not make those properties compositor-only. Prefer transform and opacity for sustained motion. See [architecture](architecture.md#gpu-acceleration-and-high-refresh-rates) for measurements and limits.

## Clip the page before transforming it

```js
sheet.outlet(page, {
  travelAnimation: {
    clipBoundary: "layout-viewport",
    clipBorderRadius: ["0px", "24px"],
    clipTransformOrigin: "50% 0",
    scale: [1, .94]
  }
});
```

Viewport clipping uses a temporary fixed wrapper and a layout placeholder. It captures geometry when activated and remeasures the authored layout on resize, then restores the original DOM placement when the effect returns to zero or is destroyed. Keep viewport-fixed UI outside the moving surface or use `Fixed`. `borderRadius` may require painting even when the transform can be composited.

## Standalone WAAPI helper

```js
import { animate } from "hotwire-sheets";
const animation = animate(element, { opacity: [0, 1] }, {
  duration: 500,
  easing: "cubic-bezier(0.25, 1, 0.25, 1)"
});
await animation?.finished;
```

The helper persists the final inline styles and removes the finished animation. Canceling preserves the pre-animation inline styles. Passing `null` returns `null`. If WAAPI is unavailable, final styles are applied immediately. The helper returns the native `Animation`, including its pause, play, cancel, and finished interfaces. Unlike Sheet transitions, this low-level helper leaves reduced-motion policy to its caller.

`effect.setOptions()` replaces the supplied animation definitions and restores styles for removed properties. `sheet.setOptions({ travelAnimation: ... })` updates the content effect.

Call `effect.destroy()` when an externally created outlet is no longer needed. Outlets created with `sheet.outlet()` are also destroyed with their sheet. Their original inline styles are restored.
