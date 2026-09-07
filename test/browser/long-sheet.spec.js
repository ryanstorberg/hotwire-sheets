import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  page.on("pageerror", error => { throw error; });
  await page.goto("/");
  await page.waitForFunction(() => window.lab?.get("long"));
  await page.getByRole("button", { name: "Long Sheet", exact: true }).click();
  await expect(page.locator("#long")).toHaveAttribute("data-sheet-state", "open");
});

test("Long Sheet hands scrolling back to the top into downward wheel and touch dismissal", async ({ page }) => {
  for (const input of ["wheel", "touch"]) {
    const result = await page.evaluate(async input => {
      const sheet = window.lab.get("long"), body = sheet.content.querySelector("[data-sheet-body]");
      await sheet.open({ immediate: true });
      window.downExitTops = [];
      const measure = () => { if (sheet.state === "closing") window.downExitTops.push(sheet.content.getBoundingClientRect().top); };
      sheet.root.addEventListener("sheet:progress", measure);
      sheet.root.addEventListener("sheet:close", () => sheet.root.removeEventListener("sheet:progress", measure), { once: true });
      const wheel = (target, deltaY) => target.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY }));
      const touch = (type, y) => {
        const event = new Event(type, { bubbles: true, cancelable: true });
        Object.defineProperty(event, "touches", { value: type === "touchend" ? [] : [{ target: body, clientX: 100, clientY: y }] });
        body.dispatchEvent(event);
      };
      body.scrollTop = 80;
      if (input === "wheel") wheel(body, -100);
      else { touch("touchstart", 100); touch("touchmove", 150); }
      // Native scrolling reaches the start before the same gesture continues.
      body.scrollTop = 0;
      if (input === "wheel") wheel(body, -innerHeight * .25);
      else touch("touchmove", 150 + innerHeight * .25);
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const top = sheet.content.getBoundingClientRect().top;
      if (input === "wheel") wheel(sheet.view.querySelector("[data-sheet-backdrop]"), -innerHeight * .4);
      else { touch("touchmove", 150 + innerHeight * .65); touch("touchend", 150 + innerHeight * .65); }
      return { top };
    }, input);
    expect(result.top, input).toBeGreaterThan(page.viewportSize().height * .2);
    await expect(page.locator("#long")).toHaveAttribute("data-sheet-state", "closed");
    const tops = await page.evaluate(() => window.downExitTops);
    expect(tops.length).toBeGreaterThan(5);
    expect(tops.at(-1)).toBeGreaterThanOrEqual(page.viewportSize().height - 1);
    expect(await page.evaluate(() => document.body.style.position)).toBe("");
  }
});

test("Long Sheet continues downward dismissal after it moves below the mouse pointer", async ({ page, isMobile }) => {
  test.skip(isMobile, "Mobile WebKit does not expose mouse wheel input; touch continuation is covered separately.");
  await page.mouse.move(page.viewportSize().width / 2, page.viewportSize().height * .15);
  for (let packet = 0; packet < 8; packet++) await page.mouse.wheel(0, -page.viewportSize().height * .1);
  await expect(page.locator("#long")).toHaveAttribute("data-sheet-state", "closed");
});

test("Long Sheet hands the end of a wheel scroll to an upward exit and reopens from below", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const sheet = window.lab.get("long"), body = sheet.content.querySelector("[data-sheet-body]");
    const wheel = (target, deltaY) => {
      const event = new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY });
      target.dispatchEvent(event);
      return event.defaultPrevented;
    };
    window.exitFrames = [];
    sheet.root.addEventListener("sheet:progress", () => {
      if (sheet.state === "closing") window.exitFrames.push({ bottom: sheet.content.getBoundingClientRect().bottom, opacity: Number(getComputedStyle(sheet.view.querySelector("[data-sheet-backdrop]")).opacity) });
    });
    body.scrollTop = body.scrollHeight - body.clientHeight - 100;
    const native = wheel(body, 120);
    // Emulate the native default action reaching the end within the same burst.
    body.scrollTop = body.scrollHeight;
    wheel(body, innerHeight * .25);
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const top = sheet.content.getBoundingClientRect().top;
    // Continue even after the moving article no longer covers the mouse pointer.
    const continuation = wheel(sheet.view.querySelector("[data-sheet-backdrop]"), innerHeight * .4);
    return { native, continuation, top };
  });
  expect(result.native).toBe(false);
  expect(result.continuation).toBe(true);
  expect(result.top).toBeLessThan(-page.viewportSize().height * .2);
  await expect(page.locator("#long")).toHaveAttribute("data-sheet-state", "closed");
  const frames = await page.evaluate(() => window.exitFrames);
  expect(frames.length).toBeGreaterThan(5);
  expect(Math.max(...frames.map(frame => frame.bottom))).toBeLessThan(page.viewportSize().height * .4);
  expect(frames.at(-1).bottom).toBeLessThanOrEqual(1);
  expect(frames.at(-1).opacity).toBeLessThan(.01);
  await expect(page.getByRole("button", { name: "Long Sheet", exact: true })).toBeFocused();
  expect(await page.evaluate(() => document.body.style.position)).toBe("");
  const reopened = await page.evaluate(async () => {
    const sheet = window.lab.get("long"), tops = [];
    const measure = () => { if (sheet.state === "opening") tops.push(sheet.content.getBoundingClientRect().top); };
    sheet.root.addEventListener("sheet:progress", measure);
    await sheet.open();
    sheet.root.removeEventListener("sheet:progress", measure);
    return { tops, scroll: sheet.content.querySelector("[data-sheet-body]").scrollTop };
  });
  expect(Math.max(...reopened.tops)).toBeGreaterThan(page.viewportSize().height * .8);
  expect(Math.min(...reopened.tops)).toBeGreaterThanOrEqual(-1);
  expect(reopened.scroll).toBe(0);
});

test("Long Sheet short pulls, canceled touches, and close vetoes restore the open article", async ({ page }) => {
  const touch = async (action) => page.evaluate(async action => {
    const sheet = window.lab.get("long"), body = sheet.content.querySelector("[data-sheet-body]");
    const send = (type, y) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(event, "touches", { value: /end|cancel/.test(type) ? [] : [{ target: body, clientX: 100, clientY: y }] });
      body.dispatchEvent(event);
    };
    body.scrollTop = body.scrollHeight - body.clientHeight - 80;
    send("touchstart", 600); send("touchmove", 550);
    body.scrollTop = body.scrollHeight;
    send("touchmove", 450);
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const top = sheet.content.getBoundingClientRect().top;
    if (action === "veto") {
      sheet.root.addEventListener("sheet:before-close", event => event.preventDefault(), { once: true });
      send("touchmove", -600);
    }
    send(action === "cancel" ? "touchcancel" : "touchend", 450);
    return top;
  }, action);
  // A cancel restores the anchor; a close veto also restores it after a large swipe.
  for (const action of ["cancel", "veto"]) {
    expect(await touch(action)).toBeLessThan(-90);
    await expect(page.locator("#long")).toHaveAttribute("data-sheet-state", "open");
    expect((await page.locator("#long-content").boundingBox()).y).toBeCloseTo(0, 0);
    expect(await page.locator("#long-content [data-sheet-body]").evaluate(node => node.scrollHeight - node.clientHeight - node.scrollTop)).toBeLessThan(1);
  }
  await page.locator("#long-content [data-sheet-body]").dispatchEvent("wheel", { deltaY: 35 });
  await expect(page.locator("#long")).toHaveAttribute("data-sheet-state", "open");
  expect((await page.locator("#long-content").boundingBox()).y).toBeCloseTo(0, 0);
});

test("Long Sheet honors gesture guards and retains native scrolling before the end", async ({ page }) => {
  for (const options of [{ dismissible: false }, { swipeToDismiss: false }, { draggable: false }, { wheel: false }, { handleOnly: true }]) {
    const result = await page.evaluate(options => {
      const sheet = window.lab.get("long"), body = sheet.content.querySelector("[data-sheet-body]");
      Object.assign(sheet.options, { dismissible: true, swipeToDismiss: true, draggable: true, wheel: true, handleOnly: false }, options);
      body.scrollTop = body.scrollHeight;
      body.dispatchEvent(new WheelEvent("wheel", { deltaY: innerHeight * 2, bubbles: true, cancelable: true }));
      return { position: sheet.position, extent: sheet.extent };
    }, options);
    expect(result.position).toBe(result.extent);
    await expect(page.locator("#long")).toHaveAttribute("data-sheet-state", "open");
  }
  const native = await page.evaluate(() => {
    const sheet = window.lab.get("long"), body = sheet.content.querySelector("[data-sheet-body]");
    sheet.options.handleOnly = false;
    body.scrollTop = 100;
    const event = new WheelEvent("wheel", { deltaY: 100, bubbles: true, cancelable: true });
    body.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(native).toBe(false);
});

test("Long Sheet upward WAAPI close can be interrupted, resized, and cleaned up", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const sheet = window.lab.get("long"), body = sheet.content.querySelector("[data-sheet-body]");
    body.scrollTop = body.scrollHeight;
    const closing = sheet.close();
    await new Promise(resolve => setTimeout(resolve, 140));
    const before = sheet.content.getBoundingClientRect().top;
    const reopening = sheet.open();
    const after = sheet.content.getBoundingClientRect().top;
    return { closed: await closing, reopened: await reopening, before, jump: Math.abs(after - before) };
  });
  expect(result.closed).toBe(false);
  expect(result.reopened).toBe(true);
  expect(result.before).toBeLessThan(-20);
  expect(result.jump).toBeLessThan(4);
  expect((await page.locator("#long-content").boundingBox()).y).toBeCloseTo(0, 0);
  await page.evaluate(() => {
    const sheet = window.lab.get("long"), body = sheet.content.querySelector("[data-sheet-body]");
    body.scrollTop = body.scrollHeight;
    sheet.close();
    Object.defineProperty(visualViewport, "height", { configurable: true, value: innerHeight - 120 });
    visualViewport.dispatchEvent(new Event("resize"));
  });
  await expect(page.locator("#long")).toHaveAttribute("data-sheet-state", "closed");
  expect(await page.locator("#long-content").evaluate(node => node.getAnimations().length)).toBe(0);
  expect(await page.evaluate(() => document.body.style.position)).toBe("");
});

test("Long Sheet supports reduced motion, frame fallback, and Turbo teardown", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(async () => {
    const sheet = window.lab.get("long");
    sheet.content.querySelector("[data-sheet-body]").scrollTop = 100000;
    await sheet.close();
    await sheet.open();
  });
  expect(await page.locator("#long-content [data-sheet-body]").evaluate(node => node.scrollTop)).toBe(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const fallback = await page.evaluate(async () => {
    const sheet = window.lab.get("long"), body = sheet.content.querySelector("[data-sheet-body]");
    sheet.options.animation = "raf";
    body.scrollTop = body.scrollHeight;
    const closed = sheet.close();
    await new Promise(resolve => setTimeout(resolve, 140));
    const top = sheet.content.getBoundingClientRect().top, animations = sheet.content.getAnimations().length;
    await closed;
    return { top, animations };
  });
  expect(fallback.top).toBeLessThan(-20);
  expect(fallback.animations).toBe(0);
  await page.evaluate(async () => {
    const sheet = window.lab.get("long");
    await sheet.open({ immediate: true });
    const body = sheet.content.querySelector("[data-sheet-body]");
    body.scrollTop = body.scrollHeight;
    body.dispatchEvent(new WheelEvent("wheel", { deltaY: 200, bubbles: true, cancelable: true }));
    window.lab.Turbo.visit("/next");
  });
  await expect(page).toHaveURL(/\/next$/);
  await expect(page.locator("#long")).toHaveAttribute("data-sheet-state", "closed");
  expect(await page.evaluate(() => document.body.style.position)).toBe("");
});

test("Long Sheet exits above the viewport with real continued browser wheel input", async ({ page, isMobile }) => {
  test.skip(isMobile, "Mobile WebKit does not expose real mouse wheel input; touch handoff is covered separately.");
  const body = page.locator("#long-content [data-sheet-body]");
  await page.mouse.move(page.viewportSize().width / 2, page.viewportSize().height * .85);
  // Firefox caps large wheel packets, so read toward the end in bounded steps.
  await expect.poll(async () => {
    const remaining = await body.evaluate(node => node.scrollHeight - node.clientHeight - node.scrollTop);
    if (remaining >= 1) await page.mouse.wheel(0, Math.min(600, remaining));
    return remaining;
  }).toBeLessThan(1);
  for (let i = 0; i < 8; i++) await page.mouse.wheel(0, page.viewportSize().height * .1);
  await expect(page.locator("#long")).toHaveAttribute("data-sheet-state", "closed");
});
