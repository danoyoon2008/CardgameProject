import type { FieldCard } from "../../../types/game";
import { applyFlatAttackModifierByPattern, type AttackModifierOptions } from "../attackModifier";
import { hasConfusionStatus } from "./dinner";
import { UNIT } from "../unitIds";

export const MAXELLAND_ID = UNIT.MAXELLAND;

/** [투지] 게이지 최대 칸 수 */
export const MAXELLAND_TENACITY_GAUGE_CAP = 4 as const;

/** 게이지 1칸당 기본 공격력 보너스(표시·피해 합산에 동일 적용) */
export const MAXELLAND_TENACITY_ATK_PER_STACK = 400 as const;

export const MAXELLAND_TENACITY_BADGE_PREFIX = "[투지 : 공격력 +" as const;

/** 이전 표기 호환(디버프 면역·뱃지 스타일 분기) */
const MAXELLAND_TENACITY_BADGE_PREFIX_LEGACY = "[투지 : 기본 공격력 +" as const;

/** [혼란] 시 [투지] 공격 보너스·처치 충전·만축 전투 효과 일시 봉인(게이지 수치는 유지) */
export function isMaxellandTenacityPassivePausedByConfusion(
  card: FieldCard | null | undefined,
  facingOppCard: FieldCard | null
): boolean {
  if (!card || card.name !== MAXELLAND_ID || (card.currentHp ?? 0) <= 0) return false;
  return hasConfusionStatus(card, facingOppCard);
}

/** 붉은 적 처치 능력 발동 이펙트(처치자·피해자 동시 섬광) 재생 여부 */
export function shouldPlayMaxellandKillVfx(
  attacker: FieldCard | null | undefined,
  facingOppCard: FieldCard | null
): boolean {
  if (!attacker || attacker.name !== MAXELLAND_ID) return false;
  return !isMaxellandTenacityPassivePausedByConfusion(attacker, facingOppCard);
}

/** 만축 기본 공격 연출·외곽 전투 강조 등 패시브 전투 효과가 켜져 있는지 */
export function maxellandTenacityGaugeFullForCombat(
  card: FieldCard | null | undefined,
  facingOppCard: FieldCard | null
): boolean {
  if (!maxellandTenacityGaugeFull(card)) return false;
  return !isMaxellandTenacityPassivePausedByConfusion(card, facingOppCard);
}

/** `getActiveStatuses` / 뱃지 정렬·툴팁용 동적 라벨 */
export function getMaxellandTenacityStatusBadge(
  card: FieldCard | null | undefined,
  facingOppCard: FieldCard | null = null
): string | null {
  if (!card || card.name !== MAXELLAND_ID) return null;
  if (isMaxellandTenacityPassivePausedByConfusion(card, facingOppCard)) return null;
  const stacks = Math.max(0, Math.min(MAXELLAND_TENACITY_GAUGE_CAP, card.maxellandTenacityGauge ?? 0));
  if (stacks <= 0) return null;
  const bonus = stacks * MAXELLAND_TENACITY_ATK_PER_STACK;
  return `${MAXELLAND_TENACITY_BADGE_PREFIX}${bonus}]`;
}

export function isMaxellandTenacityStatusBadge(status: string): boolean {
  if (!status.endsWith("]")) return false;
  return (
    status.startsWith(MAXELLAND_TENACITY_BADGE_PREFIX) ||
    status.startsWith(MAXELLAND_TENACITY_BADGE_PREFIX_LEGACY)
  );
}

export function getMaxellandTenacityAtkBonus(
  card: FieldCard | null | undefined,
  facingOppCard: FieldCard | null = null
): number {
  if (!card || card.name !== MAXELLAND_ID) return 0;
  if (isMaxellandTenacityPassivePausedByConfusion(card, facingOppCard)) return 0;
  const stacks = Math.max(0, Math.min(MAXELLAND_TENACITY_GAUGE_CAP, card.maxellandTenacityGauge ?? 0));
  return stacks * MAXELLAND_TENACITY_ATK_PER_STACK;
}

export function maxellandTenacityGaugeFull(card: FieldCard | null | undefined): boolean {
  if (!card || card.name !== MAXELLAND_ID) return false;
  return (card.maxellandTenacityGauge ?? 0) >= MAXELLAND_TENACITY_GAUGE_CAP;
}

/** 1차·연쇄 타격 파싱 피해에 [투지] 보너스 합산 */
export function applyMaxellandTenacityToAttackDamage(
  attacker: FieldCard,
  primaryDamage: number,
  secondaryDamage: number,
  options?: AttackModifierOptions,
  facingOppCard: FieldCard | null = null
): { primaryDamage: number; secondaryDamage: number } {
  const b = getMaxellandTenacityAtkBonus(attacker, facingOppCard);
  return applyFlatAttackModifierByPattern(primaryDamage, secondaryDamage, b, options);
}

/** 기본 공격으로 적 유닛을 처치했을 때 게이지 +1(상한 내) */
export function bumpMaxellandTenacityGaugeOnEnemyKill(
  attackerCard: FieldCard,
  enemyUnitDestroyed: boolean,
  facingOppCard: FieldCard | null = null
): Pick<FieldCard, "maxellandTenacityGauge"> | Record<string, never> {
  if (!enemyUnitDestroyed || attackerCard.name !== MAXELLAND_ID) return {};
  if (isMaxellandTenacityPassivePausedByConfusion(attackerCard, facingOppCard)) return {};
  const cur = Math.max(0, Math.min(MAXELLAND_TENACITY_GAUGE_CAP, attackerCard.maxellandTenacityGauge ?? 0));
  if (cur >= MAXELLAND_TENACITY_GAUGE_CAP) return {};
  return { maxellandTenacityGauge: cur + 1 };
}
