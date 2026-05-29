"use client";

import { useEffect } from "react";

/** 모바일 카드 선택 오버레이 — 카드 셀 바깥(검은 여백·헤더·필터 등) 터치/클릭 시 해제 */
export function useMobileCardSelectionDismiss(
  isSelectionActive: boolean,
  onClear: () => void,
  enabled = true
) {
  useEffect(() => {
    if (!enabled || !isSelectionActive) return;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest("[data-mobile-card-cell]")) {
        onClear();
      }
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [enabled, isSelectionActive, onClear]);
}
