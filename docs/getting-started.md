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
