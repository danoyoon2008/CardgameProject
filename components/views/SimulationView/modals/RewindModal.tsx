import React from 'react';
import { IconDeck } from "../../../ui/Icons";
import { CardRow } from "../../../../types/game";

interface RewindModalProps {
  onClose: () => void;
  rewindCards: CardRow[];
  onOpenDetail?: (card: CardRow) => void;
}

export default function RewindModal({ onClose, rewindCards, onOpenDetail }: RewindModalProps) {
  return (
    <div 
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out] p-4 md:p-8"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-[1200px] h-[85vh] bg-[#0a1628] border-2 border-slate-700 rounded-3xl p-6 md:p-10 flex flex-col shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden"
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4 shrink-0">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-200 tracking-wider">리와인드 존</h2>
            <p className="text-slate-400 text-sm mt-1">총 <span className="text-sky-400 font-bold">{rewindCards.length}</span>장의 카드가 파괴되어 잠들어 있습니다.</p>
          </div>
          <button 
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
              {rewindCards.map((rCard, idx) => (
                <div 
                  key={`rewind-${idx}`}
                  className="group relative w-full aspect-[1/1.58] rounded-[10px] border border-slate-600 bg-black/50 overflow-hidden cursor-pointer hover:-translate-y-2 hover:shadow-[0_15px_30px_rgba(0,0,0,0.6)] hover:border-slate-300 transition-all duration-300"
                  onClick={() => { if(onOpenDetail) onOpenDetail(rCard); }}
                >
                  {rCard.image_url ? (
                    <img src={rCard.image_url} alt={rCard.name} className="w-full h-full object-cover grayscale-[0.4] group-hover:grayscale-0 transition-all duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-4">
                      <span className="text-sm font-bold text-center text-slate-400 group-hover:text-slate-200">{rCard.name}</span>
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                    <span className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-black tracking-widest rounded-xl shadow-lg border border-white/20 transition-colors">
                      상세 보기
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