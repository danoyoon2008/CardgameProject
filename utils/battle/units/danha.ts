/**
 * 단하 — 액티브「마법의 갈고리」(상대 패에서 카드 1장 탈취, 일회성)
 */
import { UNIT } from "../unitIds";

export const DANHA_ID = UNIT.DANHA;

export const DANHA_ACTIVE = {
  pendingSkillKey: "마법의 갈고리" as const,
} as const;
