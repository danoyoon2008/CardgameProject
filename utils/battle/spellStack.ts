import type { FieldCard, SimulationPlayerField } from "../../types/game";
import { applyEndTurnBangEomakSpellToField } from "./spells/bangeomak";
import { applyEndTurnCheolbyeokSpellToField } from "./spells/cheolbyeok";
import { applyEndTurnHyugesojauiAnsikSpellToField } from "./spells/hyugesojauiAnsik";
import { isJipjungSagyeokSpellCard } from "./spells/jipjungSagyeok";
import type { FieldSliceWithSpell } from "./fieldSpellAccess";
import { normalizeSpellStack } from "./fieldSpellAccess";

export function appendSpellToStack(stack: FieldCard[], card: FieldCard): FieldCard[] {
  return [...stack, card];
}

/** 맨 위(마지막 인덱스) 카드를 맨 아래로 — 겹침 미리보기 순환 */
export function rotateSpellStackTopToBottom(stack: FieldCard[]): FieldCard[] {
  if (stack.length <= 1) return stack;
  const top = stack[stack.length - 1]!;
  return [top, ...stack.slice(0, -1)];
}

export function applyEndTurnToSpellStack(stack: FieldCard[]): {
  nextStack: FieldCard[];
  expiredBangEomakToRewind: FieldCard | null;
  expiredCheolbyeokToRewind: FieldCard | null;
  expiredHyugesojauiAnsikToRewind: FieldCard | null;
} {
  if (stack.length === 0) {
    return {
      nextStack: [],
      expiredBangEomakToRewind: null,
      expiredCheolbyeokToRewind: null,
      expiredHyugesojauiAnsikToRewind: null,
    };
  }
  const top = stack[stack.length - 1]!;
  const bangR = applyEndTurnBangEomakSpellToField(top);
  if (bangR.expiredToRewind) {
    return {
      nextStack: stack.slice(0, -1),
      expiredBangEomakToRewind: bangR.expiredToRewind,
      expiredCheolbyeokToRewind: null,
      expiredHyugesojauiAnsikToRewind: null,
    };
  }
  const afterBang = bangR.nextSpell ?? top;
  const cheolR = applyEndTurnCheolbyeokSpellToField(afterBang);
  if (cheolR.expiredToRewind) {
    return {
      nextStack: stack.slice(0, -1),
      expiredBangEomakToRewind: null,
      expiredCheolbyeokToRewind: cheolR.expiredToRewind,
      expiredHyugesojauiAnsikToRewind: null,
    };
  }
  const afterCheol = cheolR.nextSpell ?? afterBang;
  const hyuR = applyEndTurnHyugesojauiAnsikSpellToField(afterCheol);
  if (hyuR.expiredToRewind) {
    return {
      nextStack: stack.slice(0, -1),
      expiredBangEomakToRewind: null,
      expiredCheolbyeokToRewind: null,
      expiredHyugesojauiAnsikToRewind: hyuR.expiredToRewind,
    };
  }
  const newTop = hyuR.nextSpell ?? afterCheol;
  return {
    nextStack: [...stack.slice(0, -1), newTop],
    expiredBangEomakToRewind: null,
    expiredCheolbyeokToRewind: null,
    expiredHyugesojauiAnsikToRewind: null,
  };
}

export function fieldSpellStackGrantsFocusedFire(
  field: FieldSliceWithSpell | SimulationPlayerField | null | undefined
): boolean {
  return normalizeSpellStack(field).some(c => isJipjungSagyeokSpellCard(c));
}
