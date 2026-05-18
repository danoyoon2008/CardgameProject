"use client";

/**
 * 아이버슨 — 기본 공격 적중: 고스톤과 동형 3직선 손톱 자국(녹색·약간 큼)
 */
import { useCallback, useRef, useState } from "react";
import type { FieldCard } from "../../../types/game";
import { IVERSON_ID } from "./iverson";
import "./iverson.claw-hit.css";

/** `ghoston` 의 `GHOSTONE_CLAW_HIT_DURATION_MS` 와 동일 타이밍 */
export const IVERSON_CLAW_HIT_DURATION_MS = 430;

export type IversonClawHitStance = "primary" | "secondary";

export function shouldTriggerIversonClawHit(attacker: FieldCard | null | undefined, damageDealt: number): boolean {
  return damageDealt > 0 && attacker != null && attacker.name === IVERSON_ID;
}

export interface IversonClawHitBursts {
  id: number;
  stance: IversonClawHitStance;
  /** 재생 시점마다 50% — 전체 연출 좌우 반전 */
  flipHorizontal: boolean;
}

export interface IversonClawHitOverlayProps {
  slotKey: string;
  burst: IversonClawHitBursts | undefined;
  roundedClass: string;
}

export function IversonClawHitOverlay({ slotKey, burst, roundedClass }: IversonClawHitOverlayProps) {
  if (burst == null) return null;
  const clusterClass =
    burst.stance === "secondary"
      ? "pp-iv-claw-cluster pp-iv-claw-cluster--secondary"
      : "pp-iv-claw-cluster";
  return (
    <div
      key={`${slotKey}-iverson-claw-${burst.id}-${burst.stance}-${burst.flipHorizontal ? "f" : "n"}`}
      className={`pointer-events-none absolute inset-0 z-[24] overflow-hidden ${roundedClass}`}
      aria-hidden
    >
      <div className="pp-iv-claw-hit">
        {burst.flipHorizontal ? (
          <div className="pp-iv-claw-mirror">
            <div className={clusterClass}>
              <div className="pp-iv-claw-arm">
                <span className="pp-iv-claw-line" />
              </div>
              <div className="pp-iv-claw-arm">
                <span className="pp-iv-claw-line" />
              </div>
              <div className="pp-iv-claw-arm">
                <span className="pp-iv-claw-line" />
              </div>
            </div>
          </div>
        ) : (
          <div className={clusterClass}>
            <div className="pp-iv-claw-arm">
              <span className="pp-iv-claw-line" />
            </div>
            <div className="pp-iv-claw-arm">
              <span className="pp-iv-claw-line" />
            </div>
            <div className="pp-iv-claw-arm">
              <span className="pp-iv-claw-line" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function useIversonClawHit() {
  const [burst, setBurst] = useState<Record<string, IversonClawHitBursts>>({});
  const seqRef = useRef(0);
  const timeoutsRef = useRef<Record<string, number>>({});

  const trigger = useCallback(
    (
      attacker: FieldCard | null | undefined,
      targetSlotKey: string,
      damageDealt: number,
      stance: IversonClawHitStance = "primary"
    ) => {
      if (!shouldTriggerIversonClawHit(attacker, damageDealt)) return;
      const prevT = timeoutsRef.current[targetSlotKey];
      if (prevT) window.clearTimeout(prevT);
      const id = ++seqRef.current;
      const flipHorizontal = Math.random() < 0.5;
      setBurst(f => ({ ...f, [targetSlotKey]: { id, stance, flipHorizontal } }));
      timeoutsRef.current[targetSlotKey] = window.setTimeout(() => {
        setBurst(f => {
          const next = { ...f };
          delete next[targetSlotKey];
          return next;
        });
        delete timeoutsRef.current[targetSlotKey];
      }, IVERSON_CLAW_HIT_DURATION_MS);
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
      <IversonClawHitOverlay slotKey={slotKey} burst={burst[slotKey]} roundedClass={roundedClass} />
    ),
    [burst]
  );

  return { trigger, renderOverlay, clearAll };
}
