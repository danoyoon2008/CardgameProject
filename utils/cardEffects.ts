// utils/cardEffects.ts
//
// 패시브/피해/공격 후 효과 — 구현은 `utils/battle/units/*` + `registry.ts` 에서 관리합니다.

import { FieldCard, SimulationPlayerField } from "../types/game";
import type { AttackContext } from "./battle/effectTypes";
import {
  passiveStatusRegistry,
  postAttackRegistry,
  damageModRegistry,
  onSummonRegistry,
} from "./battle/units/registry";
import { fieldHasLivingFocusedFireAura, unitReceivesFocusedFireBenefits } from "./battle/units/diago";
import { fieldSpellStackGrantsFocusedFire } from "./battle/spellStack";
import {
  DARK_KNIGHT_ID,
  YORIN_STATUS_BADGE,
  isDarkKnightPassivesPausedByConfusion,
} from "./battle/units/darkKnight";
import { getMaxellandTenacityStatusBadge } from "./battle/units/maxelland";
import {
  DEBUFF_IMMUNITY_BADGE,
  fieldHasLivingIronKiwi,
} from "./battle/units/ironKiwi";
import { PYRED_ATTACK_AURA_BADGE, PYRED_ID, getPyredAttackAuraStatuses } from "./battle/units/pyred";
import { getMorningMoodAttackAuraStatuses } from "./battle/units/morningMood";
import { fieldHasLivingStartingTree, getStartingTreeAttackAuraStatuses } from "./battle/units/startingTree";
import { getStatusNamesFromPhilipMatchup } from "./battle/units/philip";
import {
  getActiveConfusionStatusNames,
  hasConfusionStatus,
  isConfused,
} from "./battle/units/dinner";
import { getEondeokSilenceStatusesForCard } from "./battle/spells/eondeok";
import { getBangEomakAllyDefenseStatuses } from "./battle/spells/bangeomak";
import { getEffectSemanticKind } from "./battle/effectSemantics";
import { MARY_DEFENSE_BUFF_BADGE, MARY_ID, maryDefenseBuffActive } from "./battle/units/mary";
import { LIME_BUBBLE_DEFENSE_BADGE } from "./battle/units/lime";
import { PAKKI_ATTACK_DEBUFF_BADGE } from "./battle/units/pakki";
import { isStunned, STUN_STATUS } from "./battle/units/elixir5";
import { BUFF_BAN_BADGE, callieBuffBanSuppressesBuffsForVictim } from "./battle/units/kalli";
import {
  EL_WING_MAGIC_IMMUNITY_BADGE,
  elWingShowsMagicImmunity,
  isElWingUnit,
} from "./battle/units/elWing";
import {
  BAEKSEU_INVULN_BADGE,
  isBaekseuInvulnerable,
  isHarmfulEffectLabelBlockedByBaekseuInvuln,
} from "./battle/units/baekseu";
import { isInvulnerableFromBaekseuOrCheolbyeok } from "./battle/spells/cheolbyeok";
import { isTauntSuppressedByRyeomhwaForUnitOwner } from "./battle/units/ryeomhwa";
import {
  getSuppressionStatusesForCard,
  isSuppressionActive,
  suppressionBlocksExternalBuffEffects,
  filterStatusesForSuppressionDisplay,
} from "./battle/debuffs/suppression";

export { isStunned };

export type { AttackContext, DamageModContext, FieldContext } from "./battle/effectTypes";

/** `getActiveStatuses` — 메리 패시브 등 전장 양쪽이 필요할 때 전달 */
export type ActiveStatusBattleContext = {
  playerAField: SimulationPlayerField;
  playerBField: SimulationPlayerField;
  mySlotKey: string;
};

// ─────────────────────────────────────────
// ★ 공개 API
// ─────────────────────────────────────────

export const getActiveStatuses = (
  myCard: FieldCard | null,
  oppCard: FieldCard | null,
  myField?: SimulationPlayerField,
  battleCtx?: ActiveStatusBattleContext
): string[] => {
  if (!myCard) return [];

  if (hasConfusionStatus(myCard, oppCard)) {
    const confusedStatuses = [...getActiveConfusionStatusNames(oppCard)];
    let callieBuffBanOnVictim = false;
    if (battleCtx?.mySlotKey) {
      const segs = battleCtx.mySlotKey.split("-");
      if (segs.length === 2) {
        const pl = segs[0] as "A" | "B";
        const sl = segs[1] as "is" | "m" | "os" | "spell";
        if (sl === "is" || sl === "os") {
          callieBuffBanOnVictim = callieBuffBanSuppressesBuffsForVictim(
            pl,
            sl,
            battleCtx.playerAField,
            battleCtx.playerBField
          );
        }
      }
    }
    if (myCard.hasBanjitgori && !callieBuffBanOnVictim && !confusedStatuses.includes("반짓고리")) {
      confusedStatuses.push("반짓고리");
    }
    /* 라임 방울 보호막: 수혜자 [혼란]이어도 시전자 링크 유지 시 뱃지·방어 유지(반짓고리와 동일) */
    if (
      myCard.hasLimeBubbleShieldBuff &&
      !callieBuffBanOnVictim &&
      !confusedStatuses.includes(LIME_BUBBLE_DEFENSE_BADGE)
    ) {
      confusedStatuses.push(LIME_BUBBLE_DEFENSE_BADGE);
    }
    return confusedStatuses;
  }

  let statuses: string[] = [];

  const myFieldSafe: SimulationPlayerField = myField ?? { is: null, m: null, os: null, spellStack: [] };

  const passiveFn = passiveStatusRegistry[myCard.name];
  if (passiveFn) {
    if (typeof window !== "undefined" && myCard.name === PYRED_ID) {
      console.log("[BADGE-PASSIVE]", {
        cardName: myCard.name,
        mySlotKey: battleCtx?.mySlotKey,
        myFieldSlots: [myFieldSafe.is?.name, myFieldSafe.m?.name, myFieldSafe.os?.name],
      });
    }
    let passiveStatuses = passiveFn(myCard, oppCard, myFieldSafe);
    if (isSuppressionActive(myCard)) {
      passiveStatuses = filterStatusesForSuppressionDisplay(passiveStatuses);
    }
    statuses.push(...passiveStatuses);
  }

  if (battleCtx) {
    statuses.push(...getBangEomakAllyDefenseStatuses(battleCtx));
  }

  if (myCard.name === MARY_ID && battleCtx) {
    if (
      maryDefenseBuffActive(
        myCard,
        battleCtx.playerAField,
        battleCtx.playerBField,
        battleCtx.mySlotKey,
        oppCard
      )
    ) {
      statuses.push(MARY_DEFENSE_BUFF_BADGE);
    }
  }

  if (myCard.hasPakiAttackHalveDebuff) {
    statuses.push(PAKKI_ATTACK_DEBUFF_BADGE);
  }

  if (isStunned(myCard)) {
    statuses.push(STUN_STATUS);
  }

  statuses.push(...getStatusNamesFromPhilipMatchup(oppCard, myCard));

  const eondeokSilence = getEondeokSilenceStatusesForCard(myCard);
  if (eondeokSilence.length > 0 && !statuses.includes("침묵")) {
    statuses.push(...eondeokSilence);
  }

  if (myCard.hasBanjitgori && !suppressionBlocksExternalBuffEffects(myCard)) {
    statuses.push("반짓고리");
    /* 도발은 반짓고리 규칙에 포함되나 UI에 별도 뱃지로 중복 표시하지 않음 */
    if (battleCtx?.mySlotKey) {
      const pl = battleCtx.mySlotKey.split("-")[0] as "A" | "B";
      if (
        isTauntSuppressedByRyeomhwaForUnitOwner(
          pl,
          battleCtx.playerAField,
          battleCtx.playerBField
        ) &&
        !statuses.includes("도발")
      ) {
        statuses.push("도발");
      }
    }
  }

  if (
    myCard.hasLimeBubbleShieldBuff &&
    !suppressionBlocksExternalBuffEffects(myCard) &&
    !statuses.includes(LIME_BUBBLE_DEFENSE_BADGE)
  ) {
    statuses.push(LIME_BUBBLE_DEFENSE_BADGE);
  }

  /* 다이아고·검은 황제 필드 체류 또는 No.12 집중 사격 스펠(겹침 포함): 같은 진영 전원에게 [집중 사격] 1뱃지 */
  const focusedFireAuraCtx =
    battleCtx?.mySlotKey != null
      ? {
          allyPlayer: battleCtx.mySlotKey.split("-")[0] as "A" | "B",
          playerAField: battleCtx.playerAField,
          playerBField: battleCtx.playerBField,
        }
      : undefined;
  if (unitReceivesFocusedFireBenefits(myCard, myFieldSafe, focusedFireAuraCtx)) {
    if (!statuses.includes("집중 사격")) {
      statuses.push("집중 사격");
    }
  }

  /* 다크나이트 [역린]: 소울 게이지당 기본 공격력 +100 — [혼란] 시 뱃지·보너스 일시 봉인 */
  if (
    myCard.name === DARK_KNIGHT_ID &&
    (myCard.darkKnightSoulGauge ?? 0) > 0 &&
    !isDarkKnightPassivesPausedByConfusion(myCard, oppCard)
  ) {
    statuses.push(YORIN_STATUS_BADGE);
  }

  const maxellandBadge = getMaxellandTenacityStatusBadge(myCard, oppCard);
  if (maxellandBadge) {
    statuses.push(maxellandBadge);
  }

  /* 아이언 키위 필드 체류: 같은 진영 전원 디버프 면역 표시(+ 디버프 라벨 제거). myField 필요 */
  const ironKiwiImmunityCtx =
    battleCtx?.mySlotKey != null
      ? {
          allyPlayer: battleCtx.mySlotKey.split("-")[0] as "A" | "B",
          playerAField: battleCtx.playerAField,
          playerBField: battleCtx.playerBField,
        }
      : undefined;
  const hasDebuffImmunityAura =
    fieldHasLivingIronKiwi(myFieldSafe, ironKiwiImmunityCtx) ||
    fieldHasLivingStartingTree(myFieldSafe, ironKiwiImmunityCtx);
  if (hasDebuffImmunityAura) {
    statuses.push(DEBUFF_IMMUNITY_BADGE);
  }

  /* 공격력 +300 오라(동일 표기라도 부여 주체별로 개별 뱃지 표시) */
  const pyredAuraCtx =
    battleCtx?.mySlotKey != null
      ? {
          allyPlayer: battleCtx.mySlotKey.split("-")[0] as "A" | "B",
          playerAField: battleCtx.playerAField,
          playerBField: battleCtx.playerBField,
        }
      : undefined;
  if (!suppressionBlocksExternalBuffEffects(myCard)) {
    statuses.push(...getPyredAttackAuraStatuses(myCard, myFieldSafe, pyredAuraCtx));
    statuses.push(...getMorningMoodAttackAuraStatuses(myCard, myFieldSafe, pyredAuraCtx));
    statuses.push(...getStartingTreeAttackAuraStatuses(myCard, myFieldSafe, ironKiwiImmunityCtx));
  }

  /* 엘 윙 — 상시 [마법 면역](혼란·버프 금지 시 뱃지·효과 봉인) */
  if (battleCtx?.mySlotKey && isElWingUnit(myCard)) {
    const segs = battleCtx.mySlotKey.split("-");
    if (segs.length === 2) {
      const pl = segs[0] as "A" | "B";
      const sl = segs[1] as "is" | "m" | "os" | "spell";
      if (sl !== "spell") {
        if (
          elWingShowsMagicImmunity(
            myCard,
            pl,
            sl,
            battleCtx.playerAField,
            battleCtx.playerBField
          )
        ) {
          statuses.push(EL_WING_MAGIC_IMMUNITY_BADGE);
        }
      }
    }
  }

  /* 캘리: 상대 is/os 유닛 — [버프 금지](버프 뱃지·효과 제거). [디버프 면역] 오라가 있으면 캘리 효과 전부 무시. */
  if (battleCtx?.mySlotKey) {
    const segs = battleCtx.mySlotKey.split("-");
    if (segs.length === 2) {
      const pl = segs[0] as "A" | "B";
      const sl = segs[1] as "is" | "m" | "os" | "spell";
      if (sl === "is" || sl === "os") {
        if (callieBuffBanSuppressesBuffsForVictim(pl, sl, battleCtx.playerAField, battleCtx.playerBField)) {
          statuses = statuses.filter(label => getEffectSemanticKind(label) !== "buff");
          statuses.push(BUFF_BAN_BADGE);
        }
      }
    }
  }

  const slotSeg = battleCtx?.mySlotKey.split("-")[1];
  const invulnLikeBaekseu =
    battleCtx && slotSeg && slotSeg !== "spell"
      ? isInvulnerableFromBaekseuOrCheolbyeok(
          myCard,
          battleCtx.mySlotKey.startsWith("A") ? battleCtx.playerAField : battleCtx.playerBField
        )
      : isBaekseuInvulnerable(myCard);
  if (invulnLikeBaekseu) {
    statuses = statuses.filter(label => !isHarmfulEffectLabelBlockedByBaekseuInvuln(label));
    if (!statuses.includes(BAEKSEU_INVULN_BADGE)) {
      statuses.push(BAEKSEU_INVULN_BADGE);
    }
  }

  if (isSuppressionActive(myCard)) {
    statuses = filterStatusesForSuppressionDisplay(statuses);
    for (const s of getSuppressionStatusesForCard(myCard)) {
      if (!statuses.includes(s)) statuses.push(s);
    }
  }

  /* 아이언 키위·시작의 나무: 디버프 면역 시 디버프 라벨 제거(캘리 [버프 금지]는 위에서 면역과 배타 적용) */
  if (!hasDebuffImmunityAura) return statuses;
  return statuses.filter(
    label => label === DEBUFF_IMMUNITY_BADGE || getEffectSemanticKind(label) !== "debuff"
  );
};

export const applyPostAttackSkills = (
  attackerCard: FieldCard,
  ctx: AttackContext,
  facingOppCard?: FieldCard | null
): Partial<FieldCard> => {
  const facing = facingOppCard ?? ctx.facingOppCard ?? null;
  if (hasConfusionStatus(attackerCard, facing)) return {};
  const fn = postAttackRegistry[attackerCard.name];
  if (fn) return fn(attackerCard, { ...ctx, facingOppCard: facing });
  return {};
};

export const applyDamageMods = (
  targetCard: FieldCard,
  rawDamage: number,
  isSecondaryHit: boolean = false,
  /** 있으면 철벽 아군 [무적] 오라까지 반영 */
  targetOwnerField?: SimulationPlayerField,
  /** 마주보는 상대 슬롯 유닛 — 디너 [혼란] 봉인 판정용 */
  facingOppCard?: FieldCard | null
): number => {
  if (targetOwnerField ? isInvulnerableFromBaekseuOrCheolbyeok(targetCard, targetOwnerField) : isBaekseuInvulnerable(targetCard)) {
    return 0;
  }

  let damage = rawDamage;

  if (targetCard.hasBanjitgori && !isSuppressionActive(targetCard)) {
    damage = Math.floor((damage * 0.75) / 50) * 50;
  }

  if (!isConfused(targetCard, facingOppCard ?? null)) {
    const modFn = damageModRegistry[targetCard.name];
    if (modFn) {
      damage = modFn(targetCard, { rawDamage: damage, isSecondaryHit });
    }
  }

  return Math.max(1, damage);
};

export const applyOnSummon = (card: FieldCard): Partial<FieldCard> => {
  const fn = onSummonRegistry[card.name];
  if (fn) return fn(card);
  return {};
};

export const hasTauntUnit = (
  fieldOwner: "A" | "B",
  fieldA: SimulationPlayerField,
  fieldB: SimulationPlayerField
): boolean => {
  if (isTauntSuppressedByRyeomhwaForUnitOwner(fieldOwner, fieldA, fieldB)) return false;
  const field = fieldOwner === "A" ? fieldA : fieldB;
  for (const slot of ["is", "m", "os"] as const) {
    const card = field[slot];
    if (!card) continue;
    if (
      isTaunting(card, null, field, {
        playerAField: fieldA,
        playerBField: fieldB,
        mySlotKey: `${fieldOwner}-${slot}`,
      })
    ) {
      return true;
    }
  }
  return false;
};

export const isTaunting = (
  card: FieldCard | null,
  oppCard: FieldCard | null = null,
  myField?: SimulationPlayerField,
  battleCtx?: ActiveStatusBattleContext
): boolean => {
  if (!card) return false;
  if (battleCtx?.mySlotKey) {
    const segs = battleCtx.mySlotKey.split("-");
    if (segs.length === 2) {
      const pl = segs[0] as "A" | "B";
      const sl = segs[1] as "is" | "m" | "os";
      const oppField = pl === "A" ? battleCtx.playerBField : battleCtx.playerAField;
      const oCard = oppField[sl] ?? null;
      if (isTauntSuppressedByRyeomhwaForUnitOwner(pl, battleCtx.playerAField, battleCtx.playerBField)) {
        return false;
      }
      const myFieldUse = pl === "A" ? battleCtx.playerAField : battleCtx.playerBField;
      if (getActiveStatuses(card, oCard, myFieldUse, battleCtx).includes("도발")) return true;
      if (
        !!card.hasBanjitgori &&
        !isSuppressionActive(card) &&
        !callieBuffBanSuppressesBuffsForVictim(pl, sl, battleCtx.playerAField, battleCtx.playerBField)
      ) {
        return true;
      }
      if (isConfused(card, oCard)) return false;
      return false;
    }
  }
  if (isConfused(card, oppCard)) return false;
  return (
    getActiveStatuses(card, oppCard, myField).includes("도발") ||
    (!!card.hasBanjitgori && !isSuppressionActive(card))
  );
};

export const isSilenced = (card: FieldCard | null, oppCard: FieldCard | null = null): boolean => {
  if (!card) return false;
  return getActiveStatuses(card, oppCard).includes("침묵");
};

export {
  DINNER_OPP_CONFUSION_STATUS,
  hasConfusionStatus,
  isConfused,
} from "./battle/units/dinner";