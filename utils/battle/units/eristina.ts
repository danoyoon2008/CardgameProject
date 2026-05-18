/**
 * 에리스티나 — 액티브「마법의 반짓고리」
 */
import { UNIT } from "../unitIds";

export const ERISTINA_ID = UNIT.ERISTINA;

export const ERISTINA_ACTIVE = {
  pendingSkillKey: "마법의 반짓고리" as const,
  cooldownGlobalTurns: 4,
} as const;
