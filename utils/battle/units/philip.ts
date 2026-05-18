import type { FieldCard } from "../../../types/game";
import { UNIT } from "../unitIds";

export const PHILIP_ID = UNIT.PHILIP;

/** 마주 보는 상대 슬롯에 필립이 있을 때 부여되는 상태이름 */
export const PHILIP_OPP_SILENCE_STATUS = "침묵" as const;

/** getActiveStatuses에서 상대 필드 필립에 의한 침묵 여부 */
export const getStatusNamesFromPhilipMatchup = (oppCard: FieldCard | null): string[] => {
  if (oppCard && oppCard.name === PHILIP_ID) {
    return [PHILIP_OPP_SILENCE_STATUS];
  }
  return [];
};
