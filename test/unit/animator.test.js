import { test } from "node:test";
import assert from "node:assert/strict";
import { Animator, springFrames, framePosition } from "../../src/core/animator.js";

test("a frame timestamp before animation creation cannot reverse the spring", async () => {
  let nextFrame;
  const win = {
    performance: { now: () => 100 },
    requestAnimationFrame: callback => { nextFrame = callback; return 1; },
    cancelAnimationFrame: () => {},
    matchMedia: () => ({ matches: false })
  };
  const positions = [];
  const completed = new Animator(win).to(720, 720, 8, {}, position => positions.push(position));
  nextFrame(95);
  assert.equal(positions[0], 720);
  nextFrame(3000);
  assert.equal(await completed, true);
  assert.equal(positions.at(-1), 720);
});

test("spring keyframes have bounded duration, stable offsets, and exact endpoints", () => {
  const frames = springFrames(0, 720, 1, { damping: 12 });
  assert.equal(frames[0].position, 0);
  assert.equal(frames.at(-1).position, 720);
  assert.ok(frames.at(-1).time <= 3000);
  assert.ok(frames.every((frame, i) => !i || frame.time > frames[i - 1].time));
  assert.equal(framePosition(frames, -10), 0);
  assert.equal(framePosition(frames, 4000), 720);
});

test("sampling at 60, 120, or 144 Hz follows the same elapsed-time trajectory", () => {
  const frames = springFrames(50, 900, 0, {});
  const atCommonTime = hz => {
    let position;
    for (let frame = 0; frame <= hz / 2; frame++) position = framePosition(frames, frame / hz * 1000);
    return position;
  };
  assert.equal(atCommonTime(60), atCommonTime(120));
  assert.equal(atCommonTime(120), atCommonTime(144));
});
