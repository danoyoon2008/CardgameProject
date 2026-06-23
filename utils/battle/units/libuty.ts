/**
 * 리부티 (No.10) — 기본 공격 전체 적 300 / 기본 피격 시 반사 고정 피해(캘리 고정과 동일 계열).
 */
import type { FieldCard, SimulationPlayerField } from "../../../types/game";
import {
  hpBarrierPatchFromRemaining,
  splitDamageThroughHpBarrier,
} from "../spells/orietChosang";
import { isInvulnerableFromBaekseuOrCheolbyeok } from "../spells/cheolbyeok";
import { UNIT } from "../unitIds";
import {
  isBaekseuInvulnerable,
  resolveBaekseuFatalDamage,
  stripBaekseuHarmfulEffectsForInvuln,
} from "./baekseu";
import { hasConfusionStatus } from "./dinner";
import { normalizeUnitHpSurvivalOnesForCombat } from "../hpSurvivalOnes";

export const LIBUTY_ID = UNIT.LIBUTY;

/** 기본 공격 — 필드에 있는 각 적에게 동시에 가하는 피해(방어·감소는 일반 기본 공격과 동일 적용). */
export const LIBUTY_BASIC_AOE_DAMAGE = 300;

/** 기본 공격으로 리부티에게 HP가 깎일 때, 공격자에게 되돌아가는 고정 피해(방어·감소 무시, 보호막·백스 규칙은 적용). */
export const LIBUTY_REFLECT_PURE_DAMAGE = 300;

export function isLibuty(card: FieldCard | null | undefined): boolean {
  return card != null && card.name === LIBUTY_ID;
}

/** [혼란] 시 반사 패시브 봉인 — 「모든 적 공격」 기본 공격 방식은 유지 */
export function isLibutyReflectPassiveSuppressed(
  libutyCard: FieldCard | null | undefined,
  facingOppCard: FieldCard | null
): boolean {
  if (!libutyCard || !isLibuty(libutyCard)) return false;
  return hasConfusionStatus(libutyCard, facingOppCard);
}

/** 기본 공격으로 HP가 깎였을 때 반사 발동 여부 */
export function shouldApplyLibutyBasicAttackReflect(
  libutyCard: FieldCard | null | undefined,
  facingOppCard: FieldCard | null,
  hpLossFromBasicAttack: number
): boolean {
  if (hpLossFromBasicAttack <= 0) return false;
  return isLibuty(libutyCard) && !isLibutyReflectPassiveSuppressed(libutyCard, facingOppCard);
}

export type LibutyReflectPureResult = {
  finalHp: number;
  hpLoss: number;
  isDestroyed: boolean;
  patch: Partial<FieldCard>;
  baekseuLastStand: boolean;
  barrierPatch: Partial<FieldCard>;
};

/**
 * 리부티 반사: `applyIncomingDefenseDamage`·반짓고리 경감을 쓰지 않고, 보호막·백스 무적/1HP 규칙만 적용.
 * (기본 공격으로 리부티에게 HP가 깎일 때만 발동 — 전설의 검 패시브 연격 등은 제외.)
 */
export function computeLibutyReflectPureDamageOnAggressor(
  aggressor: FieldCard,
  pureAmount: number = LIBUTY_REFLECT_PURE_DAMAGE,
  facingOppCard: FieldCard | null = null,
  aggressorField?: SimulationPlayerField
): LibutyReflectPureResult | null {
  if (!aggressor || (aggressor.currentHp ?? 0) <= 0 || pureAmount <= 0) return null;

  const invuln = aggressorField
    ? isInvulnerableFromBaekseuOrCheolbyeok(aggressor, aggressorField)
    : isBaekseuInvulnerable(aggressor);

  if (invuln) {
    return {
      finalHp: aggressor.currentHp,
      hpLoss: 0,
      isDestroyed: false,
      patch: {},
      baekseuLastStand: false,
      barrierPatch: {},
    };
  }
  const barrierSplit = splitDamageThroughHpBarrier(aggressor, pureAmount);
  const aggressorForCombat = normalizeUnitHpSurvivalOnesForCombat(aggressor);
  const hpAfterRaw = aggressorForCombat.currentHp - barrierSplit.damageToCurrentHp;
  const resolved = resolveBaekseuFatalDamage(
    aggressorForCombat,
    hpAfterRaw,
    barrierSplit.damageToCurrentHp,
    facingOppCard
  );
  const hpLoss = Math.max(0, aggressorForCombat.currentHp - resolved.finalHp);
  return {
    finalHp: resolved.finalHp,
    hpLoss,
    isDestroyed: resolved.isDestroyed,
    patch: resolved.patch,
    baekseuLastStand: resolved.lastStandTriggered,
    barrierPatch: hpBarrierPatchFromRemaining(barrierSplit.nextBarrierRemaining),
  };
}

/** 반사로 공격자 카드에 합성할 패치(무적이면 원본 유지). */
export function applyLibutyReflectPatchToAggressorCard(
  aggressor: FieldCard,
  reflect: LibutyReflectPureResult | null
): FieldCard {
  if (!reflect || reflect.hpLoss <= 0) return aggressor;
  const base =
    Object.keys(reflect.patch).length > 0
      ? stripBaekseuHarmfulEffectsForInvuln(aggressor)
      : aggressor;
  return {
    ...base,
    ...reflect.patch,
    ...reflect.barrierPatch,
    currentHp: reflect.finalHp,
  };
}
