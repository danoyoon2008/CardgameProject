import type { FieldCard } from "../../../types/game";
import type { PostAttackFn } from "../effectTypes";
import { applyFlatAttackModifierByPattern, floorToNearest50Unit, type AttackModifierOptions } from "../attackModifier";
import { hasConfusionStatus } from "./dinner";
import { UNIT } from "../unitIds";
import { healUnitCurrentHp } from "../hpSurvivalOnes";

export const DARK_KNIGHT_ID = UNIT.DARK_KNIGHT;

/** 소울 게이지 최대 칸 수 */
export const DARK_KNIGHT_GAUGE_CAP = 5 as const;

/** [역린] — 게이지 1칸당 기본 공격력 보너스 */
export const YORIN_ATK_BONUS_PER_SOUL = 100;

/** 필드 효과 뱃지 라벨 (`getActiveStatuses` / UI 정렬 키) */
export const YORIN_STATUS_BADGE = "[역린]";

type FieldSlice = {
  field: {
    is: FieldCard | null;
    m: FieldCard | null;
    os: FieldCard | null;
  };
};

/** [혼란] 시 역린·게이지 충전·처치 회복·만축 전투 효과 일시 봉인(소울 게이지 수치는 유지) */
export function isDarkKnightPassivesPausedByConfusion(
  card: FieldCard | null | undefined,
  facingOppCard: FieldCard | null
): boolean {
  if (!card || card.name !== DARK_KNIGHT_ID || (card.currentHp ?? 0) <= 0) return false;
  return hasConfusionStatus(card, facingOppCard);
}

/** 인디고 처치·만축 타격 등 패시브 전투 연출 재생 여부 */
export function shouldPlayDarkKnightKillVfx(
  attacker: FieldCard | null | undefined,
  facingOppCard: FieldCard | null
): boolean {
  if (!attacker || attacker.name !== DARK_KNIGHT_ID) return false;
  return !isDarkKnightPassivesPausedByConfusion(attacker, facingOppCard);
}

/** 만축 기본 공격 연출·필드 만축 링 등 패시브 전투 효과가 켜져 있는지 */
export function darkKnightSoulGaugeFullForCombat(
  card: FieldCard | null | undefined,
  facingOppCard: FieldCard | null
): boolean {
  if (!darkKnightSoulGaugeFull(card)) return false;
  return !isDarkKnightPassivesPausedByConfusion(card, facingOppCard);
}

/** 유효 소울 칸(0~CAP)에 따른 [역린] 공격력 보정 합 */
export function getDarkKnightYorinAtkBonus(
  card: FieldCard | null | undefined,
  facingOppCard: FieldCard | null = null
): number {
  if (!card || card.name !== DARK_KNIGHT_ID) return 0;
  if (isDarkKnightPassivesPausedByConfusion(card, facingOppCard)) return 0;
  const stacks = Math.max(0, Math.min(DARK_KNIGHT_GAUGE_CAP, card.darkKnightSoulGauge ?? 0));
  return stacks * YORIN_ATK_BONUS_PER_SOUL;
}

/** 1차·연쇄 등 파싱된 수치에 [역린] 보너스 합산 */
export function applyDarkKnightYorinToAttackDamage(
  attacker: FieldCard,
  primaryDamage: number,
  secondaryDamage: number,
  options?: AttackModifierOptions,
  facingOppCard: FieldCard | null = null
): { primaryDamage: number; secondaryDamage: number } {
  const b = getDarkKnightYorinAtkBonus(attacker, facingOppCard);
  return applyFlatAttackModifierByPattern(primaryDamage, secondaryDamage, b, options);
}

/** 처치 시 회복: 상대 최대 체력의 25%(50단위 버림), 최소 600 */
export function darkKnightHealOnKillFromVictimMaxHp(maxHp: number): number {
  const mh = Number(maxHp);
  if (!Number.isFinite(mh) || mh <= 0) return 600;
  return Math.max(600, floorToNearest50Unit(mh * 0.25));
}

export const postAttackDarkKnight: PostAttackFn = (card, ctx) => {
  if (card.name !== DARK_KNIGHT_ID || !ctx.targetDestroyed) return {};
  const facing = ctx.facingOppCard ?? null;
  if (isDarkKnightPassivesPausedByConfusion(card, facing)) return {};
  const mh = ctx.targetMaxHpWhenDestroyed;
  if (mh == null || !Number.isFinite(mh) || mh <= 0) return {};
  const heal = darkKnightHealOnKillFromVictimMaxHp(mh);
  return healUnitCurrentHp(card, heal);
};

/**
 * 아군·적 구분 없이 유닛 1명이 필드에서 처치될 때 호출합니다.
 * 살아 있는 모든 다크나이트의 `darkKnightSoulGauge`를 1 충전(상한 적용).
 * [혼란]인 다크나이트는 충전하지 않습니다.
 */
export function incrementDarkKnightGaugesOnUnitDeath(newPA: FieldSlice, newPB: FieldSlice): void {
  for (const [owner, self, opp] of [
    ["A", newPA, newPB],
    ["B", newPB, newPA],
  ] as const) {
    for (const slot of ["is", "m", "os"] as const) {
      const c = self.field[slot];
      if (!c || c.name !== DARK_KNIGHT_ID || c.currentHp <= 0) continue;
      const facing = opp.field[slot] ?? null;
      if (isDarkKnightPassivesPausedByConfusion(c, facing)) continue;
      const cur = typeof c.darkKnightSoulGauge === "number" ? c.darkKnightSoulGauge : 0;
      if (cur >= DARK_KNIGHT_GAUGE_CAP) continue;
      self.field[slot] = {
        ...c,
        darkKnightSoulGauge: Math.min(DARK_KNIGHT_GAUGE_CAP, cur + 1),
      };
    }
  }
}

export function darkKnightSoulGaugeFull(card: FieldCard | null | undefined): boolean {
  if (!card || card.name !== DARK_KNIGHT_ID) return false;
  return (card.darkKnightSoulGauge ?? 0) >= DARK_KNIGHT_GAUGE_CAP;
}
