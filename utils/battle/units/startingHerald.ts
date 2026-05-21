/**
 * 시작의 전령(No.25) — 고유 능력(상태 버프 아님): 기본 공격 시 필드의 [도발]·반짓고리 타겟 우선 규칙,
 * 맹수견 포 마주 제한, 다굴 금지 등을 무시하고 임의 적을 지정 가능.
 * [혼란] 시 위 절대 판정 일시 해제 — 일반 타겟팅 규칙 적용.
 */
import type { FieldCard, SimulationPlayerField } from "../../../types/game";
import { isTaunting } from "../../cardskills";
import { hasConfusionStatus } from "./dinner";
import {
  getIversonClosestEnemyTargetSlots,
  shouldEnforceIversonNearestEnemyTargeting,
} from "./iverson";
import { canEnemyFieldSourceTargetMaengsugyeonPo, getUnitFacingOppAtSlot } from "./maengsugyeonPo";
import { UNIT } from "../unitIds";

export const STARTING_HERALD_ID = UNIT.STARTING_HERALD;

/** [혼란] 시 시작의 전령의 무제한 기본 공격 타겟팅 봉인 */
export function isStartingHeraldUnrestrictedTargetingPausedByConfusion(
  heraldCard: FieldCard | null | undefined,
  facingOppCard: FieldCard | null
): boolean {
  if (!heraldCard || heraldCard.name !== STARTING_HERALD_ID || (heraldCard.currentHp ?? 0) <= 0) {
    return false;
  }
  return hasConfusionStatus(heraldCard, facingOppCard);
}

/**
 * 도발·맹수견 포 마주·다굴 금지 등을 무시하는지.
 * `facingOppCard` — 전령 슬롯 맞은편 유닛(디너 [혼란] 판정).
 */
export function startingHeraldBasicAttackIgnoresTauntTargetingRestrictions(
  attacker: FieldCard | null | undefined,
  facingOppCard: FieldCard | null = null
): boolean {
  if (!attacker || (attacker.currentHp ?? 0) <= 0) return false;
  if (attacker.name !== STARTING_HERALD_ID) return false;
  if (isStartingHeraldUnrestrictedTargetingPausedByConfusion(attacker, facingOppCard)) return false;
  return true;
}

export type StartingHeraldBasicAttackTargetCtx = {
  attackerPlayer: "A" | "B";
  attackerSlot: "is" | "m" | "os";
  attackerCard: FieldCard;
  targetPlayer: "A" | "B";
  targetSlot: "is" | "m" | "os";
  targetCard: FieldCard;
  playerAField: SimulationPlayerField;
  playerBField: SimulationPlayerField;
};

function defenderFieldHasTauntUnit(
  defenderPlayer: "A" | "B",
  defenderField: SimulationPlayerField,
  oppField: SimulationPlayerField,
  playerAField: SimulationPlayerField,
  playerBField: SimulationPlayerField
): boolean {
  const tauntCtxBase = { playerAField, playerBField };
  return (["is", "m", "os"] as const).some(s => {
    const c = defenderField[s];
    if (!c) return false;
    return isTaunting(c, oppField[s] ?? null, defenderField, {
      ...tauntCtxBase,
      mySlotKey: `${defenderPlayer}-${s}`,
    });
  });
}

/** 전령 절대 판정 없이 일반 기본 공격 타겟 규칙만 적용했을 때 지정 가능한지 */
export function isEnemyUnitTargetableByStandardBasicAttackRules(
  ctx: StartingHeraldBasicAttackTargetCtx
): boolean {
  const {
    attackerPlayer,
    attackerSlot,
    attackerCard,
    targetPlayer,
    targetSlot,
    targetCard,
    playerAField,
    playerBField,
  } = ctx;

  if (attackerPlayer === targetPlayer || (targetCard.currentHp ?? 0) <= 0) return false;

  const defenderField = targetPlayer === "A" ? playerAField : playerBField;
  const oppFieldForDefender = targetPlayer === "A" ? playerBField : playerAField;
  const tauntCtxBase = { playerAField, playerBField };

  const tauntExists = defenderFieldHasTauntUnit(
    targetPlayer,
    defenderField,
    oppFieldForDefender,
    playerAField,
    playerBField
  );

  if (
    tauntExists &&
    !isTaunting(
      targetCard,
      oppFieldForDefender[targetSlot] ?? null,
      defenderField,
      { ...tauntCtxBase, mySlotKey: `${targetPlayer}-${targetSlot}` }
    )
  ) {
    return false;
  }

  if (
    shouldEnforceIversonNearestEnemyTargeting(
      attackerCard,
      getUnitFacingOppAtSlot(attackerPlayer, attackerSlot, playerAField, playerBField)
    )
  ) {
    const allowed = getIversonClosestEnemyTargetSlots(
      attackerSlot,
      { is: defenderField.is, m: defenderField.m, os: defenderField.os },
      tauntExists,
      { playerAField, playerBField, defenderPlayer: targetPlayer }
    );
    if (!allowed.includes(targetSlot)) return false;
  }

  if (
    !canEnemyFieldSourceTargetMaengsugyeonPo(
      attackerPlayer,
      attackerSlot,
      targetPlayer,
      targetSlot,
      targetCard,
      getUnitFacingOppAtSlot(targetPlayer, targetSlot, playerAField, playerBField)
    )
  ) {
    return false;
  }

  return true;
}

/**
 * 전령 고유 능력으로만 공격 가능해진 적(도발 보호·포 마주 제한 등으로 원래는 불가).
 * [혼란] 시 false.
 */
export function isStartingHeraldExclusiveBasicAttackTarget(
  ctx: StartingHeraldBasicAttackTargetCtx,
  facingOppCard: FieldCard | null
): boolean {
  if (!startingHeraldBasicAttackIgnoresTauntTargetingRestrictions(ctx.attackerCard, facingOppCard)) {
    return false;
  }
  return !isEnemyUnitTargetableByStandardBasicAttackRules(ctx);
}
