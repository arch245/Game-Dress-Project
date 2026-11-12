// Three extra destinations. The image-generation quota was used up, so these start from stock photos (Pexels)
// that are repainted with a median/glow filter to sit next to the generated anime backgrounds.
//   pool : Zheltenko Oleksandr (pexels 36444900)   gala : Benni Fish (pexels 10509285)   snow : Meike (pexels 29612813)
const fs = require("fs"); const path = require("path"); const { execSync } = require("child_process");
const L = require("./lib.cjs"); const sharp = L.sharp;
const DIR = path.join(__dirname, "out", "bg"); const OUT = path.join(__dirname, "..", "src", "assets");
fs.mkdirSync(DIR, { recursive: true });
const SRC = { pool: 36444900, gala: 10509285, snow: 29612813 };
const W = 600, H = 900;
async function paint(buf, sat = 1.3) {
  const base = await sharp(buf).median(5).modulate({ saturation: sat, brightness: 1.04 }).toBuffer();
  const glow = await sharp(base).blur(10).toBuffer();
  return sharp(base).composite([{ input: glow, blend: "soft-light" }]).toBuffer();
}
(async () => {
  const done = [];
  let n = 5;
  for (const [key, id] of Object.entries(SRC)) {
    const f = path.join(DIR, `${key}.jpg`);
    if (!fs.existsSync(f)) execSync(`curl -sL --max-time 60 -o "${f}" "https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800"`);
    let buf = await sharp(f).resize(W, H, { fit: "cover", position: key === "snow" ? "bottom" : "centre" }).png().toBuffer();
    let deck = null;
    if (key === "pool") {
      // a sun deck in the foreground so the character has somewhere to stand
      const y0 = 742;
      let planks = "";
      for (let y = y0 + 22, step = 14; y < H; y += step, step *= 1.3) planks += `<line x1="0" y1="${y.toFixed(1)}" x2="${W}" y2="${y.toFixed(1)}" stroke="#b08f66" stroke-width="2.6" opacity="0.75"/>`;
      for (let k = -7; k <= 7; k++) planks += `<line x1="${W / 2 + k * 46 + 23}" y1="${y0 + 12}" x2="${W / 2 + k * 150 + 75}" y2="${H}" stroke="#b99a72" stroke-width="1.8" opacity="0.5"/>`;
      deck = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ecd9b8"/><stop offset="1" stop-color="#d2b78f"/></linearGradient></defs>
        <rect x="0" y="${y0}" width="${W}" height="${H - y0}" fill="url(#g)"/>${planks}
        <rect x="0" y="${y0 - 8}" width="${W}" height="18" fill="#fdf8ee"/><rect x="0" y="${y0 + 10}" width="${W}" height="7" fill="#9c8160" opacity="0.45"/></svg>`;
    }
    let out = await paint(buf, key === "gala" ? 1.15 : 1.3);
    if (deck) out = await sharp(out).composite([{ input: Buffer.from(deck) }]).blur(0.4).toBuffer();
    await sharp(out).resize(560, 840).webp({ quality: 80, effort: 6 }).toFile(path.join(OUT, `place${n++}.webp`));
    const { data, info } = await sharp(out).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    done.push({ d: data, w: info.width, h: info.height });
  }
  await L.contact(done, path.join(__dirname, "out", "x_bg.jpg"), { cols: 3, cw: 420, ch: 620, bg: "#222" });
  console.log("backgrounds ok");
})();
