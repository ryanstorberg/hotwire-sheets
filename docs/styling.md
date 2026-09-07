# Styling and composition

Import `hotwire-sheets/styles.css` or use the gem's `hotwire_sheets` stylesheet. It provides positioning, transforms, scrolling, and input behavior. Add your own colors, type, spacing, and controls afterward.

## Documentation and example theme

The landing page, documentation, and interactive examples share typography and color tokens in `docs/theme.css`. The gallery applies those tokens through `examples/site.css`: green actions and the same navigation and text styles as the docs. Example cards pair desktop and mobile screenshots with full-color watercolor artwork, softly shaded device frames, and coordinated mint, sky, or clay backgrounds. Their palette comes from `examples/preview-themes.js`; hover motion respects reduced-motion preferences. Presentation geometry and movement remain in `examples/gallery.css`. To refresh the device previews after editing the demos, run `npm run capture:previews` with the demo server running.

This site theme is an example of application styling; importing the library's structural stylesheet does not apply it to your Rails app. Reuse the token values or replace them with your application's own design system.

## Structural elements

| Marker | Purpose |
| --- | --- |
| `data-sheet-root` | Stable ownership node; lifecycle events originate here |
| `data-sheet-view` | Fixed viewport and stacking context; portaled by default |
| `data-sheet-content` | Visible panel and accessible dialog |
| `data-sheet-backdrop` | Outside-click surface and dimming layer |
| `data-sheet-body` | Scrollable region sized to the current detent |
| `data-sheet-motion` | Optional direct child of content animated by WAAPI instead of the dialog shell |
| `data-sheet-motion-fade` | Direct child whose opacity follows open progress, with WAAPI playback during transitions |
| `data-sheet-handle` | Drag surface with arrow-key, Home, and End support |
| `data-sheet-drag` | Allows a button or link to start a sheet swipe while retaining ordinary clicks |
| `data-sheet-open="id"` | Opens the root identified by that ID |
| `data-sheet-close` | Explicit close action within the associated view |
| `data-sheet-no-drag` | Region whose gestures belong to application controls |
| `data-sheet-island` | External content allowed through the modality boundary |

Keep headers and action footers outside the body so they remain visible as the body scrolls. The core measures this surrounding content as fixed chrome. Use a single direct scroll body when possible.

```erb
<%= sheet.content(class: "product-sheet") do %>
  <header class="product-toolbar">
    <%= sheet.close "Cancel" %>
    <%= sheet.title "Edit product" %>
    <button type="submit" form="product-form">Save</button>
  </header>
  <%= sheet.body do %>
    <%= render "products/form" %>
  <% end %>
<% end %>
```

## Theme variables

Set theme variables on the content or view. Variables defined only on the root stop inheriting into the view after it portals to `document.body`.

| Variable | Default | Purpose |
| --- | --- | --- |
| `--sheet-width` | `100%` | Width of top/bottom content |
| `--sheet-background` | `Canvas` | Content background |
| `--sheet-color` | `CanvasText` | Content text |
| `--sheet-backdrop-color` | `rgb(0 0 0 / 40%)` | Backdrop fill; set on the view/backdrop |
| `--sheet-z-index` | `1000` | View's base stacking level |
| `--sheet-defaults` | Unset | Set to `reset` to remove default surface/backdrop colors while retaining positioning and input behavior |

For left/right sheets, the detent controls the panel's width. `--sheet-width` is for top/bottom sheets.

Direct children default to the available detent width. Your own `width` rules take priority, so a positioned dismiss button can retain a fixed size.

## Motion variables

The view supplies these properties to its descendants. Read them in CSS or use `sheet:progress` for application effects.

| Variable | Meaning |
| --- | --- |
| `--sheet-progress` | Clamped 0–1 progress relative to maximum extent |
| `--sheet-visible` | Current visible pixels, capped at maximum extent; outward rubber banding can make it negative |
| `--sheet-offset` | Signed translation from the anchored position |
| `--sheet-extent` | Largest resolved detent |
| `--sheet-body-available` | Target detent's available body/chrome space |
| `--sheet-chrome` | Measured space outside the scroll body |
| `--sheet-stack-depth` | Sum of normalized progress of sheets above this sheet |
| `--sheet-stack-index` | Position in the active presentation stack |
| `--sheet-viewport-width`, `--sheet-viewport-height` | Visual viewport dimensions |
| `--sheet-viewport-top`, `--sheet-viewport-left` | Visual viewport offsets |
| `--sheet-viewport-keyboard` | Estimated occluded viewport height |

The last value is a geometry estimate, not a reliable signal that a keyboard is open. Pinch zoom and browser UI also affect viewport geometry.

## Close-button styles

```css
.corner-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  padding: 0;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: #e5e7eb;
  color: #6b7280;
}
.corner-close svg { width: 22px; height: 22px; }
.dismiss-handle {
  width: 50px;
  height: 6px;
  margin: 8px auto 0;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: #d1d5db;
}
```

Provide an accessible label when the control contains only an icon or has no visible text. See the [Rails helper examples](rails.md).

## Depth and custom transforms

`stack_effect: true` enables the structural bottom-sheet scale effect. It scales around the bottom edge so layered content does not float above the viewport. The gallery adds a taller background surface and progressive width reduction to reproduce the reference Depth presentation.

Give a page that recedes behind a sheet an explicit, opaque background. A transparent page will show the canvas behind it when transformed; setting only the body background does not give the page its own surface.

For WAAPI/frame motion, an overridden `transform` must preserve the engine's `--sheet-offset` and the `-50%` horizontal centering on vertical sheets. Avoid `!important` on transform/opacity, which takes precedence over WAAPI. The default backend interpolates authored transform matrices; choose `animation: "raf"` for nonlinear transforms or custom effects that need to recompute throughout motion. Keep background surfaces extended during scaling to avoid exposing gaps.

With `scrollSnap: true`, native view scrolling supplies the translation. Keep the structural `[data-sheet-scroll-snap]` positioning rules and do not add `--sheet-offset` a second time. The engine generates `data-sheet-snap-track` and `data-sheet-snap-point` elements as noninteractive, aria-hidden children of the view; do not style them as visible content. Colors, spacing, corners, and the bottom `stackEffect` remain customizable. Keep the feed height independent of the receding background surface so nesting cannot clamp its scroll position. If you enlarge a bottom surface from `extent` to `height`, place its native top at `calc(100% + extent - height)` so its bottom and scroll range stay fixed. Use `overflow: clip` on the rounded surface and retain `overscroll-behavior: auto` on content and body so boundary scrolling can reach the view. The `.depth-sheet` rules in `examples/gallery.css` implement this geometry.

Native motion applies `overflow: hidden` to `data-sheet-body` while the surface is dragging, opening, settling, or closing. This preserves the feed's scroll position and prevents it from taking over a reversed swipe before the sheet reaches its detent. Keep that state rule effective in custom CSS. The native backdrop allows touch panning because it belongs to the same scroll container as the content.

For independent moving and fading layers, put `data-sheet-motion` on one direct child and `data-sheet-motion-fade` on sibling controls or panels. Fade targets use opacity zero at the closed boundary and one at the full extent. WAAPI runs their fades alongside the moving surface and backdrop, with shared interruption and cleanup. Structural CSS supplies the same opacity during dragging, reduced motion, and the frame fallback. Keep the dialog shell opaque at the CSS opacity level (`opacity: 1`), with a transparent background, so fading chrome does not also fade the image. See the [Lightbox recipe](recipes.md#lightbox-with-independent-image-and-container-motion).

## Responsive layouts and safe areas

Use CSS media queries for visual changes. For resting sheets, change an edge or detent configuration using `setOptions()`. Recreate the instance when a responsive design changes its DOM structure. The gallery's `PresentationController` demonstrates this without mutating the engine's internal state.

`.sheet-safe-area` supplies bottom/left/right safe-area padding; apply top safe-area padding where your presentation needs it. `.sheet-visually-hidden` preserves content for assistive technology while removing it visually. Keep device testing in your release workflow, especially for software keyboards and browser chrome.

## CSS layers and Tailwind V4

Import the structural styles before application utility layers:

```css
@import "hotwire-sheets/unlayered-styles" layer(hotwire-sheets);
@import "tailwindcss";
```

If your bundler does not support layered imports, import `hotwire-sheets/layered-styles` instead. It wraps the same styles in `@layer hotwire-sheets`. Rails asset-pipeline apps can link `hotwire_sheets_layered.css` before application styles. Use either the layered or unlayered version once, not both.

The root variable `--sheet-100-lvh-dvh-pct` resolves to `max(100dvh, 100lvh)` in supporting browsers and `max(100%, 100vh)` otherwise. It is available for large viewport layouts, including the iOS in-app browser viewport-unit discrepancy described by the reference documentation. Sheet measurement still follows the visual viewport for keyboard safety.

Use [animation outlets](animations.md) for declarative travel and stacking effects on existing elements. The special `clipBoundary` option clips a long page to the viewport before transforming it. [Fixed](primitives.md#fixed-viewport-content) preserves separate viewport UI during those effects.
