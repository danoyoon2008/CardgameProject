import type { FieldCard, SimulationPlayerField } from "../../../types/game";
import {
  applySuppressionDebuffToUnit,
  canApplySuppressionDebuffToUnit,
  isSuppressionActive,
  SUPPRESSION_INITIAL_END_TURN_TICKS,
} from "../debuffs/suppression";
import { normalizeSpellStack, type FieldSliceWithSpell } from "../fieldSpellAccess";
import { suppressSkillLinksForSuppressedVictim } from "../suppressionSkillLinkSuppression";
import type { SimulationPlayerFieldSlice } from "../simulationDeathCleanup";
import {
  grantElWingSinseokGaugeFromMeteoSplash,
  isElWingBlockingEnemyAttackSpell,
} from "../units/elWing";
import {
  aebeolaekingRiderSlotKey,
  getAebeolaekingRiderTrueOwner,
  hasAebeolaekingRider,
} from "../units/aebeolaeking";

/** No.43 마법 — 자기 스펠 칸에 4×턴 유지, 배치 시 모든 적에게 [제압] */
export const ANT_HELL_SPELL_ID = "개미지옥" as const;

/** 4×턴 = 양측 턴 종료 합 8회(비즈니스 강도단·[제압] 디버프와 동일) */
export const ANT_HELL_SPELL_INITIAL_END_TURN_TICKS = 8;

type CardRowLite = { name?: string; number?: number };

export function isAntHellSpellCard(
  card: FieldCard | CardRowLite | null | undefined
): boolean {
  if (!card) return false;
  if (card.name === ANT_HELL_SPELL_ID) return true;
  const n = Number((card as FieldCard).number);
  return Number.isFinite(n) && n === 43;
}

export function isAntHellActiveOnSpell(spell: FieldCard | null | undefined): boolean {
  return isAntHellSpellCard(spell) && (spell!.antHellEndTurnTicksRemaining ?? 0) > 0;
}

/** 스펠 스택에 활성 개미지옥이 있는지 */
export function spellStackHasActiveAntHell(
  field: FieldSliceWithSpell | SimulationPlayerField | null | undefined
): boolean {
  return normalizeSpellStack(field).some(isAntHellActiveOnSpell);
}

/** `victimPlayer` 입장에서 상대 스펠 칸에 개미지옥이 있으면 시전자 플레이어 반환 */
export function getAntHellCasterAgainstPlayer(
  victimPlayer: "A" | "B",
  playerAField: FieldSliceWithSpell | SimulationPlayerField,
  playerBField: FieldSliceWithSpell | SimulationPlayerField
): "A" | "B" | null {
  const caster = victimPlayer === "A" ? "B" : "A";
  const casterField = caster === "A" ? playerAField : playerBField;
  return spellStackHasActiveAntHell(casterField) ? caster : null;
}

function stripAntHellRuntimeFields(spell: FieldCard): FieldCard {
  const { antHellEndTurnTicksRemaining: _a, ...rest } = spell;
  return rest as FieldCard;
}

/** 턴 넘김 1회마다 스펠 칸 개미지옥 틱 — 0이 되면 스펠 제거·리와인드용 카드 반환 */
export function applyEndTurnAntHellSpellToField(spell: FieldCard | null): {
  nextSpell: FieldCard | null;
  expiredToRewind: FieldCard | null;
} {
  if (!isAntHellActiveOnSpell(spell)) {
    return { nextSpell: spell, expiredToRewind: null };
  }
  const n = spell!.antHellEndTurnTicksRemaining!;
  const next = n - 1;
  if (next <= 0) {
    return { nextSpell: null, expiredToRewind: stripAntHellRuntimeFields(spell!) };
  }
  return {
    nextSpell: { ...spell!, antHellEndTurnTicksRemaining: next },
    expiredToRewind: null,
  };
}

/** 개미지옥으로 적 유닛에 [제압] 부여(면역 진영·디버프 면역 유닛은 스킵) */
export function applyAntHellSuppressionToEnemyUnit(args: {
  target: FieldCard;
  targetSlot: "is" | "m" | "os";
  victimPlayer: "A" | "B";
  playerA: SimulationPlayerFieldSlice;
  playerB: SimulationPlayerFieldSlice;
  globalTurnCount: number;
}): { nextTarget: FieldCard; applied: boolean } {
  const victimField =
    args.victimPlayer === "A" ? args.playerA.field : args.playerB.field;
  const ctx = {
    allyPlayer: args.victimPlayer,
    playerAField: args.playerA.field,
    playerBField: args.playerB.field,
  };
  if (!canApplySuppressionDebuffToUnit(victimField, ctx)) {
    return { nextTarget: args.target, applied: false };
  }
  const nextTarget = applySuppressionDebuffToUnit(
    args.target,
    SUPPRESSION_INITIAL_END_TURN_TICKS
  );
  victimField[args.targetSlot] = nextTarget;

  suppressSkillLinksForSuppressedVictim(
    args.victimPlayer,
    args.targetSlot,
    args.playerA,
    args.playerB,
    args.globalTurnCount
  );

  return { nextTarget, applied: true };
}

export type AntHellSuppressionWaveResult = {
  appliedSlotKeys: string[];
  elWingImmunitySlotKeys: string[];
};

export type AntHellSingleApplyResult = {
  appliedSlotKey: string | null;
  elWingImmunitySlotKey: string | null;
};

/** 배치 시 적 전원에게 [제압] 1회 적용(엘 윙 [마법 면역] 시 스킵·신속 충전) */
export function applyAntHellSuppressionWaveToEnemies(args: {
  casterPlayer: "A" | "B";
  playerA: SimulationPlayerFieldSlice;
  playerB: SimulationPlayerFieldSlice;
  globalTurnCount: number;
  /** true면 이미 [제압]인 유닛은 건너뜀(지속 동기화용) */
  skipAlreadySuppressed?: boolean;
  /** true(기본)면 엘 윙 면역 시 신속 스택 충전. 지속 동기화에선 false로 재충전 방지. */
  grantElWingSinseok?: boolean;
}): AntHellSuppressionWaveResult {
  const enemyPlayer = args.casterPlayer === "A" ? "B" : "A";
  const enemySide =
    enemyPlayer === "A" ? args.playerA.field : args.playerB.field;
  const casterSide =
    args.casterPlayer === "A" ? args.playerA.field : args.playerB.field;
  const appliedSlotKeys: string[] = [];
  const elWingImmunitySlotKeys: string[] = [];

  for (const slotName of ["is", "m", "os"] as const) {
    const unit = enemySide[slotName];
    if (!unit || unit.currentHp <= 0) continue;
    if (args.skipAlreadySuppressed && isSuppressionActive(unit)) continue;
    if (
      isElWingBlockingEnemyAttackSpell(
        unit,
        enemyPlayer,
        slotName,
        args.playerA.field as SimulationPlayerField,
        args.playerB.field as SimulationPlayerField
      )
    ) {
      elWingImmunitySlotKeys.push(`${enemyPlayer}-${slotName}`);
      if (args.grantElWingSinseok !== false) {
        enemySide[slotName] = grantElWingSinseokGaugeFromMeteoSplash(unit);
      }
      continue;
    }

    const { applied } = applyAntHellSuppressionToEnemyUnit({
      target: unit,
      targetSlot: slotName,
      victimPlayer: enemyPlayer,
      playerA: args.playerA,
      playerB: args.playerB,
      globalTurnCount: args.globalTurnCount,
    });
    if (applied) {
      appliedSlotKeys.push(`${enemyPlayer}-${slotName}`);
    }
  }

  /**
   * 애벌레킹(W) 적측 W 처리 — 시전자 본인의 host에 부착된 적의 W(true owner = enemyPlayer)에도 [제압] 부여.
   * - W의 진정한 소유자(true owner)가 enemyPlayer면 적 W이므로 디버프 대상.
   * - 디버프 면역 검사는 W의 진정한 소유자 필드(=enemySide) 기준.
   * - 엘 윙은 host 카드에만 적용되므로 W에는 영향 없음.
   */
  for (const slotName of ["is", "m", "os"] as const) {
    const host = casterSide[slotName];
    if (!host || !hasAebeolaekingRider(host)) continue;
    const rider = host.parasiteRider!;
    if ((rider.currentHp ?? 0) <= 0) continue;
    const trueOwner = getAebeolaekingRiderTrueOwner(rider);
    if (trueOwner !== enemyPlayer) continue;
    if (args.skipAlreadySuppressed && isSuppressionActive(rider)) continue;
    /* W의 디버프 면역 검사 — W의 진정한 소유자 필드 기준(IronKiwi/StartingTree). */
    const riderAllyField =
      trueOwner === "A" ? args.playerA.field : args.playerB.field;
    if (
      !canApplySuppressionDebuffToUnit(riderAllyField, {
        allyPlayer: trueOwner,
        playerAField: args.playerA.field,
        playerBField: args.playerB.field,
      })
    ) {
      continue;
    }
    const newRider = applySuppressionDebuffToUnit(
      rider,
      SUPPRESSION_INITIAL_END_TURN_TICKS
    );
    casterSide[slotName] = { ...host, parasiteRider: newRider };
    appliedSlotKeys.push(aebeolaekingRiderSlotKey(args.casterPlayer, slotName));
  }

  return { appliedSlotKeys, elWingImmunitySlotKeys };
}

/** 개미지옥 유지 중 — 아직 [제압]이 없는 적 유닛에 동기화 */
export function syncAntHellSuppressionForActiveCasters(args: {
  playerA: SimulationPlayerFieldSlice;
  playerB: SimulationPlayerFieldSlice;
  globalTurnCount: number;
}): AntHellSuppressionWaveResult {
  const merged: AntHellSuppressionWaveResult = {
    appliedSlotKeys: [],
    elWingImmunitySlotKeys: [],
  };
  if (spellStackHasActiveAntHell(args.playerA.field)) {
    const w = applyAntHellSuppressionWaveToEnemies({
      casterPlayer: "A",
      playerA: args.playerA,
      playerB: args.playerB,
      globalTurnCount: args.globalTurnCount,
      skipAlreadySuppressed: true,
      grantElWingSinseok: false,
    });
    merged.appliedSlotKeys.push(...w.appliedSlotKeys);
    merged.elWingImmunitySlotKeys.push(...w.elWingImmunitySlotKeys);
  }
  if (spellStackHasActiveAntHell(args.playerB.field)) {
    const w = applyAntHellSuppressionWaveToEnemies({
      casterPlayer: "B",
      playerA: args.playerA,
      playerB: args.playerB,
      globalTurnCount: args.globalTurnCount,
      skipAlreadySuppressed: true,
      grantElWingSinseok: false,
    });
    merged.appliedSlotKeys.push(...w.appliedSlotKeys);
    merged.elWingImmunitySlotKeys.push(...w.elWingImmunitySlotKeys);
  }
  return merged;
}

/** 적 유닛이 필드에 들어올 때 상대 개미지옥이 있으면 [제압] 부여 */
export function tryApplyAntHellSuppressionOnEnemyUnitDeploy(args: {
  victimPlayer: "A" | "B";
  victimSlot: "is" | "m" | "os";
  playerA: SimulationPlayerFieldSlice;
  playerB: SimulationPlayerFieldSlice;
  globalTurnCount: number;
}): AntHellSingleApplyResult {
  const caster = getAntHellCasterAgainstPlayer(
    args.victimPlayer,
    args.playerA.field,
    args.playerB.field
  );
  if (!caster) {
    return { appliedSlotKey: null, elWingImmunitySlotKey: null };
  }

  const victimField =
    args.victimPlayer === "A" ? args.playerA.field : args.playerB.field;
  const unit = victimField[args.victimSlot];
  if (!unit || unit.currentHp <= 0) {
    return { appliedSlotKey: null, elWingImmunitySlotKey: null };
  }
  if (isSuppressionActive(unit)) {
    return { appliedSlotKey: null, elWingImmunitySlotKey: null };
  }

  const slotKey = `${args.victimPlayer}-${args.victimSlot}`;
  if (
    isElWingBlockingEnemyAttackSpell(
      unit,
      args.victimPlayer,
      args.victimSlot,
      args.playerA.field as SimulationPlayerField,
      args.playerB.field as SimulationPlayerField
    )
  ) {
    victimField[args.victimSlot] = grantElWingSinseokGaugeFromMeteoSplash(unit);
    return { appliedSlotKey: null, elWingImmunitySlotKey: slotKey };
  }

  const { applied } = applyAntHellSuppressionToEnemyUnit({
    target: unit,
    targetSlot: args.victimSlot,
    victimPlayer: args.victimPlayer,
    playerA: args.playerA,
    playerB: args.playerB,
    globalTurnCount: args.globalTurnCount,
  });
  return {
    appliedSlotKey: applied ? slotKey : null,
    elWingImmunitySlotKey: null,
  };
}
