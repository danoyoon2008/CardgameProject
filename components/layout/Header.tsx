// components/layout/Header.tsx
"use client";

import type { User } from "@supabase/supabase-js";
import { IconUser, IconGold, IconToken, IconShard } from "../ui/Icons";
import {
  MOBILE_LOBBY_BASE_W,
  MOBILE_LOBBY_PAD_X,
  MOBILE_HEADER_H,
  MOBILE_HEADER_AVATAR,
  MOBILE_HEADER_NAME_FS,
  MOBILE_HEADER_CURRENCY_H,
  MOBILE_HEADER_CURRENCY_FS,
} from "./mobile/mobileLobbyConstants";

interface HeaderProps {
  authReady: boolean;
  user: User | null;
  userAvatarUrl: string | null;
  currentDisplayName: string;
  isDarkMode: boolean;
  gold: number;
  primeTokens: number;
  cardShards: number;
  handleGoogleLogin: () => void;
  handleEditGold: () => void;
  handleEditTokens: () => void;
  handleEditShards: () => void;
  layoutMobile?: boolean;
}

export default function Header({
  authReady, user, userAvatarUrl, currentDisplayName, isDarkMode,
  gold, primeTokens, cardShards,
  handleGoogleLogin, handleEditGold, handleEditTokens, handleEditShards,
  layoutMobile = false,
}: HeaderProps) {
  if (layoutMobile) {
    const borderColor = isDarkMode ? "rgba(255,255,255,0.1)" : "#cbd5e1";
    const bg = isDarkMode ? "rgba(10,22,40,0.95)" : "#ffffff";

    return (
      <header
        style={{
          width: MOBILE_LOBBY_BASE_W,
          height: MOBILE_HEADER_H,
          boxSizing: "border-box",
          paddingLeft: MOBILE_LOBBY_PAD_X,
          paddingRight: MOBILE_LOBBY_PAD_X,
          borderBottom: `1px solid ${borderColor}`,
          background: bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
          {!authReady ? (
            <span style={{ fontSize: 14, color: "#94a3b8" }}>로딩 중…</span>
          ) : user ? (
            <>
              <div
                style={{
                  width: MOBILE_HEADER_AVATAR,
                  height: MOBILE_HEADER_AVATAR,
                  borderRadius: "50%",
                  overflow: "hidden",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "linear-gradient(135deg, rgba(14,165,233,0.35), rgba(79,70,229,0.45))",
                  boxShadow: "0 0 0 2px rgba(255,255,255,0.15)",
                }}
              >
                {userAvatarUrl ? (
                  <img src={userAvatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <IconUser className="h-[22px] w-[22px] text-sky-200" />
                )}
              </div>
              <span
                style={{
                  fontSize: MOBILE_HEADER_NAME_FS,
                  fontWeight: 600,
                  color: isDarkMode ? "#fff" : "#1e293b",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {currentDisplayName}
              </span>
            </>
          ) : (
            <button
              type="button"
              onClick={handleGoogleLogin}
              style={{
                height: 40,
                paddingLeft: 16,
                paddingRight: 16,
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                background: "#fff",
                color: "#0f172a",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              구글로 시작하기
            </button>
          )}
        </div>

        {user ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {[
              { onClick: handleEditGold, Icon: IconGold, value: gold, ring: "rgba(245,158,11,0.35)", color: "#fde68a" },
              { onClick: handleEditTokens, Icon: IconToken, value: primeTokens, ring: "rgba(139,92,246,0.35)", color: "#ddd6fe" },
              { onClick: handleEditShards, Icon: IconShard, value: cardShards, ring: "rgba(6,182,212,0.35)", color: "#a5f3fc" },
            ].map(({ onClick, Icon, value, ring, color }) => (
              <button
                key={onClick.name}
                type="button"
                onClick={onClick}
                style={{
                  height: MOBILE_HEADER_CURRENCY_H,
                  paddingLeft: 10,
                  paddingRight: 10,
                  borderRadius: 999,
                  border: `1px solid ${ring}`,
                  background: isDarkMode ? "rgba(0,0,0,0.4)" : "#fff",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Icon className="h-[18px] w-[18px]" />
                <span style={{ fontSize: MOBILE_HEADER_CURRENCY_FS, fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>
                  {value.toLocaleString()}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </header>
    );
  }

  return (
    <header className={`shrink-0 border-b px-4 py-3 sm:px-6 sm:py-4 transition-colors duration-500 z-40 ${isDarkMode ? "bg-[#0a1628]/80 border-white/10 backdrop-blur-md" : "bg-white border-slate-300 shadow-sm"}`}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <div className="flex min-h-[44px] items-center gap-3">
          {!authReady ? (<span className="text-sm text-slate-400">로딩 중…</span>) : user ? (
            <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2 sm:gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-sky-500/30 to-indigo-600/40 ring-2 ring-white/15 sm:h-11 sm:w-11">
                {userAvatarUrl ? <img src={userAvatarUrl} alt="" className="h-full w-full object-cover" /> : <IconUser className="h-5 w-5 text-sky-200" />}
              </div>
              <span className={`min-w-0 truncate text-base font-semibold tracking-tight sm:text-lg ${isDarkMode ? "text-white" : "text-slate-800"}`}>
                {currentDisplayName}
              </span>
            </div>
          ) : (
            <button type="button" onClick={handleGoogleLogin} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-md transition hover:bg-slate-100 border border-slate-200">구글로 시작하기</button>
          )}
        </div>
        
        {user && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button onClick={handleEditGold} className={`flex items-center gap-1.5 sm:gap-2 rounded-full px-2.5 py-1.5 sm:px-3 sm:py-2 ring-1 transition-all hover:scale-105 active:scale-95 ${isDarkMode ? "bg-black/40 ring-amber-500/30 shadow-[inset_0_1px_4px_rgba(245,158,11,0.2)]" : "bg-white ring-amber-300 shadow-sm"}`} title="클릭하여 골드 수정">
              <IconGold className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]" />
              <span className={`font-bold tabular-nums tracking-wide text-sm sm:text-base ${isDarkMode ? "text-amber-100" : "text-amber-600"}`}>{gold.toLocaleString()}</span>
            </button>
            <button onClick={handleEditTokens} className={`flex items-center gap-1.5 sm:gap-2 rounded-full px-2.5 py-1.5 sm:px-3 sm:py-2 ring-1 transition-all hover:scale-105 active:scale-95 ${isDarkMode ? "bg-black/40 ring-violet-500/30 shadow-[inset_0_1px_4px_rgba(139,92,246,0.2)]" : "bg-white ring-violet-300 shadow-sm"}`} title="클릭하여 프라임 토큰 수정">
              <IconToken className="w-4 h-4 sm:w-5 sm:h-5 text-violet-400 drop-shadow-[0_0_6px_rgba(167,139,250,0.5)]" />
              <span className={`font-bold tabular-nums tracking-wide text-sm sm:text-base ${isDarkMode ? "text-violet-100" : "text-violet-600"}`}>{primeTokens.toLocaleString()}</span>
            </button>
            <button onClick={handleEditShards} className={`flex items-center gap-1.5 sm:gap-2 rounded-full px-2.5 py-1.5 sm:px-3 sm:py-2 ring-1 transition-all hover:scale-105 active:scale-95 ${isDarkMode ? "bg-black/40 ring-cyan-500/30 shadow-[inset_0_1px_4px_rgba(6,182,212,0.2)]" : "bg-white ring-cyan-300 shadow-sm"}`} title="클릭하여 파편 수정">
              <IconShard className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.5)]" />
              <span className={`font-bold tabular-nums tracking-wide text-sm sm:text-base ${isDarkMode ? "text-cyan-100" : "text-cyan-600"}`}>{cardShards.toLocaleString()}</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}