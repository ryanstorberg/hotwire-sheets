# Architecture

Hotwire Sheets combines a standalone browser engine, a Stimulus adapter, and a Rails integration. Its programming model uses DOM elements, attributes, and events.

## Responsibilities

`src/core` owns presentation state, detent resolution, input, springs and stacking. `src/platform` owns viewport measurement, focus and page scrolling. `src/stimulus` owns the Turbo lifecycle. The Rails engine exposes styles, two prebuilt ES modules, an installation generator and capturing ERB helpers. The npm core has no runtime dependencies; only the optional adapter imports Stimulus.

The state machine is `closed → opening → open → dragging/settling → closing → closed`. Transitions can interrupt one another. Every public transition returns a promise: `true` means it completed; `false` means it was canceled, superseded or inapplicable. Disconnect forces synchronous cleanup. No Rails request occurs during a gesture.

## Motion and sizing

Detents resolve to visible lengths using the current visual viewport. Numeric values are fractions, strings may be `content` or positive CSS lengths, including viewport units and `calc()`. Public indices preserve declaration order even when content measurements change the size order. Keyboard navigation follows resolved size order.

The default `animation: "waapi"` backend samples an analytical spring into keyframes and animates the sheet's concrete `transform` and `opacity`, plus the backdrop's `opacity`, with the Web Animations API. The browser owns interpolation and playback; the primary animation continues even if the library's JavaScript frame observer is stopped. The observer synchronizes public progress events, CSS variables, and custom stacking effects. Interruption samples the displayed transform before handing control to the next transition. If the viewport or detent geometry changes during a transition, the remaining curve adapts to the new destination without ending the animation or replacing its promise. The displayed pose is committed before compositor effects are removed. [Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Element/animate).

Springs include underdamped, critically damped, and overdamped configurations. By default, input and spring motion are capped at the maximum open extent so a sheet cannot move inward past its attached edge. Intermediate detents can rebound within that extent. Reduced motion skips animation. `animation: "raf"` uses the elapsed-time JavaScript fallback, which is also selected when WAAPI is unavailable.

A single `data-sheet-motion` direct child can receive WAAPI transform/opacity playback instead of the dialog shell. Parallax Page uses this to animate its article beneath an anchored header. The shell still owns input, focus, modal semantics, and sizing. The animated child supplies the displayed transform used for interruption, so reversing a transition does not jump. See the [anchored-header recipe](recipes.md#parallax-page-with-an-anchored-header).

Sibling `data-sheet-motion-fade` elements animate opacity from zero to one on the same timeline. Lightbox uses them for stationary controls and its comments panel while its image stage translates upward; the black backdrop supplies the surrounding fade. These animations share cancellation, reduced-motion handling, fallback progress, and final cleanup with the moving surface.

With `scroll_snap: true` in Rails (`scrollSnap: true` in JavaScript), the view becomes a native scroll container with CSS Scroll Snap and generated markers at the resolved detents. The browser's scroll offset physically moves the sheet on all four edges. The existing `open`, `snapTo`, `close`, events, and focus handling remain available. Native transitions use the browser's smooth-scroll timing by default. Explicit phase animation settings use WAAPI for programmatic travel and commit the native offset at completion. The Sheet with Detent and Sheet with Depth gallery examples use native snapping. [CSS Scroll Snap specification](https://www.w3.org/TR/css-scroll-snap-1/).

## GPU acceleration and high refresh rates

The WAAPI backend animates transform and opacity, properties eligible for compositor/GPU acceleration, and supplies temporary `will-change` hints while moving. Native scroll motion also uses the browser's scrolling pipeline. Playback is not capped at 60 fps: the browser interpolates at the available display cadence. Keyframe sampling density describes the spring curve and is not a display-frame limit. [Browser animation performance guidance](https://web.dev/articles/animations-guide).

GPU allocation and achieved frame rate remain browser and hardware decisions. Custom effects that change height, shadows, or other paint/layout properties still cost main-thread work; progress callbacks should remain small. Physical-device 120 Hz performance is not certified. Run `npm run benchmark:motion` with the local demo server running to record idle and animated frame cadence and long tasks in `tmp/motion-benchmark.json`.

Run `npm run benchmark:gallery` for every gallery presentation and three nested depth layers at desktop and phone viewport sizes. It records frame cadence, long tasks, layout/style/script time, layer counts, and browser compositing reasons in `tmp/motion-benchmark-all.json`. Compositing reasons identify browser layers, not physical GPU execution. The simpler `benchmark:motion` command remains available for an isolated basic-sheet baseline. The [recorded gallery run](coverage.md#recorded-run-2026-09-07) includes per-case results and the remaining depth-layout work.

## Native scrolling

Gesture listeners cover the document so a swipe can start on the panel, its backdrop, or the page behind a nonmodal presentation. `swipeFromOutside` defaults to true; only the frontmost sheet accepts outside input. Protected controls, external islands, other sheets' content, and explicit gesture restrictions retain their own behavior. A recognized drag suppresses its resulting click, while ordinary taps keep their usual action. Pointer/touch and wheel changes are coalesced into one position write per animation frame.

For CSS snap sheets, content touch and wheel gestures use native scrolling, including chaining from a feed at its boundary to the outer dismissal surface. The transform gesture handler does not claim these events or retain a second scroll-ownership flag. At rest, proximity snapping prevents an asynchronous scrolling engine from selecting a distant mandatory target before the first input listener runs. Snapping is suspended while boundary input moves the native view. Before the dismissal threshold, direct input remains native. Crossing the midpoint from the smallest open detent to closed commits wheel-driven travel to an exit. A weak momentum tail settles a shorter pull without waiting for the entire stream to end. Direct touch settles on release. The browser smoothly scrolls to the destination before CSS snapping is restored. Restoring mandatory snapping at a partial offset would jump immediately to a marker before the smooth transition could begin.

Crossing the dismissal threshold starts a committed exit. Reaching the closed boundary releases the modal scope and restores the exposed layer; an input packet that already reaches zero closes immediately. Trackpad momentum can continue for seconds after the surface has left the viewport; it must not keep an invisible view blocking the parent. The normal cancelable `before-close` event still applies. Momentum into the far boundary of a fully expanded feed does not start sheet motion or disable that feed's scrolling.

The content and backdrop share this native scrolling surface. Crossing from the moving panel onto its backdrop must not switch to the transform gesture handler. During sheet motion the feed remains programmatically scrollable but does not accept user scrolling; it resumes when the surface rests. This keeps reversed trackpad input moving the sheet instead of stopping it partway and scrolling the article. For nonmodal input that starts on the page outside the native view, the manual handler retains ownership if the pointer later crosses into the view. Scroll notifications cannot overwrite a position while a manual drag or wheel gesture owns it.

For WAAPI/frame sheets, scrollable descendants retain native scrolling when there is room in the input direction. Once content owns a touch gesture or wheel burst, it keeps ownership through the boundary, preventing the remaining motion from unexpectedly pulling the sheet. Wheel ownership resets after 120 ms without wheel input, or earlier when travel commits or the weak momentum tail is recognized. A new gesture starting at the boundary can move the sheet; touch takeover requires the browser to keep the event cancelable. Once a wheel gesture moves the sheet, it retains that gesture over the exposed backdrop. Handles provide continuous dragging. Inputs and editable regions do not initiate dragging; buttons and links require an explicit `data-sheet-drag` marker to accept swipes while preserving clicks. `data-sheet-no-drag` marks protected regions. Pinch zoom is preserved.

Some browsers mark only the first wheel packet in a native scroll sequence as cancelable. A transition from noncancelable packets back to cancelable input also releases content-scroll ownership, so a fresh trackpad swipe at the boundary does not have to wait for the previous momentum timer. This is checked across successive nested dismissals. [Wheel event cancellation](https://developer.mozilla.org/en-US/docs/Web/API/Element/wheel_event).

After the sheet claims a cancelable wheel packet, later noncancelable packets continue moving that sheet, including over the exposed backdrop, until dismissal commits or a weak momentum tail starts settlement. Only the initial takeover requires cancellation. Unclaimed noncancelable input remains with native scrolling. Dropping continuation packets would reduce a trackpad swipe to its first few pixels and snap the sheet back instead of dismissing it.

The opt-in `scrollEndDismiss` mode is an exception at both boundaries of a long article. Continued input can transfer into a downward exit at the beginning or an upward exit at the end. Wheel input remains with either exit when the article moves beyond the pointer. The engine chooses the exit while fully open, then keeps its direction fixed through dragging, settling, interruption, and closing. Progress still runs from one to zero, so WAAPI, backdrop fading, and stack effects use the same lifecycle. A short or canceled pull returns to the open anchor; reopening resets the reading position and entrance direction. This mode requires a bottom sheet with one open detent and uses WAAPI/frame motion instead of native snap geometry.

In CSS snap mode, native scroll events synchronize position and detent state. `scrollend` reports settlement where available; a quiet-period fallback handles other browsers. Fresh boundary input can interrupt an ordinary programmatic transition. A committed swipe exit owns its remaining motion; residual packets from that burst cannot reopen it. If focus or content reflow interrupts browser smooth scrolling, an idle check finishes the requested destination so its promise cannot remain pending. Generated tracks and markers are removed on destroy, including Turbo cleanup. Native touch momentum remains browser-controlled. [Scroll completion events](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollend_event).

`oppositeEdgeDismiss` extends the same signed-offset motion to either end of a sheet's axis, including gestures that start on its backdrop. The gesture chooses its exit at the open anchor; its sign remains stable through settling and interrupted transitions. Both directions travel a full viewport length so centered or inset surfaces clear the screen. This option requires one open detent and uses WAAPI/frame motion; nested content keeps native scrolling until it reaches a boundary. The gallery enables it for Sheet with Keyboard and Detached Sheet.

## Modality and ownership

The topmost modal defines the active interaction and focus scopes. Sheets above it and explicit `data-sheet-island` elements remain available. Background inert values and modified body style properties are saved and restored. Scroll locks are reference counted. A mutation observer handles new background nodes. The manager is per document.

Initial focus is acquired without scrolling during entry. Visibility adjustments wait until the sheet rests, preserving its rounded surface and controls throughout the entrance animation. New focus, changed sheet geometry, and detent changes can reveal the focused control. Ordinary content remeasurement and a short or canceled pull settling at the same detent preserve the reader's scroll position. This prevents a scroll-dependent header from repeatedly scrolling back to the trigger that regained focus after a nested sheet closed.

The depth gallery keeps each feed at a fixed open height while its surrounding background surface recedes. Covering or uncovering a sheet therefore does not resize the feed or clamp its scroll position. Its native content position compensates the enlarged background height so both the bottom anchor and outer scroll range remain constant.

The depth gallery's root-page effect is implemented by `examples/depth-page.js`, outside the core stack manager. It temporarily presents the visible page in a viewport-sized, clipped container and uses a placeholder to preserve document geometry. Top-origin scaling exposes the root behind the first sheet even on a long, scrolled page. The effect follows progress and viewport changes, then restores native page geometry during close or teardown, before the core releases its scroll lock.

Views move to `document.body` on first opening, avoiding ancestor clipping and stacking contexts. The controller root remains in place. Triggers and close controls use delegated DOM attributes, so they continue to work through portals. Application Stimulus controllers that need content targets should be attached **inside the sheet content**. `portal: false` retains the original DOM hierarchy when desired.

## Turbo lifecycle

Before caching or replacing the body, the adapter closes presentations, releases locks, and restores views to their roots. Ordinary cached snapshots contain closed sheets. A root with an ID and `data-turbo-permanent` records its detent and resumes on reconnect/render. Frame and Stream updates inside the content preserve the root and active state; mutation and resize observers remeasure content. Replacing the sheet root itself intentionally destroys and reconnects it.

The library does not intercept Turbo history or publish its own route state. Route-backed presentation, browser Back-to-dismiss without navigation, and native shell presentation mapping require a separate integration.

## Sources

- [Stimulus lifecycle reference](https://stimulus.hotwired.dev/reference/lifecycle-callbacks)
- [Turbo lifecycle events](https://turbo.hotwired.dev/reference/events)
- [Visual Viewport API](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport)

## Reusable motion and scroll primitives

`Scroll` uses an internal native scrolling element so direct view chrome remains stationary. CSS snap, scroll padding, anchoring, scrollbar visibility, and named scroll timelines are configured on that element. Safe-area padding is isolated from application content padding. Page-scroll replacement records its prior ownership and restores it during teardown.

`Outlet` compiles timed effects into WAAPI frames alongside the surface transition. Simple array-based native-scroll transform/opacity effects use `ScrollTimeline` when supported. Complex function effects and browser fallbacks update from the frame-coalesced progress path. Color/height/radius effects are permitted, but their use does not imply compositor-only work.

Named stacks, islands, explicit external overlays, and focus targets share a document registry. Modality updates occur at presentation or registration transitions, not on each animation frame. The separate public APIs and their Rails equivalents are indexed in [API index](api-index.md).

## Committed wheel decisions

`wheel-intent.js` detects a sharp decline in wheel magnitude after the main push. On commitment, `Sheet.finishInput()` transfers control to the existing native-scroll or WAAPI transition. Native views temporarily disable user scrolling while retaining programmatic scrolling, so noncancelable momentum cannot fight the exit. The state machine restores the view's ordinary input behavior at rest or on teardown. A fresh accepted gesture also restores scrolling when it interrupts an uncommitted return animation.

A short-lived document capture guard consumes the remaining matching wheel burst. It never changes the exposed sheet's inertness or its scroll locks. It releases on a quiet gap, a changed axis/direction, renewed input magnitude, pointer/touch start, explicit opening, or destruction. An exposed feed that has room to scroll can continue scrolling without allowing the same burst to dismiss its sheet.

This decision layer is independent of spring/frame playback. It adds no per-frame layout loop and preserves native scrolling before commitment. The midpoint rule and momentum handling are this implementation's defined behavior, covered by `dismissal-commit.spec.js`.
