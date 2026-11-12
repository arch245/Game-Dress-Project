// Image helpers for the dress-up asset pipeline (run with NODE_PATH=/tmp/imgtools/node_modules)
const sharp = require("sharp");

async function load(p) {
  const { data, info } = await sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { d: data, w: info.width, h: info.height };
}

/**
 * Remove the white background by flood-filling from the borders.
 * - erodes the "white-ish" mask first so the fill cannot leak through hairline gaps in line art
 * - optionally punches out enclosed white holes (bag handles, glasses lenses)
 * - un-mattes the 1px anti-aliased fringe so sprites sit cleanly on any background
 */
function cutout(img, { T = 238, holes = false, holeMin = 160 } = {}) {
  const { d, w, h } = img;
  const n = w * h;
  const mn = new Uint8Array(n);
  const B = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const m = Math.min(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]);
    mn[i] = m;
    B[i] = m >= T ? 1 : 0;
  }
  const E = new Uint8Array(n);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!B[i]) continue;
      if (x > 0 && !B[i - 1]) continue;
      if (x < w - 1 && !B[i + 1]) continue;
      if (y > 0 && !B[i - w]) continue;
      if (y < h - 1 && !B[i + w]) continue;
      E[i] = 1;
    }
  const F = new Uint8Array(n);
  const stack = new Int32Array(n);
  let sp = 0;
  const push = (i) => {
    if (E[i] && !F[i]) {
      F[i] = 1;
      stack[sp++] = i;
    }
  };
  for (let x = 0; x < w; x++) {
    push(x);
    push((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    push(y * w);
    push(y * w + w - 1);
  }
  while (sp) {
    const i = stack[--sp];
    const x = i % w;
    if (x > 0) push(i - 1);
    if (x < w - 1) push(i + 1);
    if (i >= w) push(i - w);
    if (i < n - w) push(i + w);
  }
  // grow the fill back over white-ish pixels (undo the erosion)
  for (let pass = 0; pass < 2; pass++) {
    const add = [];
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (F[i] || !B[i]) continue;
        let near = false;
        for (let dy = -1; dy <= 1 && !near; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx,
              yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
            if (F[yy * w + xx]) {
              near = true;
              break;
            }
          }
        if (near) add.push(i);
      }
    for (const i of add) F[i] = 1;
  }
  if (holes) {
    const seen = new Uint8Array(n);
    for (let s = 0; s < n; s++) {
      if (seen[s] || F[s] || mn[s] < 247) continue;
      const comp = [s];
      seen[s] = 1;
      for (let q = 0; q < comp.length; q++) {
        const i = comp[q];
        const x = i % w;
        const nb = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w];
        for (const j of nb) {
          if (j < 0 || j >= n || seen[j] || F[j] || mn[j] < 247) continue;
          seen[j] = 1;
          comp.push(j);
        }
      }
      if (comp.length >= holeMin) {
        for (const i of comp) F[i] = 1;
        // soften the hole edge by one ring
        for (const i of comp) {
          const x = i % w;
          const nb = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w];
          for (const j of nb) if (j >= 0 && j < n && !F[j] && mn[j] >= T) F[j] = 1;
        }
      }
    }
  }
  const out = Buffer.from(d);
  for (let i = 0; i < n; i++) if (F[i]) out[i * 4 + 3] = 0;
  // un-matte the anti-aliased fringe
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (F[i]) continue;
      let edge = false;
      let fm = 255;
      for (let dy = -2; dy <= 2; dy++)
        for (let dx = -2; dx <= 2; dx++) {
          const xx = x + dx,
            yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const j = yy * w + xx;
          if (F[j]) {
            if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) edge = true;
          } else if (mn[j] < fm) fm = mn[j];
        }
      if (!edge) continue;
      const pm = mn[i];
      if (pm <= fm + 18) continue;
      let a = (255 - pm) / (255 - fm);
      a = Math.max(0.04, Math.min(1, a));
      for (let c = 0; c < 3; c++) {
        const v = (d[i * 4 + c] - (1 - a) * 255) / a;
        out[i * 4 + c] = Math.max(0, Math.min(255, Math.round(v)));
      }
      out[i * 4 + 3] = Math.round(a * 255);
    }
  return { d: out, w, h };
}

/** 8-connected components of opaque pixels */
function components(img, minArea = 40) {
  const { d, w, h } = img;
  const n = w * h;
  const label = new Int32Array(n);
  const comps = [];
  for (let s = 0; s < n; s++) {
    if (label[s] || d[s * 4 + 3] === 0) continue;
    const id = comps.length + 1;
    const q = [s];
    label[s] = id;
    let x0 = w,
      y0 = h,
      x1 = 0,
      y1 = 0,
      sx = 0,
      sy = 0;
    for (let k = 0; k < q.length; k++) {
      const i = q[k];
      const x = i % w,
        y = (i / w) | 0;
      sx += x;
      sy += y;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx,
            yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const j = yy * w + xx;
          if (label[j] || d[j * 4 + 3] === 0) continue;
          label[j] = id;
          q.push(j);
        }
    }
    comps.push({ id, area: q.length, x0, y0, x1, y1, cx: sx / q.length, cy: sy / q.length, ok: q.length >= minArea });
  }
  return { label, comps };
}

/** Split a sheet into grid cells: every component goes to the cell containing its centroid */
function splitGrid(img, cols, rows) {
  const { d, w, h } = img;
  const { label, comps } = components(img);
  const cells = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) cells.push({ ids: new Set(), x0: w, y0: h, x1: 0, y1: 0 });
  for (const cp of comps) {
    if (!cp.ok) continue;
    const c = Math.min(cols - 1, Math.floor(cp.cx / (w / cols)));
    const r = Math.min(rows - 1, Math.floor(cp.cy / (h / rows)));
    const cell = cells[r * cols + c];
    cell.ids.add(cp.id);
    cell.x0 = Math.min(cell.x0, cp.x0);
    cell.y0 = Math.min(cell.y0, cp.y0);
    cell.x1 = Math.max(cell.x1, cp.x1);
    cell.y1 = Math.max(cell.y1, cp.y1);
  }
  return cells.map((cell) => {
    const cw = cell.x1 - cell.x0 + 1,
      ch = cell.y1 - cell.y0 + 1;
    if (cw <= 0 || ch <= 0) return null;
    const o = Buffer.alloc(cw * ch * 4);
    for (let y = 0; y < ch; y++)
      for (let x = 0; x < cw; x++) {
        const si = (y + cell.y0) * w + (x + cell.x0);
        if (!cell.ids.has(label[si])) continue;
        d.copy(o, (y * cw + x) * 4, si * 4, si * 4 + 4);
      }
    return { d: o, w: cw, h: ch, ox: cell.x0, oy: cell.y0 };
  });
}

function bbox(img) {
  const { d, w, h } = img;
  let x0 = w,
    y0 = h,
    x1 = -1,
    y1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (d[(y * w + x) * 4 + 3] > 24) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  return { x0, y0, x1, y1 };
}

function crop(img, x0, y0, cw, ch) {
  const o = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++) {
    const sy = y + y0;
    if (sy < 0 || sy >= img.h) continue;
    for (let x = 0; x < cw; x++) {
      const sx = x + x0;
      if (sx < 0 || sx >= img.w) continue;
      img.d.copy(o, (y * cw + x) * 4, (sy * img.w + sx) * 4, (sy * img.w + sx) * 4 + 4);
    }
  }
  return { d: o, w: cw, h: ch };
}

/** opaque runs [x0,x1] on a row */
function runs(img, y, minLen = 3) {
  const { d, w } = img;
  const out = [];
  let s = -1;
  for (let x = 0; x <= w; x++) {
    const on = x < w && d[(y * w + x) * 4 + 3] > 40;
    if (on && s < 0) s = x;
    if (!on && s >= 0) {
      if (x - s >= minLen) out.push([s, x - 1]);
      s = -1;
    }
  }
  return out;
}

const raw = (img) => sharp(img.d, { raw: { width: img.w, height: img.h, channels: 4 } });

async function saveWebp(img, path, q = 84) {
  await raw(img).webp({ quality: q, alphaQuality: 92, effort: 6 }).toFile(path);
}

/** Tile images into a contact sheet for visual checks */
async function contact(list, path, { cols = 4, cw = 300, ch = 300, bg = "#6f7fa3" } = {}) {
  const rows = Math.ceil(list.length / cols);
  const layers = [];
  for (let i = 0; i < list.length; i++) {
    if (!list[i]) continue;
    const buf = await raw(list[i])
      .resize({ width: cw - 12, height: ch - 12, fit: "inside" })
      .png()
      .toBuffer({ resolveWithObject: true });
    const c = i % cols,
      r = (i / cols) | 0;
    layers.push({
      input: buf.data,
      left: c * cw + Math.round((cw - buf.info.width) / 2),
      top: r * ch + Math.round((ch - buf.info.height) / 2),
    });
  }
  await sharp({ create: { width: cols * cw, height: rows * ch, channels: 4, background: bg } })
    .composite(layers)
    .jpeg({ quality: 88 })
    .toFile(path);
}

module.exports = { sharp, load, cutout, components, splitGrid, bbox, crop, runs, raw, saveWebp, contact };
