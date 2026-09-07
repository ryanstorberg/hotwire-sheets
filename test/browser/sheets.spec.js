import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  page.on("pageerror", (error) => { throw error; });
  await page.goto("/regression");
  await page.waitForFunction(() => window.lab?.get("basic"));
});

async function open(page, id, options = {}) {
  await page.evaluate(({ id, options }) => window.lab.get(id).open({ immediate: true, ...options }), { id, options });
}
async function state(page, id, value) { await expect(page.locator(`#${id}`)).toHaveAttribute("data-sheet-state", value); }
async function close(page, id) { await page.evaluate((id) => window.lab.get(id).close({ immediate: true }), id); }

test("trigger opens an accessible sheet and Escape restores focus and scroll", async ({ page }) => {
  await page.locator('[data-sheet-open="basic"]').click();
  await state(page, "basic", "open");
  await expect(page.getByRole("dialog", { name: "Bottom Sheet" })).toBeVisible();
  await expect(page.locator("#page")).toHaveAttribute("inert", "");
  expect(await page.evaluate(() => document.body.style.position)).toBe("fixed");
  await page.keyboard.press("Escape");
  await state(page, "basic", "closed");
  await expect(page.locator('[data-sheet-open="basic"]')).toBeFocused();
  await expect(page.locator("#page")).not.toHaveAttribute("inert", "");
  expect(await page.evaluate(() => document.body.style.position)).toBe("");
});

test("focus wraps in both directions and respects a dynamically inserted control", async ({ page }) => {
  await open(page, "basic");
  const panel = page.locator('[aria-labelledby="basic-title"]');
  await panel.locator("[data-sheet-close]").focus();
  await page.keyboard.press("Tab");
  await expect(panel.locator("[data-sheet-handle]")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(panel.locator("[data-sheet-close]")).toBeFocused();
  await panel.evaluate((element) => { const button = document.createElement("button"); button.textContent = "Dynamic control"; element.append(button); });
  await page.getByRole("button", { name: "Dynamic control" }).focus();
  await page.keyboard.press("Tab");
  await expect(panel.locator("[data-sheet-handle]")).toBeFocused();
});

test("nested sheets keep the parent locked and restore the child trigger", async ({ page }) => {
  await open(page, "stacked");
  await page.waitForFunction(() => window.lab.get("child"));
  await page.locator('[data-sheet-open="child"]').click();
  await state(page, "child", "open");
  expect(await page.locator('[aria-labelledby="stacked-title"]').evaluate((el) => !!el.closest("[inert]"))).toBe(true);
  await page.keyboard.press("Escape");
  await state(page, "child", "closed");
  await state(page, "stacked", "open");
  expect(await page.evaluate(() => document.body.style.position)).toBe("fixed");
  await expect(page.locator('[data-sheet-open="child"]')).toBeFocused();
  await close(page, "stacked");
  expect(await page.evaluate(() => document.body.style.position)).toBe("");
});

test("keyboard detents preserve indices and keep the footer visible", async ({ page }) => {
  await open(page, "detents");
  const handle = page.locator('[aria-labelledby="detents-title"] [data-sheet-handle]');
  await handle.focus();
  await page.keyboard.press("Home");
  await state(page, "detents", "open");
  await expect.poll(() => page.evaluate(() => window.lab.get("detents").detent)).toBe(0);
  const footer = await page.getByRole("button", { name: "Done exploring" }).boundingBox();
  const viewport = page.viewportSize();
  expect(footer.y + footer.height).toBeLessThanOrEqual(viewport.height + 1);
  await page.keyboard.press("End");
  await expect.poll(() => page.evaluate(() => window.lab.get("detents").detent)).toBe(2);
});

test("mouse drag snaps and a deliberate outward drag dismisses", async ({ page }, info) => {
  test.skip(info.project.name === "mobile-webkit", "Mouse input is covered in desktop projects; touch has separate coverage.");
  await open(page, "detents", { detent: 1 });
  let box = await page.locator('[aria-labelledby="detents-title"] [data-sheet-handle]').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y - 200, { steps: 12 });
  await page.mouse.up();
  await state(page, "detents", "open");
  expect(await page.evaluate(() => window.lab.get("detents").detent)).toBe(2);
  await page.evaluate(() => window.lab.get("detents").snapTo(0, { immediate: true }));
  box = await page.locator('[aria-labelledby="detents-title"] [data-sheet-handle]').boundingBox();
  await page.mouse.move(box.x + 30, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(box.x + 30, box.y + page.viewportSize().height * 0.33, { steps: 12 });
  await page.mouse.up();
  await state(page, "detents", "closed");
});

test("touch handle moves the sheet and cancellation returns to its detent", async ({ page }) => {
  await open(page, "detents");
  const result = await page.evaluate(async () => {
    const sheet = window.lab.get("detents"), handle = sheet.content.querySelector("[data-sheet-handle]");
    const bounds = handle.getBoundingClientRect();
    const send = (type, y, active) => {
      const touch = { identifier: 1, target: handle, clientX: bounds.x + 30, clientY: y };
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(event, "touches", { value: active ? [touch] : [] });
      handle.dispatchEvent(event);
    };
    const before = sheet.position;
    send("touchstart", bounds.y + 10, true);
    send("touchmove", bounds.y + 100, true);
    const after = sheet.position;
    send("touchcancel", bounds.y + 100, false);
    return { before, after };
  });
  expect(result.after).toBeLessThan(result.before - 50);
  await state(page, "detents", "open");
  expect(await page.evaluate(() => window.lab.get("detents").detent)).toBe(1);
});

test("native nested scrolling is not consumed while scroll room remains", async ({ page }) => {
  await open(page, "detents", { detent: 2 });
  const result = await page.evaluate(() => {
    const sheet = window.lab.get("detents"), body = sheet.content.querySelector("[data-sheet-body]");
    body.scrollTop = 50;
    const event = new WheelEvent("wheel", { deltaY: 60, bubbles: true, cancelable: true });
    body.dispatchEvent(event);
    return { prevented: event.defaultPrevented, state: sheet.state };
  });
  expect(result).toEqual({ prevented: false, state: "open" });
});

test("wheel input hands off at a scroll boundary and can dismiss", async ({ page }) => {
  await open(page, "detents", { detent: 0 });
  const prevented = await page.evaluate(() => {
    const sheet = window.lab.get("detents"), body = sheet.content.querySelector("[data-sheet-body]");
    body.scrollTop = 0;
    const event = new WheelEvent("wheel", { deltaY: -800, bubbles: true, cancelable: true });
    body.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(prevented).toBe(true);
  await state(page, "detents", "closed");
});

for (const edge of ["top", "left", "right"]) {
  test(`${edge} sheet anchors at the correct edge`, async ({ page }) => {
    await open(page, edge);
    const box = await page.evaluate((id) => {
      const rect = window.lab.get(id).content.getBoundingClientRect();
      return { top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom, width: innerWidth, height: innerHeight };
    }, edge);
    if (edge === "top") expect(Math.abs(box.top)).toBeLessThan(1);
    if (edge === "left") expect(Math.abs(box.left)).toBeLessThan(1);
    if (edge === "right") expect(Math.abs(box.right - box.width)).toBeLessThan(1);
    await close(page, edge);
    await state(page, edge, "closed");
  });
}

test("nonmodal presentation leaves background interactive and unlocked", async ({ page }) => {
  await open(page, "persistent");
  await expect(page.locator("#page")).not.toHaveAttribute("inert", "");
  expect(await page.evaluate(() => document.body.style.position)).toBe("");
  await expect(page.getByRole("dialog", { name: "Persistent Sheet with Detent" })).not.toHaveAttribute("aria-modal", "true");
  await page.locator("#navigate").focus();
  await expect(page.locator("#navigate")).toBeFocused();
});

test("nondismissible sheets ignore Escape, outside clicks, and outward swipes", async ({ page }) => {
  await open(page, "locked");
  await page.keyboard.press("Escape");
  await state(page, "locked", "open");
  await page.evaluate(() => window.lab.get("locked").view.querySelector("[data-sheet-backdrop]").click());
  await state(page, "locked", "open");
  await page.evaluate(() => window.lab.get("locked").settle(-3));
  await state(page, "locked", "open");
  await page.getByRole("button", { name: "Confirm and close" }).click();
  await state(page, "locked", "closed");
});

test("cancelable lifecycle prevents closing without leaking transient state", async ({ page }) => {
  await open(page, "basic");
  const result = await page.evaluate(async () => {
    const sheet = window.lab.get("basic");
    sheet.root.addEventListener("sheet:before-close", (event) => event.preventDefault(), { once: true });
    return sheet.close();
  });
  expect(result).toBe(false);
  await state(page, "basic", "open");
  await close(page, "basic");
  await state(page, "basic", "closed");
});

test("rapid open-close-open resolves every animation and ends open", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const sheet = window.lab.get("basic");
    const opening = sheet.open();
    const closing = sheet.close();
    const reopening = sheet.open();
    return Promise.all([opening, closing, reopening]);
  });
  expect(result).toEqual([false, false, true]);
  await state(page, "basic", "open");
  await close(page, "basic");
});

test("reduced motion finishes synchronously without a spring", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const result = await page.evaluate(async () => {
    const sheet = window.lab.get("basic");
    await sheet.open();
    return { state: sheet.state, difference: Math.abs(sheet.position - sheet.points[0]) };
  });
  expect(result).toEqual({ state: "open", difference: 0 });
});

test("destroy removes a portal, unlocks the page, and supports reconnect", async ({ page }) => {
  await open(page, "basic");
  await page.locator("#basic").evaluate((el) => el.removeAttribute("data-controller"));
  await expect.poll(() => page.evaluate(() => window.lab.get("basic") == null)).toBe(true);
  expect(await page.evaluate(() => document.body.style.position)).toBe("");
  await expect(page.locator("#basic [data-sheet-view]")).toBeHidden();
  await page.locator("#basic").evaluate((el) => el.setAttribute("data-controller", "sheet"));
  await page.waitForFunction(() => window.lab.get("basic"));
  await open(page, "basic");
  await state(page, "basic", "open");
});

test("Turbo Frame loads and a Stream update keeps the sheet open", async ({ page }) => {
  await open(page, "keyboard");
  await expect(page.getByRole("heading", { name: "Loaded from a Turbo Frame" })).toBeVisible();
  await page.evaluate(() => window.lab.Turbo.renderStreamMessage('<turbo-stream action="update" target="details"><template><p id="stream-result">Updated through Turbo</p></template></turbo-stream>'));
  await expect(page.locator("#stream-result")).toBeVisible();
  await state(page, "keyboard", "open");
});

test("Turbo navigation closes ordinary sheets and permits reopening after Back", async ({ page }) => {
  await open(page, "basic");
  await page.evaluate(() => window.lab.Turbo.visit("/regression/next"));
  await expect(page).toHaveURL(/\/next$/);
  await page.waitForFunction(() => window.lab.get("basic")?.state === "closed");
  expect(await page.evaluate(() => document.body.style.position)).toBe("");
  await page.evaluate(() => { window.lab.navigation = new Promise((resolve) => document.addEventListener("turbo:load", resolve, { once: true })); });
  await page.goBack();
  await page.evaluate(() => window.lab.navigation);
  await page.waitForFunction(() => window.lab.get("basic")?.state === "closed");
  await open(page, "basic");
  await state(page, "basic", "open");
});

test("Turbo permanent sheet restores its detent across a real visit", async ({ page }) => {
  await open(page, "persistent", { detent: 1 });
  await page.evaluate(() => window.lab.Turbo.visit("/regression/next"));
  await expect(page).toHaveURL(/\/next$/);
  await state(page, "persistent", "open");
  expect(await page.evaluate(() => window.lab.get("persistent").detent)).toBe(1);
  expect(await page.getByRole("dialog", { name: "Persistent Sheet with Detent", exact: true }).count()).toBe(1);
});

test("content detent grows after asynchronous content is inserted", async ({ page }) => {
  await open(page, "basic");
  const before = await page.evaluate(() => window.lab.get("basic").points[0]);
  await page.evaluate(() => {
    const body = window.lab.get("basic").content.querySelector("[data-sheet-body]");
    const child = document.createElement("div"); child.style.height = "100px"; body.append(child);
  });
  await expect.poll(() => page.evaluate(() => window.lab.get("basic").points[0])).toBeGreaterThan(before + 50);
});

test("preexisting inert and inline body styles are restored", async ({ page }) => {
  await page.evaluate(() => { document.body.style.paddingRight = "7px"; document.querySelector("#left").inert = true; });
  await open(page, "basic");
  await close(page, "basic");
  expect(await page.evaluate(() => document.body.style.paddingRight)).toBe("7px");
  await expect(page.locator("#left")).toHaveAttribute("inert", "");
  await expect(page.locator("#page")).not.toHaveAttribute("inert", "");
});

test("new background nodes become inert while modal is open", async ({ page }) => {
  await open(page, "basic");
  await page.evaluate(() => { const button = document.createElement("button"); button.id = "outside-new"; button.textContent = "Outside"; document.body.append(button); });
  await expect(page.locator("#outside-new")).toHaveAttribute("inert", "");
  await close(page, "basic");
  await expect(page.locator("#outside-new")).not.toHaveAttribute("inert", "");
});

test("open dialog has no axe A/AA accessibility violations", async ({ page }) => {
  await open(page, "basic");
  const scan = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(scan.violations).toEqual([]);
});

test("a viewport reduced by the keyboard resizes the sheet and keeps its footer above the keyboard", async ({ page }) => {
  await open(page, "keyboard");
  await page.getByLabel("A longer thought").focus();
  await page.evaluate(() => {
    const original = window.visualViewport;
    Object.defineProperty(window, "visualViewport", { configurable: true, value: {
      height: 360, width: innerWidth, offsetTop: 0, offsetLeft: 0, scale: 1
    } });
    window.dispatchEvent(new Event("resize"));
    window.lab.originalViewport = original;
  });
  await expect.poll(() => page.evaluate(() => window.lab.get("keyboard").viewport.height)).toBe(360);
  const button = await page.getByRole("button", { name: "Close form" }).boundingBox();
  expect(button.y + button.height).toBeLessThanOrEqual(361);
  expect(await page.evaluate(() => Number.parseFloat(window.lab.get("keyboard").view.style.getPropertyValue("--sheet-viewport-keyboard")))).toBeGreaterThan(0);
});

test("a top sheet keeps actions visible at a partial detent in document order", async ({ page }) => {
  await page.evaluate(() => {
    const root = document.getElementById("top");
    window.lab.get("top").destroy();
    new window.lab.Sheet(root, { edge: "top", detents: [0.5, 1] });
  });
  await open(page, "top");
  const actions = await page.getByRole("dialog", { name: "Top Sheet" }).getByRole("button", { name: "Close" }).boundingBox();
  expect(actions.y).toBeGreaterThanOrEqual(0);
  expect(actions.y + actions.height).toBeLessThanOrEqual(page.viewportSize().height * 0.5 + 1);
});

test("an explicitly marked island stays accessible alongside a modal", async ({ page }) => {
  await page.evaluate(() => {
    const island = document.createElement("aside");
    island.dataset.sheetIsland = "";
    island.innerHTML = '<button id="island-action">Help</button>';
    document.body.append(island);
  });
  await open(page, "basic");
  await page.locator("#island-action").focus();
  await expect(page.locator("#island-action")).toBeFocused();
  expect(await page.locator("#island-action").evaluate((node) => !!node.closest("[inert]"))).toBe(false);
});

test("modified trigger clicks retain normal link navigation behavior", async ({ page }) => {
  const result = await page.evaluate(() => {
    const trigger = document.querySelector('[data-sheet-open="basic"]');
    const event = new MouseEvent("click", { bubbles: true, cancelable: true, metaKey: true });
    trigger.dispatchEvent(event);
    return { prevented: event.defaultPrevented, state: window.lab.get("basic").state };
  });
  expect(result).toEqual({ prevented: false, state: "closed" });
});

test("starting a drag on an editable input leaves the sheet stationary", async ({ page }) => {
  await open(page, "basic");
  const result = await page.evaluate(() => {
    const sheet = window.lab.get("basic"), input = sheet.content.querySelector("input");
    const before = sheet.position;
    input.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 4, pointerType: "pen", isPrimary: true, button: 0, clientX: 80, clientY: 400 }));
    input.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, cancelable: true, pointerId: 4, pointerType: "pen", isPrimary: true, clientX: 80, clientY: 650 }));
    input.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 4, pointerType: "pen", isPrimary: true }));
    return { before, after: sheet.position, state: sheet.state };
  });
  expect(result.after).toBe(result.before);
  expect(result.state).toBe("open");
});

test("removing a parent with an open child releases all modal resources", async ({ page }) => {
  await open(page, "stacked");
  await page.waitForFunction(() => window.lab.get("child"));
  await open(page, "child");
  await page.locator("#stacked").evaluate((node) => node.remove());
  await expect.poll(() => page.evaluate(() => document.body.style.position)).toBe("");
  await expect(page.getByRole("dialog", { name: "Everything in its place." })).toHaveCount(0);
  await expect(page.locator("#page")).not.toHaveAttribute("inert", "");
});

for (const edge of ["left", "right"]) {
  test(`${edge} partial detent keeps its controls on screen`, async ({ page }) => {
    await page.locator(`#${edge}`).evaluate((element) => { element.removeAttribute("data-controller"); });
    await page.waitForFunction((id) => !window.lab.get(id), edge);
    await page.evaluate((id) => new window.lab.Sheet(document.getElementById(id), { edge: id, detents: [0.5, 1] }), edge);
    await open(page, edge);
    const box = await page.evaluate((id) => {
      const rect = window.lab.get(id).content.querySelector("button").getBoundingClientRect();
      return { left: rect.left, right: rect.right, width: innerWidth };
    }, edge);
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(box.width + 1);
  });
}

test("packaged importmap modules share the same public Sheet instance", async ({ page }) => {
  await page.goto("/regression?assets=built");
  await page.waitForFunction(() => window.lab?.get("basic"));
  expect(await page.evaluate(() => {
    const root = document.getElementById("basic");
    return window.lab.application.getControllerForElementAndIdentifier(root, "sheet").sheet === window.lab.Sheet.get(root);
  })).toBe(true);
  await page.locator('[data-sheet-open="basic"]').click();
  await state(page, "basic", "open");
  await page.keyboard.press("Escape");
  await state(page, "basic", "closed");
});

test("wheel momentum remains in its scroll body at the boundary until a new gesture", async ({ page }) => {
  await open(page, "detents", { detent: 2 });
  const result = await page.evaluate(() => {
    const sheet = window.lab.get("detents"), body = sheet.content.querySelector("[data-sheet-body]");
    const send = deltaY => { const event = new WheelEvent("wheel", { deltaY, bubbles: true, cancelable: true }); body.dispatchEvent(event); return event.defaultPrevented; };
    body.scrollTop = 60;
    const before = sheet.position, native = send(-80);
    // The native default action has reached the top; subsequent packets are momentum.
    body.scrollTop = 0;
    const boundary = send(-60);
    send(-40); send(-20);
    const reverse = send(30);
    return { native, boundary, reverse, before, after: sheet.position, state: sheet.state };
  });
  expect(result.native).toBe(false);
  expect(result.boundary).toBe(true);
  expect(result.reverse).toBe(false);
  expect(result.after).toBe(result.before);
  expect(result.state).toBe("open");
  await page.waitForTimeout(180);
  await page.locator("#detents-content [data-sheet-body]").dispatchEvent("wheel", { deltaY: -3000 });
  await state(page, "detents", "closed");
});

test("a touch already scrolling content does not turn into a sheet drag at its boundary", async ({ page }) => {
  await open(page, "detents", { detent: 2 });
  const result = await page.evaluate(() => {
    const sheet = window.lab.get("detents"), body = sheet.content.querySelector("[data-sheet-body]");
    const send = (type, y, active = true) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(event, "touches", { value: active ? [{ identifier: 1, target: body, clientX: 100, clientY: y }] : [] });
      body.dispatchEvent(event);
    };
    const before = sheet.position;
    body.scrollTop = 60;
    send("touchstart", 200); send("touchmove", 250);
    body.scrollTop = 0;
    send("touchmove", 300); send("touchmove", 350);
    const afterScroll = sheet.position, duringScroll = sheet.state;
    send("touchend", 350, false);
    send("touchstart", 200); send("touchmove", 300);
    const afterNewDrag = sheet.position;
    send("touchcancel", 300, false);
    return { before, afterScroll, duringScroll, afterNewDrag };
  });
  expect(result.afterScroll).toBe(result.before);
  expect(result.duringScroll).toBe("open");
  expect(result.afterNewDrag).toBeLessThan(result.before - 50);
  await state(page, "detents", "open");
});

test("wheel input and spring rebounds cannot move a sheet past its open anchor on any edge", async ({ page }) => {
  for (const [id, edge] of [["detents", "bottom"], ["top", "top"], ["left", "left"], ["right", "right"]]) {
    await open(page, id, id === "detents" ? { detent: 2 } : {});
    const gap = await page.evaluate(async ({ id, edge }) => {
      const sheet = window.lab.get(id);
      sheet.content.dispatchEvent(new WheelEvent("wheel", { [sheet.axis === "y" ? "deltaY" : "deltaX"]: 800 * sheet.sign, bubbles: true, cancelable: true }));
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return Math.abs(sheet.content.getBoundingClientRect()[edge] - sheet.view.getBoundingClientRect()[edge]);
    }, { id, edge });
    expect(gap, `${edge} wheel anchor gap`).toBeLessThan(1);
    await state(page, id, "open");
    const rebound = await page.evaluate(async ({ id, edge }) => {
      const sheet = window.lab.get(id), gaps = [];
      const measure = () => gaps.push(Math.abs(sheet.content.getBoundingClientRect()[edge] - sheet.view.getBoundingClientRect()[edge]));
      sheet.root.addEventListener("sheet:progress", measure);
      await sheet.snapTo(sheet.detent, { velocity: 8 });
      sheet.root.removeEventListener("sheet:progress", measure);
      return Math.max(...gaps);
    }, { id, edge });
    expect(rebound, `${edge} spring anchor gap`).toBeLessThan(1);
    await close(page, id);
  }
});
