import { test, expect } from "@playwright/test";

test("an offscreen sheet releases its parent before a long wheel stream ends", async ({ page, isMobile }) => {
  test.skip(isMobile, "Browser wheel input requires a desktop context");
  await page.goto("/");
  await page.waitForFunction(() => window.lab?.get("depth"));
  await page.evaluate(async () => {
    for (const id of ["depth", "depth-child", "depth-third"]) {
      const sheet = window.lab.get(id);
      await sheet.open({ immediate: true });
      if (id !== "depth-third") sheet.content.querySelector("[data-sheet-body]").scrollTop = 600;
    }
  });
  const { width, height } = page.viewportSize();
  await page.mouse.move(width / 2, height * .3);
  await page.mouse.wheel(0, -height * 2);
  await expect.poll(() => page.evaluate(() => window.lab.get("depth-third").nativeMotion.position)).toBeLessThan(1);
  // No idle interval: the real failure held an invisible modal here for 2.9s.
  for (let packet = 0; packet < 8; packet++) {
    await page.mouse.wheel(0, -4);
    await page.waitForTimeout(8);
  }
  const exposed = await page.evaluate(() => {
    const child = window.lab.get("depth-child"), third = window.lab.get("depth-third");
    return { closed: !third.isOpen, blocked: child.view.inert, state: child.state,
      body: child.content.querySelector("[data-sheet-body]").scrollTop };
  });
  expect(exposed.closed).toBe(true);
  expect(exposed.blocked).toBe(false);
  expect(exposed.state).toBe("open");
  // A fresh reverse gesture must immediately scroll the exposed feed.
  await page.mouse.wheel(0, 100);
  await expect.poll(() => page.locator("#depth-child-content [data-sheet-body]").evaluate(el => el.scrollTop)).toBeGreaterThan(exposed.body + 30);
});

test("settling a partial native pull animates through intermediate positions", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.lab?.get("depth"));
  const samples = await page.evaluate(async () => {
    const sheet = window.lab.get("depth");
    await sheet.open({ immediate: true });
    sheet.nativeMotion.jump(sheet.extent * .35, true);
    sheet.render(sheet.nativeMotion.position);
    const positions = [sheet.nativeMotion.position];
    let done = false;
    const finished = sheet.close().then(() => { done = true; });
    while (!done) {
      await new Promise(requestAnimationFrame);
      positions.push(sheet.nativeMotion.position);
    }
    await finished;
    return positions;
  });
  const intermediate = samples.filter(position => position > 2 && position < samples[0] - 2);
  expect(new Set(intermediate.map(Math.round)).size).toBeGreaterThan(5);
  expect(Math.max(...samples.slice(1).map((value, i) => Math.abs(value - samples[i])))).toBeLessThan(samples[0] * .6);
});

test("momentum into a fully expanded feed boundary does not lock its overflow", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.lab?.get("depth"));
  const result = await page.evaluate(async () => {
    const sheet = window.lab.get("depth");
    await sheet.open({ immediate: true });
    const body = sheet.content.querySelector("[data-sheet-body]");
    body.scrollTop = body.scrollHeight;
    body.dispatchEvent(new WheelEvent("wheel", { deltaY: 8, bubbles: true, cancelable: false }));
    return { state: sheet.state, overflow: getComputedStyle(body).overflowY };
  });
  expect(result).toEqual({ state: "open", overflow: "auto" });
});

test("a trackpad stream keeps one native owner as the sheet crosses the pointer", async ({ page, isMobile, browserName }) => {
  test.skip(isMobile, "Browser wheel input requires a desktop context");
  await page.goto("/");
  await page.waitForFunction(() => window.lab?.get("depth"));
  await page.evaluate(async () => {
    for (const id of ["depth", "depth-child", "depth-third"]) await window.lab.get(id).open({ immediate: true });
    window.inputSamples = [];
    document.addEventListener("wheel", event => {
      const sheet = window.lab.get("depth-third");
      window.inputSamples.push({
        outside: !sheet.content.contains(event.target), manual: !!sheet.gesture.wheeling,
        prevented: event.defaultPrevented, state: sheet.state, position: sheet.position
      });
    });
  });
  const { width, height } = page.viewportSize();
  // Keep the pointer still: an ordinary trackpad gesture crosses from the
  // moving content onto its backdrop. Single giant packets never tested this.
  await page.mouse.move(width / 2, height * .25);
  for (let packet = 0; packet < 28; packet++) {
    await page.mouse.wheel(0, -height / 35);
    await page.waitForTimeout(8);
  }
  const samples = await page.evaluate(() => window.inputSamples);
  // Firefox retains the event target for its whole wheel transaction.
  if (browserName !== "firefox") expect(samples.some(sample => sample.outside)).toBe(true);
  expect(await page.evaluate(() => window.lab.get("depth-third").nativeMotion.position)).toBeLessThan(height * .3);
  expect(samples.filter(sample => sample.manual)).toEqual([]);
  expect(samples.filter(sample => sample.prevented && sample.state === "dragging")).toEqual([]);
  expect(samples.every(sample => sample.position >= 0)).toBe(true);
  await expect(page.locator("#depth-third")).toHaveAttribute("data-sheet-state", "closed");
  await expect(page.locator("#depth-child")).toHaveAttribute("data-sheet-state", "open");
  const body = page.locator("#depth-child-content [data-sheet-body]");
  await page.mouse.wheel(0, 200);
  await expect.poll(() => body.evaluate(element => element.scrollTop)).toBeGreaterThan(50);
});

test("reversing a subthreshold trackpad stream across the backdrop does not freeze or jump the feed", async ({ page, isMobile }) => {
  test.skip(isMobile, "Browser wheel input requires a desktop context");
  await page.goto("/");
  await page.waitForFunction(() => window.lab?.get("depth"));
  await page.evaluate(async () => {
    for (const id of ["depth", "depth-child", "depth-third"]) await window.lab.get(id).open({ immediate: true });
    window.reversalSamples = [];
    document.addEventListener("wheel", event => {
      const sheet = window.lab.get("depth-third");
      window.reversalSamples.push({ delta:event.deltaY, position:sheet.nativeMotion.position,
        extent:sheet.extent, body:sheet.content.querySelector('[data-sheet-body]').scrollTop,
        manual:!!sheet.gesture.wheeling, state:sheet.state });
    });
  });
  const { width, height } = page.viewportSize();
  await page.mouse.move(width / 2, height * .25);
  for (const direction of [-1, 1]) for (let packet = 0; packet < 14; packet++) {
    await page.mouse.wheel(0, direction * height / 35);
    await page.waitForTimeout(8);
  }
  const samples = await page.evaluate(() => window.reversalSamples);
  expect(samples.some(sample => sample.manual)).toBe(false);
  expect(samples.filter(sample => sample.position < sample.extent - 2 && sample.body > 1)).toEqual([]);
  await expect(page.locator('#depth-third')).toHaveAttribute('data-sheet-state','open');
  await expect.poll(() => page.evaluate(() => {
    const sheet = window.lab.get('depth-third');
    return Math.abs(sheet.nativeMotion.position-sheet.extent);
  })).toBeLessThan(1);
  await page.locator('#depth-third-content .profile-dismiss').click();
  await expect(page.locator('#depth-third')).toHaveAttribute('data-sheet-state','closed');
  await page.mouse.move(width / 2, height * .25);
  await page.mouse.wheel(0, 180);
  await expect.poll(() => page.locator('#depth-child-content [data-sheet-body]').evaluate(el=>el.scrollTop)).toBeGreaterThan(50);
});
