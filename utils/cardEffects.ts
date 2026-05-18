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
import { fieldHasLivingFocusedFireAura } from "./battle/units/diago";
import { fieldSpellStackGrantsFocusedFire } from "./battle/spellStack";
import { DARK_KNIGHT_ID, YORIN_STATUS_BADGE } from "./battle/units/darkKnight";
import { getMaxellandTenacityStatusBadge } from "./battle/units/maxelland";
import {
  DEBUFF_IMMUNITY_BADGE,
  fieldHasLivingIronKiwi,
} from "./battle/units/ironKiwi";
import { PYRED_ATTACK_AURA_BADGE, getPyredAttackAuraStatuses } from "./battle/units/pyred";
import { getMorningMoodAttackAuraStatuses } from "./battle/units/morningMood";
import { fieldHasLivingStartingTree, getStartingTreeAttackAuraStatuses } from "./battle/units/startingTree";
import { getStatusNamesFromPhilipMatchup } from "./battle/units/philip";
import { getEondeokSilenceStatusesForCard } from "./battle/spells/eondeok";
import { getBangEomakAllyDefenseStatuses } from "./battle/spells/bangeomak";
import { getEffectSemanticKind } from "./battle/effectSemantics";
import { MARY_DEFENSE_BUFF_BADGE, MARY_ID, maryDefenseBuffActive } from "./battle/units/mary";
import { LIME_BUBBLE_DEFENSE_BADGE } from "./battle/units/lime";
import { PAKKI_ATTACK_DEBUFF_BADGE } from "./battle/units/pakki";
import { isStunned, STUN_STATUS } from "./battle/units/elixir5";
import { BUFF_BAN_BADGE, callieBuffBanSuppressesBuffsForVictim } from "./battle/units/kalli";
import {
  BAEKSEU_INVULN_BADGE,
  isBaekseuInvulnerable,
  isHarmfulEffectLabelBlockedByBaekseuInvuln,
} from "./battle/units/baekseu";
import { isInvulnerableFromBaekseuOrCheolbyeok } from "./battle/spells/cheolbyeok";

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

  let statuses: string[] = [];

  const myFieldSafe: SimulationPlayerField = myField ?? { is: null, m: null, os: null, spellStack: [] };

  const passiveFn = passiveStatusRegistry[myCard.name];
  if (passiveFn) {
    statuses.push(...passiveFn(myCard, oppCard, myFieldSafe));
  }

  if (battleCtx) {
    statuses.push(...getBangEomakAllyDefenseStatuses(battleCtx));
  }

  if (myCard.name === MARY_ID && battleCtx) {
    if (maryDefenseBuffActive(myCard, battleCtx.playerAField, battleCtx.playerBField, battleCtx.mySlotKey)) {
      statuses.push(MARY_DEFENSE_BUFF_BADGE);
    }
  }

  if (myCard.hasPakiAttackHalveDebuff) {
    statuses.push(PAKKI_ATTACK_DEBUFF_BADGE);
  }

  if (isStunned(myCard)) {
    statuses.push(STUN_STATUS);
  }

  statuses.push(...getStatusNamesFromPhilipMatchup(oppCard));

  const eondeokSilence = getEondeokSilenceStatusesForCard(myCard);
  if (eondeokSilence.length > 0 && !statuses.includes("침묵")) {
    statuses.push(...eondeokSilence);
  }

  if (myCard.hasBanjitgori) {
    statuses.push("반짓고리");
    /* 도발은 반짓고리 규칙에 포함되나 UI에 별도 뱃지로 중복 표시하지 않음 */
  }

  if (myCard.hasLimeBubbleShieldBuff && !statuses.includes(LIME_BUBBLE_DEFENSE_BADGE)) {
    statuses.push(LIME_BUBBLE_DEFENSE_BADGE);
  }

  /* 다이아고·검은 황제 필드 체류 또는 No.12 집중 사격 스펠(겹침 포함): 같은 진영 전원에게 [집중 사격] 1뱃지 */
  if (
    fieldHasLivingFocusedFireAura(myFieldSafe) ||
    fieldSpellStackGrantsFocusedFire(myFieldSafe)
  ) {
    if (!statuses.includes("집중 사격")) {
      statuses.push("집중 사격");
    }
  }

  /* 다크나이트 [역린]: 소울 게이지당 기본 공격력 +100 — 뱃지는 충전 칸이 있을 때만 */
  if (myCard.name === DARK_KNIGHT_ID && (myCard.darkKnightSoulGauge ?? 0) > 0) {
    statuses.push(YORIN_STATUS_BADGE);
  }

  const maxellandBadge = getMaxellandTenacityStatusBadge(myCard);
  if (maxellandBadge) {
    statuses.push(maxellandBadge);
  }

  /* 아이언 키위 필드 체류: 같은 진영 전원 디버프 면역 표시(+ 디버프 라벨 제거). myField 필요 */
  const hasDebuffImmunityAura =
    fieldHasLivingIronKiwi(myFieldSafe) || fieldHasLivingStartingTree(myFieldSafe);
  if (hasDebuffImmunityAura) {
    statuses.push(DEBUFF_IMMUNITY_BADGE);
  }

  /* 공격력 +300 오라(동일 표기라도 부여 주체별로 개별 뱃지 표시) */
  statuses.push(...getPyredAttackAuraStatuses(myCard, myFieldSafe));
  statuses.push(...getMorningMoodAttackAuraStatuses(myCard, myFieldSafe));
  statuses.push(...getStartingTreeAttackAuraStatuses(myCard, myFieldSafe));

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

  /* 아이언 키위·시작의 나무: 디버프 면역 시 디버프 라벨 제거(캘리 [버프 금지]는 위에서 면역과 배타 적용) */
  if (!hasDebuffImmunityAura) return statuses;
  return statuses.filter(
    label => label === DEBUFF_IMMUNITY_BADGE || getEffectSemanticKind(label) !== "debuff"
  );
};

export const applyPostAttackSkills = (
  attackerCard: FieldCard,
  ctx: AttackContext
): Partial<FieldCard> => {
  const fn = postAttackRegistry[attackerCard.name];
  if (fn) return fn(attackerCard, ctx);
  return {};
};

export const applyDamageMods = (
  targetCard: FieldCard,
  rawDamage: number,
  isSecondaryHit: boolean = false,
  /** 있으면 철벽 아군 [무적] 오라까지 반영 */
  targetOwnerField?: SimulationPlayerField
): number => {
  if (targetOwnerField ? isInvulnerableFromBaekseuOrCheolbyeok(targetCard, targetOwnerField) : isBaekseuInvulnerable(targetCard)) {
    return 0;
  }

  let damage = rawDamage;

  if (targetCard.hasBanjitgori) {
    damage = Math.floor((damage * 0.75) / 50) * 50;
  }

  const modFn = damageModRegistry[targetCard.name];
  if (modFn) {
    damage = modFn(targetCard, { rawDamage: damage, isSecondaryHit });
  }

  return Math.max(1, damage);
};

export const applyOnSummon = (card: FieldCard): Partial<FieldCard> => {
  const fn = onSummonRegistry[card.name];
  if (fn) return fn(card);
  return {};
};

export const hasTauntUnit = (field: SimulationPlayerField): boolean => {
  for (const slot of ["is", "m", "os"] as const) {
    const card = field[slot];
    if (!card) continue;
    if (getActiveStatuses(card, null).includes("도발") || !!card.hasBanjitgori) return true;
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
      const myFieldUse = pl === "A" ? battleCtx.playerAField : battleCtx.playerBField;
      if (getActiveStatuses(card, oCard, myFieldUse, battleCtx).includes("도발")) return true;
      if (
        !!card.hasBanjitgori &&
        !callieBuffBanSuppressesBuffsForVictim(pl, sl, battleCtx.playerAField, battleCtx.playerBField)
      ) {
        return true;
      }
      return false;
    }
  }
  return getActiveStatuses(card, oppCard, myField).includes("도발") || !!card.hasBanjitgori;
};

export const isSilenced = (card: FieldCard | null, oppCard: FieldCard | null = null): boolean => {
  if (!card) return false;
  return getActiveStatuses(card, oppCard).includes("침묵");
};