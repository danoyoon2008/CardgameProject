import type { CardRow } from "../../../types/game";
import { isOneNightWagerSpellCard } from "./oneNightWager";
import { isSuperTeslaSpellCard } from "./superTesla";

/**
 * 히든 스펠 — 로누 패시브 등에서 액티브 스펠과 구분.
 * DB/카드 데이터: `type`·`category`·`name`에 히든 표기, 또는 `hidden_spell` / `isHiddenSpell` 플래그.
 */
export function isHiddenSpellCard(row: CardRow | null | undefined): boolean {
  if (!row) return false;
  if (isSuperTeslaSpellCard(row)) return true;
  if (isOneNightWagerSpellCard(row)) return true;
  const t = String(row.type ?? "").toLowerCase();
  const c = String(row.category ?? "").toLowerCase();
  const n = String(row.name ?? "");
  const raw = row as Record<string, unknown>;
  if (raw.hidden_spell === true || raw.isHiddenSpell === true) return true;
  if (/히든|hidden/i.test(t)) return true;
  if (/히든|hidden/i.test(c)) return true;
  if (n.includes("히든")) return true;
  return false;
}

/** 마법(스펠) 카드이면서 히든이 아닌 경우 — 액티브 스펠(로누 차단 대상) */
export function isActiveNonHiddenSpellCard(row: CardRow | null | undefined): boolean {
  if (!row) return false;
  const typeStr = String(row.type || "").toLowerCase();
  const categoryStr = String(row.category || "").toLowerCase();
  const isSpellCard =
    typeStr.includes("spell") ||
    typeStr.includes("스펠") ||
    typeStr.includes("마법") ||
    categoryStr.includes("spell") ||
    categoryStr.includes("스펠") ||
    categoryStr.includes("마법");
  return isSpellCard && !isHiddenSpellCard(row);
}
