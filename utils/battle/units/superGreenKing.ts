/**
 * 슈퍼 그린킹 — 액티브「주문 파괴자」(상대 스펠 스택 맨 위 1회 제거)
 */
import { UNIT } from "../unitIds";

export const SUPER_GREEN_KING_ID = UNIT.SUPER_GREEN_KING;

export const SUPER_GREEN_KING_ACTIVE = {
  pendingSkillKey: "주문 파괴자" as const,
} as const;
