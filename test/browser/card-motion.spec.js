import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.lab?.get("card"));
  await page.locator(".card-image").evaluate(image => image.decode());
  await page.evaluate(() => document.fonts.ready);
});

test("Card enters and leaves through the top, scaling while only its backdrop fades", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const sheet = window.lab.get("card"), backdrop = sheet.view.querySelector("[data-sheet-backdrop]");
    const samples = [];
    const sample = action => {
      if (sheet.view.hidden) return;
      const rect = sheet.content.getBoundingClientRect(), style = getComputedStyle(sheet.content);
      samples.push({ action, top: rect.top, bottom: rect.bottom, center: (rect.left + rect.right) / 2,
        scale: new DOMMatrix(style.transform).a, opacity: Number(style.opacity),
        backdrop: Number(getComputedStyle(backdrop).opacity) });
    };
    for (const action of ["open", "close"]) {
      let done = false;
      const operation = sheet[action]().then(() => { done = true; });
      sample(action);
      while (!done) { await new Promise(requestAnimationFrame); sample(action); }
      await operation;
    }
    return { samples, width: innerWidth, height: innerHeight };
  });
  for (const sample of result.samples) {
    expect(sample.opacity).toBe(1);
    expect(sample.center).toBeCloseTo(result.width / 2, 0);
    expect(sample.scale).toBeGreaterThanOrEqual(.799);
    expect(sample.scale).toBeLessThanOrEqual(1.001);
  }
  const entrance = result.samples.filter(s => s.action === "open");
  const exit = result.samples.filter(s => s.action === "close");
  expect(entrance[0].bottom).toBeLessThanOrEqual(1);
  expect(entrance[0].scale).toBeCloseTo(.8, 2);
  expect(entrance.at(-1).scale).toBeCloseTo(1, 2);
  expect((entrance.at(-1).top + entrance.at(-1).bottom) / 2).toBeCloseTo(result.height / 2, 0);
  expect(exit.at(-1).bottom).toBeLessThanOrEqual(1);
  expect(exit.at(-1).scale).toBeLessThan(.81);
  for (const frames of [entrance, exit]) expect(frames.some(s => s.backdrop > .1 && s.backdrop < .9)).toBe(true);
});

test("Card stays centered after a downward pull and still closes upward with reduced motion", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const sheet = window.lab.get("card");
    await sheet.open({ immediate: true });
    const before = sheet.content.getBoundingClientRect().top;
    const target = sheet.view.querySelector("[data-sheet-backdrop]");
    for (const [type, y] of [["pointerdown", 100], ["pointermove", 400], ["pointerup", 400]]) {
      target.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true,
        pointerId: 9, pointerType: "pen", isPrimary: true, button: 0, clientX: 5, clientY: y }));
    }
    return before;
  });
  await expect(page.locator("#card")).toHaveAttribute("data-sheet-state", "open");
  expect((await page.locator("#card-content").boundingBox()).y).toBeCloseTo(result, 0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator("#card-content").getByRole("button", { name: "Dismiss Sheet", exact: true }).click();
  await expect(page.locator("#card")).toHaveAttribute("data-sheet-state", "closed");
  expect(await page.evaluate(() => document.body.style.position)).toBe("");
});
