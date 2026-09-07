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
