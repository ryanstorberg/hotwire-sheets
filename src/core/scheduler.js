// Collapse input and observer notifications into at most one DOM write per frame.
export function frameTask(win, task) {
  let frame;
  const schedule = () => { frame ??= win.requestAnimationFrame(() => { frame = undefined; task(); }); };
  schedule.cancel = () => { win.cancelAnimationFrame(frame); frame = undefined; };
  return schedule;
}
