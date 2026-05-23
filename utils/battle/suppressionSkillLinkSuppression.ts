/**
 * [제압] — 에리스티나·라임 등 링크형 액티브 강제 해제(수혜자 기준).
 * 혼란은 시전자 기준, 제압은 피해자(수혜) 기준.
 */
import type { FieldCard } from "../../types/game";
import { ERISTINA_ID } from "./units/eristina";
import { LIME_ID } from "./units/lime";
import type { SimulationPlayerFieldSlice } from "./simulationDeathCleanup";

function clearBanjitTarget(
  targetPlayer: "A" | "B",
  targetSlot: "is" | "m" | "os",
  playerA: SimulationPlayerFieldSlice,
  playerB: SimulationPlayerFieldSlice
): void {
  const tField = targetPlayer === "A" ? playerA.field : playerB.field;
  const target = tField[targetSlot];
  if (!target) return;
  tField[targetSlot] = {
    ...target,
    hasBanjitgori: false,
    linkedSource: null,
  };
}

function clearLimeBubbleTarget(
  targetPlayer: "A" | "B",
  targetSlot: "is" | "m" | "os",
  playerA: SimulationPlayerFieldSlice,
  playerB: SimulationPlayerFieldSlice
): void {
  const tField = targetPlayer === "A" ? playerA.field : playerB.field;
  const target = tField[targetSlot];
  if (!target) return;
  tField[targetSlot] = {
    ...target,
    hasLimeBubbleShieldBuff: false,
    linkedSource: null,
  };
}

function endEristinaLinkToVictim(
  casterPlayer: "A" | "B",
  casterSlot: "is" | "m" | "os",
  victimPlayer: "A" | "B",
  victimSlot: "is" | "m" | "os",
  playerA: SimulationPlayerFieldSlice,
  playerB: SimulationPlayerFieldSlice,
  currentGlobalTurn: number
): void {
  const casterField = casterPlayer === "A" ? playerA.field : playerB.field;
  const caster = casterField[casterSlot];
  if (!caster || caster.name !== ERISTINA_ID || !caster.isSkillActive) return;

  clearBanjitTarget(victimPlayer, victimSlot, playerA, playerB);
  casterField[casterSlot] = {
    ...caster,
    isSkillActive: false,
    linkedTarget: null,
    skillLastUsedGlobalTurn: currentGlobalTurn,
  };
}

function endLimeLinkToVictim(
  casterPlayer: "A" | "B",
  casterSlot: "is" | "m" | "os",
  victimPlayer: "A" | "B",
  victimSlot: "is" | "m" | "os",
  playerA: SimulationPlayerFieldSlice,
  playerB: SimulationPlayerFieldSlice,
  currentGlobalTurn: number
): void {
  const casterField = casterPlayer === "A" ? playerA.field : playerB.field;
  const caster = casterField[casterSlot];
  if (!caster || caster.name !== LIME_ID || !caster.isSkillActive) return;

  clearLimeBubbleTarget(victimPlayer, victimSlot, playerA, playerB);
  casterField[casterSlot] = {
    ...caster,
    isSkillActive: false,
    linkedTarget: null,
    skillLastUsedGlobalTurn: currentGlobalTurn,
  };
}

/**
 * [제압]이 걸린 유닛을 향한 링크·버프 해제. 시전자 스킬 종료·쿨 감소 시작.
 */
export function suppressSkillLinksForSuppressedVictim(
  victimPlayer: "A" | "B",
  victimSlot: "is" | "m" | "os",
  playerA: SimulationPlayerFieldSlice,
  playerB: SimulationPlayerFieldSlice,
  currentGlobalTurn: number
): boolean {
  const victimKey = `${victimPlayer}-${victimSlot}`;
  let changed = false;

  for (const casterPlayer of ["A", "B"] as const) {
    for (const casterSlot of ["is", "m", "os"] as const) {
      const field = casterPlayer === "A" ? playerA.field : playerB.field;
      const card = field[casterSlot];
      if (!card || (card.currentHp ?? 0) <= 0) continue;
      if (card.linkedTarget !== victimKey) continue;

      if (card.name === ERISTINA_ID && card.isSkillActive) {
        endEristinaLinkToVictim(
          casterPlayer,
          casterSlot,
          victimPlayer,
          victimSlot,
          playerA,
          playerB,
          currentGlobalTurn
        );
        changed = true;
      }
      if (card.name === LIME_ID && card.isSkillActive) {
        endLimeLinkToVictim(
          casterPlayer,
          casterSlot,
          victimPlayer,
          victimSlot,
          playerA,
          playerB,
          currentGlobalTurn
        );
        changed = true;
      }
    }
  }

  return changed;
}
