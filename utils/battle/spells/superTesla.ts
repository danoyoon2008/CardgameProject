import type { CardRow } from "../../../types/game";
import { BEONGGAE_SPELL_ID } from "./beonggae";
import { EONDEOK_SPELL_ID } from "./eondeok";
import { SOMYEOL_SPELL_ID } from "./somyeol";

/** 히든 스펠 — 슈퍼 테슬라 (트리거: 상대의 공격 유형 스펠 사용 시) */
export const SUPER_TESLA_SPELL_ID = "슈퍼 테슬라" as const;

export function isSuperTeslaSpellCard(c: CardRow | null | undefined): boolean {
  return !!c && c.name === SUPER_TESLA_SPELL_ID;
}

/** 발동 시 소모하는 토큰 — 카드 `cost`와 동일 규격 */
export function superTeslaActivationTokenCost(c: CardRow | null | undefined): number {
  if (!c) return 0;
  return Number(c.cost) || 0;
}

function isSpellRow(row: CardRow | null | undefined): boolean {
  if (!row) return false;
  const typeStr = String(row.type || "").toLowerCase();
  const categoryStr = String(row.category || "").toLowerCase();
  return (
    typeStr.includes("spell") ||
    typeStr.includes("스펠") ||
    typeStr.includes("마법") ||
    categoryStr.includes("spell") ||
    categoryStr.includes("스펠") ||
    categoryStr.includes("마법")
  );
}

/**
 * 공격 유형 스펠 — DB `type`/`category`에 "공격" 포함 시,
 * 또는 기존 공격 계열 손패 스펠(언덕!/번개/소멸) 명시 허용.
 */
export function isAttackTypeSpellCard(card: CardRow | null | undefined): boolean {
  if (!card || !isSpellRow(card)) return false;
  const t = String(card.type || "");
  const c = String(card.category || "");
  if (/공격/i.test(t) || /공격/i.test(c)) return true;
  const n = card.name;
  if (n === EONDEOK_SPELL_ID || n === BEONGGAE_SPELL_ID || n === SOMYEOL_SPELL_ID) return true;
  return false;
}
