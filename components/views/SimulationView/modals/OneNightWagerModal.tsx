"use client";

import { useEffect, useMemo, useState } from "react";
import type { UnitSlotCosts } from "../../../../utils/battle/spells/oneNightWager";

/** 코스트 줄 순차 표기( is → + → m → + → os → = → 합 ) */
export const ONE_NIGHT_WAGER_COST_REVEAL_MS = 4000;

export type OneNightWagerModalProps = {
  costsA: UnitSlotCosts;
  costsB: UnitSlotCosts;
  /** 코스트 합이 더 높은 쪽(동점이면 없음) */
  glowPlayer: "A" | "B" | null;
};

type CostPart = { key: string; text: string };

function buildCostRevealParts(costs: UnitSlotCosts): CostPart[] {
  return [
    { key: "is", text: String(costs.is) },
    { key: "plus1", text: " + " },
    { key: "m", text: String(costs.m) },
    { key: "plus2", text: " + " },
    { key: "os", text: String(costs.os) },
    { key: "eq", text: " = " },
    { key: "total", text: String(costs.total) },
  ];
}

function CostLineReveal({
  label,
  costs,
  glowing,
  revealMs,
}: {
  label: string;
  costs: UnitSlotCosts;
  glowing: boolean;
  revealMs: number;
}) {
  const parts = useMemo(() => buildCostRevealParts(costs), [costs.is, costs.m, costs.os, costs.total]);
  const [shownCount, setShownCount] = useState(0);
  const complete = shownCount >= parts.length;
  const showGlow = glowing && complete;

  useEffect(() => {
    setShownCount(0);
    if (parts.length === 0) return;
    const stepMs = Math.max(48, Math.floor(revealMs / parts.length));
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setShownCount(i);
      if (i >= parts.length) window.clearInterval(id);
    }, stepMs);
    return () => window.clearInterval(id);
  }, [parts, revealMs]);

  return (
    <div
      className={`rounded-xl border px-5 py-4 transition-all duration-500 ${
        showGlow
          ? "border-violet-200/90 bg-violet-950/70 shadow-[0_0_32px_rgba(167,139,250,0.55),inset_0_0_24px_rgba(139,92,246,0.25)]"
          : "border-slate-600/80 bg-slate-950/55"
      }`}
    >
      <div
        className={`mb-2 text-xs font-black tracking-widest ${
          showGlow ? "text-violet-200" : "text-slate-400"
        }`}
      >
        {label}
      </div>
      <div
        className={`min-h-[2.5rem] font-mono text-2xl font-black tabular-nums tracking-tight sm:text-3xl md:text-4xl ${
          showGlow
            ? "text-violet-100 drop-shadow-[0_0_12px_rgba(196,181,253,0.9)] animate-pulse"
            : "text-slate-300"
        }`}
        aria-live="polite"
      >
        {parts.slice(0, shownCount).map(part => (
          <span
            key={part.key}
            className="inline-block animate-[oneNightWagerCostPartIn_0.22s_ease-out_both]"
          >
            {part.text}
          </span>
        ))}
        {!complete ? (
          <span className="ml-0.5 inline-block w-[2px] animate-pulse text-violet-300/80" aria-hidden>
            |
          </span>
        ) : null}
      </div>
    </div>
  );
}

export default function OneNightWagerModal({ costsA, costsB, glowPlayer }: OneNightWagerModalProps) {
  return (
    <div className="fixed inset-0 z-[190] flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" aria-hidden />
      <div
        className="relative z-10 w-[min(92vw,26rem)] rounded-2xl border-2 border-violet-400/50 bg-slate-950/92 px-5 py-6 shadow-[0_0_48px_rgba(124,58,237,0.45)]"
        role="dialog"
        aria-label="한날 밤의 내기"
      >
        <h2 className="mb-1 text-center text-lg font-black tracking-wide text-violet-100">
          한날 밤의 내기
        </h2>
        <p className="mb-5 text-center text-[11px] font-bold text-violet-300/80">
          유닛 코스트 합이 더 낮은 플레이어가 모든 토큰을 잃습니다
        </p>
        <div className="flex flex-col gap-4">
          <CostLineReveal
            label="Player B"
            costs={costsB}
            glowing={glowPlayer === "B"}
            revealMs={ONE_NIGHT_WAGER_COST_REVEAL_MS}
          />
          <CostLineReveal
            label="Player A"
            costs={costsA}
            glowing={glowPlayer === "A"}
            revealMs={ONE_NIGHT_WAGER_COST_REVEAL_MS}
          />
        </div>
      </div>
    </div>
  );
}
