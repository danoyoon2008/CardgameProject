/**
 * 타입 세트 — 필드 유닛 슬롯 3칸(is/m/os)에 동일 타입 유닛 3개 장착 시
 * 모든 아군에게 [OOO형 세트: 공격력 +100] 버프.
 * 조건 유지 동안 무한 지속, 하나라도 빠지면 자동 해제.
 * 버프 금지로 해제 가능 (공격 버프).
 */
import type { FieldCard } from "@/types/game";
import { applyFlatAttackModifierByPattern, type AttackModifierOptions } from "./attackModifier";

export const TYPE_SET_ATTACK_BONUS = 100 as const;

const TYPE_SET_BADGE_RE = /^\[.+ 세트: 공격력 \+\d+\]$/;

type FieldSlice = {
  is: FieldCard | null;
  m: FieldCard | null;
  os: FieldCard | null;
};

/** 카드의 타입명 추출 ("공격형"/"방어형"/"지원형" 등). 없으면 null */
function unitTypeOf(card: FieldCard | null | undefined): string | null {
  if (!card) return null;
  const t = (card.type ?? "").trim();
  if (!t) return null;
  // "공격형 / 공격 유형" 같은 복합 표기에서 유닛 타입만 추출
  const m = t.match(/(공격형|방어형|지원형|유틸형|밸런스형|특수형)/);
  if (m) return m[1];
  return t;
}

/** 필드 3칸이 모두 살아있고 동일 타입이면 그 타입명, 아니면 null */
export function getFieldTypeSetType(field: FieldSlice | null | undefined): string | null {
  if (!field) return null;
  const cards = [field.is, field.m, field.os];
  if (cards.some(c => !c || (c.currentHp ?? 0) <= 0)) return null;
  const types = cards.map(unitTypeOf);
  if (types.some(t => t == null)) return null;
  if (types[0] === types[1] && types[1] === types[2]) return types[0];
  return null;
}

/** 타입 세트 발동 중인지 */
export function hasActiveTypeSet(field: FieldSlice | null | undefined): boolean {
  return getFieldTypeSetType(field) != null;
}

/** 타입 세트 뱃지 문자열인지 (동적 타입명) */
export function isTypeSetStatusBadge(status: string): boolean {
  return TYPE_SET_BADGE_RE.test(status.trim());
}

/** 살아 있는 아군 유닛이 타입 세트 버프 대상인지 */
export function unitReceivesTypeSetBuff(
  card: FieldCard | null | undefined,
  allyField: FieldSlice | null | undefined
): boolean {
  if (!card || (card.currentHp ?? 0) <= 0) return false;
  return hasActiveTypeSet(allyField);
}

/** 타입 세트 뱃지 문자열 생성 (타입명 동적) */
export function getTypeSetBadge(field: FieldSlice | null | undefined): string | null {
  const type = getFieldTypeSetType(field);
  if (!type) return null;
  return `[${type} 세트: 공격력 +${TYPE_SET_ATTACK_BONUS}]`;
}

/** 타입 세트 버프를 공격 데미지에 적용 (파이레드 동형, 버프 금지 시 options로 미적용) */
export function applyTypeSetToAttackDamage(
  attacker: FieldCard,
  allyField: FieldSlice | null | undefined,
  primaryDamage: number,
  secondaryDamage: number,
  options?: AttackModifierOptions
): { primaryDamage: number; secondaryDamage: number } {
  const bonus = hasActiveTypeSet(allyField) ? TYPE_SET_ATTACK_BONUS : 0;
  return applyFlatAttackModifierByPattern(primaryDamage, secondaryDamage, bonus, options);
}
