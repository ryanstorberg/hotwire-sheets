import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const examples = [
  ["basic", "Bottom Sheet"], ["top", "Top Sheet"], ["detached", "Detached Sheet"], ["card", "Card"],
  ["right", "Sidebar"], ["toast", "Toast"], ["stacked", "Sheet with Stacking"], ["persistent", "Persistent Sheet with Detent"],
  ["detents", "Sheet with Detent"], ["depth", "Sheet with Depth"], ["keyboard", "Sheet with Keyboard"], ["lightbox", "Lightbox"],
  ["parallax", "Parallax Page"], ["long", "Long Sheet"], ["page-sheet", "Page"], ["page-bottom", "Page from Bottom"]
];

test.beforeEach(async ({ page }) => {
  page.on("pageerror", (error) => { throw error; });
  await page.goto("/regression");
  await page.waitForFunction(() => window.lab?.get("basic"));
});

test("the gallery contains Silk's complete set of 16 names and unique IDs", async ({ page }) => {
  const cards = page.locator(".example-group .card");
  await expect(cards).toHaveCount(16);
  expect(await cards.evaluateAll((elements) => elements.map((element) => element.getAttribute("aria-label")))).toEqual(examples.map(([, name]) => name));
  expect(await page.evaluate(() => {
    const ids = [...document.querySelectorAll("[id]")].map((element) => element.id);
    return ids.filter((id, index) => ids.indexOf(id) !== index);
  })).toEqual([]);
});

for (const [id, name] of examples) {
  test(`${name} opens from its named card and dismisses`, async ({ page }) => {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(page.locator(`#${id}`)).toHaveAttribute("data-sheet-state", "open");
    await expect(page.getByRole("dialog", { name, exact: true })).toBeVisible();
    const brokenImages = await page.locator(`#${id}-content img`).evaluateAll(async (images) => {
      await Promise.all(images.map((image) => image.decode()));
      return images.filter((image) => image.naturalWidth === 0).length;
    });
    expect(brokenImages).toBe(0);
    await page.keyboard.press("Escape");
    await expect(page.locator(`#${id}`)).toHaveAttribute("data-sheet-state", "closed");
    await expect(page.locator("#page")).not.toHaveAttribute("inert", "");
    expect(await page.evaluate(() => document.body.style.position)).toBe("");
  });
}

test("Lightbox changes images, wraps, zooms, and resets on reopen", async ({ page }) => {
  await page.evaluate(() => window.lab.get("lightbox").open({ immediate: true }));
  await page.getByRole("button", { name: "Next image" }).click();
  await expect(page.locator("[data-lightbox-caption]")).toHaveText("Desert Light");
  await expect(page.locator("[data-lightbox-image]")).toHaveAttribute("src", /desert\.svg$/);
  await page.getByRole("button", { name: "Zoom image" }).click();
  await expect(page.locator(".lightbox-viewer")).toHaveAttribute("data-zoomed", "");
  await expect(page.getByRole("button", { name: "Reset image zoom" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Previous image" }).click();
  await page.getByRole("button", { name: "Previous image" }).click();
  await expect(page.locator("[data-lightbox-caption]")).toHaveText("Coastal Calm");
  await expect(page.locator(".lightbox-viewer")).not.toHaveAttribute("data-zoomed", "");
  await page.evaluate(async () => { await window.lab.get("lightbox").close({ immediate: true }); await window.lab.get("lightbox").open({ immediate: true }); });
  await expect(page.locator("[data-lightbox-caption]")).toHaveText("Alpine Morning");
});

test("Toast leaves focus in place, pauses on focus, and automatically dismisses", async ({ page }) => {
  await page.clock.install();
  await page.getByRole("button", { name: "Toast", exact: true }).focus();
  await page.evaluate(() => window.lab.get("toast").open({ immediate: true }));
  await expect(page.getByRole("button", { name: "Toast", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Dismiss Toast" }).focus();
  await page.clock.runFor(8000);
  await expect(page.locator("#toast")).toHaveAttribute("data-sheet-state", "open");
  await page.getByRole("button", { name: "Toast", exact: true }).focus();
  await page.clock.runFor(8500);
  await expect(page.locator("#toast")).toHaveAttribute("data-sheet-state", "closed");
});

test("depth demo recedes through three layers while stacking stays unscaled", async ({ page }) => {
  await page.evaluate(() => window.lab.get("depth").open({ immediate: true }));
  await page.waitForFunction(() => window.lab.get("depth-child"));
  await page.evaluate(() => window.lab.get("depth-child").open({ immediate: true }));
  expect(await page.locator("#depth-content").evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).a)).toBeLessThan(1);
  await page.waitForFunction(() => window.lab.get("depth-third"));
  await page.getByRole("button", { name: "Open a third layer" }).click();
  await expect(page.locator("#depth-third")).toHaveAttribute("data-sheet-state", "open");
  await page.keyboard.press("Escape");
  await expect(page.locator("#depth-third")).toHaveAttribute("data-sheet-state", "closed");
  await expect(page.locator("#depth-child")).toHaveAttribute("data-sheet-state", "open");
  await page.evaluate(async () => {
    await window.lab.get("depth-child").close({ immediate: true });
    await window.lab.get("depth").close({ immediate: true });
    await window.lab.get("stacked").open({ immediate: true });
  });
  await page.waitForFunction(() => window.lab.get("child"));
  await page.evaluate(() => window.lab.get("child").open({ immediate: true }));
  expect(await page.locator("#stacked-content").evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).a)).toBe(1);
});

test("depth layers stay attached to the bottom while other layers open and close", async ({ page }) => {
  await page.evaluate(() => window.lab.get("depth").open({ immediate: true }));
  for (const [id, action, behind] of [
    ["depth-child", "open", ["depth"]],
    ["depth-third", "open", ["depth", "depth-child"]],
    ["depth-third", "close", ["depth", "depth-child"]],
    ["depth-child", "close", ["depth"]]
  ]) {
    await page.waitForFunction((id) => window.lab.get(id), id);
    const samples = await page.evaluate(async ({ id, action, behind }) => {
      const sheet = window.lab.get(id);
      const samples = [];
      const measure = () => {
        for (const layerId of behind) {
          const layer = window.lab.get(layerId);
          samples.push(Math.abs(layer.view.getBoundingClientRect().bottom - layer.content.getBoundingClientRect().bottom));
        }
      };
      sheet.root.addEventListener("sheet:progress", measure);
      try {
        await sheet[action]();
        measure();
      } finally {
        sheet.root.removeEventListener("sheet:progress", measure);
      }
      return samples;
    }, { id, action, behind });
    expect(samples.length).toBeGreaterThan(2);
    expect(Math.max(...samples), `${id} ${action}: background sheet bottom gap`).toBeLessThan(1);
  }
});

test("Parallax Page moves two layers and cleans up on close and Turbo navigation", async ({ page }) => {
  await page.evaluate(() => window.lab.get("parallax").open({ immediate: true }));
  await expect(page.locator("#page")).toHaveAttribute("data-parallax-active", "");
  expect(await page.locator("#page").evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).m41)).toBeLessThan(-50);
  await page.locator("#parallax-content [data-sheet-body]").evaluate((element) => element.scrollTop = 200);
  await expect.poll(() => page.locator(".parallax-cover > img").evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).m42)).toBeGreaterThan(0);
  await page.evaluate(() => window.lab.get("parallax").close({ immediate: true }));
  await expect(page.locator("#page")).not.toHaveAttribute("data-parallax-active", "");
  await page.evaluate(async () => { await window.lab.get("parallax").open({ immediate: true }); window.lab.Turbo.visit("/regression/next"); });
  await expect(page).toHaveURL(/\/next$/);
  await page.waitForFunction(() => window.lab.get("parallax")?.state === "closed");
  await expect(page.locator("#page")).not.toHaveAttribute("data-parallax-active", "");
});

test("Long Sheet and full-page examples provide real scrollable content", async ({ page }) => {
  for (const id of ["long", "page-sheet", "page-bottom", "parallax"]) {
    await page.evaluate((id) => window.lab.get(id).open({ immediate: true }), id);
    const dimensions = await page.locator(`#${id}-content [data-sheet-body]`).evaluate((element) => ({ scroll: element.scrollHeight, height: element.clientHeight }));
    expect(dimensions.scroll).toBeGreaterThan(dimensions.height * 1.5);
    const panel = await page.locator(`#${id}-content`).boundingBox();
    expect(Math.abs(panel.height - page.viewportSize().height)).toBeLessThan(2);
    await page.evaluate((id) => window.lab.get(id).close({ immediate: true }), id);
  }
});

test("new modal examples have no axe A/AA accessibility violations", async ({ page }) => {
  for (const id of ["detached", "card", "lightbox", "page-sheet"]) {
    await page.evaluate((id) => window.lab.get(id).open({ immediate: true }), id);
    const scan = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(scan.violations).toEqual([]);
    await page.evaluate((id) => window.lab.get(id).close({ immediate: true }), id);
  }
});
