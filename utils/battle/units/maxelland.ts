import type { FieldCard } from "../../../types/game";
import { applyFlatAttackModifierByPattern, type AttackModifierOptions } from "../attackModifier";
import { UNIT } from "../unitIds";

export const MAXELLAND_ID = UNIT.MAXELLAND;

/** [투지] 게이지 최대 칸 수 */
export const MAXELLAND_TENACITY_GAUGE_CAP = 4 as const;

/** 게이지 1칸당 기본 공격력 보너스(표시·피해 합산에 동일 적용) */
export const MAXELLAND_TENACITY_ATK_PER_STACK = 400 as const;

export const MAXELLAND_TENACITY_BADGE_PREFIX = "[투지 : 공격력 +" as const;

/** 이전 표기 호환(디버프 면역·뱃지 스타일 분기) */
const MAXELLAND_TENACITY_BADGE_PREFIX_LEGACY = "[투지 : 기본 공격력 +" as const;

/** `getActiveStatuses` / 뱃지 정렬·툴팁용 동적 라벨 */
export function getMaxellandTenacityStatusBadge(card: FieldCard | null | undefined): string | null {
  if (!card || card.name !== MAXELLAND_ID) return null;
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

export function getMaxellandTenacityAtkBonus(card: FieldCard | null | undefined): number {
  if (!card || card.name !== MAXELLAND_ID) return 0;
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
  options?: AttackModifierOptions
): { primaryDamage: number; secondaryDamage: number } {
  const b = getMaxellandTenacityAtkBonus(attacker);
  return applyFlatAttackModifierByPattern(primaryDamage, secondaryDamage, b, options);
}

/** 기본 공격으로 적 유닛을 처치했을 때 게이지 +1(상한 내) */
export function bumpMaxellandTenacityGaugeOnEnemyKill(
  attackerCard: FieldCard,
  enemyUnitDestroyed: boolean
): Pick<FieldCard, "maxellandTenacityGauge"> | Record<string, never> {
  if (!enemyUnitDestroyed || attackerCard.name !== MAXELLAND_ID) return {};
  const cur = Math.max(0, Math.min(MAXELLAND_TENACITY_GAUGE_CAP, attackerCard.maxellandTenacityGauge ?? 0));
  if (cur >= MAXELLAND_TENACITY_GAUGE_CAP) return {};
  return { maxellandTenacityGauge: cur + 1 };
}
