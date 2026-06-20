"use client";

import { useMemo } from "react";
import type { CardRow } from "../../types/game";
import { BS_RYEOMHWA } from "../../utils/boss/bossDefs";
import { buildMvpTestHand, initBossRaidState } from "../../utils/boss/bossRaidInit";

type BossRaidViewProps = {
  cards: CardRow[];
};

export default function BossRaidView({ cards }: BossRaidViewProps) {
  const raidState = useMemo(
    () => initBossRaidState(BS_RYEOMHWA, cards, buildMvpTestHand(cards)),
    [cards]
  );

  const bossCard = raidState.bossField.m;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-white">
      <h1 className="text-4xl font-black">보스 토벌전</h1>
      <p className="text-slate-400">개발 중 — 곧 보스가 등장합니다.</p>
      <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-6 py-4 text-sm text-slate-300">
        <p>
          <span className="font-bold text-amber-300">{bossCard?.name ?? raidState.bossId}</span>
          {" · "}
          HP {raidState.bossHp}/{raidState.bossMaxHp}
          {" · "}
          턴 {raidState.turnCount} ({raidState.phase})
        </p>
        <p className="mt-2">테스트 핸드: {raidState.playerHand.length}장</p>
      </div>
    </div>
  );
}
