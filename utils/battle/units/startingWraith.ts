/**
 * 시작의 망령(No.44) — 패시브: 기본 공격이 적의 방어력·피해감소(반짓고리·방어막·철기병·라임·메리 등)와
 * 체력 보호막 흡수를 무시하고 항상 트루 딜. [무적]·백스 패시브 등은 기존과 동일.
 */
import type { FieldCard } from "../../../types/game";
import { UNIT } from "../unitIds";

export const STARTING_WRAITH_ID = UNIT.STARTING_WRAITH;

export function isStartingWraithTrueStrikeBasicAttacker(card: FieldCard | null | undefined): boolean {
  return !!card && card.name === STARTING_WRAITH_ID && (card.currentHp ?? 0) > 0;
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

/** 망령 기본 공격(1차 빌드만)으로 적을 처치했을 때, 같은 공격권으로 즉시 다음 적을 노릴 수 있는지 */
export function isStartingWraithBasicAttackChainKillEligible(args: {
  attackerCard: FieldCard | null | undefined;
  attackType: "NORMAL" | "ADDITION" | "MULTIPLICATION";
  secondaryHits: number;
  isDestroyed: boolean;
  attackerDestroyedByReflect: boolean;
  defenderFieldBeforeKill: { is: FieldCard | null; m: FieldCard | null; os: FieldCard | null };
  killedSlot: "is" | "m" | "os";
}): boolean {
  const {
    attackerCard,
    attackType,
    secondaryHits,
    isDestroyed,
    attackerDestroyedByReflect,
    defenderFieldBeforeKill,
    killedSlot,
  } = args;
  if (!isStartingWraithTrueStrikeBasicAttacker(attackerCard)) return false;
  if (attackType !== "NORMAL" || secondaryHits !== 0) return false;
  if (!isDestroyed || attackerDestroyedByReflect) return false;
  return countOtherLivingDefenderUnits(defenderFieldBeforeKill, killedSlot) > 0;
}
