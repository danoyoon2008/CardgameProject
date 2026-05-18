import type { FieldCard } from "../../../types/game";
import type { PassiveStatusFn } from "../effectTypes";
import { UNIT } from "../unitIds";

export const RYEOMCHO_ID = UNIT.RYEOMCHO;

export const getRyeomchoPassiveStatuses: PassiveStatusFn = () => ["도발"];

export function isRyeomcho(card: FieldCard | null | undefined): boolean {
  return card != null && card.name === UNIT.RYEOMCHO;
}

/** UI 알림·시뮬 alert 공통 */
export const ryeomchoBattleMessages = {
  cannotAttackPlayer:
    "렴초는 플레이어를 직접 공격할 수 없습니다. 기본 공격으로 자기 자신을 선택해 체력을 회복하세요.",
  cannotAttackEnemy: "렴초는 적을 공격할 수 없습니다. 자기 자신을 선택해 체력을 회복하세요.",
  cannotAttackOrTarget:
    "렴초는 다른 유닛을 공격하거나 지정할 수 없습니다. 반드시 자기 자신을 선택해 체력을 회복하세요.",
  selfHeal: (amount: number) =>
    `🌿 [${UNIT.RYEOMCHO}]가 자신의 체력을 ${amount}만큼 회복했습니다!`,
  /** 자가 회복 시 최대 체력 — 공격권 소모 없음 */
  alreadyMaxHp: "이미 최대 체력입니다",
} as const;

/** @deprecated RYEOMCHO_ID 사용 권장 */
export const RYEOMCHO = RYEOMCHO_ID;
