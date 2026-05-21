/**
 * 심판(No.51) — 필드 체류: 스펠이 발동(배치)될 때마다 해당 진영 덱에서 1장 드로우.
 * [혼란] 시 패시브 일시 봉인(자동 드로우·중앙 대기 연출 없음).
 */
import type { FieldCard } from "../../../types/game";
import { hasConfusionStatus } from "./dinner";
import { UNIT } from "../unitIds";

export const SIMPAN_ID = UNIT.SIMPAN;

type UnitFieldSlice = {
  is: FieldCard | null;
  m: FieldCard | null;
  os: FieldCard | null;
};

/** [혼란] 시 스펠 발동 드로우 등 패시브 일시 봉인 */
export function isSimpanPassivesPausedByConfusion(
  card: FieldCard | null | undefined,
  facingOppCard: FieldCard | null
): boolean {
  if (!card || card.name !== SIMPAN_ID || (card.currentHp ?? 0) <= 0) return false;
  return hasConfusionStatus(card, facingOppCard);
}

/** 진영 필드에 스펠 드로우 패시브가 켜진 살아 있는 심판이 있는지(슬롯별 마주보는 상대 기준 [혼란] 제외) */
export function fieldHasActiveSimpanSpellDrawPassive(
  ownField: UnitFieldSlice,
  oppField: UnitFieldSlice
): boolean {
  for (const slot of ["is", "m", "os"] as const) {
    const u = ownField[slot];
    if (!u || u.name !== SIMPAN_ID || (u.currentHp ?? 0) <= 0) continue;
    if (!isSimpanPassivesPausedByConfusion(u, oppField[slot] ?? null)) return true;
  }
  return false;
}
