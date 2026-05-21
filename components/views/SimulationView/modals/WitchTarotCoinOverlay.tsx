"use client";

export type WitchTarotCoinOverlayProps = {
  phase: "FLIPPING" | "RESULT";
  heads: boolean | null;
  flipTick: number;
};

export default function WitchTarotCoinOverlay({ phase, heads, flipTick }: WitchTarotCoinOverlayProps) {
  const showFront = phase === "RESULT" ? heads === true : flipTick % 2 === 0;

  return (
    <div className="fixed inset-0 z-[185] flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" aria-hidden />
      <div className="relative z-10 flex flex-col items-center">
        <h3 className="mb-8 text-center text-xl font-black tracking-widest text-violet-100 drop-shadow-lg">
          마녀 타로
        </h3>
        <div
          className={`relative flex h-40 w-40 items-center justify-center rounded-full border-4 shadow-[0_0_48px_rgba(167,139,250,0.55)] ${
            phase === "FLIPPING"
              ? "animate-[witchTarotCoinSpin_0.14s_ease-in-out_infinite] border-violet-300/90 bg-gradient-to-br from-violet-700 to-fuchsia-900"
              : showFront
                ? "border-amber-200/95 bg-gradient-to-br from-amber-500 to-amber-700 animate-[bounce_0.45s_ease-out]"
                : "border-slate-500/90 bg-gradient-to-br from-slate-800 to-slate-950 animate-[bounce_0.45s_ease-out]"
          }`}
          aria-hidden
        >
          {showFront ? (
            <span className="select-none text-6xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]">
              P
            </span>
          ) : (
            <span className="select-none text-[10px] font-bold uppercase tracking-[0.35em] text-slate-400/90">
              back
            </span>
          )}
        </div>
        <p className="mt-8 text-center text-lg font-black text-violet-100/95">
          {phase === "FLIPPING"
            ? "동전을 던지는 중..."
            : heads
              ? "앞면(P) — 양측 2장씩 드로우"
              : "뒷면 — 양측 2장씩 버림"}
        </p>
      </div>
    </div>
  );
}
