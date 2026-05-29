"use client";

import type { MouseEvent } from "react";
import { CardRow } from "../../../types/game";
import { CardPlaceholder } from "../../ui/Card";

/** 덱 슬롯 오버레이: 제거·상세 정보 동일 박스 규격 */
const OVERLAY_PAIR_BTN =
  "box-border flex h-[34px] w-[92px] shrink-0 items-center justify-center rounded-lg border-0 p-0 text-sm font-semibold leading-none tracking-normal whitespace-nowrap shadow-lg active:scale-95";
const OVERLAY_PAIR_REMOVE_BTN = `${OVERLAY_PAIR_BTN} bg-rose-500 text-white`;
const OVERLAY_PAIR_DETAIL_BTN = `${OVERLAY_PAIR_BTN} bg-white text-[#0a1628]`;
const DETAIL_BTN_CLASS =
  "inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold leading-none text-[#0a1628] shadow-lg active:scale-95";
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
  onRemove?: () => void;
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
  onRemove,
  isNew = false,
  showOutline = false,
  inDeck = false,
}: MobileTouchCardCellProps) {
  const isSelected = selectedCardIndex === index;
  const isOwned = card.isOwned !== false;

  const handleCardClick = (e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
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

  const handleRemove = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onRemove?.();
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
      {isSelected ? (
        <div
          role="presentation"
          onClick={e => {
            if (e.target === e.currentTarget) onClearSelection();
          }}
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
          {onRemove ? (
            <button type="button" className={OVERLAY_PAIR_REMOVE_BTN} onClick={handleRemove}>
              제거
            </button>
          ) : null}
          {onSelectForDeck && isOwned ? (
            <button type="button" className={SELECT_BTN_CLASS} onClick={handleSelectForDeck}>
              선택
            </button>
          ) : null}
          {onOpenDetail ? (
            <button
              type="button"
              className={
                onRemove
                  ? OVERLAY_PAIR_DETAIL_BTN
                  : `${DETAIL_BTN_CLASS} ${onSelectForDeck && isOwned ? "h-[34px] w-[92px] p-0" : ""}`
              }
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
