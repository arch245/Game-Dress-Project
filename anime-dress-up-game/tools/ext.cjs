// Expansion pack. Everything is produced in doll space (see ds.cjs):
//  - swim1-7 / gown1-7 : cut from the generated sheet raw/swimgown1.png and fitted to the doll
//  - the other 60 pieces: derived from already generated art (split, cut, warp, re-print) or drawn as SVG
// usage: node tools/ext.cjs [preview groups: swim gown top bottom dress outer shoes acc]
const fs = require("fs");
const path = require("path");
const L = require("./lib.cjs");
const D = require("./ds.cjs");
const { I, X0, X1, Y0, Y1 } = D;

const ROOT = path.join(__dirname, "..");
const RAW = path.join(ROOT, "raw");
const TMP = path.join(__dirname, "out");
const ITEMS = path.join(ROOT, "src", "assets", "items");
const PFILE = path.join(ROOT, "src", "game", "placements.json");
const P = JSON.parse(fs.readFileSync(PFILE, "utf8"));
const ovFile = path.join(__dirname, "overrides.json");
const OV = fs.existsSync(ovFile) ? JSON.parse(fs.readFileSync(ovFile, "utf8")) : {};
const want = process.argv.slice(2);
const OL = "#5a3b33";

// ---------------------------------------------------------------- sheet splitting
function seam(img, xa, xb, ya, yb) {
  const { d, w } = img;
  const W = xb - xa + 1,
    H = yb - ya;
  const cost = new Float32Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const gx = x + xa,
        gy = y + ya;
      const i = (gy * w + gx) * 4;
      let c = 0;
      if (d[i + 3] >= 40) {
        const l = (gy * w + Math.max(0, gx - 2)) * 4,
          r = (gy * w + Math.min(w - 1, gx + 2)) * 4;
        let g = 255;
        if (d[l + 3] >= 40 && d[r + 3] >= 40) g = Math.abs(d[l] - d[r]) + Math.abs(d[l + 1] - d[r + 1]) + Math.abs(d[l + 2] - d[r + 2]);
        c = 1 - Math.min(1, g / 160) * 0.85;
      }
      cost[y * W + x] = c + 0.0004 * Math.abs(x - W / 2);
    }
  const acc = new Float32Array(W * H);
  const from = new Int8Array(W * H);
  for (let x = 0; x < W; x++) acc[x] = cost[x];
  for (let y = 1; y < H; y++)
    for (let x = 0; x < W; x++) {
      let b = acc[(y - 1) * W + x],
        f = 0;
      if (x > 0 && acc[(y - 1) * W + x - 1] < b) {
        b = acc[(y - 1) * W + x - 1];
        f = -1;
      }
      if (x < W - 1 && acc[(y - 1) * W + x + 1] < b) {
        b = acc[(y - 1) * W + x + 1];
        f = 1;
      }
      acc[y * W + x] = b + cost[y * W + x];
      from[y * W + x] = f;
    }
  let bx = 0;
  for (let x = 1; x < W; x++) if (acc[(H - 1) * W + x] < acc[(H - 1) * W + bx]) bx = x;
  const total = acc[(H - 1) * W + bx];
  const out = new Int32Array(H);
  for (let y = H - 1; y >= 0; y--) {
    out[y] = bx + xa;
    bx += from[y * W + bx];
  }
  out.cost = total;
  return out;
}

const cdist = (r, g, b, c) => {
  const s1 = r + g + b + 1,
    s2 = c[0] + c[1] + c[2] + 1;
  const ch = Math.hypot(r / s1 - c[0] / s2, g / s1 - c[1] / s2, b / s1 - c[2] / s2) * 380;
  const lu = (0.299 * (r - c[0]) + 0.587 * (g - c[1]) + 0.114 * (b - c[2])) * 0.6;
  return Math.hypot(ch, lu);
};
function domRaw(img, xa, xb, ya, yb) {
  const bins = new Map();
  for (let y = ya; y < yb; y++)
    for (let x = xa; x < xb; x++) {
      const i = (y * img.w + x) * 4;
      if (img.d[i + 3] < 220) continue;
      const k = ((img.d[i] >> 4) << 8) | ((img.d[i + 1] >> 4) << 4) | (img.d[i + 2] >> 4);
      let e = bins.get(k);
      if (!e) bins.set(k, (e = [0, 0, 0, 0]));
      e[0]++;
      e[1] += img.d[i];
      e[2] += img.d[i + 1];
      e[3] += img.d[i + 2];
    }
  let best = null;
  for (const e of bins.values()) if (!best || e[0] > best[0]) best = e;
  return best ? [best[1] / best[0], best[2] / best[0], best[3] / best[0]] : [128, 128, 128];
}
/** seam that keeps left-coloured pixels on the left and right-coloured pixels on the right */
function seamColor(img, xa, xb, ya, yb, CL, CR) {
  const { d, w } = img;
  const W = xb - xa + 1,
    H = yb - ya;
  const cost = new Float32Array(W * H);
  const isL = new Uint8Array(W),
    isR = new Uint8Array(W),
    op = new Uint8Array(W);
  for (let y = 0; y < H; y++) {
    let totalL = 0;
    for (let x = 0; x < W; x++) {
      const i = ((y + ya) * w + x + xa) * 4;
      isL[x] = isR[x] = op[x] = 0;
      if (d[i + 3] < 40) continue;
      op[x] = 1;
      const dl = cdist(d[i], d[i + 1], d[i + 2], CL),
        dr = cdist(d[i], d[i + 1], d[i + 2], CR);
      if (dl < dr * 0.75) {
        isL[x] = 1;
        totalL++;
      } else if (dr < dl * 0.75) isR[x] = 1;
    }
    let rLeft = 0,
      lRight = totalL;
    for (let x = 0; x < W; x++) {
      cost[y * W + x] = rLeft + lRight + (op[x] ? 0.05 : 0) + 0.0004 * Math.abs(x - W / 2);
      rLeft += isR[x];
      lRight -= isL[x];
    }
  }
  const acc = new Float32Array(W * H);
  const from = new Int8Array(W * H);
  for (let x = 0; x < W; x++) acc[x] = cost[x];
  for (let y = 1; y < H; y++)
    for (let x = 0; x < W; x++) {
      let b = Infinity,
        f = 0;
      for (let q = -2; q <= 2; q++) {
        const xx = x + q;
        if (xx < 0 || xx >= W) continue;
        const v = acc[(y - 1) * W + xx] + Math.abs(q) * 0.001;
        if (v < b) {
          b = v;
          f = q;
        }
      }
      acc[y * W + x] = b + cost[y * W + x];
      from[y * W + x] = f;
    }
  let bx = 0;
  for (let x = 1; x < W; x++) if (acc[(H - 1) * W + x] < acc[(H - 1) * W + bx]) bx = x;
  const out = new Int32Array(H);
  out.cost = acc[(H - 1) * W + bx];
  for (let y = H - 1; y >= 0; y--) {
    out[y] = bx + xa;
    bx += from[y * W + bx];
  }
  return out;
}

function dropSpecks(cv, frac = 0.03) {
  const { label, comps } = L.components({ d: cv.d, w: D.CW, h: D.CH }, 1);
  const maxA = Math.max(...comps.map((c) => c.area));
  const drop = new Set(comps.filter((c) => c.area < maxA * frac).map((c) => c.id));
  for (let i = 0; i < D.CW * D.CH; i++) if (drop.has(label[i])) cv.d[i * 4 + 3] = 0;
  return cv;
}

function extractCell(img, ya, yb, seams, c, cols) {
  const { d, w } = img;
  const inCell = (x, y) => (c === 0 || x >= seams[c - 1][y - ya]) && (c === cols - 1 || x < seams[c][y - ya]);
  let x0 = w,
    y0 = yb,
    x1 = -1,
    y1 = -1;
  for (let y = ya; y < yb; y++)
    for (let x = 0; x < w; x++)
      if (d[(y * w + x) * 4 + 3] > 24 && inCell(x, y)) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  const cw = x1 - x0 + 1,
    ch = y1 - y0 + 1;
  const o = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++)
    for (let x = 0; x < cw; x++) {
      const gx = x + x0,
        gy = y + y0;
      if (!inCell(gx, gy)) continue;
      d.copy(o, (y * cw + x) * 4, (gy * w + gx) * 4, (gy * w + gx) * 4 + 4);
    }
  const out = { d: o, w: cw, h: ch };
  const { label, comps } = L.components(out, 1);
  const maxA = Math.max(...comps.map((k) => k.area));
  const drop = new Set(comps.filter((k) => k.area < Math.max(90, maxA * 0.03)).map((k) => k.id));
  for (let i = 0; i < cw * ch; i++) if (drop.has(label[i])) o[i * 4 + 3] = 0;
  const bb = L.bbox(out);
  return L.crop(out, bb.x0, bb.y0, bb.x1 - bb.x0 + 1, bb.y1 - bb.y0 + 1);
}

function splitRows(img) {
  const cnt = new Int32Array(img.h);
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) if (img.d[(y * img.w + x) * 4 + 3] > 40) cnt[y]++;
  let best = null,
    s = -1;
  for (let y = Math.round(img.h * 0.15); y < img.h * 0.85; y++) {
    if (cnt[y] === 0) {
      if (s < 0) s = y;
    } else if (s >= 0) {
      if (!best || y - s > best[1] - best[0]) best = [s, y];
      s = -1;
    }
  }
  if (!best) {
    // pieces overlap vertically: separate them by connected component instead
    const { label, comps } = L.components(img, 1);
    const big = comps.slice().sort((p, q) => q.area - p.area);
    if (big.length < 2 || big[1].area < big[0].area * 0.15) return null;
    const mid = (big[0].cy + big[1].cy) / 2;
    const topIds = new Set(comps.filter((c) => c.cy < mid).map((c) => c.id));
    const pick = (isTop) => {
      const o = { d: Buffer.from(img.d), w: img.w, h: img.h };
      for (let i = 0; i < img.w * img.h; i++) if (label[i] && topIds.has(label[i]) !== isTop) o.d[i * 4 + 3] = 0;
      const b = L.bbox(o);
      return L.crop(o, b.x0, b.y0, b.x1 - b.x0 + 1, b.y1 - b.y0 + 1);
    };
    return [pick(true), pick(false)];
  }
  const part = (y0, y1) => {
    const c = L.crop(img, 0, y0, img.w, y1 - y0);
    const b = L.bbox(c);
    return L.crop(c, b.x0, b.y0, b.x1 - b.x0 + 1, b.y1 - b.y0 + 1);
  };
  return [part(0, best[0]), part(best[1], img.h)];
}

// measurements on a raw sprite
const R = {
  runs: (img, y) => L.runs(img, Math.max(0, Math.min(img.h - 1, Math.round(y)))),
  span(img, f0, f1, pick) {
    let m = null;
    for (let y = Math.round(f0 * img.h); y <= f1 * img.h && y < img.h; y++) {
      const rs = R.runs(img, y);
      if (!rs.length) continue;
      const a = rs[0][0],
        b = rs[rs.length - 1][1];
      const w = b - a + 1;
      if (!m || (pick === "min" ? w < m.w : w > m.w)) m = { w, c: (a + b) / 2, y };
    }
    return m;
  },
};

async function fit(img, f) {
  let s,
    c = img.w / 2;
  if (f.waist) {
    const m = R.span(img, f.r0 ?? 0.15, f.r1 ?? 0.6, "min");
    s = f.waist / m.w;
    c = m.c;
  } else if (f.hip) {
    const m = R.span(img, f.r0 ?? 0.5, f.r1 ?? 0.95, "max");
    s = f.hip / m.w;
    c = m.c;
  } else if (f.w) s = f.w / img.w;
  else s = f.s ?? 1;
  const sx = s * (f.kx ?? 1);
  let sy = s * (f.ky ?? 1);
  const top = f.top ?? Math.round(f.cy - (img.h * sy) / 2);
  if (f.bottom) sy = (f.bottom - top) / img.h;
  return D.place(img, [263 - (c - img.w / 2) * sx + (f.dx ?? 0), top, img.w * sx, img.h * sy]);
}

// ---------------------------------------------------------------- doll helpers
let DOLL, HEAD, NECK, BASE_T, BASE_B;
const isBaseGray = (r, g, b) => Math.abs(r - g) < 16 && Math.abs(g - b) < 18 && r > 105 && r < 232;
const bodySpan = (y) => {
  if (y < 440) return [163, 362];
  const rs = D.runs(DOLL, y).filter((r) => r[1] > 170 && r[0] < 356);
  return rs.length ? [rs[0][0], rs[rs.length - 1][1]] : null;
};

/** per-row horizontal scaling so a garment hugs ("fit") or at least covers ("cover") the body */
function conform(cv, y0, y1, ease, mode = "fit") {
  const n = Y1 - Y0;
  const k = new Float32Array(n).fill(1);
  for (let y = y0; y <= y1; y++) {
    const g = D.span(cv, y),
      b = bodySpan(y);
    if (!g || !b) continue;
    let v = (b[1] - b[0] + 1 + ease * 2) / (g[1] - g[0] + 1);
    if (mode === "cover") v = Math.max(1, v);
    k[y - Y0] = D.clamp(v, 0.72, 1.6);
  }
  const B = 36;
  for (let j = 1; j <= B; j++) {
    if (y0 - j >= Y0) k[y0 - j - Y0] = 1 + (k[y0 - Y0] - 1) * (1 - j / B);
    if (y1 + j < Y1) k[y1 + j - Y0] = 1 + (k[y1 - Y0] - 1) * (1 - j / B);
  }
  const sm = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0,
      c = 0;
    for (let j = -9; j <= 9; j++) {
      const q = i + j;
      if (q < 0 || q >= n) continue;
      s += k[q];
      c++;
    }
    sm[i] = Math.abs(s / c - 1) < 0.004 ? 1 : s / c;
  }
  return D.scaleRows(cv, (y) => sm[y - Y0]);
}

function grayPart(xa, xb, ya, yb) {
  const o = D.blank();
  for (let y = ya; y < yb; y++)
    for (let x = xa; x < xb; x++) {
      const i = I(x, y);
      if (DOLL.d[i + 3] > 200 && isBaseGray(DOLL.d[i], DOLL.d[i + 1], DOLL.d[i + 2])) DOLL.d.copy(o.d, i, i, i + 4);
    }
  return o;
}

/** paint the doll's grey base layer in the garment's colour underneath it, so no grey ever peeks out */
function underlay(cv, mode) {
  const out = D.blank();
  for (const [key, part, ya, yb] of [
    ["t", BASE_T, 356, 492],
    ["b", BASE_B, 600, 764],
  ]) {
    if (!mode.includes(key)) continue;
    const col = D.dominant(cv, ya, yb);
    if (!col) continue;
    for (let y = ya; y < yb; y++)
      for (let x = X0; x < X1; x++) {
        const i = I(x, y);
        if (!part.d[i + 3]) continue;
        const sh = Math.min(1.08, D.lum(part.d[i], part.d[i + 1], part.d[i + 2]) / 206);
        out.d[i] = D.clamp(Math.round(col[0] * sh), 0, 255);
        out.d[i + 1] = D.clamp(Math.round(col[1] * sh), 0, 255);
        out.d[i + 2] = D.clamp(Math.round(col[2] * sh), 0, 255);
        out.d[i + 3] = 255;
      }
  }
  return D.over(out, cv);
}

const waistRow = (cv, a = 460, b = 600) => {
  let m = null;
  for (let y = a; y <= b; y++) {
    const r = D.span(cv, y);
    if (!r) continue;
    const w = r[1] - r[0];
    if (!m || w < m.w) m = { y, w };
  }
  return m;
};
const firstRow = (cv, a, b, test, frac) => {
  for (let y = a; y <= b; y++) {
    let n = 0,
      m = 0;
    for (let x = X0; x < X1; x++) {
      const i = I(x, y);
      if (cv.d[i + 3] < 200) continue;
      m++;
      if (test(cv.d[i], cv.d[i + 1], cv.d[i + 2])) n++;
    }
    if (m > 20 && n / m >= frac) return y;
  }
  return b;
};
const stepRow = (cv, a, b) => {
  let best = a,
    bd = -1;
  for (let y = a; y <= b; y++) {
    const r1 = D.central(cv, y - 5),
      r2 = D.central(cv, y + 5);
    if (!r1 || !r2) continue;
    const dlt = r2[1] - r2[0] - (r1[1] - r1[0]);
    if (dlt > bd) {
      bd = dlt;
      best = y;
    }
  }
  return best;
};

/** find where A-pose sleeves separate from the body */
function sleeveInfo(cv) {
  const b = D.bbox(cv);
  const gapL = new Map(),
    gapR = new Map();
  for (let y = b.y0; y <= b.y1; y++) {
    const rs = D.runs(cv, y, 2);
    const n = rs.length;
    if (n < 2) continue;
    if (rs[0][1] < 263 - 55 && rs[1][0] - rs[0][1] < 46) gapL.set(y, (rs[0][1] + rs[1][0]) / 2);
    if (rs[n - 1][0] > 263 + 55 && rs[n - 1][0] - rs[n - 2][1] < 46) gapR.set(y, (rs[n - 2][1] + rs[n - 1][0]) / 2);
  }
  const mk = (gap, sign) => {
    const ys = [...gap.keys()].sort((p, q) => p - q);
    let best = [],
      cur = [];
    for (const y of ys) {
      if (cur.length && y - cur[cur.length - 1] > 5) {
        if (cur.length > best.length) best = cur;
        cur = [];
      }
      cur.push(y);
    }
    if (cur.length > best.length) best = cur;
    if (best.length < 8) return null;
    const ya = best[0],
      xa = gap.get(ya);
    let sy = 0,
      sx = 0,
      syy = 0,
      sxy = 0;
    for (const y of best) {
      const x = gap.get(y);
      sy += y;
      sx += x;
      syy += y * y;
      sxy += x * y;
    }
    const nn = best.length;
    const bb = (nn * sxy - sx * sy) / (nn * syy - sy * sy || 1);
    const aa = (sx - bb * sy) / nn;
    const top = b.y0 + 16;
    const inStreak = new Set(best);
    return {
      ya,
      xa,
      at: (y) => (y < ya ? xa - sign * 14 * Math.pow(D.clamp((ya - y) / Math.max(1, ya - top), 0, 1), 1.4) : inStreak.has(y) ? gap.get(y) : aa + bb * y),
    };
  };
  const Lf = mk(gapL, 1),
    Rf = mk(gapR, -1);
  return { L: Lf, R: Rf, isSleeve: (x, y) => !!((Lf && x < Lf.at(y)) || (Rf && x > Rf.at(y))) };
}

// ---------------------------------------------------------------- previews
const Z = { shoes: 10, bottom: 20, top: 30, dress: 40, swim: 40, gown: 40, outer: 50, neck: 58, bag: 60, eyes: 80, hat: 90 };
function compose(layers) {
  const out = D.clone(DOLL);
  const all = [...layers, { cv: NECK, z: 55 }, { cv: HEAD, z: 70 }].sort((p, q) => p.z - q.z);
  for (const l of all) D.over(out, l.cv);
  return out;
}
async function sheet(name, entries, roi, scale, cols) {
  const cells = [];
  for (const layers of entries) {
    const cv = compose(layers);
    const [x0, y0, x1, y1] = roi;
    const w = x1 - x0,
      h = y1 - y0;
    const c = L.crop(cv, x0 + D.PX, y0 + D.PT, w, h);
    for (let i = 0; i < c.d.length; i += 4) {
      const a = c.d[i + 3] / 255;
      c.d[i] = Math.round(c.d[i] * a + 206 * (1 - a));
      c.d[i + 1] = Math.round(c.d[i + 1] * a + 216 * (1 - a));
      c.d[i + 2] = Math.round(c.d[i + 2] * a + 232 * (1 - a));
      c.d[i + 3] = 255;
    }
    const { data, info } = await L.raw(c).resize(Math.round(w * scale)).raw().toBuffer({ resolveWithObject: true });
    cells.push({ d: data, w: info.width, h: info.height });
  }
  await L.contact(cells, path.join(TMP, `x_${name}.jpg`), { cols, cw: cells[0].w + 6, ch: cells[0].h + 6, bg: "#ffffff" });
  console.log("preview", `x_${name}.jpg`);
}

// ---------------------------------------------------------------- svg bits
const flower = (x, y, r, col, cen = "#ffd24d") => {
  let s = "";
  for (let k = 0; k < 5; k++) {
    const a = ((k * 72 - 90) * Math.PI) / 180;
    s += `<circle cx="${(x + Math.cos(a) * r * 0.6).toFixed(1)}" cy="${(y + Math.sin(a) * r * 0.6).toFixed(1)}" r="${(r * 0.5).toFixed(1)}" fill="${col}" stroke="${OL}" stroke-width="1.8"/>`;
  }
  return s + `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r * 0.36).toFixed(1)}" fill="${cen}" stroke="${OL}" stroke-width="1.5"/>`;
};
const bow = (x, y, s, col) =>
  `<g stroke="${OL}" stroke-width="${Math.max(1.6, s * 0.13).toFixed(1)}" stroke-linejoin="round" fill="${col}">` +
  `<path d="M${x - s * 0.3} ${y + s * 0.4} L${x - s * 1.25} ${y + s * 2.7} L${x - s * 0.25} ${y + s * 2.1} L${x + s * 0.1} ${y + s * 0.6} Z"/>` +
  `<path d="M${x + s * 0.3} ${y + s * 0.4} L${x + s * 1.25} ${y + s * 2.7} L${x + s * 0.25} ${y + s * 2.1} L${x - s * 0.1} ${y + s * 0.6} Z"/>` +
  `<path d="M${x} ${y} C${x - s * 0.6} ${y - s * 1.15} ${x - s * 2.15} ${y - s * 0.95} ${x - s * 2} ${y} C${x - s * 2.15} ${y + s * 0.95} ${x - s * 0.6} ${y + s * 1.15} ${x} ${y} Z"/>` +
  `<path d="M${x} ${y} C${x + s * 0.6} ${y - s * 1.15} ${x + s * 2.15} ${y - s * 0.95} ${x + s * 2} ${y} C${x + s * 2.15} ${y + s * 0.95} ${x + s * 0.6} ${y + s * 1.15} ${x} ${y} Z"/>` +
  `<rect x="${x - s * 0.45}" y="${y - s * 0.6}" width="${s * 0.9}" height="${s * 1.2}" rx="${s * 0.28}"/></g>`;
const star = (x, y, r, col = "#fffbe8") =>
  `<path d="M${x} ${y - r} Q${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y} Q${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r} Q${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y} Q${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r} Z" fill="${col}"/>`;
const headArc = (deg, k = 1) => {
  const t = (deg * Math.PI) / 180;
  return [263 + 112 * k * Math.sin(t), 150 - 140 * k * Math.cos(t)];
};

// ================================================================= main
(async () => {
  DOLL = await D.place(await L.load(path.join(TMP, "doll.png")), [263.5, 0, 527, 1494]);
  HEAD = D.keep(D.clone(DOLL), (x, y) => y < 244);
  NECK = D.keep(D.clone(DOLL), (x, y) => x >= 216 && x < 310 && y >= 236 && Math.abs(x - 263) <= 44 && y < 290 - 0.012 * (x - 263) ** 2);
  BASE_T = grayPart(140, 386, 356, 492);
  BASE_B = grayPart(108, 418, 600, 764);
  const base = async (id) => D.place(await L.load(path.join(TMP, `${id}.png`)), P.items[id]);

  // ---------- 1. cut the generated swimsuit + gown sheet
  const sheetImg = L.cutout(await L.load(path.join(RAW, "swimgown1.png")), { T: 238 });
  const { w: SW, h: SH } = sheetImg;
  const rowCnt = new Int32Array(SH);
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) if (sheetImg.d[(y * SW + x) * 4 + 3] > 40) rowCnt[y]++;
  let ySplit = Math.round(SH * 0.42);
  for (let y = Math.round(SH * 0.3), best = 1e9; y < SH * 0.55; y++)
    if (rowCnt[y] < best) {
      best = rowCnt[y];
      ySplit = y;
    }
  const RS = {};
  const COLS = 7;
  for (const [key, ya, yb] of [
    ["swim", 0, ySplit],
    ["gown", ySplit, SH],
  ]) {
    const seams = [];
    const dom = [];
    for (let c = 0; c < COLS; c++) {
      const cx = Math.round(((c + 0.5) * SW) / COLS);
      dom.push(domRaw(sheetImg, cx - 36, cx + 36, ya, yb));
    }
    // swimsuits are well separated (and multi-coloured): follow the empty corridor.
    // gowns overlap at the hems but each has one main colour: separate them by colour.
    for (let k = 1; k < COLS; k++) {
      const xa = Math.round(((k - 0.5) * SW) / COLS),
        xb = Math.round(((k + 0.5) * SW) / COLS);
      seams.push(key === "swim" ? seam(sheetImg, xa, xb, ya, yb) : seamColor(sheetImg, xa, xb, ya, yb, dom[k - 1], dom[k]));
    }
    console.log(key, "seam costs", seams.map((s) => s.cost.toFixed(1)).join(" "));
    for (let c = 0; c < COLS; c++) {
      const sp = extractCell(sheetImg, ya, yb, seams, c, COLS);
      RS[`${key}${c + 1}`] = sp;
      await L.raw(sp).png().toFile(path.join(TMP, `raw_${key}${c + 1}.png`));
    }
  }
  await L.contact(Object.values(RS), path.join(TMP, "x_sheet.jpg"), { cols: 7, cw: 220, ch: 420 });

  // ---------- 2. fit them onto the doll
  const FIT = {
    swim1: { hip: 294, top: 284, conform: [440, 800, 5, "fit"] },
    swim2: { a: { w: 246, cy: 426 }, b: { w: 312, top: 604 } },
    swim3: { a: { w: 238, top: 282, bottom: 616 }, b: { w: 306, top: 598 } },
    swim4: { waist: 172, top: 262 },
    swim5: { hip: 296, top: 246, conform: [440, 800, 5, "fit"] },
    swim6: { a: { w: 228, top: 282 }, b: { w: 294, top: 566, bottom: 744, conform: [566, 652, 4, "fit"] } },
    swim7: { hip: 302, r0: 0.7, r1: 0.98, top: 250 },
    gown1: { waist: 168, r0: 0.08, r1: 0.3, top: 362, bottom: 1482, conform: [400, 1470, 7, "cover"] },
    gown2: { waist: 168, r0: 0.14, r1: 0.35, top: 284, bottom: 1482, conform: [400, 1470, 6, "cover"] },
    gown3: { waist: 172, r0: 0.14, r1: 0.4, top: 284, bottom: 1482, conform: [400, 1470, 8, "cover"] },
    gown4: { waist: 168, r0: 0.1, r1: 0.32, top: 316, bottom: 1482, conform: [420, 1470, 6, "cover"] },
    gown5: { waist: 166, r0: 0.08, r1: 0.3, top: 362, bottom: 1482, conform: [400, 1470, 6, "cover"] },
    gown6: { waist: 172, r0: 0.14, r1: 0.4, top: 272, bottom: 1482, conform: [400, 1470, 8, "cover"] },
    gown7: { waist: 170, r0: 0.14, r1: 0.35, top: 276, bottom: 1482, conform: [400, 1470, 6, "cover"] },
  };
  const G = {};
  const fitOne = async (img, f) => {
    let cv = await fit(img, f);
    if (f.conform) cv = conform(cv, ...f.conform);
    return cv;
  };
  for (const id of Object.keys(FIT)) {
    const o = OV[id] || {};
    const f = { ...FIT[id], ...o };
    if (FIT[id].a) {
      const parts = splitRows(RS[id]);
      if (!parts) throw new Error("no gap in " + id);
      G[id + "a"] = await fitOne(parts[0], { ...FIT[id].a, ...(o.a || {}) });
      G[id + "b"] = await fitOne(parts[1], { ...FIT[id].b, ...(o.b || {}) });
      G[id] = D.over(D.clone(G[id + "b"]), G[id + "a"]);
    } else G[id] = await fitOne(RS[id], f);
    const b = D.bbox(G[id]);
    console.log("fit", id, `x ${b.x0}..${b.x1}  y ${b.y0}..${b.y1}`);
  }

  // the keyhole + ring of the halter swimsuit were drawn as enclosed white: make them see-through
  for (let y = 250; y < 432; y++)
    for (let x = 237; x < 290; x++) {
      const i = I(x, y);
      if (G.swim5.d[i + 3] && Math.min(G.swim5.d[i], G.swim5.d[i + 1], G.swim5.d[i + 2]) > 232) G.swim5.d[i + 3] = 0;
    }

  // ---------- 3. recipes
  const NEW = {};
  const put = (id, slot, cv, o = {}) => {
    NEW[id] = { id, slot, cv, ...o };
  };
  const isNavy = (r, g, b) => b > r + 12 && D.lum(r, g, b) < 125;
  const isCoral = (r, g, b) => r > 190 && r - b > 60 && g > 90 && g < 185;
  for (let i = 1; i <= 7; i++) {
    put(`swim${i}`, "swim", G[`swim${i}`], { u: "tb" });
    put(`gown${i}`, "gown", G[`gown${i}`], { u: "tb" });
  }

  const d1 = await base("dress1"),
    d2 = await base("dress2"),
    d3 = await base("dress3"),
    d5 = await base("dress5"),
    d6 = await base("dress6"),
    d8 = await base("dress8");
  const w1 = waistRow(d1),
    w2 = waistRow(d2),
    w3 = waistRow(d3),
    w6 = waistRow(d6),
    w8 = waistRow(d8);
  const wg2 = waistRow(G.gown2),
    wg4 = waistRow(G.gown4),
    wg5 = waistRow(G.gown5),
    wg7 = waistRow(G.gown7);
  const ySwim4 = firstRow(G.swim4, 520, 720, isNavy, 0.4);
  const ySwim7 = firstRow(G.swim7, 520, 720, isCoral, 0.35);
  const yBib = stepRow(d5, 440, 620);
  const K = { w1: w1.y, w2: w2.y, w3: w3.y, w6: w6.y, w8: w8.y, wg2: wg2.y, wg4: wg4.y, wg5: wg5.y, wg7: wg7.y, ySwim4, ySwim7, yBib, ...(OV.rows || {}) };
  console.log("rows", JSON.stringify(K));
  const above = (cv, y, o) => D.cut(D.clone(cv), (x, yy) => yy >= y, o);
  const below = (cv, y, o) => D.cut(D.clone(cv), (x, yy) => yy < y, o);

  // ----- tops
  put("top9", "top", above(G.swim4, K.ySwim4 - 6), { u: "t" });
  put("top10", "top", D.hue(D.clone(G.swim3a), 200), { u: "t" });
  put("top11", "top", D.hue(above(G.swim7, K.ySwim7 - 4), 85, { only: [0.42, 0.6] }));
  put("top12", "top", D.hue(D.clone(G.swim6a), -50, { only: [0.09, 0.2] }), { u: "t" });
  put("top13", "top", above(d2, K.w2 + 3));
  put("top14", "top", above(d6, K.w6 - 18));
  put("top15", "top", D.hue(above(d8, K.w8 + 3), 150, { only: [0.5, 0.7] }));
  put("top16", "top", above(G.gown3, 655), { u: "t" });
  put("top17", "top", D.hue(above(G.gown4, K.wg4 + 7), 195, { only: [0.3, 0.56] }), { u: "t" });
  put("top18", "top", above(G.swim5, 592), { u: "t" });

  // ----- bottoms
  put("bottom9", "bottom", below(d5, K.yBib));
  put("bottom10", "bottom", below(d2, K.w2));
  put("bottom11", "bottom", D.hue(below(d6, K.w6 - 12), 228, { only: [0.92, 0.06] }));
  put("bottom12", "bottom", below(d8, K.w8));
  put("bottom13", "bottom", D.hue(below(d1, K.w1 - 14), 108, { only: [0.08, 0.22] }));
  put("bottom14", "bottom", below(G.swim7, K.ySwim7));
  put("bottom15", "bottom", D.hue(D.clone(G.swim3b), 200));
  put("bottom16", "bottom", D.hue(below(G.swim4, K.ySwim4), 130, { only: [0.55, 0.72] }));
  put("bottom17", "bottom", below(d3, K.w3));
  put("bottom18", "bottom", below(G.gown2, K.wg2));

  // ----- dresses
  const compress = (cv, yw, f, k1 = 0.9) => {
    const b = D.bbox(cv);
    return D.warpY(cv, [
      { s0: b.y0, s1: yw, d0: b.y0, d1: yw },
      { s0: yw, s1: b.y1 + 1, d0: yw, d1: yw + (b.y1 + 1 - yw) * f, k0: 1, k1 },
    ]);
  };
  {
    let m = null;
    for (let y = 900; y <= 1250; y++) {
      const r = D.span(G.gown1, y);
      if (r && (!m || r[1] - r[0] < m.w)) m = { y, w: r[1] - r[0] };
    }
    put("dress9", "dress", D.hue(above(G.gown1, m.y), 225, { only: [0.9, 0.08] }), { u: "t" });
  }
  put("dress10", "dress", D.hue(compress(G.gown2, K.wg2, 0.44), 55, { only: [0.55, 0.72] }), { u: "t" });
  put("dress11", "dress", D.hue(above(G.gown3, 885), -32, { only: [0.05, 0.2] }), { u: "t" });
  put("dress12", "dress", D.hue(compress(G.gown4, K.wg4, 0.46), 62, { only: [0.3, 0.56] }), { u: "t" });
  put("dress13", "dress", D.hue(compress(G.gown5, K.wg5, 0.44, 0.88), -78, { only: [0.88, 0.05] }), { u: "t" });
  put("dress14", "dress", D.colorize(above(G.gown6, 1012), [172, 44, 76], { floor: 0.34 }), { u: "t" });
  put("dress15", "dress", compress(G.gown7, K.wg7 + 8, 0.44), { u: "t" });
  const stretchDress = (cv, hemY, kHip, cx = 263) => {
    const b = D.bbox(cv);
    const hb = b.y1 + 1;
    return D.warpY(
      cv,
      [
        { s0: b.y0, s1: hb - 84, d0: b.y0, d1: hb - 84 },
        { s0: hb - 84, s1: hb - 48, d0: hb - 84, d1: 700, k0: 1, k1: kHip },
        { s0: hb - 48, s1: hb - 12, d0: 700, d1: hemY - 12, k0: kHip, k1: kHip * 1.03 },
        { s0: hb - 12, s1: hb, d0: hemY - 12, d1: hemY, k0: kHip * 1.03, k1: kHip * 1.03 },
      ],
      cx,
    );
  };
  {
    const t8 = await base("top8");
    const S = sleeveInfo(t8);
    const body = D.keep(D.clone(t8), (x, y) => !S.isSleeve(x, y));
    const slv = D.keep(D.clone(t8), (x, y) => S.isSleeve(x, y));
    const bb = D.bbox(body);
    const hb = bb.y1 + 1;
    const long = D.warpY(
      body,
      [
        { s0: bb.y0, s1: hb - 96, d0: bb.y0, d1: hb - 96 },
        { s0: hb - 96, s1: hb - 64, d0: hb - 96, d1: 700, k0: 1, k1: 1.17 },
        { s0: hb - 64, s1: hb - 34, d0: 700, d1: 792, k0: 1.17, k1: 1.2 },
        { s0: hb - 34, s1: hb, d0: 792, d1: 826, k0: 1.2, k1: 1.2 },
      ],
      260,
    );
    put("dress16", "dress", D.colorize(D.over(long, slv), [234, 214, 184], { floor: 0.5 }));
  }
  put("dress17", "dress", stretchDress(await base("top5"), 800, 1.46));
  put("dress18", "dress", D.hue(stretchDress(await base("top6"), 825, 1.52), 97, { only: [0.66, 0.86] }));

  // ----- outerwear
  const o1 = await base("outer1"),
    o2 = await base("outer2"),
    o3 = await base("outer3"),
    o4 = await base("outer4"),
    o6 = await base("outer6");
  const S1 = sleeveInfo(o1),
    S2 = sleeveInfo(o2),
    S3 = sleeveInfo(o3),
    S4 = sleeveInfo(o4);
  put("outer7", "outer", dropSpecks(D.cut(D.clone(o1), S1.isSleeve)));
  put("outer8", "outer", dropSpecks(D.cut(D.clone(o4), S4.isSleeve)));
  put("outer9", "outer", D.hue(dropSpecks(D.cut(D.clone(o2), S2.isSleeve)), 125, { only: [0.9, 0.06], sat: 0.6 }));
  put("outer10", "outer", D.colorize(dropSpecks(D.cut(D.clone(o3), S3.isSleeve)), [88, 102, 138], { floor: 0.42 }));
  {
    const body = D.keep(D.clone(o2), (x, y) => !S2.isSleeve(x, y));
    const slv = D.keep(D.clone(o2), (x, y) => S2.isSleeve(x, y));
    const hb = D.bbox(body).y1 + 1;
    const yc = 566;
    const sp1 = D.span(body, yc),
      sp2 = D.span(body, hb - 18);
    const k = sp1 && sp2 ? (sp1[1] - sp1[0]) / (sp2[1] - sp2[0]) : 1;
    const band = D.warpY(body, [{ s0: hb - 36, s1: hb, d0: yc, d1: yc + 36, k0: k, k1: k }]);
    const c = D.over(D.over(D.keep(D.clone(body), (x, y) => y < yc), band), slv);
    put("outer11", "outer", D.hue(c, -82, { only: [0.9, 0.06] }));
  }
  put("outer12", "outer", D.colorize(D.cut(D.clone(o3), (x, y) => y >= 655 && !S3.isSleeve(x, y)), [238, 229, 210], { floor: 0.52 }));
  {
    const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
    const band = (t, p, w) => (((t % p) + p) % p) < w;
    const c = D.pattern(D.clone(o3), (x, y) => {
      let u = x,
        v = y;
      if (S3.L && x < S3.L.at(y)) [u, v] = rot(x, y, 0.2);
      else if (S3.R && x > S3.R.at(y)) [u, v] = rot(x, y, -0.2);
      if (band(u + 26, 52, 3) || band(v + 26, 52, 3)) return [164, 66, 56];
      const a = band(u, 52, 16),
        b = band(v, 52, 16);
      return a && b ? [140, 104, 72] : a || b ? [178, 140, 100] : [210, 174, 128];
    });
    put("outer13", "outer", c);
  }
  put(
    "outer14",
    "outer",
    D.pattern(D.clone(o1), (x, y) => {
      const n1 = D.vnoise(x / 40, y / 30),
        n2 = D.vnoise(x / 28 + 40, y / 36 + 90);
      return n1 > 0.62 ? [88, 106, 68] : n2 > 0.66 ? [130, 106, 72] : n1 < 0.3 ? [180, 174, 124] : [136, 150, 94];
    }),
  );
  {
    const c = D.clone(o6);
    const { hi } = D.percentiles(c);
    for (let i = 0; i < c.d.length; i += 4) {
      if (!c.d[i + 3]) continue;
      const l = D.lum(c.d[i], c.d[i + 1], c.d[i + 2]);
      const a = c.d[i + 3] / 255;
      if (l < hi * 0.55) {
        c.d[i] = 92;
        c.d[i + 1] = 120;
        c.d[i + 2] = 146;
        c.d[i + 3] = Math.round(a * 225);
      } else {
        const sh = Math.min(1.04, l / hi);
        c.d[i] = Math.round(228 * sh);
        c.d[i + 1] = Math.round(243 * sh);
        c.d[i + 2] = Math.min(255, Math.round(253 * sh));
        c.d[i + 3] = Math.round(a * 108);
      }
    }
    put("outer15", "outer", c);
  }
  put("outer16", "outer", D.colorize(D.cut(await base("top4"), (x, y) => y >= 304 && Math.abs(x - 261) < Math.min(23, (y - 304) * 0.8)), [188, 190, 198], { floor: 0.46 }));

  // ----- shoes
  const platform = (cv, sole, add) => {
    const b = D.bbox(cv);
    const B = b.y1 + 1;
    return D.warpY(cv, [
      { s0: b.y0, s1: B - sole, d0: b.y0 - add, d1: B - sole - add },
      { s0: B - sole, s1: B - 4, d0: B - sole - add, d1: B - 4 },
      { s0: B - 4, s1: B, d0: B - 4, d1: B },
    ]);
  };
  const legwear = (yTop, yBot, colorAt, alpha = 1) => {
    const o = D.blank();
    for (let y = yTop; y < yBot; y++)
      for (let x = 112; x < 415; x++) {
        const i = I(x, y);
        if (DOLL.d[i + 3] < 30) continue;
        const r = DOLL.d[i],
          g = DOLL.d[i + 1],
          b = DOLL.d[i + 2];
        if (isBaseGray(r, g, b)) continue;
        const sh = Math.min(1.04, D.lum(r, g, b) / 232);
        const c = colorAt(x, y);
        o.d[i] = Math.round(c[0] * sh);
        o.d[i + 1] = Math.round(c[1] * sh);
        o.d[i + 2] = Math.round(c[2] * sh);
        o.d[i + 3] = Math.round(DOLL.d[i + 3] * alpha);
      }
    return o;
  };
  const legEdge = (y, side) => {
    const rs = D.runs(DOLL, y).filter((r) => r[1] > 170 && r[0] < 356);
    return side === 0 ? rs[0] : rs[rs.length - 1];
  };
  const s5 = await base("shoes5"),
    s7 = await base("shoes7");
  put("shoes9", "shoes", platform(await base("shoes1"), 22, 30));
  put("shoes10", "shoes", platform(await base("shoes3"), 16, 28));
  {
    let b = "";
    for (const [fx, gap, sgn] of [
      [208, 227, 1],
      [318, 299, -1],
    ]) {
      b += `<rect x="${fx - 45}" y="1474" width="90" height="19" rx="8.5" fill="#35bdb6" stroke="${OL}" stroke-width="2.6"/>`;
      const p1 = `M${gap} 1467 Q${gap - sgn * 26} 1456 ${gap - sgn * 50} 1440`,
        p2 = `M${gap} 1467 Q${gap + sgn * 6} 1452 ${gap + sgn * 15} 1436`;
      for (const p of [p1, p2]) b += `<path d="${p}" fill="none" stroke="${OL}" stroke-width="9.5" stroke-linecap="round"/>`;
      for (const p of [p1, p2]) b += `<path d="${p}" fill="none" stroke="#5fd8d0" stroke-width="5.5" stroke-linecap="round"/>`;
      b += flower(gap, 1466, 7.5, "#fff3d6", "#ffd24d");
    }
    put("shoes11", "shoes", await D.svg(b));
  }
  put("shoes12", "shoes", D.cut(D.clone(s7), (x, y) => y < 1288));
  put(
    "shoes13",
    "shoes",
    D.warpY(s7, [
      { s0: 1014, s1: 1054, d0: 874, d1: 914, k0: 1.07, k1: 1.07 },
      { s0: 1054, s1: 1260, d0: 914, d1: 1260, k0: 1.07, k1: 1 },
      { s0: 1260, s1: 1494, d0: 1260, d1: 1494 },
    ]),
  );
  put("shoes14", "shoes", D.over(legwear(716, 1480, () => [40, 36, 48], 0.8), D.hue(D.clone(s5), 14, { sat: 1.35, light: 0.8 })));
  put(
    "shoes15",
    "shoes",
    D.over(
      legwear(1040, 1420, (x, y) => (y < 1046 ? [196, 196, 204] : (y >= 1058 && y < 1070) || (y >= 1082 && y < 1094) ? [72, 88, 142] : [250, 248, 244])),
      await base("shoes2"),
    ),
  );
  put(
    "shoes16",
    "shoes",
    D.pattern(D.cut(await base("shoes8"), (x, y) => y < 1326), (x, y) => {
      const col = Math.floor(x / 26);
      const u = (((x % 26) + 26) % 26) - 13,
        v = ((((y + (col % 2) * 13) % 26) + 26) % 26) - 13;
      return u * u + v * v < 24 ? [255, 252, 244] : [250, 214, 80];
    }),
  );
  {
    let b = "";
    for (const side of [0, 1]) {
      const pts = [[], []];
      let k = 0;
      for (let y = 1338; y >= 1170; y -= 34, k++) {
        const r = legEdge(y, side);
        pts[0].push(`${k % 2 ? r[0] + 1 : r[1] - 1},${y}`);
        pts[1].push(`${k % 2 ? r[1] - 1 : r[0] + 1},${y}`);
      }
      for (const p of pts) b += `<polyline points="${p.join(" ")}" fill="none" stroke="${OL}" stroke-width="9" stroke-linejoin="round" stroke-linecap="round"/>`;
      for (const p of pts) b += `<polyline points="${p.join(" ")}" fill="none" stroke="#f8bccb" stroke-width="5.4" stroke-linejoin="round" stroke-linecap="round"/>`;
      const r = legEdge(1164, side);
      b += bow((r[0] + r[1]) / 2, 1160, 12, "#f8bccb");
    }
    put("shoes17", "shoes", D.over(D.hue(D.clone(s5), 0, { sat: 0.55, light: 1.1 }), await D.svg(b)));
  }
  {
    let b = "";
    for (const side of [0, 1]) {
      const r = legEdge(1336, side);
      const p = `M${r[0] - 3} 1332 Q${(r[0] + r[1]) / 2} 1346 ${r[1] + 3} 1332`;
      b += `<path d="${p}" fill="none" stroke="${OL}" stroke-width="11" stroke-linecap="round"/><path d="${p}" fill="none" stroke="#f1cb62" stroke-width="6.5" stroke-linecap="round"/>`;
      b += star((r[0] + r[1]) / 2 + (side ? 16 : -16), 1408, 9) + star((r[0] + r[1]) / 2 + (side ? -12 : 12), 1442, 6);
    }
    put("shoes18", "shoes", D.over(D.colorize(D.clone(s5), [240, 198, 96], { floor: 0.46 }), await D.svg(b)));
  }

  // ----- accessories (vector, drawn straight in doll coordinates)
  const st = `stroke="${OL}" stroke-linejoin="round" stroke-linecap="round"`;
  put(
    "acc11",
    "hat",
    await D.svg(
      `<path d="M192 82 Q263 56 334 82 L328 58 L310 72 L297 34 L279 64 L263 10 L247 64 L229 34 L216 72 L198 58 Z" fill="#eef2fa" ${st} stroke-width="3"/>` +
        `<path d="M194 80 Q263 55 332 80" fill="none" stroke="#b9c4dc" stroke-width="5"/>` +
        `<circle cx="263" cy="42" r="9" fill="#6fb9ff" ${st} stroke-width="2.4"/><circle cx="296" cy="56" r="6" fill="#ff8fb3" ${st} stroke-width="2"/><circle cx="230" cy="56" r="6" fill="#ff8fb3" ${st} stroke-width="2"/>` +
        [
          [263, 10],
          [297, 34],
          [229, 34],
          [328, 58],
          [198, 58],
        ]
          .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.6" fill="#ffffff" ${st} stroke-width="1.8"/>`)
          .join("") +
        star(260, 39, 4, "#ffffff"),
    ),
  );
  {
    let b = "";
    const pts = [];
    for (let a = -70; a <= 70; a += 5) pts.push(headArc(a, 0.97).map((v) => v.toFixed(1)).join(","));
    b += `<polyline points="${pts.join(" ")}" fill="none" stroke="${OL}" stroke-width="9" stroke-linecap="round"/><polyline points="${pts.join(" ")}" fill="none" stroke="#7cc48a" stroke-width="5" stroke-linecap="round"/>`;
    for (let a = -58; a <= 58; a += 23.2) {
      const [x, y] = headArc(a, 1.0);
      b += `<ellipse cx="${x.toFixed(1)}" cy="${(y + 3).toFixed(1)}" rx="11" ry="5.5" fill="#8fd39b" ${st} stroke-width="1.6" transform="rotate(${a} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
    }
    const cols = ["#ff9fb8", "#fff3d6", "#ff7f8e", "#ffe08a", "#ff9fb8", "#fff3d6", "#d6c5fb"];
    let k = 0;
    for (let a = -69; a <= 70; a += 23) {
      const [x, y] = headArc(a, 0.985);
      b += flower(x, y, k % 2 ? 15 : 18, cols[k % cols.length], k % 2 ? "#ff9b54" : "#ffd24d");
      k++;
    }
    put("acc12", "hat", await D.svg(b));
  }
  {
    let b = "";
    const pts = [];
    for (let a = -76; a <= 76; a += 4) pts.push(headArc(a, 0.985).map((v) => v.toFixed(1)).join(","));
    for (const sgn of [-1, 1]) {
      const a = 36 * sgn,
        t = (a * Math.PI) / 180;
      const [px, py] = headArc(a, 0.97);
      const tx = Math.cos(t),
        ty = Math.sin(t),
        nx = Math.sin(t),
        ny = -Math.cos(t);
      const A = [px - tx * 34, py - ty * 34],
        Bp = [px + tx * 30, py + ty * 30],
        C = [px + nx * 74 + tx * sgn * 10, py + ny * 74 + ty * sgn * 10];
      const f = (p) => p.map((v) => v.toFixed(1)).join(" ");
      b += `<path d="M${f(A)} L${f(C)} L${f(Bp)} Z" fill="#3a2f3b" ${st} stroke-width="5"/>`;
      const mid = [(A[0] + Bp[0]) / 2, (A[1] + Bp[1]) / 2];
      const sh = (p, k2) => [mid[0] + (p[0] - mid[0]) * k2, mid[1] + (p[1] - mid[1]) * k2];
      b += `<path d="M${f(sh(A, 0.56))} L${f(sh(C, 0.66))} L${f(sh(Bp, 0.56))} Z" fill="#ff9fb8"/>`;
    }
    b += `<polyline points="${pts.join(" ")}" fill="none" stroke="#3a2f3b" stroke-width="8" stroke-linecap="round"/>`;
    put("acc13", "hat", await D.svg(b));
  }
  put(
    "acc14",
    "hat",
    await D.svg(
      `<path d="M150 120 Q263 60 376 120" fill="none" stroke="${OL}" stroke-width="19" stroke-linecap="round"/><path d="M150 120 Q263 60 376 120" fill="none" stroke="#2f9ed4" stroke-width="13" stroke-linecap="round"/>` +
        [
          [221, 95, -10],
          [305, 95, 10],
        ]
          .map(
            ([x, y, r]) =>
              `<g transform="rotate(${r} ${x} ${y})"><ellipse cx="${x}" cy="${y}" rx="35" ry="24" fill="#f4fbff" ${st} stroke-width="3"/><ellipse cx="${x}" cy="${y}" rx="26" ry="16.5" fill="#79d2f4" ${st} stroke-width="2.2"/><ellipse cx="${x - 9}" cy="${y - 6}" rx="8" ry="3.6" fill="#ffffff" opacity="0.85"/></g>`,
          )
          .join("") +
        `<path d="M254 92 Q263 86 272 92" fill="none" stroke="${OL}" stroke-width="9" stroke-linecap="round"/><path d="M254 92 Q263 86 272 92" fill="none" stroke="#f4fbff" stroke-width="4.5" stroke-linecap="round"/>`,
    ),
  );
  put(
    "acc15",
    "eyes",
    await D.svg(
      `<g fill="#ffffff" fill-opacity="0.16" stroke="#2c2530" stroke-width="6.5" stroke-linejoin="round"><rect x="185" y="135" width="70" height="52" rx="14"/><rect x="271" y="135" width="70" height="52" rx="14"/></g>` +
        `<path d="M255 156 Q263 149 271 156 M185 152 L173 150 M341 152 L353 150" fill="none" stroke="#2c2530" stroke-width="5.5" stroke-linecap="round"/>` +
        `<path d="M198 146 L210 142 M284 146 L296 142" stroke="#ffffff" stroke-width="3.4" stroke-linecap="round" opacity="0.8"/>`,
    ),
  );
  {
    let b = "";
    const q = (t) => [(1 - t) ** 2 * 229 + 2 * t * (1 - t) * 263 + t * t * 297, (1 - t) ** 2 * 266 + 2 * t * (1 - t) * 356 + t * t * 266];
    for (let k = 0; k <= 14; k++) {
      const [x, y] = q(k / 14);
      b += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6" fill="#fffaf0" ${st} stroke-width="1.7"/><circle cx="${(x - 1.8).toFixed(1)}" cy="${(y - 1.8).toFixed(1)}" r="1.7" fill="#ffffff"/>`;
    }
    put("acc16", "neck", await D.svg(b));
  }
  put("acc17", "neck", await D.svg(bow(263, 300, 21, "#44548c") + `<path d="M232 292 Q244 300 252 296 M294 292 Q282 300 274 296" fill="none" stroke="#7d8cc4" stroke-width="3" stroke-linecap="round"/>`));
  {
    let b = "";
    const cub = (t, p) => (1 - t) ** 3 * p[0] + 3 * t * (1 - t) ** 2 * p[1] + 3 * t * t * (1 - t) * p[2] + t ** 3 * p[3];
    const cols = ["#ff6f9c", "#ffd24d", "#ff9b54", "#ffb3cb", "#ffffff"];
    const ptsL = [];
    for (let k = 0; k <= 8; k++) ptsL.push([cub(k / 8, [228, 196, 226, 263]), cub(k / 8, [258, 318, 398, 400])]);
    const all = [...ptsL, ...ptsL.slice(0, -1).reverse().map(([x, y]) => [526 - x, y])];
    all.forEach(([x, y], k) => {
      b += flower(x, y, 14.5, cols[k % cols.length], k % 2 ? "#ffd24d" : "#ff8f3c");
    });
    put("acc18", "neck", await D.svg(b));
  }
  put(
    "acc19",
    "bag",
    await D.svg(
      [`M372 298 L348 600`, `M398 298 L430 600`, `M372 298 Q385 284 398 298`].map((p) => `<path d="${p}" fill="none" stroke="#7a5a1e" stroke-width="6" stroke-linecap="round"/>`).join("") +
        [`M372 298 L348 600`, `M398 298 L430 600`, `M372 298 Q385 284 398 298`].map((p) => `<path d="${p}" fill="none" stroke="#f3cf6a" stroke-width="3.2" stroke-dasharray="6 4" stroke-linecap="round"/>`).join("") +
        `<rect x="332" y="596" width="114" height="74" rx="13" fill="#f0c659" ${st} stroke-width="3"/><path d="M333 606 Q389 664 445 606 L445 604 Q445 597 436 597 L342 597 Q333 597 333 604 Z" fill="#f8dd88" ${st} stroke-width="2.6"/>` +
        `<circle cx="389" cy="636" r="7" fill="#fff6d2" ${st} stroke-width="2.2"/>` +
        star(352, 654, 6) +
        star(426, 650, 5) +
        star(412, 612, 4),
    ),
  );
  {
    const c = D.colorize(await base("acc10"), [226, 186, 122], { floor: 0.5 });
    D.recolor(c, (r, g, b, x, y) => {
      const m = 0.9 + 0.1 * ((Math.floor(x / 6) + Math.floor(y / 6)) % 2);
      return [r * m, g * m, b * m];
    });
    put("acc20", "bag", c, { hand: true });
  }

  // ---------- 4. finish: underlays, sprites, placements
  const SCALE = { swim: 0.64, gown: 0.6, shoes: 0.8, hat: 0.9, eyes: 1, neck: 0.9, bag: 0.75 };
  P.waist = P.waist || {};
  const FINAL = {};
  let bytes = 0;
  for (const it of Object.values(NEW)) {
    const cv = it.u ? underlay(it.cv, it.u) : it.cv;
    FINAL[it.id] = cv;
    const sp = await D.toSprite(cv, SCALE[it.slot] ?? 0.62);
    P.items[it.id] = sp.place;
    if (it.slot === "bottom") {
      const r = D.span(cv, sp.place[1] + 7);
      P.waist[it.id] = r ? r[1] - r[0] + 1 : 200;
    }
    await L.raw(sp.img).png().toFile(path.join(TMP, `${it.id}.png`));
    const f = path.join(ITEMS, `${it.id}.webp`);
    await L.saveWebp(sp.img, f, 82);
    bytes += fs.statSync(f).size;
  }
  const lines = Object.entries(P.items)
    .map(([k, v]) => `    "${k}": ${JSON.stringify(v)}`)
    .join(",\n");
  fs.writeFileSync(PFILE, `{\n  "doll": ${JSON.stringify(P.doll)},\n  "waist": ${JSON.stringify(P.waist)},\n  "items": {\n${lines}\n  }\n}\n`);
  console.log("new items", Object.keys(NEW).length, "KB", Math.round(bytes / 1024));

  // ---------- 5. previews
  const ids = (k, a, b) => Array.from({ length: b - a + 1 }, (_, i) => `${k}${a + i}`);
  const lay = (id) => [{ cv: FINAL[id], z: Z[NEW[id].slot] }];
  const PV = {
    swim: [ids("swim", 1, 7), [-70, 170, 597, 1000], 0.4, 4],
    gown: [ids("gown", 1, 7), [-200, 170, 727, 1530], 0.29, 4],
    top: [ids("top", 9, 18), [-50, 170, 577, 900], 0.44, 5],
    bottom: [ids("bottom", 9, 18), [-130, 440, 657, 1530], 0.32, 5],
    dress: [ids("dress", 9, 18), [-130, 170, 657, 1530], 0.32, 5],
    outer: [ids("outer", 7, 16), [-70, 170, 597, 1100], 0.38, 5],
    shoes: [ids("shoes", 9, 18), [70, 780, 457, 1530], 0.52, 5],
    acc: [ids("acc", 11, 20), [-40, -110, 567, 900], 0.36, 5],
  };
  for (const g of want) {
    if (!PV[g]) continue;
    const [list, roi, sc, cols] = PV[g];
    await sheet(g, list.map(lay), roi, sc, cols);
  }
})().catch((e) => {
  console.error("FAILED", e);
  process.exit(1);
});
