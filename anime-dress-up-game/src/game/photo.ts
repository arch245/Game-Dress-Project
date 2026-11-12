import { DH, DW, TINTS, type Destination, type TintOp } from "./data";
import { IMG } from "./assets";
import { buildLayers, type Outfit } from "./engine";

const cache = new Map<string, Promise<HTMLImageElement>>();
function load(src: string): Promise<HTMLImageElement> {
  let p = cache.get(src);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
    cache.set(src, p);
  }
  return p;
}

/** Same maths as the CSS filter functions, so the saved photo matches the screen in every browser. */
function applyTint(data: Uint8ClampedArray, ops: TintOp[]) {
  for (const op of ops) {
    let m: number[] | null = null;
    let mul = 1;
    let add = 0;
    if (op[0] === "hue") {
      const a = (op[1] * Math.PI) / 180;
      const c = Math.cos(a);
      const s = Math.sin(a);
      m = [
        0.213 + c * 0.787 - s * 0.213,
        0.715 - c * 0.715 - s * 0.715,
        0.072 - c * 0.072 + s * 0.928,
        0.213 - c * 0.213 + s * 0.143,
        0.715 + c * 0.285 + s * 0.14,
        0.072 - c * 0.072 - s * 0.283,
        0.213 - c * 0.213 - s * 0.787,
        0.715 - c * 0.715 + s * 0.715,
        0.072 + c * 0.928 + s * 0.072,
      ];
    } else if (op[0] === "gray") {
      m = [0.2126, 0.7152, 0.0722, 0.2126, 0.7152, 0.0722, 0.2126, 0.7152, 0.0722];
    } else if (op[0] === "bri") {
      mul = op[1];
    } else {
      mul = op[1];
      add = (0.5 - 0.5 * op[1]) * 255;
    }
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (m) {
        data[i] = m[0] * r + m[1] * g + m[2] * b;
        data[i + 1] = m[3] * r + m[4] * g + m[5] * b;
        data[i + 2] = m[6] * r + m[7] * g + m[8] * b;
      } else {
        data[i] = r * mul + add;
        data[i + 1] = g * mul + add;
        data[i + 2] = b * mul + add;
      }
    }
  }
}

function heartPath(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.9);
  ctx.bezierCurveTo(x - s * 1.3, y + s * 0.05, x - s * 0.55, y - s * 0.85, x, y - s * 0.2);
  ctx.bezierCurveTo(x + s * 0.55, y - s * 0.85, x + s * 1.3, y + s * 0.05, x, y + s * 0.9);
  ctx.closePath();
}

/** Compose the outfit in front of the destination as a polaroid-style PNG. */
export async function renderPhoto(outfit: Outfit, dest: Destination, hearts: number): Promise<Blob> {
  const W = 800;
  const H = 1090;
  const PX = 40;
  const PY = 40;
  const PW = W - PX * 2;
  const PH = 840;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");

  try {
    await Promise.all([document.fonts.load('600 46px "Mali"'), document.fonts.load('500 26px "Mitr"')]);
  } catch {
    /* fall back to system fonts */
  }

  ctx.fillStyle = "#fffaf2";
  ctx.fillRect(0, 0, W, H);

  // background (cover)
  const bg = await load(dest.img);
  const bs = Math.max(PW / bg.width, PH / bg.height);
  ctx.save();
  ctx.beginPath();
  ctx.rect(PX, PY, PW, PH);
  ctx.clip();
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bg, PX + (PW - bg.width * bs) / 2, PY + (PH - bg.height * bs) * 0.6, bg.width * bs, bg.height * bs);

  // doll
  const dh = PH * 0.89;
  const s = dh / DH;
  const dx = PX + PW / 2 - (DW * s) / 2;
  const dy = PY + PH * 0.965 - dh;
  ctx.fillStyle = "rgba(59,40,67,0.22)";
  ctx.beginPath();
  ctx.ellipse(PX + PW / 2, dy + dh * 0.992, DW * s * 0.36, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(dx, dy);
  ctx.scale(s, s);
  ctx.drawImage(await load(IMG.doll), 0, 0, DW, DH);
  for (const l of buildLayers(outfit)) {
    const img = await load(l.src);
    const [x, y, w, h] = l.box;
    ctx.save();
    if (l.clipBottom) {
      ctx.beginPath();
      ctx.rect(x, y, w, h * (1 - l.clipBottom));
      ctx.clip();
    }
    for (const poly of l.clips) {
      if (!poly) continue;
      ctx.beginPath();
      poly.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
      ctx.closePath();
      ctx.clip();
    }
    const ops = TINTS[l.tint]?.ops ?? [];
    if (ops.length) {
      const off = document.createElement("canvas");
      off.width = Math.max(1, Math.round(w * s * 1.25));
      off.height = Math.max(1, Math.round(h * s * 1.25));
      const octx = off.getContext("2d");
      if (octx) {
        octx.imageSmoothingQuality = "high";
        octx.drawImage(img, 0, 0, off.width, off.height);
        const data = octx.getImageData(0, 0, off.width, off.height);
        applyTint(data.data, ops);
        octx.putImageData(data, 0, 0);
        ctx.drawImage(off, x, y, w, h);
      }
    } else {
      ctx.drawImage(img, x, y, w, h);
    }
    ctx.restore();
  }
  ctx.restore();

  ctx.strokeStyle = "rgba(59,40,67,0.18)";
  ctx.lineWidth = 2;
  ctx.strokeRect(PX, PY, PW, PH);

  // caption
  ctx.fillStyle = "#3b2843";
  ctx.textBaseline = "alphabetic";
  ctx.font = '600 46px "Mali", "Mitr", sans-serif';
  ctx.fillText(`มิว @ ${dest.name}`, PX + 6, PY + PH + 82);
  ctx.font = '500 25px "Mitr", sans-serif';
  ctx.fillStyle = "#715c7a";
  ctx.fillText("วันนี้ใส่อะไรดี? · เกมแต่งตัวให้มิว", PX + 6, PY + PH + 136);
  for (let i = 0; i < 5; i++) {
    heartPath(ctx, W - PX - 30 - (4 - i) * 46, PY + PH + 118, 17);
    ctx.fillStyle = i < hearts ? "#ff7f8e" : "#f1dfd4";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#3b2843";
    ctx.stroke();
  }

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("export failed"))), "image/png"),
  );
}
