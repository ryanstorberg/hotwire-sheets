# Gallery media

The active landing page and all interactive examples use the public-domain watercolor collection in [`watercolors/`](watercolors/README.md). Each named example has its own main painting. Preview cards in `previews/` show the actual desktop and mobile demos, with those watercolors inside the device frames. Source metadata and credits are stored alongside the artwork.

The older images, preview screenshots, and Inter font in this directory were collected from Silk's public demonstration pages. Their original URLs remain in `sources.json` for provenance. They are no longer referenced by the active gallery, are not relicensed under this repository's MIT license, and remain excluded from the npm and Ruby runtime packages.

To restore the active artwork collection, run `node scripts/fetch-watercolor-assets.mjs`. The gallery works offline once the assets are present.

To regenerate all 16 device previews after changing demo styling or artwork, run `npm run build:gallery`, start `npm run demo`, then run `npm run capture:previews` in another terminal. The capture script uses Playwright Chromium for desktop and WebKit for mobile, then renders both screenshots in CSS device frames. Coordinated palettes in `examples/preview-themes.js` control the gradient backgrounds, device outlines, shadows, and card captions. The capture script supplies the tinted backdrop and preview lighting only during capture; the interactive demos are unchanged. Set `GALLERY_URL` to capture a different local server.
