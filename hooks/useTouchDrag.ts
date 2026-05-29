"use client";

import { useCallback, useRef } from "react";

const HOLD_MS = 300;
const MOVE_CANCEL_PX = 10;

export type UseTouchDragHandlers = {
  onTap?: (e: React.TouchEvent) => void;
  onDragStart?: (e: React.TouchEvent) => void;
  onDragMove?: (e: React.TouchEvent) => void;
  onDragEnd?: (e: React.TouchEvent) => void;
  disabled?: boolean;
};

/** 터치 탭과 길게 눌러 드래그를 구분 (300ms 홀드 → 드래그, 10px 이동 시 홀드 취소) */
export function useTouchDrag(handlers: UseTouchDragHandlers) {
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const isDragging = useRef(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const clearHold = useCallback(() => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (handlersRef.current.disabled) return;
      const t = e.touches[0];
      if (!t) return;
      e.stopPropagation();
      touchStartPos.current = { x: t.clientX, y: t.clientY };
      isDragging.current = false;
      clearHold();
      holdTimer.current = setTimeout(() => {
        holdTimer.current = null;
        isDragging.current = true;
        handlersRef.current.onDragStart?.(e);
      }, HOLD_MS);
    },
    [clearHold]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (handlersRef.current.disabled || !touchStartPos.current) return;
      const t = e.touches[0];
      if (!t) return;
      const dx = t.clientX - touchStartPos.current.x;
      const dy = t.clientY - touchStartPos.current.y;
      if (!isDragging.current && Math.hypot(dx, dy) >= MOVE_CANCEL_PX) {
        clearHold();
      }
      if (isDragging.current) {
        e.preventDefault();
        handlersRef.current.onDragMove?.(e);
      }
    },
    [clearHold]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      clearHold();
      if (isDragging.current) {
        isDragging.current = false;
        handlersRef.current.onDragEnd?.(e);
      } else {
        handlersRef.current.onTap?.(e);
      }
      touchStartPos.current = null;
    },
    [clearHold]
  );

  const handleTouchCancel = useCallback(
    (e: React.TouchEvent) => {
      clearHold();
      if (isDragging.current) {
        isDragging.current = false;
        handlersRef.current.onDragEnd?.(e);
      }
      touchStartPos.current = null;
    },
    [clearHold]
  );

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
  };
}
