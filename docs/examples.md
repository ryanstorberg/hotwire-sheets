# Example gallery

The gallery presents **16 examples** in one responsive grid. Each card shows desktop and mobile previews with watercolor artwork. Layouts, typography, panel corners, and dismiss controls use the Rails-compatible engine.

Open the [gallery](/) to try every example. For local development, run `npm run demo` and visit `http://127.0.0.1:4173/`. The Docs link opens this guide. The static demo uses the actual core, Stimulus, and Turbo modules; the Ruby integration tests separately verify a real Rails application.

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
