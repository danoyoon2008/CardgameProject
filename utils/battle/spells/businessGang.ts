/**
 * 스펠 No.30 비즈니스 강도단 — 자신의 스펠 칸에 배치.
 * 4×턴(양측 턴 종료 합 8회) 동안 시전자(필드 소유) 턴 시작 시 토큰 획득 +1.
 * 만료 시 스펠 제거·리와인드.
 */
import type { FieldCard, SimulationPlayerField } from "../../../types/game";
import { normalizeSpellStack, type FieldSliceWithSpell } from "../fieldSpellAccess";

export const BUSINESS_GANG_SPELL_ID = "비즈니스 강도단" as const;

/** 턴 시작 기본 토큰(시뮬 공통) */
export const TURN_START_BASE_TOKEN_GAIN = 2;

/** 활성 중 추가 토큰 */
export const BUSINESS_GANG_EXTRA_TOKEN_PER_TURN = 1;

/** 4×턴 = 양측 턴 종료 합 8회 */
export const BUSINESS_GANG_INITIAL_END_TURN_TICKS = 8;

export function isBusinessGangSpellCard(card: FieldCard | null | undefined): boolean {
  return !!card && card.name === BUSINESS_GANG_SPELL_ID;
}

export function isBusinessGangActiveOnSpell(spell: FieldCard | null | undefined): boolean {
  return isBusinessGangSpellCard(spell) && (spell!.businessGangEndTurnTicksRemaining ?? 0) > 0;
}

export function spellStackHasActiveBusinessGang(
  field: FieldSliceWithSpell | SimulationPlayerField | null | undefined
): boolean {
  return normalizeSpellStack(field).some(c => isBusinessGangActiveOnSpell(c));
}

/** UI — 스택 내 활성 비즈니스 강도단 중 가장 긴 남은 틱 */
export function getActiveBusinessGangTicksFromField(
  field: FieldSliceWithSpell | SimulationPlayerField | null | undefined
): number {
  let max = 0;
  for (const c of normalizeSpellStack(field)) {
    if (!isBusinessGangActiveOnSpell(c)) continue;
    const t = c.businessGangEndTurnTicksRemaining ?? 0;
    if (t > max) max = t;
  }
  return max;
}

/** 해당 플레이어 턴이 시작될 때 받는 토큰 수(최대 10 캡은 호출부) */
export function getTurnStartTokenGainForPlayer(
  field: FieldSliceWithSpell | SimulationPlayerField | null | undefined
): number {
  return (
    TURN_START_BASE_TOKEN_GAIN +
    (spellStackHasActiveBusinessGang(field) ? BUSINESS_GANG_EXTRA_TOKEN_PER_TURN : 0)
  );
}

function stripBusinessGangRuntimeFields(spell: FieldCard): FieldCard {
  const { businessGangEndTurnTicksRemaining: _b, ...rest } = spell;
  return rest as FieldCard;
}

/** 턴 넘김 1회마다 스펠 칸 비즈니스 강도단 틱 — 0이 되면 스펠 제거·리와인드용 카드 반환 */
export function applyEndTurnBusinessGangSpellToField(spell: FieldCard | null): {
  nextSpell: FieldCard | null;
  expiredToRewind: FieldCard | null;
} {
  if (!isBusinessGangActiveOnSpell(spell)) {
    return { nextSpell: spell, expiredToRewind: null };
  }
  const n = spell!.businessGangEndTurnTicksRemaining!;
  const next = n - 1;
  if (next <= 0) {
    return { nextSpell: null, expiredToRewind: stripBusinessGangRuntimeFields(spell!) };
  }
  return {
    nextSpell: { ...spell!, businessGangEndTurnTicksRemaining: next },
    expiredToRewind: null,
  };
}
