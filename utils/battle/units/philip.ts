import type { FieldCard } from "../../../types/game";
import { hasConfusionStatus } from "./dinner";
import { getUnitFacingOppAtSlot } from "./maengsugyeonPo";
import { UNIT } from "../unitIds";

export const PHILIP_ID = UNIT.PHILIP;

/** 마주 보는 상대 슬롯에 필립이 있을 때 부여되는 상태이름 */
export const PHILIP_OPP_SILENCE_STATUS = "침묵" as const;

type UnitSlotsField = {
  is: FieldCard | null;
  m: FieldCard | null;
  os: FieldCard | null;
};

/** 필립이 [혼란]이면 마주보는 적 [침묵] 패시브 일시 봉인 */
export function isPhilipSilencePassiveSuppressed(
  philipCard: FieldCard | null,
  facingOppCard: FieldCard | null
): boolean {
  if (!philipCard || philipCard.name !== PHILIP_ID || (philipCard.currentHp ?? 0) <= 0) return false;
  return hasConfusionStatus(philipCard, facingOppCard);
}

/** `philipOwnerPlayer` 슬롯의 살아 있는 필립이 마주보는 적에게 [침묵]을 부여하는지 */
export function fieldSlotGrantsPhilipFacingSilence(
  philipOwnerPlayer: "A" | "B",
  slot: "is" | "m" | "os",
  fieldA: UnitSlotsField,
  fieldB: UnitSlotsField
): boolean {
  const philipField = philipOwnerPlayer === "A" ? fieldA : fieldB;
  const philip = philipField[slot];
  if (!philip || philip.name !== PHILIP_ID || (philip.currentHp ?? 0) <= 0) return false;
  const facing = getUnitFacingOppAtSlot(philipOwnerPlayer, slot, fieldA, fieldB);
  return !isPhilipSilencePassiveSuppressed(philip, facing);
}

/** getActiveStatuses — 마주보는 상대가 필립일 때 부여할 침묵(혼란 시 제외) */
export const getStatusNamesFromPhilipMatchup = (
  oppCard: FieldCard | null,
  myCard: FieldCard | null = null
): string[] => {
  if (!oppCard || oppCard.name !== PHILIP_ID) return [];
  if (isPhilipSilencePassiveSuppressed(oppCard, myCard)) return [];
  return [PHILIP_OPP_SILENCE_STATUS];
};
