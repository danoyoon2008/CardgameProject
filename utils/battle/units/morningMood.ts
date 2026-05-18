import type { FieldCard, SimulationPlayerField } from "../../../types/game";
import { applyFlatAttackModifierByPattern, type AttackModifierOptions } from "../attackModifier";
import { PYRED_ATTACK_AURA_BADGE, PYRED_ATTACK_AURA_BONUS } from "./pyred";
import { UNIT } from "../unitIds";

export const MORNING_MOOD_ID = UNIT.MORNING_MOOD;
export const MORNING_MOOD_ALLY_HEAL_ON_DEATH = 400 as const;

function isSupportTypeUnit(card: FieldCard | null | undefined): boolean {
  if (!card) return false;
  const typeStr = String(card.type ?? "").toLowerCase();
  return typeStr.includes("지원형") || typeStr.includes("support");
}

export function fieldHasLivingMorningMood(
  field: SimulationPlayerField | Partial<Record<string, FieldCard | null>> | undefined | null
): boolean {
  if (!field) return false;
  for (const slot of ["is", "m", "os"] as const) {
    const c = field[slot];
    if (c?.name === MORNING_MOOD_ID && (c.currentHp ?? 0) > 0) return true;
  }
  return false;
}

export function hasMorningMoodAttackAura(
  card: FieldCard | null | undefined,
  allyField: SimulationPlayerField | Partial<Record<string, FieldCard | null>> | undefined | null
): boolean {
  if (!card) return false;
  if (card.name === MORNING_MOOD_ID) return false; // 본인 제외
  if (!isSupportTypeUnit(card)) return false;
  return fieldHasLivingMorningMood(allyField);
}

export function getMorningMoodAttackAuraStatuses(
  card: FieldCard | null | undefined,
  allyField: SimulationPlayerField | Partial<Record<string, FieldCard | null>> | undefined | null
): string[] {
  return hasMorningMoodAttackAura(card, allyField) ? [PYRED_ATTACK_AURA_BADGE] : [];
}

export function applyMorningMoodAttackAuraToAttackDamage(
  attacker: FieldCard,
  allyField: SimulationPlayerField | Partial<Record<string, FieldCard | null>> | undefined | null,
  primaryDamage: number,
  secondaryDamage: number,
  options?: AttackModifierOptions
): { primaryDamage: number; secondaryDamage: number } {
  const bonus = hasMorningMoodAttackAura(attacker, allyField) ? PYRED_ATTACK_AURA_BONUS : 0;
  return applyFlatAttackModifierByPattern(primaryDamage, secondaryDamage, bonus, options);
}

export function getMorningMoodDeathAllyHeal(deadCard: FieldCard | null | undefined): number {
  if (!deadCard || deadCard.name !== MORNING_MOOD_ID) return 0;
  return MORNING_MOOD_ALLY_HEAL_ON_DEATH;
}
