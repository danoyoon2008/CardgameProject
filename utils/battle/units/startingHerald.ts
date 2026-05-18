/**
 * 시작의 전령(No.25) — 고유 능력(상태 버프 아님): 기본 공격 시 필드의 [도발]·반짓고리에 딸린 **타겟 우선(도발) 규칙**만 무시.
 * 반짓고리 피해 25%·철기병·메리·방어막·무적 등 받는 피해 보정은 일반과 동일하게 적용.
 */
import type { FieldCard } from "../../../types/game";
import { UNIT } from "../unitIds";

export const STARTING_HERALD_ID = UNIT.STARTING_HERALD;

/** 도발 우선 공격만 면제. 맹수견 포 마주 제한·다굴 금지 등 다른 타겟 제한은 기존처럼 무시(첫 스펙 유지). */
export function startingHeraldBasicAttackIgnoresTauntTargetingRestrictions(
  attacker: FieldCard | null | undefined
): boolean {
  if (!attacker || (attacker.currentHp ?? 0) <= 0) return false;
  return attacker.name === STARTING_HERALD_ID;
}
