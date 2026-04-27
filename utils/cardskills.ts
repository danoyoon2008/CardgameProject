// utils/cardskills.ts
import { FieldCard } from "../types/game";

// 1. 스킬 발동 시 필요한 상황(컨텍스트) 정보 정의
export interface PostAttackContext {
  damageDealt: number; // 입힌 피해량
  targetDestroyed?: boolean; // 공격한 타겟이 파괴되었는지 여부
  applyFieldHeal?: (amt: number) => void;
  applyFieldBuff?: (key: string) => void;
}

// 2. 카드별 공격 후 스킬 로직 사전
const postAttackRegistry: Record<string, (card: FieldCard, ctx: PostAttackContext) => Partial<FieldCard>> = {
  
  "그냥 모자": (card, ctx) => {
    const healAmount = Math.floor(ctx.damageDealt * 0.5);
    const maxHp = Number(card.hp);
    const newCurrentHp = Math.min(maxHp, card.currentHp + healAmount);
    
    console.log(`[스킬 발동] 그냥 모자 흡혈: ${healAmount} 회복 (현재 체력: ${newCurrentHp}/${maxHp})`);
    
    return { currentHp: newCurrentHp };
  },

  "고스톤": (card, ctx) => {
    if (ctx.targetDestroyed) {
      const maxHp = Number(card.hp);
      console.log(`[스킬 발동] 🩸 고스톤 적 처치! 체력 100% 회복 (현재 체력: ${card.currentHp} -> ${maxHp})`);
      return { currentHp: maxHp };
    }
    return {};
  },
};

// 3. 공격 후 스킬 메인 실행 함수
export const applyPostAttackSkills = (attackerCard: FieldCard, context: PostAttackContext): Partial<FieldCard> => {
  const skillFunction = postAttackRegistry[attackerCard.name];
  
  if (skillFunction) {
    const result = skillFunction(attackerCard, context);
    return result;
  }
  
  return {}; 
};

// 4. 상시 적용(오라/버프) 상태 이상 확인 함수
export const getActiveStatuses = (myCard: FieldCard | null, oppCard: FieldCard | null): string[] => {
  if (!myCard) return [];
  const statuses: string[] = [];

  // No.22 필립 패시브 (디버프)
  if (oppCard && oppCard.name === "필립") {
    statuses.push("침묵");
  }

  // No.27 철기병 패시브 (자기 자신 버프)
  if (myCard.name === "철기병") {
    statuses.push("도발");
    statuses.push("방어력 +200");
  }

  // ⭐️ [신규] No.2 에리스티나 액티브 스킬 (부여된 버프 확인)
  if ((myCard as any).hasBanjitgori) {
    statuses.push("반짓고리");
  }

  return statuses;
};