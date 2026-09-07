import { test, expect } from "@playwright/test";

async function openDepthLayers(page, { fallback = false } = {}) {
  await page.goto("/");
  await page.waitForFunction(() => window.lab?.get("depth"));
  if (fallback) await page.evaluate(() => {
    for (const id of ["depth", "depth-child", "depth-third"]) {
      const previous = window.lab.get(id), root = previous.root, options = previous.options;
      previous.destroy();
      new window.lab.Sheet(root, { ...options, scrollSnap: false });
    }
  });
  await page.getByRole("button", { name: "Sheet with Depth", exact: true }).click();
  for (const [parent, child] of [["depth", "depth-child"], ["depth-child", "depth-third"]]) {
    await expect(page.locator(`#${parent}`)).toHaveAttribute("data-sheet-state", "open");
    await page.locator(`#${parent}-content [data-sheet-open="${child}"]`).click();
  }
  await expect(page.locator("#depth-third")).toHaveAttribute("data-sheet-state", "open");
}

test.beforeEach(({ page }) => {
  page.on("pageerror", error => { throw error; });
});

test("depth feeds keep their scroll geometry while covered and return input to native scroll snap", async ({ page }) => {
  await openDepthLayers(page);
  for (const [parentId, childId] of [["depth-child", "depth-third"], ["depth", "depth-child"]]) {
    const read = () => page.evaluate(id => {
      const sheet = window.lab.get(id), body = sheet.content.querySelector("[data-sheet-body]");
      return { scroll: body.scrollTop, height: body.clientHeight, total: body.scrollHeight,
        range: sheet.view.scrollHeight - sheet.view.clientHeight, extent: sheet.extent };
    }, parentId);
    const covered = await read();
    await page.locator(`#${childId}-content .profile-dismiss`).click();
    await expect(page.locator(`#${childId}`)).toHaveAttribute("data-sheet-state", "closed");
    const exposed = await read();
    expect(exposed.height).toBe(covered.height);
    expect(exposed.total).toBe(covered.total);
    expect(exposed.scroll).toBeCloseTo(covered.scroll, 0);
    expect(exposed.range).toBeCloseTo(exposed.extent, 0);

    const input = await page.evaluate(id => {
      const sheet = window.lab.get(id), body = sheet.content.querySelector("[data-sheet-body]");
      const send = () => {
        const event = new WheelEvent("wheel", { deltaY: -40, bubbles: true, cancelable: true });
        body.dispatchEvent(event);
        return event.defaultPrevented;
      };
      body.scrollTop = 100;
      const feed = send();
      body.scrollTop = 0;
      // No pause between the feed and its outer native dismissal surface.
      const boundary = send();
      const result = { feed, boundary, native: !!sheet.nativeMotion,
        owner: !!sheet.gesture.wheelScrolling || !!sheet.gesture.wheeling };
      // Leave the restored trigger at its reading position for the next step.
      body.scrollTop = body.scrollHeight;
      return result;
    }, parentId);
    expect(input).toEqual({ feed: false, boundary: false, native: true, owner: false });
  }
});

test("the transform fallback continues a claimed trackpad swipe through noncancelable packets", async ({ page }) => {
  await openDepthLayers(page, { fallback: true });
  for (const id of ["depth-third", "depth-child", "depth"]) {
    const result = await page.evaluate(id => {
      const sheet = window.lab.get(id), body = sheet.content.querySelector("[data-sheet-body]");
      body.scrollTop = 0;
      const send = (deltaY, cancelable, target = body) => {
        const event = new WheelEvent("wheel", { deltaY, cancelable, bubbles: true });
        target.dispatchEvent(event);
        return event.defaultPrevented;
      };
      const resting = sheet.position;
      send(-30, false);
      const unclaimedMovement = resting - sheet.position;
      const claimed = send(-4, true);
      const first = sheet.position;
      for (let packet = 0; packet < 8; packet++) send(-sheet.extent / 10, false,
        packet < 4 ? body : sheet.view.querySelector('[data-sheet-backdrop]'));
      return { unclaimedMovement, claimed, moved: first - sheet.position, extent: sheet.extent };
    }, id);
    expect(result.unclaimedMovement).toBe(0);
    expect(result.claimed).toBe(true);
    // Crossing halfway commits the remaining travel to the close animation.
    expect(result.moved).toBeGreaterThan(result.extent * .45);
    await expect(page.locator(`#${id}`)).toHaveAttribute("data-sheet-state", "closed");
  }
  expect(await page.evaluate(() => document.body.style.position)).toBe("");
});

test("the transform fallback releases native scroll ownership for a fresh trackpad gesture", async ({ page }) => {
  await openDepthLayers(page, { fallback: true });
  for (const id of ["depth-third", "depth-child", "depth"]) {
    const result = await page.evaluate(id => {
      const sheet = window.lab.get(id), body = sheet.content.querySelector("[data-sheet-body]");
      const send = (deltaY, cancelable) => {
        const event = new WheelEvent("wheel", { deltaY, cancelable, bubbles: true });
        body.dispatchEvent(event);
        return event.defaultPrevented;
      };
      body.scrollTop = 60;
      const native = send(-20, true);
      body.scrollTop = 40;
      send(-45, false);
      body.scrollTop = 0;
      send(-25, false);
      const atBoundary = sheet.position;
      // WebKit makes the first packet of a new physical gesture cancelable,
      // even when the previous gesture's momentum ended less than 120 ms ago.
      const claimed = send(-65, true);
      const moved = atBoundary - sheet.position;
      send(-sheet.extent, true);
      return { native, claimed, moved };
    }, id);
    expect(result.native).toBe(false);
    expect(result.claimed).toBe(true);
    expect(result.moved).toBeGreaterThan(60);
    await expect(page.locator(`#${id}`)).toHaveAttribute("data-sheet-state", "closed");
  }
  expect(await page.evaluate(() => document.body.style.position)).toBe("");
});

for (const dismissal of ["button", "swipe"]) {
  test(`depth sheets remain scrollable and swipeable after nested ${dismissal} dismissal`, async ({ page, isMobile, browserName }) => {
    test.skip(isMobile, "Real desktop wheel input; touch continuation is covered separately");
    await openDepthLayers(page);
    const { width, height } = page.viewportSize();
    if (dismissal === "button") await page.locator("#depth-third-content .profile-dismiss").click();
    else {
      await page.mouse.move(width / 2, 100);
      await page.mouse.down();
      await page.mouse.move(width / 2, height - 10, { steps: 12 });
      await page.mouse.up();
    }
    await expect(page.locator("#depth-third")).toHaveAttribute("data-sheet-state", "closed");

    // Reclaim the middle sheet, then its parent, using actual wheel input.
    // Both retain focus on a trigger below the fold after their child closes.
    for (const [id, child] of [["depth-child", "depth-third"], ["depth", "depth-child"]]) {
      const body = page.locator(`#${id}-content [data-sheet-body]`);
      await expect(page.locator(`#${id}-content [data-sheet-open="${child}"]`)).toBeFocused();
      expect(await body.evaluate(el => !!el.closest("[inert]"))).toBe(false);
      const scroll = await body.evaluate(el => el.scrollTop);
      expect(scroll).toBeGreaterThan(250);
      await page.mouse.move(width / 2, height / 2);
      await page.mouse.wheel(0, -120);
      await expect.poll(() => body.evaluate(el => el.scrollTop)).toBeLessThan(scroll - 50);
      // Firefox caps each native wheel packet, so scroll in bounded steps.
      for (let packet = 0; packet < 12; packet++) {
        const before = await body.evaluate(el => el.scrollTop);
        if (before < 1) break;
        // Reach the feed boundary without deliberately spilling leftover
        // movement into the native sheet's dismissal scroll container.
        await page.mouse.wheel(0, -Math.min(400, before));
        await expect.poll(() => body.evaluate(el => el.scrollTop)).toBeLessThan(before);
      }
      await expect.poll(() => body.evaluate(el => el.scrollTop)).toBeLessThan(1);
      // The header's border changes its observed size at this boundary.
      // Allow layout/focus callbacks to run before testing the resting position.
      await page.waitForTimeout(250);
      expect(await body.evaluate(el => el.scrollTop)).toBeLessThan(1);
      await expect(page.locator(`#${id}-content .profile-topbar`)).not.toHaveAttribute("data-scrolled", "");

      // A short pull settles without scrolling back to the restored trigger.
      // Playwright wheel packets lack physical gesture phase boundaries.
      // Let Firefox release its native feed scroll transaction first.
      if (browserName === "firefox") await page.waitForTimeout(1700);
      await page.mouse.wheel(0, -55);
      // Native engines can reject a small snap excursion without exposing an
      // intermediate DOM state. Assert the resting result, not JS ownership.
      await page.waitForTimeout(500);
      await expect(page.locator(`#${id}`)).toHaveAttribute("data-sheet-state", "open");
      await page.waitForTimeout(250);
      expect(await body.evaluate(el => el.scrollTop)).toBeLessThan(1);
      const box = await page.locator(`#${id}-content`).boundingBox();
      expect(box.y + box.height).toBeCloseTo(height, 0);

      await page.mouse.wheel(0, -height * .8);
      await expect(page.locator(`#${id}`)).toHaveAttribute("data-sheet-state", "closed");
    }
    expect(await page.evaluate(() => document.body.style.position)).toBe("");
    await expect(page.getByRole("button", { name: "Sheet with Depth", exact: true })).toBeFocused();
  });
}

test("the transform fallback preserves nested touch scrolling and canceled pulls", async ({ page }) => {
  await openDepthLayers(page, { fallback: true });
  await page.locator("#depth-third-content .profile-dismiss").click();
  await expect(page.locator("#depth-third")).toHaveAttribute("data-sheet-state", "closed");
  const body = page.locator("#depth-child-content [data-sheet-body]");
  const native = await body.evaluate(target => {
    const send = (type, y) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(event, "touches", { value: /end|cancel/.test(type) ? [] : [{ target, clientX: 160, clientY: y }] });
      target.dispatchEvent(event);
      return event.defaultPrevented;
    };
    send("touchstart", 100);
    const prevented = send("touchmove", 200);
    // Synthetic touches have no native default action; emulate its scroll.
    target.scrollTop = 0;
    send("touchend", 200);
    return prevented;
  });
  expect(native).toBe(false);
  await page.waitForTimeout(250);
  expect(await body.evaluate(el => el.scrollTop)).toBeLessThan(1);

  for (const ending of ["touchend", "touchcancel"]) {
    const moved = await body.evaluate(async (target, ending) => {
      const sheet = window.lab.get("depth-child");
      for (const [type, y] of [["touchstart", 100], ["touchmove", 140]]) {
        const event = new Event(type, { bubbles: true, cancelable: true });
        Object.defineProperty(event, "touches", { value: [{ target, clientX: 160, clientY: y }] });
        target.dispatchEvent(event);
      }
      await new Promise(resolve => setTimeout(resolve, 120));
      const moved = sheet.extent - sheet.position;
      const event = new Event(ending, { bubbles: true, cancelable: true });
      Object.defineProperty(event, "touches", { value: [] });
      target.dispatchEvent(event);
      return moved;
    }, ending);
    expect(moved).toBeGreaterThan(30);
    await expect(page.locator("#depth-child")).toHaveAttribute("data-sheet-state", "open");
    expect(await body.evaluate(el => el.scrollTop)).toBeLessThan(1);
  }

  await body.evaluate(target => {
    for (const [type, y] of [["touchstart", 100], ["touchmove", innerHeight * .9], ["touchend", innerHeight * .9]]) {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(event, "touches", { value: type === "touchend" ? [] : [{ target, clientX: 160, clientY: y }] });
      target.dispatchEvent(event);
    }
  });
  await expect(page.locator("#depth-child")).toHaveAttribute("data-sheet-state", "closed");
  await expect(page.locator("#depth")).toHaveAttribute("data-sheet-state", "open");
  expect(await page.locator("#depth-content").evaluate(el => !!el.closest("[inert]"))).toBe(false);
});
