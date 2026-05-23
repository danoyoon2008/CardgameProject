/**
 * [제압] — 외부 지원 금지·서포트 금지·[구속](신속 사용 불가) 복합 디버프.
 * 스펠 No.43 개미지옥 등으로 부여. [디버프 면역] 오라 시 부여·표시 무시.
 */
import type { FieldCard, SimulationPlayerField } from "../../../types/game";
import { SUPPRESSION_DEBUFF_BADGE } from "../effectSemantics";
import { unitAllyFieldHasDebuffImmunityAura } from "../units/pakki";
import type { IronKiwiDebuffImmunityFieldContext } from "../units/ironKiwi";

export { SUPPRESSION_DEBUFF_BADGE };

/** 4×턴 = 양측 턴 종료 합 8회(비즈니스 강도단·방어막과 동일 틱 규칙) */
export const SUPPRESSION_INITIAL_END_TURN_TICKS = 8;

export type HealSupportSource = "selfAbility" | "allyUnit" | "playerSpell" | "allyDeathAura";

export function isSuppressionActive(card: FieldCard | null | undefined): boolean {
  return !!card && (card.suppressionEndTurnTicksRemaining ?? 0) > 0;
}

type AllyFieldSlice =
  | SimulationPlayerField
  | Partial<Record<"is" | "m" | "os", FieldCard | null>>;

export function canApplySuppressionDebuffToUnit(
  victimAllyField: AllyFieldSlice,
  ironKiwiCtx?: IronKiwiDebuffImmunityFieldContext
): boolean {
  return !unitAllyFieldHasDebuffImmunityAura(
    victimAllyField as SimulationPlayerField,
    ironKiwiCtx
  );
}

/** 부여·갱신 시 카드에 남아 있던 버프·링크·보호막 플래그 제거 */
export function stripSuppressionBlockedBuffFlags(card: FieldCard): FieldCard {
  const next: FieldCard = { ...card };
  delete next.hasBanjitgori;
  delete next.hasLimeBubbleShieldBuff;
  delete next.linkedSource;
  delete next.hasConcentratedFire;
  if (next.hpBarrierAbsorptionRemaining != null) {
    delete next.hpBarrierAbsorptionRemaining;
  }
  return next;
}

export function applySuppressionDebuffToUnit(
  card: FieldCard,
  ticks: number = SUPPRESSION_INITIAL_END_TURN_TICKS
): FieldCard {
  const stripped = stripSuppressionBlockedBuffFlags(card);
  return { ...stripped, suppressionEndTurnTicksRemaining: ticks };
}

/** 턴 넘김 1회마다 — [제압] 남은 틱 1 감소 */
export function applyEndTurnSuppressionTickToFieldUnit(u: FieldCard): FieldCard {
  const n = u.suppressionEndTurnTicksRemaining;
  if (n == null || n <= 0) return u;
  const next = n - 1;
  if (next <= 0) {
    const { suppressionEndTurnTicksRemaining: _s, ...rest } = u;
    return rest as FieldCard;
  }
  return { ...u, suppressionEndTurnTicksRemaining: next };
}

export function getSuppressionStatusesForCard(card: FieldCard): string[] {
  if (!isSuppressionActive(card)) return [];
  return [SUPPRESSION_DEBUFF_BADGE];
}

/** [제압] 중 외부·아군 지원 회복 차단. `selfAbility`만 허용 */
export function isHealBlockedBySuppression(
  target: FieldCard | null | undefined,
  source: HealSupportSource
): boolean {
  if (!isSuppressionActive(target)) return false;
  return source !== "selfAbility";
}

/** [제압] 중 플레이어 스펠·아군 유닛이 주는 버프·오라·회복 수혜 불가 */
export function suppressionBlocksExternalBuffEffects(card: FieldCard | null | undefined): boolean {
  return isSuppressionActive(card);
}

/** @deprecated `suppressionBlocksExternalBuffEffects` 와 동일 */
export const unitReceivesAllyFieldSupport = (card: FieldCard | null | undefined): boolean =>
  !isSuppressionActive(card);

/** [제압] 표시·도발 판정 — 자기 패시브 버프는 유지, [도발]만 제거 */
export function filterStatusesForSuppressionDisplay<T extends readonly string[] | string[]>(
  labels: T
): string[] {
  return labels.filter(label => label !== "도발");
}

/** @deprecated `filterStatusesForSuppressionDisplay` — 구명·HMR 캐시 호환 */
export function filterStatusLabelsUnderSuppression<T extends readonly string[] | string[]>(
  labels: T,
  _card?: FieldCard | null
): string[] {
  return filterStatusesForSuppressionDisplay(labels);
}
