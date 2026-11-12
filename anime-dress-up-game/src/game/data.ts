import placements from "./placements.json";
import parts from "./parts.json";
import { IMG } from "./assets";

/** Doll artwork size – every placement below is expressed in these pixels. */
export const DW = placements.doll[0];
export const DH = placements.doll[1];
/** [centerX, top, width, height, clipBottom?] */
export const PLACE = placements.items as Record<string, number[]>;
/** [x, y, width, height] */
export const PARTS = parts as Record<"head" | "neck" | "hand", number[]>;
const WAIST = placements.waist as Record<string, number>;

export type Slot = "top" | "bottom" | "dress" | "swim" | "gown" | "outer" | "shoes" | "hat" | "eyes" | "neck" | "bag";
export type TabId = "top" | "bottom" | "dress" | "gown" | "swim" | "outer" | "shoes" | "acc";
export type Vibe = "sweet" | "casual" | "chic" | "street" | "breezy" | "cozy" | "swim" | "glam";

/** one-piece outfits: they replace top + bottom and each other */
export const FULL_SLOTS: Slot[] = ["dress", "swim", "gown"];

export interface Item {
  id: string;
  slot: Slot;
  name: string;
  vibes: Partial<Record<Vibe, number>>;
  /** dress that can be layered over a top (pinafore) */
  layerable?: boolean;
  /** waistband width on the doll, used when a top is tucked in */
  waist?: number;
  /** custom stacking order */
  z?: number;
  /** held in the hand → the hand is drawn over it */
  hand?: boolean;
  /** sleeveless outerwear → the sleeves of the top underneath stay visible */
  vest?: boolean;
}

const item = (
  id: string,
  slot: Slot,
  name: string,
  vibes: Item["vibes"],
  extra: Partial<Item> = {},
): Item => ({ id, slot, name, vibes, waist: WAIST[id], ...extra });

export const ITEMS: Item[] = [
  // ---- tops
  item("top1", "top", "เสื้อยืดลายทาง", { casual: 2, breezy: 1 }),
  item("top2", "top", "เบลาส์ระบายสีชมพู", { sweet: 2, chic: 1 }),
  item("top3", "top", "เสื้อคอกะลาสี", { sweet: 2, casual: 1 }),
  item("top4", "top", "ฮู้ดดี้ตัวโคร่ง", { casual: 2, cozy: 1, street: 1 }),
  item("top5", "top", "เสื้อครอปลายดาว", { street: 2, breezy: 1 }),
  item("top6", "top", "เสื้อเปิดไหล่ระบาย", { breezy: 2, sweet: 1 }),
  item("top7", "top", "เสื้อกั๊กไหมพรมลายข้าวหลามตัด", { chic: 2, cozy: 1 }),
  item("top8", "top", "สเวตเตอร์ไหมพรมถัก", { cozy: 2, casual: 1 }),
  item("top9", "top", "เสื้อกะลาสีแขนกุด", { sweet: 2, breezy: 1 }),
  item("top10", "top", "เสื้อกล้ามลายฮาวาย", { breezy: 2, casual: 1 }),
  item("top11", "top", "เสื้อกีฬาซิปหน้า", { casual: 2, street: 1 }),
  item("top12", "top", "บัสเทียร์ลายจุด", { breezy: 2, sweet: 1 }),
  item("top13", "top", "เสื้อกะลาสีครอปสีกรม", { sweet: 2, casual: 1 }),
  item("top14", "top", "เชิ้ตครอปลายจุดย้อนยุค", { chic: 2, sweet: 1 }),
  item("top15", "top", "เสื้อครอปแขนพองลายตาราง", { sweet: 2, breezy: 1 }),
  item("top16", "top", "เสื้อสายเดี่ยวปักเลื่อม", { glam: 2, chic: 1 }),
  item("top17", "top", "เสื้อเปิดไหล่ผ้าซาติน", { chic: 2, glam: 1 }),
  item("top18", "top", "เสื้อคล้องคอสีดำ", { chic: 2, street: 1 }),
  // ---- bottoms
  item("bottom1", "bottom", "กระโปรงพลีทลายสก็อต", { sweet: 2, chic: 1 }, { waist: 175 }),
  item("bottom2", "bottom", "ยีนส์ขาสั้นพับขา", { breezy: 2, casual: 1 }, { waist: 199 }),
  item("bottom3", "bottom", "ยีนส์ขากว้าง", { casual: 2, street: 1 }, { waist: 212 }),
  item("bottom4", "bottom", "กระโปรงยาวลายดอกไม้", { sweet: 2, breezy: 1 }, { waist: 209 }),
  item("bottom5", "bottom", "กระโปรงระบายสามชั้น", { sweet: 2 }, { waist: 175 }),
  item("bottom6", "bottom", "กระโปรงหนังสั้น", { street: 2, chic: 1 }, { waist: 209 }),
  item("bottom7", "bottom", "สแล็กส์ขากว้าง", { chic: 2, casual: 1 }, { waist: 210 }),
  item("bottom8", "bottom", "กางเกงคาร์โก้", { street: 2, casual: 1 }, { waist: 200 }),
  item("bottom9", "bottom", "กระโปรงยีนส์ทรงเอ", { casual: 2, sweet: 1 }),
  item("bottom10", "bottom", "กระโปรงบานกะลาสี", { sweet: 2, chic: 1 }),
  item("bottom11", "bottom", "กระโปรงวงกลมลายจุด", { chic: 2, sweet: 1 }),
  item("bottom12", "bottom", "กระโปรงระบายลายตาราง", { sweet: 2, breezy: 1 }),
  item("bottom13", "bottom", "กระโปรงลายเดซี่ผูกโบว์", { breezy: 2, sweet: 1 }),
  item("bottom14", "bottom", "กางเกงขาสั้นกีฬา", { casual: 2, breezy: 1 }),
  item("bottom15", "bottom", "กางเกงขาสั้นลายฮาวาย", { breezy: 2, casual: 1 }),
  item("bottom16", "bottom", "กระโปรงพลีทจิ๋ว", { sweet: 2, street: 1 }),
  item("bottom17", "bottom", "กระโปรงดินสอแต่งระบาย", { chic: 3 }),
  item("bottom18", "bottom", "กระโปรงทูลล์ประกายดาว", { glam: 2, chic: 1 }),
  // ---- dresses
  item("dress1", "dress", "เดรสสายเดี่ยวลายเดซี่", { breezy: 3, sweet: 2 }),
  item("dress2", "dress", "เดรสกะลาสี", { sweet: 3, casual: 1 }),
  item("dress3", "dress", "เดรสดำสุดหรู", { chic: 4, street: 1 }),
  item("dress4", "dress", "เดรสโลลิต้าหวานแหวว", { sweet: 4 }),
  item("dress5", "dress", "เอี๊ยมกระโปรงยีนส์", { casual: 2, sweet: 1 }, { layerable: true }),
  item("dress6", "dress", "เดรสลายจุดย้อนยุค", { chic: 2, sweet: 2 }),
  item("dress7", "dress", "เดรสยาวชีฟองลาเวนเดอร์", { chic: 3, breezy: 1 }),
  item("dress8", "dress", "เดรสลายตารางปิกนิก", { sweet: 2, breezy: 2, casual: 1 }),
  item("dress9", "dress", "เดรสเกาะอกเข้ารูป", { chic: 3, glam: 1 }),
  item("dress10", "dress", "เดรสสั้นประกายดาว", { glam: 2, sweet: 2 }),
  item("dress11", "dress", "เดรสสลิปปักเลื่อม", { glam: 2, street: 2 }),
  item("dress12", "dress", "เดรสค็อกเทลเปิดไหล่", { chic: 3, glam: 1 }),
  item("dress13", "dress", "เดรสทูลล์ฟูฟ่อง", { sweet: 4 }),
  item("dress14", "dress", "เดรสไหล่เดียวสีไวน์", { chic: 3, glam: 1 }),
  item("dress15", "dress", "เดรสเทพีกรีกสั้น", { breezy: 2, chic: 2 }),
  item("dress16", "dress", "เดรสไหมพรมถัก", { cozy: 3, casual: 1 }),
  item("dress17", "dress", "เดรสเสื้อยืดลายดาว", { street: 2, casual: 2 }),
  item("dress18", "dress", "เดรสเปิดไหล่ระบาย", { breezy: 2, sweet: 2 }),
  // ---- evening gowns
  item("gown1", "gown", "ราตรีหางปลาสีแดง", { glam: 5, chic: 2 }),
  item("gown2", "gown", "ราตรีทูลล์ประกายดาว", { glam: 5, sweet: 1 }),
  item("gown3", "gown", "ราตรีปักเลื่อมสีทอง", { glam: 5, chic: 1 }),
  item("gown4", "gown", "ราตรีเปิดไหล่สีเขียวมรกต", { glam: 5, chic: 2 }),
  item("gown5", "gown", "ราตรีเจ้าหญิงสีชมพู", { glam: 5, sweet: 2 }),
  item("gown6", "gown", "ราตรีไหล่เดียวสีดำ", { glam: 5, chic: 2 }),
  item("gown7", "gown", "ราตรีเทพีกรีก", { glam: 5, breezy: 1 }),
  // ---- swimsuits
  item("swim1", "swim", "ชุดว่ายน้ำสปอร์ตขาสั้น", { swim: 5, casual: 1 }),
  item("swim2", "swim", "ทูพีซระบายสีชมพู", { swim: 5, sweet: 2 }),
  item("swim3", "swim", "แทงกินีลายฮาวาย", { swim: 5, breezy: 2 }),
  item("swim4", "swim", "ชุดว่ายน้ำกะลาสี", { swim: 5, sweet: 2 }),
  item("swim5", "swim", "วันพีซคล้องคอสีดำ", { swim: 5, chic: 2 }),
  item("swim6", "swim", "ทูพีซเอวสูงลายจุด", { swim: 5, sweet: 1, breezy: 1 }),
  item("swim7", "swim", "แรชการ์ดกับกางเกงขาสั้น", { swim: 5, casual: 2 }),
  // ---- outerwear
  item("outer1", "outer", "แจ็กเก็ตยีนส์", { casual: 2, street: 1 }),
  item("outer2", "outer", "คาร์ดิแกนไหมพรม", { cozy: 2, sweet: 1 }),
  item("outer3", "outer", "เทรนช์โค้ต", { chic: 2, cozy: 1 }),
  item("outer4", "outer", "แจ็กเก็ตหนังไบค์เกอร์", { street: 3 }),
  item("outer5", "outer", "แจ็กเก็ตเบสบอล", { street: 2, casual: 1 }),
  item("outer6", "outer", "เสื้อกันฝนสีเหลือง", { casual: 1, cozy: 1 }),
  item("outer7", "outer", "เสื้อกั๊กยีนส์", { casual: 2, street: 1 }, { vest: true }),
  item("outer8", "outer", "เสื้อกั๊กหนังไบค์เกอร์", { street: 3 }, { vest: true }),
  item("outer9", "outer", "เสื้อกั๊กไหมพรมตัวยาว", { cozy: 2, casual: 1 }, { vest: true }),
  item("outer10", "outer", "เสื้อกั๊กยาวทรงเทรนช์", { chic: 2, street: 1 }, { vest: true }),
  item("outer11", "outer", "คาร์ดิแกนครอป", { sweet: 2, cozy: 1 }),
  item("outer12", "outer", "แจ็กเก็ตเทรนช์ตัวสั้น", { chic: 2, casual: 1 }),
  item("outer13", "outer", "โค้ตลายสก็อต", { cozy: 2, chic: 1 }),
  item("outer14", "outer", "แจ็กเก็ตลายพราง", { street: 3 }),
  item("outer15", "outer", "เสื้อกันฝนใส", { casual: 1, street: 1 }),
  item("outer16", "outer", "ฮู้ดดี้ซิปหน้า", { casual: 2, cozy: 1 }),
  // ---- shoes
  item("shoes1", "shoes", "ผ้าใบสีครีม", { casual: 2 }),
  item("shoes2", "shoes", "ผ้าใบหุ้มข้อสีแดง", { street: 2, casual: 1 }),
  item("shoes3", "shoes", "แมรี่เจนกับถุงเท้าระบาย", { sweet: 2 }),
  item("shoes4", "shoes", "รองเท้าแตะรัดส้น", { breezy: 2 }),
  item("shoes5", "shoes", "ส้นสูงสีชมพู", { chic: 2, sweet: 1 }),
  item("shoes6", "shoes", "บูตหุ้มข้อผูกเชือก", { chic: 1, cozy: 1 }),
  item("shoes7", "shoes", "บูตยาวสีดำ", { street: 2, chic: 1 }),
  item("shoes8", "shoes", "บูตกันฝน", { casual: 1, cozy: 1 }),
  item("shoes9", "shoes", "ผ้าใบพื้นหนา", { casual: 2, street: 1 }),
  item("shoes10", "shoes", "แมรี่เจนพื้นหนา", { street: 2, sweet: 1 }),
  item("shoes11", "shoes", "รองเท้าแตะหูหนีบ", { breezy: 2, swim: 1 }),
  item("shoes12", "shoes", "บูตสั้นสีดำ", { street: 2, chic: 1 }),
  item("shoes13", "shoes", "บูตยาวเหนือเข่า", { street: 2, glam: 1 }),
  item("shoes14", "shoes", "ส้นสูงกับถุงน่องดำ", { chic: 2, glam: 1 }),
  item("shoes15", "shoes", "ผ้าใบกับถุงเท้ายาวลายทาง", { casual: 2, sweet: 1 }),
  item("shoes16", "shoes", "บูตกันฝนสั้นลายจุด", { casual: 1, sweet: 1 }),
  item("shoes17", "shoes", "รองเท้าบัลเลต์ผูกริบบิ้น", { sweet: 2, glam: 1 }),
  item("shoes18", "shoes", "ส้นสูงสีทองรัดข้อ", { glam: 2, chic: 1 }),
  // ---- accessories
  item("acc1", "hat", "หมวกสานปีกกว้าง", { breezy: 2 }, { z: 65 }),
  item("acc2", "hat", "หมวกเบเร่ต์", { chic: 1, sweet: 1 }),
  item("acc3", "hat", "หมวกแก๊ป", { street: 1, casual: 1 }),
  item("acc4", "hat", "หมวกไหมพรมปอมปอม", { cozy: 2 }),
  item("acc5", "hat", "โบว์คาดผม", { sweet: 2 }),
  item("acc11", "hat", "มงกุฎเทียร่า", { glam: 2 }),
  item("acc12", "hat", "มงกุฎดอกไม้", { sweet: 1, breezy: 1 }),
  item("acc13", "hat", "ที่คาดผมหูแมว", { sweet: 1, street: 1 }),
  item("acc14", "hat", "แว่นว่ายน้ำคาดหัว", { swim: 2 }),
  item("acc6", "eyes", "แว่นกรอบกลม", { chic: 1, casual: 1 }),
  item("acc7", "eyes", "แว่นกันแดดหัวใจ", { breezy: 1, street: 1 }),
  item("acc15", "eyes", "แว่นกรอบดำ", { chic: 1, casual: 1 }),
  item("acc8", "neck", "ผ้าพันคอลายสก็อต", { cozy: 2 }),
  item("acc16", "neck", "สร้อยคอมุก", { glam: 1, chic: 1 }),
  item("acc17", "neck", "โบว์ผูกคอ", { sweet: 1, chic: 1 }),
  item("acc18", "neck", "พวงมาลัยดอกไม้ฮาวาย", { breezy: 1, swim: 1 }),
  item("acc9", "bag", "กระเป๋าสะพายหนัง", { chic: 1, casual: 1 }),
  item("acc10", "bag", "ถุงผ้าลายดอก", { casual: 1, breezy: 1 }, { hand: true }),
  item("acc19", "bag", "กระเป๋าคลัตช์สายโซ่", { glam: 2 }),
  item("acc20", "bag", "กระเป๋าสานไปทะเล", { breezy: 1, swim: 1 }, { hand: true }),
];

export const ITEM: Record<string, Item> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

export const tabOf = (slot: Slot): TabId =>
  slot === "hat" || slot === "eyes" || slot === "neck" || slot === "bag" ? "acc" : slot;

export const TABS: { id: TabId; label: string; short?: string; icon: string }[] = [
  { id: "top", label: "เสื้อ", icon: "top2" },
  { id: "bottom", label: "ท่อนล่าง", icon: "bottom1" },
  { id: "dress", label: "เดรส", icon: "dress1" },
  { id: "gown", label: "ชุดราตรี", short: "ราตรี", icon: "gown5" },
  { id: "swim", label: "ชุดว่ายน้ำ", short: "ว่ายน้ำ", icon: "swim6" },
  { id: "outer", label: "เสื้อคลุม", icon: "outer1" },
  { id: "shoes", label: "รองเท้า", icon: "shoes2" },
  { id: "acc", label: "เครื่องประดับ", short: "ประดับ", icon: "acc2" },
];

export const SLOT_LABEL: Record<Slot, string> = {
  top: "เสื้อ",
  bottom: "ท่อนล่าง",
  dress: "เดรส",
  swim: "ชุดว่ายน้ำ",
  gown: "ชุดราตรี",
  outer: "เสื้อคลุม",
  shoes: "รองเท้า",
  hat: "ศีรษะ",
  eyes: "แว่น",
  neck: "คอ",
  bag: "กระเป๋า",
};

// ---------- colour variations ----------
export type TintOp = ["hue", number] | ["gray"] | ["bri", number] | ["con", number];
export interface Tint {
  name: string;
  ops: TintOp[];
  css: string;
}
const tint = (name: string, ops: TintOp[]): Tint => ({
  name,
  ops,
  css:
    ops
      .map((op) =>
        op[0] === "hue"
          ? `hue-rotate(${op[1]}deg)`
          : op[0] === "gray"
            ? "grayscale(1)"
            : op[0] === "bri"
              ? `brightness(${op[1]})`
              : `contrast(${op[1]})`,
      )
      .join(" ") || "none",
});

export const TINTS: Tint[] = [
  tint("สีเดิม", []),
  tint("เฉดสีที่ 2", [["hue", 38]]),
  tint("เฉดสีที่ 3", [["hue", 88]]),
  tint("เฉดสีที่ 4", [["hue", 150]]),
  tint("เฉดสีที่ 5", [["hue", 205]]),
  tint("เฉดสีที่ 6", [["hue", 258]]),
  tint("เฉดสีที่ 7", [["hue", 312]]),
  tint("โทนขาวเทา", [["gray"], ["bri", 1.12]]),
  tint("โทนเข้ม", [["gray"], ["bri", 0.55], ["con", 1.25]]),
];

// ---------- style vibes ----------
export const VIBES: Record<Vibe, { label: string; color: string }> = {
  sweet: { label: "หวานใส", color: "#ff9db4" },
  casual: { label: "สบาย ๆ", color: "#8ec5fb" },
  chic: { label: "ชิคหรู", color: "#bfa0f2" },
  street: { label: "เท่สตรีท", color: "#6a5c7b" },
  breezy: { label: "รับลมร้อน", color: "#6fd3b6" },
  cozy: { label: "อบอุ่น", color: "#ffb768" },
  swim: { label: "พร้อมลงน้ำ", color: "#45b8e6" },
  glam: { label: "หรูราตรี", color: "#e5b445" },
};

// ---------- destinations ----------
export type DestId = "cafe" | "beach" | "night" | "park" | "pool" | "gala" | "snow";
export interface Destination {
  id: DestId;
  name: string;
  short: string;
  brief: string;
  hint: string;
  img: string;
  love: Record<Vibe, number>;
  hi: string;
  mid: string;
  low: string;
}

export const DESTS: Destination[] = [
  {
    id: "cafe",
    name: "คาเฟ่ริมทาง",
    short: "คาเฟ่",
    brief: "นัดเพื่อนจิบกาแฟยามสาย",
    hint: "วันนี้นัดเพื่อนที่คาเฟ่ ลุคสบาย ๆ ปนหวานนิด ๆ น่าจะเข้านะ",
    img: IMG.places.cafe,
    love: { casual: 1, sweet: 0.85, chic: 0.6, cozy: 0.45, breezy: 0.45, street: 0.3, glam: -0.2, swim: -0.9 },
    hi: "ชุดนี้ถ่ายคู่กับลาเต้ต้องปังแน่ ๆ เพื่อนต้องถามแน่เลยว่าซื้อที่ไหน!",
    mid: "นั่งจิบกาแฟได้สบาย ๆ เลย แต่ถ้าละมุนขึ้นอีกนิดคงเข้ากับร้านกว่านี้",
    low: "อืม… เดินเข้าคาเฟ่ด้วยชุดนี้แล้วรู้สึกเขิน ๆ ยังไงไม่รู้สิ",
  },
  {
    id: "beach",
    name: "ชายหาดหน้าร้อน",
    short: "ทะเล",
    brief: "เดินเล่นรับลมทะเล",
    hint: "จะไปทะเลล่ะ! แดดแรงมาก ชุดว่ายน้ำหรือชุดโปร่ง ๆ เบา ๆ น่าจะดีที่สุด",
    img: IMG.places.beach,
    love: { swim: 1, breezy: 1, casual: 0.6, sweet: 0.5, street: 0.2, chic: 0.2, glam: -0.4, cozy: -0.6 },
    hi: "ลมทะเลพัดเย็นสบายตัวสุด ๆ ชุดนี้พร้อมลุยทรายแล้ว!",
    mid: "เดินชายหาดได้อยู่นะ แต่ถ้าโปร่งกว่านี้อีกหน่อยคงสบายกว่า",
    low: "ร้อนจะละลายแล้ว~ ชุดนี้ไม่เหมาะกับแดดทะเลเลยน้า",
  },
  {
    id: "pool",
    name: "สระว่ายน้ำรีสอร์ต",
    short: "สระน้ำ",
    brief: "เล่นน้ำที่รีสอร์ตริมทะเล",
    hint: "ไปเล่นน้ำที่สระของรีสอร์ตกัน! ต้องใส่ชุดว่ายน้ำเท่านั้นเลยน้า",
    img: IMG.places.pool,
    love: { swim: 1, breezy: 0.6, casual: 0.25, sweet: 0.25, street: 0.1, chic: 0.05, glam: -0.5, cozy: -0.7 },
    hi: "น้ำใสน่ากระโดดลงไปมาก! ชุดนี้พร้อมลงสระสุด ๆ เลย",
    mid: "นั่งเล่นริมสระได้อยู่นะ แต่ถ้าจะลงน้ำคงต้องเปลี่ยนเป็นชุดว่ายน้ำ",
    low: "เอ่อ… ชุดนี้ลงสระไม่ได้แน่ ๆ เปียกหมดพอดี",
  },
  {
    id: "park",
    name: "ปิกนิกชมซากุระ",
    short: "ปิกนิก",
    brief: "ปูเสื่อใต้ต้นซากุระ",
    hint: "ไปปิกนิกชมดอกไม้กัน! ลมเย็น ๆ ลุคหวาน ๆ อุ่น ๆ น่าจะเหมาะ",
    img: IMG.places.park,
    love: { sweet: 1, cozy: 0.7, casual: 0.7, breezy: 0.45, chic: 0.4, street: 0.2, glam: -0.2, swim: -0.8 },
    hi: "กลีบซากุระร่วงลงบนชุดนี้ สวยเหมือนฉากในอนิเมะเลย!",
    mid: "นั่งปิกนิกได้สบาย ๆ ถ้าหวานขึ้นอีกหน่อยคงเข้ากับดอกไม้มากขึ้น",
    low: "ชุดนี้นั่งบนเสื่อปิกนิกไม่ค่อยถนัดเลยแฮะ…",
  },
  {
    id: "night",
    name: "ดูหนังรอบค่ำ",
    short: "ดูหนัง",
    brief: "เดตในเมืองตอนพลบค่ำ",
    hint: "คืนนี้มีนัดดูหนัง ต้องดูดีเป็นพิเศษ ลุคชิค ๆ หรือเท่ ๆ ก็ได้นะ",
    img: IMG.places.night,
    love: { chic: 1, street: 0.8, glam: 0.55, sweet: 0.5, cozy: 0.4, casual: 0.3, breezy: 0.1, swim: -0.9 },
    hi: "แสงไฟในเมืองกับชุดนี้เข้ากันสุด ๆ คืนนี้ต้องเป็นคืนที่ดีแน่เลย!",
    mid: "ไปดูหนังได้สบาย ๆ แต่ถ้าดูหรูขึ้นอีกนิดคงน่าประทับใจกว่านี้",
    low: "คืนพิเศษทั้งที ชุดนี้ดูไม่ค่อยเข้ากับบรรยากาศเลยนะ…",
  },
  {
    id: "gala",
    name: "งานเลี้ยงกาล่า",
    short: "กาล่า",
    brief: "งานราตรีในห้องบอลรูม",
    hint: "คืนนี้มีงานเลี้ยงกาล่าในห้องบอลรูม ต้องชุดราตรีสวยหรูเท่านั้น!",
    img: IMG.places.gala,
    love: { glam: 1, chic: 0.75, sweet: 0.3, street: 0.05, cozy: -0.1, breezy: -0.1, casual: -0.2, swim: -1 },
    hi: "แสงแชนเดอเลียร์ส่องลงมาที่ชุดนี้ สวยสง่าที่สุดในงานเลย!",
    mid: "เข้างานได้อยู่นะ แต่ถ้าหรูหรากว่านี้อีกนิดคงโดดเด่นขึ้น",
    low: "ทุกคนใส่ชุดราตรีกันหมดเลย… ชุดนี้ดูผิดงานไปหน่อยนะ",
  },
  {
    id: "snow",
    name: "เมืองหิมะยามค่ำ",
    short: "เมืองหิมะ",
    brief: "เดินเล่นถนนหิมะประดับไฟ",
    hint: "ไปเดินเล่นเมืองหิมะกัน หนาวมากเลย ต้องใส่อุ่น ๆ หลายชั้นนะ",
    img: IMG.places.snow,
    love: { cozy: 1, chic: 0.55, casual: 0.5, street: 0.45, sweet: 0.45, glam: 0.1, breezy: -0.5, swim: -1 },
    hi: "อุ่นสบายท่ามกลางหิมะ แสงไฟระยิบระยับเข้ากับชุดนี้มากเลย!",
    mid: "เดินเล่นได้อยู่นะ แต่ถ้ามีเสื้อคลุมหรือผ้าพันคอเพิ่มคงอุ่นกว่านี้",
    low: "หนาวจนตัวสั่นแล้ว~ ชุดนี้บางเกินไปสำหรับหิมะนะ",
  },
];
export const DEST: Record<DestId, Destination> = Object.fromEntries(DESTS.map((d) => [d.id, d])) as Record<
  DestId,
  Destination
>;

// ---------- Miu's lines ----------
export const WEAR_LINES: Record<Vibe, string[]> = {
  sweet: ["ว้าย น่ารักจัง!", "หวานใสสุด ๆ เลย~", "ชิ้นนี้ชอบมาก!"],
  casual: ["ใส่สบายดีจัง", "ลุคนี้ชิลมากเลย", "เข้ากับทุกวันเลยนะ"],
  chic: ["ดูโตขึ้นเลยแฮะ", "หรูไม่เบาเลยนะ", "ลุคนี้ดูแพงมาก!"],
  street: ["เท่ไม่ไหวแล้ว!", "ลุคนี้เฟี้ยวสุด ๆ", "แบบนี้ก็ได้เหรอ ชอบ!"],
  breezy: ["โปร่งสบายดีจัง~", "พร้อมรับลมร้อนแล้ว!", "ใส่แล้วเย็นสบายเลย"],
  cozy: ["อุ่นจังเลย~", "นุ่มฟูน่ากอดมาก", "ใส่แล้วอบอุ่นหัวใจ"],
  swim: ["พร้อมลงน้ำแล้ว!", "ชุดนี้ใส่เล่นน้ำต้องสนุกแน่", "หน้าร้อนมาแล้ว~"],
  glam: ["ว้าว รู้สึกเหมือนเป็นเจ้าหญิงเลย", "หรูหราสุด ๆ ไปเลย!", "ชุดนี้ต้องออกงานแล้วล่ะ"],
};
export const REMOVE_LINES = ["ถอดออกก่อนเนอะ", "ลองชิ้นอื่นดูบ้างดีกว่า", "อื้อ เปลี่ยนใจได้นะ"];
export const TINT_LINES = ["สีนี้ก็สวยนะ!", "โอ้ เปลี่ยนสีแล้วดูไม่เหมือนเดิมเลย", "เฉดนี้เข้ากับฉันไหม?"];
export const RANDOM_LINES = ["จัดมาให้แบบสุ่ม ๆ เป็นไงบ้าง?", "ลุคนี้ไม่เคยลองเลย!", "ว้าว สุ่มได้แบบนี้เลยเหรอ"];
export const RESET_LINE = "กลับมาชุดอยู่บ้านแล้ว เริ่มเลือกใหม่กัน!";
