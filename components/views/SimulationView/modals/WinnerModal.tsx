import React from 'react';

interface WinnerModalProps {
  winner: "A" | "B";
  elapsedTime: number;
  onBackToLobby?: () => void;
  onReset: () => void;
}

export default function WinnerModal({ winner, elapsedTime, onBackToLobby, onReset }: WinnerModalProps) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden">
      <div className={`absolute inset-0 animate-[pulse_1s_ease-in-out_infinite] mix-blend-screen pointer-events-none ${winner === 'A' ? 'bg-sky-500/40' : 'bg-rose-500/40'}`} />
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
      
      <div className={`relative z-10 flex flex-col items-center justify-center p-16 md:p-24 lg:p-32 rounded-[4rem] border-8 ${winner === 'A' ? 'border-sky-500 shadow-[0_0_150px_rgba(14,165,233,0.8)] bg-sky-950/60' : 'border-rose-500 shadow-[0_0_150px_rgba(244,63,94,0.8)] bg-rose-950/60'} animate-[scaleIn_0.5s_ease-out]`}>
        <h2 className={`text-6xl md:text-8xl lg:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b ${winner === 'A' ? 'from-white to-sky-400' : 'from-white to-rose-400'} tracking-widest drop-shadow-[0_10px_20px_rgba(0,0,0,1)] mb-4 animate-[bounce_1.5s_ease-in-out_infinite]`}>
          PLAYER {winner} WIN!
        </h2>
        <p className="text-2xl md:text-3xl font-bold text-slate-200 mb-4 text-center drop-shadow-md">
          상대 플레이어의 체력이 0이 되어 게임이 종료되었습니다.
        </p>
        
        <p className="text-xl md:text-2xl font-mono font-black text-amber-400 mb-16 tracking-widest drop-shadow-lg">
          게임 시간 : {Math.floor(elapsedTime / 60)}분 {elapsedTime % 60}초
        </p>

        <div className="flex flex-col sm:flex-row gap-6 sm:gap-10 w-full sm:w-auto">
          <button 
            onClick={() => { if(onBackToLobby) onBackToLobby(); else window.location.href = '/'; }}
            className="px-10 py-5 bg-slate-800 hover:bg-slate-700 text-white rounded-3xl font-black text-xl transition-colors border-2 border-slate-600 active:scale-95 shadow-2xl w-full sm:w-auto"
          >
            로비로 돌아가기
          </button>
          <button 
            onClick={onReset}
            className={`px-10 py-5 text-white rounded-3xl font-black text-xl transition-colors border-4 active:scale-95 shadow-2xl w-full sm:w-auto ${winner === 'A' ? 'bg-sky-600 hover:bg-sky-500 border-sky-300 shadow-[0_0_30px_rgba(14,165,233,0.6)]' : 'bg-rose-600 hover:bg-rose-500 border-rose-300 shadow-[0_0_30px_rgba(244,63,94,0.6)]'}`}
          >
            다시 플레이
          </button>
        </div>
      </div>
    </div>
  );
}