import type { FieldCard, SimulationPlayerField } from "../../../types/game";
import { applyFlatAttackModifierByPattern, type AttackModifierOptions } from "../attackModifier";
import { UNIT } from "../unitIds";
import { hasConfusionStatus } from "./dinner";

export const GEOMEUN_HWANGJE_ID = UNIT.GEOMEUN_HWANGJE;

/** 혼란·비혼란 공통 기본 타격 공격력 */
export const GEOMEUN_HWANGJE_BASE_ATK = 600;

/**
 * DB에 `600+…`, `600 (연쇄)` 등이 있어도 **단일 기본 타격**으로만 파싱·표기.
 * `+` 이하·괄호 블록 전부 제거 후 선행 숫자만 사용.
 */
export function normalizeGeomeunHwangjeAtkRawForBasicHit(atk: string): string {
  let s = atk.trim();
  const onlyParen = s.match(/^(\d+)\s*\([^)]*\)\s*$/);
  if (onlyParen) s = onlyParen[1]!;
  s = s.replace(/[\(\)]/g, "").trim();
  const plus = s.indexOf("+");
  if (plus !== -1) s = s.slice(0, plus).trim();
  const m = s.match(/^(\d+)/);
  return m ? m[1]! : "0";
}

/** 시뮬 공격/파싱용 base ATK 문자열 — 검은 황제만 위 규칙 적용 */
export function resolveFieldUnitSimulationBaseAtkRaw(
  card: FieldCard | null | undefined,
  attackOptionOverride: string | null
): string {
  if (attackOptionOverride !== null) return attackOptionOverride;
  const raw = String(card?.atk ?? "0");
  if (card?.name === GEOMEUN_HWANGJE_ID) return normalizeGeomeunHwangjeAtkRawForBasicHit(raw);
  return raw;
}

/** [혼란] 시 적 수 감지·[집중 사격] 오라 패시브 일시 봉인 */
export function isGeomeunHwangjePassivesPausedByConfusion(
  card: FieldCard | null | undefined,
  facingOppCard: FieldCard | null
): boolean {
  if (!card || card.name !== GEOMEUN_HWANGJE_ID || (card.currentHp ?? 0) <= 0) return false;
  return hasConfusionStatus(card, facingOppCard);
}

/** 적 필드(is/m/os)에 살아 있는 유닛 수(체력 0 초과만) */
export function countLivingEnemyUnitsOnField(
  field: SimulationPlayerField | Partial<Record<string, FieldCard | null>> | undefined | null
): number {
  if (!field) return 0;
  let n = 0;
  for (const slot of ["is", "m", "os"] as const) {
    const c = field[slot];
    if (c && (c.currentHp ?? 0) > 0) n += 1;
  }
  return n;
}

/** 기본 600 + 적 1명당 +200(상한 3명 = +600 → 최대 1200, 단일 타격) */
export function applyGeomeunHwangjeAttackDamage(
  attackerCard: FieldCard,
  defenderField: SimulationPlayerField | Partial<Record<string, FieldCard | null>> | undefined | null,
  primaryDamage: number,
  secondaryDamage: number,
  options?: AttackModifierOptions,
  facingOppCard: FieldCard | null = null
): { primaryDamage: number; secondaryDamage: number } {
  if (attackerCard.name !== GEOMEUN_HWANGJE_ID) {
    return { primaryDamage, secondaryDamage };
  }
  if (isGeomeunHwangjePassivesPausedByConfusion(attackerCard, facingOppCard)) {
    return { primaryDamage, secondaryDamage };
  }
  const bonus = 200 * countLivingEnemyUnitsOnField(defenderField);
  return applyFlatAttackModifierByPattern(primaryDamage, secondaryDamage, bonus, options);
}
