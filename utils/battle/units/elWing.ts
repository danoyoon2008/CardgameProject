/**
 * 엘 윙(No.9) — 상시 [마법 면역](버프 금지·혼란 시 봉인).
 * 적 공격류 스펠(언덕!, 번개, 메테오, 개미지옥, 하이퍼 빔, 소멸) 무효.
 * [마법 면역]과 다른 스펠 상호작용은 추후 추가.
 */
import type { FieldCard, SimulationPlayerField } from "../../../types/game";
import { hasConfusionStatus } from "./dinner";
import { callieBuffBanSuppressesBuffsForVictim } from "./kalli";
import { UNIT } from "../unitIds";
import { isSuppressionActive } from "../debuffs/suppression";

export const EL_WING_ID = UNIT.EL_WING;

export const EL_WING_MAGIC_IMMUNITY_BADGE = "[마법 면역]" as const;

export const EL_WING_MAGIC_IMMUNITY_BLOCK_MSG =
  "[마법 면역] 상태의 유닛에게는 적용되지 않습니다" as const;

/** [신속] 게이지 최대 칸(사용 가능 횟수) */
export const EL_WING_SINSEOK_GAUGE_CAP = 2;

export const EL_WING_SINSEOK_SKILL_LABEL = "신속" as const;

/** 메테오 광역이 다른 적에게 실제 피해를 줄 때 엘 윙이 막힌 경우 [신속] 충전량 */
export const EL_WING_SINSEOK_GAIN_FROM_METEO_SPLASH = 1;

export const EL_WING_SINSEOK_BADGE = "[신속]" as const;

/** 상대 기본 공격 시 회피 선택 창 표시 시간 */
export const EL_WING_SINSEOK_PROMPT_MS = 5000;

export const EL_WING_ACTIVE = {
  pendingSkillKey: EL_WING_SINSEOK_SKILL_LABEL,
  gaugeCap: EL_WING_SINSEOK_GAUGE_CAP,
  promptMs: EL_WING_SINSEOK_PROMPT_MS,
} as const;

export function clampElWingSinseokGauge(value: number): number {
  return Math.max(0, Math.min(EL_WING_SINSEOK_GAUGE_CAP, value));
}

export function elWingSinseokGaugeFilled(card: FieldCard | null | undefined): number {
  if (!isElWingUnit(card)) return 0;
  return clampElWingSinseokGauge(card!.elWingSinseokGauge ?? 0);
}

export function elWingHasSinseokGauge(card: FieldCard | null | undefined): boolean {
  return elWingSinseokGaugeFilled(card) > 0;
}

export function elWingSinseokGaugeFull(card: FieldCard | null | undefined): boolean {
  return elWingSinseokGaugeFilled(card) >= EL_WING_SINSEOK_GAUGE_CAP;
}

export function isElWingUnit(card: FieldCard | null | undefined): boolean {
  return !!card && card.name === EL_WING_ID;
}

/** [혼란] 시 엘 윙 자신의 상시 면역 패시브 봉인 */
export function isElWingPassivesPausedByConfusion(
  card: FieldCard | null | undefined,
  facingOppCard: FieldCard | null
): boolean {
  if (!isElWingUnit(card) || (card!.currentHp ?? 0) <= 0) return false;
  return hasConfusionStatus(card!, facingOppCard);
}

function facingOppAtSlot(
  unitPlayer: "A" | "B",
  slot: "is" | "m" | "os",
  playerAField: SimulationPlayerField,
  playerBField: SimulationPlayerField
): FieldCard | null {
  const oppField = unitPlayer === "A" ? playerBField : playerAField;
  return oppField[slot] ?? null;
}

/** 상시 [마법 면역] 뱃지·효과(버프 금지·혼란 시 제거) */
export function elWingShowsMagicImmunity(
  unit: FieldCard | null | undefined,
  unitPlayer: "A" | "B",
  unitSlot: "is" | "m" | "os",
  playerAField: SimulationPlayerField,
  playerBField: SimulationPlayerField
): boolean {
  if (!isElWingUnit(unit) || (unit!.currentHp ?? 0) <= 0) return false;
  const facing = facingOppAtSlot(unitPlayer, unitSlot, playerAField, playerBField);
  if (isElWingPassivesPausedByConfusion(unit, facing)) return false;
  if (
    callieBuffBanSuppressesBuffsForVictim(unitPlayer, unitSlot, playerAField, playerBField)
  ) {
    return false;
  }
  return true;
}

/** 적이 시전하는 공격류 스펠이 이 유닛에 적용되지 않음 */
export function isElWingBlockingEnemyAttackSpell(
  target: FieldCard | null | undefined,
  targetPlayer: "A" | "B",
  targetSlot: "is" | "m" | "os",
  playerAField: SimulationPlayerField,
  playerBField: SimulationPlayerField
): boolean {
  return elWingShowsMagicImmunity(target, targetPlayer, targetSlot, playerAField, playerBField);
}

/** 메테오 광역으로 엘 윙 피해가 무효화될 때 [신속] 게이지 +1(상한 내, 단독 필드 포함) */
export function grantElWingSinseokGaugeFromMeteoSplash(
  card: FieldCard,
  amount: number = EL_WING_SINSEOK_GAIN_FROM_METEO_SPLASH
): FieldCard {
  if (!isElWingUnit(card)) return card;
  return {
    ...card,
    elWingSinseokGauge: clampElWingSinseokGauge((card.elWingSinseokGauge ?? 0) + amount),
  };
}

/**
 * 적 기본 공격이 엘 윙에 닿기 직전 — [신속] 게이지가 있고 상대 턴이면 회피 선택 창.
 * (피해·적중 효과·다굴 표시는 회피 성공 시 적용하지 않음)
 */
export function shouldOfferElWingSinseokOnBasicAttackHit(
  defender: FieldCard | null | undefined,
  defenderPlayer: "A" | "B",
  defenderSlot: "is" | "m" | "os",
  attackerPlayer: "A" | "B",
  currentTurn: "A" | "B",
  playerAField: SimulationPlayerField,
  playerBField: SimulationPlayerField
): boolean {
  if (isSuppressionActive(defender)) return false;
  if (!elWingHasSinseokGauge(defender)) return false;
  if (attackerPlayer === defenderPlayer) return false;
  if (currentTurn === defenderPlayer) return false;
  const facing = facingOppAtSlot(defenderPlayer, defenderSlot, playerAField, playerBField);
  if (isElWingPassivesPausedByConfusion(defender, facing)) return false;
  return true;
}
