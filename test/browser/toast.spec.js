import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  page.on("pageerror", error => { throw error; });
  await page.goto("/");
  await page.waitForFunction(() => window.lab?.get("toast"));
});

test("Toast enters and exits through the responsive edge without moving along the other axis", async ({ page }) => {
  const trigger = page.getByRole("button", { name: "Toast", exact: true });
  await trigger.focus();
  const result = await page.evaluate(async () => {
    const sheet = window.lab.get("toast"), frames = { opening: [], closing: [] };
    const rect = () => {
      const { x, y, width, height, right, bottom } = sheet.content.getBoundingClientRect();
      return { x, y, width, height, right, bottom };
    };
    sheet.root.addEventListener("sheet:progress", () => frames[sheet.state]?.push(rect()));
    await sheet.open();
    const open = rect();
    await sheet.close();
    return { frames, open, edge: sheet.options.edge };
  });
  const viewport = page.viewportSize(), desktop = viewport.width >= 1000;
  expect(result.edge).toBe(desktop ? "right" : "top");
  expect(result.open.height).toBeLessThan(140);
  expect(result.open.width).toBeCloseTo(desktop ? 372 : Math.min(536, viewport.width - 24), 0);
  expect(result.open.y).toBeCloseTo(desktop ? 14 : 12, 0);
  expect(result.open.x).toBeCloseTo(desktop ? viewport.width - 386 : (viewport.width - result.open.width) / 2, 0);
  for (const phase of ["opening", "closing"]) {
    const frames = result.frames[phase];
    expect(frames.length).toBeGreaterThan(5);
    const outside = phase === "opening" ? frames[0] : frames.at(-1);
    if (desktop) {
      expect(outside.x).toBeGreaterThanOrEqual(viewport.width);
      expect(frames.every(frame => Math.abs(frame.y - 14) < 1)).toBe(true);
    } else {
      expect(outside.bottom).toBeLessThanOrEqual(0);
      expect(frames.every(frame => Math.abs(frame.x - result.open.x) < 1)).toBe(true);
    }
  }
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => document.body.style.position)).toBe("");
});

test("an open Toast switches edges at exactly 1000px without stretching or stealing focus", async ({ page }) => {
  await page.getByRole("button", { name: "Toast", exact: true }).focus();
  await page.evaluate(() => window.lab.get("toast").open({ immediate: true }));
  for (const width of [999, 1000, 999]) {
    await page.setViewportSize({ width, height: 720 });
    const desktop = width >= 1000;
    await expect.poll(() => page.evaluate(() => window.lab.get("toast").options.edge)).toBe(desktop ? "right" : "top");
    await expect(page.locator("#toast")).toHaveAttribute("data-sheet-state", "open");
    const box = await page.locator("#toast-content").boundingBox();
    expect(box.height).toBeLessThan(140);
    expect(box.width).toBeCloseTo(desktop ? 372 : 536, 0);
    expect(box.x).toBeCloseTo(desktop ? width - 386 : (width - 536) / 2, 0);
    expect(box.y).toBeCloseTo(desktop ? 14 : 12, 0);
    await expect(page.getByRole("button", { name: "Toast", exact: true })).toBeFocused();
    expect(await page.evaluate(() => document.body.style.position)).toBe("");
  }
});

test("Toast swipes from its surface and the page dismiss along its current edge", async ({ page }) => {
  for (const input of ["touch", "pointer", "wheel"]) for (const origin of ["content", "outside"]) {
    const result = await page.evaluate(async ({ input, origin }) => {
      const sheet = window.lab.get("toast");
      await sheet.open({ immediate: true });
      const target = origin === "content" ? sheet.content.querySelector(".toast-message") : document.querySelector("h1");
      const send = (phase, distance) => {
        const point = 300 + sheet.sign * distance;
        let event;
        if (input === "wheel") event = new WheelEvent("wheel", { bubbles: true, cancelable: true,
          deltaX: sheet.axis === "x" ? -sheet.sign * distance : 0, deltaY: sheet.axis === "y" ? -sheet.sign * distance : 0 });
        else if (input === "pointer") event = new PointerEvent(`pointer${phase}`, { bubbles: true, cancelable: true,
          pointerId: 7, pointerType: "pen", isPrimary: true, button: 0,
          clientX: sheet.axis === "x" ? point : 200, clientY: sheet.axis === "y" ? point : 200 });
        else {
          event = new Event(`touch${{ down: "start", move: "move", up: "end" }[phase]}`, { bubbles: true, cancelable: true });
          Object.defineProperty(event, "touches", { value: phase === "up" ? [] : [{ target,
            clientX: sheet.axis === "x" ? point : 200, clientY: sheet.axis === "y" ? point : 200 }] });
        }
        target.dispatchEvent(event);
        return event.defaultPrevented;
      };
      const before = sheet.content.getBoundingClientRect().toJSON();
      if (input !== "wheel") send("down", 0);
      const prevented = send("move", sheet.extent * .8);
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const after = sheet.content.getBoundingClientRect().toJSON();
      if (input !== "wheel") send("up", sheet.extent * .8);
      return { prevented, axis: sheet.axis, sign: sheet.sign, before, after };
    }, { input, origin });
    expect(result.prevented).toBe(true);
    expect((result.after[result.axis] - result.before[result.axis]) * result.sign).toBeGreaterThan(20);
    await expect(page.locator("#toast")).toHaveAttribute("data-sheet-state", "closed");
  }
});
