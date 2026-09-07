import { test } from "node:test";
import assert from "node:assert/strict";
import { rubberBand, springAt } from "../../src/core/physics.js";

test("rubber band keeps in-range motion linear and bounds overshoot", () => {
  assert.equal(rubberBand(200, 0, 600), 200);
  assert.ok(rubberBand(-100, 0, 600) > -100);
  assert.ok(rubberBand(1000000, 0, 600) < 1200);
});
for (const damping of [15, 40, 80]) {
  test(`spring preserves initial state and converges (damping ${damping})`, () => {
    const config = { stiffness: 400, damping, mass: 1 };
    const initial = springAt(0, 100, 700, -300, config);
    assert.ok(Math.abs(initial.position - 100) < 0.000001);
    assert.ok(Math.abs(initial.velocity + 300) < 0.000001);
    const final = springAt(5, 100, 700, -300, config);
    assert.ok(Math.abs(final.position - 700) < 0.001);
    assert.ok(Math.abs(final.velocity) < 0.001);
  });
}
