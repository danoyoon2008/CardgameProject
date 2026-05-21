import type { CardRow, FieldCard } from "../../../types/game";

/** 손패 스펠 발동 — 필드 중앙 연출 단계(localStorage `pp_sim_save` 포함) */
export type SpellUsagePendingPhase = "centerReveal" | "centerFly";

/** 손패 스펠 사용 연출·commit 재개용 스냅샷 */
export type SpellUsagePendingSave = {
  phase: SpellUsagePendingPhase;
  /** 현재 단계 시작 시각(ms) — 재접속 시 남은 연출 시간 계산 */
  phaseStartedAt: number;
  /** `centerFly`일 때 0=시작 직후, 1=이동 중 */
  flyPhase?: 0 | 1;
  casterPlayer: "A" | "B";
  previewCard: CardRow;
  mode: "handUnitTarget" | "placeSpellSlot";
  targetPlayer?: "A" | "B";
  unitSlot?: "is" | "m" | "os";
  centerShowsCardBack?: boolean;
  flyToUnitAfterReveal?: boolean;
  flyToSpellSlotAfterReveal?: boolean;
  /** `placeSpellSlot` — 스택에 올릴 필드 카드(시작 시 생성·고정) */
  fieldCard?: FieldCard;
  superTeslaCounter?: {
    counterPlayer: "A" | "B";
    teslaStackIndex: number;
  };
};

export function patchSpellUsagePendingOnState<T extends { spellUsagePending: SpellUsagePendingSave | null }>(
  snap: T,
  patch: SpellUsagePendingSave | null
): T {
  return { ...snap, spellUsagePending: patch };
}

/** 저장값 정규화 */
export function parseSpellUsagePendingSave(raw: unknown): SpellUsagePendingSave | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const previewCard = o.previewCard;
  if (!previewCard || typeof previewCard !== "object") return null;

  const phase = o.phase === "centerFly" ? "centerFly" : "centerReveal";
  const mode = o.mode === "handUnitTarget" ? "handUnitTarget" : "placeSpellSlot";
  const casterPlayer = o.casterPlayer === "B" ? "B" : "A";
  const targetPlayer =
    o.targetPlayer === "A" || o.targetPlayer === "B" ? o.targetPlayer : undefined;
  const unitSlot =
    o.unitSlot === "is" || o.unitSlot === "m" || o.unitSlot === "os" ? o.unitSlot : undefined;
  const flyPhase = o.flyPhase === 1 ? 1 : o.flyPhase === 0 ? 0 : undefined;

  let superTeslaCounter: SpellUsagePendingSave["superTeslaCounter"];
  if (o.superTeslaCounter && typeof o.superTeslaCounter === "object") {
    const st = o.superTeslaCounter as Record<string, unknown>;
    superTeslaCounter = {
      counterPlayer: st.counterPlayer === "B" ? "B" : "A",
      teslaStackIndex: Number(st.teslaStackIndex) || 0,
    };
  }

  let fieldCard: FieldCard | undefined;
  if (o.fieldCard && typeof o.fieldCard === "object") {
    fieldCard = o.fieldCard as FieldCard;
  }

  return {
    phase,
    phaseStartedAt: Number(o.phaseStartedAt) || Date.now(),
    flyPhase,
    casterPlayer,
    previewCard: previewCard as CardRow,
    mode,
    targetPlayer,
    unitSlot,
    centerShowsCardBack: !!o.centerShowsCardBack,
    flyToUnitAfterReveal: !!o.flyToUnitAfterReveal,
    flyToSpellSlotAfterReveal: !!o.flyToSpellSlotAfterReveal,
    fieldCard,
    superTeslaCounter,
  };
}

/** 연출 중 토큰만 소모·손패에서 사라진 뒤 commit 전 이탈 — pending 유지 */
export function reconcileSpellUsagePendingFromSnapshot<T extends { spellUsagePending: SpellUsagePendingSave | null }>(
  snap: T
): T {
  const p = snap.spellUsagePending;
  if (!p) return snap;
  if (!p.previewCard?.name) {
    return patchSpellUsagePendingOnState(snap, null);
  }
  return snap;
}
