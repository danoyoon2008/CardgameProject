import type { CardRow, FieldCard } from "../../../types/game";
import { normalizeSpellStack, type FieldSliceWithSpell } from "../fieldSpellAccess";

/** No.53 마법 — 스펠 칸 발동 후 동전(P 앞면)으로 양측 드로우/버림 */
export const WITCH_TAROT_SPELL_ID = "마녀 타로" as const;
export const WITCH_TAROT_CARD_NUMBER = 53 as const;

export const WITCH_TAROT_DRAW_DISCARD_STEPS_PER_SIDE = 2 as const;
export const WITCH_TAROT_TOTAL_STEPS = WITCH_TAROT_DRAW_DISCARD_STEPS_PER_SIDE * 2;

/** localStorage `pp_sim_save`에 포함 — 로비/새로고침 후 마녀 타로 시퀀스 재개 */
export type WitchTarotPendingSave = {
  casterPlayer: "A" | "B";
  coinHeads: boolean | null;
  stepIndex: number;
  awaitingDiscardPlayer: "A" | "B" | null;
};

type CardRowLite = { name?: string; number?: number | string };

function normalizeSpellCardName(name: string | undefined): string {
  return String(name ?? "").trim();
}

/** DB 표기 `No.53`, `53`, 숫자 53 등 */
export function parseSpellCardNumber(value: number | string | undefined): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const match = String(value).match(/(\d+)/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

export function isWitchTarotSpellCard(
  card: FieldCard | CardRowLite | null | undefined
): boolean {
  if (!card) return false;
  if (normalizeSpellCardName(card.name) === WITCH_TAROT_SPELL_ID) return true;
  return parseSpellCardNumber(card.number) === WITCH_TAROT_CARD_NUMBER;
}

/** 시전자 2회 → 상대 2회 (총 4회) */
export function witchTarotStepPlayer(stepIndex: number, casterPlayer: "A" | "B"): "A" | "B" {
  const other = casterPlayer === "A" ? "B" : "A";
  return stepIndex < WITCH_TAROT_DRAW_DISCARD_STEPS_PER_SIDE ? casterPlayer : other;
}

/** 시전자 스택에서 마녀 타로 제거(연출 종료) */
export function removeWitchTarotFromSpellStack(stack: FieldCard[]): FieldCard[] {
  return stack.filter(c => !isWitchTarotSpellCard(c));
}

export function stripWitchTarotFromField(field: FieldSliceWithSpell): FieldSliceWithSpell {
  return {
    ...field,
    spellStack: removeWitchTarotFromSpellStack(normalizeSpellStack(field)),
  };
}

/** 어느 플레이어 스펠 스택에 마녀 타로가 있는지 */
export function findWitchTarotCasterOnField(
  fieldA: FieldSliceWithSpell,
  fieldB: FieldSliceWithSpell
): "A" | "B" | null {
  if (normalizeSpellStack(fieldA).some(isWitchTarotSpellCard)) return "A";
  if (normalizeSpellStack(fieldB).some(isWitchTarotSpellCard)) return "B";
  return null;
}
