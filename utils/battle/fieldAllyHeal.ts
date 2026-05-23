import type { FieldCard } from "../../types/game";
import type { HealSupportSource } from "./debuffs/suppression";
import {
  isHealBlockedBySuppression,
  isSuppressionActive,
} from "./debuffs/suppression";
import { healUnitCurrentHp } from "./hpSurvivalOnes";
import { isDiago } from "./units/diago";

/** 필드 전체 아군 회복(다이아고 기본 공격 등) — 수혜자별 지원 출처 */
export function getFieldAllyHealSupportSource(
  attacker: FieldCard,
  attackerSlot: "is" | "m" | "os",
  recipientSlot: "is" | "m" | "os"
): HealSupportSource {
  if (isDiago(attacker) && attackerSlot === recipientSlot) {
    return "selfAbility";
  }
  return "allyUnit";
}

/** [제압] — 수혜자·공격자 양쪽 유닛간 회복 차단 판정 */
export function isFieldAllyHealBlocked(
  recipient: FieldCard,
  recipientSlot: "is" | "m" | "os",
  attacker: FieldCard,
  attackerSlot: "is" | "m" | "os"
): boolean {
  const source = getFieldAllyHealSupportSource(attacker, attackerSlot, recipientSlot);
  if (isHealBlockedBySuppression(recipient, source)) return true;
  if (source === "allyUnit" && isSuppressionActive(attacker)) return true;
  return false;
}

/** 필드 광역 회복 1슬롯 — 제압·지원 출처 반영 */
export function applyFieldAllyHealToUnit(
  unit: FieldCard,
  healAmount: number,
  attacker: FieldCard,
  attackerSlot: "is" | "m" | "os",
  recipientSlot: "is" | "m" | "os"
): FieldCard {
  if (isFieldAllyHealBlocked(unit, recipientSlot, attacker, attackerSlot)) {
    return unit;
  }
  const source = getFieldAllyHealSupportSource(attacker, attackerSlot, recipientSlot);
  return healUnitCurrentHp(unit, healAmount, { supportSource: source });
}

/** VFX·전투 통계용 — 실제 적용된 회복량 */
export function computeFieldAllyHealApplied(
  unit: FieldCard,
  healAmount: number,
  attacker: FieldCard,
  attackerSlot: "is" | "m" | "os",
  recipientSlot: "is" | "m" | "os"
): number {
  const before = unit.currentHp ?? 0;
  const after =
    applyFieldAllyHealToUnit(unit, healAmount, attacker, attackerSlot, recipientSlot).currentHp ??
    0;
  return Math.max(0, after - before);
}
