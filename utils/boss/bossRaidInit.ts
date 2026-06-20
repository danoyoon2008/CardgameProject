import type { FieldCard, CardRow } from "../../types/game";
import type { BossDefinition } from "./bossTypes";
import { BossRaidState, emptyFiveSlotField } from "./bossRaidState";
import { resolveBossImageUrl } from "./bossDefs";

/** CardRow → 핸드용 FieldCard (SimulationView 유닛 배치 패턴) */
export function cardRowToHandFieldCard(card: CardRow, index: number): FieldCard {
  return {
    ...card,
    statsInstanceId: `bossraid-hand-${index}-${card.name ?? "card"}`,
    currentHp: Number(card.hp) || 0,
    hasAttacked: false,
    hasBeenAttackedThisTurn: false,
    summonedTurn: "0-hand",
  };
}

/** MVP 테스트용 핸드 — 카탈로그 유닛 상위 count장 */
export function buildMvpTestHand(cards: CardRow[], count = 5): FieldCard[] {
  const units = cards.filter(c => {
    const cat = c.category?.trim().toLowerCase() ?? "";
    return cat === "unit" || cat === "유닛";
  });
  return units.slice(0, count).map((c, i) => cardRowToHandFieldCard(c, i));
}

/** 보스 정의 → 보스 본체 FieldCard 생성 */
function createBossFieldCard(boss: BossDefinition, cards: CardRow[]): FieldCard {
  const baseCard = cards.find(c => c.name === boss.baseUnitId);
  return {
    ...(baseCard ?? {}),
    name: boss.name,
    hp: boss.hp,
    atk: boss.atk,
    image_url: resolveBossImageUrl(boss, cards) ?? baseCard?.image_url,
    currentHp: boss.hp,
    hasAttacked: false,
    hasBeenAttackedThisTurn: false,
    summonedTurn: "0-BOSS",
    statsInstanceId: `boss-${boss.id}`,
  } as FieldCard;
}

/** 보스전 초기 상태 생성 */
export function initBossRaidState(
  boss: BossDefinition,
  cards: CardRow[],
  playerHand: FieldCard[]
): BossRaidState {
  const bossField = emptyFiveSlotField();
  bossField.m = createBossFieldCard(boss, cards);

  const skillCooldowns: Record<string, number> = {};
  for (const skill of boss.skills) {
    skillCooldowns[skill.id] = skill.initialCooldown ?? skill.cooldownTurns;
  }

  return {
    bossId: boss.id,
    playerField: emptyFiveSlotField(),
    bossField,
    bossHp: boss.hp,
    bossMaxHp: boss.hp,
    bossShield: 0,
    skillCooldowns,
    halfHpResetDone: false,
    turnCount: 1,
    phase: "player",
    result: "ongoing",
    playerHand,
    playerHp: 2000,
    playerMaxHp: 2000,
    playerTokens: 0,
    turnTimeLeft: 60,
  };
}
