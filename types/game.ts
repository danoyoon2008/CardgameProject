// types/game.ts

export interface CardRow {
  name: string;
  // ... 기타 기존 CardRow 속성들 (id, type, cost, atk, hp 등 프로젝트에 맞게 유지) ...
  [key: string]: any; 
}

export interface FieldCard extends CardRow {
  currentHp: number;
  hasAttacked: boolean;
  summonedTurn: string;
  
  // 👇 이전 업데이트에서 누락되었던 속성 (다구리 방지용)
  hasBeenAttackedThisTurn: boolean; 
  
  // 👇 철기병 & 에리스티나를 위해 추가했던 스킬 관련 속성들
  skillLastUsedGlobalTurn?: number;
  isSkillActive?: boolean;
  linkedTarget?: string | null;
  hasBanjitgori?: boolean;
  linkedSource?: string | null;
}