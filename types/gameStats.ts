/** 필드에 배치된 유닛 인스턴스별 시뮬레이션 통계 */

export interface UnitCombatStatsRow {
  cardName: string;
  player: "A" | "B";
  summonedTurn: string;
  damageDealt: number;
  kills: number;
  damageTaken: number;
  selfHeal: number;
  allyHealGiven: number;
  damageMitigated: number;
}

/** 마법 카드는 추후 확장 — 배치 기록만 유지 */
export interface SpellDeployPlaceholderRow {
  statsInstanceId: string;
  name: string;
  player: "A" | "B";
  summonedTurn: string;
}

/**
 * 통계 패널 표기용 — 피해·회복·감소 피해 등 큰 수치를 50 단위로 반올림.
 * 정렬·저장 데이터는 그대로 두고 UI 숫자에만 사용합니다.
 */
export function formatGameStatInteger(value: number): number {
  if (!Number.isFinite(value)) return value;
  return Math.round(value / 50) * 50;
}

export function createSimulationStatsInstanceId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `sim-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function emptyUnitCombatRow(
  cardName: string,
  player: "A" | "B",
  summonedTurn: string
): UnitCombatStatsRow {
  return {
    cardName,
    player,
    summonedTurn,
    damageDealt: 0,
    kills: 0,
    damageTaken: 0,
    selfHeal: 0,
    allyHealGiven: 0,
    damageMitigated: 0,
  };
}

type NumericStatKey = Exclude<keyof UnitCombatStatsRow, "cardName" | "player" | "summonedTurn">;

/** 기존 행에 델타 병합 (행이 없으면 무시) */
export function patchUnitCombatStats(
  table: Record<string, UnitCombatStatsRow>,
  id: string | undefined,
  delta: Partial<Record<NumericStatKey, number>>
): Record<string, UnitCombatStatsRow> {
  if (!id || !table[id]) return table;
  const row = table[id];
  const next = { ...row };
  (Object.keys(delta) as NumericStatKey[]).forEach(k => {
    const v = delta[k];
    if (v !== undefined && Number.isFinite(v)) {
      next[k] = (next[k] as number) + v;
    }
  });
  return { ...table, [id]: next };
}

/** 여러 id에 대한 패치를 한 번에 적용 */
export function patchManyUnitCombatStats(
  table: Record<string, UnitCombatStatsRow>,
  patches: Array<{ id: string | undefined; delta: Partial<Record<NumericStatKey, number>> }>
): Record<string, UnitCombatStatsRow> {
  let t = table;
  for (const { id, delta } of patches) {
    t = patchUnitCombatStats(t, id, delta);
  }
  return t;
}
