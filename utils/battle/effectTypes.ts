/**
 * 필드 카드 효과(패시브·피해 보정·공격 후)용 공통 타입.
 * `cardEffects`와 `battle/units/*`가 공유 — 유닛 파일만 추가해도 모드 전역에 반영됩니다.
 */
import type { FieldCard, SimulationPlayerField } from "../../types/game";

export interface AttackContext {
  damageDealt: number;
  targetDestroyed: boolean;
  /** 처치 시에만 설정 — 다크나이트 처치 회복 등 대상 최대 체력(카드 `hp`) 기준 */
  targetMaxHpWhenDestroyed?: number;
  applyFieldHeal?: (amount: number) => void;
  applyFieldBuff?: (buffKey: string) => void;
  /** 마주보는 상대 — [혼란] 등 postAttack 패시브 봉인 판정(선택) */
  facingOppCard?: FieldCard | null;
}

export interface FieldContext {
  myField: SimulationPlayerField;
  oppField: SimulationPlayerField;
  mySlot: string;
}

export interface DamageModContext {
  rawDamage: number;
  isSecondaryHit: boolean;
}

export type PassiveStatusFn = (
  myCard: FieldCard,
  oppCard: FieldCard | null,
  myField: SimulationPlayerField
) => string[];

export type PostAttackFn = (card: FieldCard, ctx: AttackContext) => Partial<FieldCard>;

export type DamageModFn = (card: FieldCard, ctx: DamageModContext) => number;

export type OnSummonFn = (card: FieldCard) => Partial<FieldCard>;
