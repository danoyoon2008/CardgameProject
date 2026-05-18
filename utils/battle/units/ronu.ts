import type { FieldCard } from "../../../types/game";
import { UNIT } from "../unitIds";

export const RONU_ID = UNIT.RONU;

type UnitSlotsField = {
  is: FieldCard | null;
  m: FieldCard | null;
  os: FieldCard | null;
};

function slotHasLiveRonu(slot: FieldCard | null): boolean {
  return !!slot && slot.name === RONU_ID && (slot.currentHp ?? 0) > 0;
}

/** 상대 필드에 살아 있는 로누가 있으면 true — 시전자 `caster` 기준 상대 진영만 검사 */
export function opponentFieldHasLiveRonu(
  caster: "A" | "B",
  fieldA: UnitSlotsField,
  fieldB: UnitSlotsField
): boolean {
  const oppField = caster === "A" ? fieldB : fieldA;
  return slotHasLiveRonu(oppField.is) || slotHasLiveRonu(oppField.m) || slotHasLiveRonu(oppField.os);
}

/** 살아 있는 상대 로누가 있는 유닛 슬롯마다 `B-is` 형식 키로 콜백 */
export function forEachOpponentRonuLivingSlotKey(
  caster: "A" | "B",
  fieldA: UnitSlotsField,
  fieldB: UnitSlotsField,
  cb: (slotKey: string) => void
): void {
  const opp = caster === "A" ? "B" : "A";
  const f = opp === "A" ? fieldA : fieldB;
  (["is", "m", "os"] as const).forEach(slot => {
    const u = f[slot];
    if (slotHasLiveRonu(u)) cb(`${opp}-${slot}`);
  });
}

export const ronuBattleMessages = {
  cannotUseActiveSpells: "액티브 스펠을 사용할 수 없습니다",
} as const;
