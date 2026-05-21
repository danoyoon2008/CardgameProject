/**
 * 시작의 나무 — 필드 체류: 아군 전원 [디버프 면역], 아군 [공격력 +300], 피격 시 아군 치유.
 * [혼란] 시 위 패시브·오라 일시 봉인(면역·공격 버프·피격 분배 치유 해제).
 */
import type { FieldCard, SimulationPlayerField } from "../../../types/game";
import { applyFlatAttackModifierByPattern, floorToNearest50Unit, type AttackModifierOptions } from "../attackModifier";
import { hasConfusionStatus } from "./dinner";
import { PYRED_ATTACK_AURA_BADGE, PYRED_ATTACK_AURA_BONUS } from "./pyred";
import { UNIT } from "../unitIds";

export const STARTING_TREE_ID = UNIT.STARTING_TREE;

type FieldSlice = SimulationPlayerField | Partial<Record<"is" | "m" | "os", FieldCard | null>>;

export type StartingTreeFieldContext = {
  allyPlayer: "A" | "B";
  playerAField: FieldSlice;
  playerBField: FieldSlice;
};

/** [혼란] 시 디버프 면역·공격 오라·피격 분배 치유 패시브 일시 봉인 */
export function isStartingTreePassivesPausedByConfusion(
  card: FieldCard | null | undefined,
  facingOppCard: FieldCard | null
): boolean {
  if (!card || card.name !== STARTING_TREE_ID || (card.currentHp ?? 0) <= 0) return false;
  return hasConfusionStatus(card, facingOppCard);
}

function isStartingTreeAuraSourceActive(
  card: FieldCard,
  slot: "is" | "m" | "os",
  ctx?: StartingTreeFieldContext
): boolean {
  if ((card.currentHp ?? 0) <= 0 || card.name !== STARTING_TREE_ID) return false;
  if (!ctx) return true;
  const oppField = ctx.allyPlayer === "A" ? ctx.playerBField : ctx.playerAField;
  const facing = oppField[slot] ?? null;
  return !isStartingTreePassivesPausedByConfusion(card, facing);
}

/** 아군 필드에 살아 있는(혼란 아닌) 시작의 나무가 있으면 전 아군 [디버프 면역] 오라 */
export function fieldHasLivingStartingTree(
  field: FieldSlice | undefined | null,
  ctx?: StartingTreeFieldContext
): boolean {
  if (!field) return false;
  for (const slot of ["is", "m", "os"] as const) {
    const c = field[slot];
    if (!c || c.name !== STARTING_TREE_ID) continue;
    if (isStartingTreeAuraSourceActive(c, slot, ctx)) return true;
  }
  return false;
}

export function buildStartingTreeFieldContext(
  allyPlayer: "A" | "B",
  allyField: FieldSlice,
  playerAField: FieldSlice,
  playerBField: FieldSlice
): StartingTreeFieldContext {
  return {
    allyPlayer,
    playerAField: allyPlayer === "A" ? allyField : playerAField,
    playerBField: allyPlayer === "B" ? allyField : playerBField,
  };
}

export function hasStartingTreeAttackAura(
  card: FieldCard | null | undefined,
  allyField: FieldSlice | undefined | null,
  auraCtx?: StartingTreeFieldContext | null
): boolean {
  if (!card) return false;
  if (card.name === STARTING_TREE_ID) return false; // 본인 제외
  if (auraCtx) return fieldHasLivingStartingTree(allyField, auraCtx);
  return fieldHasLivingStartingTree(allyField);
}

export function getStartingTreeAttackAuraStatuses(
  card: FieldCard | null | undefined,
  allyField: FieldSlice | undefined | null,
  auraCtx?: StartingTreeFieldContext | null
): string[] {
  return hasStartingTreeAttackAura(card, allyField, auraCtx) ? [PYRED_ATTACK_AURA_BADGE] : [];
}

export function applyStartingTreeAttackAuraToAttackDamage(
  attacker: FieldCard,
  allyField: FieldSlice | undefined | null,
  primaryDamage: number,
  secondaryDamage: number,
  options?: AttackModifierOptions,
  auraCtx?: StartingTreeFieldContext | null
): { primaryDamage: number; secondaryDamage: number } {
  const bonus = hasStartingTreeAttackAura(attacker, allyField, auraCtx) ? PYRED_ATTACK_AURA_BONUS : 0;
  return applyFlatAttackModifierByPattern(primaryDamage, secondaryDamage, bonus, options);
}

/** 받은 피해의 50%를 아군에게 분배할 양 — 50% 계산 후 50 단위로 버림. [혼란] 시 0. */
export function getStartingTreeAllyHealOnDamaged(
  damagedCard: FieldCard | null | undefined,
  takenDamage: number,
  facingOppCard?: FieldCard | null
): number {
  if (!damagedCard || damagedCard.name !== STARTING_TREE_ID) return 0;
  if (isStartingTreePassivesPausedByConfusion(damagedCard, facingOppCard ?? null)) return 0;
  if (!Number.isFinite(takenDamage) || takenDamage <= 0) return 0;
  const half = Math.floor(takenDamage * 0.5);
  return floorToNearest50Unit(half);
}
