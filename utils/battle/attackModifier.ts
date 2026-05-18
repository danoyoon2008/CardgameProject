export type AttackPattern = "NORMAL" | "ADDITION" | "MULTIPLICATION";

export interface AttackModifierOptions {
  attackType?: AttackPattern;
  secondaryHits?: number;
}

/**
 * 피해·회복 등 연산 결과의 최소 단위(50). 50으로 나눈 나머지는 모두 버림.
 * 0 이하·비유한 수는 0.
 */
export function floorToNearest50Unit(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.floor(value / 50) * 50;
}

/**
 * 평탄 공격력 증감(delta)을 공격 표기 방식에 맞게 분배합니다.
 * - NORMAL: 1차에만 적용
 * - ADDITION(a+b): 1차(a)에만 적용
 * - MULTIPLICATION(a x n): 모든 타격에 균등 분배(50단위 버림)
 */
export function applyFlatAttackModifierByPattern(
  primaryDamage: number,
  secondaryDamage: number,
  delta: number,
  options?: AttackModifierOptions
): { primaryDamage: number; secondaryDamage: number } {
  if (!Number.isFinite(delta) || delta === 0) return { primaryDamage, secondaryDamage };

  const attackType = options?.attackType ?? "NORMAL";
  const secondaryHits = Math.max(0, options?.secondaryHits ?? (secondaryDamage > 0 ? 1 : 0));

  if (attackType === "MULTIPLICATION" && secondaryHits > 0 && secondaryDamage > 0) {
    const totalHits = secondaryHits + 1;
    const perHitDelta = floorToNearest50Unit(delta / totalHits);
    if (perHitDelta === 0) return { primaryDamage, secondaryDamage };
    return {
      primaryDamage: primaryDamage + perHitDelta,
      secondaryDamage: secondaryDamage + perHitDelta,
    };
  }

  return {
    primaryDamage: primaryDamage + delta,
    secondaryDamage,
  };
}
