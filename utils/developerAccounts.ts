/** 개발자 계정 UUID 목록 — 인게임에서 노란 닉네임 + "개발자" 라벨로 표시 */
export const DEVELOPER_ACCOUNT_IDS: ReadonlySet<string> = new Set([
  "9dce5c0e-7540-480b-b88b-597f40432158",
  "83954306-319c-4287-bb5c-275d69717f46",
  "dbc01cba-456e-4c0b-bce8-22df2b7bcf5d",
  // 추가 개발자 계정 UUID는 여기에
]);

export function isDeveloperAccount(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return DEVELOPER_ACCOUNT_IDS.has(userId);
}

/** 개발자 닉네임 색상 (노란색) */
export const DEVELOPER_NICKNAME_COLOR = "#fbbf24";
/** 개발자 라벨 문구 */
export const DEVELOPER_BADGE_LABEL = "개발자용 계정";
