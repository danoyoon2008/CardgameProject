// components/views/ShopView.tsx
"use client";

import { IconBook, IconGold, IconShard } from "../ui/Icons";
import MobileViewShell from "../layout/mobile/MobileViewShell";
import { MOBILE_LOBBY_CONTENT_W } from "../layout/mobile/mobileLobbyConstants";

interface ShopViewProps {
  gold: number;
  cardsLoading: boolean;
  isDarkMode: boolean;
  handleGacha: (count: number) => void;
  setShowProbModal: (val: boolean) => void;
  setIsShardShopOpen: (val: boolean) => void;
  layoutMobile?: boolean;
}

export default function ShopView({
  gold,
  cardsLoading,
  isDarkMode,
  handleGacha,
  setShowProbModal,
  setIsShardShopOpen,
  layoutMobile = false,
}: ShopViewProps) {
  if (layoutMobile) {
    const panelBg = isDarkMode
      ? "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)"
      : "#ffffff";
    const panelBorder = isDarkMode ? "rgba(245,158,11,0.35)" : "#fcd34d";

    return (
      <MobileViewShell isDarkMode={isDarkMode}>
        <header style={{ textAlign: "center", marginBottom: 28 }}>
          <h1 style={{ fontSize: 32, fontWeight: 900, margin: "0 0 8px", color: "#fbbf24" }}>차원 소환 상점</h1>
          <p style={{ fontSize: 14, margin: 0, color: "#94a3b8" }}>골드를 사용하여 새로운 차원의 카드를 수집하세요.</p>
        </header>

        <div
          style={{
            width: MOBILE_LOBBY_CONTENT_W,
            borderRadius: 24,
            border: `2px solid ${panelBorder}`,
            background: panelBg,
            padding: 32,
            boxSizing: "border-box",
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <IconBook className="h-20 w-20 text-amber-400 mb-4" />
            <h2 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 16px", color: isDarkMode ? "#fff" : "#0f172a" }}>일반 소환</h2>
            <button
              type="button"
              onClick={() => setShowProbModal(true)}
              style={{
                height: 32,
                paddingLeft: 12,
                paddingRight: 12,
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(0,0,0,0.3)",
                color: "rgba(253,230,138,0.9)",
                fontSize: 12,
                marginBottom: 28,
              }}
            >
              상세 확률 보기
            </button>
            <div style={{ display: "flex", flexDirection: "row", gap: 12, width: "100%" }}>
              <button
                type="button"
                onClick={() => handleGacha(1)}
                disabled={cardsLoading || gold < 300}
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: 72,
                  borderRadius: 16,
                  border: "1px solid #475569",
                  background: "rgba(51,65,85,0.55)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  padding: "8px 6px",
                  boxSizing: "border-box",
                }}
              >
                1회 소환 · 300
              </button>
              <button
                type="button"
                onClick={() => handleGacha(10)}
                disabled={cardsLoading || gold < 3000}
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: 72,
                  borderRadius: 16,
                  border: "1px solid #fbbf24",
                  background: "linear-gradient(180deg, #f59e0b 0%, #d97706 100%)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  padding: "8px 6px",
                  boxSizing: "border-box",
                }}
              >
                10회 연속 · 3000
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsShardShopOpen(true)}
          style={{
            width: MOBILE_LOBBY_CONTENT_W,
            height: 88,
            borderRadius: 16,
            border: "1px solid rgba(34,211,238,0.35)",
            background: "linear-gradient(90deg, #1e293b 0%, #0a1628 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingLeft: 16,
            paddingRight: 16,
            boxSizing: "border-box",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, textAlign: "left" }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "#083344",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid rgba(34,211,238,0.45)",
              }}
            >
              <IconShard className="h-6 w-6 text-cyan-400" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#fff" }}>차원 파편 상점</h3>
              <p style={{ margin: 0, marginTop: 4, fontSize: 12, color: "rgba(103,232,249,0.75)" }}>
                중복 카드 파편으로 원하는 카드를 확정 획득
              </p>
            </div>
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#22d3ee", padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(34,211,238,0.25)", background: "rgba(8,51,68,0.65)" }}>
            입장하기
          </span>
        </button>
      </MobileViewShell>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-2 sm:px-4 py-6 sm:py-8 flex flex-col items-center">
      <header className="mb-8 text-center">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-2 text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-600">차원 소환 상점</h1>
        <p className="text-slate-400">골드를 사용하여 새로운 차원의 카드를 수집하세요.</p>
      </header>

      <div className="flex flex-col items-center w-full max-w-lg gap-6">
        <div className={`relative overflow-hidden rounded-3xl border-2 p-6 sm:p-10 flex flex-col items-center w-full transition-all shadow-2xl ${isDarkMode ? 'border-amber-500/30 bg-gradient-to-b from-slate-800 to-slate-900' : 'border-amber-300 bg-white'}`}>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 mix-blend-overlay pointer-events-none"></div>
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-amber-500/10 to-transparent pointer-events-none"></div>

          <div className="relative z-10 flex flex-col items-center w-full">
            <IconBook className="w-20 h-20 text-amber-400 mb-4 drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]" />
            <h2 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>일반 소환</h2>
            
            <div className="mb-8">
              <button 
                onClick={() => setShowProbModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/30 border border-white/10 text-xs text-amber-300/80 hover:text-amber-300 hover:bg-black/50 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                상세 확률 보기
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full">
              <button 
                onClick={() => handleGacha(1)}
                disabled={cardsLoading || gold < 300}
                className="flex-1 flex flex-col items-center justify-center py-4 rounded-2xl bg-slate-700/50 hover:bg-slate-700 border border-slate-600 transition-all disabled:opacity-50 active:scale-95 group"
              >
                <span className="font-bold text-white mb-1 group-hover:text-amber-300 transition-colors">1회 소환</span>
                <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <IconGold className="w-4 h-4" /> 300
                </div>
              </button>
              
              <button 
                onClick={() => handleGacha(10)}
                disabled={cardsLoading || gold < 3000}
                className="flex-1 flex flex-col items-center justify-center py-4 rounded-2xl bg-gradient-to-b from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 border border-amber-400 transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_25px_rgba(245,158,11,0.5)] disabled:opacity-50 active:scale-95 group"
              >
                <span className="font-bold text-white mb-1 drop-shadow-md">10회 연속 소환</span>
                <div className="flex items-center gap-1.5 text-amber-100 font-bold drop-shadow-md">
                  <IconGold className="w-4 h-4" /> 3000
                </div>
              </button>
            </div>
          </div>
        </div>

        <button 
          onClick={() => setIsShardShopOpen(true)}
          className="w-full relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-slate-800 to-[#0a1628] p-4 flex items-center justify-between shadow-lg hover:border-cyan-400/60 hover:shadow-[0_0_15px_rgba(34,211,238,0.2)] transition-all active:scale-[0.98] group"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-cyan-950 flex items-center justify-center ring-1 ring-cyan-500/50 group-hover:bg-cyan-900 transition-colors">
              <IconShard className="w-6 h-6 text-cyan-400" />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-white text-lg">차원 파편 상점</h3>
              <p className="text-xs text-cyan-300/70">중복 카드 파편으로 원하는 카드를 확정 획득하세요</p>
            </div>
          </div>
          <div className="font-bold text-cyan-400 bg-cyan-950/50 px-3 py-1.5 rounded-lg border border-cyan-500/20">
            입장하기
          </div>
        </button>
      </div>
    </div>
  );
}