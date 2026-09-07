import { test, expect } from "@playwright/test";
import { examples } from "../../examples/catalog.js";

test.beforeEach(async ({ page }) => {
  page.on("pageerror", error => { throw error; });
  await page.goto("/");
  await page.waitForFunction(() => window.lab?.get("basic"));
  await page.evaluate(() => document.fonts.ready);
});

for (const [id, [name]] of Object.entries(examples)) {
  test(`reference ${name} loads its media, opens, and dismisses`, async ({ page }) => {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(page.locator(`#${id}`)).toHaveAttribute("data-sheet-state", "open");
    const panel = page.locator(`#${id}-content`);
    await expect(panel).toBeVisible();
    await panel.locator("img").evaluateAll(images => Promise.all(images.map(image => image.decode())));
    const box = await panel.boundingBox();
    expect(box.width).toBeGreaterThan(100);
    expect(box.y + box.height).toBeGreaterThan(0);
    expect(box.y).toBeLessThan(page.viewportSize().height);
    if (id === "page-sheet") {
      const dismiss = panel.getByRole("button", { name: "Dismiss Sheet", exact: true });
      const button = await dismiss.boundingBox();
      expect(button.width).toBeCloseTo(32, 0);
      expect(button.height).toBeCloseTo(32, 0);
      expect(box.x + box.width - button.x - button.width).toBeCloseTo(16, 0);
      expect(button.y - box.y).toBeCloseTo(16, 0);
      // The control stays fixed above the independently scrolling article.
      await panel.locator(".article-scroll").evaluate(body => { body.scrollTop = 300; });
      expect(await dismiss.boundingBox()).toEqual(button);
      await dismiss.click();
    } else if (id === "page-bottom") {
      await page.keyboard.press("Escape");
      await expect(page.locator(`#${id}`)).toHaveAttribute("data-sheet-state", "open");
      await panel.getByRole("button", { name: "Close", exact: true }).click();
    } else {
      await page.keyboard.press("Escape");
    }
    await expect(page.locator(`#${id}`)).toHaveAttribute("data-sheet-state", "closed");
    expect(await page.evaluate(() => document.body.style.position)).toBe("");
  });
}

test("compact presentations retain their buttons and widths with docs-themed actions", async ({ page }) => {
  for (const [id, first, last, maxWidth] of [
    ["basic", "Dismiss", "Got it", 700], ["top", "Dismiss Sheet", "Book it Now", 740],
    ["detached", "Dismiss", "Got it", 638], ["card", "Dismiss Sheet", "Reserve Spot", 580]
  ]) {
    await page.evaluate(id => window.lab.get(id).open({ immediate: true }), id);
    const panel = page.locator(`#${id}-content`);
    await expect(panel.getByRole("button", { name: first, exact: true })).toBeVisible();
    await expect(panel.getByRole("button", { name: last, exact: true })).toBeVisible();
    if (page.viewportSize().width >= 800) {
      expect((await panel.boundingBox()).width).toBeCloseTo(maxWidth, 0);
      expect(await panel.getByRole("button", { name: last, exact: true }).evaluate(e => e.getBoundingClientRect().height)).toBe(48);
    }
    await panel.getByRole("button", { name: first, exact: true }).click();
    await expect(page.locator(`#${id}`)).toHaveAttribute("data-sheet-state", "closed");
  }
});

test("contact handle cycles detents and search filters real rows", async ({ page }) => {
  await page.evaluate(() => window.lab.get("detents").open({ immediate: true }));
  await page.getByRole("button", { name: "Cycle", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.lab.get("detents").detent)).toBe(1);
  await page.getByRole("searchbox", { name: "Search for a contact" }).fill("Emma");
  await expect(page.locator(".contact:visible")).toHaveCount(1);
  await page.getByRole("searchbox").fill("does not exist");
  await expect(page.getByText("No contacts found.")).toBeVisible();
  await expect(page.locator("#detents")).toHaveAttribute("data-sheet-state", "open");
  await page.getByRole("button", { name: "Cycle", exact: true }).click();
  await expect(page.locator("#detents")).toHaveAttribute("data-sheet-state", "closed");
});

test("player expands, collapses, changes playback UI, and remains nonmodal", async ({ page }) => {
  await page.evaluate(() => window.lab.get("persistent").open({ immediate: true }));
  await expect(page.locator("#page")).not.toHaveAttribute("inert", "");
  await page.getByRole("button", { name: "Expand Sheet", exact: true }).click();
  await expect(page.locator("#persistent-content")).toHaveAttribute("data-expanded", "");
  await page.locator(".player-full").getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.locator(".player-full").getByRole("button", { name: "Pause", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Collapse sheet", exact: true }).click();
  await expect(page.locator("#persistent-content")).not.toHaveAttribute("data-expanded", "");
  expect(await page.evaluate(() => window.lab.get("persistent").isOpen)).toBe(true);
});

test("product form Save retains edited values and closes", async ({ page }) => {
  await page.evaluate(() => window.lab.get("keyboard").open({ immediate: true }));
  await page.locator('input[name="name"]').fill("Trail shoes");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.locator("#keyboard")).toHaveAttribute("data-sheet-state", "closed");
  expect(await page.locator("#keyboard").evaluate(e => JSON.parse(e.dataset.savedProduct).name)).toBe("Trail shoes");
});

test("reference depth remains attached while nested profiles open and close", async ({ page }) => {
  for (const [id, action, parents] of [["depth", "open", []], ["depth-child", "open", ["depth"]], ["depth-third", "open", ["depth", "depth-child"]], ["depth-third", "close", ["depth", "depth-child"]], ["depth-child", "close", ["depth"]], ["depth", "close", []]]) {
    const { gaps, backgrounds } = await page.evaluate(async ({ id, action, parents }) => {
      const sheet = window.lab.get(id), gaps = [], backgrounds = new Set();
      const measure = () => {
        backgrounds.add(getComputedStyle(document.getElementById("page")).backgroundColor);
        for (const id of parents) {
          const parent = window.lab.get(id);
          gaps.push(Math.abs(parent.content.getBoundingClientRect().bottom - parent.view.getBoundingClientRect().bottom));
          backgrounds.add(getComputedStyle(parent.content).backgroundColor);
        }
      };
      sheet.root.addEventListener("sheet:progress", measure);
      await sheet[action]();
      sheet.root.removeEventListener("sheet:progress", measure);
      measure();
      return { gaps, backgrounds: [...backgrounds] };
    }, { id, action, parents });
    expect(Math.max(0, ...gaps)).toBeLessThan(1);
    expect(backgrounds, "receding surfaces must stay opaque white throughout transitions").toEqual(["rgb(255, 255, 255)"]);
  }
  await expect(page.locator("#page")).not.toHaveAttribute("data-gallery-depth", "");
});

test("reference lightbox shows comments on desktop and the image does not enlarge on click", async ({ page }) => {
  await page.evaluate(() => window.lab.get("lightbox").open({ immediate: true }));
  if (page.viewportSize().width >= 1000) await expect(page.getByRole("heading", { name: "Comments", exact: true })).toBeVisible();
  const photo = page.locator(".lightbox-image");
  const dismiss = page.getByRole("button", { name: "Dismiss Sheet", exact: true });
  await expect(dismiss).toBeFocused();
  await photo.evaluate(image => image.decode());
  const before = await photo.boundingBox();
  await photo.click();
  expect(await photo.boundingBox()).toEqual(before);
  await expect(photo).not.toHaveAttribute("tabindex");
  await expect(photo).not.toHaveAttribute("data-presentation-action");
  await expect(photo).not.toHaveCSS("cursor", /zoom/);
  await expect(page.locator("#lightbox")).toHaveAttribute("data-sheet-state", "open");
  await dismiss.click();
  await expect(page.locator("#lightbox")).toHaveAttribute("data-sheet-state", "closed");
});

test("reference effects and scroll locks clean up during Turbo visits", async ({ page }) => {
  await page.evaluate(() => window.lab.get("parallax").open({ immediate: true }));
  await expect(page.locator("#page")).toHaveAttribute("data-gallery-parallax", "");
  await page.evaluate(() => window.lab.Turbo.visit("/next"));
  await expect(page).toHaveURL(/\/next$/);
  await page.waitForFunction(() => window.lab.get("parallax")?.state === "closed");
  await expect(page.locator("#page")).not.toHaveAttribute("data-gallery-parallax", "");
  expect(await page.evaluate(() => document.body.style.position)).toBe("");
});

test("reference toast dismisses after five seconds without taking focus", async ({ page }) => {
  await page.clock.install();
  const trigger = page.getByRole("button", { name: "Toast", exact: true });
  await trigger.focus();
  await page.evaluate(() => window.lab.get("toast").open({ immediate: true }));
  await expect(trigger).toBeFocused();
  await page.clock.runFor(6500);
  await expect(page.locator("#toast")).toHaveAttribute("data-sheet-state", "closed");
});

test("nested parallax translates its parent and restores it after dismissal", async ({ page }) => {
  await page.evaluate(() => window.lab.get("parallax").open({ immediate: true }));
  await page.locator("#parallax-content").getByRole("button", { name: "Parallax Page", exact: true }).click();
  await expect(page.locator("#parallax-child")).toHaveAttribute("data-sheet-state", "open");
  expect((await page.locator("#parallax-content .article-scroll").boundingBox()).x).toBeCloseTo(-page.viewportSize().width * .25, 0);
  await page.locator("#parallax-child-content").getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.locator("#parallax-child")).toHaveAttribute("data-sheet-state", "closed");
  expect((await page.locator("#parallax-content .article-scroll").boundingBox()).x).toBeCloseTo(0, 0);
});

test("stacking presentation changes its edge and dismiss icon across breakpoints", async ({ page }) => {
  await page.evaluate(() => window.lab.get("stacked").open({ immediate: true }));
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await expect.poll(() => page.evaluate(() => window.lab.get("stacked").options.edge)).toBe(width < 700 ? "bottom" : "right");
    await expect(page.locator("#stacked")).toHaveAttribute("data-sheet-state", "open");
    const panel = page.locator("#stacked-content");
    await expect(panel.locator(width < 700 ? ".mobile-dismiss" : ".desktop-dismiss")).toBeVisible();
    const box = await panel.boundingBox();
    expect(844 - box.y - box.height).toBeCloseTo(width < 700 ? 8 : 12, 0);
  }
});

test("expanded permanent player restores its controls through Turbo navigation", async ({ page }) => {
  await page.evaluate(async () => { await window.lab.get("persistent").open({ immediate: true }); await window.lab.get("persistent").snapTo(1, { immediate: true }); });
  await page.evaluate(() => window.lab.Turbo.visit("/next"));
  await expect(page).toHaveURL(/\/next$/);
  await expect(page.locator("#persistent-content")).toHaveAttribute("data-expanded", "");
  await expect(page.locator(".player-full").getByRole("button", { name: "Play", exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.lab.get("persistent").detent)).toBe(1);
});

test("profiles open at their cover with the dismiss control focused", async ({ page }) => {
  for (const id of ["stacked", "depth"]) {
    await page.evaluate(id => window.lab.get(id).open({ immediate: true }), id);
    const panel = page.locator(`#${id}-content`);
    await expect(panel.getByRole("button", { name: "Dismiss Sheet", exact: true })).toBeFocused();
    await expect.poll(() => panel.locator(".profile-scroll").evaluate(e => e.scrollTop)).toBe(0);
    await page.keyboard.press("Escape");
    await expect(page.locator(`#${id}`)).toHaveAttribute("data-sheet-state", "closed");
  }
});

test("Long Sheet keeps its rounded article and dismiss control aligned throughout entry", async ({ page }) => {
  const frames = await page.evaluate(async () => {
    const sheet = window.lab.get("long"), body = sheet.content.querySelector(".article-scroll");
    const article = body.querySelector(".reading-article"), dismiss = article.querySelector("[data-sheet-close]");
    const frames = [];
    const measure = () => {
      if (sheet.position < 100) return;
      // Relative layout coordinates remain atomic while WebKit's compositor
      // can advance WAAPI between successive getBoundingClientRect reads.
      frames.push({
        state: sheet.state, scroll: body.scrollTop,
        articleInset: article.offsetTop - body.scrollTop,
        dismissInset: dismiss.offsetTop,
        radius: getComputedStyle(article).borderTopLeftRadius
      });
    };
    sheet.root.addEventListener("sheet:progress", measure);
    await sheet.open();
    sheet.root.removeEventListener("sheet:progress", measure);
    return frames;
  });
  expect(frames.filter(frame => frame.state === "opening").length).toBeGreaterThan(5);
  expect(Math.max(...frames.map(frame => frame.scroll)), "opening must not scroll the article to compensate for the sheet's translation").toBe(0);
  for (const frame of frames) {
    expect(frame.articleInset).toBeCloseTo(12, 0);
    expect(frame.dismissInset).toBeCloseTo(16, 0);
    expect(frame.radius).toBe("24px");
  }
  await expect(page.locator("#long-content").getByRole("button", { name: "Dismiss Sheet", exact: true })).toBeFocused();
  await page.locator("#long-content").getByRole("button", { name: "Dismiss Sheet", exact: true }).click();
  await expect(page.locator("#long")).toHaveAttribute("data-sheet-state", "closed");
});

test("phone lightbox comments open as a nested sheet and return focus to the image view", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Lightbox", exact: true }).click();
  await expect(page.locator("#lightbox")).toHaveAttribute("data-sheet-state", "open");
  await page.getByRole("button", { name: "Comments", exact: true }).click();
  await expect(page.locator("#lightbox-comments")).toHaveAttribute("data-sheet-state", "open");
  const comments = page.locator("#lightbox-comments-content");
  await expect(comments.getByRole("heading", { name: "Comments", exact: true })).toBeVisible();
  expect(await comments.locator(".comments-scroll").evaluate(e => e.scrollHeight > e.clientHeight)).toBe(true);
  await page.getByRole("button", { name: "Dismiss Comments", exact: true }).click();
  await expect(page.locator("#lightbox-comments")).toHaveAttribute("data-sheet-state", "closed");
  await expect(page.getByRole("button", { name: "Comments", exact: true })).toBeFocused();
  await expect(page.locator("#lightbox")).toHaveAttribute("data-sheet-state", "open");
});

test("nested stacking leaves a visible receding layer and restores it on close", async ({ page }) => {
  await page.getByRole("button", { name: "Sheet with Stacking", exact: true }).click();
  await expect(page.locator("#stacked")).toHaveAttribute("data-sheet-state", "open");
  const parent = page.locator("#stacked-content");
  const original = await parent.boundingBox();
  const trigger = parent.getByRole("button", { name: "Open the next stacking layer", exact: true });
  await trigger.click();
  await expect(page.locator("#child")).toHaveAttribute("data-sheet-state", "open");
  const rear = await parent.boundingBox();
  const front = await page.locator("#child-content").boundingBox();
  expect(rear.width / original.width).toBeCloseTo(0.933, 3);
  expect(rear.height / original.height).toBeCloseTo(0.933, 3);
  if (page.viewportSize().width >= 700) expect(front.x - rear.x).toBeGreaterThan(9);
  else expect(front.y - rear.y).toBeGreaterThan(9);
  expect(front.width).toBeCloseTo(original.width, 0);
  await page.locator("#child-content").getByRole("button", { name: "Dismiss Sheet", exact: true }).click();
  await expect(page.locator("#child")).toHaveAttribute("data-sheet-state", "closed");
  const restored = await parent.boundingBox();
  for (const key of ["x", "y", "width", "height"]) expect(restored[key]).toBeCloseTo(original[key], 0);
  await expect(trigger).toBeFocused();
});

test("depth layers stay within the viewport during overscroll and viewport contraction", async ({ page }) => {
  await page.evaluate(async () => {
    for (const id of ["depth", "depth-child", "depth-third"]) await window.lab.get(id).open({ immediate: true });
  });
  const overscroll = await page.evaluate(async () => {
    const sheet = window.lab.get("depth-third");
    sheet.content.dispatchEvent(new WheelEvent("wheel", { deltaY: 900, bubbles: true, cancelable: true }));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const panel = sheet.content.getBoundingClientRect(), view = sheet.view.getBoundingClientRect();
    return { bottomGap: view.bottom - panel.bottom, topGap: panel.top - view.top };
  });
  expect(overscroll.bottomGap).toBeLessThan(1);
  expect(overscroll.topGap).toBeGreaterThanOrEqual(-1);
  await expect(page.locator("#depth-third")).toHaveAttribute("data-sheet-state", "open");
  await page.evaluate(() => {
    Object.defineProperty(visualViewport, "height", { configurable: true, value: innerHeight - 120 });
    visualViewport.dispatchEvent(new Event("resize"));
  });
  await expect.poll(() => page.evaluate(() => window.lab.get("depth").viewport.height)).toBe(page.viewportSize().height - 120);
  for (const id of ["depth", "depth-child", "depth-third"]) {
    const geometry = await page.evaluate(id => {
      const sheet = window.lab.get(id), panel = sheet.content.getBoundingClientRect(), view = sheet.view.getBoundingClientRect();
      return { bottomGap: Math.abs(view.bottom - panel.bottom), topGap: panel.top - view.top };
    }, id);
    expect(geometry.bottomGap, id).toBeLessThan(1);
    expect(geometry.topGap, id).toBeGreaterThanOrEqual(-1);
  }
});

test("browser wheel scrolling to the top does not drag depth sheets with its momentum", async ({ page, isMobile }) => {
  test.skip(isMobile, "Mobile WebKit does not support mouse wheel input; synthetic touch and wheel ownership are covered separately.");
  await page.getByRole("button", { name: "Sheet with Depth", exact: true }).click();
  await expect(page.locator("#depth")).toHaveAttribute("data-sheet-state", "open");
  const panel = page.locator("#depth-content"), body = panel.locator(".profile-scroll");
  const original = await panel.boundingBox();
  await page.mouse.move(original.x + original.width / 2, original.y + original.height * .6);
  await page.mouse.wheel(0, 500);
  await expect.poll(() => body.evaluate(el => el.scrollTop)).toBeGreaterThan(100);
  await page.mouse.wheel(0, -2000);
  await expect.poll(() => body.evaluate(el => el.scrollTop)).toBe(0);
  for (let packet = 0; packet < 8; packet++) {
    await page.mouse.wheel(0, -50);
    await expect(page.locator("#depth")).toHaveAttribute("data-sheet-state", "open");
  }
  const after = await panel.boundingBox();
  expect(after.y).toBeCloseTo(original.y, 0);
  expect(after.y + after.height).toBeCloseTo(page.viewportSize().height, 0);
});
