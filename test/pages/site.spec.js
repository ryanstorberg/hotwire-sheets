import { test, expect } from "@playwright/test";
import { examples } from "../../examples/catalog.js";

function watchFailures(page) {
  const failures = [];
  page.on("pageerror", error => failures.push(error.message));
  page.on("response", response => {
    if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
  });
  return failures;
}

test("static gallery loads its artwork and all 16 interactive examples", async ({ page }) => {
  const failures = watchFailures(page);
  await page.goto("./");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("swipeable sheets");
  const previews = page.locator("#examples .device-preview");
  await expect(previews).toHaveCount(16);
  await previews.evaluateAll(images => Promise.all(images.map(image => image.decode())));
  for (const [id, [name]] of Object.entries(examples)) {
    await test.step(name, async () => {
      await page.getByRole("button", { name, exact: true }).click();
      const root = page.locator(`#${id}`);
      const panel = page.locator(`#${id}-content`);
      await expect(root).toHaveAttribute("data-sheet-state", "open");
      await expect(panel).toBeVisible();
      await panel.locator("img").evaluateAll(images => Promise.all(images.map(image => image.decode())));
      if (id === "page-bottom") await panel.getByRole("button", { name: "Close", exact: true }).click();
      else await page.keyboard.press("Escape");
      await expect(root).toHaveAttribute("data-sheet-state", "closed");
    });
  }
  expect(failures).toEqual([]);
});

test("deep documentation links, navigation, assets and downloads work on the static host", async ({ page, request, baseURL }) => {
  const failures = watchFailures(page);
  await page.goto("docs/api-index/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("API index");
  const base = new URL(baseURL);
  const links = new Set();
  const collectLinks = async () => {
    const values = await page.locator("a[href], link[href], script[src], img[src]").evaluateAll(elements =>
      elements.map(element => element.href || element.src));
    for (const value of values) {
      const url = new URL(value);
      if (url.origin !== base.origin) continue;
      expect(url.pathname, "Site links must stay under the repository path").toMatch(new RegExp(`^${base.pathname}`));
      url.hash = "";
      links.add(url.href);
    }
  };
  const guides = await page.locator(".docs-navigation nav a").evaluateAll(elements => elements.map(link => link.href));
  expect(guides).toHaveLength(16);
  for (const guide of guides) {
    await page.goto(guide);
    await expect(page.locator("main h1")).toBeVisible();
    await collectLinks();
  }
  await page.goto("docs/");
  await expect(page.getByRole("button", { name: "Copy code example" }).first()).toBeVisible();
  const menu = page.locator(".docs-navigation details");
  if (await menu.getAttribute("open") === null) await menu.locator("summary").click();
  await page.getByRole("searchbox", { name: "Search guides" }).fill("Options");
  await expect(page.locator(".docs-navigation nav a:visible")).toHaveCount(1);
  await menu.getByRole("link", { name: "Options", exact: true }).click();
  await expect(page).toHaveURL(new URL("docs/options/", baseURL).href);
  await page.getByRole("link", { name: "All Examples ↗", exact: true }).click();
  await expect(page.locator("#examples .device-preview")).toHaveCount(16);
  await collectLinks();
  const urls = [...links];
  for (let offset = 0; offset < urls.length; offset += 8) {
    await Promise.all(urls.slice(offset, offset + 8).map(async url => {
      const response = await request.get(url);
      expect(response.status(), url).toBe(200);
    }));
  }
  const inventory = await request.get(new URL("docs/api-inventory.json", baseURL).href);
  expect(await inventory.json()).toBeTruthy();
  expect(failures).toEqual([]);
});
