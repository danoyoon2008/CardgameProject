/**
 * 라임(No.49) — 액티브「방울 보호막」
 * 에리스티나「마법의 반짓고리」와 동일한 링크·쿨타임 규칙, 대상 버프는 [방어력 +200].
 * UI 표기는 철기병 패시브와 동일 문자열이며, `SimulationView`에서 `hasLimeBubbleShieldBuff`로 뱃지 색만 구분합니다.
 */
import { UNIT } from "../unitIds";

export const LIME_ID = UNIT.LIME;

export const LIME_ACTIVE = {
  pendingSkillKey: "방울 보호막" as const,
  cooldownGlobalTurns: 4,
} as const;

/** `getActiveStatuses`용 — 철기병 패시브와 동일 표기 `방어력 +200`(중복 시 1뱃지). */
export const LIME_BUBBLE_DEFENSE_BADGE = "방어력 +200" as const;
