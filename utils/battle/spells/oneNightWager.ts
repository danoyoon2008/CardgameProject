import type { CardRow, FieldCard, SimulationPlayerField } from "../../../types/game";
import { normalizeSpellStack, type FieldSliceWithSpell } from "../fieldSpellAccess";
import { areHiddenSpellsOnFieldSuppressedByRyeomhwa } from "../units/ryeomhwa";
import { removeSpellFromStackAtIndex } from "./superTesla";

/** No.34 히든 마법 — 필드 6칸이 모두 찰 때 자동 발동, 코스트 합 비교 */
export const ONE_NIGHT_WAGER_SPELL_ID = "한날 밤의 내기" as const;

export type UnitSlotCosts = {
  is: number;
  m: number;
  os: number;
  total: number;
};

export type OneNightWagerStackMatch = {
  ownerPlayer: "A" | "B";
  wagerCard: FieldCard;
  stackIndex: number;
};

/** localStorage `pp_sim_save` — 발동 연출(팝업·토큰 정산) 중 로비/새로고침 후 재개 */
export type OneNightWagerPendingMatchSave = {
  ownerPlayer: "A" | "B";
  activationCost: number;
};

export type OneNightWagerPendingSave = {
  /** `popup`: 비교 모달 표시 중 · `settlement`: 모달 종료 후 스택 제거·토큰 정산 대기 */
  phase: "popup" | "settlement";
  costsA: UnitSlotCosts;
  costsB: UnitSlotCosts;
  glowPlayer: "A" | "B" | null;
  loserPlayer: "A" | "B" | null;
  matches: OneNightWagerPendingMatchSave[];
};

export function oneNightWagerPendingMatchesFromStack(
  matches: OneNightWagerStackMatch[]
): OneNightWagerPendingMatchSave[] {
  return matches.map(m => ({
    ownerPlayer: m.ownerPlayer,
    activationCost: oneNightWagerActivationTokenCost(m.wagerCard),
  }));
}

function fieldHasOneNightWagerInStack(field: FieldSliceWithSpell): boolean {
  return normalizeSpellStack(field).some(c => isOneNightWagerSpellCard(c));
}

export function oneNightWagerStackMatchesFromPendingSave(
  pending: OneNightWagerPendingSave,
  playerAField: FieldSliceWithSpell,
  playerBField: FieldSliceWithSpell
): OneNightWagerStackMatch[] {
  const out: OneNightWagerStackMatch[] = [];
  for (const m of pending.matches) {
    const field = m.ownerPlayer === "A" ? playerAField : playerBField;
    const stack = normalizeSpellStack(field);
    let found: OneNightWagerStackMatch | null = null;
    for (let i = stack.length - 1; i >= 0; i--) {
      const c = stack[i]!;
      if (!isOneNightWagerSpellCard(c)) continue;
      found = { ownerPlayer: m.ownerPlayer, wagerCard: c, stackIndex: i };
      break;
    }
    if (!found) {
      found = {
        ownerPlayer: m.ownerPlayer,
        wagerCard: {
          name: ONE_NIGHT_WAGER_SPELL_ID,
          cost: m.activationCost,
          hp: 0,
          currentHp: 0,
          atk: "0",
        } as FieldCard,
        stackIndex: -1,
      };
    }
    out.push(found);
  }
  return out;
}

type OneNightWagerReconcileSnapshot = {
  oneNightWagerPending: OneNightWagerPendingSave | null;
  playerA: { field: SimulationPlayerField };
  playerB: { field: SimulationPlayerField };
};

export function reconcileOneNightWagerPendingFromSnapshot<T extends OneNightWagerReconcileSnapshot>(
  snap: T
): T {
  const p = snap.oneNightWagerPending;
  if (!p) return snap;
  if (!p.matches.length) {
    return { ...snap, oneNightWagerPending: null };
  }
  if (!areAllUnitSlotsFilledOnBothFields(snap.playerA.field, snap.playerB.field)) {
    return { ...snap, oneNightWagerPending: null };
  }
  if (p.phase === "popup") {
    const hasWager =
      fieldHasOneNightWagerInStack(snap.playerA.field) ||
      fieldHasOneNightWagerInStack(snap.playerB.field);
    if (!hasWager) {
      return { ...snap, oneNightWagerPending: { ...p, phase: "settlement" } };
    }
  }
  return snap;
}

export function isOneNightWagerSpellCard(c: CardRow | null | undefined): boolean {
  return !!c && c.name === ONE_NIGHT_WAGER_SPELL_ID;
}

export function oneNightWagerActivationTokenCost(c: CardRow | null | undefined): number {
  if (!c) return 0;
  return Number(c.cost) || 0;
}

export function areAllUnitSlotsFilledOnBothFields(
  fieldA: SimulationPlayerField,
  fieldB: SimulationPlayerField
): boolean {
  for (const f of [fieldA, fieldB]) {
    for (const slot of ["is", "m", "os"] as const) {
      const u = f[slot];
      if (!u || (u.currentHp ?? 0) <= 0) return false;
    }
  }
  return true;
}

export function getPlayerUnitSlotCosts(field: SimulationPlayerField): UnitSlotCosts {
  const read = (u: FieldCard | null) => (u && (u.currentHp ?? 0) > 0 ? Number(u.cost) || 0 : 0);
  const is = read(field.is);
  const m = read(field.m);
  const os = read(field.os);
  return { is, m, os, total: is + m + os };
}

/** 코스트 합이 더 낮은 쪽이 패배(동점이면 패배자 없음) */
export function resolveOneNightWagerLoser(sumA: number, sumB: number): "A" | "B" | null {
  if (sumA < sumB) return "A";
  if (sumB < sumA) return "B";
  return null;
}

/** 코스트 합이 더 높은 쪽(동점이면 null) — 팝업 하이라이트용 */
export function resolveOneNightWagerHigherSumPlayer(sumA: number, sumB: number): "A" | "B" | null {
  if (sumA > sumB) return "A";
  if (sumB > sumA) return "B";
  return null;
}

/** 토큰 정산: 시전자(스택 보유)는 발동비만, 코스트 합 패배(더 낮은 쪽)만 전량 상실 */
export function applyOneNightWagerTokenSettlement(args: {
  playerA: { tokens: number };
  playerB: { tokens: number };
  matches: OneNightWagerStackMatch[];
  costsA: UnitSlotCosts;
  costsB: UnitSlotCosts;
}): { playerA: { tokens: number }; playerB: { tokens: number } } {
  const winner = resolveOneNightWagerHigherSumPlayer(args.costsA.total, args.costsB.total);
  const loser = resolveOneNightWagerLoser(args.costsA.total, args.costsB.total);

  let tokensA = args.playerA.tokens;
  let tokensB = args.playerB.tokens;

  for (const m of args.matches) {
    const cost = oneNightWagerActivationTokenCost(m.wagerCard);
    if (m.ownerPlayer === "A") tokensA = Math.max(0, tokensA - cost);
    else tokensB = Math.max(0, tokensB - cost);
  }

  if (loser && loser !== winner) {
    if (loser === "A") tokensA = 0;
    else tokensB = 0;
  }

  return { playerA: { tokens: tokensA }, playerB: { tokens: tokensB } };
}

function findWagerInStack(
  ownerPlayer: "A" | "B",
  field: FieldSliceWithSpell,
  tokensAvailable: number,
  fieldA: SimulationPlayerField,
  fieldB: SimulationPlayerField
): OneNightWagerStackMatch | null {
  if (areHiddenSpellsOnFieldSuppressedByRyeomhwa(ownerPlayer, fieldA, fieldB)) return null;
  const stack = normalizeSpellStack(field);
  for (let i = stack.length - 1; i >= 0; i--) {
    const c = stack[i]!;
    if (!isOneNightWagerSpellCard(c)) continue;
    const cost = oneNightWagerActivationTokenCost(c);
    if (tokensAvailable >= cost) {
      return { ownerPlayer, wagerCard: c, stackIndex: i };
    }
  }
  return null;
}

/** 양측 스택에서 발동 가능한 내기(위쪽 우선, A→B 순) */
export function findActivatableOneNightWagers(args: {
  playerA: { tokens: number; field: FieldSliceWithSpell };
  playerB: { tokens: number; field: FieldSliceWithSpell };
  playerAField: SimulationPlayerField;
  playerBField: SimulationPlayerField;
}): OneNightWagerStackMatch[] {
  const { playerA, playerB, playerAField, playerBField } = args;
  const out: OneNightWagerStackMatch[] = [];
  const a = findWagerInStack("A", playerA.field, playerA.tokens, playerAField, playerBField);
  const b = findWagerInStack("B", playerB.field, playerB.tokens, playerAField, playerBField);
  if (a) out.push(a);
  if (b) out.push(b);
  return out;
}

/** 스택에서 모든 「한날 밤의 내기」 제거 */
export function removeAllOneNightWagersFromSpellStack(stack: FieldCard[]): FieldCard[] {
  return stack.filter(c => !isOneNightWagerSpellCard(c));
}

export { removeSpellFromStackAtIndex };
