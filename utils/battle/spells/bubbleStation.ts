import type { CardRow, FieldCard } from "../../../types/game";
import { normalizeSpellStack, type FieldSliceWithSpell } from "../fieldSpellAccess";
import { appendSpellToStack } from "../spellStack";
import { removeSpellFromStackAtIndex } from "./superTesla";
import { isSimulationUnitCardRow } from "./guihwan";
import { parseSpellCardNumber } from "./witchTarot";
import type { SimpanPeekKind, SimpanPeekQueueEntry } from "./befpkkiri";

/** No.56 마법 — 양측 패 모두 버림 후 유닛 타입 선택, 시전자부터 번갈아 재드로우(잔여 일괄), 선택 타입 매칭 시 시전자 +1 토큰 */
export const BUBBLE_STATION_SPELL_ID = "보글보글 스테이션" as const;
export const BUBBLE_STATION_CARD_NUMBER = 56 as const;

/** 유닛 타입 선택 팝업 — 신속(엘 윙)과 동일한 5초 카운트다운 게이지 */
export const BUBBLE_STATION_TYPE_SELECT_MS = 5000;
/** 선택 확정 직후 선택 버튼이 1.5초간 깜빡이는 강조 연출 */
export const BUBBLE_STATION_SELECTION_FLASH_MS = 1500;
/** 발동 직후 양측 패가 흰색으로 번쩍이며 사라지는 wipe 연출 시간 */
export const BUBBLE_STATION_DISCARD_WIPE_MS = 700;

/** 손패 카드에 부착되는 임시 메타 — 흰색 wipe 연출용 marker */
const PP_SIM_HAND_BUBBLE_STATION_DISCARD = "__ppBubbleStationDiscardFlash" as const;

export function markBubbleStationHandDiscardFlash(card: CardRow): CardRow {
  return { ...card, [PP_SIM_HAND_BUBBLE_STATION_DISCARD]: true };
}

export function stripBubbleStationHandDiscardFlash(card: CardRow): CardRow {
  const raw = card as CardRow & Record<string, unknown>;
  if (raw[PP_SIM_HAND_BUBBLE_STATION_DISCARD] !== true) return card;
  const next = { ...raw };
  delete next[PP_SIM_HAND_BUBBLE_STATION_DISCARD];
  return next as CardRow;
}

export function hasBubbleStationHandDiscardFlashMark(card: CardRow): boolean {
  const v = (card as CardRow & Record<string, unknown>)[PP_SIM_HAND_BUBBLE_STATION_DISCARD];
  return v === true;
}

export type BubbleStationUnitTypeId =
  | "attack"
  | "defense"
  | "support"
  | "speed"
  | "explosive"
  | "shooting"
  | "balance";

/** 팝업에 표시되는 7종 버튼 순서·라벨 — 시전자가 선택할 유닛 타입 */
export const BUBBLE_STATION_UNIT_TYPES: ReadonlyArray<{
  id: BubbleStationUnitTypeId;
  label: string;
}> = [
  { id: "attack", label: "공격형" },
  { id: "defense", label: "방어형" },
  { id: "support", label: "지원형" },
  { id: "speed", label: "스피드형" },
  { id: "explosive", label: "폭발형" },
  { id: "shooting", label: "사격형" },
  { id: "balance", label: "밸런스형" },
];

/** localStorage `pp_sim_save` — 새로고침/재접속 후에도 진행 상태 보존 */
export type BubbleStationPendingSave = {
  /** discardWipe: 양측 패 흰색 번쩍 wipe / typeSelect: 유닛 타입 선택 5초 대기 / selectionFlash: 선택 확정 1.5초 깜빡임 / drawing: 카드 합류 시퀀스 진행 */
  phase: "discardWipe" | "typeSelect" | "selectionFlash" | "drawing";
  casterPlayer: "A" | "B";
  /** 스펠 카드를 스택에서 찾기 위한 인스턴스 ID */
  spellStatsInstanceId: string;
  /** 시전 직전 시전자 패 장 수(= 시전자가 재드로우할 카드 수) */
  totalDrawsA: number;
  totalDrawsB: number;
  /** 시전자부터 번갈아, 한쪽 소진 후 잔여 몰아치기 — commit 시점에 한 번 빌드 */
  drawOrder: ("A" | "B")[];
  /** drawing 단계에서 실제 덱에서 뽑아 큐에 enqueue된 카드 수(덱 부족 시 drawOrder보다 짧을 수 있음) */
  enqueuedDrawCount: number;
  /** drawing 단계에서 패에 합류 완료된 카드 수(시퀀스 진행도·종료 판정) */
  arrivedDrawCount: number;
  /** typeSelect 종료 시점에 확정 — 토큰 매칭 기준 */
  selectedUnitType: BubbleStationUnitTypeId | null;
  /** discardWipe 종료 시각(ms epoch) — 재접속 시 남은 시간 계산 */
  discardWipeEndAt?: number;
  /** typeSelect 5초 카운트다운 종료 시각(ms epoch) — 재접속 시 남은 시간 계산 */
  typeSelectDeadlineAt?: number;
  /** selectionFlash 1.5초 종료 시각(ms epoch) */
  selectionFlashEndAt?: number;
};

type SimpanHandChoiceEntry = { player: "A" | "B"; pendingCard: CardRow };

type PlayerSlice = {
  hand: CardRow[];
  tokens: number;
  field: FieldSliceWithSpell;
};

type BubbleStationCommitSlice = {
  deckCards: CardRow[];
  rewindCards: CardRow[];
  deckCardsA?: CardRow[];
  deckCardsB?: CardRow[];
  gameMode?: "classic" | "normal";
  playerA: PlayerSlice;
  playerB: PlayerSlice;
  bubbleStationPending: BubbleStationPendingSave | null;
  simpanPeekReveal: {
    player: "A" | "B";
    pendingCard: CardRow;
    peekKind?: SimpanPeekKind;
  } | null;
  simpanPeekQueue?: SimpanPeekQueueEntry[];
  simpanPeekTick?: number;
  simpanHandChoice: SimpanHandChoiceEntry | null;
  simpanHandChoiceQueue?: SimpanHandChoiceEntry[];
};

/** 카드 이름 또는 DB 번호로 보글보글 스테이션 식별 */
export function isBubbleStationSpellCard(
  card: FieldCard | CardRow | null | undefined
): boolean {
  if (!card) return false;
  if (String(card.name ?? "").trim() === BUBBLE_STATION_SPELL_ID) return true;
  return parseSpellCardNumber(card.number) === BUBBLE_STATION_CARD_NUMBER;
}

const UNIT_TYPE_MATCH_KEYWORDS: Record<BubbleStationUnitTypeId, string[]> = {
  attack: ["공격형", "attack"],
  defense: ["방어형", "defense"],
  support: ["지원형", "support"],
  speed: ["스피드형", "speed"],
  explosive: ["폭발형", "explosive"],
  shooting: ["사격형", "shoot"],
  balance: ["밸런스형", "balance"],
};

/** 드로우 카드가 시전자가 선택한 유닛 타입과 일치하는지(스펠 카드는 항상 false) */
export function cardMatchesBubbleStationUnitType(
  card: CardRow | null | undefined,
  typeId: BubbleStationUnitTypeId
): boolean {
  if (!card || !isSimulationUnitCardRow(card)) return false;
  const t = String(card.type ?? "").toLowerCase();
  if (!t) return false;
  return UNIT_TYPE_MATCH_KEYWORDS[typeId].some(k => t.includes(k.toLowerCase()));
}

/**
 * 시전자부터 번갈아 1장씩, 한쪽이 소진되면 남은 쪽이 잔여를 연속으로.
 * 예: caster=A, drawsA=4, drawsB=6 → ["A","B","A","B","A","B","A","B","B","B"]
 */
export function buildBubbleStationDrawOrder(
  caster: "A" | "B",
  drawsA: number,
  drawsB: number
): ("A" | "B")[] {
  const order: ("A" | "B")[] = [];
  let remA = Math.max(0, Math.floor(drawsA));
  let remB = Math.max(0, Math.floor(drawsB));
  let next: "A" | "B" = caster;
  while (remA > 0 || remB > 0) {
    if (next === "A") {
      if (remA > 0) {
        order.push("A");
        remA -= 1;
        next = remB > 0 ? "B" : "A";
      } else {
        order.push("B");
        remB -= 1;
      }
    } else {
      if (remB > 0) {
        order.push("B");
        remB -= 1;
        next = remA > 0 ? "A" : "B";
      } else {
        order.push("A");
        remA -= 1;
      }
    }
  }
  return order;
}

function findBubbleStationStackIndex(
  field: FieldSliceWithSpell,
  spellStatsInstanceId: string
): number {
  if (!spellStatsInstanceId) return -1;
  const stack = normalizeSpellStack(field);
  return stack.findIndex(c => c.statsInstanceId === spellStatsInstanceId);
}

/**
 * 스펠 사용 시점 1회 commit — 양측 패에 흰색 wipe marker 부착, 스택에 스펠 push, pending=discardWipe 시작.
 * 카드 자체는 아직 패에 남아있음(흰색 번쩍 연출 동안 visible). discardWipe 종료 시 실제 리와인드 처리.
 * Strict Mode 등에서 동일 statsInstanceId로 재호출되면 no-op.
 */
export function applyBubbleStationInitialCommit<T extends BubbleStationCommitSlice>(
  prev: T,
  casterPlayer: "A" | "B",
  fieldCard: FieldCard
): T {
  if (
    prev.bubbleStationPending != null &&
    prev.bubbleStationPending.spellStatsInstanceId === fieldCard.statsInstanceId
  ) {
    return prev;
  }
  if (!fieldCard.statsInstanceId) return prev;

  const handA = prev.playerA.hand.map(c => markBubbleStationHandDiscardFlash(c));
  const handB = prev.playerB.hand.map(c => markBubbleStationHandDiscardFlash(c));
  const totalDrawsA = handA.length;
  const totalDrawsB = handB.length;
  const isA = casterPlayer === "A";

  const ownerField = isA ? prev.playerA.field : prev.playerB.field;
  const stackBefore = normalizeSpellStack(ownerField);
  const updatedField: FieldSliceWithSpell = {
    ...ownerField,
    spellStack: appendSpellToStack(stackBefore, fieldCard),
  };

  const drawOrder = buildBubbleStationDrawOrder(casterPlayer, totalDrawsA, totalDrawsB);

  const pending: BubbleStationPendingSave = {
    phase: "discardWipe",
    casterPlayer,
    spellStatsInstanceId: fieldCard.statsInstanceId,
    totalDrawsA,
    totalDrawsB,
    drawOrder,
    enqueuedDrawCount: 0,
    arrivedDrawCount: 0,
    selectedUnitType: null,
    discardWipeEndAt: Date.now() + BUBBLE_STATION_DISCARD_WIPE_MS,
  };

  return {
    ...prev,
    playerA: isA
      ? { ...prev.playerA, hand: handA, field: updatedField }
      : { ...prev.playerA, hand: handA },
    playerB: !isA
      ? { ...prev.playerB, hand: handB, field: updatedField }
      : { ...prev.playerB, hand: handB },
    bubbleStationPending: pending,
  } as T;
}

/**
 * discardWipe 종료 시 1회 호출 — 양측 패 카드(marker 부착됨)를 리와인드로 보내고 typeSelect 단계 시작.
 * Strict Mode 등에서 phase !== "discardWipe"이면 no-op.
 */
export function applyBubbleStationDiscardWipeEnd<T extends BubbleStationCommitSlice>(
  prev: T
): T {
  const p = prev.bubbleStationPending;
  if (!p || p.phase !== "discardWipe") return prev;

  const handA = prev.playerA.hand;
  const handB = prev.playerB.hand;
  const cleanA = handA.map(c => stripBubbleStationHandDiscardFlash(c));
  const cleanB = handB.map(c => stripBubbleStationHandDiscardFlash(c));

  const next: BubbleStationPendingSave = {
    ...p,
    phase: "typeSelect",
    discardWipeEndAt: undefined,
  };

  return {
    ...prev,
    rewindCards: [...prev.rewindCards, ...cleanA, ...cleanB],
    playerA: { ...prev.playerA, hand: [] },
    playerB: { ...prev.playerB, hand: [] },
    bubbleStationPending: next,
  } as T;
}

/** typeSelect 단계 — 사용자 클릭 또는 5초 자동 랜덤 선택 시 호출. selectionFlash 단계로 전이 */
export function applyBubbleStationCommitTypeSelection<T extends BubbleStationCommitSlice>(
  prev: T,
  selectedType: BubbleStationUnitTypeId
): T {
  const p = prev.bubbleStationPending;
  if (!p || p.phase !== "typeSelect") return prev;
  const next: BubbleStationPendingSave = {
    ...p,
    phase: "selectionFlash",
    selectedUnitType: selectedType,
    selectionFlashEndAt: Date.now() + BUBBLE_STATION_SELECTION_FLASH_MS,
  };
  return { ...prev, bubbleStationPending: next };
}

/** 5초 카운트다운이 시작되는 시점(spellUsage 연출 종료 후)에 deadline 설정 — 한 번만 적용됨 */
export function applyBubbleStationTypeSelectDeadline<T extends BubbleStationCommitSlice>(
  prev: T,
  deadlineAt: number
): T {
  const p = prev.bubbleStationPending;
  if (!p || p.phase !== "typeSelect") return prev;
  if (p.typeSelectDeadlineAt != null && p.typeSelectDeadlineAt > 0) return prev;
  return {
    ...prev,
    bubbleStationPending: { ...p, typeSelectDeadlineAt: deadlineAt },
  };
}

/**
 * selectionFlash 종료 시 1회 호출 — drawing 단계로 전이.
 * 베프끼리 패턴을 그대로 따라 drawOrder 만큼 덱에서 pop해 simpanPeekReveal/Queue로 분배(패 만석은 simpanHandChoice).
 * Strict Mode에서 동일 prev로 두 번 호출되어도 같은 결과(deckCards/Queue 동일)가 도출되며, 첫 결과만 최종 채택.
 */
export function applyBubbleStationFlashEnd<T extends BubbleStationCommitSlice>(
  prev: T,
  markHandGlow: (card: CardRow) => CardRow
): T {
  const pending = prev.bubbleStationPending;
  if (!pending || pending.phase !== "selectionFlash") return prev;

  const isNormal = prev.gameMode === "normal";
  const drawOrder = pending.drawOrder;
  // 일반전: 플레이어별 덱을 따로 관리 (드로우 시 자기 덱에서 pop)
  const deckA = isNormal ? [...(prev.deckCardsA ?? [])] : [];
  const deckB = isNormal ? [...(prev.deckCardsB ?? [])] : [];
  const deck = isNormal ? [] : [...prev.deckCards];

  const queueAdds: SimpanPeekQueueEntry[] = [];
  let reveal = prev.simpanPeekReveal ?? null;
  let handChoice: SimpanHandChoiceEntry | null = prev.simpanHandChoice ?? null;
  let handChoiceQueue: SimpanHandChoiceEntry[] = [...(prev.simpanHandChoiceQueue ?? [])];
  const handLens: Record<"A" | "B", number> = {
    A: prev.playerA.hand.length,
    B: prev.playerB.hand.length,
  };

  const peekStillPending = (): boolean =>
    reveal != null || queueAdds.length > 0 || (prev.simpanPeekQueue?.length ?? 0) > 0;

  let enqueued = 0;
  for (let i = 0; i < drawOrder.length; i++) {
    const player = drawOrder[i]!;
    let drawn: CardRow | undefined;
    if (isNormal) {
      const pDeck = player === "A" ? deckA : deckB;
      if (pDeck.length === 0) continue; // 해당 플레이어 덱 소진 시 스킵
      drawn = pDeck.pop()!;
    } else {
      if (deck.length === 0) break;
      drawn = deck.pop()!;
    }
    const glowed = markHandGlow(drawn);

    if (handLens[player] < 6) {
      const peekEntry: SimpanPeekQueueEntry = {
        player,
        pendingCard: glowed,
        peekKind: "bubbleStation",
      };
      if (handChoice || peekStillPending()) {
        queueAdds.push(peekEntry);
      } else {
        reveal = peekEntry;
      }
      handLens[player] += 1;
    } else {
      const entry: SimpanHandChoiceEntry = { player, pendingCard: glowed };
      if (handChoice || peekStillPending()) {
        handChoiceQueue.push(entry);
      } else {
        handChoice = entry;
      }
    }
    enqueued += 1;
  }

  const mergedQueue = [...(prev.simpanPeekQueue ?? []), ...queueAdds];
  const tickBump =
    reveal != null && reveal !== prev.simpanPeekReveal
      ? (prev.simpanPeekTick ?? 0) + 1
      : prev.simpanPeekTick ?? 0;

  const nextPending: BubbleStationPendingSave = {
    ...pending,
    phase: "drawing",
    enqueuedDrawCount: enqueued,
    arrivedDrawCount: 0,
  };

  const deckPatch = isNormal
    ? { deckCardsA: deckA, deckCardsB: deckB }
    : { deckCards: deck };

  return {
    ...prev,
    ...deckPatch,
    simpanPeekReveal: reveal,
    simpanPeekQueue: mergedQueue,
    simpanPeekTick: tickBump,
    simpanHandChoice: handChoice,
    simpanHandChoiceQueue: handChoiceQueue,
    bubbleStationPending: nextPending,
  } as T;
}

/**
 * drawing 단계에서 1장이 패에 합류한 직후 호출(completeSimpanPeekRevealToHand 안).
 * 카드가 시전자의 선택 유닛 타입과 일치하면 시전자 토큰 +1(상한 10).
 * arrivedDrawCount 진행 후 enqueuedDrawCount에 도달하면 finishBubbleStationSequence로 종료 처리.
 */
export function handleBubbleStationCardArrived<T extends BubbleStationCommitSlice>(
  prev: T,
  drawnPlayer: "A" | "B",
  drawnCard: CardRow
): T {
  const pending = prev.bubbleStationPending;
  if (!pending || pending.phase !== "drawing") return prev;
  if (pending.arrivedDrawCount >= pending.enqueuedDrawCount) return prev;

  let next: T = prev;

  if (
    drawnPlayer === pending.casterPlayer &&
    pending.selectedUnitType != null &&
    cardMatchesBubbleStationUnitType(drawnCard, pending.selectedUnitType)
  ) {
    const key = drawnPlayer === "A" ? "playerA" : "playerB";
    const ps = drawnPlayer === "A" ? next.playerA : next.playerB;
    next = {
      ...next,
      [key]: { ...ps, tokens: Math.min(ps.tokens + 1, 10) },
    } as T;
  }

  const nextArrived = pending.arrivedDrawCount + 1;
  const nextPending: BubbleStationPendingSave = {
    ...pending,
    arrivedDrawCount: nextArrived,
  };
  next = { ...next, bubbleStationPending: nextPending } as T;

  if (nextArrived >= pending.enqueuedDrawCount) {
    return finishBubbleStationSequence(next);
  }
  return next;
}

/** 스택에서 스펠 카드 제거 → 리와인드, pending 해제(시퀀스 종료) */
export function finishBubbleStationSequence<T extends BubbleStationCommitSlice>(
  prev: T
): T {
  const pending = prev.bubbleStationPending;
  if (!pending) return prev;

  const isA = pending.casterPlayer === "A";
  const ownerField = isA ? prev.playerA.field : prev.playerB.field;
  const idx = findBubbleStationStackIndex(ownerField, pending.spellStatsInstanceId);

  let rewindCards = prev.rewindCards;
  let updatedField = ownerField;

  if (idx >= 0) {
    const stack = normalizeSpellStack(ownerField);
    const removed = stack[idx]!;
    const newStack = removeSpellFromStackAtIndex(stack, idx);
    rewindCards = [...prev.rewindCards, removed];
    updatedField = { ...ownerField, spellStack: newStack };
  }

  return {
    ...prev,
    rewindCards,
    playerA: isA
      ? { ...prev.playerA, field: updatedField }
      : prev.playerA,
    playerB: !isA
      ? { ...prev.playerB, field: updatedField }
      : prev.playerB,
    bubbleStationPending: null,
  } as T;
}

/** SimulationState 외부 patch — UI 단계 진행에 사용 */
export function patchBubbleStationPendingOnState<
  T extends { bubbleStationPending: BubbleStationPendingSave | null }
>(snap: T, patch: BubbleStationPendingSave | null): T {
  return { ...snap, bubbleStationPending: patch };
}

const VALID_UNIT_TYPE_IDS: ReadonlyArray<BubbleStationUnitTypeId> = [
  "attack",
  "defense",
  "support",
  "speed",
  "explosive",
  "shooting",
  "balance",
];

function parseUnitTypeId(value: unknown): BubbleStationUnitTypeId | null {
  if (typeof value !== "string") return null;
  return (VALID_UNIT_TYPE_IDS as ReadonlyArray<string>).includes(value)
    ? (value as BubbleStationUnitTypeId)
    : null;
}

export function parseBubbleStationPendingSave(raw: unknown): BubbleStationPendingSave | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  const spellStatsInstanceId =
    typeof o.spellStatsInstanceId === "string" ? o.spellStatsInstanceId : "";
  if (!spellStatsInstanceId) return null;

  const phase =
    o.phase === "discardWipe" ||
    o.phase === "selectionFlash" ||
    o.phase === "drawing"
      ? o.phase
      : "typeSelect";
  const casterPlayer = o.casterPlayer === "B" ? "B" : "A";
  const totalDrawsA = Math.max(0, Math.floor(Number(o.totalDrawsA) || 0));
  const totalDrawsB = Math.max(0, Math.floor(Number(o.totalDrawsB) || 0));

  const drawOrder = Array.isArray(o.drawOrder)
    ? (o.drawOrder
        .map(v => (v === "A" ? "A" : v === "B" ? "B" : null))
        .filter(v => v != null) as ("A" | "B")[])
    : buildBubbleStationDrawOrder(casterPlayer, totalDrawsA, totalDrawsB);

  const enqueuedDrawCount = Math.max(0, Math.floor(Number(o.enqueuedDrawCount) || 0));
  const arrivedDrawCount = Math.max(
    0,
    Math.min(enqueuedDrawCount, Math.floor(Number(o.arrivedDrawCount) || 0))
  );

  const selectedUnitType = parseUnitTypeId(o.selectedUnitType);
  const discardWipeEndAt =
    typeof o.discardWipeEndAt === "number" && Number.isFinite(o.discardWipeEndAt)
      ? o.discardWipeEndAt
      : undefined;
  const typeSelectDeadlineAt =
    typeof o.typeSelectDeadlineAt === "number" && Number.isFinite(o.typeSelectDeadlineAt)
      ? o.typeSelectDeadlineAt
      : undefined;
  const selectionFlashEndAt =
    typeof o.selectionFlashEndAt === "number" && Number.isFinite(o.selectionFlashEndAt)
      ? o.selectionFlashEndAt
      : undefined;

  return {
    phase,
    casterPlayer,
    spellStatsInstanceId,
    totalDrawsA,
    totalDrawsB,
    drawOrder,
    enqueuedDrawCount,
    arrivedDrawCount,
    selectedUnitType,
    discardWipeEndAt,
    typeSelectDeadlineAt,
    selectionFlashEndAt,
  };
}

/** 스택에서 스펠이 없어졌으면 pending도 해제 — 외부에서 카드 제거되는 엣지 케이스 보호 */
export function reconcileBubbleStationPendingFromSnapshot<
  T extends {
    bubbleStationPending: BubbleStationPendingSave | null;
    playerA: { field: FieldSliceWithSpell };
    playerB: { field: FieldSliceWithSpell };
  }
>(snap: T): T {
  const p = snap.bubbleStationPending;
  if (!p) return snap;
  const ownerField = p.casterPlayer === "A" ? snap.playerA.field : snap.playerB.field;
  const idx = findBubbleStationStackIndex(ownerField, p.spellStatsInstanceId);
  if (idx < 0) {
    return { ...snap, bubbleStationPending: null };
  }
  return snap;
}
