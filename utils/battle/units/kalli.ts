import type { FieldCard, SimulationPlayerField } from "../../../types/game";
import type { AttackModifierOptions } from "../attackModifier";
import { UNIT } from "../unitIds";
import { fieldHasLivingIronKiwi } from "./ironKiwi";
import { fieldHasLivingStartingTree } from "./startingTree";
import { applyDarkKnightYorinToAttackDamage } from "./darkKnight";
import { applyMaxellandTenacityToAttackDamage } from "./maxelland";
import { applyPyredAttackAuraToAttackDamage } from "./pyred";
import { applyMorningMoodAttackAuraToAttackDamage } from "./morningMood";
import { applyStartingTreeAttackAuraToAttackDamage } from "./startingTree";
import { applyGeomeunHwangjeAttackDamage } from "./geomeunHwangje";

export const KALLI_ID = UNIT.KALLI;

/** 캘리 기본 공격 — [방어형] 유닛에게 가산되는 고정 피해(방어·감소 무시) */
export const KALLI_VS_DEFENSE_TYPE_PURE_BONUS = 300 as const;

const DEFENSE_UNIT_TYPE_LABEL = "방어형";

function isDefenseTypeUnitCard(card: FieldCard | null | undefined): boolean {
  if (!card || (card.currentHp ?? 0) <= 0) return false;
  return String(card.type ?? "").trim() === DEFENSE_UNIT_TYPE_LABEL;
}

/**
 * 캘리의 기본 공격이 [방어형] 적에게 입히는 추가 고정 피해(1·2차 각각 독립 적용 가능).
 * `mary` 의 `DEFENSE_UNIT_TYPE` 과 동일 판정(순환 import 방지로 문자열만 공유).
 */
export function getKalliVsDefenseTypePureBonus(
  attacker: FieldCard | null | undefined,
  target: FieldCard | null | undefined
): number {
  if (!attacker || !target || attacker.name !== KALLI_ID) return 0;
  if (!isDefenseTypeUnitCard(target)) return 0;
  return KALLI_VS_DEFENSE_TYPE_PURE_BONUS;
}

/** 캘리 기본 공격 → [방어형] 유닛: 반짓고리·철기병 방어력·메리·방어막 등 대상 측 피해 경감을 적용하지 않음 */
export function kalliBasicAttackSkipsTargetMitigationVsDefenseType(
  attacker: FieldCard | null | undefined,
  target: FieldCard | null | undefined
): boolean {
  return getKalliVsDefenseTypePureBonus(attacker, target) > 0;
}

/** `getActiveStatuses` / 뱃지 / 툴팁 */
export const BUFF_BAN_BADGE = "[버프 금지]" as const;

export function fieldHasLivingKalli(
  field: SimulationPlayerField | Partial<Record<string, FieldCard | null>> | undefined | null
): boolean {
  if (!field) return false;
  for (const slot of ["is", "m", "os"] as const) {
    const c = field[slot];
    if (c?.name === KALLI_ID && (c.currentHp ?? 0) > 0) return true;
  }
  return false;
}

/**
 * 상대 필드에 살아 있는 캘리가 있고, 피해자가 적진 **is 또는 os**에 있으며,
 * 피해자 진영에 [디버프 면역] 오라가 없을 때만 [버프 금지]가 적용됩니다.
 */
export function callieBuffBanSuppressesBuffsForVictim(
  victimPlayer: "A" | "B",
  victimSlot: "is" | "m" | "os",
  playerAField: SimulationPlayerField,
  playerBField: SimulationPlayerField
): boolean {
  if (victimSlot === "m") return false;
  const victimField = victimPlayer === "A" ? playerAField : playerBField;
  const oppField = victimPlayer === "A" ? playerBField : playerAField;
  if (!fieldHasLivingKalli(oppField)) return false;
  if (fieldHasLivingIronKiwi(victimField) || fieldHasLivingStartingTree(victimField)) return false;
  return true;
}

/**
 * 공격자가 [버프 금지] 대상이면 **효과 뱃지로 표시되는** 공격 버프 보정만 적용하지 않습니다.
 * 검은 황제의 적 수 기반 피해 증가는 뱃지가 아닌 고유 규칙이므로 항상 적용합니다.
 */
export function applyAttackerOutgoingBuffDamageModsUnlessCallieBanned(
  attackerPlayer: "A" | "B",
  attackerSlot: "is" | "m" | "os",
  attackerCard: FieldCard,
  attackerField: SimulationPlayerField,
  defenderField: SimulationPlayerField,
  playerAField: SimulationPlayerField,
  playerBField: SimulationPlayerField,
  primaryDamage: number,
  secondaryDamage: number,
  opts?: AttackModifierOptions
): { primaryDamage: number; secondaryDamage: number } {
  let p = primaryDamage;
  let s = secondaryDamage;
  if (!callieBuffBanSuppressesBuffsForVictim(attackerPlayer, attackerSlot, playerAField, playerBField)) {
    ({ primaryDamage: p, secondaryDamage: s } = applyDarkKnightYorinToAttackDamage(attackerCard, p, s, opts));
    ({ primaryDamage: p, secondaryDamage: s } = applyMaxellandTenacityToAttackDamage(attackerCard, p, s, opts));
    ({ primaryDamage: p, secondaryDamage: s } = applyPyredAttackAuraToAttackDamage(
      attackerCard,
      attackerField,
      p,
      s,
      opts
    ));
    ({ primaryDamage: p, secondaryDamage: s } = applyMorningMoodAttackAuraToAttackDamage(
      attackerCard,
      attackerField,
      p,
      s,
      opts
    ));
    ({ primaryDamage: p, secondaryDamage: s } = applyStartingTreeAttackAuraToAttackDamage(
      attackerCard,
      attackerField,
      p,
      s,
      opts
    ));
  }
  ({ primaryDamage: p, secondaryDamage: s } = applyGeomeunHwangjeAttackDamage(attackerCard, defenderField, p, s, opts));
  return { primaryDamage: p, secondaryDamage: s };
}
