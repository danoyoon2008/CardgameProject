import type { FieldCard, SimulationPlayerField } from "../../../types/game";
import {
  resolveLegendarySwordStrikeOnUnit,
  type LegendarySwordStrikeResolveResult,
} from "../units/legendarySwordStrikeResolve";

/** No.34 마법 — 적 유닛 1체에게 2000 피해(공격 유형) */
export const HYPER_BEAM_SPELL_ID = "하이퍼 빔" as const;

export const HYPER_BEAM_DAMAGE = 2000 as const;

type CardRowLite = { name?: string; number?: number };

export function isHyperBeamSpellCard(
  card: FieldCard | CardRowLite | null | undefined
): boolean {
  if (!card) return false;
  if (card.name === HYPER_BEAM_SPELL_ID) return true;
  const n = Number((card as FieldCard).number);
  return Number.isFinite(n) && n === 34;
}

export type HyperBeamDamageResult = LegendarySwordStrikeResolveResult;

/** 하이퍼 빔 피해 — 방어·무적·보호막·백스·모닝 무드·시작의 나무 등(전설의 검/메테오와 동일 경로) */
export function applyHyperBeamDamageToEnemyUnit(args: {
  target: FieldCard;
  targetPlayer: "A" | "B";
  targetSlot: "is" | "m" | "os";
  playerAField: SimulationPlayerField;
  playerBField: SimulationPlayerField;
}): HyperBeamDamageResult {
  return resolveLegendarySwordStrikeOnUnit({
    baseDamage: HYPER_BEAM_DAMAGE,
    ...args,
  });
}
