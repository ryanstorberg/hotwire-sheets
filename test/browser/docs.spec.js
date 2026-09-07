import { test, expect } from "@playwright/test";
import { readdir, readFile } from "node:fs/promises";

test("documentation navigation works on desktop and mobile without overflow", async ({ page }) => {
  await page.goto("/docs");
  await expect(page.getByRole("heading", { name: "Getting started", exact: true })).toBeVisible();
  const menu = page.locator(".docs-navigation details");
  if (!(await menu.getAttribute("open") != null)) await menu.locator("summary").click();
  await page.getByRole("searchbox", { name: "Search guides" }).fill("options");
  await expect(page.locator(".docs-navigation nav a:visible")).toHaveCount(1);
  await page.locator(".docs-navigation").getByRole("link", { name: "Options", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Options", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize().width);
  await page.getByRole("button", { name: "Copy code example" }).first().click();
  await expect(page.getByRole("button", { name: "Copy code example" }).first()).toHaveText(/Copied|Select to copy/);
});

test("every generated guide and its internal links resolve", async ({ request }) => {
  const files = (await readdir("docs/site")).filter(file => file.endsWith(".html"));
  const urls = new Set(["/docs/llms.txt"]);
  for (const file of files) {
    const url = `/docs/${file.replace(/\.html$/, "")}`;
    urls.add(url);
    const html = await readFile(`docs/site/${file}`, "utf8");
    for (const [,href] of html.matchAll(/href="([^"]+)"/g)) {
      if (/^(https?:|data:|#)/.test(href)) continue;
      urls.add(new URL(href, `http://127.0.0.1:4173${url}`).pathname);
    }
  }
  for (const url of urls) expect((await request.get(url)).status(), url).toBe(200);
});
