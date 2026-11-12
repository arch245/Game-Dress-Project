import { useMemo } from "react";
import { DH, DW, TINTS } from "../game/data";
import { buildLayers, type Layer, type Outfit } from "../game/engine";
import { IMG } from "../game/assets";
import { cn } from "../utils/cn";

const pct = (v: number, base: number) => `${(v / base) * 100}%`;
const polygon = (poly: number[][] | null) =>
  poly ? `polygon(${poly.map(([x, y]) => `${pct(x, DW)} ${pct(y, DH)}`).join(",")})` : "none";

function LayerView({ layer, animate }: { layer: Layer; animate: boolean }) {
  const [x, y, w, h] = layer.box;
  // The wrapper structure is constant so layers never remount when a clip switches on or off.
  return (
    <div className="absolute inset-0" style={{ clipPath: polygon(layer.clips[0]) }}>
      <div className="absolute inset-0" style={{ clipPath: polygon(layer.clips[1]) }}>
        <img
          src={layer.src}
          alt=""
          draggable={false}
          className={cn("absolute max-w-none", animate && layer.animate && "wear-in")}
          style={{
            left: pct(x, DW),
            top: pct(y, DH),
            width: pct(w, DW),
            height: pct(h, DH),
            filter: TINTS[layer.tint]?.css ?? "none",
            clipPath: layer.clipBottom ? `inset(0 0 ${layer.clipBottom * 100}% 0)` : undefined,
          }}
        />
      </div>
    </div>
  );
}

/**
 * The paper doll. Fills its parent, which must have the doll's aspect ratio
 * (use DOLL_RATIO). Clothes may overflow the box (hats, wide skirts, bags).
 */
export function Doll({ outfit, animate = true, label }: { outfit: Outfit; animate?: boolean; label: string }) {
  const layers = useMemo(() => buildLayers(outfit), [outfit]);
  return (
    <div className="absolute inset-0 select-none" role="img" aria-label={label}>
      <img src={IMG.doll} alt="" draggable={false} className="absolute inset-0 h-full w-full max-w-none" />
      {layers.map((l) => (
        <LayerView key={l.key} layer={l} animate={animate} />
      ))}
    </div>
  );
}

export const DOLL_RATIO = `${DW} / ${DH}`;
