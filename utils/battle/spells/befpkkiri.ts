import type { CardRow } from "../../../types/game";

/** 스펠 No.55 베프끼리 — 자신의 스펠 칸에 배치 후 즉시 소멸·덱에서 2장 연속 드로우 */
export const BEFPKKIRI_SPELL_ID = "베프끼리" as const;

export const BEFPKKIRI_AUTO_DRAW_COUNT = 2;

export type SimpanPeekKind =
  | "simpan"
  | "draw"
  | "opening"
  | "teslaDrawRewind"
  | "witchTarot"
  | "befpkkiri"
  | "bubbleStation";

export type SimpanPeekQueueEntry = {
  player: "A" | "B";
  pendingCard: CardRow;
  peekKind?: SimpanPeekKind;
};

export function isBefpkkiriSpellCard(card: CardRow | null | undefined): boolean {
  return !!card && card.name === BEFPKKIRI_SPELL_ID;
}

type SimpanHandChoiceEntry = { player: "A" | "B"; pendingCard: CardRow };

type BefpkkiriCommitSlice = {
  deckCards: CardRow[];
  rewindCards: CardRow[];
  deckCardsA?: CardRow[];
  deckCardsB?: CardRow[];
  gameMode?: "classic" | "normal";
  playerA: { hand: CardRow[] };
  playerB: { hand: CardRow[] };
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

/**
 * 스펠 카드를 리와인드로 보내고, 덱에서 최대 2장을 연속 처리.
 * 패 여유 있으면 `simpanPeekReveal`/`simpanPeekQueue`(befpkkiri 피크),
 * 패 6장이면 심판·마녀 타로와 동일하게 `simpanHandChoice` 교체 UI.
 */
export function applyBefpkkiriSpellCommit<T extends BefpkkiriCommitSlice>(
  prev: T,
  caster: "A" | "B",
  spellCard: CardRow,
  markHandGlow: (card: CardRow) => CardRow
): T {
  const isNormal = prev.gameMode === "normal";
  // 일반전: caster 자신의 덱에서 드로우 / 덱 비었으면 자신 리와인드 복원(오래된 것 먼저)
  let sourceDeck: CardRow[];
  if (isNormal) {
    const own = caster === "A" ? (prev.deckCardsA ?? []) : (prev.deckCardsB ?? []);
    if (own.length === 0) {
      const myRewind = (prev.rewindCards ?? []).filter((c) => c._ownerTeam === caster);
      sourceDeck = [...myRewind].reverse();
    } else {
      sourceDeck = [...own];
    }
  } else {
    sourceDeck = [...prev.deckCards];
  }
  const deck = sourceDeck;
  // 베프끼리 스펠 카드는 caster 소유로 리와인드에 추가
  const taggedSpell = isNormal ? { ...spellCard, _ownerTeam: caster } : spellCard;
  // 일반전에서 덱 복원이 일어났다면 기존 리와인드에서 caster 카드 제거
  const baseRewind = isNormal && (caster === "A" ? (prev.deckCardsA ?? []).length === 0 : (prev.deckCardsB ?? []).length === 0)
    ? (prev.rewindCards ?? []).filter((c) => c._ownerTeam !== caster)
    : (prev.rewindCards ?? []);
  const rewindCards = [...baseRewind, taggedSpell];
  const ps = caster === "A" ? prev.playerA : prev.playerB;
  const maxHandBef = isNormal ? 4 : 6;
  let handLen = ps.hand.length;

  const queueAdds: SimpanPeekQueueEntry[] = [];
  let reveal: BefpkkiriCommitSlice["simpanPeekReveal"] = prev.simpanPeekReveal ?? null;
  let handChoice: SimpanHandChoiceEntry | null = prev.simpanHandChoice ?? null;
  let handChoiceQueue = [...(prev.simpanHandChoiceQueue ?? [])];

  const peekStillPending = () =>
    reveal != null ||
    queueAdds.length > 0 ||
    (prev.simpanPeekQueue?.length ?? 0) > 0;

  const enqueueHandChoice = (pendingCard: CardRow) => {
    const entry: SimpanHandChoiceEntry = { player: caster, pendingCard };
    if (peekStillPending()) {
      handChoiceQueue = [...handChoiceQueue, entry];
      return;
    }
    if (handChoice) {
      handChoiceQueue = [...handChoiceQueue, entry];
    } else {
      handChoice = entry;
    }
  };

  for (let i = 0; i < BEFPKKIRI_AUTO_DRAW_COUNT && deck.length > 0; i++) {
    const drawn = deck.pop()!;
    const glowed = markHandGlow(drawn);

    if (handLen < maxHandBef) {
      const peekEntry: SimpanPeekQueueEntry = {
        player: caster,
        pendingCard: glowed,
        peekKind: "befpkkiri",
      };
      if (handChoice) {
        handChoiceQueue = [...handChoiceQueue, { player: caster, pendingCard: glowed }];
      } else if (!reveal && !peekStillPending()) {
        reveal = peekEntry;
        handLen += 1;
      } else {
        queueAdds.push(peekEntry);
        handLen += 1;
      }
    } else {
      enqueueHandChoice(glowed);
    }
  }

  const mergedQueue = [...(prev.simpanPeekQueue ?? []), ...queueAdds];

  const deckPatch = isNormal
    ? (caster === "A" ? { deckCardsA: deck } : { deckCardsB: deck })
    : { deckCards: deck };

  return {
    ...prev,
    ...deckPatch,
    rewindCards,
    simpanHandChoice: handChoice,
    simpanHandChoiceQueue: handChoiceQueue,
    simpanPeekReveal: reveal,
    simpanPeekQueue: mergedQueue,
    simpanPeekTick:
      reveal != null ? (prev.simpanPeekTick ?? 0) + 1 : (prev.simpanPeekTick ?? 0),
  };
}
