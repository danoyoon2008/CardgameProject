import type { FieldCard, SimulationPlayerField } from "../../../types/game";
import { UNIT } from "../unitIds";
import { getEffectSemanticKind } from "../effectSemantics";

export const IRON_KIWI_ID = UNIT.IRON_KIWI;

/** `getActiveStatuses` / SimulationView 뱃지 라벨 */
export const DEBUFF_IMMUNITY_BADGE = "[디버프 면역]" as const;

export function fieldHasLivingIronKiwi(
  field: SimulationPlayerField | Partial<Record<string, FieldCard | null>> | undefined | null
): boolean {
  if (!field) return false;
  for (const slot of ["is", "m", "os"] as const) {
    const c = field[slot];
    if (c?.name === IRON_KIWI_ID && (c.currentHp ?? 0) > 0) return true;
  }
  return false;
}

/**
 * 아이언 키위 디버프 면역 활성 시: 디버프로 분류된 표시 문자열만 제외하고 버프·상태이상은 유지.
 * (추후 카드 상태에 디버프 배열 등을 적용할 때 동일 헬퍼로 선필터 권장)
 */
export function suppressDebuffStatusLabelsUnderIronKiwiAura<T extends readonly string[] | string[]>(
  statusLabels: T,
  allyField?: SimulationPlayerField | Partial<Record<string, FieldCard | null>> | null
): string[] {
  if (!fieldHasLivingIronKiwi(allyField)) return [...statusLabels];
  return statusLabels.filter(
    label => label === DEBUFF_IMMUNITY_BADGE || getEffectSemanticKind(label) !== "debuff"
  );
}
