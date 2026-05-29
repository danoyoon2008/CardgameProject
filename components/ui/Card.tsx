// components/ui/Card.tsx
import { useState, useEffect } from "react";
import { CardRow } from "../../types/game";
import { 
  cardCategoryFlags, 
  nonEmptyText, 
  getGlowColor, 
  getRarityStyle, 
  getShortRarityName, 
  getFullRarityName 
} from "../../utils/cardUtils";
import { IconLock } from "./Icons";
import { GuardedImg, MOBILE_CARD_TOUCH_BLOCK_STYLE, preventImageContextMenu } from "./GuardedImg";

export function CardBadges({ card, category, isUnit, isMagic, className }: { card: CardRow; category: string; isUnit: boolean; isMagic: boolean; className?: string }) {
  const rarityStyle = getRarityStyle(card.rarity);
  const displayRarity = getFullRarityName(card.rarity); 

  return (
    <div className={className}>
      <span className="rounded-md bg-amber-500/90 px-2 py-0.5 text-xs font-bold tabular-nums text-[#0a1628] shadow-sm">{card.cost ?? "—"}</span>
      {category && <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${isUnit ? "bg-emerald-500/25 text-emerald-200 ring-1 ring-emerald-400/30" : isMagic ? "bg-violet-500/25 text-violet-200 ring-1 ring-violet-400/30" : "bg-white/10 text-slate-300 ring-1 ring-white/15"}`}>{category}</span>}
      {rarityStyle && displayRarity && <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${rarityStyle}`}>{displayRarity}</span>}
    </div>
  );
}

export function CardTextBlock({ card, isUnit, isMagic, panelClassName }: { card: CardRow; isUnit: boolean; isMagic: boolean; panelClassName?: string }) {
  return (
    <div className={`flex min-h-0 flex-1 flex-col gap-2 p-3 pt-2 ${panelClassName ?? ""}`}>
      <p className="line-clamp-2 text-center text-sm font-bold leading-tight text-white sm:text-base">{card.name || "이름 없음"}</p>
      <p className="text-center text-[11px] font-medium text-sky-300/90">{card.type ?? "—"}</p>
      <div className="mt-auto border-t border-white/10 pt-2">
        {isUnit ? (
          <div className="flex justify-center gap-4 text-xs tabular-nums"><span className="text-emerald-300/95"><span className="text-slate-500">HP </span><span className="font-bold">{card.hp ?? "—"}</span></span><span className="text-rose-300/95"><span className="text-slate-500">ATK </span><span className="font-bold">{card.atk ?? "—"}</span></span></div>
        ) : isMagic ? (
          <p className="text-center text-xs text-amber-200/90"><span className="text-slate-500">지속 </span><span className="font-semibold tabular-nums">{card.duration ?? "—"}</span></p>
        ) : (<p className="text-center text-[11px] text-slate-500">—</p>)}
      </div>
    </div>
  );
}

const DECK_OVERLAY_PAIR_BTN =
  "pointer-events-auto box-border flex h-[34px] w-[92px] shrink-0 items-center justify-center rounded-lg border-0 p-0 text-sm font-semibold leading-none tracking-normal whitespace-nowrap shadow-lg transition-all duration-300 ease-out group-hover:scale-100 active:scale-95";

export function CardPlaceholder({ 
  card, 
  onOpenDetail, 
  onSelectForDeck,
  onRemoveFromDeck,
  replaceGlow = false,
  isNew = false, 
  showOutline = false, 
  isShopView = false,
  inDeck = false
}: { 
  card: CardRow; 
  onOpenDetail?: (card: CardRow) => void; 
  onSelectForDeck?: (card: CardRow) => void;
  onRemoveFromDeck?: () => void;
  /** 덱 배치 모드: 교체 가능 슬롯 하얀 윤곽 글로우 (`subtle` = PC용 약한 연출) */
  replaceGlow?: boolean | "subtle";
  isNew?: boolean; 
  showOutline?: boolean; 
  isShopView?: boolean;
  inDeck?: boolean;
}) {
  const { category, isUnit, isMagic } = cardCategoryFlags(card);
  const imageUrl = nonEmptyText(card.image_url);
  const [imgFailed, setImgFailed] = useState(false);
  useEffect(() => { queueMicrotask(() => setImgFailed(false)); }, [imageUrl]);
  const useImageBg = Boolean(imageUrl) && !imgFailed;
  const isOwned = card.isOwned !== false;

  const glowColor = getGlowColor(card.rarity);
  
  let finalOutlineStyle: React.CSSProperties = {};
  const baseShadow = '0 12px 40px -12px rgba(0,0,0,0.65)';
  
  const replaceGlowClass =
    replaceGlow === "subtle" ? "deck-replace-glow-subtle" : replaceGlow ? "deck-replace-glow" : "";

  if (replaceGlow) {
    finalOutlineStyle = {
      borderColor: replaceGlow === "subtle" ? "rgba(255, 255, 255, 0.38)" : "rgba(255, 255, 255, 0.45)",
      borderWidth: "2px",
    };
  } else if (inDeck) {
    finalOutlineStyle = {
      borderColor: 'rgba(245, 158, 11, 0.8)',
      boxShadow: `${baseShadow}, 0 0 15px rgba(245, 158, 11, 0.5)`,
      borderWidth: '2px'
    };
  } else if (showOutline && isOwned) {
    finalOutlineStyle = {
      borderColor: glowColor,
      boxShadow: `${baseShadow}, 0 0 15px ${glowColor}`
    };
  } else {
    finalOutlineStyle = {
      boxShadow: baseShadow
    };
  }

  const renderCardContent = () => {
    if (useImageBg) {
      const rarityStyle = getRarityStyle(card.rarity);
      const displayRarity = getShortRarityName(card.rarity);
      
      // ⭐️ A 등급(Ancient)인지 확인하는 변수를 추가했습니다.
      const isAncient = card.rarity && ['A', 'ANCIENT'].includes(card.rarity.toUpperCase());
      
      return (
        <div
          className="absolute inset-0 w-full h-full bg-[#0a1628]"
          onContextMenu={preventImageContextMenu}
          style={MOBILE_CARD_TOUCH_BLOCK_STYLE}
        >
          <GuardedImg
            src={imageUrl!}
            alt={card.name}
            className="absolute inset-0 z-0 h-full w-full object-cover object-center"
            onError={() => setImgFailed(true)}
          />
          
          {/* ⭐️ isAncient가 아닐(false) 때만 우측 하단 뱃지를 그려줍니다. */}
          {rarityStyle && displayRarity && !isAncient && (
            <div className="absolute right-2 bottom-2 z-10 flex flex-wrap items-center gap-1.5">
              <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${rarityStyle}`}>
                {displayRarity}
              </span>
            </div>
          )}
        </div>
      );
    } else {
      return (
        <div className="absolute inset-0 flex flex-col bg-gradient-to-b from-slate-700/40 via-[#0d1f3c]/90 to-[#050a14] shadow-[inset_0_0_28px_rgba(34,211,238,0.12)] ring-1 ring-inset ring-cyan-400/35">
          <div className="relative h-[42%] shrink-0 bg-gradient-to-br from-indigo-600/30 via-slate-800/50 to-slate-900/80 ring-1 ring-inset ring-sky-400/25">
            <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "repeating-linear-gradient(-45deg, transparent, transparent 6px, rgba(255,255,255,0.04) 6px, rgba(255,255,255,0.04) 8px)" }} />
            <CardBadges card={card} category={category} isUnit={isUnit} isMagic={isMagic} className="absolute left-2 top-2 flex flex-wrap items-center gap-1.5" />
            <div className="absolute bottom-2 left-0 right-0 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">Art</div>
          </div>
          <CardTextBlock card={card} isUnit={isUnit} isMagic={isMagic} />
        </div>
      );
    }
  };

  return (
    <article
      onContextMenu={preventImageContextMenu}
      className={`group relative flex w-full h-full aspect-[53.98/85.6] flex-col rounded-lg border ${
        replaceGlowClass || "transition-all duration-300"
      } ${
        isOwned 
          ? (replaceGlow || showOutline || inDeck ? '' : 'border-white/15 hover:border-sky-400/40') 
          : "border-white/5 opacity-60 grayscale hover:opacity-80"
      }`}
      style={{ ...MOBILE_CARD_TOUCH_BLOCK_STYLE, ...finalOutlineStyle }}
    >
      <div className="absolute inset-0 overflow-hidden rounded-lg">
        {renderCardContent()}
      </div>
      
      {!isOwned && !isShopView && (<div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/50 backdrop-blur-[1px] rounded-lg overflow-hidden"><IconLock className="h-10 w-10 text-white/50 mb-2 drop-shadow-md" /><span className="text-xs font-bold text-white/70 tracking-widest drop-shadow-md">미보유</span></div>)}
      
      {isNew && isOwned && !isShopView && (
        <div className="absolute -top-3 -right-3 z-30 rounded-full bg-rose-500 px-3 py-1 text-xs font-black tracking-wider text-white shadow-[0_0_10px_rgba(244,63,94,0.8)] border border-white/20 animate-pulse">
            NEW!
        </div>
      )}

      {inDeck && (
        <div className="absolute -top-2 -left-2 z-30 rounded bg-gradient-to-br from-amber-400 to-amber-600 px-2 py-0.5 text-[10px] font-black tracking-widest text-black shadow-md border border-amber-200">
          IN DECK
        </div>
      )}

      {(onOpenDetail || onSelectForDeck || onRemoveFromDeck) && !isShopView && (
        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-lg bg-black/60 opacity-0 transition-opacity duration-300 ease-out group-hover:pointer-events-auto group-hover:opacity-100">
          {onRemoveFromDeck ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRemoveFromDeck(); }}
              className={`${DECK_OVERLAY_PAIR_BTN} scale-95 bg-rose-500 text-white opacity-0 group-hover:opacity-100 hover:bg-rose-400`}
            >
              제거
            </button>
          ) : null}
          {onSelectForDeck ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSelectForDeck(card); }}
              className="pointer-events-auto scale-95 rounded-lg bg-amber-400 px-6 py-2 text-sm font-black text-[#0a1628] opacity-0 shadow-[0_4px_15px_rgba(251,191,36,0.5)] transition-all duration-300 ease-out group-hover:scale-100 group-hover:opacity-100 hover:bg-amber-300 hover:scale-105 active:scale-95 tracking-widest w-28"
            >
              선택
            </button>
          ) : null}
          {onOpenDetail ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onOpenDetail(card); }}
              className={
                onRemoveFromDeck
                  ? `${DECK_OVERLAY_PAIR_BTN} scale-95 bg-white text-[#0a1628] opacity-0 group-hover:opacity-100 hover:bg-sky-100`
                  : `pointer-events-auto scale-95 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#0a1628] opacity-0 shadow-lg transition-all duration-300 ease-out group-hover:scale-100 group-hover:opacity-100 hover:bg-sky-100 hover:scale-105 active:scale-95 ${onSelectForDeck ? "w-28" : ""}`
              }
            >
              상세 정보
            </button>
          ) : null}
        </div>
      )}
    </article>
  );
}