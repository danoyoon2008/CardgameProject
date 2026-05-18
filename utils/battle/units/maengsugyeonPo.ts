import type { FieldCard } from "../../../types/game";
import { UNIT } from "../unitIds";

export const MAENGSUGYEON_PO_ID = UNIT.MAENGSUGYEON_PO;

/**
 * 맹수견 포 패시브: 적 필드 유닛이 포를 대상으로 할 때, 마주 보는 동일 슬롯(is/m/os)의 적만 허용.
 * (마주 칸에 적이 없으면 아무도 포를 공격·지정할 수 없음.)
 */
export function canEnemyFieldSourceTargetMaengsugyeonPo(
  attackerPlayer: "A" | "B",
  attackerSlot: "is" | "m" | "os",
  targetPlayer: "A" | "B",
  targetSlot: "is" | "m" | "os",
  targetCard: FieldCard | null
): boolean {
  if (!targetCard || targetCard.name !== MAENGSUGYEON_PO_ID) return true;
  if (attackerPlayer === targetPlayer) return true;
  return attackerSlot === targetSlot;
}
