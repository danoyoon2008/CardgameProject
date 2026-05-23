/**
 * 모닝 무드 — 필드 체류: [지원형] 아군(본인 제외) [공격력 +300], 처치 시 같은 진영 전원 400 회복.
 * [혼란] 시 패시브 일시 봉인(공격 오라·처치 회복·연출 없음).
 */
import type { FieldCard, SimulationPlayerField } from "../../../types/game";
import { applyFlatAttackModifierByPattern, type AttackModifierOptions } from "../attackModifier";
import {
  DINNER_OPP_CONFUSION_STATUS,
  getActiveConfusionStatusNames,
} from "./dinner";
import { PYRED_ATTACK_AURA_BADGE, PYRED_ATTACK_AURA_BONUS } from "./pyred";
import { UNIT } from "../unitIds";
import { isSuppressionActive } from "../debuffs/suppression";

export const MORNING_MOOD_ID = UNIT.MORNING_MOOD;
export const MORNING_MOOD_ALLY_HEAL_ON_DEATH = 400 as const;

type FieldSlice = SimulationPlayerField | Partial<Record<"is" | "m" | "os", FieldCard | null>>;

export type MorningMoodFieldContext = {
  allyPlayer: "A" | "B";
  playerAField: FieldSlice;
  playerBField: FieldSlice;
};

function isSupportTypeUnit(card: FieldCard | null | undefined): boolean {
  if (!card) return false;
  const typeStr = String(card.type ?? "").toLowerCase();
  return typeStr.includes("지원형") || typeStr.includes("support");
}

/** [혼란] 시 공격 오라·처치 회복 등 패시브 일시 봉인. `ignoreHp`: 처치 직후 0 HP 판정용 */
export function isMorningMoodPassivesPausedByConfusion(
  card: FieldCard | null | undefined,
  facingOppCard: FieldCard | null,
  opts?: { ignoreHp?: boolean }
): boolean {
  if (!card || card.name !== MORNING_MOOD_ID) return false;
  if (!opts?.ignoreHp && (card.currentHp ?? 0) <= 0) return false;
  return getActiveConfusionStatusNames(facingOppCard).includes(DINNER_OPP_CONFUSION_STATUS);
}

function isMorningMoodAuraSourceActive(
  card: FieldCard,
  slot: "is" | "m" | "os",
  ctx?: MorningMoodFieldContext
): boolean {
  if ((card.currentHp ?? 0) <= 0 || card.name !== MORNING_MOOD_ID) return false;
  if (!ctx) return true;
  const oppField = ctx.allyPlayer === "A" ? ctx.playerBField : ctx.playerAField;
  const facing = oppField[slot] ?? null;
  return !isMorningMoodPassivesPausedByConfusion(card, facing);
}

export function fieldHasLivingMorningMood(
  field: FieldSlice | undefined | null,
  ctx?: MorningMoodFieldContext
): boolean {
  if (!field) return false;
  for (const slot of ["is", "m", "os"] as const) {
    const c = field[slot];
    if (!c || c.name !== MORNING_MOOD_ID || (c.currentHp ?? 0) <= 0) continue;
    if (!ctx) return true;
    if (isMorningMoodAuraSourceActive(c, slot, ctx)) return true;
  }
  return false;
}

export function hasMorningMoodAttackAura(
  card: FieldCard | null | undefined,
  allyField: FieldSlice | undefined | null,
  ctx?: MorningMoodFieldContext
): boolean {
  if (!card) return false;
  if (isSuppressionActive(card)) return false;
  if (card.name === MORNING_MOOD_ID) return false;
  if (!isSupportTypeUnit(card)) return false;
  return fieldHasLivingMorningMood(allyField, ctx);
}

export function getMorningMoodAttackAuraStatuses(
  card: FieldCard | null | undefined,
  allyField: FieldSlice | undefined | null,
  ctx?: MorningMoodFieldContext
): string[] {
  return hasMorningMoodAttackAura(card, allyField, ctx) ? [PYRED_ATTACK_AURA_BADGE] : [];
}

export function applyMorningMoodAttackAuraToAttackDamage(
  attacker: FieldCard,
  allyField: FieldSlice | undefined | null,
  primaryDamage: number,
  secondaryDamage: number,
  options?: AttackModifierOptions,
  ctx?: MorningMoodFieldContext
): { primaryDamage: number; secondaryDamage: number } {
  const bonus = hasMorningMoodAttackAura(attacker, allyField, ctx) ? PYRED_ATTACK_AURA_BONUS : 0;
  return applyFlatAttackModifierByPattern(primaryDamage, secondaryDamage, bonus, options);
}

/** 모닝 무드 처치 시 같은 진영 전원 회복량(0 = 패시브 꺼짐·[혼란] 등) */
export function getMorningMoodDeathAllyHeal(
  deadCard: FieldCard | null | undefined,
  facingOppAtDeath: FieldCard | null = null
): number {
  if (!deadCard || deadCard.name !== MORNING_MOOD_ID) return 0;
  if (isMorningMoodPassivesPausedByConfusion(deadCard, facingOppAtDeath, { ignoreHp: true })) return 0;
  return MORNING_MOOD_ALLY_HEAL_ON_DEATH;
}
