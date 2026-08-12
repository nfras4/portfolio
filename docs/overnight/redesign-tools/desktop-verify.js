// Desktop non-regression check for the mobile redesign.
// Run: bun run desktop-verify.js   (from this directory)
// - 1440x900 DPR1 mobile:false against :4300
// - freezes the hero rotator on the baseline's word ("API dashboards")
// - full-page screenshot -> ../redesign-shots/desktop-1440-after.png
// - viewport (top 900px) diffed per-pixel against ../audit-shots/desktop-1440-top.png
//   (diff computed in-browser via canvas; no image deps needed)
// - DOM invariants that encode "desktop layout unchanged" for the JSX moves
const puppeteer = require("../audit-tools/node_modules/puppeteer-core");
const fs = require("fs");
const path = require("path");

const URL = "http://localhost:4300/";
const SHOTS = path.join(__dirname, "..", "redesign-shots");
const BASELINE = path.join(__dirname, "..", "audit-shots", "desktop-1440-top.png");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const SCRATCH = path.join(process.env.TEMP || "C:\\temp", "redesign-chrome-profile");

const HERO_BOTTOM = 760; // nav(65) + hero(~649) + margin; everything above is animated (shader/computer/nav blur)

async function main() {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    userDataDir: SCRATCH,
    args: ["--remote-debugging-port=9555", "--hide-scrollbars"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false });
  await page.goto(URL, { waitUntil: "networkidle0", timeout: 30000 });

  // freeze the rotator on the baseline's word
  await page.waitForFunction(
    () => document.querySelector(".hero-pitch .accent")?.textContent === "API dashboards",
    { timeout: 30000, polling: 100 }
  );
  await page.evaluate(() => document.body.setAttribute("data-rotate", "false"));

  // lazy images
  await page.evaluate(async () => {
    const delay = (ms) => new Promise((r) => setTimeout(r, ms));
    const total = document.scrollingElement.scrollHeight;
    const step = Math.floor(window.innerHeight * 0.7);
    for (let y = 0; y <= total; y += step) { window.scrollTo(0, y); await delay(250); }
    window.scrollTo(0, 0);
    await delay(500);
  });
  try {
    await page.waitForFunction(() => Array.from(document.images).every((i) => i.complete), { timeout: 15000 });
  } catch { console.log("(some images never completed)"); }

  // full-page after shot (the artifact)
  await page.screenshot({ path: path.join(SHOTS, "desktop-1440-after.png"), fullPage: true });
  // viewport-only shot for the diff
  const afterTop = await page.screenshot({ encoding: "base64" });
  console.log("screenshots taken");

  // ---- DOM invariants: desktop computed layout for everything the JSX/CSS touched ----
  const inv = await page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const cs = (s) => { const el = q(s); return el ? getComputedStyle(el) : null; };
    const rect = (s) => { const el = q(s); if (!el) return null; const r = el.getBoundingClientRect(); return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) }; };
    // proj-note offset within its proj-body
    const note = q(".proj-note"); let noteOffset = null;
    if (note) {
      const body = note.closest(".proj-body").getBoundingClientRect();
      const n = note.getBoundingClientRect();
      noteOffset = { top: +(n.top - body.top).toFixed(1), right: +(body.right - n.right).toFixed(1) };
    }
    return {
      heroLinksDisplay: cs(".hero-links").display,
      heroLinkFlexDir: cs(".hero-link").flexDirection,
      heroLinkKeyDisplay: cs(".hero-link-key").display,
      heroLinkValExtDisplay: cs(".hero-link-val-ext").display,
      arcadeValText: q(".hero-link .hero-link-val")?.textContent.trim(),
      heroMetaItemFlexDir: cs(".hero-meta-item").flexDirection,
      heroMetaCols: cs(".hero-meta").gridTemplateColumns.split(" ").length,
      projNotePosition: cs(".proj-note").position,
      projNoteOffset: noteOffset,
      stickyTransform: cs(".sticky-note").transform,
      projMediaMinHeight: cs(".proj-media").minHeight,
      projNameSize: cs(".proj-name").fontSize,
      projBodyPadding: cs(".proj-body").padding,
      skillItemsFlexDir: cs(".skill-items").flexDirection,
      skillLiBorder: cs(".skill-items li").borderTopWidth,
      skillLiFont: cs(".skill-items li").fontFamily.slice(0, 24),
      skillsCols: cs(".skills-grid").gridTemplateColumns.split(" ").length,
      contactPortrait: rect(".contact-portrait"),
      contactCols: cs(".contact-main").gridTemplateColumns,
      contactEmailPadding: cs(".contact-email").padding,
      navStatusBrandDisplay: cs(".nav-brand .nav-status").display,
      navStatusMenuDisplay: cs(".nav-status--menu").display,
      navToggleDisplay: cs(".nav-toggle").display,
      navThemeRect: rect(".nav-theme"),
      navBrandRect: rect(".nav-brand"),
      showcaseTag: rect(".showcase-tag"),
      showcaseTagCs: { top: cs(".showcase-tag").top, right: cs(".showcase-tag").right, flexDir: cs(".showcase-tag").flexDirection, radius: cs(".showcase-tag").borderRadius },
      kickerDisplay: cs(".showcase-tag-kicker").display,
      sectionPadding: cs(".section").paddingTop,
      heroPaddingTop: cs(".hero").paddingTop,
      bItemSize: cs(".b-item").fontSize,
      expRoleSize: cs(".exp-role").fontSize,
      footerFont: cs(".footer-inner").fontSize,
      footerLinkPadding: cs(".footer-inner a").padding,
      creditColor: cs(".about-photo-credit").color,
      creditSize: cs(".about-photo-credit").fontSize,
      shaderMask: (cs(".hero-shader").webkitMaskImage || cs(".hero-shader").maskImage).slice(0, 40),
      projRowAriaLabel: q(".proj-row").getAttribute("aria-label"),
      fadeUpOpacity: cs(".fade-up").opacity,
    };
  });
  console.log("DOM invariants @1440:");
  console.log(JSON.stringify(inv, null, 2));

  // ---- pixel diff (in-browser canvas) ----
  const baselineB64 = fs.readFileSync(BASELINE).toString("base64");
  const diffPage = await browser.newPage();
  await diffPage.setViewport({ width: 100, height: 100 });
  await diffPage.goto("about:blank");
  const diff = await diffPage.evaluate(async (b64a, b64b, heroBottom) => {
    const load = (b64) => new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = "data:image/png;base64," + b64;
    });
    const [a, b] = await Promise.all([load(b64a), load(b64b)]);
    const w = Math.min(a.width, b.width), h = Math.min(a.height, b.height);
    const cv = (img) => {
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      return ctx.getImageData(0, 0, w, h).data;
    };
    const da = cv(a), db = cv(b);
    const T = 24; // per-channel tolerance
    let total = 0, below = 0;
    let bbox = null, bboxBelow = null;
    const grow = (bb, x, y) => bb ? { x0: Math.min(bb.x0, x), y0: Math.min(bb.y0, y), x1: Math.max(bb.x1, x), y1: Math.max(bb.y1, y) } : { x0: x, y0: y, x1: x, y1: y };
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (Math.abs(da[i] - db[i]) > T || Math.abs(da[i + 1] - db[i + 1]) > T || Math.abs(da[i + 2] - db[i + 2]) > T) {
          total++;
          bbox = grow(bbox, x, y);
          if (y > heroBottom) { below++; bboxBelow = grow(bboxBelow, x, y); }
        }
      }
    }
    return {
      w, h,
      sizes: { baseline: [a.width, a.height], after: [b.width, b.height] },
      totalDiffPx: total,
      totalDiffPct: +(100 * total / (w * h)).toFixed(3),
      belowHeroDiffPx: below,
      belowHeroDiffPct: +(100 * below / (w * (h - heroBottom))).toFixed(3),
      bbox, bboxBelow,
    };
  }, baselineB64, afterTop, HERO_BOTTOM);
  console.log("pixel diff vs baseline (top 900px):");
  console.log(JSON.stringify(diff, null, 2));

  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
