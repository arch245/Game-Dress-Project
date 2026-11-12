const path = require("path");
const { chromium } = require("playwright-core");
const OUT = path.join(__dirname, "out");
const url = "file://" + path.resolve(__dirname, "..", "dist", "index.html");
const tab = (page, label) => page.getByRole("tab", { name: new RegExp("^" + label + "( \\(กำลังใส่อยู่\\))?$") });
(async () => {
  const browser = await chromium.launch();
  let ctx = await browser.newContext({ viewport: { width: 1366, height: 1500 }, deviceScaleFactor: 1 });
  let page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.goto(url);
  await page.waitForTimeout(1200);
  const panel = page.locator('section[aria-label="ตู้เสื้อผ้า"]');
  for (const [t, f] of [["เดรส", "ui_t_dress.png"], ["เสื้อคลุม", "ui_t_outer.png"], ["รองเท้า", "ui_t_shoes.png"], ["ท่อนล่าง", "ui_t_bottom.png"]]) {
    await tab(page, t).click();
    await page.waitForTimeout(500);
    await panel.screenshot({ path: path.join(OUT, f) });
  }
  // random stress: every random look must render without errors
  for (let i = 0; i < 40; i++) await page.getByRole("button", { name: "สุ่มชุด" }).click();
  await page.waitForTimeout(600);
  const broken = await page.evaluate(() => [...document.images].filter((im) => im.complete && im.naturalWidth === 0).length);
  console.log("page errors", errs.length, errs.slice(0, 2), "broken images", broken);
  await ctx.close();
  // small phone
  ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  page = await ctx.newPage();
  await page.goto(url);
  await page.waitForTimeout(1000);
  await tab(page, "ชุดราตรี").click();
  await page.locator("#wardrobe-panel button", { hasText: "ราตรีหางปลาสีแดง" }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, "ui_small.png") });
  await browser.close();
})().catch((e) => { console.error("FAILED", e.message.split("\n").slice(0, 6).join("\n")); process.exit(1); });
