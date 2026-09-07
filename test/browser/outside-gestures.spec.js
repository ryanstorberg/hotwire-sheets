import { test, expect } from "@playwright/test";
import { examples } from "../../examples/catalog.js";

test.beforeEach(async ({ page }) => {
  page.on("pageerror", error => { throw error; });
  await page.goto("/");
  await page.waitForFunction(() => window.lab?.get("right"));
});

for (const [id, [name]] of Object.entries(examples)) {
  test(`${name} accepts touch dismissal or collapse starting outside its content`, async ({ page }) => {
    const result = await page.evaluate(async id => {
      const sheet = window.lab.get(id);
      await sheet.open({ immediate: true });
      if (sheet.options.detents.length > 1) await sheet.snapTo(1, { immediate: true });
      // Nonmodal presentations keep the page hit-testable; modal input lands on the backdrop.
      const target = sheet.options.modal ? sheet.view.querySelector("[data-sheet-backdrop]") : document.querySelector("h1");
      const before = sheet.position;
      const distance = (sheet.axis === "x" ? innerWidth : innerHeight) * .8;
      const send = (type, distance) => {
        const point = 200 + distance * sheet.sign;
        const event = new Event(type, { bubbles: true, cancelable: true });
        Object.defineProperty(event, "touches", { value: type === "touchend" ? [] : [{ target,
          clientX: sheet.axis === "x" ? point : 200, clientY: sheet.axis === "y" ? point : 200 }] });
        target.dispatchEvent(event);
        return event.defaultPrevented;
      };
      send("touchstart", 0);
      const prevented = send("touchmove", distance);
      const native = !!sheet.nativeMotion && sheet.view.contains(target);
      // Synthetic touch events have no browser default action. For native
      // sheets, verify it is allowed and emulate that default scroll offset.
      if (native && !prevented) sheet.view.scrollBy({
        [sheet.axis === "y" ? "top" : "left"]: -distance * sheet.sign, behavior: "instant"
      });
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const moved = before - sheet.position;
      send("touchend", distance);
      return { moved, before, prevented, native, persistent: !sheet.options.swipeToDismiss };
    }, id);
    expect(result.prevented).toBe(!result.native);
    expect(result.moved).toBeGreaterThan(result.before * .5);
    await expect(page.locator(`#${id}`)).toHaveAttribute("data-sheet-state", result.persistent ? "open" : "closed");
    if (result.persistent) expect(await page.evaluate(() => window.lab.get("persistent").detent)).toBe(0);
    else expect(await page.evaluate(() => document.body.style.position)).toBe("");
  });
}

test("a real mouse swipe well outside Sidebar dismisses it without activating the page", async ({ page, isMobile }) => {
  test.skip(isMobile, "Desktop mouse input; touch paths run in every configuration");
  await page.getByRole("button", { name: "Sidebar", exact: true }).click();
  await expect(page.locator("#right")).toHaveAttribute("data-sheet-state", "open");
  const box = await page.locator("#right-content").boundingBox();
  const x = box.x + box.width + 380, y = 260;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - box.width * .8, y, { steps: 10 });
  await page.mouse.up();
  await expect(page.locator("#right")).toHaveAttribute("data-sheet-state", "closed");
  await expect(page.getByRole("button", { name: "Sidebar", exact: true })).toBeFocused();
});

test("real wheel input on the backdrop drives both Sidebar and native scroll snap", async ({ page, isMobile }) => {
  test.skip(isMobile, "Browser mouse wheel input is unavailable in mobile WebKit");
  for (const id of ["right", "detents"]) {
    await page.evaluate(async id => {
      const sheet = window.lab.get(id);
      await sheet.open({ immediate: true });
    }, id);
    await page.mouse.move(id === "right" ? 800 : 10, 10);
    const distance = await page.evaluate(id => window.lab.get(id).extent, id);
    await page.mouse.wheel(id === "right" ? distance * .9 : 0, id === "detents" ? -distance * .9 : 0);
    await expect(page.locator(`#${id}`)).toHaveAttribute("data-sheet-state", "closed");
    expect(await page.evaluate(() => document.body.style.position)).toBe("");
  }
});

test("an outside drag controls only the front sheet and canceled drags do not become outside clicks", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const rear = window.lab.get("depth"), front = window.lab.get("depth-child");
    await rear.open({ immediate: true }); await front.open({ immediate: true });
    const before = rear.position, target = front.view.querySelector("[data-sheet-backdrop]");
    const send = (type, y) => target.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true,
      pointerId: 7, pointerType: "pen", isPrimary: true, button: 0, clientX: 8, clientY: y }));
    send("pointerdown", 30); send("pointermove", 90); send("pointercancel", 90);
    const click = new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 });
    target.dispatchEvent(click);
    return { before, after: rear.position, suppressed: click.defaultPrevented };
  });
  expect(result.after).toBe(result.before);
  expect(result.suppressed).toBe(true);
  await expect(page.locator("#depth-child")).toHaveAttribute("data-sheet-state", "open");
  const anchor = await page.locator("#depth-content").evaluate(node => node.getBoundingClientRect().bottom - innerHeight);
  expect(Math.abs(anchor)).toBeLessThan(1);
  // A later intentional outside tap still dismisses just the top layer.
  await page.waitForTimeout(260);
  await page.mouse.click(4, 4);
  await expect(page.locator("#depth-child")).toHaveAttribute("data-sheet-state", "closed");
  await expect(page.locator("#depth")).toHaveAttribute("data-sheet-state", "open");
});

test("outside swipe guards preserve controls, external islands, and explicit opt-outs", async ({ page }) => {
  const results = await page.evaluate(async () => {
    const sheet = window.lab.get("toast");
    await sheet.open({ immediate: true });
    const background = document.createElement("div");
    document.body.append(background);
    const results = [];
    for (const guard of ["disabled", "handleOnly", "draggable", "no-drag", "island", "button", "editable"]) {
      sheet.options.swipeFromOutside = guard !== "disabled";
      sheet.options.handleOnly = guard === "handleOnly";
      sheet.options.draggable = guard !== "draggable";
      background.innerHTML = guard === "button" ? "<button>Keep clicking</button>" : guard === "editable" ? '<div contenteditable="true">Keep editing</div>' : "<span>Background</span>";
      background.toggleAttribute("data-sheet-no-drag", guard === "no-drag");
      background.toggleAttribute("data-sheet-island", guard === "island");
      const target = background.firstElementChild, before = sheet.position;
      for (const [type, distance] of [["pointerdown", 0], ["pointermove", 290], ["pointerup", 290]]) {
        target.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 9,
          pointerType: "pen", isPrimary: true, button: 0,
          clientX: sheet.axis === "x" ? 10 + distance : 200, clientY: sheet.axis === "y" ? 300 - distance : 200 }));
      }
      const wheel = new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaX: sheet.axis === "x" ? -500 : 0, deltaY: sheet.axis === "y" ? 500 : 0 });
      target.dispatchEvent(wheel);
      results.push({ guard, moved: sheet.position - before, prevented: wheel.defaultPrevented });
    }
    background.remove();
    return results;
  });
  for (const result of results) { expect(result.moved, result.guard).toBe(0); expect(result.prevented, result.guard).toBe(false); }
});

test("nonmodal outside handling keeps ordinary page clicks working", async ({ page }) => {
  await page.evaluate(async () => {
    await window.lab.get("persistent").open({ immediate: true });
    const button = document.createElement("button");
    button.id = "background-control"; button.textContent = "Background action";
    button.style.cssText = "position:fixed;top:100px;left:0";
    button.onclick = () => button.dataset.clicked = "true";
    document.body.append(button);
  });
  await page.locator("#background-control").click();
  await expect(page.locator("#background-control")).toHaveAttribute("data-clicked", "true");
});

test("persistent player keeps a downward wheel swipe when it uncovers a page button", async ({ page, isMobile }) => {
  test.skip(isMobile, "Browser mouse wheel input is unavailable in mobile WebKit");
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.evaluate(async () => {
    const sheet = window.lab.get("persistent");
    await sheet.open({ immediate: true });
    await sheet.snapTo(1, { immediate: true });
  });
  // The first packet exposes the Bottom Sheet card; the second lands on its
  // image. They are one gesture, even though the hit target has changed.
  await page.mouse.move(200, 120);
  await page.mouse.wheel(0, -180);
  await page.waitForFunction(() => document.elementFromPoint(200, 120)?.closest('[data-sheet-open="basic"]'));
  await page.mouse.wheel(0, -500);
  await expect(page.locator("#persistent-content")).not.toHaveAttribute("data-expanded", "");
  await expect(page.locator("#persistent")).toHaveAttribute("data-sheet-state", "open");
  expect(await page.evaluate(() => window.lab.get("persistent").detent)).toBe(0);
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await expect(page.locator("#basic")).toHaveAttribute("data-sheet-state", "closed");
});

test("swiping the Lightbox image dismisses it without native image dragging", async ({ page, isMobile }) => {
  test.skip(isMobile, "Native image dragging uses desktop mouse input");
  await page.evaluate(() => window.lab.get("lightbox").open({ immediate: true }));
  const box = await page.locator(".lightbox-image").boundingBox();
  const x = box.x + box.width / 2, y = box.y + 30;
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x, page.viewportSize().height - 10, { steps: 12 });
  await page.mouse.up();
  await expect(page.locator("#lightbox")).toHaveAttribute("data-sheet-state", "closed");
});

test("opting out of outside swipes still allows content swipes", async ({ page }) => {
  await page.evaluate(async () => {
    const sheet = window.lab.get("right");
    sheet.options.swipeFromOutside = false;
    await sheet.open({ immediate: true });
    for (const [type, x] of [["pointerdown", 280], ["pointermove", 20], ["pointerup", 20]]) {
      sheet.content.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 7,
        pointerType: "pen", isPrimary: true, button: 0, clientX: x, clientY: 200 }));
    }
  });
  await expect(page.locator("#right")).toHaveAttribute("data-sheet-state", "closed");
});

test("an outside drag returns to its anchor when a new modal takes ownership", async ({ page }) => {
  await page.evaluate(async () => {
    const rear = window.lab.get("depth"), front = window.lab.get("depth-child");
    await rear.open({ immediate: true });
    const target = rear.view.querySelector("[data-sheet-backdrop]");
    const send = (type, y) => target.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true,
      pointerId: 7, pointerType: "pen", isPrimary: true, button: 0, clientX: 8, clientY: y }));
    send("pointerdown", 30); send("pointermove", 100);
    await front.open({ immediate: true });
    send("pointermove", 180); send("pointerup", 180);
  });
  for (const id of ["depth", "depth-child"]) await expect(page.locator(`#${id}`)).toHaveAttribute("data-sheet-state", "open");
  expect(await page.evaluate(() => window.lab.get("depth").position - window.lab.get("depth").extent)).toBe(0);
  const focused = await page.evaluate(() => window.lab.get("depth-child").content.contains(document.activeElement));
  expect(focused).toBe(true);
});
