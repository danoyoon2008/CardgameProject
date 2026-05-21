import type { FieldCard } from "../../../types/game";
import type { DamageModContext, PassiveStatusFn, DamageModFn } from "../effectTypes";
import { hasConfusionStatus } from "./dinner";
import { UNIT } from "../unitIds";

/** 전투 로그·리포트용 (combatEngine calculateDamage 등) */
export const CHEOLGIBYEONG_REDUCTION_LOG = "방어력 (-200, 최소 100)";

export const CHEOLGIBYEONG_ID = UNIT.CHEOLGIBYEONG;

/** [혼란] 시 [도발]·방어력 +200 패시브 일시 봉인 */
export function isCheolgibyeongPassivesPausedByConfusion(
  card: FieldCard | null,
  facingOppCard: FieldCard | null
): boolean {
  if (!card || card.name !== CHEOLGIBYEONG_ID || (card.currentHp ?? 0) <= 0) return false;
  return hasConfusionStatus(card, facingOppCard);
}

export const getCheolgibyeongPassiveStatuses: PassiveStatusFn = (myCard, oppCard) => {
  if (isCheolgibyeongPassivesPausedByConfusion(myCard, oppCard)) return [];
  return ["도발", "방어력 +200"];
};

export const applyCheolgibyeongDamageMod: DamageModFn = (card: FieldCard, ctx: DamageModContext) => {
  if (isCheolgibyeongPassivesPausedByConfusion(card, null)) {
    return ctx.rawDamage;
  }
  return Math.max(100, ctx.rawDamage - 200);
};
