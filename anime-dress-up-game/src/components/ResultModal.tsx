import { useEffect, useMemo, useRef, useState } from "react";
import { VIBES, type Destination } from "../game/data";
import { evaluate, type Outfit } from "../game/engine";
import { renderPhoto } from "../game/photo";
import { cn } from "../utils/cn";
import { Doll, DOLL_RATIO } from "./Doll";
import { IconCamera, IconHeart, IconSpark, IconX } from "./Icons";

interface Props {
  outfit: Outfit;
  dest: Destination;
  onClose: () => void;
}

export function ResultModal({ outfit, dest, onClose }: Props) {
  const verdict = useMemo(() => evaluate(outfit, dest), [outfit, dest]);
  const [saving, setSaving] = useState<"idle" | "busy" | "done" | "error">("idle");
  const primaryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    primaryRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      before?.focus?.();
    };
  }, [onClose]);

  const save = async () => {
    if (saving === "busy") return;
    setSaving("busy");
    try {
      const blob = await renderPhoto(outfit, dest, verdict.hearts);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `miu-${dest.id}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setSaving("done");
    } catch {
      setSaving("error");
    }
  };

  return (
    <div
      className="fade-in fixed inset-0 z-50 flex overflow-y-auto bg-ink/60 p-3 backdrop-blur-[3px] sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-title"
        onClick={(e) => e.stopPropagation()}
        className="pop-in relative m-auto grid w-full max-w-[880px] gap-4 rounded-[28px] border-[2.5px] border-ink bg-cream p-4 pt-5 shadow-pop sm:gap-5 sm:p-7 md:grid-cols-[300px_minmax(0,1fr)] md:gap-9"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="ปิด"
          className="press absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full border-2 border-ink bg-white shadow-pop-sm hover:bg-peach"
        >
          <IconX className="h-4 w-4" />
        </button>

        {/* snapshot */}
        <figure className="relative mx-auto w-full max-w-[196px] -rotate-2 sm:max-w-[240px] rounded-md border-2 border-ink bg-white p-2.5 pb-2 shadow-pop md:max-w-none">
          <span className="absolute -top-3 left-1/2 h-6 w-24 -translate-x-1/2 rotate-2 bg-butter/85 shadow-[0_1px_0_rgb(59_40_67/0.25)]" />
          <div className="relative overflow-hidden rounded-[3px] bg-peach" style={{ aspectRatio: "6 / 7" }}>
            <img
              src={dest.img}
              alt={`ฉาก${dest.name}`}
              draggable={false}
              className="absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition: "50% 60%" }}
            />
            <div className="absolute bottom-[3.5%] left-1/2 h-[89%] -translate-x-1/2" style={{ aspectRatio: DOLL_RATIO }}>
              <div className="absolute inset-x-[14%] -bottom-[0.6%] h-[2.6%] rounded-[50%] bg-ink/35 blur-[4px]" />
              <Doll outfit={outfit} animate={false} label={`มิวในชุดที่เลือก ที่${dest.name}`} />
            </div>
          </div>
          <figcaption className="whitespace-nowrap px-1 pt-2 font-hand text-[15px] font-semibold leading-[1.5] sm:text-[17px] md:text-xl">
            มิว @ {dest.name}
          </figcaption>
        </figure>

        {/* verdict */}
        <div className="flex min-w-0 flex-col">
          <p className="pr-10 text-sm text-ink-soft">
            {dest.name} · {dest.brief}
          </p>
          <h2 id="result-title" className="mt-0.5 text-[26px] font-semibold leading-[1.35] sm:text-[32px]">
            {verdict.title}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
            <div className="flex gap-1" role="img" aria-label={`ได้ ${verdict.hearts} จาก 5 หัวใจ`}>
              {[0, 1, 2, 3, 4].map((i) => (
                <IconHeart
                  key={i}
                  filled
                  className={cn("h-8 w-8 sm:h-9 sm:w-9", i < verdict.hearts ? "heart-pop text-coral" : "text-peach")}
                  style={i < verdict.hearts ? { animationDelay: `${0.2 + i * 0.12}s` } : undefined}
                />
              ))}
            </div>
            <span className="rounded-full border-2 border-ink bg-butter px-2.5 py-0.5 text-sm font-medium">
              {verdict.score} คะแนน
            </span>
          </div>

          <blockquote className="relative mt-4 sm:mt-5 rounded-2xl border-2 border-ink bg-white px-4 pb-3 pt-4 font-hand text-base font-medium leading-[1.7] sm:text-[17px]">
            <span className="absolute -top-3 left-3 rounded-full border-2 border-ink bg-coral px-2.5 font-display text-xs font-medium leading-[1.6]">
              มิว
            </span>
            {verdict.comment}
          </blockquote>

          {verdict.vibes.length > 0 && (
            <div className="mt-4">
              <h3 className="text-[13px] font-medium text-ink-soft">สไตล์ของลุคนี้</h3>
              <ul className="mt-1.5 space-y-1.5">
                {verdict.vibes.map(({ vibe, pct }) => (
                  <li key={vibe} className="grid grid-cols-[5.5rem_1fr_2.6rem] items-center gap-2 text-sm">
                    <span>{VIBES[vibe].label}</span>
                    <span className="h-3.5 overflow-hidden rounded-full border-2 border-ink bg-white">
                      <span
                        className="bar-grow block h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: VIBES[vibe].color }}
                      />
                    </span>
                    <span className="text-right tabular-nums text-ink-soft">{pct}%</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ul className="mt-4 space-y-1.5">
            {verdict.tips.map((tip) => (
              <li key={tip} className="flex items-start gap-2 text-sm leading-[1.6]">
                <IconSpark className="mt-[3px] h-4 w-4 shrink-0 text-butter" />
                {tip}
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap items-center gap-2.5 sm:mt-5 md:mt-auto md:pt-5">
            <button
              ref={primaryRef}
              type="button"
              onClick={onClose}
              className="press rounded-full border-[2.5px] border-ink bg-coral px-5 py-2.5 text-sm font-semibold shadow-pop hover:bg-[#ff95a1] sm:text-base"
            >
              แต่งตัวต่อ
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving === "busy"}
              className="press flex items-center gap-2 rounded-full border-[2.5px] border-ink bg-mint px-4 py-2.5 text-sm font-medium shadow-pop hover:bg-[#bdeedd] disabled:opacity-60 sm:text-base"
            >
              <IconCamera className="h-5 w-5" />
              {saving === "busy" ? "กำลังบันทึก…" : "บันทึกรูป"}
            </button>
            <span role="status" className="text-xs text-ink-soft">
              {saving === "done" && "บันทึกรูปแล้ว!"}
              {saving === "error" && "บันทึกไม่สำเร็จ ลองอีกครั้งนะ"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
