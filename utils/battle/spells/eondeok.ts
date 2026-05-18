import type { FieldCard } from "../../../types/game";

/** No.7 마법 카드 — 적 유닛에게 드래그하여 발동 */
export const EONDEOK_SPELL_ID = "언덕!" as const;

/** 양측 턴 종료 합계 4회(2×턴) — `stunEndTurnTicksRemaining`와 동일한 감소 규칙 */
export const EONDEOK_SILENCE_INITIAL_END_TURN_TICKS = 4;

export function isEondeokSilenceActive(card: FieldCard | null | undefined): boolean {
  return !!card && (card.eondeokSilenceEndTurnTicksRemaining ?? 0) > 0;
}

/** 턴 넘김 1회마다 — 언덕 [침묵] 남은 틱 1 감소 */
export function applyEndTurnEondeokSilenceTickToFieldUnit(u: FieldCard): FieldCard {
  const n = u.eondeokSilenceEndTurnTicksRemaining;
  if (n == null || n <= 0) return u;
  const next = n - 1;
  if (next <= 0) {
    const { eondeokSilenceEndTurnTicksRemaining: _e, ...rest } = u;
    return rest as FieldCard;
  }
  return { ...u, eondeokSilenceEndTurnTicksRemaining: next };
}

/** `getActiveStatuses` — 필립 매치업 침묵과 별개로 스택; 표시는 한 번만 하도록 상위에서 병합 */
export function getEondeokSilenceStatusesForCard(myCard: FieldCard): string[] {
  if (isEondeokSilenceActive(myCard)) return ["침묵"];
  return [];
}
