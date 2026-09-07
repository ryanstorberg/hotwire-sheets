import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/regression");
  await page.waitForFunction(() => window.lab?.get("basic"));
  await page.evaluate(async () => {
    window.api = await import("/src/index.js");
    window.makeSheet = (id, options = {}, parent = document.body) => {
      const root = document.createElement("div"); root.id = id;
      root.innerHTML = `<div data-sheet-view hidden><div data-sheet-backdrop></div><div data-sheet-content aria-label="${id}"><button data-sheet-close>Close</button><div data-sheet-body>Content</div></div></div>`;
      parent.append(root);
      return new api.Sheet(root, { detents: ["300px"], ...options });
    };
    window.makeScroll = (options = {}) => {
      const root = document.createElement("div");
      root.innerHTML = '<div data-scroll-view style="height:200px;width:260px"><div data-scroll-content><div style="height:900px;width:900px"><button style="margin-top:750px">Last item</button></div></div></div>';
      document.body.prepend(root);
      return new api.Scroll(root, options);
    };
  });
});

test("controlled detents include closed, CSS lengths resolve, and alert dialogs resist implicit dismissal", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const states = [], ranges = [], presented = [], detents = [];
    window.subject = makeSheet("api-alert", { sheetRole: "alertdialog", detentMode: "silk", detents: ["calc(2rem + 20px)"],
      onTravelStatusChange: status => states.push(status), onTravelRangeChange: range => ranges.push(range),
      onPresentedChange: value => presented.push(value), onActiveDetentChange: value => detents.push(value) });
    await subject.setActiveDetent(1, { immediate: true });
    subject.content.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    subject.view.querySelector("[data-sheet-backdrop]").click();
    const stayed = subject.isOpen;
    await subject.setActiveDetent(0, { immediate: true });
    return { stayed, points: subject.points, states, ranges, presented, detents, role: subject.content.role };
  });
  expect(result.stayed).toBe(true);
  expect(result.points[0]).toBeGreaterThan(40);
  expect(result.role).toBe("alertdialog");
  expect(result.presented).toEqual([true, false]);
  expect(result.detents).toEqual([1, 0]);
  expect(result.states).toContain("entering");
  expect(result.states.at(-1)).toBe("idleOutside");
});

test("enter and exit settings drive independent WAAPI durations and contentMove", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const sheet = makeSheet("api-timing", { enteringAnimationSettings: { easing: "linear", duration: 180, contentMove: false }, exitingAnimationSettings: { easing: "ease-in", duration: 260, contentMove: false } });
    const opening = sheet.open();
    const enter = sheet.content.getAnimations()[0].effect.getTiming().duration;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const enterTop = sheet.content.getBoundingClientRect().top;
    await opening;
    const restingTop = sheet.content.getBoundingClientRect().top;
    const closing = sheet.close();
    const exit = sheet.content.getAnimations()[0].effect.getTiming().duration;
    await new Promise(resolve => setTimeout(resolve, 100));
    const exitTop = sheet.content.getBoundingClientRect().top;
    await closing;
    return { enter, exit, enterTop, restingTop, exitTop };
  });
  expect(result.enter).toBe(180); expect(result.exit).toBe(260);
  expect(result.enterTop).toBeCloseTo(result.restingTop, 0);
  expect(result.exitTop).toBeCloseTo(result.restingTop, 0);
});

test("CSS snap retains native detents while custom programmatic motion uses WAAPI", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const sheet = makeSheet("api-hybrid", { scrollSnap: true, detents: ["140px", "300px"], enteringAnimationSettings: { easing: "ease-out", duration: 220 } });
    const pending = sheet.open();
    const ids = sheet.content.getAnimations().map(animation => animation.id);
    await pending;
    return { ids, position: sheet.position, offset: sheet.view.scrollTop, top: sheet.content.getBoundingClientRect().top, expected: innerHeight - 140, snap: getComputedStyle(sheet.view).scrollSnapType };
  });
  expect(result.ids).toContain("hotwire-sheet-surface");
  expect(result.offset).toBeCloseTo(140, 0);
  expect(result.position).toBe(140);
  expect(result.top).toBeCloseTo(result.expected, 0);
  expect(result.snap).toContain("y");
});

test("center placement and two tracks enter and exit beyond opposite viewport edges", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const sheet = makeSheet("api-tracks", { contentPlacement: "center", tracks: ["top", "bottom"], enteringAnimationSettings: { easing: "linear", duration: 160 }, exitingAnimationSettings: { easing: "linear", duration: 160, track: "bottom" } });
    const pending = sheet.open(); const start = sheet.content.getBoundingClientRect().bottom;
    await pending; const center = sheet.content.getBoundingClientRect().top + 150;
    const close = sheet.close(); await new Promise(resolve => setTimeout(resolve, 110)); const exit = sheet.content.getBoundingClientRect().top;
    await close;
    return { start, center, exit, height: innerHeight };
  });
  expect(result.start).toBeLessThanOrEqual(2);
  expect(result.center).toBeCloseTo(result.height / 2, 0);
  expect(result.exit).toBeGreaterThan(result.height / 2);
});

test("native Scroll APIs, CSS options, focus and progress operate on the real scroll container", async ({ page }) => {
  const result = await page.evaluate(async () => {
    let calls = 0;
    const scroll = makeScroll({ nativeScrollbar: false, scrollAnchoring: false, scrollSnapType: "proximity", scrollPadding: "12px", scrollTimelineName: "--story", onScroll: () => calls++ });
    scroll.scrollTo({ distance: 120, animationSettings: { skip: true } });
    scroll.scrollBy({ distance: 50, animationSettings: { skip: true } });
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const distance = scroll.getDistance(), available = scroll.getAvailableDistance(), progress = scroll.getProgress();
    const style = getComputedStyle(scroll.scroller), snap = style.scrollSnapType, padding = style.scrollPadding, anchoring = style.overflowAnchor;
    scroll.content.querySelector("button").focus({ preventScroll: true });
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return { distance, available, progress, snap, padding, anchoring, calls, focusedDistance: scroll.getDistance() };
  });
  expect(result.distance).toBe(170);
  expect(result.progress).toBeCloseTo(170 / result.available);
  expect(["y", "y proximity"]).toContain(result.snap); expect(result.padding).toBe("12px");
  expect(result.calls).toBeGreaterThan(0); expect(result.focusedDistance).toBeGreaterThan(500);
});

test("Scroll traps configured boundary directions including containers with no overflow", async ({ page }) => {
  const result = await page.evaluate(() => {
    const scroll = makeScroll({ scrollGestureTrap: { yStart: true, yEnd: false } });
    const wheel = delta => { const event = new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: delta }); scroll.view.dispatchEvent(event); return event.defaultPrevented; };
    const start = wheel(-40);
    scroll.scrollTo({ progress: 1, animationSettings: { skip: true } }); const end = wheel(40);
    scroll.setOptions({ scrollGestureOvershoot: false }); const disabledOvershoot = wheel(40);
    scroll.content.innerHTML = "Short"; scroll.setOptions({ scrollGestureOvershoot: true, scrollGestureTrap: true });
    const empty = wheel(40);
    scroll.root.dir = "rtl"; scroll.content.innerHTML = '<div style="width:900px">Right to left</div>';
    scroll.setOptions({ axis: "x", scrollGestureTrap: { xStart: true, xEnd: false } });
    scroll.scrollTo({ progress: 0, animationSettings: { skip: true } });
    const horizontal = deltaX => { const event = new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaX }); scroll.content.dispatchEvent(event); return event.defaultPrevented; };
    const rtlOutward = horizontal(40), rtlInward = horizontal(-40);
    return { start, end, disabledOvershoot, empty, rtlOutward, rtlInward };
  });
  expect(result).toEqual({ start: true, end: false, disabledOvershoot: true, empty: true, rtlOutward: true, rtlInward: false });
});

test("Scroll page replacement reports its owner and restores document styles", async ({ page }) => {
  const result = await page.evaluate(() => {
    document.documentElement.style.setProperty("--host-page", "ready");
    const previous = document.documentElement.getAttribute("style"), scroll = makeScroll({ pageScroll: true, nativePageScrollReplacement: true });
    const data = api.getPageScrollData();
    scroll.scrollTo({ distance: 40, animationSettings: { skip: true } });
    const owned = data.pageScrollContainer === scroll.scroller, replaced = data.nativePageScrollReplaced;
    scroll.destroy();
    return { owned, replaced, restored: document.documentElement.getAttribute("style") === previous, released: !api.getPageScrollData().nativePageScrollReplaced, previous, after: document.documentElement.getAttribute("style"), saved: scroll.pageStyle };
  });
  expect({ after: result.after, saved: result.saved }).toEqual({ after: result.previous, saved: result.previous });
  expect(result).toMatchObject({ owned: true, replaced: true, restored: true, released: true });
});

test("outlet animations keep playing when the JavaScript progress observer is stopped", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const target = document.createElement("div"); document.body.append(target);
    const sheet = makeSheet("api-outlet", { enteringAnimationSettings: { easing: "linear", duration: 300 } });
    sheet.outlet(target, { travelAnimation: { opacity: [0, 1], translateX: ["0px", "200px"] } });
    const opened = sheet.open(); cancelAnimationFrame(sheet.animator.frame);
    await new Promise(resolve => setTimeout(resolve, 160));
    const mid = Number(getComputedStyle(target).opacity), moved = new DOMMatrix(getComputedStyle(target).transform).m41;
    await opened;
    const end = Number(getComputedStyle(target).opacity);
    sheet.destroy();
    return { mid, moved, end, restored: target.getAttribute("style") || "" };
  });
  expect(result.mid).toBeGreaterThan(.2); expect(result.mid).toBeLessThan(.9);
  expect(result.moved).toBeGreaterThan(50); expect(result.end).toBe(1);
  expect(result.restored).toBe("");
});

test("named stacks exclude unrelated sheets from stacking animations", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const root = document.createElement("div"); document.body.append(root);
    const stack = new api.SheetStack(root, { componentId: "family" });
    const target = document.createElement("div"); root.append(target);
    stack.outlet(target, { stackingAnimation: { opacity: [1, .4] } });
    const a = makeSheet("family-a", { forComponent: "family" }, root), b = makeSheet("family-b", { forComponent: "family" }, root), c = makeSheet("unrelated", { modal: false });
    await a.open({ immediate: true }); const first = Number(getComputedStyle(target).opacity);
    await b.open({ immediate: true }); const second = Number(getComputedStyle(target).opacity);
    await c.open({ immediate: true }); const third = Number(getComputedStyle(target).opacity);
    return { first, second, third, members: stack.sheets.length };
  });
  expect(result).toEqual({ first: 1, second: .4, third: .4, members: 2 });
});

test("scoped islands, external overlays and autofocus targets restore ownership on removal", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const island = document.createElement("button"); island.textContent = "Navigation"; document.body.append(island);
    const region = new api.Island(island, { forComponent: "api-focus" });
    const dismissTarget = new api.AutoFocusTarget(island, { timing: "dismiss", forComponent: "api-focus" });
    const sheet = makeSheet("api-focus"); await sheet.open({ immediate: true });
    const islandActive = !island.closest("[inert]");
    const external = document.createElement("div"); external.innerHTML = "<button>External</button>"; document.body.append(external);
    const overlay = new api.ExternalOverlay(external, { selfManagedInertOutside: false });
    external.firstChild.focus(); const externalFocused = document.activeElement === external.firstChild;
    external.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    const stayed = sheet.isOpen; overlay.destroy(); external.remove();
    await sheet.close({ immediate: true }); const restoredFocus = document.activeElement === island;
    region.destroy(); dismissTarget.destroy();
    return { islandActive, externalFocused, stayed, restoredFocus };
  });
  expect(result).toEqual({ islandActive: true, externalFocused: true, stayed: true, restoredFocus: true });
});

test("theme overlays compose over updates and animate persists its final WAAPI style", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const meta = document.createElement("meta"); meta.name = "theme-color"; meta.content = "#ffffff"; document.head.append(meta);
    const a = api.createThemeColorDimmingOverlay({ dimmingColor: "rgb(0, 0, 0)" }); a.setDimmingOverlayOpacity(.5); const first = meta.content;
    api.updateThemeColor("#808080"); const updated = meta.content;
    const b = api.createThemeColorDimmingOverlay({ dimmingColor: "rgb(255, 0, 0)" }); b.setDimmingOverlayOpacity(.5); const stacked = meta.content;
    b.destroy(); a.destroy(); const restored = meta.content;
    const element = document.createElement("div"); document.body.append(element);
    await api.animate(element, { opacity: [0, .6] }, { duration: 50, easing: "linear" }).finished;
    await Promise.resolve();
    return { first, updated, stacked, restored, opacity: element.style.opacity, noTarget: api.animate(null, { opacity: [0, 1] }) };
  });
  expect(result).toEqual({ first: "rgb(128, 128, 128)", updated: "rgb(64, 64, 64)", stacked: "rgb(160, 32, 32)", restored: "rgb(128, 128, 128)", opacity: "0.6", noTarget: null });
});

test("Scroll leaves direct view chrome stationary and adds safe-area travel without changing content padding", async ({ page }) => {
  const result = await page.evaluate(() => {
    const scroll = makeScroll({ safeArea: "layout-viewport" });
    Object.assign(scroll.view.style, { position: "fixed", top: `${innerHeight-100}px` });
    scroll.content.style.padding = "17px";
    const chrome = document.createElement("button"); chrome.textContent = "Stationary"; chrome.style.cssText = "position:absolute;top:0;right:0"; scroll.view.append(chrome);
    scroll.measure();
    const before = chrome.getBoundingClientRect().top;
    scroll.scrollTo({ distance: 300, animationSettings: { skip: true } });
    const after = chrome.getBoundingClientRect().top;
    return { before, after, padding: scroll.content.style.padding, safe: scroll.view.style.getPropertyValue("--scroll-safe-end"), distance: scroll.getDistance() };
  });
  expect(result.after).toBe(result.before); expect(result.padding).toBe("17px");
  expect(result.safe).toBe("100px"); expect(result.distance).toBe(300);
});

test("trigger press behavior, detent cycling and propagation through nonmodal overlays", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const sheet = makeSheet("api-press", { detents: ["120px", "300px"], onPress: { runAction: false } });
    const button = document.createElement("button"); button.dataset.sheetFor = "api-press"; button.dataset.sheetAction = "present"; document.body.append(button);
    button.click(); const prevented = !sheet.isOpen;
    await sheet.setOptions({ onPress: { runAction: true }, enteringAnimationSettings: { skip: true }, steppingAnimationSettings: { skip: true } });
    button.click(); await Promise.resolve(); const first = sheet.activeDetent;
    button.dataset.sheetAction = "step"; button.click(); await Promise.resolve(); const second = sheet.activeDetent;
    const toast = makeSheet("api-overlay", { modal: false, onEscapeKeyDown: { dismiss: false, stopOverlayPropagation: false } });
    await toast.open({ immediate: true });
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    await new Promise(resolve => setTimeout(resolve, 900));
    return { prevented, first, second, parentClosed: !sheet.isOpen, toastStayed: toast.isOpen, controls: button.getAttribute("aria-controls") };
  });
  expect(result).toEqual({ prevented: true, first: 1, second: 2, parentClosed: true, toastStayed: true, controls: "api-press-content" });
});

test("content travel transforms compose with structural travel at rest", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const sheet = makeSheet("api-content-motion", { travelAnimation: { scale: [.8, 1], opacity: [.4, 1] }, enteringAnimationSettings: { easing: "linear", duration: 180 } });
    await sheet.open();
    const rect = sheet.content.getBoundingClientRect(), opacity = getComputedStyle(sheet.content).opacity, layoutWidth = sheet.content.offsetWidth;
    await sheet.close();
    return { bottom: rect.bottom, width: rect.width, opacity, expectedWidth: layoutWidth, expectedBottom: innerHeight };
  });
  expect(result.bottom).toBeCloseTo(result.expectedBottom, 0); expect(result.width).toBeCloseTo(result.expectedWidth, 0); expect(result.opacity).toBe("1");
});

test("native travel outlets use scroll timelines when available and restore their styles", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const sheet = makeSheet("api-native-outlet", { scrollSnap: true });
    const target = document.createElement("div"); document.body.append(target);
    const outlet = sheet.outlet(target, { travelAnimation: { opacity: [.2, 1] } });
    await sheet.open({ immediate: true });
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const supported = !!window.ScrollTimeline, timeline = target.getAnimations().some(animation => animation.id === "hotwire-sheet-scroll-outlet"), opacity = Number(getComputedStyle(target).opacity);
    await sheet.close({ immediate: true });
    const closedOpacity = Number(getComputedStyle(target).opacity);
    outlet.destroy();
    return { supported, timeline, opacity, closedOpacity, animations: target.getAnimations().length };
  });
  expect(result.timeline).toBe(result.supported); expect(result.opacity).toBeCloseTo(1, 1); expect(result.animations).toBe(0);
  expect(result.closedOpacity).toBeCloseTo(.2, 2);
});

test("viewport clipping and Fixed survive transformed ancestors and clean up", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const surface = document.createElement("section"); surface.style.cssText = "height:1600px;background:white"; document.body.prepend(surface);
    const fixed = document.createElement("div"); fixed.style.cssText = "position:fixed;right:16px;top:12px;width:40px;height:40px"; surface.append(fixed);
    const positioning = new api.Fixed(fixed);
    const before = fixed.getBoundingClientRect().toJSON();
    const sheet = makeSheet("api-clip");
    sheet.outlet(surface, { travelAnimation: { clipBoundary: "layout-viewport", clipBorderRadius: ["0px", "20px"], scale: [1, .9] } });
    await sheet.open({ immediate: true });
    const after = fixed.getBoundingClientRect().toJSON(), height = surface.parentElement.getBoundingClientRect().height;
    await sheet.close({ immediate: true });
    positioning.destroy();
    return { before, after, height, expected: innerHeight * .9, restored: fixed.parentElement === surface, wrappers: document.querySelectorAll("[data-sheet-clip-boundary]").length };
  });
  expect(result.after).toEqual(result.before); expect(result.height).toBeCloseTo(result.expected, 0);
  expect(result.restored).toBe(true); expect(result.wrappers).toBe(0);
});

test("placement is independent of the selected travel axis", async ({ page }) => {
  const results = await page.evaluate(async () => {
    const results = [];
    for (const track of ["top", "bottom", "left", "right"]) for (const placement of ["top", "bottom", "left", "right", "center"]) {
      const sheet = makeSheet(`placement-${track}-${placement}`, { tracks: track, contentPlacement: placement });
      await sheet.open({ immediate: true });
      const rect = sheet.content.getBoundingClientRect();
      const expectedX = placement === "left" ? 0 : placement === "right" ? innerWidth-rect.width : (innerWidth-rect.width)/2;
      const expectedY = placement === "top" ? 0 : placement === "bottom" ? innerHeight-rect.height : (innerHeight-rect.height)/2;
      results.push({ track, placement, dx: rect.x-expectedX, dy: rect.y-expectedY });
      sheet.destroy();
    }
    return results;
  });
  for (const result of results) { expect(Math.abs(result.dx), JSON.stringify(result)).toBeLessThan(1); expect(Math.abs(result.dy), JSON.stringify(result)).toBeLessThan(1); }
});

test("a null backdrop opacity removes its default fade", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const sheet = makeSheet("api-static-backdrop", { enteringAnimationSettings: { easing: "linear", duration: 200 } });
    const backdrop = sheet.view.querySelector("[data-sheet-backdrop]");
    sheet.outlet(backdrop, { travelAnimation: { opacity: null } });
    const pending = sheet.open(); await new Promise(resolve => setTimeout(resolve, 60));
    const opacity = getComputedStyle(backdrop).opacity, animations = backdrop.getAnimations().length;
    await pending;
    return { opacity, animations };
  });
  expect(result).toEqual({ opacity: "1", animations: 0 });
});

test("outer Scroll trapping preserves an inner scroll and focus reveal can be disabled", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const outer = makeScroll({ scrollGestureTrap: true, onFocusInside: { scrollIntoView: false } });
    const inner = document.createElement("div"); inner.style.cssText = "height:100px;overflow:auto"; inner.innerHTML = '<div style="height:500px">Inner content</div>'; outer.content.prepend(inner);
    const event = new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: 80 }); inner.dispatchEvent(event);
    const nestedAllowed = !event.defaultPrevented;
    outer.content.querySelector("button").focus({ preventScroll: true });
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    outer.measure();
    return { nestedAllowed, distance: outer.getDistance() };
  });
  expect(result).toEqual({ nestedAllowed: true, distance: 0 });
});

test("Rails primitive controllers suspend without reconnect loops and resume after Turbo render", async ({ page }) => {
  await page.evaluate(() => {
    const host = document.createElement("section"); host.id = "primitive-host";
    host.innerHTML = '<div id="fixed-controller" data-controller="sheet-fixed" style="position:fixed;right:8px;top:8px">Fixed</div><div id="scroll-controller" data-controller="sheet-scroll"><div data-scroll-view style="height:100px"><div data-scroll-content style="height:400px">Scroll</div></div></div>';
    document.body.append(host);
  });
  await expect.poll(() => page.evaluate(() => !!window.lab.application.getControllerForElementAndIdentifier(document.getElementById("scroll-controller"), "sheet-scroll")?.scroll)).toBe(true);
  await page.evaluate(() => document.dispatchEvent(new Event("turbo:before-cache")));
  await page.waitForTimeout(60);
  expect(await page.evaluate(() => ({ parent: document.getElementById("fixed-controller").parentElement.id, tracks: document.querySelectorAll("#scroll-controller [data-scroll-viewport]").length }))).toEqual({ parent: "primitive-host", tracks: 0 });
  await page.evaluate(() => document.dispatchEvent(new Event("turbo:render")));
  await expect.poll(() => page.locator("#scroll-controller [data-scroll-viewport]").count()).toBe(1);
  await page.evaluate(() => document.getElementById("primitive-host").remove());
  await expect(page.locator("#fixed-controller")).toHaveCount(0);
});

test("live content effects restore removed styles and compose with native sheet positioning", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const sheet = makeSheet("api-live-effects", { scrollSnap: true, travelAnimation: { scale: [.8, 1], opacity: [.5, .7] } });
    await sheet.open({ immediate: true });
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const rect = sheet.content.getBoundingClientRect(), originalWidth = sheet.content.offsetWidth;
    const before = getComputedStyle(sheet.content).opacity;
    await sheet.setOptions({ travelAnimation: { scale: [.8, .9] } });
    const after = getComputedStyle(sheet.content).opacity, width = sheet.content.getBoundingClientRect().width;
    await sheet.setOptions({ travelAnimation: null });
    return { bottom: rect.bottom, expectedBottom: innerHeight, before, after, scale: width/originalWidth, restored: sheet.content.getBoundingClientRect().width/originalWidth };
  });
  expect(result.bottom).toBeCloseTo(result.expectedBottom, 0);
  expect(result.before).toBe("0.7"); expect(result.after).toBe("1");
  expect(result.scale).toBeCloseTo(.9, 2); expect(result.restored).toBeCloseTo(1, 2);
});

test("disabled page Scroll gestures hide the scrollbar, block input, and retain programmatic control", async ({ page }) => {
  const result = await page.evaluate(() => {
    const scroll = makeScroll({ pageScroll: true, scrollGesture: false });
    const overflow = getComputedStyle(scroll.scroller).overflowY;
    const wheel = new WheelEvent("wheel", { deltaY: 100, bubbles: true, cancelable: true }); scroll.content.dispatchEvent(wheel);
    scroll.scrollTo({ distance: 80, animationSettings: { skip: true } }); const distance = scroll.getDistance();
    scroll.setOptions({ scrollGesture: "auto" }); const released = getComputedStyle(scroll.scroller).overflowY;
    scroll.destroy();
    return { overflow, prevented: wheel.defaultPrevented, distance, released };
  });
  expect(result.overflow).toBe("hidden"); expect(result.prevented).toBe(true);
  expect(result.distance).toBe(80); expect(result.released).not.toBe("hidden");
});

test("untrapped nested wheel gestures reach same-axis and cross-axis parent sheets", async ({ page }) => {
  const results = await page.evaluate(async () => {
    const results = [];
    for (const native of [false, true]) for (const edge of ["bottom", "right"]) {
      const parent = makeSheet(`chain-parent-${native}-${edge}`, { edge, detents: ["120px", "300px"], steppingAnimationSettings: { skip: true } });
      await parent.open({ immediate: true });
      const child = makeSheet(`chain-child-${native}-${edge}`, { modal: false, scrollSnap: native, detents: ["180px"], swipeTrap: false, swipeOvershoot: true }, parent.content);
      await child.open({ immediate: true });
      child.content.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, [edge === "bottom" ? "deltaY" : "deltaX"]: 220 }));
      await new Promise(resolve => setTimeout(resolve, 180));
      results.push({ native, edge, position: parent.position, childOpen: child.isOpen });
      child.destroy(); parent.destroy();
    }
    return results;
  });
  for (const result of results) { expect(result.position, JSON.stringify(result)).toBe(300); expect(result.childOpen).toBe(true); }
});

test("viewport clipping remeasures responsive content after a resize", async ({ page }) => {
  await page.evaluate(async () => {
    const surface = document.createElement("section"); surface.id = "responsive-clip"; surface.style.cssText = "height:1600px;width:100%;background:white"; document.body.prepend(surface);
    window.clipSheet = makeSheet("api-resize-clip");
    clipSheet.outlet(surface, { travelAnimation: { clipBoundary: "layout-viewport", scale: [1, .9] } });
    await clipSheet.open({ immediate: true });
  });
  await page.setViewportSize({ width: 600, height: 700 });
  await expect.poll(() => page.evaluate(() => document.getElementById("responsive-clip").offsetWidth)).toBe(600);
  expect(await page.evaluate(() => document.querySelector("[data-sheet-clip-boundary]").getBoundingClientRect().width)).toBeCloseTo(540, 0);
  await page.evaluate(() => clipSheet.close({ immediate: true }));
  expect(await page.locator("[data-sheet-clip-boundary]").count()).toBe(0);
});
