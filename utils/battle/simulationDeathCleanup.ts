/**

 * 시뮬레이션 전용 — 유닛이 필드에서 제거될 때 스킬 링크 해제 + (옵션) 다크나이트 소울 충전.

 * `SimulationView` / `useSimulationLogic` 에서 공유합니다.

 */

import type { CardRow, FieldCard } from "../../types/game";

import { incrementDarkKnightGaugesOnUnitDeath } from "./units/darkKnight";



export type SimulationPlayerFieldSlice = {

  field: {

    is: FieldCard | null;

    m: FieldCard | null;

    os: FieldCard | null;

    spell?: FieldCard | null;

  };

};



export type CleanupSimulationUnitDeathOptions = {

  /** true면 다크나이트 소울 충전(전역 사망 연동)을 건너뜀 — 소멸 등 “사망”이 아닌 즉시 제거 */

  skipDarkKnightSoulIncrement?: boolean;

};



function clearLinkedCasterSkillState(

  deadCard: FieldCard,

  newPA: SimulationPlayerFieldSlice,

  newPB: SimulationPlayerFieldSlice,

  currentGlobalTurn: number

): void {

  const src = (deadCard as FieldCard & { linkedSource?: string | null }).linkedSource;

  if (!src) return;

  const [sPlayer, sSlot] = String(src).split("-");

  const sField = sPlayer === "A" ? newPA.field : newPB.field;

  const sl = sSlot as "is" | "m" | "os";

  if (sField[sl]) {

    sField[sl] = {

      ...sField[sl]!,

      isSkillActive: false,

      linkedTarget: null,

      skillLastUsedGlobalTurn: currentGlobalTurn,

    };

  }

}



/**
 * 재소환 시 CardRow 원본만 보존 — FieldCard 런타임 상태는 전부 제거.
 * @see CardRow — 필드 추가 시 이 목록도 갱신
 */
export const PRESERVED_CARD_ROW_KEYS = [
  "id",
  "number",
  "name",
  "category",
  "type",
  "rarity",
  "cost",
  "hp",
  "atk",
  "duration",
  "passive_name",
  "passive_detail",
  "active_name",
  "active_detail",
  "description_detail",
  "image_url",
  "_deckInstanceId",
  "_ownerTeam",
] as const;

/**
 * 일반전 덱 사이클 재소환 시 — 카드를 원본 CardRow 데이터로 완전 환원한다.
 * (귀환 부활·필드 유지 등 의도적 상태 보존 경로에는 적용하지 않음.)
 */
export function resetCardToOriginalForResummon(card: CardRow | FieldCard): CardRow {
  const fresh: Record<string, unknown> = {};
  for (const key of PRESERVED_CARD_ROW_KEYS) {
    if (card[key] !== undefined) fresh[key] = card[key];
  }
  return fresh as CardRow;
}

export function cleanupSimulationUnitDeath(

  deadCard: FieldCard,

  newPA: SimulationPlayerFieldSlice,

  newPB: SimulationPlayerFieldSlice,

  currentGlobalTurn: number,

  options?: CleanupSimulationUnitDeathOptions

): void {

  if ((deadCard as FieldCard & { hasBanjitgori?: boolean }).hasBanjitgori && (deadCard as FieldCard & { linkedSource?: string | null }).linkedSource) {

    clearLinkedCasterSkillState(deadCard, newPA, newPB, currentGlobalTurn);

  }

  if ((deadCard as FieldCard & { hasLimeBubbleShieldBuff?: boolean }).hasLimeBubbleShieldBuff && (deadCard as FieldCard & { linkedSource?: string | null }).linkedSource) {

    clearLinkedCasterSkillState(deadCard, newPA, newPB, currentGlobalTurn);

  }

  if ((deadCard as FieldCard & { isSkillActive?: boolean }).isSkillActive && (deadCard as FieldCard & { linkedTarget?: string | null }).linkedTarget) {

    const [tPlayer, tSlot] = String((deadCard as FieldCard & { linkedTarget?: string }).linkedTarget).split("-");

    const tField = tPlayer === "A" ? newPA.field : newPB.field;

    const tl = tSlot as "is" | "m" | "os";

    if (tField[tl]) {

      const cur = tField[tl]!;

      const next: FieldCard = { ...cur };

      if (next.hasBanjitgori) {

        next.hasBanjitgori = false;

        next.linkedSource = null;

      }

      if (next.hasLimeBubbleShieldBuff) {

        next.hasLimeBubbleShieldBuff = false;

        next.linkedSource = null;

      }

      tField[tl] = next;

    }

  }

  if (!options?.skipDarkKnightSoulIncrement) {

    incrementDarkKnightGaugesOnUnitDeath(newPA, newPB);

  }

}

