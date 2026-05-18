"use client";

import type { FieldCard } from "../../../types/game";
import { isHiddenSpellCard } from "../../../utils/battle";

export function HiddenSpellCardBackFace({ className }: { className?: string }) {
  const Tag = "div" as const;
  return (
    <Tag
      className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-200 via-neutral-100 to-neutral-300 ${className ?? ""}`}
    />
  );
}

type GonchungSpellFaceProps = {
  player: "A" | "B";
  spell: FieldCard;
  opponentCardFlipped: boolean;
  revealGlow: boolean;
  showFront: boolean;
};

export function GonchungSpellStackTopFace({
  player,
  spell,
  opponentCardFlipped,
  revealGlow,
  showFront,
}: GonchungSpellFaceProps) {
  if (!showFront && isHiddenSpellCard(spell)) {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[8px]">
        <HiddenSpellCardBackFace />
      </div>
    );
  }

  const imgRotate =
    player === "B"
      ? `h-full w-full object-contain rotate-90 scale-[1.58] ${opponentCardFlipped ? "rotate-180" : ""}`
      : "h-full w-full object-contain -rotate-90 scale-[1.58]";
  const textRotate = player === "B" && opponentCardFlipped ? "rotate-180" : "";

  return (
    <div className="absolute inset-0 overflow-visible rounded-[8px]">
      {revealGlow ? <div className="pp-gonchung-hidden-reveal-aura" aria-hidden /> : null}
      {spell.image_url ? (
        <img src={spell.image_url} alt="Spell" className={imgRotate} />
      ) : (
        <span
          className={`p-2 text-center text-xs font-bold leading-tight text-purple-200 ${textRotate}`}
        >
          {spell.name}
        </span>
      )}
    </div>
  );
}
