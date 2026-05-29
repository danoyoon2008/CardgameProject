"use client"; // ⭐️ 이 선언이 반드시 최상단에 있어야 합니다!

import { useMemo, useState, useEffect } from "react";
import { CardRow } from "../../types/game";
import { CardPlaceholder } from "../ui/Card";
import { sortCodexCards } from "../../utils/cardUtils";

import MobileViewShell from "../layout/mobile/MobileViewShell";
import MobileTouchCardCell from "../layout/mobile/MobileTouchCardCell";
import { MOBILE_LOBBY_CONTENT_W } from "../layout/mobile/mobileLobbyConstants";
import { useMobileCardSelectionDismiss } from "../../hooks/useMobileCardSelectionDismiss";

interface CodexViewProps {
  cards: CardRow[];
  loading: boolean;
  sortOption: string;
  setSortOption: (val: string) => void;
  filterOwnedFirst: boolean;
  setFilterOwnedFirst: (val: boolean) => void;
  showOutline: boolean;
  setShowOutline: (val: boolean) => void;
  newCardIds: Set<number>;
  onOpenDetail: (card: CardRow) => void;
  layoutMobile?: boolean;
  isDarkMode?: boolean;
}

export default function CodexView({
  cards, loading, sortOption, setSortOption,
  filterOwnedFirst, setFilterOwnedFirst,
  showOutline, setShowOutline,
  newCardIds, onOpenDetail,
  layoutMobile = false,
  isDarkMode = true,
}: CodexViewProps) {
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  /** 유닛 블록 + 마법 블록 순 배치 (체크 시) */
  const [splitUnitSpell, setSplitUnitSpell] = useState(false);

  const sortedCards = useMemo(() => {
    return sortCodexCards(cards, sortOption, filterOwnedFirst, splitUnitSpell);
  }, [cards, sortOption, filterOwnedFirst, splitUnitSpell]);

  useEffect(() => {
    if (layoutMobile) setSelectedCardIndex(null);
  }, [layoutMobile, sortOption, filterOwnedFirst, splitUnitSpell]);

  useMobileCardSelectionDismiss(
    selectedCardIndex !== null,
    () => setSelectedCardIndex(null),
    layoutMobile
  );

  if (layoutMobile) {
    return (
      <MobileViewShell isDarkMode={isDarkMode}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 16px", color: isDarkMode ? "#fff" : "#0f172a" }}>카드 도감</h1>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginBottom: 20,
            paddingBottom: 16,
            borderBottom: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              id="mobile-codex-filter-owned"
              type="checkbox"
              checked={filterOwnedFirst}
              onChange={e => setFilterOwnedFirst(e.target.checked)}
              style={{ width: 20, height: 20, flexShrink: 0, margin: 0, cursor: "pointer" }}
            />
            <span style={{ fontSize: 14, color: filterOwnedFirst ? "#7dd3fc" : "#94a3b8", userSelect: "none" }}>
              획득 카드 우선
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              id="mobile-codex-show-outline"
              type="checkbox"
              checked={showOutline}
              onChange={e => setShowOutline(e.target.checked)}
              style={{ width: 20, height: 20, flexShrink: 0, margin: 0, cursor: "pointer" }}
            />
            <span style={{ fontSize: 14, color: showOutline ? "#c4b5fd" : "#94a3b8", userSelect: "none" }}>
              윤곽선 표시
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              id="mobile-codex-split-unit-spell"
              type="checkbox"
              checked={splitUnitSpell}
              onChange={e => setSplitUnitSpell(e.target.checked)}
              style={{ width: 20, height: 20, flexShrink: 0, margin: 0, cursor: "pointer" }}
            />
            <span style={{ fontSize: 14, color: splitUnitSpell ? "#86efac" : "#94a3b8", userSelect: "none" }}>
              유닛/마법 분류
            </span>
          </div>
          <select
            value={sortOption}
            onChange={e => setSortOption(e.target.value)}
            style={{
              height: 40,
              width: Math.round(MOBILE_LOBBY_CONTENT_W / 4),
              alignSelf: "flex-start",
              borderRadius: 8,
              border: "1px solid #475569",
              background: "#1e293b",
              color: "#e2e8f0",
              fontSize: 14,
              paddingLeft: 12,
              paddingRight: 12,
              boxSizing: "border-box",
            }}
          >
            <option value="number_asc">번호 오름차순</option>
            <option value="number_desc">번호 내림차순</option>
            <option value="rarity_asc">등급 오름차순</option>
            <option value="rarity_desc">등급 내림차순</option>
            <option value="cost_asc">코스트 오름차순</option>
            <option value="cost_desc">코스트 내림차순</option>
          </select>
        </div>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 0", color: "#38bdf8" }}>
            <div style={{ width: 32, height: 32, border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", marginBottom: 16 }} />
            <p style={{ fontSize: 14, margin: 0 }}>카드 목록 불러오는 중...</p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 8,
              width: MOBILE_LOBBY_CONTENT_W,
            }}
          >
            {sortedCards.map((card, index) => (
              <MobileTouchCardCell
                key={card.id ?? `card-${index}`}
                card={card}
                index={index}
                selectedCardIndex={selectedCardIndex}
                onSelectCardIndex={setSelectedCardIndex}
                onClearSelection={() => setSelectedCardIndex(null)}
                onOpenDetail={onOpenDetail}
                isNew={newCardIds.has(Number(card.id))}
                showOutline={showOutline}
              />
            ))}
          </div>
        )}
      </MobileViewShell>
    );
  }

  return (
    <div className="w-full px-2 pb-8 pt-2 sm:px-4 sm:pt-4">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 gap-4 border-b border-white/10 pb-4">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">카드 도감</h1>
          <div className="flex flex-wrap items-center gap-3 sm:gap-5 text-sm w-full sm:w-auto bg-black/20 p-2 sm:p-0 rounded-lg sm:bg-transparent">
            <label className={`flex items-center gap-2 cursor-pointer transition-colors hover:text-white ${filterOwnedFirst ? 'text-sky-300' : 'text-slate-400'}`}>
              <input type="checkbox" checked={filterOwnedFirst} onChange={(e) => setFilterOwnedFirst(e.target.checked)} className="w-4 h-4 accent-sky-500 cursor-pointer rounded" />
              <span className="font-medium">획득 카드 우선</span>
            </label>
            <label className={`flex items-center gap-2 cursor-pointer transition-colors hover:text-white ${showOutline ? 'text-purple-300' : 'text-slate-400'}`}>
              <input type="checkbox" checked={showOutline} onChange={(e) => setShowOutline(e.target.checked)} className="w-4 h-4 accent-purple-500 cursor-pointer rounded" />
              <span className="font-medium">윤곽선 표시</span>
            </label>
            <label className={`flex items-center gap-2 cursor-pointer transition-colors hover:text-white ${splitUnitSpell ? 'text-emerald-300' : 'text-slate-400'}`}>
              <input type="checkbox" checked={splitUnitSpell} onChange={(e) => setSplitUnitSpell(e.target.checked)} className="w-4 h-4 accent-emerald-500 cursor-pointer rounded" />
              <span className="font-medium">유닛/마법 분류</span>
            </label>
            <div className="relative">
              <select value={sortOption} onChange={(e) => setSortOption(e.target.value)} className="bg-slate-800 text-slate-200 border border-slate-600 rounded-lg px-3 py-1.5 outline-none focus:border-sky-500 appearance-none pr-8 cursor-pointer shadow-sm text-xs sm:text-sm">
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
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-sky-400">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent mb-4" />
            <p>카드 목록 불러오는 중...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
            {sortedCards.map((card, index) => (
              <CardPlaceholder 
                key={card.id ?? `card-${index}`} 
                card={card} 
                onOpenDetail={onOpenDetail} 
                isNew={newCardIds.has(Number(card.id))} 
                showOutline={showOutline} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}