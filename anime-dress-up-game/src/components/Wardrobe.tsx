import { ITEM, ITEMS, SLOT_LABEL, TABS, TINTS, tabOf, type Item, type Slot, type TabId } from "../game/data";
import { wornItems, type Outfit } from "../game/engine";
import { itemSrc } from "../game/assets";
import { cn } from "../utils/cn";
import { IconCheck, IconX } from "./Icons";

const TAB_NOTE: Partial<Record<TabId, string>> = {
  dress: "เดรสใส่แทนเสื้อกับท่อนล่าง · เอี๊ยมยีนส์ใส่ทับเสื้อได้ด้วยนะ",
  gown: "ชุดราตรีใส่แทนเสื้อกับท่อนล่าง เข้าคู่กับส้นสูงและเครื่องประดับ",
  swim: "ชุดว่ายน้ำใส่แทนเสื้อกับท่อนล่าง ใส่เสื้อคลุมทับได้",
  outer: "เสื้อคลุมใส่ทับได้ทุกชุด · เสื้อกั๊กจะเห็นแขนเสื้อตัวใน",
  acc: "ใส่ได้อย่างละ 1 ชิ้น: ศีรษะ · แว่น · คอ · กระเป๋า",
};

interface Props {
  outfit: Outfit;
  tab: TabId;
  focus: string | null;
  onTab: (t: TabId) => void;
  onPick: (it: Item) => void;
  onTint: (id: string, tint: number) => void;
  onTuck: (v: boolean) => void;
  onRemove: (slot: Slot) => void;
}

export function Wardrobe({ outfit, tab, focus, onTab, onPick, onTint, onTuck, onRemove }: Props) {
  const worn = wornItems(outfit);
  const items = ITEMS.filter((i) => tabOf(i.slot) === tab);
  const wornHere = worn.filter((i) => tabOf(i.slot) === tab);
  const focused = focus ? ITEM[focus] : undefined;
  const colorItem =
    focused && outfit.worn[focused.slot] === focused.id && tabOf(focused.slot) === tab
      ? focused
      : wornHere[wornHere.length - 1];
  const canTuck = !!outfit.worn.top && !!outfit.worn.bottom && (tab === "top" || tab === "bottom");
  const tintOf = (id: string) => TINTS[outfit.tints[id] ?? 0]?.css ?? "none";

  return (
    <section
      aria-label="ตู้เสื้อผ้า"
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-[26px] border-[2.5px] border-ink bg-cream shadow-pop"
    >
      {/* category tabs */}
      <div
        role="tablist"
        aria-label="หมวดเสื้อผ้า"
        className="grid shrink-0 grid-cols-4 gap-1 border-b-[2.5px] border-ink bg-paper p-1.5 sm:grid-cols-8 sm:gap-1.5 sm:p-2.5"
      >
        {TABS.map((t) => {
          const active = t.id === tab;
          const has = worn.some((i) => tabOf(i.slot) === t.id);
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={active}
              aria-controls="wardrobe-panel"
              aria-label={has ? `${t.label} (กำลังใส่อยู่)` : t.label}
              title={t.label}
              onClick={() => onTab(t.id)}
              className={cn(
                "press relative flex min-w-0 items-center gap-0.5 rounded-xl border-2 py-0.5 pl-0.5 pr-1 sm:flex-col sm:gap-0 sm:rounded-2xl sm:px-0.5 sm:pb-1 sm:pt-1.5",
                active ? "border-ink bg-coral shadow-pop-sm" : "border-ink/15 bg-cream hover:border-ink/70",
              )}
            >
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/85 sm:h-9 sm:w-9">
                <img src={itemSrc(t.icon)} alt="" draggable={false} className="h-[18px] w-[18px] object-contain sm:h-7 sm:w-7" />
              </span>
              <span className="min-w-0 truncate text-[11px] font-medium leading-[1.7] sm:max-w-full sm:text-[12.5px] sm:leading-[1.6]">
                {t.short ?? t.label}
              </span>
              {has && (
                <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-ink bg-butter sm:right-1 sm:top-1 sm:h-3 sm:w-3" />
              )}
            </button>
          );
        })}
      </div>

      {/* currently worn (larger screens) */}
      <div className="hidden shrink-0 items-center gap-2 border-b-2 border-dashed border-ink/20 px-3 py-2 sm:flex">
        <span className="shrink-0 text-xs text-ink-soft">ใส่อยู่ {worn.length} ชิ้น</span>
        {worn.length === 0 ? (
          <span className="text-xs text-ink-soft/80">— แตะเสื้อผ้าด้านล่างเพื่อใส่ให้มิว แตะซ้ำเพื่อถอด</span>
        ) : (
          <ul className="no-scrollbar flex min-w-0 gap-1.5 overflow-x-auto py-1 pr-1">
            {worn.map((it) => (
              <li key={it.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => onRemove(it.slot)}
                  aria-label={`ถอด ${it.name}`}
                  title={`ถอด ${it.name}`}
                  className="group relative block h-10 w-10 rounded-xl border-2 border-ink/25 bg-white p-0.5 hover:border-ink"
                >
                  <img
                    src={itemSrc(it.id)}
                    alt=""
                    draggable={false}
                    className="h-full w-full object-contain"
                    style={{ filter: tintOf(it.id) }}
                  />
                  <span className="absolute -right-1.5 -top-1.5 grid h-[18px] w-[18px] place-items-center rounded-full border-2 border-ink bg-cream group-hover:bg-coral">
                    <IconX className="h-2.5 w-2.5" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* items */}
      <div
        id="wardrobe-panel"
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
        className="thin-scroll min-h-0 flex-1 overflow-y-auto px-2.5 py-2.5 sm:px-3 sm:py-3"
      >
        {TAB_NOTE[tab] && <p className="mb-2 text-xs text-ink-soft">{TAB_NOTE[tab]}</p>}
        <ul className="grid grid-cols-4 gap-2 sm:gap-2.5">
          {items.map((it) => {
            const on = outfit.worn[it.slot] === it.id;
            return (
              <li key={it.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => onPick(it)}
                  className={cn(
                    "press relative flex h-full w-full flex-col rounded-2xl border-2 p-1 text-left sm:p-1.5",
                    on ? "border-ink bg-butter shadow-pop-sm" : "border-ink/15 bg-white hover:border-ink/70",
                  )}
                >
                  <span className={cn("relative block aspect-square overflow-hidden rounded-xl", on ? "bg-cream" : "bg-paper")}>
                    <img
                      src={itemSrc(it.id)}
                      alt=""
                      draggable={false}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-contain p-1.5 sm:p-2.5"
                      style={{ filter: tintOf(it.id) }}
                    />
                    {tab === "acc" && (
                      <span className="absolute left-1 top-1 rounded-full bg-ink/80 px-1.5 text-[10px] leading-[1.6] text-cream">
                        {SLOT_LABEL[it.slot]}
                      </span>
                    )}
                  </span>
                  <span className="mt-1 line-clamp-2 min-h-[2.9em] px-0.5 text-[11px] leading-[1.45] sm:text-[12.5px]">
                    {it.name}
                  </span>
                  {on && (
                    <span className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full border-2 border-ink bg-coral">
                      <IconCheck className="h-3.5 w-3.5" />
                      <span className="sr-only">ใส่อยู่</span>
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* colour + styling options for the item just picked */}
      {(colorItem || canTuck) && (
        <div className="shrink-0 border-t-[2.5px] border-ink bg-paper px-2.5 py-2 sm:px-3 sm:py-2.5">
          {canTuck && (
            <div className="mb-2 flex items-center justify-between gap-3">
              <span id="tuck-label" className="text-xs sm:text-[13px]">
                สอดชายเสื้อเข้าในท่อนล่าง
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={outfit.tuck}
                aria-labelledby="tuck-label"
                onClick={() => onTuck(!outfit.tuck)}
                className={cn(
                  "relative h-7 w-12 shrink-0 rounded-full border-2 border-ink transition-colors",
                  outfit.tuck ? "bg-mint" : "bg-white",
                )}
              >
                <span
                  className={cn(
                    "absolute left-0.5 top-0.5 h-5 w-5 rounded-full border-2 border-ink bg-coral transition-transform",
                    outfit.tuck && "translate-x-5",
                  )}
                />
              </button>
            </div>
          )}
          {colorItem && (
            <>
              <p className="mb-1 truncate text-xs sm:text-[13px]">
                <span className="text-ink-soft">เปลี่ยนสี</span> <span className="font-medium">{colorItem.name}</span>
              </p>
              <div
                role="radiogroup"
                aria-label={`เฉดสีของ ${colorItem.name}`}
                className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1.5 pt-1 sm:gap-2"
              >
                {TINTS.map((t, i) => {
                  const cur = (outfit.tints[colorItem.id] ?? 0) === i;
                  return (
                    <button
                      key={t.name}
                      type="button"
                      role="radio"
                      aria-checked={cur}
                      aria-label={t.name}
                      title={t.name}
                      onClick={() => onTint(colorItem.id, i)}
                      className={cn(
                        "press grid h-11 w-11 shrink-0 place-items-center rounded-2xl border-2 sm:h-12 sm:w-12",
                        cur ? "border-ink bg-butter shadow-pop-sm" : "border-ink/15 bg-white hover:border-ink/70",
                      )}
                    >
                      <img
                        src={itemSrc(colorItem.id)}
                        alt=""
                        draggable={false}
                        className="h-8 w-8 object-contain sm:h-9 sm:w-9"
                        style={{ filter: t.css }}
                      />
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
