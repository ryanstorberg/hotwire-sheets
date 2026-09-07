import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveDetents, nearestDetent, adjacentDetent } from "../../src/core/detents.js";

test("detents preserve public indices as content changes", () => {
  assert.deepEqual(resolveDetents(["content", 0.55, 1, "200px", "25%"], 800, 900).map(Math.round), [800, 440, 800, 200, 200]);
  assert.deepEqual(resolveDetents(["content", 0.55, 1], 400, 100).map(Math.round), [100, 220, 400]);
});
test("invalid detents fail rather than generating NaN transforms", () => {
  for (const value of [[], [0], [-1], [2], [NaN], [Infinity], ["0px"], ["auto"], [null]]) {
    assert.throws(() => resolveDetents(value, 600, 100));
  }
});
test("velocity projects snapping and nondismissible sheets cannot snap closed", () => {
  assert.equal(nearestDetent(180, -1, [200, 600]), -1);
  assert.equal(nearestDetent(180, -1, [200, 600], { dismissible: false }), 0);
  assert.equal(nearestDetent(210, 1.5, [200, 600]), 1);
  assert.equal(nearestDetent(400, 0, [400, 400], { current: 1 }), 1);
});
test("keyboard navigation follows resolved size rather than declaration order", () => {
  assert.equal(adjacentDetent([600, 200, 400], 1, 1), 2);
  assert.equal(adjacentDetent([600, 200, 400], 0, 1), 0);
});
