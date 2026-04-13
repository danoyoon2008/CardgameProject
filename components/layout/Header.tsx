// components/layout/Header.tsx
"use client";

import type { User } from "@supabase/supabase-js";
import { IconUser, IconGold, IconToken, IconShard } from "../ui/Icons";

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
}

export default function Header({
  authReady, user, userAvatarUrl, currentDisplayName, isDarkMode,
  gold, primeTokens, cardShards,
  handleGoogleLogin, handleEditGold, handleEditTokens, handleEditShards
}: HeaderProps) {
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