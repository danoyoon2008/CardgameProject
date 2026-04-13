// components/views/SettingsView.tsx
"use client";

import type { User } from "@supabase/supabase-js";
import { IconSettings, IconUser } from "../ui/Icons";

interface SettingsViewProps {
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  volume: number;
  setVolume: (val: number) => void;
  user: User | null;
  handleEditNickname: () => void;
  handleLogout: () => void;
  handleResetData: () => void;
}

export default function SettingsView({
  isDarkMode, setIsDarkMode, volume, setVolume,
  user, handleEditNickname, handleLogout, handleResetData
}: SettingsViewProps) {
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
              <div><div className="font-medium">닉네임 변경</div><div className="text-sm text-slate-500">게임 내에서 표시될 이름을 설정합니다</div></div>
              <button onClick={handleEditNickname} disabled={!user} className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition">{user ? '변경하기' : '비로그인 상태'}</button>
            </div>
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