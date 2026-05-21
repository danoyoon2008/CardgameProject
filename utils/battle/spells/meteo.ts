import type { FieldCard, SimulationPlayerField } from "../../../types/game";
import {
  resolveLegendarySwordStrikeOnUnit,
  type LegendarySwordStrikeResolveResult,
} from "../units/legendarySwordStrikeResolve";

/** No.21 마법 — 자기 스펠 칸 배치 시 즉시 소멸, 모든 적 유닛에게 1000 피해 */
export const METEO_SPELL_ID = "메테오" as const;

export const METEO_AOE_DAMAGE = 1000 as const;

type CardRowLite = { name?: string; number?: number };

export function isMeteoSpellCard(
  card: FieldCard | CardRowLite | null | undefined
): boolean {
  if (!card) return false;
  if (card.name === METEO_SPELL_ID) return true;
  const n = Number((card as FieldCard).number);
  return Number.isFinite(n) && n === 21;
}

export type MeteoDamageResult = LegendarySwordStrikeResolveResult;

/** 메테오 광역 피해 — 방어형·반짓고리·무적·체력 보호막·백스 규칙 적용(전설의 검 연격과 동일 경로) */
export function applyMeteoDamageToEnemyUnit(args: {
  target: FieldCard;
  targetPlayer: "A" | "B";
  targetSlot: "is" | "m" | "os";
  playerAField: SimulationPlayerField;
  playerBField: SimulationPlayerField;
}): MeteoDamageResult {
  return resolveLegendarySwordStrikeOnUnit({
    baseDamage: METEO_AOE_DAMAGE,
    ...args,
  });
}
