import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  page.on("pageerror", error => { throw error; });
  await page.goto("/");
  await page.waitForFunction(() => window.lab?.get("depth"));
});

for (const location of ["top", "middle", "bottom"]) {
  test(`the root page remains visibly stacked when depth opens from the ${location} of the gallery`, async ({ page }) => {
    const result = await page.evaluate(async location => {
      const gallery = document.getElementById("page"), sheet = window.lab.get("depth");
      const max = document.documentElement.scrollHeight - innerHeight;
      window.scrollTo(0, location === "bottom" ? max : location === "middle" ? max / 2 : 0);
      const scroll = window.scrollY, originalHeight = gallery.offsetHeight;
      const trigger = document.querySelector('[data-sheet-open="depth"]');
      trigger.focus({ preventScroll: true });
      const frames = [];
      const record = () => {
        const root = gallery.getBoundingClientRect(), front = sheet.content.getBoundingClientRect();
        frames.push({ rootTop: root.top, rootBottom: root.bottom, frontTop: front.top, progress: sheet.progress });
      };
      sheet.root.addEventListener("sheet:progress", record);
      await sheet.open();
      sheet.root.removeEventListener("sheet:progress", record);
      const root = gallery.getBoundingClientRect().toJSON(), front = sheet.content.getBoundingClientRect().toJSON();
      const innerScroll = gallery.scrollTop;
      const header = gallery.querySelector(".gallery-bar").getBoundingClientRect().toJSON();
      const background = getComputedStyle(gallery).backgroundColor;
      await sheet.close();
      return { scroll, originalHeight, root, front, innerScroll, header, background, frames,
        after: { scroll: window.scrollY, height: gallery.offsetHeight, innerScroll: gallery.scrollTop,
          fixed: getComputedStyle(gallery).position, transform: getComputedStyle(gallery).transform,
          focused: document.activeElement === trigger, locked: document.body.style.position } };
    }, location);
    const { width, height } = page.viewportSize();
    expect(result.root.y).toBeCloseTo(height * .013, 0);
    expect(result.front.y).toBeCloseTo(height * .026, 0);
    expect(result.root.width).toBeCloseTo(width * .91, 0);
    expect(result.root.height).toBeCloseTo(height * .91, 0);
    expect(result.front.y - result.root.y).toBeGreaterThan(7);
    expect(result.innerScroll).toBeCloseTo(result.scroll, 0);
    expect(result.header.y).toBeCloseTo(result.root.y, 0);
    expect(result.background).toBe("rgb(255, 255, 255)");
    expect(result.frames.every(frame => frame.rootTop <= frame.frontTop + 1)).toBe(true);
    expect(result.after.scroll).toBeCloseTo(result.scroll, 0);
    expect(result.after.height).toBe(result.originalHeight);
    expect(result.after.innerScroll).toBe(0);
    expect(result.after.fixed).toBe("static");
    expect(result.after.transform).toBe("none");
    expect(result.after.focused).toBe(true);
    expect(result.after.locked).toBe("");
    await expect(page.locator("[data-gallery-depth-placeholder]")).toHaveCount(0);
  });
}

test("the root depth layer survives nesting and viewport changes then restores scrolling", async ({ page }) => {
  await page.getByRole("button", { name: "Sheet with Depth", exact: true }).click();
  await expect(page.locator("#depth")).toHaveAttribute("data-sheet-state", "open");
  await page.evaluate(async () => {
    for (const id of ["depth-child", "depth-third"]) await window.lab.get(id).open({ immediate: true });
  });
  await expect(page.locator("[data-gallery-depth-placeholder]")).toHaveCount(1);
  const original = page.viewportSize();
  await page.setViewportSize({ width: original.width > 700 ? 600 : 1000, height: original.height - 100 });
  await expect.poll(() => page.locator("#page").evaluate(el => el.getBoundingClientRect().height)).toBeCloseTo((original.height - 100) * .91, 0);
  for (const id of ["depth-third", "depth-child"]) await page.evaluate(id => window.lab.get(id).close(), id);
  const layer = await page.evaluate(() => ({ root: document.getElementById("page").getBoundingClientRect().top,
    front: document.getElementById("depth-content").getBoundingClientRect().top }));
  expect(layer.front - layer.root).toBeGreaterThan(5);
  await page.evaluate(() => window.lab.get("depth").close());
  await expect(page.locator("[data-gallery-depth-placeholder]")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeGreaterThan(page.viewportSize().height);
  expect(await page.evaluate(() => document.body.style.position)).toBe("");
});

test("an interrupted root depth animation and Turbo navigation release the viewport layer", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const sheet = window.lab.get("depth");
    const opening = sheet.open();
    await new Promise(resolve => setTimeout(resolve, 120));
    const closing = sheet.close();
    await new Promise(resolve => setTimeout(resolve, 120));
    const reopening = sheet.open();
    return { opened: await opening, closed: await closing, reopened: await reopening };
  });
  expect(result).toEqual({ opened: false, closed: false, reopened: true });
  await expect(page.locator("[data-gallery-depth-placeholder]")).toHaveCount(1);
  await page.evaluate(() => window.lab.Turbo.visit("/next"));
  await expect(page).toHaveURL(/\/next$/);
  await expect(page.locator("#page")).not.toHaveAttribute("data-gallery-depth", "");
  await expect(page.locator("[data-gallery-depth-placeholder]")).toHaveCount(0);
  expect(await page.evaluate(() => document.body.style.position)).toBe("");
});
