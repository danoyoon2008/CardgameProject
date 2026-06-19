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
  _deckInstanceId?: string;   // 일반전 덱 인스턴스 고유 ID (중복 카드 대응)
  _ownerTeam?: "A" | "B";     // 일반전 카드 소유자 (덱/리와인드 분리용)
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

  /** 엘 윙 [신속] 게이지(0 ~ 2). 상대 턴 기본 공격 시 회피 기회 */
  elWingSinseokGauge?: number;

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
  /** 곤충 전문가 「탐색」으로 이번 턴 공개된 히든 스펠 (턴 전환 시 해제, 양쪽 sync) */
  gonchungRevealedThisTurn?: boolean;

  /** 스펠 No.43 개미지옥 — [제압] 남은 턴 넘김 횟수(4×턴=8) */
  suppressionEndTurnTicksRemaining?: number;

  /** 스펠 No.7 언덕! — [침묵] 남은 턴 넘김 횟수(2*턴=4, 필립 침묵과 동일 판정·감소 규칙) */
  eondeokSilenceEndTurnTicksRemaining?: number;

  /** 스펠 No.8 방어막 — 필드 스펠 칸에 올라간 동안 남은 턴 넘김 횟수(7*턴=14, 만료 시 리와인드) */
  bangEomakDefenseEndTurnTicksRemaining?: number;

  /** 스펠 No.47 철벽 — 필드 스펠 칸에 올라간 동안 아군 전원 [무적] 오라, 남은 턴 넘김 횟수(2*턴=4, 만료 시 리와인드) */
  cheolbyeokAllyInvulnEndTurnTicksRemaining?: number;

  /** 스펠 No.26 휴게소의 안식 — 남은 턴 넘김 횟수(3×턴=6, 만료 시 리와인드) */
  hyugesojauiAnsikEndTurnTicksRemaining?: number;

  /** 스펠 No.30 비즈니스 강도단 — 남은 턴 넘김 횟수(4×턴=8, 만료 시 리와인드) */
  businessGangEndTurnTicksRemaining?: number;

  /** 스펠 No.43 개미지옥 — 필드 스펠 칸 지속 턴(4×턴=8, 만료 시 리와인드) */
  antHellEndTurnTicksRemaining?: number;
  /** @deprecated — `hyugesojauiAnsikEndTurnTicksRemaining` */
  hyugesojauiAnsikTurnHealsRemaining?: number;

  /**
   * No.48 오리에트의 초상 — 「체력 보호막」남은 흡수량(뱃지 아님).
   * 최대/현재 체력 수치 표기·회복 판정은 기본 유닛 체력만 사용.
   */
  hpBarrierAbsorptionRemaining?: number;

  /**
   * 체력 1 생존 표기(백스·번개·귀환 등) — 회복 시 일의자리 유령 1을 1회 제거할 때까지 유지.
   * 단독 `currentHp === 1`만 유효한 생존 판정, 201·3201 등은 회복·전투 직전에 정리.
   */
  hpSurvivalOnesMarker?: boolean;

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

  /**
   * No.37 애벌레킹 — 적 유닛 위에 기생 부착된 라이더(W 슬롯). null/undefined면 부착 없음.
   * 위치 감지 효과(디너·필립·캘리 등) 및 슬롯 enumerate에서 자동 제외(부착물이므로 슬롯이 아님).
   * 매 턴 종료 시 host에게 300 자동 피해(소환 턴 제외), host 사망 시 동반 리와인드.
   * 라이더는 그 자체로 currentHp/statsInstanceId/summonedTurn을 가지나 unitCombatStats에는 등재하지 않음.
   */
  parasiteRider?: FieldCard | null;

  /** 애벌레킹 라이더 전용 — 부착 시점의 globalTurnCount. 다음 턴 종료부터 자동 피해 발동. */
  parasiteSummonGlobalTurn?: number;

  /** 애벌레킹 라이더 전용 — 부착된 host의 소속 진영("A" | "B"). 매 턴 데미지/사망 정리 시 빠른 식별용. */
  parasiteHostPlayer?: "A" | "B" | null;
}

/** 시뮬레이션 한쪽 필드 — 유닛 슬롯 + 스펠 겹침(맨 끝이 스펠 칸에 보이는 카드) */
export type SimulationPlayerField = {
  is: FieldCard | null;
  m: FieldCard | null;
  os: FieldCard | null;
  spellStack: FieldCard[];
};

/** 엘 윙 [신속] — 소유자의 회피 사용 여부 결정 대기 (멀티 sync) */
export interface ElWingSinseokPendingSave {
  defenderPlayer: "A" | "B";
  defenderSlot: "is" | "m" | "os";
  attackerPlayer: "A" | "B";
  attackerSlot: "is" | "m" | "os";
  hitKind: "primary" | "secondary";
  wraithChainFollowUp: boolean;
  deadlineAt: number;
  /** 소유자 결정: null=대기중, "dodge"=신속 사용, "take"=미사용(피해받음) */
  decision: "dodge" | "take" | null;
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
export type MainView = "battle" | "shop" | "deck" | "codex" | "simulation" | "multiplay" | "settings";