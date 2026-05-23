/**
 * 스펠 No.47 철벽 — 자신의 스펠 칸에 배치.
 * 2*턴(양측 턴 넘김 합계 4회) 동안 모든 아군 유닛에게 [무적](백스와 동일 판정·뱃지, 버프 금지로 해제되지 않음).
 */
import type { FieldCard, SimulationPlayerField } from "../../../types/game";
import { isSuppressionActive } from "../debuffs/suppression";
import { normalizeSpellStack, type FieldSliceWithSpell } from "../fieldSpellAccess";
import { isBaekseuInvulnerable } from "../units/baekseu";

/** No.47 마법 — 자신의 스펠 칸에만 배치 */
export const CHEOLBYEOK_SPELL_ID = "철벽" as const;

/** 2*턴 = 양측 턴 넘김 합계 4회(기절·백스 [무적]·방어막과 동일 틱 규칙) */
export const CHEOLBYEOK_ALLY_INVULN_INITIAL_END_TURN_TICKS = 4;

export function isCheolbyeokSpellCard(card: FieldCard | null | undefined): boolean {
  return !!card && card.name === CHEOLBYEOK_SPELL_ID;
}

export function isCheolbyeokAllyInvulnActiveOnSpell(spell: FieldCard | null | undefined): boolean {
  return isCheolbyeokSpellCard(spell) && (spell!.cheolbyeokAllyInvulnEndTurnTicksRemaining ?? 0) > 0;
}

export function spellStackHasActiveCheolbyeok(
  field: FieldSliceWithSpell | SimulationPlayerField | null | undefined
): boolean {
  return normalizeSpellStack(field).some(c => isCheolbyeokAllyInvulnActiveOnSpell(c));
}

/** UI 틱 표시 — 스택 내 활성 철벽 중 가장 긴 남은 틱 */
export function getActiveCheolbyeokInvulnTicksFromField(
  field: FieldSliceWithSpell | SimulationPlayerField | null | undefined
): number {
  let max = 0;
  for (const c of normalizeSpellStack(field)) {
    if (!isCheolbyeokAllyInvulnActiveOnSpell(c)) continue;
    const t = c.cheolbyeokAllyInvulnEndTurnTicksRemaining ?? 0;
    if (t > max) max = t;
  }
  return max;
}

/** 턴 넘김 1회마다 스펠 칸 철벽 틱 — 0이 되면 스펠 제거·리와인드용 카드 반환 */
export function applyEndTurnCheolbyeokSpellToField(spell: FieldCard | null): {
  nextSpell: FieldCard | null;
  expiredToRewind: FieldCard | null;
} {
  if (!isCheolbyeokAllyInvulnActiveOnSpell(spell)) {
    return { nextSpell: spell, expiredToRewind: null };
  }
  const n = spell!.cheolbyeokAllyInvulnEndTurnTicksRemaining!;
  const next = n - 1;
  if (next <= 0) {
    const { cheolbyeokAllyInvulnEndTurnTicksRemaining: _c, ...rest } = spell!;
    return { nextSpell: null, expiredToRewind: rest as FieldCard };
  }
  return { nextSpell: { ...spell!, cheolbyeokAllyInvulnEndTurnTicksRemaining: next }, expiredToRewind: null };
}

/** 피해·해로운 효과 면역 — 백스 [무적] 또는 아군 철벽 오라(해당 필드의 유닛) */
export function isInvulnerableFromBaekseuOrCheolbyeok(
  unit: FieldCard | null | undefined,
  unitsField: SimulationPlayerField
): boolean {
  if (!unit || (unit.currentHp ?? 0) <= 0) return false;
  if (isBaekseuInvulnerable(unit)) return true;
  if (isSuppressionActive(unit)) return false;
  return spellStackHasActiveCheolbyeok(unitsField);
}
