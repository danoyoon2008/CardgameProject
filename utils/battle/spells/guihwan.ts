import type { CardRow, FieldCard } from "../../../types/game";
import type { UnitCombatStatsRow } from "../../../types/gameStats";
import { IVERSON_SUMMON_WAIT_END_TURNS } from "../units/iverson";
import { initializeLegendarySwordFieldCard } from "../units/legendarySword";
import { DARK_KNIGHT_ID } from "../units/darkKnight";
import { MAXELLAND_ID } from "../units/maxelland";
import { EL_WING_ID } from "../units/elWing";
import { UNIT } from "../unitIds";
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

/**
 * 시뮬레이션 필드 유닛 런타임 — 부활 시 카드 원본(도감/리와인드 스냅)에서 제거.
 * 버프·디버프·상태·쿨타임·일회성 소진·게이지 등 전부 해당.
 */
const SIMULATION_UNIT_FIELD_RUNTIME_KEYS = [
  "statsInstanceId",
  "currentHp",
  "hasAttacked",
  "hasBeenAttackedThisTurn",
  "summonedTurn",
  "skillLastUsedGlobalTurn",
  "isSkillActive",
  "linkedTarget",
  "linkedSource",
  "hasBanjitgori",
  "hasLimeBubbleShieldBuff",
  "hasConcentratedFire",
  "darkKnightSoulGauge",
  "maxellandTenacityGauge",
  "elWingSinseokGauge",
  "hasPakiAttackHalveDebuff",
  "stunEndTurnTicksRemaining",
  "iversonSummonWaitEndTurnTicksRemaining",
  "danhaMagicHookConsumed",
  "superGreenKingSpellBreakerConsumed",
  "gonchungHiddenPeekConsumed",
  "gonchungRevealedThisTurn",
  "suppressionEndTurnTicksRemaining",
  "eondeokSilenceEndTurnTicksRemaining",
  "bangEomakDefenseEndTurnTicksRemaining",
  "cheolbyeokAllyInvulnEndTurnTicksRemaining",
  "hyugesojauiAnsikEndTurnTicksRemaining",
  "hyugesojauiAnsikTurnHealsRemaining",
  "hpBarrierAbsorptionRemaining",
  "hpSurvivalOnesMarker",
  "baekseuLastStandUsed",
  "baekseuInvulnerableEndTurnTicksRemaining",
  "legendarySwordArmingEndTurnTicksRemaining",
  "legendarySwordArmed",
  "legendarySwordChargeFastBlink",
] as const;

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

/** 리와인드/사망 스냅샷에서 필드 런타임 전부 제거 — 도감 카드 행만 남김 */
export function stripSimulationUnitFieldRuntime(card: CardRow): CardRow {
  const next = { ...card } as Record<string, unknown>;
  for (const k of SIMULATION_UNIT_FIELD_RUNTIME_KEYS) {
    delete next[k];
  }
  return next as CardRow;
}

/** 유닛별 소환·부활 공통 초기 게이지·일회성 액티브(필드 배치와 동일 규칙) */
function applyUnitFreshPlacementFields(card: FieldCard): FieldCard {
  let next = card;
  if (card.name === DARK_KNIGHT_ID) {
    next = { ...next, darkKnightSoulGauge: 0 };
  }
  if (card.name === MAXELLAND_ID) {
    next = { ...next, maxellandTenacityGauge: 0 };
  }
  if (card.name === EL_WING_ID) {
    next = { ...next, elWingSinseokGauge: 0 };
  }
  if (card.name === UNIT.IVERSON) {
    next = { ...next, iversonSummonWaitEndTurnTicksRemaining: IVERSON_SUMMON_WAIT_END_TURNS };
  }
  if (card.name === UNIT.LEGENDARY_SWORD) {
    next = initializeLegendarySwordFieldCard(next);
  }
  return next;
}

/**
 * 귀환 부활 필드 카드.
 * 1) 버프·디버프·상태 이상·링크 해제
 * 2) 고유 게이지·스택 초기화
 * 3–4) 일회성 액티브·패시브 소진 플래그 제거
 * 5) `skillLastUsedGlobalTurn` 제거 — 다회 액티브 쿨타임 초기화
 */
export function buildGuihwanRevivedFieldCard(
  deadCard: CardRow,
  turnCount: number,
  currentTurn: "A" | "B"
): FieldCard {
  const base = stripSimulationUnitFieldRuntime(deadCard) as FieldCard;

  const revived: FieldCard = applyUnitFreshPlacementFields({
    ...base,
    currentHp: 1,
    hpSurvivalOnesMarker: true,
    hasAttacked: false,
    hasBeenAttackedThisTurn: false,
    summonedTurn: `${turnCount}-${currentTurn}`,
    isSkillActive: false,
    linkedTarget: null,
    linkedSource: null,
  });

  return revived;
}

/** 부활 완료 후 귀환 스펠을 리와인드 존에 넣을 때 — 필드 런타임 필드 제거 */
export function stripGuihwanSpellForRewind(spell: FieldCard): FieldCard {
  const {
    statsInstanceId: _sid,
    currentHp: _hp,
    hasAttacked: _ha,
    hasBeenAttackedThisTurn: _hb,
    summonedTurn: _st,
    hpSurvivalOnesMarker: _m,
    ...rest
  } = spell;
  return rest as FieldCard;
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
