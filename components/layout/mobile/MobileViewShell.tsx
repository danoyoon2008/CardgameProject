"use client";

import type { ReactNode } from "react";
import { MOBILE_LOBBY_BASE_W, MOBILE_LOBBY_PAD_X } from "./mobileLobbyConstants";

type MobileViewShellProps = {
  children: ReactNode;
  isDarkMode: boolean;
};

/** 모바일 로비 각 탭 콘텐츠 공통 배경·너비 */
export default function MobileViewShell({ children, isDarkMode }: MobileViewShellProps) {
  return (
    <div
      style={{
        width: MOBILE_LOBBY_BASE_W,
        boxSizing: "border-box",
        paddingLeft: MOBILE_LOBBY_PAD_X,
        paddingRight: MOBILE_LOBBY_PAD_X,
        paddingTop: 16,
        paddingBottom: 32,
        background: isDarkMode
          ? "linear-gradient(180deg, #0a1628 0%, #0d1f3c 45%, #050a14 100%)"
          : "linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%)",
        minHeight: 480,
      }}
    >
      {children}
    </div>
  );
}
