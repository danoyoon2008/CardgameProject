/**
 * 전설의 검 연격 — 고정 피해(공격력 증감·공격권 미적용), 방어/무적/보호막·백스 규칙만 적용.
 */
import type { FieldCard, SimulationPlayerField } from "../../../types/game";
import { callieBuffBanSuppressesBuffsForVictim } from "./kalli";
import { applyIncomingDefenseDamage } from "./mary";
import { hpBarrierPatchFromRemaining, splitDamageThroughHpBarrier } from "../spells/orietChosang";
import { isInvulnerableFromBaekseuOrCheolbyeok } from "../spells/cheolbyeok";
import { resolveBaekseuFatalDamage } from "./baekseu";
import { getMorningMoodDeathAllyHeal } from "./morningMood";
import { getStartingTreeAllyHealOnDamaged } from "./startingTree";

export type LegendarySwordStrikeResolveResult = {
  newHp: number;
  hpLoss: number;
  actualDamage: number;
  isDestroyed: boolean;
  baekseuPatch: Partial<FieldCard>;
  barrierPatch: Partial<FieldCard>;
  targetMitigation: number;
  morningMoodDeathHeal: number;
  startingTreeAllyHeal: number;
  pakkiDebuff: boolean;
};

export function resolveLegendarySwordStrikeOnUnit(args: {
  baseDamage: number;
  target: FieldCard;
  targetPlayer: "A" | "B";
  targetSlot: "is" | "m" | "os";
  playerAField: SimulationPlayerField;
  playerBField: SimulationPlayerField;
}): LegendarySwordStrikeResolveResult {
  const { baseDamage, target, targetPlayer, targetSlot, playerAField, playerBField } = args;
  const victimField = targetPlayer === "A" ? playerAField : playerBField;
  const slotKey = `${targetPlayer}-${targetSlot}`;

  let afterBanjit = baseDamage;
  let banjitMit = 0;
  if (
    (target as FieldCard & { hasBanjitgori?: boolean }).hasBanjitgori &&
    !callieBuffBanSuppressesBuffsForVictim(targetPlayer, targetSlot, playerAField, playerBField)
  ) {
    const floored = Math.floor((baseDamage * 0.75) / 50) * 50;
    banjitMit = Math.max(0, baseDamage - floored);
    afterBanjit = floored;
  }

  const defenseResult = applyIncomingDefenseDamage(
    afterBanjit,
    target,
    playerAField,
    playerBField,
    slotKey
  );
  const defenseMit =
    !isInvulnerableFromBaekseuOrCheolbyeok(target, victimField)
      ? Math.max(0, afterBanjit - defenseResult.finalDamage)
      : 0;
  const coreAfterDefense = isInvulnerableFromBaekseuOrCheolbyeok(target, victimField)
    ? afterBanjit
    : defenseResult.finalDamage;
  let actualDamage = isInvulnerableFromBaekseuOrCheolbyeok(target, victimField) ? 0 : coreAfterDefense;

  const barrierSplit = splitDamageThroughHpBarrier(target, actualDamage);
  const hpAfterRaw = target.currentHp - barrierSplit.damageToCurrentHp;
  const oppFieldForFacing = targetPlayer === "A" ? playerBField : playerAField;
  const resolved = resolveBaekseuFatalDamage(
    target,
    hpAfterRaw,
    barrierSplit.damageToCurrentHp,
    oppFieldForFacing[targetSlot] ?? null
  );
  const newHp = resolved.finalHp;
  const hpLoss = Math.max(0, target.currentHp - newHp);
  const targetMitigation = banjitMit + defenseMit + Math.max(0, actualDamage - hpLoss);
  const isDestroyed = resolved.isDestroyed;

  const morningMoodDeathHeal = isDestroyed
    ? getMorningMoodDeathAllyHeal(target, oppFieldForFacing[targetSlot] ?? null)
    : 0;
  const startingTreeAllyHeal = getStartingTreeAllyHealOnDamaged(
    target,
    hpLoss,
    oppFieldForFacing[targetSlot] ?? null
  );

  const barrierPatch = hpBarrierPatchFromRemaining(barrierSplit.nextBarrierRemaining);

  return {
    newHp,
    hpLoss,
    actualDamage: hpLoss,
    isDestroyed,
    baekseuPatch: resolved.patch,
    barrierPatch,
    targetMitigation,
    morningMoodDeathHeal: morningMoodDeathHeal || 0,
    startingTreeAllyHeal,
    pakkiDebuff: false,
  };
}
