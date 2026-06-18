import type { FieldCard, SimulationPlayerField } from "../../../types/game";
import { applyFlatAttackModifierByPattern, type AttackModifierOptions } from "../attackModifier";
import { hasConfusionStatus } from "./dinner";
import { UNIT } from "../unitIds";
import { isSuppressionActive } from "../debuffs/suppression";

export const PYRED_ID = UNIT.PYRED;
export const PYRED_ATTACK_AURA_BADGE = "[공격력 +300]" as const;
export const PYRED_ATTACK_AURA_BONUS = 300 as const;

type FieldSlice = SimulationPlayerField | Partial<Record<"is" | "m" | "os", FieldCard | null>>;

export type PyredAuraFieldContext = {
  allyPlayer: "A" | "B";
  playerAField: FieldSlice;
  playerBField: FieldSlice;
};

function isAttackTypeUnit(card: FieldCard | null | undefined): boolean {
  if (!card) return false;
  const typeStr = String(card.type ?? "").toLowerCase();
  return typeStr.includes("공격형") || typeStr.includes("attack");
}

/** [혼란] 시 파이레드 패시브(아군 공격형 +300) 봉인 */
export function isPyredAuraPassiveSuppressed(
  pyredCard: FieldCard | null | undefined,
  facingOppCard: FieldCard | null
): boolean {
  if (!pyredCard || pyredCard.name !== PYRED_ID) return false;
  return hasConfusionStatus(pyredCard, facingOppCard);
}

/** 살아 있고 [혼란]이 아닌 파이레드가 필드에 있는지 */
export function fieldHasActivePyredAuraSource(ctx: PyredAuraFieldContext): boolean {
  const allyField = ctx.allyPlayer === "A" ? ctx.playerAField : ctx.playerBField;
  const oppField = ctx.allyPlayer === "A" ? ctx.playerBField : ctx.playerAField;
  let foundPyred = false;
  for (const slot of ["is", "m", "os"] as const) {
    const c = allyField[slot];
    if (c?.name === PYRED_ID && (c.currentHp ?? 0) > 0) foundPyred = true;
  }
  if (typeof window !== "undefined") {
    console.log("[PYRED-AURA-V2]", {
      allyPlayer: ctx.allyPlayer,
      allyFieldNames: [allyField?.is?.name, allyField?.m?.name, allyField?.os?.name],
      oppFieldNames: [oppField?.is?.name, oppField?.m?.name, oppField?.os?.name],
      pAFieldNames: [ctx.playerAField?.is?.name, ctx.playerAField?.m?.name, ctx.playerAField?.os?.name],
      pBFieldNames: [ctx.playerBField?.is?.name, ctx.playerBField?.m?.name, ctx.playerBField?.os?.name],
      foundPyredInAllyField: foundPyred,
    });
  }
  for (const slot of ["is", "m", "os"] as const) {
    const c = allyField[slot];
    if (!c || c.name !== PYRED_ID || (c.currentHp ?? 0) <= 0) continue;
    const facing = oppField[slot] ?? null;
    if (!isPyredAuraPassiveSuppressed(c, facing)) return true;
  }
  return false;
}

/** @deprecated 혼란 미판정 — `fieldHasActivePyredAuraSource` 사용 */
export function fieldHasLivingPyred(field: FieldSlice | undefined | null): boolean {
  if (!field) return false;
  for (const slot of ["is", "m", "os"] as const) {
    const c = field[slot];
    if (c?.name === PYRED_ID && (c.currentHp ?? 0) > 0) return true;
  }
  return false;
}

export function buildPyredAuraFieldContext(
  allyPlayer: "A" | "B",
  allyField: FieldSlice,
  playerAField: FieldSlice,
  playerBField: FieldSlice
): PyredAuraFieldContext {
  return {
    allyPlayer,
    playerAField: allyPlayer === "A" ? allyField : playerAField,
    playerBField: allyPlayer === "B" ? allyField : playerBField,
  };
}

export function hasPyredAttackAura(
  card: FieldCard | null | undefined,
  allyField: FieldSlice | undefined | null,
  auraCtx?: PyredAuraFieldContext | null
): boolean {
  if (!card) return false;
  if (isSuppressionActive(card)) return false;
  if (card.name === PYRED_ID) return false;
  if (!isAttackTypeUnit(card)) return false;
  if (auraCtx) return fieldHasActivePyredAuraSource(auraCtx);
  return fieldHasLivingPyred(allyField);
}

export function getPyredAttackAuraStatuses(
  card: FieldCard | null | undefined,
  allyField: FieldSlice | undefined | null,
  auraCtx?: PyredAuraFieldContext | null
): string[] {
  return hasPyredAttackAura(card, allyField, auraCtx) ? [PYRED_ATTACK_AURA_BADGE] : [];
}

export function applyPyredAttackAuraToAttackDamage(
  attacker: FieldCard,
  allyField: FieldSlice | undefined | null,
  primaryDamage: number,
  secondaryDamage: number,
  options?: AttackModifierOptions,
  auraCtx?: PyredAuraFieldContext | null
): { primaryDamage: number; secondaryDamage: number } {
  const bonus = hasPyredAttackAura(attacker, allyField, auraCtx) ? PYRED_ATTACK_AURA_BONUS : 0;
  return applyFlatAttackModifierByPattern(primaryDamage, secondaryDamage, bonus, options);
}
