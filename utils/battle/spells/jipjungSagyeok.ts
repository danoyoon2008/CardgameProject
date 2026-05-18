import type { FieldCard } from "../../../types/game";

/** No.12 마법 — 필드 스펠 겹침 허용·무제한, [집중 사격]은 다이아고·검은 황제 오라와 동일 뱃지 */
export const JIPJUNG_SAGYEOK_SPELL_ID = "집중 사격" as const;

export function isJipjungSagyeokSpellCard(
  card: FieldCard | { name?: string; number?: number } | null | undefined
): boolean {
  if (!card) return false;
  if (card.name === JIPJUNG_SAGYEOK_SPELL_ID) return true;
  const n = Number((card as FieldCard).number);
  return Number.isFinite(n) && n === 12;
}