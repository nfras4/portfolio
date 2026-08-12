// Mobile verification for the redesign — same CDP emulation recipe as the audit.
// Run: bun run mobile-verify.js   (from this directory)
const puppeteer = require("../audit-tools/node_modules/puppeteer-core");
const fs = require("fs");
const path = require("path");

const URL = "http://localhost:4300/";
const SHOTS = path.join(__dirname, "..", "redesign-shots");
const OUT = path.join(__dirname, "results.json");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const SCRATCH = path.join(process.env.TEMP || "C:\\temp", "redesign-chrome-profile");

const WIDTHS = [
  { w: 360, h: 800 },
  { w: 390, h: 844 },
  { w: 414, h: 896 },
  { w: 430, h: 932 },
];

const results = { meta: { url: URL, date: new Date().toISOString() } };
const save = () => fs.writeFileSync(OUT, JSON.stringify(results, null, 2));

async function slowScroll(page) {
  await page.evaluate(async () => {
    const delay = (ms) => new Promise((r) => setTimeout(r, ms));
    const total = document.scrollingElement.scrollHeight;
    const step = Math.floor(window.innerHeight * 0.7);
    for (let y = 0; y <= total; y += step) { window.scrollTo(0, y); await delay(300); }
    window.scrollTo(0, 0);
    await delay(400);
  });
  try {
    await page.waitForFunction(() => Array.from(document.images).every((i) => i.complete), { timeout: 15000 });
  } catch { console.log("  (some images never completed)"); }
}

async function tapTargets(page) {
  return page.evaluate(() => {
    const one = (sel, el) => {
      el = el || document.querySelector(sel);
      if (!el) return { sel, missing: true };
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        sel,
        text: (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 36),
        w: +r.width.toFixed(1), h: +r.height.toFixed(1),
        font: cs.fontSize, padding: cs.padding,
        visible: r.width > 0 && r.height > 0 && cs.display !== "none",
      };
    };
    const all = (sel) => Array.from(document.querySelectorAll(sel)).map((el) => one(sel, el));
    return {
      showcaseTag: one(".showcase-tag"),
      navBrand: one(".nav-brand"),
      navToggle: one(".nav-toggle"),
      heroLinks: all(".hero-link"),
      aboutPhotoCredit: one(".about-photo-credit"),
      projRows: all(".proj-row").map((p) => ({ ...p, text: p.text.slice(0, 16) })),
      certCards: all(".cert-card").map((c) => ({ w: c.w, h: c.h })),
      inlineLink: one(".inline-link"),
      contactEmail: one(".contact-email"),
      footerLinks: all(".footer-inner a"),
      heroMetaItems: all(".hero-meta-item").map((m) => ({ w: m.w, h: m.h })),
    };
  });
}

async function overview(page) {
  return page.evaluate(() => {
    const secH = (sel) => {
      const el = document.querySelector(sel);
      return el ? +el.getBoundingClientRect().height.toFixed(0) : null;
    };
    return {
      docHeight: document.scrollingElement.scrollHeight,
      scrollWidth: document.scrollingElement.scrollWidth,
      innerWidth: window.innerWidth,
      sections: {
        nav: secH(".nav"), hero: secH("#top"), about: secH("#about"),
        projects: secH("#projects"), skills: secH("#skills"),
        experience: secH("#education"), contact: secH("#contact"), footer: secH(".footer"),
      },
    };
  });
}

async function main() {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    userDataDir: SCRATCH,
    args: ["--remote-debugging-port=9555", "--hide-scrollbars"],
  });
  const page = await browser.newPage();

  results.widths = {};
  for (const { w, h } of WIDTHS) {
    console.log(`--- ${w}x${h}`);
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    await page.goto(URL, { waitUntil: "networkidle0", timeout: 30000 });
    await slowScroll(page);
    results.widths[w] = await overview(page);
    await page.screenshot({ path: path.join(SHOTS, `full-${w}.png`), fullPage: true });
    save();
  }

  // ---- deep checks at 390 (light theme) ----
  console.log("--- 390 deep checks");
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await page.goto(URL, { waitUntil: "networkidle0", timeout: 30000 });
  await slowScroll(page);

  results.tapTargets390 = await tapTargets(page);
  save();

  // shader: rAF activity over 2s while hero on-screen (static mode => ~0)
  results.shader = await page.evaluate(async () => {
    window.scrollTo(0, 0);
    const canvas = document.querySelector(".hero-shader");
    const cs = canvas ? getComputedStyle(canvas) : null;
    let rafCount = 0;
    const orig = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (fn) => { rafCount++; return orig(fn); };
    await new Promise((r) => setTimeout(r, 2000));
    window.requestAnimationFrame = orig;
    return {
      canvasPresent: !!canvas,
      display: cs && cs.display,
      size: canvas && { w: canvas.width, h: canvas.height },
      maskImage: cs && (cs.webkitMaskImage || cs.maskImage).slice(0, 44),
      rafCallsIn2s: rafCount,
    };
  });
  console.log("shader:", JSON.stringify(results.shader));
  save();

  // two hero shots 1s apart — the canvas strip must be identical (static frame)
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 400));
  const heroA = await page.screenshot({ encoding: "base64" });
  await new Promise((r) => setTimeout(r, 1000));
  const heroB = await page.screenshot({ encoding: "base64" });
  results.heroStaticStrip = await page.evaluate(async (a, b) => {
    const load = (b64) => new Promise((res, rej) => {
      const img = new Image(); img.onload = () => res(img); img.onerror = rej;
      img.src = "data:image/png;base64," + b64;
    });
    const [ia, ib] = await Promise.all([load(a), load(b)]);
    const w = ia.width, hh = ia.height;
    const grab = (img) => {
      const c = document.createElement("canvas"); c.width = w; c.height = hh;
      const x = c.getContext("2d", { willReadFrequently: true });
      x.drawImage(img, 0, 0);
      // right-edge strip: only shader + background there (shell pad = 20px css = 60dev px)
      return x.getImageData(w - 50, 300, 44, Math.min(1800, hh - 400)).data;
    };
    const da = grab(ia), db = grab(ib);
    let diff = 0;
    for (let i = 0; i < da.length; i += 4) {
      if (Math.abs(da[i] - db[i]) > 8 || Math.abs(da[i + 1] - db[i + 1]) > 8 || Math.abs(da[i + 2] - db[i + 2]) > 8) diff++;
    }
    return { stripPx: da.length / 4, diffPx: diff };
  }, heroA, heroB);
  console.log("hero static strip:", JSON.stringify(results.heroStaticStrip));
  save();

  // sticky notes in-flow
  results.notes390 = await page.evaluate(() => {
    return Array.from(document.querySelectorAll(".proj-note")).map((n) => {
      const cs = getComputedStyle(n);
      const note = n.getBoundingClientRect();
      const body = n.closest(".proj-body");
      const tagline = body.querySelector(".proj-tagline").getBoundingClientRect();
      const stack = body.querySelector(".proj-stack").getBoundingClientRect();
      const sn = n.querySelector(".sticky-note");
      return {
        position: cs.position,
        visible: note.width > 0 && note.height > 0 && cs.display !== "none",
        w: +note.width.toFixed(1), h: +note.height.toFixed(1),
        betweenTaglineAndStack: note.top >= tagline.bottom && note.bottom <= stack.top,
        transform: getComputedStyle(sn).transform,
        bg: getComputedStyle(sn).backgroundColor,
        text: (sn.textContent || "").trim().slice(0, 40),
      };
    });
  });
  console.log("notes:", JSON.stringify(results.notes390, null, 1));
  save();

  // section shots at 390
  const shoot = async (name, scrollExpr) => {
    await page.evaluate(scrollExpr);
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: path.join(SHOTS, name) });
  };
  await shoot("390-hero.png", "window.scrollTo(0, 0)");
  await shoot("390-projects.png", "document.querySelector('#projects').scrollIntoView()");
  await shoot("390-skills.png", "document.querySelector('#skills').scrollIntoView()");
  await shoot("390-experience.png", "document.querySelector('#education').scrollIntoView()");
  await shoot("390-contact.png", "document.querySelector('#contact').scrollIntoView()");
  await shoot("390-footer.png", "window.scrollTo(0, document.body.scrollHeight)");

  // nav open: measure menu targets + status line, then screenshot
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.click(".nav-toggle");
  await new Promise((r) => setTimeout(r, 450));
  results.navOpen390 = await page.evaluate(() => {
    const g = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      return { w: +r.width.toFixed(1), h: +r.height.toFixed(1), font: cs.fontSize, display: cs.display, text: (el.textContent || "").trim().slice(0, 30) };
    };
    return {
      navLink: g(".nav-link"),
      navTheme: g(".nav-theme"),
      navStatusMenu: g(".nav-status--menu"),
    };
  });
  console.log("nav open:", JSON.stringify(results.navOpen390));
  await page.screenshot({ path: path.join(SHOTS, "390-nav-open.png") });
  save();

  // ---- dark theme at 390 ----
  console.log("--- 390 dark");
  await page.evaluate(() => localStorage.setItem("theme", "dark"));
  await page.reload({ waitUntil: "networkidle0" });
  await slowScroll(page);
  results.dark390 = {
    theme: await page.evaluate(() => document.documentElement.getAttribute("data-theme")),
    notes: await page.evaluate(() =>
      Array.from(document.querySelectorAll(".proj-note .sticky-note")).map((sn) => ({
        bg: getComputedStyle(sn).backgroundColor,
        ink: getComputedStyle(sn).color,
        visible: sn.getBoundingClientRect().height > 0,
      }))
    ),
  };
  await shoot("390-dark-hero.png", "window.scrollTo(0, 0)");
  await shoot("390-dark-projects.png", "document.querySelector('#projects').scrollIntoView()");
  console.log("dark:", JSON.stringify(results.dark390));
  await page.evaluate(() => localStorage.setItem("theme", "light"));
  save();

  await browser.close();
  console.log("done; results in", OUT);
}

main().catch((e) => { console.error(e); process.exit(1); });
