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
  /** 시뮬레이션 통계 행 키 — 필드 배치 시 부여, 리와인드까지 동일 인스턴스 */
  statsInstanceId?: string;

  // 기본 전투 상태
  currentHp: number;
  hasAttacked: boolean;
  hasBeenAttackedThisTurn: boolean;
  summonedTurn: string;         // "턴번호-플레이어" (예: "3-A")

  // 액티브 스킬 공통
  skillLastUsedGlobalTurn?: number;
  isSkillActive?: boolean;

  // 에리스티나 반짓고리 / 라임 방울 보호막 등 링크형 액티브
  linkedTarget?: string | null;   // 연결 대상 슬롯 ID (예: "A-is")
  linkedSource?: string | null;   // 연결 시전자 슬롯 ID

  // 반짓고리 버프 (대상 카드에 부여)
  hasBanjitgori?: boolean;

  /** 라임「방울 보호막」연결 중 [방어력 +200] — 링크 해제·소멸 시 제거 */
  hasLimeBubbleShieldBuff?: boolean;

  // 집중 사격 버프
  hasConcentratedFire?: boolean;

  /** 다크나이트 전용 소울 게이지(0 ~ 5). 소환 직후 0, 필드 유닛 처치 시마다 +1 */
  darkKnightSoulGauge?: number;

  /** 맥셀렌드 전용 [투지] 게이지(0 ~ 4). 기본 공격으로 적 유닛 처치 시마다 +1, 칸당 기본 공격력 +400 */
  maxellandTenacityGauge?: number;

  /** 패키 처치 패시브 — [공격력 50% 감소] 디버프(디버프 면역 시 부여·적용 안 됨, 면역 획득 시 제거) */
  hasPakiAttackHalveDebuff?: boolean;

  /** 엘릭서 5 [기절] — 남은 턴 넘김 횟수(양측 각 1회 = 2에서 시작, 턴 종료마다 1 감소) */
  stunEndTurnTicksRemaining?: number;

  /** 아이버슨 — 소환 후 공격 가능까지 남은 턴 넘김 횟수(2*턴=4에서 시작, 매 턴 넘김마다 1 감소, 0이 되면 제거·공격 가능) */
  iversonSummonWaitEndTurnTicksRemaining?: number;

  /** 단하 — 액티브「마법의 갈고리」1회 사용 여부 */
  danhaMagicHookConsumed?: boolean;

  /** 슈퍼 그린킹 — 액티브「주문 파괴자」1회 사용 여부 */
  superGreenKingSpellBreakerConsumed?: boolean;

  /** 곤충 전문가 — 액티브「A) 탐색」1회 사용 여부 */
  gonchungHiddenPeekConsumed?: boolean;

  /** 스펠 No.7 언덕! — [침묵] 남은 턴 넘김 횟수(2*턴=4, 필립 침묵과 동일 판정·감소 규칙) */
  eondeokSilenceEndTurnTicksRemaining?: number;

  /** 스펠 No.8 방어막 — 필드 스펠 칸에 올라간 동안 남은 턴 넘김 횟수(7*턴=14, 만료 시 리와인드) */
  bangEomakDefenseEndTurnTicksRemaining?: number;

  /** 스펠 No.47 철벽 — 필드 스펠 칸에 올라간 동안 아군 전원 [무적] 오라, 남은 턴 넘김 횟수(2*턴=4, 만료 시 리와인드) */
  cheolbyeokAllyInvulnEndTurnTicksRemaining?: number;

  /** 스펠 No.26 휴게소의 안식 — 남은 턴 넘김 횟수(3×턴=6, 만료 시 리와인드) */
  hyugesojauiAnsikEndTurnTicksRemaining?: number;
  /** @deprecated — `hyugesojauiAnsikEndTurnTicksRemaining` */
  hyugesojauiAnsikTurnHealsRemaining?: number;

  /**
   * No.48 오리에트의 초상 — 「체력 보호막」남은 흡수량(뱃지 아님).
   * 최대/현재 체력 수치 표기·회복 판정은 기본 유닛 체력만 사용.
   */
  hpBarrierAbsorptionRemaining?: number;

  /** 백스(No.46) — 치명적 피해 1회 생존 패시브 소진 후 true 유지(필드 생존 동안 10% 처형·윤곽 연출, [무적] 틱과 별개) */
  baekseuLastStandUsed?: boolean;
  /** 백스 [무적] — 남은 턴 넘김 횟수(1*턴=2, 기절·언덕 침묵과 동일 감소 규칙) */
  baekseuInvulnerableEndTurnTicksRemaining?: number;

  /** No.16 전설의 검 — 남은 턴 넘김(양측 합산) 횟수까지 충전; handleEndTurn마다 1 감소 */
  legendarySwordArmingEndTurnTicksRemaining?: number;
  /** 충전 완료 후, 자신의 턴이 되면 자동 연격이 발동될 때까지 대기 */
  legendarySwordArmed?: boolean;
  /** 충전 중 시전자가 턴 종료를 누르면 후광·윤곽 깜빡임 2배 */
  legendarySwordChargeFastBlink?: boolean;
}

/** 시뮬레이션 한쪽 필드 — 유닛 슬롯 + 스펠 겹침(맨 끝이 스펠 칸에 보이는 카드) */
export type SimulationPlayerField = {
  is: FieldCard | null;
  m: FieldCard | null;
  os: FieldCard | null;
  spellStack: FieldCard[];
};

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