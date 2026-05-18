import type { FieldCard } from "../../../types/game";
import { UNIT } from "../unitIds";

export const RANIGO_ID = UNIT.RANIGO;

/** 기본 공격으로 다른 아군을 지정했을 때 회복량(라니고 고유 동작 — 뱃지·패시브 표시 없음) */
export const RANIGO_ALLY_BASIC_HEAL_AMOUNT = 500 as const;

export function isRanigo(card: FieldCard | null | undefined): boolean {
  return card != null && card.name === RANIGO_ID;
}

export const ranigoBattleMessages = {
  cannotAttackEnemy:
    "라니고는 기본 공격으로 아군 유닛만 지정할 수 있습니다. 적 유닛이나 상대 플레이어는 선택할 수 없습니다.",
  cannotTargetSelf: "라니고는 자신을 기본 공격 대상으로 지정할 수 없습니다. 자신을 제외한 아군 유닛을 선택하세요.",
  allyFullyHealed: "해당 아군의 체력이 이미 최대입니다.",
  chainDuplicateAlly: "이미 이번 공격에서 선택한 아군입니다. 다른 아군 유닛을 선택해 주세요.",
} as const;
