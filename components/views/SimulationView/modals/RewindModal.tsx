"use client";

import { useState } from "react";
import { GuardedImg } from "../../../ui/GuardedImg";
import { IconDeck } from "../../../ui/Icons";
import type { CardRow } from "../../../../types/game";

export type RewindModalProps = {
  onClose: () => void;
  rewindCards: CardRow[];
  onOpenDetail?: (card: CardRow) => void;
  /** 귀환 — 부활 가능한 rewindCards 인덱스 */
  revivableIndices?: number[];
  onSelectRevive?: (rewindIndex: number) => void;
};

export default function RewindModal({
  onClose,
  rewindCards,
  onOpenDetail,
  revivableIndices,
  onSelectRevive,
}: RewindModalProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const revivableSet = new Set(revivableIndices ?? []);
  const isGuihwanPickMode = onSelectRevive != null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out] p-4 md:p-8"
      onClick={() => {
        if (selectedIdx !== null) {
          setSelectedIdx(null);
        } else {
          onClose();
        }
      }}
    >
      <div
        className="relative w-full max-w-[1200px] h-[85vh] bg-[#0a1628] border-2 border-slate-700 rounded-3xl p-6 md:p-10 flex flex-col shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4 shrink-0">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-200 tracking-wider">리와인드 존</h2>
            <p className="text-slate-400 text-sm mt-1">
              총 <span className="text-sky-400 font-bold">{rewindCards.length}</span>장의 카드가 파괴되어
              잠들어 있습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-colors active:scale-95 border border-slate-600"
          >
            ✕ 닫기
          </button>
        </div>

        <div className="overflow-y-auto flex-1 pr-2 w-full custom-scrollbar">
          {rewindCards.length === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 opacity-60">
              <IconDeck className="w-20 h-20 mb-4" />
              <p className="font-bold text-xl tracking-wider">파괴된 카드가 없습니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 pb-10">
              {rewindCards.map((rCard, idx) => {
                const canRevive = revivableSet.has(idx);
                const isGuihwanRevivable = isGuihwanPickMode && canRevive;
                const isGuihwanNonRevivable = isGuihwanPickMode && !canRevive;

                const cardClass = [
                  "group relative w-full aspect-[1/1.58] rounded-[10px] border bg-black/50 overflow-hidden transition-all duration-300",
                  isGuihwanNonRevivable
                    ? "border-slate-600 opacity-55 cursor-default"
                    : isGuihwanRevivable
                      ? "border-slate-600 cursor-default pp-guihwan-rewind-pick-outline hover:-translate-y-2 hover:shadow-[0_15px_30px_rgba(0,0,0,0.6)] hover:border-slate-300"
                      : "border-slate-600 cursor-pointer hover:-translate-y-2 hover:shadow-[0_15px_30px_rgba(0,0,0,0.6)] hover:border-slate-300",
                ].join(" ");

                const imageClass = isGuihwanNonRevivable
                  ? "w-full h-full object-cover grayscale"
                  : isGuihwanRevivable
                    ? "w-full h-full object-cover grayscale-[0.15] group-hover:grayscale-0 transition-all duration-300"
                    : "w-full h-full object-cover grayscale-[0.4] group-hover:grayscale-0 transition-all duration-300";

                const nameClass = isGuihwanNonRevivable
                  ? "text-sm font-bold text-center text-slate-500"
                  : "text-sm font-bold text-center text-slate-400 group-hover:text-slate-200";

                return (
                  <div
                    key={`rewind-${idx}`}
                    className={cardClass}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isGuihwanNonRevivable) return;
                      setSelectedIdx(prev => (prev === idx ? null : idx));
                    }}
                  >
                    {rCard.image_url ? (
                      <GuardedImg src={rCard.image_url} alt={rCard.name} className={imageClass} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-4">
                        <span className={nameClass}>{rCard.name}</span>
                      </div>
                    )}

                    {isGuihwanRevivable ? (
                      <div className="pointer-events-none absolute inset-0 rounded-[10px] pp-guihwan-rewind-pick-outline-inner" />
                    ) : null}

                    {onOpenDetail || isGuihwanRevivable ? (
                      <div
                        className={`absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 backdrop-blur-[2px] transition-opacity ${
                          selectedIdx === idx
                            ? "opacity-100 pointer-events-auto"
                            : "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto"
                        }`}
                      >
                        {onOpenDetail ? (
                          <button
                            type="button"
                            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-black tracking-widest rounded-xl shadow-lg border border-white/20 transition-colors"
                            onClick={e => {
                              e.stopPropagation();
                              onOpenDetail(rCard);
                            }}
                          >
                            상세 보기
                          </button>
                        ) : null}
                        {isGuihwanRevivable ? (
                          <button
                            type="button"
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-black tracking-widest rounded-xl shadow-lg border border-indigo-200/30 transition-colors"
                            onClick={e => {
                              e.stopPropagation();
                              onSelectRevive(idx);
                            }}
                          >
                            선택
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
