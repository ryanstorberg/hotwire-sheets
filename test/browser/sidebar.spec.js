import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  page.on("pageerror", error => { throw error; });
  await page.goto("/");
  await page.waitForFunction(() => window.lab?.get("right"));
  await page.getByRole("button", { name: "Sidebar", exact: true }).click();
  await expect(page.locator("#right")).toHaveAttribute("data-sheet-state", "open");
  await page.locator("#right-content").evaluate(panel => {
    panel.dataset.activations = "0";
    panel.addEventListener("click", event => {
      if (event.target.closest("[data-sidebar-item]")) panel.dataset.activations = String(Number(panel.dataset.activations) + 1);
    });
  });
});

test("sidebar menu items accept a touch swipe left without activating the item", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const sheet = window.lab.get("right"), item = sheet.content.querySelector("[data-sidebar-item] span");
    const send = (type, x) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(event, "touches", { value: type === "touchend" ? [] : [{ target: item, clientX: x, clientY: 220 }] });
      item.dispatchEvent(event);
    };
    send("touchstart", 260); send("touchmove", 120);
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const left = sheet.content.getBoundingClientRect().left;
    send("touchmove", 20); send("touchend", 20);
    item.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 }));
    return { left, activations: sheet.content.dataset.activations };
  });
  expect(result.left).toBeLessThan(-100);
  expect(result.activations).toBe("0");
  await expect(page.locator("#right")).toHaveAttribute("data-sheet-state", "closed");
  await expect(page.getByRole("button", { name: "Sidebar", exact: true })).toBeFocused();
  expect(await page.evaluate(() => document.body.style.position)).toBe("");
});

test("sidebar items keep clicks and vertical touch scrolling, and canceled swipes restore the panel", async ({ page }) => {
  await page.locator("#right-content").getByRole("button", { name: "Overview", exact: true }).click();
  await expect(page.locator("#right-content")).toHaveAttribute("data-activations", "1");
  const result = await page.evaluate(async () => {
    const sheet = window.lab.get("right"), item = sheet.content.querySelector("[data-sidebar-item]");
    const send = (type, x, y) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(event, "touches", { value: /end|cancel/.test(type) ? [] : [{ target: item, clientX: x, clientY: y }] });
      item.dispatchEvent(event);
      return event.defaultPrevented;
    };
    send("touchstart", 120, 350);
    const verticalPrevented = send("touchmove", 122, 250);
    send("touchend", 122, 250);
    const afterVertical = sheet.content.getBoundingClientRect().left;
    send("touchstart", 200, 250); send("touchmove", 90, 250);
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const duringSwipe = sheet.content.getBoundingClientRect().left;
    send("touchcancel", 90, 250);
    return { verticalPrevented, afterVertical, duringSwipe };
  });
  expect(result.verticalPrevented).toBe(false);
  expect(result.afterVertical).toBeCloseTo(0, 0);
  expect(result.duringSwipe).toBeLessThan(-90);
  await expect(page.locator("#right")).toHaveAttribute("data-sheet-state", "open");
  expect((await page.locator("#right-content").boundingBox()).x).toBeCloseTo(0, 0);
});

test("sidebar controls can be dragged left with real mouse input", async ({ page, isMobile }) => {
  test.skip(isMobile, "Mouse input is covered on desktop; touch swipes have separate coverage.");
  for (const tag of ["button", "a"]) {
    await page.evaluate(async tag => {
      const sheet = window.lab.get("right");
      await sheet.open({ immediate: true });
      if (tag === "a") {
        const button = sheet.content.querySelector("[data-sidebar-item]");
        const link = document.createElement("a");
        for (const attribute of button.attributes) link.setAttribute(attribute.name, attribute.value);
        link.href = "#sidebar-destination";
        link.innerHTML = button.innerHTML;
        button.replaceWith(link);
      }
    }, tag);
    const item = page.locator("#right-content [data-sidebar-item]").first();
    const box = await item.boundingBox();
    await page.mouse.move(box.x + box.width - 5, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(2, box.y + box.height / 2, { steps: 6 });
    await page.mouse.up();
    await expect(page.locator("#right")).toHaveAttribute("data-sheet-state", "closed");
    await expect(page.locator("#right-content")).toHaveAttribute("data-activations", "0");
    expect(new URL(page.url()).hash).toBe("");
  }
});

test("sidebar scrolls vertically and completes a horizontal trackpad swipe after exposing the backdrop", async ({ page, isMobile }) => {
  test.skip(isMobile, "Mobile WebKit does not expose mouse wheel input.");
  const panel = page.locator("#right-content"), body = panel.locator("[data-sheet-body]");
  const box = await panel.boundingBox();
  await page.mouse.move(box.x + box.width * .85, box.y + box.height * .4);
  await page.mouse.wheel(0, 300);
  await expect.poll(() => body.evaluate(node => node.scrollTop)).toBeGreaterThan(100);
  await expect(page.locator("#right")).toHaveAttribute("data-sheet-state", "open");
  for (let packet = 0; packet < 8; packet++) await page.mouse.wheel(box.width * .1, 0);
  await expect(page.locator("#right")).toHaveAttribute("data-sheet-state", "closed");
});

test("sidebar swipe opt-in respects protected regions and disabled dragging", async ({ page }) => {
  for (const guard of ["region", "draggable", "handleOnly"]) {
    const position = await page.evaluate(guard => {
      const sheet = window.lab.get("right"), item = sheet.content.querySelector("[data-sidebar-item]");
      sheet.options.draggable = guard !== "draggable";
      sheet.options.handleOnly = guard === "handleOnly";
      item.parentElement.toggleAttribute("data-sheet-no-drag", guard === "region");
      for (const [type, x] of [["pointerdown", 260], ["pointermove", 20], ["pointerup", 20]]) {
        item.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 7, pointerType: "pen", isPrimary: true, button: 0, clientX: x, clientY: 220 }));
      }
      return sheet.position - sheet.extent;
    }, guard);
    expect(position).toBe(0);
  }
  await expect(page.locator("#right")).toHaveAttribute("data-sheet-state", "open");
});
