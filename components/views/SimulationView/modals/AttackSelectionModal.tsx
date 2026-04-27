import React from 'react';

interface PendingSelection {
  player: "A" | "B";
  slot: "is" | "m" | "os";
  primary: string;
  secondary: string;
  position: { x: number; y: number }; 
}

interface AttackSelectionModalProps {
  selection: PendingSelection;
  onClose: () => void;
  onSelectPrimary: () => void;
  onSelectSecondary: () => void;
}

export default function AttackSelectionModal({ selection, onClose, onSelectPrimary, onSelectSecondary }: AttackSelectionModalProps) {
  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div 
        className="absolute bg-[#0a1628] border-2 border-sky-500 rounded-3xl p-5 md:p-6 shadow-[0_0_50px_rgba(14,165,233,0.8)] flex flex-col items-center min-w-[280px] z-[101] animate-[scaleIn_0.15s_ease-out]"
        style={{ 
          top: Math.max(20, selection.position.y - 180) + 'px', 
          left: Math.max(140, Math.min(window.innerWidth - 140, selection.position.x)) + 'px',
          transform: 'translateX(-50%)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg md:text-xl font-black text-white mb-4 tracking-wider">공격 방식 선택</h3>
        
        <div className="flex gap-3 w-full">
          <button 
            onClick={onSelectPrimary} 
            className="flex-1 flex flex-col items-center justify-center px-4 py-3 bg-slate-800 hover:bg-sky-600 border border-slate-600 hover:border-sky-300 rounded-2xl text-white font-bold transition-all group active:scale-95"
          >
            <span className="text-[10px] text-slate-400 group-hover:text-sky-200 mb-1">단일 타격</span>
            <span className="text-xl md:text-2xl font-black whitespace-nowrap">{selection.primary}</span>
          </button>
          
          <button 
            onClick={onSelectSecondary} 
            className="flex-1 flex flex-col items-center justify-center px-4 py-3 bg-slate-800 hover:bg-orange-600 border border-slate-600 hover:border-orange-300 rounded-2xl text-white font-bold transition-all group active:scale-95"
          >
            <span className="text-[10px] text-slate-400 group-hover:text-orange-200 mb-1">다중/연쇄</span>
            <span className="text-xl md:text-2xl font-black whitespace-nowrap">{selection.secondary}</span>
          </button>
        </div>
        
        <button 
          onClick={onClose} 
          className="mt-4 px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 text-sm rounded-xl font-bold transition-colors w-full active:scale-95"
        >
          취소
        </button>
      </div>
    </div>
  );
}