/**
 * 필드/DB 카드 이름과 동일한 표기.
 * 전투·스킬 로직에서는 문자열 리터럴 대신 이 상수만 사용합니다.
 */
export const UNIT = {
  MOMO: "모모",
  ERISTINA: "에리스티나",
  CHEOLGIBYEONG: "철기병",
  PYRED: "파이레드",
  MORNING_MOOD: "모닝 무드",
  STARTING_TREE: "시작의 나무",
  /** No.6 — 액티브「주문 파괴자」(상대 스펠 맨 위 1회 제거) */
  SUPER_GREEN_KING: "슈퍼 그린킹",
  /** No.25 — 기본 공격 시 도발·반짓고리·맹수견 포 등 대상 제한·받는 피해 경감 무시 */
  STARTING_HERALD: "시작의 전령",
  /** No.44 — 기본 공격이 적 방어력·피해감소·체력 보호막 흡수 무시(트루 딜). [무적]은 유지 */
  STARTING_WRAITH: "시작의 망령",
  GEUNYANG_MOJA: "그냥 모자",
  GHOSTONE: "고스톤",
  RYEOMCHO: "렴초",
  PHILIP: "필립",
  DIAGO: "다이아고",
  /** No.33 — 집중 사격 오라(다이아고와 동일 표기)·기본 공격 600+적 수×200 */
  GEOMEUN_HWANGJE: "검은 황제",
  DARK_KNIGHT: "다크나이트",
  IRON_KIWI: "아이언 키위",
  MAXELLAND: "맥셀렌드",
  MARY: "메리",
  PAKKI: "패키",
  RANIGO: "라니고",
  ELIXIR_5: "엘릭서 5",
  IVERSON: "아이버슨",
  DANHA: "단하",
  MAENGSUGYEON_PO: "맹수견 포",
  /** No.10 — 기본 공격 시 전 적 300 / 피격 시 반사 고정 300 */
  LIBUTY: "리부티",
  /** No.17 — 적 is/os [버프 금지](디버프 면역 시 무시) */
  KALLI: "캘리",
  /** No.46 — 치명타 1회 무시 후 1*턴 [무적] */
  BAEKSEU: "백스",
  /** No.49 — 액티브「방울 보호막」 */
  LIME: "라임",
  /** No.51 — 패시브: 필드 체류 중 아무 진영 마법 발동마다 덱에서 1장 드로우 */
  SIMPAN: "심판",
  /** No.20 — 패시브: 필드 체류 중 상대는 히든 스펠을 제외한 액티브 스펠 사용 불가 */
  RONU: "로누",
  /** No.16 — 패시브: 충전 후 자신의 턴 시작 시 고정 피해 2회 후 리와인드 */
  LEGENDARY_SWORD: "전설의 검",
  /** No.15 — 액티브「A) 탐색」(상대 스펠 칸 히든 스펠 1회 엿보기) */
  GONCHUNG_JEONMOGA: "곤충 전문가",
} as const;

export type ImplementedUnitName = (typeof UNIT)[keyof typeof UNIT];

export const isUnitName = (
  name: string | undefined | null,
  unit: ImplementedUnitName
): boolean => name === unit;
