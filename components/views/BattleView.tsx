"use client";

import { useCallback, useEffect, useState } from "react";
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
import { useMatchmaking } from "@/hooks/useMatchmaking";
import { createClient } from "@/utils/supabase/client";

type BattlePhase = "lobby" | "modeSelect" | "searching" | "countdown";

interface BattleViewProps {
  isDarkMode: boolean;
  onStartSimulation: () => void;
  layoutMobile?: boolean;
}

function IconClassic({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden>
      <rect
        x="6"
        y="16"
        width="22"
        height="30"
        rx="3"
        stroke="currentColor"
        strokeWidth="2"
        transform="rotate(-18 17 31)"
      />
      <rect
        x="20"
        y="10"
        width="22"
        height="30"
        rx="3"
        stroke="currentColor"
        strokeWidth="2"
        transform="rotate(14 31 25)"
      />
      <path d="M14 28 L22 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <path d="M26 22 L34 26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

function IconShield({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden>
      <path
        d="M24 5 L40 13 V24 C40 33.5 24 43 24 43 C24 43 8 33.5 8 24 V13 Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M24 14 V32 M18 22 H30"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}

function IconTrophy({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden>
      <path
        d="M14 10 H34 V18 C34 24 29.5 28 24 28 C18.5 28 14 24 14 18 V10 Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M14 10 H10 V16 C10 20 13 22 16 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M34 10 H38 V16 C38 20 35 22 32 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M24 28 V34 M18 38 H30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <rect x="18" y="34" width="12" height="4" rx="1" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconBack({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function LoadingSpinner({ size = 56, color = "#0ea5e9" }: { size?: number; color?: string }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: `3px solid ${color}33`,
        borderTopColor: color,
        animation: "battle-spin 0.9s linear infinite",
      }}
    />
  );
}

export default function BattleView({ isDarkMode, onStartSimulation, layoutMobile = false }: BattleViewProps) {
  const [battlePhase, setBattlePhase] = useState<BattlePhase>("lobby");
  const [onlineCount, setOnlineCount] = useState(0);
  const [countdownValue, setCountdownValue] = useState<number | null>(null);

  const { matchStatus, opponentNickname, startMatchmaking, cancelMatchmaking } = useMatchmaking();

  const fetchOnlineCount = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) return;

    const { count, error } = await supabase
      .from("matchmaking_queue")
      .select("*", { count: "exact", head: true })
      .eq("status", "waiting");

    if (!error && count !== null) {
      setOnlineCount(count);
    }
  }, []);

  useEffect(() => {
    if (matchStatus === "matched" && battlePhase === "searching") {
      setBattlePhase("countdown");
      setCountdownValue(3);
    }
  }, [matchStatus, battlePhase]);

  useEffect(() => {
    if (matchStatus === "error" && battlePhase === "searching") {
      setBattlePhase("lobby");
    }
  }, [matchStatus, battlePhase]);

  useEffect(() => {
    if (battlePhase !== "searching") return;

    void fetchOnlineCount();
    const intervalId = window.setInterval(() => {
      void fetchOnlineCount();
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [battlePhase, fetchOnlineCount]);

  useEffect(() => {
    if (battlePhase !== "countdown" || countdownValue === null) return;

    if (countdownValue === 0) {
      onStartSimulation();
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCountdownValue((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [battlePhase, countdownValue, onStartSimulation]);

  const handleCancelMatchmaking = useCallback(async () => {
    await cancelMatchmaking();
    setBattlePhase("lobby");
    setOnlineCount(0);
  }, [cancelMatchmaking]);

  const handleStartClassic = useCallback(() => {
    setBattlePhase("searching");
    void startMatchmaking();
  }, [startMatchmaking]);

  const modeBtnBorder = (accent: string) =>
    isDarkMode ? `2px solid ${accent}4d` : `2px solid ${accent}33`;
  const modeBtnBg = isDarkMode
    ? "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)"
    : "#ffffff";

  const bgGradient = isDarkMode
    ? "linear-gradient(180deg, #0a1628 0%, #0d1f3c 45%, #050a14 100%)"
    : "linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%)";

  const textPrimary = isDarkMode ? "#fff" : "#0f172a";
  const textMuted = "#94a3b8";

  const renderBackButton = (mobile: boolean) => (
    <button
      type="button"
      onClick={() => setBattlePhase("lobby")}
      style={
        mobile
          ? {
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 12px",
              marginBottom: 16,
              borderRadius: 10,
              border: isDarkMode ? "1px solid rgba(148,163,184,0.25)" : "1px solid rgba(148,163,184,0.4)",
              background: isDarkMode ? "rgba(15,23,42,0.6)" : "rgba(255,255,255,0.8)",
              color: textMuted,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }
          : undefined
      }
      className={
        mobile
          ? undefined
          : "mb-6 flex items-center gap-2 self-start rounded-xl border border-slate-500/30 bg-slate-800/50 px-4 py-2 text-sm font-semibold text-slate-400 transition-colors hover:border-sky-500/40 hover:text-sky-400"
      }
    >
      <IconBack className={mobile ? "h-4 w-4" : "h-5 w-5"} />
      <span>뒤로가기</span>
    </button>
  );

  const renderModeSelect = (mobile: boolean) => {
    const modes = [
      {
        key: "classic",
        name: "클래식",
        desc: "무작위 카드를 이용한 창의적 배틀",
        icon: IconClassic,
        accent: "#0ea5e9",
        accentClass: "text-sky-500",
        enabled: true,
      },
      {
        key: "normal",
        name: "일반전",
        desc: "덱을 구성하여 전략적 전투",
        icon: IconShield,
        accent: "#6366f1",
        accentClass: "text-indigo-500",
        enabled: false,
      },
      {
        key: "league",
        name: "리그전",
        desc: "덱을 구성하여 리그 경쟁",
        icon: IconTrophy,
        accent: "#f59e0b",
        accentClass: "text-amber-500",
        enabled: false,
      },
    ] as const;

    if (mobile) {
      return (
        <>
          {renderBackButton(true)}
          <header style={{ textAlign: "center", marginBottom: 24 }}>
            <h1 style={{ fontSize: MOBILE_BATTLE_TITLE_FS, fontWeight: 900, margin: 0, marginBottom: 8, color: textPrimary }}>
              모드 선택
            </h1>
            <p style={{ fontSize: MOBILE_BATTLE_SUBTITLE_FS, margin: 0, color: textMuted }}>
              플레이할 대전 모드를 선택하세요
            </p>
          </header>
          <div style={{ display: "flex", flexDirection: "row", gap: 10, width: "100%" }}>
            {modes.map((mode) => {
              const Icon = mode.icon;
              return (
                <button
                  key={mode.key}
                  type="button"
                  disabled={!mode.enabled}
                  onClick={mode.enabled ? handleStartClassic : undefined}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    minHeight: MOBILE_BATTLE_MODE_BTN_H,
                    borderRadius: 16,
                    border: modeBtnBorder(mode.accent),
                    background: modeBtnBg,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "12px 8px",
                    boxSizing: "border-box",
                    opacity: mode.enabled ? 1 : 0.45,
                    cursor: mode.enabled ? "pointer" : "not-allowed",
                  }}
                >
                  <Icon className={`h-10 w-10 shrink-0 ${mode.accentClass}`} />
                  <span style={{ fontSize: 15, fontWeight: 700, color: textPrimary, textAlign: "center" }}>{mode.name}</span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      color: mode.enabled ? `${mode.accent}cc` : textMuted,
                      textAlign: "center",
                      lineHeight: 1.35,
                    }}
                  >
                    {mode.enabled ? mode.desc : "준비 중"}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      );
    }

    return (
      <div className="flex w-full flex-col items-center">
        {renderBackButton(false)}
        <header className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-black tracking-tight sm:text-4xl">모드 선택</h1>
          <p className="text-sm text-slate-400 sm:text-base">플레이할 대전 모드를 선택하세요</p>
        </header>
        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
          {modes.map((mode) => {
            const Icon = mode.icon;
            return (
              <button
                key={mode.key}
                type="button"
                disabled={!mode.enabled}
                onClick={mode.enabled ? handleStartClassic : undefined}
                className={`group relative flex min-h-[160px] flex-col items-center justify-center gap-3 rounded-2xl border-2 p-5 transition-all duration-300 ${
                  mode.enabled
                    ? isDarkMode
                      ? "border-sky-500/30 bg-gradient-to-b from-slate-800 to-slate-900 hover:-translate-y-1 hover:border-sky-400 hover:shadow-xl active:scale-95"
                      : "border-sky-200 bg-white shadow-sm hover:-translate-y-1 hover:border-sky-400 hover:shadow-xl active:scale-95"
                    : isDarkMode
                      ? "cursor-not-allowed border-slate-600/30 bg-gradient-to-b from-slate-800/60 to-slate-900/60 opacity-45"
                      : "cursor-not-allowed border-slate-200 bg-slate-50 opacity-45"
                }`}
              >
                <Icon
                  className={`h-12 w-12 ${mode.accentClass} ${mode.enabled ? "group-hover:scale-110 transition-transform duration-300" : ""}`}
                />
                <span className={`text-lg font-bold sm:text-xl ${isDarkMode ? "text-white" : "text-slate-800"}`}>
                  {mode.name}
                </span>
                <span
                  className={`px-2 text-center text-xs font-medium leading-snug ${mode.enabled ? `${mode.accentClass}/80` : "text-slate-500"}`}
                >
                  {mode.enabled ? mode.desc : "준비 중"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderSearching = (mobile: boolean) => {
    if (mobile) {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 40, paddingBottom: 24 }}>
          <LoadingSpinner size={64} />
          <p style={{ marginTop: 28, fontSize: 20, fontWeight: 800, color: textPrimary }}>대전 찾는 중...</p>
          <p style={{ marginTop: 12, fontSize: 14, color: textMuted }}>상대방을 찾고 있습니다</p>
          <p style={{ marginTop: 32, fontSize: 13, fontWeight: 600, color: "rgba(14,165,233,0.9)" }}>
            현재 접속 중인 유저 : {onlineCount}
          </p>
          <button
            type="button"
            onClick={() => void handleCancelMatchmaking()}
            style={{
              marginTop: 40,
              padding: "12px 28px",
              borderRadius: 12,
              border: "2px solid rgba(148,163,184,0.35)",
              background: isDarkMode ? "rgba(15,23,42,0.7)" : "#fff",
              color: textMuted,
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            매칭 취소
          </button>
        </div>
      );
    }

    return (
      <div className="flex w-full flex-col items-center py-12">
        <LoadingSpinner size={72} />
        <p className="mt-8 text-2xl font-black text-white sm:text-3xl">대전 찾는 중...</p>
        <p className="mt-3 text-sm text-slate-400 sm:text-base">상대방을 찾고 있습니다</p>
        <p className="mt-10 text-sm font-semibold text-sky-400 sm:text-base">현재 접속 중인 유저 : {onlineCount}</p>
        <button
          type="button"
          onClick={() => void handleCancelMatchmaking()}
          className="mt-12 rounded-xl border-2 border-slate-500/35 bg-slate-800/60 px-8 py-3 text-sm font-bold text-slate-400 transition-colors hover:border-slate-400 hover:text-slate-200"
        >
          매칭 취소
        </button>
      </div>
    );
  };

  const renderCountdown = (mobile: boolean) => {
    const displayName = opponentNickname ?? "상대방";

    if (mobile) {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 48, paddingBottom: 24 }}>
          <p style={{ fontSize: 22, fontWeight: 900, color: "#38bdf8", margin: 0 }}>매칭 완료</p>
          <p style={{ marginTop: 16, fontSize: 18, fontWeight: 700, color: textPrimary }}>vs {displayName}</p>
          <div
            style={{
              marginTop: 48,
              width: 120,
              height: 120,
              borderRadius: "50%",
              border: "3px solid rgba(245,158,11,0.5)",
              background: "linear-gradient(180deg, rgba(245,158,11,0.15) 0%, rgba(234,88,12,0.08) 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 64, fontWeight: 900, color: "#fbbf24", lineHeight: 1 }}>
              {countdownValue ?? ""}
            </span>
          </div>
        </div>
      );
    }

    return (
      <div className="flex w-full flex-col items-center py-16">
        <p className="text-2xl font-black text-sky-400 sm:text-3xl">매칭 완료</p>
        <p className="mt-4 text-xl font-bold text-white sm:text-2xl">vs {displayName}</p>
        <div className="mt-14 flex h-32 w-32 items-center justify-center rounded-full border-[3px] border-amber-500/50 bg-gradient-to-b from-amber-500/15 to-orange-600/10 sm:h-36 sm:w-36">
          <span className="text-6xl font-black leading-none text-amber-400 sm:text-7xl">{countdownValue ?? ""}</span>
        </div>
      </div>
    );
  };

  const renderLobby = (mobile: boolean) => {
    if (mobile) {
      return (
        <>
          <header style={{ textAlign: "center", marginBottom: 24 }}>
            <h1
              style={{
                fontSize: MOBILE_BATTLE_TITLE_FS,
                fontWeight: 900,
                lineHeight: 1.15,
                margin: 0,
                marginBottom: 10,
                color: textPrimary,
              }}
            >
              대전 센터
            </h1>
            <p style={{ fontSize: MOBILE_BATTLE_SUBTITLE_FS, margin: 0, color: textMuted, lineHeight: 1.45 }}>
              전 세계의 플레이어, 혹은 친구와 실력을 겨뤄보세요.
            </p>
          </header>

          <div style={{ display: "flex", flexDirection: "row", gap: 12, width: "100%" }}>
            <button
              type="button"
              onClick={() => setBattlePhase("modeSelect")}
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
                cursor: "pointer",
              }}
            >
              <IconGlobe className="h-10 w-10 text-sky-500 shrink-0" />
              <span style={{ fontSize: 16, fontWeight: 700, color: textPrimary, textAlign: "center" }}>글로벌 플레이</span>
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
              <span style={{ fontSize: 16, fontWeight: 700, color: textPrimary, textAlign: "center" }}>친구와 플레이</span>
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
        </>
      );
    }

    return (
      <>
        <header className="mb-4">
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl md:text-5xl mb-3">대전 센터</h1>
          <p className="text-sm text-slate-400 sm:text-base">전 세계의 플레이어, 혹은 친구와 실력을 겨뤄보세요.</p>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 w-full">
          <button
            type="button"
            onClick={() => setBattlePhase("modeSelect")}
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

        <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-500/30 to-transparent my-4" />

        <button
          type="button"
          onClick={onStartSimulation}
          className="group relative w-full overflow-hidden rounded-2xl border-2 border-amber-500/50 bg-gradient-to-r from-amber-600 to-orange-600 p-1 transition-all duration-300 hover:shadow-[0_0_25px_rgba(245,158,11,0.4)] hover:border-amber-400 active:scale-[0.98]"
        >
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 mix-blend-overlay" />
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
              <svg className="w-6 h-6 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </button>
      </>
    );
  };

  const renderPhase = (mobile: boolean) => {
    switch (battlePhase) {
      case "modeSelect":
        return renderModeSelect(mobile);
      case "searching":
        return renderSearching(mobile);
      case "countdown":
        return renderCountdown(mobile);
      default:
        return renderLobby(mobile);
    }
  };

  if (layoutMobile) {
    return (
      <>
        <style>{`@keyframes battle-spin { to { transform: rotate(360deg); } }`}</style>
        <div
          style={{
            width: MOBILE_LOBBY_BASE_W,
            boxSizing: "border-box",
            paddingTop: 20,
            paddingBottom: 32,
            background: bgGradient,
          }}
        >
          <div style={{ width: MOBILE_LOBBY_CONTENT_W, marginLeft: MOBILE_LOBBY_PAD_X, marginRight: MOBILE_LOBBY_PAD_X }}>
            {renderPhase(true)}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`@keyframes battle-spin { to { transform: rotate(360deg); } }`}</style>
      <div className="flex w-full justify-center px-2 sm:px-4 py-8">
        <div className="w-[min(100%,48rem)] space-y-8 text-center flex flex-col items-center">{renderPhase(false)}</div>
      </div>
    </>
  );
}
