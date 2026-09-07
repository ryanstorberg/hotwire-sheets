// Temporary local diagnostics. Never hit-test or serialize during a gesture:
// trackpads deliver many small packets at the display's refresh cadence.
const entries = [], starts = [], scrolls = new WeakMap();
const describe = node => node?.closest?.('[data-sheet-content]')?.id ||
  (node?.matches?.('[data-sheet-view]') && node.querySelector('[data-sheet-content]')?.id) || node?.id || node?.tagName;
const snapshot = (event, phase) => ({ t: Math.round(performance.now()), phase,
  kind: event?.type, d: event?.type === 'wheel' ? [event.deltaX,event.deltaY] : null,
  xy: event?.type === 'wheel' ? [event.clientX,event.clientY] : null,
  c: event?.cancelable, p: event?.defaultPrevented, target: describe(event?.target),
  sheets: window.lab.get('depth')?.stack.items.map(s => ({ id:s.root.id,state:s.state,
    pos:Math.round(s.position),inert:s.view.inert,wheel:!!s.gesture.wheeling,
    native:!!s.gesture.wheelScrolling,nativeInput:!!s.nativeMotion?.input,
    operation:s.nativeMotion?.operation?.target,outer:scrolls.get(s.view) || 0,
    scroll:scrolls.get(s.content.querySelector('[data-sheet-body]')) || 0 })) });
let timer, lastWheel = -Infinity;
const record = entry => {
  entries.push(entry);
  if (entries.length > 4096) entries.splice(0, 1024);
  clearTimeout(timer);
  timer = setTimeout(() => {
    document.documentElement.dataset.sheetInputTrace = JSON.stringify(entries);
    document.documentElement.dataset.sheetGestureTrace = JSON.stringify(starts);
  }, 300);
};
const start = entry => { starts.push(entry); if (starts.length > 80) starts.shift(); };
document.addEventListener('wheel', event => {
  const entry = snapshot(event,'wheel');
  if (entry.t-lastWheel > 200) start(entry);
  lastWheel = entry.t;
  record(entry);
}, {passive:true});
document.addEventListener('scroll', event => {
  const node = event.target;
  if (!node.matches?.('[data-sheet-body],[data-sheet-view]')) return;
  scrolls.set(node, Math.round(node.scrollTop));
  record(snapshot(event,'scroll'));
}, {capture:true,passive:true});
for (const name of ['sheet:open','sheet:close']) document.addEventListener(name, event => {
  const entry = snapshot(event,name); start(entry); record(entry);
});
