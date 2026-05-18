// utils/combatEngine.ts
//
// ★ PowerPrime 전투 계산 엔진 ★

import { FieldCard } from "../types/game";
import { applyDamageMods } from "./cardEffects";
import { CHEOLGIBYEONG_ID, CHEOLGIBYEONG_REDUCTION_LOG } from "./battle/units/cheolgibyeong";
import { isIversonAttackLocked, iversonLiberationLabel } from "./battle/units/iverson";

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
  if (targetCard.name === CHEOLGIBYEONG_ID) reductions.push(CHEOLGIBYEONG_REDUCTION_LOG);

  return { finalDamage, wasReduced: finalDamage < original, reductions };
};

// ─────────────────────────────────────────
// 공격 가능 여부 검사
// ─────────────────────────────────────────

export interface AttackValidation {
  canAttack: boolean;
  reason?: string;
}

/** [집중 사격] 등은 여기서 면제하지 않음 — 유닛당 1공격·턴당 2공격권만 검사합니다. 동일 적 중복 허용은 각 뷰에서 별도 처리. */
export const validateAttack = (params: {
  attackerCard: FieldCard;
  currentTurnKey: string;
  attacksUsedThisTurn: number;
  isSilenced: boolean;
  isStunned: boolean;
  /** 시작의 망령 처치 연쇄(2차 이상) — 턴당 공격권 소모 없이 이어지는 동일 공격으로 간주 */
  bypassTurnAttackBudget?: boolean;
  /** 시작의 망령: 적 필드가 비어 있고 턴 공격권이 남았을 때, 이미 필드 유닛을 공격한 뒤 상대 플레이어 HP만 추가로 노림 */
  overrideHasAttackedCheck?: boolean;
}): AttackValidation => {
  const {
    attackerCard,
    currentTurnKey,
    attacksUsedThisTurn,
    isSilenced,
    isStunned,
    bypassTurnAttackBudget,
    overrideHasAttackedCheck,
  } = params;

  if (isSilenced) {
    return { canAttack: false, reason: "이 유닛은 [침묵] 상태이므로 기본 공격을 할 수 없습니다." };
  }

  if (isStunned) {
    return { canAttack: false, reason: "이 유닛은 [기절] 상태이므로 기본 공격을 할 수 없습니다." };
  }

  if (isIversonAttackLocked(attackerCard)) {
    const lib = iversonLiberationLabel(attackerCard);
    return {
      canAttack: false,
      reason: lib ?? "아이버슨은 아직 기본 공격을 할 수 없습니다.",
    };
  }

  if (attackerCard.summonedTurn === currentTurnKey) {
    return { canAttack: false, reason: "소환한 턴에는 공격할 수 없습니다. 다음 턴부터 공격 가능합니다." };
  }

  if (!overrideHasAttackedCheck && attackerCard.hasAttacked) {
    return { canAttack: false, reason: "이 유닛은 이미 이번 턴에 공격했습니다." };
  }

  if (!bypassTurnAttackBudget && attacksUsedThisTurn >= 2) {
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