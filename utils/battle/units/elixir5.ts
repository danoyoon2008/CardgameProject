import type { FieldCard } from "../../../types/game";
import { hasConfusionStatus } from "./dinner";
import { UNIT } from "../unitIds";

export const ELIXIR_5_ID = UNIT.ELIXIR_5;

/** 상태이상 표기 — 침묵과 동일 UI(보라), 디버프 아님 */
export const STUN_STATUS = "기절" as const;

export function isStunned(card: FieldCard | null | undefined): boolean {
  return !!card && (card.stunEndTurnTicksRemaining ?? 0) > 0;
}

/** [혼란] 시 기본 공격 [기절] 부여 패시브 일시 봉인 */
export function isElixir5StunPassivePausedByConfusion(
  attacker: FieldCard | null | undefined,
  facingOppCard: FieldCard | null
): boolean {
  if (!attacker || attacker.name !== ELIXIR_5_ID || (attacker.currentHp ?? 0) <= 0) return false;
  return hasConfusionStatus(attacker, facingOppCard);
}

/** 엘릭서 5 기본 공격 적중 시 대상에게 부여할 기절(피해 0이거나 처치면 없음) */
export function elixir5StunTargetPatch(
  attacker: FieldCard | null | undefined,
  damageDealt: number,
  targetDestroyed: boolean,
  facingOppCard: FieldCard | null = null
): Pick<FieldCard, "stunEndTurnTicksRemaining"> | Record<string, never> {
  if (!attacker || attacker.name !== ELIXIR_5_ID || targetDestroyed || damageDealt <= 0) return {};
  if (isElixir5StunPassivePausedByConfusion(attacker, facingOppCard)) return {};
  return { stunEndTurnTicksRemaining: 2 };
}

/** 턴 넘기기 1회마다 호출 — 기절 남은 틱 1 감소, 0이 되면 필드 제거 */
export function applyEndTurnStunTickToFieldUnit(u: FieldCard): FieldCard {
  const n = u.stunEndTurnTicksRemaining;
  if (n == null || n <= 0) return u;
  const next = n - 1;
  if (next <= 0) {
    const { stunEndTurnTicksRemaining: _s, ...rest } = u;
    return rest as FieldCard;
  }
  return { ...u, stunEndTurnTicksRemaining: next };
}
