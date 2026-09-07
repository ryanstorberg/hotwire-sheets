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
