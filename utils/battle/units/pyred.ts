import type { FieldCard, SimulationPlayerField } from "../../../types/game";
import { applyFlatAttackModifierByPattern, type AttackModifierOptions } from "../attackModifier";
import { UNIT } from "../unitIds";

export const PYRED_ID = UNIT.PYRED;
export const PYRED_ATTACK_AURA_BADGE = "[공격력 +300]" as const;
export const PYRED_ATTACK_AURA_BONUS = 300 as const;

function isAttackTypeUnit(card: FieldCard | null | undefined): boolean {
  if (!card) return false;
  const typeStr = String(card.type ?? "").toLowerCase();
  return typeStr.includes("공격형") || typeStr.includes("attack");
}

export function fieldHasLivingPyred(
  field: SimulationPlayerField | Partial<Record<string, FieldCard | null>> | undefined | null
): boolean {
  if (!field) return false;
  for (const slot of ["is", "m", "os"] as const) {
    const c = field[slot];
    if (c?.name === PYRED_ID && (c.currentHp ?? 0) > 0) return true;
  }
  return false;
}

export function hasPyredAttackAura(
  card: FieldCard | null | undefined,
  allyField: SimulationPlayerField | Partial<Record<string, FieldCard | null>> | undefined | null
): boolean {
  if (!card) return false;
  if (card.name === PYRED_ID) return false; // 본인 제외
  if (!isAttackTypeUnit(card)) return false;
  return fieldHasLivingPyred(allyField);
}

export function getPyredAttackAuraStatuses(
  card: FieldCard | null | undefined,
  allyField: SimulationPlayerField | Partial<Record<string, FieldCard | null>> | undefined | null
): string[] {
  return hasPyredAttackAura(card, allyField) ? [PYRED_ATTACK_AURA_BADGE] : [];
}

export function applyPyredAttackAuraToAttackDamage(
  attacker: FieldCard,
  allyField: SimulationPlayerField | Partial<Record<string, FieldCard | null>> | undefined | null,
  primaryDamage: number,
  secondaryDamage: number,
  options?: AttackModifierOptions
): { primaryDamage: number; secondaryDamage: number } {
  const bonus = hasPyredAttackAura(attacker, allyField) ? PYRED_ATTACK_AURA_BONUS : 0;
  return applyFlatAttackModifierByPattern(primaryDamage, secondaryDamage, bonus, options);
}
