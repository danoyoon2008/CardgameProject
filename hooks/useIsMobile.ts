"use client";

import { useEffect, useState } from "react";

/**
 * PC/모바일 판정 — 화면 너비가 아닌 "입력 장치 특성"으로 구분한다.
 * 화면 크기로 가르면 큰 태블릿(가로)이 PC로 오인되므로, 터치+호버 기준을 쓴다.
 *
 * - 폰/태블릿: 터치 가능 + 마우스 호버 없음(pointer: coarse) → 모바일
 * - 데스크톱/노트북: 마우스 호버 있음(pointer: fine) → PC
 * - 터치 노트북(2-in-1): 호버 있음 → PC (의도된 동작)
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      const isTouch = navigator.maxTouchPoints > 0 || "ontouchstart" in window;

      // 주 입력 장치가 정밀하지 않음(손가락) + 호버 불가 → 모바일 신호
      let coarseOrNoHover = false;
      if (typeof window.matchMedia === "function") {
        const coarse = window.matchMedia("(pointer: coarse)").matches;
        const noHover = window.matchMedia("(hover: none)").matches;
        coarseOrNoHover = coarse || noHover;
      } else {
        // matchMedia 미지원 환경 폴백: 터치만으로 판정
        coarseOrNoHover = isTouch;
      }

      // 터치가 가능하면서, 마우스 호버가 주가 아닌 경우만 모바일
      setIsMobile(isTouch && coarseOrNoHover);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return isMobile;
}
