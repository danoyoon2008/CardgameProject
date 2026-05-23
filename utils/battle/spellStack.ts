import type { FieldCard, SimulationPlayerField } from "../../types/game";
import { applyEndTurnBangEomakSpellToField } from "./spells/bangeomak";
import { applyEndTurnCheolbyeokSpellToField } from "./spells/cheolbyeok";
import { applyEndTurnHyugesojauiAnsikSpellToField } from "./spells/hyugesojauiAnsik";
import { applyEndTurnBusinessGangSpellToField } from "./spells/businessGang";
import { applyEndTurnAntHellSpellToField } from "./spells/antHell";
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

export type SpellStackEndTurnResult = {
  nextStack: FieldCard[];
  expiredBangEomakToRewind: FieldCard[];
  expiredCheolbyeokToRewind: FieldCard[];
  expiredHyugesojauiAnsikToRewind: FieldCard[];
  expiredBusinessGangToRewind: FieldCard[];
  expiredAntHellToRewind: FieldCard[];
};

const emptySpellStackEndTurnResult = (): SpellStackEndTurnResult => ({
  nextStack: [],
  expiredBangEomakToRewind: [],
  expiredCheolbyeokToRewind: [],
  expiredHyugesojauiAnsikToRewind: [],
  expiredBusinessGangToRewind: [],
  expiredAntHellToRewind: [],
});

/** 스펠 스택 한 장 — 지속 스펠 틱(카드당 하나의 스펠 타입만 해당) */
function applyEndTurnTickToSpellCard(spell: FieldCard): {
  nextSpell: FieldCard | null;
  expiredBangEomak: FieldCard | null;
  expiredCheolbyeok: FieldCard | null;
  expiredHyugesojauiAnsik: FieldCard | null;
  expiredBusinessGang: FieldCard | null;
  expiredAntHell: FieldCard | null;
} {
  const bangR = applyEndTurnBangEomakSpellToField(spell);
  if (bangR.expiredToRewind) {
    return {
      nextSpell: null,
      expiredBangEomak: bangR.expiredToRewind,
      expiredCheolbyeok: null,
      expiredHyugesojauiAnsik: null,
      expiredBusinessGang: null,
      expiredAntHell: null,
    };
  }
  let c = bangR.nextSpell ?? spell;
  const cheolR = applyEndTurnCheolbyeokSpellToField(c);
  if (cheolR.expiredToRewind) {
    return {
      nextSpell: null,
      expiredBangEomak: null,
      expiredCheolbyeok: cheolR.expiredToRewind,
      expiredHyugesojauiAnsik: null,
      expiredBusinessGang: null,
      expiredAntHell: null,
    };
  }
  c = cheolR.nextSpell ?? c;
  const hyuR = applyEndTurnHyugesojauiAnsikSpellToField(c);
  if (hyuR.expiredToRewind) {
    return {
      nextSpell: null,
      expiredBangEomak: null,
      expiredCheolbyeok: null,
      expiredHyugesojauiAnsik: hyuR.expiredToRewind,
      expiredBusinessGang: null,
      expiredAntHell: null,
    };
  }
  c = hyuR.nextSpell ?? c;
  const businessR = applyEndTurnBusinessGangSpellToField(c);
  if (businessR.expiredToRewind) {
    return {
      nextSpell: null,
      expiredBangEomak: null,
      expiredCheolbyeok: null,
      expiredHyugesojauiAnsik: null,
      expiredBusinessGang: businessR.expiredToRewind,
      expiredAntHell: null,
    };
  }
  c = businessR.nextSpell ?? c;
  const antHellR = applyEndTurnAntHellSpellToField(c);
  if (antHellR.expiredToRewind) {
    return {
      nextSpell: null,
      expiredBangEomak: null,
      expiredCheolbyeok: null,
      expiredHyugesojauiAnsik: null,
      expiredBusinessGang: null,
      expiredAntHell: antHellR.expiredToRewind,
    };
  }
  return {
    nextSpell: antHellR.nextSpell ?? c,
    expiredBangEomak: null,
    expiredCheolbyeok: null,
    expiredHyugesojauiAnsik: null,
    expiredBusinessGang: null,
    expiredAntHell: null,
  };
}

/** 스펠 스택 전체 — 겹침 순서와 무관하게 각 카드 지속 턴 틱·만료 리와인드 */
export function applyEndTurnToSpellStack(stack: FieldCard[]): SpellStackEndTurnResult {
  if (stack.length === 0) {
    return emptySpellStackEndTurnResult();
  }

  const nextStack: FieldCard[] = [];
  const expiredBangEomakToRewind: FieldCard[] = [];
  const expiredCheolbyeokToRewind: FieldCard[] = [];
  const expiredHyugesojauiAnsikToRewind: FieldCard[] = [];
  const expiredBusinessGangToRewind: FieldCard[] = [];
  const expiredAntHellToRewind: FieldCard[] = [];

  for (const card of stack) {
    const r = applyEndTurnTickToSpellCard(card);
    if (r.nextSpell) nextStack.push(r.nextSpell);
    if (r.expiredBangEomak) expiredBangEomakToRewind.push(r.expiredBangEomak);
    if (r.expiredCheolbyeok) expiredCheolbyeokToRewind.push(r.expiredCheolbyeok);
    if (r.expiredHyugesojauiAnsik) expiredHyugesojauiAnsikToRewind.push(r.expiredHyugesojauiAnsik);
    if (r.expiredBusinessGang) expiredBusinessGangToRewind.push(r.expiredBusinessGang);
    if (r.expiredAntHell) expiredAntHellToRewind.push(r.expiredAntHell);
  }

  return {
    nextStack,
    expiredBangEomakToRewind,
    expiredCheolbyeokToRewind,
    expiredHyugesojauiAnsikToRewind,
    expiredBusinessGangToRewind,
    expiredAntHellToRewind,
  };
}

export function fieldSpellStackGrantsFocusedFire(
  field: FieldSliceWithSpell | SimulationPlayerField | null | undefined
): boolean {
  return normalizeSpellStack(field).some(c => isJipjungSagyeokSpellCard(c));
}
