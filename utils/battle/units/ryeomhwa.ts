import type { FieldCard } from "../../../types/game";
import { hasConfusionStatus } from "./dinner";
import { UNIT } from "../unitIds";

/** No.41 — 패시브: 필드 체류 중 상대의 히든 스펠 트리거 무력화(뒷면 배치 시 보라 윤곽) */
export const RYEOMHWA_ID = UNIT.RYEOMHWA;

type UnitSlotsField = {
  is: FieldCard | null;
  m: FieldCard | null;
  os: FieldCard | null;
};

function slotHasLiveRyeomhwa(slot: FieldCard | null): boolean {
  return !!slot && slot.name === RYEOMHWA_ID && (slot.currentHp ?? 0) > 0;
}

/** [혼란] 시 히든 스펠 트리거 차단·[도발] 무력화 패시브(보라 윤곽 포함) 일시 봉인 */
export function isRyeomhwaPassivesPausedByConfusion(
  ryeomhwaCard: FieldCard | null | undefined,
  facingOppCard: FieldCard | null
): boolean {
  if (!ryeomhwaCard || ryeomhwaCard.name !== RYEOMHWA_ID || (ryeomhwaCard.currentHp ?? 0) <= 0) {
    return false;
  }
  return hasConfusionStatus(ryeomhwaCard, facingOppCard);
}

function slotHasActiveRyeomhwa(
  ryeomhwaOwner: "A" | "B",
  slot: "is" | "m" | "os",
  fieldA: UnitSlotsField,
  fieldB: UnitSlotsField
): boolean {
  const ownerField = ryeomhwaOwner === "A" ? fieldA : fieldB;
  const card = ownerField[slot];
  if (!slotHasLiveRyeomhwa(card)) return false;
  const oppField = ryeomhwaOwner === "A" ? fieldB : fieldA;
  if (isRyeomhwaPassivesPausedByConfusion(card, oppField[slot] ?? null)) return false;
  return true;
}

/** `perspective` 진영의 상대 필드에 살아 있는(혼란 아닌) 렴화가 있으면 true */
export function opponentFieldHasLiveRyeomhwa(
  perspective: "A" | "B",
  fieldA: UnitSlotsField,
  fieldB: UnitSlotsField
): boolean {
  const opp = perspective === "A" ? "B" : "A";
  return (["is", "m", "os"] as const).some(s => slotHasActiveRyeomhwa(opp, s, fieldA, fieldB));
}

/**
 * `spellFieldOwner` 스펠 칸의 히든 스펠 트리거가 렴화 때문에 막히는지.
 * (상대 필드에 렴화가 있을 때 — 슈퍼 테슬라 등 히든 발동 차단)
 */
export function areHiddenSpellsOnFieldSuppressedByRyeomhwa(
  spellFieldOwner: "A" | "B",
  fieldA: UnitSlotsField,
  fieldB: UnitSlotsField
): boolean {
  return opponentFieldHasLiveRyeomhwa(spellFieldOwner, fieldA, fieldB);
}

/** `unitOwner` 유닛의 [도발](반짓고리 내 도발 포함)이 상대 필드 렴화 때문에 무력화되는지 */
export function isTauntSuppressedByRyeomhwaForUnitOwner(
  unitOwner: "A" | "B",
  fieldA: UnitSlotsField,
  fieldB: UnitSlotsField
): boolean {
  return opponentFieldHasLiveRyeomhwa(unitOwner, fieldA, fieldB);
}
