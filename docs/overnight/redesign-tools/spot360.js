// 360px hero + contact spot shots
const puppeteer = require("../audit-tools/node_modules/puppeteer-core");
const path = require("path");
const SHOTS = path.join(__dirname, "..", "redesign-shots");

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: "new",
    userDataDir: path.join(process.env.TEMP, "redesign-chrome-profile"),
    args: ["--remote-debugging-port=9555", "--hide-scrollbars"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 360, height: 800, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await page.goto("http://localhost:4300/", { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(SHOTS, "360-hero.png") });
  await page.evaluate(() => document.querySelector("#contact").scrollIntoView());
  await new Promise((r) => setTimeout(r, 700));
  await page.screenshot({ path: path.join(SHOTS, "360-contact.png") });
  const overflow = await page.evaluate(() => ({
    sw: document.scrollingElement.scrollWidth, iw: window.innerWidth,
    metaRows: Array.from(document.querySelectorAll(".hero-meta-item")).map((m) => Math.round(m.getBoundingClientRect().height)),
    emailW: document.querySelector(".contact-email").getBoundingClientRect().width,
  }));
  console.log(JSON.stringify(overflow));
  await browser.close();
})();
