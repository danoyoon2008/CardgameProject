import type { CardRow } from "@/types/game";

/**
 * 글로벌 밴 카드 목록 (카드 이름 기준).
 * 여기에 카드 이름을 추가/제거하면 해당 카드가 전체 모드에서 차단됩니다.
 * - 덱 구성: 흑백 처리 + 선택 불가
 * - 기존 덱: 자동 해제
 * - 클래식 게임 풀: 자동 제외
 */
export const BANNED_CARD_NAMES: readonly string[] = [
  "베프끼리",
  "마녀 타로",
  "보글보글 스테이션",
];

function normalizeName(name: string | null | undefined): string {
  // 앞뒤 공백 제거 + 모든 공백 문자 제거하여 표기 차이에 강건하게 매칭
  return String(name ?? "").replace(/\s+/g, "");
}

const NORMALIZED_BANNED = BANNED_CARD_NAMES.map((n) => normalizeName(n));

/** 카드가 글로벌 밴 대상인지 (이름 기준) */
export function isCardBanned(card: CardRow | null | undefined): boolean {
  if (!card) return false;
  return NORMALIZED_BANNED.includes(normalizeName(card.name));
}

/** 카드 이름이 밴 대상인지 */
export function isCardNameBanned(name: string | null | undefined): boolean {
  if (!name) return false;
  return NORMALIZED_BANNED.includes(normalizeName(name));
}

/** 카드 배열에서 밴 카드를 제거 */
export function filterBannedCards(cards: CardRow[]): CardRow[] {
  return cards.filter((c) => !isCardBanned(c));
}
