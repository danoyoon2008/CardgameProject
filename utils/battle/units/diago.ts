import type { FieldCard, SimulationPlayerField } from "../../../types/game";
import type { AttackContext, PostAttackFn } from "../effectTypes";
import { fieldSpellStackGrantsFocusedFire } from "../spellStack";
import { UNIT } from "../unitIds";

export const DIAGO_ID = UNIT.DIAGO;

/** 기본 공격 적중 시 아군 전원 회복량(이후 패시브 수치 조정 시 여기만 바꿔도 됨) */
export const DIAGO_ALLY_HEAL_PER_BASIC_ATTACK = 200;

const FOCUSED_FIRE_AURA_UNIT_NAMES: readonly string[] = [UNIT.DIAGO, UNIT.GEOMEUN_HWANGJE];

/** 아군 필드에 살아 있는 다이아고 또는 검은 황제가 있으면 전 아군에게 [집중 사격] 오라(뱃지 1회). */
export function fieldHasLivingFocusedFireAura(
  field: SimulationPlayerField | Partial<Record<string, FieldCard | null>> | undefined | null
): boolean {
  if (!field) return false;
  for (const slot of ["is", "m", "os"] as const) {
    const c = field[slot];
    if (c && (c.currentHp ?? 0) > 0 && FOCUSED_FIRE_AURA_UNIT_NAMES.includes(c.name)) return true;
  }
  return false;
}

/** @deprecated `fieldHasLivingFocusedFireAura` 와 동일(다이아고·검은 황제 공통 오라). */
export const fieldHasLivingDiago = fieldHasLivingFocusedFireAura;

/** 다구리(동일 대상·플레이어 중복 타격) 면제: 다이아고·검은 황제 오라 또는 No.12 집중 사격 스펠이 스택 어디에든 있을 때 */
export function fieldGrantsFocusedFireMultihitExemption(
  field: SimulationPlayerField | Partial<Record<string, FieldCard | null>> | undefined | null
): boolean {
  if (fieldHasLivingFocusedFireAura(field)) return true;
  return fieldSpellStackGrantsFocusedFire(field as SimulationPlayerField);
}

/**
 * 패시브(실행 분): 기본 공격으로 피해를 줄 때마다 모든 아군 유닛 체력 회복.
 * [집중 사격]은 필드에 다이아고 또는 검은 황제가 있는 동안 `getActiveStatuses(..., myField)` 로 표시됩니다.
 * 동일 적 중복 타격(다구리) 제한은 `fieldGrantsFocusedFireMultihitExemption` 으로 면제합니다.
 */
export const postAttackDiago: PostAttackFn = (_card: FieldCard, ctx: AttackContext) => {
  if (ctx.damageDealt <= 0) return {};
  ctx.applyFieldHeal?.(DIAGO_ALLY_HEAL_PER_BASIC_ATTACK);
  return {};
};

export function isDiago(card: FieldCard | null | undefined): boolean {
  return card != null && card.name === DIAGO_ID;
}

