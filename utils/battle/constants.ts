import { MOMO_ACTIVE } from "./units/momo";
import { ERISTINA_ACTIVE } from "./units/eristina";
import { LIME_ACTIVE } from "./units/lime";
import { DANHA_ACTIVE } from "./units/danha";
import { SUPER_GREEN_KING_ACTIVE } from "./units/superGreenKing";
import { GONCHUNG_JEONMOGA_ACTIVE } from "./units/gonchungJeonmoga";
import { EL_WING_ACTIVE } from "./units/elWing";

/**
 * 액티브 스킬 pending 키 (유닛 파일의 `*_ACTIVE.pendingSkillKey`와 동일해야 함)
 */
export const PENDING_SKILL = {
  MOMO_EAT: MOMO_ACTIVE.pendingSkillKey,
  ERISTINA_BANJITGORI: ERISTINA_ACTIVE.pendingSkillKey,
  LIME_BUBBLE_SHIELD: LIME_ACTIVE.pendingSkillKey,
  DANHA_GALGORI: DANHA_ACTIVE.pendingSkillKey,
  SUPER_GREEN_KING_SPELL_BREAKER: SUPER_GREEN_KING_ACTIVE.pendingSkillKey,
  GONCHUNG_HIDDEN_PEEK: GONCHUNG_JEONMOGA_ACTIVE.pendingSkillKey,
  EL_WING_SINSEOK: EL_WING_ACTIVE.pendingSkillKey,
} as const;

export type PendingSkillKey = (typeof PENDING_SKILL)[keyof typeof PENDING_SKILL];

export const MOMO_SKILL_HEAL_AMOUNT = MOMO_ACTIVE.healAmount;
