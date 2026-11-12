// Step 1: cut out the doll + every clothing sheet, slice backgrounds, print measurements
const fs = require("fs");
const path = require("path");
const L = require("./lib.cjs");

const RAW = path.join(__dirname, "..", "raw");
const OUT = path.join(__dirname, "..", "src", "assets");
const TMP = path.join(__dirname, "out");
fs.mkdirSync(path.join(OUT, "items"), { recursive: true });
fs.mkdirSync(TMP, { recursive: true });

const SHEETS = [
  { key: "top", file: "tops.png", cols: 4, rows: 2 },
  { key: "bottom", file: "bottoms.png", cols: 4, rows: 2 },
  { key: "dress", file: "dresses.png", cols: 4, rows: 2 },
  { key: "outer", file: "outer.png", cols: 3, rows: 2 },
  { key: "shoes", file: "shoes.png", cols: 4, rows: 2 },
  { key: "acc", file: "acc.png", cols: 5, rows: 2, holes: true },
];

const fmtRuns = (rs) => rs.map((r) => `${r[0]}-${r[1]}`).join(" ");

(async () => {
  const meta = { doll: null, items: {} };

  // ---------- doll ----------
  const dollRaw = await L.load(path.join(RAW, "doll.png"));
  console.log("doll corner px", dollRaw.d[0], dollRaw.d[1], dollRaw.d[2]);
  const dollCut = L.cutout(dollRaw, { T: 240 });
  const bb = L.bbox(dollCut);
  const pad = 8;
  const ox = bb.x0 - pad,
    oy = bb.y0 - pad;
  const doll = L.crop(dollCut, ox, oy, bb.x1 - bb.x0 + 1 + pad * 2, bb.y1 - bb.y0 + 1 + pad * 2);
  await L.saveWebp(doll, path.join(OUT, "doll.webp"), 88);
  await L.raw(doll).png().toFile(path.join(TMP, "doll.png"));
  meta.doll = { w: doll.w, h: doll.h, ox, oy };
  console.log("DOLL", meta.doll);
  for (let y = 0; y < doll.h; y += 20) console.log("  y", y, fmtRuns(L.runs(doll, y)));
  console.log("  -- neck detail");
  for (let y = 220; y <= 320; y += 6) console.log("  y", y, fmtRuns(L.runs(doll, y)));
  console.log("  -- feet detail");
  for (let y = doll.h - 130; y < doll.h - 6; y += 10) console.log("  y", y, fmtRuns(L.runs(doll, y)));
  await L.contact([doll], path.join(TMP, "c_doll.jpg"), { cols: 1, cw: 560, ch: 1200 });

  // ---------- clothing sheets ----------
  for (const s of SHEETS) {
    const img = await L.load(path.join(RAW, s.file));
    const cut = L.cutout(img, { T: 238, holes: !!s.holes });
    const parts = L.splitGrid(cut, s.cols, s.rows);
    console.log(`\n== ${s.key}: ${parts.filter(Boolean).length} items`);
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (!p) continue;
      const id = `${s.key}${i + 1}`;
      await L.saveWebp(p, path.join(OUT, "items", `${id}.webp`), 84);
      await L.raw(p).png().toFile(path.join(TMP, `${id}.png`));
      const prof = [0.03, 0.1, 0.2, 0.35, 0.5, 0.75, 0.96].map((f) => {
        const y = Math.min(p.h - 1, Math.round(f * p.h));
        return `${Math.round(f * 100)}%:[${fmtRuns(L.runs(p, y))}]`;
      });
      meta.items[id] = { w: p.w, h: p.h };
      console.log(`  ${id} ${p.w}x${p.h}  ${prof.join("  ")}`);
    }
    await L.contact(parts, path.join(TMP, `c_${s.key}.jpg`), { cols: s.cols, cw: 330, ch: 330 });
  }

  // ---------- backgrounds ----------
  await L.sharp(path.join(RAW, "room.png")).resize({ width: 1400 }).webp({ quality: 78, effort: 6 }).toFile(path.join(OUT, "room.webp"));
  const pl = await L.sharp(path.join(RAW, "places.png")).metadata();
  const hw = Math.floor(pl.width / 2),
    hh = Math.floor(pl.height / 2);
  const inset = 10;
  let k = 1;
  for (let r = 0; r < 2; r++)
    for (let c = 0; c < 2; c++) {
      await L.sharp(path.join(RAW, "places.png"))
        .extract({ left: c * hw + inset, top: r * hh + inset, width: hw - inset * 2, height: hh - inset * 2 })
        .webp({ quality: 80, effort: 6 })
        .toFile(path.join(OUT, `place${k++}.webp`));
    }

  fs.writeFileSync(path.join(TMP, "meta.json"), JSON.stringify(meta, null, 1));
  console.log("\nsizes:");
  let total = 0;
  const walk = (dir) => {
    for (const f of fs.readdirSync(dir)) {
      const p = path.join(dir, f);
      const st = fs.statSync(p);
      if (st.isDirectory()) walk(p);
      else total += st.size;
    }
  };
  walk(OUT);
  console.log("  total assets KB", Math.round(total / 1024));
})();
