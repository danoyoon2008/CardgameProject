// components/layout/Sidebar.tsx
"use client";

import { MainView } from "../../types/game";
import { mobileNavItems } from "./mobile/mobileNavItems";

interface SidebarProps {
  mainView: MainView;
  setMainView: (view: MainView) => void;
  isDarkMode: boolean;
  newCardIdsSize: number;
  isDeveloper?: boolean;
}

export default function Sidebar({ mainView, setMainView, isDarkMode, newCardIdsSize, isDeveloper = false }: SidebarProps) {
  return (
    <aside className={`order-2 flex shrink-0 flex-col rounded-2xl border p-4 lg:order-1 lg:w-56 lg:shrink-0 lg:self-start transition-colors duration-500 ${isDarkMode ? "border-white/10 bg-white/5 backdrop-blur-sm" : "border-slate-300 bg-white shadow-sm"}`}>
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">메뉴</h2>
      <nav className="flex flex-col gap-1">
        {mobileNavItems
          .filter((item) => !item.developerOnly || isDeveloper)
          .map(({ view, label, Icon }) => (
          <button key={view} type="button" onClick={() => setMainView(view)} className={`group flex min-h-[44px] flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition lg:flex-none lg:flex-initial lg:w-full relative ${mainView === view ? (isDarkMode ? "bg-sky-500/20 text-white ring-1 ring-sky-400/40" : "bg-sky-500 text-white shadow-md") : (isDarkMode ? "text-slate-200 hover:bg-white/10 active:bg-white/15" : "text-slate-600 hover:bg-slate-100 active:bg-slate-200")}`}>
            <div className="relative">
              <Icon className={`h-5 w-5 shrink-0 ${mainView === view ? "text-white" : "text-sky-500"}`} />
              {view === "codex" && newCardIdsSize > 0 && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-rose-500 ring-[1.5px] ring-[#0d1f3c] animate-pulse"></span>
              )}
            </div>
            <span className="font-medium">{label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
