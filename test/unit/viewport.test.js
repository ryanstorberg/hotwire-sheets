import { test } from "node:test";
import assert from "node:assert/strict";
import { readViewport } from "../../src/platform/viewport.js";

test("visual viewport tracks keyboard occlusion and viewport panning", () => {
  assert.deepEqual(readViewport({ innerWidth: 400, innerHeight: 800,
    visualViewport: { width: 400, height: 450, offsetTop: 50, offsetLeft: 0, scale: 1 } }),
    { width: 400, height: 450, top: 50, left: 0, keyboard: 300 });
});
test("pinch zoom keeps layout dimensions instead of resizing the sheet", () => {
  assert.deepEqual(readViewport({ innerWidth: 400, innerHeight: 800,
    visualViewport: { width: 200, height: 400, offsetTop: 100, offsetLeft: 80, scale: 2 } }),
    { width: 400, height: 800, top: 0, left: 0, keyboard: 0 });
});
test("viewport falls back to window dimensions", () => {
  assert.equal(readViewport({ innerWidth: 400, innerHeight: 700 }).height, 700);
});
