import type { FieldCard, SimulationPlayerField } from "../../../types/game";
import { getActiveStatuses, isTaunting } from "../../cardskills";
import { UNIT } from "../unitIds";

export const IVERSON_ID = UNIT.IVERSON;

/** Is–Is / M–M / Os–Os → 1, 한 칸 떨어짐 → 2, 두 칸(Is–Os) → 3 */
const IVERSON_FIELD_SLOTS = ["is", "m", "os"] as const;
export type IversonFieldSlot = (typeof IVERSON_FIELD_SLOTS)[number];

const SLOT_COL: Record<IversonFieldSlot, number> = { is: 0, m: 1, os: 2 };

export function iversonEnemySlotDistance(attackerSlot: IversonFieldSlot, defenderSlot: IversonFieldSlot): number {
  return Math.abs(SLOT_COL[attackerSlot] - SLOT_COL[defenderSlot]) + 1;
}

function unitHasTauntLike(
  card: FieldCard,
  fullBoard?: {
    playerAField: SimulationPlayerField;
    playerBField: SimulationPlayerField;
    defenderPlayer: "A" | "B";
    slot: IversonFieldSlot;
  }
): boolean {
  if (fullBoard) {
    const { playerAField, playerBField, defenderPlayer, slot } = fullBoard;
    const myField = defenderPlayer === "A" ? playerAField : playerBField;
    const oppField = defenderPlayer === "A" ? playerBField : playerAField;
    return isTaunting(card, oppField[slot] ?? null, myField, {
      playerAField,
      playerBField,
      mySlotKey: `${defenderPlayer}-${slot}`,
    });
  }
  return getActiveStatuses(card, null).includes("도발") || !!(card as { hasBanjitgori?: boolean }).hasBanjitgori;
}

export const IVERSON_NEAREST_ENEMY_MSG =
  "아이버슨은 가장 가까운 적만 기본 공격할 수 있습니다.";

/** 도발이 있으면 도발 유닛만 후보로 두고, 그중 아이버슨 슬롯 기준 최소 거리 슬롯만 반환(동률이면 복수). */
export function getIversonClosestEnemyTargetSlots(
  attackerSlot: IversonFieldSlot,
  enemyField: { is: FieldCard | null; m: FieldCard | null; os: FieldCard | null },
  onlyTauntedEnemies: boolean,
  fullBoard?: {
    playerAField: SimulationPlayerField;
    playerBField: SimulationPlayerField;
    defenderPlayer: "A" | "B";
  }
): IversonFieldSlot[] {
  const candidates = IVERSON_FIELD_SLOTS.filter(s => {
    const c = enemyField[s];
    if (!c) return false;
    if (onlyTauntedEnemies) {
      if (fullBoard) {
        return unitHasTauntLike(c, { ...fullBoard, slot: s });
      }
      return unitHasTauntLike(c);
    }
    return true;
  });
  if (candidates.length === 0) return [];
  const dist = (s: IversonFieldSlot) => iversonEnemySlotDistance(attackerSlot, s);
  const minD = Math.min(...candidates.map(dist));
  return candidates.filter(s => dist(s) === minD);
}

/** 1*턴 = 양측 턴 넘기기 각 1회(전역 턴 넘김 2회) */
export const IVERSON_SUMMON_WAIT_STAR_TURNS = 2;

/** 소환 직후 턴 넘김 횟수(2*턴 = 4회) 후 기본 공격 가능 */
export const IVERSON_SUMMON_WAIT_END_TURNS = IVERSON_SUMMON_WAIT_STAR_TURNS * 2;

/** 남은 *턴* 수(올림): 턴 넘김 틱 t일 때 ceil(t/2) */
export function iversonRemainingStarTurnsCeil(ticksRemaining: number): number {
  return Math.max(0, Math.ceil(Math.max(0, ticksRemaining) / 2));
}

/** 공격 버튼·안내 문구 통일 — "n*턴 뒤 해방" (1*턴 = 턴 넘김 2회) */
export function iversonLiberationLabel(card: FieldCard | null | undefined): string | null {
  if (!card || card.name !== IVERSON_ID) return null;
  const t = card.iversonSummonWaitEndTurnTicksRemaining ?? 0;
  if (t <= 0) return null;
  return `${iversonRemainingStarTurnsCeil(t)}*턴 뒤 해방`;
}

export function isIversonAttackLocked(card: FieldCard | null | undefined): boolean {
  return !!card && card.name === IVERSON_ID && (card.iversonSummonWaitEndTurnTicksRemaining ?? 0) > 0;
}

/** 턴 넘기기 1회마다 — 대기 틱 1 감소, 0이 되면 속성 제거(공격 가능 상태) */
export function applyEndTurnIversonWaitTickToFieldUnit(u: FieldCard): FieldCard {
  if (u.name !== IVERSON_ID) return u;
  const n = u.iversonSummonWaitEndTurnTicksRemaining;
  if (n == null || n <= 0) return u;
  const next = n - 1;
  if (next <= 0) {
    const { iversonSummonWaitEndTurnTicksRemaining: _i, ...rest } = u;
    return rest as FieldCard;
  }
  return { ...u, iversonSummonWaitEndTurnTicksRemaining: next };
}

/** 0~1, 대기 중일 때만 의미 있음 (4→0 틱 기준 채움 비율) */
export function iversonWaitGaugeFill01(card: FieldCard | null | undefined): number {
  if (!card || card.name !== IVERSON_ID) return 0;
  const t = card.iversonSummonWaitEndTurnTicksRemaining;
  if (t == null || t <= 0) return 0;
  return (IVERSON_SUMMON_WAIT_END_TURNS - t) / IVERSON_SUMMON_WAIT_END_TURNS;
}
