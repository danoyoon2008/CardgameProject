/**
 * 메리(No.35) — 필드 패시브: (자신 제외) 전장에 [방어형] 유닛이 있으면 [방어력 +400].
 */
import type { FieldCard, SimulationPlayerField } from "../../../types/game";
import { hasConfusionStatus, isConfused } from "./dinner";
import { getUnitFacingOppAtSlot } from "./maengsugyeonPo";
import { CHEOLGIBYEONG_ID } from "./cheolgibyeong";
import { bangEomakProtectsTargetSlot } from "../spells/bangeomak";
import { UNIT } from "../unitIds";
import { isInvulnerableFromBaekseuOrCheolbyeok } from "../spells/cheolbyeok";
import { callieBuffBanSuppressesBuffsForVictim } from "./kalli";
import { isSuppressionActive } from "../debuffs/suppression";

export const MARY_ID = UNIT.MARY;
export const MARY_DEFENSE_BUFF_BADGE = "방어력 +400";
/** 카드 `type` 필드와 도감 표기 일치 */
export const DEFENSE_UNIT_TYPE = "방어형";

const ALL_FIELD_SLOT_KEYS = ["A-is", "A-m", "A-os", "B-is", "B-m", "B-os"] as const;

export function isLivingDefenseTypeUnit(card: FieldCard | null | undefined): boolean {
  if (!card || card.currentHp <= 0) return false;
  return String(card.type ?? "").trim() === DEFENSE_UNIT_TYPE;
}

/** [혼란] 시 [방어력 +400] 패시브·윤곽·피해 경감 모두 일시 봉인 */
export function isMaryDefensePassivePausedByConfusion(
  maryCard: FieldCard | null | undefined,
  facingOppCard: FieldCard | null
): boolean {
  if (!maryCard || maryCard.name !== MARY_ID || (maryCard.currentHp ?? 0) <= 0) return false;
  return hasConfusionStatus(maryCard, facingOppCard);
}

function facingOppForMarySlotKey(
  marySlotKey: string,
  playerAField: SimulationPlayerField,
  playerBField: SimulationPlayerField
): FieldCard | null {
  const [pl, sl] = marySlotKey.split("-") as ["A" | "B", string];
  if (sl !== "is" && sl !== "m" && sl !== "os") return null;
  return getUnitFacingOppAtSlot(pl, sl, playerAField, playerBField);
}

export function maryDefenseBuffActive(
  maryCard: FieldCard,
  playerAField: SimulationPlayerField,
  playerBField: SimulationPlayerField,
  marySlotKey: string,
  facingOppCard?: FieldCard | null
): boolean {
  if (maryCard.name !== MARY_ID) return false;
  const facing =
    facingOppCard !== undefined
      ? facingOppCard
      : facingOppForMarySlotKey(marySlotKey, playerAField, playerBField);
  if (isMaryDefensePassivePausedByConfusion(maryCard, facing)) return false;
  for (const key of ALL_FIELD_SLOT_KEYS) {
    if (key === marySlotKey) continue;
    const [pl, sl] = key.split("-") as ["A" | "B", "is" | "m" | "os"];
    const field = pl === "A" ? playerAField : playerBField;
    const unit = field[sl];
    if (isLivingDefenseTypeUnit(unit)) return true;
  }
  return false;
}

export type IncomingDefenseKind = "none" | "bangEomak" | "cheol" | "limeBubble" | "mary";

/**
 * 받는 피해에 방어력 적용(방어막·철기병·라임 보호막·메리 조건부). 순차 적용.
 */
export function applyIncomingDefenseDamage(
  damage: number,
  target: FieldCard,
  playerAField: SimulationPlayerField,
  playerBField: SimulationPlayerField,
  targetSlotKey: string
): { finalDamage: number; kind: IncomingDefenseKind } {
  const [tpRaw, tsRaw] = targetSlotKey.split("-");
  const tp = tpRaw as "A" | "B";
  const ts = tsRaw;
  const victimField = tp === "A" ? playerAField : playerBField;
  if (isInvulnerableFromBaekseuOrCheolbyeok(target, victimField)) {
    return { finalDamage: 0, kind: "none" };
  }

  const facingOpp =
    ts === "is" || ts === "m" || ts === "os"
      ? (tp === "A" ? playerBField : playerAField)[ts] ?? null
      : null;

  let d = damage;
  let kind: IncomingDefenseKind = "none";

  const callieBuffBan =
    (ts === "is" || ts === "m" || ts === "os") &&
    callieBuffBanSuppressesBuffsForVictim(tp, ts, playerAField, playerBField);

  const victimConfused = isConfused(target, facingOpp);
  const hasLimeBubble = !!(target as FieldCard & { hasLimeBubbleShieldBuff?: boolean }).hasLimeBubbleShieldBuff;

  /* 라임 방울 보호막: 수혜자 [혼란]이어도 시전자(라임) 스킬 링크가 유지되는 동안 -200 방어 적용 */
  if (!callieBuffBan && hasLimeBubble && !isSuppressionActive(target) && d > 100) {
    const next = Math.max(100, d - 200);
    if (next < d) kind = "limeBubble";
    d = next;
  }

  if (victimConfused) {
    return { finalDamage: d, kind };
  }

  if (bangEomakProtectsTargetSlot(targetSlotKey, playerAField, playerBField) && d > 100 && !callieBuffBan) {
    const next = Math.max(100, d - 200);
    if (next < d) kind = "bangEomak";
    d = next;
  }
  if (!callieBuffBan && target.name === CHEOLGIBYEONG_ID && d > 100) {
    const next = Math.max(100, d - 200);
    if (next < d) kind = "cheol";
    d = next;
  }
  if (
    !callieBuffBan &&
    target.name === MARY_ID &&
    maryDefenseBuffActive(target, playerAField, playerBField, targetSlotKey, facingOpp) &&
    d > 100
  ) {
    const next = Math.max(100, d - 400);
    if (next < d) kind = "mary";
    d = next;
  }
  return { finalDamage: d, kind };
}
