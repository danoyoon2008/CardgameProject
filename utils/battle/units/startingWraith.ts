/**
 * 시작의 망령(No.44) — 패시브: 기본 공격이 적의 방어력·피해감소(반짓고리·방어막·철기병·라임·메리 등)와
 * 체력 보호막 흡수를 무시하고 항상 트루 딜. [무적]·백스 패시브 등은 기존과 동일.
 * 적 처치 시 같은 공격권으로 즉시 추가 타격.
 * [혼란] 시 트루 딜·처치 연쇄 추가 공격권 일시 봉인.
 */
import type { FieldCard } from "../../../types/game";
import { hasConfusionStatus } from "./dinner";
import { UNIT } from "../unitIds";

export const STARTING_WRAITH_ID = UNIT.STARTING_WRAITH;

/** [혼란] 시 트루 딜·처치 연쇄 패시브 일시 봉인 */
export function isStartingWraithPassivesPausedByConfusion(
  card: FieldCard | null | undefined,
  facingOppCard: FieldCard | null
): boolean {
  if (!card || card.name !== STARTING_WRAITH_ID || (card.currentHp ?? 0) <= 0) return false;
  return hasConfusionStatus(card, facingOppCard);
}

/** 혼란 아닐 때만 기본 공격 트루 딜(방어·보호막 흡수 무시) */
export function isStartingWraithTrueStrikeBasicAttacker(
  card: FieldCard | null | undefined,
  facingOppCard: FieldCard | null = null
): boolean {
  if (!card || card.name !== STARTING_WRAITH_ID || (card.currentHp ?? 0) <= 0) return false;
  if (isStartingWraithPassivesPausedByConfusion(card, facingOppCard)) return false;
  return true;
}

/** 피격자 필드에서 `excludeSlot`을 제외한 나머지 슬롯에 체력 1 이상인 유닛 수 */
export function countOtherLivingDefenderUnits(
  defenderField: { is: FieldCard | null; m: FieldCard | null; os: FieldCard | null },
  excludeSlot: "is" | "m" | "os"
): number {
  let n = 0;
  for (const s of ["is", "m", "os"] as const) {
    if (s === excludeSlot) continue;
    const u = defenderField[s];
    if (u && (u.currentHp ?? 0) > 0) n++;
  }
  return n;
}

/** `pendingStartingWraithChainKill`이 현재 공격자와 일치하는 처치 연쇄 추가 타격인지 */
export function isStartingWraithBasicAttackChainFollowUpPending(
  pending: { attackerPlayer: "A" | "B"; attackerSlotName: string } | null,
  attackerPlayer: "A" | "B",
  attackerSlotName: string
): boolean {
  return (
    pending != null &&
    pending.attackerPlayer === attackerPlayer &&
    pending.attackerSlotName === attackerSlotName
  );
}

/** 처치 연쇄 추가 타격은 2차 공격과 같이 다굴 금지·턴 공격권 소모에 적용하지 않음 */
export function startingWraithChainFollowUpBypassesAntiGangup(
  isChainFollowUp: boolean,
  attackerCard: FieldCard | null | undefined,
  facingOppCard: FieldCard | null = null
): boolean {
  return isChainFollowUp && isStartingWraithTrueStrikeBasicAttacker(attackerCard, facingOppCard);
}

/** 망령 기본 공격(1차 빌드만)으로 적을 처치했을 때, 같은 공격권으로 즉시 다음 적을 노릴 수 있는지 */
export function isStartingWraithBasicAttackChainKillEligible(args: {
  attackerCard: FieldCard | null | undefined;
  facingOppCard?: FieldCard | null;
  attackType: "NORMAL" | "ADDITION" | "MULTIPLICATION";
  secondaryHits: number;
  isDestroyed: boolean;
  attackerDestroyedByReflect: boolean;
  defenderFieldBeforeKill: { is: FieldCard | null; m: FieldCard | null; os: FieldCard | null };
  killedSlot: "is" | "m" | "os";
}): boolean {
  const {
    attackerCard,
    facingOppCard = null,
    attackType,
    secondaryHits,
    isDestroyed,
    attackerDestroyedByReflect,
    defenderFieldBeforeKill,
    killedSlot,
  } = args;
  if (!isStartingWraithTrueStrikeBasicAttacker(attackerCard, facingOppCard)) return false;
  if (attackType !== "NORMAL" || secondaryHits !== 0) return false;
  if (!isDestroyed || attackerDestroyedByReflect) return false;
  return countOtherLivingDefenderUnits(defenderFieldBeforeKill, killedSlot) > 0;
}
