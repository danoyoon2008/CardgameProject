import type { FieldCard, SimulationPlayerField } from "../../../types/game";
import { isInvulnerableFromBaekseuOrCheolbyeok } from "./cheolbyeok";

/** No.19 마법 카드 — 적 유닛에게 드래그하여 발동 */
export const BEONGGAE_SPELL_ID = "번개" as const;

/** 번개 사용 가능 — 대상 유닛 소환 비용 5토큰 이하 */
export const BEONGGAE_MAX_TARGET_UNIT_COST = 5;

export function isBeonggaeValidTargetUnit(unit: FieldCard | null | undefined): boolean {
  if (!unit) return false;
  const unitCost = Number(unit.cost) || 0;
  return unitCost <= BEONGGAE_MAX_TARGET_UNIT_COST;
}

/** 번개 적중 시 — 현재 체력만 1로 (최대 체력·필드 상태는 유지) */
export function applyBeonggaeLightningToFieldUnit(u: FieldCard, victimField: SimulationPlayerField): FieldCard {
  if (isInvulnerableFromBaekseuOrCheolbyeok(u, victimField)) return u;
  return { ...u, currentHp: 1 };
}
