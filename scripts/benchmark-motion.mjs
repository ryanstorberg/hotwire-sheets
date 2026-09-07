import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(process.env.SHEET_DEMO_URL || "http://127.0.0.1:4173/regression");
  await page.waitForFunction(() => window.lab?.get("basic"));
  const measurements = await page.evaluate(async () => {
    const intervals = { idle: [], motion: [] }, longTasks = [];
    let phase = "idle", previous, frame;
    const sample = time => {
      if (previous != null) intervals[phase].push(time - previous);
      previous = time;
      frame = requestAnimationFrame(sample);
    };
    let observer;
    if (PerformanceObserver.supportedEntryTypes.includes("longtask")) {
      observer = new PerformanceObserver(list => longTasks.push(...list.getEntries().map(entry => entry.duration)));
      observer.observe({ type: "longtask" });
    }
    frame = requestAnimationFrame(sample);
    await new Promise(resolve => setTimeout(resolve, 600));
    phase = "motion"; previous = undefined;
    for (let iteration = 0; iteration < 4; iteration++) {
      await window.lab.get("basic").open();
      await window.lab.get("basic").close();
    }
    cancelAnimationFrame(frame); observer?.disconnect();
    const describe = values => {
      const sorted = [...values].sort((a, b) => a - b), median = sorted[Math.floor(sorted.length / 2)];
      return { samples: values.length, medianFrameMs: +median.toFixed(2), p95FrameMs: +sorted[Math.floor(sorted.length * .95)].toFixed(2), observedHz: +(1000 / median).toFixed(1) };
    };
    return { idle: describe(intervals.idle), motion: describe(intervals.motion), longTasksOver50ms: longTasks.length };
  });
  const result = { date: new Date().toISOString(), browser: `Headless Chromium ${browser.version()}`, viewport: "1280×720", ...measurements,
    scope: "Local requestAnimationFrame cadence during eight WAAPI transitions. Not physical-device 120 Hz or GPU hardware certification." };
  await mkdir("tmp", { recursive: true });
  await writeFile("tmp/motion-benchmark.json", JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify(result, null, 2));
} finally { await browser.close(); }
