import { chromium, webkit } from "@playwright/test";
import { mkdir } from "node:fs/promises";
await mkdir("tmp/previews", { recursive: true });
for (const [name, browserType, viewport] of [
  ["desktop", chromium, { width: 1440, height: 1050 }],
  ["mobile", webkit, { width: 390, height: 844 }]
]) {
  const browser = await browserType.launch();
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  page.on("pageerror", (error) => console.error(error));
  await page.goto("http://127.0.0.1:4173/");
  await page.waitForFunction(() => window.lab?.get("basic"));
  await page.screenshot({ path: `tmp/previews/${name}-lab.png`, fullPage: true });
  for (const id of ["basic", "detents", "stacked"]) {
    await page.evaluate((id) => window.lab.get(id).open({ immediate: true }), id);
    if (id === "stacked") {
      await page.waitForFunction(() => window.lab.get("child"));
      await page.evaluate(() => window.lab.get("child").open({ immediate: true }));
    }
    await page.screenshot({ path: `tmp/previews/${name}-${id}.png` });
    if (id === "stacked") await page.evaluate(() => window.lab.get("child").close({ immediate: true }));
    await page.evaluate((id) => window.lab.get(id).close({ immediate: true }), id);
  }
  await browser.close();
}
