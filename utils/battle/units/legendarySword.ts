/**
 * No.16 「전설의 검」— 필드 패시브(충전 틱·연격 2회 고정 피해·is–m–os 간격 판정).
 */
import type { FieldCard } from "../../../types/game";
import { UNIT } from "../unitIds";

/** 1×턴 = 양측 턴 종료 합산 2회 */
export const LEGENDARY_SWORD_ARMING_END_TURN_TICKS = 2;
export const LEGENDARY_SWORD_FIRST_HIT_DAMAGE = 3000;
/** hitTargets에 넣어 1차가 상대 플레이어 HP였음을 표시(2차 유닛 피해 산정용) */
export const LEGENDARY_SWORD_HIT_PLAYER_MARK = "__LEGENDARY_PLAYER_HP__";
/** 2차가 상대 플레이어 HP에 적중할 때 고정 피해 */
export const LEGENDARY_SWORD_PLAYER_SECOND_HIT_DAMAGE = 1500;
const SECOND_ADJACENT = 3000;
const SECOND_WITH_GAP = 1500;

const SLOT_ORDER: Record<"is" | "m" | "os", number> = { is: 0, m: 1, os: 2 };

export function legendarySwordSlotOrderIndex(slot: "is" | "m" | "os"): number {
  return SLOT_ORDER[slot];
}

/** 첫 적과 둘째 적 슬롯이 is–m–os 선상에서 인접하면 3000, Is–Os / Os–Is(중간 m 끼어짐)이면 1500 */
export function legendarySwordSecondHitDamage(
  firstEnemySlot: "is" | "m" | "os",
  secondEnemySlot: "is" | "m" | "os"
): number {
  return Math.abs(legendarySwordSlotOrderIndex(firstEnemySlot) - legendarySwordSlotOrderIndex(secondEnemySlot)) === 1
    ? SECOND_ADJACENT
    : SECOND_WITH_GAP;
}

type FieldSlice = { is: FieldCard | null; m: FieldCard | null; os: FieldCard | null };

export function countLivingFieldUnits(field: FieldSlice): number {
  return (["is", "m", "os"] as const).filter(s => {
    const u = field[s];
    return u != null && (u.currentHp ?? 0) > 0;
  }).length;
}

/** 1차 대상 id(`A-is` 또는 `LEGENDARY_SWORD_HIT_PLAYER_MARK`) 기준 2차 유닛 슬롯 고정 피해 */
export function legendarySwordSecondHitBaseFromFirstTarget(
  firstHitTargetId: string,
  secondEnemySlot: "is" | "m" | "os"
): number {
  if (firstHitTargetId === LEGENDARY_SWORD_HIT_PLAYER_MARK) {
    return LEGENDARY_SWORD_FIRST_HIT_DAMAGE;
  }
  const seg = firstHitTargetId.split("-")[1];
  if (seg !== "is" && seg !== "m" && seg !== "os") return LEGENDARY_SWORD_FIRST_HIT_DAMAGE;
  return legendarySwordSecondHitDamage(seg, secondEnemySlot);
}

export function applyEndTurnLegendarySwordArmingTick(card: FieldCard): FieldCard {
  if (card.name !== UNIT.LEGENDARY_SWORD) return card;
  const t = card.legendarySwordArmingEndTurnTicksRemaining;
  if (typeof t !== "number" || t <= 0) return card;
  const next = t - 1;
  if (next <= 0) {
    return {
      ...card,
      legendarySwordArmingEndTurnTicksRemaining: 0,
      legendarySwordArmed: true,
    };
  }
  return { ...card, legendarySwordArmingEndTurnTicksRemaining: next };
}

export function initializeLegendarySwordFieldCard(card: FieldCard): FieldCard {
  if (card.name !== UNIT.LEGENDARY_SWORD) return card;
  return {
    ...card,
    legendarySwordArmingEndTurnTicksRemaining: LEGENDARY_SWORD_ARMING_END_TURN_TICKS,
    legendarySwordArmed: false,
    legendarySwordChargeFastBlink: false,
  };
}

export function isLegendarySwordCharging(card: FieldCard | null | undefined): boolean {
  return (
    !!card &&
    card.name === UNIT.LEGENDARY_SWORD &&
    (card.legendarySwordArmingEndTurnTicksRemaining ?? 0) > 0 &&
    !card.legendarySwordArmed
  );
}

export function isLegendarySwordArmed(card: FieldCard | null | undefined): boolean {
  return !!card && card.name === UNIT.LEGENDARY_SWORD && !!card.legendarySwordArmed;
}

export function stripLegendarySwordForRewind(card: FieldCard): FieldCard {
  const {
    legendarySwordArmingEndTurnTicksRemaining: _a,
    legendarySwordArmed: _b,
    legendarySwordChargeFastBlink: _f,
    ...rest
  } = card;
  return rest as FieldCard;
}

/** 필드 소유자 턴 종료 시 충전 중 전설의 검 후광 가속 */
export function applyEndTurnLegendarySwordArmingTickToFieldUnit(
  u: FieldCard,
  fieldOwnerEndedTurn: boolean
): FieldCard {
  if (u.name !== UNIT.LEGENDARY_SWORD) return u;
  let next = u;
  if (fieldOwnerEndedTurn && isLegendarySwordCharging(next)) {
    next = { ...next, legendarySwordChargeFastBlink: true };
  }
  return applyEndTurnLegendarySwordArmingTick(next);
}

export function applyEndTurnLegendarySwordArmingTickForFieldOwner(
  field: { is: FieldCard | null; m: FieldCard | null; os: FieldCard | null },
  fieldOwner: "A" | "B",
  endingTurnPlayer: "A" | "B"
): { is: FieldCard | null; m: FieldCard | null; os: FieldCard | null } {
  const ownerEnded = fieldOwner === endingTurnPlayer;
  return {
    is: field.is ? applyEndTurnLegendarySwordArmingTickToFieldUnit(field.is, ownerEnded) : null,
    m: field.m ? applyEndTurnLegendarySwordArmingTickToFieldUnit(field.m, ownerEnded) : null,
    os: field.os ? applyEndTurnLegendarySwordArmingTickToFieldUnit(field.os, ownerEnded) : null,
  };
}
