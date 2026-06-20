import type { CardRow } from "../../types/game";
import { nonEmptyText } from "../cardUtils";
import { UNIT } from "../battle/unitIds";
import type { BossDefinition } from "./bossTypes";

/** B.S 렴화 — 첫 보스. 기존 렴화(No.41) 고증 기반. */
export const BS_RYEOMHWA: BossDefinition = {
  id: "BS_RYEOMHWA",
  name: "B.S 렴화",
  baseUnitId: UNIT.RYEOMHWA,
  hp: 8000,
  atk: 900,
  passives: [
    { type: "nullifyEnemyDefense" },
    { type: "removeHiddenSpellTrigger" },
    { type: "unstoppable" },
    { type: "resetCooldownsAtHalfHp" },
  ],
  skills: [
    {
      id: "METEOR_STRIKE",
      name: "유성 일격",
      cooldownTurns: 2,
      targetRule: "highest_atk",
      effects: [
        { type: "damage", amount: 800, alsoAdjacent: true },
        { type: "defenseDown", amount: 200, turns: 2 },
      ],
    },
    {
      id: "STAR_VEIL",
      name: "별의 장막",
      cooldownTurns: 3,
      targetRule: "self",
      effects: [
        { type: "shieldFromLostHp", ratio: 0.35 },
        { type: "removeRecentDebuff", count: 1 },
      ],
    },
  ],
  basicAttack: { targetRule: "highest_atk" },
};

/** 보스 id → 정의 매핑 (보스 추가 시 여기에) */
export const BOSS_DEFS: Record<string, BossDefinition> = {
  [BS_RYEOMHWA.id]: BS_RYEOMHWA,
};

export function getBossDef(id: string): BossDefinition | null {
  return BOSS_DEFS[id] ?? null;
}

/**
 * 보스 이미지 URL — `imageUrl` 우선, 없으면 `baseUnitId`(유닛 이름)로 카탈로그 카드 조회.
 * (`profileImageUrl`은 사용자 아바타용이므로 카드에는 사용하지 않음)
 */
export function resolveBossImageUrl(boss: BossDefinition, cards: CardRow[]): string | null {
  const explicit = nonEmptyText(boss.imageUrl);
  if (explicit) return explicit;
  if (!boss.baseUnitId) return null;
  const baseUnitId = boss.baseUnitId.trim();
  const baseCard = cards.find((c) => c.name?.trim() === baseUnitId);
  if (!baseCard) {
    console.log("[resolveBossImageUrl] base card not found", {
      cardsLength: cards.length,
      baseUnitId: boss.baseUnitId,
    });
    return null;
  }
  const url = nonEmptyText(baseCard.image_url);
  if (!url) {
    console.log("[resolveBossImageUrl] base card has no image_url", {
      cardsLength: cards.length,
      baseUnitId: boss.baseUnitId,
      cardName: baseCard.name,
    });
  }
  return url;
}
