import type { FieldCard } from "../../../types/game";
import { UNIT } from "../unitIds";

export const DINNER_ID = UNIT.DINNER;

/** 마주 보는 상대 슬롯에 디너가 있을 때 부여되는 상태이상(버프·디버프 아님) */
export const DINNER_OPP_CONFUSION_STATUS = "혼란" as const;

/** 살아 있는 디너와 마주볼 때 부여되는 [혼란] (출처 판정 — 다른 출처는 여기에 합침) */
function statusNamesFromFacingDinner(facingOppCard: FieldCard | null): string[] {
  if (facingOppCard && facingOppCard.name === DINNER_ID && (facingOppCard.currentHp ?? 0) > 0) {
    return [DINNER_OPP_CONFUSION_STATUS];
  }
  return [];
}

/**
 * [혼란] 상태이상 이름 목록 — 마주보는 상대 슬롯 기준.
 * `getActiveStatuses` 와 `hasConfusionStatus` 가 공유한다.
 */
export function getActiveConfusionStatusNames(facingOppCard: FieldCard | null): string[] {
  return statusNamesFromFacingDinner(facingOppCard);
}

/** @deprecated `getActiveConfusionStatusNames` 사용 */
export const getStatusNamesFromDinnerMatchup = getActiveConfusionStatusNames;

/** 유닛이 현재 [혼란] 상태이상인지 — 게임플레이·뱃지 공통 판정 */
export function hasConfusionStatus(
  card: FieldCard | null,
  facingOppCard: FieldCard | null
): boolean {
  if (!card || (card.currentHp ?? 0) <= 0) return false;
  return getActiveConfusionStatusNames(facingOppCard).includes(DINNER_OPP_CONFUSION_STATUS);
}

/** 패시브·액티브 봉인 여부 (`hasConfusionStatus` 와 동일) */
export function isConfused(card: FieldCard | null, facingOppCard: FieldCard | null): boolean {
  return hasConfusionStatus(card, facingOppCard);
}
