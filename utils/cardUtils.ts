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

export function getShardRewardValue(rarity?: string | null) {
  const r = (rarity || "").trim().toUpperCase();
  if (r === "A" || r === "ANCIENT") return 50; 
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