// types/game.ts

// ─────────────────────────────────────────
// DB에서 가져온 카드 원본 데이터
// ─────────────────────────────────────────
export interface CardRow {
  id?: number;
  number?: number;           // 도감 번호
  name: string;
  category?: string;         // "unit" | "spell"
  type?: string;             // 유닛 타입(공격형, 방어형 등) 또는 스펠 타입
  rarity?: string;           // C | R | E | L | A
  cost?: number | string;    // 소환/발동 코스트 (1~10)
  hp?: number | string;      // 유닛 기본 체력
  atk?: number | string;     // 유닛 공격력 (문자열 포함: "700+300", "400x2" 등)
  duration?: number | string; // 스펠 지속 시간
  passive_name?: string | null;
  passive_detail?: string | null;
  active_name?: string | null;
  active_detail?: string | null;
  description_detail?: string | null; // 스펠 효과 설명
  image_url?: string | null;
  [key: string]: any;        // 추가 필드 허용 (하위 호환)
}

// ─────────────────────────────────────────
// 필드에 올라간 카드 (런타임 상태 포함)
// ─────────────────────────────────────────
export interface FieldCard extends CardRow {
  // 기본 전투 상태
  currentHp: number;
  hasAttacked: boolean;
  hasBeenAttackedThisTurn: boolean;
  summonedTurn: string;         // "턴번호-플레이어" (예: "3-A")

  // 액티브 스킬 공통
  skillLastUsedGlobalTurn?: number;
  isSkillActive?: boolean;

  // 에리스티나 반짓고리 연결
  linkedTarget?: string | null;   // 버프를 받은 대상 슬롯 ID (예: "A-is")
  linkedSource?: string | null;   // 버프를 건 에리스티나 슬롯 ID

  // 반짓고리 버프 (대상 카드에 부여)
  hasBanjitgori?: boolean;

  // 집중 사격 버프
  hasConcentratedFire?: boolean;
}

// ─────────────────────────────────────────
// 가챠 뽑기 결과
// ─────────────────────────────────────────
export interface PullResult extends CardRow {
  isNew: boolean;
  shardReward: number;
}

// ─────────────────────────────────────────
// 메인 화면 뷰 타입
// ─────────────────────────────────────────
export type MainView = "battle" | "shop" | "deck" | "codex" | "simulation" | "settings";