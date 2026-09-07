import { test, expect } from "@playwright/test";

const examples = ["keyboard", "detached", "card"];

test.beforeEach(async ({ page }) => {
  page.on("pageerror", error => { throw error; });
  await page.goto("/");
  await page.waitForFunction(() => window.lab?.get("keyboard"));
  await page.locator(".card-image").evaluate(image => image.decode());
  await page.evaluate(() => document.fonts.ready);
});

for (const id of examples) for (const input of ["touch", "pointer", "wheel"]) {
  test(`${id} exits above the screen from ${input} input${id === "card" ? "" : " and still dismisses downward after reopening"}`, async ({ page }) => {
    for (const direction of id === "card" ? [-1] : [-1, 1]) {
      const result = await page.evaluate(async ({ id, input, direction }) => {
        const sheet = window.lab.get(id);
        await sheet.open({ immediate: true });
        const target = sheet.view.querySelector("[data-sheet-backdrop]");
        window.exitFrames = [];
        const measure = () => {
          if (sheet.state === "closing") {
            const rect = sheet.content.getBoundingClientRect();
            window.exitFrames.push({ top: rect.top, bottom: rect.bottom,
              opacity: Number(getComputedStyle(target).opacity) });
          }
        };
        sheet.root.addEventListener("sheet:progress", measure);
        sheet.root.addEventListener("sheet:close", () => sheet.root.removeEventListener("sheet:progress", measure), { once: true });
        const send = (phase, distance) => {
          const y = innerHeight * .5 + direction * distance;
          let event;
          if (input === "wheel") event = new WheelEvent("wheel", { deltaY: -direction * distance, bubbles: true, cancelable: true });
          else if (input === "pointer") event = new PointerEvent(`pointer${phase}`, { bubbles: true, cancelable: true,
            pointerId: 7, pointerType: "pen", isPrimary: true, button: 0, clientX: 5, clientY: y });
          else {
            event = new Event(`touch${{ down: "start", move: "move", up: "end" }[phase]}`, { bubbles: true, cancelable: true });
            Object.defineProperty(event, "touches", { value: phase === "up" ? [] : [{ target, clientX: 5, clientY: y }] });
          }
          target.dispatchEvent(event);
          return event.defaultPrevented;
        };
        const before = sheet.content.getBoundingClientRect().top;
        if (input !== "wheel") send("down", 0);
        const prevented = send("move", innerHeight * .3);
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const shift = sheet.content.getBoundingClientRect().top - before;
        // Leave visible travel to animate after commitment. A wheel packet
        // that already moves the whole card offscreen now closes immediately.
        send("move", input === "wheel" ? Math.max(0, sheet.position - sheet.extent * .35) * sheet.motionScale : innerHeight * .7);
        if (input !== "wheel") send("up", innerHeight * .7);
        return { shift, prevented };
      }, { id, input, direction });
      expect(result.prevented).toBe(true);
      expect(result.shift * direction).toBeGreaterThan(page.viewportSize().height * .2);
      await expect(page.locator(`#${id}`)).toHaveAttribute("data-sheet-state", "closed");
      const frames = await page.evaluate(() => window.exitFrames);
      expect(frames.length).toBeGreaterThan(3);
      if (direction < 0) expect(frames.at(-1).bottom).toBeLessThanOrEqual(1);
      else expect(frames.at(-1).top).toBeGreaterThanOrEqual(page.viewportSize().height - 1);
      expect(frames.at(-1).opacity).toBeLessThan(.01);
      expect(await page.evaluate(() => document.body.style.position)).toBe("");
    }
  });
}

test("short, canceled, and vetoed upward pulls restore each sheet without changing form data", async ({ page }) => {
  for (const id of examples) for (const action of ["short", "cancel", "veto"]) {
    const before = await page.evaluate(async ({ id, action }) => {
      const sheet = window.lab.get(id);
      await sheet.open({ immediate: true });
      const field = sheet.content.querySelector('input[type="text"]');
      if (field) field.value = "Keep my edit";
      const target = sheet.view.querySelector("[data-sheet-backdrop]"), top = sheet.content.getBoundingClientRect().top;
      if (action === "veto") sheet.root.addEventListener("sheet:before-close", event => event.preventDefault(), { once: true });
      const send = (type, y) => target.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true,
        pointerId: 7, pointerType: "pen", isPrimary: true, button: 0, clientX: 5, clientY: y }));
      send("pointerdown", 500); send("pointermove", action === "short" ? 465 : -300);
      // A held short pull should settle by distance, without a flick velocity.
      if (action === "short") await new Promise(resolve => setTimeout(resolve, 120));
      send(action === "cancel" ? "pointercancel" : "pointerup", 465);
      return top;
    }, { id, action });
    await expect(page.locator(`#${id}`)).toHaveAttribute("data-sheet-state", "open");
    const after = await page.locator(`#${id}-content`).evaluate(node => ({ top: node.getBoundingClientRect().top,
      value: node.querySelector('input[type="text"]')?.value }));
    expect(after.top).toBeCloseTo(before, 0);
    if (after.value) expect(after.value).toBe("Keep my edit");
    await page.evaluate(id => window.lab.get(id).close({ immediate: true }), id);
  }
});

test("keyboard content scrolls first and hands its end to an upward exit while inputs stay editable", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const sheet = window.lab.get("keyboard");
    await sheet.open({ immediate: true });
    const body = sheet.content.querySelector("[data-sheet-body]"), field = sheet.content.querySelector("input");
    for (const [type, y] of [["pointerdown", 500], ["pointermove", 10], ["pointerup", 10]]) {
      field.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 7,
        pointerType: "pen", isPrimary: true, button: 0, clientX: 100, clientY: y }));
    }
    const movedOnInput = sheet.position !== sheet.extent;
    const send = deltaY => {
      const event = new WheelEvent("wheel", { deltaY, bubbles: true, cancelable: true });
      body.dispatchEvent(event); return event.defaultPrevented;
    };
    body.scrollTop = 0;
    const hasOverflow = body.scrollHeight > body.clientHeight + 1;
    const preventedBeforeEnd = send(30);
    body.scrollTop = body.scrollHeight;
    send(innerHeight * .75);
    return { movedOnInput, hasOverflow, preventedBeforeEnd };
  });
  expect(result.movedOnInput).toBe(false);
  if (result.hasOverflow) expect(result.preventedBeforeEnd).toBe(false);
  await expect(page.locator("#keyboard")).toHaveAttribute("data-sheet-state", "closed");
});

test("real wheel input on each backdrop completes an upward exit", async ({ page, isMobile }) => {
  test.skip(isMobile, "Desktop wheel input; synthetic touch runs in every configuration");
  for (const id of examples) {
    await page.evaluate(id => window.lab.get(id).open({ immediate: true }), id);
    await page.mouse.move(2, 2);
    for (let i = 0; i < 7; i++) await page.mouse.wheel(0, page.viewportSize().height * .12);
    await expect(page.locator(`#${id}`)).toHaveAttribute("data-sheet-state", "closed");
  }
});

test("opposite exits obey dismissal guards and support either animation backend", async ({ page }) => {
  const results = await page.evaluate(async () => {
    const sheet = window.lab.get("detached");
    await sheet.open({ immediate: true });
    const target = sheet.view.querySelector("[data-sheet-backdrop]"), results = [];
    for (const key of ["dismissible", "swipeToDismiss", "draggable", "wheel", "oppositeEdgeDismiss"]) {
      sheet.options[key] = false;
      target.dispatchEvent(new WheelEvent("wheel", { deltaY: innerHeight, bubbles: true, cancelable: true }));
      results.push(sheet.position === sheet.extent);
      sheet.gesture.cancel(); sheet.setState("open"); sheet.options[key] = true;
    }
    return results;
  });
  expect(results.every(Boolean)).toBe(true);
  for (const animation of ["raf", "waapi"]) {
    if (animation === "waapi") await page.emulateMedia({ reducedMotion: "reduce" });
    await page.evaluate(async animation => {
      const sheet = window.lab.get("detached");
      sheet.options.animation = animation;
      await sheet.open({ immediate: true });
      sheet.view.querySelector("[data-sheet-backdrop]").dispatchEvent(new WheelEvent("wheel", {
        deltaY: innerHeight, bubbles: true, cancelable: true }));
    }, animation);
    await expect(page.locator("#detached")).toHaveAttribute("data-sheet-state", "closed");
  }
});

test("opposite exits can be interrupted and resized without jumping or retaining modal locks", async ({ page }) => {
  for (const id of examples) {
    const result = await page.evaluate(async id => {
      const sheet = window.lab.get(id);
      await sheet.open({ immediate: true });
      const target = sheet.view.querySelector("[data-sheet-backdrop]");
      target.dispatchEvent(new WheelEvent("wheel", { deltaY: innerHeight * .6, bubbles: true, cancelable: true }));
      await new Promise(resolve => setTimeout(resolve, 170));
      const before = sheet.content.getBoundingClientRect().top;
      const reopened = sheet.open();
      const after = sheet.content.getBoundingClientRect().top;
      return { completed: await reopened, jump: Math.abs(after - before) };
    }, id);
    expect(result.completed).toBe(true);
    expect(result.jump).toBeLessThan(4);
    await page.evaluate(async id => {
      const sheet = window.lab.get(id);
      sheet.view.querySelector("[data-sheet-backdrop]").dispatchEvent(new WheelEvent("wheel", {
        deltaY: innerHeight * .7, bubbles: true, cancelable: true }));
      await new Promise(resolve => setTimeout(resolve, 150));
      Object.defineProperty(visualViewport, "height", { configurable: true, value: innerHeight - 100 });
      visualViewport.dispatchEvent(new Event("resize"));
    }, id);
    await expect(page.locator(`#${id}`)).toHaveAttribute("data-sheet-state", "closed");
    expect(await page.evaluate(() => document.body.style.position)).toBe("");
    await page.evaluate(() => {
      delete visualViewport.height; visualViewport.dispatchEvent(new Event("resize"));
    });
  }
});

test("the public opposite-edge option supports all axes and falls back from native snap", async ({ page }) => {
  for (const edge of ["bottom", "top", "left", "right"]) {
    const result = await page.evaluate(async edge => {
      const root = document.createElement("div");
      root.innerHTML = '<div data-sheet-view><div data-sheet-backdrop></div><section data-sheet-content aria-label="Two-way sheet">Content</section></div>';
      document.body.append(root);
      const sheet = new window.lab.Sheet(root, { edge, detents: ["300px"], oppositeEdgeDismiss: true, scrollSnap: true });
      await sheet.open({ immediate: true });
      let last;
      sheet.root.addEventListener("sheet:progress", () => {
        if (sheet.state === "closing") last = sheet.content.getBoundingClientRect().toJSON();
      });
      const closed = new Promise(resolve => sheet.root.addEventListener("sheet:close", resolve, { once: true }));
      sheet.view.querySelector("[data-sheet-backdrop]").dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true,
        deltaX: sheet.axis === "x" ? sheet.sign * innerWidth * .75 : 0,
        deltaY: sheet.axis === "y" ? sheet.sign * innerHeight * .75 : 0 }));
      await closed;
      const native = !!sheet.nativeMotion;
      sheet.destroy(); root.remove();
      return { last, native };
    }, edge);
    expect(result.native).toBe(false);
    if (edge === "bottom") expect(result.last.bottom).toBeLessThanOrEqual(1);
    if (edge === "top") expect(result.last.top).toBeGreaterThanOrEqual(page.viewportSize().height - 1);
    if (edge === "right") expect(result.last.right).toBeLessThanOrEqual(1);
    if (edge === "left") expect(result.last.left).toBeGreaterThanOrEqual(page.viewportSize().width - 1);
  }
});
