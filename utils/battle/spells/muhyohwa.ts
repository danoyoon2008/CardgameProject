import type { CardRow, FieldCard } from "../../../types/game";
import { isActiveNonHiddenSpellCard, isHiddenSpellCard } from "./spellVisibility";

/** No.14 마법 — 상대 턴·상대 액티브 스펠 발동 연출 중 손패에서 반격 */
export const MUHYOHWA_SPELL_ID = "무효화" as const;
export const MUHYOHWA_SPELL_NUMBER = 14;

function parseMuhyohwaSpellNumber(value: number | string | undefined): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const match = String(value).match(/(\d+)/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

export function isMuhyohwaSpellCard(
  card: FieldCard | CardRow | null | undefined
): boolean {
  if (!card) return false;
  if (card.name === MUHYOHWA_SPELL_ID) return true;
  return parseMuhyohwaSpellNumber((card as FieldCard).number) === MUHYOHWA_SPELL_NUMBER;
}

/** 대상 스펠 배치 토큰 기준 무효화 비용 — min(4, cost+1), 최대 4 */
export function muhyohwaCounterTokenCost(targetSpellPlacementCost: number): number {
  const base = Math.max(0, Math.floor(targetSpellPlacementCost));
  return Math.min(4, base + 1);
}

/** 손패 스펠 사용 시 지불한 배치 토큰(히든 0) */
export function spellHandPlacementTokenCost(spell: CardRow): number {
  return isHiddenSpellCard(spell) ? 0 : Number(spell.cost) || 0;
}

export function getMuhyohwaCounterCostForSpell(spell: CardRow): number {
  return muhyohwaCounterTokenCost(spellHandPlacementTokenCost(spell));
}

/** 히든을 제외한 액티브 스펠만 무효화 대상 */
export function canMuhyohwaCounterTargetSpell(spell: CardRow | null | undefined): boolean {
  return isActiveNonHiddenSpellCard(spell);
}

export function findCounterableMuhyohwaInHand(
  hand: CardRow[],
  counterCost: number,
  availableTokens: number
): { handIndex: number; nullifyCard: CardRow } | null {
  if (availableTokens < counterCost) return null;
  for (let i = 0; i < hand.length; i++) {
    const c = hand[i];
    if (!c || !isMuhyohwaSpellCard(c)) continue;
    return { handIndex: i, nullifyCard: c };
  }
  return null;
}

export type MuhyohwaCounterSnap = {
  spellUsagePending?: {
    phase: string;
    casterPlayer: "A" | "B";
    previewCard: CardRow;
  } | null;
  playerA: { hand: CardRow[]; tokens: number };
  playerB: { hand: CardRow[]; tokens: number };
};

/** 특정 손패 슬롯의 무효화를 상대 발동 연출 중 드래그할 수 있는지 */
export function canMuhyohwaCounterFromHandSlot(
  snap: MuhyohwaCounterSnap,
  counterPlayer: "A" | "B",
  handIndex: number,
  card: CardRow | null | undefined
): boolean {
  if (!card || !isMuhyohwaSpellCard(card)) return false;
  const pending = snap.spellUsagePending;
  if (!pending || pending.phase !== "centerReveal") return false;
  if (pending.casterPlayer === counterPlayer) return false;
  if (!canMuhyohwaCounterTargetSpell(pending.previewCard)) return false;
  const tokens = counterPlayer === "A" ? snap.playerA.tokens : snap.playerB.tokens;
  const cost = getMuhyohwaCounterCostForSpell(pending.previewCard);
  if (tokens < cost) return false;
  const hand = counterPlayer === "A" ? snap.playerA.hand : snap.playerB.hand;
  const at = hand[handIndex];
  return !!at && isMuhyohwaSpellCard(at);
}

export type MuhyohwaCounterOpportunity = {
  counterPlayer: "A" | "B";
  tokenCost: number;
  handIndex: number;
};

export function resolveMuhyohwaCounterOpportunity(
  snap: {
    playerA: { hand: CardRow[]; tokens: number };
    playerB: { hand: CardRow[]; tokens: number };
  },
  casterPlayer: "A" | "B",
  previewCard: CardRow
): MuhyohwaCounterOpportunity | null {
  if (!canMuhyohwaCounterTargetSpell(previewCard)) return null;
  const counterPlayer = casterPlayer === "A" ? "B" : "A";
  const counterHand = counterPlayer === "A" ? snap.playerA.hand : snap.playerB.hand;
  const tokens = counterPlayer === "A" ? snap.playerA.tokens : snap.playerB.tokens;
  const cost = getMuhyohwaCounterCostForSpell(previewCard);
  const match = findCounterableMuhyohwaInHand(counterHand, cost, tokens);
  if (!match) return null;
  return { counterPlayer, tokenCost: cost, handIndex: match.handIndex };
}
