/**
 * 패키(No.52) — 처치 시 처치자에게 [공격력 50% 감소](디버프). 디버프 면역 팀이면 부여·연출 없음.
 * [혼란] 시 처치 저주 패시브 일시 봉인(처치자 디버프·저주 연출 없음).
 */
import type { FieldCard, SimulationPlayerField } from "../../../types/game";
import {
  DINNER_OPP_CONFUSION_STATUS,
  getActiveConfusionStatusNames,
} from "./dinner";
import {
  fieldHasLivingIronKiwi,
  type IronKiwiDebuffImmunityFieldContext,
} from "./ironKiwi";
import { fieldHasLivingStartingTree } from "./startingTree";
import { UNIT } from "../unitIds";

export const PAKKI_ID = UNIT.PAKKI;

/** 효과 뱃지·시맨틱용 표기 */
export const PAKKI_ATTACK_DEBUFF_BADGE = "[공격력 50% 감소]" as const;

export function unitAllyFieldHasDebuffImmunityAura(
  allyField: SimulationPlayerField,
  ironKiwiCtx?: IronKiwiDebuffImmunityFieldContext
): boolean {
  return fieldHasLivingIronKiwi(allyField, ironKiwiCtx) || fieldHasLivingStartingTree(allyField);
}

/** 처치자에게 패키 저주를 걸 수 있는지(면역 진영이면 불가) */
export function canApplyPakkiKillDebuff(
  killerAllyField: SimulationPlayerField,
  ironKiwiCtx?: IronKiwiDebuffImmunityFieldContext
): boolean {
  return !unitAllyFieldHasDebuffImmunityAura(killerAllyField, ironKiwiCtx);
}

/** [혼란] 시 처치 저주 등 패시브 일시 봉인. `ignoreHp`: 처치 직후 0 HP 판정용 */
export function isPakkiPassivesPausedByConfusion(
  card: FieldCard | null | undefined,
  facingOppCard: FieldCard | null,
  opts?: { ignoreHp?: boolean }
): boolean {
  if (!card || card.name !== PAKKI_ID) return false;
  if (!opts?.ignoreHp && (card.currentHp ?? 0) <= 0) return false;
  return getActiveConfusionStatusNames(facingOppCard).includes(DINNER_OPP_CONFUSION_STATUS);
}

/** 패키가 처치되었을 때 처치자에게 [공격력 50% 감소] 부여·연출 여부 */
export function shouldApplyPakkiKillDebuffOnDeath(
  victim: FieldCard | null | undefined,
  victimFacingOpp: FieldCard | null,
  killerAllyField: SimulationPlayerField,
  ironKiwiCtx?: IronKiwiDebuffImmunityFieldContext
): boolean {
  if (!victim || victim.name !== PAKKI_ID) return false;
  if (isPakkiPassivesPausedByConfusion(victim, victimFacingOpp, { ignoreHp: true })) return false;
  return canApplyPakkiKillDebuff(killerAllyField, ironKiwiCtx);
}

/** 디버프 적용 시 출격 피해 절반 — 다구·연쇄는 타격마다 이 함수 한 번만 호출(pending에는 미적용 수치 저장). */
export function scalePakkiOutgoingHit(
  damage: number,
  attacker: FieldCard | null,
  attackerAllyField: SimulationPlayerField,
  ironKiwiCtx?: IronKiwiDebuffImmunityFieldContext
): number {
  if (!attacker?.hasPakiAttackHalveDebuff || damage <= 0) return damage;
  if (unitAllyFieldHasDebuffImmunityAura(attackerAllyField, ironKiwiCtx)) return damage;
  return Math.max(0, Math.floor(damage * 0.5));
}

/** 아이언 키위·시작의 나무 등으로 면역 권역이 생기면 패키 디버프 플래그 제거(호출부에서 필드는 이미 복제본이어야 함) */
export function stripPakkiDebuffUnderImmunityOnClonedFields(
  fieldA: SimulationPlayerField,
  fieldB: SimulationPlayerField
): boolean {
  let changed = false;
  const stripField = (field: SimulationPlayerField, owner: "A" | "B") => {
    (["is", "m", "os"] as const).forEach(slot => {
      const u = field[slot];
      if (!u?.hasPakiAttackHalveDebuff) return;
      if (
        !unitAllyFieldHasDebuffImmunityAura(field, {
          allyPlayer: owner,
          playerAField: fieldA,
          playerBField: fieldB,
        })
      ) {
        return;
      }
      field[slot] = { ...u, hasPakiAttackHalveDebuff: false };
      changed = true;
    });
  };
  stripField(fieldA, "A");
  stripField(fieldB, "B");
  return changed;
}
