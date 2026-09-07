# Coverage and validation

Hotwire Sheets provides a browser engine and Rails/DOM APIs. The [API index](api-index.md) lists the available components, options, and utility functions. This page records automated validation, measured performance, and remaining platform checks.

## Implemented surface

| Area | Available behavior |
| --- | --- |
| Sheet | Four edges, centered placement, opposite tracks, controlled presentation, closed-inclusive active detents, legacy open indices, CSS-length detents, arbitrary portal destinations |
| Motion | WAAPI spring and timed easing, six built-in presets, separate entry/exit/step settings, delays, velocity, skip and contentMove controls, cancellation, reduced motion |
| Native sheet travel | CSS Scroll Snap detents and browser scrolling; configured WAAPI programmatic transitions can coexist with native gesture travel |
| Dismissal commitment | Wheel midpoint commitment, prompt momentum-tail settlement, touch release/cancellation, interruptible short returns, and protection from chained parent dismissal |
| Scroll | Native panel/page scrolling, optional page-scroll replacement, safe areas, focus visibility, scroll controls/events, axis/edge trapping, snapping, anchoring, padding, timelines and scrollbars |
| Effects | Travel/stacking outlets on existing elements, individual transform composition, callbacks, viewport clipping, native scroll timelines where supported |
| Stacks | Named groups, sibling/nested membership, scoped stacking progress and shared modal ordering |
| Accessibility | Dialog roles, alert-dialog safeguards, autofocus targets, behavior hooks, outside/Escape propagation, focus trapping/restoration, interactive islands and external overlays |
| Auxiliary APIs | Fixed viewport content, visually hidden content, bleeding backgrounds, IDs, media/page subscriptions, theme-color blending, standalone animate helper |
| Rails | Compound helpers, recursive option serialization, Stimulus controllers, Turbo snapshot cleanup, importmap/bundler modules, layered/unlayered styles |
| Documentation | 16 guides, options and component tables, individual/bundled Markdown, llms.txt and a machine-readable API inventory |
| Gallery | All 16 named examples, with existing nested input, player, parallax, lightbox, Card and dismissal regressions retained |

## Automated validation

The browser suite runs Chromium, Firefox, WebKit, and an iPhone-sized WebKit configuration. It covers the gallery, interaction ownership, focus, accessibility, geometry, cancellation, responsive layouts, Turbo behavior, documentation links, and built importmap modules. Desktop-only wheel/pointer cases are skipped in the mobile context; synthetic touch and ownership cases also run there.

New API scenarios check controlled state and CSS lengths, alert dialogs, phase timing/contentMove, native snap with WAAPI transitions, centered two-track motion, native Scroll methods and stationary chrome, directional trapping, page ownership, outlets independent of the frame observer, named stack isolation, focus/islands/external overlays, theme blending, declarative triggers, native timelines, and viewport clipping/Fixed cleanup.

Verified on 2026-09-07:

- Browser suite: **880 configured cases** across four configurations, including the 96 API cases and 32 dismissal-commitment cases. The complete run passed 859 cases with 19 platform-specific skips; two assertions needed updates for continuous wheel cadence and immediate offscreen closure.
- Final dismissal/direction reruns: **90 passed, 2 platform-specific skips**, covering both updated assertions and all commitment regressions. There are no unresolved failures from the complete run. Held touch, touch cancellation, interruption of a short return, close vetoes, all four edges, and immediate parent scrolling are included. Reruns are not added to the configured-case count.
- JavaScript unit tests: **14 passed**. TypeScript public API examples compiled with strict checking.
- Rails integration/helper tests: **18 passed, 51 assertions**.
- npm tarball and Ruby gem built successfully, including the generated runtime, stylesheet variants, API inventory, and documentation.
- The API guide was visually checked at 1280px and 390px widths, with no document-level horizontal overflow.

Run the complete checks locally:

```sh
npm ci
bundle install
npm run build
npm run build:docs
npm test
npm run test:types
bundle exec rake test
npm run test:browser -- --workers=4
```

The Ruby integration runs Rails 8.1.3 with Propshaft on Ruby 4.0.2 and exercises asset delivery and rendered helpers. The gem permits Rails 7.1–8.x; the entire older-Rails and Sprockets matrix has not been run. TypeScript checks compile real examples against the exported declarations.

## Performance evidence

WAAPI surface/outlet playback and native scrolling use browser animation machinery. Transform and opacity are eligible for compositor acceleration; native scroll timelines are used when supported. Layout/paint properties and application callbacks still involve the main thread. The depth demo currently retains a geometry compensation during stacking to preserve its bottom anchor and scroll range; it is not a compositor-only effect.

```sh
npm run demo
# In another terminal:
npm run benchmark:motion
npm run benchmark:gallery
```

The gallery benchmark covers all 16 presentations and a three-layer depth sequence at desktop and phone viewport sizes. It records frame intervals, long tasks, layout/style/script durations, layer counts, and browser compositing reasons in `tmp/motion-benchmark-all.json`. Headless Chromium measurements describe that test environment; a compositor layer is not proof of physical GPU execution, and a 60 Hz run cannot certify 120 Hz hardware.

### Recorded run: 2026-09-07

Headless Chromium 153.0.8010.12 tested 34 cases: every gallery presentation plus three nested depth layers, at each viewport size. The [raw report](performance-2026-09-07.json) records individual timings and compositing reasons.

| Viewport | Cases | Sampled frame intervals | Per-case 95th percentile | Intervals over 25 ms | Tasks over 50 ms |
| --- | ---: | ---: | --- | ---: | ---: |
| 1280 × 720 | 17 | 1,097 | 16.7–16.8 ms | 4 | 0 |
| 390 × 844 | 17 | 1,047 | 16.7–16.8 ms | 0 | 0 |

Median cadence was approximately 60 Hz. The four slower intervals occurred in the desktop three-layer depth sequence. Chromium reported accelerated transform/opacity animation and accelerated scrolling reasons across the gallery. The depth sequence also performed layout: 117 layout events totaling 8.15 ms on desktop and 129 totaling 6.75 ms at the phone viewport. Those totals are for the entire sequence, not each frame.

This is one automated entry/exit run, including layered transitions. It is not a physical trackpad benchmark, a thermal/battery test, or a guarantee under application load. No 120 Hz display was measured.

## Differences and platform limits

- Legacy defaults remain stable: open detent numbering, the default spring, opt-in native sheet snapping, and opt-in inward overshoot. Use the closed-inclusive API and explicit phase presets when applications need those conventions.
- Composition uses DOM attributes, Rails helpers, and cleanup-aware subscriptions.
- Centered, two-track, and custom split-surface presentations use the transform gesture backend; their content still scrolls natively. A native touch stream that becomes noncancelable remains subject to browser chaining rules.
- Fixed elements use a body-level portal. Ancestor-dependent CSS/inheritance may need to move onto the fixed element. Explicit external-overlay registration is recommended for custom portal shapes.
- Viewport, keyboard, edge-navigation, overscroll, and theme/status-bar behavior vary by browser. Physical iOS/Android, VoiceOver/TalkBack, and high-refresh hardware validation remain necessary for a stable-release claim.
- The gallery demonstrates layouts and interactions; automated screenshots do not certify rendering on every device. Watercolor artwork credits are documented in [Core concepts](concepts.md#gallery-and-artwork).
- No sheet-specific router, Back-to-dismiss history layer, Turbo Native adapter, or package publication is claimed; those are separate application integrations.

## Physical-device acceptance

Verify repeated three-layer dismissal with a real trackpad, continued momentum at content boundaries, direction reversal, and scrolling the re-exposed parent. The previously reported freezing/jumping reproduction was resolved and confirmed by the user; the automated regressions retain that behavior.

On physical iPhone/iPad and Android, check software-keyboard opening/closing, browser chrome changes, rotation, pinch zoom, editable controls, native edge navigation, and screen-reader focus. Measure 60 Hz and 120 Hz transitions under representative application load, including long feeds and repeated open/close cycles. Browser automation and synthetic input complement these checks rather than replacing them.
