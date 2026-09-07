import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/regression");
  await page.waitForFunction(() => window.lab?.get("basic"));
});

async function nativeSheet(page, edge = "bottom", options = {}) {
  await page.evaluate(({ edge, options }) => {
    const root = document.getElementById("detents"), previous = window.lab.get("detents");
    previous.destroy();
    new window.lab.Sheet(root, { edge, detents: [.35, .65, .95], scrollSnap: true, ...options });
  }, { edge, options });
}

test("WAAPI moves transform and opacity without the JavaScript frame observer", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const sheet = window.lab.get("basic");
    const finished = sheet.open();
    cancelAnimationFrame(sheet.animator.frame);
    const initial = sheet.content.getBoundingClientRect().top;
    const animations = sheet.content.getAnimations().map(animation => animation.id);
    await new Promise(resolve => setTimeout(resolve, 180));
    const after = sheet.content.getBoundingClientRect().top, position = sheet.position;
    return { initial, after, position, animations, completed: await finished };
  });
  const panel = page.locator("#basic-content");
  expect(result.animations).toContain("hotwire-sheet-surface");
  expect(result.after).toBeLessThan(result.initial - 20);
  expect(result.position).toBe(0);
  expect(result.completed).toBe(true);
  await expect(page.locator("#basic")).toHaveAttribute("data-sheet-state", "open");
  expect(await panel.evaluate(el => el.getAnimations().length)).toBe(0);
});

test("native wheel input expands a sheet and draggable false blocks boundary movement", async ({ page, isMobile }) => {
  test.skip(isMobile, "Mobile WebKit does not expose browser mouse wheel input.");
  await nativeSheet(page, "bottom", { handleOnly: true });
  await page.evaluate(() => window.lab.get("detents").open({ immediate: true }));
  const handle = page.locator("#detents-content [data-sheet-handle]");
  const rect = await handle.boundingBox();
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.mouse.wheel(0, 250);
  await expect.poll(() => page.evaluate(() => window.lab.get("detents").detent)).toBeGreaterThan(0);
  await page.evaluate(() => window.lab.get("detents").close({ immediate: true }));
  await nativeSheet(page, "bottom", { draggable: false });
  await page.evaluate(() => window.lab.get("detents").open({ immediate: true }));
  const other = await handle.boundingBox();
  await page.mouse.move(other.x + other.width / 2, other.y + other.height / 2);
  const before = await page.evaluate(() => window.lab.get("detents").view.scrollTop);
  await page.mouse.wheel(0, 250);
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.lab.get("detents").view.scrollTop)).toBe(before);
});

test("native nondismissible snap omits the closed marker and remeasures detents", async ({ page }) => {
  await nativeSheet(page, "bottom", { dismissible: false });
  await page.evaluate(() => window.lab.get("detents").open({ immediate: true, detent: 1 }));
  await expect(page.locator('[data-sheet-snap-point="0"]')).toHaveCount(0);
  await page.setViewportSize({ width: 500, height: 600 });
  await expect.poll(() => page.evaluate(() => window.lab.get("detents").points[1])).toBe(390);
  await expect.poll(() => page.evaluate(() => window.lab.get("detents").view.scrollTop)).toBe(390);
  await page.evaluate(() => window.lab.get("detents").close());
  await expect(page.locator("#detents")).toHaveAttribute("data-sheet-state", "closed");
});

test("WAAPI cancellation hands its current position to a new transition", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const sheet = window.lab.get("basic");
    const opened = sheet.open();
    await new Promise(resolve => setTimeout(resolve, 150));
    const before = sheet.content.getBoundingClientRect().top;
    const closed = sheet.close();
    const after = sheet.content.getBoundingClientRect().top;
    return { opened: await opened, closed: await closed, jump: Math.abs(before - after), animations: sheet.content.getAnimations().length };
  });
  expect(result.opened).toBe(false);
  expect(result.closed).toBe(true);
  expect(result.jump).toBeLessThan(3);
  expect(result.animations).toBe(0);
});

test("a progress listener can interrupt WAAPI playback without orphaning its replacement", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const sheet = window.lab.get("basic");
    let replacement, triggered = false;
    sheet.root.addEventListener("sheet:progress", event => {
      if (!triggered && event.detail.progress > .3) {
        triggered = true;
        replacement = sheet.close();
      }
    });
    const opened = await sheet.open();
    return { opened, closed: await replacement, state: sheet.state, animations: sheet.content.getAnimations().length };
  });
  expect(result).toEqual({ opened: false, closed: true, state: "closed", animations: 0 });
});

test("native nested sheets preserve depth, focus, and modal cleanup", async ({ page }) => {
  await nativeSheet(page, "bottom", { stackEffect: true });
  await page.evaluate(async () => {
    const parent = window.lab.get("detents");
    await parent.open({ immediate: true, detent: 2 });
    parent.content.querySelector("[data-sheet-handle]").focus();
    const child = window.lab.get("basic"), root = child.root;
    child.destroy();
    await new window.lab.Sheet(root, { scrollSnap: true }).open();
  });
  const scale = await page.locator("#detents-content").evaluate(el => new DOMMatrix(getComputedStyle(el).transform).a);
  expect(scale).toBeCloseTo(.965, 3);
  await page.keyboard.press("Escape");
  await expect(page.locator("#basic")).toHaveAttribute("data-sheet-state", "closed");
  await expect(page.locator("#detents-content [data-sheet-handle]")).toBeFocused();
  expect(await page.evaluate(() => document.body.style.position)).toBe("fixed");
  await page.keyboard.press("Escape");
  await expect(page.locator("#detents")).toHaveAttribute("data-sheet-state", "closed");
  expect(await page.evaluate(() => document.body.style.position)).toBe("");
});

test("WAAPI resize finishes at the new viewport anchor without leaving an animation", async ({ page }) => {
  await page.evaluate(() => {
    const sheet = window.lab.get("detents");
    window.resizingOpen = sheet.open({ detent: 2 });
  });
  await page.setViewportSize({ width: 500, height: 600 });
  expect(await page.evaluate(() => window.resizingOpen)).toBe(true);
  await expect(page.locator("#detents")).toHaveAttribute("data-sheet-state", "open");
  await expect.poll(() => page.evaluate(() => window.lab.get("detents").viewport.height)).toBe(600);
  expect(await page.evaluate(() => Math.abs(window.lab.get("detents").content.getBoundingClientRect().bottom - 600))).toBeLessThan(1);
  expect(await page.locator("#detents-content").evaluate(el => el.getAnimations().length)).toBe(0);
});

test("frame fallback completes when WAAPI is unavailable or explicitly disabled", async ({ page }) => {
  for (const unavailable of [true, false]) {
    const result = await page.evaluate(async unavailable => {
      const root = document.getElementById("basic"), old = window.lab.get("basic");
      old.destroy();
      const sheet = new window.lab.Sheet(root, { animation: unavailable ? "waapi" : "raf" });
      if (unavailable) sheet.content.animate = undefined;
      else delete sheet.content.animate;
      const completed = await sheet.open();
      const animations = sheet.content.getAnimations().length;
      await sheet.close();
      return { completed, animations };
    }, unavailable);
    expect(result.completed).toBe(true);
    expect(result.animations).toBe(0);
  }
});

test("native CSS snap detents physically scroll sheets on all four edges", async ({ page }) => {
  for (const edge of ["bottom", "top", "left", "right"]) {
    await nativeSheet(page, edge);
    await page.evaluate(() => window.lab.get("detents").open({ detent: 1 }));
    const result = await page.evaluate(() => {
      const sheet = window.lab.get("detents"), rect = sheet.content.getBoundingClientRect(), view = sheet.view.getBoundingClientRect();
      return { snap: getComputedStyle(sheet.view).scrollSnapType, offset: sheet.nativeMotion.offset, position: sheet.position,
        visible: sheet.axis === "y" ? (sheet.sign > 0 ? view.bottom - rect.top : rect.bottom - view.top) : (sheet.sign > 0 ? view.right - rect.left : rect.right - view.left), point: sheet.points[1] };
    });
    // CSSOM may omit proximity because it is the default strictness.
    const axis = ["top", "bottom"].includes(edge) ? "y" : "x";
    expect([axis, `${axis} proximity`]).toContain(result.snap);
    expect(result.offset).toBeGreaterThan(0);
    expect(Math.abs(result.visible - result.point)).toBeLessThan(1);
    await page.evaluate(() => window.lab.get("detents").snapTo(2));
    expect(await page.evaluate(() => window.lab.get("detents").detent)).toBe(2);
    await page.evaluate(() => window.lab.get("detents").close());
    await expect(page.locator("#detents")).toHaveAttribute("data-sheet-state", "closed");
  }
});

test("CSS snap selects a real detent after a scroll ending between markers", async ({ page }) => {
  await nativeSheet(page);
  await page.evaluate(() => window.lab.get("detents").open({ immediate: true }));
  await page.evaluate(() => {
    const sheet = window.lab.get("detents");
    sheet.view.scrollTo({ top: sheet.points[1] + 10, behavior: "smooth" });
  });
  await expect.poll(() => page.evaluate(() => window.lab.get("detents").detent)).toBe(1);
  await expect(page.locator("#detents")).toHaveAttribute("data-sheet-state", "open");
  expect(await page.evaluate(() => Math.abs(window.lab.get("detents").view.scrollTop - window.lab.get("detents").points[1]))).toBeLessThan(1);
});

test("native snap honors vetoed dismissal, reduced motion, and teardown", async ({ page }) => {
  await nativeSheet(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => window.lab.get("detents").open());
  await page.evaluate(() => {
    const sheet = window.lab.get("detents");
    sheet.root.addEventListener("sheet:before-close", event => event.preventDefault(), { once: true });
    sheet.view.scrollTo({ top: 0, behavior: "instant" });
  });
  await expect.poll(() => page.evaluate(() => window.lab.get("detents").view.scrollTop)).toBeCloseTo(page.viewportSize().height * .35, 0);
  await page.evaluate(() => window.lab.get("detents").destroy());
  await expect(page.locator("[data-sheet-snap-track], [data-sheet-snap-point]")).toHaveCount(0);
  expect(await page.evaluate(() => document.body.style.position)).toBe("");
});
