// components/layout/Sidebar.tsx
"use client";

import { MainView } from "../../types/game";
import { IconHome, IconShop, IconDeck, IconBook, IconSettings } from "../ui/Icons";
import {
  MOBILE_LOBBY_BASE_W,
  MOBILE_LOBBY_PAD_X,
  MOBILE_NAV_BTN_H,
  MOBILE_NAV_BTN_FS,
  MOBILE_NAV_ICON,
  MOBILE_NAV_GAP,
} from "./mobile/mobileLobbyConstants";

const navItems: { view: MainView; label: string; Icon: any }[] = [
  { view: "battle", label: "대전 센터", Icon: IconHome },
  { view: "shop", label: "상점/뽑기", Icon: IconShop },
  { view: "deck", label: "덱 구성", Icon: IconDeck },
  { view: "codex", label: "카드 도감", Icon: IconBook },
  { view: "settings", label: "환경 설정", Icon: IconSettings },
];

interface SidebarProps {
  mainView: MainView;
  setMainView: (view: MainView) => void;
  isDarkMode: boolean;
  newCardIdsSize: number;
  layoutMobile?: boolean;
}

export default function Sidebar({ mainView, setMainView, isDarkMode, newCardIdsSize, layoutMobile = false }: SidebarProps) {
  if (layoutMobile) {
    return (
      <nav
        style={{
          width: MOBILE_LOBBY_BASE_W,
          boxSizing: "border-box",
          paddingLeft: MOBILE_LOBBY_PAD_X,
          paddingRight: MOBILE_LOBBY_PAD_X,
          paddingTop: 12,
          paddingBottom: 12,
          display: "flex",
          flexDirection: "column",
          gap: MOBILE_NAV_GAP,
          flexShrink: 0,
        }}
        aria-label="메뉴"
      >
        {navItems.map(({ view, label, Icon }) => {
          const active = mainView === view;
          return (
            <button
              key={view}
              type="button"
              onClick={() => setMainView(view)}
              style={{
                width: "100%",
                height: MOBILE_NAV_BTN_H,
                paddingLeft: 14,
                paddingRight: 14,
                borderRadius: 12,
                border: active
                  ? isDarkMode
                    ? "1px solid rgba(56,189,248,0.5)"
                    : "1px solid #0ea5e9"
                  : isDarkMode
                    ? "1px solid rgba(255,255,255,0.08)"
                    : "1px solid #e2e8f0",
                background: active
                  ? isDarkMode
                    ? "rgba(14,165,233,0.2)"
                    : "#0ea5e9"
                  : isDarkMode
                    ? "rgba(255,255,255,0.05)"
                    : "#ffffff",
                display: "flex",
                alignItems: "center",
                gap: 12,
                textAlign: "left",
              }}
            >
              <div style={{ position: "relative", width: MOBILE_NAV_ICON, height: MOBILE_NAV_ICON, flexShrink: 0 }}>
                <Icon className={`h-5 w-5 shrink-0 ${active ? "text-white" : "text-sky-500"}`} />
                {view === "codex" && newCardIdsSize > 0 ? (
                  <span
                    style={{
                      position: "absolute",
                      top: -2,
                      right: -2,
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: "#f43f5e",
                      border: "1.5px solid #0d1f3c",
                    }}
                  />
                ) : null}
              </div>
              <span
                style={{
                  fontSize: MOBILE_NAV_BTN_FS,
                  fontWeight: 500,
                  color: active ? "#fff" : isDarkMode ? "#e2e8f0" : "#475569",
                }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    );
  }

  return (
    <aside className={`order-2 flex shrink-0 flex-col rounded-2xl border p-4 lg:order-1 lg:w-56 lg:shrink-0 lg:self-start transition-colors duration-500 ${isDarkMode ? "border-white/10 bg-white/5 backdrop-blur-sm" : "border-slate-300 bg-white shadow-sm"}`}>
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">메뉴</h2>
      <nav className="flex flex-col gap-1">
        {navItems.map(({ view, label, Icon }) => (
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