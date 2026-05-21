import type { CardRow, FieldCard } from "../../../types/game";
import { isActiveNonHiddenSpellCard } from "../spells/spellVisibility";
import { UNIT } from "../unitIds";
import { isConfused } from "./dinner";
import { getUnitFacingOppAtSlot } from "./maengsugyeonPo";

export const RONU_ID = UNIT.RONU;

type UnitSlotsField = {
  is: FieldCard | null;
  m: FieldCard | null;
  os: FieldCard | null;
};

function slotHasLiveRonu(slot: FieldCard | null): boolean {
  return !!slot && slot.name === RONU_ID && (slot.currentHp ?? 0) > 0;
}

/** 로누가 [혼란]이면 상대 액티브 스펠 차단 패시브 일시 봉인 */
export function isRonuSpellBlockPassiveSuppressed(
  ronuCard: FieldCard | null,
  facingOppCard: FieldCard | null
): boolean {
  if (!slotHasLiveRonu(ronuCard)) return false;
  return isConfused(ronuCard, facingOppCard);
}

/** 살아 있고 [혼란]이 아닌 상대 로누가 있으면 true — 시전자 `caster` 기준 */
export function opponentFieldHasActiveRonuSpellBlock(
  caster: "A" | "B",
  fieldA: UnitSlotsField,
  fieldB: UnitSlotsField
): boolean {
  const opp = caster === "A" ? "B" : "A";
  const oppField = caster === "A" ? fieldB : fieldA;
  for (const slot of ["is", "m", "os"] as const) {
    const c = oppField[slot];
    if (!slotHasLiveRonu(c)) continue;
    const facing = getUnitFacingOppAtSlot(opp, slot, fieldA, fieldB);
    if (!isRonuSpellBlockPassiveSuppressed(c, facing)) return true;
  }
  return false;
}

/** @deprecated — `opponentFieldHasActiveRonuSpellBlock` 사용 권장(혼란 반영) */
export function opponentFieldHasLiveRonu(
  caster: "A" | "B",
  fieldA: UnitSlotsField,
  fieldB: UnitSlotsField
): boolean {
  return opponentFieldHasActiveRonuSpellBlock(caster, fieldA, fieldB);
}

/** 히든이 아닌 액티브 스펠 시전이 로누 패시브에 막히는지 */
export function isRonuBlockingCasterActiveSpell(
  caster: "A" | "B",
  spellCard: CardRow,
  fieldA: UnitSlotsField,
  fieldB: UnitSlotsField
): boolean {
  return (
    isActiveNonHiddenSpellCard(spellCard) &&
    opponentFieldHasActiveRonuSpellBlock(caster, fieldA, fieldB)
  );
}

/** 스펠 차단 패시브가 유효한 상대 로누 슬롯마다 `B-is` 형식 키로 콜백 */
export function forEachOpponentRonuLivingSlotKey(
  caster: "A" | "B",
  fieldA: UnitSlotsField,
  fieldB: UnitSlotsField,
  cb: (slotKey: string) => void
): void {
  const opp = caster === "A" ? "B" : "A";
  const oppField = caster === "A" ? fieldB : fieldA;
  (["is", "m", "os"] as const).forEach(slot => {
    const u = oppField[slot];
    if (!slotHasLiveRonu(u)) return;
    const facing = getUnitFacingOppAtSlot(opp, slot, fieldA, fieldB);
    if (isRonuSpellBlockPassiveSuppressed(u, facing)) return;
    cb(`${opp}-${slot}`);
  });
}

export const ronuBattleMessages = {
  cannotUseActiveSpells: "액티브 스펠을 사용할 수 없습니다",
} as const;
