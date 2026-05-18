import type { FieldCard, SimulationPlayerField } from "../../../types/game";
import { applyFlatAttackModifierByPattern, floorToNearest50Unit, type AttackModifierOptions } from "../attackModifier";
import { PYRED_ATTACK_AURA_BADGE, PYRED_ATTACK_AURA_BONUS } from "./pyred";
import { UNIT } from "../unitIds";

export const STARTING_TREE_ID = UNIT.STARTING_TREE;

export function fieldHasLivingStartingTree(
  field: SimulationPlayerField | Partial<Record<string, FieldCard | null>> | undefined | null
): boolean {
  if (!field) return false;
  for (const slot of ["is", "m", "os"] as const) {
    const c = field[slot];
    if (c?.name === STARTING_TREE_ID && (c.currentHp ?? 0) > 0) return true;
  }
  return false;
}

export function hasStartingTreeAttackAura(
  card: FieldCard | null | undefined,
  allyField: SimulationPlayerField | Partial<Record<string, FieldCard | null>> | undefined | null
): boolean {
  if (!card) return false;
  if (card.name === STARTING_TREE_ID) return false; // 본인 제외
  return fieldHasLivingStartingTree(allyField);
}

export function getStartingTreeAttackAuraStatuses(
  card: FieldCard | null | undefined,
  allyField: SimulationPlayerField | Partial<Record<string, FieldCard | null>> | undefined | null
): string[] {
  return hasStartingTreeAttackAura(card, allyField) ? [PYRED_ATTACK_AURA_BADGE] : [];
}

export function applyStartingTreeAttackAuraToAttackDamage(
  attacker: FieldCard,
  allyField: SimulationPlayerField | Partial<Record<string, FieldCard | null>> | undefined | null,
  primaryDamage: number,
  secondaryDamage: number,
  options?: AttackModifierOptions
): { primaryDamage: number; secondaryDamage: number } {
  const bonus = hasStartingTreeAttackAura(attacker, allyField) ? PYRED_ATTACK_AURA_BONUS : 0;
  return applyFlatAttackModifierByPattern(primaryDamage, secondaryDamage, bonus, options);
}

/** 받은 피해의 50%를 아군에게 분배할 양 — 50% 계산 후 50 단위로 버림. */
export function getStartingTreeAllyHealOnDamaged(
  damagedCard: FieldCard | null | undefined,
  takenDamage: number
): number {
  if (!damagedCard || damagedCard.name !== STARTING_TREE_ID) return 0;
  if (!Number.isFinite(takenDamage) || takenDamage <= 0) return 0;
  const half = Math.floor(takenDamage * 0.5);
  return floorToNearest50Unit(half);
}
