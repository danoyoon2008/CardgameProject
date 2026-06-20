import type { FieldCard } from "../../types/game";

/** 5칸 필드 (is2 – is – m – os – os2) */
export interface FiveSlotField {
  is2: FieldCard | null;
  is: FieldCard | null;
  m: FieldCard | null;
  os: FieldCard | null;
  os2: FieldCard | null;
  spellStack: FieldCard[];
}

export type BossRaidPhase = "player" | "boss";
export type BossRaidResult = "ongoing" | "clear" | "fail";

export interface BossRaidState {
  bossId: string;
  playerField: FiveSlotField;
  bossField: FiveSlotField;
  bossHp: number;
  bossMaxHp: number;
  bossShield: number;
  /** 스킬 id → 남은 쿨타임 턴 */
  skillCooldowns: Record<string, number>;
  /** resetCooldownsAtHalfHp 1회 발동 여부 */
  halfHpResetDone: boolean;
  turnCount: number;
  phase: BossRaidPhase;
  result: BossRaidResult;
  /** 유저 핸드 (MVP: 테스트용 카드 또는 보유 카드) */
  playerHand: FieldCard[];
}

/** 빈 5칸 필드 */
export function emptyFiveSlotField(): FiveSlotField {
  return { is2: null, is: null, m: null, os: null, os2: null, spellStack: [] };
}

/** 5칸 순회용 (보스전 전용) */
export const BOSS_RAID_SLOTS = ["is2", "is", "m", "os", "os2"] as const;
export type BossRaidSlot = (typeof BOSS_RAID_SLOTS)[number];

/** 5칸 인접 관계 (is2–is–m–os–os2 선상) */
export function getAdjacentSlots(slot: BossRaidSlot): BossRaidSlot[] {
  const order: BossRaidSlot[] = ["is2", "is", "m", "os", "os2"];
  const idx = order.indexOf(slot);
  const result: BossRaidSlot[] = [];
  if (idx > 0) result.push(order[idx - 1]);
  if (idx < order.length - 1) result.push(order[idx + 1]);
  return result;
}
