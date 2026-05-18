import type { FieldCard, SimulationPlayerField } from "../../types/game";

/** 필드 조각에 스펠 단일(`spell`) 또는 겹침(`spellStack`)이 올 수 있음 — 저장 호환 */
export type FieldSliceWithSpell = {
  is: FieldCard | null;
  m: FieldCard | null;
  os: FieldCard | null;
  spell?: FieldCard | null;
  spellStack?: FieldCard[] | null;
};

export function normalizeSpellStack(
  field: FieldSliceWithSpell | SimulationPlayerField | null | undefined
): FieldCard[] {
  if (!field) return [];
  const s = field.spellStack;
  if (Array.isArray(s) && s.length > 0) return [...s];
  if (Array.isArray(s) && s.length === 0) return [];
  const legacy = "spell" in field ? field.spell : undefined;
  return legacy ? [legacy] : [];
}

export function getTopSpellFromField(
  field: FieldSliceWithSpell | SimulationPlayerField | null | undefined
): FieldCard | null {
  const stack = normalizeSpellStack(field);
  return stack.length ? stack[stack.length - 1]! : null;
}
