import type { FieldCard, SimulationPlayerField } from "../../../types/game";
import type { AttackContext, PostAttackFn } from "../effectTypes";
import { fieldSpellStackGrantsFocusedFire } from "../spellStack";
import { hasConfusionStatus } from "./dinner";
import { isGeomeunHwangjePassivesPausedByConfusion } from "./geomeunHwangje";
import { UNIT } from "../unitIds";

export const DIAGO_ID = UNIT.DIAGO;

/** 기본 공격 적중 시 아군 전원 회복량(이후 패시브 수치 조정 시 여기만 바꿔도 됨) */
export const DIAGO_ALLY_HEAL_PER_BASIC_ATTACK = 200;

const FOCUSED_FIRE_AURA_UNIT_NAMES: readonly string[] = [UNIT.DIAGO, UNIT.GEOMEUN_HWANGJE];

type FieldSlice = SimulationPlayerField | Partial<Record<"is" | "m" | "os", FieldCard | null>>;

export type FocusedFireAuraFieldContext = {
  allyPlayer: "A" | "B";
  playerAField: FieldSlice;
  playerBField: FieldSlice;
};

/** [혼란] 시 다이아고 패시브([집중 사격] 오라·기본 공격 아군 회복) 봉인 */
export function isDiagoPassivesPausedByConfusion(
  diagoCard: FieldCard | null | undefined,
  facingOppCard: FieldCard | null
): boolean {
  if (!diagoCard || diagoCard.name !== DIAGO_ID || (diagoCard.currentHp ?? 0) <= 0) return false;
  return hasConfusionStatus(diagoCard, facingOppCard);
}

function isFocusedFireAuraSourceActive(
  card: FieldCard,
  slot: "is" | "m" | "os",
  ctx?: FocusedFireAuraFieldContext
): boolean {
  if ((card.currentHp ?? 0) <= 0) return false;
  if (card.name === UNIT.GEOMEUN_HWANGJE) {
    if (!ctx) return true;
    const oppField = ctx.allyPlayer === "A" ? ctx.playerBField : ctx.playerAField;
    const facing = oppField[slot] ?? null;
    return !isGeomeunHwangjePassivesPausedByConfusion(card, facing);
  }
  if (card.name === DIAGO_ID) {
    if (!ctx) return true;
    const oppField = ctx.allyPlayer === "A" ? ctx.playerBField : ctx.playerAField;
    const facing = oppField[slot] ?? null;
    return !isDiagoPassivesPausedByConfusion(card, facing);
  }
  return false;
}

/** 아군 필드에 살아 있는(혼란 아닌) 다이아고·검은 황제가 있으면 전 아군에게 [집중 사격] 오라(뱃지 1회). */
export function fieldHasLivingFocusedFireAura(
  field: FieldSlice | undefined | null,
  ctx?: FocusedFireAuraFieldContext
): boolean {
  if (!field) return false;
  for (const slot of ["is", "m", "os"] as const) {
    const c = field[slot];
    if (!c || !FOCUSED_FIRE_AURA_UNIT_NAMES.includes(c.name)) continue;
    if (isFocusedFireAuraSourceActive(c, slot, ctx)) return true;
  }
  return false;
}

/** @deprecated `fieldHasLivingFocusedFireAura` 와 동일(다이아고·검은 황제 공통 오라). */
export const fieldHasLivingDiago = fieldHasLivingFocusedFireAura;

/** 다구리(동일 대상·플레이어 중복 타격) 면제: 다이아고·검은 황제 오라 또는 No.12 집중 사격 스펠이 스택 어디에든 있을 때 */
export function fieldGrantsFocusedFireMultihitExemption(
  field: FieldSlice | undefined | null,
  ctx?: FocusedFireAuraFieldContext
): boolean {
  if (fieldHasLivingFocusedFireAura(field, ctx)) return true;
  return fieldSpellStackGrantsFocusedFire(field as SimulationPlayerField);
}

/**
 * 패시브(실행 분): 기본 공격으로 피해를 줄 때마다 모든 아군 유닛 체력 회복.
 * [집중 사격]은 필드에 다이아고 또는 검은 황제가 있는 동안 `getActiveStatuses(..., myField)` 로 표시됩니다.
 * 동일 적 중복 타격(다구리) 제한은 `fieldGrantsFocusedFireMultihitExemption` 으로 면제합니다.
 */
export const postAttackDiago: PostAttackFn = (card: FieldCard, ctx: AttackContext) => {
  if (ctx.damageDealt <= 0) return {};
  const facing = ctx.facingOppCard ?? null;
  if (isDiagoPassivesPausedByConfusion(card, facing)) return {};
  ctx.applyFieldHeal?.(DIAGO_ALLY_HEAL_PER_BASIC_ATTACK);
  return {};
};

export function isDiago(card: FieldCard | null | undefined): boolean {
  return card != null && card.name === DIAGO_ID;
}
