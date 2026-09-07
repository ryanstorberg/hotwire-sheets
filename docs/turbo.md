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
