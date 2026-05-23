"use client";

/**
 * 그냥 모자 — 전투 규칙 + 기본 공격 적중 화염 연출
 *
 * 다른 모드(시뮬 외): 이 파일에서 export 하는 것만 사용하면 동일 동작.
 * - 규칙: postAttackGeunyangMoja, registry 에 등록됨
 * - 연출: `import "./geunyangMoja.hit-flame.css"` + useGeunyangMojaHitFlame() 또는 GeunyangMojaHitFlameOverlay
 */
import { useCallback, useRef, useState } from "react";
import type { FieldCard } from "../../../types/game";
import type { AttackContext, PostAttackFn } from "../effectTypes";
import { isEondeokSilenceActive } from "../spells/eondeok";
import { floorToNearest50Unit } from "../attackModifier";
import { healUnitCurrentHp } from "../hpSurvivalOnes";
import { UNIT } from "../unitIds";
import { getStatusNamesFromPhilipMatchup } from "./philip";
import "./geunyangMoja.hit-flame.css";

export const GEUNYANG_MOJA_ID = UNIT.GEUNYANG_MOJA;

/** [침묵] 시 기본 공격 체력 회복(흡혈)만 봉인 — 공격·화염 이펙트는 유지 */
export function isGeunyangMojaBasicAttackHealPausedBySilence(
  card: FieldCard | null,
  facingOppCard: FieldCard | null = null
): boolean {
  if (!card || card.name !== GEUNYANG_MOJA_ID) return false;
  if (isEondeokSilenceActive(card)) return true;
  return getStatusNamesFromPhilipMatchup(facingOppCard, card).length > 0;
}

/** 기본 공격 흡혈: 입힌 피해의 50%를 회복 — 50% 계산 후 50 단위로 버림 */
export const postAttackGeunyangMoja: PostAttackFn = (card: FieldCard, ctx: AttackContext) => {
  if (isGeunyangMojaBasicAttackHealPausedBySilence(card, ctx.facingOppCard ?? null)) {
    return {};
  }
  const half = Math.floor(ctx.damageDealt * 0.5);
  const healAmount = floorToNearest50Unit(half);
  return healUnitCurrentHp(card, healAmount);
};

export const GEUNYANG_MOJA_HIT_FLAME_DURATION_MS = 520;

export function shouldTriggerGeunyangMojaHitFlame(
  attacker: FieldCard | null | undefined,
  damageDealt: number
): boolean {
  return damageDealt > 0 && attacker != null && attacker.name === GEUNYANG_MOJA_ID;
}

export interface GeunyangMojaHitFlameOverlayProps {
  slotKey: string;
  burstId: number | undefined;
  roundedClass: string;
}

export function GeunyangMojaHitFlameOverlay({
  slotKey,
  burstId,
  roundedClass,
}: GeunyangMojaHitFlameOverlayProps) {
  if (burstId == null) return null;
  return (
    <div
      key={`${slotKey}-moja-${burstId}`}
      className={`pointer-events-none absolute inset-0 z-[24] flex items-center justify-center overflow-hidden ${roundedClass}`}
      aria-hidden
    >
      <div className="pp-moja-flame-wrap">
        <span className="pp-moja-flame-core" />
        <span className="pp-moja-flame-ring" />
        <span className="pp-moja-flame-spark pp-moja-flame-spark--1" />
        <span className="pp-moja-flame-spark pp-moja-flame-spark--2" />
        <span className="pp-moja-flame-spark pp-moja-flame-spark--3" />
      </div>
    </div>
  );
}

export function useGeunyangMojaHitFlame() {
  const [burst, setBurst] = useState<Record<string, number>>({});
  const seqRef = useRef(0);
  const timeoutsRef = useRef<Record<string, number>>({});

  const trigger = useCallback(
    (attacker: FieldCard | null | undefined, targetSlotKey: string, damageDealt: number) => {
      if (!shouldTriggerGeunyangMojaHitFlame(attacker, damageDealt)) return;
      const prevT = timeoutsRef.current[targetSlotKey];
      if (prevT) window.clearTimeout(prevT);
      const id = ++seqRef.current;
      setBurst(f => ({ ...f, [targetSlotKey]: id }));
      timeoutsRef.current[targetSlotKey] = window.setTimeout(() => {
        setBurst(f => {
          const next = { ...f };
          delete next[targetSlotKey];
          return next;
        });
        delete timeoutsRef.current[targetSlotKey];
      }, GEUNYANG_MOJA_HIT_FLAME_DURATION_MS);
    },
    []
  );

  const clearAll = useCallback(() => {
    Object.values(timeoutsRef.current).forEach(t => window.clearTimeout(t));
    timeoutsRef.current = {};
    setBurst({});
  }, []);

  const renderOverlay = useCallback(
    (slotKey: string, roundedClass: string) => (
      <GeunyangMojaHitFlameOverlay
        slotKey={slotKey}
        burstId={burst[slotKey]}
        roundedClass={roundedClass}
      />
    ),
    [burst]
  );

  return { trigger, renderOverlay, clearAll };
}
