// Mobile UX audit driver — puppeteer-core against installed Chrome.
// Run: bun run audit.js
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const URL = "http://localhost:4174/";
const SHOTS = "D:\\claudecode\\portfolio\\docs\\overnight\\audit-shots";
const OUT = "D:\\claudecode\\portfolio\\docs\\overnight\\audit-tools\\results.json";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const SCRATCH = path.join(process.env.TEMP || "C:\\temp", "audit-chrome-profile");

const MOBILE_WIDTHS = [
  { w: 360, h: 800 },
  { w: 390, h: 844 },
  { w: 414, h: 896 },
  { w: 430, h: 932 },
];

const results = { meta: { url: URL, date: new Date().toISOString() } };
function save() {
  fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
}

async function slowScroll(page) {
  // scroll section by section, waiting for lazy images
  await page.evaluate(async () => {
    const delay = (ms) => new Promise((r) => setTimeout(r, ms));
    const total = document.scrollingElement.scrollHeight;
    const step = Math.floor(window.innerHeight * 0.7);
    for (let y = 0; y <= total; y += step) {
      window.scrollTo(0, y);
      await delay(350);
    }
    window.scrollTo(0, 0);
    await delay(400);
  });
  // wait for all images to be complete
  try {
    await page.waitForFunction(
      () => Array.from(document.images).every((i) => i.complete),
      { timeout: 15000 }
    );
  } catch (e) {
    console.log("  (some images never completed)");
  }
}

async function measureTypography(page) {
  return page.evaluate(() => {
    const pick = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      return {
        selector: sel,
        fontSize: cs.fontSize,
        lineHeight: cs.lineHeight,
        fontWeight: cs.fontWeight,
        text: (el.textContent || "").trim().slice(0, 40),
      };
    };
    return {
      body: pick("body"),
      h1_heroPitch: pick("h1.hero-pitch"),
      heroName: pick(".hero-name"),
      sectionNumLabel: pick(".section-num-label"),
      lead: pick(".lead"),
      bItem: pick(".b-item"),
      projName: pick(".proj-name"),
      projTagline: pick(".proj-tagline"),
      projMetricDd: pick(".proj-metric dd"),
      skillItem: pick(".skill-items li"),
      expRole: pick(".exp-role"),
      expBullet: pick(".exp-bullets li"),
      contactPitch: pick(".contact-pitch"),
      contactEmail: pick(".contact-email .mono"),
      navLink: pick(".nav-link"),
      heroLinkVal: pick(".hero-link-val"),
      heroLinkKey: pick(".hero-link-key"),
      heroMetaVal: pick(".hero-meta-val"),
      footer: pick(".footer-inner"),
      small: pick(".proj-year"),
    };
  });
}

async function measureTapTargets(page) {
  return page.evaluate(() => {
    const els = Array.from(document.querySelectorAll("a, button, [role=button]"));
    return els
      .map((el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        const visible =
          r.width > 0 &&
          r.height > 0 &&
          cs.display !== "none" &&
          cs.visibility !== "hidden";
        return {
          tag: el.tagName.toLowerCase(),
          cls: el.className && typeof el.className === "string" ? el.className : "",
          text: (el.textContent || el.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 50),
          w: Math.round(r.width * 10) / 10,
          h: Math.round(r.height * 10) / 10,
          fontSize: cs.fontSize,
          padding: cs.padding,
          display: cs.display,
          visible,
        };
      })
      .filter((e) => e.visible);
  });
}

async function measureDecorative(page) {
  return page.evaluate(() => {
    const sels = {
      heroShaderCanvas: ".hero-shader",
      heroComputer3D: ".hero-computer",
      contactBox3D: ".contact-box",
      workspaceModel: ".workspace-model",
      expModelRail: ".exp-model-rail",
      pixelBox: ".pb-wrap",
      retroComputer: ".rc-wrap",
      stickyNotes: ".sticky-note",
      sectionNum: ".section-num",
      sectionNumLine: ".section-num-line",
      projNote: ".proj-note",
      navStatus: ".nav-status",
    };
    const out = {};
    for (const [name, sel] of Object.entries(sels)) {
      const els = Array.from(document.querySelectorAll(sel));
      if (!els.length) {
        out[name] = { present: false };
        continue;
      }
      out[name] = els.slice(0, 4).map((el) => {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return {
          display: cs.display,
          visibility: cs.visibility,
          opacity: cs.opacity,
          w: Math.round(r.width),
          h: Math.round(r.height),
          inDocFlowTop: Math.round(r.top + window.scrollY),
        };
      });
    }
    // any canvas elements
    out.canvases = Array.from(document.querySelectorAll("canvas")).map((c) => {
      const r = c.getBoundingClientRect();
      const cs = getComputedStyle(c);
      return { cls: c.className, w: Math.round(r.width), h: Math.round(r.height), display: cs.display, backingW: c.width, backingH: c.height };
    });
    return out;
  });
}

async function measureSpacing(page) {
  return page.evaluate(() => {
    const out = {};
    const secs = Array.from(document.querySelectorAll("section.section, header.hero, footer.footer, nav.nav"));
    out.sections = secs.map((s) => {
      const cs = getComputedStyle(s);
      const r = s.getBoundingClientRect();
      return {
        id: s.id || s.className.split(" ")[0],
        paddingTop: cs.paddingTop,
        paddingBottom: cs.paddingBottom,
        height: Math.round(r.height),
      };
    });
    const shell = document.querySelector(".shell");
    if (shell) {
      const cs = getComputedStyle(shell);
      out.shellPadding = cs.padding;
    }
    out.docHeight = document.scrollingElement.scrollHeight;
    out.innerHeight = window.innerHeight;
    return out;
  });
}

async function measureOverflow(page) {
  return page.evaluate(() => {
    const sw = document.scrollingElement.scrollWidth;
    const iw = window.innerWidth;
    const offenders = [];
    if (sw > iw) {
      document.querySelectorAll("*").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.right > iw + 1 || r.left < -1) {
          if (offenders.length < 15)
            offenders.push({
              tag: el.tagName.toLowerCase(),
              cls: typeof el.className === "string" ? el.className.slice(0, 60) : "",
              left: Math.round(r.left),
              right: Math.round(r.right),
              w: Math.round(r.width),
            });
        }
      });
    }
    return { scrollWidth: sw, innerWidth: iw, overflow: sw - iw, offenders };
  });
}

async function sectionShots(page, prefix) {
  const sections = [
    ["nav", "nav.nav"],
    ["hero", "header.hero"],
    ["about", "#about"],
    ["projects", "#projects"],
    ["skills", "#skills"],
    ["experience", "#experience"],
    ["contact", "#contact"],
    ["footer", "footer.footer"],
  ];
  for (const [name, sel] of sections) {
    const el = await page.$(sel);
    if (!el) {
      console.log(`  section ${name} (${sel}) NOT FOUND`);
      continue;
    }
    await page.evaluate((s) => {
      document.querySelector(s).scrollIntoView({ block: "start" });
    }, sel);
    await new Promise((r) => setTimeout(r, 900)); // let lazy imgs + fade-up anims settle
    try {
      await el.screenshot({ path: path.join(SHOTS, `${prefix}-${name}.png`) });
      console.log(`  shot ${prefix}-${name}.png`);
    } catch (e) {
      console.log(`  shot ${name} failed: ${e.message}`);
    }
  }
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: [
      "--remote-debugging-port=9333",
      `--user-data-dir=${SCRATCH}`,
      "--no-first-run",
      "--hide-scrollbars",
    ],
  });
  const page = await browser.newPage();
  const cdp = await page.createCDPSession();

  // ---------- desktop baseline ----------
  console.log("== desktop 1440x900 ==");
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false });
  await page.goto(URL, { waitUntil: "networkidle2", timeout: 60000 });
  await slowScroll(page);
  results.desktop = {
    typography: await measureTypography(page),
    spacing: await measureSpacing(page),
    decorative: await measureDecorative(page),
  };
  save();
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(SHOTS, "desktop-1440-top.png") });

  // ---------- mobile widths ----------
  for (const { w, h } of MOBILE_WIDTHS) {
    console.log(`== mobile ${w}x${h} ==`);
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
    await page.goto(URL, { waitUntil: "networkidle2", timeout: 60000 });
    await slowScroll(page);

    const key = `m${w}`;
    results[key] = {
      overflow: await measureOverflow(page),
      spacing: await measureSpacing(page),
    };
    if (w === 390) {
      results[key].typography = await measureTypography(page);
      results[key].tapTargets = await measureTapTargets(page);
      results[key].decorative = await measureDecorative(page);
    }
    save();

    // full-page screenshot (DPR 3 can exceed texture limits on tall pages; fall back)
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise((r) => setTimeout(r, 500));
    try {
      await page.screenshot({ path: path.join(SHOTS, `full-${w}.png`), fullPage: true });
      console.log(`  full-${w}.png ok`);
    } catch (e) {
      console.log(`  fullpage@dpr3 failed (${e.message}), retrying dpr1`);
      await page.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
      await new Promise((r) => setTimeout(r, 400));
      await page.screenshot({ path: path.join(SHOTS, `full-${w}-dpr1.png`), fullPage: true });
      await page.setViewport({ width: w, height: h, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    }

    if (w === 390) {
      await sectionShots(page, "390");
      // nav menu open state
      const toggle = await page.$(".nav-toggle");
      if (toggle) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await toggle.click();
        await new Promise((r) => setTimeout(r, 600));
        await page.screenshot({ path: path.join(SHOTS, "390-nav-open.png") });
        // measure tap targets of the open menu
        results[key].navOpenTapTargets = await page.evaluate(() => {
          return Array.from(document.querySelectorAll(".nav-links a, .nav-links button, .nav-toggle")).map((el) => {
            const r = el.getBoundingClientRect();
            const cs = getComputedStyle(el);
            return { cls: el.className, text: (el.textContent || "").trim().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height), fontSize: cs.fontSize };
          });
        });
        save();
        await toggle.click();
      }
    }
  }

  await browser.close();
  console.log("DONE");
})().catch((e) => {
  console.error("FATAL", e);
  save();
  process.exit(1);
});
