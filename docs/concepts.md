# Core concepts

Hotwire Sheets provides swipeable interfaces for Rails and Hotwire through ERB helpers, DOM attributes, and Stimulus. The [API index](api-index.md) lists component options and utilities; [recipes](recipes.md) show how to combine them.

| Concept | API |
| --- | --- |
| Sheet and content | `hotwire_sheet`, `sheet.content`, `portal`, and `container` |
| Accessible labels and handles | `sheet.title`, `sheet.description`, `sheet.handle` |
| Trigger actions | `hotwire_sheet_trigger(action: ...)`, `data-sheet-action`, and `step()` |
| Presented state | `defaultPresented`, `presented`, `setOptions`, open/close methods and callbacks |
| Active detent | Closed-inclusive `activeDetent` / `setActiveDetent` and change callback |
| Scrolling | `Scroll`, `hotwire_scroll`, native scroll methods and trigger controls |
| Stacks | Named `SheetStack` groups and stack outlets |
| Travel and stacking effects | `Outlet`, `sheet.outlet()`, JSON animation attributes |
| Focus targets | `AutoFocusTarget`, present/dismiss timing and behavior hooks |
| Interactive regions and overlays | Scoped `Island` and explicitly registered `ExternalOverlay` lifetimes |
| Viewport and accessible content | `Fixed` and `VisuallyHidden` primitives |
| Utilities and subscriptions | Native utilities and subscription functions with cleanup |

## Detent numbering

`detent` and `snapTo(0)` identify the first open position. `activeDetent` and `setActiveDetent(0)` include closed at zero. Do not mix the two index systems.

Supply every open position in `detents`. For example, `{ detents: ["200px", "content"] }` provides a 200-pixel intermediate position and a full-content position. Numeric values are viewport fractions. See [options](options.md) for sizing and [JavaScript API](javascript.md) for state control.

## Composition and subscriptions

Apply structural data attributes to existing HTML elements, or use captured Rails blocks. The library operates directly on those elements. `observeMediaQuery` and `observePageScrollData` provide subscriptions with cleanup functions. Component IDs are strings so the server and browser can share them.

## Motion and platform behavior

Native Scroll always uses native scrolling. Sheet detents can combine CSS Scroll Snap with configured WAAPI transitions; centered and two-track presentations use the transform backend. Explicit phase presets configure the spring for entry, exit, and detent changes.

`Fixed` escapes transformed ancestors through a body-level portal. Register custom portal overlays with `ExternalOverlay` so focus and modality are coordinated. Dialog and popover markup can be detected automatically.

See [coverage](coverage.md) for the tested contract and remaining physical-device checks, and [architecture](architecture.md) for animation ownership and browser behavior.

## Gallery and artwork

The **Page from Bottom** example closes only through its Close button. It disables sheet dragging, wheel-driven sheet motion, swipe dismissal, Escape dismissal, and outside-click dismissal while keeping the article's native scrolling enabled. These are presentation options in `examples/gallery.js`, not global defaults.

The gallery uses public-domain watercolor artworks from the Art Institute of Chicago, with a distinct main painting for each of the 16 named examples. [Artwork credits](/examples/assets/watercolors/README.md) and `examples/assets/watercolors/sources.json` record the original pages and CC0 designation. Preview cards pair desktop and mobile views with those paintings inside the device frames. Regenerate them with `npm run capture:previews` while the demo server is running.

Gallery media is excluded from the runtime npm package and Ruby gem. Article bodies and most social-feed text are demonstration copy. The packages contain the browser engine, adapter, helpers, structural CSS, and documentation.
