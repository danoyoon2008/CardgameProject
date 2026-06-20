/** 보스 토벌전 — 보스 정의 데이터 스키마 */

/** 타겟 선정 규칙 (판단 없이 규칙으로 대상 결정) */
export type BossTargetRule =
  | "highest_atk" // 공격력 최고 적
  | "lowest_hp" // 체력 최저 적
  | "all_enemies" // 모든 적
  | "self" // 자신
  | "random_enemy"; // 무작위 적

/** 상시 패시브 효과 타입 */
export type BossPassiveType =
  | "nullifyEnemyDefense" // 모든 적 방어 효과 무력화
  | "removeHiddenSpellTrigger" // 히든 스펠 트리거 제거
  | "unstoppable" // [저지 불가]
  | "resetCooldownsAtHalfHp"; // HP 50% 이하 첫 진입 시 쿨타임 1회 초기화

export interface BossPassive {
  type: BossPassiveType;
}

/** 스킬 1회 발동의 개별 효과 */
export type BossSkillEffect =
  | { type: "damage"; amount: number; alsoAdjacent?: boolean }
  | { type: "defenseDown"; amount: number; turns: number }
  | { type: "shieldFromLostHp"; ratio: number }
  | { type: "removeRecentDebuff"; count: number };

/** 쿨타임마다 자동 발동되는 스킬 */
export interface BossSkill {
  id: string;
  name: string;
  cooldownTurns: number; // 재사용 대기 (예: 2 = 2*턴)
  initialCooldown?: number; // 첫 발동까지 대기 (미지정 시 cooldownTurns)
  targetRule: BossTargetRule;
  effects: BossSkillEffect[];
}

/** 평타 규칙 */
export interface BossBasicAttack {
  targetRule: BossTargetRule;
}

/** 보스 1종의 전체 정의 */
export interface BossDefinition {
  id: string;
  name: string;
  baseUnitId?: string; // 고증 참조 (기존 유닛 이름)
  imageUrl?: string;
  hp: number;
  atk: number;
  passives: BossPassive[];
  skills: BossSkill[];
  basicAttack: BossBasicAttack;
}
