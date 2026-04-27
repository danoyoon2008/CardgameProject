import React from 'react';

interface SettingsModalProps {
  onClose: () => void;
  drawMode: "RANDOM" | "SELECT";
  isTimeLimitEnabled: boolean;
  isOpponentCardFlipped: boolean;
  onToggleDrawMode: () => void;
  onToggleTimeLimit: () => void;
  onToggleFlip: () => void;
}

export default function SettingsModal({ 
  onClose, drawMode, isTimeLimitEnabled, isOpponentCardFlipped, 
  onToggleDrawMode, onToggleTimeLimit, onToggleFlip 
}: SettingsModalProps) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]" onClick={onClose}>
      <div className="bg-[#0a1628] border-2 border-slate-700 rounded-[2rem] p-8 w-full max-w-sm shadow-2xl flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-black text-white mb-6 border-b border-slate-700 pb-4 w-full text-center tracking-wider">게임 설정</h2>
        
        <div className="flex flex-col gap-4 w-full py-4">
          <div className="flex items-center justify-between w-full bg-slate-800/50 p-4 rounded-xl border border-slate-700">
            <div className="flex flex-col text-left mr-4">
              <h4 className="text-white font-bold mb-1">카드 뽑기 방식</h4>
              <p className="text-[11px] text-slate-400 leading-snug">
                <span className="text-sky-400 font-bold">랜덤:</span> 덱에서 무작위로 뽑습니다.<br/>
                <span className="text-rose-400 font-bold">선택:</span> 덱에서 원하는 카드를 골라 뽑습니다.
              </p>
            </div>
            <button 
              onClick={onToggleDrawMode}
              className={`relative w-16 h-8 rounded-lg p-1 transition-colors duration-300 shrink-0 font-black text-[11px] flex items-center justify-center shadow-inner active:scale-95 border ${drawMode === 'SELECT' ? 'bg-indigo-600 text-white border-indigo-400' : 'bg-slate-700 text-slate-300 border-slate-500'}`}
            >
              {drawMode === 'SELECT' ? '선택 뽑기' : '랜덤 뽑기'}
            </button>
          </div>

          <div className="flex items-center justify-between w-full bg-slate-800/50 p-4 rounded-xl border border-slate-700">
            <div className="flex flex-col text-left mr-4">
              <h4 className="text-white font-bold mb-1">턴 제한 시간 (1분)</h4>
              <p className="text-[11px] text-slate-400 leading-snug">
                시간 소진 시 턴이 자동으로 넘어갑니다.
              </p>
            </div>
            <button 
              onClick={onToggleTimeLimit}
              className={`relative w-12 h-6 rounded-full p-1 transition-colors duration-300 shrink-0 ${isTimeLimitEnabled ? 'bg-sky-500' : 'bg-slate-600'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300 ${isTimeLimitEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between w-full bg-slate-800/50 p-4 rounded-xl border border-slate-700">
            <div className="flex flex-col text-left mr-4">
              <h4 className="text-white font-bold mb-1">상대 카드 회전 (180도)</h4>
              <p className="text-[11px] text-slate-400 leading-snug">
                상대방의 카드를 뒤집어 마주보는 느낌을 줍니다.
              </p>
            </div>
            <button 
              onClick={onToggleFlip}
              className={`relative w-12 h-6 rounded-full p-1 transition-colors duration-300 shrink-0 ${isOpponentCardFlipped ? 'bg-sky-500' : 'bg-slate-600'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300 ${isOpponentCardFlipped ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        <button 
          onClick={onClose} 
          className="mt-4 w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-bold transition-colors active:scale-95 border border-slate-600 shadow-lg"
        >
          닫기
        </button>
      </div>
    </div>
  );
}