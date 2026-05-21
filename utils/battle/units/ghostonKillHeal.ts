/**
 * 고스톤 — 적 처치 시 자신의 체력 전부 회복(패시브)
 */
import type { FieldCard } from "../../../types/game";
import type { AttackContext, PostAttackFn } from "../effectTypes";
import { hasConfusionStatus } from "./dinner";
import { UNIT } from "../unitIds";

const GHOSTONE_ID = UNIT.GHOSTONE;

export function isGhostone(card: FieldCard | null | undefined): boolean {
  return card != null && card.name === GHOSTONE_ID;
}

/** [혼란] 시 처치 전체 회복 패시브 봉인 */
export function isGhostoneKillFullHealPassiveSuppressed(
  card: FieldCard | null | undefined,
  facingOppCard: FieldCard | null
): boolean {
  if (!card || !isGhostone(card)) return false;
  return hasConfusionStatus(card, facingOppCard);
}

/** 처치 시 전체 회복 패치 적용 가능 여부 */
export function shouldApplyGhostoneKillFullHeal(
  card: FieldCard | null | undefined,
  ctx: AttackContext,
  facingOppCard?: FieldCard | null
): boolean {
  if (!ctx.targetDestroyed || !isGhostone(card)) return false;
  const facing = facingOppCard ?? ctx.facingOppCard ?? null;
  return !isGhostoneKillFullHealPassiveSuppressed(card, facing);
}

export function computeGhostoneKillFullHealPatch(
  card: FieldCard,
  ctx: AttackContext
): Partial<FieldCard> {
  if (!shouldApplyGhostoneKillFullHeal(card, ctx)) return {};
  return { currentHp: Number(card.hp) };
}

/**
 * `applyPostAttackSkills` 경유·직접 호출 모두 — [혼란]이면 빈 패치.
 * (`applyPostAttackSkills` 1차 차단 + 여기 2차 차단)
 */
export const postAttackGhostone: PostAttackFn = (card, ctx) =>
  computeGhostoneKillFullHealPatch(card, ctx);

/** 처치 패시브 연출(인디고 명멸·처치 피해 숫자) 표시 여부 — [혼란] 시 비활성 */
export function shouldShowGhostoneKillVisualFeedback(
  attacker: FieldCard | null | undefined,
  facingOppCard: FieldCard | null,
  targetDestroyed: boolean
): boolean {
  if (!targetDestroyed || !isGhostone(attacker)) return false;
  return !isGhostoneKillFullHealPassiveSuppressed(attacker, facingOppCard);
}

/** 처치 회복 연출(숫자·플래시) 표시 여부 */
export function shouldShowGhostoneKillFullHealFeedback(
  attacker: FieldCard | null | undefined,
  facingOppCard: FieldCard | null,
  healAmount: number,
  targetDestroyed: boolean
): boolean {
  return (
    targetDestroyed &&
    healAmount > 0 &&
    shouldApplyGhostoneKillFullHeal(attacker, { targetDestroyed: true, damageDealt: 0 }, facingOppCard)
  );
}
