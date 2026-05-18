/**
 * 스펠 No.26 휴게소의 안식 — 자기 스펠 칸 배치.
 * 사용 시 아군 전원 500 회복, 이후 본인 턴이 돌아올 때마다 500 회복을 2회 더(총 3회) 후 리와인드.
 */
import type { FieldCard, SimulationPlayerField } from "../../../types/game";
import { normalizeSpellStack } from "../fieldSpellAccess";

export const HYUGESOJAUI_ANSIK_SPELL_ID = "휴게소의 안식" as const;

export const HYUGESOJAUI_ANSIK_HEAL_PER_TRIGGER = 500;

/** 배치 직후 남는 '내 턴 시작 시' 추가 회복 횟수(총 3회 회복 후 리와인드) */
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

function cloneSimulationPlayerField(field: SimulationPlayerField): SimulationPlayerField {
  return {
    is: field.is ? { ...field.is } : null,
    m: field.m ? { ...field.m } : null,
    os: field.os ? { ...field.os } : null,
    spellStack: [...normalizeSpellStack(field)],
  };
}

/**
 * 아군 is/m/os 각각에 최대 `amount` 회복(최대 체력 상한).
 * `field`는 복제본이어야 함(원본 변이 금지).
 */
export function applyHyugesojauiAnsikHealAlliesOnce(
  field: SimulationPlayerField,
  amount: number
): {
  nextField: SimulationPlayerField;
  combatPatches: HyugesojauiAnsikCombatPatch[];
  slotHeals: Array<{ slot: "is" | "m" | "os"; healed: number }>;
} {
  const f = cloneSimulationPlayerField(field);
  const combatPatches: HyugesojauiAnsikCombatPatch[] = [];
  const slotHeals: Array<{ slot: "is" | "m" | "os"; healed: number }> = [];

  for (const slot of ["is", "m", "os"] as const) {
    const u = f[slot];
    if (!u || (u.currentHp ?? 0) <= 0) continue;
    const headroom = Math.max(0, Number(u.hp) - u.currentHp);
    const healed = Math.min(amount, headroom);
    if (healed <= 0) continue;
    f[slot] = { ...u, currentHp: u.currentHp + healed };
    slotHeals.push({ slot, healed });
    if (u.statsInstanceId) {
      combatPatches.push({ id: u.statsInstanceId, delta: { selfHeal: healed } });
    }
  }

  return { nextField: f, combatPatches, slotHeals };
}

export type HyugesojauiAnsikTurnStartVfx = {
  allyPlayer: "A" | "B";
  slotHeals: Array<{ slot: "is" | "m" | "os"; healed: number }>;
};

/**
 * `player`의 턴이 막 시작될 때(상대가 턴 종료한 직후) 호출.
 * 맨 위 스펠이 휴게소의 안식이면 아군 500 회복, 남은 횟수 감소, 0이면 스택에서 제거해 리와인드 카드로 반환.
 */
export function applyHyugesojauiAnsikTurnStartForOwner(args: {
  nextTurnOwner: "A" | "B";
  playerAField: SimulationPlayerField;
  playerBField: SimulationPlayerField;
}): {
  nextPlayerAField: SimulationPlayerField;
  nextPlayerBField: SimulationPlayerField;
  rewindSpell: FieldCard | null;
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
      rewindSpell: null,
      combatPatches: [],
      vfx: null,
    };
  }
  const top = stack[stack.length - 1]!;
  if (!isHyugesojauiAnsikSpellCard(top)) {
    return {
      nextPlayerAField: pa,
      nextPlayerBField: pb,
      rewindSpell: null,
      combatPatches: [],
      vfx: null,
    };
  }
  const rem = top.hyugesojauiAnsikTurnHealsRemaining ?? 0;
  if (rem <= 0) {
    return {
      nextPlayerAField: pa,
      nextPlayerBField: pb,
      rewindSpell: null,
      combatPatches: [],
      vfx: null,
    };
  }

  const healR = applyHyugesojauiAnsikHealAlliesOnce(side, HYUGESOJAUI_ANSIK_HEAL_PER_TRIGGER);
  Object.assign(side, { is: healR.nextField.is, m: healR.nextField.m, os: healR.nextField.os });

  const nextRem = rem - 1;
  let rewindSpell: FieldCard | null = null;
  if (nextRem <= 0) {
    stack.pop();
    const { hyugesojauiAnsikTurnHealsRemaining: _h, ...rest } = top;
    rewindSpell = rest as FieldCard;
  } else {
    stack[stack.length - 1] = { ...top, hyugesojauiAnsikTurnHealsRemaining: nextRem };
  }
  side.spellStack = stack;

  const vfx: HyugesojauiAnsikTurnStartVfx = {
    allyPlayer: args.nextTurnOwner,
    slotHeals: healR.slotHeals,
  };

  return {
    nextPlayerAField: pa,
    nextPlayerBField: pb,
    rewindSpell,
    combatPatches: healR.combatPatches,
    vfx,
  };
}
