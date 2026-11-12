// "Doll space" helpers: every canvas shares the doll's coordinate system (0,0 = top-left of the doll art),
// so garments can be cut, warped, recoloured and combined without any re-fitting.
const L = require("./lib.cjs");
const sharp = L.sharp;

const DW = 527,
  DH = 1494,
  PX = 220,
  PT = 130,
  PB = 40;
const CW = DW + PX * 2,
  CH = DH + PT + PB;
const X0 = -PX,
  X1 = DW + PX,
  Y0 = -PT,
  Y1 = DH + PB;
const I = (x, y) => ((y + PT) * CW + (x + PX)) * 4;
const blank = () => ({ d: Buffer.alloc(CW * CH * 4), w: CW, h: CH });
const clone = (c) => ({ d: Buffer.from(c.d), w: CW, h: CH });
const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/** draw a sprite at [centerX, top, width, height, clipBottom?] */
async function place(img, p) {
  const [cx, top, w, h, clip = 0] = p;
  const W = Math.max(1, Math.round(w)),
    H = Math.max(1, Math.round(h));
  const { data } = await L.raw(img).resize(W, H, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
  const cv = blank();
  const left = Math.round(cx - w / 2),
    tp = Math.round(top);
  const maxY = Math.round(H * (1 - clip));
  for (let y = 0; y < maxY; y++) {
    const dy = y + tp;
    if (dy < Y0 || dy >= Y1) continue;
    for (let x = 0; x < W; x++) {
      const dx = x + left;
      if (dx < X0 || dx >= X1) continue;
      const si = (y * W + x) * 4;
      if (!data[si + 3]) continue;
      data.copy(cv.d, I(dx, dy), si, si + 4);
    }
  }
  return cv;
}

function bbox(cv, thr = 20) {
  let x0 = 1e9,
    y0 = 1e9,
    x1 = -1e9,
    y1 = -1e9;
  for (let y = Y0; y < Y1; y++)
    for (let x = X0; x < X1; x++)
      if (cv.d[I(x, y) + 3] > thr) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  return x1 < x0 ? null : { x0, y0, x1, y1 };
}

/** crop to content and scale down → { img, place:[cx, top, w, h] } */
async function toSprite(cv, scale = 0.62) {
  const b = bbox(cv);
  if (!b) throw new Error("empty canvas");
  const w = b.x1 - b.x0 + 1,
    h = b.y1 - b.y0 + 1;
  const c = L.crop(cv, b.x0 + PX, b.y0 + PT, w, h);
  const W = Math.max(1, Math.round(w * scale)),
    H = Math.max(1, Math.round(h * scale));
  const { data, info } = await L.raw(c).resize(W, H, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
  return { img: { d: data, w: info.width, h: info.height }, place: [Math.round((b.x0 + w / 2) * 2) / 2, b.y0, w, h] };
}

function runs(cv, y, min = 3) {
  const out = [];
  if (y < Y0 || y >= Y1) return out;
  let s = null;
  for (let x = X0; x <= X1; x++) {
    const on = x < X1 && cv.d[I(x, y) + 3] > 40;
    if (on && s === null) s = x;
    if (!on && s !== null) {
      if (x - s >= min) out.push([s, x - 1]);
      s = null;
    }
  }
  return out;
}
function central(cv, y, cx = 263) {
  let best = null,
    bd = 1e9;
  for (const r of runs(cv, y)) {
    const d = cx < r[0] ? r[0] - cx : cx > r[1] ? cx - r[1] : 0;
    if (d < bd) {
      bd = d;
      best = r;
    }
  }
  return best;
}
function span(cv, y) {
  const r = runs(cv, y);
  return r.length ? [r[0][0], r[r.length - 1][1]] : null;
}

function keep(cv, pred) {
  for (let y = Y0; y < Y1; y++)
    for (let x = X0; x < X1; x++) {
      const i = I(x, y);
      if (cv.d[i + 3] && !pred(x, y)) cv.d[i + 3] = 0;
    }
  return cv;
}

/** remove pixels where pred() is true and ink an outline along the fresh edge */
function cut(cv, pred, { t = 3, color = [82, 54, 48] } = {}) {
  const rem = new Uint8Array(CW * CH);
  let any = false;
  for (let y = Y0; y < Y1; y++)
    for (let x = X0; x < X1; x++) {
      const i = I(x, y);
      if (!cv.d[i + 3] || !pred(x, y)) continue;
      if (cv.d[i + 3] > 60) {
        rem[i >> 2] = 1;
        any = true;
      }
      cv.d[i + 3] = 0;
    }
  if (!any || !t) return cv;
  const mark = [];
  for (let y = Y0; y < Y1; y++)
    for (let x = X0; x < X1; x++) {
      const i = I(x, y);
      if (cv.d[i + 3] < 40) continue;
      let near = false;
      for (let dy = -t; dy <= t && !near; dy++) {
        const yy = y + dy;
        if (yy < Y0 || yy >= Y1) continue;
        for (let dx = -t; dx <= t; dx++) {
          const xx = x + dx;
          if (xx < X0 || xx >= X1) continue;
          if (rem[I(xx, yy) >> 2]) {
            near = true;
            break;
          }
        }
      }
      if (near) mark.push(i);
    }
  for (const i of mark) {
    cv.d[i] = color[0];
    cv.d[i + 1] = color[1];
    cv.d[i + 2] = color[2];
  }
  return cv;
}

/** src over dst (in place on dst) */
function over(dst, src) {
  const a = dst.d,
    b = src.d;
  for (let i = 0; i < a.length; i += 4) {
    const sa = b[i + 3] / 255;
    if (!sa) continue;
    const da = a[i + 3] / 255;
    const oa = sa + da * (1 - sa);
    for (let c = 0; c < 3; c++) a[i + c] = Math.round((b[i + c] * sa + a[i + c] * da * (1 - sa)) / oa);
    a[i + 3] = Math.round(oa * 255);
  }
  return dst;
}

/**
 * Vertical remap with optional horizontal scaling.
 * segs: [{ s0, s1, d0, d1, k0=1, k1=1 }] – source rows [s0,s1) go to rows [d0,d1), x is scaled about cx by k0→k1.
 */
function warpY(cv, segs, cx = 263) {
  const out = blank();
  for (const g of segs) {
    const k0 = g.k0 ?? 1,
      k1 = g.k1 ?? k0;
    const n = g.d1 - g.d0;
    if (n <= 0) continue;
    const sMin = Math.ceil(g.s0),
      sMax = Math.ceil(g.s1) - 1;
    for (let dy = Math.max(Y0, Math.round(g.d0)); dy < Math.min(Y1, Math.round(g.d1)); dy++) {
      const t = (dy - g.d0 + 0.5) / n;
      const sy = g.s0 + t * (g.s1 - g.s0) - 0.5;
      const k = k0 + t * (k1 - k0);
      const yA = Math.floor(sy),
        fy = sy - yA;
      for (let dx = X0; dx < X1; dx++) {
        const sx = cx + (dx - cx) / k;
        const xA = Math.floor(sx),
          fx = sx - xA;
        let r = 0,
          gg = 0,
          b = 0,
          a = 0;
        for (let j = 0; j < 2; j++) {
          const yy = clamp(yA + j, sMin, sMax);
          if (yy < Y0 || yy >= Y1) continue;
          for (let q = 0; q < 2; q++) {
            const xx = xA + q;
            if (xx < X0 || xx >= X1) continue;
            const si = I(xx, yy);
            const al = cv.d[si + 3] * (q ? fx : 1 - fx) * (j ? fy : 1 - fy);
            if (!al) continue;
            r += cv.d[si] * al;
            gg += cv.d[si + 1] * al;
            b += cv.d[si + 2] * al;
            a += al;
          }
        }
        if (a > 1) {
          const di = I(dx, dy);
          out.d[di] = Math.round(r / a);
          out.d[di + 1] = Math.round(gg / a);
          out.d[di + 2] = Math.round(b / a);
          out.d[di + 3] = Math.min(255, Math.round(a));
        }
      }
    }
  }
  return out;
}

/** per-row horizontal scale about cx: kOf(y) → factor */
function scaleRows(cv, kOf, cx = 263) {
  const out = blank();
  for (let y = Y0; y < Y1; y++) {
    const k = kOf(y);
    if (k === 1) {
      cv.d.copy(out.d, I(X0, y), I(X0, y), I(X0, y) + CW * 4);
      continue;
    }
    for (let dx = X0; dx < X1; dx++) {
      const sx = cx + (dx - cx) / k;
      const xA = Math.floor(sx),
        fx = sx - xA;
      let r = 0,
        g = 0,
        b = 0,
        a = 0;
      for (let q = 0; q < 2; q++) {
        const xx = xA + q;
        if (xx < X0 || xx >= X1) continue;
        const si = I(xx, y);
        const al = cv.d[si + 3] * (q ? fx : 1 - fx);
        if (!al) continue;
        r += cv.d[si] * al;
        g += cv.d[si + 1] * al;
        b += cv.d[si + 2] * al;
        a += al;
      }
      if (a > 1) {
        const di = I(dx, y);
        out.d[di] = Math.round(r / a);
        out.d[di + 1] = Math.round(g / a);
        out.d[di + 2] = Math.round(b / a);
        out.d[di + 3] = Math.min(255, Math.round(a));
      }
    }
  }
  return out;
}

function rgb2hsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const mx = Math.max(r, g, b),
    mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h;
  if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (mx === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h / 6, s, l];
}
function hsl2rgb(h, s, l) {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}

/** fn(r,g,b,x,y) → [r,g,b] | null */
function recolor(cv, fn) {
  for (let y = Y0; y < Y1; y++)
    for (let x = X0; x < X1; x++) {
      const i = I(x, y);
      if (!cv.d[i + 3]) continue;
      const o = fn(cv.d[i], cv.d[i + 1], cv.d[i + 2], x, y, i);
      if (!o) continue;
      cv.d[i] = clamp(Math.round(o[0]), 0, 255);
      cv.d[i + 1] = clamp(Math.round(o[1]), 0, 255);
      cv.d[i + 2] = clamp(Math.round(o[2]), 0, 255);
    }
  return cv;
}

/** rotate hue by deg; only = [h0,h1] (0..1, may wrap) restricts which source hues are touched */
function hue(cv, deg, { sat = 1, light = 1, only } = {}) {
  const inRange = (h) => !only || (only[0] <= only[1] ? h >= only[0] && h <= only[1] : h >= only[0] || h <= only[1]);
  return recolor(cv, (r, g, b) => {
    const [h, s, l] = rgb2hsl(r, g, b);
    if (s < 0.06 || !inRange(h)) return null;
    return hsl2rgb((h + deg / 360 + 1) % 1, clamp(s * sat, 0, 1), clamp(l * light, 0, 1));
  });
}

function percentiles(cv, pred) {
  const hist = new Uint32Array(256);
  let n = 0;
  for (let y = Y0; y < Y1; y++)
    for (let x = X0; x < X1; x++) {
      const i = I(x, y);
      if (cv.d[i + 3] < 200 || (pred && !pred(x, y))) continue;
      hist[Math.round(lum(cv.d[i], cv.d[i + 1], cv.d[i + 2]))]++;
      n++;
    }
  const at = (f) => {
    let acc = 0;
    for (let v = 0; v < 256; v++) {
      acc += hist[v];
      if (acc >= n * f) return v;
    }
    return 255;
  };
  return { lo: at(0.05), mid: at(0.5), hi: at(0.9), n };
}

/** map luminance onto a single colour (keeps shading + line art) */
function colorize(cv, rgb, { floor = 0.38, pred } = {}) {
  const { lo, hi } = percentiles(cv, pred);
  const range = Math.max(12, hi - lo);
  return recolor(cv, (r, g, b, x, y) => {
    if (pred && !pred(x, y)) return null;
    const t = clamp((lum(r, g, b) - lo) / range, -0.45, 1.2);
    const v = floor + (1 - floor) * t;
    return [rgb[0] * v, rgb[1] * v, rgb[2] * v];
  });
}

/** print a procedural fabric: fn(x,y) → [r,g,b], multiplied by the original shading */
function pattern(cv, fn, { pred } = {}) {
  const { hi } = percentiles(cv, pred);
  const ref = Math.max(40, hi);
  return recolor(cv, (r, g, b, x, y) => {
    if (pred && !pred(x, y)) return null;
    const sh = Math.min(1.1, lum(r, g, b) / ref);
    const c = fn(x, y);
    return [c[0] * sh, c[1] * sh, c[2] * sh];
  });
}

/** most common colour between rows y0..y1 */
function dominant(cv, y0, y1, xa = X0, xb = X1) {
  const bins = new Map();
  for (let y = Math.max(Y0, y0); y < Math.min(Y1, y1); y++)
    for (let x = Math.max(X0, xa); x < Math.min(X1, xb); x++) {
      const i = I(x, y);
      if (cv.d[i + 3] < 220) continue;
      const k = ((cv.d[i] >> 4) << 8) | ((cv.d[i + 1] >> 4) << 4) | (cv.d[i + 2] >> 4);
      let e = bins.get(k);
      if (!e) bins.set(k, (e = [0, 0, 0, 0]));
      e[0]++;
      e[1] += cv.d[i];
      e[2] += cv.d[i + 1];
      e[3] += cv.d[i + 2];
    }
  let best = null;
  for (const e of bins.values()) if (!best || e[0] > best[0]) best = e;
  return best ? [best[1] / best[0], best[2] / best[0], best[3] / best[0]] : null;
}

/** rasterise SVG markup written in doll coordinates */
async function svg(body) {
  const s = `<svg xmlns="http://www.w3.org/2000/svg" width="${CW}" height="${CH}" viewBox="${-PX} ${-PT} ${CW} ${CH}">${body}</svg>`;
  const { data } = await sharp(Buffer.from(s)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { d: data, w: CW, h: CH };
}

/** smooth value noise 0..1 */
function vnoise(x, y) {
  const h = (a, b) => {
    const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const xi = Math.floor(x),
    yi = Math.floor(y),
    fx = x - xi,
    fy = y - yi;
  const sx = fx * fx * (3 - 2 * fx),
    sy = fy * fy * (3 - 2 * fy);
  const a = h(xi, yi),
    b = h(xi + 1, yi),
    c = h(xi, yi + 1),
    d = h(xi + 1, yi + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

module.exports = {
  DW, DH, PX, PT, PB, CW, CH, X0, X1, Y0, Y1, I,
  blank, clone, lum, clamp, place, bbox, toSprite, runs, central, span, keep, cut, over, warpY, scaleRows,
  rgb2hsl, hsl2rgb, recolor, hue, percentiles, colorize, pattern, dominant, svg, vnoise,
};
