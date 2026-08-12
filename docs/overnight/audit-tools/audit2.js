// Follow-up: experience shot, scroll perf @4x CPU, shader activity, network chunks on mobile
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const URL = "http://localhost:4174/";
const SHOTS = "D:\\claudecode\\portfolio\\docs\\overnight\\audit-shots";
const OUT = "D:\\claudecode\\portfolio\\docs\\overnight\\audit-tools\\results2.json";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const SCRATCH = path.join(process.env.TEMP || "C:\\temp", "audit-chrome-profile2");

const results = {};
const save = () => fs.writeFileSync(OUT, JSON.stringify(results, null, 2));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: [`--user-data-dir=${SCRATCH}`, "--no-first-run", "--hide-scrollbars"],
  });
  const page = await browser.newPage();
  const cdp = await page.createCDPSession();

  const requests = [];
  page.on("request", (r) => requests.push(r.url()));

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  await page.goto(URL, { waitUntil: "networkidle2", timeout: 60000 });

  // --- shader rAF activity at top of page (no throttle) ---
  results.shaderIdle = await page.evaluate(async () => {
    const t0 = performance.now();
    let frames = 0;
    await new Promise((res) => {
      function tick() {
        frames++;
        if (performance.now() - t0 < 2000) requestAnimationFrame(tick);
        else res();
      }
      requestAnimationFrame(tick);
    });
    const canvas = document.querySelector(".hero-shader");
    return {
      rafFpsIdle: Math.round(frames / 2),
      canvasPresent: !!canvas,
      canvasBacking: canvas ? { w: canvas.width, h: canvas.height } : null,
      webglContext: canvas ? !!(canvas.getContext("webgl2") || canvas.getContext("webgl")) : null,
    };
  });
  save();

  // slow full scroll to force all lazy loads, then record which chunks were fetched
  await page.evaluate(async () => {
    const delay = (ms) => new Promise((r) => setTimeout(r, ms));
    const total = document.scrollingElement.scrollHeight;
    const step = Math.floor(window.innerHeight * 0.7);
    for (let y = 0; y <= total; y += step) {
      window.scrollTo(0, y);
      await delay(300);
    }
  });
  await new Promise((r) => setTimeout(r, 2000));
  results.mobileChunksLoaded = {
    three: requests.some((u) => u.includes("three.module")),
    workspaceModel: requests.some((u) => u.includes("WorkspaceModel")),
    showcase: requests.some((u) => u.includes("Showcase")),
    all: requests.filter((u) => u.endsWith(".js")).map((u) => u.split("/").pop()),
  };
  save();

  // --- experience section shot ---
  await page.evaluate(() => document.querySelector("#education").scrollIntoView({ block: "start" }));
  await new Promise((r) => setTimeout(r, 1200));
  const el = await page.$("#education");
  await el.screenshot({ path: path.join(SHOTS, "390-experience.png") });
  console.log("390-experience.png ok");

  // --- scroll perf with 4x CPU throttle ---
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 800));
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  results.scrollPerf4x = await page.evaluate(async () => {
    // measure rAF frame intervals while smooth-scrolling through the page
    const intervals = [];
    let last = performance.now();
    let running = true;
    function tick() {
      const now = performance.now();
      intervals.push(now - last);
      last = now;
      if (running) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    const total = document.scrollingElement.scrollHeight - window.innerHeight;
    const t0 = performance.now();
    const dur = 6000;
    await new Promise((res) => {
      function scrollStep() {
        const p = (performance.now() - t0) / dur;
        if (p >= 1) { running = false; return res(); }
        window.scrollTo(0, p * total);
        requestAnimationFrame(scrollStep);
      }
      requestAnimationFrame(scrollStep);
    });
    intervals.sort((a, b) => a - b);
    const n = intervals.length;
    const sum = intervals.reduce((a, b) => a + b, 0);
    const pct = (q) => Math.round(intervals[Math.floor(n * q)] * 10) / 10;
    return {
      frames: n,
      avgMs: Math.round((sum / n) * 10) / 10,
      p50: pct(0.5),
      p90: pct(0.9),
      p99: pct(0.99),
      worst: Math.round(intervals[n - 1] * 10) / 10,
      framesOver33ms: intervals.filter((i) => i > 33).length,
      framesOver100ms: intervals.filter((i) => i > 100).length,
      effectiveFps: Math.round((n / (sum / 1000)) * 10) / 10,
    };
  });
  save();

  // same measurement at top of page, hero shader visible, 4x throttle, no scrolling
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 800));
  results.heroIdle4x = await page.evaluate(async () => {
    const t0 = performance.now();
    let frames = 0;
    await new Promise((res) => {
      function tick() {
        frames++;
        if (performance.now() - t0 < 3000) requestAnimationFrame(tick);
        else res();
      }
      requestAnimationFrame(tick);
    });
    return { rafFps: Math.round(frames / 3) };
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  save();

  // nav-links closed-state clip check (are they really hidden when menu closed?)
  results.navClosedClip = await page.evaluate(() => {
    const links = document.querySelector(".nav-links");
    const cs = getComputedStyle(links);
    const r = links.getBoundingClientRect();
    return { maxHeight: cs.maxHeight, overflow: cs.overflow, rectH: Math.round(r.height) };
  });
  save();

  await browser.close();
  console.log("DONE2");
})().catch((e) => { console.error("FATAL", e); save(); process.exit(1); });
