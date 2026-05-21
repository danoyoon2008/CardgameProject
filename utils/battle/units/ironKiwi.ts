import type { FieldCard, SimulationPlayerField } from "../../../types/game";
import { hasConfusionStatus } from "./dinner";
import { UNIT } from "../unitIds";
import { getEffectSemanticKind } from "../effectSemantics";

export const IRON_KIWI_ID = UNIT.IRON_KIWI;

/** `getActiveStatuses` / SimulationView 뱃지 라벨 */
export const DEBUFF_IMMUNITY_BADGE = "[디버프 면역]" as const;

type FieldSlice = SimulationPlayerField | Partial<Record<"is" | "m" | "os", FieldCard | null>>;

export type IronKiwiDebuffImmunityFieldContext = {
  allyPlayer: "A" | "B";
  playerAField: FieldSlice;
  playerBField: FieldSlice;
};

/** [혼란] 시 [디버프 면역] 오라(자신·아군 전원) 일시 봉인 */
export function isIronKiwiDebuffImmunityPausedByConfusion(
  card: FieldCard | null | undefined,
  facingOppCard: FieldCard | null
): boolean {
  if (!card || card.name !== IRON_KIWI_ID || (card.currentHp ?? 0) <= 0) return false;
  return hasConfusionStatus(card, facingOppCard);
}

function isIronKiwiDebuffImmunitySourceActive(
  card: FieldCard,
  slot: "is" | "m" | "os",
  ctx?: IronKiwiDebuffImmunityFieldContext
): boolean {
  if ((card.currentHp ?? 0) <= 0 || card.name !== IRON_KIWI_ID) return false;
  if (!ctx) return true;
  const oppField = ctx.allyPlayer === "A" ? ctx.playerBField : ctx.playerAField;
  const facing = oppField[slot] ?? null;
  return !isIronKiwiDebuffImmunityPausedByConfusion(card, facing);
}

/** 아군 필드에 살아 있는(혼란 아닌) 아이언 키위가 있으면 전 아군 [디버프 면역] 오라 */
export function fieldHasLivingIronKiwi(
  field: FieldSlice | undefined | null,
  ctx?: IronKiwiDebuffImmunityFieldContext
): boolean {
  if (!field) return false;
  for (const slot of ["is", "m", "os"] as const) {
    const c = field[slot];
    if (!c || c.name !== IRON_KIWI_ID) continue;
    if (isIronKiwiDebuffImmunitySourceActive(c, slot, ctx)) return true;
  }
  return false;
}

/**
 * 아이언 키위 디버프 면역 활성 시: 디버프로 분류된 표시 문자열만 제외하고 버프·상태이상은 유지.
 * (추후 카드 상태에 디버프 배열 등을 적용할 때 동일 헬퍼로 선필터 권장)
 */
export function suppressDebuffStatusLabelsUnderIronKiwiAura<T extends readonly string[] | string[]>(
  statusLabels: T,
  allyField?: FieldSlice | null,
  ctx?: IronKiwiDebuffImmunityFieldContext
): string[] {
  if (!fieldHasLivingIronKiwi(allyField, ctx)) return [...statusLabels];
  return statusLabels.filter(
    label => label === DEBUFF_IMMUNITY_BADGE || getEffectSemanticKind(label) !== "debuff"
  );
}
