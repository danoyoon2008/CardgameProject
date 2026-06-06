// components/ui/CardModals.tsx
import { CardRow } from "../../types/game";
import { 
  cardCategoryFlags, 
  nonEmptyText, 
  getRarityStyle, 
  getFullRarityName, 
  getGlowColor 
} from "../../utils/cardUtils";
import { IconLock } from "./Icons";
import { CardPlaceholder } from "./Card";

export function CardDetailModal({ card, onClose }: { card: CardRow | null; onClose: () => void }) {
  if (!card) return null;
  const { isUnit, isMagic } = cardCategoryFlags(card);
  const passiveDetail = nonEmptyText(card.passive_detail);
  const activeDetail = nonEmptyText(card.active_detail);
  const description = nonEmptyText(card.description_detail); 
  const rarityStyle = getRarityStyle(card.rarity);
  const displayRarity = getFullRarityName(card.rarity);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]" onClick={onClose} role="presentation">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-b from-[#0d1f3c] to-[#050a14] shadow-2xl ring-1 ring-white/10" onClick={(e) => e.stopPropagation()} role="dialog">
        
        <div className="absolute right-3 top-3 z-20 flex items-center gap-2">
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-xl leading-none text-white transition hover:bg-white/20">×</button>
        </div>

        <div className="flex flex-row h-full overflow-y-auto p-4 sm:p-6 pt-12 gap-4 sm:gap-8">
          
          <div className="w-28 sm:w-48 md:w-72 shrink-0 self-start perspective-1000">
            <div className="relative aspect-[53.98/85.6] rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.8)] border border-white/10 overflow-hidden sm:transform sm:-rotate-2 sm:transition-transform sm:hover:rotate-0 sm:duration-500">
               <CardPlaceholder card={{...card, isOwned: true}} isShopView={true} />
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar pr-1">
            <header className="mb-3 sm:mb-6 border-b border-white/10 pb-3 sm:pb-6 relative">
              {card.card_number && (<div className="font-mono text-[10px] sm:text-sm font-bold text-slate-500 tracking-wider mb-1 sm:mb-3">{card.card_number}</div>)}
              <div className="flex items-center gap-3 mb-2">
                {rarityStyle && displayRarity && <span className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-widest ${rarityStyle}`}>{displayRarity}</span>}
                {card.isOwned === false && (<span className="flex items-center gap-1 rounded-full bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-400 border border-slate-700"><IconLock className="h-3 w-3" /> 미보유</span>)}
              </div>
              <h2 className="text-base sm:text-3xl font-bold tracking-tight text-white">{card.name || "이름 없음"}</h2>
              
              <div className="mt-2 sm:mt-4 flex flex-wrap items-center gap-1.5 sm:gap-3 text-xs sm:text-sm">
                <span className="rounded-md bg-amber-500/90 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-xs font-bold tabular-nums text-[#0a1628]">코스트 {card.cost ?? "—"}</span>
                <span className="text-sky-200/95">타입 · {card.type ?? "—"}</span>
                {isUnit ? (<span className="text-slate-300"><span className="text-emerald-300/95">HP {card.hp ?? "—"}</span><span className="mx-2 text-slate-600">|</span><span className="text-rose-300/95">ATK {card.atk ?? "—"}</span></span>) : isMagic ? (<span className="text-amber-200/90">지속 <span className="font-semibold tabular-nums">{card.duration ?? "—"}</span></span>) : null}
              </div>
            </header>

            <div className="space-y-3 sm:space-y-5 text-xs sm:text-sm leading-relaxed text-slate-300 pb-4 sm:pb-6">
              {isUnit && passiveDetail && (<section><h3 className="mb-2 flex items-center gap-2"><span className="text-xs font-semibold uppercase tracking-wider text-emerald-400/90">패시브</span>{card.passive_name && <span className="bg-emerald-900/40 text-emerald-200 border border-emerald-500/30 px-1.5 py-0.5 rounded text-[9px] sm:text-[11px] font-bold">{card.passive_name}</span>}</h3><p className="whitespace-pre-wrap rounded-lg bg-black/30 p-2 sm:p-4 text-[11px] sm:text-sm text-slate-200 ring-1 ring-white/10 leading-relaxed sm:leading-loose">{passiveDetail}</p></section>)}
              {isUnit && activeDetail && (<section><h3 className="mb-2 flex items-center gap-2"><span className="text-xs font-semibold uppercase tracking-wider text-sky-400/90">액티브</span>{card.active_name && <span className="bg-sky-900/40 text-sky-200 border border-sky-500/30 px-1.5 py-0.5 rounded text-[9px] sm:text-[11px] font-bold">{card.active_name}</span>}</h3><p className="whitespace-pre-wrap rounded-lg bg-black/30 p-2 sm:p-4 text-[11px] sm:text-sm text-slate-200 ring-1 ring-white/10 leading-relaxed sm:leading-loose">{activeDetail}</p></section>)}
              {description && (<section><h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-violet-400/90">설명 / 효과</h3><p className="whitespace-pre-wrap rounded-lg bg-black/30 p-2 sm:p-4 text-[11px] sm:text-sm text-slate-200 ring-1 ring-white/10 leading-relaxed sm:leading-loose">{description}</p></section>)}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export function NewCardUnlockModal({ card, onClose }: { card: CardRow; onClose: () => void }) {
  const { isUnit, isMagic } = cardCategoryFlags(card);
  const glowColor = getGlowColor(card.rarity) || 'rgba(34,211,238,1)';
  
  return (
    <>
      <div className="fixed inset-0 z-[130] pointer-events-none animate-[unlockScreenFlash_1.2s_ease-out_forwards]" />
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 backdrop-blur-lg p-4 animate-[fadeIn_0.5s_ease-out]" onClick={onClose}>
        <div className="absolute w-[80vw] h-[80vw] max-w-[600px] max-h-[600px] rounded-full mix-blend-screen opacity-30 animate-[pulse_2s_infinite]" style={{ background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)` }} />
        
        <div className="relative flex flex-col items-center max-w-4xl w-full px-2 sm:px-4 animate-[slideUp_0.6s_ease-out]" onClick={e => e.stopPropagation()}>
          <h2 className="text-2xl sm:text-4xl font-black italic tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 mb-8 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] animate-bounce">
            NEW UNLOCK!
          </h2>
          
          <div className="flex flex-row items-start justify-center gap-4 sm:gap-10 w-full">
            <div className="w-28 sm:w-52 shrink-0 perspective-1000">
              <div className="relative aspect-[53.98/85.6] rounded-xl shadow-[0_0_40px_currentColor] animate-[float_3s_ease-in-out_infinite]" style={{ color: glowColor }}>
                <div className="w-full h-full rounded-xl overflow-hidden border-2" style={{ borderColor: glowColor }}>
                  <CardPlaceholder card={{...card, isOwned: true}} />
                </div>
              </div>
            </div>

            <div className="flex-1 min-w-0 bg-[#0a1628]/80 border border-white/20 rounded-xl p-3 sm:p-5 backdrop-blur-md shadow-2xl">
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${getRarityStyle(card.rarity)}`}>{getFullRarityName(card.rarity)}</span>
                <span className="text-sky-300 text-sm font-medium">{card.type}</span>
              </div>
              <h3 className="text-base sm:text-2xl font-bold text-white mb-2">{card.name}</h3>
              
              <div className="flex flex-wrap gap-2 text-xs sm:text-sm font-bold bg-black/40 rounded-lg p-2 mb-2">
                <span className="text-amber-400">코스트 {card.cost}</span>
                {isUnit && <span className="text-emerald-400">HP {card.hp}</span>}
                {isUnit && <span className="text-rose-400">ATK {card.atk}</span>}
                {isMagic && <span className="text-violet-400">지속 {card.duration}</span>}
              </div>

              <div className="space-y-2 text-xs text-slate-300 max-h-32 sm:max-h-48 overflow-y-auto custom-scrollbar pr-1">
                {isUnit && card.passive_detail && (
                  <div><strong className="text-emerald-300 block mb-1">패시브: {card.passive_name}</strong><p className="text-xs bg-black/30 p-2 rounded whitespace-pre-wrap">{card.passive_detail}</p></div>
                )}
                {isUnit && card.active_detail && (
                  <div><strong className="text-sky-300 block mb-1">액티브: {card.active_name}</strong><p className="text-xs bg-black/30 p-2 rounded whitespace-pre-wrap">{card.active_detail}</p></div>
                )}
                {card.description_detail && (
                  <div><strong className="text-violet-300 block mb-1">효과 / 설명</strong><p className="text-xs bg-black/30 p-2 rounded whitespace-pre-wrap">{card.description_detail}</p></div>
                )}
              </div>
            </div>
          </div>

          <button onClick={onClose} className="mt-4 sm:mt-8 px-8 sm:px-10 py-2.5 sm:py-3 bg-white hover:bg-slate-200 text-slate-900 rounded-full font-bold text-lg transition-transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.3)]">
            확인
          </button>
        </div>
      </div>
      <style>{`
         @keyframes float { 0%, 100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-15px) rotate(2deg); } }
         @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </>
  );
}