import type { FieldCard, SimulationPlayerField } from "../../../types/game";
import { suppressionBlocksExternalBuffEffects } from "../debuffs/suppression";
import { normalizeSpellStack, type FieldSliceWithSpell } from "../fieldSpellAccess";

/** No.8 마법 카드 — 자신의 스펠 칸에만 배치 */
export const BANG_EOMAK_SPELL_ID = "방어막" as const;

/** 아군 유닛 뱅지 표기(방어력 +200 효과와 동일 수치, 철기병 패시브 문구와 구분) */
export const BANG_EOMAK_DEFENSE_BADGE = "방어막 +200" as const;

/** 7×턴 = 양측 턴 종료 합계 14회(언덕·기절과 동일 틱 규칙) */
export const BANG_EOMAK_DEFENSE_INITIAL_END_TURN_TICKS = 14;

export function isBangEomakSpellCard(card: FieldCard | null | undefined): boolean {
  return !!card && card.name === BANG_EOMAK_SPELL_ID;
}

export function isBangEomakDefenseActiveOnSpell(spell: FieldCard | null | undefined): boolean {
  return isBangEomakSpellCard(spell) && (spell!.bangEomakDefenseEndTurnTicksRemaining ?? 0) > 0;
}

/** 스펠 스택 어디에든 만료 전 방어막이 있으면 true (맨 위 카드만 보던 동작과 구분) */
export function spellStackHasActiveBangEomak(
  field: FieldSliceWithSpell | SimulationPlayerField | null | undefined
): boolean {
  return normalizeSpellStack(field).some(c => isBangEomakDefenseActiveOnSpell(c));
}

/** UI 틱 표시용 — 스택 내 활성 방어막 중 가장 긴 남은 틱 */
export function getActiveBangEomakDefenseTicksFromField(
  field: FieldSliceWithSpell | SimulationPlayerField | null | undefined
): number {
  let max = 0;
  for (const c of normalizeSpellStack(field)) {
    if (!isBangEomakDefenseActiveOnSpell(c)) continue;
    const t = c.bangEomakDefenseEndTurnTicksRemaining ?? 0;
    if (t > max) max = t;
  }
  return max;
}

/** 턴 넘김 1회마다 스펠 칸 방어막 틱 — 0이 되면 스펠 제거·리와인드용 카드 반환 */
export function applyEndTurnBangEomakSpellToField(spell: FieldCard | null): {
  nextSpell: FieldCard | null;
  expiredToRewind: FieldCard | null;
} {
  if (!isBangEomakDefenseActiveOnSpell(spell)) {
    return { nextSpell: spell, expiredToRewind: null };
  }
  const n = spell!.bangEomakDefenseEndTurnTicksRemaining!;
  const next = n - 1;
  if (next <= 0) {
    const { bangEomakDefenseEndTurnTicksRemaining: _b, ...rest } = spell!;
    return { nextSpell: null, expiredToRewind: rest as FieldCard };
  }
  return { nextSpell: { ...spell!, bangEomakDefenseEndTurnTicksRemaining: next }, expiredToRewind: null };
}

export type BangEomakStatusBattleCtx = {
  mySlotKey: string;
  playerAField: SimulationPlayerField;
  playerBField: SimulationPlayerField;
};

/** `getActiveStatuses` — 스펠 방어막이 살아 있으면 같은 진영 유닛(is/m/os)에게 뱃지 1개 */
export function getBangEomakAllyDefenseStatuses(ctx: BangEomakStatusBattleCtx): string[] {
  const slot = ctx.mySlotKey.split("-")[1];
  if (slot === "spell") return [];
  const pl = ctx.mySlotKey.startsWith("A") ? "A" : "B";
  const field = pl === "A" ? ctx.playerAField : ctx.playerBField;

  if (!spellStackHasActiveBangEomak(field)) return [];
  if (slot === "is" || slot === "m" || slot === "os") {
    const unit = field[slot];
    if (suppressionBlocksExternalBuffEffects(unit)) return [];
  }
  return [BANG_EOMAK_DEFENSE_BADGE];
}

/** 받는 피해: 방어막 오라가 켜진 진영의 유닛(is/m/os)에게 -200(최소 100) */
export function bangEomakProtectsTargetSlot(
  targetSlotKey: string,
  playerAField: SimulationPlayerField,
  playerBField: SimulationPlayerField
): boolean {
  const parts = targetSlotKey.split("-");
  if (parts.length < 2) return false;
  const pl = parts[0] as "A" | "B";
  const sl = parts[1];
  if (sl === "spell") return false;
  const field = pl === "A" ? playerAField : playerBField;
  if (!spellStackHasActiveBangEomak(field)) return false;
  if (sl === "is" || sl === "m" || sl === "os") {
    const unit = field[sl];
    if (suppressionBlocksExternalBuffEffects(unit)) return false;
  }
  return true;
}
