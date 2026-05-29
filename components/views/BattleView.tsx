"use client";

import { IconGlobe, IconUsers, IconDeck } from "../ui/Icons";
import {
  MOBILE_LOBBY_BASE_W,
  MOBILE_LOBBY_CONTENT_W,
  MOBILE_LOBBY_PAD_X,
  MOBILE_BATTLE_TITLE_FS,
  MOBILE_BATTLE_SUBTITLE_FS,
  MOBILE_BATTLE_MODE_BTN_H,
  MOBILE_BATTLE_SIM_BTN_H,
} from "../layout/mobile/mobileLobbyConstants";

interface BattleViewProps {
  isDarkMode: boolean;
  onStartSimulation: () => void;
  layoutMobile?: boolean;
}

export default function BattleView({ isDarkMode, onStartSimulation, layoutMobile = false }: BattleViewProps) {
  if (layoutMobile) {
    const modeBtnBorder = (accent: string) =>
      isDarkMode ? `2px solid ${accent}4d` : `2px solid ${accent}33`;
    const modeBtnBg = isDarkMode
      ? "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)"
      : "#ffffff";

    return (
      <div
        style={{
          width: MOBILE_LOBBY_BASE_W,
          boxSizing: "border-box",
          paddingTop: 20,
          paddingBottom: 32,
          background: isDarkMode
            ? "linear-gradient(180deg, #0a1628 0%, #0d1f3c 45%, #050a14 100%)"
            : "linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%)",
        }}
      >
        <div style={{ width: MOBILE_LOBBY_CONTENT_W, marginLeft: MOBILE_LOBBY_PAD_X, marginRight: MOBILE_LOBBY_PAD_X }}>
        <header style={{ textAlign: "center", marginBottom: 24 }}>
          <h1
            style={{
              fontSize: MOBILE_BATTLE_TITLE_FS,
              fontWeight: 900,
              lineHeight: 1.15,
              margin: 0,
              marginBottom: 10,
              color: isDarkMode ? "#fff" : "#0f172a",
            }}
          >
            대전 센터
          </h1>
          <p style={{ fontSize: MOBILE_BATTLE_SUBTITLE_FS, margin: 0, color: "#94a3b8", lineHeight: 1.45 }}>
            전 세계의 플레이어, 혹은 친구와 실력을 겨뤄보세요.
          </p>
        </header>

        <div style={{ display: "flex", flexDirection: "row", gap: 12, width: "100%" }}>
          <button
            type="button"
            onClick={() => alert("멀티플레이 기능은 현재 준비 중입니다!")}
            style={{
              flex: 1,
              minWidth: 0,
              height: MOBILE_BATTLE_MODE_BTN_H,
              borderRadius: 16,
              border: modeBtnBorder("#0ea5e9"),
              background: modeBtnBg,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "8px 6px",
              boxSizing: "border-box",
            }}
          >
            <IconGlobe className="h-10 w-10 text-sky-500 shrink-0" />
            <span style={{ fontSize: 16, fontWeight: 700, color: isDarkMode ? "#fff" : "#1e293b", textAlign: "center" }}>글로벌 플레이</span>
            <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(14,165,233,0.85)", textAlign: "center" }}>자동 매칭</span>
          </button>

          <button
            type="button"
            onClick={() => alert("친구 초대 기능은 현재 준비 중입니다!")}
            style={{
              flex: 1,
              minWidth: 0,
              height: MOBILE_BATTLE_MODE_BTN_H,
              borderRadius: 16,
              border: modeBtnBorder("#6366f1"),
              background: modeBtnBg,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "8px 6px",
              boxSizing: "border-box",
            }}
          >
            <IconUsers className="h-10 w-10 text-indigo-500 shrink-0" />
            <span style={{ fontSize: 16, fontWeight: 700, color: isDarkMode ? "#fff" : "#1e293b", textAlign: "center" }}>친구와 플레이</span>
            <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(99,102,241,0.85)", textAlign: "center" }}>초대 코드</span>
          </button>
        </div>

        <div
          style={{
            width: "100%",
            height: 1,
            marginTop: 24,
            marginBottom: 24,
            background: "linear-gradient(90deg, transparent, rgba(148,163,184,0.35), transparent)",
          }}
        />

        <button
          type="button"
          onClick={onStartSimulation}
          style={{
            width: "100%",
            height: MOBILE_BATTLE_SIM_BTN_H,
            borderRadius: 16,
            border: "2px solid rgba(245,158,11,0.55)",
            padding: 4,
            background: "linear-gradient(90deg, #d97706 0%, #ea580c 100%)",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 12,
              background: "rgba(15,23,42,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingLeft: 20,
              paddingRight: 20,
              boxSizing: "border-box",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16, textAlign: "left" }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: "rgba(245,158,11,0.2)",
                  border: "1px solid rgba(251,191,36,0.5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <IconDeck className="h-7 w-7 text-amber-300" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: "#fff", lineHeight: 1.25 }}>
                  시뮬레이션 모드로 플레이하기
                </h3>
                <p style={{ margin: 0, marginTop: 4, fontSize: 12, fontWeight: 500, color: "rgba(253,230,138,0.85)", lineHeight: 1.35 }}>
                  1인 2역 샌드박스 환경에서 덱과 룰을 테스트합니다
                </p>
              </div>
            </div>
            <svg width={24} height={24} fill="none" stroke="#fcd34d" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full justify-center px-2 sm:px-4 py-8">
      <div className="w-[min(100%,36rem)] space-y-8 text-center flex flex-col items-center">
        
        <header className="mb-4">
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl md:text-5xl mb-3">대전 센터</h1>
          <p className="text-sm text-slate-400 sm:text-base">전 세계의 플레이어, 혹은 친구와 실력을 겨뤄보세요.</p>
        </header>

        {/* 정규 대전 버튼들 */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 w-full">
          <button 
            type="button" 
            onClick={() => alert("멀티플레이 기능은 현재 준비 중입니다!")}
            className={`group relative flex min-h-[140px] flex-col items-center justify-center gap-3 rounded-2xl border-2 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl active:scale-95 ${isDarkMode ? "border-sky-500/30 bg-gradient-to-b from-slate-800 to-slate-900 hover:border-sky-400" : "border-sky-200 bg-white shadow-sm hover:border-sky-400"}`}
          >
            <IconGlobe className="h-12 w-12 text-sky-500 group-hover:scale-110 transition-transform duration-300" />
            <span className={`text-lg font-bold sm:text-xl ${isDarkMode ? "text-white" : "text-slate-800"}`}>글로벌 플레이</span>
            <span className="text-xs text-sky-500/80 font-medium">자동 매칭 시스템</span>
          </button>

          <button 
            type="button" 
            onClick={() => alert("친구 초대 기능은 현재 준비 중입니다!")}
            className={`group relative flex min-h-[140px] flex-col items-center justify-center gap-3 rounded-2xl border-2 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl active:scale-95 ${isDarkMode ? "border-indigo-500/30 bg-gradient-to-b from-slate-800 to-slate-900 hover:border-indigo-400" : "border-indigo-200 bg-white shadow-sm hover:border-indigo-400"}`}
          >
            <IconUsers className="h-12 w-12 text-indigo-500 group-hover:scale-110 transition-transform duration-300" />
            <span className={`text-lg font-bold sm:text-xl ${isDarkMode ? "text-white" : "text-slate-800"}`}>친구와 플레이</span>
            <span className="text-xs text-indigo-500/80 font-medium">초대 코드 입력</span>
          </button>
        </div>

        <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-500/30 to-transparent my-4"></div>

        {/* 시뮬레이션 모드 버튼 */}
        <button 
          type="button" 
          onClick={onStartSimulation}
          className="group relative w-full overflow-hidden rounded-2xl border-2 border-amber-500/50 bg-gradient-to-r from-amber-600 to-orange-600 p-1 transition-all duration-300 hover:shadow-[0_0_25px_rgba(245,158,11,0.4)] hover:border-amber-400 active:scale-[0.98]"
        >
          {/* 빛나는 배경 애니메이션 효과 */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 mix-blend-overlay"></div>
          <div className="relative flex items-center justify-between bg-slate-900/40 backdrop-blur-sm px-6 py-4 rounded-xl">
            <div className="flex items-center gap-4 text-left">
              <div className="bg-amber-500/20 p-2.5 rounded-full ring-1 ring-amber-400/50">
                <IconDeck className="h-7 w-7 text-amber-300" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white sm:text-xl drop-shadow-md">시뮬레이션 모드로 플레이하기</h3>
                <p className="text-xs sm:text-sm text-amber-200/80 font-medium">1인 2역 샌드박스 환경에서 덱과 룰을 테스트합니다</p>
              </div>
            </div>
            <div className="hidden sm:flex text-amber-300">
               <svg className="w-6 h-6 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path></svg>
            </div>
          </div>
        </button>

      </div>
    </div>
  );
}
