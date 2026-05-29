"use client";

import { useEffect, useState } from "react";

/** SimulationView와 동일: 터치 기기 + 뷰포트 너비 1280px 미만 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      const isTouch = navigator.maxTouchPoints > 0 || "ontouchstart" in window;
      const isNarrow = window.innerWidth < 1280;
      setIsMobile(isTouch && isNarrow);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return isMobile;
}
