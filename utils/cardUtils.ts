// utils/cardUtils.ts
import { CardRow } from "../types/game";
import type { User } from "@supabase/supabase-js";

export function cardCategoryFlags(card: CardRow) {
  const category = card.category?.trim() ?? "";
  const categoryLower = category.toLowerCase();
  return { category, isUnit: categoryLower === "unit" || category === "유닛", isMagic: category === "마법" || categoryLower === "magic" };
}

export function nonEmptyText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const t = String(value).trim();
  return t.length > 0 ? t : null;
}

export function displayNameFromUser(user: User | null): string {
  if (!user) return "New User";
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  if (typeof meta?.full_name === "string" && meta.full_name.trim()) return meta.full_name;
  if (typeof meta?.name === "string" && meta.name.trim()) return meta.name;
  if (user.email) return user.email.split("@")[0] ?? "New User";
  return "New User";
}

export function profileImageUrl(user: User): string | null {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  if (typeof meta?.avatar_url === "string" && meta.avatar_url.trim()) return meta.avatar_url;
  if (typeof meta?.picture === "string" && meta.picture.trim()) return meta.picture;
  return null;
}

export function getFullRarityName(rarity?: string | null) {
  const r = (rarity || "").trim().toUpperCase();
  if (r === "C" || r === "COMMON") return "Common";
  if (r === "R" || r === "RARE") return "Rare";
  if (r === "E" || r === "EPIC") return "Epic";
  if (r === "L" || r === "LEGENDARY") return "Legendary";
  if (r === "A" || r === "ANCIENT") return "Ancient";
  return r; 
}

export function getShortRarityName(rarity?: string | null) {
  const r = (rarity || "").trim().toUpperCase();
  if (r === "COMMON" || r === "C") return "C";
  if (r === "RARE" || r === "R") return "R";
  if (r === "EPIC" || r === "E") return "E";
  if (r === "LEGENDARY" || r === "L") return "L";
  if (r === "ANCIENT" || r === "A") return "A";
  return r.charAt(0) || ""; 
}

export function getRarityStyle(rarity?: string | null) {
  const r = (rarity || "").trim().toUpperCase();
  if (r === "A" || r === "ANCIENT") return "bg-red-900/40 text-red-300 ring-1 ring-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)]";
  if (r === "L" || r === "LEGENDARY") return "bg-yellow-900/40 text-yellow-300 ring-1 ring-yellow-500 shadow-[0_0_12px_rgba(234,179,8,0.5)]";
  if (r === "E" || r === "EPIC") return "bg-purple-900/40 text-purple-300 ring-1 ring-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.4)]";
  if (r === "R" || r === "RARE") return "bg-lime-900/40 text-lime-300 ring-1 ring-lime-500 shadow-[0_0_8px_rgba(132,204,22,0.3)]";
  if (r === "C" || r === "COMMON") return "bg-sky-900/40 text-sky-300 ring-1 ring-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.3)]";
  return "bg-slate-500/25 text-slate-300 ring-1 ring-slate-400/30"; 
}

export function getGlowColor(rarity?: string | null) {
  const r = (rarity || "").trim().toUpperCase();
  if (r === "A" || r === "ANCIENT") return "rgba(239, 68, 68, 1)";
  if (r === "L" || r === "LEGENDARY") return "rgba(234, 179, 8, 0.9)";
  if (r === "E" || r === "EPIC") return "rgba(168, 85, 247, 0.7)";
  if (r === "R" || r === "RARE") return "rgba(132, 204, 22, 0.6)";
  if (r === "C" || r === "COMMON") return "rgba(14, 165, 233, 0.5)";
  return "transparent";
}

export function getRarityWeight(rarity?: string | null) {
  const r = (rarity || "").trim().toUpperCase();
  if (r === "A" || r === "ANCIENT") return 5; 
  if (r === "L" || r === "LEGENDARY") return 4;
  if (r === "E" || r === "EPIC") return 3;
  if (r === "R" || r === "RARE") return 2;
  if (r === "C" || r === "COMMON") return 1;
  return 0; 
}

function codexUnitSpellTypeRank(card: CardRow): number {
  const { isUnit, isMagic } = cardCategoryFlags(card);
  if (isUnit) return 0;
  if (isMagic) return 1;
  return 2;
}

function compareCodexCardId(a: CardRow, b: CardRow, descending: boolean): number {
  return descending ? Number(b.id) - Number(a.id) : Number(a.id) - Number(b.id);
}

/** DB 표기 `No.53`, `No. 55`, `53` 등 → 정수 */
export function parseCodexCardNumber(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const match = String(value).match(/(\d+)/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

/** 도감 번호(`number`) 우선, 없으면 `id` */
function codexCardNumberValue(card: CardRow): number {
  const parsed = parseCodexCardNumber(card.number);
  if (parsed != null) return parsed;
  return Number(card.id) || 0;
}

function compareCodexCardNumber(a: CardRow, b: CardRow, descending: boolean): number {
  const av = codexCardNumberValue(a);
  const bv = codexCardNumberValue(b);
  if (av !== bv) return descending ? bv - av : av - bv;
  return compareCodexCardId(a, b, false);
}

/** 동일 등급·코스트 구간 내: 유닛 → 마법 → 기타, 각각 도감 번호순 */
function compareCodexUnitSpellThenNumber(a: CardRow, b: CardRow, numberDescending: boolean): number {
  const typeCmp = codexUnitSpellTypeRank(a) - codexUnitSpellTypeRank(b);
  if (typeCmp !== 0) return typeCmp;
  return compareCodexCardNumber(a, b, numberDescending);
}

/**
 * 카드 도감 정렬 비교
 * - filterOwnedFirst: 획득 카드 우선
 * - splitUnitSpell: 코스트/등급 동순위 시 유닛·마법 분리 후 번호순 (번호 정렬은 sortCodexCards에서 블록 분리)
 */
export function compareCodexCards(
  a: CardRow,
  b: CardRow,
  sortOption: string,
  filterOwnedFirst: boolean,
  splitUnitSpell = false
): number {
  if (filterOwnedFirst && a.isOwned !== b.isOwned) return a.isOwned ? -1 : 1;

  switch (sortOption) {
    case "rarity_desc": {
      const primary = getRarityWeight(b.rarity) - getRarityWeight(a.rarity);
      if (primary !== 0) return primary;
      return splitUnitSpell ? compareCodexUnitSpellThenNumber(a, b, false) : compareCodexCardNumber(a, b, false);
    }
    case "rarity_asc": {
      const primary = getRarityWeight(a.rarity) - getRarityWeight(b.rarity);
      if (primary !== 0) return primary;
      return splitUnitSpell ? compareCodexUnitSpellThenNumber(a, b, false) : compareCodexCardNumber(a, b, false);
    }
    case "cost_desc": {
      const primary = (Number(b.cost) || 0) - (Number(a.cost) || 0);
      if (primary !== 0) return primary;
      return splitUnitSpell ? compareCodexUnitSpellThenNumber(a, b, false) : compareCodexCardNumber(a, b, false);
    }
    case "cost_asc": {
      const primary = (Number(a.cost) || 0) - (Number(b.cost) || 0);
      if (primary !== 0) return primary;
      return splitUnitSpell ? compareCodexUnitSpellThenNumber(a, b, false) : compareCodexCardNumber(a, b, false);
    }
    case "number_desc":
      return compareCodexCardNumber(a, b, true);
    case "number_asc":
    default:
      return compareCodexCardNumber(a, b, false);
  }
}

function partitionCodexByUnitSpell(cards: CardRow[]) {
  const units: CardRow[] = [];
  const spells: CardRow[] = [];
  const other: CardRow[] = [];
  for (const card of cards) {
    const { isUnit, isMagic } = cardCategoryFlags(card);
    if (isUnit) units.push(card);
    else if (isMagic) spells.push(card);
    else other.push(card);
  }
  return { units, spells, other };
}

/**
 * 카드 도감 목록 정렬.
 * splitUnitSpell + 번호 정렬: (전체 유닛 번호순) + (전체 마법 번호순)
 * splitUnitSpell + 등급/코스트: 등급·코스트 순, 동순위는 유닛→마법 후 번호순
 * splitUnitSpell 미사용: 유형 무관 단일 정렬
 */
export function sortCodexCards(
  cards: CardRow[],
  sortOption: string,
  filterOwnedFirst: boolean,
  splitUnitSpell: boolean
): CardRow[] {
  if (!splitUnitSpell) {
    return [...cards].sort((a, b) => compareCodexCards(a, b, sortOption, filterOwnedFirst, false));
  }

  const isNumberSort = sortOption === "number_asc" || sortOption === "number_desc";
  if (isNumberSort) {
    const compare = (a: CardRow, b: CardRow) => compareCodexCards(a, b, sortOption, filterOwnedFirst, false);
    const { units, spells, other } = partitionCodexByUnitSpell(cards);
    units.sort(compare);
    spells.sort(compare);
    other.sort(compare);
    return [...units, ...spells, ...other];
  }

  return [...cards].sort((a, b) => compareCodexCards(a, b, sortOption, filterOwnedFirst, true));
}

export function getShardRewardValue(rarity?: string | null) {
  const r = (rarity || "").trim().toUpperCase();
  if (r === "A" || r === "ANCIENT") return 20; 
  if (r === "L" || r === "LEGENDARY") return 20;
  if (r === "E" || r === "EPIC") return 8;
  if (r === "R" || r === "RARE") return 4;
  return 1; 
}

export function getShardShopPrice(rarity?: string | null) {
  const r = (rarity || "").trim().toUpperCase();
  if (r === "A" || r === "ANCIENT") return 400; 
  if (r === "L" || r === "LEGENDARY") return 400;
  if (r === "E" || r === "EPIC") return 100;
  return null; 
}