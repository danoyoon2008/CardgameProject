"use client";

/**
 * 모모 — 기본 공격 적중 연출(다이아고 화염과 동형, 갈색).
 */
import { useCallback, useRef, useState } from "react";
import type { FieldCard } from "../../../types/game";
import { MOMO_ID } from "./momo";
import "./momo.hit-flame.css";

export const MOMO_HIT_FLAME_DURATION_MS = 520;

export function shouldTriggerMomoHitFlame(
  attacker: FieldCard | null | undefined,
  damageDealt: number
): boolean {
  return damageDealt > 0 && attacker != null && attacker.name === MOMO_ID;
}

export function MomoHitFlameOverlay({
  slotKey,
  burstId,
  roundedClass,
}: {
  slotKey: string;
  burstId: number | undefined;
  roundedClass: string;
}) {
  if (burstId == null) return null;
  return (
    <div
      key={`${slotKey}-momo-flame-${burstId}`}
      className={`pointer-events-none absolute inset-0 z-[24] flex items-center justify-center overflow-hidden ${roundedClass}`}
      aria-hidden
    >
      <div className="pp-momo-flame-wrap">
        <span className="pp-momo-flame-core" />
        <span className="pp-momo-flame-ring" />
        <span className="pp-momo-flame-spark pp-momo-flame-spark--1" />
        <span className="pp-momo-flame-spark pp-momo-flame-spark--2" />
        <span className="pp-momo-flame-spark pp-momo-flame-spark--3" />
      </div>
    </div>
  );
}

export function useMomoHitFlame() {
  const [burst, setBurst] = useState<Record<string, number>>({});
  const seqRef = useRef(0);
  const timeoutsRef = useRef<Record<string, number>>({});

  const trigger = useCallback(
    (attacker: FieldCard | null | undefined, targetSlotKey: string, damageDealt: number) => {
      if (!shouldTriggerMomoHitFlame(attacker, damageDealt)) return;
      const prevT = timeoutsRef.current[targetSlotKey];
      if (prevT) window.clearTimeout(prevT);
      const id = ++seqRef.current;
      setBurst(f => ({ ...f, [targetSlotKey]: id }));
      timeoutsRef.current[targetSlotKey] = window.setTimeout(() => {
        setBurst(f => {
          const next = { ...f };
          delete next[targetSlotKey];
          return next;
        });
        delete timeoutsRef.current[targetSlotKey];
      }, MOMO_HIT_FLAME_DURATION_MS);
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
      <MomoHitFlameOverlay slotKey={slotKey} burstId={burst[slotKey]} roundedClass={roundedClass} />
    ),
    [burst]
  );

  return { trigger, renderOverlay, clearAll };
}
