import {
  DEST,
  FULL_SLOTS,
  ITEM,
  ITEMS,
  PARTS,
  PLACE,
  TINTS,
  VIBES,
  type DestId,
  type Destination,
  type Item,
  type Slot,
  type Vibe,
} from "./data";
import { IMG, itemSrc } from "./assets";

export interface Outfit {
  worn: Partial<Record<Slot, string>>;
  /** item id → index in TINTS */
  tints: Record<string, number>;
  /** top tucked into skirt / pants */
  tuck: boolean;
}

export const EMPTY_OUTFIT: Outfit = { worn: {}, tints: {}, tuck: false };

const SLOTS: Slot[] = ["shoes", "bottom", "top", "dress", "swim", "gown", "outer", "neck", "bag", "hat", "eyes"];
const ACC_SLOTS: Slot[] = ["hat", "eyes", "neck", "bag"];
const Z: Record<Slot, number> = {
  shoes: 10,
  bottom: 20,
  top: 30,
  dress: 40,
  swim: 40,
  gown: 40,
  outer: 50,
  neck: 58,
  bag: 60,
  eyes: 80,
  hat: 90,
};
const Z_NECK = 55;
const Z_HAND = 61;
const Z_HEAD = 70;

export const pick = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)];
export const wornItems = (o: Outfit): Item[] => SLOTS.map((s) => o.worn[s]).flatMap((id) => (id && ITEM[id] ? [ITEM[id]] : []));
export const wornCount = (o: Outfit) => wornItems(o).length;

/** Put an item on (or take it off if already worn) and resolve conflicts between slots. */
export function toggleWear(o: Outfit, it: Item): Outfit {
  const worn = { ...o.worn };
  if (worn[it.slot] === it.id) {
    delete worn[it.slot];
    return { ...o, worn };
  }
  worn[it.slot] = it.id;
  if (FULL_SLOTS.includes(it.slot)) {
    // a one-piece outfit replaces the other one-pieces, the bottom and (unless it is a pinafore) the top
    for (const s of FULL_SLOTS) if (s !== it.slot) delete worn[s];
    delete worn.bottom;
    if (!it.layerable) delete worn.top;
  }
  if (it.slot === "top")
    for (const s of FULL_SLOTS) {
      const id = worn[s];
      if (id && !ITEM[id]?.layerable) delete worn[s];
    }
  if (it.slot === "bottom") for (const s of FULL_SLOTS) delete worn[s];
  return { ...o, worn };
}

export function removeSlot(o: Outfit, slot: Slot): Outfit {
  const worn = { ...o.worn };
  delete worn[slot];
  return { ...o, worn };
}

// ---------- rendering model (shared by the DOM doll and the photo canvas) ----------
type Poly = number[][];
export interface Layer {
  key: string;
  src: string;
  /** x, y, w, h in doll pixels */
  box: number[];
  z: number;
  tint: number;
  /** fraction of the sprite hidden from the bottom */
  clipBottom: number;
  /** [under-jacket clip, tuck-in clip] polygons in doll pixels */
  clips: [Poly | null, Poly | null];
  animate: boolean;
}

const FAR = 2400;
const CENTER = 263;
/** shoulders-wide column: under a jacket, inner sleeves outside of it are hidden */
const COL_L = 130;
const COL_R = 396;

export function buildLayers(o: Outfit): Layer[] {
  const out: Layer[] = [];
  const outer = o.worn.outer ? ITEM[o.worn.outer] : undefined;
  const hasSleevedOuter = !!outer && !outer.vest;
  const bottom = o.worn.bottom ? ITEM[o.worn.bottom] : undefined;
  const tucked = o.tuck && !!bottom && !!o.worn.top;

  for (const slot of SLOTS) {
    const id = o.worn[slot];
    const it = id ? ITEM[id] : undefined;
    if (!id || !it || !PLACE[id]) continue;
    const [cx, top, w, h, clipBottom = 0] = PLACE[id];
    let underJacket: Poly | null = null;
    let tuckIn: Poly | null = null;
    if (hasSleevedOuter && (slot === "top" || FULL_SLOTS.includes(slot))) {
      const yc = slot === "top" ? 720 : 600;
      underJacket = [
        [COL_L, -FAR],
        [COL_R, -FAR],
        [COL_R, yc],
        [FAR, yc],
        [FAR, FAR * 2],
        [-FAR, FAR * 2],
        [-FAR, yc],
        [COL_L, yc],
      ];
    }
    if (tucked && slot === "top" && bottom) {
      const bt = PLACE[bottom.id][1];
      const half = (bottom.waist ?? 195) / 2 - 3;
      const yA = bt - 26;
      const yB = bt + 12;
      tuckIn = [
        [-FAR, -FAR],
        [FAR, -FAR],
        [FAR, yA],
        [CENTER + 400, yA],
        [CENTER + half, yB],
        [CENTER - half, yB],
        [CENTER - 400, yA],
        [-FAR, yA],
      ];
    }
    out.push({
      key: `${slot}:${id}`,
      src: itemSrc(id),
      box: [cx - w / 2, top, w, h],
      z: it.z ?? Z[slot],
      tint: o.tints[id] ?? 0,
      clipBottom,
      clips: [underJacket, tuckIn],
      animate: true,
    });
    if (it.hand) out.push(part("hand", IMG.hand, PARTS.hand, Z_HAND));
  }
  out.push(part("neck", IMG.neck, PARTS.neck, Z_NECK));
  out.push(part("head", IMG.head, PARTS.head, Z_HEAD));
  return out.sort((a, b) => a.z - b.z);
}

const part = (key: string, src: string, box: number[], z: number): Layer => ({
  key,
  src,
  box,
  z,
  tint: 0,
  clipBottom: 0,
  clips: [null, null],
  animate: false,
});

// ---------- game rules ----------
export type DressState = "ok" | "none" | "noBottom" | "noTop";
export function dressState(o: Outfit): DressState {
  const { top, bottom } = o.worn;
  if (FULL_SLOTS.some((s) => o.worn[s]) || (top && bottom)) return "ok";
  if (top) return "noBottom";
  if (bottom) return "noTop";
  return "none";
}

export const NOT_READY_LINE: Record<Exclude<DressState, "ok">, string> = {
  none: "เดี๋ยวก่อน! ยังอยู่ในชุดอยู่บ้านอยู่เลย เลือกชุดให้หน่อยน้า",
  noBottom: "ยังไม่ได้ใส่กระโปรงหรือกางเกงเลยนะ!",
  noTop: "เอ๊ะ ลืมใส่เสื้อไปหรือเปล่า?",
};

export const primaryVibe = (it: Item): Vibe =>
  (Object.entries(it.vibes) as [Vibe, number][]).sort((a, b) => b[1] - a[1])[0][0];

export function randomOutfit(): Outfit {
  const of = (s: Slot) => ITEMS.filter((i) => i.slot === s);
  const worn: Outfit["worn"] = {};
  const roll = Math.random();
  if (roll < 0.13) worn.swim = pick(of("swim")).id;
  else if (roll < 0.26) worn.gown = pick(of("gown")).id;
  else if (roll < 0.56) {
    const d = pick(of("dress"));
    worn.dress = d.id;
    if (d.layerable) worn.top = pick(of("top")).id;
  } else {
    worn.top = pick(of("top")).id;
    worn.bottom = pick(of("bottom")).id;
  }
  worn.shoes = pick(of("shoes")).id;
  if (!worn.gown && Math.random() < 0.35) worn.outer = pick(of("outer")).id;
  if (Math.random() < 0.45) worn.hat = pick(of("hat")).id;
  if (Math.random() < 0.25) worn.eyes = pick(of("eyes")).id;
  if (Math.random() < 0.2) worn.neck = pick(of("neck")).id;
  if (Math.random() < 0.45) worn.bag = pick(of("bag")).id;
  const tints: Outfit["tints"] = {};
  for (const id of Object.values(worn)) if (id && Math.random() < 0.25) tints[id] = 1 + Math.floor(Math.random() * 6);
  return { worn, tints, tuck: !!worn.top && !!worn.bottom && Math.random() < 0.4 };
}

export interface Verdict {
  score: number;
  hearts: number;
  title: string;
  comment: string;
  tips: string[];
  vibes: { vibe: Vibe; pct: number }[];
}

const TITLES = ["", "เอ่อ… จะดีเหรอ?", "แปลกตาไปหน่อยนะ", "ก็น่ารักดีนะ", "ลงตัวมากเลย!", "เพอร์เฟกต์ที่สุด!"];

/** How well does the outfit suit the destination? */
export function evaluate(o: Outfit, dest: Destination): Verdict {
  const totals: Record<Vibe, number> = { sweet: 0, casual: 0, chic: 0, street: 0, breezy: 0, cozy: 0, swim: 0, glam: 0 };
  let pts = 0;
  let fit = 0;
  for (const it of wornItems(o))
    for (const [v, p] of Object.entries(it.vibes) as [Vibe, number][]) {
      totals[v] += p;
      pts += p;
      fit += p * dest.love[v];
    }
  const match = pts ? fit / pts : 0;
  const acc = ACC_SLOTS.filter((s) => o.worn[s]).length;
  const ranked = (Object.keys(totals) as Vibe[]).filter((v) => totals[v] > 0).sort((a, b) => totals[b] - totals[a]);
  const lead = ranked[0];
  const share = (v: Vibe) => (pts ? totals[v] / pts : 0);
  const waterPlace = dest.love.swim > 0;
  const barefootOk = waterPlace && !!o.worn.swim;

  let score = 38 + match * 50 + Math.min(acc, 3) * 3;
  if (o.worn.outer) score += 2;
  if (!o.worn.shoes && !barefootOk) score -= 15;
  if (lead && share(lead) >= 0.5) score += 4;
  score = Math.round(Math.max(5, Math.min(100, score)));
  const hearts = score >= 88 ? 5 : score >= 72 ? 4 : score >= 55 ? 3 : score >= 38 ? 2 : 1;

  let tips: string[] = [];
  if (!o.worn.shoes && !barefootOk) tips.push("ลืมใส่รองเท้า! เดินเท้าเปล่าออกจากบ้านไม่ได้นะ");
  if (o.worn.swim && !waterPlace) tips.push("ชุดว่ายน้ำเก็บไว้ใส่ที่ทะเลหรือสระน้ำดีกว่านะ");
  if (dest.id === "pool" && !o.worn.swim) tips.push("จะลงสระต้องใส่ชุดว่ายน้ำ ลองดูในหมวด “ว่ายน้ำ” สิ");
  if (dest.id === "gala" && !o.worn.gown && share("glam") < 0.4) tips.push("งานกาล่าเหมาะกับชุดราตรีที่สุด ลองดูในหมวด “ราตรี” สิ");
  if (dest.love.cozy < 0 && share("cozy") >= 0.25) tips.push("ใส่หนาไป ที่นี่ร้อนมาก ลองถอดชิ้นอุ่น ๆ ออกดูนะ");
  if (dest.love.breezy < -0.3 && share("breezy") + share("swim") >= 0.3)
    tips.push("ชุดบางไปสำหรับอากาศหนาว เพิ่มเสื้อคลุมหรือชิ้นอุ่น ๆ หน่อยนะ");
  const fav = (Object.keys(dest.love) as Vibe[]).sort((a, b) => dest.love[b] - dest.love[a])[0];
  if (tips.length < 2 && lead && dest.love[lead] < 0.6)
    tips.push(`ที่นี่เข้ากับสไตล์ “${VIBES[fav].label}” มากกว่า ลองเปลี่ยนสักชิ้นดูสิ`);
  if (acc === 0) tips.push("เพิ่มหมวก กระเป๋า หรือเครื่องประดับสักชิ้น ลุคจะดูครบขึ้น");
  tips = tips.slice(0, 2);
  if (hearts === 5 || tips.length === 0) tips = ["ไม่มีอะไรต้องแก้แล้ว ออกเดินทางได้เลย!"];

  return {
    score,
    hearts,
    title: TITLES[hearts],
    comment: hearts >= 4 ? dest.hi : hearts === 3 ? dest.mid : dest.low,
    tips,
    vibes: ranked.slice(0, 3).map((vibe) => ({ vibe, pct: Math.round(share(vibe) * 100) })),
  };
}

// ---------- persistence ----------
const KEY = "miu-dressup-v1";

export function loadState(): { outfit: Outfit; dest: DestId } {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (raw && typeof raw === "object") {
      const worn: Outfit["worn"] = {};
      for (const s of SLOTS) {
        const id = raw.worn?.[s];
        if (typeof id === "string" && ITEM[id]?.slot === s) worn[s] = id;
      }
      const tints: Outfit["tints"] = {};
      for (const [id, t] of Object.entries(raw.tints ?? {}))
        if (ITEM[id] && typeof t === "number" && TINTS[t]) tints[id] = t;
      return { outfit: { worn, tints, tuck: !!raw.tuck }, dest: DEST[raw.dest as DestId] ? raw.dest : "cafe" };
    }
  } catch {
    /* ignore broken storage */
  }
  return { outfit: EMPTY_OUTFIT, dest: "cafe" };
}

export function saveState(outfit: Outfit, dest: DestId) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...outfit, dest }));
  } catch {
    /* storage unavailable */
  }
}
