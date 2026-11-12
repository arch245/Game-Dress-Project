import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEST,
  DESTS,
  FULL_SLOTS,
  ITEMS,
  RANDOM_LINES,
  REMOVE_LINES,
  RESET_LINE,
  TINTS,
  TINT_LINES,
  WEAR_LINES,
  tabOf,
  type DestId,
  type Item,
  type Slot,
  type TabId,
} from "./game/data";
import {
  EMPTY_OUTFIT,
  NOT_READY_LINE,
  dressState,
  loadState,
  pick,
  primaryVibe,
  randomOutfit,
  removeSlot,
  saveState,
  toggleWear,
  wornCount,
  type Outfit,
} from "./game/engine";
import { IconHanger } from "./components/Icons";
import { ResultModal } from "./components/ResultModal";
import { Stage } from "./components/Stage";
import { Wardrobe } from "./components/Wardrobe";

export default function App() {
  const initial = useMemo(loadState, []);
  const [outfit, setOutfit] = useState<Outfit>(initial.outfit);
  const [destId, setDestId] = useState<DestId>(initial.dest);
  const [tab, setTab] = useState<TabId>("top");
  const [focus, setFocus] = useState<string | null>(null);
  const [speech, setSpeech] = useState(() => ({
    text: wornCount(initial.outfit) ? "กลับมาแล้ว! มาแต่งตัวต่อกันเลยนะ" : DEST[initial.dest].hint,
    n: 0,
  }));
  const [burst, setBurst] = useState(0);
  const [nudge, setNudge] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const dest = DEST[destId];

  useEffect(() => saveState(outfit, destId), [outfit, destId]);

  const say = useCallback((text: string) => setSpeech((s) => ({ text, n: s.n + 1 })), []);

  const handlePick = (it: Item) => {
    const wearing = outfit.worn[it.slot] === it.id;
    const next = toggleWear(outfit, it);
    setOutfit(next);
    if (wearing) {
      setFocus(null);
      say(pick(REMOVE_LINES));
      return;
    }
    setFocus(it.id);
    setBurst((b) => b + 1);
    // a dress replaces top + bottom (and the other way round) – tell the player what happened
    const swapped = (["top", "bottom", ...FULL_SLOTS] as Slot[]).some((s) => s !== it.slot && outfit.worn[s] && !next.worn[s]);
    if (swapped) say(FULL_SLOTS.includes(it.slot) ? "เปลี่ยนมาใส่ชุดนี้แทนชุดเดิมแล้วน้า" : "ถอดชุดเดิมออก แล้วใส่ชิ้นนี้แทนนะ");
    else say(pick(WEAR_LINES[primaryVibe(it)]));
  };

  const handleTint = (id: string, t: number) => {
    if ((outfit.tints[id] ?? 0) === t) return;
    setOutfit({ ...outfit, tints: { ...outfit.tints, [id]: t } });
    say(t === 0 ? "กลับมาสีเดิมก็น่ารักดีนะ" : pick(TINT_LINES));
  };

  const handleRemove = (slot: Slot) => {
    setOutfit(removeSlot(outfit, slot));
    say(pick(REMOVE_LINES));
  };

  const handleRandom = () => {
    setOutfit(randomOutfit());
    setFocus(null);
    setBurst((b) => b + 1);
    say(pick(RANDOM_LINES));
  };

  const handleReset = () => {
    setOutfit(EMPTY_OUTFIT);
    setFocus(null);
    say(RESET_LINE);
  };

  const handleDest = (id: DestId) => {
    setDestId(id);
    say(DEST[id].hint);
  };

  const handleGo = () => {
    const state = dressState(outfit);
    if (state !== "ok") {
      say(NOT_READY_LINE[state]);
      setNudge((n) => n + 1);
      if (state === "noTop") setTab("top");
      if (state === "noBottom") setTab("bottom");
      return;
    }
    setShowResult(true);
  };

  const closeResult = useCallback(() => setShowResult(false), []);
  const handleTab = (t: TabId) => {
    setTab(t);
    if (focus && tabOf(ITEMS.find((i) => i.id === focus)?.slot ?? "top") !== t) setFocus(null);
  };

  return (
    <div className="app-h mx-auto flex min-h-[600px] max-w-[1280px] flex-col gap-2.5 p-2.5 sm:gap-4 sm:p-4 lg:px-6 lg:py-5">
      <header className="flex shrink-0 items-center gap-2.5 sm:gap-3.5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border-[2.5px] border-ink bg-coral shadow-pop-sm sm:h-12 sm:w-12">
          <IconHanger className="h-6 w-6 sm:h-7 sm:w-7" />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-[19px] font-semibold leading-[1.35] sm:text-2xl">วันนี้ใส่อะไรดี?</h1>
          <p className="truncate text-xs text-ink-soft sm:text-sm">ช่วยแต่งตัวให้มิวก่อนออกไปข้างนอกหน่อยนะ</p>
        </div>
        <ul className="ml-auto hidden shrink-0 items-center gap-2 text-xs md:flex">
          <li className="rounded-full border-2 border-ink bg-cream px-3 py-1">เสื้อผ้า {ITEMS.length} ชิ้น</li>
          <li className="rounded-full border-2 border-ink bg-cream px-3 py-1">{TINTS.length} เฉดสีต่อชิ้น</li>
          <li className="rounded-full border-2 border-ink bg-cream px-3 py-1">{DESTS.length} สถานที่</li>
        </ul>
      </header>

      <main className="grid min-h-0 flex-1 grid-rows-[minmax(0,45fr)_minmax(0,55fr)] gap-2.5 sm:gap-4 lg:grid-cols-[minmax(0,0.84fr)_minmax(0,1fr)] lg:grid-rows-1 lg:gap-6">
        <Stage
          outfit={outfit}
          dest={dest}
          speech={speech}
          burst={burst}
          nudge={nudge}
          onDest={handleDest}
          onRandom={handleRandom}
          onReset={handleReset}
          onGo={handleGo}
        />
        <Wardrobe
          outfit={outfit}
          tab={tab}
          focus={focus}
          onTab={handleTab}
          onPick={handlePick}
          onTint={handleTint}
          onTuck={(v) => setOutfit({ ...outfit, tuck: v })}
          onRemove={handleRemove}
        />
      </main>

      {showResult && <ResultModal outfit={outfit} dest={dest} onClose={closeResult} />}
    </div>
  );
}
