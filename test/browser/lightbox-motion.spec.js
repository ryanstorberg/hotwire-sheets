import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.lab?.get("lightbox"));
  await page.locator(".lightbox-image").evaluate(image => image.decode());
});

test("Lightbox fades stationary chrome while its opaque image slides vertically", async ({ page }) => {
  const samples = await page.evaluate(async () => {
    const sheet = window.lab.get("lightbox"), samples = [];
    const image = sheet.content.querySelector(".lightbox-image");
    const comments = sheet.content.querySelector(".comments");
    const backdrop = sheet.view.querySelector("[data-sheet-backdrop]");
    for (const action of ["open", "close"]) {
      let done = false;
      const operation = sheet[action]().then(() => { done = true; });
      while (!done) {
        await new Promise(requestAnimationFrame);
        if (!sheet.isOpen) continue;
        const rect = sheet.content.getBoundingClientRect();
        samples.push({ action, shell: [rect.x, rect.y, rect.width, rect.height],
          backdropY: backdrop.getBoundingClientRect().y, backdropOpacity: Number(getComputedStyle(backdrop).opacity),
          commentsY: comments.getBoundingClientRect().y, commentsOpacity: Number(getComputedStyle(comments).opacity),
          closeY: sheet.content.querySelector(".dismiss").getBoundingClientRect().y,
          imageY: image.getBoundingClientRect().y, imageOpacity: Number(getComputedStyle(image).opacity),
          shellOpacity: Number(getComputedStyle(sheet.content).opacity) });
      }
      await operation;
    }
    return samples;
  });
  const { width, height } = page.viewportSize();
  for (const sample of samples) {
    expect(Math.abs(sample.shell[0])).toBeLessThan(1);
    expect(Math.abs(sample.shell[1])).toBeLessThan(1);
    expect(sample.shell[2]).toBeCloseTo(width, 0);
    expect(sample.shell[3]).toBeCloseTo(height, 0);
    expect(sample.backdropY).toBeCloseTo(0, 0);
    expect(sample.commentsY).toBeCloseTo(0, 0);
    expect(sample.closeY).toBeCloseTo(10, 0);
    expect(sample.imageOpacity).toBe(1);
    expect(sample.shellOpacity).toBe(1);
  }
  for (const action of ["open", "close"]) {
    const frames = samples.filter(s => s.action === action);
    expect(frames.some(s => s.backdropOpacity > .1 && s.backdropOpacity < .9)).toBe(true);
    expect(frames.some(s => s.commentsOpacity > .1 && s.commentsOpacity < .9)).toBe(true);
    const displacement = frames.at(-1).imageY - frames[0].imageY;
    expect(action === "open" ? -displacement : displacement).toBeGreaterThan(height * .5);
  }
});

test("the image, backdrop, and visible chrome animate without the JS frame observer", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const sheet = window.lab.get("lightbox"), image = sheet.content.querySelector(".lightbox-image");
    const comments = sheet.content.querySelector(innerWidth < 1000 ? ".comments-trigger" : ".comments"), backdrop = sheet.view.querySelector("[data-sheet-backdrop]");
    const opened = sheet.open();
    cancelAnimationFrame(sheet.animator.frame);
    const initial = image.getBoundingClientRect().y;
    await new Promise(resolve => setTimeout(resolve, 180));
    const result = { initial, after: image.getBoundingClientRect().y,
      shellY: sheet.content.getBoundingClientRect().y, position: sheet.position,
      backdropOpacity: Number(getComputedStyle(backdrop).opacity), commentsOpacity: Number(getComputedStyle(comments).opacity) };
    return { ...result, completed: await opened };
  });
  expect(result.shellY).toBeCloseTo(0, 0);
  expect(result.after).toBeLessThan(result.initial - 20);
  expect(result.position).toBe(0);
  expect(result.backdropOpacity).toBeGreaterThan(.1);
  expect(result.commentsOpacity).toBeGreaterThan(.1);
  expect(result.completed).toBe(true);
});

test("split Lightbox motion survives interruption, fallback, reduced motion, and resizing", async ({ page }) => {
  const interrupted = await page.evaluate(async () => {
    const sheet = window.lab.get("lightbox"), stage = sheet.content.querySelector(".lightbox-stage");
    const opened = sheet.open();
    await new Promise(resolve => setTimeout(resolve, 150));
    const animations = stage.getAnimations();
    for (const animation of animations) animation.pause();
    await Promise.all(animations.map(animation => animation.ready));
    const before = stage.getBoundingClientRect().y;
    const closed = sheet.close();
    const after = stage.getBoundingClientRect().y;
    return { jump: Math.abs(after - before), opened: await opened, closed: await closed };
  });
  expect(interrupted).toMatchObject({ opened: false, closed: true });
  expect(interrupted.jump).toBeLessThan(3);
  await page.evaluate(async () => {
    const sheet = window.lab.get("lightbox"), stage = sheet.content.querySelector(".lightbox-stage");
    stage.animate = undefined;
    await sheet.open();
    await sheet.close();
    delete stage.animate;
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => window.lab.get("lightbox").open());
  await page.setViewportSize({ width: 600, height: 750 });
  await expect.poll(() => page.locator("#lightbox-content").evaluate(el => el.getBoundingClientRect().height)).toBe(750);
  expect((await page.locator("#lightbox-content").boundingBox()).y).toBeCloseTo(0, 0);
  await page.locator("#lightbox-content").getByRole("button", { name: "Dismiss Sheet", exact: true }).click();
  await expect(page.locator("#lightbox")).toHaveAttribute("data-sheet-state", "closed");
  expect(await page.evaluate(() => document.body.style.position)).toBe("");
});
