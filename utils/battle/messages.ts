import { ryeomchoBattleMessages } from "./units/ryeomcho";
import { ranigoBattleMessages } from "./units/ranigo";
import { momoSkillHealAlert } from "./units/momo";
import { ronuBattleMessages } from "./units/ronu";
import { gonchungJeonmogaBattleMessages } from "./units/gonchungJeonmoga";

/** 알림·로그용 — 유닛별 문구는 `units/*.ts`에서 정의 후 여기서 묶습니다. */
export const BATTLE_MSG = {
  ryeomcho: ryeomchoBattleMessages,
  ranigo: ranigoBattleMessages,
  ronu: ronuBattleMessages,
  gonchungJeonmoga: gonchungJeonmogaBattleMessages,
  momo: {
    skillHealAlert: momoSkillHealAlert,
  },
} as const;
