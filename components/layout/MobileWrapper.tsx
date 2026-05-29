"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const MOBILE_BASE_W = 540;
const MOBILE_LOBBY_CLASS = "pp-mobile-lobby";

type MobileWrapperProps = {
  children: ReactNode;
};

export default function MobileWrapper({ children }: MobileWrapperProps) {
  const [mobileScale, setMobileScale] = useState(1);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const outerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateScale = () => {
      setMobileScale(Math.min(window.innerWidth / MOBILE_BASE_W, 1));
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  useEffect(() => {
    document.documentElement.classList.add(MOBILE_LOBBY_CLASS);
    document.body.classList.add(MOBILE_LOBBY_CLASS);
    return () => {
      document.documentElement.classList.remove(MOBILE_LOBBY_CLASS);
      document.body.classList.remove(MOBILE_LOBBY_CLASS);
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;

    const onTouchMove = (e: TouchEvent) => {
      const start = touchStartRef.current;
      const t = e.touches[0];
      if (!start || !t) return;
      const deltaX = t.clientX - start.x;
      const deltaY = t.clientY - start.y;
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        e.preventDefault();
      }
    };

    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", onTouchMove);
  }, []);

  return (
    <div
      ref={outerRef}
      onTouchStart={handleTouchStart}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "black",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        overflow: "hidden",
        touchAction: "none",
      }}
    >
      <div
        style={{
          width: MOBILE_BASE_W,
          minHeight: "100vh",
          transformOrigin: "top center",
          transform: `scale(${mobileScale})`,
          flexShrink: 0,
          overflowY: "auto",
          overflowX: "hidden",
          touchAction: "pan-y",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {children}
      </div>
    </div>
  );
}
