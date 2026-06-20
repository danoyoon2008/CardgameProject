"use client";

import type { CardRow } from "../../types/game";
import { GuardedImg } from "../ui/GuardedImg";
import { BS_RYEOMHWA, resolveBossImageUrl } from "../../utils/boss/bossDefs";

export default function BossSelectView({
  cards,
  cardsLoading = false,
  onEnterBoss,
}: {
  cards: CardRow[];
  cardsLoading?: boolean;
  onEnterBoss: () => void;
}) {
  const ryeomhwaImg = resolveBossImageUrl(BS_RYEOMHWA, cards);

  if (cardsLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 p-8">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-rose-500 border-t-transparent" />
        <p className="animate-pulse font-bold tracking-widest text-rose-400">
          보스 카드 데이터를 불러오는 중...
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-6 p-8">
      <h1 className="mb-4 text-3xl font-black text-white">보스 토벌전</h1>
      <div className="flex items-stretch justify-center gap-8">
        <button
          type="button"
          onClick={onEnterBoss}
          className="group relative flex h-[420px] w-[260px] flex-col items-center justify-end overflow-hidden rounded-2xl border-2 border-rose-500/60 bg-slate-900 shadow-[0_0_30px_rgba(225,29,72,0.35)] transition-transform duration-300 hover:scale-105 hover:shadow-[0_0_50px_rgba(225,29,72,0.6)]"
        >
          {ryeomhwaImg && (
            <GuardedImg
              src={ryeomhwaImg}
              alt={BS_RYEOMHWA.name}
              className="absolute inset-0 h-full w-full object-cover opacity-90"
            />
          )}
          <div className="relative z-10 w-full bg-gradient-to-t from-black/90 to-transparent p-4 text-center">
            <div className="text-xl font-black text-rose-100">{BS_RYEOMHWA.name}</div>
            <div className="mt-2 inline-block rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white group-hover:bg-rose-500">
              입장하기
            </div>
          </div>
        </button>

        {[1, 2].map(i => (
          <div
            key={i}
            className="flex h-[420px] w-[260px] flex-col items-center justify-center rounded-2xl border-2 border-slate-700 bg-slate-900/60 grayscale"
          >
            <span className="text-5xl">🔒</span>
            <span className="mt-3 text-sm font-bold text-slate-500">잠금</span>
          </div>
        ))}
      </div>
    </div>
  );
}
