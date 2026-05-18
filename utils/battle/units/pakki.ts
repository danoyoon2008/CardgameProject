/**
 * 패키(No.52) — 처치 시 처치자에게 [공격력 50% 감소](디버프). 디버프 면역 팀이면 부여·연출 없음.
 */
import type { FieldCard, SimulationPlayerField } from "../../../types/game";
import { fieldHasLivingIronKiwi } from "./ironKiwi";
import { fieldHasLivingStartingTree } from "./startingTree";
import { UNIT } from "../unitIds";

export const PAKKI_ID = UNIT.PAKKI;

/** 효과 뱃지·시맨틱용 표기 */
export const PAKKI_ATTACK_DEBUFF_BADGE = "[공격력 50% 감소]" as const;

export function unitAllyFieldHasDebuffImmunityAura(allyField: SimulationPlayerField): boolean {
  return fieldHasLivingIronKiwi(allyField) || fieldHasLivingStartingTree(allyField);
}

/** 처치자에게 패키 저주를 걸 수 있는지(면역 진영이면 불가) */
export function canApplyPakkiKillDebuff(killerAllyField: SimulationPlayerField): boolean {
  return !unitAllyFieldHasDebuffImmunityAura(killerAllyField);
}

/** 디버프 적용 시 출격 피해 절반 — 다구·연쇄는 타격마다 이 함수 한 번만 호출(pending에는 미적용 수치 저장). */
export function scalePakkiOutgoingHit(
  damage: number,
  attacker: FieldCard | null,
  attackerAllyField: SimulationPlayerField
): number {
  if (!attacker?.hasPakiAttackHalveDebuff || damage <= 0) return damage;
  if (unitAllyFieldHasDebuffImmunityAura(attackerAllyField)) return damage;
  return Math.max(0, Math.floor(damage * 0.5));
}

/** 아이언 키위·시작의 나무 등으로 면역 권역이 생기면 패키 디버프 플래그 제거(호출부에서 필드는 이미 복제본이어야 함) */
export function stripPakkiDebuffUnderImmunityOnClonedFields(
  fieldA: SimulationPlayerField,
  fieldB: SimulationPlayerField
): boolean {
  let changed = false;
  const stripField = (field: SimulationPlayerField) => {
    (["is", "m", "os"] as const).forEach(slot => {
      const u = field[slot];
      if (!u?.hasPakiAttackHalveDebuff) return;
      if (!unitAllyFieldHasDebuffImmunityAura(field)) return;
      field[slot] = { ...u, hasPakiAttackHalveDebuff: false };
      changed = true;
    });
  };
  stripField(fieldA);
  stripField(fieldB);
  return changed;
}
