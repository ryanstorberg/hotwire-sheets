import { springAt } from "./physics.js";
import { easingAt } from "./animation-settings.js";

// Dense spring keyframes describe a curve, not a display refresh rate. WAAPI
// interpolates between them on the browser's own animation timeline.
export function springFrames(from, to, velocity, options) {
  const frames = [{ time: 0, position: from }];
  for (let step = 1; step <= 360; step++) {
    const time = step / 120, state = springAt(time, from, to, velocity * 1000, options);
    const settled = Math.abs(state.position - to) < (options.precision ?? .25) && Math.abs(state.velocity) < 2;
    frames.push({ time: time * 1000, position: settled || step === 360 ? to : state.position });
    if (settled) break;
  }
  return frames;
}

export function framePosition(frames, time) {
  let low = 0, high = frames.length - 1;
  while (low < high) { const mid = Math.ceil((low + high) / 2); if (frames[mid].time <= time) low = mid; else high = mid - 1; }
  const index = Math.min(frames.length - 2, low);
  const a = frames[index], b = frames[index + 1];
  const fraction = Math.max(0, Math.min(1, (time - a.time) / (b.time - a.time)));
  return a.position + (b.position - a.position) * fraction;
}

function release(animations) {
  animations.forEach(animation => animation.cancel());
  animations.release?.();
}

export class Animator {
  constructor(win, effects) { this.win = win; this.effects = effects; }

  cancel() {
    const position = this.sample?.(), render = this.render, finish = this.finish, cleanup = this.cleanup;
    this.win.cancelAnimationFrame(this.frame);
    this.finish = this.cleanup = this.sample = this.complete = this.retarget = this.render = null;
    // Commit the presented pose before releasing its compositor effect.
    cleanup?.(position);
    if (position != null) render(position);
    finish?.(false);
  }

  to(from, to, velocity, options, render, immediate = false) {
    this.cancel();
    if (immediate || options.skip || this.win.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      render(to);
      return Promise.resolve(true);
    }
    let frames;
    if (options.easing && options.easing !== "spring") {
      const duration = options.duration ?? 500, count = Math.max(1, Math.ceil(duration / (1000/120)));
      frames = Array.from({ length: count + 1 }, (_, index) => ({ time: duration * index / count, position: from + (to-from) * easingAt(index/count, options.easing) }));
    } else frames = springFrames(from, to, options.initialVelocity == null ? velocity : options.initialVelocity / 1000, options);
    if (options.delay) frames = [{ time: 0, position: from }, ...frames.map(frame => ({ ...frame, time: frame.time + options.delay }))];
    let duration = frames.at(-1).time;
    if (!duration) { render(to); return Promise.resolve(true); }
    let animations = [], start;
    return new Promise(resolve => {
      this.finish = resolve;
      const currentTime = () => animations.length ? Number(animations[0].currentTime || 0) : Math.max(0, this.win.performance.now() - start);
      const finish = completed => {
        if (this.finish !== resolve) return;
        const previous = animations;
        this.win.cancelAnimationFrame(this.frame);
        this.finish = this.sample = this.cleanup = this.complete = this.retarget = this.render = null;
        // The stylesheet must already describe the final pose when WebKit
        // removes the animation's composited layer.
        if (completed) previous.commit?.(to);
        release(previous);
        if (completed) render(to);
        resolve(completed);
      };
      const play = () => {
        start = this.win.performance.now();
        const playing = animations = this.effects?.(frames, duration) || [];
        if (playing.length) Promise.all(playing.map(animation => animation.finished)).then(
          () => { if (animations === playing) finish(true); },
          () => { if (animations === playing) finish(false); }
        );
      };
      this.cleanup = position => {
        if (position != null) animations.commit?.(position);
        release(animations);
      };
      this.render = render;
      this.sample = () => animations.position?.() ?? framePosition(frames, currentTime());
      this.complete = position => { to = position; finish(true); };
      this.retarget = (target, scale = 1) => {
        const time = Math.min(duration, currentTime());
        if (time >= duration) { to = target; finish(true); return; }
        const presented = this.sample(), calculated = framePosition(frames, time);
        const remaining = duration - time;
        const correction = target - (to - calculated + presented) * scale;
        frames = [{ time: 0, position: presented * scale }, ...frames.filter(frame => frame.time > time).map(frame => ({
          time: frame.time - time,
          position: (frame.position - calculated + presented) * scale + correction * (frame.time - time) / remaining
        }))];
        to = target; duration = remaining;
        const previous = animations;
        animations = [];
        previous.commit?.(frames[0].position);
        release(previous);
        render(frames[0].position);
        if (this.finish === resolve) play();
      };
      const tick = now => {
        if (this.finish !== resolve) return;
        const time = animations.length ? currentTime() : Math.max(0, now - start);
        if (!animations.length && time >= duration) { finish(true); return; }
        render(framePosition(frames, time));
        if (this.finish !== resolve) return;
        this.frame = this.win.requestAnimationFrame(tick);
      };
      play();
      this.frame = this.win.requestAnimationFrame(tick);
    });
  }
}
