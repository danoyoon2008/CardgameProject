// utils/cardEffects.ts
//
// ★ PowerPrime 카드 효과 통합 레지스트리 ★
//
// 이 파일이 모든 게임 모드(시뮬레이션, PvE, AI대전, 온라인대전)에서
// 공통으로 사용되는 카드 고유 능력의 단일 진실 공급원(Single Source of Truth)입니다.
//
// 새 카드를 추가할 때는 이 파일에만 추가하면 모든 모드에 자동 반영됩니다.

import { FieldCard } from "../types/game";

// ─────────────────────────────────────────
// 공통 타입 정의
// ─────────────────────────────────────────

/** 공격 후 스킬 실행에 필요한 전투 컨텍스트 */
export interface AttackContext {
  damageDealt: number;
  targetDestroyed: boolean;
  applyFieldHeal?: (amount: number) => void;
  applyFieldBuff?: (buffKey: string) => void;
}

/** 상태 확인에 필요한 필드 컨텍스트 */
export interface FieldContext {
  myField: Record<string, FieldCard | null>;
  oppField: Record<string, FieldCard | null>;
  mySlot: string;
}

/** 피해 수신 변조 컨텍스트 */
export interface DamageModContext {
  rawDamage: number;
  isSecondaryHit: boolean;
}

// ─────────────────────────────────────────
// 1. 패시브 상태 레지스트리
// ─────────────────────────────────────────

type PassiveStatusFn = (
  myCard: FieldCard,
  oppCard: FieldCard | null,
  myField: Record<string, FieldCard | null>
) => string[];

const passiveStatusRegistry: Record<string, PassiveStatusFn> = {

  "철기병": () => ["도발", "방어력 +200"],

  "렴초": () => ["도발"],

};

const checkPhilipSilence = (oppCard: FieldCard | null): string[] => {
  if (oppCard && oppCard.name === "필립") return ["침묵"];
  return [];
};

// ─────────────────────────────────────────
// 2. 공격 후 패시브 스킬 레지스트리
// ─────────────────────────────────────────

type PostAttackFn = (card: FieldCard, ctx: AttackContext) => Partial<FieldCard>;

const postAttackRegistry: Record<string, PostAttackFn> = {

  "그냥 모자": (card, ctx) => {
    const healAmount = Math.floor(ctx.damageDealt * 0.5);
    const maxHp = Number(card.hp);
    const newHp = Math.min(maxHp, card.currentHp + healAmount);
    return { currentHp: newHp };
  },

  "고스톤": (card, ctx) => {
    if (ctx.targetDestroyed) {
      return { currentHp: Number(card.hp) };
    }
    return {};
  },

};

// ─────────────────────────────────────────
// 3. 피해 수신 변조 레지스트리
// ─────────────────────────────────────────

type DamageModFn = (card: FieldCard, ctx: DamageModContext) => number;

const damageModRegistry: Record<string, DamageModFn> = {

  "철기병": (card, ctx) => {
    return Math.max(100, ctx.rawDamage - 200);
  },

};

// ─────────────────────────────────────────
// 4. 소환 시 패시브 초기화 레지스트리
// ─────────────────────────────────────────

type OnSummonFn = (card: FieldCard) => Partial<FieldCard>;

const onSummonRegistry: Record<string, OnSummonFn> = {
  // 추후 필요 시 추가
};

// ─────────────────────────────────────────
// ★ 공개 API
// ─────────────────────────────────────────

export const getActiveStatuses = (
  myCard: FieldCard | null,
  oppCard: FieldCard | null,
  myField?: Record<string, FieldCard | null>
): string[] => {
  if (!myCard) return [];

  const statuses: string[] = [];

  const passiveFn = passiveStatusRegistry[myCard.name];
  if (passiveFn) {
    statuses.push(...passiveFn(myCard, oppCard, myField || {}));
  }

  statuses.push(...checkPhilipSilence(oppCard));

  if (myCard.hasBanjitgori) {
    statuses.push("반짓고리");
    statuses.push("도발");
  }

  if (myCard.hasConcentratedFire) {
    statuses.push("집중 사격");
  }

  return statuses;
};

export const applyPostAttackSkills = (
  attackerCard: FieldCard,
  ctx: AttackContext
): Partial<FieldCard> => {
  const fn = postAttackRegistry[attackerCard.name];
  if (fn) return fn(attackerCard, ctx);
  return {};
};

export const applyDamageMods = (
  targetCard: FieldCard,
  rawDamage: number,
  isSecondaryHit: boolean = false
): number => {
  let damage = rawDamage;

  if (targetCard.hasBanjitgori) {
    damage = Math.floor((damage * 0.75) / 50) * 50;
  }

  const modFn = damageModRegistry[targetCard.name];
  if (modFn) {
    damage = modFn(targetCard, { rawDamage: damage, isSecondaryHit });
  }

  return Math.max(1, damage);
};

export const applyOnSummon = (card: FieldCard): Partial<FieldCard> => {
  const fn = onSummonRegistry[card.name];
  if (fn) return fn(card);
  return {};
};

export const hasTauntUnit = (field: Record<string, FieldCard | null>): boolean => {
  return Object.values(field).some(card => {
    if (!card) return false;
    return getActiveStatuses(card, null).includes("도발");
  });
};

export const isTaunting = (card: FieldCard | null, oppCard: FieldCard | null = null): boolean => {
  if (!card) return false;
  return getActiveStatuses(card, oppCard).includes("도발");
};

export const isSilenced = (card: FieldCard | null, oppCard: FieldCard | null = null): boolean => {
  if (!card) return false;
  return getActiveStatuses(card, oppCard).includes("침묵");
};