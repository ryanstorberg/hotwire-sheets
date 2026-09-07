<!-- Source: /docs/getting-started.md -->

# Getting started

Hotwire Sheets provides swipeable sheets for server-rendered Rails applications. The browser engine handles gestures and animations locally. A Stimulus controller connects it to Turbo, and ERB helpers generate accessible markup.

Version **0.1.0**. The packages are currently local builds. The gem supports Rails 7.1–8.x and Ruby 3.1+; Rails 8.1.3 with Propshaft is the integration tested combination. Review [coverage](coverage.md) for the device and compatibility limits.

## Install with importmap

Add the checkout to your application's Gemfile:

```ruby
gem "hotwire_sheets", path: "/absolute/path/to/hotwire-sheets"
```

```sh
bundle install
bin/rails generate hotwire_sheets:install
```

Install Stimulus in your application first if it is not already present. The generator adds the two importmap pins, registers the controller in `app/javascript/controllers/index.js`, and adds the stylesheet to an ERB application layout. The gem includes prebuilt ES modules, so this setup does not need Node at runtime.

For a custom setup, add these yourself:

```ruby
# config/importmap.rb
pin "hotwire-sheets", to: "hotwire_sheets.js"
pin "hotwire-sheets/stimulus", to: "hotwire_sheets_stimulus.js"
```

```js
// After creating your existing Stimulus application:
import { registerSheets } from "hotwire-sheets/stimulus"
registerSheets(application)
```

```erb
<%# Inside the layout's head %>
<%= stylesheet_link_tag "hotwire_sheets", "data-turbo-track": "reload" %>
```

## Install with a bundler

Keep the gem for the helpers and install the local JavaScript package too:

```sh
npm install /absolute/path/to/hotwire-sheets @hotwired/stimulus
```

Register the controller as above. Load the CSS using the Rails stylesheet tag, or `import "hotwire-sheets/styles.css"` when your bundler processes CSS. Load it once. Import the core and adapter from the same package installation so `Sheet.get()` uses the same instance registry.

## Your first sheet

```erb
<%= hotwire_sheet_trigger "Open details", sheet: "details" %>

<%= hotwire_sheet(id: "details", detents: ["content"]) do |sheet| %>
  <%= sheet.content(class: "details-sheet") do %>
    <%= sheet.handle %>
    <%= sheet.title "Your reservation" %>
    <%= sheet.description "Everything you need for your visit." %>
    <%= sheet.body do %>
      <p>Saturday at 10:00 am · Two guests</p>
    <% end %>
    <%= sheet.close "Got it", class: "details-close" %>
  <% end %>
<% end %>
```

```css
.details-sheet {
  --sheet-width: 700px;
  --sheet-background: white;
  --sheet-color: #1f2937;
  border-radius: 24px 24px 0 0;
  padding: 24px;
  gap: 20px;
}
.details-sheet [data-sheet-handle] {
  width: 50px;
  height: 6px;
  margin-inline: auto;
  border-radius: 999px;
  background: #d1d5db;
}
.details-close {
  border: 0;
  border-radius: 999px;
  padding: 16px 40px;
  background: #1f2937;
  color: white;
}
```

The library supplies structural styles. The visual designs in the [gallery](/) are examples built on that structure. Their source is in `examples/gallery.html`, `examples/gallery.css`, and `examples/gallery.js`. The original photo assets belong to the reference gallery and are separate from the runtime package.

## Next steps

- [Rails helpers](rails.md): markup, attributes, labels, and reusable partials.
- [Options](options.md): every supported configuration setting and default.
- [JavaScript API](javascript.md): programmatic control and lifecycle events.
- [Styling](styling.md): handles, close buttons, fixed headers, and depth effects.
- [Turbo and Stimulus](turbo.md): forms, Frames, Streams, and navigation.
- [Recipes](recipes.md): common presentations with copyable ERB.
- [Core concepts](concepts.md): composition, detent numbering, and subscriptions.


---

<!-- Source: /docs/examples.md -->

# Example gallery

The gallery presents **16 examples** in one responsive grid. Each card shows desktop and mobile previews with watercolor artwork. Layouts, typography, panel corners, and dismiss controls use the Rails-compatible engine.

Run `npm run demo` and open the [local gallery](http://127.0.0.1:4173/). The Docs link opens this guide. The static demo uses the actual core, Stimulus, and Turbo modules; the Ruby integration tests separately verify a real Rails application.

Swipe-enabled presentations accept gestures from their surface or elsewhere in the viewport, including the backdrop. Page from Bottom closes only through its Close button. Outside swipes control the frontmost sheet and follow its edge and detents. Persistent Sheet with Detent expands or collapses without dismissing. Scrolling content and form controls keep their own interactions.

Sheet with Keyboard and Detached Sheet accept both upward dismissal through the top of the screen and downward dismissal through the bottom, on desktop and mobile layouts.

Sheet with Depth includes the root gallery page as its first receding layer. Its rounded top remains visible behind the first sheet at any gallery scroll position; nested sheets stay anchored at the bottom, and dismissing restores the page's original scroll position. Each depth layer uses native CSS Scroll Snap; covered feeds keep their dimensions and reading position, and scrolling resumes on the uncovered layer.

## Temporary central content

| Example | Presentation and controls |
| --- | --- |
| Bottom Sheet | White bottom panel, watercolor image, handle-shaped Dismiss button, and Got it action |
| Top Sheet | Top-anchored panel, watercolor image, corner cross, and Book it Now action |
| Detached Sheet | Rounded floating panel, watercolor image, Dismiss handle, and Got it action; centered on desktop and inset from the bottom on phones |
| Card | Centered image card with a corner cross and Reserve Spot action; enters and leaves through the top while scaling between 80% and 100%; only the backdrop fades |

## Temporary side content

| Example | Presentation and controls |
| --- | --- |
| Sidebar | Left navigation panel with the Acme organization header and grouped menu items; swipe left from the panel, a menu item, or its backdrop to dismiss, with native vertical scrolling and ordinary clicks preserved |
| Toast | Luca's message; enters and dismisses through the right edge on desktop (1000px and wider), or the top on narrower screens; five-second dismissal with hover/focus pause, preserving the current focus |
| Sheet with Stacking | Profile panel on the right of desktop screens or at the bottom on phones; cross on desktop, downward chevron on phones; open the related example at the end of the feed to stack another; the rear panel scales down and shifts back as the next panel enters |
| Persistent Sheet with Detent | Music player with a compact bar and expanded view; Expand, Collapse, Play/Pause, and Dismiss controls |

## Temporary long content

| Example | Presentation and controls |
| --- | --- |
| Sheet with Detent | Native CSS Scroll Snap contact list with a search field and Cycle handle; two open heights, then dismissal |
| Sheet with Depth | Full-width profile with a downward chevron; open related profiles to create three layers, keeping their bottom edges attached throughout the transition |
| Sheet with Keyboard | Product editor with horizontal watercolor thumbnails, labeled fields, Cancel, and Save; a two-column desktop form becomes one column on phones |
| Lightbox | Full-screen black image surface with a white cross; comments beside the image on desktop or in a nested sheet opened with the Comments button on phones; the container fades while the image slides up; swipe the image to dismiss; clicking or tapping the image does not enlarge it |

## Persistent long content

| Example | Presentation and controls |
| --- | --- |
| Parallax Page | Horizontal article presentation with a back chevron; the underlying page and scrolled cover move at different rates |
| Long Sheet | Rounded, inset article with a large cover and a corner cross that scrolls with the article; continued scrolling past the end dismisses upward, and reopening enters from below at the beginning |
| Page | Full-screen horizontal article with a persistent corner cross |
| Page from Bottom | Full-screen vertical article dismissed only by its header Close button; native article scrolling remains enabled |

## Use a presentation in Rails

Start with [recipes](recipes.md), then use the [Rails helpers](rails.md) and [styling guide](styling.md) to compose your application's content. The example controller supplies application behaviors such as contact filtering, toast timing, and player controls through the documented browser API. They are not extra engine options.

The player demonstrates playback UI without an audio stream. Product Save retains the edited values in the demo; wire a real application form to a Rails action as described in [Turbo and Stimulus](turbo.md). Sidebar destinations are demonstration controls.

## Edit and rebuild

| Source | Purpose |
| --- | --- |
| `examples/catalog.js` | Official example names and content data |
| `scripts/build-gallery.mjs` | HTML generator |
| `examples/gallery.html` | Generated gallery markup |
| `examples/gallery.css` | Presentation styles and responsive breakpoints |
| `examples/gallery.js` | Stimulus application behaviors |
| `examples/assets/sources.json` | Original media URLs |

```sh
npm run build:gallery
npm run build:docs
npm run demo
```

The independent engine regression fixtures remain at `/regression`. Open `/?assets=built` to exercise the gallery with the gem's prebuilt modules. The browser suite checks both the regression fixtures and the reference gallery.

## Reference scope

The gallery uses public-domain watercolor artwork, which is excluded from the runtime packages. [Artwork credits](/examples/assets/watercolors/README.md) identify the original museum records. Long article bodies and most feed/comment text use original demo copy. Automated checks cover geometry and interactions; see [coverage](coverage.md) for their scope and remaining device validation.


---

<!-- Source: /docs/recipes.md -->

# Presentation recipes

The same small set of primitives builds the different [gallery examples](/). These snippets use the library's actual helper API. Supply your application's content and CSS; reference gallery artwork is not required.

## Bottom sheet with two dismiss controls

```erb
<%= hotwire_sheet_trigger "Bottom Sheet", sheet: "confirmation" %>
<%= hotwire_sheet(id: "confirmation") do |sheet| %>
  <%= sheet.content(class: "confirmation") do %>
    <%= sheet.close "", class: "dismiss-handle",
          aria: { label: "Dismiss" }, data: { sheet_handle: "" } %>
    <%= sheet.title "Activity Added to Your Calendar" %>
    <%= sheet.body do %><p>Your activity is scheduled.</p><% end %>
    <%= sheet.close "Got it", class: "primary-action" %>
  <% end %>
<% end %>
```

For Top Sheet use `edge: :top` and round the bottom corners. For Detached Sheet, inset the panel with CSS and round all four corners. For Card, use `edge: :top`, center it with CSS, and scale from 80% to 100% using `--sheet-progress`. Keep the card opaque; only its backdrop fades. Each presentation accepts swipes from its backdrop by default.

Detached Sheet and Sheet with Keyboard also set `opposite_edge_dismiss: true` (JavaScript: `oppositeEdgeDismiss: true`) to support exits through the top and bottom. Use one open detent. Centered surfaces include the signed offset in their transform, for example `translate3d(-50%, calc(50% + var(--sheet-offset)), 0)` with `bottom: 50%`; optional scale follows that translation. This keeps the surface moving with an upward swipe instead of only fading it out.

## Card from the top

The Card example uses a top track, an opaque surface scaled from `0.8` to `1`, a backdrop that reaches 40% black, and an entrance spring with stiffness 260, damping 20, and mass 1. The gallery configures `edge: :top` with `spring: { stiffness: 260, damping: 20, mass: 1 }`. Its single open detent is `"content"`.

```css
[data-sheet-view]:has(> .my-card) { --sheet-backdrop-color: rgb(0 0 0 / 40%); }
[data-sheet-view] > .my-card[data-sheet-content] {
  --sheet-width: min(580px, calc(100% - 32px));
  --card-travel: calc((var(--sheet-viewport-height, 100dvh) + var(--sheet-extent)) / 2);
  top: 50%;
  bottom: auto;
  opacity: 1;
  transform: translate3d(-50%, calc(-50% - (1 - var(--sheet-progress)) * var(--card-travel)), 0)
    scale(calc(.8 + .2 * var(--sheet-progress)));
}
```

The travel distance includes half the viewport and half the card so it leaves the screen completely, even on tall displays. Dismiss buttons, Escape, backdrop clicks, and upward swipes all leave through the top. This Card does not use `opposite_edge_dismiss`.

## Sidebar

```erb
<%= hotwire_sheet(id: "navigation", edge: :left,
      detents: ["325px"], label: "Navigation") do |sheet| %>
  <%= sheet.content(class: "navigation-panel") do %>
    <header>Acme Inc.</header>
    <%= sheet.body do %>
      <nav><%= link_to "Overview", dashboard_path, data: { sheet_drag: true } %></nav>
    <% end %>
    <%= sheet.close "Close navigation" %>
  <% end %>
<% end %>
```

Pixel detents clamp to the viewport. Use a percentage detent if a small-screen sidebar should leave part of the underlying page exposed.

Sidebar accepts leftward swipes from the panel or elsewhere on screen by default. Use `data: { sheet_drag: true }` on navigation links or buttons to accept a dismissing swipe without losing normal clicks. Reserve horizontal touch movement for the sidebar while leaving vertical scrolling and pinch zoom native:

```css
.navigation-panel { touch-action: pan-y pinch-zoom; }
```

## Searchable sheet with detents

```erb
<%= hotwire_sheet(id: "contacts", detents: [0.6, 0.95]) do |sheet| %>
  <%= sheet.content(data: { controller: "contact-search" }) do %>
    <%= sheet.handle %>
    <%= sheet.title "Contacts", class: "sheet-visually-hidden" %>
    <input type="search" aria-label="Search for a contact"
           data-action="input->contact-search#filter">
    <%= sheet.body do %><%= render @contacts %><% end %>
    <%= sheet.close %>
  <% end %>
<% end %>
```

For a Cycle button, retrieve the instance and call `snapTo(nextIndex)`; call `close()` after the final detent if that matches your intended cycle. The built-in handle supplies arrow/Home/End support.

## Nested sheets and depth

```erb
<%= hotwire_sheet(id: "profile", detents: [0.9], stack_effect: true, scroll_snap: true) do |sheet| %>
  <%= sheet.content do %>
    <%= sheet.title "Profile" %>
    <%= sheet.body do %>
      <%= hotwire_sheet_trigger "More details", sheet: "profile-details" %>
    <% end %>
    <%= sheet.close %>
  <% end %>
<% end %>

<%= hotwire_sheet(id: "profile-details", detents: [0.8], scroll_snap: true) do |sheet| %>
  <%= sheet.content do %>
    <%= sheet.title "Details" %>
    <%= sheet.body do %><p>More about this profile.</p><% end %>
    <%= sheet.close "Back" %>
  <% end %>
<% end %>
```

Roots can be siblings. Their views coordinate in a shared document stack. The frontmost modal owns focus, while background sheets retain their content and scroll position. Set `stack_effect: true` on any bottom sheet that should respond to layers above it. The Sheet with Stacking gallery presentation uses `--sheet-stack-depth` in its own CSS to scale the rear panel to 93.3% and shift it back as a child opens. Its transform origin follows the presentation edge: left-center on desktop and top-center on phones. This presentation effect is separate from the bottom-anchored `stack_effect` used by Sheet with Depth. Modal sheets retain their own gesture scope. A nonmodal nested sheet with `swipe_trap: false` and `swipe_overshoot: true` can pass boundary input to an eligible ancestor sheet; native touch chaining is still subject to browser cancellation.

The Sheet with Depth demo enables `scroll_snap: true` on every nested layer. Its feed and outer sheet use native scrolling, with no separate wheel ownership to restore after dismissing a child. Keep the feed height fixed while receding its background, use `overflow: clip` for surface clipping, and preserve `overscroll-behavior: auto` along the chain to the native view. See [native depth styling](styling.md#depth-and-custom-transforms).

Sheet with Depth also treats the visible root page as the first layer. The gallery's `DepthPage` helper clips the page to the current viewport, preserves its reading position in that container, and retains the original document height with a temporary placeholder. It scales the root to 91% around its top edge and offsets it by 1.3% of the viewport height; the front sheet starts at 2.6%, leaving a visible strip behind it. Avoid scaling a long document around its bottom: that moves its top edge behind the front sheet. On dismissal, disconnect, or Turbo navigation, remove the temporary layer before releasing the scroll lock so the original page position is restored. This root-page presentation belongs to application code; `stack_effect` continues to control the sheet surfaces themselves.

## Notification and persistent player

For Toast, use `modal: false, autofocus: false, restore_focus: false, close_on_outside: false`. At viewport widths of 1000px or more, the gallery uses `edge: :right, detents: ["372px"]`, an automatic content height, and a horizontal transform; narrower screens use `edge: :top, detents: ["content"]` and a vertical transform. Keep the CSS media query and controller breakpoint aligned, and recreate the sheet with the new edge when crossing it. Place a `role="status"` region in the content. An application controller can call `close()` after a timeout and pause the timeout during hover/focus. Cancel timers on disconnect.

For Persistent Sheet with Detent, use `detents: ["76px", 1], modal: false, autofocus: false, close_on_outside: false, swipe_to_dismiss: false`. Expansion is `snapTo(1)` and collapse is `snapTo(0)`. Keep collapsed and expanded controls out of each other's tab order. The gallery uses a 76px collapsed bar and an expanded grid with album, track details/slider, and transport rows in `3fr 1fr .8fr` proportions. It keeps 32px side padding and gaps on every screen size, with a radial blue gradient, a white 24px slider thumb, and an album cover sized to 80% of its row up to 300px. Allow grid children to shrink with `min-height: 0` so shorter screens retain these proportions. The transport controls demonstrate UI state; the gallery does not stream music.

## Full pages and Lightbox

Use `detents: [1]` and `--sheet-width: 100%`. Page uses `edge: :right`; Page from Bottom uses `edge: :bottom` with a header Close button outside the scroll body. Long Sheet wraps its article in an inset, rounded surface within a full-height scroll body.

Enable Long Sheet's upward exit at the end of the article with `scroll_end_dismiss: true`:

```erb
<%= hotwire_sheet(id: "article", detents: [1], scroll_end_dismiss: true) do |sheet| %>
  <%= sheet.content(class: "long-sheet") do %>
    <%= sheet.body(class: "article-scroll") do %>
      <article class="reading-article">
        <%= sheet.close "Close article" %>
        <%= sheet.title @article.title %>
        <%= render @article %>
      </article>
    <% end %>
  <% end %>
<% end %>
```

In JavaScript, use `new Sheet(root, { detents: [1], scrollEndDismiss: true })`. Supply your own article styles; the gallery's classes are example CSS. See [dismissal options](options.md#gestures-and-dismissal) for direction selection and gesture guards.

## Lightbox with independent image and container motion

In the Lightbox example, the black backdrop and desktop comments panel fade in place while the opaque image moves upward. The gallery keeps the dialog shell stationary and transparent, uses its backdrop for the black fade, and marks the image stage as the moving surface. Dismiss controls and the sidebar fade independently. The same layers reverse on dismissal.

```erb
<%= hotwire_sheet(id: "photo", detents: [1], label: "Photo viewer") do |sheet| %>
  <%= sheet.content(class: "photo-viewer") do %>
    <div class="photo-stage" data-sheet-motion>
      <%= image_tag @photo, alt: @photo_description, draggable: false %>
    </div>
    <%= sheet.close "Close photo", class: "photo-close",
          data: { sheet_motion_fade: "" } %>
    <aside class="photo-comments" data-sheet-motion-fade>
      <%= sheet.body do %><%= render @comments %><% end %>
    </aside>
  <% end %>
<% end %>
```

```css
[data-sheet-view]:has(> .photo-viewer) { --sheet-backdrop-color: #000; }
[data-sheet-view] > .photo-viewer[data-sheet-content] {
  transform: translate3d(-50%, 0, 0);
  background: transparent;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  grid-template-rows: 100%;
  overflow: hidden;
}
.photo-stage {
  min-height: 0;
  display: grid;
  place-items: center;
  padding: 5vh 5%;
  overflow: auto;
  transform: translate3d(0, var(--sheet-offset), 0);
  touch-action: pan-x pinch-zoom;
}
.photo-stage img { width: 100%; max-height: 90dvh; object-fit: contain; }
.photo-comments { min-height: 0; display: flex; flex-direction: column; background: #171717; color: white; }
.photo-comments > [data-sheet-body] { flex: 1; max-height: none; }
.photo-close { position: absolute; top: 10px; left: 10px; z-index: 1; background: transparent; color: white; }
[data-sheet-view]:has(> .photo-viewer) > [data-sheet-backdrop] { right: 360px; }
@media (max-width: 999px) {
  [data-sheet-view] > .photo-viewer[data-sheet-content] { grid-template-columns: 100%; }
  .photo-comments { display: none; }
  [data-sheet-view]:has(> .photo-viewer) > [data-sheet-backdrop] { right: 0; }
}
```

Use the default WAAPI/frame backend for this split composition. The image surface, backdrop, and `data-sheet-motion-fade` siblings animate on the browser's animation timeline; CSS also follows progress during dragging and the fallback. Do not put opacity on the whole dialog, which would fade the image as well.

The photo is a normal image: clicking or tapping it does not enlarge it. Swipes over the image dismiss the Lightbox, and `draggable: false` prevents native image dragging from interrupting the gesture. Below 1000px, the gallery replaces the desktop sidebar with a Comments button that opens a nested sheet. Keep an explicit labeled close control available on every screen size.

## Parallax Page with an anchored header

The Parallax Page example keeps its navigation header at the top of the viewport while article pages translate beneath it. Titles fade between layers, and their back arrows occupy the same slot. The gallery follows that composition: a stationary dialog shell contains the header and a separately animated article. The header remains inside the dialog's focus and dismissal scope.

```erb
<%= hotwire_sheet(id: "story", edge: :right, detents: [1]) do |sheet| %>
  <%= sheet.content(class: "parallax-page") do %>
    <header class="parallax-header">
      <%= sheet.close "Back" %>
      <%= sheet.title @article.title %>
    </header>
    <%= sheet.body(class: "parallax-article", data: { sheet_motion: "" }) do %>
      <%= render @article %>
    <% end %>
  <% end %>
<% end %>
```

```css
[data-sheet-view] > .parallax-page[data-sheet-content] {
  transform: none;
  background: transparent;
  pointer-events: none;
}
.parallax-header {
  height: 48px;
  flex: none;
  background: white;
  opacity: clamp(0, var(--sheet-progress), 1);
  pointer-events: auto;
}
.parallax-article {
  flex: 1;
  background: white;
  pointer-events: auto;
  transform: translate3d(calc(var(--sheet-offset) + var(--page-parallax, 0px)), 0, 0);
}
[data-sheet-view]:has(> .parallax-page) > [data-sheet-backdrop] { top: 48px; }
```

Use a single `data-sheet-motion` direct child. The WAAPI backend animates its authored transform and opacity, including sampling its displayed position when interrupted. With `animation: "raf"` or no WAAPI support, the same CSS responds to the engine's position variables. This composition uses the default animation backend, not `scroll_snap: true`, which scrolls the entire view.

In a child page's `sheet:progress` listener, set the parent's `--page-parallax` to `-viewportWidth * 0.25 * progress` pixels. Apply the parallax translation only to the underlying article or gallery content; keep its header stationary. Align the headers, place the back controls in the same slot, and fade the incoming opaque white header over the outgoing header. Start the backdrop below the header so the fade does not darken the shared bar. Reset application transforms on `sheet:close`, Turbo navigation, and disconnect. The gallery implements these rules in `examples/gallery.css` and `examples/gallery.js`.

## Source guide

| File | Purpose |
| --- | --- |
| `examples/catalog.js` | Names, contact data, article headers |
| `scripts/build-gallery.mjs` | Generates the server-delivered example HTML |
| `examples/gallery.css` | Responsive reference presentation styles |
| `examples/gallery.js` | Stimulus presentation controller and example interactions |
| `examples/assets/sources.json` | Provenance of reference media |
| `test/fixtures/index.html` | Engine and Turbo regression scenarios at `/regression` |

Run `npm run build:gallery` after editing the generator or catalog. The gallery is a static development server using the real core and Stimulus adapter. It is not a Rails application; the separate Ruby integration tests boot a real Rails application and exercise helper rendering and asset delivery.


---

<!-- Source: /docs/rails.md -->

# Rails helpers

The gem's engine makes `HotwireSheets::SheetHelper` available to Action View. Every helper captures ordinary ERB blocks; use partials and Rails form helpers inside them.

## Anatomy

```erb
<%= hotwire_sheet(id: "settings", label: "Settings") do |sheet| %>
  <%= sheet.trigger "Settings" %>
  <%= sheet.backdrop class: "settings-backdrop" %>
  <%= sheet.content(class: "settings-panel",
        view: { class: "settings-viewport" }) do %>
    <%= sheet.handle %>
    <%= sheet.title "Settings" %>
    <%= sheet.description "Adjust your preferences." %>
    <%= sheet.body(class: "settings-body") do %>
      <%= render "settings/form" %>
    <% end %>
    <%= sheet.close "Done" %>
  <% end %>
<% end %>
```

`sheet.content` generates the hidden view, its backdrop, and the content element. One content block is allowed per sheet. `sheet.backdrop` configures the automatically generated backdrop and should appear before `sheet.content`; it does not render a second backdrop. Set `backdrop: false` on `sheet.content` to omit it.

## Helper reference

| Helper | Arguments | Result |
| --- | --- | --- |
| `hotwire_sheet` | Required `id:`, [options](options.md), block | Stimulus root with serialized configuration |
| `hotwire_sheet_trigger` | Text or block, required `sheet:`, HTML attributes | Button, or link when `href:` is supplied |
| `sheet.trigger` | Text or block, HTML attributes | Trigger associated with this builder's sheet |
| `sheet.content` | `backdrop: true`, `view: {}`, HTML attributes, block | View, backdrop, and named dialog content |
| `sheet.backdrop` | HTML attributes | Configures the backdrop generated by `content` |
| `sheet.handle` | `label:`, HTML attributes | Focusable handle with arrow-key detent support |
| `sheet.title` | Text or block, HTML attributes | `h2` with an associated ID |
| `sheet.description` | Text or block, HTML attributes | Description paragraph with an associated ID |
| `sheet.body` | HTML attributes, block | Scrollable content region |
| `sheet.close` | Text, default `"Close"`, or block; HTML attributes | Explicit close button |

## IDs and accessible names

Use a unique, stable root ID. The helper derives `settings-content`, `settings-title`, and `settings-description` from it. Turbo permanent roots also need stable IDs.

A dialog must have a name. Supply `sheet.title`, a root `label:`, or `aria: { label: ... }` / `aria: { labelledby: ... }` on the content. If a visible heading is unsuitable, use `sheet.title(class: "sheet-visually-hidden")`. The helper raises an error for unnamed content.

Root `description:` supplies the default text when you call `sheet.description` without an argument. It does not render that paragraph automatically.

## Attributes and application controllers

Pass root attributes in `html:`; pass content attributes to `sheet.content` and view attributes in `view:`. The helper merges `data:` and `aria:` attributes with its structural markers.

```erb
<%= hotwire_sheet(id: "editor",
      html: { class: "editor-root", data: { turbo_permanent: true } }) do |sheet| %>
  <%= sheet.content(data: { controller: "product-editor" }) do %>
    <%= sheet.title "Edit product" %>
    <%= sheet.body do %>
      <%= render "products/form" %>
    <% end %>
    <%= sheet.close "Cancel" %>
  <% end %>
<% end %>
```

The default portal moves the view to `document.body`. Put application controllers inside the content when their actions or targets live in that content. See [Turbo and Stimulus](turbo.md).

## Dismiss buttons

Style explicit close buttons however your application needs. A corner cross, a header's Cancel action, and a confirmation button all use `sheet.close`.

```erb
<%= sheet.close(class: "corner-close", aria: { label: "Dismiss Sheet" }) do %>
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none"
       stroke="currentColor" stroke-width="2.5">
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
<% end %>
```

For the gallery's handle-shaped Dismiss button, use a real button that has both behavior markers:

```erb
<%= sheet.close "", class: "dismiss-handle",
      aria: { label: "Dismiss" }, data: { sheet_handle: "" } %>
```

This gives click/Enter dismissal and drag/arrow-key movement. A regular `sheet.handle` is a button with `action: "step"`: clicking cycles through the detents, including closed. Use an explicit action object to select a particular detent. Arrow keys resize without cycling through closed.

## Progressive enhancement

Give an external trigger a useful fallback URL:

```erb
<%= hotwire_sheet_trigger "View order", sheet: "order-details",
      href: order_path(@order) %>
```

Without JavaScript it follows the URL. With enhancement a normal click opens the sheet; modified clicks retain normal link behavior. The content starts hidden on the server, including when `open: true` is requested; that option opens it after Stimulus connects.

## Scroll and auxiliary helpers

`registerSheets(application)` also registers these helpers' controllers:

| Helper | Controller | Documentation |
| --- | --- | --- |
| `hotwire_scroll` | `sheet-scroll` | [Scroll](scroll.md) |
| `hotwire_sheet_stack` | `sheet-stack` | [Named stacks](primitives.md#named-stacks) |
| `hotwire_sheet_outlet` | `sheet-outlet` | [Animation outlets](animations.md#travel-and-stacking-outlets) |
| `hotwire_sheet_island` | `sheet-island` | [Islands](primitives.md#interactive-islands) |
| `hotwire_sheet_external_overlay` | `sheet-external-overlay` | [External overlays](primitives.md#external-overlays) |
| `hotwire_sheet_fixed` | `sheet-fixed` | [Fixed content](primitives.md#fixed-viewport-content) |
| `hotwire_sheet_auto_focus` | `sheet-auto-focus` | [Focus targets](primitives.md#focus-targets) |

Auxiliary helpers accept `html:` for attributes and `html: { as: :button }` (or another tag) to choose the root element. `hotwire_sheet_visually_hidden` renders a span with accessible hidden text and needs no controller. `sheet.bleeding_background` renders a background extending toward the dismissal edge. `sheet.outlet(...)` associates an outlet with the current sheet.

`hotwire_sheet_trigger` accepts `action: "present"`, `"dismiss"`, `"step"`, or `{ type: "step", direction: "down" }`. A step action can specify `detent:` using closed-inclusive numbering. `on_press:` accepts a behavior hash. The normal trigger continues to support links with fallback routes. Handles are buttons with hidden text labels; they support clicks as well as arrow, Home, and End keys.

Nested option hashes are converted recursively from snake_case to camelCase. For example, `entering_animation_settings: { content_move: false }` becomes the correct JavaScript object. Functions cannot be serialized in an ERB data attribute; attach callbacks or function-valued effects through an application Stimulus controller.


---

<!-- Source: /docs/options.md -->

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


---

<!-- Source: /docs/javascript.md -->

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


---

<!-- Source: /docs/scroll.md -->

# Scroll

`Scroll` supplies native scrolling, CSS Scroll Snap, keyboard visibility, explicit gesture boundaries, and the same controls for a panel or a page. It is independent of Rails and can be used inside or outside a Sheet.

## Rails

```erb
<%= hotwire_scroll(id: "messages", scroll_snap_type: "proximity",
      native_scrollbar: false, scroll_padding: "16px") do |scroll| %>
  <%= scroll.view(style: "height: 24rem") do %>
    <%= scroll.content do %>
      <% @messages.each do |message| %>
        <article data-scroll-snap-align><%= message.body %></article>
      <% end %>
    <% end %>
  <% end %>
  <%= scroll.trigger("Latest", action: { type: "scroll-to", progress: 1 }) %>
<% end %>
```

`registerSheets(application)` registers the `sheet-scroll` controller as well as the sheet and auxiliary controllers. Give the view a constrained size. Inside flex or grid layouts, set `min-height: 0` and `min-width: 0` on ancestors that need to shrink.

## JavaScript

```js
import { Scroll } from "hotwire-sheets";

const messages = new Scroll(document.querySelector("#messages"), {
  axis: "y",
  safeArea: "visual-viewport",
  onScroll({ progress, distance, availableDistance }) {
    console.log(progress, distance, availableDistance);
  }
});
messages.scrollTo({ progress: 1 });
messages.scrollBy({ distance: -120, animationSettings: { skip: true } });
```

Supply `data-scroll-view` and `data-scroll-content` descendants. The view may also be the root element. The library places content in an internal native scroll container so other direct children of the view can remain stationary. `scroll.scroller` identifies the actual scrolling element; `scroll.view` identifies the authored viewport. Put scrollable content inside the content element and stationary controls alongside it. Style the controls with ordinary absolute positioning.

## Options

Ruby options use snake_case, including nested hash keys; JavaScript uses the names below. Callback functions are supplied in JavaScript. Behavior option objects are also serializable through Rails.

| Option | Default | Behavior |
| --- | --- | --- |
| `componentId` | Root ID or generated ID | Associates external controls with this instance |
| `componentRef` | Unset | Optional `{ current: null }` object receives the instance, then `null` on destroy |
| `axis` | `"y"` | `"x"` or `"y"`; horizontal scrolling handles RTL direction |
| `pageScroll` | `false` | Controls page scrolling through this instance |
| `nativePageScrollReplacement` | `false` | `true`, `false`, or `"auto"`; requires `pageScroll: true` |
| `safeArea` | `"visual-viewport"` | `"none"`, `"layout-viewport"`, or `"visual-viewport"`; adds travel room when the view extends beyond that viewport |
| `scrollGestureTrap` | `false` | Boolean, `{ x, y }`, or `{ xStart, xEnd, yStart, yEnd }`; traps configured boundaries even without overflow |
| `scrollGestureOvershoot` | `true` | Permits browser elastic overscroll; `false` disables it and traps boundaries |
| `scrollGesture` | `"auto"` | `false` blocks user wheel, touch, scrolling keys, and native scrollbar interaction; methods remain available |
| `nativeFocusScrollPrevention` | `true` | Focuses text controls without independently scrolling the page during pointer focus |
| `onFocusInside` | `{ scrollIntoView: true }` | Reveals focus within the configured safe area; accepts a behavior callback |
| `scrollAnimationSettings` | `{ skip: "auto" }` | Uses browser smooth scrolling unless skipped; `"auto"` respects reduced motion |
| `scrollAnchoring` | `true` | Sets native `overflow-anchor`; browser support applies |
| `scrollSnapType` | `"none"` | `"none"`, `"proximity"`, or `"mandatory"`; the selected axis is applied automatically |
| `scrollPadding` | `"auto"` | Native CSS scroll padding |
| `scrollTimelineName` | `"none"` | Named native CSS scroll timeline, for example `"--messages"`; browser support applies |
| `nativeScrollbar` | `true` | Shows or hides native scrollbars |
| `onScroll` | Unset | Frame-coalesced `{ progress, distance, availableDistance, nativeEvent }` |
| `onScrollStart` | `{ dismissKeyboard: false }` | Behavior hook; can blur the focused descendant when scrolling begins |
| `onScrollEnd` | Unset | Receives `{ nativeEvent }` when scrolling settles |
| `onPress` | `{ forceFocus: true, runAction: true }` | Default behavior for this Scroll's triggers |

Use `scroll.setOptions({...})` to update options. Changing page-scroll ownership requires destroying and recreating the instance. `scroll.refresh()` queues geometry measurement after application layout changes.

Elastic overscroll depends on the browser and operating system. Page-scroll replacement deliberately changes browser UI behavior: native pull-to-refresh, status-bar scroll-to-top, and automatic browser-chrome collapse may no longer apply. `"auto"` preserves native page scrolling in mobile browser tabs and uses a replacement on desktop and in standalone mode.

## Methods and triggers

`getProgress()` returns a number from zero to one, `getDistance()` returns the current distance in pixels, and `getAvailableDistance()` returns total available travel. `scrollTo` accepts an absolute `distance` or `progress`; `scrollBy` accepts a relative one. Their `animationSettings.skip` accepts `true`, `false`, `"auto"`, or `"default"` to inherit the instance setting. These methods delegate motion to native scrolling and do not animate `scrollTop` in a JavaScript frame loop.

```html
<button data-scroll-for="messages"
  data-scroll-action='{"type":"scroll-by","distance":200}'>Next</button>
```

Inside a Scroll root, `data-scroll-for` can be omitted. Outside it, provide the component ID. `data-scroll-on-press='{"forceFocus":false}'` overrides press behavior for one trigger. `scroll:progress`, `scroll:start`, `scroll:end`, `scroll:focus-inside`, and `scroll:press` are bubbling DOM events. Behavior-event details expose `changeDefault({...})` and `nativeEvent`.

## Page ownership

```js
import { getPageScrollData, observePageScrollData } from "hotwire-sheets";
const stop = observePageScrollData(({ pageScrollContainer, nativePageScrollReplaced }) => {
  // Connect application scroll indicators to the actual page owner.
});
// Later: stop();
```

The observer runs immediately and when a replacement is installed or removed. On the server, the getter returns an undefined container and `false`; it does not access the DOM at module-import time. Only one replacement page scroller can be active per document. `destroy()` removes listeners and observers and restores the original content placement and owned page styles.


---

<!-- Source: /docs/animations.md -->

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


---

<!-- Source: /docs/primitives.md -->

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


---

<!-- Source: /docs/api-index.md -->

# API index

This index lists the component options and utility functions available in Hotwire Sheets. Use the linked guides for defaults, signatures, and complete examples. Serializable options also work through Rails helpers in snake_case.

See [core concepts](concepts.md), [options](options.md), [Rails helpers](rails.md), [JavaScript API](javascript.md), [animation APIs](animations.md), and [coverage](coverage.md).

## Components

| Component or part | JavaScript / Rails API |
| --- | --- |
| Sheet | Sheet / hotwire_sheet |
| Sheet triggers | data-sheet-action / hotwire_sheet_trigger |
| Sheet outlets | Outlet / hotwire_sheet_outlet |
| Portal | portal and container options |
| Sheet options | Sheet options / data-sheet-view |
| Backdrop | data-sheet-backdrop / sheet.backdrop |
| Sheet content | data-sheet-content / sheet.content |
| Bleeding background | data-sheet-bleeding-background / sheet.bleeding_background |
| Handle | data-sheet-handle / sheet.handle |
| Title | data-sheet-title / sheet.title |
| Description | data-sheet-description / sheet.description |
| Special wrapper | data-sheet-special-wrapper |
| Special content | data-sheet-special-content |
| Scroll | Scroll / hotwire_scroll |
| Scroll triggers | data-scroll-action / hotwire_scroll_trigger |
| Scroll options | Scroll options / scroll.view |
| Scroll content | data-scroll-content / scroll.content |
| SheetStack | SheetStack / hotwire_sheet_stack |
| Stack outlets | Outlet / stack.outlet |
| AutoFocusTarget | AutoFocusTarget / hotwire_sheet_auto_focus |
| Island | Island / hotwire_sheet_island |
| Island content | data-island-content |
| Fixed | Fixed / hotwire_sheet_fixed |
| Fixed content | data-fixed-content |
| VisuallyHidden | VisuallyHidden / .sheet-visually-hidden |
| ExternalOverlay | ExternalOverlay / hotwire_sheet_external_overlay |

## Sheet

| Property or action | API | Notes |
| --- | --- | --- |
| `componentId` | componentId |  |
| `forComponent` | forComponent | Serializable IDs or JavaScript instances; DOM ancestry supplies closest association. |
| `sheetRole` | sheetRole |  |
| `defaultPresented` | defaultPresented |  |
| `presented` | presented |  |
| `onPresentedChange` | onPresentedChange |  |
| `defaultActiveDetent` | defaultActiveDetent | Closed-inclusive numbering; legacy detent/snapTo keep open-position indices. |
| `activeDetent` | activeDetent | Closed-inclusive numbering; legacy detent/snapTo keep open-position indices. |
| `onActiveDetentChange` | onActiveDetentChange | Closed-inclusive numbering; legacy detent/snapTo keep open-position indices. |

## Sheet triggers

| Property or action | API | Notes |
| --- | --- | --- |
| `forComponent` | forComponent | Serializable IDs or JavaScript instances; DOM ancestry supplies closest association. |
| `action` | action |  |
| `onPress` | onPress |  |
| `travelAnimation` | Outlet definitions or data-sheet-*-animation | Functions in JavaScript; arrays/constants can be serialized from Rails. |
| `stackingAnimation` | Outlet definitions or data-sheet-*-animation | Functions in JavaScript; arrays/constants can be serialized from Rails. |

## Sheet outlets

| Property or action | API | Notes |
| --- | --- | --- |
| `forComponent` | forComponent | Serializable IDs or JavaScript instances; DOM ancestry supplies closest association. |
| `travelAnimation` | Outlet definitions or data-sheet-*-animation | Functions in JavaScript; arrays/constants can be serialized from Rails. |
| `stackingAnimation` | Outlet definitions or data-sheet-*-animation | Functions in JavaScript; arrays/constants can be serialized from Rails. |

## Portal

| Property or action | API | Notes |
| --- | --- | --- |
| `container` | container |  |

## Sheet options

| Property or action | API | Notes |
| --- | --- | --- |
| `forComponent` | forComponent | Serializable IDs or JavaScript instances; DOM ancestry supplies closest association. |
| `contentPlacement` | contentPlacement |  |
| `tracks` | tracks |  |
| `detents` | detents | Supply every open position, including "content" for full-content sizing. |
| `swipeTrap` | swipeTrap | Axis-aware boundary propagation; native scroll chaining follows browser cancellation rules. |
| `swipeOvershoot` | swipeOvershoot | Opt-in here to preserve existing attached-edge behavior; native elasticity depends on the browser. |
| `swipeDismissal` | swipeDismissal |  |
| `swipe` | swipe |  |
| `nativeEdgeSwipePrevention` | nativeEdgeSwipePrevention | Cancels qualifying edge touch starts; physical browser gesture prevention is best-effort. |
| `enteringAnimationSettings` | enteringAnimationSettings |  |
| `exitingAnimationSettings` | exitingAnimationSettings |  |
| `steppingAnimationSettings` | steppingAnimationSettings |  |
| `onTravelStatusChange` | onTravelStatusChange |  |
| `onTravelRangeChange` | onTravelRangeChange |  |
| `onTravel` | onTravel |  |
| `onTravelStart` | onTravelStart |  |
| `onTravelEnd` | onTravelEnd |  |
| `inertOutside` | inertOutside |  |
| `onPresentAutoFocus` | onPresentAutoFocus |  |
| `onDismissAutoFocus` | onDismissAutoFocus |  |
| `onClickOutside` | onClickOutside |  |
| `onEscapeKeyDown` | onEscapeKeyDown |  |
| `onFocusInside` | onFocusInside |  |
| `nativeFocusScrollPrevention` | nativeFocusScrollPrevention | Pointer focus uses preventScroll; browser/keyboard/iframe limitations still apply. |

## Backdrop

| Property or action | API | Notes |
| --- | --- | --- |
| `swipeable` | swipeable |  |
| `themeColorDimming` | themeColorDimming | Sheet option or programmatic dimming overlay; WebKit automatic mode. |
| `travelAnimation` | Outlet definitions or data-sheet-*-animation | Functions in JavaScript; arrays/constants can be serialized from Rails. |
| `stackingAnimation` | Outlet definitions or data-sheet-*-animation | Functions in JavaScript; arrays/constants can be serialized from Rails. |

## Sheet content

| Property or action | API | Notes |
| --- | --- | --- |
| `travelAnimation` | Outlet definitions or data-sheet-*-animation | Functions in JavaScript; arrays/constants can be serialized from Rails. |
| `stackingAnimation` | Outlet definitions or data-sheet-*-animation | Functions in JavaScript; arrays/constants can be serialized from Rails. |

## Bleeding background

| Property or action | API | Notes |
| --- | --- | --- |
| `travelAnimation` | Outlet definitions or data-sheet-*-animation | Functions in JavaScript; arrays/constants can be serialized from Rails. |
| `stackingAnimation` | Outlet definitions or data-sheet-*-animation | Functions in JavaScript; arrays/constants can be serialized from Rails. |

## Handle

| Property or action | API | Notes |
| --- | --- | --- |
| `forComponent` | forComponent | Serializable IDs or JavaScript instances; DOM ancestry supplies closest association. |
| `action` | action |  |
| `onPress` | onPress |  |
| `travelAnimation` | Outlet definitions or data-sheet-*-animation | Functions in JavaScript; arrays/constants can be serialized from Rails. |
| `stackingAnimation` | Outlet definitions or data-sheet-*-animation | Functions in JavaScript; arrays/constants can be serialized from Rails. |

## Title

| Property or action | API | Notes |
| --- | --- | --- |
| `travelAnimation` | Outlet definitions or data-sheet-*-animation | Functions in JavaScript; arrays/constants can be serialized from Rails. |
| `stackingAnimation` | Outlet definitions or data-sheet-*-animation | Functions in JavaScript; arrays/constants can be serialized from Rails. |

## Description

| Property or action | API | Notes |
| --- | --- | --- |
| `travelAnimation` | Outlet definitions or data-sheet-*-animation | Functions in JavaScript; arrays/constants can be serialized from Rails. |
| `stackingAnimation` | Outlet definitions or data-sheet-*-animation | Functions in JavaScript; arrays/constants can be serialized from Rails. |

## Scroll

| Property or action | API | Notes |
| --- | --- | --- |
| `componentId` | componentId |  |
| `componentRef` | Scroll instance / componentRef.current | No React ref dependency. |
| `getProgress` | getProgress |  |
| `getDistance` | getDistance |  |
| `getAvailableDistance` | getAvailableDistance |  |
| `scrollTo` | scrollTo |  |
| `scrollBy` | scrollBy |  |

## Scroll triggers

| Property or action | API | Notes |
| --- | --- | --- |
| `forComponent` | forComponent | Serializable IDs or JavaScript instances; DOM ancestry supplies closest association. |
| `action` | action |  |
| `onPress` | onPress |  |

## Scroll options

| Property or action | API | Notes |
| --- | --- | --- |
| `forComponent` | forComponent | Serializable IDs or JavaScript instances; DOM ancestry supplies closest association. |
| `axis` | axis |  |
| `pageScroll` | pageScroll |  |
| `nativePageScrollReplacement` | nativePageScrollReplacement |  |
| `safeArea` | safeArea |  |
| `scrollGestureTrap` | scrollGestureTrap |  |
| `scrollGestureOvershoot` | scrollGestureOvershoot |  |
| `scrollGesture` | scrollGesture |  |
| `onScroll` | onScroll |  |
| `onScrollStart` | onScrollStart |  |
| `onScrollEnd` | onScrollEnd |  |
| `nativeFocusScrollPrevention` | nativeFocusScrollPrevention | Pointer focus uses preventScroll; browser/keyboard/iframe limitations still apply. |
| `onFocusInside` | onFocusInside |  |
| `scrollAnimationSettings` | scrollAnimationSettings |  |
| `scrollAnchoring` | scrollAnchoring |  |
| `scrollSnapType` | scrollSnapType |  |
| `scrollPadding` | scrollPadding |  |
| `scrollTimelineName` | scrollTimelineName |  |
| `nativeScrollbar` | nativeScrollbar |  |

## SheetStack

| Property or action | API | Notes |
| --- | --- | --- |
| `componentId` | componentId |  |

## Stack outlets

| Property or action | API | Notes |
| --- | --- | --- |
| `forComponent` | forComponent | Serializable IDs or JavaScript instances; DOM ancestry supplies closest association. |
| `stackingAnimation` | Outlet definitions or data-sheet-*-animation | Functions in JavaScript; arrays/constants can be serialized from Rails. |

## AutoFocusTarget

| Property or action | API | Notes |
| --- | --- | --- |
| `forComponent` | forComponent | Serializable IDs or JavaScript instances; DOM ancestry supplies closest association. |
| `timing` | timing |  |

## Island

| Property or action | API | Notes |
| --- | --- | --- |
| `forComponent` | forComponent | Serializable IDs or JavaScript instances; DOM ancestry supplies closest association. |
| `disabled` | disabled |  |
| `contentGetter` | contentGetter |  |

## ExternalOverlay

| Property or action | API | Notes |
| --- | --- | --- |
| `disabled` | disabled |  |
| `selfManagedInertOutside` | selfManagedInertOutside |  |
| `contentGetter` | contentGetter |  |

## createComponentId

| Property or action | API | Notes |
| --- | --- | --- |
| `function` | createComponentId |  |

## Page scroll subscriptions

| Property or action | API | Notes |
| --- | --- | --- |
| `function` | getPageScrollData / observePageScrollData | Subscriptions return cleanup functions. |

## Media query subscriptions

| Property or action | API | Notes |
| --- | --- | --- |
| `function` | observeMediaQuery | Subscriptions return cleanup functions. |

## updateThemeColor

| Property or action | API | Notes |
| --- | --- | --- |
| `function` | updateThemeColor |  |

## Theme color dimming

| Property or action | API | Notes |
| --- | --- | --- |
| `function` | createThemeColorDimmingOverlay | Subscriptions return cleanup functions. |

## animate

| Property or action | API | Notes |
| --- | --- | --- |
| `function` | animate |  |

## Guides and downloadable documentation

Installation is covered in [getting started](getting-started.md). [Styling](styling.md) covers HTML composition, CSS layers, Tailwind ordering, viewport sizing, and default styles. [Primitives](primitives.md) covers stacks, focus, and external overlays. The [examples](examples.md) and [recipes](recipes.md) show all 16 presentations.

Download individual Markdown pages, [llms.txt](llms.txt), the bundled [docs-full.md](docs-full.md), or the [machine-readable API inventory](api-inventory.json).


---

<!-- Source: /docs/styling.md -->

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


---

<!-- Source: /docs/turbo.md -->

# Turbo and Stimulus

Register the built-in adapter once in the application's existing Stimulus instance. It owns the `Sheet` lifecycle and handles Turbo's page cache.

`registerSheets(application)` also registers Scroll, Outlet, SheetStack, Island, ExternalOverlay, Fixed, and AutoFocusTarget controllers. They release observers, native scroll wrappers, viewport portals, and owned styles before Turbo caches or replaces a page, then reconnect after render. Their `data-…-options-value` attributes supply the serializable options documented in the Rails helpers guide.

## Navigation lifecycle

- Before a page is cached or replaced, ordinary sheets close, release their scroll locks, and return their views to their roots.
- A root with `data-turbo-permanent` saves its active detent and resumes after navigation.
- Frame and Stream changes inside an existing sheet preserve its open state and trigger remeasurement.
- Removing or replacing the root destroys the old instance and releases its portal, observers, listeners, and animations.

The adapter does not add history entries for opening sheets. Browser Back follows Turbo navigation. If your product needs Back-to-dismiss, build that route policy explicitly around the lifecycle events.

## Lazy Frames

```erb
<%= hotwire_sheet_trigger "Order details", sheet: "order",
      href: order_path(@order) %>

<%= hotwire_sheet(id: "order", detents: ["content", 0.85]) do |sheet| %>
  <%= sheet.content do %>
    <%= sheet.title "Order details" %>
    <%= sheet.body do %>
      <%= turbo_frame_tag "order_details",
            src: order_path(@order), loading: :lazy %>
    <% end %>
    <%= sheet.close "Close" %>
  <% end %>
<% end %>
```

The server's Frame response must include the matching `turbo-frame id="order_details"`. Use a normal page response for the trigger's fallback route. The engine observes content changes; call `sheet.refresh()` for application-driven layout changes that require explicit remeasurement.

## Form submission

Keep the form controller in the content subtree so its targets and actions remain together after portaling:

```erb
<%= sheet.content(data: { controller: "sheet-form" }) do %>
  <%= sheet.title "Edit product" %>
  <%= sheet.body do %>
    <%= form_with model: @product,
          data: { action: "turbo:submit-end->sheet-form#submitted" } do |form| %>
      <%= form.label :name %>
      <%= form.text_field :name %>
      <%= form.submit "Save" %>
    <% end %>
  <% end %>
  <%= sheet.close "Cancel" %>
<% end %>
```

```js
// app/javascript/controllers/sheet_form_controller.js
import { Controller } from "@hotwired/stimulus"
import { Sheet } from "hotwire-sheets"

export default class extends Controller {
  submitted(event) {
    if (!event.detail.success) return
    // The stable root remains outside the portal.
    Sheet.get(document.getElementById("product-editor"))?.close({ reason: "saved" })
  }
}
```

In this example the outer helper uses `id: "product-editor"`. Validation errors can replace the Frame or update form content while leaving the sheet open. Use Rails' normal status and response conventions for the form; the sheet does not change server submission semantics.

## Controller actions

The adapter exposes `open`, `close`, `toggle`, and `snap`. `snap` reads a numeric `detent` action parameter:

```html
<button data-action="sheet#snap" data-sheet-detent-param="1">Expand</button>
```

Stimulus actions resolve controllers through ancestry. Because the view portals outside its root, place this action in a region that still has the controller as an ancestor, use `portal: false` where appropriate, or use an application controller and `Sheet.get(root)` for controls inside the portaled content. `data-sheet-open` and `data-sheet-close` work through portals without this restriction.

## Permanent content

```erb
<%= hotwire_sheet(id: "player", open: true, modal: false,
      autofocus: false, close_on_outside: false,
      detents: ["76px", 1], swipe_to_dismiss: false,
      html: { data: { turbo_permanent: true } }) do |sheet| %>
  <%= sheet.content do %>
    <%= sheet.title "Now playing", class: "sheet-visually-hidden" %>
    <%= sheet.body do %>Player controls<% end %>
    <%= sheet.close %>
  <% end %>
<% end %>
```

Render the matching permanent root on the destination page too. A permanent player must not retain page-specific stale form state. Choose permanent ownership deliberately.

## Third-party overlays

For an application-owned overlay outside the sheet portal that should remain interactive, mark its container with `data-sheet-island`. This keeps it available to focus and accessibility while a modal sheet is active. Remove the island when the overlay closes. It is a modality exception, not a complete integration with every third-party overlay library.

For a third-party dialog with its own focus/inert manager, register an `ExternalOverlay` for the duration of that dialog. Use `selfManagedInertOutside: true` when that manager controls modality, or `false` to include the external content in the sheet's managed scope. The [overlay guide](primitives.md#external-overlays) includes lifecycle examples.

Test nested focus, Escape ordering, and both overlays' scroll locking together. Automatic adapters for third-party frameworks and Turbo Native presentation mapping are not included.


---

<!-- Source: /docs/concepts.md -->

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


---

<!-- Source: /docs/troubleshooting.md -->

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

`"content"` detents follow measured content. Give images dimensions or an aspect ratio to reserve their space, or use fixed/fraction detents when a stable presentation size is required. Mutation and resize observers remeasure dynamic content.

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


---

<!-- Source: /docs/architecture.md -->

# Architecture

Hotwire Sheets combines a standalone browser engine, a Stimulus adapter, and a Rails integration. Its programming model uses DOM elements, attributes, and events.

## Responsibilities

`src/core` owns presentation state, detent resolution, input, springs and stacking. `src/platform` owns viewport measurement, focus and page scrolling. `src/stimulus` owns the Turbo lifecycle. The Rails engine exposes styles, two prebuilt ES modules, an installation generator and capturing ERB helpers. The npm core has no runtime dependencies; only the optional adapter imports Stimulus.

The state machine is `closed → opening → open → dragging/settling → closing → closed`. Transitions can interrupt one another. Every public transition returns a promise: `true` means it completed; `false` means it was canceled, superseded or inapplicable. Disconnect forces synchronous cleanup. No Rails request occurs during a gesture.

## Motion and sizing

Detents resolve to visible lengths using the current visual viewport. Numeric values are fractions, strings may be `content` or positive CSS lengths, including viewport units and `calc()`. Public indices preserve declaration order even when content measurements change the size order. Keyboard navigation follows resolved size order.

The default `animation: "waapi"` backend samples an analytical spring into keyframes and animates the sheet's concrete `transform` and `opacity`, plus the backdrop's `opacity`, with the Web Animations API. The browser owns interpolation and playback; the primary animation continues even if the library's JavaScript frame observer is stopped. The observer synchronizes public progress events, CSS variables, and custom stacking effects. Interruption samples the displayed transform before handing control to the next transition. If the viewport or detent geometry changes during a transition, it completes at the new destination. [Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Element/animate).

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


---

<!-- Source: /docs/coverage.md -->

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
