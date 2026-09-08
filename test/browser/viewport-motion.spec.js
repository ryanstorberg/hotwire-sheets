import { test, expect } from "@playwright/test";

for (const backend of ["waapi", "raf", "snap-waapi"]) test(`${backend}: viewport changes preserve an in-flight entrance and exit`, async ({ page }) => {
  await page.goto("/regression");
  await page.waitForFunction(() => window.lab?.get("basic"));
  await page.evaluate(backend => {
    const old = window.lab.get("basic"), root = old.root;
    old.destroy();
    window.resizingSheet = new window.lab.Sheet(root, {
      detents: [1], animation: backend === "raf" ? "raf" : "waapi", scrollSnap: backend === "snap-waapi",
      enteringAnimationSettings: { duration: 700, easing: "linear" },
      exitingAnimationSettings: { duration: 700, easing: "linear" }
    });
  }, backend);
  for (const action of ["open", "close"]) {
    await page.evaluate(action => { window.resizingResult = window.resizingSheet[action](); }, action);
    await expect.poll(() => page.evaluate(() => window.resizingSheet.progress)).toBeGreaterThan(.05);
    await page.waitForTimeout(100);
    const before = await page.evaluate(() => window.resizingSheet.progress);
    const viewport = page.viewportSize();
    await page.setViewportSize({ width: viewport.width, height: viewport.height + 40 });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const after = await page.evaluate(() => ({ progress: window.resizingSheet.progress, state: window.resizingSheet.state }));
    expect(after.state).toBe(action === "open" ? "opening" : "closing");
    expect(Math.abs(after.progress - before)).toBeLessThan(.3);
    expect(await page.evaluate(() => window.resizingResult)).toBe(true);
    expect(await page.evaluate(() => window.resizingSheet.content.getAnimations().length)).toBe(0);
  }
});

test("responsive examples keep their instance, content scroll, and focus on height changes", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.lab?.get("keyboard"));
  await page.evaluate(async () => {
    window.originalSheet = window.lab.get("keyboard");
    await originalSheet.open({ immediate: true });
    originalSheet.content.querySelector('input[name="name"]').focus({ preventScroll: true });
    originalSheet.content.querySelector('[data-sheet-body]').scrollTop = 200;
    window.originalScroll = originalSheet.content.querySelector('[data-sheet-body]').scrollTop;
    window.originalFocus = document.activeElement;
  });
  const viewport = page.viewportSize();
  await page.setViewportSize({ width: viewport.width, height: viewport.height + 50 });
  await page.waitForTimeout(200);
  const result = await page.evaluate(() => {
    const sheet = window.lab.get("keyboard");
    return { same: sheet === originalSheet, focused: document.activeElement === originalFocus,
      scroll: sheet.content.querySelector('[data-sheet-body]').scrollTop, previous: originalScroll };
  });
  expect(result.same).toBe(true);
  expect(result.focused).toBe(true);
  expect(result.scroll).toBeCloseTo(result.previous, 0);
});


test("a completion progress listener starts a new visible animation", async ({ page }) => {
  await page.goto("/regression");
  await page.waitForFunction(() => window.lab?.get("basic"));
  const result = await page.evaluate(async () => {
    const sheet = window.lab.get("basic");
    let closing, triggered = false;
    sheet.root.addEventListener("sheet:progress", event => {
      if (!triggered && event.detail.progress === 1) {
        triggered = true;
        closing = sheet.close();
      }
    });
    await sheet.open();
    const animation = sheet.content.getAnimations().find(animation => animation.id === "hotwire-sheet-surface");
    const frames = animation?.effect.getKeyframes() || [];
    const moved = new Set(frames.map(frame => frame.transform)).size;
    await closing;
    return { moved, state: sheet.state, animations: sheet.content.getAnimations().length };
  });
  expect(result.moved).toBeGreaterThan(2);
  expect(result.state).toBe("closed");
  expect(result.animations).toBe(0);
});
