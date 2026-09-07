import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/regression");
  await page.waitForFunction(() => window.lab?.get("basic"));
  await page.evaluate(() => {
    window.commitSheet = (options = {}) => {
      const root = document.createElement("div");
      root.innerHTML = '<div data-sheet-view hidden><div data-sheet-backdrop></div><div data-sheet-content aria-label="Dismissal test"><button data-sheet-close>Close</button><div data-sheet-body>Content</div></div></div>';
      document.body.append(root);
      return new window.lab.Sheet(root, { detents: ["300px"], ...options });
    };
    window.wheelPacket = (sheet, delta, cancelable = true) => {
      const event = new WheelEvent("wheel", { bubbles: true, cancelable, [sheet.axis === "y" ? "deltaY" : "deltaX"]: delta });
      sheet.content.dispatchEvent(event);
      return event.defaultPrevented;
    };
    window.pullSheet = (sheet, visible) => {
      wheelPacket(sheet, -(sheet.position-visible)*sheet.sign);
      if (sheet.nativeMotion) {
        // Synthetic wheel events do not perform the browser's default scroll.
        sheet.view.scrollTo({ [sheet.axis === "y" ? "top" : "left"]: sheet.sign > 0 ? visible : sheet.extent-visible, behavior: "instant" });
        sheet.view.dispatchEvent(new Event("scroll"));
      }
    };
  });
});

for (const scrollSnap of [false, true]) {
  test(`${scrollSnap ? "native" : "WAAPI"} wheel dismissal commits halfway on every edge while momentum continues`, async ({ page }) => {
    const results = await page.evaluate(async scrollSnap => {
      const results = [];
      for (const edge of ["bottom", "top", "left", "right"]) {
        const sheet = commitSheet({ edge, scrollSnap });
        await sheet.open({ immediate: true });
        let attempts = 0, closeTime;
        sheet.root.addEventListener("sheet:before-close", () => attempts++);
        const start = performance.now();
        sheet.root.addEventListener("sheet:close", () => closeTime = performance.now()-start);
        pullSheet(sheet, sheet.extent*.45);
        const committed = sheet.state === "closing" && attempts === 1;
        for (let packet = 0; packet < 28; packet++) {
          wheelPacket(sheet, -sheet.sign, packet % 2 === 0);
          await new Promise(resolve => setTimeout(resolve, 25));
        }
        results.push({ edge, committed, attempts, state: sheet.state, closeTime, hidden: sheet.view.hidden });
        sheet.destroy();
      }
      return results;
    }, scrollSnap);
    for (const result of results) {
      expect(result, JSON.stringify(result)).toMatchObject({ committed: true, attempts: 1, state: "closed", hidden: true });
      expect(result.closeTime).toBeLessThan(700);
    }
  });

  test(`${scrollSnap ? "native" : "WAAPI"} short wheel pulls settle without waiting for a weak momentum tail`, async ({ page }) => {
    const result = await page.evaluate(async scrollSnap => {
      const sheet = commitSheet({ scrollSnap }); await sheet.open({ immediate: true });
      pullSheet(sheet, sheet.extent*.8);
      await new Promise(resolve => setTimeout(resolve, 70));
      wheelPacket(sheet, -1);
      const settling = sheet.state;
      for (let packet = 0; packet < 28; packet++) {
        wheelPacket(sheet, -.5); await new Promise(resolve => setTimeout(resolve, 25));
      }
      return { settling, state: sheet.state, position: sheet.position, extent: sheet.extent, overflow: getComputedStyle(sheet.view).overflowY };
    }, scrollSnap);
    expect(result.settling).toBe("settling"); expect(result.state).toBe("open");
    expect(result.position).toBeCloseTo(result.extent, 0);
    if (scrollSnap) expect(result.overflow).toBe("auto");
  });

  test(`${scrollSnap ? "native" : "WAAPI"} commitment preserves close vetoes and open detents`, async ({ page }) => {
    const result = await page.evaluate(async scrollSnap => {
      const sheet = commitSheet({ scrollSnap }); await sheet.open({ immediate: true });
      let vetoes = 0;
      sheet.root.addEventListener("sheet:before-close", event => { vetoes++; event.preventDefault(); }, { once: true });
      pullSheet(sheet, sheet.extent*.4);
      for (let packet = 0; packet < 28; packet++) { wheelPacket(sheet, -1); await new Promise(resolve => setTimeout(resolve, 25)); }
      const veto = { state: sheet.state, position: sheet.position, extent: sheet.extent, vetoes };
      sheet.destroy();
      const detents = commitSheet({ scrollSnap, detents: ["100px", "300px"], initialDetent: 1 });
      await detents.open({ immediate: true }); pullSheet(detents, 120);
      const between = detents.state;
      await new Promise(resolve => setTimeout(resolve, 70)); wheelPacket(detents, -1);
      await new Promise(resolve => setTimeout(resolve, 650));
      const collapsed = { state: detents.state, position: detents.position, detent: detents.detent };
      pullSheet(detents, 40); const committed = detents.state === "closing";
      return { veto, between, collapsed, committed };
    }, scrollSnap);
    expect(result.veto.state).toBe("open"); expect(result.veto.vetoes).toBe(1);
    expect(result.veto.position).toBeCloseTo(result.veto.extent, 0);
    expect(result.between).toBe("dragging");
    expect(result.collapsed).toEqual({ state: "open", position: 100, detent: 0 }); expect(result.committed).toBe(true);
  });
}

test("native touch commits on release and a canceled held drag still restores its detent", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const sheet = commitSheet({ scrollSnap: true });
    const send = type => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(event, "touches", { value: type === "touchstart" ? [{ clientX: 100, clientY: 300 }] : [] });
      sheet.content.dispatchEvent(event);
    };
    const states = [];
    for (const end of ["touchcancel", "touchend"]) {
      await sheet.open({ immediate: true }); send("touchstart");
      sheet.nativeMotion.interact(sheet.content, -180);
      sheet.view.scrollTop = 120; sheet.view.dispatchEvent(new Event("scroll"));
      await new Promise(resolve => setTimeout(resolve, 220));
      states.push(sheet.state); send(end); states.push(sheet.state);
      await new Promise(resolve => setTimeout(resolve, 700)); states.push(sheet.state);
    }
    await sheet.open({ immediate: true }); send("touchstart");
    sheet.nativeMotion.interact(sheet.content, -60);
    sheet.view.scrollTop = 240; sheet.view.dispatchEvent(new Event("scroll"));
    send("touchend");
    const settling = sheet.state;
    send("touchstart"); sheet.nativeMotion.interact(sheet.content, -10);
    const restart = { settling, state: sheet.state, overflow: getComputedStyle(sheet.view).overflowY };
    send("touchcancel");
    return { states, restart };
  });
  expect(result.states).toEqual(["dragging", "settling", "open", "dragging", "closing", "closed"]);
  expect(result.restart).toEqual({ settling: "settling", state: "dragging", overflow: "auto" });
});

test("real wheel commitment closes only the top depth layer and immediately accepts fresh parent scrolling", async ({ page, isMobile }) => {
  test.skip(isMobile, "Physical browser wheel input is desktop-only; native touch is covered separately");
  await page.goto("/"); await page.waitForFunction(() => window.lab?.get("depth"));
  await page.evaluate(async () => { for (const id of ["depth", "depth-child", "depth-third"]) await window.lab.get(id).open({ immediate: true }); });
  const { width, height } = page.viewportSize(); await page.mouse.move(width/2, height*.3);
  await page.mouse.wheel(0, -height*.65);
  // Browser wheel dispatch already crosses an animation frame in WebKit. An
  // extra protocol wait can turn this intended continuous tail into a fresh
  // gesture under load by exceeding the documented 120 ms quiet interval.
  for (let packet = 0; packet < 28; packet++) await page.mouse.wheel(0, -2);
  await expect(page.locator("#depth-third")).toHaveAttribute("data-sheet-state", "closed");
  const parent = await page.evaluate(() => {
    const sheet = window.lab.get("depth-child");
    return { state: sheet.state, position: sheet.nativeMotion.position, extent: sheet.extent, inert: sheet.view.inert, scroll: sheet.content.querySelector("[data-sheet-body]").scrollTop };
  });
  expect(parent.state).toBe("open"); expect(parent.inert).toBe(false); expect(parent.scroll).toBe(0);
  expect(parent.position).toBeCloseTo(parent.extent, 0);
  await page.mouse.wheel(0, 160);
  await expect.poll(() => page.locator("#depth-child-content [data-sheet-body]").evaluate(el => el.scrollTop)).toBeGreaterThan(50);
});
