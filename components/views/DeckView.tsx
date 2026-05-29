// components/views/DeckView.tsx
"use client";

import { RefObject } from "react";
import { CardRow } from "../../types/game";
import { CardPlaceholder } from "../ui/Card";
import { IconDeck, IconBook } from "../ui/Icons";
import MobileViewShell from "../layout/mobile/MobileViewShell";
import { MOBILE_LOBBY_CONTENT_W } from "../layout/mobile/mobileLobbyConstants";

interface DeckViewProps {
  deck: number[];
  cards: CardRow[];
  deckAvailableCards: CardRow[];
  deckContainerRef: RefObject<HTMLDivElement | null>;
  selectedForDeck: CardRow | null;
  setSelectedForDeck: (card: CardRow | null) => void;
  handleSlotReplace: (slotIndex: number) => void;
  handleOpenCardDetail: (card: CardRow) => void;
  handleSelectForDeck: (card: CardRow) => void;
  showOutline: boolean;
  setShowOutline: (val: boolean) => void;
  sortOption: string;
  setSortOption: (val: string) => void;
  cardsLoading: boolean;
  layoutMobile?: boolean;
  isDarkMode?: boolean;
}

export default function DeckView({
  deck, cards, deckAvailableCards, deckContainerRef,
  selectedForDeck, setSelectedForDeck, handleSlotReplace,
  handleOpenCardDetail, handleSelectForDeck,
  showOutline, setShowOutline, sortOption, setSortOption, cardsLoading,
  layoutMobile = false,
  isDarkMode = true,
}: DeckViewProps) {
  if (layoutMobile) {
    return (
      <MobileViewShell isDarkMode={isDarkMode}>
        <div ref={deckContainerRef}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 12 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: isDarkMode ? "#fff" : "#0f172a", display: "flex", alignItems: "center", gap: 10 }}>
                <IconDeck className="h-7 w-7 text-sky-400" /> 덱 구성
              </h1>
              <p style={{ fontSize: 14, margin: "6px 0 0", color: "#94a3b8" }}>전장에 나설 12장의 카드를 선택하세요.</p>
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#fbbf24", padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(245,158,11,0.35)", background: "rgba(69,26,3,0.45)" }}>
              {deck.length} / 12
            </span>
          </div>

          {selectedForDeck ? (
            <div style={{ marginBottom: 16, padding: 14, borderRadius: 12, border: "1px solid rgba(245,158,11,0.5)", background: "rgba(245,158,11,0.15)", textAlign: "center" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#fde68a" }}>배치할 슬롯 선택: [{selectedForDeck.name}]</span>
              <button type="button" onClick={() => setSelectedForDeck(null)} style={{ display: "block", margin: "10px auto 0", height: 32, padding: "0 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(0,0,0,0.35)", color: "#fff", fontSize: 13 }}>
                선택 취소
              </button>
            </div>
          ) : null}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, 1fr)",
              gap: 6,
              width: MOBILE_LOBBY_CONTENT_W,
              padding: 12,
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(0,0,0,0.3)",
              marginBottom: 28,
              boxSizing: "border-box",
            }}
          >
            {deck.map((cardId, index) => {
              const card = cards.find(c => Number(c.id) === cardId);
              return (
                <div
                  key={`deck-slot-${index}`}
                  onClick={() => {
                    if (selectedForDeck) handleSlotReplace(index);
                  }}
                  style={{
                    width: "100%",
                    aspectRatio: "1 / 1.58",
                    minWidth: 0,
                    borderRadius: 8,
                    cursor: selectedForDeck ? "pointer" : "default",
                    boxShadow: selectedForDeck ? "0 0 12px rgba(251,191,36,0.45)" : undefined,
                  }}
                >
                  {card ? (
                    <CardPlaceholder card={card} showOutline={showOutline} onOpenDetail={handleOpenCardDetail} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", borderRadius: 8, border: "2px dashed rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.3)", color: "rgba(255,255,255,0.35)", fontWeight: 700, fontSize: 16 }}>
                      {index + 1}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 12px", color: isDarkMode ? "#e2e8f0" : "#334155", display: "flex", alignItems: "center", gap: 8 }}>
            <IconBook className="h-5 w-5 text-indigo-400" /> 보유 카드
          </h2>
          <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: showOutline ? "#c4b5fd" : "#94a3b8" }}>
              <input type="checkbox" checked={showOutline} onChange={e => setShowOutline(e.target.checked)} style={{ width: 16, height: 16 }} />
              윤곽선 표시
            </label>
            <select
              value={sortOption}
              onChange={e => setSortOption(e.target.value)}
              style={{ height: 40, width: "100%", borderRadius: 8, border: "1px solid #475569", background: "#1e293b", color: "#e2e8f0", fontSize: 14, padding: "0 12px" }}
            >
              <option value="number_asc">번호 오름차순</option>
              <option value="number_desc">번호 내림차순</option>
              <option value="rarity_asc">등급 오름차순</option>
              <option value="rarity_desc">등급 내림차순</option>
              <option value="cost_asc">코스트 오름차순</option>
              <option value="cost_desc">코스트 내림차순</option>
            </select>
          </div>

          {cardsLoading ? (
            <p style={{ textAlign: "center", color: "#38bdf8", fontSize: 14, padding: "32px 0" }}>보유 카드를 불러오는 중...</p>
          ) : deckAvailableCards.length === 0 ? (
            <p style={{ textAlign: "center", color: "#64748b", fontSize: 14, padding: "32px 0" }}>보유한 카드가 없습니다.</p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 8,
                width: MOBILE_LOBBY_CONTENT_W,
              }}
            >
              {deckAvailableCards.map((card, index) => (
                <div
                  key={card.id ?? `deck-card-${index}`}
                  style={{ width: "100%", aspectRatio: "1 / 1.58", minWidth: 0 }}
                >
                  <CardPlaceholder
                    card={card}
                    onOpenDetail={handleOpenCardDetail}
                    onSelectForDeck={handleSelectForDeck}
                    showOutline={showOutline}
                    inDeck={deck.includes(Number(card.id))}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </MobileViewShell>
    );
  }

  return (
    <div className="w-full px-2 pb-8 pt-2 sm:px-4 sm:pt-4 scroll-mt-24" ref={deckContainerRef}>
      <div className="mx-auto max-w-6xl">
        
        {/* 덱 슬롯 영역 */}
        <div className="mb-10">
          <div className="flex justify-between items-end mb-4 border-b border-white/10 pb-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl flex items-center gap-3">
                 <IconDeck className="w-7 h-7 sm:w-8 sm:h-8 text-sky-400" /> 덱 구성
              </h1>
              <p className="mt-1.5 text-sm text-slate-400">전장에 나설 12장의 카드를 선택하세요.</p>
            </div>
            <span className="text-amber-400 text-sm font-bold bg-amber-950/30 px-3 py-1 rounded-lg border border-amber-900/50">
               {deck.length} / 12 장
            </span>
          </div>
          
          {selectedForDeck && (
            <div className="mb-6 flex flex-col sm:flex-row items-center justify-center sm:justify-between bg-amber-500/20 border border-amber-500/50 text-amber-200 p-4 rounded-xl text-center animate-pulse font-bold shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <span className="mb-2 sm:mb-0 text-sm sm:text-base">배치할 슬롯을 선택해주세요: <span className="text-white">[{selectedForDeck.name}]</span></span>
              <button onClick={() => setSelectedForDeck(null)} className="px-4 py-1.5 bg-black/40 hover:bg-black/60 rounded-lg text-sm border border-white/10 transition-colors">선택 취소</button>
            </div>
          )}

          <div className="grid grid-cols-6 gap-2 sm:gap-3 lg:gap-4 p-3 sm:p-5 lg:p-6 rounded-2xl bg-black/30 border border-white/10 shadow-[inset_0_0_30px_rgba(0,0,0,0.5)]">
            {deck.map((cardId, index) => {
              const card = cards.find(c => Number(c.id) === cardId);
              return (
                <div 
                  key={`deck-slot-${index}`}
                  onClick={() => { if(selectedForDeck) handleSlotReplace(index); }}
                  className={`relative aspect-[53.98/85.6] rounded-lg transition-all ${selectedForDeck ? 'cursor-pointer hover:scale-105 ring-2 ring-amber-400/70 shadow-[0_0_15px_rgba(251,191,36,0.5)] z-10' : ''}`}
                >
                  {card ? (
                    <CardPlaceholder 
                      card={card} 
                      showOutline={showOutline} 
                      onOpenDetail={handleOpenCardDetail}
                    />
                  ) : (
                    <div className="w-full h-full rounded-lg border-2 border-dashed border-white/20 flex flex-col items-center justify-center bg-black/30">
                       <span className="text-white/30 font-bold text-xl">{index + 1}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 보유 카드 목록 영역 */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 gap-4 border-b border-white/10 pb-4">
          <h2 className="text-xl font-bold tracking-tight text-slate-200 flex items-center gap-2">
            <IconBook className="w-5 h-5 text-indigo-400" /> 보유 카드
          </h2>
          
          <div className="flex flex-wrap items-center gap-3 sm:gap-5 text-sm w-full sm:w-auto bg-black/20 p-2 sm:p-0 rounded-lg sm:bg-transparent">
            <label className={`flex items-center gap-2 cursor-pointer transition-colors hover:text-white ${showOutline ? 'text-purple-300' : 'text-slate-400'}`}>
              <input 
                type="checkbox" 
                checked={showOutline} 
                onChange={(e) => setShowOutline(e.target.checked)} 
                className="w-4 h-4 accent-purple-500 cursor-pointer rounded" 
              />
              <span className="font-medium">윤곽선 표시</span>
            </label>

            <div className="relative">
              <select 
                value={sortOption} 
                onChange={(e) => setSortOption(e.target.value)} 
                className="bg-slate-800 text-slate-200 border border-slate-600 rounded-lg px-3 py-1.5 outline-none focus:border-sky-500 appearance-none pr-8 cursor-pointer shadow-sm text-xs sm:text-sm"
              >
                <option value="number_asc">번호 오름차순 ▲</option>
                <option value="number_desc">번호 내림차순 ▼</option>
                <option value="rarity_asc">등급 오름차순 ▲</option>
                <option value="rarity_desc">등급 내림차순 ▼</option>
                <option value="cost_asc">코스트 오름차순 ▲</option>
                <option value="cost_desc">코스트 내림차순 ▼</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
          </div>
        </div>

        {cardsLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-sky-400">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent mb-4" />
            <p>보유 카드를 불러오는 중...</p>
          </div>
        ) : deckAvailableCards.length === 0 ? (
          <div className="py-20 text-center text-slate-500">
             <IconBook className="w-12 h-12 mx-auto mb-4 opacity-30" />
             <p>보유한 카드가 없습니다. 상점에서 카드를 소환해보세요.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
            {deckAvailableCards.map((card, index) => (
              <CardPlaceholder 
                key={card.id ?? `deck-card-${index}`} 
                card={card} 
                onOpenDetail={handleOpenCardDetail}
                onSelectForDeck={handleSelectForDeck}
                showOutline={showOutline} 
                inDeck={deck.includes(Number(card.id))}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}