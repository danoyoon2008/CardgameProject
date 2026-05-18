"use client";

/**
 * 에리스티나 — 기본 공격 적중 시 대상 카드 위 핑크 대각선 연출
 * 1차: 왼쪽 아래 → 오른쪽 위 / 2차: 50% 동일, 50% 오른쪽 아래 → 왼쪽 위
 */
import { useCallback, useRef, useState } from "react";
import type { FieldCard } from "../../../types/game";
import { ERISTINA_ID } from "./eristina";
import "./eristina.hit-line.css";

/** CSS 애니메이션 길이와 맞춤 (`eristina.hit-line.css` 의 vfx 시간) */
export const ERISTINA_HIT_LINE_DURATION_MS = 560;

export type EristinaHitDiagonal = "bl-tr" | "br-tl";

export interface EristinaHitLineBurst {
  id: number;
  diagonal: EristinaHitDiagonal;
}

export function shouldTriggerEristinaHitLine(
  attacker: FieldCard | null | undefined,
  damageDealt: number
): boolean {
  return damageDealt > 0 && attacker != null && attacker.name === ERISTINA_ID;
}

function pickSecondaryDiagonal(): EristinaHitDiagonal {
  return Math.random() < 0.5 ? "bl-tr" : "br-tl";
}

export function EristinaHitLineOverlay({
  slotKey,
  burst,
  roundedClass,
}: {
  slotKey: string;
  burst: EristinaHitLineBurst | undefined;
  roundedClass: string;
}) {
  if (burst == null) return null;
  const isBlTr = burst.diagonal === "bl-tr";
  return (
    <div
      key={`${slotKey}-eristina-line-${burst.id}-${burst.diagonal}`}
      className={`pointer-events-none absolute inset-0 z-[24] overflow-visible ${roundedClass}`}
      aria-hidden
    >
      <svg className="pp-eristina-hit-line__svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        {isBlTr ? (
          <line
            pathLength={1}
            x1="1"
            y1="99"
            x2="99"
            y2="1"
            className="pp-eristina-hit-line__stroke"
          />
        ) : (
          <line
            pathLength={1}
            x1="99"
            y1="99"
            x2="1"
            y2="1"
            className="pp-eristina-hit-line__stroke"
          />
        )}
      </svg>
    </div>
  );
}

export function useEristinaHitLine() {
  const [burst, setBurst] = useState<Record<string, EristinaHitLineBurst>>({});
  const seqRef = useRef(0);
  const timeoutsRef = useRef<Record<string, number>>({});

  const trigger = useCallback(
    (
      attacker: FieldCard | null | undefined,
      targetSlotKey: string,
      damageDealt: number,
      phase: "primary" | "secondary"
    ) => {
      if (!shouldTriggerEristinaHitLine(attacker, damageDealt)) return;
      const diagonal: EristinaHitDiagonal = phase === "primary" ? "bl-tr" : pickSecondaryDiagonal();
      const prevT = timeoutsRef.current[targetSlotKey];
      if (prevT) window.clearTimeout(prevT);
      const id = ++seqRef.current;
      setBurst(f => ({ ...f, [targetSlotKey]: { id, diagonal } }));
      timeoutsRef.current[targetSlotKey] = window.setTimeout(() => {
        setBurst(f => {
          const next = { ...f };
          delete next[targetSlotKey];
          return next;
        });
        delete timeoutsRef.current[targetSlotKey];
      }, ERISTINA_HIT_LINE_DURATION_MS);
    },
    []
  );

  const clearAll = useCallback(() => {
    Object.values(timeoutsRef.current).forEach(t => window.clearTimeout(t));
    timeoutsRef.current = {};
    setBurst({});
  }, []);

  const renderOverlay = useCallback(
    (slotKey: string, roundedClass: string) => (
      <EristinaHitLineOverlay slotKey={slotKey} burst={burst[slotKey]} roundedClass={roundedClass} />
    ),
    [burst]
  );

  return { trigger, renderOverlay, clearAll };
}
