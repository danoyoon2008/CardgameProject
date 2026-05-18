/**
 * 유닛별 효과 함수를 하나의 레지스트리로 합성합니다.
 * 새 유닛: `utils/battle/units/<이름>.ts`에 로직 추가 후 이 파일에만 연결하면 됩니다.
 */
import type { PassiveStatusFn, PostAttackFn, DamageModFn, OnSummonFn } from "../effectTypes";
import {
  CHEOLGIBYEONG_ID,
  getCheolgibyeongPassiveStatuses,
  applyCheolgibyeongDamageMod,
} from "./cheolgibyeong";
import { RYEOMCHO_ID, getRyeomchoPassiveStatuses } from "./ryeomcho";
import { GEUNYANG_MOJA_ID, postAttackGeunyangMoja } from "./geunyangMoja";
import { GHOSTONE_ID, postAttackGhostone } from "./ghoston";
import { DIAGO_ID, postAttackDiago } from "./diago";
import { DARK_KNIGHT_ID, postAttackDarkKnight } from "./darkKnight";

export const passiveStatusRegistry: Record<string, PassiveStatusFn> = {
  [CHEOLGIBYEONG_ID]: getCheolgibyeongPassiveStatuses,
  [RYEOMCHO_ID]: getRyeomchoPassiveStatuses,
};

export const postAttackRegistry: Record<string, PostAttackFn> = {
  [GEUNYANG_MOJA_ID]: postAttackGeunyangMoja,
  [GHOSTONE_ID]: postAttackGhostone,
  [DIAGO_ID]: postAttackDiago,
  [DARK_KNIGHT_ID]: postAttackDarkKnight,
};

export const damageModRegistry: Record<string, DamageModFn> = {
  [CHEOLGIBYEONG_ID]: applyCheolgibyeongDamageMod,
};

export const onSummonRegistry: Record<string, OnSummonFn> = {
  // 신규 유닛: onSummon 필요 시 units/<유닛>.ts에서 함수 export 후 여기 등록
};
