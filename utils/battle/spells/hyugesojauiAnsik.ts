/**
 * 스펠 No.26 휴게소의 안식 — 자기 스펠 칸 배치.
 * 배치 시 아군 전원 500 회복, 이후 3×턴(양측 턴 종료 합 6회) 동안
 * 시전자 턴이 시작될 때마다 아군 전원 500 회복 시도(최대 체력이어도 연출).
 */
import type { FieldCard, SimulationPlayerField } from "../../../types/game";
import { normalizeSpellStack } from "../fieldSpellAccess";
import { healUnitCurrentHp } from "../hpSurvivalOnes";
import { isHealBlockedBySuppression } from "../debuffs/suppression";

export const HYUGESOJAUI_ANSIK_SPELL_ID = "휴게소의 안식" as const;

export const HYUGESOJAUI_ANSIK_HEAL_PER_TRIGGER = 500;

/** 3×턴 = 배치 턴 이후 양측 턴 종료 합 6회 */
export const HYUGESOJAUI_ANSIK_INITIAL_END_TURN_TICKS = 6;

/** @deprecated — `hyugesojauiAnsikEndTurnTicksRemaining` 사용 */
export const HYUGESOJAUI_ANSIK_TURN_HEALS_AFTER_PLACEMENT = 2;

export type HyugesojauiAnsikCombatPatch = {
  id: string | undefined;
  delta: Partial<
    Record<"damageDealt" | "kills" | "damageTaken" | "selfHeal" | "allyHealGiven" | "damageMitigated", number>
  >;
};

export function isHyugesojauiAnsikSpellCard(c: FieldCard | null | undefined): boolean {
  return !!c && c.name === HYUGESOJAUI_ANSIK_SPELL_ID;
}

export function isHyugesojauiAnsikActiveOnSpell(spell: FieldCard | null | undefined): boolean {
  return (
    isHyugesojauiAnsikSpellCard(spell) &&
    (spell!.hyugesojauiAnsikEndTurnTicksRemaining ?? spell!.hyugesojauiAnsikTurnHealsRemaining ?? 0) > 0
  );
}

function cloneSimulationPlayerField(field: SimulationPlayerField): SimulationPlayerField {
  return {
    is: field.is ? { ...field.is } : null,
    m: field.m ? { ...field.m } : null,
    os: field.os ? { ...field.os } : null,
    spellStack: [...normalizeSpellStack(field)],
  };
}

function stripHyugesojauiRuntimeFields(spell: FieldCard): FieldCard {
  const {
    hyugesojauiAnsikEndTurnTicksRemaining: _e,
    hyugesojauiAnsikTurnHealsRemaining: _h,
    ...rest
  } = spell;
  return rest as FieldCard;
}

export type HyugesojauiAnsikHealSlotResult = {
  slot: "is" | "m" | "os";
  healed: number;
};

/**
 * 살아 있는 아군 유닛마다 회복 시도.
 * [제압] 시 HP·연출 모두 스킵. 최대 체력이면 `healed: 0`으로 펄스만 재생.
 */
export function applyHyugesojauiAnsikHealAttempt(
  field: SimulationPlayerField,
  amount: number
): {
  nextField: SimulationPlayerField;
  combatPatches: HyugesojauiAnsikCombatPatch[];
  perSlot: HyugesojauiAnsikHealSlotResult[];
} {
  const f = cloneSimulationPlayerField(field);
  const combatPatches: HyugesojauiAnsikCombatPatch[] = [];
  const perSlot: HyugesojauiAnsikHealSlotResult[] = [];

  for (const slot of ["is", "m", "os"] as const) {
    const u = f[slot];
    if (!u || (u.currentHp ?? 0) <= 0) continue;
    if (isHealBlockedBySuppression(u, "playerSpell")) continue;

    const headroom = Math.max(0, Number(u.hp) - u.currentHp);
    const healed = Math.min(amount, headroom);
    perSlot.push({ slot, healed });

    if (healed > 0) {
      f[slot] = healUnitCurrentHp(u, healed, { supportSource: "playerSpell" });
      if (u.statsInstanceId) {
        combatPatches.push({ id: u.statsInstanceId, delta: { selfHeal: healed } });
      }
    }
  }

  return { nextField: f, combatPatches, perSlot };
}

/** @deprecated — `applyHyugesojauiAnsikHealAttempt` 사용 */
export function applyHyugesojauiAnsikHealAlliesOnce(
  field: SimulationPlayerField,
  amount: number
): {
  nextField: SimulationPlayerField;
  combatPatches: HyugesojauiAnsikCombatPatch[];
  slotHeals: HyugesojauiAnsikHealSlotResult[];
} {
  const r = applyHyugesojauiAnsikHealAttempt(field, amount);
  return {
    nextField: r.nextField,
    combatPatches: r.combatPatches,
    slotHeals: r.perSlot.filter(s => s.healed > 0),
  };
}

/** 턴 넘김 1회마다 스펠 칸 휴게소의 안식 틱 — 0이 되면 스펠 제거·리와인드용 카드 반환 */
export function applyEndTurnHyugesojauiAnsikSpellToField(spell: FieldCard | null): {
  nextSpell: FieldCard | null;
  expiredToRewind: FieldCard | null;
} {
  if (!isHyugesojauiAnsikSpellCard(spell)) {
    return { nextSpell: spell, expiredToRewind: null };
  }
  const n =
    spell!.hyugesojauiAnsikEndTurnTicksRemaining ??
    (spell!.hyugesojauiAnsikTurnHealsRemaining != null
      ? spell!.hyugesojauiAnsikTurnHealsRemaining! * 2
      : 0);
  if (n <= 0) {
    return { nextSpell: null, expiredToRewind: stripHyugesojauiRuntimeFields(spell!) };
  }
  const next = n - 1;
  if (next <= 0) {
    return { nextSpell: null, expiredToRewind: stripHyugesojauiRuntimeFields(spell!) };
  }
  return {
    nextSpell: { ...spell!, hyugesojauiAnsikEndTurnTicksRemaining: next },
    expiredToRewind: null,
  };
}

export type HyugesojauiAnsikTurnStartVfx = {
  allyPlayer: "A" | "B";
  perSlot: HyugesojauiAnsikHealSlotResult[];
};

/**
 * `nextTurnOwner`의 턴이 막 시작될 때(상대가 턴 종료한 직후) 호출.
 * 스펠 스택 어디에든 활성 휴게소의 안식이 있으면 아군 500 회복 시도(연출은 살아 있는 아군 전원).
 */
export function applyHyugesojauiAnsikTurnStartForOwner(args: {
  nextTurnOwner: "A" | "B";
  playerAField: SimulationPlayerField;
  playerBField: SimulationPlayerField;
}): {
  nextPlayerAField: SimulationPlayerField;
  nextPlayerBField: SimulationPlayerField;
  combatPatches: HyugesojauiAnsikCombatPatch[];
  vfx: HyugesojauiAnsikTurnStartVfx | null;
} {
  const pa = cloneSimulationPlayerField(args.playerAField);
  const pb = cloneSimulationPlayerField(args.playerBField);
  const side = args.nextTurnOwner === "A" ? pa : pb;
  const stack = [...normalizeSpellStack(side)];
  if (stack.length === 0) {
    return {
      nextPlayerAField: pa,
      nextPlayerBField: pb,
      combatPatches: [],
      vfx: null,
    };
  }
  const anyHyugeActive = stack.some(c => isHyugesojauiAnsikActiveOnSpell(c));
  if (!anyHyugeActive) {
    return {
      nextPlayerAField: pa,
      nextPlayerBField: pb,
      combatPatches: [],
      vfx: null,
    };
  }

  const healR = applyHyugesojauiAnsikHealAttempt(side, HYUGESOJAUI_ANSIK_HEAL_PER_TRIGGER);
  Object.assign(side, { is: healR.nextField.is, m: healR.nextField.m, os: healR.nextField.os });

  const vfx: HyugesojauiAnsikTurnStartVfx | null =
    healR.perSlot.length > 0
      ? { allyPlayer: args.nextTurnOwner, perSlot: healR.perSlot }
      : null;

  return {
    nextPlayerAField: pa,
    nextPlayerBField: pb,
    combatPatches: healR.combatPatches,
    vfx,
  };
}
