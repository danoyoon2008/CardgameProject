/**
 * PowerPrime — 전투 규칙·유닛 상수·문구의 진입점.
 * 시뮬레이션 외 PvP/PvE/봇 등 모든 모드는 여기서 동일 API를 import 합니다.
 *
 * 유닛별 상세 정의: `utils/battle/units/` (예: 화염 연출은 `units/geunyangMoja.tsx`)
 */
export { UNIT, isUnitName, type ImplementedUnitName } from "./unitIds";
export {
  PENDING_SKILL,
  MOMO_SKILL_HEAL_AMOUNT,
  type PendingSkillKey,
} from "./constants";
export { BATTLE_MSG } from "./messages";
export type {
  AttackContext,
  DamageModContext,
  FieldContext,
  PassiveStatusFn,
  PostAttackFn,
  DamageModFn,
  OnSummonFn,
} from "./effectTypes";
export type { EffectSemanticKind } from "./effectSemantics";
export { getEffectSemanticKind } from "./effectSemantics";
export * from "./spells";
export * from "./units";
export * from "./simulationDeathCleanup";
export * from "./confusionSkillLinkSuppression";
export * from "./fieldSpellAccess";
export * from "./spellStack";
