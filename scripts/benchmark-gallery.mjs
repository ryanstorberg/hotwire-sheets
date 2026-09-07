import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { examples } from '../examples/catalog.js';

const browser = await chromium.launch();
const results = [];
const describe = values => {
  const sorted = [...values].sort((a,b) => a-b), median = sorted[Math.floor(sorted.length/2)] || 0;
  return { frames: sorted.length, medianMs: +median.toFixed(2), p95Ms: +(sorted[Math.floor(sorted.length*.95)] || 0).toFixed(2), observedHz: median ? +(1000/median).toFixed(1) : null, framesOver25ms: sorted.filter(value => value > 25).length };
};
try {
  for (const viewport of [{ width: 1280, height: 720 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    await page.goto(process.env.SHEET_DEMO_URL || 'http://127.0.0.1:4173/');
    await page.waitForFunction(() => window.lab?.get('basic'));
    await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(image => image.decode().catch(() => {}))); });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Performance.enable');
    await cdp.send('LayerTree.enable');
    let layers = [], peakLayers = 0;
    cdp.on('LayerTree.layerTreeDidChange', event => { layers = event.layers || []; peakLayers = Math.max(peakLayers, layers.length); });
    const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(metric => [metric.name, metric.value]));
    const cases = [...Object.entries(examples).map(([id, [name]]) => ({ id, name })), { id: 'nested-depth', name: 'Three depth layers' }];
    for (const { id, name } of cases) {
      peakLayers = 0;
      const before = await metrics();
      const pending = page.evaluate(async id => {
        const intervals = [], longTasks = []; let previous, frame;
        const tick = time => { if (previous != null) intervals.push(time-previous); previous = time; frame = requestAnimationFrame(tick); };
        const observer = new PerformanceObserver(list => longTasks.push(...list.getEntries().map(entry => entry.duration)));
        observer.observe({ type: 'longtask' }); frame = requestAnimationFrame(tick);
        const ids = id === 'nested-depth' ? ['depth', 'depth-child', 'depth-third'] : [id];
        const backends = ids.map(key => ({ id: key, nativeSnap: !!window.lab.get(key).nativeMotion, animation: window.lab.get(key).options.animation }));
        for (const key of ids) await window.lab.get(key).open();
        for (const key of [...ids].reverse()) await window.lab.get(key).close();
        cancelAnimationFrame(frame); observer.disconnect();
        return { intervals, longTasks, backends };
      }, id);
      await new Promise(resolve => setTimeout(resolve, 120));
      const compositingReasons = new Set();
      for (const layer of layers.filter(layer => layer.drawsContent).slice(-12)) {
        try { for (const reason of (await cdp.send('LayerTree.compositingReasons', { layerId: layer.layerId })).compositingReasons) compositingReasons.add(reason); } catch {}
      }
      const sampled = await pending, after = await metrics();
      results.push({ name, viewport, ...describe(sampled.intervals), longTasksOver50ms: sampled.longTasks.length, longestTaskMs: Math.max(0, ...sampled.longTasks), backends: sampled.backends,
        layoutCount: after.LayoutCount-before.LayoutCount, layoutMs: +((after.LayoutDuration-before.LayoutDuration)*1000).toFixed(2), styleMs: +((after.RecalcStyleDuration-before.RecalcStyleDuration)*1000).toFixed(2), scriptMs: +((after.ScriptDuration-before.ScriptDuration)*1000).toFixed(2), peakLayers, compositingReasons: [...compositingReasons] });
      console.log(`${viewport.width}×${viewport.height} ${name}: p95 ${results.at(-1).p95Ms} ms; ${sampled.longTasks.length} long tasks`);
    }
    await page.close();
  }
  const report = { date: new Date().toISOString(), browser: `Headless Chromium ${browser.version()}`, scope: 'Local gallery entry/exit and three-layer depth transitions. Browser compositing reasons do not certify physical GPU execution or 120 Hz hardware.', results };
  await mkdir('tmp', { recursive: true }); await writeFile('tmp/motion-benchmark-all.json', JSON.stringify(report, null, 2)+'\n');
} finally { await browser.close(); }
