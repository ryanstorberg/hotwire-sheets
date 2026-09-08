# Troubleshooting

## A trigger navigates instead of opening

Confirm that Stimulus registered `sheet`, the root ID matches `data-sheet-open`, and both module imports resolve. The browser console should have no module or controller errors. A trigger with `href` intentionally works as normal navigation before enhancement.

## `Sheet.get(root)` returns undefined

The controller has not connected yet, the element is the view instead of the root, or the core was loaded twice. Import core and adapter from the same source/built package. The provided build keeps the adapter's core import external so both share one registry.

## Content opens with no movement or styling

Load the structural CSS and inspect conflicting `transform`, `position`, `height`, and `overflow` rules. Application CSS that replaces the transform must preserve `--sheet-offset`. Theme variables on the root will not inherit through the default portal; set them on the view/content.

For WAAPI, remove `!important` from animated transform/opacity declarations or select `animation: "raf"`. For CSS snap mode, retain the native scrolling geometry and avoid applying `--sheet-offset` as an extra transform. See [styling](styling.md#depth-and-custom-transforms).

## Stimulus actions stop working after opening

Portaled content is no longer a descendant of the controller root. Put the application controller inside `sheet.content`, retrieve the sheet using its stable root ID, or deliberately use `portal: false` in a hierarchy that does not clip or transform its children.

## The footer disappears at a smaller detent

Keep the footer outside `sheet.body`. The body is the part that shrinks and scrolls. Also ensure fixed chrome fits in the smallest detent; the library cannot make a 250px header fit in a 100px visible sheet.

## The page remains locked after navigation

Use the Stimulus adapter with Turbo. If using the standalone core, call `destroy()` before removing the root and close active sheets before caching a page. Check for a second overlay library or application scroll lock as well. Nested sheets share reference-counted locks; the last sheet with a lock releases it.

## A sheet changes size after images load

`"content"` detents follow measured content. Give images dimensions or an aspect ratio to reserve their space, or use fixed/fraction detents when a stable presentation size is required. Mutation and resize observers remeasure dynamic content. Viewport changes during motion preserve the remaining animation. In responsive examples, use viewport-relative detents such as `"calc(var(--sheet-viewport-height, 100dvh) - 6px)"`; avoid destroying and recreating a sheet in a window resize handler. Mobile browser controls and the keyboard can trigger those events during a gesture.

## Dragging scrollable content feels different on a phone

A gesture that starts by scrolling content keeps scrolling ownership when it reaches the boundary. This prevents momentum from unexpectedly moving the sheet. Start a new outward gesture at the boundary or use the handle to drag; wheel bursts reset after 120 ms without input. Touch takeover also requires a cancelable event from the browser. Desktop mobile emulation does not certify native momentum, software-keyboard animation, VoiceOver, or TalkBack. Use the physical-device checklist in [coverage](coverage.md).

## A custom depth effect exposes gaps or crosses the top

The core caps movement at the maximum open extent. Custom scaling must also preserve the attachment: for bottom sheets, use a bottom transform origin and compensate the scaled height. Limit any extra height for revealing rear layers to the space above the fully open sheet. See the [depth recipe](recipes.md#nested-sheets-and-depth) and the `.depth-sheet` rules in `examples/gallery.css` for a working example, including smaller visual viewports.

## A notification takes focus unexpectedly

Set `modal: false`, `autofocus: false`, and `restore_focus: false`. A nonmodal setting alone does not disable autofocus. Clean up dismissal timers on disconnect and pause them while the notification contains focus.

## Developing this repository

```sh
npm ci
bundle install
npm run build
npm run build:gallery
npm run build:docs
npm test
bundle exec rake test
npx playwright install chromium firefox webkit
npm run test:browser -- --workers=4
npm run demo
```

The preview serves `/` for the reference gallery, `/docs` for this guide, and `/regression` for engine fixtures. `npm pack` and `gem build hotwire_sheets.gemspec` create local packages; neither publishes them.
