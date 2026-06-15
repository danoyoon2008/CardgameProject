// components/views/SettingsView.tsx
"use client";

import type { User } from "@supabase/supabase-js";
import { IconSettings, IconUser } from "../ui/Icons";

import MobileViewShell from "../layout/mobile/MobileViewShell";
import { MOBILE_LOBBY_CONTENT_W } from "../layout/mobile/mobileLobbyConstants";

interface SettingsViewProps {
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  volume: number;
  setVolume: (val: number) => void;
  user: User | null;
  handleLogout: () => void;
  handleResetData: () => void;
  layoutMobile?: boolean;
}

export default function SettingsView({
  isDarkMode, setIsDarkMode, volume, setVolume,
  user, handleLogout, handleResetData,
  layoutMobile = false,
}: SettingsViewProps) {
  if (layoutMobile) {
    const sectionStyle = {
      width: MOBILE_LOBBY_CONTENT_W,
      borderRadius: 16,
      border: isDarkMode ? "1px solid rgba(255,255,255,0.1)" : "1px solid #cbd5e1",
      background: isDarkMode ? "rgba(255,255,255,0.05)" : "#fff",
      padding: 20,
      boxSizing: "border-box" as const,
      marginBottom: 20,
    };

    return (
      <MobileViewShell isDarkMode={isDarkMode}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 20px", color: isDarkMode ? "#fff" : "#0f172a" }}>환경 설정</h1>
        <section style={sectionStyle}>
          <h2 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 16px", color: isDarkMode ? "#fff" : "#0f172a" }}>화면 및 사운드</h2>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 500, color: isDarkMode ? "#e2e8f0" : "#334155" }}>다크 모드</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>어두운 테마를 사용합니다</div>
            </div>
            <button type="button" onClick={() => setIsDarkMode(!isDarkMode)} style={{ width: 44, height: 24, borderRadius: 999, border: "none", background: isDarkMode ? "#0ea5e9" : "#cbd5e1", position: "relative" }}>
              <span style={{ position: "absolute", top: 4, left: isDarkMode ? 24 : 4, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
            </button>
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 500, color: isDarkMode ? "#e2e8f0" : "#334155" }}>전체 음량</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#0ea5e9" }}>{volume}%</span>
            </div>
            <input type="range" min={0} max={100} value={volume} onChange={e => setVolume(Number(e.target.value))} style={{ width: "100%", height: 8 }} />
          </div>
        </section>
        <section style={sectionStyle}>
          <h2 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 16px", color: isDarkMode ? "#fff" : "#0f172a" }}>계정 관리</h2>
          {[
            { title: "로그아웃", desc: "계정 세션 종료", action: handleLogout, label: user ? "로그아웃" : "비로그인", disabled: !user },
            { title: "계정 정보 초기화", desc: "덱·재화 삭제", action: handleResetData, label: "데이터 초기화", danger: true },
          ].map(row => (
            <div
              key={row.title}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                padding: 16,
                borderRadius: 12,
                border: row.danger ? "1px solid rgba(244,63,94,0.45)" : isDarkMode ? "1px solid #334155" : "1px solid #e2e8f0",
                background: row.danger ? "rgba(76,5,25,0.35)" : isDarkMode ? "rgba(30,41,59,0.5)" : "#f8fafc",
                marginBottom: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 16, fontWeight: 500, color: row.danger ? "#fb7185" : isDarkMode ? "#e2e8f0" : "#334155" }}>{row.title}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{row.desc}</div>
              </div>
              <button
                type="button"
                onClick={row.action}
                disabled={row.disabled}
                style={{
                  height: 40,
                  borderRadius: 8,
                  border: "none",
                  background: row.danger ? "rgba(244,63,94,0.25)" : "#0ea5e9",
                  color: row.danger ? "#fda4af" : "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  opacity: row.disabled ? 0.5 : 1,
                }}
              >
                {row.label}
              </button>
            </div>
          ))}
        </section>
      </MobileViewShell>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 tracking-tight">환경 설정</h1>
      <div className="space-y-6 sm:space-y-8">
        <section className={`p-5 sm:p-6 rounded-2xl border transition-colors ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-300 shadow-sm'}`}>
          <h2 className="text-lg sm:text-xl font-semibold mb-5 flex items-center gap-2"><IconSettings className="w-5 h-5 text-sky-500" />화면 및 사운드</h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between"><div><div className="font-medium">다크 모드</div><div className="text-xs text-slate-500">어두운 테마를 사용합니다</div></div><button onClick={() => setIsDarkMode(!isDarkMode)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isDarkMode ? 'bg-sky-500' : 'bg-slate-300'}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-1'}`} /></button></div>
            <div><div className="flex items-center justify-between mb-2"><div className="font-medium">전체 음량</div><div className="text-sm font-mono text-sky-500 font-bold">{volume}%</div></div><input type="range" min="0" max="100" value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="w-full h-2 bg-slate-400/30 rounded-lg appearance-none cursor-pointer accent-sky-500" /></div>
          </div>
        </section>
        <section className={`p-5 sm:p-6 rounded-2xl border transition-colors ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-300 shadow-sm'}`}>
          <h2 className="text-lg sm:text-xl font-semibold mb-5 flex items-center gap-2"><IconUser className="w-5 h-5 text-indigo-500" />계정 관리</h2>
          <div className="space-y-4">
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border gap-4 ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <div><div className="font-medium">로그아웃</div><div className="text-sm text-slate-500">계정 세션을 종료합니다</div></div>
              <button onClick={handleLogout} disabled={!user} className="px-4 py-2 bg-slate-600 hover:bg-slate-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition">{user ? '로그아웃 실행' : '비로그인 상태'}</button>
            </div>
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border gap-4 sm:gap-0 ${isDarkMode ? 'bg-rose-950/30 border-rose-900/50' : 'bg-rose-50 border-rose-200'}`}>
              <div><div className="font-medium text-rose-500">계정 정보 초기화</div><div className={`text-sm ${isDarkMode ? 'text-rose-500/80' : 'text-rose-600/80'}`}>보유한 덱과 모든 재화가 삭제됩니다</div></div>
              <button onClick={handleResetData} className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/40 text-rose-500 border border-rose-500/50 rounded-lg text-sm font-semibold transition">데이터 초기화</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}