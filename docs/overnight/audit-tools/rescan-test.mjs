// Pairing-reliability regression: a guest that bounces mid-handshake must not
// poison the host's room. Pre-2026-08-14 the host's spent single-shot
// transport swallowed the next guest's "ready" (begun flag), so pairing only
// worked on the second scan — and only via the slow relay fallback.
// Flow: host up → guest 1 joins and dies mid-connecting → host must rebuild
// and show the QR again → guest 2 joins BY TYPED CODE (covers the numeric
// fallback) → both reach a round on a fresh p2p transport.
// Usage: bun rescan-test.mjs [baseUrl]
import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.argv[2] || "http://localhost:5173";

let failures = 0;
function check(name, ok, extra = "") {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${extra ? " — " + extra : ""}`);
  if (!ok) failures++;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const iphone = {
  viewport: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
};

async function launch(tag) {
  return puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: [
      "--no-first-run",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
      "--mute-audio",
      `--user-data-dir=${process.env.TEMP}\\seam-rescan-${tag}`,
    ],
  });
}

async function mobilePage(browser, label) {
  const page = await browser.newPage();
  await page.emulate(iphone);
  page.on("pageerror", (e) => console.log(`[${label} pageerror]`, e.message));
  return page;
}

const dbg = (page) => page.evaluate(() => ({ ...(window.__seamDebug || {}) }));
const phaseIs = (page, phases, timeout) =>
  page
    .waitForFunction(
      (ps) => window.__seamDebug && ps.includes(window.__seamDebug.phase),
      { timeout, polling: 120 },
      phases
    )
    .then(() => true)
    .catch(() => false);

const browserH = await launch("host");
const browserG = await launch("guest");
const host = await mobilePage(browserH, "H");

try {
  // --- host a room ---
  await host.goto(`${BASE}/seam`, { waitUntil: "networkidle2" });
  await host.waitForSelector(".seam-btn--primary", { timeout: 15000 });
  await host.tap(".seam-btn--primary");
  await host.waitForSelector("[data-room-url]", { timeout: 15000 });
  const roomUrl = await host.$eval("[data-room-url]", (el) => el.getAttribute("data-room-url"));
  const roomCode = await host.$eval("[data-room-url]", (el) => el.getAttribute("data-room-code"));
  check("host shows a 4-digit room code", /^\d{4}$/.test(roomCode || ""), String(roomCode));
  check("QR url carries the same code", roomUrl.endsWith(`#r=${roomCode}`), roomUrl);
  const codeShown = await host.$eval(".seam-code", (el) => el.textContent.trim());
  check("code is displayed beside the QR", codeShown === roomCode, codeShown);

  // --- guest 1: joins, then dies mid-handshake ---
  // localhost ICE completes in ~300ms, too fast to catch mid-handshake; the
  // dev forcerelay flag gives guest 1 unreachable ICE so negotiation hangs
  // in "connecting" for seconds — then we kill it there, with the host's
  // transport already begun (the exact spent-transport scenario).
  const g1 = await mobilePage(browserG, "G1");
  await g1.goto(roomUrl.replace("/seam#", "/seam?forcerelay=1#"), { waitUntil: "domcontentloaded" });
  const hostSawG1 = await phaseIs(host, ["connecting"], 15000);
  check("host sees guest 1 arrive (connecting)", hostSawG1);
  await sleep(700); // guest's "ready" landed; host's transport has begun
  const midPhase = (await dbg(host)).phase;
  check("host still mid-handshake when guest 1 dies", midPhase === "connecting", midPhase);
  await g1.close(); // scanner bails mid-handshake

  // --- host must recover to the QR screen with a FRESH transport ---
  const backToHost = await phaseIs(host, ["host"], 15000);
  check("host returns to the QR screen after the bounce", backToHost);
  const rebuilt = await host.evaluate(() =>
    (window.__seamLog || []).some((l) => l.tag === "host:transport-rebuilt")
  );
  check("host rebuilt its transport (the second-scan fix)", rebuilt);

  // --- guest 2: joins by TYPED CODE (the numeric fallback path) ---
  const g2 = await mobilePage(browserG, "G2");
  await g2.goto(`${BASE}/seam`, { waitUntil: "networkidle2" });
  await g2.waitForSelector(".seam-btn", { timeout: 15000 });
  await g2.evaluate(() => {
    [...document.querySelectorAll(".seam-btn")].find((b) => b.textContent.includes("code")).click();
  });
  await g2.waitForSelector(".seam-codeinput", { timeout: 5000 });
  await g2.type(".seam-codeinput", roomCode);
  await g2.evaluate(() => {
    [...document.querySelectorAll(".seam-joinrow button")].at(-1).click();
  });

  // --- both reach select, lock in, and get to a round ---
  async function pickAndLock(page, fighter, label) {
    await page.waitForSelector(`.seam-card[data-fighter="${fighter}"]`, { timeout: 20000 });
    await page.tap(`.seam-card[data-fighter="${fighter}"]`);
    await page.waitForSelector(".seam-lock:not([disabled])", { timeout: 5000 });
    await page.tap(".seam-lock");
    console.log(`  ${label} locked ${fighter}`);
  }
  await pickAndLock(host, "dart", "H");
  await pickAndLock(g2, "orb", "G2");

  const hRound = await phaseIs(host, ["countdown", "round"], 30000);
  const gRound = await phaseIs(g2, ["countdown", "round"], 30000);
  check("both reach the fight after code-join", hRound && gRound);

  const [dh, dg] = await Promise.all([dbg(host), dbg(g2)]);
  check("fresh transport connected p2p (not limping on relay)",
    dh.kind === "p2p" && dg.kind === "p2p", `H=${dh.kind} G2=${dg.kind}`);
} finally {
  await browserH.close().catch(() => {});
  await browserG.close().catch(() => {});
}

console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
