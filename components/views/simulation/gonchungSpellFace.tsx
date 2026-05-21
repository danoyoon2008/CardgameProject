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
  /** 슈퍼 테슬라 반격 직후 필드에 노출되는 동안 시안 윤곽 광채 */
  teslaCounterOutlineGlow?: boolean;
  /** No.41 렴화 — 상대 패시브로 히든 트리거가 막힌 뒷면 스펠 보라 윤곽 */
  ryeomhwaSuppressedOutlineGlow?: boolean;
};

export function GonchungSpellStackTopFace({
  player,
  spell,
  opponentCardFlipped,
  revealGlow,
  showFront,
  teslaCounterOutlineGlow = false,
  ryeomhwaSuppressedOutlineGlow = false,
}: GonchungSpellFaceProps) {
  if (!showFront && isHiddenSpellCard(spell)) {
    return (
      <div
        className={`pointer-events-none absolute inset-0 rounded-[8px] ${ryeomhwaSuppressedOutlineGlow ? "overflow-visible" : "overflow-hidden"}`}
      >
        <HiddenSpellCardBackFace className={ryeomhwaSuppressedOutlineGlow ? "relative z-[1]" : undefined} />
        {ryeomhwaSuppressedOutlineGlow ? (
          <div
            className={
              player === "B"
                ? "pp-ryeomhwa-hidden-suppressed-outline pp-ryeomhwa-hidden-suppressed-outline--spell-land z-[30]"
                : "pp-ryeomhwa-hidden-suppressed-outline z-[30]"
            }
            aria-hidden
          />
        ) : null}
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
      {teslaCounterOutlineGlow ? (
        <div
          className={
            player === "B"
              ? "pp-super-tesla-counter-outline pp-super-tesla-counter-outline--spell-land"
              : "pp-super-tesla-counter-outline"
          }
          aria-hidden
        />
      ) : null}
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
