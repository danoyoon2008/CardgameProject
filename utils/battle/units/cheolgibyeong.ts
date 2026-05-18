import type { FieldCard } from "../../../types/game";
import type { DamageModContext, PassiveStatusFn, DamageModFn } from "../effectTypes";
import { UNIT } from "../unitIds";

/** 전투 로그·리포트용 (combatEngine calculateDamage 등) */
export const CHEOLGIBYEONG_REDUCTION_LOG = "방어력 (-200, 최소 100)";

export const CHEOLGIBYEONG_ID = UNIT.CHEOLGIBYEONG;

export const getCheolgibyeongPassiveStatuses: PassiveStatusFn = () => ["도발", "방어력 +200"];

export const applyCheolgibyeongDamageMod: DamageModFn = (_card: FieldCard, ctx: DamageModContext) =>
  Math.max(100, ctx.rawDamage - 200);
