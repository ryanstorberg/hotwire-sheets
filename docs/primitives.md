# Stacks, focus and overlays

These primitives work with existing HTML. Their Rails helpers register the corresponding Stimulus controllers through `registerSheets(application)`. JSON options use Ruby snake_case or JavaScript camelCase. JavaScript callbacks and element-returning functions belong in application controllers.

## Named stacks

```erb
<%= hotwire_sheet_stack(id: "pages") do %>
  <%= hotwire_sheet(id: "details", for_component: "pages") do |sheet| %>
    <%= sheet.content do %>
      <%= sheet.title "Details" %>
      <%= sheet.close %>
    <% end %>
  <% end %>
<% end %>
```

In JavaScript, create `new SheetStack(element, { componentId: "pages" })`. A sheet's `forComponent` can name the stack or use `"closest"`. A component reference can also be the instance itself. Sibling and nested sheets can belong to the same group. Grouping limits stacking progress to associated sheets; modal ordering remains shared across the document. Unrelated overlays still need correct front-to-back interaction ordering.

`stack.sheets` returns the currently presented members. `stack.progress` sums their travel progress. `stack.outlet(element, { stackingAnimation: ... })` responds to sheets above the first presented member. See [animation APIs](animations.md).

## Focus targets

```erb
<%= hotwire_sheet_auto_focus(timing: "dismiss", for_component: "details",
      html: { as: :button, type: "button" }) do %>
  Return to details
<% end %>
```

`new AutoFocusTarget(element, { timing: "present", forComponent: "details" })` gives a focusable element priority during automatic focus. `timing` accepts `"present"`, `"dismiss"`, or an array containing both. Omitting `forComponent` associates the target with every sheet. Disabled, inert, disconnected, or hidden targets are excluded. The explicit `initialFocus` sheet option has priority during presentation.

`onPresentAutoFocus` and `onDismissAutoFocus` accept `{ focus: false }` or a callback that calls `event.changeDefault({ focus: false })`. Presentation hooks run after entry finishes; dismissal hooks run after the modal scope is released. Ordinary sheets retain their early focus acquisition so keyboard input has a valid scope during entry.

## Interactive islands

```erb
<%= hotwire_sheet_island(for_component: ["details", "pages"], html: { class: "navigation" }) do %>
  <%= link_to "Help", help_path %>
<% end %>
```

`new Island(element, options)` accepts `forComponent` (one sheet/stack ID or an array), `disabled`, and `contentGetter`. Without an association it applies to every sheet. `contentGetter` may be a CSS selector or a JavaScript function returning an element. Otherwise, the root or its `data-island-content` child is the interactive region.

Islands join the active modal's interaction and focus scope. Their pointer gestures cannot dismiss the sheet behind them. Default island content traps boundary wheel/touch scrolling; an external `contentGetter` owns its own scroll-trapping behavior. `island.setOptions({ disabled: true })` disables the exemption immediately. Legacy `data-sheet-island` remains supported; `data-sheet-island-for="details pages"` scopes it and `data-sheet-island-disabled="true"` disables it.

## External overlays

```js
import { ExternalOverlay } from "hotwire-sheets";
const dialog = new ExternalOverlay(host, {
  contentGetter: "#payment-dialog",
  selfManagedInertOutside: false
});
// When the external dialog closes:
dialog.destroy();
```

The Rails helper is `hotwire_sheet_external_overlay`. Options are `disabled` (default `false`), `contentGetter`, and `selfManagedInertOutside` (default `true`). If the external dialog manages its own modal isolation, sheet isolation and focus trapping are suspended to avoid competing managers. Otherwise its element joins the sheet's permitted interaction/focus scope. Escape does not dismiss the underlying sheet while the external overlay is registered.

Dialog/popover markup added at the body level while a sheet is open is detected automatically. Register an external overlay explicitly for other portal shapes, custom widgets, or a component that owns its own isolation. Destroy the registration, or set `disabled: true`, when it is no longer presented. This makes the lifetime explicit and avoids leaving the sheet blocked by a hidden third-party wrapper.

## Fixed viewport content

```erb
<%= hotwire_sheet_fixed(html: { class: "floating-controls" }) do %>
  <button>Help</button>
<% end %>
```

`new Fixed(element)` places the element in a body-level viewport layer while retaining its insertion point for cleanup. This keeps it independent of transformed ancestors and viewport-clipped outlets. Removing the original owner, including through a Turbo Frame or Stream update, returns the portal to that removed subtree so controller cleanup can finish. Use normal `top`, `right`, `bottom`, and `left` CSS; a special side declaration is unnecessary with this implementation. Styles that depend on the old ancestor selector or inherited values should be moved onto the fixed element.

The fixed element, or its `data-fixed-content` child, traps scrolling at its boundaries. Being fixed does not automatically make it an island: use `Island` as well when it should remain interactive above a modal sheet.

While body scrollbars are removed, `--x-collapsed-scrollbar-thickness` and `--y-collapsed-scrollbar-thickness` expose the horizontal and vertical scrollbar compensation. For example, a right-anchored control can use `right: calc(16px + var(--y-collapsed-scrollbar-thickness))`.

## Accessible hidden content and backgrounds

`hotwire_sheet_visually_hidden("Details")`, `.sheet-visually-hidden`, or `new VisuallyHidden(element)` hides content visually while keeping it available to assistive technology. `sheet.handle` is a real button with hidden label text; clicking cycles detents, and arrow/Home/End keys offer explicit size controls.

`sheet.bleeding_background` renders `data-sheet-bleeding-background`, a noninteractive surface extending toward the dismissal edge. Give it the intended color and corner styling. `data-sheet-special-wrapper` with an inner `data-sheet-special-content` supplies an overflow wrapper for layouts that need it; the JavaScript gesture backend does not require React's Safari-specific component composition.

## Utility functions

`createComponentId(prefix)` creates a serializable component ID. Explicit Rails IDs remain preferable when the server and browser need to refer to the same element.

`observeMediaQuery(query, callback, { signal })` immediately reports the current match and subscribes to changes. It returns a cleanup function, supports AbortSignal, and reports `false` without a browser window. This replaces React's `useClientMediaQuery` subscription model.

`getPageScrollData` and `observePageScrollData` report page-scroll ownership. See [Scroll](scroll.md).

## Theme-color dimming

Set a `theme-color` meta tag and pass `theme_color_dimming: "auto"` to a sheet to blend the status-bar color with its backdrop in WebKit. The blend uses the backdrop color, its alpha, and travel opacity. Multiple registered overlays compose in order.

```js
import { updateThemeColor, createThemeColorDimmingOverlay } from "hotwire-sheets";
const dimming = createThemeColorDimmingOverlay({
  element: document.querySelector("#screen-dimmer"),
  dimmingColor: "rgb(0, 0, 0)"
});
dimming.setDimmingOverlayOpacity(.3);
dimming.animateDimmingOverlayOpacity({ keyframes: [.3, .6], duration: 500 });
updateThemeColor("#f8fafc"); // Changes the base color while preserving active dimming.
// Later: dimming.destroy();
```

The optional element receives the same opacity as the theme-color blend. The animation method uses WAAPI for the element and a frame observer for the meta tag; the browser's status-bar appearance is outside the compositor animation API. Missing meta tags are tolerated. RGB and hexadecimal inputs are supported; use opaque base colors for predictable blending. The default dimming animation lasts 500 ms and uses `cubic-bezier(0.25, 1, 0.25, 1)`.

All primitives have `destroy()` methods. Controller-managed instances clean up before Turbo snapshots and on removal. Create manual instances in `connect()` and destroy them in `disconnect()` when integrating with your own Stimulus controllers.
