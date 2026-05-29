"use client";

import type { MouseEvent } from "react";
import { CardRow } from "../../../types/game";
import { CardPlaceholder } from "../../ui/Card";

const DETAIL_BTN_CLASS =
  "rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#0a1628] shadow-lg active:scale-95";
const SELECT_BTN_CLASS =
  "rounded-lg bg-amber-400 px-6 py-2 text-sm font-black text-[#0a1628] shadow-[0_4px_15px_rgba(251,191,36,0.5)] active:scale-95 tracking-widest w-28";

type MobileTouchCardCellProps = {
  card: CardRow;
  index: number;
  selectedCardIndex: number | null;
  onSelectCardIndex: (index: number) => void;
  onClearSelection: () => void;
  onOpenDetail?: (card: CardRow) => void;
  onSelectForDeck?: (card: CardRow) => void;
  isNew?: boolean;
  showOutline?: boolean;
  inDeck?: boolean;
};

export default function MobileTouchCardCell({
  card,
  index,
  selectedCardIndex,
  onSelectCardIndex,
  onClearSelection,
  onOpenDetail,
  onSelectForDeck,
  isNew = false,
  showOutline = false,
  inDeck = false,
}: MobileTouchCardCellProps) {
  const isSelected = selectedCardIndex === index;
  const isOwned = card.isOwned !== false;

  const handleCardClick = (e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!isOwned) return;
    onSelectCardIndex(index);
  };

  const handleOpenDetail = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onOpenDetail?.(card);
    onClearSelection();
  };

  const handleSelectForDeck = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onSelectForDeck?.(card);
    onClearSelection();
  };

  return (
    <div
      data-mobile-card-cell
      onClick={handleCardClick}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "1 / 1.58",
        minWidth: 0,
        cursor: "pointer",
      }}
    >
      <CardPlaceholder
        card={card}
        isNew={isNew}
        showOutline={showOutline}
        inDeck={inDeck}
      />
      {isSelected && isOwned ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            borderRadius: 8,
            zIndex: 20,
          }}
        >
          {onSelectForDeck ? (
            <button type="button" className={SELECT_BTN_CLASS} onClick={handleSelectForDeck}>
              선택
            </button>
          ) : null}
          {onOpenDetail ? (
            <button
              type="button"
              className={`${DETAIL_BTN_CLASS} ${onSelectForDeck ? "w-28" : ""}`}
              onClick={handleOpenDetail}
            >
              상세 정보
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** 그리드 바깥(빈 영역) 터치 시 선택 해제 */
export function handleMobileCardGridBackgroundClick(
  e: MouseEvent<HTMLElement>,
  onClearSelection: () => void
) {
  const target = e.target as HTMLElement;
  if (!target.closest("[data-mobile-card-cell]")) {
    onClearSelection();
  }
}
