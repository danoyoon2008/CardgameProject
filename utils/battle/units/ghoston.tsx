"use client";

/**
 * 고스톤 — 전투 규칙 + 기본 공격 적중 손톱 피격 연출
 */
import { useCallback, useRef, useState } from "react";
import type { FieldCard } from "../../../types/game";
import { UNIT } from "../unitIds";
import "./ghoston.claw-hit.css";

export const GHOSTONE_ID = UNIT.GHOSTONE;

/** CSS `--pp-gs-claw-dur` 와 맞춤: 애니 끝 + 약간 여유 후 오버레이 제거 */
export const GHOSTONE_CLAW_HIT_DURATION_MS = 430;

export type GhostoneClawHitStance = "primary" | "secondary";

export function shouldTriggerGhostoneClawHit(
  attacker: FieldCard | null | undefined,
  damageDealt: number
): boolean {
  return damageDealt > 0 && attacker != null && attacker.name === GHOSTONE_ID;
}

export interface GhostoneClawHitBursts {
  id: number;
  stance: GhostoneClawHitStance;
}

export interface GhostoneClawHitOverlayProps {
  slotKey: string;
  burst: GhostoneClawHitBursts | undefined;
  roundedClass: string;
}

export function GhostoneClawHitOverlay({ slotKey, burst, roundedClass }: GhostoneClawHitOverlayProps) {
  if (burst == null) return null;
  const clusterClass =
    burst.stance === "secondary"
      ? "pp-gs-claw-cluster pp-gs-claw-cluster--secondary"
      : "pp-gs-claw-cluster";
  return (
    <div
      key={`${slotKey}-ghoston-${burst.id}-${burst.stance}`}
      className={`pointer-events-none absolute inset-0 z-[24] overflow-hidden ${roundedClass}`}
      aria-hidden
    >
      <div className="pp-gs-claw-hit">
        <div className={clusterClass}>
          <div className="pp-gs-claw-arm">
            <span className="pp-gs-claw-line" />
          </div>
          <div className="pp-gs-claw-arm">
            <span className="pp-gs-claw-line" />
          </div>
          <div className="pp-gs-claw-arm">
            <span className="pp-gs-claw-line" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function useGhostoneClawHit() {
  const [burst, setBurst] = useState<Record<string, GhostoneClawHitBursts>>({});
  const seqRef = useRef(0);
  const timeoutsRef = useRef<Record<string, number>>({});

  const trigger = useCallback(
    (
      attacker: FieldCard | null | undefined,
      targetSlotKey: string,
      damageDealt: number,
      stance: GhostoneClawHitStance = "primary"
    ) => {
      if (!shouldTriggerGhostoneClawHit(attacker, damageDealt)) return;
      const prevT = timeoutsRef.current[targetSlotKey];
      if (prevT) window.clearTimeout(prevT);
      const id = ++seqRef.current;
      setBurst(f => ({ ...f, [targetSlotKey]: { id, stance } }));
      timeoutsRef.current[targetSlotKey] = window.setTimeout(() => {
        setBurst(f => {
          const next = { ...f };
          delete next[targetSlotKey];
          return next;
        });
        delete timeoutsRef.current[targetSlotKey];
      }, GHOSTONE_CLAW_HIT_DURATION_MS);
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
      <GhostoneClawHitOverlay slotKey={slotKey} burst={burst[slotKey]} roundedClass={roundedClass} />
    ),
    [burst]
  );

  return { trigger, renderOverlay, clearAll };
}
