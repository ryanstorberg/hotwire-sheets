# Hotwire Sheets

Swipeable sheets for Rails: a dependency-free browser engine, a Stimulus adapter, and a small Ruby gem. No React or request to Rails is involved in an active gesture.

Motion uses WAAPI transform/opacity springs by default, with optional native CSS Scroll Snap detents (`scroll_snap: true`). Browser-owned playback supports the available display refresh rate; GPU acceleration and achieved FPS depend on the browser and device. See [motion architecture and benchmarking](docs/architecture.md).

**Status: 0.1.0, in active development.** See [coverage and remaining work](docs/coverage.md) before choosing it for production.

## Documentation

Browse the [live examples](https://ryanstorberg.com/hotwire-sheets/) and [developer docs](https://ryanstorberg.com/hotwire-sheets/docs/).

For local development, run `npm run demo`, then open [the gallery](http://127.0.0.1:4173/) or [the developer docs](http://127.0.0.1:4173/docs). The documentation includes 16 guides, searchable navigation, copyable examples, Markdown sources, an `llms.txt` index, bundled Markdown, and a machine-readable index of the component, option, and utility APIs.

[Getting started](docs/getting-started.md) · [Rails helpers](docs/rails.md) · [All options](docs/options.md) · [JavaScript API](docs/javascript.md) · [Styling](docs/styling.md) · [Turbo and Stimulus](docs/turbo.md) · [Recipes](docs/recipes.md) · [Core concepts](docs/concepts.md) · [Scroll](docs/scroll.md) · [Animation APIs](docs/animations.md) · [Auxiliary primitives](docs/primitives.md) · [API index](docs/api-index.md)

## Install in Rails

The packages have not been published. Use the local checkout:

```ruby
# Gemfile — replace the path with your checkout
gem "hotwire_sheets", path: "/path/to/hotwire-sheets"
```

```sh
bundle install
bin/rails generate hotwire_sheets:install
```

Requires Rails 7.1+ and an application with Stimulus installed. The repository's integration test runs Rails 8.1.3. Prebuilt ES modules and structural CSS ship with the gem; importmap apps do not need a JavaScript build step. The generator adds pins, registers the Sheet and auxiliary controllers, and links the stylesheet. If your application has a custom Stimulus setup, register it explicitly:

```js
import { registerSheets } from "hotwire-sheets/stimulus"
registerSheets(application) // Your existing Stimulus Application instance.
```

For importmap apps, the generated pins are:

```ruby
pin "hotwire-sheets", to: "hotwire_sheets.js"
pin "hotwire-sheets/stimulus", to: "hotwire_sheets_stimulus.js"
```

With a JavaScript bundler, also install the local npm package:

```sh
npm install /path/to/hotwire-sheets @hotwired/stimulus
```

Use `stylesheet_link_tag "hotwire_sheets"` in the layout, or import `hotwire-sheets/styles.css` through a CSS-capable bundler. Use one approach, not both. You can place the imported stylesheet into your own CSS layer.

## Rails example

```erb
<%= hotwire_sheet_trigger "Today's workout", sheet: "workout",
      href: workout_path(@workout) %>

<%= hotwire_sheet(id: "workout", detents: ["content", 0.55, 1],
      initial_detent: 1, swipe_to_dismiss: true, modal: true) do |sheet| %>
  <%= sheet.content(class: "workout-sheet") do %>
    <%= sheet.handle %>
    <%= sheet.title "Today's workout" %>
    <%= sheet.description "Your next session, ready when you are." %>
    <%= sheet.body do %>
      <%= turbo_frame_tag "workout_details",
            src: workout_path(@workout), loading: :lazy %>
    <% end %>
    <%= sheet.close "Done" %>
  <% end %>
<% end %>
```

The route must return a matching `turbo-frame` for frame requests. The trigger's `href` remains a normal navigation fallback without JavaScript. A sheet is server-rendered hidden until enhanced. `sheet.content` supplies the view and backdrop; pass `backdrop: false` to omit the backdrop. Calling `sheet.backdrop(class: "your-class")` before `sheet.content` configures that backdrop. Give every sheet a title, `label:`, or explicit `aria: { labelledby: ... }`; the helper rejects unnamed dialogs.

Legacy `detent` and `snapTo()` indices start at **zero** for the first open position. The `activeDetent` / `setActiveDetent()` API instead reserves zero for closed. Numeric detents are viewport fractions in `(0, 1]`; use `"320px"` for pixels and `"60%"` for percentages. `"content"` follows intrinsic content size, clamped to the visual viewport. Indices keep declaration order when content changes.

`sheet.body` is the scrollable area. Keep headers, handles and action footers outside it. Style the components yourself:

```css
.workout-sheet {
  --sheet-background: white;
  --sheet-color: #18231d;
  border-radius: 24px 24px 0 0;
  padding-inline: 24px;
}
.workout-sheet [data-sheet-handle] { height: 32px; }
.workout-sheet [data-sheet-handle]::after {
  content: "";
  display: block;
  width: 36px;
  height: 4px;
  margin: 14px auto;
  border-radius: 4px;
  background: #aaa;
}
```

## Common options

The [complete option reference](docs/options.md) includes controlled state, placement/tracks, phase settings, outlets, and behavior hooks. Pass these in snake_case to `hotwire_sheet`, or camelCase to `new Sheet(root, options)` / `data-sheet-options-value`.

| Option | Default | Behavior |
| --- | --- | --- |
| `edge` | `"bottom"` | `top`, `bottom`, `left`, `right` |
| `detents` | `["content"]` | Nonempty array of visible lengths |
| `initial_detent` | `0` | Starting index |
| `modal` | `true` | Dialog modality |
| `dismissible` | `true` | Allows Escape, outside and swipe dismissal; explicit close still works |
| `swipe_to_dismiss` | `true` | Enables closed as a gesture destination |
| `scroll_end_dismiss` | `false` | Long Sheet's upward exit at the article's end; bottom edge with one detent; uses WAAPI/frame motion |
| `opposite_edge_dismiss` | `false` | Also dismisses through the opposite edge on the same axis; one open detent; uses WAAPI/frame motion |
| `close_on_escape`, `close_on_outside` | `true` | Independent dismissal switches |
| `draggable`, `wheel` | `true` | Enables gesture / wheel movement |
| `swipe_from_outside` | `true` | Allows swipes and wheel gestures outside the frontmost sheet, including its backdrop |
| `handle_only` | `false` | Starts gestures only on handles |
| `trap_focus`, `lock_scroll`, `inert` | Follows `modal` | Granular modality controls |
| `autofocus`, `restore_focus` | `true` | Initial focus and focus return |
| `initial_focus` | none | Selector within the content; JS also accepts an element |
| `portal` | `true` | Moves the view to `document.body` |
| `stack_effect` | `false` | Built-in bottom-sheet depth/scale effect |
| `prevent_edge_swipe` | `false` | Attempts to cancel sheet touches near horizontal screen edges; device-dependent |
| `spring` | `{}` | `stiffness: 420`, `damping: 38`, `mass: 1` |
| `animation` | `"waapi"` | WAAPI transform/opacity spring animation; `"raf"` selects the frame fallback |
| `scrollSnap` | `false` | Native CSS Scroll Snap detents; Rails: `scroll_snap: true` |

Rails-only options: `open: true` presents on connect; `html:` applies attributes to the controller root; `label:` provides an accessible name. For a persistent nonmodal sheet:

```erb
<%= hotwire_sheet(id: "player", modal: false, open: true,
      detents: ["160px", 0.5], swipe_to_dismiss: false,
      html: { data: { turbo_permanent: true } }) do |sheet| %>
  <%= sheet.content do %>
    <%= sheet.handle %>
    <%= sheet.title "Now playing" %>
    <%= sheet.body do %>Your player controls<% end %>
    <%= sheet.close %>
  <% end %>
<% end %>
```

## Browser API

The core works without Rails, Turbo, or Stimulus. Provide ordinary HTML with a hidden `[data-sheet-view]`, a `[data-sheet-content]` dialog, a `[data-sheet-body]` scroll area, and optional handle/backdrop/close elements. See the [interaction lab markup](test/fixtures/index.html).

```js
import { Sheet } from "hotwire-sheets"

const sheet = new Sheet(document.getElementById("workout"), {
  detents: ["content", 0.55, 1], initialDetent: 1
})
await sheet.open()
await sheet.snapTo(2)
await sheet.close()
sheet.destroy()
```

Use `Sheet.get(rootElement)` for an existing instance created by Stimulus. `open`, `close`, and `snapTo` return `Promise<boolean>`. All support `{ immediate: true, reason: "your-reason" }`. `open` accepts `detent` and `trigger`; `snapTo` accepts `velocity` in pixels/ms. `close({ force: true })` bypasses cancellation. `refresh()` schedules a measurement. `destroy()` is synchronous and idempotent.

## Events and effects

Events bubble from the controller root with `event.detail.sheet` and `event.detail.detent`:

- `sheet:before-open` / `sheet:before-close`: cancelable.
- `sheet:open` / `sheet:close`: completed transitions, with `reason`.
- `sheet:detent-change`: completed snap, with `previousDetent` and `reason`.
- `sheet:drag-start` / `sheet:drag-end`: input lifecycle.
- `sheet:progress`: position and normalized progress on animation frames.

Prevent closing while a form is dirty:

```js
root.addEventListener("sheet:before-close", event => {
  if (formIsDirty()) event.preventDefault()
})
```

The view exposes `--sheet-progress`, `--sheet-visible`, `--sheet-offset`, `--sheet-stack-depth`, `--sheet-stack-index`, `--sheet-extent`, and `--sheet-viewport-{width,height,top,left,keyboard}`. Progress is clamped to `[0, 1]`; visible length is capped at the maximum extent but can go below zero during outward rubber banding. Use these for custom opacity, scale and parallax. Theme variables include `--sheet-width`, `--sheet-background`, `--sheet-color`, `--sheet-backdrop-color` and `--sheet-z-index`.

Swipes and wheel gestures can start on a sheet or elsewhere in the viewport. Outside input controls the frontmost sheet, including nonmodal presentations, without blocking ordinary page clicks. Set `swipe_from_outside: false` (`swipeFromOutside: false` in JavaScript) to restrict input to the panel. Persistent sheets still follow their configured detents and dismissal rules.

`data-sheet-no-drag` opts a region out of gestures. `data-sheet-drag` lets a button or link accept sheet swipes while preserving normal clicks, as used by Sidebar's menu items. `data-sheet-island` keeps a third-party overlay outside the portal available to focus and accessibility and excludes it from outside sheet gestures. Use islands only for UI that should remain interactive during a modal. `.sheet-safe-area` and `.sheet-visually-hidden` are utility classes.

## Turbo and controller placement

Frame and Stream updates **inside** sheet content keep it open. Removing the controller root cleans up its portal, event handlers, animation frames, observers, focus management and scroll locks. Before Turbo caches or renders a page, ordinary sheets close. A root marked `data-turbo-permanent` resumes at its saved detent.

The portal moves content out of the root's DOM subtree. Place application Stimulus controllers **inside `sheet.content`** when their targets/actions live there. Built-in open/close controls use DOM attributes and remain functional. Avoid connecting a second `Sheet` to the same root. Route-backed history and native-shell presentation mapping are not provided in this version.

## Development

```sh
npm ci
bundle install
npm run build
npm run build:gallery
npm run build:docs
npm test
npm run test:types
bundle exec rake test
npx playwright install chromium firefox webkit
npm run test:browser
npm run demo # http://127.0.0.1:4173
```

The gallery presents 16 examples with watercolor artwork, responsive layouts, and dedicated dismiss controls. It includes the contact list, product editor, music player, profile stacking/depth, Lightbox, and article presentations. The original engine and Turbo fixtures remain at `/regression`. See the [example guide](docs/examples.md). It exercises the actual core, Stimulus and Turbo modules and is a development fixture, not a Rails server. The Ruby integration test additionally boots a real Rails app and verifies helper rendering and Propshaft asset delivery. Browser tests include automated accessibility checks. Mobile WebKit emulation and synthetic touch tests do not certify real iOS/Android behavior.

The gem ships generated JavaScript in `app/assets/javascripts`; rebuild it after source changes. `npm pack` and `gem build hotwire_sheets.gemspec` create local distributable packages without publishing them.

Runtime code is MIT licensed. Public-domain gallery artwork is attributed in `examples/assets/watercolors/README.md` and excluded from runtime packages. [Architecture](docs/architecture.md) · [Coverage](docs/coverage.md)

## GitHub Pages

The [public site](https://ryanstorberg.com/hotwire-sheets/) deploys automatically after pushes to `main`. The Pages workflow builds a standalone browser bundle, checks all 16 examples on desktop Chromium and mobile WebKit, and publishes only `dist/`. Rails and a Node server are not needed on the host.

To build and preview the same static site locally:

```sh
npm ci
npm run build:pages
npm run preview:pages # http://127.0.0.1:4174/hotwire-sheets/
# In another terminal:
npm run test:pages
```

`PAGES_BASE_PATH` defaults to `/hotwire-sheets/`. Set it consistently for the build, preview, and tests when publishing under a different project path; use `/` for a custom domain. Each guide has its own directory index, so deep links and reloads work without a server rewrite. Markdown sources, the API inventory, and artwork credits are published alongside the site.

For a fork, enable **Settings → Pages → Source → GitHub Actions** and update `PAGES_BASE_PATH` in `.github/workflows/pages.yml` to the repository path.
