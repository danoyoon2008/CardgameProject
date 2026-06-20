"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { MainView } from "../../../types/game";
import { mobileNavItems } from "./mobileNavItems";
import { MOBILE_NAV_BTN_FS, MOBILE_NAV_BTN_H, MOBILE_NAV_GAP } from "./mobileLobbyConstants";

const DRAWER_W = 240;

type MobileLobbyDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  mainView: MainView;
  setMainView: (view: MainView) => void;
  isDarkMode: boolean;
  newCardIdsSize: number;
  isDeveloper?: boolean;
};

export default function MobileLobbyDrawer({
  isOpen,
  onClose,
  mainView,
  setMainView,
  isDarkMode,
  newCardIdsSize,
  isDeveloper = false,
}: MobileLobbyDrawerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!mounted) return null;

  /** PC 사이드바와 동일: dark — border-white/10 bg-white/5 */
  const drawerBg = isDarkMode ? "rgba(10, 22, 40, 0.97)" : "#ffffff";
  const drawerBorder = isDarkMode ? "rgba(255,255,255,0.1)" : "#cbd5e1";

  return createPortal(
    <>
      <div
        role="presentation"
        aria-hidden={!isOpen}
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9998,
          backgroundColor: "rgba(0,0,0,0.55)",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity 300ms ease",
        }}
      />
      <nav
        aria-label="메뉴"
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          width: DRAWER_W,
          height: "100%",
          zIndex: 9999,
          boxSizing: "border-box",
          paddingTop: 16,
          paddingBottom: 16,
          paddingLeft: 12,
          paddingRight: 12,
          borderRight: `1px solid ${drawerBorder}`,
          background: isDarkMode
            ? "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.05) 100%), rgba(10, 22, 40, 0.97)"
            : drawerBg,
          backdropFilter: isDarkMode ? "blur(12px)" : "none",
          WebkitBackdropFilter: isDarkMode ? "blur(12px)" : "none",
          boxShadow: isOpen ? "4px 0 24px rgba(0,0,0,0.45)" : "none",
          transform: isOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 300ms ease",
          display: "flex",
          flexDirection: "column",
          gap: MOBILE_NAV_GAP,
          overflowY: "auto",
        }}
      >
        <h2
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#94a3b8",
            margin: "0 0 8px 4px",
          }}
        >
          메뉴
        </h2>
        {mobileNavItems
          .filter((item) => !item.developerOnly || isDeveloper)
          .map(({ view, label, Icon }) => {
          const active = mainView === view;
          return (
            <button
              key={view}
              type="button"
              onClick={() => {
                setMainView(view);
                onClose();
              }}
              style={{
                width: "100%",
                height: MOBILE_NAV_BTN_H,
                paddingLeft: 12,
                paddingRight: 12,
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
                    : "#f8fafc",
                display: "flex",
                alignItems: "center",
                gap: 12,
                textAlign: "left",
              }}
            >
              <div style={{ position: "relative", flexShrink: 0 }}>
                <Icon className={`h-5 w-5 shrink-0 ${active ? "text-white" : "text-sky-500"}`} />
                {view === "codex" && newCardIdsSize > 0 ? (
                  <span
                    style={{
                      position: "absolute",
                      top: -4,
                      right: -4,
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
    </>,
    document.body
  );
}
