import { DESTS, type DestId, type Destination } from "../game/data";
import { wornItems, type Outfit } from "../game/engine";
import { IMG } from "../game/assets";
import { cn } from "../utils/cn";
import { Doll, DOLL_RATIO } from "./Doll";
import { IconArrow, IconDice, IconPin, IconReset, IconSpark } from "./Icons";

const SPARKS = [
  { left: "-18%", top: "20%", size: 26, delay: 0, color: "text-butter" },
  { left: "104%", top: "27%", size: 20, delay: 0.07, color: "text-white" },
  { left: "-26%", top: "47%", size: 18, delay: 0.14, color: "text-white" },
  { left: "112%", top: "52%", size: 28, delay: 0.04, color: "text-butter" },
  { left: "-10%", top: "72%", size: 20, delay: 0.2, color: "text-coral" },
  { left: "100%", top: "78%", size: 18, delay: 0.16, color: "text-mint" },
];

interface Props {
  outfit: Outfit;
  dest: Destination;
  speech: { text: string; n: number };
  burst: number;
  nudge: number;
  onDest: (id: DestId) => void;
  onRandom: () => void;
  onReset: () => void;
  onGo: () => void;
}

export function Stage({ outfit, dest, speech, burst, nudge, onDest, onRandom, onReset, onGo }: Props) {
  const worn = wornItems(outfit);
  const label = worn.length ? `มิวกำลังใส่ ${worn.map((i) => i.name).join(", ")}` : "มิวในชุดอยู่บ้าน ยังไม่ได้แต่งตัว";

  return (
    <section
      aria-label="ห้องแต่งตัวของมิว"
      className="relative isolate h-full min-h-0 overflow-hidden rounded-[26px] border-[2.5px] border-ink bg-peach shadow-pop"
    >
      <img
        src={IMG.room}
        alt=""
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: "50% 80%" }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-cream/45 via-transparent to-transparent" />

      {/* the doll */}
      <div className="absolute bottom-[9%] left-1/2 h-[84%] -translate-x-1/2" style={{ aspectRatio: DOLL_RATIO }}>
        <div className="absolute inset-x-[16%] -bottom-[0.6%] h-[2.6%] rounded-[50%] bg-ink/35 blur-[5px]" />
        <div className="doll-bob absolute inset-0">
          <Doll outfit={outfit} label={label} />
        </div>
        {burst > 0 && (
          <div key={burst} className="pointer-events-none absolute inset-0">
            {SPARKS.map((s, i) => (
              <IconSpark
                key={i}
                className={cn("sparkle absolute", s.color)}
                style={{ left: s.left, top: s.top, width: s.size, height: s.size, animationDelay: `${s.delay}s` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* destination picker */}
      <div className="absolute left-2.5 top-2.5 z-10 sm:left-4 sm:top-4">
        <p className="mb-1.5 hidden items-center gap-1 rounded-full border-2 border-ink bg-cream px-2 py-0.5 text-xs font-medium lg:inline-flex">
          <IconPin className="h-3.5 w-3.5 shrink-0" />
          วันนี้ไปไหนดี?
        </p>
        <div
          role="radiogroup"
          aria-label="เลือกสถานที่ที่จะไป"
          className="grid w-max grid-cols-2 gap-1.5 lg:grid-cols-1 lg:gap-[7px]"
        >
          {DESTS.map((d) => {
            const on = d.id === dest.id;
            return (
              <button
                key={d.id}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={`${d.name} — ${d.brief}`}
                title={d.name}
                onClick={() => onDest(d.id)}
                className={cn(
                  "press flex items-center gap-2 rounded-2xl border-2 border-ink p-[3px] text-left lg:pr-2.5",
                  on ? "bg-butter shadow-pop-sm" : "bg-cream/90 hover:bg-cream",
                )}
              >
                <img
                  src={d.img}
                  alt=""
                  draggable={false}
                  className={cn("h-[30px] w-[30px] rounded-[10px] object-cover sm:h-10 sm:w-10 sm:rounded-[11px] lg:h-9 lg:w-9", !on && "opacity-90")}
                />
                <span className="hidden text-[13px] font-medium lg:block">{d.short}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Miu's speech bubble */}
      <div className="absolute right-2.5 top-[15%] z-10 w-[35%] max-w-[212px] sm:right-4 lg:top-[12%]">
        <div
          key={speech.n}
          role="status"
          aria-live="polite"
          className="bubble relative rounded-2xl border-2 border-ink bg-cream px-3 pb-2 pt-3.5 shadow-pop-sm"
        >
          <span className="absolute -top-2.5 left-2.5 rounded-full border-2 border-ink bg-coral px-2 text-[11px] font-medium leading-[1.5]">
            มิว
          </span>
          <span className="absolute -left-[7px] top-6 h-3 w-3 rotate-45 border-b-2 border-l-2 border-ink bg-cream" />
          <p className="font-hand text-[12.5px] font-medium leading-[1.55] sm:text-sm sm:leading-[1.6]">{speech.text}</p>
        </div>
      </div>

      {/* actions */}
      <div className="absolute bottom-2.5 left-2.5 z-10 flex gap-2 sm:bottom-4 sm:left-4">
        <button
          type="button"
          onClick={onRandom}
          className="press flex items-center gap-1.5 rounded-full border-2 border-ink bg-mint px-3 py-2 text-xs font-medium shadow-pop-sm hover:bg-[#bdeedd] sm:text-sm"
        >
          <IconDice className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
          สุ่มชุด
        </button>
        <button
          type="button"
          onClick={onReset}
          disabled={worn.length === 0}
          aria-label="ถอดทั้งหมด"
          className="press flex items-center gap-1.5 rounded-full border-2 border-ink bg-cream px-2.5 py-2 text-xs font-medium shadow-pop-sm hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:text-sm"
        >
          <IconReset className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
          <span className="hidden sm:inline">ถอดทั้งหมด</span>
        </button>
      </div>
      <button
        key={nudge}
        type="button"
        onClick={onGo}
        className={cn(
          "press absolute bottom-2.5 right-2.5 z-10 flex items-center gap-1.5 rounded-full border-[2.5px] border-ink bg-coral px-4 py-2 text-sm font-semibold shadow-pop hover:bg-[#ff95a1] sm:bottom-4 sm:right-4 sm:px-5 sm:py-2.5 sm:text-base",
          nudge > 0 && "shake",
        )}
      >
        {`ไป${dest.short}กันเลย`}
        <IconArrow className="h-4 w-4 sm:h-5 sm:w-5" />
      </button>
    </section>
  );
}
