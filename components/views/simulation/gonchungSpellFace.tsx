"use client";

import type { CSSProperties } from "react";
import { GuardedImg, MOBILE_CARD_TOUCH_BLOCK_STYLE, preventImageContextMenu } from "../../ui/GuardedImg";
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

/** 멀티플레이 — 상대 손패·스펠·드로우 프리뷰용 카드 뒷면 */
export function MultiplayCardBackFace({ className }: { className?: string }) {
  return (
    <div
      className={`h-full w-full bg-white ${className ?? ""}`}
      aria-hidden
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
  /** 모바일 시뮬 필드 스펠 칸 — 회전 전 치수 스왑으로 슬롯(가로형)에 카드 전체 표시 */
  mobileFieldLayout?: boolean;
  mobileSpellSlotW?: number;
  mobileSpellSlotH?: number;
};

export function GonchungSpellStackTopFace({
  player,
  spell,
  opponentCardFlipped,
  revealGlow,
  showFront,
  teslaCounterOutlineGlow = false,
  ryeomhwaSuppressedOutlineGlow = false,
  mobileFieldLayout = false,
  mobileSpellSlotW,
  mobileSpellSlotH,
}: GonchungSpellFaceProps) {
  if (!showFront && isHiddenSpellCard(spell)) {
    return (
      <div
        className={`pointer-events-none absolute inset-0 rounded-[6px] ${mobileFieldLayout ? "overflow-hidden" : ryeomhwaSuppressedOutlineGlow ? "overflow-visible" : "overflow-hidden"}`}
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

  const flipSuffix = opponentCardFlipped ? " rotate-180" : "";
  const rotateClass =
    player === "B" ? `rotate-90${flipSuffix}` : `-rotate-90${flipSuffix}`;
  const imgRotate = mobileFieldLayout
    ? `object-contain ${rotateClass}`
    : player === "B"
      ? `h-full w-full object-contain rotate-90 scale-[1.58]${flipSuffix}`
      : `h-full w-full object-contain -rotate-90 scale-[1.58]${flipSuffix}`;
  const mobileImgStyle: CSSProperties | undefined =
    mobileFieldLayout && mobileSpellSlotW && mobileSpellSlotH
      ? {
          width: mobileSpellSlotH,
          height: mobileSpellSlotW,
          objectFit: "contain",
          flexShrink: 0,
        }
      : undefined;
  const textRotate = player === "B" && opponentCardFlipped ? "rotate-180" : "";

  return (
    <div
      className={`absolute inset-0 rounded-[6px] ${mobileFieldLayout ? "overflow-hidden" : "overflow-visible rounded-[8px]"}`}
      onContextMenu={preventImageContextMenu}
      style={MOBILE_CARD_TOUCH_BLOCK_STYLE}
    >
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
        mobileFieldLayout ? (
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
            <GuardedImg src={spell.image_url} alt="Spell" className={imgRotate} style={mobileImgStyle} />
          </div>
        ) : (
          <GuardedImg src={spell.image_url} alt="Spell" className={imgRotate} />
        )
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
