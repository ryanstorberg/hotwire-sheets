import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.lab?.get("parallax-child"));
  await page.evaluate(() => document.fonts.ready);
});

test("parallax pages crossfade their headers in place while only the articles translate", async ({ page }) => {
  const samples = await page.evaluate(async () => {
    const samples = [];
    for (const [id, action] of [["parallax", "open"], ["parallax-child", "open"], ["parallax-child", "close"], ["parallax", "close"]]) {
      const sheet = window.lab.get(id);
      let done = false;
      const operation = sheet[action]().then(() => { done = true; });
      while (!done) {
        await new Promise(requestAnimationFrame);
        if (!sheet.isOpen) continue;
        const header = sheet.content.querySelector(".parallax-bar"), body = sheet.content.querySelector(".article-scroll");
        const rect = header.getBoundingClientRect();
        samples.push({ id, action, x: rect.x, y: rect.y, width: rect.width,
          opacity: Number(getComputedStyle(header).opacity), bodyX: body.getBoundingClientRect().x,
          parentHeaderX: document.querySelector("#parallax-content .parallax-bar").getBoundingClientRect().x,
          galleryHeaderX: document.querySelector(".gallery-bar").getBoundingClientRect().x });
      }
      await operation;
    }
    return samples;
  });
  for (const sample of samples) {
    expect(Math.abs(sample.x)).toBeLessThan(1);
    expect(Math.abs(sample.y)).toBeLessThan(1);
    expect(sample.width).toBeCloseTo(page.viewportSize().width, 0);
    expect(Math.abs(sample.galleryHeaderX)).toBeLessThan(1);
    if (sample.id === "parallax-child") expect(Math.abs(sample.parentHeaderX)).toBeLessThan(1);
  }
  expect(samples.some(s => s.opacity > .15 && s.opacity < .85 && s.bodyX > 20)).toBe(true);
  const titles = await page.locator(".parallax-bar span").allTextContents();
  expect(new Set(titles).size).toBe(2);
});

test("the parallax article uses WAAPI independently of the fixed header", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const sheet = window.lab.get("parallax");
    const done = sheet.open();
    cancelAnimationFrame(sheet.animator.frame);
    const body = sheet.content.querySelector(".article-scroll"), header = sheet.content.querySelector(".parallax-bar");
    const initial = body.getBoundingClientRect().x;
    const animations = body.getAnimations().map(animation => animation.id);
    await new Promise(resolve => setTimeout(resolve, 180));
    const after = body.getBoundingClientRect().x, headerX = header.getBoundingClientRect().x;
    return { initial, after, headerX, animations, completed: await done };
  });
  expect(result.animations).toContain("hotwire-sheet-surface");
  expect(result.after).toBeLessThan(result.initial - 20);
  expect(Math.abs(result.headerX)).toBeLessThan(1);
  expect(result.completed).toBe(true);
});

test("nested parallax keeps the back control, reading position, and header anchor through a canceled swipe", async ({ page, isMobile }) => {
  test.skip(isMobile, "This scenario exercises real mouse dragging");
  await page.evaluate(() => window.lab.get("parallax").open({ immediate: true }));
  await page.locator("#parallax-content").getByRole("button", { name: "Parallax Page", exact: true }).click();
  await expect(page.locator("#parallax-child")).toHaveAttribute("data-sheet-state", "open");
  const parentBody = page.locator("#parallax-content [data-sheet-body]");
  const readingPosition = await parentBody.evaluate(el => el.scrollTop);
  const { width } = page.viewportSize();
  await page.mouse.move(width * .2, 200);
  await page.mouse.down();
  await page.mouse.move(width * .5, 200, { steps: 8 });
  for (const id of ["parallax", "parallax-child"]) {
    const rect = await page.locator(`#${id}-content .parallax-bar`).boundingBox();
    expect(Math.abs(rect.x)).toBeLessThan(1);
    expect(Math.abs(rect.y)).toBeLessThan(1);
  }
  await page.waitForTimeout(120);
  await page.mouse.up();
  await expect(page.locator("#parallax-child")).toHaveAttribute("data-sheet-state", "open");
  const back = page.locator("#parallax-child-content").getByRole("button", { name: "Back", exact: true });
  await back.click();
  await expect(page.locator("#parallax-child")).toHaveAttribute("data-sheet-state", "closed");
  expect(await parentBody.evaluate(el => el.scrollTop)).toBeCloseTo(readingPosition, 0);
  await expect(page.locator("#parallax-content").getByRole("button", { name: "Parallax Page", exact: true })).toBeFocused();
});

test("interrupting article playback preserves its displayed position and fixed header", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const sheet = window.lab.get("parallax"), body = sheet.content.querySelector(".article-scroll");
    const opened = sheet.open();
    await new Promise(resolve => setTimeout(resolve, 150));
    // Compare the same presented frame. WebKit can otherwise advance the
    // compositor between the two geometry reads during a busy browser run.
    const animations = body.getAnimations();
    for (const animation of animations) animation.pause();
    await Promise.all(animations.map(animation => animation.ready));
    const before = body.getBoundingClientRect().x;
    const closed = sheet.close();
    const after = body.getBoundingClientRect().x;
    const headerX = sheet.content.querySelector(".parallax-bar").getBoundingClientRect().x;
    return { opened: await opened, closed: await closed, jump: Math.abs(before - after), headerX };
  });
  expect(result.opened).toBe(false);
  expect(result.closed).toBe(true);
  expect(result.jump).toBeLessThan(3);
  expect(Math.abs(result.headerX)).toBeLessThan(1);
});

test("fixed headers survive fallback motion, reduced motion, resize, and Turbo cleanup", async ({ page }) => {
  await page.evaluate(async () => {
    const sheet = window.lab.get("parallax"), body = sheet.content.querySelector(".article-scroll");
    body.animate = undefined;
    await sheet.open();
  });
  expect((await page.locator("#parallax-content .parallax-bar").boundingBox()).x).toBeCloseTo(0, 0);
  expect((await page.locator("#parallax-content .article-scroll").boundingBox()).x).toBeCloseTo(0, 0);
  await page.evaluate(async () => {
    const sheet = window.lab.get("parallax");
    await sheet.close();
    delete sheet.content.querySelector(".article-scroll").animate;
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(async () => {
    await window.lab.get("parallax").open();
    await window.lab.get("parallax-child").open();
  });
  await page.setViewportSize({ width: 530, height: 720 });
  for (const id of ["parallax", "parallax-child"]) {
    const header = page.locator(`#${id}-content .parallax-bar`);
    await expect.poll(() => header.evaluate(el => Math.round(el.getBoundingClientRect().width))).toBe(530);
    expect((await header.boundingBox()).x).toBeCloseTo(0, 0);
  }
  await page.evaluate(() => window.lab.Turbo.visit("/next"));
  await expect(page).toHaveURL(/\/next$/);
  await expect(page.locator(".parallax-bar:visible")).toHaveCount(0);
  await expect(page.locator("[data-gallery-parallax]")).toHaveCount(0);
  expect(await page.evaluate(() => document.body.style.position)).toBe("");
});
