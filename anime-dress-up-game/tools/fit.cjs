// Step 2: build doll overlays (head / neck / hand) and render "worn" previews for visual tuning.
// usage: node tools/fit.cjs [group ...]   groups: top bottom dress outer shoes head body combo
const fs = require("fs");
const path = require("path");
const L = require("./lib.cjs");

const ROOT = path.join(__dirname, "..");
const TMP = path.join(__dirname, "out");
const ASSETS = path.join(ROOT, "src", "assets");
const P = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "game", "placements.json"), "utf8"));

const OX = 110,
  OY = 100;
const CW = 527 + OX * 2,
  CH = 1494 + OY + 20;

const cache = {};
async function sprite(id, w, h) {
  const key = `${id}@${w}x${h}`;
  if (cache[key]) return cache[key];
  const { data, info } = await L.sharp(path.join(TMP, `${id}.png`))
    .resize(Math.round(w), Math.round(h), { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return (cache[key] = { d: data, w: info.width, h: info.height });
}

function blit(cv, img, left, top, clipBottom = 0, keep = null) {
  left = Math.round(left);
  top = Math.round(top);
  const maxY = Math.round(img.h * (1 - clipBottom));
  for (let y = 0; y < maxY; y++) {
    const cy = y + top;
    if (cy < 0 || cy >= cv.h) continue;
    for (let x = 0; x < img.w; x++) {
      const cx = x + left;
      if (cx < 0 || cx >= cv.w) continue;
      if (keep && !keep(cx - OX, cy - OY)) continue;
      const si = (y * img.w + x) * 4;
      const a = img.d[si + 3] / 255;
      if (a === 0) continue;
      const di = (cy * cv.w + cx) * 4;
      for (let c = 0; c < 3; c++) cv.d[di + c] = Math.round(img.d[si + c] * a + cv.d[di + c] * (1 - a));
      cv.d[di + 3] = 255;
    }
  }
}

function canvas(bg = [214, 222, 236]) {
  const d = Buffer.alloc(CW * CH * 4);
  for (let i = 0; i < CW * CH; i++) {
    d[i * 4] = bg[0];
    d[i * 4 + 1] = bg[1];
    d[i * 4 + 2] = bg[2];
    d[i * 4 + 3] = 255;
  }
  return { d, w: CW, h: CH };
}

async function buildParts(doll) {
  // head: everything above the chin line
  const HEAD_H = 244;
  const head = L.crop(doll, 0, 0, doll.w, HEAD_H);
  const hb = L.bbox(head);
  const headC = L.crop(head, hb.x0, hb.y0, hb.x1 - hb.x0 + 1, hb.y1 - hb.y0 + 1);
  // neck: a U-shaped column so the neck shows in front of back collars / hoods
  const NX0 = 216,
    NX1 = 310,
    NY0 = 236,
    NY1 = 294;
  const neck = L.crop(doll, NX0, NY0, NX1 - NX0, NY1 - NY0);
  for (let y = 0; y < neck.h; y++)
    for (let x = 0; x < neck.w; x++) {
      const dx = x + NX0 - 263,
        gy = y + NY0;
      const yb = 290 - 0.012 * dx * dx;
      const i = (y * neck.w + x) * 4 + 3;
      let k = Math.max(0, Math.min(1, (yb - gy) / 5));
      if (Math.abs(dx) > 44) k = 0;
      neck.d[i] = Math.round(neck.d[i] * k);
    }
  // left hand (viewer's left) – drawn over a held bag
  const HX0 = 0,
    HY0 = 716,
    HW = 76,
    HH = 140;
  const hand = L.crop(doll, HX0, HY0, HW, HH);
  for (let y = 0; y < 10; y++)
    for (let x = 0; x < hand.w; x++) {
      const i = (y * hand.w + x) * 4 + 3;
      hand.d[i] = Math.round((hand.d[i] * y) / 10);
    }
  await L.saveWebp(headC, path.join(ASSETS, "head.webp"), 88);
  await L.saveWebp(neck, path.join(ASSETS, "neck.webp"), 88);
  await L.saveWebp(hand, path.join(ASSETS, "hand.webp"), 88);
  const parts = {
    head: [hb.x0, hb.y0, headC.w, headC.h],
    neck: [NX0, NY0, neck.w, neck.h],
    hand: [HX0, HY0, HW, HH],
  };
  fs.writeFileSync(path.join(ROOT, "src", "game", "parts.json"), JSON.stringify(parts));
  return { head: { img: headC, x: hb.x0, y: hb.y0 }, neck: { img: neck, x: NX0, y: NY0 }, hand: { img: hand, x: HX0, y: HY0 } };
}

const Z = { shoes: 10, bottom: 20, top: 30, dress: 40, outer: 50, neck: 55, scarf: 58, bag: 60, hand: 61, hatBack: 65, head: 70, glasses: 80, hat: 90 };
const layerOf = (id) => {
  if (id.startsWith("acc")) {
    const n = +id.slice(3);
    if (n === 1) return "hatBack";
    if (n <= 5) return "hat";
    if (n <= 7) return "glasses";
    if (n === 8) return "scarf";
    return "bag";
  }
  return id.replace(/\d+$/, "");
};

async function render(doll, parts, ids) {
  const cv = canvas();
  const layers = [{ z: 0, draw: () => blit(cv, doll, OX, OY) }];
  const WAIST = { bottom1: 175, bottom2: 199, bottom3: 212, bottom4: 209, bottom5: 175, bottom6: 209, bottom7: 210, bottom8: 200 };
  const hasOuter = ids.some((i) => i.startsWith("outer"));
  const bottomId = ids.find((i) => i.startsWith("bottom"));
  const tuck = ids.includes("tuck") && bottomId;
  for (const id of ids) {
    if (id === "tuck") continue;
    const [cx, top, w, h, clip = 0] = P.items[id];
    const img = await sprite(id, w, h);
    const lay = layerOf(id);
    const preds = [];
    if (hasOuter && (lay === "top" || lay === "dress")) {
      const yCut = lay === "top" ? 720 : 600;
      preds.push((dx, dy) => !(dy < yCut && (dx < 130 || dx > 396)));
    }
    if (tuck && lay === "top") {
      const bt = P.items[bottomId][1];
      const half = WAIST[bottomId] / 2 - 3;
      const yA = bt - 26, yB = bt + 12;
      preds.push((dx, dy) => {
        if (dy <= yA) return true;
        if (dy > yB) return false;
        const t = (dy - yA) / (yB - yA);
        const lim = 400 + (half - 400) * t;
        return Math.abs(dx - 263) <= lim;
      });
    }
    const keep = preds.length ? (dx, dy) => preds.every((p) => p(dx, dy)) : null;
    layers.push({ z: Z[lay], draw: () => blit(cv, img, OX + cx - w / 2, OY + top, clip, keep) });
    if (id === "acc10") layers.push({ z: Z.hand, draw: () => blit(cv, parts.hand.img, OX + parts.hand.x, OY + parts.hand.y) });
  }
  layers.push({ z: Z.neck, draw: () => blit(cv, parts.neck.img, OX + parts.neck.x, OY + parts.neck.y) });
  layers.push({ z: Z.head, draw: () => blit(cv, parts.head.img, OX + parts.head.x, OY + parts.head.y) });
  layers.sort((a, b) => a.z - b.z);
  for (const l of layers) l.draw();
  return cv;
}

async function sheet(name, doll, parts, outfits, roi, scale, cols) {
  const cells = [];
  for (const ids of outfits) {
    const cv = await render(doll, parts, ids);
    const [x0, y0, x1, y1] = roi;
    const c = L.crop(cv, x0, y0, x1 - x0, y1 - y0);
    const { data, info } = await L.raw(c)
      .resize(Math.round(c.w * scale))
      .raw()
      .toBuffer({ resolveWithObject: true });
    cells.push({ d: data, w: info.width, h: info.height });
  }
  await L.contact(cells, path.join(TMP, `fit_${name}.jpg`), { cols, cw: cells[0].w + 8, ch: cells[0].h + 8, bg: "#ffffff" });
  console.log("wrote", `fit_${name}.jpg`, cols * (cells[0].w + 8), "x", Math.ceil(cells.length / cols) * (cells[0].h + 8));
}

const range = (k, n) => Array.from({ length: n }, (_, i) => [`${k}${i + 1}`]);

(async () => {
  const doll = await L.load(path.join(TMP, "doll.png"));
  const parts = await buildParts(doll);
  const want = process.argv.slice(2);
  const on = (g) => want.length === 0 || want.includes(g);

  if (on("top")) await sheet("top", doll, parts, range("top", 8), [0, 170, CW, 900], 0.52, 4);
  if (on("bottom")) await sheet("bottom", doll, parts, range("bottom", 8), [0, 560, CW, CH], 0.5, 4);
  if (on("dress")) await sheet("dress", doll, parts, range("dress", 8), [0, 170, CW, CH], 0.5, 4);
  if (on("outer")) await sheet("outer", doll, parts, range("outer", 6), [0, 170, CW, 1150], 0.66, 3);
  if (on("shoes")) await sheet("shoes", doll, parts, range("shoes", 8), [OX, 1080, OX + 527, CH], 0.7, 4);
  if (on("head")) await sheet("head", doll, parts, range("acc", 7), [70, 0, CW - 70, 430], 0.62, 4);
  if (on("body")) await sheet("body", doll, parts, [["acc8"], ["acc9"], ["acc10"]], [0, 170, CW, 1250], 0.55, 3);
  if (on("combo")) {
    const combos = JSON.parse(fs.readFileSync(path.join(__dirname, "combos.json"), "utf8"));
    await sheet("combo", doll, parts, combos, [0, 0, CW, CH], 0.5, 4);
  }
})();
