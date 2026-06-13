import type { FieldCard } from "../../../types/game";
import { UNIT } from "../unitIds";
import { hasConfusionStatus } from "./dinner";
import { isTaunting } from "../../cardEffects";

export const MAENGSUGYEON_PO_ID = UNIT.MAENGSUGYEON_PO;

type FieldSlotSlice = {
  is: FieldCard | null;
  m: FieldCard | null;
  os: FieldCard | null;
};

/** 유닛이 마주 보는 상대 슬롯의 카드 */
export function getUnitFacingOppAtSlot(
  unitPlayer: "A" | "B",
  slot: "is" | "m" | "os",
  playerAField: FieldSlotSlice,
  playerBField: FieldSlotSlice
): FieldCard | null {
  const oppField = unitPlayer === "A" ? playerBField : playerAField;
  return oppField[slot] ?? null;
}

/** 디너 [혼란] 등으로 포 패시브(마주 견제)가 봉인됐는지 */
export function isMaengsugyeonPoFacingPassiveSuppressed(
  poCard: FieldCard | null,
  facingOppCard: FieldCard | null
): boolean {
  if (!poCard || poCard.name !== MAENGSUGYEON_PO_ID) return false;
  return hasConfusionStatus(poCard, facingOppCard);
}

/**
 * 맹수견 포 패시브: 적 필드 유닛이 포를 대상으로 할 때, 마주 보는 동일 슬롯(is/m/os)의 적만 허용.
 * (마주 칸에 적이 없으면 아무도 포를 공격·지정할 수 없음.)
 * [혼란] 시 패시브 해제 — 모든 적이 포를 공격·지정 가능.
 */
export function canEnemyFieldSourceTargetMaengsugyeonPo(
  attackerPlayer: "A" | "B",
  attackerSlot: "is" | "m" | "os",
  targetPlayer: "A" | "B",
  targetSlot: "is" | "m" | "os",
  targetCard: FieldCard | null,
  facingOppCard?: FieldCard | null
): boolean {
  if (!targetCard || targetCard.name !== MAENGSUGYEON_PO_ID) return true;
  if (isMaengsugyeonPoFacingPassiveSuppressed(targetCard, facingOppCard ?? null)) return true;
  // 맹수견 포가 [도발] 효과를 얻으면 마주 견제 패시브가 일시 해제되어
  // 모든 적이 포를 공격·지정할 수 있다. (도발이 제거되면 다시 패시브 정상 작동)
  if (isTaunting(targetCard, facingOppCard ?? null)) return true;
  if (attackerPlayer === targetPlayer) return true;
  return attackerSlot === targetSlot;
}
