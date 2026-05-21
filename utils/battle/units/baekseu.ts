/**
 * 백스(No.46) — 치명적 피해 1회: 체력 1로 생존, 1*턴(턴 넘김 2회) [무적](피해·해로운 효과 면역).
 * 생존 후 적 10% 이하 처형 오라.
 * [혼란] 시 1HP 생존·처형 오라 패시브 일시 봉인(이미 1HP·처형 중 혼란 → 처형만 해제, 즉사 없음).
 */
import type { FieldCard, SimulationPlayerField } from "../../../types/game";
import { cleanupSimulationUnitDeath, type SimulationPlayerFieldSlice } from "../simulationDeathCleanup";
import { getEffectSemanticKind } from "../effectSemantics";
import { hasConfusionStatus } from "./dinner";
import { UNIT } from "../unitIds";
import { STUN_STATUS } from "./elixir5";
import { getMorningMoodDeathAllyHeal } from "./morningMood";

export const BAEKSEU_ID = UNIT.BAEKSEU;
export const BAEKSEU_INVULN_BADGE = "[무적]" as const;

/** 1*턴 = 양측 턴 넘김 합계 2회 — 기절·언덕 [침묵]과 동일 틱 규칙 */
const INVULN_INITIAL_END_TURN_TICKS = 2;

export type BaekseuFieldThree = {
  is: FieldCard | null;
  m: FieldCard | null;
  os: FieldCard | null;
};

export type BaekseuExecuteFieldContext = {
  playerAField: BaekseuFieldThree;
  playerBField: BaekseuFieldThree;
};

/** [혼란] 시 1HP 생존·적 처형 오라 패시브 일시 봉인 */
export function isBaekseuPassivesPausedByConfusion(
  card: FieldCard | null | undefined,
  facingOppCard: FieldCard | null
): boolean {
  if (!card || card.name !== BAEKSEU_ID || (card.currentHp ?? 0) <= 0) return false;
  return hasConfusionStatus(card, facingOppCard);
}

export function isBaekseuInvulnerable(card: FieldCard | null | undefined): boolean {
  return !!card && card.name === BAEKSEU_ID && (card.baekseuInvulnerableEndTurnTicksRemaining ?? 0) > 0;
}

/** 패시브(1HP 생존) 발동 후 살아 있는 동안 — 10% 처형·윤곽 연출([혼란] 시 처형만 비활성) */
export function isBaekseuLastStandExecuteAuraActiveOnUnit(
  card: FieldCard | null | undefined,
  facingOppCard: FieldCard | null = null
): boolean {
  if (!card || card.name !== BAEKSEU_ID || card.currentHp <= 0) return false;
  if (!card.baekseuLastStandUsed) return false;
  if (isBaekseuPassivesPausedByConfusion(card, facingOppCard)) return false;
  return true;
}

function isBaekseuExecuteSourceActiveOnSlot(
  owner: "A" | "B",
  slot: "is" | "m" | "os",
  ctx: BaekseuExecuteFieldContext
): boolean {
  const ownField = owner === "A" ? ctx.playerAField : ctx.playerBField;
  const oppField = owner === "A" ? ctx.playerBField : ctx.playerAField;
  return isBaekseuLastStandExecuteAuraActiveOnUnit(ownField[slot], oppField[slot] ?? null);
}

export function fieldHasBaekseuLastStandExecuteAura(
  allyField: BaekseuFieldThree,
  owner: "A" | "B",
  ctx?: BaekseuExecuteFieldContext
): boolean {
  if (ctx) {
    return (["is", "m", "os"] as const).some(s => isBaekseuExecuteSourceActiveOnSlot(owner, s, ctx));
  }
  return (
    isBaekseuLastStandExecuteAuraActiveOnUnit(allyField.is) ||
    isBaekseuLastStandExecuteAuraActiveOnUnit(allyField.m) ||
    isBaekseuLastStandExecuteAuraActiveOnUnit(allyField.os)
  );
}

export function isHarmfulEffectLabelBlockedByBaekseuInvuln(label: string): boolean {
  if (label === STUN_STATUS || label === "침묵") return true;
  return getEffectSemanticKind(label) === "debuff";
}

const HARMFUL_OPTIONAL_KEYS = [
  "stunEndTurnTicksRemaining",
  "eondeokSilenceEndTurnTicksRemaining",
  "hasPakiAttackHalveDebuff",
] as const;

/** [무적] 부여 직전 제거: 기절·언덕 침묵·패키 저주 등 */
export function stripBaekseuHarmfulEffectsForInvuln(card: FieldCard): FieldCard {
  const next: FieldCard = { ...card };
  for (const k of HARMFUL_OPTIONAL_KEYS) {
    delete (next as Record<string, unknown>)[k];
  }
  return next;
}

export function resolveBaekseuFatalDamage(
  card: FieldCard,
  hpAfterDamage: number,
  actualDamageDealt: number,
  facingOppCard: FieldCard | null = null
): {
  finalHp: number;
  isDestroyed: boolean;
  lastStandTriggered: boolean;
  patch: Partial<FieldCard>;
} {
  if (hpAfterDamage > 0) {
    return { finalHp: hpAfterDamage, isDestroyed: false, lastStandTriggered: false, patch: {} };
  }
  if (card.name !== BAEKSEU_ID || card.baekseuLastStandUsed || actualDamageDealt <= 0) {
    return { finalHp: hpAfterDamage, isDestroyed: true, lastStandTriggered: false, patch: {} };
  }
  if (isBaekseuPassivesPausedByConfusion(card, facingOppCard)) {
    return { finalHp: hpAfterDamage, isDestroyed: true, lastStandTriggered: false, patch: {} };
  }
  return {
    finalHp: 1,
    isDestroyed: false,
    lastStandTriggered: true,
    patch: {
      baekseuLastStandUsed: true,
      baekseuInvulnerableEndTurnTicksRemaining: INVULN_INITIAL_END_TURN_TICKS,
    },
  };
}

export function applyEndTurnBaekseuInvulnTickToFieldUnit(u: FieldCard): FieldCard {
  const n = u.baekseuInvulnerableEndTurnTicksRemaining;
  if (n == null || n <= 0) return u;
  const next = n - 1;
  if (next <= 0) {
    const { baekseuInvulnerableEndTurnTicksRemaining: _b, ...rest } = u;
    return rest as FieldCard;
  }
  return { ...u, baekseuInvulnerableEndTurnTicksRemaining: next };
}

export function isEnemyHpAtOrBelowTenPercentOfMax(
  unit: FieldCard | null | undefined,
  /** 해당 유닛이 속한 진영 필드(스펠 스택 포함) — 철벽 [무적] 시 처형선 판정 제외 */
  unitOwnerField?: SimulationPlayerField | null
): boolean {
  if (!unit || unit.currentHp <= 0) return false;
  if (isBaekseuInvulnerable(unit)) return false;
  if (
    unitOwnerField?.spellStack?.some(
      c => c?.name === "철벽" && (c.cheolbyeokAllyInvulnEndTurnTicksRemaining ?? 0) > 0
    )
  ) {
    return false;
  }
  const maxHp = Number(unit.hp) || 0;
  if (maxHp <= 0) return false;
  return unit.currentHp <= maxHp * 0.1;
}

export function collectBaekseuInvulnThresholdExecuteTargets(
  fieldA: BaekseuFieldThree,
  fieldB: BaekseuFieldThree
): { victim: "A" | "B"; slot: "is" | "m" | "os" }[] {
  const ctx: BaekseuExecuteFieldContext = { playerAField: fieldA, playerBField: fieldB };
  const out: { victim: "A" | "B"; slot: "is" | "m" | "os" }[] = [];
  if (fieldHasBaekseuLastStandExecuteAura(fieldA, "A", ctx)) {
    for (const slot of ["is", "m", "os"] as const) {
      const u = fieldB[slot];
      if (isEnemyHpAtOrBelowTenPercentOfMax(u, fieldB as SimulationPlayerField)) out.push({ victim: "B", slot });
    }
  }
  if (fieldHasBaekseuLastStandExecuteAura(fieldB, "B", ctx)) {
    for (const slot of ["is", "m", "os"] as const) {
      const u = fieldA[slot];
      if (isEnemyHpAtOrBelowTenPercentOfMax(u, fieldA as SimulationPlayerField)) out.push({ victim: "A", slot });
    }
  }
  return out;
}

/**
 * 백스가 패시브로 생존한 뒤 필드에 살아 있는 동안 — 적 체력 10% 이하 즉시 처치(UI: `flashSlotKeys`·`baekseuSourceFlashSlotKeys`).
 */
export function applyBaekseuInvulnThresholdExecutePass<T extends SimulationPlayerFieldSlice>(
  playerA: T,
  playerB: T,
  currentGlobalTurn: number
): {
  playerA: T;
  playerB: T;
  rewindAdds: FieldCard[];
  flashSlotKeys: string[];
  baekseuSourceFlashSlotKeys: string[];
} {
  const pa = { ...playerA, field: { ...playerA.field } };
  const pb = { ...playerB, field: { ...playerB.field } };
  const rewindAdds: FieldCard[] = [];
  const flashSlotKeys: string[] = [];
  const executeCtx: BaekseuExecuteFieldContext = { playerAField: pa.field, playerBField: pb.field };

  const targets = collectBaekseuInvulnThresholdExecuteTargets(pa.field, pb.field);
  for (const { victim, slot } of targets) {
    const fieldRef = victim === "A" ? pa.field : pb.field;
    const dead = fieldRef[slot];
    if (!dead || !isEnemyHpAtOrBelowTenPercentOfMax(dead, fieldRef as SimulationPlayerField)) continue;

    cleanupSimulationUnitDeath(dead, pa, pb, currentGlobalTurn);
    rewindAdds.push(dead);
    fieldRef[slot] = null;
    flashSlotKeys.push(`${victim}-${slot}`);

    const facingMm = (victim === "A" ? pb.field : pa.field)[slot] ?? null;
    const mmHeal = getMorningMoodDeathAllyHeal(dead, facingMm);
    if (mmHeal > 0) {
      const side = victim === "A" ? pa : pb;
      for (const s2 of ["is", "m", "os"] as const) {
        const u = side.field[s2];
        if (!u) continue;
        side.field[s2] = { ...u, currentHp: Math.min(Number(u.hp), u.currentHp + mmHeal) };
      }
    }
  }

  const baekseuSourceFlashSlotKeys: string[] = [];
  const pushBaekSources = (side: "A" | "B") => {
    for (const slot of ["is", "m", "os"] as const) {
      if (isBaekseuExecuteSourceActiveOnSlot(side, slot, executeCtx)) {
        baekseuSourceFlashSlotKeys.push(`${side}-${slot}`);
      }
    }
  };
  let needFlashSourcesOnA = false;
  let needFlashSourcesOnB = false;
  for (const key of flashSlotKeys) {
    if (key.startsWith("B-")) needFlashSourcesOnA = true;
    if (key.startsWith("A-")) needFlashSourcesOnB = true;
  }
  if (needFlashSourcesOnA) pushBaekSources("A");
  if (needFlashSourcesOnB) pushBaekSources("B");

  return { playerA: pa as T, playerB: pb as T, rewindAdds, flashSlotKeys, baekseuSourceFlashSlotKeys };
}
