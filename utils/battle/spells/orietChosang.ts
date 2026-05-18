import type { FieldCard } from "../../../types/game";

type CardRowLite = { name?: string; number?: number };

/** No.48 마법 — 아군 유닛에게 드롭, 체력 보호막(피해 흡수) 1000, 효과 뱃지 없음 */
export const ORIET_CHOSANG_SPELL_ID = "오리에트의 초상" as const;

/** 규칙·주석용 판정명(뱃지 아님) */
export const HP_BARRIER_JUDGMENT_NAME = "체력 보호막" as const;

export const ORIET_CHOSANG_HP_BARRIER_AMOUNT = 1000 as const;

export function isOrietChosangSpellCard(
  card: FieldCard | CardRowLite | null | undefined
): boolean {
  if (!card) return false;
  if (card.name === ORIET_CHOSANG_SPELL_ID) return true;
  const n = Number((card as FieldCard).number);
  return Number.isFinite(n) && n === 48;
}

/** `FieldCard.hpBarrierAbsorptionRemaining` — 남은 흡수량(0이면 필드 패치에서 제거 권장) */
export function getHpBarrierRemaining(card: FieldCard | null | undefined): number {
  if (!card) return 0;
  const v = card.hpBarrierAbsorptionRemaining;
  return typeof v === "number" && v > 0 ? v : 0;
}

/**
 * 방어 패시브·반짓고리 등 적용된 피해(무적이면 0)에 대해 체력 보호막이 먼저 흡수하고,
 * 남은 양만 `currentHp`에 반영한다.
 * `bypassAbsorption`: 시작의 망령 기본 공격 등 — 보호막을 깎지 않고 전부 체력에 반영.
 */
export function splitDamageThroughHpBarrier(
  card: FieldCard,
  damageAfterMitigation: number,
  opts?: { bypassAbsorption?: boolean }
): { damageToCurrentHp: number; nextBarrierRemaining: number } {
  if (damageAfterMitigation <= 0) {
    return { damageToCurrentHp: 0, nextBarrierRemaining: getHpBarrierRemaining(card) };
  }
  const b0 = getHpBarrierRemaining(card);
  if (opts?.bypassAbsorption) {
    return { damageToCurrentHp: damageAfterMitigation, nextBarrierRemaining: b0 };
  }
  const absorbed = Math.min(damageAfterMitigation, b0);
  return {
    damageToCurrentHp: damageAfterMitigation - absorbed,
    nextBarrierRemaining: b0 - absorbed,
  };
}

export function hpBarrierPatchFromRemaining(next: number): Partial<FieldCard> {
  if (next <= 0) return { hpBarrierAbsorptionRemaining: undefined };
  return { hpBarrierAbsorptionRemaining: next };
}
