/**

 * 시뮬레이션 전용 — 유닛이 필드에서 제거될 때 스킬 링크 해제 + (옵션) 다크나이트 소울 충전.

 * `SimulationView` / `useSimulationLogic` 에서 공유합니다.

 */

import type { FieldCard } from "../../types/game";

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

