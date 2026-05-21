/**
 * 상태 뱃지/패시브 표시명의 의미 분류.
 * 디버프·상태이상은 여기 명시적으로 등록해야 [디버프 면역] 등에서 판별됩니다.
 * 미등록 문자열은 `undefined` 로, 면역 시 제거되지 않습니다.
 */
import { YORIN_STATUS_BADGE } from "./units/darkKnight";
import { isMaxellandTenacityStatusBadge } from "./units/maxelland";
import { PHILIP_OPP_SILENCE_STATUS } from "./units/philip";
import { DINNER_OPP_CONFUSION_STATUS } from "./units/dinner";
import { STUN_STATUS } from "./units/elixir5";
import { BANG_EOMAK_DEFENSE_BADGE } from "./spells/bangeomak";
import { PYRED_ATTACK_AURA_BADGE } from "./units/pyred";

export type EffectSemanticKind = "buff" | "debuff" | "status";

const EFFECT_SEMANTIC: Partial<Record<string, EffectSemanticKind>> = {
  도발: "buff",
  "방어력 +200": "buff",
  [BANG_EOMAK_DEFENSE_BADGE]: "buff",
  "방어력 +400": "buff",
  반짓고리: "buff",
  "집중 사격": "buff",
  [YORIN_STATUS_BADGE]: "buff",
  [PYRED_ATTACK_AURA_BADGE]: "buff",

  /** 필립 패시브 — 버프도 디버프도 아님 */
  [PHILIP_OPP_SILENCE_STATUS]: "status",
  /** 디너 패시브 — 버프도 디버프도 아님 */
  [DINNER_OPP_CONFUSION_STATUS]: "status",
  [STUN_STATUS]: "status",
  /** 백스 [무적] — 버프/디버프가 아님 */
  "[무적]": "status",
  /** 패키 처치 저주 — `utils/battle/units/pakki` 의 PAKKI_ATTACK_DEBUFF_BADGE 와 동일 문자열 */
  "[공격력 50% 감소]": "debuff",
  "[버프 금지]": "debuff",
};

export function getEffectSemanticKind(displayName: string): EffectSemanticKind | undefined {
  if (isMaxellandTenacityStatusBadge(displayName)) return "buff";
  return EFFECT_SEMANTIC[displayName];
}
