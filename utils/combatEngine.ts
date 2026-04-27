// utils/combatEngine.ts
//
// ★ PowerPrime 전투 계산 엔진 ★

import { FieldCard } from "../types/game";
import { applyDamageMods } from "./cardEffects";

// ─────────────────────────────────────────
// 공격력 파싱
// ─────────────────────────────────────────

export type AttackType = "NORMAL" | "ADDITION" | "MULTIPLICATION" | "VARIABLE";

export interface ParsedAttack {
  type: AttackType;
  primaryDamage: number;
  secondaryDamage: number;
  secondaryHits: number;
  raw: string;
}

export const parseAttack = (atkRaw: string | number): ParsedAttack => {
  const raw = String(atkRaw ?? "0").trim();
  const cleaned = raw.replace(/[\(\)]/g, "").trim();
  const lower = cleaned.toLowerCase();

  if (lower.includes("n")) {
    const base = parseInt(lower.split("x")[0].trim()) || 0;
    return { type: "VARIABLE", primaryDamage: base, secondaryDamage: 0, secondaryHits: 0, raw };
  }

  if (cleaned.includes("+")) {
    const parts = cleaned.split("+");
    const primary = parseInt(parts[0].trim()) || 0;
    const secondary = parseInt(parts[1].trim()) || 0;
    return { type: "ADDITION", primaryDamage: primary, secondaryDamage: secondary, secondaryHits: 1, raw };
  }

  if (lower.includes("x") || cleaned.includes("*")) {
    const sep = lower.includes("x") ? "x" : "*";
    const parts = lower.split(sep);
    const base = parseInt(parts[0].trim()) || 0;
    const count = parseInt(parts[1].trim()) || 1;
    if (count > 1) {
      return { type: "MULTIPLICATION", primaryDamage: base, secondaryDamage: base, secondaryHits: count - 1, raw };
    }
    return { type: "NORMAL", primaryDamage: base, secondaryDamage: 0, secondaryHits: 0, raw };
  }

  const dmg = parseInt(cleaned) || 0;
  return { type: "NORMAL", primaryDamage: dmg, secondaryDamage: 0, secondaryHits: 0, raw };
};

export const isBracketAttack = (atkRaw: string | number): boolean => {
  return /\(.*\)/.test(String(atkRaw ?? ""));
};

export const parseBracketAttack = (atkRaw: string | number) => {
  const match = String(atkRaw ?? "").match(/^(.+?)\s*\((.+)\)$/);
  if (!match) return null;
  return { primary: match[1].trim(), secondary: match[2].trim() };
};

// ─────────────────────────────────────────
// 피해 계산
// ─────────────────────────────────────────

export interface DamageResult {
  finalDamage: number;
  wasReduced: boolean;
  reductions: string[];
}

export const calculateDamage = (
  rawDamage: number,
  targetCard: FieldCard,
  isSecondaryHit: boolean = false
): DamageResult => {
  const reductions: string[] = [];
  const original = rawDamage;

  const finalDamage = applyDamageMods(targetCard, rawDamage, isSecondaryHit);

  if (targetCard.hasBanjitgori) reductions.push("반짓고리 (-25%)");
  if (targetCard.name === "철기병") reductions.push("방어력 (-200, 최소 100)");

  return { finalDamage, wasReduced: finalDamage < original, reductions };
};

// ─────────────────────────────────────────
// 공격 가능 여부 검사
// ─────────────────────────────────────────

export interface AttackValidation {
  canAttack: boolean;
  reason?: string;
}

export const validateAttack = (params: {
  attackerCard: FieldCard;
  currentTurnKey: string;
  attacksUsedThisTurn: number;
  isSilenced: boolean;
  hasConcentratedFire: boolean;
}): AttackValidation => {
  const { attackerCard, currentTurnKey, attacksUsedThisTurn, isSilenced, hasConcentratedFire } = params;

  if (isSilenced) {
    return { canAttack: false, reason: "이 유닛은 [침묵] 상태이므로 기본 공격을 할 수 없습니다." };
  }

  if (attackerCard.summonedTurn === currentTurnKey) {
    return { canAttack: false, reason: "소환한 턴에는 공격할 수 없습니다. 다음 턴부터 공격 가능합니다." };
  }

  if (attackerCard.hasAttacked && !hasConcentratedFire) {
    return { canAttack: false, reason: "이 유닛은 이미 이번 턴에 공격했습니다." };
  }

  if (attacksUsedThisTurn >= 2 && !hasConcentratedFire) {
    return { canAttack: false, reason: "이번 턴의 공격권을 모두 사용했습니다. (턴당 최대 2회)" };
  }

  return { canAttack: true };
};

export const validateAntiGangup = (params: {
  targetCard: FieldCard;
  isTaunting: boolean;
  hasConcentratedFire: boolean;
}): AttackValidation => {
  const { targetCard, isTaunting, hasConcentratedFire } = params;

  if (targetCard.hasBeenAttackedThisTurn && !isTaunting && !hasConcentratedFire) {
    return {
      canAttack: false,
      reason: "이 유닛은 이미 이번 턴에 공격을 받았습니다.\n([도발] 유닛은 중복 공격이 가능합니다.)"
    };
  }

  return { canAttack: true };
};