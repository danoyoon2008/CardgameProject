import type { CardRow, FieldCard } from "../../../types/game";
import type { UnitCombatStatsRow } from "../../../types/gameStats";
import { parseSpellCardNumber } from "./witchTarot";

/** No.28 마법 — 빈 아군 필드에 배치 후 리와인드에서 아군 유닛 1체 부활(체력 1) */
export const GUIHWAN_SPELL_ID = "귀환" as const;
export const GUIHWAN_CARD_NUMBER = 28 as const;

/** localStorage `pp_sim_save` — 리와인드 선택 대기 */
export type GuihwanPendingSave = {
  ownerPlayer: "A" | "B";
  slot: "is" | "m" | "os";
  spellStatsInstanceId: string;
};

type CardRowLite = { name?: string; number?: number | string; category?: string; type?: string };

function normalizeSpellCardName(name: string | undefined): string {
  return String(name ?? "").trim();
}

export function isGuihwanSpellCard(card: FieldCard | CardRowLite | null | undefined): boolean {
  if (!card) return false;
  if (normalizeSpellCardName(card.name) === GUIHWAN_SPELL_ID) return true;
  return parseSpellCardNumber(card.number) === GUIHWAN_CARD_NUMBER;
}

export function isSimulationUnitCardRow(card: CardRow | null | undefined): boolean {
  if (!card) return false;
  if (isGuihwanSpellCard(card)) return false;
  const typeStr = String(card.type || "").toLowerCase();
  const categoryStr = String(card.category || "").toLowerCase();
  if (
    typeStr.includes("spell") ||
    typeStr.includes("스펠") ||
    typeStr.includes("마법") ||
    categoryStr.includes("spell") ||
    categoryStr.includes("스펠") ||
    categoryStr.includes("마법")
  ) {
    return false;
  }
  return true;
}

/** `summonedTurn` 끝 토큰 — "3-A" 형식의 배치 플레이어 */
export function getSummonedOwnerFromCard(card: CardRow): "A" | "B" | null {
  const st = String((card as FieldCard).summonedTurn ?? "").trim();
  if (!st) return null;
  const tail = st.split("-").pop();
  if (tail === "A" || tail === "B") return tail;
  return null;
}

export function isGuihwanRevivableAllyInRewind(
  card: CardRow,
  ownerPlayer: "A" | "B",
  unitCombatStats: Record<string, UnitCombatStatsRow>
): boolean {
  if (!isSimulationUnitCardRow(card)) return false;
  const sid = (card as FieldCard).statsInstanceId;
  if (sid && unitCombatStats[sid]?.player === ownerPlayer) return true;
  return getSummonedOwnerFromCard(card) === ownerPlayer;
}

export function getGuihwanRevivableRewindIndices(
  rewindCards: CardRow[],
  ownerPlayer: "A" | "B",
  unitCombatStats: Record<string, UnitCombatStatsRow>
): number[] {
  const out: number[] = [];
  rewindCards.forEach((c, idx) => {
    if (isGuihwanRevivableAllyInRewind(c, ownerPlayer, unitCombatStats)) out.push(idx);
  });
  return out;
}

/** 부활 시 필드 카드 — 체력 1, 전투 상태 초기화(스펠 전용 필드 플래그 제거) */
export function buildGuihwanRevivedFieldCard(
  deadCard: CardRow,
  turnCount: number,
  currentTurn: "A" | "B"
): FieldCard {
  const base = { ...deadCard } as FieldCard;
  const statsInstanceId =
    base.statsInstanceId && String(base.statsInstanceId).length > 0
      ? base.statsInstanceId
      : undefined;

  const revived: FieldCard = {
    ...base,
    statsInstanceId,
    currentHp: 1,
    hasAttacked: false,
    hasBeenAttackedThisTurn: false,
    summonedTurn: `${turnCount}-${currentTurn}`,
    hpBarrierAbsorptionRemaining: undefined,
    stunEndTurnTicksRemaining: undefined,
    eondeokSilenceEndTurnTicksRemaining: undefined,
    baekseuInvulnerableEndTurnTicksRemaining: undefined,
    baekseuLastStandUsed: undefined,
    iversonSummonWaitEndTurnTicksRemaining: undefined,
    hasPakiAttackHalveDebuff: undefined,
    legendarySwordArmingEndTurnTicksRemaining: undefined,
    legendarySwordArmed: undefined,
    legendarySwordChargeFastBlink: undefined,
    bangEomakDefenseEndTurnTicksRemaining: undefined,
    cheolbyeokAllyInvulnEndTurnTicksRemaining: undefined,
    hyugesojauiAnsikEndTurnTicksRemaining: undefined,
    hyugesojauiAnsikTurnHealsRemaining: undefined,
    isSkillActive: false,
    linkedTarget: null,
    linkedSource: null,
    hasBanjitgori: undefined,
    hasLimeBubbleShieldBuff: undefined,
    hasConcentratedFire: undefined,
  };

  if (revived.name === "다크나이트") {
    revived.darkKnightSoulGauge = 0;
  }
  if (revived.name === "맥셀렌드") {
    revived.maxellandTenacityGauge = 0;
  }

  return revived;
}

export function patchGuihwanPendingOnState<T extends { guihwanPending: GuihwanPendingSave | null }>(
  snap: T,
  patch: GuihwanPendingSave | null
): T {
  return { ...snap, guihwanPending: patch };
}

export function parseGuihwanPendingSave(raw: unknown): GuihwanPendingSave | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const slot =
    o.slot === "is" || o.slot === "m" || o.slot === "os" ? o.slot : null;
  const spellStatsInstanceId = String(o.spellStatsInstanceId ?? "").trim();
  if (!slot || !spellStatsInstanceId) return null;
  return {
    ownerPlayer: o.ownerPlayer === "B" ? "B" : "A",
    slot,
    spellStatsInstanceId,
  };
}

export function reconcileGuihwanPendingFromSnapshot<
  T extends {
    guihwanPending: GuihwanPendingSave | null;
    playerA: { field: { is: FieldCard | null; m: FieldCard | null; os: FieldCard | null } };
    playerB: { field: { is: FieldCard | null; m: FieldCard | null; os: FieldCard | null } };
  },
>(snap: T): T {
  const p = snap.guihwanPending;
  if (!p) return snap;
  const field = p.ownerPlayer === "A" ? snap.playerA.field : snap.playerB.field;
  const at = field[p.slot];
  if (!at || !isGuihwanSpellCard(at) || at.statsInstanceId !== p.spellStatsInstanceId) {
    return patchGuihwanPendingOnState(snap, null);
  }
  return snap;
}
