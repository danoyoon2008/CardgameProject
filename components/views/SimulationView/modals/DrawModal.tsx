import React from 'react';
import { GuardedImg } from "../../../ui/GuardedImg";
import { IconDeck } from "../../../ui/Icons";
import { CardRow } from "../../../../types/game";

interface DrawModalProps {
  onClose: () => void;
  deckCards: CardRow[];
  onExecuteDraw: (index: number) => void;
}

export default function DrawModal({ onClose, deckCards, onExecuteDraw }: DrawModalProps) {
  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-[4px] animate-[fadeIn_0.2s_ease-out] p-4 md:p-8"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-[1400px] h-[85vh] bg-[#0a1628] border-2 border-indigo-500 rounded-3xl p-6 md:p-10 flex flex-col shadow-[0_0_80px_rgba(79,70,229,0.5)] overflow-hidden"
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4 shrink-0">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-200 tracking-wider">덱에서 카드 선택</h2>
            <p className="text-slate-400 text-sm mt-1">
              남은 카드: <span className="text-indigo-400 font-bold">{deckCards.length}</span>장 
              <span className="ml-2 px-2 py-0.5 bg-indigo-900/50 text-indigo-300 text-xs rounded-md border border-indigo-700">카드를 클릭하여 패로 즉시 가져옵니다.</span>
            </p>
          </div>
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-colors active:scale-95 border border-slate-600"
          >
            ✕ 닫기
          </button>
        </div>

        <div className="overflow-y-auto flex-1 pr-2 w-full custom-scrollbar">
          {deckCards.length === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 opacity-60">
              <IconDeck className="w-20 h-20 mb-4" />
              <p className="font-bold text-xl tracking-wider">덱에 카드가 없습니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 pb-10">
              {deckCards.map((card, idx) => (
                <div 
                  key={`deck-select-${idx}`}
                  className="group relative w-full aspect-[1/1.58] rounded-[10px] border border-slate-600 bg-black/50 overflow-hidden cursor-pointer hover:-translate-y-2 hover:shadow-[0_15px_30px_rgba(79,70,229,0.4)] hover:border-indigo-400 transition-all duration-300"
                  onClick={() => onExecuteDraw(idx)}
                  onContextMenu={e => e.preventDefault()}
                >
                  {card.image_url ? (
                    <GuardedImg src={card.image_url} alt={card.name} className="w-full h-full object-cover transition-all duration-300 group-hover:scale-110" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-4">
                      <span className="text-sm font-bold text-center text-slate-400 group-hover:text-slate-200">{card.name}</span>
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-indigo-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                    <span className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-black tracking-widest rounded-xl shadow-lg border border-indigo-400/50 transition-colors">
                      뽑기
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}