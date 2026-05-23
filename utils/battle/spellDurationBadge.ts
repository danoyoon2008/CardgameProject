import type { FieldCard } from "../../types/game";
import { isBangEomakDefenseActiveOnSpell } from "./spells/bangeomak";
import { isCheolbyeokAllyInvulnActiveOnSpell } from "./spells/cheolbyeok";
import { isBusinessGangActiveOnSpell } from "./spells/businessGang";
import { isAntHellActiveOnSpell } from "./spells/antHell";
import { isHyugesojauiAnsikActiveOnSpell } from "./spells/hyugesojauiAnsik";

export type SpellDurationBadgeTone = "green" | "slate" | "orange" | "amber";

/** 스펠 칸 맨 위 카드 — 남은 ×턴 뱃지(2틱=1×턴) */
export function getSpellDurationBadgeInfo(
  spell: FieldCard | null | undefined
): { turnCount: number; tone: SpellDurationBadgeTone } | null {
  if (!spell) return null;

  let ticks = 0;
  let tone: SpellDurationBadgeTone = "green";

  if (isBangEomakDefenseActiveOnSpell(spell)) {
    ticks = spell.bangEomakDefenseEndTurnTicksRemaining ?? 0;
    tone = "green";
  } else if (isCheolbyeokAllyInvulnActiveOnSpell(spell)) {
    ticks = spell.cheolbyeokAllyInvulnEndTurnTicksRemaining ?? 0;
    tone = "slate";
  } else if (isBusinessGangActiveOnSpell(spell)) {
    ticks = spell.businessGangEndTurnTicksRemaining ?? 0;
    tone = "orange";
  } else if (isAntHellActiveOnSpell(spell)) {
    ticks = spell.antHellEndTurnTicksRemaining ?? 0;
    tone = "orange";
  } else if (isHyugesojauiAnsikActiveOnSpell(spell)) {
    ticks =
      spell.hyugesojauiAnsikEndTurnTicksRemaining ??
      (spell.hyugesojauiAnsikTurnHealsRemaining != null
        ? spell.hyugesojauiAnsikTurnHealsRemaining * 2
        : 0);
    tone = "amber";
  } else {
    return null;
  }

  if (ticks <= 0) return null;
  return { turnCount: Math.ceil(ticks / 2), tone };
}

export const SPELL_DURATION_BADGE_TONE_CLASS: Record<SpellDurationBadgeTone, string> = {
  green:
    "border-emerald-300/90 bg-emerald-950/90 text-emerald-100 shadow-[0_0_8px_rgba(52,211,153,0.55)]",
  slate:
    "border-slate-200/90 bg-slate-900/90 text-slate-100 shadow-[0_0_8px_rgba(148,163,184,0.55)]",
  orange:
    "border-orange-300/90 bg-orange-950/90 text-orange-100 shadow-[0_0_8px_rgba(249,115,22,0.55)]",
  amber:
    "border-amber-200/90 bg-amber-950/90 text-amber-50 shadow-[0_0_8px_rgba(245,158,11,0.55)]",
};
