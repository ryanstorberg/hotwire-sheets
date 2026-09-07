import { chromium, webkit } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { examples } from "../examples/catalog.js";
import { previewTheme } from "../examples/preview-themes.js";

// Render the real responsive demos, then arrange those browser screenshots in
// device frames. Keep this separate from build:gallery so normal builds don't
// require browser binaries or a running demo server.
const baseURL = process.env.GALLERY_URL || "http://127.0.0.1:4173";
const output = new URL("../examples/assets/previews/", import.meta.url);
await mkdir(output, { recursive: true });
const desktop = await chromium.launch();
const mobile = await webkit.launch();
try {
  const screens = [
    { name: "desktop", page: await desktop.newPage({ viewport: { width: 1180, height: 900 }, deviceScaleFactor: 1 }) },
    { name: "mobile", page: await mobile.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }) }
  ];
  const composition = await desktop.newPage({ viewport: { width: 1080, height: 646 }, deviceScaleFactor: 1 });
  for (const [id, [name, kind]] of Object.entries(examples)) {
    const theme = previewTheme(kind);
    const captures = await Promise.all(screens.map(async ({ name: device, page }) => {
      await page.goto(baseURL);
      await page.waitForFunction(() => window.lab?.get("basic"));
      await page.evaluate(() => document.fonts.ready);
      // A quiet canvas isolates each demo and avoids recursively photographing
      // the gallery's own preview images. Only the capture page gets these rules.
      await page.addStyleTag({ content: `
        #page > * { visibility: hidden !important; }
        body, #page { background: linear-gradient(145deg, ${theme.screen}, ${theme.light}) !important; }
        [data-sheet-view]:not(:has(> .lightbox-sheet)) > [data-sheet-backdrop] { visibility: hidden !important; }
        .example-sheet:not(.lightbox-sheet):not(.parallax-sheet) { box-shadow: 0 4px 12px ${theme.shadow}, 0 12px 36px ${theme.shadow}; }
        .lightbox-sheet > .dismiss { top: 32px; left: 32px; }
        :focus-visible { outline: none !important; }
      ` });
      await page.evaluate(async ({ id, device }) => {
        await window.lab.get(id).open({ immediate: true, detent: id === "persistent" && device === "mobile" ? 1 : 0 });
        if (device === "desktop" && id === "stacked") await window.lab.get("child").open({ immediate: true });
        if (device === "desktop" && id === "depth") await window.lab.get("depth-child").open({ immediate: true });
        await Promise.all([...document.querySelectorAll('[data-sheet-view]:not([hidden]) img')].filter(img => !img.closest('.related-example')).map(img => img.decode()));
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      }, { id, device });
      return `data:image/png;base64,${(await page.screenshot()).toString("base64")}`;
    }));
    const phoneRight = ["top", "sidebar", "persistent", "depth", "parallax", "long", "page-bottom"].includes(kind);
    await composition.setContent(`<!doctype html><html><head><style>
      * { box-sizing: border-box; }
      body { margin: 0; width: 1080px; height: 646px; overflow: hidden; background: radial-gradient(ellipse at 18% 0%, ${theme.light}, transparent 72%), linear-gradient(135deg, ${theme.wash} 18%, ${theme.deep}); }
      .device { position: absolute; overflow: hidden; border: 2px solid ${theme.screen}; background: ${theme.screen}; box-shadow: 0 0 0 1px ${theme.edge}, 0 4px 8px ${theme.shadow}, 0 16px 36px ${theme.shadow}; }
      .desktop { width: 770px; height: 589px; top: 70px; ${phoneRight ? "left: 82px" : "right: 82px"}; border-radius: 64px 64px 0 0; }
      .mobile { width: 258px; height: 512px; top: 138px; ${phoneRight ? "right: 82px" : "left: 82px"}; border-radius: 56px 56px 0 0; box-shadow: 0 0 0 1px ${theme.edge}, 0 6px 14px ${theme.shadow}, 8px 20px 44px ${theme.shadow}; }
      img { display: block; width: 100%; height: auto; }
      .device::after { content: ""; position: absolute; left: 50%; top: 9px; transform: translateX(-50%); width: 58px; height: 13px; border: 1px solid ${theme.edge}; border-radius: 12px; background: ${theme.screen}; box-shadow: inset 0 1px 2px #ffffff80; }
      .desktop::after { width: 82px; height: 15px; top: -1px; border-radius: 0 0 8px 8px; }
    </style></head><body><div class="device desktop"><img src="${captures[0]}"></div><div class="device mobile"><img src="${captures[1]}"></div></body></html>`);
    await composition.locator("img").evaluateAll(images => Promise.all(images.map(image => image.decode())));
    await composition.screenshot({ path: fileURLToPath(new URL(`${kind}.jpg`, output)), type: "jpeg", quality: 94 });
    console.log(`Captured ${name}: desktop + mobile`);
  }
} finally {
  await desktop.close();
  await mobile.close();
}
