import type { FieldCard } from "../../types/game";
import {
  isHealBlockedBySuppression,
  type HealSupportSource,
} from "./debuffs/suppression";

/**
 * 체력 1 생존 표기(백스 패시브·번개·귀환 부활 등) — 「0이 아님」을 나타내는 일의자리 1.
 * 회복으로 일의자리 1이 다시 붙으면(201 등) 1회만 버려 0 단위로 맞춘다. 단독 체력 1은 유지.
 */
export function markFieldCardHpSurvivalOnes(card: FieldCard, currentHp: number): FieldCard {
  if (currentHp !== 1) return { ...card, currentHp };
  return { ...card, currentHp: 1, hpSurvivalOnesMarker: true };
}

/**
 * 회복·최대체력 캡 적용 후 일의자리 유령 1 정리. `hpBefore`가 1이거나 마커가 있을 때만 1회 발동.
 */
export function finalizeUnitHpAfterHeal(card: FieldCard, hpAfterRaw: number): FieldCard {
  const hpBefore = card.currentHp ?? 0;
  const maxHp = Number(card.hp) || 0;
  let hp = Math.min(maxHp > 0 ? maxHp : hpAfterRaw, hpAfterRaw);
  let marker = card.hpSurvivalOnesMarker;

  const mayStrip =
    hp > 1 &&
    hp % 10 === 1 &&
    (marker === true || hpBefore === 1);

  if (mayStrip) {
    hp -= 1;
    marker = undefined;
  }

  const next: FieldCard = { ...card, currentHp: hp };
  if (marker) {
    next.hpSurvivalOnesMarker = true;
  } else {
    delete next.hpSurvivalOnesMarker;
  }
  return next;
}

export type { HealSupportSource } from "./debuffs/suppression";

export type HealUnitCurrentHpOpts = {
  maxHpOverride?: number;
  /** 생략 시 [제압] 회복 차단 미적용(레거시 호출). 지원 회복은 반드시 지정 */
  supportSource?: HealSupportSource;
};

/** `currentHp + healAmount` 후 `finalizeUnitHpAfterHeal`까지 적용 */
export function healUnitCurrentHp(
  card: FieldCard,
  healAmount: number,
  opts?: HealUnitCurrentHpOpts
): FieldCard {
  if (
    opts?.supportSource &&
    isHealBlockedBySuppression(card, opts.supportSource)
  ) {
    return card;
  }
  const maxHp = opts?.maxHpOverride ?? (Number(card.hp) || 0);
  const raw = Math.min(maxHp > 0 ? maxHp : (card.currentHp ?? 0) + healAmount, (card.currentHp ?? 0) + healAmount);
  return finalizeUnitHpAfterHeal(card, raw);
}

/**
 * 피해·전투 판정 직전 — 마커가 남아 일의자리 1이 붙은 표기(201 등)를 1회 정리.
 * 회복 없이 피해만 받는 경우(201 상태)에도 올바른 체력으로 계산한다.
 */
export function normalizeUnitHpSurvivalOnesForCombat(card: FieldCard): FieldCard {
  const hp = card.currentHp ?? 0;
  if (!card.hpSurvivalOnesMarker || hp <= 1 || hp % 10 !== 1) return card;
  const next: FieldCard = { ...card, currentHp: hp - 1 };
  delete next.hpSurvivalOnesMarker;
  return next;
}
