/**
 * 모모 — 액티브 스킬「먹보」(패 카드 1장 버리고 힐)
 * 시뮬/추후 모드: 여기 수치·키만 import 하면 동일 동작.
 */
import { UNIT } from "../unitIds";

export const MOMO_ID = UNIT.MOMO;

export const MOMO_ACTIVE = {
  /** setPendingSkill / handleSkillDiscard 분기 키 */
  pendingSkillKey: "먹보" as const,
  healAmount: 1000,
  /** 글로벌 턴 기준 쿨타임 (에리스티나 등과 동일 규칙일 때 공통 상수로 승격 가능) */
  cooldownGlobalTurns: 4,
} as const;

export const momoSkillHealAlert = (discardedCardName: string) =>
  `🍔 모모가 [${discardedCardName}] 카드를 버리고(먹어치우고) 체력을 ${MOMO_ACTIVE.healAmount} 회복했습니다!`;
