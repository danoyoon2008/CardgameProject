/**
 * 곤충 전문가(No.15) — 액티브「A) 탐색」(상대 스펠 칸 히든 스펠 1회 엿보기)
 */
import type { CardRow, SimulationPlayerField } from "../../../types/game";
import { normalizeSpellStack } from "../fieldSpellAccess";
import { isHiddenSpellCard } from "../spells/spellVisibility";
import { UNIT } from "../unitIds";

export const GONCHUNG_JEONMOGA_ID = UNIT.GONCHUNG_JEONMOGA;

/** UI·배너 표기용 (내부 `pendingSkillKey` 와 분리) */
export const GONCHUNG_HIDDEN_PEEK_SKILL_LABEL = "탐색" as const;

export const GONCHUNG_JEONMOGA_ACTIVE = {
  pendingSkillKey: "A) 탐색" as const,
  /** 맨 위 히든 스펠 앞면 공개 지속(ms) */
  hiddenRevealMs: 3000,
} as const;

export const gonchungJeonmogaBattleMessages = {
  noHiddenSpell: "히든 스펠이 존재하지 않습니다",
  topNotHidden: "맨 위 카드가 히든 스펠이 아닙니다",
  skillCancelled: "곤충 전문가가 필드에 없어 [A) 탐색]이 취소되었습니다.",
} as const;

export function spellStackHasHiddenSpell(
  field: SimulationPlayerField | null | undefined
): boolean {
  return normalizeSpellStack(field).some(c => isHiddenSpellCard(c));
}

export function getTopSpellIfHidden(
  field: SimulationPlayerField | null | undefined
): CardRow | null {
  const top = normalizeSpellStack(field).at(-1) ?? null;
  return top && isHiddenSpellCard(top) ? top : null;
}
