// utils/cardskills.ts
//
// ★ 하위 호환성 유지용 재수출 파일 ★
//
// 실제 구현은 cardEffects.ts와 combatEngine.ts에 있습니다.
// 기존 import 경로를 그대로 유지하면서 새 구조를 사용할 수 있습니다.

export {
  getActiveStatuses,
  applyPostAttackSkills,
  applyDamageMods,
  applyOnSummon,
  hasTauntUnit,
  isTaunting,
  isSilenced,
  isConfused,
  DINNER_OPP_CONFUSION_STATUS,
  isStunned,
  type AttackContext,
  type ActiveStatusBattleContext,
  type FieldContext,
  type DamageModContext,
} from "./cardEffects";

export {
  parseAttack,
  isBracketAttack,
  parseBracketAttack,
  calculateDamage,
  validateAttack,
  validateAntiGangup,
  type ParsedAttack,
  type AttackType,
  type DamageResult,
  type AttackValidation,
} from "./combatEngine";