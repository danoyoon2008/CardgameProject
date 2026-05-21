/**
 * 디너 [혼란] — 링크형 액티브(에리스티나 반짓고리·라임 방울 보호막 등) 강제 해제.
 * 시전자 본인만 [혼란]일 때 링크·버프 해제. 수혜 아군이 [혼란]이어도 버프 유지.
 * `SimulationView` / `useSimulationLogic` 공유.
 */
import type { FieldCard } from "../../types/game";
import { hasConfusionStatus } from "./units/dinner";
import { ERISTINA_ID } from "./units/eristina";
import { LIME_ID } from "./units/lime";
import type { SimulationPlayerFieldSlice } from "./simulationDeathCleanup";

function facingOppAtSlot(
  player: "A" | "B",
  slot: "is" | "m" | "os",
  playerA: SimulationPlayerFieldSlice,
  playerB: SimulationPlayerFieldSlice
): FieldCard | null {
  const opp = player === "A" ? "B" : "A";
  const f = opp === "A" ? playerA.field : playerB.field;
  return f[slot] ?? null;
}

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

function endConfusedEristinaActiveSkill(
  casterPlayer: "A" | "B",
  casterSlot: "is" | "m" | "os",
  playerA: SimulationPlayerFieldSlice,
  playerB: SimulationPlayerFieldSlice,
  currentGlobalTurn: number
): boolean {
  const casterField = casterPlayer === "A" ? playerA.field : playerB.field;
  const caster = casterField[casterSlot];
  if (!caster || caster.name !== ERISTINA_ID || !caster.isSkillActive) return false;

  const linked = caster.linkedTarget;
  if (linked) {
    const [tPlayer, tSlot] = String(linked).split("-");
    if (tPlayer === "A" || tPlayer === "B") {
      const tl = tSlot as "is" | "m" | "os";
      if (tl === "is" || tl === "m" || tl === "os") {
        clearBanjitTarget(tPlayer, tl, playerA, playerB);
      }
    }
  }

  casterField[casterSlot] = {
    ...caster,
    isSkillActive: false,
    linkedTarget: null,
    /** 스킬 유지 중 강제 해제 — 쿨은 해제 시점부터 `globalTurnCount` 기준으로 감소 */
    skillLastUsedGlobalTurn: currentGlobalTurn,
  };
  return true;
}

function endConfusedLimeActiveSkill(
  casterPlayer: "A" | "B",
  casterSlot: "is" | "m" | "os",
  playerA: SimulationPlayerFieldSlice,
  playerB: SimulationPlayerFieldSlice,
  currentGlobalTurn: number
): boolean {
  const casterField = casterPlayer === "A" ? playerA.field : playerB.field;
  const caster = casterField[casterSlot];
  if (!caster || caster.name !== LIME_ID || !caster.isSkillActive) return false;

  const linked = caster.linkedTarget;
  if (linked) {
    const [tPlayer, tSlot] = String(linked).split("-");
    if (tPlayer === "A" || tPlayer === "B") {
      const tl = tSlot as "is" | "m" | "os";
      if (tl === "is" || tl === "m" || tl === "os") {
        clearLimeBubbleTarget(tPlayer, tl, playerA, playerB);
      }
    }
  }

  casterField[casterSlot] = {
    ...caster,
    isSkillActive: false,
    linkedTarget: null,
    skillLastUsedGlobalTurn: currentGlobalTurn,
  };
  return true;
}

/**
 * [혼란]인 **시전자 본인**(에리스티나·라임)의 링크만 해제. 혼란인 아군 수혜자 버프는 유지.
 * 변경이 있으면 true.
 */
export function suppressActiveSkillLinksForConfusion(
  playerA: SimulationPlayerFieldSlice,
  playerB: SimulationPlayerFieldSlice,
  currentGlobalTurn: number
): boolean {
  let changed = false;

  for (const player of ["A", "B"] as const) {
    for (const slot of ["is", "m", "os"] as const) {
      const field = player === "A" ? playerA.field : playerB.field;
      const card = field[slot];
      if (!card || (card.currentHp ?? 0) <= 0) continue;

      const opp = facingOppAtSlot(player, slot, playerA, playerB);
      if (!hasConfusionStatus(card, opp)) continue;

      if (card.name === ERISTINA_ID && endConfusedEristinaActiveSkill(player, slot, playerA, playerB, currentGlobalTurn)) {
        changed = true;
      }
      if (card.name === LIME_ID && endConfusedLimeActiveSkill(player, slot, playerA, playerB, currentGlobalTurn)) {
        changed = true;
      }
    }
  }

  return changed;
}
