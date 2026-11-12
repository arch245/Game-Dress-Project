// Headless smoke test + screenshots (needs playwright-core and a chromium headless shell)
const path = require("path");
const { chromium } = require("playwright-core");
const OUT = path.join(__dirname, "out");
const url = "file://" + path.resolve(__dirname, "..", "dist", "index.html");
const item = (page, name) => page.locator("#wardrobe-panel button", { hasText: name }).first();
const tab = (page, label) => page.getByRole("tab", { name: new RegExp("^" + label + "( \\(กำลังใส่อยู่\\))?$") });
const wear = async (page, t, names) => { await tab(page, t).click(); for (const n of names) await item(page, n).click(); };
const dest = (page, name) => page.getByRole("radio", { name: new RegExp(name) }).click();
const go = async (page, file) => { await page.getByRole("button", { name: /กันเลย$/ }).click(); await page.waitForTimeout(1500); await page.screenshot({ path: path.join(OUT, file) }); };
const close = (page) => page.getByRole("button", { name: "แต่งตัวต่อ" }).click();
(async () => {
  const browser = await chromium.launch();
  let ctx = await browser.newContext({ viewport: { width: 1366, height: 800 }, deviceScaleFactor: 1 });
  let page = await ctx.newPage();
  page.on("console", (m) => m.type() === "error" && console.log("console.error:", m.text()));
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  await page.goto(url);
  await page.waitForTimeout(1500);
  console.log("tabs", await page.getByRole("tab").count(), "places", await page.locator('[aria-label="เลือกสถานที่ที่จะไป"] [role=radio]').count());
  // --- gala
  await wear(page, "ชุดราตรี", ["ราตรีเจ้าหญิงสีชมพู"]);
  await wear(page, "รองเท้า", ["ส้นสูงสีทองรัดข้อ"]);
  await wear(page, "เครื่องประดับ", ["มงกุฎเทียร่า", "สร้อยคอมุก", "กระเป๋าคลัตช์สายโซ่"]);
  await dest(page, "งานเลี้ยงกาล่า");
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, "ui_gala1.png") });
  await go(page, "ui_gala2.png");
  const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 20000 }), page.getByRole("button", { name: /บันทึกรูป/ }).click()]);
  await dl.saveAs(path.join(OUT, "photo_gala.png"));
  await close(page);
  // --- pool
  await wear(page, "ชุดว่ายน้ำ", ["ทูพีซระบายสีชมพู"]);
  await wear(page, "รองเท้า", ["รองเท้าแตะหูหนีบ"]);
  await wear(page, "เครื่องประดับ", ["แว่นว่ายน้ำคาดหัว", "พวงมาลัยดอกไม้ฮาวาย", "กระเป๋าสานไปทะเล"]);
  await dest(page, "สระว่ายน้ำรีสอร์ต");
  await go(page, "ui_pool2.png");
  await close(page);
  // --- separates + vest + tuck, wrong place on purpose (snow)
  await page.getByRole("button", { name: "ถอดทั้งหมด" }).click();
  await wear(page, "เสื้อ", ["เสื้อยืดลายทาง"]);
  await wear(page, "ท่อนล่าง", ["กระโปรงยีนส์ทรงเอ"]);
  await page.getByRole("switch").click();
  await wear(page, "เสื้อคลุม", ["เสื้อกั๊กยีนส์"]);
  await wear(page, "รองเท้า", ["ผ้าใบกับถุงเท้ายาวลายทาง"]);
  await wear(page, "เครื่องประดับ", ["ที่คาดผมหูแมว", "แว่นกรอบดำ"]);
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, "ui_mix.png") });
  // --- snow
  await wear(page, "เดรส", ["เดรสไหมพรมถัก"]);
  await wear(page, "เสื้อคลุม", ["โค้ตลายสก็อต"]);
  await wear(page, "รองเท้า", ["บูตยาวเหนือเข่า"]);
  await wear(page, "เครื่องประดับ", ["หมวกไหมพรมปอมปอม", "ผ้าพันคอลายสก็อต"]);
  await dest(page, "เมืองหิมะยามค่ำ");
  await go(page, "ui_snow2.png");
  const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, sh: document.documentElement.scrollHeight, ch: document.documentElement.clientHeight }));
  console.log("desktop metrics", JSON.stringify(m));
  await ctx.close();
  // ---------- mobile
  ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  await page.goto(url);
  await page.waitForTimeout(1200);
  await wear(page, "ชุดราตรี", ["ราตรีทูลล์ประกายดาว"]);
  await wear(page, "ชุดว่ายน้ำ", ["แทงกินีลายฮาวาย"]);
  await dest(page, "ชายหาดหน้าร้อน");
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, "ui_m1.png") });
  await go(page, "ui_m2.png");
  const m2 = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  console.log("mobile metrics", JSON.stringify(m2));
  await browser.close();
})().catch((e) => { console.error("FAILED", e.message.split("\n").slice(0, 8).join("\n")); process.exit(1); });
