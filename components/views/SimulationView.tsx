// components/views/SimulationView.tsx
"use client";

import { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback, type ReactNode, type Dispatch, type SetStateAction, type MutableRefObject } from "react";
import { flushSync } from "react-dom";
import { IconBook, IconDeck, IconHome, IconLock, IconSettings, IconUser, IconUsers } from "../ui/Icons";
import { GuardedImg, MOBILE_CARD_TOUCH_BLOCK_STYLE, preventImageContextMenu } from "../ui/GuardedImg";
import { CardRow, FieldCard } from "../../types/game";
import type { PlayerRole } from "@/hooks/useMatchmaking";
import type { UnitCombatStatsRow, SpellDeployPlaceholderRow } from "../../types/gameStats";
import {
  createSimulationStatsInstanceId,
  emptyUnitCombatRow,
  formatGameStatInteger,
  patchManyUnitCombatStats,
} from "../../types/gameStats";
import {
  applyPostAttackSkills,
  getActiveStatuses,
  parseAttack,
  validateAttack,
  isSilenced,
  isConfused,
  DINNER_OPP_CONFUSION_STATUS,
  isStunned,
  isTaunting,
} from "../../utils/cardskills";
import {
  UNIT,
  PENDING_SKILL,
  MOMO_SKILL_HEAL_AMOUNT,
  BATTLE_MSG,
  GHOSTONE_ID,
  shouldShowGhostoneKillFullHealFeedback,
  shouldShowGhostoneKillVisualFeedback,
  PHILIP_ID,
  fieldSlotGrantsPhilipFacingSilence,
  DINNER_ID,
  CHEOLGIBYEONG_ID,
  isCheolgibyeongPassivesPausedByConfusion,
  DIAGO_ID,
  IRON_KIWI_ID,
  MORNING_MOOD_ID,
  STARTING_TREE_ID,
  PYRED_ID,
  RYEOMCHO_ID,
  DARK_KNIGHT_ID,
  DARK_KNIGHT_GAUGE_CAP,
  YORIN_STATUS_BADGE,
  DEBUFF_IMMUNITY_BADGE,
  MAXELLAND_ID,
  MAXELLAND_TENACITY_GAUGE_CAP,
  applyAttackerOutgoingBuffDamageModsUnlessCallieBanned,
  resolveFieldUnitSimulationBaseAtkRaw,
  bumpMaxellandTenacityGaugeOnEnemyKill,
  applyIncomingDefenseDamage,
  MARY_ID,
  maryDefenseBuffActive,
  PAKKI_ID,
  scalePakkiOutgoingHit,
  shouldApplyPakkiKillDebuffOnDeath,
  stripPakkiDebuffUnderImmunityOnClonedFields,
  PAKKI_ATTACK_DEBUFF_BADGE,
  getDarkKnightYorinAtkBonus,
  getMaxellandTenacityAtkBonus,
  isMaxellandTenacityStatusBadge,
  darkKnightSoulGaugeFull,
  darkKnightSoulGaugeFullForCombat,
  isDarkKnightPassivesPausedByConfusion,
  shouldPlayDarkKnightKillVfx,
  maxellandTenacityGaugeFull,
  maxellandTenacityGaugeFullForCombat,
  isMaxellandTenacityPassivePausedByConfusion,
  shouldPlayMaxellandKillVfx,
  fieldGrantsFocusedFireMultihitExemption,
  getMorningMoodDeathAllyHeal,
  hasMorningMoodAttackAura,
  hasPyredAttackAura,
  buildPyredAuraFieldContext,
  fieldHasActivePyredAuraSource,
  getStartingTreeAllyHealOnDamaged,
  isRyeomcho,
  isRyeomchoPassivesPausedByConfusion,
  isRyeomchoSelfHealBasicAttackSealed,
  isRanigo,
  isRanigoAllyHealBasicAttackSealed,
  resolveFieldUnitSimulationBaseAtkRawWithFacing,
  RANIGO_ALLY_BASIC_HEAL_AMOUNT,
  elixir5StunTargetPatch,
  applyEndTurnStunTickToFieldUnit,
  applyEndTurnIversonWaitTickToFieldUnit,
  IVERSON_ID,
  IVERSON_SUMMON_WAIT_END_TURNS,
  IVERSON_NEAREST_ENEMY_MSG,
  getIversonClosestEnemyTargetSlots,
  iversonWaitGaugeFill01,
  isIversonAttackLocked,
  iversonLiberationLabel,
  shouldEnforceIversonNearestEnemyTargeting,
  shouldLiberateIversonWaitOnConfusion,
  forceCompleteIversonSummonWait,
  MAENGSUGYEON_PO_ID,
  canEnemyFieldSourceTargetMaengsugyeonPo,
  getUnitFacingOppAtSlot,
  isMaengsugyeonPoFacingPassiveSuppressed,
  useGeunyangMojaHitFlame,
  useDiagoHitFlame,
  useMomoHitFlame,
  useGhostoneClawHit,
  useIversonClawHit,
  useEristinaHitLine,
  EONDEOK_SPELL_ID,
  EONDEOK_SILENCE_INITIAL_END_TURN_TICKS,
  applyEndTurnEondeokSilenceTickToFieldUnit,
  applyEndTurnSuppressionTickToFieldUnit,
  isEondeokSilenceActive,
  BEONGGAE_SPELL_ID,
  applyBeonggaeLightningToFieldUnit,
  isBeonggaeValidTargetUnit,
  SOMYEOL_SPELL_ID,
  isOrietChosangSpellCard,
  ORIET_CHOSANG_HP_BARRIER_AMOUNT,
  splitDamageThroughHpBarrier,
  hpBarrierPatchFromRemaining,
  BANG_EOMAK_SPELL_ID,
  BANG_EOMAK_DEFENSE_BADGE,
  BANG_EOMAK_DEFENSE_INITIAL_END_TURN_TICKS,
  getActiveBangEomakDefenseTicksFromField,
  CHEOLBYEOK_SPELL_ID,
  CHEOLBYEOK_ALLY_INVULN_INITIAL_END_TURN_TICKS,
  getActiveCheolbyeokInvulnTicksFromField,
  HYUGESOJAUI_ANSIK_SPELL_ID,
  HYUGESOJAUI_ANSIK_HEAL_PER_TRIGGER,
  HYUGESOJAUI_ANSIK_INITIAL_END_TURN_TICKS,
  applyHyugesojauiAnsikHealAttempt,
  applyHyugesojauiAnsikHealToOwnAebeolaekingRiders,
  applyHyugesojauiAnsikTurnStartForOwner,
  isHyugesojauiAnsikActiveOnSpell,
  type HyugesojauiAnsikHealSlotResult,
  type HyugesojauiAnsikCombatPatch,
  type HyugesojauiAnsikTurnStartVfx,
  BUSINESS_GANG_SPELL_ID,
  BUSINESS_GANG_INITIAL_END_TURN_TICKS,
  getTurnStartTokenGainForPlayer,
  isBusinessGangActiveOnSpell,
  isInvulnerableFromBaekseuOrCheolbyeok,
  applyEndTurnToSpellStack,
  appendSpellToStack,
  rotateSpellStackTopToBottom,
  normalizeSpellStack,
  getTopSpellFromField,
  getSpellDurationBadgeInfo,
  SPELL_DURATION_BADGE_TONE_CLASS,
  applyEndTurnLegendarySwordArmingTickForFieldOwner,
  initializeLegendarySwordFieldCard,
  isLegendarySwordCharging,
  isLegendarySwordArmed,
  isLegendarySwordAbilityPausedByConfusion,
  getLegendarySwordFacingOppAtSlot,
  stripLegendarySwordForRewind,
  getLegendarySwordAtSlot,
  type LegendarySwordPendingSave,
  LEGENDARY_SWORD_FIRST_HIT_DAMAGE,
  LEGENDARY_SWORD_HIT_PLAYER_MARK,
  LEGENDARY_SWORD_PLAYER_SECOND_HIT_DAMAGE,
  legendarySwordSecondHitBaseFromFirstTarget,
  countLivingFieldUnits,
  resolveLegendarySwordStrikeOnUnit,
  isJipjungSagyeokSpellCard,
  isMeteoSpellCard,
  METEO_AOE_DAMAGE,
  applyMeteoDamageToEnemyUnit,
  isAntHellSpellCard,
  isAntHellActiveOnSpell,
  ANT_HELL_SPELL_INITIAL_END_TURN_TICKS,
  applyAntHellSuppressionWaveToEnemies,
  tryApplyAntHellSuppressionOnEnemyUnitDeploy,
  syncAntHellSuppressionForActiveCasters,
  SUPPRESSION_DEBUFF_BADGE,
  suppressionBlocksExternalBuffEffects,
  isSuppressionActive,
  HYPER_BEAM_SPELL_ID,
  HYPER_BEAM_DAMAGE,
  isHyperBeamSpellCard,
  applyHyperBeamDamageToEnemyUnit,
  BUFF_BAN_BADGE,
  callieBuffBanSuppressesBuffsForVictim,
  getKalliVsDefenseTypePureBonus,
  kalliBasicAttackSkipsTargetMitigationVsDefenseType,
  startingHeraldBasicAttackIgnoresTauntTargetingRestrictions,
  STARTING_HERALD_ID,
  isStartingHeraldExclusiveBasicAttackTarget,
  isStartingWraithTrueStrikeBasicAttacker,
  isStartingWraithBasicAttackChainKillEligible,
  isStartingWraithBasicAttackChainFollowUpPending,
  startingWraithChainFollowUpBypassesAntiGangup,
  isStartingWraithPassivesPausedByConfusion,
  getStartingWraithAtSlot,
  type StartingWraithChainPendingSave,
  countOtherLivingDefenderUnits,
  applyEndTurnBaekseuInvulnTickToFieldUnit,
  isBaekseuInvulnerable,
  resolveBaekseuFatalDamage,
  stripBaekseuHarmfulEffectsForInvuln,
  BAEKSEU_INVULN_BADGE,
  applyBaekseuInvulnThresholdExecutePass,
  cleanupSimulationUnitDeath,
  suppressActiveSkillLinksForConfusion,
  isBaekseuLastStandExecuteAuraActiveOnUnit,
  isBaekseuPassivesPausedByConfusion,
  fieldHasBaekseuLastStandExecuteAura,
  isLibuty,
  LIBUTY_BASIC_AOE_DAMAGE,
  LIBUTY_REFLECT_PURE_DAMAGE,
  computeLibutyReflectPureDamageOnAggressor,
  applyLibutyReflectPatchToAggressorCard,
  shouldApplyLibutyBasicAttackReflect,
  isHiddenSpellCard,
  isRonuBlockingCasterActiveSpell,
  forEachOpponentRonuLivingSlotKey,
  isSuperTeslaSpellCard,
  isAttackTypeSpellCard,
  findActivatableSuperTeslaInSpellStack,
  areHiddenSpellsOnFieldSuppressedByRyeomhwa,
  isTauntSuppressedByRyeomhwaForUnitOwner,
  removeSpellFromStackAtIndex,
  superTeslaActivationTokenCost,
  canMuhyohwaCounterFromHandSlot,
  getMuhyohwaCounterCostForSpell,
  isMuhyohwaSpellCard,
  resolveMuhyohwaCounterOpportunity,
  areAllUnitSlotsFilledOnBothFields,
  findActivatableOneNightWagers,
  getPlayerUnitSlotCosts,
  resolveOneNightWagerHigherSumPlayer,
  resolveOneNightWagerLoser,
  applyOneNightWagerTokenSettlement,
  removeAllOneNightWagersFromSpellStack,
  oneNightWagerPendingMatchesFromStack,
  oneNightWagerStackMatchesFromPendingSave,
  reconcileOneNightWagerPendingFromSnapshot,
  type OneNightWagerPendingSave,
  parseSpellUsagePendingSave,
  patchSpellUsagePendingOnState,
  reconcileSpellUsagePendingFromSnapshot,
  type SpellUsagePendingSave,
  isWitchTarotSpellCard,
  isBefpkkiriSpellCard,
  applyBefpkkiriSpellCommit,
  isBubbleStationSpellCard,
  applyBubbleStationInitialCommit,
  applyBubbleStationDiscardWipeEnd,
  applyBubbleStationCommitTypeSelection,
  applyBubbleStationTypeSelectDeadline,
  applyBubbleStationFlashEnd,
  handleBubbleStationCardArrived,
  finishBubbleStationSequence,
  parseBubbleStationPendingSave,
  reconcileBubbleStationPendingFromSnapshot,
  patchBubbleStationPendingOnState,
  hasBubbleStationHandDiscardFlashMark,
  BUBBLE_STATION_SPELL_ID,
  BUBBLE_STATION_DISCARD_WIPE_MS,
  BUBBLE_STATION_TYPE_SELECT_MS,
  BUBBLE_STATION_SELECTION_FLASH_MS,
  BUBBLE_STATION_UNIT_TYPES,
  type BubbleStationPendingSave,
  type BubbleStationUnitTypeId,
  type SimpanPeekQueueEntry,
  WITCH_TAROT_SPELL_ID,
  WITCH_TAROT_TOTAL_STEPS,
  witchTarotStepPlayer,
  stripWitchTarotFromField,
  findWitchTarotCasterOnField,
  type WitchTarotPendingSave,
  GONCHUNG_JEONMOGA_ACTIVE,
  GONCHUNG_HIDDEN_PEEK_SKILL_LABEL,
  spellStackHasHiddenSpell,
  fieldHasActiveSimpanSpellDrawPassive,
  isGuihwanSpellCard,
  getGuihwanRevivableRewindIndices,
  buildGuihwanRevivedFieldCard,
  stripGuihwanSpellForRewind,
  patchGuihwanPendingOnState,
  reconcileGuihwanPendingFromSnapshot,
  parseGuihwanPendingSave,
  type GuihwanPendingSave,
  healUnitCurrentHp,
  applyFieldAllyHealToUnit,
  applyFieldAllyHealToOwnAebeolaekingRidersOnEnemyField,
  computeFieldAllyHealApplied,
  normalizeUnitHpSurvivalOnesForCombat,
  EL_WING_ID,
  EL_WING_MAGIC_IMMUNITY_BADGE,
  EL_WING_SINSEOK_GAUGE_CAP,
  EL_WING_SINSEOK_SKILL_LABEL,
  EL_WING_SINSEOK_BADGE,
  EL_WING_SINSEOK_PROMPT_MS,
  isElWingBlockingEnemyAttackSpell,
  grantElWingSinseokGaugeFromMeteoSplash,
  shouldOfferElWingSinseokOnBasicAttackHit,
  elWingSinseokGaugeFilled,
  clampElWingSinseokGauge,
  AEBEOLAEKING_ID,
  AEBEOLAEKING_PARASITE_TURN_END_DAMAGE,
  AEBEOLAEKING_DAMAGE_SHARE_RATIO,
  isAebeolaekingCard,
  hasAebeolaekingRider,
  buildAebeolaekingRider,
  attachAebeolaekingRider,
  detachAebeolaekingRiderFromHost,
  stripAebeolaekingRiderMeta,
  shouldTriggerAebeolaekingParasiteThisEndTurn,
  applyDamageToAebeolaekingRiderInHost,
  applyAebeolaekingParasiteEndTurnDamageToHost,
  applyAebeolaekingDamageShareFromHostToRider,
  applyAebeolaekingDamageShareFromHostToRiderWithProtection,
  applyAebeolaekingDamageToRiderAndShareToHost,
  applyAebeolaekingDamageToRiderAndShareToHostWithProtection,
  getAebeolaekingRiderOwnerFromHostOwner,
  getAebeolaekingRiderTrueOwner,
  resolveAebeolaekingParasiteBasicAttackPrimaryDamage,
  applyAebeolaekingAoeDamageToRiderOnly,
  applyPostStrikeAllyHealsIncludingW,
  applyMorningMoodDeathHealSpread,
  applyStartingTreeDamagedHealSpread,
  applyHealToOwnAebeolaekingRidersOnEnemyField,
  appendDeadHostWithRiderToRewindCards,
  canHandDragAttachAebeolaekingTo,
  isAebeolaekingNoAttackUnit,
  aebeolaekingRiderSlotKey,
  isAebeolaekingRiderSlotKey,
  parseAebeolaekingRiderSlotKey,
} from "../../utils/battle";
import {
  GonchungSpellStackTopFace,
  HiddenSpellCardBackFace,
  MultiplayCardBackFace,
} from "./simulation/gonchungSpellFace";
import MultiplayDisconnectOverlay from "./simulation/MultiplayDisconnectOverlay";
import OneNightWagerModal from "./SimulationView/modals/OneNightWagerModal";
import WitchTarotCoinOverlay from "./SimulationView/modals/WitchTarotCoinOverlay";
import RewindModal from "./SimulationView/modals/RewindModal";
import "./simulation-combat-flash.css";
import "./simulation-stun-swirl.css";
import "./simulation-iverson-wait-aura.css";
import { STUN_SPIRAL_PATH_D } from "./stunSpiralPath";

function migratePlayerFieldSpellStack(field: {
  is: FieldCard | null;
  m: FieldCard | null;
  os: FieldCard | null;
  spell?: FieldCard | null;
  spellStack?: FieldCard[] | null;
}): {
  is: FieldCard | null;
  m: FieldCard | null;
  os: FieldCard | null;
  spellStack: FieldCard[];
} {
  return {
    is: field.is,
    m: field.m,
    os: field.os,
    spellStack: normalizeSpellStack(field),
  };
}

interface PlayerState {
  hp: number;
  tokens: number;
  hand: CardRow[];
  hasDrawnThisTurn?: boolean;
  attacksThisTurn?: number;
  hasBeenAttackedThisTurn?: boolean;
  field: {
    is: FieldCard | null;
    m: FieldCard | null;
    os: FieldCard | null;
    spellStack: FieldCard[];
  };
}

interface SimulationState {
  currentTurn: "A" | "B" | null;
  turnCount: number;
  globalTurnCount: number; 
  elapsedTime: number; 
  turnTimeLeft: number; 
  settings: {           
    isTimeLimitEnabled: boolean;
    isOpponentCardFlipped: boolean; 
    drawMode: "RANDOM" | "SELECT";
  };
  deckCards: CardRow[];
  rewindCards: CardRow[];
  playerA: PlayerState;
  playerB: PlayerState;
  /** 필드 유닛 인스턴스별 전투 통계 */
  unitCombatStats: Record<string, UnitCombatStatsRow>;
  /** 통계 모달 표시 순서(소환 순) */
  unitStatsOrder: string[];
  /** 마법 카드 필드 배치 기록(통계 UI용 플레이스홀더) */
  spellDeployLog: SpellDeployPlaceholderRow[];
  /** No.51 심판 — 패 6장 만석 시 덱에서 뽑은 1장이 중앙에서 대기(손패 교체 또는 리와인드로 처리) */
  simpanHandChoice: { player: "A" | "B"; pendingCard: CardRow } | null;
  simpanHandChoiceQueue: { player: "A" | "B"; pendingCard: CardRow }[];
  /** 패 5장 이하일 때 1.75초 중앙 프리뷰 후 자동 합류(심판 덱 드로우 / 일반 덱 드로우 공통) */
  simpanPeekReveal: {
    player: "A" | "B";
    pendingCard: CardRow;
    /** "simpan" = 심판, "draw" = 턴 드로우, "opening" = 게임 시작 초기 4장, "teslaDrawRewind" = 슈퍼 테슬라 보상 드로우(손패), "bubbleStation" = No.56 보글보글 스테이션 재드로우 */
    peekKind?:
      | "simpan"
      | "draw"
      | "opening"
      | "teslaDrawRewind"
      | "witchTarot"
      | "befpkkiri"
      | "bubbleStation";
  } | null;
  simpanPeekQueue: SimpanPeekQueueEntry[];
  /** `simpanPeekReveal`이 바뀔 때마다 증가 — 프리뷰 타이머 1회 트리거용 */
  simpanPeekTick: number;
  /** No.53 마녀 타로 — 동전/드로우·버림 시퀀스(저장·복귀 시 재개) */
  witchTarotPending: WitchTarotPendingSave | null;
  /** No.16 전설의 검 — 연격 대상 선택 중(저장·복귀 시 재개) */
  legendarySwordPending: LegendarySwordPendingSave | null;
  /** No.44 시작의 망령 — 처치 연쇄 추가 공격 대상 선택 중(저장·복귀 시 재개) */
  startingWraithChainPending: StartingWraithChainPendingSave | null;
  /** No.34 한날 밤의 내기 — 발동 연출·토큰 정산 중(저장·복귀 시 재개) */
  oneNightWagerPending: OneNightWagerPendingSave | null;
  /** 손패 스펠 — 필드 중앙 연출·commit 대기(저장·복귀 시 재개) */
  spellUsagePending: SpellUsagePendingSave | null;
  /** No.28 귀환 — 리와인드에서 아군 유닛 선택 대기 */
  guihwanPending: GuihwanPendingSave | null;
  /** No.56 보글보글 스테이션 — 유닛 타입 선택·재드로우 시퀀스(저장·복귀 시 재개) */
  bubbleStationPending: BubbleStationPendingSave | null;
}

type ControlledSimulationBinding = {
  state: SimulationState | null;
  setState: Dispatch<SetStateAction<SimulationState | null>>;
  isInitializing: boolean;
  setIsInitializing: Dispatch<SetStateAction<boolean>>;
  syncAfterAction?: () => void;
  /** 멀티플레이 — 마녀 타로 스텝을 외부(MultiplayView)에서 직접 시작하기 위한 트리거 ref */
  witchTarotTriggerRef?: MutableRefObject<
    ((stepIndex: number, casterPlayer: "A" | "B") => void) | null
  >;
  /** 멀티플레이 — 마녀 타로 스텝이 상대방 차례로 넘어갈 때 호출 */
  onWitchTarotTransfer?: (stepIndex: number, casterPlayer: "A" | "B") => void;
  /** 멀티플레이 — 마녀 타로 시퀀스 완전 종료 신호 */
  onWitchTarotFinish?: () => void;
  witchTarotFinishTriggerRef?: MutableRefObject<(() => void) | null>;
};

interface SimulationViewProps {
  isDarkMode: boolean;
  cards: CardRow[];
  onBackToLobby?: () => void;
  onOpenDetail?: (card: CardRow) => void;
  /** 멀티플레이 등 외부에서 주입하는 초기 스냅샷 — 있으면 runInitialization/localStorage 복원을 건너뜀 */
  initialGameState?: SimulationState | null;
  /** 멀티플레이 — useSimulationLogic state/setState를 UI에 연결 */
  controlledSimulation?: ControlledSimulationBinding;
  /** 멀티플레이 시 자신의 진영 — player_b면 화면을 뒤집어 항상 자신이 아래 */
  multiplayMyRole?: PlayerRole;
  /** 멀티플레이 — 상대 연결 끊김 오버레이 */
  multiplayOpponentDisconnected?: boolean;
  multiplayDisconnectSecondsLeft?: number | null;
  /** 멀티플레이 — 세션 승자 (연결 끊김·포기/무승부 등, 마운트 시 null) */
  multiplaySessionWinner?: "A" | "B" | "DRAW" | null;
  /** 멀티플레이 — HP 0 승리 시 DB 저장 콜백 */
  onMultiplayWin?: (winner: "A" | "B") => void;
  /** 멀티플레이 — 게임 종료 창 버튼·메시지 */
  multiplayEndUi?: {
    opponentLeft: boolean;
    rematchStatus: "none" | "waiting" | "incoming";
    onLeaveLobby: () => void;
    onRematch: () => void;
    onRematchAccept: () => void;
    onRematchReject: () => void;
    onSurrender?: () => void;
    onDrawRequest?: (currentTurnCount: number) => void;
    onDrawAccept?: () => void;
    onDrawReject?: () => void;
    showDrawIncoming?: boolean;
    drawRejected?: boolean;
    drawRequestCooldownTurn?: number;
  };
  chatMessages?: { sender: "me" | "opponent"; text: string; timestamp: number }[];
  onSendChatMessage?: (text: string, isEmoji?: boolean) => void;
  onSendTypingIndicator?: () => void;
  opponentEmoji?: string | null;
  opponentTyping?: boolean;
  hasNewChat?: boolean;
  onClearNewChat?: () => void;
}

function normalizeBootstrapSimulationState(raw: SimulationState): SimulationState {
  const parsed = { ...raw };
  parsed.elapsedTime = parsed.elapsedTime || 0;
  parsed.turnTimeLeft = parsed.turnTimeLeft ?? 60;
  parsed.settings = parsed.settings || {
    isTimeLimitEnabled: false,
    isOpponentCardFlipped: false,
    drawMode: "RANDOM",
  };
  parsed.settings.isOpponentCardFlipped = parsed.settings.isOpponentCardFlipped ?? false;
  parsed.settings.drawMode = parsed.settings.drawMode ?? "RANDOM";
  parsed.globalTurnCount = parsed.globalTurnCount ?? 1;
  parsed.unitCombatStats = parsed.unitCombatStats ?? {};
  parsed.unitStatsOrder = parsed.unitStatsOrder ?? [];
  parsed.spellDeployLog = parsed.spellDeployLog ?? [];
  parsed.simpanHandChoice = parsed.simpanHandChoice ?? null;
  parsed.simpanHandChoiceQueue = parsed.simpanHandChoiceQueue ?? [];
  parsed.simpanPeekReveal = parsed.simpanPeekReveal ?? null;
  parsed.simpanPeekQueue = parsed.simpanPeekQueue ?? [];
  parsed.simpanPeekTick = typeof parsed.simpanPeekTick === "number" ? parsed.simpanPeekTick : 0;
  parsed.witchTarotPending = parsed.witchTarotPending ?? null;
  parsed.legendarySwordPending = parsed.legendarySwordPending ?? null;
  parsed.startingWraithChainPending = parsed.startingWraithChainPending ?? null;
  parsed.oneNightWagerPending = parsed.oneNightWagerPending ?? null;
  parsed.spellUsagePending = parsed.spellUsagePending ?? null;
  parsed.guihwanPending = parsed.guihwanPending ?? null;
  parsed.bubbleStationPending = parsed.bubbleStationPending ?? null;
  parsed.rewindCards = parsed.rewindCards ?? [];
  parsed.playerA = { ...parsed.playerA, field: migratePlayerFieldSpellStack(parsed.playerA.field) };
  parsed.playerB = { ...parsed.playerB, field: migratePlayerFieldSpellStack(parsed.playerB.field) };
  return parsed;
}

/** 게임 통계 모달 — 유닛 표 정렬 키 */
type GameStatsUnitSortKey =
  | "default"
  | "name"
  | "summonedTurn"
  | "damageDealt"
  | "kills"
  | "damageTaken"
  | "selfHeal"
  | "allyHealGiven"
  | "damageMitigated";

function compareUnitCombatStatsDesc(
  a: UnitCombatStatsRow,
  b: UnitCombatStatsRow,
  key: Exclude<GameStatsUnitSortKey, "default">
): number {
  switch (key) {
    case "name":
      return a.cardName.localeCompare(b.cardName, "ko");
    case "summonedTurn": {
      const pa = a.summonedTurn.split("-");
      const pb = b.summonedTurn.split("-");
      const ta = parseInt(pa[0] ?? "0", 10) || 0;
      const tb = parseInt(pb[0] ?? "0", 10) || 0;
      if (ta !== tb) return tb - ta;
      return (pb[1] ?? "").localeCompare(pa[1] ?? "");
    }
    case "damageDealt":
      return b.damageDealt - a.damageDealt;
    case "kills":
      return b.kills - a.kills;
    case "damageTaken":
      return b.damageTaken - a.damageTaken;
    case "selfHeal":
      return b.selfHeal - a.selfHeal;
    case "allyHealGiven":
      return b.allyHealGiven - a.allyHealGiven;
    case "damageMitigated":
      return b.damageMitigated - a.damageMitigated;
    default:
      return 0;
  }
}

/** HTML5 DnD 대신 포인터로 손패 카드를 필드에 올릴 때 */
type HandDragState = {
  player: "A" | "B";
  cardIndex: number;
  card: CardRow;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  clientX: number;
  clientY: number;
  pointerId: number;
  opponentCardFlipped: boolean;
};

/** 단하「마법의 갈고리」— 상대 패 슬롯에서 시전자 패 슬롯으로 직선 이동 */
type DanhaStealFlyVisualState = {
  casterPlayer: "A" | "B";
  victimPlayer: "A" | "B";
  victimHandIndex: number;
  stolenCard: CardRow;
  from: { x: number; y: number; w: number; h: number };
  to: { x: number; y: number; w: number; h: number };
  phase: 0 | 1;
  flyMs?: number;
};

const DANHA_STEAL_HAND_FLY_MS = 580;

/** 심판 피크(패 5장 이하) — 중앙에서 패 빈 슬롯으로 이동하는 시각 연출 */
type SimpanPeekFlyVisualState = {
  player: "A" | "B";
  pendingCard: CardRow;
  from: { x: number; y: number; w: number; h: number };
  to: { x: number; y: number; w: number; h: number };
  /** 0: 시작 위치 고정, 1: 목적지로 전환(전환 CSS 적용) */
  phase: 0 | 1;
  peekTick: number;
  flyMs?: number;
  /** 게임 시작 초기 지급 — 신규 드로우 흰 윤곽·섬광 없음 */
  isOpening?: boolean;
};

const SIMPAN_PEEK_PREVIEW_MS = 1750;
const SIMPAN_PEEK_HAND_FLY_MS = 600;
/** 게임 시작 초기 4장 — 짧은 중앙 노출 후 빠른 패 이동(신규 드로우 윤곽·클릭 스킵 없음) */
const OPENING_PEEK_PREVIEW_MS = 0;
const OPENING_PEEK_HAND_FLY_MS = 280;

/** 손패 스펠 사용 — 중앙 프리뷰·슈퍼 테슬라 카운터 연출 */
const SPELL_USAGE_PREVIEW_MS = 1750;
/** No.14 무효화 — 반격 성공 후 중앙 카드 소멸·플로팅 연출 */
const MUHYOHWA_COUNTER_RESOLVE_MS = 780;
const SPELL_USAGE_HAND_FLY_MS = 600;
const SPELL_SLOT_PLACE_FLY_MS = 650;
const SUPER_TESLA_COUNTER_AT_MS = 1000;
const SUPER_TESLA_BLACKOUT_AT_MS = 1700;
const SPELL_USAGE_PREVIEW_TESLA_MS = 2800;
const SUPER_TESLA_REWARD_DRAW_DELAY_MS = 1300;
const TESLA_DRAW_PEEK_MS = 1750;
/** 한날 밤의 내기 — 비교 팝업 표시 후 닫힘 */
const ONE_NIGHT_WAGER_POPUP_VISIBLE_MS = 6000;
/** 팝업 닫힌 뒤 패배자 토큰 소거 연출까지 대기 */
const ONE_NIGHT_WAGER_TOKEN_WIPE_DELAY_MS = 750;

/** 마녀 타로 — 스펠 칸 배치 후 동전 연출 */
const WITCH_TAROT_COIN_DELAY_MS = 750;
const WITCH_TAROT_COIN_FLIP_MS = 1400;
const WITCH_TAROT_COIN_RESULT_MS = 900;
const SPELL_USAGE_CENTER_KEY = "spell-usage-center";

/** 무효화 드롭 — 중앙 발동 연출 카드 영역(부모 pointer-events-none 대응) */
function isClientPointOverSpellUsageCenterCard(
  clientX: number,
  clientY: number,
  measureEl: HTMLDivElement | null
): boolean {
  if (!measureEl) return false;
  const r = measureEl.getBoundingClientRect();
  const pad = 14;
  return (
    clientX >= r.left - pad &&
    clientX <= r.right + pad &&
    clientY >= r.top - pad &&
    clientY <= r.bottom + pad
  );
}

function patchWitchTarotPending(
  prev: SimulationState,
  patch: Partial<WitchTarotPendingSave> | null
): SimulationState {
  if (patch === null) return { ...prev, witchTarotPending: null };
  const base: WitchTarotPendingSave = prev.witchTarotPending ?? {
    casterPlayer: patch.casterPlayer ?? "A",
    coinHeads: null,
    stepIndex: 0,
    awaitingDiscardPlayer: null,
  };
  return { ...prev, witchTarotPending: { ...base, ...patch } };
}

function mergeWitchTarotPendingFromRuntime(
  snap: SimulationState,
  seq: { casterPlayer: "A" | "B"; coinHeads: boolean | null; stepIndex: number } | null,
  awaitingDiscardPlayer: "A" | "B" | null,
  sequenceActive: boolean
): SimulationState {
  if (!sequenceActive || !seq) return snap;
  return patchWitchTarotPending(snap, {
    casterPlayer: seq.casterPlayer,
    coinHeads: seq.coinHeads,
    stepIndex: seq.stepIndex,
    awaitingDiscardPlayer,
  });
}

/** 저장된 pending이 구버전(null coinHeads)일 때 필드·패 상태로 보정 */
function reconcileWitchTarotPendingFromSnapshot(snap: SimulationState): SimulationState {
  const caster = findWitchTarotCasterOnField(snap.playerA.field, snap.playerB.field);
  if (!caster) {
    return snap.witchTarotPending ? patchWitchTarotPending(snap, null) : snap;
  }
  const p = snap.witchTarotPending;
  if (p && p.coinHeads !== null) {
    return patchWitchTarotPending(snap, { ...p, casterPlayer: caster });
  }
  if (snap.simpanPeekReveal?.peekKind === "witchTarot") {
    return patchWitchTarotPending(snap, {
      casterPlayer: caster,
      coinHeads: p?.coinHeads ?? true,
      stepIndex: p?.stepIndex ?? 0,
      awaitingDiscardPlayer: null,
    });
  }
  if (snap.simpanHandChoice) {
    return patchWitchTarotPending(snap, {
      casterPlayer: caster,
      coinHeads: p?.coinHeads ?? true,
      stepIndex: p?.stepIndex ?? 0,
      awaitingDiscardPlayer: null,
    });
  }
  if (p?.awaitingDiscardPlayer) {
    return patchWitchTarotPending(snap, {
      casterPlayer: caster,
      coinHeads: false,
      stepIndex: p.stepIndex,
      awaitingDiscardPlayer: p.awaitingDiscardPlayer,
    });
  }
  return snap;
}

function patchLegendarySwordPending(
  prev: SimulationState,
  patch: LegendarySwordPendingSave | null
): SimulationState {
  return { ...prev, legendarySwordPending: patch };
}

function mergeLegendarySwordPendingFromRuntime(
  snap: SimulationState,
  pending: LegendarySwordPendingSave | null
): SimulationState {
  return patchLegendarySwordPending(snap, pending);
}

function reconcileLegendarySwordPendingFromSnapshot(snap: SimulationState): SimulationState {
  const p = snap.legendarySwordPending;
  if (!p) return snap;
  const sword = getLegendarySwordAtSlot(
    p.ownerPlayer,
    p.swordSlot,
    snap.playerA.field,
    snap.playerB.field
  );
  if (!sword) return patchLegendarySwordPending(snap, null);
  return snap;
}

function patchStartingWraithChainPending(
  prev: SimulationState,
  patch: StartingWraithChainPendingSave | null
): SimulationState {
  return { ...prev, startingWraithChainPending: patch };
}

function mergeStartingWraithChainPendingFromRuntime(
  snap: SimulationState,
  pending: StartingWraithChainPendingSave | null
): SimulationState {
  return patchStartingWraithChainPending(snap, pending);
}

function reconcileStartingWraithChainPendingFromSnapshot(snap: SimulationState): SimulationState {
  const p = snap.startingWraithChainPending;
  if (!p) return snap;
  const wraith = getStartingWraithAtSlot(
    p.attackerPlayer,
    p.attackerSlot,
    snap.playerA.field,
    snap.playerB.field
  );
  if (!wraith) return patchStartingWraithChainPending(snap, null);
  return snap;
}

function patchOneNightWagerPending(
  prev: SimulationState,
  patch: OneNightWagerPendingSave | null
): SimulationState {
  return { ...prev, oneNightWagerPending: patch };
}

function mergeOneNightWagerPendingFromRuntime(
  snap: SimulationState,
  pending: OneNightWagerPendingSave | null,
  sequenceActive: boolean
): SimulationState {
  if (!sequenceActive || !pending) return snap;
  return patchOneNightWagerPending(snap, pending);
}

function patchSpellUsagePending(
  prev: SimulationState,
  patch: SpellUsagePendingSave | null
): SimulationState {
  return patchSpellUsagePendingOnState(prev, patch);
}

function patchGuihwanPending(prev: SimulationState, patch: GuihwanPendingSave | null): SimulationState {
  return patchGuihwanPendingOnState(prev, patch);
}

function mergeSimulationPersistedSequences(
  snap: SimulationState,
  witchSeq: { casterPlayer: "A" | "B"; coinHeads: boolean | null; stepIndex: number } | null,
  witchAwaitingDiscard: "A" | "B" | null,
  witchSequenceActive: boolean,
  legendaryPending: LegendarySwordPendingSave | null,
  startingWraithPending: StartingWraithChainPendingSave | null,
  oneNightWagerPending: OneNightWagerPendingSave | null,
  oneNightWagerSequenceActive: boolean
): SimulationState {
  return mergeOneNightWagerPendingFromRuntime(
    mergeStartingWraithChainPendingFromRuntime(
      mergeLegendarySwordPendingFromRuntime(
        mergeWitchTarotPendingFromRuntime(
          snap,
          witchSeq,
          witchAwaitingDiscard,
          witchSequenceActive
        ),
        legendaryPending
      ),
      startingWraithPending
    ),
    oneNightWagerPending,
    oneNightWagerSequenceActive
  );
}

function spellUsageCasterHaloLayerClass(player: "A" | "B", layer: 1 | 2): string {
  const anim =
    layer === 1
      ? "[animation:spellUsageCasterHaloPulse_1.06s_ease-in-out_infinite]"
      : "[animation:spellUsageCasterHaloPulseAlt_0.78s_ease-in-out_infinite]";
  const size =
    layer === 1
      ? "aspect-square w-[min(88vw,26rem)] blur-[42px] md:blur-[52px]"
      : "aspect-square w-[min(72vw,20rem)] blur-[32px] md:blur-[40px]";
  const tone =
    player === "A"
      ? layer === 1
        ? "bg-sky-500/48 shadow-[0_0_110px_rgba(14,165,233,0.55),0_0_170px_rgba(59,130,246,0.3)]"
        : "bg-sky-400/36 shadow-[0_0_80px_rgba(56,189,248,0.42)]"
      : layer === 1
        ? "bg-red-500/45 shadow-[0_0_110px_rgba(239,68,68,0.52),0_0_170px_rgba(220,38,38,0.28)]"
        : "bg-red-400/34 shadow-[0_0_80px_rgba(248,113,113,0.38)]";
  return `absolute left-1/2 top-1/2 rounded-full ${size} ${anim} ${tone}`;
}

function spellUsageCasterCardShellClass(player: "A" | "B"): string {
  return player === "A"
    ? "border-sky-300/95 shadow-[0_0_28px_rgba(56,189,248,0.55),0_0_48px_rgba(14,165,233,0.3)]"
    : "border-rose-300/95 shadow-[0_0_28px_rgba(251,113,133,0.55),0_0_48px_rgba(239,68,68,0.3)]";
}

type SpellUsageRevealVisualState = {
  casterPlayer: "A" | "B";
  previewCard: CardRow;
  centerShowsCardBack?: boolean;
};

type SpellUsageFlyVisualState = {
  casterPlayer: "A" | "B";
  previewCard: CardRow;
  targetPlayer: "A" | "B";
  unitSlot: "is" | "m" | "os" | "spell";
  flyTarget: "unit" | "spellSlot";
  centerShowsCardBack?: boolean;
  from: { x: number; y: number; w: number; h: number };
  to: { x: number; y: number; w: number; h: number };
  phase: 0 | 1;
  flyMs?: number;
  /** 재접속 복구 — 남은 플라이 시간(ms) */
  resumeRemainingMs?: number;
};

type SpellUsagePending = {
  casterPlayer: "A" | "B";
  previewCard: CardRow;
  mode: "handUnitTarget" | "placeSpellSlot";
  targetPlayer?: "A" | "B";
  unitSlot?: "is" | "m" | "os";
  centerShowsCardBack?: boolean;
  flyToUnitAfterReveal?: boolean;
  flyToSpellSlotAfterReveal?: boolean;
  preApply: (prev: SimulationState) => SimulationState;
  commit: (prev: SimulationState) => SimulationState;
  afterCommitVfx?: () => void;
  superTeslaCounter?: {
    counterPlayer: "A" | "B";
    teslaCard: FieldCard;
    teslaStackIndex: number;
  };
  /** No.14 무효화 — 발동 연출 중 손패에서 드롭해 반격 성공 */
  muhyohwaCounter?: {
    counterPlayer: "A" | "B";
    handIndex: number;
    tokenCost: number;
  };
};

function resolveSuperTeslaCounter(
  snap: SimulationState,
  casterPlayer: "A" | "B"
): NonNullable<SpellUsagePending["superTeslaCounter"]> | null {
  const counterPlayer = casterPlayer === "A" ? "B" : "A";
  if (
    areHiddenSpellsOnFieldSuppressedByRyeomhwa(
      counterPlayer,
      snap.playerA.field,
      snap.playerB.field
    )
  ) {
    return null;
  }
  const counterField = counterPlayer === "A" ? snap.playerA.field : snap.playerB.field;
  const tokens = counterPlayer === "A" ? snap.playerA.tokens : snap.playerB.tokens;
  const match = findActivatableSuperTeslaInSpellStack(counterField, tokens);
  if (!match) return null;
  return {
    counterPlayer,
    teslaCard: match.teslaCard,
    teslaStackIndex: match.stackIndex,
  };
}

function isSpellCardRow(row: CardRow): boolean {
  const typeStr = String(row.type || "").toLowerCase();
  const categoryStr = String(row.category || "").toLowerCase();
  return (
    typeStr.includes("spell") ||
    typeStr.includes("스펠") ||
    typeStr.includes("마법") ||
    categoryStr.includes("spell") ||
    categoryStr.includes("스펠") ||
    categoryStr.includes("마법")
  );
}

/** 자기 스펠 칸에 올릴 수 있는 손패 스펠(적 유닛 타겟·오리에트 초상 제외) */
function canHandDragPlaceSpellOnOwnSpellSlot(
  drag: { player: "A" | "B"; card: CardRow },
  snap: SimulationState,
  targetPlayer: "A" | "B"
): boolean {
  if (!isSpellCardRow(drag.card)) return false;
  if (isMuhyohwaSpellCard(drag.card)) return false;
  if (snap.bubbleStationPending) return false;
  if (snap.currentTurn !== drag.player) return false;
  if (targetPlayer !== drag.player) return false;
  if (isEnemyUnitDragTargetSpell(drag.card)) return false;
  if (isOrietChosangSpellCard(drag.card)) return false;
  if (isGuihwanSpellCard(drag.card)) return false;
  const tokens = drag.player === "A" ? snap.playerA.tokens : snap.playerB.tokens;
  const cost = isHiddenSpellCard(drag.card) ? 0 : Number(drag.card.cost) || 0;
  if (tokens < cost) return false;
  if (
    isRonuBlockingCasterActiveSpell(
      drag.player,
      drag.card,
      snap.playerA.field,
      snap.playerB.field
    )
  ) {
    return false;
  }
  return true;
}

/** 로누(No.20) — 상대 필드에 비혼란 로누가 있을 때 히든이 아닌 손패 스펠 착지 차단 */
function isRonuBlockingSpellHandPlayAt(
  snap: SimulationState,
  drag: { player: "A" | "B"; card: CardRow }
): boolean {
  if (snap.currentTurn !== drag.player) return false;
  return isRonuBlockingCasterActiveSpell(
    drag.player,
    drag.card,
    snap.playerA.field,
    snap.playerB.field
  );
}

/** 스펠 No.7 언덕! / No.19 번개 / No.31 소멸 / No.34 하이퍼 빔 — 적 유닛 슬롯에 드래그하여 발동 */
function isEnemyUnitDragTargetSpell(row: CardRow): boolean {
  return (
    isSpellCardRow(row) &&
    (row.name === EONDEOK_SPELL_ID ||
      row.name === BEONGGAE_SPELL_ID ||
      row.name === SOMYEOL_SPELL_ID ||
      row.name === HYPER_BEAM_SPELL_ID ||
      isHyperBeamSpellCard(row))
  );
}

function facingOppUnitAtSlot(
  sim: SimulationState,
  player: "A" | "B",
  slot: "is" | "m" | "os"
): FieldCard | null {
  const opp = player === "A" ? "B" : "A";
  const f = opp === "A" ? sim.playerA.field : sim.playerB.field;
  return f[slot] ?? null;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type CombatDamagePopupExtras = {
  dkFullGaugeNavyDamageText?: true;
  maxellandFullGaugeVictimDamageOutline?: true;
  /** 캘리 vs [방어형] — 추가 고정 피해 포함 시 밝은 회색 플로팅 */
  kalliVsDefensePureDamageText?: true;
  /** 시작의 망령 트루 스트라이크 기본 공격 — 어두운 회색 플로팅 */
  startingWraithTrueStrikeDamageText?: true;
};

function mergeKalliPureDamageFloat(
  kalliPureAmount: number,
  base?: CombatDamagePopupExtras
): CombatDamagePopupExtras | undefined {
  if (kalliPureAmount <= 0) return base;
  if (!base) return { kalliVsDefensePureDamageText: true };
  return { ...base, kalliVsDefensePureDamageText: true };
}

function mergeStartingWraithTrueStrikeDamageFloat(
  base?: CombatDamagePopupExtras
): CombatDamagePopupExtras | undefined {
  if (!base) return { startingWraithTrueStrikeDamageText: true };
  return { ...base, startingWraithTrueStrikeDamageText: true };
}

type CombatPopupEntry =
  | {
      id: number;
      kind: "damage";
      amount: number;
      dkFullGaugeNavyDamageText?: true;
      maxellandFullGaugeVictimDamageOutline?: true;
      kalliVsDefensePureDamageText?: true;
      startingWraithTrueStrikeDamageText?: true;
    }
  | { id: number; kind: "heal"; amount: number }
  | { id: number; kind: "banjitgoriBuff"; lines: readonly string[] }
  | { id: number; kind: "limeBubbleBuff"; lines: readonly string[] }
  | { id: number; kind: "cheolgibyeongPassiveFloat"; lines: readonly string[] }
  | { id: number; kind: "ryeomchoPassiveFloat"; lines: readonly string[] }
  | { id: number; kind: "ironKiwiPassiveFloat"; lines: readonly string[] }
  /**
   * 시스템 메시지: 슬롯 위 짧은 안내 플로팅(렴초 최대 체력, 토큰 부족 등).
   * 표시는 `renderCombatPopups`의 `infoFloatBaseText`(흰색 일반 텍스트) + `damageFloat` 애니, 지속은 보통 `INFO_FLOAT_MS`.
   * 발행은 `pushInfoFloat(slotKey, text, durationMs, tone?)` — `tone` 생략 시 흰색, `"executeGray"` 처형, `"magicImmunityGreen"` 엘 윙 [마법 면역].
   * 동일 슬롯에 같은 `text`가 이미 떠 있으면 `pushInfoFloat`가 기존 항목을 즉시 제거한 뒤 새로 연다.
   */
  | {
      id: number;
      kind: "infoFloat";
      text: string;
      durationMs: number;
      tone?: "executeGray" | "skyBlue" | "magicImmunityGreen";
    };

/**
 * 카드 섬광 레이어(z-22) — 플로팅 숫자 종류와 별개로 플래시만 구분.
 * 능력 발동 이펙트: 카드 테두리 밖까지 이어지는 정사각형 형태 짧은 명멸.
 * — ghostoneKill(고스톤 처치), philipSummon(필립 소환·패시브 맺음), dinnerSummon(디너 소환·패시브 맺음·핑크),
 * — cheolgibyeongSummon(철기병 소환 및 같은 진영 아군 지연 연출 재사용),
 * — ryeomchoSummon(렴초 소환 — 철기병과 동일 규격·아군 지연, 베이지 톤),
 * — diagoSummon(다이아고 소환 — 철기병과 동형 연출·연두 톤, 아군 전원 동시 발동),
 * — geomeunHwangjeSummon(검은 황제 소환 — 다이아고와 동형·회색 톤, 아군 전원 동시),
 * — ironKiwiSummon(아이언 키위 소환 — 동형·매우 밝은 회색, 아군 전원 동시 발동),
 * — pyredSummon(파이레드 필드 패시브 연동 — 붉은 능력 발동 이펙트),
 * — morningMoodSummon(모닝 무드 필드 패시브 연동 — 연두 능력 발동 이펙트),
 * — startingTreeSummon(시작의 나무 필드 패시브 연동 — 녹색 능력 발동 이펙트),
 * — iversonAttackReady(아이버슨 소환 대기 종료 — 짙은 녹색 능력 발동 이펙트),
 * — eristinaBanjitgori(에리스티나 반짓고리 연결),
 * — limeBubbleShield(라임「방울 보호막」연결 — 밝은 하늘색 섬광),
 * — darkKnightKill(다크나이트 적 유닛 처치·인디고).
 * — maxellandKill(맥셀렌드 적 유닛 처치·붉은 능력 발동 이펙트, 처치자·피해자 동시).
 * — darkKnightFullSoulHit(소울 만축 기본 공격 적중 시 윤곽 인디고 명멸).
 * — maxellandFullGaugeStrike([투지] 만축 기본 공격 적중 — 다크나이트 만축 타격과 동형·주황색).
 * — maryDefenseBuff(메리 [방어력 +400] 패시브 발동/재발동 시 — 아이언 키위와 동형의 밝은 회색 명멸).
 * — pakkiDeathCurse(패키 처치 시 — 필립 소환과 동형 능력 발동 명멸·노랑·주황만 다름; 대상은 붉은 피격 대신 즉시, 처치자는 저주 부여 시).
 * — eondeokSpell(스펠 No.7 언덕! 적 유닛 적중 — 밝은 하늘·시안 능력 발동 이펙트).
 * — beonggaeSpell(스펠 No.19 번개 적 유닛 적중 — 파랑 능력 발동 이펙트).
 * — meteoSpellHit(스펠 No.21 메테오 적중 — 고스톤 처치와 동형·주황빛).
 * — hyperBeamSpellHit(스펠 No.34 하이퍼 빔 적중 — 고스톤과 동형·노란색).
 * — somyeolSpellErase(스펠 No.31 소멸 — 적 즉시 제거, 고스톤 처치와 동형 규격·파랑·시안).
 * — danhaMagicHook(단하「마법의 갈고리」— 고스톤 처치와 동형·하늘색).
 * — superGreenKingSpellBreaker(슈퍼 그린킹「주문 파괴자」— 고스톤 처치와 동형 규격·녹색; 스펠 칸은 가로 타원 전용 레이어).
 * — gonchungHiddenPeek(곤충 전문가「A) 탐색」— 슈퍼 그린킹 스펠 칸 동형·연두).
 * — kalliBuffBan(캘리 [버프 금지] 부여 — 고스톤 능력 발동과 동형·밝은 회색).
 * (damage / heal / philipBasicHit / cheolgibyeongBasicHit 는 동형이 아님.)
 */
type FlashOverlayKind =
  | "damage"
  | "heal"
  | "ghostoneKill"
  | "startingWraithChainKill"
  | "philipSummon"
  | "dinnerSummon"
  | "cheolgibyeongSummon"
  | "ryeomchoSummon"
  | "diagoSummon"
  | "geomeunHwangjeSummon"
  | "ironKiwiSummon"
  | "pyredSummon"
  | "morningMoodSummon"
  | "startingTreeSummon"
  | "iversonAttackReady"
  | "philipBasicHit"
  | "cheolgibyeongBasicHit"
  | "eristinaBanjitgori"
  | "limeBubbleShield"
  | "darkKnightKill"
  | "maxellandKill"
  | "darkKnightFullSoulHit"
  | "maxellandFullGaugeStrike"
  | "maryDefenseBuff"
  | "pakkiDeathCurse"
  | "eondeokSpell"
  | "spellBangEomakAllyPulse"
  | "spellJipjungAllyPulse"
  | "spellCheolbyeokAllyPulse"
  | "spellHyugesojauiAnsikAllyPulse"
  | "orietShieldAllyPulse"
  | "ronuPassiveSpellBlock"
  | "meteoSpellHit"
  | "businessGangSpellPulse"
  | "hyperBeamSpellHit"
  | "beonggaeSpell"
  | "somyeolSpellErase"
  | "danhaMagicHook"
  | "legendarySwordSkill"
  | "superGreenKingSpellBreaker"
  | "gonchungHiddenPeek"
  | "superTeslaSpellTrigger"
  | "befpkkiriSpellTrigger"
  | "bubbleStationSpellTrigger"
  | "elWingMagicImmunityBlock"
  | "oneNightWagerSpellTrigger"
  | "oneNightWagerTokenWipe"
  | "witchTarotSpellPulse"
  | "guihwanPlace"
  | "guihwanRevive"
  | "kalliBuffBan"
  | "muhyohwaCounterResolve"
  | "aebeolaekingAttach"
  | "aebeolaekingAttachAura"
  | "aebeolaekingParasiteTick";

/** 플래시 오버레이 메타(슬롯당 1개) */
type FlashOverlayEntry = {
  kind: FlashOverlayKind;
  id: number;
};

const getHealFromSkillUpdates = (before: FieldCard, updates: Partial<FieldCard>): number => {
  if (updates.currentHp === undefined) return 0;
  return Math.max(0, Number(updates.currentHp) - before.currentHp);
};

/** 패에 새로 들어온 카드 — 상세 보기 전까지 손패에 얇은 흰색 외곽 글로우(시뮬 전용 메타) */
const PP_SIM_HAND_NEW_GLOW = "__ppSimHandNewGlow";
/** 단하 갈고리로 탈취해 패에 도착한 카드 — 도착 시점 시안색 외곽(시뮬 전용 메타) */
const PP_SIM_HAND_DANHA_STEAL_ARRIVAL = "__ppSimHandDanhaStealArrival";

function markPpSimHandNewGlow(card: CardRow, token: string): CardRow {
  return { ...card, [PP_SIM_HAND_NEW_GLOW]: token };
}

function stripPpSimHandNewGlow(card: CardRow): CardRow {
  const raw = card as CardRow & Record<string, unknown>;
  if (typeof raw[PP_SIM_HAND_NEW_GLOW] !== "string") return card;
  const next = { ...raw };
  delete next[PP_SIM_HAND_NEW_GLOW];
  return next as CardRow;
}

function ppSimHandNewGlowToken(card: CardRow): string | undefined {
  const v = (card as CardRow & Record<string, unknown>)[PP_SIM_HAND_NEW_GLOW];
  return typeof v === "string" ? v : undefined;
}

function markPpSimHandDanhaStealArrival(card: CardRow, token: string): CardRow {
  const base = stripPpSimHandNewGlow(stripPpSimHandDanhaStealArrival(card));
  return { ...base, [PP_SIM_HAND_DANHA_STEAL_ARRIVAL]: token };
}

function stripPpSimHandDanhaStealArrival(card: CardRow): CardRow {
  const raw = card as CardRow & Record<string, unknown>;
  if (typeof raw[PP_SIM_HAND_DANHA_STEAL_ARRIVAL] !== "string") return card;
  const next = { ...raw };
  delete next[PP_SIM_HAND_DANHA_STEAL_ARRIVAL];
  return next as CardRow;
}

function ppSimHandDanhaStealArrivalToken(card: CardRow): string | undefined {
  const v = (card as CardRow & Record<string, unknown>)[PP_SIM_HAND_DANHA_STEAL_ARRIVAL];
  return typeof v === "string" ? v : undefined;
}

function clearPpSimHandNewGlowInStateByToken(prev: SimulationState, token: string): SimulationState {
  const mapHand = (hand: CardRow[]) =>
    hand.map(c => {
      if (ppSimHandNewGlowToken(c) === token) return stripPpSimHandNewGlow(c);
      if (ppSimHandDanhaStealArrivalToken(c) === token) return stripPpSimHandDanhaStealArrival(c);
      return c;
    });
  return {
    ...prev,
    playerA: { ...prev.playerA, hand: mapHand(prev.playerA.hand) },
    playerB: { ...prev.playerB, hand: mapHand(prev.playerB.hand) },
  };
}

function clearPpSimHandDanhaStealArrivalInStateByToken(
  prev: SimulationState,
  token: string
): SimulationState {
  const mapHand = (hand: CardRow[]) =>
    hand.map(c =>
      ppSimHandDanhaStealArrivalToken(c) === token ? stripPpSimHandDanhaStealArrival(c) : c
    );
  return {
    ...prev,
    playerA: { ...prev.playerA, hand: mapHand(prev.playerA.hand) },
    playerB: { ...prev.playerB, hand: mapHand(prev.playerB.hand) },
  };
}

function promoteSimpanAfterClearChoice(prev: SimulationState): SimulationState {
  const q = [...(prev.simpanHandChoiceQueue ?? [])];
  let next: SimulationState;
  if (q.length === 0) {
    next = { ...prev, simpanHandChoice: null, simpanHandChoiceQueue: [] };
  } else {
    const [head, ...tail] = q;
    next = { ...prev, simpanHandChoice: head, simpanHandChoiceQueue: tail };
  }
  return primeSimpanPeekReveal(next);
}

/** 피크·교체 UI가 비었을 때 대기 중인 패 교체 선택(큐)을 띄움 */
function promoteNextSimpanHandChoice(s: SimulationState): SimulationState {
  if (s.simpanHandChoice) return s;
  const q = [...(s.simpanHandChoiceQueue ?? [])];
  if (q.length === 0) return s;
  const [head, ...tail] = q;
  return { ...s, simpanHandChoice: head, simpanHandChoiceQueue: tail };
}

function primeSimpanPeekReveal(s: SimulationState): SimulationState {
  if (s.simpanHandChoice || s.simpanPeekReveal) return s;
  const pq = [...(s.simpanPeekQueue ?? [])];
  if (pq.length > 0) {
    const [head, ...tail] = pq;
    return {
      ...s,
      simpanPeekReveal: {
        player: head.player,
        pendingCard: head.pendingCard,
        peekKind: head.peekKind ?? "simpan",
      },
      simpanPeekQueue: tail,
      simpanPeekTick: (s.simpanPeekTick ?? 0) + 1,
    };
  }
  return promoteNextSimpanHandChoice(s);
}

function mergeOnePlayerSimpanDraw(s: SimulationState, playerLetter: "A" | "B", nextGlowToken: () => string): SimulationState {
  const field = playerLetter === "A" ? s.playerA.field : s.playerB.field;
  const oppField = playerLetter === "A" ? s.playerB.field : s.playerA.field;
  if (!fieldHasActiveSimpanSpellDrawPassive(field, oppField)) return s;
  if (s.deckCards.length === 0) return s;

  const deck = [...s.deckCards];
  const drawn = deck.pop()!;
  const ps = playerLetter === "A" ? s.playerA : s.playerB;
  const handLen = ps.hand.length;
  const base: SimulationState = { ...s, deckCards: deck };
  const key = playerLetter === "A" ? "playerA" : "playerB";

  if (handLen < 6) {
    const peekEntry = { player: playerLetter, pendingCard: drawn };
    return {
      ...base,
      [key]: ps,
      simpanPeekQueue: [...(s.simpanPeekQueue ?? []), peekEntry],
    };
  }

  const entry = { player: playerLetter, pendingCard: drawn };
  if (s.simpanHandChoice) {
    return {
      ...base,
      simpanHandChoice: s.simpanHandChoice,
      simpanHandChoiceQueue: [...(s.simpanHandChoiceQueue ?? []), entry],
      [key]: ps,
    };
  }
  return {
    ...base,
    simpanHandChoice: entry,
    simpanHandChoiceQueue: s.simpanHandChoiceQueue ?? [],
    [key]: ps,
  };
}

function applySimpanForBothPlayersAfterSpell(s: SimulationState, nextGlowToken: () => string): SimulationState {
  let out = s;
  out = mergeOnePlayerSimpanDraw(out, "A", nextGlowToken);
  out = mergeOnePlayerSimpanDraw(out, "B", nextGlowToken);
  return primeSimpanPeekReveal(out);
}

export default function SimulationView({
  isDarkMode,
  cards,
  onBackToLobby,
  onOpenDetail,
  initialGameState,
  controlledSimulation,
  multiplayMyRole,
  multiplayOpponentDisconnected = false,
  multiplayDisconnectSecondsLeft = null,
  multiplaySessionWinner = null,
  onMultiplayWin,
  multiplayEndUi,
  chatMessages = [],
  onSendChatMessage,
  onSendTypingIndicator,
  opponentEmoji = null,
  opponentTyping = false,
  hasNewChat,
  onClearNewChat,
}: SimulationViewProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [mobileScale, setMobileScale] = useState(1);
  const [chatInput, setChatInput] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const EMOJI_LIST = ["😊", "👍", "😢", "🔥", "💀", "😎", "🤔", "👏", "😡", "🎉", "😂", "🫡"];
  const [myEmoji, setMyEmoji] = useState<string | null>(null);
  const myEmojiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      const isTouch = navigator.maxTouchPoints > 0 || "ontouchstart" in window;
      const isNarrow = window.innerWidth < 1280;
      setIsMobile(isTouch && isNarrow);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const [localState, setLocalState] = useState<SimulationState | null>(null);
  const state = controlledSimulation ? controlledSimulation.state : localState;
  const setState = controlledSimulation ? controlledSimulation.setState : setLocalState;
  const notifyMultiplaySync = () => {
    controlledSimulation?.syncAfterAction?.();
  };

  const multiplayMyTeam: "A" | "B" | null =
    multiplayMyRole === "player_a" ? "A" : multiplayMyRole === "player_b" ? "B" : null;
  const multiplayOppTeam: "A" | "B" | null = multiplayMyTeam
    ? multiplayMyTeam === "A"
      ? "B"
      : "A"
    : null;
  const multiplayFlipBoard = multiplayMyRole === "player_b";

  // 마녀 타로 진행 중 현재 스텝이 상대 것인지 여부
  const isWitchTarotOtherPlayerStep =
    !!multiplayMyTeam &&
    !!state?.witchTarotPending &&
    state.witchTarotPending.coinHeads !== null &&
    (() => {
      return (
        witchTarotStepPlayer(state.witchTarotPending!.stepIndex, state.witchTarotPending!.casterPlayer) !==
        multiplayMyTeam
      );
    })();

  const {
    onSurrender,
    onDrawRequest,
    onDrawAccept,
    onDrawReject,
    showDrawIncoming,
    drawRejected,
    drawRequestCooldownTurn = 0,
  } = multiplayEndUi ?? {};

  const isMultiplayOpponent = (player: "A" | "B"): boolean =>
    !!multiplayOppTeam && player === multiplayOppTeam;

  const canMultiplayFieldDrop = (targetPlayer: "A" | "B"): boolean => {
    if (!multiplayMyTeam) return true; // 멀티플레이 아님
    if (state?.currentTurn !== multiplayMyTeam) return false; // 내 턴 아님
    return targetPlayer === multiplayMyTeam; // 내 필드에만 드롭 가능
  };

  const canMultiplayHandDragPlayer = (player: "A" | "B"): boolean => {
    if (!multiplayMyTeam) return true;
    return player === multiplayMyTeam;
  };

  const canMultiplayDraw = (): boolean => {
    if (!multiplayMyTeam || !state?.currentTurn) return true;
    return state.currentTurn === multiplayMyTeam;
  };

  const shouldShowMultiplaySpellUsageBack = (casterPlayer: "A" | "B", card?: CardRow | null): boolean =>
    isMultiplayOpponent(casterPlayer) && isHiddenSpellCard(card ?? null);

  const shouldFlipOpponentCard = (player: "A" | "B"): boolean => {
    if (!state) return false;
    if (multiplayMyRole) return false;
    return player === "B" && !!state.settings.isOpponentCardFlipped;
  };

  const opponentCardRotateClass = (player: "A" | "B"): string =>
    shouldFlipOpponentCard(player) ? "rotate-180" : "";

  const isTopPlayerInView = (player: "A" | "B"): boolean =>
    multiplayFlipBoard ? player === "A" : player === "B";

  /** true: 유닛 3칸이 위, 스펠이 아래 (A시점 B진영 / B시점 A진영·자신 B진영은 false) */
  const fieldUnitsBeforeSpell = (player: "A" | "B"): boolean =>
    multiplayFlipBoard ? player === "A" : player === "B";

  /** 화면 위치 기준 체력바·뱃지 배치 — true: 카드 아래(A진영), false: 카드 위(B진영) */
  const fieldSlotIsPlayerA = (player: "A" | "B"): boolean =>
    multiplayFlipBoard ? player === "B" : player === "A";

  const mobileFieldRowOrder = (player: "A" | "B", row: "units" | "spell"): number => {
    if (player === "B") {
      if (multiplayFlipBoard) return row === "units" ? 5 : 4;
      return row === "units" ? 1 : 2;
    }
    if (multiplayFlipBoard) return row === "units" ? 1 : 2;
    return row === "units" ? 5 : 4;
  };

  const mobileFieldRowOrderClass = (player: "A" | "B", row: "units" | "spell"): string => {
    const order = mobileFieldRowOrder(player, row);
    const map: Record<number, string> = {
      1: "order-1",
      2: "order-2",
      3: "order-3",
      4: "order-4",
      5: "order-5",
    };
    return map[order] ?? "order-1";
  };

  const desktopFieldBlockOrderClass = (player: "A" | "B", block: "units" | "spell"): string =>
    fieldUnitsBeforeSpell(player)
      ? block === "units"
        ? "order-1"
        : "order-2"
      : block === "spell"
        ? "order-1"
        : "order-2";

  const isMyTurnInView =
    !!state && (multiplayMyTeam ? state.currentTurn === multiplayMyTeam : state.currentTurn === "A");
  const myEndTurnPlayer: "A" | "B" = multiplayMyTeam ?? "A";
  const oppEndTurnPlayer: "A" | "B" = multiplayOppTeam ?? "B";
  const myTurnColorClass = myEndTurnPlayer === "A" ? "text-sky-400" : "text-rose-400";
  const oppTurnColorClass = oppEndTurnPlayer === "A" ? "text-sky-400" : "text-rose-400";
  const desktopTurnColorClass = !state?.currentTurn
    ? "text-slate-500"
    : isMyTurnInView
      ? myTurnColorClass
      : oppTurnColorClass;
  const desktopTurnLabel = !state?.currentTurn
    ? "READY"
    : isMyTurnInView
      ? "MY\nTURN"
      : "OPP\nTURN";
  const mobileTurnLabel = !state?.currentTurn ? "READY" : isMyTurnInView ? "MY TURN" : "OPP TURN";
  const mobileTurnColor = !state?.currentTurn
    ? "#64748b"
    : isMyTurnInView
      ? myEndTurnPlayer === "A"
        ? "#38bdf8"
        : "#fb7185"
      : oppEndTurnPlayer === "A"
        ? "#38bdf8"
        : "#fb7185";

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); 
  const [isGameStatsOpen, setIsGameStatsOpen] = useState(false);
  const [gameStatsUnitSortKey, setGameStatsUnitSortKey] = useState<GameStatsUnitSortKey>("default");
  const [gameStatsTeamSplit, setGameStatsTeamSplit] = useState(false);
  const [isDrawModalOpen, setIsDrawModalOpen] = useState(false);

  const ppSimHandGlowSeqRef = useRef(0);
  const nextPpSimHandGlowToken = () => {
    ppSimHandGlowSeqRef.current += 1;
    return `pp-hng-${ppSimHandGlowSeqRef.current}`;
  };

  const nextPpSimHandDanhaStealArrivalToken = () => {
    ppSimHandGlowSeqRef.current += 1;
    return `pp-danha-arr-${ppSimHandGlowSeqRef.current}`;
  };

  const openHandCardCodexDetail = useCallback(
    (card: CardRow) => {
      const tok = ppSimHandNewGlowToken(card);
      const danhaTok = ppSimHandDanhaStealArrivalToken(card);
      if (tok) {
        setState(prev => (prev ? clearPpSimHandNewGlowInStateByToken(prev, tok) : prev));
      }
      if (danhaTok) {
        setState(prev =>
          prev ? clearPpSimHandDanhaStealArrivalInStateByToken(prev, danhaTok) : prev
        );
      }
      onOpenDetail?.(stripPpSimHandDanhaStealArrival(stripPpSimHandNewGlow(card)));
    },
    [onOpenDetail]
  );

  const finalizeSpellWithSimpan = (r: SimulationState) => applySimpanForBothPlayersAfterSpell(r, nextPpSimHandGlowToken);

  const dismissSimpanViaRewind = () => {
    setState(prev => {
      if (!prev?.simpanHandChoice) return prev;
      const { pendingCard } = prev.simpanHandChoice;
      const next = promoteSimpanAfterClearChoice({
        ...prev,
        rewindCards: [...prev.rewindCards, pendingCard],
        simpanHandChoice: null,
      });
      if (witchTarotSequenceActiveRef.current) {
        simulationStateRef.current = next;
        window.setTimeout(() => runWitchTarotAdvanceRef.current(), 0);
      }
      return next;
    });
  };

  const resolveSimpanHandPick = (player: "A" | "B", handIndex: number) => {
    setState(prev => {
      if (!prev) return prev;
      if (!prev.simpanHandChoice || prev.simpanHandChoice.player !== player) return prev;
      if (handIndex < 0 || handIndex > 5) return prev;
      const ps = player === "A" ? prev.playerA : prev.playerB;
      if (ps.hand.length !== 6) return prev;
      const hand = [...ps.hand];
      const discarded = hand[handIndex];
      const pending = stripPpSimHandNewGlow(prev.simpanHandChoice.pendingCard);
      hand[handIndex] = markPpSimHandNewGlow(pending, nextPpSimHandGlowToken());
      const base: SimulationState = {
        ...prev,
        rewindCards: [...prev.rewindCards, discarded],
        simpanHandChoice: null,
        [player === "A" ? "playerA" : "playerB"]: { ...ps, hand },
      };
      const next = promoteSimpanAfterClearChoice(base);
      if (witchTarotSequenceActiveRef.current && next) {
        simulationStateRef.current = next;
        window.setTimeout(() => runWitchTarotAdvanceRef.current(), 0);
      }
      return next;
    });
  };
  
  const [localIsInitializing, setLocalIsInitializing] = useState(false);
  const isInitializing = controlledSimulation ? controlledSimulation.isInitializing : localIsInitializing;
  const setIsInitializing = controlledSimulation ? controlledSimulation.setIsInitializing : setLocalIsInitializing;
  const [coinTossDisplay, setCoinTossDisplay] = useState<"A" | "B" | "FLIPPING" | null>(null);
  const [coinFlipSide, setCoinFlipSide] = useState<"A" | "B">("A");
  
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [attackingSlot, setAttackingSlot] = useState<string | null>(null);
  
  const [pendingSecondaryAttack, setPendingSecondaryAttack] = useState<{
    attackerPlayer: "A" | "B";
    attackerSlotName: "is" | "m" | "os";
    damage: number;
    hitsRemaining: number;
    hitTargets: string[];
    /** 라니고 연쇄: 같은 진영 아군만 추가 지정, 피해 대신 고정 회복 */
    allyHealOnly?: boolean;
  } | null>(null);

  const [pendingAttackSelection, setPendingAttackSelection] = useState<{
    player: "A" | "B";
    slot: "is" | "m" | "os";
    primary: string;
    secondary: string;
    position: { x: number; y: number }; 
  } | null>(null);

  /** 리부티 기본 공격 — '모든 적 공격' 확인 팝업(다이아고식 이중 선택창과 동일 레이아웃·단일 버튼) */
  const [pendingLibutyAllEnemiesAttack, setPendingLibutyAllEnemiesAttack] = useState<{
    player: "A" | "B";
    slot: "is" | "m" | "os";
    position: { x: number; y: number };
  } | null>(null);

  /** 엘 윙 [신속] — 상대 기본 공격 시 5초 회피 선택 */
  const [pendingElWingSinseokDefense, setPendingElWingSinseokDefense] = useState<{
    defenderPlayer: "A" | "B";
    defenderSlot: "is" | "m" | "os";
    attackerPlayer: "A" | "B";
    attackerSlot: "is" | "m" | "os";
    hitKind: "primary" | "secondary";
    popupPosition: { x: number; y: number };
    deadlineAt: number;
    wraithChainFollowUp: boolean;
  } | null>(null);
  const elWingSinseokBypassRef = useRef(false);
  const elWingSinseokResumeRef = useRef<(() => void) | null>(null);
  const elWingSinseokTimerRef = useRef<number | null>(null);
  const elWingSinseokTimeoutMetaRef = useRef<{
    hitKind: "primary" | "secondary";
    wraithChainFollowUp: boolean;
  } | null>(null);
  const [elWingSinseokSecondsLeft, setElWingSinseokSecondsLeft] = useState(0);
  /** 1 → 0 — 신속 선택 창 파란 카운트다운 게이지 */
  const [elWingSinseokTimeRatio, setElWingSinseokTimeRatio] = useState(0);

  const [pendingLegendarySwordStrike, setPendingLegendarySwordStrike] =
    useState<LegendarySwordPendingSave | null>(null);
  const legendarySwordStrikePendingRef = useRef<LegendarySwordPendingSave | null>(null);
  const legendarySwordRestoreOnMountDoneRef = useRef(false);
  const applyLegendarySwordStrikePending = useCallback((next: LegendarySwordPendingSave | null) => {
    legendarySwordStrikePendingRef.current = next;
    setPendingLegendarySwordStrike(next);
    setState(prev => (prev ? patchLegendarySwordPending(prev, next) : prev));
  }, []);
  const [pendingStartingWraithChainKill, setPendingStartingWraithChainKill] = useState<{
    attackerPlayer: "A" | "B";
    attackerSlotName: "is" | "m" | "os";
  } | null>(null);
  const [pendingStartingWraithChainPlayerHp, setPendingStartingWraithChainPlayerHp] =
    useState(false);
  const startingWraithChainPendingRef = useRef<StartingWraithChainPendingSave | null>(null);
  const startingWraithRestoreOnMountDoneRef = useRef(false);
  const applyStartingWraithChainPending = useCallback((next: StartingWraithChainPendingSave | null) => {
    startingWraithChainPendingRef.current = next;
    if (!next) {
      setPendingStartingWraithChainKill(null);
      setPendingStartingWraithChainPlayerHp(false);
      setAttackingSlot(null);
    } else {
      const atkSlot = `${next.attackerPlayer}-${next.attackerSlot}`;
      setAttackingSlot(atkSlot);
      if (next.targetKind === "playerHp") {
        setPendingStartingWraithChainKill(null);
        setPendingStartingWraithChainPlayerHp(true);
      } else {
        setPendingStartingWraithChainKill({
          attackerPlayer: next.attackerPlayer,
          attackerSlotName: next.attackerSlot,
        });
        setPendingStartingWraithChainPlayerHp(false);
      }
    }
    setState(prev => (prev ? patchStartingWraithChainPending(prev, next) : prev));
  }, []);
  const legendarySwordAutoOpenResolvedKeyRef = useRef<string | null>(null);
  
  const [pendingSkill, setPendingSkill] = useState<{
    player: "A" | "B";
    slot: "is" | "m" | "os";
    name: string;
  } | null>(null);

  const [gonchungHiddenReveal, setGonchungHiddenReveal] = useState<{
    player: "A" | "B";
    spellStatsInstanceId: string;
  } | null>(null);
  const gonchungHiddenRevealTimerRef = useRef<number | null>(null);

  const [attackOptionOverride, setAttackOptionOverride] = useState<string | null>(null);
  const [isRewindModalOpen, setIsRewindModalOpen] = useState(false);
  const [isGuihwanRewindOpen, setIsGuihwanRewindOpen] = useState(false);
  const guihwanRestoreOnMountDoneRef = useRef(false);
  
  const [winner, setWinner] = useState<"A" | "B" | null>(null);
  const multiplayWinReportedRef = useRef(false);

  const displayWinner = multiplaySessionWinner ?? winner;
  const isDraw = multiplaySessionWinner === "DRAW";
  const isMyWin = !isDraw && multiplaySessionWinner === multiplayMyTeam;
  const resultLabel = isDraw ? "무승부" : displayWinner === multiplayMyTeam ? "승리" : "패배";

  useEffect(() => {
    if (!winner || !multiplayMyRole || !onMultiplayWin || multiplayWinReportedRef.current) return;
    multiplayWinReportedRef.current = true;
    onMultiplayWin(winner);
  }, [winner, multiplayMyRole, onMultiplayWin]);

  const [handDrag, setHandDrag] = useState<HandDragState | null>(null);
  const [selectedHandCard, setSelectedHandCard] = useState<{ player: "A" | "B"; index: number } | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<{
    id: string;
    label: string;
    x: number;
    y: number;
    bgColor: string;
  } | null>(null);
  const activeHandDragRef = useRef<HandDragState | null>(null);
  const touchDragRef = useRef<{
    cardIndex: number;
    player: "A" | "B";
    startX: number;
    startY: number;
    isDragging: boolean;
    dragLayerEls: HTMLElement[];
    startedOnDetailBtn: boolean;
  }>({
    cardIndex: -1,
    player: "A",
    startX: 0,
    startY: 0,
    isDragging: false,
    dragLayerEls: [],
    startedOnDetailBtn: false,
  });
  const mobileTouchSourceElRef = useRef<HTMLElement | null>(null);
  const mobileTouchTapHandlerRef = useRef<(() => void) | null>(null);
  const mobileHandRowRefA = useRef<HTMLDivElement | null>(null);
  const mobileHandRowRefB = useRef<HTMLDivElement | null>(null);
  const mobileSimulationShellRef = useRef<HTMLDivElement | null>(null);
  const mobileHandTapHandlersRef = useRef<Record<string, () => void>>({});
  const mobileHandTouchStartRef = useRef<(ev: TouchEvent) => void>(() => {});
  const [handDragHoverSlotKey, setHandDragHoverSlotKey] = useState<string | null>(null);
  const [simpanPeekFly, setSimpanPeekFly] = useState<SimpanPeekFlyVisualState | null>(null);
  const [danhaStealFly, setDanhaStealFly] = useState<DanhaStealFlyVisualState | null>(null);
  const danhaStealCommitRef = useRef<{
    caster: "A" | "B";
    victimPlayer: "A" | "B";
    victimHandIndex: number;
    targetHandIndex: number;
    slotKey: "is" | "m" | "os";
    arrivalGlowToken: string;
  } | null>(null);
  const [spellUsageReveal, setSpellUsageReveal] = useState<SpellUsageRevealVisualState | null>(null);
  const [spellUsageRevealTick, setSpellUsageRevealTick] = useState(0);
  /** No.14 무효화 반격 성공 — 중앙 스펠 흰 펄스 후 소멸 연출 */
  const [spellUsageMuhyohwaCounterResolve, setSpellUsageMuhyohwaCounterResolve] = useState(false);
  const [spellUsageFly, setSpellUsageFly] = useState<SpellUsageFlyVisualState | null>(null);
  const [spellUsageTeslaHideOppCenterCard, setSpellUsageTeslaHideOppCenterCard] = useState(false);
  const [spellUsageTeslaFlipPlayer, setSpellUsageTeslaFlipPlayer] = useState<"A" | "B" | null>(null);
  const [spellUsageTeslaFieldCard, setSpellUsageTeslaFieldCard] = useState<FieldCard | null>(null);
  const [spellUsageHiddenRevealCards, setSpellUsageHiddenRevealCards] = useState<
    Partial<Record<"A" | "B", FieldCard>> | null
  >(null);
  const [oneNightWagerModal, setOneNightWagerModal] = useState<{
    costsA: ReturnType<typeof getPlayerUnitSlotCosts>;
    costsB: ReturnType<typeof getPlayerUnitSlotCosts>;
    glowPlayer: "A" | "B" | null;
  } | null>(null);
  const spellUsagePendingRef = useRef<SpellUsagePending | null>(null);
  const spellUsageRestoreOnMountDoneRef = useRef(false);
  const buildSpellUsageHandlersRef = useRef<
    ((save: SpellUsagePendingSave) => SpellUsagePending | null) | null
  >(null);
  const tryTriggerOneNightWagerSequenceRef = useRef<() => void>(() => {});
  const oneNightWagerSequenceActiveRef = useRef(false);
  const oneNightWagerPendingRef = useRef<OneNightWagerPendingSave | null>(null);
  const oneNightWagerRestoreOnMountDoneRef = useRef(false);
  const applyOneNightWagerPending = useCallback((next: OneNightWagerPendingSave | null) => {
    oneNightWagerPendingRef.current = next;
    if (!next) {
      setOneNightWagerModal(null);
      setSpellUsageHiddenRevealCards(null);
      oneNightWagerSequenceActiveRef.current = false;
    }
    setState(prev => (prev ? patchOneNightWagerPending(prev, next) : prev));
  }, []);
  const witchTarotSequenceRef = useRef<{
    casterPlayer: "A" | "B";
    coinHeads: boolean | null;
    stepIndex: number;
  } | null>(null);
  const witchTarotSequenceActiveRef = useRef(false);
  const witchTarotCoinFlipIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [witchTarotCoin, setWitchTarotCoin] = useState<
    | null
    | { phase: "FLIPPING" }
    | { phase: "RESULT"; heads: boolean }
  >(null);
  const [witchTarotCoinFlipTick, setWitchTarotCoinFlipTick] = useState(0);
  const [witchTarotDiscardPlayer, setWitchTarotDiscardPlayer] = useState<"A" | "B" | null>(null);
  const witchTarotDiscardPlayerRef = useRef<"A" | "B" | null>(null);
  const [witchTarotFlowActive, setWitchTarotFlowActive] = useState(false);
  const witchTarotRestoreOnMountDoneRef = useRef(false);
  const witchTarotFinishingRef = useRef(false);
  const witchTarotCoinStartScheduledRef = useRef(false);
  const opponentCoinShownRef = useRef<boolean | null>(null);

  // 멀티플레이: 상대방 동전 연출 처리 (무한 루프 없는 ref 기반)
  useEffect(() => {
    if (!multiplayMyTeam) return;
    const pending = state?.witchTarotPending;

    if (!pending) {
      opponentCoinShownRef.current = null;
      return;
    }

    if (multiplayMyTeam === pending.casterPlayer) return; // 시전자는 제외

    if (pending.coinHeads === null) {
      // 동전 회전 시작 — 이미 회전 중이면 중복 방지
      if (witchTarotCoin?.phase === "FLIPPING") return;
      setWitchTarotCoin({ phase: "FLIPPING" });
      setWitchTarotCoinFlipTick(0);
      return;
    }

    // 동전 결과 수신 — 이미 이 결과를 재생했으면 중복 방지
    if (opponentCoinShownRef.current === pending.coinHeads) return;
    opponentCoinShownRef.current = pending.coinHeads;

    setWitchTarotCoin({ phase: "RESULT", heads: pending.coinHeads });
    window.setTimeout(() => {
      setWitchTarotCoin(null);
    }, WITCH_TAROT_COIN_RESULT_MS);
  }, [
    // witchTarotCoin은 의도적으로 제외 — 포함 시 무한 루프 발생
    state?.witchTarotPending?.coinHeads,
    state?.witchTarotPending?.casterPlayer,
    multiplayMyTeam,
  ]);

  // 멀티플레이: stepIndex가 내 차례로 바뀌면 Broadcast 못 받은 경우를 대비해 시퀀스 활성화
  // (witch_tarot_transfer Broadcast의 백업 메커니즘)
  useEffect(() => {
    if (!multiplayMyTeam) return;
    const pending = state?.witchTarotPending;
    if (!pending || pending.coinHeads === null) return;
    if (pending.stepIndex >= WITCH_TAROT_TOTAL_STEPS) return;
    if (witchTarotSequenceActiveRef.current) return;

    const stepPlayer = witchTarotStepPlayer(pending.stepIndex, pending.casterPlayer);
    if (stepPlayer !== multiplayMyTeam) return;

    // 내 차례인데 시퀀스가 비활성 상태 → 직접 시작
    witchTarotSequenceRef.current = {
      casterPlayer: pending.casterPlayer,
      coinHeads: pending.coinHeads,
      stepIndex: pending.stepIndex,
    };
    witchTarotSequenceActiveRef.current = true;
    setWitchTarotFlowActive(true);

    window.setTimeout(() => {
      if (witchTarotSequenceActiveRef.current) {
        runWitchTarotCurrentStepRef.current();
      }
    }, 100); // Broadcast 트리거에 충분한 시간을 주고 그래도 안 됐을 때 발동
  }, [
    state?.witchTarotPending?.stepIndex,
    state?.witchTarotPending?.coinHeads,
    state?.witchTarotPending?.casterPlayer,
    multiplayMyTeam,
  ]);

  const spellUsageMotionActiveRef = useRef(false);
  const spellUsageRevealTimerRef = useRef<number | null>(null);
  const spellUsageMuhyohwaResolveTimerRef = useRef<number | null>(null);
  const playMuhyohwaCounterResolveSequenceRef = useRef<(() => void) | null>(null);
  const spellUsageTeslaCounterTimerRef = useRef<number | null>(null);
  const spellUsageTeslaBlackoutTimerRef = useRef<number | null>(null);
  const spellUsageCardMeasureRef = useRef<HTMLDivElement | null>(null);
  const spellUsageRevealTransitionStartedRef = useRef(false);
  const spellUsageCenterFlashRef = useRef<HTMLDivElement | null>(null);
  const simpanPeekCardMeasureRef = useRef<HTMLDivElement | null>(null);
  const handSlotOuterRefsA = useRef<(HTMLDivElement | null)[]>([null, null, null, null, null, null]);
  const handSlotOuterRefsB = useRef<(HTMLDivElement | null)[]>([null, null, null, null, null, null]);
  const simpanPeekRevealTimerRef = useRef<number | null>(null);
  /** 동일 피크에 대해 타임아웃·클릭 스킵이 중복 실행되지 않도록 */
  const simpanPeekRevealTransitionStartedRef = useRef(false);
  const simpanPeekSkipToFlyRef = useRef<(() => void) | null>(null);
  const spellUsageSkipToFlyRef = useRef<(() => void) | null>(null);
  /** 게임 시작 초기 드로우 1장 연출 완료 시 resolve */
  const openingDrawWaitRef = useRef<(() => void) | null>(null);
  const openingSkipRequestedRef = useRef(false);
  const openingCoinFlipIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const simulationStateRef = useRef<SimulationState | null>(null);
  const winnerStateRef = useRef<"A" | "B" | null>(null);

  useEffect(() => {
    simulationStateRef.current = state;
    winnerStateRef.current = winner;
  }, [state, winner]);

  const completeSimpanPeekRevealToHand = (
    prev: SimulationState,
    player: "A" | "B",
    pendingCard: CardRow,
    expectedPeekTick?: number
  ): SimulationState | null => {
    if (!prev.simpanPeekReveal) return null;
    // peekTick이 다르면 다음 스텝의 reveal이므로 건드리지 않음
    if (
      expectedPeekTick !== undefined &&
      (prev.simpanPeekTick ?? 0) !== expectedPeekTick
    ) {
      return null;
    }
    if (
      prev.simpanPeekReveal.player !== player ||
      prev.simpanPeekReveal.pendingCard !== pendingCard
    ) {
      return null;
    }
    const peekKind = prev.simpanPeekReveal.peekKind ?? "simpan";
    const cardForHand =
      peekKind === "opening"
        ? pendingCard
        : markPpSimHandNewGlow(pendingCard, `pp-hng-${++ppSimHandGlowSeqRef.current}`);
    const key = player === "A" ? "playerA" : "playerB";
    const pslive = player === "A" ? prev.playerA : prev.playerB;
    const merged: SimulationState = {
      ...prev,
      simpanPeekReveal: null,
      [key]: { ...pslive, hand: [...pslive.hand, cardForHand] },
    };
    if (peekKind === "opening") {
      openingDrawWaitRef.current?.();
      openingDrawWaitRef.current = null;
      return merged;
    }
    if (peekKind === "witchTarot") return merged;
    if (peekKind === "draw") return merged;
    if (peekKind === "bubbleStation") {
      const advanced = handleBubbleStationCardArrived(
        merged,
        player,
        cardForHand
      );
      if (!advanced.bubbleStationPending) return advanced;
      return primeSimpanPeekReveal(advanced);
    }
    return primeSimpanPeekReveal(merged);
  };

  const runWitchTarotAdvanceRef = useRef<() => void>(() => {});
  const runWitchTarotCurrentStepRef = useRef<() => void>(() => {});
  const onWitchTarotTransferRef = useRef<
    ((stepIndex: number, casterPlayer: "A" | "B") => void) | null
  >(null);
  const onWitchTarotFinishRef = useRef<(() => void) | null>(null);

  const scheduleTeslaRewardDrawPeek = useCallback((counterPlayer: "A" | "B") => {
    setState(prev => {
      if (!prev || prev.deckCards.length === 0) return prev;
      const deck = [...prev.deckCards];
      const drawn = deck.pop()!;
      return {
        ...prev,
        deckCards: deck,
        simpanPeekReveal: {
          player: counterPlayer,
          pendingCard: stripPpSimHandNewGlow(drawn),
          peekKind: "teslaDrawRewind",
        },
        simpanPeekTick: (prev.simpanPeekTick ?? 0) + 1,
      };
    });
  }, []);

  const runMuhyohwaCounterCommit = useCallback(() => {
    const pending = spellUsagePendingRef.current;
    if (!pending?.muhyohwaCounter) return;
    const { counterPlayer, handIndex, tokenCost } = pending.muhyohwaCounter;
    const previewCard = pending.previewCard;
    setState(prev => {
      if (!prev) return prev;
      const counterIsA = counterPlayer === "A";
      const counterPs = counterIsA ? prev.playerA : prev.playerB;
      if (counterPs.tokens < tokenCost) return prev;
      const hand = [...counterPs.hand];
      if (handIndex < 0 || handIndex >= hand.length) return prev;
      const nullifyRow = hand[handIndex];
      if (!nullifyRow || !isMuhyohwaSpellCard(nullifyRow)) return prev;
      hand.splice(handIndex, 1);
      const counterKey = counterIsA ? "playerA" : "playerB";
      return {
        ...prev,
        rewindCards: [...prev.rewindCards, previewCard, nullifyRow],
        [counterKey]: {
          ...counterPs,
          hand,
          tokens: counterPs.tokens - tokenCost,
        },
      };
    });
  }, []);

  const clearSpellUsageVisualState = useCallback(() => {
    if (spellUsageMuhyohwaResolveTimerRef.current != null) {
      window.clearTimeout(spellUsageMuhyohwaResolveTimerRef.current);
      spellUsageMuhyohwaResolveTimerRef.current = null;
    }
    setSpellUsageMuhyohwaCounterResolve(false);
    setSpellUsageFly(null);
    setSpellUsageReveal(null);
    setSpellUsageTeslaHideOppCenterCard(false);
    setSpellUsageTeslaFlipPlayer(null);
    setSpellUsageTeslaFieldCard(null);
  }, []);

  const runSuperTeslaCounterCommit = useCallback(() => {
    const pending = spellUsagePendingRef.current;
    if (!pending?.superTeslaCounter) return;
    const { counterPlayer, teslaStackIndex } = pending.superTeslaCounter;
    const previewCard = pending.previewCard;
    setState(prev => {
      if (!prev) return prev;
      const counterIsA = counterPlayer === "A";
      const counterPs = counterIsA ? prev.playerA : prev.playerB;
      const stack = normalizeSpellStack(counterPs.field);
      const at = stack[teslaStackIndex];
      if (!at || !isSuperTeslaSpellCard(at)) return prev;
      const teslaCost = superTeslaActivationTokenCost(at);
      if (counterPs.tokens < teslaCost) return prev;
      const newStack = removeSpellFromStackAtIndex(stack, teslaStackIndex);
      const counterKey = counterIsA ? "playerA" : "playerB";
      const updatedCounter = {
        ...counterPs,
        tokens: counterPs.tokens - teslaCost,
        field: { ...counterPs.field, spellStack: newStack },
      };
      return {
        ...prev,
        rewindCards: [...prev.rewindCards, previewCard, at],
        [counterKey]: updatedCounter,
      };
    });
    window.setTimeout(() => {
      scheduleTeslaRewardDrawPeek(counterPlayer);
    }, SUPER_TESLA_REWARD_DRAW_DELAY_MS);
  }, [scheduleTeslaRewardDrawPeek]);

  const applySpellUsagePending = useCallback((next: SpellUsagePendingSave | null) => {
    setState(prev => (prev ? patchSpellUsagePending(prev, next) : prev));
  }, []);

  const finishSpellUsageSequence = useCallback(() => {
    const pending = spellUsagePendingRef.current;

    if (!pending) {
      spellUsageMotionActiveRef.current = false;
      applySpellUsagePending(null);
      clearSpellUsageVisualState();
      return;
    }
    if (pending.muhyohwaCounter) {
      playMuhyohwaCounterResolveSequenceRef.current?.();
      return;
    }
    if (pending.superTeslaCounter) {
      runSuperTeslaCounterCommit();
      spellUsagePendingRef.current = null;
      spellUsageMotionActiveRef.current = false;
      applySpellUsagePending(null);
      clearSpellUsageVisualState();
      return;
    }
    /* 플라이 직후 reveal만 남으면 중앙에 카드가 한 프레임 다시 보임 — commit 전에 연출 상태 제거 */
    flushSync(() => {
      clearSpellUsageVisualState();
    });
    /* 플라이 종료 등 setTimeout 경로에서는 commit 업데이터가 afterCommitVfx보다 늦게 돌 수 있음 */
    flushSync(() => {
      setState(prev => {
        if (!prev) return prev;
        return pending.commit(prev);
      });
    });
    pending.afterCommitVfx?.();
    spellUsagePendingRef.current = null;
    spellUsageMotionActiveRef.current = false;
    applySpellUsagePending(null);
  }, [runSuperTeslaCounterCommit, applySpellUsagePending, clearSpellUsageVisualState]);

  const scheduleSpellHandUsageSequence = useCallback(
    (
      snap: SimulationState,
      params: Omit<SpellUsagePending, "superTeslaCounter"> & { fieldCard?: FieldCard }
    ) => {
      const snapForTeslaCounter = simulationStateRef.current ?? snap;
      const superTeslaCounter = isAttackTypeSpellCard(params.previewCard)
        ? resolveSuperTeslaCounter(snapForTeslaCounter, params.casterPlayer)
        : null;
      const save: SpellUsagePendingSave = {
        phase: "centerReveal",
        phaseStartedAt: Date.now(),
        casterPlayer: params.casterPlayer,
        previewCard: params.previewCard,
        mode: params.mode,
        targetPlayer: params.targetPlayer,
        unitSlot: params.unitSlot,
        centerShowsCardBack: params.centerShowsCardBack,
        flyToUnitAfterReveal: params.flyToUnitAfterReveal,
        flyToSpellSlotAfterReveal: params.flyToSpellSlotAfterReveal,
        fieldCard: params.fieldCard,
        superTeslaCounter: superTeslaCounter
          ? {
              counterPlayer: superTeslaCounter.counterPlayer,
              teslaStackIndex: superTeslaCounter.teslaStackIndex,
            }
          : undefined,
      };
      const built = buildSpellUsageHandlersRef.current?.(save);
      if (!built) return;
      spellUsagePendingRef.current = {
        ...built,
        preApply: params.preApply,
        superTeslaCounter: superTeslaCounter ?? undefined,
      };
      spellUsageMotionActiveRef.current = true;
      applySpellUsagePending(save);
      setSpellUsageTeslaHideOppCenterCard(false);
      setSpellUsageTeslaFlipPlayer(null);
      setSpellUsageTeslaFieldCard(superTeslaCounter?.teslaCard ?? null);
      setState(prev => (prev ? params.preApply(prev) : prev));
      setSpellUsageReveal({
        casterPlayer: params.casterPlayer,
        previewCard: params.previewCard,
        centerShowsCardBack: params.centerShowsCardBack,
      });
      setSpellUsageRevealTick(t => t + 1);
    },
    [applySpellUsagePending]
  );

  /** 드래그 중 포인터 아래 “놓으면 유효” 슬롯 키 — 유닛 빈 칸 / 언덕!·번개·소멸·하이퍼 빔 적 유닛 / 자기 스펠칸(방어막 등) */
  const resolveHandDragHoverFieldKey = (clientX: number, clientY: number): string | null => {
    const drag = activeHandDragRef.current;
    const snap = simulationStateRef.current;
    if (!drag || !snap || winnerStateRef.current) return null;

    const spellPending = snap.spellUsagePending;
    if (isMuhyohwaSpellCard(drag.card) && spellPending?.phase === "centerReveal") {
      if (
        canMuhyohwaCounterFromHandSlot(snap, drag.player, drag.cardIndex, drag.card) &&
        isClientPointOverSpellUsageCenterCard(clientX, clientY, spellUsageCardMeasureRef.current)
      ) {
        return "spell-usage-counter";
      }
      return null;
    }

    const under = document.elementFromPoint(clientX, clientY);

    const drop =
      (under?.closest("[data-slot]") as HTMLElement | null | undefined) ??
      (under?.closest("[data-field-drop]") as HTMLElement | null | undefined);
    if (!drop) return null;
    const targetPlayer = (drop.dataset.player ?? drop.dataset.fieldPlayer) as "A" | "B" | undefined;
    const slot = (drop.dataset.slot ?? drop.dataset.fieldSlot) as "is" | "m" | "os" | "spell" | undefined;
    if (!targetPlayer || !slot) return null;
    const isEnemyTargetCard = isEnemyUnitDragTargetSpell(drag.card) || isAebeolaekingCard(drag.card);
    if (!isEnemyTargetCard && !canMultiplayFieldDrop(targetPlayer)) return null;

    /* 애벌레킹(W) 손패 부착 — 적의 점유된 유닛 슬롯에만 드롭 가능 */
    if (isAebeolaekingCard(drag.card)) {
      if (slot === "spell" || snap.currentTurn !== drag.player) return null;
      const opp = drag.player === "A" ? "B" : "A";
      if (targetPlayer !== opp) return null;
      const field = targetPlayer === "A" ? snap.playerA.field : snap.playerB.field;
      const u = field[slot as "is" | "m" | "os"];
      const can = canHandDragAttachAebeolaekingTo(drag.player, targetPlayer, u);
      if (!can.ok) return null;
      const tokens = drag.player === "A" ? snap.playerA.tokens : snap.playerB.tokens;
      const cost = Number(drag.card.cost) || 0;
      if (tokens < cost) return null;
      return `${targetPlayer}-${slot}`;
    }

    if (isEnemyUnitDragTargetSpell(drag.card)) {
      if (slot === "spell" || snap.currentTurn !== drag.player) return null;
      const opp = drag.player === "A" ? "B" : "A";
      if (targetPlayer !== opp) return null;
      const field = targetPlayer === "A" ? snap.playerA.field : snap.playerB.field;
      const u = field[slot as "is" | "m" | "os"];
      if (!u) return null;
      if (drag.card.name === BEONGGAE_SPELL_ID) {
        if (
          isElWingBlockingEnemyAttackSpell(
            u,
            targetPlayer,
            slot as "is" | "m" | "os",
            snap.playerA.field,
            snap.playerB.field
          )
        ) {
          /* 비용 5 초과여도 번개 시도 시 [마법 면역] 연출을 위해 드롭 허용 */
        } else if (!isBeonggaeValidTargetUnit(u)) {
          return null;
        }
      } else if (
        isElWingBlockingEnemyAttackSpell(
          u,
          targetPlayer,
          slot as "is" | "m" | "os",
          snap.playerA.field,
          snap.playerB.field
        )
      ) {
        return null;
      }
      const tokens = drag.player === "A" ? snap.playerA.tokens : snap.playerB.tokens;
      const cost = Number(drag.card.cost) || 0;
      if (tokens < cost) return null;
      if (isRonuBlockingSpellHandPlayAt(snap, drag)) return null;
      return `${targetPlayer}-${slot}`;
    }

    if (
      isSpellCardRow(drag.card) &&
      isGuihwanSpellCard(drag.card) &&
      snap.currentTurn === drag.player &&
      targetPlayer === drag.player &&
      (slot === "is" || slot === "m" || slot === "os")
    ) {
      const field = targetPlayer === "A" ? snap.playerA.field : snap.playerB.field;
      if (field[slot] !== null) return null;
      const tokens = drag.player === "A" ? snap.playerA.tokens : snap.playerB.tokens;
      const cost = Number(drag.card.cost) || 0;
      if (tokens < cost) return null;
      if (isRonuBlockingSpellHandPlayAt(snap, drag)) return null;
      const revivable = getGuihwanRevivableRewindIndices(
        snap.rewindCards,
        drag.player,
        snap.unitCombatStats
      );
      if (revivable.length === 0) return null;
      return `${targetPlayer}-${slot}`;
    }

    if (
      isSpellCardRow(drag.card) &&
      isOrietChosangSpellCard(drag.card) &&
      snap.currentTurn === drag.player &&
      targetPlayer === drag.player &&
      (slot === "is" || slot === "m" || slot === "os")
    ) {
      const field = targetPlayer === "A" ? snap.playerA.field : snap.playerB.field;
      const u = field[slot];
      if (!u || (u.currentHp ?? 0) <= 0) return null;
      const tokens = drag.player === "A" ? snap.playerA.tokens : snap.playerB.tokens;
      const cost = Number(drag.card.cost) || 0;
      if (tokens < cost) return null;
      if (isRonuBlockingSpellHandPlayAt(snap, drag)) return null;
      return `${targetPlayer}-${slot}`;
    }

    if (
      isSpellCardRow(drag.card) &&
      !isGuihwanSpellCard(drag.card) &&
      snap.currentTurn === drag.player &&
      targetPlayer === drag.player &&
      slot === "spell"
    ) {
      if (!canHandDragPlaceSpellOnOwnSpellSlot(drag, snap, targetPlayer)) return null;
      return `${targetPlayer}-spell`;
    }

    if (snap.currentTurn !== drag.player) return null;
    if (isSpellCardRow(drag.card)) return null;
    if (slot === "spell") return null;
    if (targetPlayer !== drag.player) return null;
    /* 애벌레킹(W)은 자기 진영 빈 슬롯 부착 불가(위에서 차단됐지만 안전망) */
    if (isAebeolaekingCard(drag.card)) return null;

    const field = targetPlayer === "A" ? snap.playerA.field : snap.playerB.field;
    if (field[slot as "is" | "m" | "os"] !== null) return null;

    const tokens = targetPlayer === "A" ? snap.playerA.tokens : snap.playerB.tokens;
    const cost = Number(drag.card.cost) || 0;
    if (tokens < cost) return null;

    return `${targetPlayer}-${slot}`;
  };

  const syncHandDragHover = (clientX: number, clientY: number) => {
    const next = resolveHandDragHoverFieldKey(clientX, clientY);
    setHandDragHoverSlotKey(prev => (prev === next ? prev : next));
  };

  const combatPopupIdRef = useRef(0);
  const [combatPopups, setCombatPopups] = useState<Record<string, CombatPopupEntry[]>>({});
  const [flashOverlay, setFlashOverlay] = useState<Record<string, FlashOverlayEntry>>({});
  const flashOverlaySeqRef = useRef(0);
  const flashClearTimeoutsRef = useRef<Record<string, number>>({});
  const maryDefenseBuffPrevBySlotRef = useRef<Record<string, boolean>>({});
  const prevCallieBuffBanBySlotRef = useRef<Record<string, boolean>>({});
  const prevIversonSummonWaitTicksBySlotRef = useRef<Record<string, number | undefined>>({});
  const lastDarkKnightSoulGaugeBySlotRef = useRef<Record<string, number>>({});
  /** 슬롯마다 충전 명멸 재생용 카운터(`key` 증가 → 애니 재트리거) */
  const [darkKnightGaugeChargePulseBySlot, setDarkKnightGaugeChargePulseBySlot] = useState<Record<string, number>>({});
  const lastMaxellandTenacityGaugeBySlotRef = useRef<Record<string, number>>({});
  const [maxellandGaugeChargePulseBySlot, setMaxellandGaugeChargePulseBySlot] = useState<Record<string, number>>({});
  /** 철기병·렴초·다이아고 등 배치 후 아군에 퍼지는 이펙트 지연 타이머 (초기화 시 일괄 취소) */
  const cheolgibyeongAllyFlashDelayTimeoutsRef = useRef<number[]>([]);
  const {
    trigger: triggerGeunyangMojaHitFlame,
    renderOverlay: renderGeunyangMojaHitFlameOverlay,
    clearAll: clearGeunyangMojaHitFlame,
  } = useGeunyangMojaHitFlame();
  const {
    trigger: triggerDiagoHitFlame,
    renderOverlay: renderDiagoHitFlameOverlay,
    clearAll: clearDiagoHitFlame,
  } = useDiagoHitFlame();
  const {
    trigger: triggerMomoHitFlame,
    renderOverlay: renderMomoHitFlameOverlay,
    clearAll: clearMomoHitFlame,
  } = useMomoHitFlame();
  const {
    trigger: triggerGhostoneClawHit,
    renderOverlay: renderGhostoneClawHitOverlay,
    clearAll: clearGhostoneClawHit,
  } = useGhostoneClawHit();
  const {
    trigger: triggerIversonClawHit,
    renderOverlay: renderIversonClawHitOverlay,
    clearAll: clearIversonClawHit,
  } = useIversonClawHit();
  const {
    trigger: triggerEristinaHitLine,
    renderOverlay: renderEristinaHitLineOverlay,
    clearAll: clearEristinaHitLine,
  } = useEristinaHitLine();

  useEffect(() => {
    if (!state) return;
    const refMap = lastDarkKnightSoulGaugeBySlotRef.current;
    const bumped: string[] = [];
    const consider = (
      slotKey: string,
      card: FieldCard | null,
      owner: "A" | "B",
      slot: "is" | "m" | "os"
    ) => {
      if (!card || card.name !== DARK_KNIGHT_ID) {
        delete refMap[slotKey];
        return;
      }
      const g = Math.max(0, Math.min(DARK_KNIGHT_GAUGE_CAP, card.darkKnightSoulGauge ?? 0));
      const prevG = refMap[slotKey];
      refMap[slotKey] = g;
      const facing =
        owner === "A" ? state.playerB.field[slot] ?? null : state.playerA.field[slot] ?? null;
      if (
        prevG !== undefined &&
        g > prevG &&
        !isDarkKnightPassivesPausedByConfusion(card, facing)
      ) {
        bumped.push(slotKey);
      }
    };
    consider("A-is", state.playerA.field.is, "A", "is");
    consider("A-m", state.playerA.field.m, "A", "m");
    consider("A-os", state.playerA.field.os, "A", "os");
    consider("B-is", state.playerB.field.is, "B", "is");
    consider("B-m", state.playerB.field.m, "B", "m");
    consider("B-os", state.playerB.field.os, "B", "os");
    if (bumped.length === 0) return;
    setDarkKnightGaugeChargePulseBySlot(prev => {
      const next = { ...prev };
      for (const k of bumped) next[k] = (prev[k] ?? 0) + 1;
      return next;
    });
  }, [state]);

  useEffect(() => {
    if (!state) return;
    const refMap = lastMaxellandTenacityGaugeBySlotRef.current;
    const bumped: string[] = [];
    const consider = (slotKey: string, card: FieldCard | null) => {
      if (!card || card.name !== MAXELLAND_ID) {
        delete refMap[slotKey];
        return;
      }
      const g = Math.max(0, Math.min(MAXELLAND_TENACITY_GAUGE_CAP, card.maxellandTenacityGauge ?? 0));
      const prevG = refMap[slotKey];
      refMap[slotKey] = g;
      if (prevG !== undefined && g > prevG) bumped.push(slotKey);
    };
    consider("A-is", state.playerA.field.is);
    consider("A-m", state.playerA.field.m);
    consider("A-os", state.playerA.field.os);
    consider("B-is", state.playerB.field.is);
    consider("B-m", state.playerB.field.m);
    consider("B-os", state.playerB.field.os);
    if (bumped.length === 0) return;
    setMaxellandGaugeChargePulseBySlot(prev => {
      const next = { ...prev };
      for (const k of bumped) next[k] = (prev[k] ?? 0) + 1;
      return next;
    });
  }, [state]);

  const initialized = useRef(false);

  const COMBAT_POPUP_MS = 1400;
  const BANJITGORI_BUFF_FLOAT_MS = 2000;
  const POPUP_ROW_STEP = 40;
  const POPUP_DAMAGE_HEAL_GAP = 12;
  /** 플로팅 숫자·문구 세로 기준 — 카드 상단 밖이 아니라 높이의 이 비율(중앙보다 약간 위) */
  const COMBAT_POPUP_VERTICAL_ANCHOR_PCT = 43;
  /** 앵커에서 첫 줄까지 살짝 위로(구 -10px 역할) */
  const COMBAT_POPUP_FIRST_ROW_OFFSET_PX = 10;
  const BANJITGORI_BUFF_FLOAT_LINES: readonly string[] = ["[도발]", "[피해감소 25%]"];
  const LIME_BUBBLE_BUFF_FLOAT_MS = 2000;
  const LIME_BUBBLE_BUFF_FLOAT_LINES: readonly string[] = ["[방어력 +200]"];
  /** 철기병 패시브 안내(도발·방어) — 에리스티나 반짓고리와 동형 레이아웃, 회색·더 짧게 */
  const CHEOLGIBYEONG_PASSIVE_FLOAT_LINES: readonly string[] = ["[도발]", "[방어력 +200]"];
  const CHEOLGIBYEONG_PASSIVE_FLOAT_MS = 2200;
  /** 아이언 키위 배치 플로팅 — 지속·애니는 철기병 패시브(도발 줄)와 동일 */
  const IRON_KIWI_PASSIVE_FLOAT_LINES: readonly string[] = [DEBUFF_IMMUNITY_BADGE];
  /** 렴초 필드 배치 시 [도발] — 지속은 철기병 패시브 플로팅과 동일 */
  const RYEOMCHO_PASSIVE_FLOAT_LINES: readonly string[] = ["[도발]"];
  /** 시스템 메시지 기본 지속(ms) — `pushInfoFloat`와 함께 사용 */
  const INFO_FLOAT_MS = 2900;
  /** 철기병 본인 이펙트 후, 같은 진영 나머지 아군 이펙트까지 간격(ms) */
  const CHEOLGIBYEONG_ALLY_ABILITY_FLASH_DELAY_MS = 700;
const ATTACK_DISABLED_UNITS = new Set<string>([
  UNIT.MORNING_MOOD,
  UNIT.STARTING_TREE,
  UNIT.LEGENDARY_SWORD,
]);

const isAttackDisabledUnit = (card: FieldCard | null | undefined): boolean =>
  !!card && ATTACK_DISABLED_UNITS.has(String(card.name ?? ""));

  const FLASH_CLEAR_MS: Record<FlashOverlayKind, number> = {
    damage: 700,
    heal: 700,
    // 능력 발동 이펙트(정사각 명멸) 유지 시간 — 고스톤·필립·철기병·렴초·다이아고·에리스티나
    ghostoneKill: 820,
    startingWraithChainKill: 820,
    philipSummon: 820,
    dinnerSummon: 820,
    cheolgibyeongSummon: 820,
    ryeomchoSummon: 820,
    diagoSummon: 820,
    geomeunHwangjeSummon: 820,
    ironKiwiSummon: 820,
    pyredSummon: 820,
    morningMoodSummon: 820,
    startingTreeSummon: 820,
    iversonAttackReady: 820,
    eristinaBanjitgori: 820,
    limeBubbleShield: 820,
    darkKnightKill: 820,
    maxellandKill: 820,
    darkKnightFullSoulHit: 740,
    maxellandFullGaugeStrike: 740,
    maryDefenseBuff: 820,
    pakkiDeathCurse: 820,
    eondeokSpell: 820,
    spellBangEomakAllyPulse: 820,
    spellJipjungAllyPulse: 820,
    spellCheolbyeokAllyPulse: 820,
    spellHyugesojauiAnsikAllyPulse: 820,
    orietShieldAllyPulse: 820,
    ronuPassiveSpellBlock: 820,
    meteoSpellHit: 820,
    businessGangSpellPulse: 820,
    hyperBeamSpellHit: 820,
    beonggaeSpell: 1500,
    somyeolSpellErase: 820,
    philipBasicHit: 700,
    cheolgibyeongBasicHit: 700,
    danhaMagicHook: 820,
    legendarySwordSkill: 820,
    superGreenKingSpellBreaker: 820,
    gonchungHiddenPeek: 820,
    superTeslaSpellTrigger: 980,
    befpkkiriSpellTrigger: 980,
    bubbleStationSpellTrigger: 980,
    elWingMagicImmunityBlock: 820,
    oneNightWagerSpellTrigger: 980,
    oneNightWagerTokenWipe: 900,
    witchTarotSpellPulse: 980,
    guihwanPlace: 920,
    guihwanRevive: 980,
    kalliBuffBan: 820,
    muhyohwaCounterResolve: 820,
    aebeolaekingAttach: 900,
    aebeolaekingAttachAura: 600,
    aebeolaekingParasiteTick: 700,
  };

  const triggerCardFlash = (slotKey: string, kind: FlashOverlayKind) => {
    const prevT = flashClearTimeoutsRef.current[slotKey];
    if (prevT) window.clearTimeout(prevT);
    const id = ++flashOverlaySeqRef.current;
    setFlashOverlay(f => ({ ...f, [slotKey]: { kind, id } }));
    flashClearTimeoutsRef.current[slotKey] = window.setTimeout(() => {
      setFlashOverlay(f => {
        const next = { ...f };
        delete next[slotKey];
        return next;
      });
      delete flashClearTimeoutsRef.current[slotKey];
    }, FLASH_CLEAR_MS[kind]);
  };

  const witchTarotPlayerHandCount = (snap: SimulationState | null, player: "A" | "B"): number => {
    if (!snap) return 0;
    return player === "A" ? snap.playerA.hand.length : snap.playerB.hand.length;
  };

  /** 버림 차례 종료(카드 없음·스킵) — 다음 stepIndex로 진행 */
  const completeWitchTarotDiscardTurn = useCallback(() => {
    if (!witchTarotSequenceActiveRef.current) return;
    witchTarotDiscardPlayerRef.current = null;
    setWitchTarotDiscardPlayer(null);
    setState(prev =>
      prev ? patchWitchTarotPending(prev, { awaitingDiscardPlayer: null }) : prev
    );
    runWitchTarotAdvanceRef.current();
  }, []);

  const finishWitchTarotSequence = useCallback((caster: "A" | "B") => {
    witchTarotFinishingRef.current = true;
    flushSync(() => {
      setState(prev => {
        if (!prev) return prev;
        const key = caster === "A" ? "playerA" : "playerB";
        const ps = caster === "A" ? prev.playerA : prev.playerB;
        const field = stripWitchTarotFromField(ps.field);
        const next = patchWitchTarotPending(
          {
            ...prev,
            [key]: { ...ps, field },
          },
          null
        );
        return applySimpanForBothPlayersAfterSpell(next, nextPpSimHandGlowToken);
      });
    });
    witchTarotSequenceRef.current = null;
    witchTarotSequenceActiveRef.current = false;
    witchTarotFinishingRef.current = false;
    setWitchTarotFlowActive(false);
    witchTarotDiscardPlayerRef.current = null;
    setWitchTarotDiscardPlayer(null);
    triggerCardFlash(`${caster}-spell`, "witchTarotSpellPulse");
  }, []);

  const runWitchTarotCurrentStep = useCallback(() => {
    const seq = witchTarotSequenceRef.current;
    if (!seq) return;
    const snap = simulationStateRef.current;
    const coinHeads = snap?.witchTarotPending?.coinHeads ?? seq.coinHeads;
    if (coinHeads === null) return;
    seq.coinHeads = coinHeads;

    const player = witchTarotStepPlayer(seq.stepIndex, seq.casterPlayer);
    const heads = coinHeads === true;
    if (heads) {
      let skipped = false;
      setState(prev => {
        if (!prev) return prev;
        if (prev.deckCards.length === 0) {
          skipped = true;
          return prev;
        }
        const ps = player === "A" ? prev.playerA : prev.playerB;
        const deck = [...prev.deckCards];
        const drawn = deck.pop()!;
        if (ps.hand.length >= 6) {
          if (prev.simpanHandChoice) {
            return {
              ...prev,
              deckCards: deck,
              simpanHandChoiceQueue: [
                ...(prev.simpanHandChoiceQueue ?? []),
                { player, pendingCard: stripPpSimHandNewGlow(drawn) },
              ],
            };
          }
          return {
            ...prev,
            deckCards: deck,
            simpanHandChoice: { player, pendingCard: stripPpSimHandNewGlow(drawn) },
            simpanHandChoiceQueue: prev.simpanHandChoiceQueue ?? [],
          };
        }
        return {
          ...prev,
          deckCards: deck,
          simpanPeekReveal: {
            player,
            pendingCard: stripPpSimHandNewGlow(drawn),
            peekKind: "witchTarot",
          },
          simpanPeekTick: (prev.simpanPeekTick ?? 0) + 1,
        };
      });
      if (skipped) runWitchTarotAdvanceRef.current();
      return;
    }

    const snapNow = simulationStateRef.current;
    if (witchTarotPlayerHandCount(snapNow, player) <= 0) {
      completeWitchTarotDiscardTurn();
      return;
    }
    witchTarotDiscardPlayerRef.current = player;
    setWitchTarotDiscardPlayer(player);
    setState(prev =>
      prev ? patchWitchTarotPending(prev, { awaitingDiscardPlayer: player }) : prev
    );
  }, [completeWitchTarotDiscardTurn]);

  const scheduleWitchTarotResumeAfterIdle = useCallback(() => {
    if (!witchTarotSequenceActiveRef.current) return;
    window.setTimeout(() => {
      if (!witchTarotSequenceActiveRef.current) return;
      const snap = simulationStateRef.current;
      if (!snap) return;
      if (witchTarotDiscardPlayerRef.current) return;
      if (snap.simpanHandChoice || snap.simpanPeekReveal || (snap.simpanPeekQueue?.length ?? 0) > 0) {
        return;
      }
      const seq = witchTarotSequenceRef.current;
      if (!seq) return;
      seq.stepIndex += 1;
      flushSync(() => {
        setState(prev =>
          prev ? patchWitchTarotPending(prev, { stepIndex: seq.stepIndex }) : prev
        );
      });
      if (seq.stepIndex >= WITCH_TAROT_TOTAL_STEPS) {
        finishWitchTarotSequence(seq.casterPlayer);
        // 멀티플레이: 시전자가 아닌 쪽이 종료 시 시전자에게 완료 신호 전송
        if (multiplayMyTeam) {
          onWitchTarotFinishRef.current?.();
        }
        return;
      }
      // 멀티플레이: 다음 스텝이 나의 스텝이 아니면 여기서 멈추고 상대에게 넘김
      if (multiplayMyTeam) {
        const myPlayerLetter: "A" | "B" = multiplayMyTeam;
        const nextStepPlayer = witchTarotStepPlayer(seq.stepIndex, seq.casterPlayer);
        if (nextStepPlayer !== myPlayerLetter) {
          witchTarotSequenceActiveRef.current = false;
          setWitchTarotFlowActive(false);
          // useEffect/상태 의존 없이 Broadcast로 직접 전환 신호 전송
          onWitchTarotTransferRef.current?.(seq.stepIndex, seq.casterPlayer);
          return;
        }
      }
      runWitchTarotCurrentStepRef.current();
    }, 0);
  }, [finishWitchTarotSequence, multiplayMyTeam, setWitchTarotFlowActive]);

  const advanceWitchTarotAfterStep = scheduleWitchTarotResumeAfterIdle;

  runWitchTarotAdvanceRef.current = advanceWitchTarotAfterStep;
  runWitchTarotCurrentStepRef.current = runWitchTarotCurrentStep;

  onWitchTarotTransferRef.current = controlledSimulation?.onWitchTarotTransfer ?? null;
  onWitchTarotFinishRef.current = controlledSimulation?.onWitchTarotFinish ?? null;

  // 멀티플레이: MultiplayView가 Broadcast 수신 후 직접 호출할 수 있도록 트리거 함수 등록
  if (controlledSimulation?.witchTarotTriggerRef) {
    controlledSimulation.witchTarotTriggerRef.current = (
      stepIndex: number,
      casterPlayer: "A" | "B"
    ) => {
      const pending = simulationStateRef.current?.witchTarotPending;
      if (!pending || pending.coinHeads === null) return;

      witchTarotSequenceRef.current = {
        casterPlayer,
        coinHeads: pending.coinHeads,
        stepIndex,
      };
      witchTarotSequenceActiveRef.current = true;
      setWitchTarotFlowActive(true);
      // React 상태 업데이트(setWitchTarotFlowActive)가 처리된 후 실행
      window.setTimeout(() => {
        if (witchTarotSequenceActiveRef.current) {
          runWitchTarotCurrentStepRef.current();
        }
      }, 0);
    };
  }

  if (controlledSimulation?.witchTarotFinishTriggerRef) {
    controlledSimulation.witchTarotFinishTriggerRef.current = () => {
      if (!witchTarotSequenceActiveRef.current && !witchTarotFlowActive) return;
      const casterPlayer = witchTarotSequenceRef.current?.casterPlayer;
      if (!casterPlayer) return;
      finishWitchTarotSequence(casterPlayer);
    };
  }

  const startWitchTarotCoinSequence = useCallback((casterPlayer: "A" | "B") => {
    const snap = simulationStateRef.current;
    // 멀티플레이: 시전자 클라이언트만 코인 시퀀스 실행
    if (multiplayMyTeam) {
      const myCasterLetter: "A" | "B" = multiplayMyTeam;
      if (myCasterLetter !== casterPlayer) return;
    }
    if (
      witchTarotCoinFlipIntervalRef.current != null ||
      witchTarotCoin != null ||
      (snap?.witchTarotPending?.coinHeads != null &&
        witchTarotSequenceActiveRef.current)
    ) {
      return;
    }
    if (witchTarotCoinFlipIntervalRef.current != null) {
      window.clearInterval(witchTarotCoinFlipIntervalRef.current);
      witchTarotCoinFlipIntervalRef.current = null;
    }
    witchTarotSequenceRef.current = {
      casterPlayer,
      coinHeads: null,
      stepIndex: 0,
    };
    witchTarotSequenceActiveRef.current = true;
    setWitchTarotFlowActive(true);
    setState(prev =>
      prev
        ? patchWitchTarotPending(prev, {
            casterPlayer,
            coinHeads: null,
            stepIndex: 0,
            awaitingDiscardPlayer: null,
          })
        : prev
    );
    setWitchTarotCoin({ phase: "FLIPPING" });
    setWitchTarotCoinFlipTick(0);
    witchTarotCoinFlipIntervalRef.current = setInterval(() => {
      setWitchTarotCoinFlipTick(t => t + 1);
    }, 100);

    window.setTimeout(() => {
      if (witchTarotCoinFlipIntervalRef.current != null) {
        clearInterval(witchTarotCoinFlipIntervalRef.current);
        witchTarotCoinFlipIntervalRef.current = null;
      }

      const heads = Math.random() < 0.5;
      const seq = witchTarotSequenceRef.current;
      if (!seq) return;
      seq.coinHeads = heads;
      flushSync(() => {
        setState(prev => (prev ? patchWitchTarotPending(prev, { coinHeads: heads }) : prev));
      });
      notifyMultiplaySync();
      setWitchTarotCoin({ phase: "RESULT", heads });
      window.setTimeout(() => {
        setWitchTarotCoin(null);
        runWitchTarotCurrentStepRef.current();
      }, WITCH_TAROT_COIN_RESULT_MS);
    }, WITCH_TAROT_COIN_FLIP_MS);
  }, [runWitchTarotCurrentStep, witchTarotCoin, notifyMultiplaySync, multiplayMyTeam]);

  const resolveWitchTarotDiscard = (player: "A" | "B", handIndex: number) => {
    if (witchTarotDiscardPlayer !== player) return;
    setState(prev => {
      if (!prev) return prev;
      const ps = player === "A" ? prev.playerA : prev.playerB;
      if (handIndex < 0 || handIndex >= ps.hand.length) return prev;
      const hand = [...ps.hand];
      const discarded = hand.splice(handIndex, 1)[0]!;
      const key = player === "A" ? "playerA" : "playerB";
      return {
        ...prev,
        rewindCards: [...prev.rewindCards, discarded],
        [key]: { ...ps, hand },
      };
    });
    completeWitchTarotDiscardTurn();
  };

  const restoreWitchTarotSession = useCallback(
    (snap: SimulationState) => {
      const casterOnField = findWitchTarotCasterOnField(snap.playerA.field, snap.playerB.field);
      const pending = snap.witchTarotPending;

      if (!casterOnField && !pending) return;

      if (!casterOnField && pending) {
        setState(prev => (prev ? patchWitchTarotPending(prev, null) : prev));
        return;
      }

      if (!casterOnField) return;

      if (!pending) return;

      witchTarotSequenceRef.current = {
        casterPlayer: pending.casterPlayer,
        coinHeads: pending.coinHeads,
        stepIndex: pending.stepIndex,
      };
      witchTarotSequenceActiveRef.current = true;
      setWitchTarotFlowActive(true);

      if (pending.awaitingDiscardPlayer) {
        const discardPlayer = pending.awaitingDiscardPlayer;
        if (witchTarotPlayerHandCount(snap, discardPlayer) <= 0) {
          window.setTimeout(() => completeWitchTarotDiscardTurn(), 0);
          return;
        }
        witchTarotDiscardPlayerRef.current = discardPlayer;
        setWitchTarotDiscardPlayer(discardPlayer);
        return;
      }

      if (pending.coinHeads === null) return;

      if (
        snap.simpanPeekReveal?.peekKind === "witchTarot" ||
        snap.simpanHandChoice ||
        (snap.simpanPeekQueue?.length ?? 0) > 0
      ) {
        if (snap.simpanPeekReveal?.peekKind === "witchTarot") {
          setState(prev =>
            prev
              ? { ...prev, simpanPeekTick: (prev.simpanPeekTick ?? 0) + 1 }
              : prev
          );
        }
        return;
      }

      if (pending.stepIndex >= WITCH_TAROT_TOTAL_STEPS) {
        finishWitchTarotSequence(pending.casterPlayer);
        return;
      }

      runWitchTarotCurrentStepRef.current();
    },
    [finishWitchTarotSequence, startWitchTarotCoinSequence, completeWitchTarotDiscardTurn]
  );

  const closeGuihwanRewindModal = useCallback(() => {
    setIsGuihwanRewindOpen(false);
  }, []);

  const resolveGuihwanRevive = useCallback(
    (rewindIndex: number) => {
      const pending = state?.guihwanPending;
      if (!pending || !state) return;
      const card = state.rewindCards[rewindIndex];
      if (!card) return;
      const revivable = getGuihwanRevivableRewindIndices(
        state.rewindCards,
        pending.ownerPlayer,
        state.unitCombatStats
      );
      if (!revivable.includes(rewindIndex)) return;

      const slotKey = `${pending.ownerPlayer}-${pending.slot}`;
      triggerCardFlash(slotKey, "guihwanRevive");

      setState(prev => {
        if (!prev?.guihwanPending) return prev;
        const p = prev.guihwanPending;
        const ownerKey = p.ownerPlayer === "A" ? "playerA" : "playerB";
        const ps = p.ownerPlayer === "A" ? prev.playerA : prev.playerB;
        const field = { ...ps.field };
        const spell = field[p.slot];
        if (!spell || !isGuihwanSpellCard(spell) || spell.statsInstanceId !== p.spellStatsInstanceId) {
          return patchGuihwanPending(prev, null);
        }

        let revived = buildGuihwanRevivedFieldCard(
          card,
          prev.turnCount,
          p.ownerPlayer
        );
        const sid = revived.statsInstanceId ?? createSimulationStatsInstanceId();
        revived = { ...revived, statsInstanceId: sid };

        field[p.slot] = revived;

        const newPlayerA = {
          ...prev.playerA,
          field: { ...prev.playerA.field },
        };
        const newPlayerB = {
          ...prev.playerB,
          field: { ...prev.playerB.field },
        };
        if (p.ownerPlayer === "A") {
          newPlayerA.field = field;
        } else {
          newPlayerB.field = field;
        }
        const guihwanAntHell = tryApplyAntHellSuppressionOnEnemyUnitDeploy({
          victimPlayer: p.ownerPlayer,
          victimSlot: p.slot,
          playerA: { field: newPlayerA.field },
          playerB: { field: newPlayerB.field },
          globalTurnCount: prev.globalTurnCount,
        });
        if (guihwanAntHell.appliedSlotKey) {
          window.setTimeout(() => showAntHellSpellHitOnTarget(guihwanAntHell.appliedSlotKey!), 0);
        }
        if (guihwanAntHell.elWingImmunitySlotKey) {
          window.setTimeout(
            () => showElWingMagicImmunityBlockOnUnit(guihwanAntHell.elWingImmunitySlotKey!),
            0
          );
        }

        const rewindCards = [
          ...prev.rewindCards.filter((_, i) => i !== rewindIndex),
          stripGuihwanSpellForRewind(spell),
        ];
        let unitCombatStats = prev.unitCombatStats;
        let unitStatsOrder = prev.unitStatsOrder;
        if (!unitCombatStats[sid]) {
          unitCombatStats = {
            ...unitCombatStats,
            [sid]: emptyUnitCombatRow(revived.name, p.ownerPlayer, revived.summonedTurn),
          };
          unitStatsOrder = [...unitStatsOrder, sid];
        }

        const nextSpellLog = [
          ...prev.spellDeployLog,
          {
            statsInstanceId: sid,
            name: revived.name,
            player: p.ownerPlayer,
            summonedTurn: revived.summonedTurn,
          },
        ];

        return finalizeSpellWithSimpan(
          patchGuihwanPending(
            {
              ...prev,
              rewindCards,
              unitCombatStats,
              unitStatsOrder,
              spellDeployLog: nextSpellLog,
              playerA: newPlayerA,
              playerB: newPlayerB,
            },
            null
          )
        );
      });
      setIsGuihwanRewindOpen(false);
    },
    [state, triggerCardFlash, finalizeSpellWithSimpan]
  );

  const placeGuihwanSpellOnEmptyField = useCallback(
    (
      gameState: SimulationState,
      cardIndex: number,
      sourcePlayer: "A" | "B",
      slot: "is" | "m" | "os"
    ) => {
      if (!gameState || winner) return;
      if (gameState.guihwanPending) return;
      const isPlayerA = sourcePlayer === "A";
      const hand = isPlayerA ? gameState.playerA.hand : gameState.playerB.hand;
      const handCard = hand[cardIndex];
      if (!handCard || !isGuihwanSpellCard(handCard)) return;

      const field = isPlayerA ? gameState.playerA.field : gameState.playerB.field;
      if (field[slot] !== null) {
        pushInfoFloat(`${sourcePlayer}-${slot}`, "빈 칸에만 놓을 수 있습니다", INFO_FLOAT_MS);
        return;
      }

      const placementCost = Number(handCard.cost) || 0;
      const tokens = isPlayerA ? gameState.playerA.tokens : gameState.playerB.tokens;
      if (tokens < placementCost) {
        pushInfoFloat(`${sourcePlayer}-${slot}`, "토큰이 부족합니다", INFO_FLOAT_MS);
        return;
      }
      if (
        isRonuBlockingCasterActiveSpell(
          sourcePlayer,
          handCard,
          gameState.playerA.field,
          gameState.playerB.field
        )
      ) {
        pushInfoFloat(`${sourcePlayer}-${slot}`, BATTLE_MSG.ronu.cannotUseActiveSpells, INFO_FLOAT_MS);
        forEachOpponentRonuLivingSlotKey(sourcePlayer, gameState.playerA.field, gameState.playerB.field, key => {
          triggerCardFlash(key, "ronuPassiveSpellBlock");
        });
        return;
      }

      const revivable = getGuihwanRevivableRewindIndices(
        gameState.rewindCards,
        sourcePlayer,
        gameState.unitCombatStats
      );
      if (revivable.length === 0) {
        pushInfoFloat(`${sourcePlayer}-spell`, "부활할 아군 유닛이 리와인드에 없습니다", INFO_FLOAT_MS);
        return;
      }

      const spellStatsId = createSimulationStatsInstanceId();
      const handCardForField = stripPpSimHandNewGlow(handCard);
      const spellOnField: FieldCard = {
        ...handCardForField,
        statsInstanceId: spellStatsId,
        currentHp: Number(handCard.hp) || 1,
        hasAttacked: true,
        hasBeenAttackedThisTurn: false,
        summonedTurn: `${gameState.turnCount}-${gameState.currentTurn}`,
      };

      const pending: GuihwanPendingSave = {
        ownerPlayer: sourcePlayer,
        slot,
        spellStatsInstanceId: spellStatsId,
      };

      setState(prev => {
        if (!prev) return prev;
        const h = [...(isPlayerA ? prev.playerA.hand : prev.playerB.hand)];
        if (cardIndex < 0 || cardIndex >= h.length || !isGuihwanSpellCard(h[cardIndex])) return prev;
        h.splice(cardIndex, 1);
        const key = isPlayerA ? "playerA" : "playerB";
        const ps = isPlayerA ? prev.playerA : prev.playerB;
        const f = { ...ps.field, [slot]: spellOnField };
        return patchGuihwanPending(
          {
            ...prev,
            [key]: { ...ps, hand: h, tokens: ps.tokens - placementCost, field: f },
          },
          pending
        );
      });

      triggerCardFlash(`${sourcePlayer}-${slot}`, "guihwanPlace");
      setIsGuihwanRewindOpen(true);
    },
    [winner, triggerCardFlash]
  );

  useEffect(() => {
    if (!state || isInitializing) return;
    if (guihwanRestoreOnMountDoneRef.current) return;
    if (!state.guihwanPending) return;
    // 멀티플레이: 귀환 시전자 본인에게만 모달 표시
    if (multiplayMyTeam && state.guihwanPending.ownerPlayer !== multiplayMyTeam) return;
    guihwanRestoreOnMountDoneRef.current = true;
    setIsGuihwanRewindOpen(true);
  }, [state, isInitializing, multiplayMyTeam]);

  useEffect(() => {
    if (!state || !witchTarotDiscardPlayer || !witchTarotSequenceActiveRef.current) return;
    if (witchTarotPlayerHandCount(state, witchTarotDiscardPlayer) > 0) return;
    completeWitchTarotDiscardTurn();
  }, [
    state?.playerA.hand,
    state?.playerB.hand,
    witchTarotDiscardPlayer,
    completeWitchTarotDiscardTurn,
  ]);

  const playHyugesojauiAnsikAllyPulseAndHealVfx = (
    allyPlayer: "A" | "B",
    perSlot: readonly HyugesojauiAnsikHealSlotResult[]
  ) => {
    if (perSlot.length === 0) return;
    for (const s of perSlot) {
      const key = `${allyPlayer}-${s.slot}`;
      triggerCardFlash(key, "spellHyugesojauiAnsikAllyPulse");
      if (s.healed > 0) showHealNumber(key, s.healed, { skipHealFlash: true });
    }
  };

  useEffect(() => {
    if (!state) return;
    const slots = ["A-is", "A-m", "A-os", "B-is", "B-m", "B-os"] as const;
    const prevMap = maryDefenseBuffPrevBySlotRef.current;
    for (const key of slots) {
      const [p, s] = key.split("-") as ["A" | "B", "is" | "m" | "os"];
      const card = (p === "A" ? state.playerA : state.playerB).field[s];
      const now =
        !!card &&
        card.name === MARY_ID &&
        maryDefenseBuffActive(
          card,
          state.playerA.field,
          state.playerB.field,
          key,
          facingOppUnitAtSlot(state, p, s)
        );
      const prev = prevMap[key];
      if (now && !prev) {
        triggerCardFlash(key, "maryDefenseBuff");
      }
      prevMap[key] = now;
    }
  }, [state]);

  useEffect(() => {
    if (!state || !pendingSkill || pendingSkill.name !== PENDING_SKILL.SUPER_GREEN_KING_SPELL_BREAKER) return;
    const { player, slot } = pendingSkill;
    const f = player === "A" ? state.playerA.field : state.playerB.field;
    const u = f[slot as "is" | "m" | "os"];
    if (!u || u.name !== UNIT.SUPER_GREEN_KING) {
      setPendingSkill(null);
    }
  }, [state, pendingSkill]);

  useEffect(() => {
    if (!state || !pendingSkill || pendingSkill.name !== PENDING_SKILL.GONCHUNG_HIDDEN_PEEK) return;
    const { player, slot } = pendingSkill;
    const f = player === "A" ? state.playerA.field : state.playerB.field;
    const u = f[slot as "is" | "m" | "os"];
    if (!u || u.name !== UNIT.GONCHUNG_JEONMOGA) {
      setPendingSkill(null);
    }
  }, [state, pendingSkill]);

  useEffect(() => {
    return () => {
      if (gonchungHiddenRevealTimerRef.current != null) {
        window.clearTimeout(gonchungHiddenRevealTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!state) return;
    const slots = ["A-is", "A-m", "A-os", "B-is", "B-m", "B-os"] as const;
    const prevMap = prevCallieBuffBanBySlotRef.current;
    for (const key of slots) {
      const [p, s] = key.split("-") as ["A" | "B", "is" | "m" | "os"];
      const card = (p === "A" ? state.playerA : state.playerB).field[s];
      const now =
        !!card &&
        callieBuffBanSuppressesBuffsForVictim(p, s, state.playerA.field, state.playerB.field);
      const prev = prevMap[key];
      if (now && !prev) {
        triggerCardFlash(key, "kalliBuffBan");
      }
      prevMap[key] = now;
    }
  }, [state]);

  useEffect(() => {
    if (!state) return;
    const slots = ["A-is", "A-m", "A-os", "B-is", "B-m", "B-os"] as const;
    const refMap = prevIversonSummonWaitTicksBySlotRef.current;
    for (const key of slots) {
      const [p, s] = key.split("-") as ["A" | "B", "is" | "m" | "os"];
      const card = (p === "A" ? state.playerA.field : state.playerB.field)[s];
      const prev = refMap[key];
      if (card?.name === IVERSON_ID) {
        const cur = card.iversonSummonWaitEndTurnTicksRemaining;
        if ((prev ?? 0) > 0 && (cur ?? 0) <= 0) {
          triggerCardFlash(key, "iversonAttackReady");
        }
        refMap[key] = cur;
      } else {
        delete refMap[key];
      }
    }
  }, [state]);

  /** 아이버슨 — [혼란] 부여 시 소환 대기 즉시 해방 */
  useEffect(() => {
    if (!state) return;
    setState(prev => {
      if (!prev) return prev;
      let changed = false;
      const nextA = { ...prev.playerA, field: { ...prev.playerA.field } };
      const nextB = { ...prev.playerB, field: { ...prev.playerB.field } };
      const slots = ["is", "m", "os"] as const;

      const tryLiberate = (
        owner: "A" | "B",
        field: typeof prev.playerA.field,
        outField: typeof nextA.field
      ) => {
        for (const slot of slots) {
          const card = field[slot];
          if (!card || card.name !== IVERSON_ID) continue;
          const facing = getUnitFacingOppAtSlot(owner, slot, prev.playerA.field, prev.playerB.field);
          if (!shouldLiberateIversonWaitOnConfusion(card, facing)) continue;
          outField[slot] = forceCompleteIversonSummonWait(card);
          changed = true;
        }
      };

      tryLiberate("A", prev.playerA.field, nextA.field);
      tryLiberate("B", prev.playerB.field, nextB.field);
      if (!changed) return prev;
      return { ...prev, playerA: nextA, playerB: nextB };
    });
  }, [
    state?.playerA.field.is,
    state?.playerA.field.m,
    state?.playerA.field.os,
    state?.playerB.field.is,
    state?.playerB.field.m,
    state?.playerB.field.os,
  ]);

  useEffect(() => {
    if (!state) return;
    setState(prev => {
      if (!prev) return prev;
      const nextA = { ...prev.playerA.field };
      const nextB = { ...prev.playerB.field };
      const changed = stripPakkiDebuffUnderImmunityOnClonedFields(nextA, nextB);
      if (!changed) return prev;
      return {
        ...prev,
        playerA: { ...prev.playerA, field: nextA },
        playerB: { ...prev.playerB, field: nextB },
      };
    });
  }, [state]);

  const baekseuExecuteFieldsSig = useMemo(() => {
    if (!state) return "";
    const u = (c: FieldCard | null, facing: FieldCard | null) =>
      c
        ? `${c.currentHp};${Number(c.hp) || 0};${c.baekseuInvulnerableEndTurnTicksRemaining ?? 0};${c.baekseuLastStandUsed ? 1 : 0};${isBaekseuPassivesPausedByConfusion(c, facing) ? 1 : 0}`
        : "x";
    const pack = (
      f: (typeof state)["playerA"]["field"],
      opp: (typeof state)["playerA"]["field"]
    ) => [u(f.is, opp.is), u(f.m, opp.m), u(f.os, opp.os)].join("/");
    return `${pack(state.playerA.field, state.playerB.field)}|${pack(state.playerB.field, state.playerA.field)}`;
  }, [state?.playerA.field, state?.playerB.field]);

  const gameStatsDisplayUnitRows = useMemo((): UnitCombatStatsRow[] => {
    if (!state) return [];
    const withIdx = state.unitStatsOrder
      .map((id, idx) => {
        const row = state.unitCombatStats[id];
        if (!row) return null;
        return { row, idx };
      })
      .filter((x): x is { row: UnitCombatStatsRow; idx: number } => x !== null);

    const useCustomSort = gameStatsUnitSortKey !== "default";
    const cmpIdx = (x: { row: UnitCombatStatsRow; idx: number }, y: { row: UnitCombatStatsRow; idx: number }) =>
      x.idx - y.idx;
    const cmpStat = (x: { row: UnitCombatStatsRow; idx: number }, y: { row: UnitCombatStatsRow; idx: number }) =>
      compareUnitCombatStatsDesc(x.row, y.row, gameStatsUnitSortKey as Exclude<GameStatsUnitSortKey, "default">);

    if (gameStatsTeamSplit) {
      const aSide = withIdx.filter(x => x.row.player === "A");
      const bSide = withIdx.filter(x => x.row.player === "B");
      const sortBlock = (block: typeof aSide) =>
        [...block].sort(useCustomSort ? cmpStat : cmpIdx);
      return [...sortBlock(aSide), ...sortBlock(bSide)].map(x => x.row);
    }

    const merged = [...withIdx].sort(useCustomSort ? cmpStat : cmpIdx);
    return merged.map(x => x.row);
  }, [state, gameStatsUnitSortKey, gameStatsTeamSplit]);

  /** 이름 제외 수치 열 — 동점이면 모두 강조, 전원 0이면 강조 없음 */
  const gameStatsNumericColumnMax = useMemo(() => {
    const rows = gameStatsDisplayUnitRows;
    if (rows.length === 0) return null;
    const f = formatGameStatInteger;
    return {
      damageDealt: Math.max(...rows.map(r => f(r.damageDealt))),
      kills: Math.max(...rows.map(r => r.kills)),
      damageTaken: Math.max(...rows.map(r => f(r.damageTaken))),
      selfHeal: Math.max(...rows.map(r => f(r.selfHeal))),
      allyHealGiven: Math.max(...rows.map(r => f(r.allyHealGiven))),
      damageMitigated: Math.max(...rows.map(r => f(r.damageMitigated))),
    };
  }, [gameStatsDisplayUnitRows]);

  useEffect(() => {
    if (!state || winner || isInitializing) return;
    setState(prev => {
      if (!prev) return prev;
      const r = applyBaekseuInvulnThresholdExecutePass(prev.playerA, prev.playerB, prev.globalTurnCount);
      if (r.rewindAdds.length === 0) return prev;
      window.setTimeout(() => {
        r.flashSlotKeys.forEach(k => {
          triggerCardFlash(k, "kalliBuffBan");
          pushInfoFloat(k, "처형", INFO_FLOAT_MS, "executeGray");
        });
        r.baekseuSourceFlashSlotKeys.forEach(k => triggerCardFlash(k, "kalliBuffBan"));
      }, 0);
      return {
        ...prev,
        playerA: r.playerA,
        playerB: r.playerB,
        rewindCards: [...prev.rewindCards, ...r.rewindAdds],
      };
    });
  }, [baekseuExecuteFieldsSig, winner, isInitializing]);

  const pushCombatPopup = (
    slotKey: string,
    kind: "damage" | "heal",
    amount: number,
    damageExtras?: CombatDamagePopupExtras
  ) => {
    if (amount <= 0) return;
    const id = ++combatPopupIdRef.current;
    const entry: CombatPopupEntry =
      kind === "damage"
        ? {
            id,
            kind,
            amount,
            ...(damageExtras?.dkFullGaugeNavyDamageText ? { dkFullGaugeNavyDamageText: true as const } : {}),
            ...(damageExtras?.maxellandFullGaugeVictimDamageOutline
              ? { maxellandFullGaugeVictimDamageOutline: true as const }
              : {}),
            ...(damageExtras?.kalliVsDefensePureDamageText
              ? { kalliVsDefensePureDamageText: true as const }
              : {}),
            ...(damageExtras?.startingWraithTrueStrikeDamageText
              ? { startingWraithTrueStrikeDamageText: true as const }
              : {}),
          }
        : { id, kind, amount };
    setCombatPopups(prev => ({
      ...prev,
      [slotKey]: [...(prev[slotKey] ?? []), entry],
    }));
    window.setTimeout(() => {
      setCombatPopups(prev => {
        const list = prev[slotKey];
        if (!list) return prev;
        const next = list.filter(e => e.id !== id);
        if (next.length === 0) {
          const { [slotKey]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [slotKey]: next };
      });
    }, COMBAT_POPUP_MS);
  };

  /** 반짓고리 부여 대상 카드 위에 핑크 2줄 플로팅 (데미지 숫자와 동일 애니메이션) */
  const pushBanjitgoriBuffFloat = (slotKey: string) => {
    const id = ++combatPopupIdRef.current;
    const entry: CombatPopupEntry = { id, kind: "banjitgoriBuff", lines: BANJITGORI_BUFF_FLOAT_LINES };
    setCombatPopups(prev => ({
      ...prev,
      [slotKey]: [...(prev[slotKey] ?? []), entry],
    }));
    window.setTimeout(() => {
      setCombatPopups(prev => {
        const list = prev[slotKey];
        if (!list) return prev;
        const next = list.filter(e => e.id !== id);
        if (next.length === 0) {
          const { [slotKey]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [slotKey]: next };
      });
    }, BANJITGORI_BUFF_FLOAT_MS);
  };

  const pushLimeBubbleBuffFloat = (slotKey: string) => {
    const id = ++combatPopupIdRef.current;
    const entry: CombatPopupEntry = { id, kind: "limeBubbleBuff", lines: LIME_BUBBLE_BUFF_FLOAT_LINES };
    setCombatPopups(prev => ({
      ...prev,
      [slotKey]: [...(prev[slotKey] ?? []), entry],
    }));
    window.setTimeout(() => {
      setCombatPopups(prev => {
        const list = prev[slotKey];
        if (!list) return prev;
        const next = list.filter(e => e.id !== id);
        if (next.length === 0) {
          const { [slotKey]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [slotKey]: next };
      });
    }, LIME_BUBBLE_BUFF_FLOAT_MS);
  };

  /** 철기병 능력 발동 이펙트와 함께 카드 위 회색 2줄 플로팅 */
  const pushCheolgibyeongPassiveBuffFloat = (slotKey: string) => {
    const id = ++combatPopupIdRef.current;
    const entry: CombatPopupEntry = {
      id,
      kind: "cheolgibyeongPassiveFloat",
      lines: CHEOLGIBYEONG_PASSIVE_FLOAT_LINES,
    };
    setCombatPopups(prev => ({
      ...prev,
      [slotKey]: [...(prev[slotKey] ?? []), entry],
    }));
    window.setTimeout(() => {
      setCombatPopups(prev => {
        const list = prev[slotKey];
        if (!list) return prev;
        const next = list.filter(e => e.id !== id);
        if (next.length === 0) {
          const { [slotKey]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [slotKey]: next };
      });
    }, CHEOLGIBYEONG_PASSIVE_FLOAT_MS);
  };

  /** 렴초 능력 발동 이펙트와 함께 카드 위 베이지 1줄 플로팅(지속: 철기병 패시브와 동일) */
  const pushRyeomchoPassiveBuffFloat = (slotKey: string) => {
    const id = ++combatPopupIdRef.current;
    const entry: CombatPopupEntry = {
      id,
      kind: "ryeomchoPassiveFloat",
      lines: RYEOMCHO_PASSIVE_FLOAT_LINES,
    };
    setCombatPopups(prev => ({
      ...prev,
      [slotKey]: [...(prev[slotKey] ?? []), entry],
    }));
    window.setTimeout(() => {
      setCombatPopups(prev => {
        const list = prev[slotKey];
        if (!list) return prev;
        const next = list.filter(e => e.id !== id);
        if (next.length === 0) {
          const { [slotKey]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [slotKey]: next };
      });
    }, CHEOLGIBYEONG_PASSIVE_FLOAT_MS);
  };

  /** 아이언 키위 배치 — 철기병 패시브와 동형(회색·2200ms·damageFloat) */
  const pushIronKiwiPassiveBuffFloat = (slotKey: string) => {
    const id = ++combatPopupIdRef.current;
    const entry: CombatPopupEntry = {
      id,
      kind: "ironKiwiPassiveFloat",
      lines: IRON_KIWI_PASSIVE_FLOAT_LINES,
    };
    setCombatPopups(prev => ({
      ...prev,
      [slotKey]: [...(prev[slotKey] ?? []), entry],
    }));
    window.setTimeout(() => {
      setCombatPopups(prev => {
        const list = prev[slotKey];
        if (!list) return prev;
        const next = list.filter(e => e.id !== id);
        if (next.length === 0) {
          const { [slotKey]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [slotKey]: next };
      });
    }, CHEOLGIBYEONG_PASSIVE_FLOAT_MS);
  };

  /** 시스템 메시지: 동일 슬롯·동일 문구가 겹치면 기존 infoFloat를 제거한 뒤 새로 연다. */
  const pushInfoFloat = (
    slotKey: string,
    text: string,
    durationMs: number,
    tone?: "default" | "executeGray" | "skyBlue" | "magicImmunityGreen"
  ) => {
    const id = ++combatPopupIdRef.current;
    const resolvedTone =
      tone === "executeGray"
        ? ("executeGray" as const)
        : tone === "skyBlue"
          ? ("skyBlue" as const)
          : tone === "magicImmunityGreen"
            ? ("magicImmunityGreen" as const)
            : undefined;
    const entry: CombatPopupEntry =
      resolvedTone != null
        ? { id, kind: "infoFloat", text, durationMs, tone: resolvedTone }
        : { id, kind: "infoFloat", text, durationMs };
    setCombatPopups(prev => {
      const list = prev[slotKey] ?? [];
      const withoutSameText = list.filter(
        e =>
          !(
            e.kind === "infoFloat" &&
            e.text === text &&
            e.tone === resolvedTone
          )
      );
      return {
        ...prev,
        [slotKey]: [...withoutSameText, entry],
      };
    });
    window.setTimeout(() => {
      setCombatPopups(prev => {
        const list = prev[slotKey];
        if (!list) return prev;
        const next = list.filter(e => e.id !== id);
        if (next.length === 0) {
          const { [slotKey]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [slotKey]: next };
      });
    }, durationMs);
  };

  const playMuhyohwaCounterResolveSequence = useCallback(() => {
    runMuhyohwaCounterCommit();
    setSpellUsageMuhyohwaCounterResolve(true);
    triggerCardFlash(SPELL_USAGE_CENTER_KEY, "muhyohwaCounterResolve");
    pushInfoFloat(SPELL_USAGE_CENTER_KEY, "[무효화]", INFO_FLOAT_MS);
    if (spellUsageMuhyohwaResolveTimerRef.current != null) {
      window.clearTimeout(spellUsageMuhyohwaResolveTimerRef.current);
    }
    spellUsageMuhyohwaResolveTimerRef.current = window.setTimeout(() => {
      spellUsageMuhyohwaResolveTimerRef.current = null;
      spellUsagePendingRef.current = null;
      spellUsageMotionActiveRef.current = false;
      applySpellUsagePending(null);
      clearSpellUsageVisualState();
    }, MUHYOHWA_COUNTER_RESOLVE_MS);
  }, [runMuhyohwaCounterCommit, applySpellUsagePending, clearSpellUsageVisualState]);
  playMuhyohwaCounterResolveSequenceRef.current = playMuhyohwaCounterResolveSequence;

  /** 엘 윙 [마법 면역] — 단일 대상 공격 스펠(언덕!/번개/하이퍼 빔/소멸) 적용 시도 시 녹색 이펙트 + 플로팅 */
  const showElWingMagicImmunityBlockOnUnit = (slotKey: string) => {
    triggerCardFlash(slotKey, "elWingMagicImmunityBlock");
    pushInfoFloat(slotKey, EL_WING_MAGIC_IMMUNITY_BADGE, INFO_FLOAT_MS, "magicImmunityGreen");
  };

  const dismissElWingSinseokUi = useCallback(() => {
    if (elWingSinseokTimerRef.current != null) {
      window.clearTimeout(elWingSinseokTimerRef.current);
      elWingSinseokTimerRef.current = null;
    }
    setPendingElWingSinseokDefense(null);
    setElWingSinseokSecondsLeft(0);
    setElWingSinseokTimeRatio(0);
  }, []);

  const clearElWingSinseokPending = useCallback(() => {
    dismissElWingSinseokUi();
    elWingSinseokResumeRef.current = null;
    elWingSinseokBypassRef.current = false;
    elWingSinseokTimeoutMetaRef.current = null;
  }, [dismissElWingSinseokUi]);

  /** 5초 경과 — UI만 닫고 bypass로 보류 중이던 기본 공격 피해를 적용 */
  const finishElWingSinseokTimeout = useCallback(() => {
    const fn = elWingSinseokResumeRef.current;
    const meta = elWingSinseokTimeoutMetaRef.current;
    elWingSinseokBypassRef.current = true;
    dismissElWingSinseokUi();
    elWingSinseokResumeRef.current = null;
    elWingSinseokTimeoutMetaRef.current = null;
    fn?.();
    elWingSinseokBypassRef.current = false;
    if (meta?.hitKind === "primary" && !meta.wraithChainFollowUp) {
      setAttackingSlot(null);
      setAttackOptionOverride(null);
    }
  }, [dismissElWingSinseokUi]);

  const commitElWingSinseokDodge = useCallback(() => {
    const pend = pendingElWingSinseokDefense;
    if (!pend || !state) return;
    const {
      defenderPlayer,
      defenderSlot,
      attackerPlayer,
      attackerSlot,
      wraithChainFollowUp,
    } = pend;
    const defenderKey = defenderPlayer === "A" ? "playerA" : "playerB";
    const attackerKey = attackerPlayer === "A" ? "playerA" : "playerB";
    const defenderSlotKey = `${defenderPlayer}-${defenderSlot}`;

    setState(prev => {
      if (!prev) return prev;
      const defSide = { ...prev[defenderKey], field: { ...prev[defenderKey].field } };
      const atkSide = { ...prev[attackerKey], field: { ...prev[attackerKey].field } };
      const wing = defSide.field[defenderSlot];
      const attacker = atkSide.field[attackerSlot];
      if (!wing || wing.name !== EL_WING_ID || !attacker) return prev;
      const nextGauge = clampElWingSinseokGauge((wing.elWingSinseokGauge ?? 0) - 1);
      defSide.field[defenderSlot] = { ...wing, elWingSinseokGauge: nextGauge };
      atkSide.field[attackerSlot] = { ...attacker, hasAttacked: true };
      if (pend.hitKind === "primary" && !wraithChainFollowUp) {
        atkSide.attacksThisTurn = (atkSide.attacksThisTurn || 0) + 1;
      }
      return { ...prev, [defenderKey]: defSide, [attackerKey]: atkSide };
    });

    triggerCardFlash(defenderSlotKey, "elWingMagicImmunityBlock");
    pushInfoFloat(defenderSlotKey, EL_WING_SINSEOK_BADGE, INFO_FLOAT_MS, "magicImmunityGreen");
    clearElWingSinseokPending();
    if (pend.hitKind === "primary") {
      setAttackingSlot(null);
      setAttackOptionOverride(null);
      applyStartingWraithChainPending(null);
    }
  }, [
    pendingElWingSinseokDefense,
    state,
    clearElWingSinseokPending,
    applyStartingWraithChainPending,
  ]);

  useEffect(() => {
    if (!pendingElWingSinseokDefense) {
      setElWingSinseokTimeRatio(0);
      return;
    }
    const { deadlineAt } = pendingElWingSinseokDefense;
    const tick = () => {
      const remainingMs = Math.max(0, deadlineAt - Date.now());
      setElWingSinseokTimeRatio(remainingMs / EL_WING_SINSEOK_PROMPT_MS);
      setElWingSinseokSecondsLeft(Math.max(0, Math.ceil(remainingMs / 1000)));
    };
    tick();
    const id = window.setInterval(tick, 50);
    return () => window.clearInterval(id);
  }, [pendingElWingSinseokDefense]);

  /** 보글보글 스테이션 — 유닛 타입 선택 5초 카운트다운 게이지 시각화 */
  const [bubbleStationTypeSelectSecondsLeft, setBubbleStationTypeSelectSecondsLeft] =
    useState(0);
  const [bubbleStationTypeSelectTimeRatio, setBubbleStationTypeSelectTimeRatio] =
    useState(0);
  const bubbleStationRestoreOnMountDoneRef = useRef(false);

  const commitBubbleStationUnitType = useCallback((typeId: BubbleStationUnitTypeId) => {
    setState(prev => {
      if (!prev?.bubbleStationPending) return prev;
      if (prev.bubbleStationPending.phase !== "typeSelect") return prev;
      return applyBubbleStationCommitTypeSelection(prev, typeId);
    });
  }, []);

  const commitRandomBubbleStationUnitType = useCallback(() => {
    const idx = Math.floor(Math.random() * BUBBLE_STATION_UNIT_TYPES.length);
    const pick = BUBBLE_STATION_UNIT_TYPES[idx] ?? BUBBLE_STATION_UNIT_TYPES[0]!;
    commitBubbleStationUnitType(pick.id);
  }, [commitBubbleStationUnitType]);

  /** discardWipe 단계 — 양측 패 흰색 wipe 0.7초 후 자동으로 typeSelect로 전이(hand → rewindCards) */
  useEffect(() => {
    const p = state?.bubbleStationPending;
    if (!p || p.phase !== "discardWipe") return;
    const endAt = p.discardWipeEndAt ?? Date.now() + BUBBLE_STATION_DISCARD_WIPE_MS;
    const remaining = Math.max(0, endAt - Date.now());
    const tid = window.setTimeout(() => {
      setState(prev =>
        prev?.bubbleStationPending && prev.bubbleStationPending.phase === "discardWipe"
          ? applyBubbleStationDiscardWipeEnd(prev)
          : prev
      );
    }, remaining);
    return () => window.clearTimeout(tid);
  }, [state?.bubbleStationPending]);

  /** typeSelect 단계 — spellUsage 연출이 끝난 직후 deadline 설정(연출이 길어 5초가 시작 전에 흐르지 않도록) */
  useEffect(() => {
    const p = state?.bubbleStationPending;
    if (!p || p.phase !== "typeSelect") return;
    if (p.typeSelectDeadlineAt != null && p.typeSelectDeadlineAt > 0) return;
    if (state?.spellUsagePending) return;
    if (spellUsageReveal || spellUsageFly) return;
    setState(prev =>
      prev?.bubbleStationPending && prev.bubbleStationPending.phase === "typeSelect"
        ? applyBubbleStationTypeSelectDeadline(
            prev,
            Date.now() + BUBBLE_STATION_TYPE_SELECT_MS
          )
        : prev
    );
  }, [state?.bubbleStationPending, state?.spellUsagePending, spellUsageReveal, spellUsageFly]);

  /** 보글보글 종료 감지 — pending이 truthy → null로 전이 시 시전자 스펠 칸에 카키 펄스 */
  const bubbleStationLastCasterRef = useRef<"A" | "B" | null>(null);
  useEffect(() => {
    const p = state?.bubbleStationPending ?? null;
    if (p) {
      bubbleStationLastCasterRef.current = p.casterPlayer;
      return;
    }
    const lastCaster = bubbleStationLastCasterRef.current;
    if (!lastCaster) return;
    bubbleStationLastCasterRef.current = null;
    triggerCardFlash(`${lastCaster}-spell`, "bubbleStationSpellTrigger");
  }, [state?.bubbleStationPending]);

  /** typeSelect 단계 — 5초 카운트다운 + 종료 시 자동 랜덤 선택 */
  useEffect(() => {
    const p = state?.bubbleStationPending;
    if (!p || p.phase !== "typeSelect") {
      setBubbleStationTypeSelectTimeRatio(0);
      setBubbleStationTypeSelectSecondsLeft(0);
      return;
    }
    if (p.typeSelectDeadlineAt == null || p.typeSelectDeadlineAt <= 0) {
      setBubbleStationTypeSelectTimeRatio(1);
      setBubbleStationTypeSelectSecondsLeft(
        Math.ceil(BUBBLE_STATION_TYPE_SELECT_MS / 1000)
      );
      return;
    }
    const deadline = p.typeSelectDeadlineAt;
    const tick = () => {
      const remainingMs = Math.max(0, deadline - Date.now());
      setBubbleStationTypeSelectTimeRatio(
        remainingMs / BUBBLE_STATION_TYPE_SELECT_MS
      );
      setBubbleStationTypeSelectSecondsLeft(Math.max(0, Math.ceil(remainingMs / 1000)));
    };
    tick();
    const tickId = window.setInterval(tick, 50);
    const remaining = Math.max(0, deadline - Date.now());
    const timeoutId = window.setTimeout(() => {
      commitRandomBubbleStationUnitType();
    }, remaining);
    return () => {
      window.clearInterval(tickId);
      window.clearTimeout(timeoutId);
    };
  }, [state?.bubbleStationPending, commitRandomBubbleStationUnitType]);

  /** selectionFlash 단계 — 1.5초 후 자동으로 drawing 단계로 전이(deck에서 N장 enqueue) */
  useEffect(() => {
    const p = state?.bubbleStationPending;
    if (!p || p.phase !== "selectionFlash") return;
    const endAt = p.selectionFlashEndAt ?? Date.now() + BUBBLE_STATION_SELECTION_FLASH_MS;
    const remaining = Math.max(0, endAt - Date.now());
    const tid = window.setTimeout(() => {
      setState(prev =>
        prev?.bubbleStationPending && prev.bubbleStationPending.phase === "selectionFlash"
          ? applyBubbleStationFlashEnd(prev, c =>
              markPpSimHandNewGlow(c, `pp-hng-${++ppSimHandGlowSeqRef.current}`)
            )
          : prev
      );
    }, remaining);
    return () => window.clearTimeout(tid);
  }, [state?.bubbleStationPending]);

  /** drawing 단계 — 새로고침 직후 reveal이 비어있는데 queue에 카드가 있으면 자동 prime, 모두 합류했으면 finish */
  useEffect(() => {
    if (bubbleStationRestoreOnMountDoneRef.current) return;
    const snap = state;
    const p = snap?.bubbleStationPending;
    if (!snap || isInitializing || !p) return;
    bubbleStationRestoreOnMountDoneRef.current = true;
    if (p.phase !== "drawing") return;
    if (p.arrivedDrawCount >= p.enqueuedDrawCount) {
      setState(prev =>
        prev?.bubbleStationPending ? finishBubbleStationSequence(prev) : prev
      );
      return;
    }
    if (!snap.simpanPeekReveal && (snap.simpanPeekQueue?.length ?? 0) > 0) {
      setState(prev =>
        prev && !prev.simpanPeekReveal && (prev.simpanPeekQueue?.length ?? 0) > 0
          ? primeSimpanPeekReveal(prev)
          : prev
      );
    }
  }, [state, isInitializing]);

  /** 로누 패시브 — 액티브 스펠 차단 시 로누 슬롯 하늘색 능력 발동 + 시스템 플로팅 */
  const blockRonuActiveSpellHandPlay = (
    snap: SimulationState,
    card: CardRow,
    caster: "A" | "B",
    targetPlayer: "A" | "B",
    slot: "is" | "m" | "os" | "spell"
  ): boolean => {
    if (
      !isRonuBlockingCasterActiveSpell(
        caster,
        card,
        snap.playerA.field,
        snap.playerB.field
      )
    ) {
      return false;
    }
    pushInfoFloat(`${targetPlayer}-${slot}`, BATTLE_MSG.ronu.cannotUseActiveSpells, INFO_FLOAT_MS);
    forEachOpponentRonuLivingSlotKey(caster, snap.playerA.field, snap.playerB.field, key => {
      triggerCardFlash(key, "ronuPassiveSpellBlock");
    });
    return true;
  };

  const showDamageNumber = (slotKey: string, amount: number, damageExtras?: CombatDamagePopupExtras) => {
    pushCombatPopup(slotKey, "damage", amount, damageExtras);
    triggerCardFlash(slotKey, "damage");
  };

  /** 패키 처치: 붉은 피격 섬광 없음 — 필립 소환과 동형 레이어·타이밍의 능력 발동 이펙트(패키 색) + 피해 숫자만 */
  const showPakkiSlainDamageOnTarget = (
    slotKey: string,
    amount: number,
    damageExtras?: CombatDamagePopupExtras
  ) => {
    pushCombatPopup(slotKey, "damage", amount, damageExtras);
    triggerCardFlash(slotKey, "pakkiDeathCurse");
  };

  /** 필립 기본 공격(철기병과 동일 규격): 빨간 피격 + 중앙 주황·노랑 원, 착지 직후(≈0.03s) 파동 1회 */
  const showPhilipBasicHitDamage = (slotKey: string, amount: number, damageExtras?: CombatDamagePopupExtras) => {
    pushCombatPopup(slotKey, "damage", amount, damageExtras);
    triggerCardFlash(slotKey, "philipBasicHit");
  };

  /** 철기병 기본 공격 적중: 빨간 피격 + 중앙 회색 원, 착지 직후(≈0.03s) 파동 1회 */
  const showCheolgibyeongBasicHitDamage = (slotKey: string, amount: number, damageExtras?: CombatDamagePopupExtras) => {
    pushCombatPopup(slotKey, "damage", amount, damageExtras);
    triggerCardFlash(slotKey, "cheolgibyeongBasicHit");
  };

  /** 고스톤이 적을 처치: 능력 발동 이펙트(보라·인디고 사각 명멸) + 피해 숫자 */
  const showGhostoneKillDamageOnTarget = (slotKey: string, amount: number, damageExtras?: CombatDamagePopupExtras) => {
    pushCombatPopup(slotKey, "damage", amount, damageExtras);
    triggerCardFlash(slotKey, "ghostoneKill");
  };

  /** 시작의 망령 트루 스트라이크 기본 공격: 어두운 회색 피해 숫자 + 붉은 피격 섬광 */
  const showStartingWraithTrueStrikeDamageOnTarget = (
    slotKey: string,
    amount: number,
    damageExtras?: CombatDamagePopupExtras
  ) => {
    pushCombatPopup(slotKey, "damage", amount, damageExtras);
    triggerCardFlash(slotKey, "damage");
  };

  /** 시작의 망령 처치 연쇄: 고스톤과 동형 갈색 능력 발동 + 피해 숫자 */
  const showStartingWraithChainKillOnTarget = (
    slotKey: string,
    amount: number,
    damageExtras?: CombatDamagePopupExtras
  ) => {
    pushCombatPopup(slotKey, "damage", amount, damageExtras);
    triggerCardFlash(slotKey, "startingWraithChainKill");
  };

  const triggerStartingWraithChainKillFlashOnAttacker = (attackerSlotKey: string) => {
    triggerCardFlash(attackerSlotKey, "startingWraithChainKill");
  };

  /** 스펠 No.43 개미지옥 — 적용 연출(메테오 동형 주황빛, 피해 숫자 없음) */
  const showAntHellSpellHitOnTarget = (slotKey: string) => {
    triggerCardFlash(slotKey, "meteoSpellHit");
  };

  /** 스펠 No.21 메테오 — 적중: 고스톤과 동형 주황빛 능력 발동 이펙트 + 피해 숫자 */
  const showMeteoSpellHitOnTarget = (
    slotKey: string,
    amount: number,
    damageExtras?: CombatDamagePopupExtras
  ) => {
    pushCombatPopup(slotKey, "damage", amount, damageExtras);
    triggerCardFlash(slotKey, "meteoSpellHit");
  };

  /** 스펠 No.34 하이퍼 빔 — 적중: 고스톤과 동형 노란색 능력 발동 이펙트 + 피해 숫자 */
  const showHyperBeamSpellHitOnTarget = (
    slotKey: string,
    amount: number,
    damageExtras?: CombatDamagePopupExtras
  ) => {
    pushCombatPopup(slotKey, "damage", amount, damageExtras);
    triggerCardFlash(slotKey, "hyperBeamSpellHit");
  };

  const resolveSuperTeslaCounterFromSave = (
    snap: SimulationState,
    save: SpellUsagePendingSave
  ): NonNullable<SpellUsagePending["superTeslaCounter"]> | undefined => {
    const sc = save.superTeslaCounter;
    if (!sc) return undefined;
    const counterField = sc.counterPlayer === "A" ? snap.playerA.field : snap.playerB.field;
    const tokens = sc.counterPlayer === "A" ? snap.playerA.tokens : snap.playerB.tokens;
    const stack = normalizeSpellStack(counterField);
    const at = stack[sc.teslaStackIndex];
    if (!at || !isSuperTeslaSpellCard(at)) return undefined;
    if (tokens < superTeslaActivationTokenCost(at)) return undefined;
    return {
      counterPlayer: sc.counterPlayer,
      teslaCard: at,
      teslaStackIndex: sc.teslaStackIndex,
    };
  };

  const buildSpellUsageHandlersFromSave = useCallback(
    (save: SpellUsagePendingSave): SpellUsagePending | null => {
      const previewCard = save.previewCard;
      const casterPlayer = save.casterPlayer;
      const targetPlayer = save.targetPlayer;
      const unitSlot = save.unitSlot;
      const isPlayerA = casterPlayer === "A";
      const noopPreApply = (prev: SimulationState) => prev;

      const basePending: Omit<SpellUsagePending, "preApply" | "commit" | "afterCommitVfx"> = {
        casterPlayer,
        previewCard,
        mode: save.mode,
        targetPlayer,
        unitSlot,
        centerShowsCardBack: save.centerShowsCardBack,
        flyToUnitAfterReveal: save.flyToUnitAfterReveal,
        flyToSpellSlotAfterReveal: save.flyToSpellSlotAfterReveal,
      };

      if (save.mode === "placeSpellSlot" && isMeteoSpellCard(previewCard)) {
        const enemyPlayer = casterPlayer === "A" ? "B" : "A";
        const meteoVfxHits: { slotKey: string; hpLoss: number }[] = [];
        const meteoElWingImmunitySlotKeys: string[] = [];
        return {
          ...basePending,
          preApply: noopPreApply,
          commit: prev => {
            meteoVfxHits.length = 0;
            meteoElWingImmunitySlotKeys.length = 0;
            const newPlayerA = { ...prev.playerA, field: { ...prev.playerA.field } };
            const newPlayerB = { ...prev.playerB, field: { ...prev.playerB.field } };
            const enemySide = enemyPlayer === "A" ? newPlayerA : newPlayerB;
            let rewindCards = [...prev.rewindCards, previewCard];
            let unitCombatStats = prev.unitCombatStats;
            let unitStatsOrder = prev.unitStatsOrder;

            for (const slotName of ["is", "m", "os"] as const) {
              const unit = enemySide.field[slotName];
              if (!unit || unit.currentHp <= 0) continue;
              if (
                isElWingBlockingEnemyAttackSpell(
                  unit,
                  enemyPlayer,
                  slotName,
                  newPlayerA.field,
                  newPlayerB.field
                )
              ) {
                meteoElWingImmunitySlotKeys.push(`${enemyPlayer}-${slotName}`);
                enemySide.field[slotName] = grantElWingSinseokGaugeFromMeteoSplash(unit);
                continue;
              }

              const resolved = applyMeteoDamageToEnemyUnit({
                target: unit,
                targetPlayer: enemyPlayer,
                targetSlot: slotName,
                playerAField: newPlayerA.field,
                playerBField: newPlayerB.field,
              });

              const baseTarget =
                Object.keys(resolved.baekseuPatch).length > 0
                  ? stripBaekseuHarmfulEffectsForInvuln(unit)
                  : unit;
              let updatedTarget: FieldCard = {
                ...baseTarget,
                ...resolved.baekseuPatch,
                ...resolved.barrierPatch,
                currentHp: resolved.isDestroyed ? 0 : resolved.newHp,
              };

              /**
               * 애벌레킹(W) — 메테오 광역은 host와 별도로 W에 독립 직격(50% 공유 아님).
               */
              let riderRewindEntry: CardRow | null = null;
              if (hasAebeolaekingRider(updatedTarget)) {
                const wMeteo = applyAebeolaekingAoeDamageToRiderOnly(updatedTarget, METEO_AOE_DAMAGE, {
                  hostOwner: enemyPlayer,
                  playerAField: newPlayerA.field,
                  playerBField: newPlayerB.field,
                });
                updatedTarget = wMeteo.updatedHost;
                if (wMeteo.deadRider) {
                  riderRewindEntry = stripAebeolaekingRiderMeta(wMeteo.deadRider);
                }
              }

              if (resolved.isDestroyed) {
                enemySide.field[slotName] = null;
                cleanupSimulationUnitDeath(
                  updatedTarget,
                  { field: newPlayerA.field },
                  { field: newPlayerB.field },
                  prev.globalTurnCount
                );
                rewindCards = appendDeadHostWithRiderToRewindCards(rewindCards, updatedTarget);
                if (riderRewindEntry && !hasAebeolaekingRider(updatedTarget)) {
                  rewindCards.push(riderRewindEntry);
                }
                const sid = unit.statsInstanceId;
                if (sid) {
                  const { [sid]: _removed, ...restStats } = unitCombatStats;
                  unitCombatStats = restStats;
                  unitStatsOrder = unitStatsOrder.filter(x => x !== sid);
                }
              } else {
                enemySide.field[slotName] = updatedTarget;
                if (riderRewindEntry) rewindCards = [...rewindCards, riderRewindEntry];
              }

              applyPostStrikeAllyHealsIncludingW({
                targetPlayer: enemyPlayer,
                targetSlot: slotName,
                playerAField: newPlayerA.field,
                playerBField: newPlayerB.field,
                morningMoodDeathHeal: resolved.morningMoodDeathHeal,
                startingTreeAllyHeal: resolved.startingTreeAllyHeal,
              });

              if (resolved.hpLoss > 0) {
                meteoVfxHits.push({ slotKey: `${enemyPlayer}-${slotName}`, hpLoss: resolved.hpLoss });
              }
            }

            return finalizeSpellWithSimpan({
              ...prev,
              unitCombatStats,
              unitStatsOrder,
              playerA: newPlayerA,
              playerB: newPlayerB,
              rewindCards,
            });
          },
          afterCommitVfx: () => {
            for (const slotKey of meteoElWingImmunitySlotKeys) {
              showElWingMagicImmunityBlockOnUnit(slotKey);
            }
            const meteoVfxBySlot = new Map<string, number>();
            for (const hit of meteoVfxHits) meteoVfxBySlot.set(hit.slotKey, hit.hpLoss);
            for (const [slotKey, hpLoss] of meteoVfxBySlot) {
              showMeteoSpellHitOnTarget(slotKey, hpLoss);
            }
          },
        };
      }

      if (save.mode === "placeSpellSlot" && isBefpkkiriSpellCard(previewCard) && targetPlayer) {
        const tp = targetPlayer;
        return {
          ...basePending,
          preApply: noopPreApply,
          commit: prev =>
            applyBefpkkiriSpellCommit(prev, casterPlayer, previewCard, c =>
              markPpSimHandNewGlow(c, `pp-hng-${++ppSimHandGlowSeqRef.current}`)
            ),
          afterCommitVfx: () => {
            triggerCardFlash(`${tp}-spell`, "befpkkiriSpellTrigger");
          },
        };
      }

      if (save.mode === "placeSpellSlot" && isBubbleStationSpellCard(previewCard) && save.fieldCard) {
        const fieldCard = save.fieldCard;
        const sourcePlayer = casterPlayer;
        return {
          ...basePending,
          preApply: noopPreApply,
          commit: prev => applyBubbleStationInitialCommit(prev, sourcePlayer, fieldCard),
          afterCommitVfx: () => {
            triggerCardFlash(`${sourcePlayer}-spell`, "bubbleStationSpellTrigger");
          },
        };
      }

      if (save.mode === "placeSpellSlot" && isWitchTarotSpellCard(previewCard) && save.fieldCard) {
        const fieldCard = save.fieldCard;
        const sourcePlayer = casterPlayer;
        return {
          ...basePending,
          preApply: noopPreApply,
          commit: prev => {
            const tf = isPlayerA ? prev.playerA.field : prev.playerB.field;
            const stackBefore = normalizeSpellStack(tf);
            const updatedField: PlayerState["field"] = {
              ...tf,
              spellStack: appendSpellToStack(stackBefore, fieldCard),
            };
            const key = isPlayerA ? "playerA" : "playerB";
            const ps = isPlayerA ? prev.playerA : prev.playerB;
            const nextSpellLog = [
              ...prev.spellDeployLog,
              {
                statsInstanceId: fieldCard.statsInstanceId!,
                name: fieldCard.name,
                player: sourcePlayer,
                summonedTurn: fieldCard.summonedTurn,
              },
            ];
            return patchWitchTarotPending(
              {
                ...prev,
                spellDeployLog: nextSpellLog,
                [key]: { ...ps, field: updatedField },
              },
              {
                casterPlayer: sourcePlayer,
                coinHeads: null,
                stepIndex: 0,
                awaitingDiscardPlayer: null,
              }
            );
          },
          afterCommitVfx: () => {
            triggerCardFlash(`${sourcePlayer}-spell`, "witchTarotSpellPulse");
            witchTarotSequenceActiveRef.current = true;
            setWitchTarotFlowActive(true);
            if (witchTarotCoinStartScheduledRef.current) return;
            witchTarotCoinStartScheduledRef.current = true;
            window.setTimeout(() => {
              witchTarotCoinStartScheduledRef.current = false;
              startWitchTarotCoinSequence(sourcePlayer);
            }, WITCH_TAROT_COIN_DELAY_MS);
          },
        };
      }

      if (save.mode === "placeSpellSlot" && save.fieldCard && targetPlayer) {
        const fieldCard = save.fieldCard;
        const tp = targetPlayer;
        const hyuPlaceVfxBag: { perSlot: HyugesojauiAnsikHealSlotResult[] } = { perSlot: [] };
        const antHellPlaceVfxBag: { applied: string[]; elWing: string[] } = {
          applied: [],
          elWing: [],
        };
        return {
          ...basePending,
          preApply: noopPreApply,
          commit: prev => {
            hyuPlaceVfxBag.perSlot = [];
            antHellPlaceVfxBag.applied = [];
            antHellPlaceVfxBag.elWing = [];
            const tf = isPlayerA ? prev.playerA.field : prev.playerB.field;
            const stackBefore = normalizeSpellStack(tf);
            let updatedField: PlayerState["field"] = {
              ...tf,
              spellStack: appendSpellToStack(stackBefore, fieldCard),
            };
            if (previewCard.name === CHEOLBYEOK_SPELL_ID) {
              updatedField = {
                ...updatedField,
                is: updatedField.is ? stripBaekseuHarmfulEffectsForInvuln(updatedField.is) : null,
                m: updatedField.m ? stripBaekseuHarmfulEffectsForInvuln(updatedField.m) : null,
                os: updatedField.os ? stripBaekseuHarmfulEffectsForInvuln(updatedField.os) : null,
              };
            }
            let hyuPlacePerSlot: HyugesojauiAnsikHealSlotResult[] = [];
            let hyuPlaceCombatPatches: HyugesojauiAnsikCombatPatch[] = [];
            if (previewCard.name === HYUGESOJAUI_ANSIK_SPELL_ID) {
              const hr = applyHyugesojauiAnsikHealAttempt(updatedField, HYUGESOJAUI_ANSIK_HEAL_PER_TRIGGER);
              updatedField = hr.nextField;
              hyuPlacePerSlot = hr.perSlot;
              hyuPlaceCombatPatches = hr.combatPatches;
              hyuPlaceVfxBag.perSlot = hr.perSlot;
            }
            const key = isPlayerA ? "playerA" : "playerB";
            const ps = isPlayerA ? prev.playerA : prev.playerB;
            const nextSpellLog = [
              ...prev.spellDeployLog,
              {
                statsInstanceId: fieldCard.statsInstanceId!,
                name: fieldCard.name,
                player: casterPlayer,
                summonedTurn: fieldCard.summonedTurn,
              },
            ];
            let r: SimulationState = {
              ...prev,
              spellDeployLog: nextSpellLog,
              [key]: { ...ps, field: updatedField },
            };
            if (hyuPlaceCombatPatches.length > 0) {
              r = {
                ...r,
                unitCombatStats: patchManyUnitCombatStats(r.unitCombatStats, hyuPlaceCombatPatches),
              };
            }
            /* 휴게소의 안식 — 자기 W(적 host에 부착) 회복도 동반 처리 */
            if (previewCard.name === HYUGESOJAUI_ANSIK_SPELL_ID) {
              const enemyKey = casterPlayer === "A" ? "playerB" : "playerA";
              const riderHeal = applyHyugesojauiAnsikHealToOwnAebeolaekingRiders(
                r[enemyKey].field,
                casterPlayer,
                HYUGESOJAUI_ANSIK_HEAL_PER_TRIGGER
              );
              r = {
                ...r,
                [enemyKey]: { ...r[enemyKey], field: riderHeal.nextEnemyField },
                unitCombatStats: patchManyUnitCombatStats(r.unitCombatStats, riderHeal.combatPatches),
              };
            }
            if (isAntHellSpellCard(previewCard)) {
              const newPlayerA = { ...r.playerA, field: { ...r.playerA.field } };
              const newPlayerB = { ...r.playerB, field: { ...r.playerB.field } };
              const wave = applyAntHellSuppressionWaveToEnemies({
                casterPlayer,
                playerA: { field: newPlayerA.field },
                playerB: { field: newPlayerB.field },
                globalTurnCount: prev.globalTurnCount,
              });
              antHellPlaceVfxBag.applied = wave.appliedSlotKeys;
              antHellPlaceVfxBag.elWing = wave.elWingImmunitySlotKeys;
              r = { ...r, playerA: newPlayerA, playerB: newPlayerB };
            }
            const committed = finalizeSpellWithSimpan(r);
            if (previewCard.name === BANG_EOMAK_SPELL_ID) {
              window.setTimeout(() => {
                (["is", "m", "os"] as const).forEach(s =>
                  triggerCardFlash(`${tp}-${s}`, "spellBangEomakAllyPulse")
                );
              }, 0);
            }
            if (isJipjungSagyeokSpellCard(previewCard)) {
              window.setTimeout(() => {
                (["is", "m", "os"] as const).forEach(s =>
                  triggerCardFlash(`${tp}-${s}`, "spellJipjungAllyPulse")
                );
              }, 0);
            }
            if (previewCard.name === CHEOLBYEOK_SPELL_ID) {
              window.setTimeout(() => {
                (["is", "m", "os"] as const).forEach(s =>
                  triggerCardFlash(`${tp}-${s}`, "spellCheolbyeokAllyPulse")
                );
              }, 0);
            }
            if (previewCard.name === BUSINESS_GANG_SPELL_ID) {
              window.setTimeout(() => {
                triggerCardFlash(`${tp}-spell`, "businessGangSpellPulse");
              }, 0);
            }
            if (isAntHellSpellCard(previewCard)) {
              window.setTimeout(() => {
                triggerCardFlash(`${tp}-spell`, "businessGangSpellPulse");
              }, 0);
            }
            window.setTimeout(() => tryTriggerOneNightWagerSequenceRef.current(), 0);
            return committed;
          },
          afterCommitVfx: () => {
            if (previewCard.name === HYUGESOJAUI_ANSIK_SPELL_ID && hyuPlaceVfxBag.perSlot.length > 0) {
              playHyugesojauiAnsikAllyPulseAndHealVfx(tp, hyuPlaceVfxBag.perSlot);
            }
            if (isAntHellSpellCard(previewCard)) {
              for (const slotKey of antHellPlaceVfxBag.elWing) {
                showElWingMagicImmunityBlockOnUnit(slotKey);
              }
              for (const slotKey of antHellPlaceVfxBag.applied) {
                showAntHellSpellHitOnTarget(slotKey);
              }
            }
          },
        };
      }

      if (save.mode === "handUnitTarget" && previewCard.name === BEONGGAE_SPELL_ID && targetPlayer && unitSlot) {
        const skCommit = unitSlot;
        return {
          ...basePending,
          preApply: noopPreApply,
          commit: prev => {
            const victim = targetPlayer === "A" ? prev.playerA : prev.playerB;
            const u2 = victim.field[skCommit];
            if (!u2) return prev;
            if (
              isElWingBlockingEnemyAttackSpell(
                u2,
                targetPlayer,
                skCommit,
                prev.playerA.field,
                prev.playerB.field
              )
            ) {
              return prev;
            }
            if (!isBeonggaeValidTargetUnit(u2)) return prev;
            if (isInvulnerableFromBaekseuOrCheolbyeok(u2, victim.field)) return prev;
            const updated = applyBeonggaeLightningToFieldUnit(u2, victim.field);
            const nextVictim = { ...victim, field: { ...victim.field, [skCommit]: updated } };
            const victimKey = targetPlayer === "A" ? "playerA" : "playerB";
            return finalizeSpellWithSimpan({
              ...prev,
              [victimKey]: nextVictim,
              rewindCards: [...prev.rewindCards, previewCard],
            });
          },
          afterCommitVfx: () => {
            window.setTimeout(() => triggerCardFlash(`${targetPlayer}-${skCommit}`, "beonggaeSpell"), 0);
          },
        };
      }

      if (save.mode === "handUnitTarget" && previewCard.name === EONDEOK_SPELL_ID && targetPlayer && unitSlot) {
        const skCommit = unitSlot;
        return {
          ...basePending,
          preApply: noopPreApply,
          commit: prev => {
            const victim = targetPlayer === "A" ? prev.playerA : prev.playerB;
            const u2 = victim.field[skCommit];
            if (!u2) return prev;
            if (
              isElWingBlockingEnemyAttackSpell(
                u2,
                targetPlayer,
                skCommit,
                prev.playerA.field,
                prev.playerB.field
              )
            ) {
              return prev;
            }
            const updated: FieldCard = {
              ...u2,
              eondeokSilenceEndTurnTicksRemaining: EONDEOK_SILENCE_INITIAL_END_TURN_TICKS,
            };
            const nextVictim = { ...victim, field: { ...victim.field, [skCommit]: updated } };
            const victimKey = targetPlayer === "A" ? "playerA" : "playerB";
            return finalizeSpellWithSimpan({
              ...prev,
              [victimKey]: nextVictim,
              rewindCards: [...prev.rewindCards, previewCard],
            });
          },
          afterCommitVfx: () => {
            window.setTimeout(() => triggerCardFlash(`${targetPlayer}-${skCommit}`, "eondeokSpell"), 0);
          },
        };
      }

      if (save.mode === "handUnitTarget" && previewCard.name === SOMYEOL_SPELL_ID && targetPlayer && unitSlot) {
        const skCommit = unitSlot;
        return {
          ...basePending,
          preApply: noopPreApply,
          commit: prev => {
            const newPlayerA = { ...prev.playerA, field: { ...prev.playerA.field } };
            const newPlayerB = { ...prev.playerB, field: { ...prev.playerB.field } };
            const victimState = targetPlayer === "A" ? newPlayerA : newPlayerB;
            const erased = victimState.field[skCommit];
            if (!erased) return prev;
            if (
              isElWingBlockingEnemyAttackSpell(
                erased,
                targetPlayer,
                skCommit,
                newPlayerA.field,
                newPlayerB.field
              )
            ) {
              return prev;
            }

            cleanupSimulationUnitDeath(erased, newPlayerA, newPlayerB, prev.globalTurnCount, {
              skipDarkKnightSoulIncrement: true,
            });
            victimState.field[skCommit] = null;

            let nextUnitCombatStats = prev.unitCombatStats;
            let nextUnitStatsOrder = prev.unitStatsOrder;
            const sid = erased.statsInstanceId;
            if (sid) {
              const { [sid]: _removed, ...restStats } = nextUnitCombatStats;
              nextUnitCombatStats = restStats;
              nextUnitStatsOrder = nextUnitStatsOrder.filter(x => x !== sid);
            }

            const victimKey = targetPlayer === "A" ? "playerA" : "playerB";
            return finalizeSpellWithSimpan({
              ...prev,
              unitCombatStats: nextUnitCombatStats,
              unitStatsOrder: nextUnitStatsOrder,
              playerA: newPlayerA,
              playerB: newPlayerB,
              rewindCards: [...prev.rewindCards, previewCard, erased],
            });
          },
          afterCommitVfx: () => {
            window.setTimeout(() => triggerCardFlash(`${targetPlayer}-${skCommit}`, "somyeolSpellErase"), 0);
          },
        };
      }

      if (
        save.mode === "handUnitTarget" &&
        isHyperBeamSpellCard(previewCard) &&
        targetPlayer &&
        unitSlot
      ) {
        const skCommit = unitSlot;
        const hyperBeamVfx = { slotKey: "", hpLoss: 0 };
        return {
          ...basePending,
          preApply: noopPreApply,
          commit: prev => {
            hyperBeamVfx.slotKey = "";
            hyperBeamVfx.hpLoss = 0;
            const newPlayerA = { ...prev.playerA, field: { ...prev.playerA.field } };
            const newPlayerB = { ...prev.playerB, field: { ...prev.playerB.field } };
            const enemySide = targetPlayer === "A" ? newPlayerA : newPlayerB;
            const unit = enemySide.field[skCommit];
            if (!unit || unit.currentHp <= 0) return prev;
            if (
              isElWingBlockingEnemyAttackSpell(
                unit,
                targetPlayer,
                skCommit,
                newPlayerA.field,
                newPlayerB.field
              )
            ) {
              return prev;
            }

            const resolved = applyHyperBeamDamageToEnemyUnit({
              target: unit,
              targetPlayer,
              targetSlot: skCommit,
              playerAField: newPlayerA.field,
              playerBField: newPlayerB.field,
            });

            const baseTarget =
              Object.keys(resolved.baekseuPatch).length > 0
                ? stripBaekseuHarmfulEffectsForInvuln(unit)
                : unit;
            const updatedTarget: FieldCard = {
              ...baseTarget,
              ...resolved.baekseuPatch,
              ...resolved.barrierPatch,
              currentHp: resolved.isDestroyed ? 0 : resolved.newHp,
            };

            let rewindCards = [...prev.rewindCards, previewCard];
            let unitCombatStats = prev.unitCombatStats;
            let unitStatsOrder = prev.unitStatsOrder;

            if (resolved.isDestroyed) {
              enemySide.field[skCommit] = null;
              cleanupSimulationUnitDeath(
                unit,
                { field: newPlayerA.field },
                { field: newPlayerB.field },
                prev.globalTurnCount
              );
              rewindCards = [...rewindCards, unit];
              const sid = unit.statsInstanceId;
              if (sid) {
                const { [sid]: _removed, ...restStats } = unitCombatStats;
                unitCombatStats = restStats;
                unitStatsOrder = unitStatsOrder.filter(x => x !== sid);
              }
            } else {
              enemySide.field[skCommit] = updatedTarget;
            }

            applyPostStrikeAllyHealsIncludingW({
              targetPlayer,
              targetSlot: skCommit,
              playerAField: newPlayerA.field,
              playerBField: newPlayerB.field,
              morningMoodDeathHeal: resolved.morningMoodDeathHeal,
              startingTreeAllyHeal: resolved.startingTreeAllyHeal,
            });

            if (resolved.hpLoss > 0) {
              hyperBeamVfx.slotKey = `${targetPlayer}-${skCommit}`;
              hyperBeamVfx.hpLoss = resolved.hpLoss;
            }

            const victimKey = targetPlayer === "A" ? "playerA" : "playerB";
            return finalizeSpellWithSimpan({
              ...prev,
              unitCombatStats,
              unitStatsOrder,
              playerA: newPlayerA,
              playerB: newPlayerB,
              [victimKey]: enemySide,
              rewindCards,
            });
          },
          afterCommitVfx: () => {
            if (hyperBeamVfx.slotKey && hyperBeamVfx.hpLoss > 0) {
              window.setTimeout(
                () => showHyperBeamSpellHitOnTarget(hyperBeamVfx.slotKey, hyperBeamVfx.hpLoss),
                0
              );
            }
          },
        };
      }

      if (
        save.mode === "handUnitTarget" &&
        isOrietChosangSpellCard(previewCard) &&
        targetPlayer &&
        unitSlot
      ) {
        const skCommit = unitSlot;
        return {
          ...basePending,
          preApply: noopPreApply,
          commit: prev => {
            /* 오리에트의 초상 — 아군 is/m/os만. (W·적 host 타깃 시도 시 무시) */
            if (targetPlayer !== casterPlayer) return prev;
            const allySide = targetPlayer === "A" ? prev.playerA : prev.playerB;
            const u = allySide.field[skCommit];
            if (!u || (u.currentHp ?? 0) <= 0) return prev;
            if (suppressionBlocksExternalBuffEffects(u)) return prev;
            const updatedAlly: FieldCard = {
              ...u,
              hpBarrierAbsorptionRemaining: ORIET_CHOSANG_HP_BARRIER_AMOUNT,
            };
            const nextAllySide = {
              ...allySide,
              field: { ...allySide.field, [skCommit]: updatedAlly },
            };
            const allyKey = targetPlayer === "A" ? "playerA" : "playerB";
            return finalizeSpellWithSimpan({
              ...prev,
              [allyKey]: nextAllySide,
              rewindCards: [...prev.rewindCards, previewCard],
            });
          },
          afterCommitVfx: () => {
            window.setTimeout(() => triggerCardFlash(`${targetPlayer}-${skCommit}`, "orietShieldAllyPulse"), 0);
          },
        };
      }

      return null;
    },
    [
      finalizeSpellWithSimpan,
      triggerCardFlash,
      showMeteoSpellHitOnTarget,
      showHyperBeamSpellHitOnTarget,
      playHyugesojauiAnsikAllyPulseAndHealVfx,
      startWitchTarotCoinSequence,
    ]
  );

  buildSpellUsageHandlersRef.current = buildSpellUsageHandlersFromSave;

  /** 고스톤 처치 시 공격자 슬롯 — 능력 발동 이펙트 동일 재생(숫자 없음) */
  const triggerGhostoneKillFlashOnAttacker = (attackerSlotKey: string) => {
    triggerCardFlash(attackerSlotKey, "ghostoneKill");
  };

  /** 다크나이트가 적 유닛을 처치: 인디고 능력 발동(피해 대상·공격자), 피해 숫자 */
  const showDarkKnightKillDamageOnTarget = (
    targetSlotKey: string,
    amount: number,
    attackerSlotKey: string,
    damageExtras?: CombatDamagePopupExtras
  ) => {
    pushCombatPopup(targetSlotKey, "damage", amount, damageExtras);
    triggerCardFlash(targetSlotKey, "darkKnightKill");
    triggerCardFlash(attackerSlotKey, "darkKnightKill");
  };

  /** 맥셀렌드가 적 유닛을 처치: 붉은 능력 발동 이펙트(대상·자신 동시) + 피해 숫자 — [혼란] 시 이펙트만 생략 */
  const showMaxellandKillDamageOnTarget = (
    targetSlotKey: string,
    amount: number,
    attackerSlotKey: string,
    damageExtras?: CombatDamagePopupExtras,
    attackerCard?: FieldCard | null,
    facingOppCard?: FieldCard | null
  ) => {
    pushCombatPopup(targetSlotKey, "damage", amount, damageExtras);
    if (attackerCard && !shouldPlayMaxellandKillVfx(attackerCard, facingOppCard ?? null)) return;
    triggerCardFlash(targetSlotKey, "maxellandKill");
    triggerCardFlash(attackerSlotKey, "maxellandKill");
  };

  /** 맥셀렌드 풀스택 기본 공격 적중(비처치): 노란 윤곽 피해 숫자 + 주황 반경 능력 발동 이펙트(일반 피격 섬광 없음) */
  const showMaxellandFullGaugeStrikeDamageOnTarget = (
    targetSlotKey: string,
    amount: number,
    damageExtras?: CombatDamagePopupExtras
  ) => {
    pushCombatPopup(targetSlotKey, "damage", amount, {
      maxellandFullGaugeVictimDamageOutline: true,
      ...damageExtras,
    });
    triggerCardFlash(targetSlotKey, "maxellandFullGaugeStrike");
  };

  /** 소울 만축 다크나이트 기본 공격 적중(비처치): 데미지 글자색만 남색 + 인디고 윤곽 명멸 */
  const showDarkKnightFullSoulStrikeOnTarget = (slotKey: string, amount: number, damageExtras?: CombatDamagePopupExtras) => {
    pushCombatPopup(slotKey, "damage", amount, {
      dkFullGaugeNavyDamageText: true,
      ...damageExtras,
    });
    triggerCardFlash(slotKey, "darkKnightFullSoulHit");
  };

  /** 인디고 처치 명멸 후: 처치 회복 숫자·초록 섬광 */
  const showHealNumberAfterDarkKnightKillFlash = (slotKey: string, amount: number) => {
    const delayMs = FLASH_CLEAR_MS.darkKnightKill + 40;
    window.setTimeout(() => {
      pushCombatPopup(slotKey, "heal", amount);
      triggerCardFlash(slotKey, "heal");
    }, delayMs);
  };

  /** 보라 처치 명멸 후: +힐 플로팅 텍스트와 초록 섬광을 같은 타이밍에 발동 */
  const showHealNumberAfterGhostoneKillFlash = (slotKey: string, amount: number) => {
    const delayMs = FLASH_CLEAR_MS.ghostoneKill + 40;
    window.setTimeout(() => {
      pushCombatPopup(slotKey, "heal", amount);
      triggerCardFlash(slotKey, "heal");
    }, delayMs);
  };

  const showHealNumber = (
    slotKey: string,
    amount: number,
    opts?: { skipHealFlash?: boolean }
  ) => {
    pushCombatPopup(slotKey, "heal", amount);
    if (!opts?.skipHealFlash) triggerCardFlash(slotKey, "heal");
  };

  const showLegendarySwordSkillHit = (slotKey: string, amount: number) => {
    pushCombatPopup(slotKey, "damage", amount);
    triggerCardFlash(slotKey, "legendarySwordSkill");
  };

  /** 연격 개시 시 전설의 검 본인에게만 능력 발동 이펙트(데미지 숫자 없음) */
  const playLegendarySwordStrikeOpenOnSelf = (owner: "A" | "B", swordSlot: "is" | "m" | "os") => {
    triggerCardFlash(`${owner}-${swordSlot}`, "legendarySwordSkill");
  };

  const renderCombatPopups = (slotKey: string) => {
    const entries = combatPopups[slotKey];
    if (!entries?.length) return null;
    const damages = entries.filter((e): e is Extract<CombatPopupEntry, { kind: "damage" }> => e.kind === "damage");
    const heals = entries.filter((e): e is Extract<CombatPopupEntry, { kind: "heal" }> => e.kind === "heal");
    const banjitBuffs = entries.filter(
      (e): e is Extract<CombatPopupEntry, { kind: "banjitgoriBuff" }> => e.kind === "banjitgoriBuff"
    );
    const limeBubbleBuffs = entries.filter(
      (e): e is Extract<CombatPopupEntry, { kind: "limeBubbleBuff" }> => e.kind === "limeBubbleBuff"
    );
    const cheolPassiveFloats = entries.filter(
      (e): e is Extract<CombatPopupEntry, { kind: "cheolgibyeongPassiveFloat" }> =>
        e.kind === "cheolgibyeongPassiveFloat"
    );
    const ryeomchoPassiveFloats = entries.filter(
      (e): e is Extract<CombatPopupEntry, { kind: "ryeomchoPassiveFloat" }> =>
        e.kind === "ryeomchoPassiveFloat"
    );
    const ironKiwiPassiveFloats = entries.filter(
      (e): e is Extract<CombatPopupEntry, { kind: "ironKiwiPassiveFloat" }> =>
        e.kind === "ironKiwiPassiveFloat"
    );
    const infoFloats = entries.filter(
      (e): e is Extract<CombatPopupEntry, { kind: "infoFloat" }> => e.kind === "infoFloat"
    );
    const bandGap = heals.length > 0 ? POPUP_DAMAGE_HEAL_GAP : 0;
    const popupTopFromAnchor = (extraPx: number) =>
      `calc(${COMBAT_POPUP_VERTICAL_ANCHOR_PCT}% - ${COMBAT_POPUP_FIRST_ROW_OFFSET_PX + extraPx}px)`;
    const anim = `damageFloat ${COMBAT_POPUP_MS / 1000}s ease-out forwards`;
    const animBanjit = `damageFloat ${BANJITGORI_BUFF_FLOAT_MS / 1000}s ease-out forwards`;
    const animLimeBubbleBuff = `damageFloat ${LIME_BUBBLE_BUFF_FLOAT_MS / 1000}s ease-out forwards`;
    const animCheolPassive = `damageFloat ${CHEOLGIBYEONG_PASSIVE_FLOAT_MS / 1000}s ease-out forwards`;
    /* 플로팅 레이어는 슬롯 오버레이(z-80) 위에 쌓임. 소울 만축 타격 플래시(z-45)보다 남색 데미지 가독성용 z-[52] */
    const baseText =
      "pointer-events-none absolute left-1/2 z-[40] -translate-x-1/2 whitespace-nowrap font-black tabular-nums text-2xl md:text-3xl";
    const damagePopupBase =
      "pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap font-black tabular-nums text-2xl md:text-3xl";
    const damageTextShadow =
      "drop-shadow-[0_2px_0_rgba(0,0,0,0.95),0_0_10px_rgba(0,0,0,0.55)]";
    /** 소울 만축 남색 데미지 가독성 — 밝은 보라 윤곽 + 소프트 글로우 (글자색·드롭섀도는 동일 유지) */
    const dkFullGaugeNavyFloatingOutline =
      "0 0 2px #faf5ff, 0 0 8px rgba(196, 181, 253, 0.95), 0 0 14px rgba(167, 139, 250, 0.5), -1px -1px 0 rgba(237, 233, 254, 0.9), 1px -1px 0 rgba(237, 233, 254, 0.9), -1px 1px 0 rgba(237, 233, 254, 0.9), 1px 1px 0 rgba(237, 233, 254, 0.9)";
    const maxellFullGaugeYellowDamageOutline =
      "0 0 2px #facc15, 0 0 7px rgba(250, 204, 21, 0.95), 0 0 12px rgba(234, 179, 8, 0.55), -1px -1px 0 #fef08a, 1px -1px 0 #fef08a, -1px 1px 0 #fef08a, 1px 1px 0 #fef08a";
    /** 시작의 망령 트루 스트라이크 회색 데미지 — 얇은 흰색 윤곽(가독성) */
    const startingWraithTrueStrikeFloatingOutline =
      "-1px -1px 0 rgba(255, 255, 255, 0.92), 1px -1px 0 rgba(255, 255, 255, 0.92), -1px 1px 0 rgba(255, 255, 255, 0.92), 1px 1px 0 rgba(255, 255, 255, 0.92), 0 0 2px rgba(255, 255, 255, 0.55)";
    const healText =
      `${baseText} text-emerald-400 drop-shadow-[0_2px_0_rgba(0,0,0,0.95),0_0_10px_rgba(0,0,0,0.55)]`;
    const stackAboveDamagesHeals =
      heals.length * POPUP_ROW_STEP + damages.length * POPUP_ROW_STEP + bandGap;
    const banjitBaseText =
      "pointer-events-none absolute left-1/2 z-[40] -translate-x-1/2 text-center font-black leading-tight drop-shadow-[0_2px_0_rgba(0,0,0,0.9),0_0_12px_rgba(0,0,0,0.45)] text-lg md:text-xl text-pink-400";
    const limeBubbleBuffBaseText =
      "pointer-events-none absolute left-1/2 z-[40] -translate-x-1/2 text-center font-black leading-tight drop-shadow-[0_2px_0_rgba(0,0,0,0.9),0_0_12px_rgba(0,0,0,0.45)] text-lg md:text-xl text-sky-300";
    const cheolPassiveBaseText =
      "pointer-events-none absolute left-1/2 z-[40] -translate-x-1/2 text-center font-black leading-tight drop-shadow-[0_2px_0_rgba(0,0,0,0.92),0_0_10px_rgba(0,0,0,0.5)] text-lg md:text-xl text-slate-300";
    const ryeomchoPassiveBaseText =
      "pointer-events-none absolute left-1/2 z-[40] -translate-x-1/2 text-center font-black leading-tight drop-shadow-[0_2px_0_rgba(42,34,26,0.95),0_0_12px_rgba(212,196,168,0.55),0_0_22px_rgba(232,220,196,0.35)] text-lg md:text-xl text-[#ebe3d3]";

    const buffFloatBlockRows = banjitBuffs.length + limeBubbleBuffs.length;
    const gapAfterBuffFloatBlock = buffFloatBlockRows > 0 ? 6 : 0;
    const buffFloatBlockBaseOffset = stackAboveDamagesHeals + 6;

    const stackAboveBuffBlocks =
      stackAboveDamagesHeals +
      6 +
      buffFloatBlockRows * 52 +
      gapAfterBuffFloatBlock +
      cheolPassiveFloats.length * 52 +
      ryeomchoPassiveFloats.length * 52 +
      ironKiwiPassiveFloats.length * 52;
    /** 시스템 메시지(pushInfoFloat): 흰색·일반 굵기·한 줄·중앙 — 변경 시 시스템 메시지 전부에 동일 적용 */
    const infoFloatBaseText =
      "pointer-events-none absolute left-1/2 z-[41] max-w-none -translate-x-1/2 whitespace-nowrap text-center font-normal leading-snug text-base md:text-lg text-white antialiased drop-shadow-[0_1px_2px_rgba(0,0,0,0.88)]";
    /** 백스 처형 플로팅 — 능력 발동(밝은 회색)과 맞춘 슬레이트 톤 */
    const infoFloatExecuteGrayText =
      "pointer-events-none absolute left-1/2 z-[41] max-w-none -translate-x-1/2 whitespace-nowrap text-center font-black leading-snug text-base md:text-lg text-slate-200 antialiased drop-shadow-[0_1px_2px_rgba(15,23,42,0.92),0_0_10px_rgba(226,232,240,0.35)]";
    const infoFloatSkyBlueText =
      "pointer-events-none absolute left-1/2 z-[41] max-w-none -translate-x-1/2 whitespace-nowrap text-center font-black leading-snug text-base md:text-lg text-sky-300 antialiased drop-shadow-[0_1px_2px_rgba(8,47,73,0.92),0_0_12px_rgba(56,189,248,0.45)]";
    const infoFloatMagicImmunityGreenText =
      "pointer-events-none absolute left-1/2 z-[41] max-w-none -translate-x-1/2 whitespace-nowrap text-center font-black leading-snug text-base md:text-lg text-emerald-200 antialiased drop-shadow-[0_1px_2px_rgba(6,78,59,0.92),0_0_12px_rgba(74,222,128,0.5)]";

    return (
      <>
        {damages.map((e, i) => {
          const isWraithTrueStrikeFloat = e.startingWraithTrueStrikeDamageText === true;
          const isKalliPureFloat = e.kalliVsDefensePureDamageText === true && !isWraithTrueStrikeFloat;
          const isDkNavy = e.dkFullGaugeNavyDamageText === true && !isKalliPureFloat && !isWraithTrueStrikeFloat;
          const stackStyle = isKalliPureFloat
            ? {}
            : isWraithTrueStrikeFloat
              ? { textShadow: startingWraithTrueStrikeFloatingOutline }
              : isDkNavy
                ? { textShadow: dkFullGaugeNavyFloatingOutline }
                : e.maxellandFullGaugeVictimDamageOutline === true
                  ? { textShadow: maxellFullGaugeYellowDamageOutline }
                  : {};
          const zDamage = isKalliPureFloat ? "z-[40]" : isDkNavy ? "z-[52]" : "z-[40]";
          const textDamage = isWraithTrueStrikeFloat
            ? "text-zinc-500"
            : isKalliPureFloat
              ? "text-slate-200"
              : isDkNavy
                ? "text-[#1e1b4b]"
                : "text-red-500";
          return (
          <span
            key={e.id}
            className={`${damagePopupBase} ${zDamage} ${textDamage} ${damageTextShadow}`}
            style={{
              top: popupTopFromAnchor(heals.length * POPUP_ROW_STEP + bandGap + i * POPUP_ROW_STEP),
              animation: anim,
              ...stackStyle,
            }}
          >
            -{e.amount}
          </span>
          );
        })}
        {heals.map((e, j) => (
          <span
            key={e.id}
            className={healText}
            style={{
              top: popupTopFromAnchor(j * POPUP_ROW_STEP),
              animation: anim,
            }}
          >
            +{e.amount}
          </span>
        ))}
        {banjitBuffs.map((e, bi) => (
          <div
            key={e.id}
            className={banjitBaseText}
            style={{
              top: popupTopFromAnchor(buffFloatBlockBaseOffset + bi * 52),
              animation: animBanjit,
            }}
          >
            {e.lines.map((line, li) => (
              <div key={li} className="whitespace-nowrap">
                {line}
              </div>
            ))}
          </div>
        ))}
        {limeBubbleBuffs.map((e, lix) => (
          <div
            key={e.id}
            className={limeBubbleBuffBaseText}
            style={{
              top: popupTopFromAnchor(buffFloatBlockBaseOffset + banjitBuffs.length * 52 + lix * 52),
              animation: animLimeBubbleBuff,
            }}
          >
            {e.lines.map((line, li) => (
              <div key={li} className="whitespace-nowrap">
                {line}
              </div>
            ))}
          </div>
        ))}
        {cheolPassiveFloats.map((e, ci) => (
          <div
            key={e.id}
            className={cheolPassiveBaseText}
            style={{
              top: popupTopFromAnchor(
                buffFloatBlockBaseOffset + buffFloatBlockRows * 52 + gapAfterBuffFloatBlock + ci * 52
              ),
              animation: animCheolPassive,
            }}
          >
            {e.lines.map((line, li) => (
              <div key={li} className="whitespace-nowrap">
                {line}
              </div>
            ))}
          </div>
        ))}
        {ryeomchoPassiveFloats.map((e, ri) => (
          <div
            key={e.id}
            className={ryeomchoPassiveBaseText}
            style={{
              top: popupTopFromAnchor(
                buffFloatBlockBaseOffset +
                  buffFloatBlockRows * 52 +
                  gapAfterBuffFloatBlock +
                  cheolPassiveFloats.length * 52 +
                  ri * 52
              ),
              animation: animCheolPassive,
            }}
          >
            {e.lines.map((line, li) => (
              <div key={li} className="whitespace-nowrap">
                {line}
              </div>
            ))}
          </div>
        ))}
        {ironKiwiPassiveFloats.map((e, ii) => (
          <div
            key={e.id}
            className={cheolPassiveBaseText}
            style={{
              top: popupTopFromAnchor(
                buffFloatBlockBaseOffset +
                  buffFloatBlockRows * 52 +
                  gapAfterBuffFloatBlock +
                  cheolPassiveFloats.length * 52 +
                  ryeomchoPassiveFloats.length * 52 +
                  ii * 52
              ),
              animation: animCheolPassive,
            }}
          >
            {e.lines.map((line, li) => (
              <div key={li} className="whitespace-nowrap">
                {line}
              </div>
            ))}
          </div>
        ))}
        {infoFloats.map((e, infIdx) => (
          <div
            key={e.id}
            className={
              e.tone === "executeGray"
                ? infoFloatExecuteGrayText
                : e.tone === "skyBlue"
                  ? infoFloatSkyBlueText
                  : e.tone === "magicImmunityGreen"
                    ? infoFloatMagicImmunityGreenText
                    : infoFloatBaseText
            }
            style={{
              top: popupTopFromAnchor(stackAboveBuffBlocks + 8 + infIdx * 44),
              animation: `damageFloat ${e.durationMs / 1000}s ease-out forwards`,
            }}
          >
            {e.text}
          </div>
        ))}
      </>
    );
  };

  /** 카드 위·플로팅 숫자 — `fieldSlotCombatPopupOverlayClass`(z-80) 안에서 표시, 체력행보다 위 */
  const renderFlashOverlay = (slotKey: string, roundedClass: string) => {
    const snap = flashOverlay[slotKey];
    if (!snap) return null;
    /* 능력 발동 이펙트 — 시작의 망령 처치 연쇄(갈색-주황·고스톤 동형) */
    if (snap.kind === "startingWraithChainKill") {
      return (
        <div
          key={`${slotKey}-${snap.id}-wraith-wrap`}
          className={`pointer-events-none absolute inset-0 z-[22] overflow-visible ${roundedClass}`}
          aria-hidden
        >
          <div
            key={`${slotKey}-${snap.id}-wraith-aura`}
            className={`pp-combat-flash-layer--starting-wraith-chain-kill-aura pointer-events-none absolute -inset-12 z-[21] ${roundedClass}`}
          />
          <div
            key={`${slotKey}-${snap.id}-wraith-inner`}
            className={`pointer-events-none absolute inset-0 z-[22] ${roundedClass} pp-combat-flash-layer--starting-wraith-chain-kill`}
          />
        </div>
      );
    }
    /* 능력 발동 이펙트 — 고스톤(처치 시) */
    if (snap.kind === "ghostoneKill") {
      return (
        <div
          key={`${slotKey}-${snap.id}-wrap`}
          className={`pointer-events-none absolute inset-0 z-[22] overflow-visible ${roundedClass}`}
          aria-hidden
        >
          <div
            key={`${slotKey}-${snap.id}-aura`}
            className={`pp-combat-flash-layer--ghostone-kill-aura pointer-events-none absolute -inset-12 z-[21] ${roundedClass}`}
          />
          <div
            key={`${slotKey}-${snap.id}-inner`}
            className={`pointer-events-none absolute inset-0 z-[22] ${roundedClass} pp-combat-flash-layer--ghostone-kill`}
          />
        </div>
      );
    }
    /* 능력 발동 이펙트 — 스펠 No.31 소멸(적 유닛 즉시 제거 — 고스톤 처치와 동형 규격·파랑·시안) */
    if (snap.kind === "somyeolSpellErase") {
      return (
        <div
          key={`${slotKey}-${snap.id}-somyeol-wrap`}
          className={`pointer-events-none absolute inset-0 z-[22] overflow-visible ${roundedClass}`}
          aria-hidden
        >
          <div
            key={`${slotKey}-${snap.id}-somyeol-aura`}
            className={`pp-combat-flash-layer--somyeol-spell-erase-aura pointer-events-none absolute -inset-12 z-[21] ${roundedClass}`}
          />
          <div
            key={`${slotKey}-${snap.id}-somyeol-inner`}
            className={`pointer-events-none absolute inset-0 z-[22] ${roundedClass} pp-combat-flash-layer--somyeol-spell-erase`}
          />
        </div>
      );
    }
    /* 능력 발동 이펙트 — 캘리 [버프 금지] 부여(고스톤과 동형·밝은 회색) */
    if (snap.kind === "kalliBuffBan") {
      return (
        <div
          key={`${slotKey}-${snap.id}-kalli-buff-ban-wrap`}
          className={`pointer-events-none absolute inset-0 z-[22] overflow-visible ${roundedClass}`}
          aria-hidden
        >
          <div
            key={`${slotKey}-${snap.id}-kalli-buff-ban-aura`}
            className={`pp-combat-flash-layer--kalli-buff-ban-aura pointer-events-none absolute -inset-12 z-[21] ${roundedClass}`}
          />
          <div
            key={`${slotKey}-${snap.id}-kalli-buff-ban-inner`}
            className={`pointer-events-none absolute inset-0 z-[22] ${roundedClass} pp-combat-flash-layer--kalli-buff-ban`}
          />
        </div>
      );
    }
    /* 능력 발동 이펙트 — 유닛 No.37 애벌레킹(부착·기생 펄스 — 황갈색/갈색 형광) */
    if (snap.kind === "aebeolaekingAttach" || snap.kind === "aebeolaekingParasiteTick") {
      const auraK = snap.kind === "aebeolaekingAttach" ? "aebeolaeking-attach" : "aebeolaeking-parasite-tick";
      const innerCls =
        snap.kind === "aebeolaekingAttach"
          ? "pp-combat-flash-layer--aebeolaeking-attach"
          : "pp-combat-flash-layer--aebeolaeking-parasite-tick";
      return (
        <div
          key={`${slotKey}-${snap.id}-${auraK}-wrap`}
          className={`pointer-events-none absolute inset-0 z-[22] overflow-visible ${roundedClass}`}
          aria-hidden
        >
          {snap.kind === "aebeolaekingAttach" && (
            <div
              key={`${slotKey}-${snap.id}-${auraK}-aura`}
              className={`pp-combat-flash-layer--aebeolaeking-attach-aura pointer-events-none absolute -inset-12 z-[21] ${roundedClass}`}
            />
          )}
          <div
            key={`${slotKey}-${snap.id}-${auraK}-inner`}
            className={`pointer-events-none absolute inset-0 z-[22] ${roundedClass} ${innerCls}`}
          />
        </div>
      );
    }
    /* No.14 무효화 — 반격 성공 시 중앙 스펠 흰 펄스 후 소멸 */
    if (snap.kind === "muhyohwaCounterResolve") {
      return (
        <div
          key={`${slotKey}-${snap.id}-muhyohwa-wrap`}
          className={`pointer-events-none absolute inset-0 z-[28] overflow-visible ${roundedClass}`}
          aria-hidden
        >
          <div
            key={`${slotKey}-${snap.id}-muhyohwa-aura`}
            className={`pp-combat-flash-layer--muhyohwa-counter-resolve-aura pointer-events-none absolute -inset-10 z-[27] ${roundedClass}`}
          />
          <div
            key={`${slotKey}-${snap.id}-muhyohwa-inner`}
            className={`pointer-events-none absolute inset-0 z-[28] ${roundedClass} pp-combat-flash-layer--muhyohwa-counter-resolve`}
          />
        </div>
      );
    }
    /* 능력 발동 이펙트 — 단하「마법의 갈고리」/ 전설의 검 연격(고스톤과 동형·하늘색) */
    if (snap.kind === "danhaMagicHook" || snap.kind === "legendarySwordSkill") {
      const k = snap.kind === "danhaMagicHook" ? "danha" : "leg-sword";
      return (
        <div
          key={`${slotKey}-${snap.id}-${k}-wrap`}
          className={`pointer-events-none absolute inset-0 z-[22] overflow-visible ${roundedClass}`}
          aria-hidden
        >
          <div
            key={`${slotKey}-${snap.id}-${k}-aura`}
            className={`pp-combat-flash-layer--danha-magic-hook-aura pointer-events-none absolute -inset-12 z-[21] ${roundedClass}`}
          />
          <div
            key={`${slotKey}-${snap.id}-${k}-inner`}
            className={`pointer-events-none absolute inset-0 z-[22] ${roundedClass} pp-combat-flash-layer--danha-magic-hook`}
          />
        </div>
      );
    }
    /* 능력 발동 이펙트 — 마녀 타로(스펠 칸·보라색) */
    if (snap.kind === "guihwanPlace" || snap.kind === "guihwanRevive") {
      return (
        <div
          key={`${slotKey}-${snap.id}-guihwan-wrap`}
          className={`pointer-events-none absolute inset-0 z-[22] overflow-visible ${roundedClass}`}
          aria-hidden
        >
          <div
            key={`${slotKey}-${snap.id}-guihwan-aura`}
            className={`pp-combat-flash-layer--guihwan-indigo-aura pointer-events-none absolute -inset-12 z-[21] ${roundedClass}`}
          />
          <div
            key={`${slotKey}-${snap.id}-guihwan-inner`}
            className={`pointer-events-none absolute inset-0 z-[22] ${roundedClass} pp-combat-flash-layer--guihwan-indigo`}
          />
        </div>
      );
    }
    if (snap.kind === "witchTarotSpellPulse") {
      return (
        <div
          key={`${slotKey}-${snap.id}-wt-wrap`}
          className={`pointer-events-none absolute inset-0 z-[22] overflow-visible ${roundedClass}`}
          aria-hidden
        >
          <div
            key={`${slotKey}-${snap.id}-wt-aura`}
            className={`pp-combat-flash-layer--witch-tarot-spell-pulse-aura--spell-land pointer-events-none absolute -inset-[4.75rem] z-[21] ${roundedClass}`}
          />
          <div
            key={`${slotKey}-${snap.id}-wt-inner`}
            className={`pointer-events-none absolute inset-0 z-[22] ${roundedClass} pp-combat-flash-layer--witch-tarot-spell-pulse--spell-land`}
          />
        </div>
      );
    }
    /* 능력 발동 이펙트 — 한날 밤의 내기(슈퍼 테슬라 동형·자주색) */
    if (snap.kind === "oneNightWagerSpellTrigger") {
      const isSpellSlot = slotKey === "A-spell" || slotKey === "B-spell";
      const auraLayerClass = isSpellSlot
        ? "pp-combat-flash-layer--one-night-wager-spell-trigger-aura--spell-land"
        : "pp-combat-flash-layer--one-night-wager-spell-trigger-aura";
      const innerLayerClass = isSpellSlot
        ? "pp-combat-flash-layer--one-night-wager-spell-trigger--spell-land"
        : "pp-combat-flash-layer--one-night-wager-spell-trigger";
      return (
        <div
          key={`${slotKey}-${snap.id}-onw-wrap`}
          className={`pointer-events-none absolute inset-0 z-[22] overflow-visible ${roundedClass}`}
          aria-hidden
        >
          <div
            key={`${slotKey}-${snap.id}-onw-aura`}
            className={`${auraLayerClass} pointer-events-none absolute -inset-[4.75rem] z-[21] ${roundedClass}`}
          />
          <div
            key={`${slotKey}-${snap.id}-onw-inner`}
            className={`pointer-events-none absolute inset-0 z-[22] ${roundedClass} ${innerLayerClass}`}
          />
        </div>
      );
    }
    if (snap.kind === "oneNightWagerTokenWipe") {
      return (
        <div
          key={`${slotKey}-${snap.id}-onw-tokens`}
          className={`pointer-events-none absolute inset-0 z-[24] overflow-visible ${roundedClass} pp-combat-flash-layer--one-night-wager-token-wipe`}
          aria-hidden
        />
      );
    }
    /* 능력 발동 이펙트 — 슈퍼 테슬라(스펠 칸·중앙 연출; 고스톤/그린킹 동형·코발트) */
    if (snap.kind === "superTeslaSpellTrigger") {
      const isSpellSlot = slotKey === "A-spell" || slotKey === "B-spell";
      const auraLayerClass = isSpellSlot
        ? "pp-combat-flash-layer--super-tesla-spell-trigger-aura--spell-land"
        : "pp-combat-flash-layer--super-tesla-spell-trigger-aura";
      const innerLayerClass = isSpellSlot
        ? "pp-combat-flash-layer--super-tesla-spell-trigger--spell-land"
        : "pp-combat-flash-layer--super-tesla-spell-trigger";
      return (
        <div
          key={`${slotKey}-${snap.id}-st-wrap`}
          className={`pointer-events-none absolute inset-0 z-[22] overflow-visible ${roundedClass}`}
          aria-hidden
        >
          <div
            key={`${slotKey}-${snap.id}-st-aura`}
            className={`${auraLayerClass} pointer-events-none absolute -inset-[4.75rem] z-[21] ${roundedClass}`}
          />
          <div
            key={`${slotKey}-${snap.id}-st-inner`}
            className={`pointer-events-none absolute inset-0 z-[22] ${roundedClass} ${innerLayerClass}`}
          />
        </div>
      );
    }
    /* 능력 발동 이펙트 — 엘 윙 [마법 면역]에 단일 대상 공격 스펠 적용 시도(녹색) */
    if (snap.kind === "elWingMagicImmunityBlock") {
      return (
        <div
          key={`${slotKey}-${snap.id}-el-wing-mi-wrap`}
          className={`pointer-events-none absolute inset-0 z-[22] overflow-visible ${roundedClass}`}
          aria-hidden
        >
          <div
            key={`${slotKey}-${snap.id}-el-wing-mi-aura`}
            className={`pp-combat-flash-layer--el-wing-magic-immunity-block-aura pointer-events-none absolute -inset-12 z-[21] ${roundedClass}`}
          />
          <div
            key={`${slotKey}-${snap.id}-el-wing-mi-inner`}
            className={`pointer-events-none absolute inset-0 z-[22] ${roundedClass} pp-combat-flash-layer--el-wing-magic-immunity-block`}
          />
        </div>
      );
    }
    /* 능력 발동 이펙트 — 베프끼리(스펠 칸 배치·즉시 소멸 — 슈퍼 테슬라 동형·파랑) */
    if (snap.kind === "befpkkiriSpellTrigger") {
      return (
        <div
          key={`${slotKey}-${snap.id}-bef-wrap`}
          className={`pointer-events-none absolute inset-0 z-[22] overflow-visible ${roundedClass}`}
          aria-hidden
        >
          <div
            key={`${slotKey}-${snap.id}-bef-aura`}
            className={`pp-combat-flash-layer--befpkkiri-spell-trigger-aura--spell-land pointer-events-none absolute -inset-[4.75rem] z-[21] ${roundedClass}`}
          />
          <div
            key={`${slotKey}-${snap.id}-bef-inner`}
            className={`pointer-events-none absolute inset-0 z-[22] ${roundedClass} pp-combat-flash-layer--befpkkiri-spell-trigger--spell-land`}
          />
        </div>
      );
    }
    /* 능력 발동 이펙트 — 보글보글 스테이션(스펠 칸 배치 — 베프끼리 동형·시안) */
    if (snap.kind === "bubbleStationSpellTrigger") {
      return (
        <div
          key={`${slotKey}-${snap.id}-bubble-wrap`}
          className={`pointer-events-none absolute inset-0 z-[22] overflow-visible ${roundedClass}`}
          aria-hidden
        >
          <div
            key={`${slotKey}-${snap.id}-bubble-aura`}
            className={`pp-combat-flash-layer--bubble-station-spell-trigger-aura--spell-land pointer-events-none absolute -inset-[4.75rem] z-[21] ${roundedClass}`}
          />
          <div
            key={`${slotKey}-${snap.id}-bubble-inner`}
            className={`pointer-events-none absolute inset-0 z-[22] ${roundedClass} pp-combat-flash-layer--bubble-station-spell-trigger--spell-land`}
          />
        </div>
      );
    }
    /* 능력 발동 이펙트 — 곤충 전문가「A) 탐색」(슈퍼 그린킹 스펠 칸 동형·연두) */
    if (snap.kind === "gonchungHiddenPeek") {
      const isSpellSlot = slotKey === "A-spell" || slotKey === "B-spell";
      const auraLayerClass = isSpellSlot
        ? "pp-combat-flash-layer--gonchung-hidden-peek-aura--spell-land"
        : "pp-combat-flash-layer--gonchung-hidden-peek-aura";
      const innerLayerClass = isSpellSlot
        ? "pp-combat-flash-layer--gonchung-hidden-peek--spell-land"
        : "pp-combat-flash-layer--gonchung-hidden-peek";
      return (
        <div
          key={`${slotKey}-${snap.id}-gonchung-wrap`}
          className={`pointer-events-none absolute inset-0 z-[22] overflow-visible ${roundedClass}`}
          aria-hidden
        >
          <div
            key={`${slotKey}-${snap.id}-gonchung-aura`}
            className={`${auraLayerClass} pointer-events-none absolute -inset-12 z-[21] ${roundedClass}`}
          />
          <div
            key={`${slotKey}-${snap.id}-gonchung-inner`}
            className={`pointer-events-none absolute inset-0 z-[22] ${roundedClass} ${innerLayerClass}`}
          />
        </div>
      );
    }
    /* 능력 발동 이펙트 — 슈퍼 그린킹「주문 파괴자」(유닛: 고스톤 동형; 스펠 칸: 가로 타원·오라 전용 클래스) */
    if (snap.kind === "superGreenKingSpellBreaker") {
      const isSpellSlot = slotKey === "A-spell" || slotKey === "B-spell";
      const auraLayerClass = isSpellSlot
        ? "pp-combat-flash-layer--super-green-king-spell-breaker-aura--spell-land"
        : "pp-combat-flash-layer--super-green-king-spell-breaker-aura";
      const innerLayerClass = isSpellSlot
        ? "pp-combat-flash-layer--super-green-king-spell-breaker--spell-land"
        : "pp-combat-flash-layer--super-green-king-spell-breaker";
      return (
        <div
          key={`${slotKey}-${snap.id}-sgk-wrap`}
          className={`pointer-events-none absolute inset-0 z-[22] overflow-visible ${roundedClass}`}
          aria-hidden
        >
          <div
            key={`${slotKey}-${snap.id}-sgk-aura`}
            className={`${auraLayerClass} pointer-events-none absolute -inset-12 z-[21] ${roundedClass}`}
          />
          <div
            key={`${slotKey}-${snap.id}-sgk-inner`}
            className={`pointer-events-none absolute inset-0 z-[22] ${roundedClass} ${innerLayerClass}`}
          />
        </div>
      );
    }
    /* 능력 발동 이펙트 — 다크나이트(적 유닛 처치 시, 인디고) */
    if (snap.kind === "darkKnightKill") {
      return (
        <div
          key={`${slotKey}-${snap.id}-dk-kill-wrap`}
          className={`pointer-events-none absolute inset-0 z-[22] overflow-visible ${roundedClass}`}
          aria-hidden
        >
          <div
            key={`${slotKey}-${snap.id}-dk-kill-aura`}
            className={`pp-combat-flash-layer--darkknight-kill-aura pointer-events-none absolute -inset-12 z-[21] ${roundedClass}`}
          />
          <div
            key={`${slotKey}-${snap.id}-dk-kill-inner`}
            className={`pointer-events-none absolute inset-0 z-[22] ${roundedClass} pp-combat-flash-layer--darkknight-kill`}
          />
        </div>
      );
    }
    /* 능력 발동 이펙트 — 맥셀렌드(적 유닛 처치, 붉은색 — 다크나이트 처치와 동형 레이어) */
    if (snap.kind === "maxellandKill") {
      return (
        <div
          key={`${slotKey}-${snap.id}-max-kill-wrap`}
          className={`pointer-events-none absolute inset-0 z-[22] overflow-visible ${roundedClass}`}
          aria-hidden
        >
          <div
            key={`${slotKey}-${snap.id}-max-kill-aura`}
            className={`pp-combat-flash-layer--maxelland-kill-aura pointer-events-none absolute -inset-12 z-[21] ${roundedClass}`}
          />
          <div
            key={`${slotKey}-${snap.id}-max-kill-inner`}
            className={`pointer-events-none absolute inset-0 z-[22] ${roundedClass} pp-combat-flash-layer--maxelland-kill`}
          />
        </div>
      );
    }
    /* 맥셀렌드 [투지] 만축 기본 공격 적중 — 다크나이트 만축 타격과 동형 레이어·주황색 */
    if (snap.kind === "maxellandFullGaugeStrike") {
      return (
        <div
          key={`${slotKey}-${snap.id}-max-fgstrike-hit`}
          className={`pointer-events-none absolute inset-0 z-[45] overflow-visible ${roundedClass}`}
          aria-hidden
        >
          <div
            key={`${slotKey}-${snap.id}-max-fgstrike-burst`}
            className={`pp-combat-flash-layer--maxelland-fullgauge-hit-burst pointer-events-none absolute -inset-5 z-[44] ${roundedClass}`}
          />
          <div
            key={`${slotKey}-${snap.id}-max-fgstrike-outline`}
            className={`pointer-events-none absolute inset-0 z-[45] ${roundedClass} pp-combat-flash-layer--maxelland-fullgauge-hit`}
          />
        </div>
      );
    }
    /* 다크나이트 소울 만축 기본 공격 적중 — 바깥 보라 섬광 + 인디고 윤곽 명멸 */
    if (snap.kind === "darkKnightFullSoulHit") {
      return (
        <div
          key={`${slotKey}-${snap.id}-dk-fullsoul-hit`}
          className={`pointer-events-none absolute inset-0 z-[45] overflow-visible ${roundedClass}`}
          aria-hidden
        >
          <div
            key={`${slotKey}-${snap.id}-dk-fullsoul-burst`}
            className={`pp-combat-flash-layer--darkknight-fullsoul-hit-burst pointer-events-none absolute -inset-5 z-[44] ${roundedClass}`}
          />
          <div
            key={`${slotKey}-${snap.id}-dk-fullsoul-outline`}
            className={`pointer-events-none absolute inset-0 z-[45] ${roundedClass} pp-combat-flash-layer--darkknight-fullsoul-hit`}
          />
        </div>
      );
    }
    /* 능력 발동 이펙트 — 필립(필드 소환·마주 패시브 맺음) */
    if (snap.kind === "philipSummon") {
      return (
        <div
          key={`${slotKey}-${snap.id}-philip-wrap`}
          className={`pointer-events-none absolute inset-0 z-[22] overflow-visible ${roundedClass}`}
          aria-hidden
        >
          <div
            key={`${slotKey}-${snap.id}-philip-aura`}
            className={`pp-combat-flash-layer--philip-summon-aura pointer-events-none absolute -inset-12 z-[21] ${roundedClass}`}
          />
          <div
            key={`${slotKey}-${snap.id}-philip-inner`}
            className={`pointer-events-none absolute inset-0 z-[22] ${roundedClass} pp-combat-flash-layer--philip-summon`}
          />
        </div>
      );
    }
    /* 능력 발동 이펙트 — 디너(필드 소환·마주 패시브 맺음, 핑크) */
    if (snap.kind === "dinnerSummon") {
      return (
        <div
          key={`${slotKey}-${snap.id}-dinner-wrap`}
          className={`pointer-events-none absolute inset-0 z-[22] overflow-visible ${roundedClass}`}
          aria-hidden
        >
          <div
            key={`${slotKey}-${snap.id}-dinner-aura`}
            className={`pp-combat-flash-layer--dinner-summon-aura pointer-events-none absolute -inset-12 z-[21] ${roundedClass}`}
          />
          <div
            key={`${slotKey}-${snap.id}-dinner-inner`}
            className={`pointer-events-none absolute inset-0 z-[22] ${roundedClass} pp-combat-flash-layer--dinner-summon`}
          />
        </div>
      );
    }
    /* 능력 발동 이펙트 — 철기병(필드 소환) */
    if (snap.kind === "cheolgibyeongSummon") {
      return (
        <div
          key={`${slotKey}-${snap.id}-cheol-summon-wrap`}
          className={`pointer-events-none absolute inset-0 z-[22] overflow-visible ${roundedClass}`}
          aria-hidden
        >
          <div
            key={`${slotKey}-${snap.id}-cheol-summon-aura`}
            className={`pp-combat-flash-layer--cheolgibyeong-summon-aura pointer-events-none absolute -inset-12 z-[21] ${roundedClass}`}
          />
          <div
            key={`${slotKey}-${snap.id}-cheol-summon-inner`}
            className={`pointer-events-none absolute inset-0 z-[22] ${roundedClass} pp-combat-flash-layer--cheolgibyeong-summon`}
          />
        </div>
      );
    }
    /* 능력 발동 이펙트 — 렴초(필드 소환, 베이지 — 철기병과 동형 타이밍·구조) */
    if (snap.kind === "ryeomchoSummon") {
      return (
        <div
          key={`${slotKey}-${snap.id}-ryeomcho-summon-wrap`}
          className={`pointer-events-none absolute inset-0 z-[22] overflow-visible ${roundedClass}`}
          aria-hidden
        >
          <div
            key={`${slotKey}-${snap.id}-ryeomcho-summon-aura`}
            className={`pp-combat-flash-layer--ryeomcho-summon-aura pointer-events-none absolute -inset-12 z-[21] ${roundedClass}`}
          />
          <div
            key={`${slotKey}-${snap.id}-ryeomcho-summon-inner`}
            className={`pointer-events-none absolute inset-0 z-[22] ${roundedClass} pp-combat-flash-layer--ryeomcho-summon`}
          />
        </div>
      );
    }
    /* 능력 발동 이펙트 — 다이아고(필드 소환, 연두 — 철기병과 동형 레이어·아군 동시 발동) */
    if (snap.kind === "diagoSummon") {
      return (
        <div
          key={`${slotKey}-${snap.id}-diago-summon-wrap`}
          className={`pointer-events-none absolute inset-0 z-[22] overflow-visible ${roundedClass}`}
          aria-hidden
        >
          <div
            key={`${slotKey}-${snap.id}-diago-summon-aura`}
            className={`pp-combat-flash-layer--diago-summon-aura pointer-events-none absolute -inset-12 z-[21] ${roundedClass}`}
          />
          <div
            key={`${slotKey}-${snap.id}-diago-summon-inner`}
            className={`pointer-events-none absolute inset-0 z-[22] ${roundedClass} pp-combat-flash-layer--diago-summon`}
          />
        </div>
      );
    }
    /* 능력 발동 이펙트 — 검은 황제(필드 소환, 다이아고와 동형·회색 톤, 아군 전원 동시) */
    if (snap.kind === "geomeunHwangjeSummon") {
      return (
        <div
          key={`${slotKey}-${snap.id}-geomeun-hwangje-summon-wrap`}
          className={`pointer-events-none absolute inset-0 z-[22] overflow-visible ${roundedClass}`}
          aria-hidden
        >
          <div
            key={`${slotKey}-${snap.id}-geomeun-hwangje-summon-aura`}
            className={`pp-combat-flash-layer--geomeun-hwangje-summon-aura pointer-events-none absolute -inset-12 z-[21] ${roundedClass}`}
          />
          <div
            key={`${slotKey}-${snap.id}-geomeun-hwangje-summon-inner`}
            className={`pointer-events-none absolute inset-0 z-[22] ${roundedClass} pp-combat-flash-layer--geomeun-hwangje-summon`}
          />
        </div>
      );
    }
    /* 능력 발동 이펙트 — 아이언 키위(필드 소환, 매우 밝은 회색 — 다이아고와 동형·아군 전원 동시) */
    if (snap.kind === "ironKiwiSummon") {
      return (
        <div
          key={`${slotKey}-${snap.id}-iron-kiwi-summon-wrap`}
          className={`pointer-events-none absolute inset-0 z-[22] overflow-visible ${roundedClass}`}
          aria-hidden
        >
          <div
            key={`${slotKey}-${snap.id}-iron-kiwi-summon-aura`}
            className={`pp-combat-flash-layer--iron-kiwi-summon-aura pointer-events-none absolute -inset-8 z-[21] ${roundedClass}`}
          />
          <div
            key={`${slotKey}-${snap.id}-iron-kiwi-summon-inner`}
            className={`pointer-events-none absolute inset-0 z-[22] ${roundedClass} pp-combat-flash-layer--iron-kiwi-summon`}
          />
        </div>
      );
    }
    /* 능력 발동 이펙트 — 파이레드(필드 패시브 연동, 붉은 톤) */
    if (snap.kind === "pyredSummon") {
      return (
        <div
          key={`${slotKey}-${snap.id}-pyred-summon-wrap`}
          className={`pointer-events-none absolute inset-0 z-[22] overflow-visible ${roundedClass}`}
          aria-hidden
        >
          <div
            key={`${slotKey}-${snap.id}-pyred-summon-aura`}
            className={`pp-combat-flash-layer--pyred-summon-aura pointer-events-none absolute -inset-12 z-[21] ${roundedClass}`}
          />
          <div
            key={`${slotKey}-${snap.id}-pyred-summon-inner`}
            className={`pointer-events-none absolute inset-0 z-[22] ${roundedClass} pp-combat-flash-layer--pyred-summon`}
          />
        </div>
      );
    }
    /* 능력 발동 이펙트 — 모닝 무드(필드 패시브 연동, 연두 톤) */
    if (snap.kind === "morningMoodSummon") {
      return (
        <div
          key={`${slotKey}-${snap.id}-morning-mood-summon-wrap`}
          className={`pointer-events-none absolute inset-0 z-[22] overflow-visible ${roundedClass}`}
          aria-hidden
        >
          <div
            key={`${slotKey}-${snap.id}-morning-mood-summon-aura`}
            className={`pp-combat-flash-layer--morning-mood-summon-aura pointer-events-none absolute -inset-12 z-[21] ${roundedClass}`}
          />
          <div
            key={`${slotKey}-${snap.id}-morning-mood-summon-inner`}
            className={`pointer-events-none absolute inset-0 z-[22] ${roundedClass} pp-combat-flash-layer--morning-mood-summon`}
          />
        </div>
      );
    }
    /* 능력 발동 이펙트 — 시작의 나무(필드 패시브 연동, 녹색 톤) */
    if (snap.kind === "startingTreeSummon") {
      return (
        <div
          key={`${slotKey}-${snap.id}-starting-tree-summon-wrap`}
          className={`pointer-events-none absolute inset-0 z-[22] overflow-visible ${roundedClass}`}
          aria-hidden
        >
          <div
            key={`${slotKey}-${snap.id}-starting-tree-summon-aura`}
            className={`pp-combat-flash-layer--starting-tree-summon-aura pointer-events-none absolute -inset-12 z-[21] ${roundedClass}`}
          />
          <div
            key={`${slotKey}-${snap.id}-starting-tree-summon-inner`}
            className={`pointer-events-none absolute inset-0 z-[22] ${roundedClass} pp-combat-flash-layer--starting-tree-summon`}
          />
        </div>
      );
    }
    /* 능력 발동 이펙트 — 스펠 No.7 언덕!(적 유닛 적중, 밝은 하늘·시안) */
    if (snap.kind === "eondeokSpell") {
      return (
        <div
          key={`${slotKey}-${snap.id}-eondeok-spell-wrap`}
          className={`pointer-events-none absolute inset-0 z-[22] overflow-visible ${roundedClass}`}
          aria-hidden
        >
          <div
            key={`${slotKey}-${snap.id}-eondeok-spell-aura`}
            className={`pp-combat-flash-layer--eondeok-spell-aura pointer-events-none absolute -inset-12 z-[21] ${roundedClass}`}
          />
          <div
            key={`${slotKey}-${snap.id}-eondeok-spell-inner`}
            className={`pointer-events-none absolute inset-0 z-[22] ${roundedClass} pp-combat-flash-layer--eondeok-spell`}
          />
        </div>
      );
    }
    /* 능력 발동 이펙트 — 스펠 방어막 필드 배치(동일 진영 유닛, 고스톤과 동형·녹색) */
    if (snap.kind === "spellBangEomakAllyPulse") {
      return (
        <div
          key={`${slotKey}-${snap.id}-bangeomak-ally-wrap`}
          className={`pointer-events-none absolute inset-0 z-[22] overflow-visible ${roundedClass}`}
          aria-hidden
        >
          <div
            key={`${slotKey}-${snap.id}-bangeomak-ally-aura`}
            className={`pp-combat-flash-layer--spell-bangeomak-ally-pulse-aura pointer-events-none absolute -inset-12 z-[21] ${roundedClass}`}
          />
          <div
            key={`${slotKey}-${snap.id}-bangeomak-ally-inner`}
            className={`pointer-events-none absolute inset-0 z-[22] ${roundedClass} pp-combat-flash-layer--spell-bangeomak-ally-pulse`}
          />
        </div>
      );
    }
    /* 능력 발동 이펙트 — 스펠 집중 사격 필드 배치(동일 진영 유닛, 고스톤과 동형·붉은색) */
    if (snap.kind === "spellJipjungAllyPulse") {
      return (
        <div
          key={`${slotKey}-${snap.id}-jipjung-ally-wrap`}
          className={`pointer-events-none absolute inset-0 z-[22] overflow-visible ${roundedClass}`}
          aria-hidden
        >
          <div
            key={`${slotKey}-${snap.id}-jipjung-ally-aura`}
            className={`pp-combat-flash-layer--spell-jipjung-ally-pulse-aura pointer-events-none absolute -inset-12 z-[21] ${roundedClass}`}
          />
          <div
            key={`${slotKey}-${snap.id}-jipjung-ally-inner`}
            className={`pointer-events-none absolute inset-0 z-[22] ${roundedClass} pp-combat-flash-layer--spell-jipjung-ally-pulse`}
          />
        </div>
      );
    }
    /* 능력 발동 이펙트 — 스펠 No.47 철벽 필드 배치(동일 진영 유닛, 밝은 흰·슬레이트 톤) */
    if (snap.kind === "spellCheolbyeokAllyPulse") {
      return (
        <div
          key={`${slotKey}-${snap.id}-cheolbyeok-ally-wrap`}
          className={`pointer-events-none absolute inset-0 z-[22] overflow-visible ${roundedClass}`}
          aria-hidden
        >
          <div
            key={`${slotKey}-${snap.id}-cheolbyeok-ally-aura`}
            className={`pp-combat-flash-layer--spell-cheolbyeok-ally-pulse-aura pointer-events-none absolute -inset-12 z-[21] ${roundedClass}`}
          />
          <div
            key={`${slotKey}-${snap.id}-cheolbyeok-ally-inner`}
            className={`pointer-events-none absolute inset-0 z-[22] ${roundedClass} pp-combat-flash-layer--spell-cheolbyeok-ally-pulse`}
          />
        </div>
      );
    }
    /* 능력 발동 이펙트 — 스펠 No.26 휴게소의 안식(고스톤과 동형·따뜻한 금색) */
    if (snap.kind === "spellHyugesojauiAnsikAllyPulse") {
      return (
        <div
          key={`${slotKey}-${snap.id}-hyugesojaui-wrap`}
          className={`pointer-events-none absolute inset-0 z-[22] overflow-visible ${roundedClass}`}
          aria-hidden
        >
          <div
            key={`${slotKey}-${snap.id}-hyugesojaui-aura`}
            className={`pp-combat-flash-layer--spell-hyugesojaui-ansik-ally-pulse-aura pointer-events-none absolute -inset-12 z-[21] ${roundedClass}`}
          />
          <div
            key={`${slotKey}-${snap.id}-hyugesojaui-inner`}
            className={`pointer-events-none absolute inset-0 z-[22] ${roundedClass} pp-combat-flash-layer--spell-hyugesojaui-ansik-ally-pulse`}
          />
        </div>
      );
    }
    /* 능력 발동 이펙트 — 스펠 No.30 비즈니스 강도단(스펠 칸 배치·만료 — 메테오 동형·주황) */
    if (snap.kind === "businessGangSpellPulse") {
      return (
        <div
          key={`${slotKey}-${snap.id}-business-gang-wrap`}
          className={`pointer-events-none absolute inset-0 z-[22] overflow-visible ${roundedClass}`}
          aria-hidden
        >
          <div
            key={`${slotKey}-${snap.id}-business-gang-aura`}
            className={`pp-combat-flash-layer--business-gang-spell-pulse-aura--spell-land pointer-events-none absolute -inset-[4.75rem] z-[21] ${roundedClass}`}
          />
          <div
            key={`${slotKey}-${snap.id}-business-gang-inner`}
            className={`pointer-events-none absolute inset-0 z-[22] ${roundedClass} pp-combat-flash-layer--business-gang-spell-pulse--spell-land`}
          />
        </div>
      );
    }
    /* 능력 발동 이펙트 — 스펠 No.21 메테오(고스톤과 동형·주황빛) */
    if (snap.kind === "meteoSpellHit") {
      return (
        <div
          key={`${slotKey}-${snap.id}-meteo-wrap`}
          className={`pointer-events-none absolute inset-0 z-[22] overflow-visible ${roundedClass}`}
          aria-hidden
        >
          <div
            key={`${slotKey}-${snap.id}-meteo-aura`}
            className={`pp-combat-flash-layer--meteo-spell-hit-aura pointer-events-none absolute -inset-12 z-[21] ${roundedClass}`}
          />
          <div
            key={`${slotKey}-${snap.id}-meteo-inner`}
            className={`pointer-events-none absolute inset-0 z-[22] ${roundedClass} pp-combat-flash-layer--meteo-spell-hit`}
          />
        </div>
      );
    }
    /* 능력 발동 이펙트 — 스펠 No.34 하이퍼 빔(고스톤과 동형·노란색) */
    if (snap.kind === "hyperBeamSpellHit") {
      return (
        <div
          key={`${slotKey}-${snap.id}-hyper-beam-wrap`}
          className={`pointer-events-none absolute inset-0 z-[22] overflow-visible ${roundedClass}`}
          aria-hidden
        >
          <div
            key={`${slotKey}-${snap.id}-hyper-beam-aura`}
            className={`pp-combat-flash-layer--hyper-beam-spell-hit-aura pointer-events-none absolute -inset-12 z-[21] ${roundedClass}`}
          />
          <div
            key={`${slotKey}-${snap.id}-hyper-beam-inner`}
            className={`pointer-events-none absolute inset-0 z-[22] ${roundedClass} pp-combat-flash-layer--hyper-beam-spell-hit`}
          />
        </div>
      );
    }
    /* 능력 발동 이펙트 — 오리에트의 초상 보호막 / 로누 패시브 스펠 차단(고스톤과 동형·하늘색) */
    if (snap.kind === "orietShieldAllyPulse" || snap.kind === "ronuPassiveSpellBlock") {
      return (
        <div
          key={`${slotKey}-${snap.id}-${snap.kind}-oriet-sky-wrap`}
          className={`pointer-events-none absolute inset-0 z-[22] overflow-visible ${roundedClass}`}
          aria-hidden
        >
          <div
            key={`${slotKey}-${snap.id}-${snap.kind}-oriet-sky-aura`}
            className={`pp-combat-flash-layer--oriet-shield-ally-pulse-aura pointer-events-none absolute -inset-12 z-[21] ${roundedClass}`}
          />
          <div
            key={`${slotKey}-${snap.id}-${snap.kind}-oriet-sky-inner`}
            className={`pointer-events-none absolute inset-0 z-[22] ${roundedClass} pp-combat-flash-layer--oriet-shield-ally-pulse`}
          />
        </div>
      );
    }
    /* 능력 발동 이펙트 — 스펠 No.19 번개(적 유닛 적중, 파랑) */
    if (snap.kind === "beonggaeSpell") {
      return (
        <div
          key={`${slotKey}-${snap.id}-beonggae-spell-wrap`}
          className={`pointer-events-none absolute inset-0 z-[22] overflow-visible ${roundedClass}`}
          aria-hidden
        >
          <div
            key={`${slotKey}-${snap.id}-beonggae-spell-aura`}
            className={`pp-combat-flash-layer--beonggae-spell-aura pointer-events-none absolute -inset-12 z-[21] ${roundedClass}`}
          />
          <div
            key={`${slotKey}-${snap.id}-beonggae-spell-inner`}
            className={`pointer-events-none absolute inset-0 z-[22] ${roundedClass} pp-combat-flash-layer--beonggae-spell`}
          />
        </div>
      );
    }
    /* 능력 발동 이펙트 — 아이버슨(소환 대기 종료, 짙은 녹색) */
    if (snap.kind === "iversonAttackReady") {
      return (
        <div
          key={`${slotKey}-${snap.id}-iverson-ready-wrap`}
          className={`pointer-events-none absolute inset-0 z-[22] overflow-visible ${roundedClass}`}
          aria-hidden
        >
          <div
            key={`${slotKey}-${snap.id}-iverson-ready-aura`}
            className={`pp-combat-flash-layer--iverson-attack-ready-aura pointer-events-none absolute -inset-12 z-[21] ${roundedClass}`}
          />
          <div
            key={`${slotKey}-${snap.id}-iverson-ready-inner`}
            className={`pointer-events-none absolute inset-0 z-[22] ${roundedClass} pp-combat-flash-layer--iverson-attack-ready`}
          />
        </div>
      );
    }
    /* 패키 처치 저주 — 필립 소환(능력 발동)과 동일 레이어 구조·inset, 색만 패키(노랑·주황) */
    if (snap.kind === "pakkiDeathCurse") {
      return (
        <div
          key={`${slotKey}-${snap.id}-pakki-death-wrap`}
          className={`pointer-events-none absolute inset-0 z-[22] overflow-visible ${roundedClass}`}
          aria-hidden
        >
          <div
            key={`${slotKey}-${snap.id}-pakki-aura`}
            className={`pp-combat-flash-layer--pakki-death-curse-aura pointer-events-none absolute -inset-12 z-[21] ${roundedClass}`}
          />
          <div
            key={`${slotKey}-${snap.id}-pakki-inner`}
            className={`pointer-events-none absolute inset-0 z-[22] ${roundedClass} pp-combat-flash-layer--pakki-death-curse`}
          />
        </div>
      );
    }
    /* 능력 발동 이펙트 — 메리 [방어력 +400] 패시브(아이언 키위 소환과 동형·밝은 회색) */
    if (snap.kind === "maryDefenseBuff") {
      return (
        <div
          key={`${slotKey}-${snap.id}-mary-defense-wrap`}
          className={`pointer-events-none absolute inset-0 z-[22] overflow-visible ${roundedClass}`}
          aria-hidden
        >
          <div
            key={`${slotKey}-${snap.id}-mary-defense-aura`}
            className={`pp-combat-flash-layer--iron-kiwi-summon-aura pointer-events-none absolute -inset-8 z-[21] ${roundedClass}`}
          />
          <div
            key={`${slotKey}-${snap.id}-mary-defense-inner`}
            className={`pointer-events-none absolute inset-0 z-[22] ${roundedClass} pp-combat-flash-layer--iron-kiwi-summon`}
          />
        </div>
      );
    }
    /* 능력 발동 이펙트 — 에리스티나(반짓고리 스킬로 아군과 연결 시) */
    if (snap.kind === "eristinaBanjitgori") {
      return (
        <div
          key={`${slotKey}-${snap.id}-eristina-wrap`}
          className={`pointer-events-none absolute inset-0 z-[22] overflow-visible ${roundedClass}`}
          aria-hidden
        >
          <div
            key={`${slotKey}-${snap.id}-eristina-aura`}
            className={`pp-combat-flash-layer--eristina-banjitgori-aura pointer-events-none absolute -inset-12 z-[21] ${roundedClass}`}
          />
          <div
            key={`${slotKey}-${snap.id}-eristina-inner`}
            className={`pointer-events-none absolute inset-0 z-[22] ${roundedClass} pp-combat-flash-layer--eristina-banjitgori`}
          />
        </div>
      );
    }
    /* 능력 발동 이펙트 — 라임(방울 보호막으로 아군과 연결 시, 밝은 하늘색) */
    if (snap.kind === "limeBubbleShield") {
      return (
        <div
          key={`${slotKey}-${snap.id}-lime-bubble-wrap`}
          className={`pointer-events-none absolute inset-0 z-[22] overflow-visible ${roundedClass}`}
          aria-hidden
        >
          <div
            key={`${slotKey}-${snap.id}-lime-bubble-aura`}
            className={`pp-combat-flash-layer--lime-bubble-shield-aura pointer-events-none absolute -inset-12 z-[21] ${roundedClass}`}
          />
          <div
            key={`${slotKey}-${snap.id}-lime-bubble-inner`}
            className={`pointer-events-none absolute inset-0 z-[22] ${roundedClass} pp-combat-flash-layer--lime-bubble-shield`}
          />
        </div>
      );
    }
    if (snap.kind === "philipBasicHit") {
      return (
        <div
          key={`${slotKey}-${snap.id}-philip-hit-wrap`}
          className={`pointer-events-none absolute inset-0 z-[22] overflow-visible ${roundedClass}`}
          aria-hidden
        >
          <div
            key={`${slotKey}-${snap.id}-philip-dmg`}
            className={`pointer-events-none absolute inset-0 z-[22] ${roundedClass} pp-combat-flash-layer--damage`}
          />
          <div className="pointer-events-none absolute inset-0 z-[23] flex items-center justify-center overflow-visible">
            <div className="relative flex h-full min-h-0 w-full min-w-0 items-center justify-center">
              <div
                key={`${slotKey}-${snap.id}-philip-wave`}
                className="pp-philip-hit-wave pointer-events-none absolute aspect-square w-[44%] max-w-[5.5rem] rounded-full"
              />
              <div
                key={`${slotKey}-${snap.id}-philip-core`}
                className="pp-philip-hit-core pointer-events-none absolute aspect-square w-[30%] max-w-[3.75rem] rounded-full"
              />
            </div>
          </div>
        </div>
      );
    }
    if (snap.kind === "cheolgibyeongBasicHit") {
      return (
        <div
          key={`${slotKey}-${snap.id}-cheol-hit-wrap`}
          className={`pointer-events-none absolute inset-0 z-[22] overflow-visible ${roundedClass}`}
          aria-hidden
        >
          <div
            key={`${slotKey}-${snap.id}-cheol-dmg`}
            className={`pointer-events-none absolute inset-0 z-[22] ${roundedClass} pp-combat-flash-layer--damage`}
          />
          <div className="pointer-events-none absolute inset-0 z-[23] flex items-center justify-center overflow-visible">
            <div className="relative flex h-full min-h-0 w-full min-w-0 items-center justify-center">
              <div
                key={`${slotKey}-${snap.id}-cheol-wave`}
                className="pp-cheolgibyeong-hit-wave pointer-events-none absolute aspect-square w-[44%] max-w-[5.5rem] rounded-full"
              />
              <div
                key={`${slotKey}-${snap.id}-cheol-core`}
                className="pp-cheolgibyeong-hit-core pointer-events-none absolute aspect-square w-[30%] max-w-[3.75rem] rounded-full"
              />
            </div>
          </div>
        </div>
      );
    }
    const layer =
      snap.kind === "damage" ? "pp-combat-flash-layer--damage" : "pp-combat-flash-layer--heal";
    return (
      <div
        key={`${slotKey}-${snap.id}`}
        className={`pointer-events-none absolute inset-0 z-[22] ${roundedClass} ${layer}`}
        aria-hidden
      />
    );
  };

  const unitSlotOuterClass = "relative z-0 isolate shrink-0 overflow-visible rounded-[8px]";
  /** 데미지·회복·안내 플로팅 — 필드 체력행(z 이슈) 위에 반드시 보이도록 슬롯 스택 최상단 */
  const fieldSlotCombatPopupOverlayClass =
    "pointer-events-none absolute inset-0 z-[80] overflow-visible rounded-[8px]";

  const finishOpeningInstantly = useCallback((firstTurn: "A" | "B") => {
    setState(prev => {
      if (!prev) return prev;
      const deck = [...prev.deckCards];
      const handA = [...prev.playerA.hand];
      const handB = [...prev.playerB.hand];
      const peek = prev.simpanPeekReveal;
      if (peek?.peekKind === "opening") {
        const pending = stripPpSimHandNewGlow(peek.pendingCard);
        if (peek.player === "A") handA.push(pending);
        else handB.push(pending);
      }
      while (handA.length < 4 && deck.length > 0) handA.push(deck.pop()!);
      while (handB.length < 4 && deck.length > 0) handB.push(deck.pop()!);
      return {
        ...prev,
        deckCards: deck,
        simpanPeekReveal: null,
        playerA: { ...prev.playerA, hand: handA, tokens: 4 },
        playerB: { ...prev.playerB, hand: handB, tokens: 4 },
        currentTurn: firstTurn,
        turnTimeLeft: 60,
      };
    });
    setSimpanPeekFly(null);
    setCoinTossDisplay(null);
  }, []);

  const skipOpeningInitialization = useCallback(() => {
    openingSkipRequestedRef.current = true;
    if (openingCoinFlipIntervalRef.current != null) {
      clearInterval(openingCoinFlipIntervalRef.current);
      openingCoinFlipIntervalRef.current = null;
    }
    if (simpanPeekRevealTimerRef.current != null) {
      window.clearTimeout(simpanPeekRevealTimerRef.current);
      simpanPeekRevealTimerRef.current = null;
    }
    openingDrawWaitRef.current?.();
    openingDrawWaitRef.current = null;
    setSimpanPeekFly(null);
  }, []);

  const runInitialization = async (initialDeck: CardRow[]) => {
    if (!initialDeck || initialDeck.length === 0) return;

    openingSkipRequestedRef.current = false;
    setIsInitializing(true);
    setCoinTossDisplay(null);
    setSelectedSlot(null);
    setAttackingSlot(null);
    setPendingSecondaryAttack(null);
    startingWraithChainPendingRef.current = null;
    startingWraithRestoreOnMountDoneRef.current = false;
    setPendingStartingWraithChainKill(null);
    setPendingStartingWraithChainPlayerHp(false);
    oneNightWagerPendingRef.current = null;
    oneNightWagerRestoreOnMountDoneRef.current = false;
    setOneNightWagerModal(null);
    setSpellUsageHiddenRevealCards(null);
    oneNightWagerSequenceActiveRef.current = false;
    spellUsagePendingRef.current = null;
    spellUsageRestoreOnMountDoneRef.current = false;
    spellUsageMotionActiveRef.current = false;
    setSpellUsageReveal(null);
    setSpellUsageFly(null);
    setIsGuihwanRewindOpen(false);
    guihwanRestoreOnMountDoneRef.current = false;
    bubbleStationRestoreOnMountDoneRef.current = false;
    witchTarotSequenceRef.current = null;
    witchTarotSequenceActiveRef.current = false;
    setWitchTarotFlowActive(false);
    setWitchTarotCoin(null);
    witchTarotCoinStartScheduledRef.current = false;
    witchTarotRestoreOnMountDoneRef.current = false;
    witchTarotFinishingRef.current = false;
    witchTarotDiscardPlayerRef.current = null;
    setWitchTarotDiscardPlayer(null);
    if (witchTarotCoinFlipIntervalRef.current != null) {
      window.clearInterval(witchTarotCoinFlipIntervalRef.current);
      witchTarotCoinFlipIntervalRef.current = null;
    }
    setPendingAttackSelection(null);
    setPendingLibutyAllEnemiesAttack(null);
    setPendingSkill(null);
    setGonchungHiddenReveal(null);
    if (gonchungHiddenRevealTimerRef.current != null) {
      window.clearTimeout(gonchungHiddenRevealTimerRef.current);
      gonchungHiddenRevealTimerRef.current = null;
    }
    setAttackOptionOverride(null);
    setIsRewindModalOpen(false);
    setIsSettingsOpen(false);
    setIsDrawModalOpen(false);
    setWinner(null);
    Object.values(flashClearTimeoutsRef.current).forEach(t => window.clearTimeout(t));
    flashClearTimeoutsRef.current = {};
    cheolgibyeongAllyFlashDelayTimeoutsRef.current.forEach(t => window.clearTimeout(t));
    cheolgibyeongAllyFlashDelayTimeoutsRef.current = [];
    setFlashOverlay({});
    clearGeunyangMojaHitFlame();
    clearDiagoHitFlame();
    clearMomoHitFlame();
    clearGhostoneClawHit();
    clearIversonClawHit();
    clearEristinaHitLine();
    lastDarkKnightSoulGaugeBySlotRef.current = {};
    setDarkKnightGaugeChargePulseBySlot({});
    setCombatPopups({});
    setSimpanPeekFly(null);
    openingDrawWaitRef.current = null;
    
    let currentDeck = [...initialDeck].sort(() => Math.random() - 0.5);

    setState({
      currentTurn: null,
      turnCount: 1,
      globalTurnCount: 1, 
      elapsedTime: 0, 
      turnTimeLeft: 60,
      settings: { isTimeLimitEnabled: false, isOpponentCardFlipped: false, drawMode: "RANDOM" },
      deckCards: currentDeck,
      rewindCards: [],
      unitCombatStats: {},
      unitStatsOrder: [],
      spellDeployLog: [],
      simpanHandChoice: null,
      simpanHandChoiceQueue: [],
      simpanPeekReveal: null,
      simpanPeekQueue: [],
      simpanPeekTick: 0,
      witchTarotPending: null,
      legendarySwordPending: null,
      startingWraithChainPending: null,
      oneNightWagerPending: null,
      spellUsagePending: null,
      guihwanPending: null,
      bubbleStationPending: null,
      playerA: { hp: 2000, tokens: 0, hand: [], hasDrawnThisTurn: false, attacksThisTurn: 0, hasBeenAttackedThisTurn: false, field: { is: null, m: null, os: null, spellStack: [] } },
      playerB: { hp: 2000, tokens: 0, hand: [], hasDrawnThisTurn: false, attacksThisTurn: 0, hasBeenAttackedThisTurn: false, field: { is: null, m: null, os: null, spellStack: [] } },
    });

    const OPENING_DRAW_ANIMATION_TIMEOUT_MS =
      OPENING_PEEK_PREVIEW_MS + OPENING_PEEK_HAND_FLY_MS + 200;

    const skippableDelay = (ms: number) =>
      new Promise<void>(resolve => {
        if (openingSkipRequestedRef.current) {
          resolve();
          return;
        }
        const started = Date.now();
        const tick = () => {
          if (openingSkipRequestedRef.current) {
            resolve();
            return;
          }
          if (Date.now() - started >= ms) {
            resolve();
            return;
          }
          window.setTimeout(tick, 40);
        };
        window.setTimeout(tick, Math.min(40, ms));
      });

    const abortOpeningIfSkipped = (): boolean => {
      if (!openingSkipRequestedRef.current) return false;
      const firstTurn: "A" | "B" = Math.random() < 0.5 ? "A" : "B";
      finishOpeningInstantly(firstTurn);
      setIsInitializing(false);
      openingSkipRequestedRef.current = false;
      return true;
    };

    await skippableDelay(800);
    if (abortOpeningIfSkipped()) return;

    const revealOpeningDraw = (player: "A" | "B", card: CardRow): Promise<void> =>
      new Promise(resolve => {
        if (openingSkipRequestedRef.current) {
          resolve();
          return;
        }
        let safetyId: number | null = null;
        const finish = () => {
          if (openingDrawWaitRef.current !== finish) return;
          openingDrawWaitRef.current = null;
          if (safetyId != null) window.clearTimeout(safetyId);
          resolve();
        };
        openingDrawWaitRef.current = finish;
        safetyId = window.setTimeout(finish, OPENING_DRAW_ANIMATION_TIMEOUT_MS);
        setState(prev => {
          if (!prev) {
            finish();
            return prev;
          }
          return {
            ...prev,
            deckCards: currentDeck,
            simpanPeekReveal: {
              player,
              pendingCard: stripPpSimHandNewGlow(card),
              peekKind: "opening",
            },
            simpanPeekTick: (prev.simpanPeekTick ?? 0) + 1,
          };
        });
      });

    for (let i = 0; i < 4; i++) {
      if (openingSkipRequestedRef.current) break;
      const cardA = currentDeck.pop()!;
      await revealOpeningDraw("A", cardA);
      if (openingSkipRequestedRef.current) break;

      const cardB = currentDeck.pop()!;
      await revealOpeningDraw("B", cardB);
    }

    if (abortOpeningIfSkipped()) return;

    await skippableDelay(500);
    if (abortOpeningIfSkipped()) return;

    for (let i = 1; i <= 4; i++) {
      if (openingSkipRequestedRef.current) break;
      setState(prev => ({
        ...prev!,
        playerA: { ...prev!.playerA, tokens: i },
        playerB: { ...prev!.playerB, tokens: i },
      }));
      await skippableDelay(250);
    }

    if (abortOpeningIfSkipped()) return;

    await skippableDelay(600);
    if (abortOpeningIfSkipped()) return;

    setCoinTossDisplay("FLIPPING");

    openingCoinFlipIntervalRef.current = setInterval(() => {
      setCoinFlipSide(prev => (prev === "A" ? "B" : "A"));
    }, 100);

    await skippableDelay(1500);
    if (openingCoinFlipIntervalRef.current != null) {
      clearInterval(openingCoinFlipIntervalRef.current);
      openingCoinFlipIntervalRef.current = null;
    }

    if (abortOpeningIfSkipped()) return;

    const firstTurn: "A" | "B" = Math.random() < 0.5 ? "A" : "B";
    setCoinTossDisplay(firstTurn);

    await skippableDelay(2000);

    if (abortOpeningIfSkipped()) return;

    setState(prev => ({ ...prev!, currentTurn: firstTurn, turnTimeLeft: 60 }));
    setCoinTossDisplay(null);
    setIsInitializing(false);
  };

  const isGameActive = state?.currentTurn !== null && !winner && !isInitializing;
  
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGameActive) {
      interval = setInterval(() => {
        setState(prev => {
          if (!prev) return prev;
          
          let nextTimeLeft = prev.turnTimeLeft;
          if (prev.settings.isTimeLimitEnabled && prev.turnTimeLeft > 0) {
            nextTimeLeft -= 1;
          }

          return { 
            ...prev, 
            elapsedTime: (prev.elapsedTime || 0) + 1,
            turnTimeLeft: nextTimeLeft
          };
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isGameActive]);

  useEffect(() => {
    if (state?.settings?.isTimeLimitEnabled && state.turnTimeLeft === 0 && state.currentTurn && !winner && !isInitializing) {
      if (state && state.currentTurn) {
        handleEndTurn(state.currentTurn);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.turnTimeLeft]); 

  /** No.16 전설의 검 — 무장·충전 완료(또는 [혼란] 해제) 시 자신의 턴에 연격 개시 */
  useEffect(() => {
    if (!state?.currentTurn || winner || isInitializing || pendingLegendarySwordStrike) return;

    const owner = state.currentTurn;
    const ownerField = owner === "A" ? state.playerA.field : state.playerB.field;

    for (const swordSlot of ["is", "m", "os"] as const) {
      const sword = ownerField[swordSlot];
      if (!sword || sword.name !== UNIT.LEGENDARY_SWORD) continue;
      if (!isLegendarySwordArmed(sword)) continue;

      const facingOpp = getLegendarySwordFacingOppAtSlot(
        owner,
        swordSlot,
        state.playerA.field,
        state.playerB.field
      );
      if (isLegendarySwordAbilityPausedByConfusion(sword, facingOpp)) continue;

      const openKey = `${state.turnCount}-${owner}-${swordSlot}`;
      if (legendarySwordAutoOpenResolvedKeyRef.current === openKey) continue;
      legendarySwordAutoOpenResolvedKeyRef.current = openKey;

      playLegendarySwordStrikeOpenOnSelf(owner, swordSlot);

      setState(prev => {
        if (!prev || prev.currentTurn !== owner) return prev;
        const ownerKey = owner === "A" ? "playerA" : "playerB";
        const newOwner = { ...prev[ownerKey], field: { ...prev[ownerKey].field } };
        const s = newOwner.field[swordSlot];
        if (!s || s.name !== UNIT.LEGENDARY_SWORD) return prev;

        if (!isLegendarySwordArmed(s)) return prev;

        newOwner.field[swordSlot] = { ...s, legendarySwordArmed: false };
        return { ...prev, [ownerKey]: newOwner };
      });

      applyLegendarySwordStrikePending({
        ownerPlayer: owner,
        swordSlot,
        phase: 1,
        hitTargets: [],
      });
      break;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state?.currentTurn,
    state?.turnCount,
    state?.playerA.field.is,
    state?.playerA.field.m,
    state?.playerA.field.os,
    state?.playerB.field.is,
    state?.playerB.field.m,
    state?.playerB.field.os,
    winner,
    isInitializing,
    pendingLegendarySwordStrike,
  ]);

  useEffect(() => {
    if (!state?.simpanPeekReveal) {
      simpanPeekSkipToFlyRef.current = null;
      return;
    }

    simpanPeekRevealTransitionStartedRef.current = false;

    const peekKind = state.simpanPeekReveal.peekKind ?? "simpan";
    const previewMs =
      peekKind === "opening"
        ? OPENING_PEEK_PREVIEW_MS
        : peekKind === "teslaDrawRewind"
          ? TESLA_DRAW_PEEK_MS
          : SIMPAN_PEEK_PREVIEW_MS;
    const flyMs =
      peekKind === "opening" ? OPENING_PEEK_HAND_FLY_MS : SIMPAN_PEEK_HAND_FLY_MS;

    const run = () => {
      if (simpanPeekRevealTransitionStartedRef.current) return;
      const snap = simulationStateRef.current;
      if (!snap?.simpanPeekReveal) return;
      simpanPeekRevealTransitionStartedRef.current = true;

      const { player, pendingCard } = snap.simpanPeekReveal;
      const ps = player === "A" ? snap.playerA : snap.playerB;
      const targetIndex = ps.hand.length;

      const fromEl = simpanPeekCardMeasureRef.current;
      const toEl =
        player === "A"
          ? handSlotOuterRefsA.current[targetIndex]
          : handSlotOuterRefsB.current[targetIndex];
      const fr = fromEl?.getBoundingClientRect();
      const tr = toEl?.getBoundingClientRect();

      if (!fr || !tr || fr.width < 2 || tr.width < 2) {
        setState(prev => {
          if (!prev?.simpanPeekReveal) {
            simpanPeekRevealTransitionStartedRef.current = false;
            return prev;
          }
          const merged = completeSimpanPeekRevealToHand(prev, player, pendingCard);
          if (!merged) {
            simpanPeekRevealTransitionStartedRef.current = false;
            return prev;
          }
          if (witchTarotSequenceActiveRef.current) {
            simulationStateRef.current = merged;
          }
          return merged;
        });
        if (witchTarotSequenceActiveRef.current) {
          window.setTimeout(() => runWitchTarotAdvanceRef.current(), 0);
        }
        return;
      }

      queueMicrotask(() => {
        const s2 = simulationStateRef.current;
        if (
          !s2?.simpanPeekReveal ||
          s2.simpanPeekReveal.pendingCard !== pendingCard ||
          s2.simpanPeekReveal.player !== player
        ) {
          simpanPeekRevealTransitionStartedRef.current = false;
          return;
        }
        setSimpanPeekFly({
          player,
          pendingCard,
          from: { x: fr.left, y: fr.top, w: fr.width, h: fr.height },
          to: { x: tr.left, y: tr.top, w: tr.width, h: tr.height },
          phase: 0,
          peekTick: snap.simpanPeekTick ?? 0,
          flyMs,
          isOpening: peekKind === "opening",
        });
      });
    };

    const skip = () => {
      if (simpanPeekRevealTimerRef.current != null) {
        window.clearTimeout(simpanPeekRevealTimerRef.current);
        simpanPeekRevealTimerRef.current = null;
      }
      run();
    };

    simpanPeekSkipToFlyRef.current = peekKind === "opening" ? null : skip;

    if (previewMs <= 0) {
      const rafId = requestAnimationFrame(() => {
        run();
      });
      return () => {
        cancelAnimationFrame(rafId);
        simpanPeekSkipToFlyRef.current = null;
      };
    }

    const id = window.setTimeout(() => {
      simpanPeekRevealTimerRef.current = null;
      run();
    }, previewMs);
    simpanPeekRevealTimerRef.current = id;

    return () => {
      window.clearTimeout(id);
      simpanPeekRevealTimerRef.current = null;
      simpanPeekSkipToFlyRef.current = null;
    };
  }, [state?.simpanPeekReveal, state?.simpanPeekTick]);

  useLayoutEffect(() => {
    if (!simpanPeekFly || simpanPeekFly.phase !== 0) return;
    let cancelled = false;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (!cancelled) {
          setSimpanPeekFly(f => (f && f.phase === 0 ? { ...f, phase: 1 } : f));
        }
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [simpanPeekFly]);

  useEffect(() => {
    if (!simpanPeekFly || simpanPeekFly.phase !== 1) return;
    const peekTick = simpanPeekFly.peekTick;
    const player = simpanPeekFly.player;
    const pendingCard = simpanPeekFly.pendingCard;
    const flyMs = simpanPeekFly.flyMs ?? SIMPAN_PEEK_HAND_FLY_MS;
    const tid = window.setTimeout(() => {
      setSimpanPeekFly(null);
      setState(prev => {
        if (!prev?.simpanPeekReveal) return prev;
        const merged = completeSimpanPeekRevealToHand(prev, player, pendingCard, peekTick);
        if (merged && witchTarotSequenceActiveRef.current) {
          simulationStateRef.current = merged;
        }
        return merged ?? prev;
      });
      if (witchTarotSequenceActiveRef.current) {
        window.setTimeout(() => runWitchTarotAdvanceRef.current(), 0);
      }
    }, flyMs + 50);
    return () => window.clearTimeout(tid);
  }, [simpanPeekFly]);

  useLayoutEffect(() => {
    if (!danhaStealFly || danhaStealFly.phase !== 0) return;
    let cancelled = false;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (!cancelled) {
          setDanhaStealFly(f => (f && f.phase === 0 ? { ...f, phase: 1 } : f));
        }
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [danhaStealFly]);

  useEffect(() => {
    if (!danhaStealFly || danhaStealFly.phase !== 1) return;
    const flyMs = danhaStealFly.flyMs ?? DANHA_STEAL_HAND_FLY_MS;
    const tid = window.setTimeout(() => {
      const commit = danhaStealCommitRef.current;
      danhaStealCommitRef.current = null;
      setDanhaStealFly(null);
      if (!commit) {
        setPendingSkill(null);
        return;
      }
      setState(prev => {
        if (!prev) return prev;
        const vHand = commit.victimPlayer === "A" ? prev.playerA.hand : prev.playerB.hand;
        if (commit.victimHandIndex < 0 || commit.victimHandIndex >= vHand.length) return prev;
        const card = vHand[commit.victimHandIndex];
        if (!card) return prev;

        const ally = commit.caster === "A" ? prev.playerA : prev.playerB;
        if (ally.hand.length >= 6) return prev;

        const newVictimHand = [...vHand];
        newVictimHand.splice(commit.victimHandIndex, 1);
        const newAllyHand = [
          ...ally.hand,
          markPpSimHandDanhaStealArrival(
            stripPpSimHandDanhaStealArrival(stripPpSimHandNewGlow(card)),
            commit.arrivalGlowToken
          ),
        ];

        const slotKey = commit.slotKey;
        const newPlayerA = {
          ...prev.playerA,
          hand:
            commit.caster === "A"
              ? newAllyHand
              : commit.victimPlayer === "A"
                ? newVictimHand
                : prev.playerA.hand,
          field: { ...prev.playerA.field },
        };
        const newPlayerB = {
          ...prev.playerB,
          hand:
            commit.caster === "B"
              ? newAllyHand
              : commit.victimPlayer === "B"
                ? newVictimHand
                : prev.playerB.hand,
          field: { ...prev.playerB.field },
        };

        if (commit.caster === "A") {
          const u = newPlayerA.field[slotKey];
          if (u) {
            newPlayerA.field = {
              ...newPlayerA.field,
              [slotKey]: { ...u, danhaMagicHookConsumed: true },
            };
          }
        } else {
          const u = newPlayerB.field[slotKey];
          if (u) {
            newPlayerB.field = {
              ...newPlayerB.field,
              [slotKey]: { ...u, danhaMagicHookConsumed: true },
            };
          }
        }

        return { ...prev, playerA: newPlayerA, playerB: newPlayerB };
      });
      triggerCardFlash(
        `hand-${commit.caster}-${commit.targetHandIndex}`,
        "danhaMagicHook"
      );
      setPendingSkill(null);
    }, flyMs + 50);
    return () => window.clearTimeout(tid);
  }, [danhaStealFly, triggerCardFlash]);

  useEffect(() => {
    if (!spellUsageReveal) {
      spellUsageRevealTransitionStartedRef.current = false;
      spellUsageSkipToFlyRef.current = null;
      return;
    }

    spellUsageRevealTransitionStartedRef.current = false;
    const pending = spellUsagePendingRef.current;

    const clearSpellUsageTimers = () => {
      if (spellUsageRevealTimerRef.current != null) {
        window.clearTimeout(spellUsageRevealTimerRef.current);
        spellUsageRevealTimerRef.current = null;
      }
      if (spellUsageTeslaCounterTimerRef.current != null) {
        window.clearTimeout(spellUsageTeslaCounterTimerRef.current);
        spellUsageTeslaCounterTimerRef.current = null;
      }
      if (spellUsageTeslaBlackoutTimerRef.current != null) {
        window.clearTimeout(spellUsageTeslaBlackoutTimerRef.current);
        spellUsageTeslaBlackoutTimerRef.current = null;
      }
    };

    const persistedReveal = simulationStateRef.current?.spellUsagePending;
    const revealElapsed =
      persistedReveal?.phase === "centerReveal"
        ? Date.now() - persistedReveal.phaseStartedAt
        : 0;

    if (pending?.superTeslaCounter) {
      const cp = pending.superTeslaCounter.counterPlayer;
      spellUsageTeslaCounterTimerRef.current = window.setTimeout(() => {
        spellUsageTeslaCounterTimerRef.current = null;
        setSpellUsageTeslaFlipPlayer(cp);
        triggerCardFlash(`${cp}-spell`, "superTeslaSpellTrigger");
        pushInfoFloat(SPELL_USAGE_CENTER_KEY, "파괴됨", INFO_FLOAT_MS, "skyBlue");
        triggerCardFlash(SPELL_USAGE_CENTER_KEY, "legendarySwordSkill");
      }, Math.max(0, SUPER_TESLA_COUNTER_AT_MS - revealElapsed));
      spellUsageTeslaBlackoutTimerRef.current = window.setTimeout(() => {
        spellUsageTeslaBlackoutTimerRef.current = null;
        setSpellUsageTeslaHideOppCenterCard(true);
      }, Math.max(0, SUPER_TESLA_BLACKOUT_AT_MS - revealElapsed));
    }

    const runAfterPreview = () => {
      if (spellUsageRevealTransitionStartedRef.current) return;
      const snap = simulationStateRef.current;
      const pend = spellUsagePendingRef.current;
      if (!snap || !pend) return;
      spellUsageRevealTransitionStartedRef.current = true;

      if (pend.superTeslaCounter) {
        finishSpellUsageSequence();
        return;
      }

      const flyToSpellSlot =
        pend.mode === "placeSpellSlot" &&
        pend.flyToSpellSlotAfterReveal &&
        pend.targetPlayer;
      const flyToUnit =
        pend.flyToUnitAfterReveal &&
        pend.targetPlayer &&
        pend.unitSlot &&
        pend.mode === "handUnitTarget";

      if (flyToSpellSlot || flyToUnit) {
        const slot = flyToSpellSlot ? "spell" : pend.unitSlot!;
        const fromEl = spellUsageCardMeasureRef.current;
        const toEl = document.querySelector(
          `[data-field-drop][data-field-player="${pend.targetPlayer}"][data-field-slot="${slot}"]`
        ) as HTMLElement | null;
        const fr = fromEl?.getBoundingClientRect();
        const tr = toEl?.getBoundingClientRect();
        if (!fr || !tr || fr.width < 2 || tr.width < 2) {
          finishSpellUsageSequence();
          return;
        }
        queueMicrotask(() => {
          const from = { x: fr.left, y: fr.top, w: fr.width, h: fr.height };
          const to = flyToSpellSlot
            ? {
                x: tr.left + (tr.width - fr.width) / 2,
                y: tr.top + (tr.height - fr.height) / 2,
                w: fr.width,
                h: fr.height,
              }
            : { x: tr.left, y: tr.top, w: tr.width, h: tr.height };
          const flyMs = flyToSpellSlot ? SPELL_SLOT_PLACE_FLY_MS : SPELL_USAGE_HAND_FLY_MS;
          setState(s =>
            s?.spellUsagePending
              ? patchSpellUsagePending(s, {
                  ...s.spellUsagePending,
                  phase: "centerFly",
                  flyPhase: 0,
                  phaseStartedAt: Date.now(),
                })
              : s
          );
          setSpellUsageFly({
            casterPlayer: pend.casterPlayer,
            previewCard: pend.previewCard,
            targetPlayer: pend.targetPlayer!,
            unitSlot: slot,
            flyTarget: flyToSpellSlot ? "spellSlot" : "unit",
            centerShowsCardBack: flyToSpellSlot ? pend.centerShowsCardBack : undefined,
            from,
            to,
            phase: 0,
            flyMs,
          });
        });
        return;
      }

      finishSpellUsageSequence();
    };

    const fullPreviewMs = pending?.superTeslaCounter
      ? SPELL_USAGE_PREVIEW_TESLA_MS
      : SPELL_USAGE_PREVIEW_MS;
    const previewMs =
      persistedReveal?.phase === "centerReveal"
        ? Math.max(0, fullPreviewMs - revealElapsed)
        : fullPreviewMs;

    if (previewMs <= 0) {
      runAfterPreview();
      return () => {
        clearSpellUsageTimers();
        spellUsageSkipToFlyRef.current = null;
      };
    }

    const skipPreview = () => {
      clearSpellUsageTimers();
      runAfterPreview();
    };
    spellUsageSkipToFlyRef.current = skipPreview;

    spellUsageRevealTimerRef.current = window.setTimeout(() => {
      spellUsageRevealTimerRef.current = null;
      runAfterPreview();
    }, previewMs);

    return () => {
      clearSpellUsageTimers();
      spellUsageSkipToFlyRef.current = null;
    };
  }, [spellUsageReveal, spellUsageRevealTick, finishSpellUsageSequence]);

  useLayoutEffect(() => {
    if (!spellUsageFly || spellUsageFly.phase !== 0) return;
    let cancelled = false;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (!cancelled) {
          setSpellUsageFly(f => (f && f.phase === 0 ? { ...f, phase: 1 } : f));
        }
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [spellUsageFly]);

  useEffect(() => {
    if (!spellUsageFly || spellUsageFly.phase !== 1) return;
    const baseFlyMs = spellUsageFly.flyMs ?? SPELL_USAGE_HAND_FLY_MS;
    const waitMs = spellUsageFly.resumeRemainingMs ?? baseFlyMs + 50;
    const tid = window.setTimeout(() => {
      finishSpellUsageSequence();
    }, waitMs);
    return () => window.clearTimeout(tid);
  }, [spellUsageFly, finishSpellUsageSequence]);

  useEffect(() => {
    witchTarotRestoreOnMountDoneRef.current = false;
    legendarySwordRestoreOnMountDoneRef.current = false;
    startingWraithRestoreOnMountDoneRef.current = false;
    oneNightWagerRestoreOnMountDoneRef.current = false;
    spellUsageRestoreOnMountDoneRef.current = false;
    bubbleStationRestoreOnMountDoneRef.current = false;
    return () => {
      const snap = simulationStateRef.current;
      if (!snap || snap.currentTurn == null) return;
      const merged = mergeSimulationPersistedSequences(
        snap,
        witchTarotSequenceRef.current,
        witchTarotDiscardPlayerRef.current,
        witchTarotSequenceActiveRef.current,
        legendarySwordStrikePendingRef.current,
        startingWraithChainPendingRef.current,
        oneNightWagerPendingRef.current,
        oneNightWagerSequenceActiveRef.current
      );
      localStorage.setItem("pp_sim_save", JSON.stringify(merged));
    };
  }, []);

  useEffect(() => {
    if (!state || isInitializing) return;
    if (legendarySwordRestoreOnMountDoneRef.current) return;
    const pending = state.legendarySwordPending;
    if (!pending) return;

    legendarySwordRestoreOnMountDoneRef.current = true;
    const openKey = `${state.turnCount}-${pending.ownerPlayer}-${pending.swordSlot}`;
    legendarySwordAutoOpenResolvedKeyRef.current = openKey;
    applyLegendarySwordStrikePending({
      ownerPlayer: pending.ownerPlayer,
      swordSlot: pending.swordSlot,
      phase: Number(pending.phase) === 2 ? 2 : 1,
      hitTargets: Array.isArray(pending.hitTargets) ? pending.hitTargets : [],
    });
  }, [state, isInitializing, applyLegendarySwordStrikePending]);

  useEffect(() => {
    if (!state || isInitializing) return;
    if (startingWraithRestoreOnMountDoneRef.current) return;
    const pending = state.startingWraithChainPending;
    if (!pending) return;

    startingWraithRestoreOnMountDoneRef.current = true;
    applyStartingWraithChainPending(pending);
  }, [state, isInitializing, applyStartingWraithChainPending]);

  useEffect(() => {
    if (!state || isInitializing) return;
    if (witchTarotRestoreOnMountDoneRef.current) return;
    if (witchTarotFinishingRef.current) return;
    if (witchTarotSequenceActiveRef.current) return;
    if (spellUsageReveal || spellUsageFly || witchTarotCoin) return;

    const caster = findWitchTarotCasterOnField(state.playerA.field, state.playerB.field);
    const pending = state.witchTarotPending;
    const midPeek = state.simpanPeekReveal?.peekKind === "witchTarot";
    const midChoice = !!state.simpanHandChoice;
    const midDiscard = !!pending?.awaitingDiscardPlayer;

    if (!caster && !pending) return;
    if (!pending) return;

    witchTarotRestoreOnMountDoneRef.current = true;

    // 멀티플레이: 현재 스텝의 플레이어만 복원 실행
    if (multiplayMyTeam) {
      const myLetter: "A" | "B" = multiplayMyTeam;
      if (pending.coinHeads === null) {
        // 코인 시작 전: 시전자만 처리
        if (pending.casterPlayer !== myLetter) return;
      } else {
        // 코인 결과 후: 멀티플레이에서는 restoreWitchTarotSession을 완전히 차단
        // 상대방 스텝 시작은 witch_tarot_transfer Broadcast 트리거가 담당
        // 시전자 스텝 복원만 허용 (재접속 시)
        const stepOwner = witchTarotStepPlayer(pending.stepIndex, pending.casterPlayer);
        if (stepOwner !== myLetter) return;
        // 내 스텝이어도 멀티플레이에서는 Broadcast가 처리하므로 차단
        return;
      }
    }

    if (pending.coinHeads === null && !midPeek && !midChoice && !midDiscard) {
      startWitchTarotCoinSequence(pending.casterPlayer);
      return;
    }
    restoreWitchTarotSession(state);
  }, [
    state,
    isInitializing,
    witchTarotCoin,
    spellUsageReveal,
    spellUsageFly,
    restoreWitchTarotSession,
    startWitchTarotCoinSequence,
  ]);

  // 멀티플레이: pending 상태가 변경될 때마다 자동으로 상대방에게 sync
  useEffect(() => {
    if (!multiplayMyTeam) return;
    if (!state) return;
    if (!witchTarotFlowActive) return;
    notifyMultiplaySync();
  }, [
    // eslint-disable-next-line react-hooks/exhaustive-deps
    state?.witchTarotPending?.stepIndex,
    state?.witchTarotPending?.awaitingDiscardPlayer,
    state?.witchTarotPending?.coinHeads,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    state?.witchTarotPending == null ? "null" : "set",
    state?.guihwanPending == null ? "null" : "set",
    state?.legendarySwordPending == null ? "null" : "set",
    state?.startingWraithChainPending == null ? "null" : "set",
    state?.oneNightWagerPending == null ? "null" : "set",
    state?.spellUsagePending == null ? "null" : "set",
    state?.bubbleStationPending == null ? "null" : "set",
    state?.simpanHandChoice == null ? "null" : "set",
    state?.simpanPeekReveal == null ? "null" : "set",
    multiplayMyTeam,
    witchTarotFlowActive,
  ]);

  /** 디너 [혼란] — 에리스티나·라임 본인 링크만 해제(쿨은 globalTurnCount 기준 유지) */
  useEffect(() => {
    if (!state) return;
    setState(prev => {
      if (!prev) return prev;
      const newPlayerA = { ...prev.playerA, field: { ...prev.playerA.field } };
      const newPlayerB = { ...prev.playerB, field: { ...prev.playerB.field } };
      const changed = suppressActiveSkillLinksForConfusion(
        newPlayerA,
        newPlayerB,
        prev.globalTurnCount
      );
      if (!changed) return prev;
      return { ...prev, playerA: newPlayerA, playerB: newPlayerB };
    });
  }, [
    state?.playerA.field.is,
    state?.playerA.field.m,
    state?.playerA.field.os,
    state?.playerB.field.is,
    state?.playerB.field.m,
    state?.playerB.field.os,
    state?.globalTurnCount,
  ]);

  useEffect(() => {
    if (controlledSimulation) return;
    if (initialGameState) {
      if (initialized.current) return;
      initialized.current = true;
      setState(normalizeBootstrapSimulationState(initialGameState));
      return;
    }

    if (!cards || cards.length === 0) return;
    if (initialized.current) return;
    
    initialized.current = true;

    const saved = localStorage.getItem("pp_sim_save");
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        if (!parsed.playerA || typeof parsed.playerA.hand[0] === 'number') throw new Error("Old Save");
        
        parsed.elapsedTime = parsed.elapsedTime || 0; 
        parsed.turnTimeLeft = parsed.turnTimeLeft ?? 60;
        parsed.settings = parsed.settings || { isTimeLimitEnabled: false, isOpponentCardFlipped: false, drawMode: "RANDOM" };
        parsed.settings.isOpponentCardFlipped = parsed.settings.isOpponentCardFlipped ?? false; 
        parsed.settings.drawMode = parsed.settings.drawMode ?? "RANDOM";
        if (parsed.settings.drawMode === "SELECT") {
          parsed.settings.drawMode = "RANDOM";
        }
        parsed.globalTurnCount = parsed.globalTurnCount ?? 1; 
        parsed.unitCombatStats = parsed.unitCombatStats ?? {};
        parsed.unitStatsOrder = parsed.unitStatsOrder ?? [];
        parsed.spellDeployLog = parsed.spellDeployLog ?? [];
        parsed.simpanHandChoice = parsed.simpanHandChoice ?? null;
        parsed.simpanHandChoiceQueue = Array.isArray(parsed.simpanHandChoiceQueue) ? parsed.simpanHandChoiceQueue : [];
        parsed.simpanPeekReveal = parsed.simpanPeekReveal ?? null;
        parsed.simpanPeekQueue = Array.isArray(parsed.simpanPeekQueue) ? parsed.simpanPeekQueue : [];
        parsed.simpanPeekTick = typeof parsed.simpanPeekTick === "number" ? parsed.simpanPeekTick : 0;
        parsed.witchTarotPending =
          parsed.witchTarotPending && typeof parsed.witchTarotPending === "object"
            ? {
                casterPlayer: parsed.witchTarotPending.casterPlayer === "B" ? "B" : "A",
                coinHeads:
                  typeof parsed.witchTarotPending.coinHeads === "boolean"
                    ? parsed.witchTarotPending.coinHeads
                    : null,
                stepIndex: Number(parsed.witchTarotPending.stepIndex) || 0,
                awaitingDiscardPlayer:
                  parsed.witchTarotPending.awaitingDiscardPlayer === "A" ||
                  parsed.witchTarotPending.awaitingDiscardPlayer === "B"
                    ? parsed.witchTarotPending.awaitingDiscardPlayer
                    : null,
              }
            : null;
        parsed.legendarySwordPending =
          parsed.legendarySwordPending && typeof parsed.legendarySwordPending === "object"
            ? {
                ownerPlayer:
                  parsed.legendarySwordPending.ownerPlayer === "B" ? "B" : "A",
                swordSlot: (["is", "m", "os"] as const).includes(
                  parsed.legendarySwordPending.swordSlot
                )
                  ? parsed.legendarySwordPending.swordSlot
                  : "is",
                phase: Number(parsed.legendarySwordPending.phase) === 2 ? 2 : 1,
                hitTargets: Array.isArray(parsed.legendarySwordPending.hitTargets)
                  ? parsed.legendarySwordPending.hitTargets.map(String)
                  : [],
              }
            : null;
        parsed.startingWraithChainPending =
          parsed.startingWraithChainPending && typeof parsed.startingWraithChainPending === "object"
            ? {
                attackerPlayer:
                  parsed.startingWraithChainPending.attackerPlayer === "B" ? "B" : "A",
                attackerSlot: (["is", "m", "os"] as const).includes(
                  parsed.startingWraithChainPending.attackerSlot
                )
                  ? parsed.startingWraithChainPending.attackerSlot
                  : "is",
                targetKind:
                  parsed.startingWraithChainPending.targetKind === "playerHp"
                    ? "playerHp"
                    : "enemyUnit",
              }
            : null;
        parsed.oneNightWagerPending =
          parsed.oneNightWagerPending && typeof parsed.oneNightWagerPending === "object"
            ? {
                phase:
                  parsed.oneNightWagerPending.phase === "settlement" ? "settlement" : "popup",
                costsA: {
                  is: Number(parsed.oneNightWagerPending.costsA?.is) || 0,
                  m: Number(parsed.oneNightWagerPending.costsA?.m) || 0,
                  os: Number(parsed.oneNightWagerPending.costsA?.os) || 0,
                  total: Number(parsed.oneNightWagerPending.costsA?.total) || 0,
                },
                costsB: {
                  is: Number(parsed.oneNightWagerPending.costsB?.is) || 0,
                  m: Number(parsed.oneNightWagerPending.costsB?.m) || 0,
                  os: Number(parsed.oneNightWagerPending.costsB?.os) || 0,
                  total: Number(parsed.oneNightWagerPending.costsB?.total) || 0,
                },
                glowPlayer:
                  parsed.oneNightWagerPending.glowPlayer === "A" ||
                  parsed.oneNightWagerPending.glowPlayer === "B"
                    ? parsed.oneNightWagerPending.glowPlayer
                    : null,
                loserPlayer:
                  parsed.oneNightWagerPending.loserPlayer === "A" ||
                  parsed.oneNightWagerPending.loserPlayer === "B"
                    ? parsed.oneNightWagerPending.loserPlayer
                    : null,
                matches: Array.isArray(parsed.oneNightWagerPending.matches)
                  ? parsed.oneNightWagerPending.matches
                      .map((m: { ownerPlayer?: string; activationCost?: number }) => ({
                        ownerPlayer: m.ownerPlayer === "B" ? "B" : "A",
                        activationCost: Number(m.activationCost) || 0,
                      }))
                  : [],
              }
            : null;
        parsed.spellUsagePending = parseSpellUsagePendingSave(parsed.spellUsagePending);
        parsed.guihwanPending = parseGuihwanPendingSave(parsed.guihwanPending);
        parsed.bubbleStationPending = parseBubbleStationPendingSave(parsed.bubbleStationPending);
        parsed.playerA = { ...parsed.playerA, field: migratePlayerFieldSpellStack(parsed.playerA.field) };
        parsed.playerB = { ...parsed.playerB, field: migratePlayerFieldSpellStack(parsed.playerB.field) };

        const reconciled = reconcileBubbleStationPendingFromSnapshot(
          reconcileGuihwanPendingFromSnapshot(
            reconcileSpellUsagePendingFromSnapshot(
              reconcileOneNightWagerPendingFromSnapshot(
                reconcileStartingWraithChainPendingFromSnapshot(
                  reconcileLegendarySwordPendingFromSnapshot(
                    reconcileWitchTarotPendingFromSnapshot(parsed)
                  )
                )
              )
            )
          )
        );
        legendarySwordStrikePendingRef.current = reconciled.legendarySwordPending;
        startingWraithChainPendingRef.current = reconciled.startingWraithChainPending;
        oneNightWagerPendingRef.current = reconciled.oneNightWagerPending;
        setState(reconciled);
      } catch (e) {
        localStorage.removeItem("pp_sim_save");
        runInitialization(cards); 
      }
    } else {
      runInitialization(cards);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, initialGameState, controlledSimulation]);

  useEffect(() => {
    if (controlledSimulation) return;
    if (state && !isInitializing && state.currentTurn !== null && !winner) {
      const merged = mergeSimulationPersistedSequences(
        state,
        witchTarotSequenceRef.current,
        witchTarotDiscardPlayerRef.current,
        witchTarotSequenceActiveRef.current,
        legendarySwordStrikePendingRef.current,
        startingWraithChainPendingRef.current,
        oneNightWagerPendingRef.current,
        oneNightWagerSequenceActiveRef.current
      );
      localStorage.setItem("pp_sim_save", JSON.stringify(merged));
    }
  }, [state, isInitializing, winner]);

  const handleReset = () => {
    if (winner || window.confirm("진행 중인 모든 시뮬레이션 기록을 삭제하고 초기화할까요?")) {
      localStorage.removeItem("pp_sim_save");
      setIsMenuOpen(false);
      setIsSettingsOpen(false);
      setIsGameStatsOpen(false);
      runInitialization(cards);
    }
  };

  const handleEndTurn = (player: "A" | "B") => {
    if (pendingLegendarySwordStrike) {
      alert("전설의 검 연격이 끝날 때까지 턴을 넘길 수 없습니다.");
      return;
    }
    if (!state || state.currentTurn !== player || isInitializing || winner) return;
    if (
      state.simpanHandChoice ||
      state.simpanPeekReveal ||
      simpanPeekFly ||
      danhaStealFly ||
      spellUsageReveal ||
      spellUsageFly ||
      spellUsageMotionActiveRef.current ||
      witchTarotSequenceActiveRef.current ||
      witchTarotCoin ||
      oneNightWagerModal ||
      state.oneNightWagerPending ||
      state.spellUsagePending ||
      state.guihwanPending
    ) {
      alert("[연출] 중앙 카드가 패로 합류할 때까지, 또는 심판 대기 카드를 정리한 뒤 턴을 넘겨 주세요.");
      return;
    }
    setSelectedSlot(null);
    setAttackingSlot(null);
    setPendingSecondaryAttack(null);
    applyStartingWraithChainPending(null);
    applyLegendarySwordStrikePending(null);
    setPendingAttackSelection(null);
    setPendingLibutyAllEnemiesAttack(null);
    setPendingSkill(null);
    setAttackOptionOverride(null);
    setIsDrawModalOpen(false);

    const hyuTurnVfxBag: { vfx: HyugesojauiAnsikTurnStartVfx | null } = { vfx: null };
    const businessGangExpireVfxBag: { a: boolean; b: boolean } = { a: false, b: false };
    const antHellTurnSyncVfxBag: { applied: string[]; elWing: string[] } = {
      applied: [],
      elWing: [],
    };
    /**
     * 애벌레킹(W) 매 턴 종료 자동 기본 공격 — 호스트 슬롯 키 + 데미지 표시용 VFX bag.
     * - tickKeys: 호스트 슬롯 키(데미지 숫자 + 갈색 펄스)
     * - damages: host가 실제로 받은 hp 손실(banjit·방어·무적·보호막 적용 후 결과).
     * - reflectDamages: 리부티 등 host의 기본 공격 반사 패시브로 W가 받은 데미지(있을 때만).
     * - startingTreeAllyHeals: host가 시작의 나무이고 hp 손실 시 모든 아군에 회복 — 슬롯 키별 회복량.
     */
    const aebeolaekingTickVfxBag: {
      tickKeys: string[];
      damages: Record<string, number>;
      reflectDamages: Record<string, number>;
      startingTreeAllyHeals: Record<string, number>;
    } = {
      tickKeys: [],
      damages: {},
      reflectDamages: {},
      startingTreeAllyHeals: {},
    };
    flushSync(() => {
      setState(prev => {
      if (!prev) return prev;
      const isA = player === "A";

      const resetFieldUnits = (f: PlayerState["field"], fieldOwner: "A" | "B") => {
        const ticked = applyEndTurnLegendarySwordArmingTickForFieldOwner(
          f,
          fieldOwner,
          player,
          prev.playerA.field,
          prev.playerB.field
        );
        const tickUnit = (u: FieldCard) =>
          applyEndTurnIversonWaitTickToFieldUnit(
            applyEndTurnStunTickToFieldUnit(
              applyEndTurnBaekseuInvulnTickToFieldUnit(
                applyEndTurnEondeokSilenceTickToFieldUnit(
                  applyEndTurnSuppressionTickToFieldUnit(u),
                ),
              ),
            ),
          );
        /**
         * 호스트 reset 시 W 라이더의 hasAttacked(true 유지) / hasBeenAttackedThisTurn(false) 동기화.
         * - W는 공격하지 않으므로 hasAttacked=true 영구 유지.
         * - hasBeenAttackedThisTurn은 매 턴 reset(다음 응답에서 공격 부합 시 필요).
         */
        const resetWithRider = (u: FieldCard): FieldCard => {
          const t = tickUnit(u);
          const rider = t.parasiteRider;
          if (!rider) return { ...t, hasAttacked: false, hasBeenAttackedThisTurn: false };
          return {
            ...t,
            hasAttacked: false,
            hasBeenAttackedThisTurn: false,
            parasiteRider: { ...rider, hasAttacked: true, hasBeenAttackedThisTurn: false },
          };
        };
        return {
          is: ticked.is ? resetWithRider(ticked.is) : null,
          m: ticked.m ? resetWithRider(ticked.m) : null,
          os: ticked.os ? resetWithRider(ticked.os) : null,
        };
      };

      const ta = applyEndTurnToSpellStack(normalizeSpellStack(prev.playerA.field));
      const tb = applyEndTurnToSpellStack(normalizeSpellStack(prev.playerB.field));
      let rewindCards = [...prev.rewindCards];
      if (ta.expiredBangEomakToRewind.length > 0) {
        rewindCards = [...rewindCards, ...ta.expiredBangEomakToRewind];
      }
      if (tb.expiredBangEomakToRewind.length > 0) {
        rewindCards = [...rewindCards, ...tb.expiredBangEomakToRewind];
      }
      if (ta.expiredCheolbyeokToRewind.length > 0) {
        rewindCards = [...rewindCards, ...ta.expiredCheolbyeokToRewind];
      }
      if (tb.expiredCheolbyeokToRewind.length > 0) {
        rewindCards = [...rewindCards, ...tb.expiredCheolbyeokToRewind];
      }
      if (ta.expiredHyugesojauiAnsikToRewind.length > 0) {
        rewindCards = [...rewindCards, ...ta.expiredHyugesojauiAnsikToRewind];
      }
      if (tb.expiredHyugesojauiAnsikToRewind.length > 0) {
        rewindCards = [...rewindCards, ...tb.expiredHyugesojauiAnsikToRewind];
      }
      if (ta.expiredBusinessGangToRewind.length > 0) {
        rewindCards = [...rewindCards, ...ta.expiredBusinessGangToRewind];
        businessGangExpireVfxBag.a = true;
      }
      if (tb.expiredBusinessGangToRewind.length > 0) {
        rewindCards = [...rewindCards, ...tb.expiredBusinessGangToRewind];
        businessGangExpireVfxBag.b = true;
      }
      if (ta.expiredAntHellToRewind.length > 0) {
        rewindCards = [...rewindCards, ...ta.expiredAntHellToRewind];
        businessGangExpireVfxBag.a = true;
      }
      if (tb.expiredAntHellToRewind.length > 0) {
        rewindCards = [...rewindCards, ...tb.expiredAntHellToRewind];
        businessGangExpireVfxBag.b = true;
      }

      const nextTurn = isA ? "B" : "A";
      let fieldA = { ...resetFieldUnits(prev.playerA.field, "A"), spellStack: ta.nextStack };
      let fieldB = { ...resetFieldUnits(prev.playerB.field, "B"), spellStack: tb.nextStack };

      let nextUnitCombatStats = prev.unitCombatStats;
      let nextUnitStatsOrder = prev.unitStatsOrder;

      /**
       * 애벌레킹(W) 매 턴 종료 자동 기본 공격 — host에 부착된 모든 W가 host에게 W.atk 기준 단발 공격.
       * - W.atk를 parseAttack으로 primary damage로 추출 — 일반 유닛 기본 공격과 동일.
       * - host 측 victim 룰 적용: banjit ×0.75floor, applyIncomingDefenseDamage(방어/감소),
       *   isInvulnerableFromBaekseuOrCheolbyeok([무적]), splitDamageThroughHpBarrier(보호막), resolveBaekseuFatalDamage(백스 처형).
       * - 리부티 등 host의 '기본 공격 반사' 패시브 → attacker(W)에 반사 데미지 적용.
       * - host 사망 시 host+W를 각각 별개 카드로 rewindCards에 push + cleanupSimulationUnitDeath.
       * - 반사로 W 사망 시 host에서 분리 후 W만 rewind.
       * - hasBeenAttackedThisTurn 마킹은 생략(자동 패시브 → 다음 턴 다굴 룰에 영향 X).
       * - 부착한 그 턴의 종료부터 발동 — shouldTriggerAebeolaekingParasiteThisEndTurn에서 판정.
       */
      const applyAebeolaekingTurnEndParasiteDamageToSide = (
        side: "A" | "B",
        field: PlayerState["field"],
        oppField: PlayerState["field"]
      ): PlayerState["field"] => {
        const next: PlayerState["field"] = { ...field };
        (["is", "m", "os"] as const).forEach(s => {
          const host = next[s];
          if (!host || (host.currentHp ?? 0) <= 0) return;
          const rider = host.parasiteRider;
          if (!rider || !isAebeolaekingCard(rider)) return;
          if (!shouldTriggerAebeolaekingParasiteThisEndTurn(rider, prev.globalTurnCount)) return;

          const playerAField = side === "A" ? next : oppField;
          const playerBField = side === "B" ? next : oppField;
          const riderTrueOwner = getAebeolaekingRiderTrueOwner(rider);
          if (!riderTrueOwner) return;

          /* (1) W.atk → primaryDamage — 파이레드·모닝무드·시작의나무·검황 등 아군 공격 오라 포함. */
          const rawDmg = resolveAebeolaekingParasiteBasicAttackPrimaryDamage({
            rider,
            riderTrueOwner,
            hostOwner: side,
            hostSlot: s,
            playerAField,
            playerBField,
          });
          if (rawDmg <= 0) return;
          const victimField = side === "A" ? playerAField : playerBField;
          const facingOpp = oppField[s] ?? null;

          /* (2) host 측 victim 룰 — 반짓고리, 방어/감소, [무적], 보호막, 백스 처형. */
          let afterBanjit = rawDmg;
          if (
            (host as FieldCard & { hasBanjitgori?: boolean }).hasBanjitgori &&
            !callieBuffBanSuppressesBuffsForVictim(side, s, playerAField, playerBField)
          ) {
            afterBanjit = Math.floor((rawDmg * 0.75) / 50) * 50;
          }
          const defenseRes = applyIncomingDefenseDamage(
            afterBanjit,
            host,
            playerAField,
            playerBField,
            `${side}-${s}`
          );
          const invuln = isInvulnerableFromBaekseuOrCheolbyeok(host, victimField);
          const coreAfterDefense = invuln ? afterBanjit : defenseRes.finalDamage;
          const actualDmg = invuln ? 0 : coreAfterDefense;
          const cardForCombat = normalizeUnitHpSurvivalOnesForCombat(host);
          const barrierSplit = splitDamageThroughHpBarrier(cardForCombat, actualDmg);
          const hpAfterRaw = cardForCombat.currentHp - barrierSplit.damageToCurrentHp;
          const resolved = resolveBaekseuFatalDamage(
            cardForCombat,
            hpAfterRaw,
            barrierSplit.damageToCurrentHp,
            facingOpp
          );
          const newHp = resolved.finalHp;
          const hpLoss = Math.max(0, cardForCombat.currentHp - newHp);
          const isDestroyed = resolved.isDestroyed;
          const baekseuPatch = resolved.patch;

          /* (3) host 갱신 — parasiteRider는 (4)에서 갱신. hasBeenAttackedThisTurn은 마킹 안 함(자동 패시브). */
          const baseTarget =
            Object.keys(baekseuPatch).length > 0
              ? stripBaekseuHarmfulEffectsForInvuln(cardForCombat)
              : cardForCombat;
          let updatedHost: FieldCard = {
            ...baseTarget,
            ...baekseuPatch,
            ...hpBarrierPatchFromRemaining(barrierSplit.nextBarrierRemaining),
            currentHp: newHp,
            parasiteRider: rider,
          };

          /**
           * (3.5) 시작의 나무 패시브 — host가 시작의 나무이고 실제로 hp 손실이 발생하면
           * 모든 아군에 50%(50단위 내림) 회복. 데미지 종류(스펠/공격/기생 등)와 무관하게 hp 감소가 트리거.
           */
          const startingTreeAllyHeal = getStartingTreeAllyHealOnDamaged(host, hpLoss, facingOpp);
          if (startingTreeAllyHeal > 0) {
            const beforeHeal = { is: next.is, m: next.m, os: next.os };
            applyStartingTreeDamagedHealSpread(side, s, playerAField, playerBField, startingTreeAllyHeal);
            (["is", "m", "os"] as const).forEach(otherS => {
              if (otherS === s) return;
              const before = beforeHeal[otherS];
              const after = next[otherS];
              if (!before || !after) return;
              const healed = Math.max(0, (after.currentHp ?? 0) - (before.currentHp ?? 0));
              if (healed > 0) {
                const dedupKey = `${side}-${s}->${otherS}`;
                aebeolaekingTickVfxBag.startingTreeAllyHeals[dedupKey] = healed;
              }
            });
            const riderHeal = applyHealToOwnAebeolaekingRidersOnEnemyField(
              oppField,
              side,
              startingTreeAllyHeal,
              "allyUnit"
            );
            riderHeal.perSlot.forEach(({ slot: riderHostSlot, healed }) => {
              if (healed > 0) {
                aebeolaekingTickVfxBag.startingTreeAllyHeals[`${side}-${s}->w-${riderHostSlot}`] =
                  healed;
              }
            });
          }

          /* (4) 리부티 등 host의 '기본 공격 반사' → attacker(W)에 반사 데미지. */
          let updatedRider: FieldCard | null = rider;
          let riderKilledByReflect = false;
          let reflectDmgShown = 0;
          if (shouldApplyLibutyBasicAttackReflect(host, facingOpp, hpLoss)) {
            const reflectRes = computeLibutyReflectPureDamageOnAggressor(
              updatedRider,
              undefined,
              facingOpp
            );
            if (reflectRes && reflectRes.hpLoss > 0) {
              updatedRider = applyLibutyReflectPatchToAggressorCard(updatedRider, reflectRes);
              reflectDmgShown = reflectRes.hpLoss;
              if (reflectRes.isDestroyed) riderKilledByReflect = true;
            }
          }

          /* (5) 사망 처리. */
          if (isDestroyed) {
            cleanupSimulationUnitDeath(
              updatedHost,
              { field: fieldA },
              { field: fieldB },
              prev.globalTurnCount
            );
            rewindCards = appendDeadHostWithRiderToRewindCards(rewindCards, updatedHost);
            const sid = updatedHost.statsInstanceId;
            if (sid) {
              const { [sid]: _r, ...rest } = nextUnitCombatStats;
              nextUnitCombatStats = rest;
              nextUnitStatsOrder = nextUnitStatsOrder.filter(x => x !== sid);
            }
            next[s] = null;
          } else {
            if (riderKilledByReflect && updatedRider) {
              const deadRider = updatedRider;
              updatedHost = { ...updatedHost, parasiteRider: null };
              rewindCards = [...rewindCards, stripAebeolaekingRiderMeta(deadRider)];
            } else if (updatedRider) {
              updatedHost = { ...updatedHost, parasiteRider: updatedRider };
            }
            next[s] = updatedHost;
          }

          /* (6) VFX bag — host 데미지 숫자 + W 반사 데미지. */
          const slotKey = `${side}-${s}`;
          if (!aebeolaekingTickVfxBag.tickKeys.includes(slotKey)) {
            aebeolaekingTickVfxBag.tickKeys.push(slotKey);
          }
          aebeolaekingTickVfxBag.damages[slotKey] = hpLoss;
          if (reflectDmgShown > 0) {
            aebeolaekingTickVfxBag.reflectDamages[slotKey] = reflectDmgShown;
          }
        });
        return next;
      };

      fieldA = { ...fieldA, ...applyAebeolaekingTurnEndParasiteDamageToSide("A", fieldA, fieldB) };
      fieldB = { ...fieldB, ...applyAebeolaekingTurnEndParasiteDamageToSide("B", fieldB, fieldA) };

      const hyu = applyHyugesojauiAnsikTurnStartForOwner({
        nextTurnOwner: nextTurn,
        playerAField: fieldA,
        playerBField: fieldB,
      });
      fieldA = hyu.nextPlayerAField;
      fieldB = hyu.nextPlayerBField;
      hyuTurnVfxBag.vfx = hyu.vfx;

      const antHellSync = syncAntHellSuppressionForActiveCasters({
        playerA: { field: fieldA },
        playerB: { field: fieldB },
        globalTurnCount: prev.globalTurnCount,
      });
      antHellTurnSyncVfxBag.applied = antHellSync.appliedSlotKeys;
      antHellTurnSyncVfxBag.elWing = antHellSync.elWingImmunitySlotKeys;

      let nextState: typeof prev = {
        ...prev,
        rewindCards,
        unitCombatStats: nextUnitCombatStats,
        unitStatsOrder: nextUnitStatsOrder,
        currentTurn: nextTurn,
        turnCount: !isA ? prev.turnCount + 1 : prev.turnCount,
        globalTurnCount: prev.globalTurnCount + 1,
        turnTimeLeft: 60,
        playerA: {
          ...prev.playerA,
          tokens: !isA
            ? Math.min(
                prev.playerA.tokens + getTurnStartTokenGainForPlayer(fieldA),
                10
              )
            : prev.playerA.tokens,
          hasDrawnThisTurn: false,
          attacksThisTurn: 0,
          hasBeenAttackedThisTurn: false,
          field: fieldA,
        },
        playerB: {
          ...prev.playerB,
          tokens: isA
            ? Math.min(
                prev.playerB.tokens + getTurnStartTokenGainForPlayer(fieldB),
                10
              )
            : prev.playerB.tokens,
          hasDrawnThisTurn: false,
          attacksThisTurn: 0,
          hasBeenAttackedThisTurn: false,
          field: fieldB,
        },
      };
      if (hyu.combatPatches.length > 0) {
        nextState = {
          ...nextState,
          unitCombatStats: patchManyUnitCombatStats(nextState.unitCombatStats, hyu.combatPatches),
        };
      }
      return nextState;
      });
    });
    if (hyuTurnVfxBag.vfx) {
      playHyugesojauiAnsikAllyPulseAndHealVfx(
        hyuTurnVfxBag.vfx.allyPlayer,
        hyuTurnVfxBag.vfx.perSlot
      );
    }
    if (businessGangExpireVfxBag.a) {
      window.setTimeout(() => triggerCardFlash("A-spell", "businessGangSpellPulse"), 0);
    }
    if (businessGangExpireVfxBag.b) {
      window.setTimeout(() => triggerCardFlash("B-spell", "businessGangSpellPulse"), 0);
    }
    for (const slotKey of antHellTurnSyncVfxBag.elWing) {
      window.setTimeout(() => showElWingMagicImmunityBlockOnUnit(slotKey), 0);
    }
    for (const slotKey of antHellTurnSyncVfxBag.applied) {
      window.setTimeout(() => showAntHellSpellHitOnTarget(slotKey), 0);
    }

    /* 애벌레킹(W) 매 턴 자동 기본 공격 VFX — host에 데미지 숫자 + 갈색 펄스, W에는 리부티 반사 데미지(있을 시). */
    for (const slotKey of aebeolaekingTickVfxBag.tickKeys) {
      const dmg = aebeolaekingTickVfxBag.damages[slotKey] ?? 0;
      const reflectDmg = aebeolaekingTickVfxBag.reflectDamages[slotKey] ?? 0;
      window.setTimeout(() => {
        triggerCardFlash(slotKey, "aebeolaekingParasiteTick");
        if (dmg > 0) showDamageNumber(slotKey, dmg);
      }, 0);
      if (reflectDmg > 0) {
        const parts = slotKey.split("-") as ["A" | "B", "is" | "m" | "os"];
        const riderKey = aebeolaekingRiderSlotKey(parts[0], parts[1]);
        window.setTimeout(() => {
          showDamageNumber(riderKey, reflectDmg, mergeKalliPureDamageFloat(reflectDmg));
        }, 0);
      }
    }
    /**
     * 시작의 나무 패시브 — host가 시작의 나무이고 hp 손실 발생 시 아군 회복 플로팅 텍스트 + 회복 플래시.
     * dedup 키(`${side}-${hostSlot}->${otherS}`)를 ally 슬롯 단위로 합산해 표시.
     */
    {
      const aggregated: Record<string, number> = {};
      for (const [dedupKey, healAmount] of Object.entries(
        aebeolaekingTickVfxBag.startingTreeAllyHeals
      )) {
        if (healAmount <= 0) continue;
        const arrow = dedupKey.indexOf("->");
        if (arrow < 0) continue;
        const targetPart = dedupKey.substring(arrow + 2);
        const sideMatch = dedupKey.substring(0, dedupKey.indexOf("-"));
        const allyKey = `${sideMatch}-${targetPart}`;
        aggregated[allyKey] = (aggregated[allyKey] ?? 0) + healAmount;
      }
      for (const [allyKey, healAmount] of Object.entries(aggregated)) {
        if (healAmount > 0) {
          window.setTimeout(() => showHealNumber(allyKey, healAmount), 0);
        }
      }
    }
    notifyMultiplaySync();
  };

  const handleSkillDiscard = (cardIndex: number, player: "A" | "B") => {
    if (!pendingSkill || !state || pendingSkill.name !== PENDING_SKILL.MOMO_EAT) return;

    const targetPlayerState = player === "A" ? state.playerA : state.playerB;
    const hand = targetPlayerState.hand;
    const discardedCard = hand[cardIndex];
    const healSlot = pendingSkill.slot;
    const unitBeforeHeal = targetPlayerState.field[healSlot as "is"|"m"|"os"];
    const headroom = unitBeforeHeal
      ? Math.max(0, Number(unitBeforeHeal.hp) - unitBeforeHeal.currentHp)
      : 0;
    const actualHeal = unitBeforeHeal ? Math.min(MOMO_SKILL_HEAL_AMOUNT, headroom) : 0;
    const healPopupKey = `${player}-${healSlot}`;

    const momoFieldForStats = player === "A" ? state.playerA.field : state.playerB.field;
    const momoUnitCard = momoFieldForStats[pendingSkill.slot as "is" | "m" | "os"];
    const momoHealPatches: Array<{
      id: string | undefined;
      delta: Partial<
        Record<
          "damageDealt" | "kills" | "damageTaken" | "selfHeal" | "allyHealGiven" | "damageMitigated",
          number
        >
      >;
    }> = [];
    if (actualHeal > 0 && momoUnitCard?.statsInstanceId && unitBeforeHeal?.statsInstanceId) {
      if (momoUnitCard.statsInstanceId === unitBeforeHeal.statsInstanceId) {
        momoHealPatches.push({ id: momoUnitCard.statsInstanceId, delta: { selfHeal: actualHeal } });
      } else {
        momoHealPatches.push({ id: momoUnitCard.statsInstanceId, delta: { allyHealGiven: actualHeal } });
        momoHealPatches.push({ id: unitBeforeHeal.statsInstanceId, delta: { selfHeal: actualHeal } });
      }
    }

    setState(prev => {
      if (!prev) return prev;
      const newHand = [...hand];
      newHand.splice(cardIndex, 1);

      const newPlayerA = { ...prev.playerA, hand: player === "A" ? newHand : prev.playerA.hand, field: { ...prev.playerA.field } };
      const newPlayerB = { ...prev.playerB, hand: player === "B" ? newHand : prev.playerB.hand, field: { ...prev.playerB.field } };

      const targetPlayer = player === "A" ? newPlayerA : newPlayerB;
      const healSlotKey = pendingSkill.slot as "is" | "m" | "os";
      const targetUnit = targetPlayer.field[healSlotKey];

      if (targetUnit) {
        targetPlayer.field = {
          ...targetPlayer.field,
          [healSlotKey]: {
            ...healUnitCurrentHp(targetUnit, MOMO_SKILL_HEAL_AMOUNT, {
              supportSource: "selfAbility",
            }),
            skillLastUsedGlobalTurn: prev.globalTurnCount,
          } as FieldCard,
        };
      }

      const newRewind = [...prev.rewindCards, discardedCard];

      return {
        ...prev,
        unitCombatStats: patchManyUnitCombatStats(prev.unitCombatStats, momoHealPatches),
        playerA: newPlayerA,
        playerB: newPlayerB,
        rewindCards: newRewind
      };
    });
    setPendingSkill(null);
    if (actualHeal > 0) {
      showHealNumber(healPopupKey, actualHeal);
    }
    notifyMultiplaySync();
  };

  const handleDanhaSteal = (victimHandIndex: number, victimPlayer: "A" | "B") => {
    const ps = pendingSkill;
    if (!ps || !state || ps.name !== PENDING_SKILL.DANHA_GALGORI) return;
    if (danhaStealFly) return;
    const caster = ps.player;
    if (victimPlayer === caster) return;

    const slotKey = ps.slot as "is" | "m" | "os";
    const allyField = caster === "A" ? state.playerA.field : state.playerB.field;
    const danhaUnit = allyField[slotKey];
    if (!danhaUnit || danhaUnit.name !== UNIT.DANHA) {
      setPendingSkill(null);
      alert("단하가 필드에 없어 [마법의 갈고리]가 취소되었습니다.");
      return;
    }

    const victimHandArr = victimPlayer === "A" ? state.playerA.hand : state.playerB.hand;
    const stolenCard = victimHandArr[victimHandIndex];
    if (!stolenCard) return;

    const allyHandLen = (caster === "A" ? state.playerA.hand : state.playerB.hand).length;
    if (allyHandLen >= 6) return;

    const danhaFieldKey = `${caster}-${slotKey}`;
    triggerCardFlash(danhaFieldKey, "danhaMagicHook");

    const arrivalGlowToken = nextPpSimHandDanhaStealArrivalToken();
    const fromEl =
      victimPlayer === "A"
        ? handSlotOuterRefsA.current[victimHandIndex]
        : handSlotOuterRefsB.current[victimHandIndex];
    const toEl =
      caster === "A"
        ? handSlotOuterRefsA.current[allyHandLen]
        : handSlotOuterRefsB.current[allyHandLen];
    const fr = fromEl?.getBoundingClientRect();
    const tr = toEl?.getBoundingClientRect();

    danhaStealCommitRef.current = {
      caster,
      victimPlayer,
      victimHandIndex,
      targetHandIndex: allyHandLen,
      slotKey,
      arrivalGlowToken,
    };

    if (!fr || !tr || fr.width < 2 || tr.width < 2) {
      const commitSnapshot = danhaStealCommitRef.current;
      danhaStealCommitRef.current = null;
      setState(prev => {
        const commit = commitSnapshot;
        if (!prev || !commit) return prev;
        const vHand = commit.victimPlayer === "A" ? prev.playerA.hand : prev.playerB.hand;
        if (commit.victimHandIndex < 0 || commit.victimHandIndex >= vHand.length) return prev;
        const card = vHand[commit.victimHandIndex];
        if (!card) return prev;
        const ally = commit.caster === "A" ? prev.playerA : prev.playerB;
        if (ally.hand.length >= 6) return prev;
        const newVictimHand = [...vHand];
        newVictimHand.splice(commit.victimHandIndex, 1);
        const newAllyHand = [
          ...ally.hand,
          markPpSimHandDanhaStealArrival(
            stripPpSimHandDanhaStealArrival(stripPpSimHandNewGlow(card)),
            commit.arrivalGlowToken
          ),
        ];
        const sk = commit.slotKey;
        const newPlayerA = {
          ...prev.playerA,
          hand:
            commit.caster === "A"
              ? newAllyHand
              : commit.victimPlayer === "A"
                ? newVictimHand
                : prev.playerA.hand,
          field: { ...prev.playerA.field },
        };
        const newPlayerB = {
          ...prev.playerB,
          hand:
            commit.caster === "B"
              ? newAllyHand
              : commit.victimPlayer === "B"
                ? newVictimHand
                : prev.playerB.hand,
          field: { ...prev.playerB.field },
        };
        if (commit.caster === "A") {
          const u = newPlayerA.field[sk];
          if (u) newPlayerA.field = { ...newPlayerA.field, [sk]: { ...u, danhaMagicHookConsumed: true } };
        } else {
          const u = newPlayerB.field[sk];
          if (u) newPlayerB.field = { ...newPlayerB.field, [sk]: { ...u, danhaMagicHookConsumed: true } };
        }
        return { ...prev, playerA: newPlayerA, playerB: newPlayerB };
      });
      if (commitSnapshot) {
        triggerCardFlash(
          `hand-${commitSnapshot.caster}-${commitSnapshot.targetHandIndex}`,
          "danhaMagicHook"
        );
      }
      setPendingSkill(null);
      return;
    }

    queueMicrotask(() => {
      setDanhaStealFly({
        casterPlayer: caster,
        victimPlayer,
        victimHandIndex,
        stolenCard,
        from: { x: fr.left, y: fr.top, w: fr.width, h: fr.height },
        to: { x: tr.left, y: tr.top, w: tr.width, h: tr.height },
        phase: 0,
        flyMs: DANHA_STEAL_HAND_FLY_MS,
      });
    });
  };

  const handleDrawClick = () => {
    if (pendingLegendarySwordStrike) {
      alert("전설의 검 연격이 끝날 때까지 다른 행동을 할 수 없습니다.");
      return;
    }
    if (!state || isInitializing || !state.currentTurn || winner) return;
    if (!canMultiplayDraw()) return;
    if (state.deckCards.length === 0) return alert("덱에 더 이상 카드가 없습니다!");
    if (
      state.simpanHandChoice ||
      state.simpanPeekReveal ||
      danhaStealFly ||
      spellUsageReveal ||
      spellUsageFly ||
      spellUsageMotionActiveRef.current ||
      witchTarotSequenceActiveRef.current ||
      witchTarotCoin
    ) {
      alert("중앙 카드 연출이 끝난 뒤 덱을 눌러 주세요.");
      return;
    }

    const isA = state.currentTurn === "A";
    const targetPlayer = isA ? state.playerA : state.playerB;

    if (targetPlayer.hasDrawnThisTurn) return alert("이번 턴에는 이미 카드를 뽑았습니다! (턴당 1회 제한)");
    if (targetPlayer.hand.length >= 6) return alert("패가 가득 찼습니다! (최대 6장)");

    if (state.settings.drawMode === "SELECT") {
      setIsDrawModalOpen(true);
      return;
    }

    executeDraw(null);
  };

  const executeDraw = (selectedCardIndex: number | null) => {
    setState(prev => {
      if (!prev) return prev;
      if (multiplayMyTeam && prev.currentTurn !== multiplayMyTeam) return prev;
      if (prev.simpanHandChoice || prev.simpanPeekReveal || spellUsageMotionActiveRef.current) {
        return prev;
      }
      const isA = prev.currentTurn === "A";
      const targetPlayer = isA ? prev.playerA : prev.playerB;
      if (targetPlayer.hand.length >= 6) return prev;

      const newDeck = [...prev.deckCards];
      let drawnCard: CardRow;

      if (selectedCardIndex !== null) {
        drawnCard = newDeck.splice(selectedCardIndex, 1)[0];
      } else {
        drawnCard = newDeck.pop()!;
      }

      const key = isA ? "playerA" : "playerB";
      const pendingCard = stripPpSimHandNewGlow(drawnCard);

      return {
        ...prev,
        deckCards: newDeck,
        simpanPeekReveal: {
          player: isA ? "A" : "B",
          pendingCard,
          peekKind: "draw",
        },
        simpanPeekTick: (prev.simpanPeekTick ?? 0) + 1,
        [key]: {
          ...targetPlayer,
          hasDrawnThisTurn: true,
        },
      };
    });

    setIsDrawModalOpen(false);
    notifyMultiplaySync();
  };

  const completeOneNightWagerSettlement = useCallback(
    (pending: OneNightWagerPendingSave) => {
      const snap = simulationStateRef.current;
      if (!snap) {
        applyOneNightWagerPending(null);
        return;
      }
      const matches = oneNightWagerStackMatchesFromPendingSave(
        pending,
        snap.playerA.field,
        snap.playerB.field
      );
      const wipeFlashPlayer =
        pending.loserPlayer && pending.loserPlayer !== pending.glowPlayer
          ? pending.loserPlayer
          : null;
      setState(prev => {
        if (!prev) return prev;
        const settled = applyOneNightWagerTokenSettlement({
          playerA: { tokens: prev.playerA.tokens },
          playerB: { tokens: prev.playerB.tokens },
          matches,
          costsA: pending.costsA,
          costsB: pending.costsB,
        });
        return {
          ...prev,
          playerA: { ...prev.playerA, tokens: settled.playerA.tokens },
          playerB: { ...prev.playerB, tokens: settled.playerB.tokens },
        };
      });
      if (wipeFlashPlayer) {
        triggerCardFlash(`player-${wipeFlashPlayer}`, "oneNightWagerTokenWipe");
      }
      window.setTimeout(() => {
        applyOneNightWagerPending(null);
      }, 900);
    },
    [applyOneNightWagerPending, triggerCardFlash]
  );

  const advanceOneNightWagerToSettlementPhase = useCallback(
    (popupPending: OneNightWagerPendingSave) => {
      const settlementPending: OneNightWagerPendingSave = { ...popupPending, phase: "settlement" };
      applyOneNightWagerPending(settlementPending);
      setOneNightWagerModal(null);
      setSpellUsageHiddenRevealCards(null);
      setState(prev => {
        if (!prev) return prev;
        const stripWagers = (field: PlayerState["field"]) => ({
          ...field,
          spellStack: removeAllOneNightWagersFromSpellStack(normalizeSpellStack(field)),
        });
        return {
          ...prev,
          playerA: { ...prev.playerA, field: stripWagers(prev.playerA.field) },
          playerB: { ...prev.playerB, field: stripWagers(prev.playerB.field) },
        };
      });
      window.setTimeout(() => {
        completeOneNightWagerSettlement(settlementPending);
      }, ONE_NIGHT_WAGER_TOKEN_WIPE_DELAY_MS);
    },
    [applyOneNightWagerPending, completeOneNightWagerSettlement]
  );

  const resumeOneNightWagerSequence = useCallback(
    (pending: OneNightWagerPendingSave) => {
      if (oneNightWagerSequenceActiveRef.current) return;
      const snap = simulationStateRef.current;
      if (!snap || winner || isInitializing) return;

      oneNightWagerSequenceActiveRef.current = true;
      applyOneNightWagerPending(pending);

      const matches = oneNightWagerStackMatchesFromPendingSave(
        pending,
        snap.playerA.field,
        snap.playerB.field
      );

      if (pending.phase === "popup") {
        const reveal: Partial<Record<"A" | "B", FieldCard>> = {};
        for (const m of matches) {
          if (m.stackIndex >= 0) reveal[m.ownerPlayer] = m.wagerCard;
        }
        setSpellUsageHiddenRevealCards(reveal);
        window.setTimeout(() => {
          for (const m of matches) {
            if (m.stackIndex >= 0) {
              triggerCardFlash(`${m.ownerPlayer}-spell`, "oneNightWagerSpellTrigger");
            }
          }
        }, 0);
        setOneNightWagerModal({
          costsA: pending.costsA,
          costsB: pending.costsB,
          glowPlayer: pending.glowPlayer,
        });
        window.setTimeout(() => {
          advanceOneNightWagerToSettlementPhase(pending);
        }, ONE_NIGHT_WAGER_POPUP_VISIBLE_MS);
        return;
      }

      setOneNightWagerModal(null);
      setSpellUsageHiddenRevealCards(null);
      setState(prev => {
        if (!prev) return prev;
        const stripWagers = (field: PlayerState["field"]) => ({
          ...field,
          spellStack: removeAllOneNightWagersFromSpellStack(normalizeSpellStack(field)),
        });
        return {
          ...prev,
          playerA: { ...prev.playerA, field: stripWagers(prev.playerA.field) },
          playerB: { ...prev.playerB, field: stripWagers(prev.playerB.field) },
        };
      });
      window.setTimeout(() => {
        completeOneNightWagerSettlement(pending);
      }, ONE_NIGHT_WAGER_TOKEN_WIPE_DELAY_MS);
    },
    [
      winner,
      isInitializing,
      applyOneNightWagerPending,
      triggerCardFlash,
      advanceOneNightWagerToSettlementPhase,
      completeOneNightWagerSettlement,
    ]
  );

  useEffect(() => {
    if (!state || isInitializing) return;
    if (oneNightWagerRestoreOnMountDoneRef.current) return;
    if (!state.oneNightWagerPending) return;
    if (oneNightWagerSequenceActiveRef.current) return;

    oneNightWagerRestoreOnMountDoneRef.current = true;
    resumeOneNightWagerSequence(state.oneNightWagerPending);
  }, [state, isInitializing, resumeOneNightWagerSequence]);

  const tryTriggerOneNightWagerSequence = useCallback(() => {
    if (oneNightWagerSequenceActiveRef.current || witchTarotSequenceActiveRef.current) return;
    const snap = simulationStateRef.current;
    if (!snap || winner || isInitializing) return;
    if (!areAllUnitSlotsFilledOnBothFields(snap.playerA.field, snap.playerB.field)) return;

    const matches = findActivatableOneNightWagers({
      playerA: snap.playerA,
      playerB: snap.playerB,
      playerAField: snap.playerA.field,
      playerBField: snap.playerB.field,
    });
    if (matches.length === 0) return;

    const costsA = getPlayerUnitSlotCosts(snap.playerA.field);
    const costsB = getPlayerUnitSlotCosts(snap.playerB.field);
    const pending: OneNightWagerPendingSave = {
      phase: "popup",
      costsA,
      costsB,
      glowPlayer: resolveOneNightWagerHigherSumPlayer(costsA.total, costsB.total),
      loserPlayer: resolveOneNightWagerLoser(costsA.total, costsB.total),
      matches: oneNightWagerPendingMatchesFromStack(matches),
    };
    resumeOneNightWagerSequence(pending);
  }, [winner, isInitializing, resumeOneNightWagerSequence]);

  tryTriggerOneNightWagerSequenceRef.current = tryTriggerOneNightWagerSequence;

  const resumeSpellUsageSequence = useCallback(
    (save: SpellUsagePendingSave) => {
      if (spellUsageMotionActiveRef.current) return;
      const snap = simulationStateRef.current;
      if (!snap || winner || isInitializing) return;

      const rebuilt = buildSpellUsageHandlersFromSave(save);
      if (!rebuilt) {
        applySpellUsagePending(null);
        return;
      }

      const tesla = resolveSuperTeslaCounterFromSave(snap, save);
      spellUsagePendingRef.current = { ...rebuilt, superTeslaCounter: tesla };
      spellUsageMotionActiveRef.current = true;
      applySpellUsagePending(save);

      setSpellUsageTeslaHideOppCenterCard(false);
      setSpellUsageTeslaFlipPlayer(null);
      setSpellUsageTeslaFieldCard(tesla?.teslaCard ?? null);

      const elapsed = Date.now() - save.phaseStartedAt;
      const fullPreviewMs = tesla ? SPELL_USAGE_PREVIEW_TESLA_MS : SPELL_USAGE_PREVIEW_MS;

      const startFlyFromPending = () => {
        const pend = spellUsagePendingRef.current;
        if (!pend) return;
        if (pend.superTeslaCounter) {
          finishSpellUsageSequence();
          return;
        }
        const flyToSpellSlot =
          pend.mode === "placeSpellSlot" &&
          pend.flyToSpellSlotAfterReveal &&
          pend.targetPlayer;
        const flyToUnit =
          pend.flyToUnitAfterReveal &&
          pend.targetPlayer &&
          pend.unitSlot &&
          pend.mode === "handUnitTarget";
        if (!flyToSpellSlot && !flyToUnit) {
          finishSpellUsageSequence();
          return;
        }
        const slot = flyToSpellSlot ? "spell" : pend.unitSlot!;
        const measureAndFly = () => {
          const fromEl = spellUsageCardMeasureRef.current;
          const toEl = document.querySelector(
            `[data-field-drop][data-field-player="${pend.targetPlayer}"][data-field-slot="${slot}"]`
          ) as HTMLElement | null;
          const fr = fromEl?.getBoundingClientRect();
          const tr = toEl?.getBoundingClientRect();
          if (!fr || !tr || fr.width < 2 || tr.width < 2) {
            finishSpellUsageSequence();
            return;
          }
          const flyMs = flyToSpellSlot ? SPELL_SLOT_PLACE_FLY_MS : SPELL_USAGE_HAND_FLY_MS;
          const from = { x: fr.left, y: fr.top, w: fr.width, h: fr.height };
          const to = flyToSpellSlot
            ? {
                x: tr.left + (tr.width - fr.width) / 2,
                y: tr.top + (tr.height - fr.height) / 2,
                w: fr.width,
                h: fr.height,
              }
            : { x: tr.left, y: tr.top, w: tr.width, h: tr.height };
          const flyPhase = save.phase === "centerFly" && save.flyPhase === 1 ? 1 : 0;
          const flyStarted =
            save.phase === "centerFly" ? save.phaseStartedAt : Date.now();
          const flyElapsed = save.phase === "centerFly" ? Date.now() - flyStarted : 0;
          const resumeRemainingMs =
            flyPhase === 1 ? Math.max(50, flyMs + 50 - flyElapsed) : undefined;

          applySpellUsagePending({
            ...save,
            phase: "centerFly",
            flyPhase,
            phaseStartedAt: flyStarted,
          });
          setSpellUsageReveal(null);
          setSpellUsageFly({
            casterPlayer: pend.casterPlayer,
            previewCard: pend.previewCard,
            targetPlayer: pend.targetPlayer!,
            unitSlot: slot,
            flyTarget: flyToSpellSlot ? "spellSlot" : "unit",
            centerShowsCardBack: flyToSpellSlot ? pend.centerShowsCardBack : undefined,
            from,
            to,
            phase: flyPhase,
            flyMs,
            resumeRemainingMs,
          });
        };

        setSpellUsageReveal({
          casterPlayer: pend.casterPlayer,
          previewCard: pend.previewCard,
          centerShowsCardBack: pend.centerShowsCardBack,
        });
        requestAnimationFrame(() => requestAnimationFrame(measureAndFly));
      };

      if (save.phase === "centerFly" || elapsed >= fullPreviewMs) {
        if (tesla && elapsed >= fullPreviewMs) {
          finishSpellUsageSequence();
          return;
        }
        startFlyFromPending();
        return;
      }

      setSpellUsageReveal({
        casterPlayer: save.casterPlayer,
        previewCard: save.previewCard,
        centerShowsCardBack: save.centerShowsCardBack,
      });
      setSpellUsageRevealTick(t => t + 1);
    },
    [
      winner,
      isInitializing,
      buildSpellUsageHandlersFromSave,
      applySpellUsagePending,
      finishSpellUsageSequence,
    ]
  );

  useEffect(() => {
    if (!state || isInitializing) return;
    if (spellUsageRestoreOnMountDoneRef.current) return;
    if (!state.spellUsagePending) return;
    if (spellUsageMotionActiveRef.current) return;
    if (spellUsageReveal || spellUsageFly) return;

    spellUsageRestoreOnMountDoneRef.current = true;
    resumeSpellUsageSequence(state.spellUsagePending);
  }, [
    state,
    isInitializing,
    spellUsageReveal,
    spellUsageFly,
    resumeSpellUsageSequence,
  ]);

  const placeHandCardFromHand = (
    gameState: SimulationState,
    cardIndex: number,
    sourcePlayer: "A" | "B",
    slot: "is" | "m" | "os" | "spell",
    targetPlayer: "A" | "B"
  ) => {
    if (!gameState || winner) return;
    if (pendingLegendarySwordStrike) {
      alert("전설의 검 연격이 끝날 때까지 다른 행동을 할 수 없습니다.");
      return;
    }
    if (
      danhaStealFly ||
      spellUsageReveal ||
      spellUsageFly ||
      spellUsageMotionActiveRef.current ||
      witchTarotSequenceActiveRef.current ||
      witchTarotCoin ||
      oneNightWagerSequenceActiveRef.current ||
      gameState.oneNightWagerPending ||
      gameState.spellUsagePending ||
      gameState.guihwanPending
    ) {
      return;
    }

    if (sourcePlayer !== targetPlayer || gameState.currentTurn !== sourcePlayer) {
      return;
    }
    if (!Number.isFinite(cardIndex) || cardIndex < 0) return;

    const isPlayerA = sourcePlayer === "A";

    const hand = isPlayerA ? gameState.playerA.hand : gameState.playerB.hand;
    const handCard = hand.slice(cardIndex, cardIndex + 1).pop();
    if (!handCard) return;

    if (isMuhyohwaSpellCard(handCard)) {
      pushInfoFloat(
        `${sourcePlayer}-spell`,
        "상대 스펠 발동 연출 중 필드 중앙에 놓아 사용하세요",
        INFO_FLOAT_MS
      );
      return;
    }

    if (isEnemyUnitDragTargetSpell(handCard)) {
      pushInfoFloat(`${sourcePlayer}-spell`, "적 유닛 위에 드래그하여 사용하세요", INFO_FLOAT_MS);
      return;
    }

    if (isOrietChosangSpellCard(handCard)) {
      pushInfoFloat(`${sourcePlayer}-spell`, "아군 유닛 위에 드래그하여 사용하세요", INFO_FLOAT_MS);
      return;
    }

    if (isGuihwanSpellCard(handCard)) {
      if (slot === "spell" || targetPlayer !== sourcePlayer) {
        pushInfoFloat(`${sourcePlayer}-spell`, "빈 아군 필드(Is·M·Os)에 놓아 주세요", INFO_FLOAT_MS);
        return;
      }
      placeGuihwanSpellOnEmptyField(gameState, cardIndex, sourcePlayer, slot);
      return;
    }

    const statsInstanceId = createSimulationStatsInstanceId();
    const handCardForField = stripPpSimHandNewGlow(handCard);
    const card: FieldCard = {
      ...handCardForField,
      statsInstanceId,
      currentHp: Number(handCard.hp) || 0,
      hasAttacked: false,
      hasBeenAttackedThisTurn: false,
      summonedTurn: `${gameState.turnCount}-${gameState.currentTurn}` 
    };
    if (handCard.name === DARK_KNIGHT_ID) {
      card.darkKnightSoulGauge = 0;
    }
    if (handCard.name === EL_WING_ID) {
      card.elWingSinseokGauge = 0;
    }
    if (handCard.name === MAXELLAND_ID) {
      card.maxellandTenacityGauge = 0;
    }
    if (handCard.name === IVERSON_ID) {
      card.iversonSummonWaitEndTurnTicksRemaining = IVERSON_SUMMON_WAIT_END_TURNS;
    }
    if (handCard.name === UNIT.LEGENDARY_SWORD) {
      Object.assign(card, initializeLegendarySwordFieldCard(card));
    }
    if (slot === "spell" && handCard.name === BANG_EOMAK_SPELL_ID) {
      card.bangEomakDefenseEndTurnTicksRemaining = BANG_EOMAK_DEFENSE_INITIAL_END_TURN_TICKS;
    }
    if (slot === "spell" && handCard.name === CHEOLBYEOK_SPELL_ID) {
      card.cheolbyeokAllyInvulnEndTurnTicksRemaining = CHEOLBYEOK_ALLY_INVULN_INITIAL_END_TURN_TICKS;
    }
    if (slot === "spell" && handCard.name === HYUGESOJAUI_ANSIK_SPELL_ID) {
      card.hyugesojauiAnsikEndTurnTicksRemaining = HYUGESOJAUI_ANSIK_INITIAL_END_TURN_TICKS;
    }
    if (slot === "spell" && handCard.name === BUSINESS_GANG_SPELL_ID) {
      card.businessGangEndTurnTicksRemaining = BUSINESS_GANG_INITIAL_END_TURN_TICKS;
    }
    if (slot === "spell" && isAntHellSpellCard(handCard)) {
      card.antHellEndTurnTicksRemaining = ANT_HELL_SPELL_INITIAL_END_TURN_TICKS;
    }

    const typeStr = String(card.type || "").toLowerCase();
    const categoryStr = String(card.category || "").toLowerCase();
    
    const isSpellCard = typeStr.includes("spell") || typeStr.includes("스펠") || typeStr.includes("마법") ||
                        categoryStr.includes("spell") || categoryStr.includes("스펠") || categoryStr.includes("마법");
    
    const isSpellSlot = slot === "spell";

    if (isSpellSlot && !isSpellCard) {
      alert("스펠 칸에는 스펠(마법) 카드만 배치할 수 있습니다!");
      return;
    }
    
    if (!isSpellSlot && isSpellCard) {
      alert("스펠 카드는 유닛 슬롯(Is, M, Os)에 배치할 수 없습니다!");
      return;
    }

    const targetField = isPlayerA ? gameState.playerA.field : gameState.playerB.field;
    const spellStackBefore = normalizeSpellStack(targetField);

    if (!isSpellSlot) {
      const isUnitSlotOccupied =
        slot === "is" ? targetField.is : slot === "m" ? targetField.m : targetField.os;
      if (isUnitSlotOccupied !== null) {
        alert("이미 카드가 배치된 자리입니다.");
        return;
      }
    }

    const currentTokens = isPlayerA ? gameState.playerA.tokens : gameState.playerB.tokens;
    const placementCost =
      isSpellSlot && isHiddenSpellCard(handCard) ? 0 : Number(card.cost) || 0;
    if (currentTokens < placementCost) {
      pushInfoFloat(`${targetPlayer}-${slot}`, "토큰이 부족합니다", INFO_FLOAT_MS);
      return;
    }

    if (
      isSpellSlot &&
      isSpellCard &&
      blockRonuActiveSpellHandPlay(gameState, handCard, sourcePlayer, targetPlayer, slot)
    ) {
      return;
    }

    if (isSpellSlot) {
      if (isMeteoSpellCard(handCard)) {
        const enemyPlayer = sourcePlayer === "A" ? "B" : "A";
        const meteoVfxHits: { slotKey: string; hpLoss: number }[] = [];
        const meteoElWingImmunitySlotKeys: string[] = [];
        scheduleSpellHandUsageSequence(gameState, {
          casterPlayer: sourcePlayer,
          previewCard: handCard,
          mode: "placeSpellSlot",
          targetPlayer,
          flyToSpellSlotAfterReveal: true,
          centerShowsCardBack: isHiddenSpellCard(handCard),
          preApply: prev => {
            const h = [...(isPlayerA ? prev.playerA.hand : prev.playerB.hand)];
            if (cardIndex < 0 || cardIndex >= h.length) return prev;
            const row = h[cardIndex];
            if (!row || !isMeteoSpellCard(row)) return prev;
            h.splice(cardIndex, 1);
            const key = isPlayerA ? "playerA" : "playerB";
            const ps = isPlayerA ? prev.playerA : prev.playerB;
            return {
              ...prev,
              [key]: { ...ps, hand: h, tokens: ps.tokens - placementCost },
            };
          },
          commit: prev => {
            /* Strict Mode 등에서 commit 업데이터가 2회 호출될 때 VFX 중복 방지 */
            meteoVfxHits.length = 0;
            meteoElWingImmunitySlotKeys.length = 0;
            const newPlayerA = { ...prev.playerA, field: { ...prev.playerA.field } };
            const newPlayerB = { ...prev.playerB, field: { ...prev.playerB.field } };
            const enemySide = enemyPlayer === "A" ? newPlayerA : newPlayerB;
            let rewindCards = [...prev.rewindCards, handCardForField];
            let unitCombatStats = prev.unitCombatStats;
            let unitStatsOrder = prev.unitStatsOrder;
            for (const slotName of ["is", "m", "os"] as const) {
              const unit = enemySide.field[slotName];
              if (!unit || unit.currentHp <= 0) continue;
              if (
                isElWingBlockingEnemyAttackSpell(
                  unit,
                  enemyPlayer,
                  slotName,
                  newPlayerA.field,
                  newPlayerB.field
                )
              ) {
                meteoElWingImmunitySlotKeys.push(`${enemyPlayer}-${slotName}`);
                enemySide.field[slotName] = grantElWingSinseokGaugeFromMeteoSplash(unit);
                continue;
              }

              const resolved = applyMeteoDamageToEnemyUnit({
                target: unit,
                targetPlayer: enemyPlayer,
                targetSlot: slotName,
                playerAField: newPlayerA.field,
                playerBField: newPlayerB.field,
              });

              const baseTarget =
                Object.keys(resolved.baekseuPatch).length > 0
                  ? stripBaekseuHarmfulEffectsForInvuln(unit)
                  : unit;
              let updatedTarget: FieldCard = {
                ...baseTarget,
                ...resolved.baekseuPatch,
                ...resolved.barrierPatch,
                currentHp: resolved.isDestroyed ? 0 : resolved.newHp,
              };

              /**
               * 애벌레킹(W) — 메테오 광역은 host와 별도로 W에 독립 직격(50% 공유 아님).
               */
              let riderRewindEntry: CardRow | null = null;
              if (hasAebeolaekingRider(updatedTarget)) {
                const wMeteo = applyAebeolaekingAoeDamageToRiderOnly(updatedTarget, METEO_AOE_DAMAGE, {
                  hostOwner: enemyPlayer,
                  playerAField: newPlayerA.field,
                  playerBField: newPlayerB.field,
                });
                updatedTarget = wMeteo.updatedHost;
                if (wMeteo.deadRider) {
                  riderRewindEntry = stripAebeolaekingRiderMeta(wMeteo.deadRider);
                }
              }

              if (resolved.isDestroyed) {
                enemySide.field[slotName] = null;
                cleanupSimulationUnitDeath(
                  updatedTarget,
                  { field: newPlayerA.field },
                  { field: newPlayerB.field },
                  prev.globalTurnCount
                );
                rewindCards = appendDeadHostWithRiderToRewindCards(rewindCards, updatedTarget);
                if (riderRewindEntry && !hasAebeolaekingRider(updatedTarget)) {
                  rewindCards.push(riderRewindEntry);
                }
                const sid = unit.statsInstanceId;
                if (sid) {
                  const { [sid]: _removed, ...restStats } = unitCombatStats;
                  unitCombatStats = restStats;
                  unitStatsOrder = unitStatsOrder.filter(x => x !== sid);
                }
              } else {
                enemySide.field[slotName] = updatedTarget;
                if (riderRewindEntry) rewindCards = [...rewindCards, riderRewindEntry];
              }

              applyPostStrikeAllyHealsIncludingW({
                targetPlayer: enemyPlayer,
                targetSlot: slotName,
                playerAField: newPlayerA.field,
                playerBField: newPlayerB.field,
                morningMoodDeathHeal: resolved.morningMoodDeathHeal,
                startingTreeAllyHeal: resolved.startingTreeAllyHeal,
              });

              if (resolved.hpLoss > 0) {
                meteoVfxHits.push({
                  slotKey: `${enemyPlayer}-${slotName}`,
                  hpLoss: resolved.hpLoss,
                });
              }
            }

            return finalizeSpellWithSimpan({
              ...prev,
              unitCombatStats,
              unitStatsOrder,
              playerA: newPlayerA,
              playerB: newPlayerB,
              rewindCards,
            });
          },
          afterCommitVfx: () => {
            for (const slotKey of meteoElWingImmunitySlotKeys) {
              showElWingMagicImmunityBlockOnUnit(slotKey);
            }
            const meteoVfxBySlot = new Map<string, number>();
            for (const hit of meteoVfxHits) meteoVfxBySlot.set(hit.slotKey, hit.hpLoss);
            for (const [slotKey, hpLoss] of meteoVfxBySlot) {
              showMeteoSpellHitOnTarget(slotKey, hpLoss);
            }
          },
        });
        return;
      }

      if (isBefpkkiriSpellCard(handCard)) {
        scheduleSpellHandUsageSequence(gameState, {
          casterPlayer: sourcePlayer,
          previewCard: handCard,
          mode: "placeSpellSlot",
          targetPlayer,
          flyToSpellSlotAfterReveal: true,
          centerShowsCardBack: isHiddenSpellCard(handCard),
          preApply: prev => {
            const h = [...(isPlayerA ? prev.playerA.hand : prev.playerB.hand)];
            if (cardIndex < 0 || cardIndex >= h.length) return prev;
            const row = h[cardIndex];
            if (!row || !isBefpkkiriSpellCard(row)) return prev;
            h.splice(cardIndex, 1);
            const key = isPlayerA ? "playerA" : "playerB";
            const ps = isPlayerA ? prev.playerA : prev.playerB;
            return {
              ...prev,
              [key]: { ...ps, hand: h, tokens: ps.tokens - placementCost },
            };
          },
          commit: prev =>
            applyBefpkkiriSpellCommit(prev, sourcePlayer, handCardForField, c =>
              markPpSimHandNewGlow(c, `pp-hng-${++ppSimHandGlowSeqRef.current}`)
            ),
          afterCommitVfx: () => {
            triggerCardFlash(`${sourcePlayer}-spell`, "befpkkiriSpellTrigger");
          },
        });
        return;
      }

      if (isBubbleStationSpellCard(handCard)) {
        const statsId = createSimulationStatsInstanceId();
        const fieldCard: FieldCard = {
          ...handCardForField,
          statsInstanceId: statsId,
          currentHp: Number(handCard.hp) || 0,
          hasAttacked: false,
          hasBeenAttackedThisTurn: false,
          summonedTurn: `${gameState.turnCount}-${gameState.currentTurn}`,
        };
        bubbleStationRestoreOnMountDoneRef.current = true;
        scheduleSpellHandUsageSequence(gameState, {
          casterPlayer: sourcePlayer,
          previewCard: handCard,
          mode: "placeSpellSlot",
          targetPlayer,
          fieldCard,
          flyToSpellSlotAfterReveal: true,
          centerShowsCardBack: isHiddenSpellCard(handCard),
          preApply: prev => {
            const h = [...(isPlayerA ? prev.playerA.hand : prev.playerB.hand)];
            if (cardIndex < 0 || cardIndex >= h.length) return prev;
            const row = h[cardIndex];
            if (!row || !isBubbleStationSpellCard(row)) return prev;
            h.splice(cardIndex, 1);
            const key = isPlayerA ? "playerA" : "playerB";
            const ps = isPlayerA ? prev.playerA : prev.playerB;
            return {
              ...prev,
              [key]: { ...ps, hand: h, tokens: ps.tokens - placementCost },
            };
          },
          commit: prev =>
            applyBubbleStationInitialCommit(prev, sourcePlayer, fieldCard),
          afterCommitVfx: () => {
            triggerCardFlash(`${sourcePlayer}-spell`, "bubbleStationSpellTrigger");
          },
        });
        return;
      }

      if (isWitchTarotSpellCard(handCard)) {
        const statsId = createSimulationStatsInstanceId();
        const fieldCard: FieldCard = {
          ...handCardForField,
          statsInstanceId: statsId,
          currentHp: Number(handCard.hp) || 0,
          hasAttacked: false,
          hasBeenAttackedThisTurn: false,
          summonedTurn: `${gameState.turnCount}-${gameState.currentTurn}`,
        };
        scheduleSpellHandUsageSequence(gameState, {
          casterPlayer: sourcePlayer,
          previewCard: handCard,
          mode: "placeSpellSlot",
          targetPlayer,
          fieldCard,
          flyToSpellSlotAfterReveal: true,
          centerShowsCardBack: false,
          preApply: prev => {
            const h = [...(isPlayerA ? prev.playerA.hand : prev.playerB.hand)];
            if (cardIndex < 0 || cardIndex >= h.length) return prev;
            h.splice(cardIndex, 1);
            const key = isPlayerA ? "playerA" : "playerB";
            const ps = isPlayerA ? prev.playerA : prev.playerB;
            return {
              ...prev,
              [key]: { ...ps, hand: h, tokens: ps.tokens - placementCost },
            };
          },
          commit: prev => {
            const tf = isPlayerA ? prev.playerA.field : prev.playerB.field;
            const stackBefore = normalizeSpellStack(tf);
            const updatedField: PlayerState["field"] = {
              ...tf,
              spellStack: appendSpellToStack(stackBefore, fieldCard),
            };
            const key = isPlayerA ? "playerA" : "playerB";
            const ps = isPlayerA ? prev.playerA : prev.playerB;
            const nextSpellLog = [
              ...prev.spellDeployLog,
              {
                statsInstanceId: fieldCard.statsInstanceId!,
                name: fieldCard.name,
                player: sourcePlayer,
                summonedTurn: fieldCard.summonedTurn,
              },
            ];
            return patchWitchTarotPending(
              {
                ...prev,
                spellDeployLog: nextSpellLog,
                [key]: { ...ps, field: updatedField },
              },
              {
                casterPlayer: sourcePlayer,
                coinHeads: null,
                stepIndex: 0,
                awaitingDiscardPlayer: null,
              }
            );
          },
          afterCommitVfx: () => {
            triggerCardFlash(`${sourcePlayer}-spell`, "witchTarotSpellPulse");
            witchTarotSequenceActiveRef.current = true;
            setWitchTarotFlowActive(true);
            if (witchTarotCoinStartScheduledRef.current) return;
            witchTarotCoinStartScheduledRef.current = true;
            window.setTimeout(() => {
              witchTarotCoinStartScheduledRef.current = false;
              startWitchTarotCoinSequence(sourcePlayer);
            }, WITCH_TAROT_COIN_DELAY_MS);
          },
        });
        return;
      }

      const statsId = createSimulationStatsInstanceId();
      const fieldCard: FieldCard = {
        ...handCardForField,
        statsInstanceId: statsId,
        currentHp: Number(handCard.hp) || 0,
        hasAttacked: false,
        hasBeenAttackedThisTurn: false,
        summonedTurn: `${gameState.turnCount}-${gameState.currentTurn}`,
      };
      if (handCard.name === BANG_EOMAK_SPELL_ID) {
        fieldCard.bangEomakDefenseEndTurnTicksRemaining = BANG_EOMAK_DEFENSE_INITIAL_END_TURN_TICKS;
      }
      if (handCard.name === CHEOLBYEOK_SPELL_ID) {
        fieldCard.cheolbyeokAllyInvulnEndTurnTicksRemaining =
          CHEOLBYEOK_ALLY_INVULN_INITIAL_END_TURN_TICKS;
      }
      if (handCard.name === HYUGESOJAUI_ANSIK_SPELL_ID) {
        fieldCard.hyugesojauiAnsikEndTurnTicksRemaining = HYUGESOJAUI_ANSIK_INITIAL_END_TURN_TICKS;
      }
      if (handCard.name === BUSINESS_GANG_SPELL_ID) {
        fieldCard.businessGangEndTurnTicksRemaining = BUSINESS_GANG_INITIAL_END_TURN_TICKS;
      }
      if (isAntHellSpellCard(handCard)) {
        fieldCard.antHellEndTurnTicksRemaining = ANT_HELL_SPELL_INITIAL_END_TURN_TICKS;
      }
      let hyuPlacePerSlot: HyugesojauiAnsikHealSlotResult[] = [];
      let hyuPlaceCombatPatches: HyugesojauiAnsikCombatPatch[] = [];
      const antHellHandPlaceVfx: { applied: string[]; elWing: string[] } = {
        applied: [],
        elWing: [],
      };
      scheduleSpellHandUsageSequence(gameState, {
        casterPlayer: sourcePlayer,
        previewCard: handCard,
        mode: "placeSpellSlot",
        targetPlayer,
        fieldCard,
        flyToSpellSlotAfterReveal: true,
        centerShowsCardBack: isHiddenSpellCard(handCard),
        preApply: prev => {
          const h = [...(isPlayerA ? prev.playerA.hand : prev.playerB.hand)];
          if (cardIndex < 0 || cardIndex >= h.length) return prev;
          h.splice(cardIndex, 1);
          const key = isPlayerA ? "playerA" : "playerB";
          const ps = isPlayerA ? prev.playerA : prev.playerB;
          return {
            ...prev,
            [key]: { ...ps, hand: h, tokens: ps.tokens - placementCost },
          };
        },
        commit: prev => {
          const tf = isPlayerA ? prev.playerA.field : prev.playerB.field;
          const stackBefore = normalizeSpellStack(tf);
          let updatedField: PlayerState["field"] = {
            ...tf,
            spellStack: appendSpellToStack(stackBefore, fieldCard),
          };
          if (handCard.name === CHEOLBYEOK_SPELL_ID) {
            updatedField = {
              ...updatedField,
              is: updatedField.is ? stripBaekseuHarmfulEffectsForInvuln(updatedField.is) : null,
              m: updatedField.m ? stripBaekseuHarmfulEffectsForInvuln(updatedField.m) : null,
              os: updatedField.os ? stripBaekseuHarmfulEffectsForInvuln(updatedField.os) : null,
            };
          }
          if (handCard.name === HYUGESOJAUI_ANSIK_SPELL_ID) {
            const hr = applyHyugesojauiAnsikHealAttempt(updatedField, HYUGESOJAUI_ANSIK_HEAL_PER_TRIGGER);
            updatedField = hr.nextField;
            hyuPlacePerSlot = hr.perSlot;
            hyuPlaceCombatPatches = hr.combatPatches;
          }
          const key = isPlayerA ? "playerA" : "playerB";
          const ps = isPlayerA ? prev.playerA : prev.playerB;
          const nextSpellLog = [
            ...prev.spellDeployLog,
            {
              statsInstanceId: fieldCard.statsInstanceId!,
              name: fieldCard.name,
              player: sourcePlayer,
              summonedTurn: fieldCard.summonedTurn,
            },
          ];
          let r: typeof prev = {
            ...prev,
            spellDeployLog: nextSpellLog,
            [key]: { ...ps, field: updatedField },
          };
          if (hyuPlaceCombatPatches.length > 0) {
            r = {
              ...r,
              unitCombatStats: patchManyUnitCombatStats(r.unitCombatStats, hyuPlaceCombatPatches),
            };
          }
          /* 휴게소의 안식 — 자기 W(적 host에 부착) 회복도 동반 처리 */
          if (handCard.name === HYUGESOJAUI_ANSIK_SPELL_ID) {
            const enemyKey = sourcePlayer === "A" ? "playerB" : "playerA";
            const riderHeal = applyHyugesojauiAnsikHealToOwnAebeolaekingRiders(
              r[enemyKey].field,
              sourcePlayer,
              HYUGESOJAUI_ANSIK_HEAL_PER_TRIGGER
            );
            r = {
              ...r,
              [enemyKey]: { ...r[enemyKey], field: riderHeal.nextEnemyField },
              unitCombatStats: patchManyUnitCombatStats(r.unitCombatStats, riderHeal.combatPatches),
            };
          }
          if (isAntHellSpellCard(handCard)) {
            antHellHandPlaceVfx.applied = [];
            antHellHandPlaceVfx.elWing = [];
            const newPlayerA = { ...r.playerA, field: { ...r.playerA.field } };
            const newPlayerB = { ...r.playerB, field: { ...r.playerB.field } };
            const wave = applyAntHellSuppressionWaveToEnemies({
              casterPlayer: sourcePlayer,
              playerA: { field: newPlayerA.field },
              playerB: { field: newPlayerB.field },
              globalTurnCount: prev.globalTurnCount,
            });
            antHellHandPlaceVfx.applied = wave.appliedSlotKeys;
            antHellHandPlaceVfx.elWing = wave.elWingImmunitySlotKeys;
            r = { ...r, playerA: newPlayerA, playerB: newPlayerB };
          }
          return finalizeSpellWithSimpan(r);
        },
        afterCommitVfx: () => {
          const fieldAfterPlace = {
            ...targetField,
            spellStack: appendSpellToStack(spellStackBefore, fieldCard),
          };
          if (handCard.name === HYUGESOJAUI_ANSIK_SPELL_ID && hyuPlacePerSlot.length > 0) {
            playHyugesojauiAnsikAllyPulseAndHealVfx(targetPlayer, hyuPlacePerSlot);
          }
          if (isAntHellSpellCard(handCard)) {
            window.setTimeout(() => {
              triggerCardFlash(`${targetPlayer}-spell`, "businessGangSpellPulse");
            }, 0);
            for (const slotKey of antHellHandPlaceVfx.elWing) {
              showElWingMagicImmunityBlockOnUnit(slotKey);
            }
            for (const slotKey of antHellHandPlaceVfx.applied) {
              showAntHellSpellHitOnTarget(slotKey);
            }
          }
          if (handCard.name === BANG_EOMAK_SPELL_ID) {
            window.setTimeout(() => {
              (["is", "m", "os"] as const).forEach(s =>
                triggerCardFlash(`${targetPlayer}-${s}`, "spellBangEomakAllyPulse")
              );
            }, 0);
          }
          if (isJipjungSagyeokSpellCard(handCard)) {
            window.setTimeout(() => {
              (["is", "m", "os"] as const).forEach(s =>
                triggerCardFlash(`${targetPlayer}-${s}`, "spellJipjungAllyPulse")
              );
            }, 0);
          }
          if (handCard.name === CHEOLBYEOK_SPELL_ID) {
            window.setTimeout(() => {
              (["is", "m", "os"] as const).forEach(s =>
                triggerCardFlash(`${targetPlayer}-${s}`, "spellCheolbyeokAllyPulse")
              );
            }, 0);
          }
          if (handCard.name === BUSINESS_GANG_SPELL_ID) {
            window.setTimeout(() => {
              triggerCardFlash(`${targetPlayer}-spell`, "businessGangSpellPulse");
            }, 0);
          }
          window.setTimeout(() => tryTriggerOneNightWagerSequence(), 0);
        },
      });
      return;
    }

    const hyuDirectVfxBag: { perSlot: HyugesojauiAnsikHealSlotResult[] } = { perSlot: [] };
    const antHellDeployVfxBag: { applied: string[]; elWing: string[] } = {
      applied: [],
      elWing: [],
    };
    setState(prev => {
      if (!prev) return prev;
      
      const newHand = Array.from(isPlayerA ? prev.playerA.hand : prev.playerB.hand);
      newHand.splice(cardIndex, 1);

      const nextSpellStack = isSpellSlot ? appendSpellToStack(spellStackBefore, card) : spellStackBefore;
      let updatedField: PlayerState["field"] = {
        is: slot === "is" ? card : targetField.is,
        m: slot === "m" ? card : targetField.m,
        os: slot === "os" ? card : targetField.os,
        spellStack: nextSpellStack,
      };
      if (isSpellSlot && handCard.name === CHEOLBYEOK_SPELL_ID) {
        updatedField = {
          ...updatedField,
          is: updatedField.is ? stripBaekseuHarmfulEffectsForInvuln(updatedField.is) : null,
          m: updatedField.m ? stripBaekseuHarmfulEffectsForInvuln(updatedField.m) : null,
          os: updatedField.os ? stripBaekseuHarmfulEffectsForInvuln(updatedField.os) : null,
        };
      }
      let hyuDirectPerSlot: HyugesojauiAnsikHealSlotResult[] = [];
      let hyuDirectCombatPatches: HyugesojauiAnsikCombatPatch[] = [];
      if (isSpellSlot && handCard.name === HYUGESOJAUI_ANSIK_SPELL_ID) {
        const hr = applyHyugesojauiAnsikHealAttempt(updatedField, HYUGESOJAUI_ANSIK_HEAL_PER_TRIGGER);
        updatedField = hr.nextField;
        hyuDirectPerSlot = hr.perSlot;
        hyuDirectCombatPatches = hr.combatPatches;
        hyuDirectVfxBag.perSlot = hr.perSlot;
      }

      const newPlayerA = {
        ...prev.playerA,
        tokens: isPlayerA ? prev.playerA.tokens - placementCost : prev.playerA.tokens,
        hand: isPlayerA ? newHand : prev.playerA.hand,
        field: { ...prev.playerA.field },
      };
      const newPlayerB = {
        ...prev.playerB,
        tokens: isPlayerA ? prev.playerB.tokens : prev.playerB.tokens - placementCost,
        hand: isPlayerA ? prev.playerB.hand : newHand,
        field: { ...prev.playerB.field },
      };
      if (isPlayerA) {
        newPlayerA.field = updatedField;
      } else {
        newPlayerB.field = updatedField;
      }

      if (!isSpellSlot) {
        const deployVfx = tryApplyAntHellSuppressionOnEnemyUnitDeploy({
          victimPlayer: targetPlayer,
          victimSlot: slot as "is" | "m" | "os",
          playerA: { field: newPlayerA.field },
          playerB: { field: newPlayerB.field },
          globalTurnCount: prev.globalTurnCount,
        });
        if (deployVfx.appliedSlotKey) antHellDeployVfxBag.applied.push(deployVfx.appliedSlotKey);
        if (deployVfx.elWingImmunitySlotKey) {
          antHellDeployVfxBag.elWing.push(deployVfx.elWingImmunitySlotKey);
        }
      }

      const nextUnitCombat = !isSpellSlot
        ? {
            ...prev.unitCombatStats,
            [card.statsInstanceId!]: emptyUnitCombatRow(
              card.name,
              targetPlayer,
              card.summonedTurn
            ),
          }
        : prev.unitCombatStats;
      const nextUnitOrder = !isSpellSlot
        ? [...prev.unitStatsOrder, card.statsInstanceId!]
        : prev.unitStatsOrder;
      const nextSpellLog = isSpellSlot
        ? [
            ...prev.spellDeployLog,
            {
              statsInstanceId: card.statsInstanceId!,
              name: card.name,
              player: targetPlayer,
              summonedTurn: card.summonedTurn,
            },
          ]
        : prev.spellDeployLog;

      let nextState: typeof prev = {
        ...prev,
        unitCombatStats: nextUnitCombat,
        unitStatsOrder: nextUnitOrder,
        spellDeployLog: nextSpellLog,
        playerA: newPlayerA,
        playerB: newPlayerB,
      };
      if (hyuDirectCombatPatches.length > 0) {
        nextState = {
          ...nextState,
          unitCombatStats: patchManyUnitCombatStats(
            nextState.unitCombatStats,
            hyuDirectCombatPatches
          ),
        };
      }
      /* 휴게소의 안식 — 자기 W(적 host에 부착) 회복도 동반 처리 */
      if (isSpellSlot && handCard.name === HYUGESOJAUI_ANSIK_SPELL_ID) {
        const enemyKey = targetPlayer === "A" ? "playerB" : "playerA";
        const riderHeal = applyHyugesojauiAnsikHealToOwnAebeolaekingRiders(
          nextState[enemyKey].field,
          targetPlayer,
          HYUGESOJAUI_ANSIK_HEAL_PER_TRIGGER
        );
        nextState = {
          ...nextState,
          [enemyKey]: { ...nextState[enemyKey], field: riderHeal.nextEnemyField },
          unitCombatStats: patchManyUnitCombatStats(nextState.unitCombatStats, riderHeal.combatPatches),
        };
      }
      return isSpellSlot ? finalizeSpellWithSimpan(nextState) : nextState;
    });
    if (isSpellSlot && handCard.name === HYUGESOJAUI_ANSIK_SPELL_ID && hyuDirectVfxBag.perSlot.length > 0) {
      playHyugesojauiAnsikAllyPulseAndHealVfx(targetPlayer, hyuDirectVfxBag.perSlot);
    }
    if (!isSpellSlot) {
      for (const slotKey of antHellDeployVfxBag.elWing) {
        showElWingMagicImmunityBlockOnUnit(slotKey);
      }
      for (const slotKey of antHellDeployVfxBag.applied) {
        showAntHellSpellHitOnTarget(slotKey);
      }
    }

    const fieldAfterPlace: PlayerState["field"] = {
      ...targetField,
      is: slot === "is" ? card : targetField.is,
      m: slot === "m" ? card : targetField.m,
      os: slot === "os" ? card : targetField.os,
      spellStack: isSpellSlot ? appendSpellToStack(spellStackBefore, card) : spellStackBefore,
    };

    /* 능력 발동 이펙트 — 방어막·집중 사격 스펠 필드 배치 시 같은 진영 유닛 슬롯 전부 */
    if (isSpellSlot && handCard.name === BANG_EOMAK_SPELL_ID) {
      window.setTimeout(() => {
        (["is", "m", "os"] as const).forEach(s =>
          triggerCardFlash(`${targetPlayer}-${s}`, "spellBangEomakAllyPulse")
        );
      }, 0);
    }
    if (isSpellSlot && isJipjungSagyeokSpellCard(handCard)) {
      window.setTimeout(() => {
        (["is", "m", "os"] as const).forEach(s =>
          triggerCardFlash(`${targetPlayer}-${s}`, "spellJipjungAllyPulse")
        );
      }, 0);
    }
    if (isSpellSlot && handCard.name === CHEOLBYEOK_SPELL_ID) {
      window.setTimeout(() => {
        (["is", "m", "os"] as const).forEach(s =>
          triggerCardFlash(`${targetPlayer}-${s}`, "spellCheolbyeokAllyPulse")
        );
      }, 0);
    }
    if (isSpellSlot && handCard.name === BUSINESS_GANG_SPELL_ID) {
      window.setTimeout(() => {
        triggerCardFlash(`${targetPlayer}-spell`, "businessGangSpellPulse");
      }, 0);
    }

    const pyredAuraCtxAfterPlace = buildPyredAuraFieldContext(
      targetPlayer,
      fieldAfterPlace,
      targetPlayer === "A" ? fieldAfterPlace : gameState.playerA.field,
      targetPlayer === "B" ? fieldAfterPlace : gameState.playerB.field
    );

    /* 능력 발동 이펙트 — 파이레드 필드 배치 시 본인 + 지금 효과를 받는 [공격형] 아군 */
    if (!isSpellSlot && card.name === PYRED_ID) {
      const pyredKey = `${sourcePlayer}-${slot as "is" | "m" | "os"}`;
      triggerCardFlash(pyredKey, "pyredSummon");
      if (fieldHasActivePyredAuraSource(pyredAuraCtxAfterPlace)) {
        (["is", "m", "os"] as const).forEach(s => {
          if (s === slot) return;
          const ally = fieldAfterPlace[s];
          if (!hasPyredAttackAura(ally, fieldAfterPlace, pyredAuraCtxAfterPlace)) return;
          triggerCardFlash(`${sourcePlayer}-${s}`, "pyredSummon");
        });
      }
    }

    /* 파이레드가 이미 있을 때 [공격형] 아군 신규 배치 — 파이레드와 해당 아군 동시 연출 */
    if (
      !isSpellSlot &&
      card.name !== PYRED_ID &&
      hasPyredAttackAura(card, fieldAfterPlace, pyredAuraCtxAfterPlace)
    ) {
      const allyKey = `${sourcePlayer}-${slot as "is" | "m" | "os"}`;
      triggerCardFlash(allyKey, "pyredSummon");
      (["is", "m", "os"] as const).forEach(s => {
        const u = fieldAfterPlace[s];
        if (!u || u.name !== PYRED_ID) return;
        triggerCardFlash(`${sourcePlayer}-${s}`, "pyredSummon");
      });
    }

    /* 능력 발동 이펙트 — 모닝 무드 필드 배치 시 본인 + 지금 효과를 받는 [지원형] 아군 */
    if (!isSpellSlot && card.name === MORNING_MOOD_ID) {
      const morningKey = `${sourcePlayer}-${slot as "is" | "m" | "os"}`;
      triggerCardFlash(morningKey, "morningMoodSummon");
      (["is", "m", "os"] as const).forEach(s => {
        if (s === slot) return;
        const ally = fieldAfterPlace[s];
        if (!hasMorningMoodAttackAura(ally, fieldAfterPlace, pyredAuraCtxAfterPlace)) return;
        triggerCardFlash(`${sourcePlayer}-${s}`, "morningMoodSummon");
      });
    }

    /* 모닝 무드가 이미 있을 때 [지원형] 아군 신규 배치 — 모닝 무드와 해당 아군 동시 연출 */
    if (
      !isSpellSlot &&
      card.name !== MORNING_MOOD_ID &&
      hasMorningMoodAttackAura(card, fieldAfterPlace, pyredAuraCtxAfterPlace)
    ) {
      const allyKey = `${sourcePlayer}-${slot as "is" | "m" | "os"}`;
      triggerCardFlash(allyKey, "morningMoodSummon");
      (["is", "m", "os"] as const).forEach(s => {
        const u = fieldAfterPlace[s];
        if (!u || u.name !== MORNING_MOOD_ID) return;
        triggerCardFlash(`${sourcePlayer}-${s}`, "morningMoodSummon");
      });
    }

    /* 시작의 나무 필드 배치: 자신 + 모든 아군 동시 녹색 연출 */
    if (!isSpellSlot && card.name === STARTING_TREE_ID) {
      (["is", "m", "os"] as const).forEach(s => {
        if (!fieldAfterPlace[s]) return;
        triggerCardFlash(`${sourcePlayer}-${s}`, "startingTreeSummon");
      });
    }

    /* 능력 발동 이펙트 — 필립 필드 배치(본인·마주 칸 상대 동시) */
    if (!isSpellSlot && card.name === PHILIP_ID) {
      const uSlot = slot as "is" | "m" | "os";
      const opp = sourcePlayer === "A" ? "B" : "A";
      const oppField = opp === "A" ? gameState.playerA.field : gameState.playerB.field;
      triggerCardFlash(`${sourcePlayer}-${uSlot}`, "philipSummon");
      if (oppField[uSlot]) {
        triggerCardFlash(`${opp}-${uSlot}`, "philipSummon");
      }
    }

    if (!isSpellSlot && card.name === DINNER_ID) {
      const uSlot = slot as "is" | "m" | "os";
      const opp = sourcePlayer === "A" ? "B" : "A";
      const oppField = opp === "A" ? gameState.playerA.field : gameState.playerB.field;
      triggerCardFlash(`${sourcePlayer}-${uSlot}`, "dinnerSummon");
      if (oppField[uSlot]) {
        triggerCardFlash(`${opp}-${uSlot}`, "dinnerSummon");
      }
    }

    /* 능력 발동 이펙트 — 철기병 필드 배치: 본인 칸 즉시 → 약간 뒤 같은 진영 나머지 아군 */
    if (!isSpellSlot && card.name === CHEOLGIBYEONG_ID) {
      const uSlot = slot as "is" | "m" | "os";
      const cheolSlotKey = `${sourcePlayer}-${uSlot}`;
      triggerCardFlash(cheolSlotKey, "cheolgibyeongSummon");
      pushCheolgibyeongPassiveBuffFloat(cheolSlotKey);

      const tid = window.setTimeout(() => {
        (["is", "m", "os"] as const).forEach(s => {
          if (s === uSlot || !fieldAfterPlace[s]) return;
          triggerCardFlash(`${sourcePlayer}-${s}`, "cheolgibyeongSummon");
        });
        cheolgibyeongAllyFlashDelayTimeoutsRef.current =
          cheolgibyeongAllyFlashDelayTimeoutsRef.current.filter(id => id !== tid);
      }, CHEOLGIBYEONG_ALLY_ABILITY_FLASH_DELAY_MS);
      cheolgibyeongAllyFlashDelayTimeoutsRef.current.push(tid);
    }

    /* 능력 발동 이펙트 — 렴초 필드 배치: 본인 칸 즉시 → 철기병과 동일 지연 후 같은 진영 나머지 아군 (베이지) */
    if (!isSpellSlot && card.name === RYEOMCHO_ID) {
      const uSlot = slot as "is" | "m" | "os";
      const ryeomchoSlotKey = `${sourcePlayer}-${uSlot}`;
      triggerCardFlash(ryeomchoSlotKey, "ryeomchoSummon");
      pushRyeomchoPassiveBuffFloat(ryeomchoSlotKey);

      const tid = window.setTimeout(() => {
        (["is", "m", "os"] as const).forEach(s => {
          if (s === uSlot || !fieldAfterPlace[s]) return;
          triggerCardFlash(`${sourcePlayer}-${s}`, "ryeomchoSummon");
        });
        cheolgibyeongAllyFlashDelayTimeoutsRef.current =
          cheolgibyeongAllyFlashDelayTimeoutsRef.current.filter(id => id !== tid);
      }, CHEOLGIBYEONG_ALLY_ABILITY_FLASH_DELAY_MS);
      cheolgibyeongAllyFlashDelayTimeoutsRef.current.push(tid);
    }

    /* 능력 발동 이펙트 — 다이아고 필드 배치: 다이아고 포함 같은 진영 전원 동시(연두), 지연 없음 */
    if (!isSpellSlot && card.name === DIAGO_ID) {
      (["is", "m", "os"] as const).forEach(s => {
        if (!fieldAfterPlace[s]) return;
        triggerCardFlash(`${sourcePlayer}-${s}`, "diagoSummon");
      });
    }

    /* 능력 발동 이펙트 — 검은 황제 필드 배치: 같은 진영 전원 동시(회색), 지연 없음 */
    if (!isSpellSlot && card.name === UNIT.GEOMEUN_HWANGJE) {
      (["is", "m", "os"] as const).forEach(s => {
        if (!fieldAfterPlace[s]) return;
        triggerCardFlash(`${sourcePlayer}-${s}`, "geomeunHwangjeSummon");
      });
    }

    /* 능력 발동 이펙트 — 아이언 키위 필드 배치: 같은 진영 전원 동시(매우 밝은 회색) */
    if (!isSpellSlot && card.name === IRON_KIWI_ID) {
      (["is", "m", "os"] as const).forEach(s => {
        if (!fieldAfterPlace[s]) return;
        const key = `${sourcePlayer}-${s}`;
        triggerCardFlash(key, "ironKiwiSummon");
        pushIronKiwiPassiveBuffFloat(key);
      });
    }

    /* 필립이 먼저 깔려 있고 마주 칸에 유닛을 나중에 올릴 때 — 능력 발동 이펙트(패시브 맺음) 1회 */
    if (!isSpellSlot && card.name !== PHILIP_ID && card.name !== DINNER_ID) {
      const uSlot = slot as "is" | "m" | "os";
      const opp = sourcePlayer === "A" ? "B" : "A";
      const oppField = opp === "A" ? gameState.playerA.field : gameState.playerB.field;
      if (oppField[uSlot]?.name === PHILIP_ID) {
        triggerCardFlash(`${sourcePlayer}-${uSlot}`, "philipSummon");
        triggerCardFlash(`${opp}-${uSlot}`, "philipSummon");
      }
      if (oppField[uSlot]?.name === DINNER_ID) {
        triggerCardFlash(`${sourcePlayer}-${uSlot}`, "dinnerSummon");
        triggerCardFlash(`${opp}-${uSlot}`, "dinnerSummon");
      }
    }

    window.setTimeout(() => tryTriggerOneNightWagerSequence(), 0);
  };

  const canBeginHandDrag = (cardIndex: number, player: "A" | "B", card: CardRow): boolean => {
    if (!state || winner || pendingSkill || pendingLegendarySwordStrike) return false;
    if (!canMultiplayHandDragPlayer(player)) return false;

    const muhyohwaCounterDrag =
      !spellUsageFly && canMuhyohwaCounterFromHandSlot(state, player, cardIndex, card);

    if (witchTarotDiscardPlayer) {
      if (witchTarotDiscardPlayer !== player) return false;
    } else if (state.currentTurn !== player && !muhyohwaCounterDrag) {
      return false;
    }
    if (state.simpanHandChoice?.player === player) return false;
    if (
      state.simpanPeekReveal?.player === player ||
      simpanPeekFly?.player === player ||
      danhaStealFly ||
      (!muhyohwaCounterDrag && spellUsageReveal) ||
      (!muhyohwaCounterDrag && spellUsageFly) ||
      (!muhyohwaCounterDrag && spellUsageMotionActiveRef.current) ||
      oneNightWagerModal ||
      (!muhyohwaCounterDrag && state.oneNightWagerPending) ||
      (!muhyohwaCounterDrag && state.spellUsagePending) ||
      witchTarotCoin
    ) {
      return false;
    }
    if (state.currentTurn !== player && witchTarotDiscardPlayer !== player && !muhyohwaCounterDrag) {
      return false;
    }
    return true;
  };

  const clearHandDragVisual = () => {
    activeHandDragRef.current = null;
    setHandDrag(null);
    setHandDragHoverSlotKey(null);
  };

  const commitHandDragDrop = (clientX: number, clientY: number, saved: HandDragState) => {
    const snap = state;
    if (!snap) return;
    if (attemptMuhyohwaCounterDrop(snap, saved, clientX, clientY)) {
      notifyMultiplaySync();
      return;
    }
    if (spellUsageReveal || spellUsageFly || danhaStealFly || spellUsageMotionActiveRef.current) return;
    if (snap.guihwanPending) return;

    const under = document.elementFromPoint(clientX, clientY);
    const drop =
      (under?.closest("[data-slot]") as HTMLElement | null | undefined) ??
      (under?.closest("[data-field-drop]") as HTMLElement | null | undefined);
    if (!drop) return;

    const targetPlayer = (drop.dataset.player ?? drop.dataset.fieldPlayer) as "A" | "B" | undefined;
    const slot = (drop.dataset.slot ?? drop.dataset.fieldSlot) as "is" | "m" | "os" | "spell" | undefined;
    if (!targetPlayer || !slot) return;
    if (targetPlayer !== "A" && targetPlayer !== "B") return;
    const savedCard = saved.card;
    const isEnemyTarget = savedCard && (isEnemyUnitDragTargetSpell(savedCard) || isAebeolaekingCard(savedCard));
    if (!isEnemyTarget && !canMultiplayFieldDrop(targetPlayer)) return;
    if (multiplayMyTeam && saved.player !== multiplayMyTeam) return;

    if (attemptCastOrietChosangSpellDrop(snap, saved, targetPlayer, slot)) {
      notifyMultiplaySync();
      return;
    }
    if (attemptCastBeonggaeSpellDrop(snap, saved, targetPlayer, slot)) {
      notifyMultiplaySync();
      return;
    }
    if (attemptCastEondeokSpellDrop(snap, saved, targetPlayer, slot)) {
      notifyMultiplaySync();
      return;
    }
    if (attemptCastSomyeolSpellDrop(snap, saved, targetPlayer, slot)) {
      notifyMultiplaySync();
      return;
    }
    if (attemptCastHyperBeamSpellDrop(snap, saved, targetPlayer, slot)) {
      notifyMultiplaySync();
      return;
    }
    if (attemptAttachAebeolaeking(snap, saved, targetPlayer, slot)) {
      notifyMultiplaySync();
      return;
    }

    placeHandCardFromHand(snap, saved.cardIndex, saved.player, slot, targetPlayer);
    notifyMultiplaySync();
  };

  const MOBILE_TOUCH_DRAG_THRESHOLD_PX = 10;

  const removeMobileTouchDragLayers = () => {
    for (const layer of touchDragRef.current.dragLayerEls) {
      try {
        layer.remove();
      } catch {
        if (layer.parentNode) layer.parentNode.removeChild(layer);
      }
    }
    touchDragRef.current.dragLayerEls = [];
    const sourceEl = mobileTouchSourceElRef.current;
    if (sourceEl?.isConnected) {
      sourceEl.style.visibility = "";
      sourceEl.style.pointerEvents = "";
    }
  };

  const applyGhostSubtreePointerEventsNone = (root: HTMLElement) => {
    root.style.pointerEvents = "none";
    root.querySelectorAll("button, a, input, select, textarea, [role='button']").forEach(el => {
      if (el instanceof HTMLElement) el.style.pointerEvents = "none";
    });
  };

  const hideMobileHandDetailOverlayOnEl = (root: HTMLElement) => {
    root.querySelectorAll("[data-mobile-hand-detail-overlay]").forEach(node => {
      if (node instanceof HTMLElement) node.style.display = "none";
    });
  };

  const stripMobileHandDetailOverlayFromEl = (root: HTMLElement) => {
    // 클론 전용 — React가 관리하는 live DOM에서는 remove() 금지 (removeChild 충돌)
    root.querySelectorAll("[data-mobile-hand-detail-overlay]").forEach(node => {
      node.remove();
    });
  };

  const sanitizeMobileTouchDragClone = (root: HTMLElement) => {
    const stripDragHideClasses = (el: HTMLElement) => {
      el.classList.remove("opacity-0", "pointer-events-none");
      el.style.opacity = "1";
      el.style.visibility = "visible";
    };
    stripDragHideClasses(root);
    root.querySelectorAll(".opacity-0").forEach(node => {
      if (node instanceof HTMLElement) stripDragHideClasses(node);
    });
    stripMobileHandDetailOverlayFromEl(root);
  };

  const resetMobileTouchDragRef = () => {
    removeMobileTouchDragLayers();
    touchDragRef.current = {
      cardIndex: -1,
      player: "A",
      startX: 0,
      startY: 0,
      isDragging: false,
      dragLayerEls: [],
      startedOnDetailBtn: false,
    };
    mobileTouchSourceElRef.current = null;
    mobileTouchTapHandlerRef.current = null;
  };

  const getMobileHandCardDragMetrics = () => {
    const sourceEl = mobileTouchSourceElRef.current;
    const rect = sourceEl?.getBoundingClientRect();
    const width = rect?.width && rect.width > 0 ? rect.width : 90;
    const height = rect?.height && rect.height > 0 ? rect.height : width * 1.58;
    return { width, height, offsetX: width / 2, offsetY: height / 2 };
  };

  const createMobileTouchFixedLayer = (
    sourceEl: HTMLElement,
    opacity: string,
    zIndex: string
  ): HTMLElement => {
    const rect = sourceEl.getBoundingClientRect();
    const layer = document.createElement("div");
    layer.dataset.mobileTouchDragLayer = "1";
    layer.style.position = "fixed";
    layer.style.pointerEvents = "none";
    layer.style.opacity = opacity;
    layer.style.zIndex = zIndex;
    layer.style.left = `${rect.left}px`;
    layer.style.top = `${rect.top}px`;
    layer.style.width = `${rect.width}px`;
    layer.style.height = `${rect.height}px`;
    layer.style.margin = "0";
    layer.style.padding = "0";
    layer.style.boxSizing = "border-box";
    layer.style.overflow = "hidden";
    layer.style.transform = "translate(0px, 0px)";
    layer.style.willChange = "transform";

    const clone = sourceEl.cloneNode(true) as HTMLElement;
    clone.style.width = "100%";
    clone.style.height = "100%";
    clone.style.margin = "0";
    clone.style.boxSizing = "border-box";
    sanitizeMobileTouchDragClone(clone);
    applyGhostSubtreePointerEventsNone(clone);

    layer.appendChild(clone);
    document.body.appendChild(layer);
    return layer;
  };

  const beginMobileTouchDragLayers = (sourceEl: HTMLElement) => {
    removeMobileTouchDragLayers();
    const primary = createMobileTouchFixedLayer(sourceEl, "1", "10001");
    const ghost = createMobileTouchFixedLayer(sourceEl, "0.85", "10002");
    touchDragRef.current.dragLayerEls = [primary, ghost];
    sourceEl.style.visibility = "hidden";
    sourceEl.style.pointerEvents = "none";
  };

  const moveMobileTouchDragVisuals = (clientX: number, clientY: number) => {
    const dx = clientX - touchDragRef.current.startX;
    const dy = clientY - touchDragRef.current.startY;
    const transform = `translate(${dx}px, ${dy}px)`;
    for (const layer of touchDragRef.current.dragLayerEls) {
      layer.style.transform = transform;
    }
  };

  const syncActiveHandDragForMobileTouch = (clientX: number, clientY: number) => {
    const { cardIndex, player } = touchDragRef.current;
    if (!state || cardIndex < 0) return;
    const hand = player === "A" ? state.playerA.hand : state.playerB.hand;
    const card = hand[cardIndex];
    if (!card || !canBeginHandDrag(cardIndex, player, card)) return;

    if (!activeHandDragRef.current) {
      setSelectedSlot(null);
      setAttackingSlot(null);
      setPendingSecondaryAttack(null);
      applyStartingWraithChainPending(null);
      setPendingAttackSelection(null);
      setPendingLibutyAllEnemiesAttack(null);
      setAttackOptionOverride(null);
    }

    const { width, height, offsetX, offsetY } = getMobileHandCardDragMetrics();
    const next: HandDragState = {
      player,
      cardIndex,
      card,
      width,
      height,
      offsetX,
      offsetY,
      clientX,
      clientY,
      pointerId: -1,
      opponentCardFlipped: shouldFlipOpponentCard(player),
    };
    activeHandDragRef.current = next;
    setHandDrag(next);
  };

  const beginMobileTouchDragIfNeeded = (clientX: number, clientY: number) => {
    const dx = clientX - touchDragRef.current.startX;
    const dy = clientY - touchDragRef.current.startY;
    if (Math.hypot(dx, dy) < MOBILE_TOUCH_DRAG_THRESHOLD_PX) return;

    const { cardIndex, player } = touchDragRef.current;
    if (!state || cardIndex < 0) return;
    const hand = player === "A" ? state.playerA.hand : state.playerB.hand;
    const card = hand[cardIndex];
    if (!card || !canBeginHandDrag(cardIndex, player, card)) return;

    if (!touchDragRef.current.isDragging) {
      touchDragRef.current.isDragging = true;
      // setSelectedHandCard(null)는 touchend까지 미룸 — 드래그 중 버튼 DOM 언마운트 시 touchmove 끊김 방지
      const sourceEl = mobileTouchSourceElRef.current;
      if (sourceEl) {
        hideMobileHandDetailOverlayOnEl(sourceEl);
        beginMobileTouchDragLayers(sourceEl);
      }
      syncActiveHandDragForMobileTouch(clientX, clientY);
      moveMobileTouchDragVisuals(clientX, clientY);
      return;
    }

    moveMobileTouchDragVisuals(clientX, clientY);
    syncHandDragHover(clientX, clientY);
  };

  const handleDrop = (
    slot: "is" | "m" | "os" | "spell",
    targetPlayer: "A" | "B",
    clientX: number,
    clientY: number
  ) => {
    const { cardIndex, player } = touchDragRef.current;
    if (cardIndex < 0 || !state) return;
    const hand = player === "A" ? state.playerA.hand : state.playerB.hand;
    const card = hand[cardIndex];
    if (!card) return;

    const { width, height, offsetX, offsetY } = getMobileHandCardDragMetrics();
    const saved: HandDragState = {
      player,
      cardIndex,
      card,
      width,
      height,
      offsetX,
      offsetY,
      clientX,
      clientY,
      pointerId: -1,
      opponentCardFlipped: shouldFlipOpponentCard(player),
    };
    commitHandDragDrop(clientX, clientY, saved);
  };

  const detachMobileTouchDocumentListeners = () => {
    document.removeEventListener("touchmove", mobileTouchDocumentMove);
    document.removeEventListener("touchend", mobileTouchDocumentEnd);
    document.removeEventListener("touchcancel", mobileTouchDocumentEnd);
  };

  const mobileTouchDocumentMove = (ev: TouchEvent) => {
    if (touchDragRef.current.cardIndex < 0) return;
    const t = ev.touches[0];
    if (!t) return;
    ev.preventDefault();
    beginMobileTouchDragIfNeeded(t.clientX, t.clientY);
  };

  const mobileTouchDocumentEnd = (ev: TouchEvent) => {
    if (touchDragRef.current.cardIndex < 0) return;
    const ended = ev.changedTouches[0];
    if (!ended) return;
    ev.preventDefault();

    const wasDragging = touchDragRef.current.isDragging;
    const dragPlayer = touchDragRef.current.player;
    const dragCardIndex = touchDragRef.current.cardIndex;
    const startedOnDetailBtn = touchDragRef.current.startedOnDetailBtn;

    removeMobileTouchDragLayers();
    detachMobileTouchDocumentListeners();

    if (wasDragging) {
      setSelectedHandCard(null);
      const el = document.elementFromPoint(ended.clientX, ended.clientY);
      const slotEl = el?.closest("[data-slot]") as HTMLElement | null;
      if (slotEl) {
        const slot = slotEl.getAttribute("data-slot");
        const targetPlayer = slotEl.getAttribute("data-player");
        if (
          (slot === "is" || slot === "m" || slot === "os" || slot === "spell") &&
          (targetPlayer === "A" || targetPlayer === "B")
        ) {
          const dragCard = state?.currentTurn === "A"
            ? state?.playerA?.hand?.[dragCardIndex]
            : state?.playerB?.hand?.[dragCardIndex];
          const isEnemyTarget = dragCard && (isEnemyUnitDragTargetSpell(dragCard) || isAebeolaekingCard(dragCard));
          if (isEnemyTarget || canMultiplayFieldDrop(targetPlayer)) {
            handleDrop(slot, targetPlayer, ended.clientX, ended.clientY);
          }
        }
      } else if (dragCardIndex >= 0 && state) {
        const hand = dragPlayer === "A" ? state.playerA.hand : state.playerB.hand;
        const card = hand[dragCardIndex];
        if (card) {
          const { width, height, offsetX, offsetY } = getMobileHandCardDragMetrics();
          commitHandDragDrop(ended.clientX, ended.clientY, {
            player: dragPlayer,
            cardIndex: dragCardIndex,
            card,
            width,
            height,
            offsetX,
            offsetY,
            clientX: ended.clientX,
            clientY: ended.clientY,
            pointerId: -1,
            opponentCardFlipped: shouldFlipOpponentCard(dragPlayer),
          });
        }
      }

    } else {
      mobileTouchTapHandlerRef.current?.();

      if (startedOnDetailBtn && dragCardIndex >= 0 && state) {
        const hand = dragPlayer === "A" ? state.playerA.hand : state.playerB.hand;
        const detailCard = hand[dragCardIndex];
        if (detailCard) {
          openHandCardCodexDetail(detailCard);
          setSelectedHandCard(null);
        }
      } else if (
        !pendingSkill &&
        dragCardIndex >= 0 &&
        (dragPlayer === "A" || dragPlayer === "B") &&
        state
      ) {
        const hand = dragPlayer === "A" ? state.playerA.hand : state.playerB.hand;
        if (hand[dragCardIndex]) {
          setSelectedHandCard({ player: dragPlayer, index: dragCardIndex });
        }
      }
    }

    clearHandDragVisual();
    setHandDragHoverSlotKey(null);
    resetMobileTouchDragRef();
  };

  const attachMobileTouchDocumentListeners = () => {
    detachMobileTouchDocumentListeners();
    document.addEventListener("touchmove", mobileTouchDocumentMove, { passive: false });
    document.addEventListener("touchend", mobileTouchDocumentEnd, { passive: false });
    document.addEventListener("touchcancel", mobileTouchDocumentEnd, { passive: false });
  };

  const handleMobileHandTouchStart = (ev: TouchEvent) => {
    const target = ev.target as HTMLElement;
    const cardEl = target.closest("[data-mobile-hand-card]") as HTMLElement | null;
    if (!cardEl) return;

    const startedOnDetailBtn = !!target.closest("[data-mobile-hand-detail-btn]");

    const player = cardEl.dataset.handPlayer as "A" | "B" | undefined;
    const cardIndexRaw = cardEl.dataset.handIndex;
    if ((player !== "A" && player !== "B") || cardIndexRaw === undefined) return;
    const cardIndex = Number(cardIndexRaw);
    if (!Number.isFinite(cardIndex)) return;
    if (multiplayMyTeam && player !== multiplayMyTeam) {
      // 단하 스킬(마법의 갈고리) 활성화 중에는 상대 손패 탭을 허용
      const tapHandler = mobileHandTapHandlersRef.current[`${player}-${cardIndex}`];
      if (!tapHandler) return;
      // 탭 전용 처리: 드래그 없이 탭만 허용
      ev.preventDefault();
      ev.stopPropagation();
      const t = ev.touches[0];
      if (!t) return;
      resetMobileTouchDragRef();
      mobileTouchSourceElRef.current = cardEl;
      mobileTouchTapHandlerRef.current = tapHandler;
      touchDragRef.current = {
        cardIndex,
        player,
        startX: t.clientX,
        startY: t.clientY,
        isDragging: false,
        dragLayerEls: [],
        startedOnDetailBtn: false,
      };
      attachMobileTouchDocumentListeners();
      return;
    }
    if (!state) return;

    const hand = player === "A" ? state.playerA.hand : state.playerB.hand;
    const card = hand[cardIndex];
    if (!card) return;

    ev.preventDefault();
    ev.stopPropagation();

    const t = ev.touches[0];
    if (!t) return;

    resetMobileTouchDragRef();
    mobileTouchSourceElRef.current = cardEl;
    mobileTouchTapHandlerRef.current = mobileHandTapHandlersRef.current[`${player}-${cardIndex}`] ?? null;
    touchDragRef.current = {
      cardIndex,
      player,
      startX: t.clientX,
      startY: t.clientY,
      isDragging: false,
      dragLayerEls: [],
      startedOnDetailBtn,
    };
    attachMobileTouchDocumentListeners();
  };

  mobileHandTouchStartRef.current = handleMobileHandTouchStart;

  const beginHandDrag = (e: React.PointerEvent, cardIndex: number, player: "A" | "B", card: CardRow) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("button")) return;
    if (!canBeginHandDrag(cardIndex, player, card)) return;
    e.preventDefault();
    setSelectedSlot(null);
    setAttackingSlot(null);
    setPendingSecondaryAttack(null);
    applyStartingWraithChainPending(null);
    setPendingAttackSelection(null);
    setPendingLibutyAllEnemiesAttack(null);
    setAttackOptionOverride(null);

    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    const rect = el.getBoundingClientRect();
    const next: HandDragState = {
      player,
      cardIndex,
      card,
      width: rect.width,
      height: rect.height,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      clientX: e.clientX,
      clientY: e.clientY,
      pointerId: e.pointerId,
      opponentCardFlipped: shouldFlipOpponentCard(player),
    };
    activeHandDragRef.current = next;
    setHandDrag(next);
    syncHandDragHover(e.clientX, e.clientY);
  };

  const updateHandDrag = (e: React.PointerEvent) => {
    const d = activeHandDragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const next = { ...d, clientX: e.clientX, clientY: e.clientY };
    activeHandDragRef.current = next;
    setHandDrag(next);
    syncHandDragHover(e.clientX, e.clientY);
  };

  /** 스펠 No.19 번개 — 적 is/m/os에 드롭 시 현재 체력 1. 성공·오류 안내 시 true(일반 필드 배치 생략). */
  const attemptCastBeonggaeSpellDrop = (
    snap: SimulationState,
    saved: HandDragState,
    targetPlayer: "A" | "B",
    slot: "is" | "m" | "os" | "spell"
  ): boolean => {
    const hand = saved.player === "A" ? snap.playerA.hand : snap.playerB.hand;
    const spellRow = hand[saved.cardIndex];
    if (!spellRow || spellRow.name !== BEONGGAE_SPELL_ID || !isSpellCardRow(spellRow)) return false;
    if (snap.currentTurn !== saved.player) return false;
    if (blockRonuActiveSpellHandPlay(snap, spellRow, saved.player, targetPlayer, slot)) return true;

    if (targetPlayer === saved.player || slot === "spell") {
      pushInfoFloat(`${saved.player}-spell`, "적 유닛 위에 놓아 주세요", INFO_FLOAT_MS);
      return true;
    }

    const sk = slot as "is" | "m" | "os";
    const enemyField = targetPlayer === "A" ? snap.playerA.field : snap.playerB.field;
    const enemyUnit = enemyField[sk];
    if (!enemyUnit) {
      pushInfoFloat(`${targetPlayer}-${sk}`, "적 유닛 위에 놓아 주세요", INFO_FLOAT_MS);
      return true;
    }

    if (
      isElWingBlockingEnemyAttackSpell(
        enemyUnit,
        targetPlayer,
        sk,
        snap.playerA.field,
        snap.playerB.field
      )
    ) {
      showElWingMagicImmunityBlockOnUnit(`${targetPlayer}-${sk}`);
      return true;
    }

    if (!isBeonggaeValidTargetUnit(enemyUnit)) {
      pushInfoFloat(`${targetPlayer}-${sk}`, "사용할 수 없는 대상입니다", INFO_FLOAT_MS);
      return true;
    }

    if (isInvulnerableFromBaekseuOrCheolbyeok(enemyUnit, enemyField)) {
      pushInfoFloat(`${targetPlayer}-${sk}`, "[무적] 상태의 유닛에게는 적용되지 않습니다", INFO_FLOAT_MS);
      return true;
    }

    const tokens = saved.player === "A" ? snap.playerA.tokens : snap.playerB.tokens;
    const cost = Number(spellRow.cost) || 0;
    if (tokens < cost) {
      pushInfoFloat(`${targetPlayer}-${sk}`, "토큰이 부족합니다", INFO_FLOAT_MS);
      return true;
    }

    const skCommit = slot as "is" | "m" | "os";
    scheduleSpellHandUsageSequence(snap, {
      casterPlayer: saved.player,
      previewCard: spellRow,
      targetPlayer,
      unitSlot: skCommit,
      mode: "handUnitTarget",
      flyToUnitAfterReveal: true,
      preApply: prev => {
        const casterIsA = saved.player === "A";
        const h = [...(casterIsA ? prev.playerA.hand : prev.playerB.hand)];
        if (saved.cardIndex < 0 || saved.cardIndex >= h.length) return prev;
        const c = h[saved.cardIndex];
        if (!c || c.name !== BEONGGAE_SPELL_ID || !isSpellCardRow(c)) return prev;
        const cst = Number(c.cost) || 0;
        if ((casterIsA ? prev.playerA.tokens : prev.playerB.tokens) < cst) return prev;
        h.splice(saved.cardIndex, 1);
        const key = casterIsA ? "playerA" : "playerB";
        const ps = casterIsA ? prev.playerA : prev.playerB;
        return { ...prev, [key]: { ...ps, hand: h, tokens: ps.tokens - cst } };
      },
      commit: prev => {
        const casterIsA = saved.player === "A";
        const c = spellRow;
        const victim = targetPlayer === "A" ? prev.playerA : prev.playerB;
        const u2 = victim.field[skCommit];
        if (!u2) return prev;
        if (
          isElWingBlockingEnemyAttackSpell(
            u2,
            targetPlayer,
            skCommit,
            prev.playerA.field,
            prev.playerB.field
          )
        ) {
          return prev;
        }
        if (!isBeonggaeValidTargetUnit(u2)) return prev;
        if (isInvulnerableFromBaekseuOrCheolbyeok(u2, victim.field)) return prev;
        const updated = applyBeonggaeLightningToFieldUnit(u2, victim.field);
        const nextVictim = { ...victim, field: { ...victim.field, [skCommit]: updated } };
        const victimKey = targetPlayer === "A" ? "playerA" : "playerB";
        const base = {
          ...prev,
          [victimKey]: nextVictim,
          rewindCards: [...prev.rewindCards, c],
        };
        return finalizeSpellWithSimpan(base);
      },
      afterCommitVfx: () => {
        window.setTimeout(() => triggerCardFlash(`${targetPlayer}-${skCommit}`, "beonggaeSpell"), 0);
      },
    });
    return true;
  };

  /** 스펠 No.7 언덕! — 적 is/m/os에 드롭 시 처리. 성공·오류 안내 시 true(일반 필드 배치 생략). */
  const attemptCastEondeokSpellDrop = (
    snap: SimulationState,
    saved: HandDragState,
    targetPlayer: "A" | "B",
    slot: "is" | "m" | "os" | "spell"
  ): boolean => {
    const hand = saved.player === "A" ? snap.playerA.hand : snap.playerB.hand;
    const spellRow = hand[saved.cardIndex];
    if (!spellRow || spellRow.name !== EONDEOK_SPELL_ID || !isSpellCardRow(spellRow)) return false;
    if (snap.currentTurn !== saved.player) return false;
    if (blockRonuActiveSpellHandPlay(snap, spellRow, saved.player, targetPlayer, slot)) return true;

    if (targetPlayer === saved.player || slot === "spell") {
      pushInfoFloat(`${saved.player}-spell`, "적 유닛 위에 놓아 주세요", INFO_FLOAT_MS);
      return true;
    }

    const sk = slot as "is" | "m" | "os";
    const enemyField = targetPlayer === "A" ? snap.playerA.field : snap.playerB.field;
    const enemyUnit = enemyField[sk];
    if (!enemyUnit) {
      pushInfoFloat(`${targetPlayer}-${sk}`, "적 유닛 위에 놓아 주세요", INFO_FLOAT_MS);
      return true;
    }

    if (isInvulnerableFromBaekseuOrCheolbyeok(enemyUnit, enemyField)) {
      pushInfoFloat(`${targetPlayer}-${sk}`, "[무적] 상태의 유닛에게는 적용되지 않습니다", INFO_FLOAT_MS);
      return true;
    }

    if (
      isElWingBlockingEnemyAttackSpell(
        enemyUnit,
        targetPlayer,
        sk,
        snap.playerA.field,
        snap.playerB.field
      )
    ) {
      showElWingMagicImmunityBlockOnUnit(`${targetPlayer}-${sk}`);
      return true;
    }

    const tokens = saved.player === "A" ? snap.playerA.tokens : snap.playerB.tokens;
    const cost = Number(spellRow.cost) || 0;
    if (tokens < cost) {
      pushInfoFloat(`${targetPlayer}-${sk}`, "토큰이 부족합니다", INFO_FLOAT_MS);
      return true;
    }

    const skCommit = slot as "is" | "m" | "os";
    scheduleSpellHandUsageSequence(snap, {
      casterPlayer: saved.player,
      previewCard: spellRow,
      targetPlayer,
      unitSlot: skCommit,
      mode: "handUnitTarget",
      flyToUnitAfterReveal: true,
      preApply: prev => {
        const casterIsA = saved.player === "A";
        const h = [...(casterIsA ? prev.playerA.hand : prev.playerB.hand)];
        if (saved.cardIndex < 0 || saved.cardIndex >= h.length) return prev;
        const c = h[saved.cardIndex];
        if (!c || c.name !== EONDEOK_SPELL_ID || !isSpellCardRow(c)) return prev;
        const cst = Number(c.cost) || 0;
        if ((casterIsA ? prev.playerA.tokens : prev.playerB.tokens) < cst) return prev;
        h.splice(saved.cardIndex, 1);
        const key = casterIsA ? "playerA" : "playerB";
        const ps = casterIsA ? prev.playerA : prev.playerB;
        return { ...prev, [key]: { ...ps, hand: h, tokens: ps.tokens - cst } };
      },
      commit: prev => {
        const c = spellRow;
        const victim = targetPlayer === "A" ? prev.playerA : prev.playerB;
        const u2 = victim.field[skCommit];
        if (!u2) return prev;
        if (
          isElWingBlockingEnemyAttackSpell(
            u2,
            targetPlayer,
            skCommit,
            prev.playerA.field,
            prev.playerB.field
          )
        ) {
          return prev;
        }
        const updated: FieldCard = {
          ...u2,
          eondeokSilenceEndTurnTicksRemaining: EONDEOK_SILENCE_INITIAL_END_TURN_TICKS,
        };
        const nextVictim = { ...victim, field: { ...victim.field, [skCommit]: updated } };
        const victimKey = targetPlayer === "A" ? "playerA" : "playerB";
        return finalizeSpellWithSimpan({
          ...prev,
          [victimKey]: nextVictim,
          rewindCards: [...prev.rewindCards, c],
        });
      },
      afterCommitVfx: () => {
        window.setTimeout(() => triggerCardFlash(`${targetPlayer}-${skCommit}`, "eondeokSpell"), 0);
      },
    });
    return true;
  };

  /** 스펠 No.31 소멸 — 적 is/m/os에 드롭 시 즉시 제거(백스·무적·사망 시 패시브 무시), 스펠·유닛 리와인드 */
  const attemptCastSomyeolSpellDrop = (
    snap: SimulationState,
    saved: HandDragState,
    targetPlayer: "A" | "B",
    slot: "is" | "m" | "os" | "spell"
  ): boolean => {
    const hand = saved.player === "A" ? snap.playerA.hand : snap.playerB.hand;
    const spellRow = hand[saved.cardIndex];
    if (!spellRow || spellRow.name !== SOMYEOL_SPELL_ID || !isSpellCardRow(spellRow)) return false;
    if (snap.currentTurn !== saved.player) return false;
    if (blockRonuActiveSpellHandPlay(snap, spellRow, saved.player, targetPlayer, slot)) return true;

    if (targetPlayer === saved.player || slot === "spell") {
      pushInfoFloat(`${saved.player}-spell`, "적 유닛 위에 놓아 주세요", INFO_FLOAT_MS);
      return true;
    }

    const sk = slot as "is" | "m" | "os";
    const enemyField = targetPlayer === "A" ? snap.playerA.field : snap.playerB.field;
    const enemyUnit = enemyField[sk];
    if (!enemyUnit) {
      pushInfoFloat(`${targetPlayer}-${sk}`, "적 유닛 위에 놓아 주세요", INFO_FLOAT_MS);
      return true;
    }

    if (
      isElWingBlockingEnemyAttackSpell(
        enemyUnit,
        targetPlayer,
        sk,
        snap.playerA.field,
        snap.playerB.field
      )
    ) {
      showElWingMagicImmunityBlockOnUnit(`${targetPlayer}-${sk}`);
      return true;
    }

    const tokens = saved.player === "A" ? snap.playerA.tokens : snap.playerB.tokens;
    const cost = Number(spellRow.cost) || 0;
    if (tokens < cost) {
      pushInfoFloat(`${targetPlayer}-${sk}`, "토큰이 부족합니다", INFO_FLOAT_MS);
      return true;
    }

    const skCommit = slot as "is" | "m" | "os";
    scheduleSpellHandUsageSequence(snap, {
      casterPlayer: saved.player,
      previewCard: spellRow,
      targetPlayer,
      unitSlot: skCommit,
      mode: "handUnitTarget",
      flyToUnitAfterReveal: true,
      preApply: prev => {
        const casterIsA = saved.player === "A";
        const h = [...(casterIsA ? prev.playerA.hand : prev.playerB.hand)];
        if (saved.cardIndex < 0 || saved.cardIndex >= h.length) return prev;
        const c = h[saved.cardIndex];
        if (!c || c.name !== SOMYEOL_SPELL_ID || !isSpellCardRow(c)) return prev;
        const cst = Number(c.cost) || 0;
        if ((casterIsA ? prev.playerA.tokens : prev.playerB.tokens) < cst) return prev;
        h.splice(saved.cardIndex, 1);
        const key = casterIsA ? "playerA" : "playerB";
        const ps = casterIsA ? prev.playerA : prev.playerB;
        return { ...prev, [key]: { ...ps, hand: h, tokens: ps.tokens - cst } };
      },
      commit: prev => {
        const c = spellRow;
        const newPlayerA = { ...prev.playerA, field: { ...prev.playerA.field } };
        const newPlayerB = { ...prev.playerB, field: { ...prev.playerB.field } };
        const victimState = targetPlayer === "A" ? newPlayerA : newPlayerB;
        const erased = victimState.field[skCommit];
        if (!erased) return prev;
        if (
          isElWingBlockingEnemyAttackSpell(
            erased,
            targetPlayer,
            skCommit,
            newPlayerA.field,
            newPlayerB.field
          )
        ) {
          return prev;
        }

        cleanupSimulationUnitDeath(erased, newPlayerA, newPlayerB, prev.globalTurnCount, {
          skipDarkKnightSoulIncrement: true,
        });
        victimState.field[skCommit] = null;

        let nextUnitCombatStats = prev.unitCombatStats;
        let nextUnitStatsOrder = prev.unitStatsOrder;
        const sid = erased.statsInstanceId;
        if (sid) {
          const { [sid]: _removed, ...restStats } = nextUnitCombatStats;
          nextUnitCombatStats = restStats;
          nextUnitStatsOrder = nextUnitStatsOrder.filter(x => x !== sid);
        }

        const victimKey = targetPlayer === "A" ? "playerA" : "playerB";
        return finalizeSpellWithSimpan({
          ...prev,
          unitCombatStats: nextUnitCombatStats,
          unitStatsOrder: nextUnitStatsOrder,
          playerA: newPlayerA,
          playerB: newPlayerB,
          rewindCards: [...prev.rewindCards, c, erased],
        });
      },
      afterCommitVfx: () => {
        window.setTimeout(() => triggerCardFlash(`${targetPlayer}-${skCommit}`, "somyeolSpellErase"), 0);
      },
    });
    return true;
  };

  /** 스펠 No.34 하이퍼 빔 — 적 is/m/os에 드롭 시 2000 피해(공격 유형·방어/무적/보호막 규칙 적용) */
  const attemptCastHyperBeamSpellDrop = (
    snap: SimulationState,
    saved: HandDragState,
    targetPlayer: "A" | "B",
    slot: "is" | "m" | "os" | "spell"
  ): boolean => {
    const hand = saved.player === "A" ? snap.playerA.hand : snap.playerB.hand;
    const spellRow = hand[saved.cardIndex];
    if (!spellRow || !isHyperBeamSpellCard(spellRow) || !isSpellCardRow(spellRow)) return false;
    if (snap.currentTurn !== saved.player) return false;
    if (blockRonuActiveSpellHandPlay(snap, spellRow, saved.player, targetPlayer, slot)) return true;

    if (targetPlayer === saved.player || slot === "spell") {
      pushInfoFloat(`${saved.player}-spell`, "적 유닛 위에 놓아 주세요", INFO_FLOAT_MS);
      return true;
    }

    const sk = slot as "is" | "m" | "os";
    const enemyField = targetPlayer === "A" ? snap.playerA.field : snap.playerB.field;
    const enemyUnit = enemyField[sk];
    if (!enemyUnit) {
      pushInfoFloat(`${targetPlayer}-${sk}`, "적 유닛 위에 놓아 주세요", INFO_FLOAT_MS);
      return true;
    }

    if (
      isElWingBlockingEnemyAttackSpell(
        enemyUnit,
        targetPlayer,
        sk,
        snap.playerA.field,
        snap.playerB.field
      )
    ) {
      showElWingMagicImmunityBlockOnUnit(`${targetPlayer}-${sk}`);
      return true;
    }

    const tokens = saved.player === "A" ? snap.playerA.tokens : snap.playerB.tokens;
    const cost = Number(spellRow.cost) || 0;
    if (tokens < cost) {
      pushInfoFloat(`${targetPlayer}-${sk}`, "토큰이 부족합니다", INFO_FLOAT_MS);
      return true;
    }

    const skCommit = slot as "is" | "m" | "os";
    const hyperBeamVfx = { slotKey: "", hpLoss: 0 };
    scheduleSpellHandUsageSequence(snap, {
      casterPlayer: saved.player,
      previewCard: spellRow,
      targetPlayer,
      unitSlot: skCommit,
      mode: "handUnitTarget",
      flyToUnitAfterReveal: true,
      preApply: prev => {
        const casterIsA = saved.player === "A";
        const h = [...(casterIsA ? prev.playerA.hand : prev.playerB.hand)];
        if (saved.cardIndex < 0 || saved.cardIndex >= h.length) return prev;
        const c = h[saved.cardIndex];
        if (!c || !isHyperBeamSpellCard(c) || !isSpellCardRow(c)) return prev;
        const cst = Number(c.cost) || 0;
        if ((casterIsA ? prev.playerA.tokens : prev.playerB.tokens) < cst) return prev;
        h.splice(saved.cardIndex, 1);
        const key = casterIsA ? "playerA" : "playerB";
        const ps = casterIsA ? prev.playerA : prev.playerB;
        return { ...prev, [key]: { ...ps, hand: h, tokens: ps.tokens - cst } };
      },
      commit: prev => {
        hyperBeamVfx.slotKey = "";
        hyperBeamVfx.hpLoss = 0;
        const newPlayerA = { ...prev.playerA, field: { ...prev.playerA.field } };
        const newPlayerB = { ...prev.playerB, field: { ...prev.playerB.field } };
        const enemySide = targetPlayer === "A" ? newPlayerA : newPlayerB;
        const unit = enemySide.field[skCommit];
        if (!unit || unit.currentHp <= 0) return prev;
        if (
          isElWingBlockingEnemyAttackSpell(
            unit,
            targetPlayer,
            skCommit,
            newPlayerA.field,
            newPlayerB.field
          )
        ) {
          return prev;
        }

        const resolved = applyHyperBeamDamageToEnemyUnit({
          target: unit,
          targetPlayer,
          targetSlot: skCommit,
          playerAField: newPlayerA.field,
          playerBField: newPlayerB.field,
        });

        const baseTarget =
          Object.keys(resolved.baekseuPatch).length > 0
            ? stripBaekseuHarmfulEffectsForInvuln(unit)
            : unit;
        const updatedTarget: FieldCard = {
          ...baseTarget,
          ...resolved.baekseuPatch,
          ...resolved.barrierPatch,
          currentHp: resolved.isDestroyed ? 0 : resolved.newHp,
        };

        let rewindCards = [...prev.rewindCards, spellRow];
        let unitCombatStats = prev.unitCombatStats;
        let unitStatsOrder = prev.unitStatsOrder;

        if (resolved.isDestroyed) {
          enemySide.field[skCommit] = null;
          cleanupSimulationUnitDeath(
            unit,
            { field: newPlayerA.field },
            { field: newPlayerB.field },
            prev.globalTurnCount
          );
          rewindCards = [...rewindCards, unit];
          const sid = unit.statsInstanceId;
          if (sid) {
            const { [sid]: _removed, ...restStats } = unitCombatStats;
            unitCombatStats = restStats;
            unitStatsOrder = unitStatsOrder.filter(x => x !== sid);
          }
        } else {
          enemySide.field[skCommit] = updatedTarget;
        }

        applyPostStrikeAllyHealsIncludingW({
          targetPlayer,
          targetSlot: skCommit,
          playerAField: newPlayerA.field,
          playerBField: newPlayerB.field,
          morningMoodDeathHeal: resolved.morningMoodDeathHeal,
          startingTreeAllyHeal: resolved.startingTreeAllyHeal,
        });

        if (resolved.hpLoss > 0) {
          hyperBeamVfx.slotKey = `${targetPlayer}-${skCommit}`;
          hyperBeamVfx.hpLoss = resolved.hpLoss;
        }

        const victimKey = targetPlayer === "A" ? "playerA" : "playerB";
        return finalizeSpellWithSimpan({
          ...prev,
          unitCombatStats,
          unitStatsOrder,
          playerA: newPlayerA,
          playerB: newPlayerB,
          [victimKey]: enemySide,
          rewindCards,
        });
      },
      afterCommitVfx: () => {
        if (hyperBeamVfx.slotKey && hyperBeamVfx.hpLoss > 0) {
          window.setTimeout(
            () => showHyperBeamSpellHitOnTarget(hyperBeamVfx.slotKey, hyperBeamVfx.hpLoss),
            0
          );
        }
      },
    });
    return true;
  };

  /** 스펠 No.48 오리에트의 초상 — 아군 is/m/os에 드롭 시 체력 보호막(흡수 1000) */
  const attemptCastOrietChosangSpellDrop = (
    snap: SimulationState,
    saved: HandDragState,
    targetPlayer: "A" | "B",
    slot: "is" | "m" | "os" | "spell"
  ): boolean => {
    const hand = saved.player === "A" ? snap.playerA.hand : snap.playerB.hand;
    const spellRow = hand[saved.cardIndex];
    if (!spellRow || !isOrietChosangSpellCard(spellRow) || !isSpellCardRow(spellRow)) return false;
    if (snap.currentTurn !== saved.player) return false;
    if (blockRonuActiveSpellHandPlay(snap, spellRow, saved.player, targetPlayer, slot)) return true;

    if (targetPlayer !== saved.player || slot === "spell") {
      pushInfoFloat(`${saved.player}-spell`, "아군 유닛 위에 놓아 주세요", INFO_FLOAT_MS);
      return true;
    }

    const sk = slot as "is" | "m" | "os";
    const allyField = targetPlayer === "A" ? snap.playerA.field : snap.playerB.field;
    const ally = allyField[sk];
    if (!ally || (ally.currentHp ?? 0) <= 0) {
      pushInfoFloat(`${targetPlayer}-${sk}`, "아군 유닛 위에 놓아 주세요", INFO_FLOAT_MS);
      return true;
    }

    const tokens = saved.player === "A" ? snap.playerA.tokens : snap.playerB.tokens;
    const cost = Number(spellRow.cost) || 0;
    if (tokens < cost) {
      pushInfoFloat(`${targetPlayer}-${sk}`, "토큰이 부족합니다", INFO_FLOAT_MS);
      return true;
    }

    const skCommit = slot as "is" | "m" | "os";
    scheduleSpellHandUsageSequence(snap, {
      casterPlayer: saved.player,
      previewCard: spellRow,
      targetPlayer,
      unitSlot: skCommit,
      mode: "handUnitTarget",
      flyToUnitAfterReveal: true,
      preApply: prev => {
        const casterIsA = saved.player === "A";
        const h = [...(casterIsA ? prev.playerA.hand : prev.playerB.hand)];
        if (saved.cardIndex < 0 || saved.cardIndex >= h.length) return prev;
        const c = h[saved.cardIndex];
        if (!c || !isOrietChosangSpellCard(c) || !isSpellCardRow(c)) return prev;
        const cst = Number(c.cost) || 0;
        if ((casterIsA ? prev.playerA.tokens : prev.playerB.tokens) < cst) return prev;
        h.splice(saved.cardIndex, 1);
        const key = casterIsA ? "playerA" : "playerB";
        const ps = casterIsA ? prev.playerA : prev.playerB;
        return { ...prev, [key]: { ...ps, hand: h, tokens: ps.tokens - cst } };
      },
      commit: prev => {
        const c = spellRow;
        const allySide = targetPlayer === "A" ? prev.playerA : prev.playerB;
        const u = allySide.field[skCommit];
        if (!u) return prev;
        if (suppressionBlocksExternalBuffEffects(u)) return prev;
        const updatedAlly: FieldCard = {
          ...u,
          hpBarrierAbsorptionRemaining: ORIET_CHOSANG_HP_BARRIER_AMOUNT,
        };
        const nextAllySide = {
          ...allySide,
          field: { ...allySide.field, [skCommit]: updatedAlly },
        };
        const allyKey = targetPlayer === "A" ? "playerA" : "playerB";
        return finalizeSpellWithSimpan({
          ...prev,
          [allyKey]: nextAllySide,
          rewindCards: [...prev.rewindCards, c],
        });
      },
      afterCommitVfx: () => {
        window.setTimeout(() => triggerCardFlash(`${targetPlayer}-${skCommit}`, "orietShieldAllyPulse"), 0);
      },
    });
    return true;
  };

  const attemptMuhyohwaCounterDrop = (
    snap: SimulationState,
    saved: HandDragState,
    clientX: number,
    clientY: number
  ): boolean => {
    if (!isMuhyohwaSpellCard(saved.card)) return false;
    const pending = spellUsagePendingRef.current;
    const spellSave = snap.spellUsagePending;
    if (
      !pending ||
      !spellSave ||
      spellSave.phase !== "centerReveal" ||
      pending.casterPlayer === saved.player
    ) {
      return false;
    }
    if (!isClientPointOverSpellUsageCenterCard(clientX, clientY, spellUsageCardMeasureRef.current)) {
      return false;
    }
    if (
      !canMuhyohwaCounterFromHandSlot(snap, saved.player, saved.cardIndex, saved.card)
    ) {
      pushInfoFloat(SPELL_USAGE_CENTER_KEY, "무효화할 수 없습니다", INFO_FLOAT_MS);
      return true;
    }
    const tokenCost = getMuhyohwaCounterCostForSpell(pending.previewCard);
    if (spellUsageRevealTimerRef.current != null) {
      window.clearTimeout(spellUsageRevealTimerRef.current);
      spellUsageRevealTimerRef.current = null;
    }
    if (spellUsageTeslaCounterTimerRef.current != null) {
      window.clearTimeout(spellUsageTeslaCounterTimerRef.current);
      spellUsageTeslaCounterTimerRef.current = null;
    }
    if (spellUsageTeslaBlackoutTimerRef.current != null) {
      window.clearTimeout(spellUsageTeslaBlackoutTimerRef.current);
      spellUsageTeslaBlackoutTimerRef.current = null;
    }
    spellUsagePendingRef.current = {
      ...pending,
      superTeslaCounter: undefined,
      muhyohwaCounter: {
        counterPlayer: saved.player,
        handIndex: saved.cardIndex,
        tokenCost,
      },
    };
    finishSpellUsageSequence();
    return true;
  };

  const finishHandDrag = (e: React.PointerEvent) => {
    const d = activeHandDragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const saved = { ...d };
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    clearHandDragVisual();
    commitHandDragDrop(e.clientX, e.clientY, saved);
  };

  /**
   * 유닛 No.37 애벌레킹 — 손패에서 적의 점유된 is/m/os에 드롭 시 host에 W로 부착.
   * - 자기 진영/빈 슬롯/이미 부착된 host에는 거부(정보 메시지)
   * - 토큰 부족 거부
   * - 손패에서 제거 + host.parasiteRider 부착 + 부착 펄스 VFX
   * - 별도 unitCombatStats 등재 없음(W는 슬롯이 아니라 호스트의 부착물)
   */
  const attemptAttachAebeolaeking = (
    snap: SimulationState,
    saved: HandDragState,
    targetPlayer: "A" | "B",
    slot: "is" | "m" | "os" | "spell"
  ): boolean => {
    const hand = saved.player === "A" ? snap.playerA.hand : snap.playerB.hand;
    const card = hand[saved.cardIndex];
    if (!card || !isAebeolaekingCard(card)) return false;
    if (snap.currentTurn !== saved.player) return false;
    if (slot === "spell") {
      pushInfoFloat(`${saved.player}-spell`, "적 유닛 위에 놓아 주세요", INFO_FLOAT_MS);
      return true;
    }
    if (targetPlayer === saved.player) {
      pushInfoFloat(`${targetPlayer}-${slot}`, "적 유닛 위에 놓아 주세요", INFO_FLOAT_MS);
      return true;
    }
    const skCommit = slot as "is" | "m" | "os";
    const enemyField = targetPlayer === "A" ? snap.playerA.field : snap.playerB.field;
    const host = enemyField[skCommit];
    const can = canHandDragAttachAebeolaekingTo(saved.player, targetPlayer, host);
    if (!can.ok) {
      pushInfoFloat(`${targetPlayer}-${skCommit}`, can.reason ?? "사용할 수 없는 대상입니다", INFO_FLOAT_MS);
      return true;
    }
    const tokens = saved.player === "A" ? snap.playerA.tokens : snap.playerB.tokens;
    const cost = Number(card.cost) || 0;
    if (tokens < cost) {
      pushInfoFloat(`${targetPlayer}-${skCommit}`, "토큰이 부족합니다", INFO_FLOAT_MS);
      return true;
    }

    setState(prev => {
      if (!prev) return prev;
      const casterIsA = saved.player === "A";
      const casterPS = casterIsA ? prev.playerA : prev.playerB;
      const newHand = [...casterPS.hand];
      if (saved.cardIndex < 0 || saved.cardIndex >= newHand.length) return prev;
      const handCard = newHand[saved.cardIndex];
      if (!handCard || !isAebeolaekingCard(handCard)) return prev;
      const cst = Number(handCard.cost) || 0;
      if (casterPS.tokens < cst) return prev;
      newHand.splice(saved.cardIndex, 1);
      const enemyKey = targetPlayer === "A" ? "playerA" : "playerB";
      const enemyPS = targetPlayer === "A" ? prev.playerA : prev.playerB;
      const liveHost = enemyPS.field[skCommit];
      if (!liveHost || (liveHost.currentHp ?? 0) <= 0) return prev;
      if (hasAebeolaekingRider(liveHost)) return prev;
      const summonedTurn = `${prev.globalTurnCount}-${saved.player}`;
      const rider = buildAebeolaekingRider(handCard, {
        hostPlayer: targetPlayer,
        summonGlobalTurn: prev.globalTurnCount,
        statsInstanceId: createSimulationStatsInstanceId(),
        summonedTurn,
      });
      const newHost = attachAebeolaekingRider(liveHost, rider);
      const newEnemySide = {
        ...enemyPS,
        field: { ...enemyPS.field, [skCommit]: newHost },
      };
      const casterKey = casterIsA ? "playerA" : "playerB";
      const newCasterSide = { ...casterPS, hand: newHand, tokens: casterPS.tokens - cst };
      return {
        ...prev,
        [casterKey]: newCasterSide,
        [enemyKey]: newEnemySide,
      } as SimulationState;
    });

    /* 부착 VFX — 갈색 펄스 + 외곽 오라 */
    const targetSlotKey = `${targetPlayer}-${skCommit}`;
    window.setTimeout(() => {
      triggerCardFlash(targetSlotKey, "aebeolaekingAttach");
      triggerCardFlash(`${targetSlotKey}-aura`, "aebeolaekingAttachAura");
    }, 0);

    return true;
  };

  /**
   * 적 host에 부착된 W를 공격하는 commit 헬퍼(1차 공격만).
   * - 공격자 = host 진영의 모든 아군 유닛(host 본인 포함). attacker.player === host owner.
   * - 일반 유닛 1차 공격과 동일하게 validateAttack + isAttackDisabledUnit + 다굴 금지 룰(W.hasBeenAttackedThisTurn).
   * - W에 데미지 적용 + host에 50% 공유 — [무적]·방어막·보호막 통과.
   * - W 사망 시 host에서 분리 후 rewindCards push.
   * - 공유로 host도 사망하면 host(+W if any) 동반 rewind + cleanupSimulationUnitDeath.
   * - 공격자 hasAttacked=true, attacksThisTurn +1. W에 hasBeenAttackedThisTurn=true.
   * - 2차/3차 분기는 다음 단계.
   */
  const tryCommitAttackAgainstAebeolaekingRider = (
    attackerPlayer: "A" | "B",
    attackerSlot: "is" | "m" | "os",
    hostOwnerPlayer: "A" | "B",
    hostSlot: "is" | "m" | "os"
  ): boolean => {
    if (!state || winner) return false;
    /* attacker = W의 host 진영(W의 적). 자기 진영 W(아군 호스트)만 공격 가능. */
    if (attackerPlayer !== hostOwnerPlayer) return false;
    const attackerField = attackerPlayer === "A" ? state.playerA.field : state.playerB.field;
    const hostField = hostOwnerPlayer === "A" ? state.playerA.field : state.playerB.field;
    const attackerCard = attackerField[attackerSlot];
    const host = hostField[hostSlot];
    if (!attackerCard || !host || !hasAebeolaekingRider(host)) return false;
    const rider = host.parasiteRider!;
    if ((rider.currentHp ?? 0) <= 0) return false;
    if (isAttackDisabledUnit(attackerCard)) return false;

    /* 다굴 금지 룰 — 이미 이번 턴에 공격받은 W는 추가 공격 불가. */
    if (rider.hasBeenAttackedThisTurn) {
      alert("다른 유닛이 이미 이 유닛을 공격했습니다.\n(단, [도발] 효과를 가진 유닛은 한 턴에 여러 번 공격받을 수 있습니다.)");
      return true;
    }

    const activeForAttack = attackerPlayer === "A" ? state.playerA : state.playerB;
    const atkValidation = validateAttack({
      attackerCard,
      currentTurnKey: `${state.turnCount}-${state.currentTurn}`,
      attacksUsedThisTurn: activeForAttack.attacksThisTurn || 0,
      isSilenced: isSilenced(attackerCard, null),
      isStunned: isStunned(attackerCard),
    });
    if (!atkValidation.canAttack) {
      alert(atkValidation.reason);
      return true;
    }

    const baseAtkRaw = resolveFieldUnitSimulationBaseAtkRawWithFacing(
      attackerCard,
      attackOptionOverride,
      null
    );
    const parsed = parseAttack(baseAtkRaw.replace(/[\(\)]/g, ""));
    const rawDmg = Math.max(0, parsed.primaryDamage);
    if (rawDmg <= 0) {
      alert("공격력 데이터가 0이거나 유효하지 않습니다.");
      return true;
    }

    let appliedRiderDamage = 0;
    let appliedHostShare = 0;
    let blockedByInvuln = false;
    let absorbedByBarrier = 0;
    let riderKilled = false;
    let hostKilledByShare = false;
    const startingTreeAllyHealVfx: Record<string, number> = {};
    const diagoFieldHealVfx: Record<string, number> = {};

    setState(prev => {
      if (!prev) return prev;
      const newPlayerA = { ...prev.playerA, field: { ...prev.playerA.field } };
      const newPlayerB = { ...prev.playerB, field: { ...prev.playerB.field } };
      const hostSide = hostOwnerPlayer === "A" ? newPlayerA : newPlayerB;
      const atkSide = attackerPlayer === "A" ? newPlayerA : newPlayerB;
      const liveHost = hostSide.field[hostSlot];
      if (!liveHost || !hasAebeolaekingRider(liveHost)) return prev;

      const result = applyAebeolaekingDamageToRiderAndShareToHostWithProtection(
        liveHost,
        rawDmg,
        {
          hostOwner: hostOwnerPlayer,
          hostSlot,
          playerAField: newPlayerA.field,
          playerBField: newPlayerB.field,
        }
      );
      blockedByInvuln = result.blocked === "invuln";
      absorbedByBarrier = result.absorbedByBarrier;
      appliedRiderDamage = result.riderDamageApplied;
      appliedHostShare = result.hostShareDamage;
      riderKilled = !!result.deadRider;

      let finalHost: FieldCard = result.updatedHost;
      /* 공격받은 W에 hasBeenAttackedThisTurn=true 마킹(살아남았을 때만). */
      if (!result.deadRider && hasAebeolaekingRider(finalHost)) {
        finalHost = {
          ...finalHost,
          parasiteRider: {
            ...finalHost.parasiteRider!,
            hasBeenAttackedThisTurn: true,
          },
        };
      }

      /* 공격자 hasAttacked + attacksThisTurn(W 공격에는 시작깨비 체인 등 특수 룰 미적용) */
      const liveAttacker = atkSide.field[attackerSlot];
      if (liveAttacker) {
        atkSide.field[attackerSlot] = { ...liveAttacker, hasAttacked: true };
      }
      atkSide.attacksThisTurn = (atkSide.attacksThisTurn || 0) + 1;

      let newRewindCards = prev.rewindCards;
      let nextUnitCombatStats = prev.unitCombatStats;
      let nextUnitStatsOrder = prev.unitStatsOrder;

      hostKilledByShare = (finalHost.currentHp ?? 0) <= 0;

      /**
       * 시작의 나무 패시브 — host가 시작의 나무이고 공유로 hp가 감소했으면(사망 여부 무관)
       * 모든 아군에 50%(50단위 내림) 회복. 데미지 종류와 무관하게 hp 감소가 트리거.
       */
      if (appliedHostShare > 0) {
        const hostFacingOpp =
          (hostOwnerPlayer === "A" ? newPlayerB.field : newPlayerA.field)[hostSlot] ?? null;
        const startingTreeAllyHeal = getStartingTreeAllyHealOnDamaged(
          liveHost,
          appliedHostShare,
          hostFacingOpp
        );
        if (startingTreeAllyHeal > 0) {
          const beforeHeal = {
            is: hostSide.field.is,
            m: hostSide.field.m,
            os: hostSide.field.os,
          };
          applyStartingTreeDamagedHealSpread(
            hostOwnerPlayer,
            hostSlot,
            newPlayerA.field,
            newPlayerB.field,
            startingTreeAllyHeal
          );
          (["is", "m", "os"] as const).forEach(otherS => {
            if (otherS === hostSlot) return;
            const before = beforeHeal[otherS];
            const after = hostSide.field[otherS];
            if (!before || !after) return;
            const healed = Math.max(0, (after.currentHp ?? 0) - (before.currentHp ?? 0));
            if (healed > 0) startingTreeAllyHealVfx[`${hostOwnerPlayer}-${otherS}`] = healed;
          });
          const casterField = hostOwnerPlayer === "A" ? newPlayerB.field : newPlayerA.field;
          const riderHeal = applyHealToOwnAebeolaekingRidersOnEnemyField(
            casterField,
            hostOwnerPlayer,
            startingTreeAllyHeal,
            "allyUnit"
          );
          riderHeal.perSlot.forEach(({ slot: riderHostSlot, healed }) => {
            if (healed > 0) {
              startingTreeAllyHealVfx[aebeolaekingRiderSlotKey(hostOwnerPlayer, riderHostSlot)] =
                healed;
            }
          });
        }
      }

      if (hostKilledByShare) {
        cleanupSimulationUnitDeath(finalHost, newPlayerA, newPlayerB, prev.globalTurnCount);
        newRewindCards = appendDeadHostWithRiderToRewindCards(newRewindCards, finalHost);
        const sid = finalHost.statsInstanceId;
        if (sid) {
          const { [sid]: _r, ...rest } = nextUnitCombatStats;
          nextUnitCombatStats = rest;
          nextUnitStatsOrder = nextUnitStatsOrder.filter(x => x !== sid);
        }
        hostSide.field[hostSlot] = null;
      } else {
        hostSide.field[hostSlot] = finalHost;
        if (result.deadRider) {
          newRewindCards = [...newRewindCards, stripAebeolaekingRiderMeta(result.deadRider)];
        }
      }

      /* attacker 전투 통계 — 데미지 적용 합 = riderDamageApplied + hostShareDamage */
      const totalDamageDealt = appliedRiderDamage + appliedHostShare;
      const combatPatches: Array<{
        id: string | undefined;
        delta: Partial<Record<"damageDealt" | "kills" | "damageTaken" | "selfHeal" | "allyHealGiven" | "damageMitigated", number>>;
      }> = [];
      if (attackerCard.statsInstanceId && totalDamageDealt > 0) {
        combatPatches.push({
          id: attackerCard.statsInstanceId,
          delta: { damageDealt: totalDamageDealt, kills: riderKilled ? 1 : 0 },
        });
      }

      let fieldHealDiago = 0;
      if (totalDamageDealt > 0) {
        applyPostAttackSkills(
          attackerCard,
          {
            damageDealt: totalDamageDealt,
            targetDestroyed: riderKilled,
            applyFieldHeal: amt => {
              fieldHealDiago = amt;
            },
            applyFieldBuff: () => {},
          },
          (hostOwnerPlayer === "A" ? newPlayerB.field : newPlayerA.field)[hostSlot] ?? null
        );
      }
      if (fieldHealDiago > 0) {
        (["is", "m", "os"] as const).forEach(s => {
          const u = atkSide.field[s];
          if (!u) return;
          const before = u.currentHp ?? 0;
          atkSide.field[s] = applyFieldAllyHealToUnit(
            u,
            fieldHealDiago,
            attackerCard,
            attackerSlot,
            s
          );
          const healed = Math.max(0, (atkSide.field[s]!.currentHp ?? 0) - before);
          if (healed > 0) diagoFieldHealVfx[`${attackerPlayer}-${s}`] = healed;
        });
        const enemyFieldDiago =
          attackerPlayer === "A" ? newPlayerB.field : newPlayerA.field;
        const riderDiago = applyFieldAllyHealToOwnAebeolaekingRidersOnEnemyField(
          enemyFieldDiago,
          attackerPlayer,
          fieldHealDiago,
          attackerCard,
          attackerSlot
        );
        const enemyPlayerDiago = attackerPlayer === "A" ? "B" : "A";
        riderDiago.perSlot.forEach(({ slot: riderHostSlot, healed }) => {
          if (healed > 0) {
            diagoFieldHealVfx[aebeolaekingRiderSlotKey(enemyPlayerDiago, riderHostSlot)] = healed;
          }
        });
      }

      return {
        ...prev,
        unitCombatStats: patchManyUnitCombatStats(nextUnitCombatStats, combatPatches),
        unitStatsOrder: nextUnitStatsOrder,
        rewindCards: newRewindCards,
        playerA: newPlayerA,
        playerB: newPlayerB,
      };
    });

    setAttackingSlot(null);
    setAttackOptionOverride(null);
    setPendingSecondaryAttack(null);
    applyStartingWraithChainPending(null);
    setSelectedSlot(null);

    const riderKey = aebeolaekingRiderSlotKey(hostOwnerPlayer, hostSlot);
    const hostKey = `${hostOwnerPlayer}-${hostSlot}`;
    if (blockedByInvuln) {
      /* [무적] 차단 — 일단 데미지 0 표시(보호 VFX는 후속). */
      showDamageNumber(riderKey, 0);
      return true;
    }

    const riderShownDmg = appliedRiderDamage + absorbedByBarrier;
    if (riderShownDmg > 0) {
      showDamageNumber(riderKey, riderShownDmg);
      window.setTimeout(() => triggerCardFlash(riderKey, "aebeolaekingParasiteTick"), 0);
    }
    if (appliedHostShare > 0 && !hostKilledByShare) {
      showDamageNumber(hostKey, appliedHostShare);
    } else if (appliedHostShare > 0 && hostKilledByShare) {
      showDamageNumber(hostKey, appliedHostShare);
    }
    /* 시작의 나무 패시브 회복 — 아군에 회복 플로팅 텍스트 + 회복 플래시. */
    for (const [healKey, healAmount] of Object.entries(startingTreeAllyHealVfx)) {
      if (healAmount > 0) {
        showHealNumber(healKey, healAmount);
      }
    }
    for (const [healKey, healAmount] of Object.entries(diagoFieldHealVfx)) {
      if (healAmount > 0) showHealNumber(healKey, healAmount);
    }
    return true;
  };

  const cancelHandDrag = (e: React.PointerEvent) => {
    const d = activeHandDragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    activeHandDragRef.current = null;
    setHandDrag(null);
    setHandDragHoverSlotKey(null);
  };

  const handlePlayerAttack = (targetPlayer: "A" | "B") => {
    if (state?.guihwanPending) return;
    if (pendingLegendarySwordStrike) {
      const pls = pendingLegendarySwordStrike;
      const enemyPlayer = pls.ownerPlayer === "A" ? "B" : "A";
      if (targetPlayer !== enemyPlayer || !state || winner) return;

      const strikePhase = Number(pls.phase) === 2 ? 2 : 1;
      const damage =
        strikePhase === 1
          ? LEGENDARY_SWORD_FIRST_HIT_DAMAGE
          : LEGENDARY_SWORD_PLAYER_SECOND_HIT_DAMAGE;

      const enemyField = enemyPlayer === "A" ? state.playerA.field : state.playerB.field;
      const noLivingEnemyUnits = countLivingFieldUnits(enemyField) === 0;
      const finishStrike = strikePhase >= 2 || (strikePhase === 1 && noLivingEnemyUnits);
      const postEnemyHp = Math.max(
        0,
        (enemyPlayer === "A" ? state.playerA.hp : state.playerB.hp) - damage
      );

      setState(prev => {
        if (!prev) return prev;
        const enemyKey = enemyPlayer === "A" ? "playerA" : "playerB";
        const ownerKey = pls.ownerPlayer === "A" ? "playerA" : "playerB";
        const newEnemy = { ...prev[enemyKey] };
        newEnemy.hp = Math.max(0, newEnemy.hp - damage);

        if (finishStrike) {
          const newOwner = { ...prev[ownerKey], field: { ...prev[ownerKey].field } };
          const sword = newOwner.field[pls.swordSlot];
          if (sword?.name === UNIT.LEGENDARY_SWORD) {
            const stripped = stripLegendarySwordForRewind(sword);
            newOwner.field[pls.swordSlot] = null;
            return {
              ...prev,
              [enemyKey]: newEnemy,
              [ownerKey]: newOwner,
              rewindCards: [...prev.rewindCards, stripped],
            };
          }
        }

        return { ...prev, [enemyKey]: newEnemy };
      });

      showLegendarySwordSkillHit(`player-${targetPlayer}`, damage);

      if (finishStrike) {
        flushSync(() => applyLegendarySwordStrikePending(null));
        setTimeout(() => {
          if (postEnemyHp <= 0) {
            setWinner(pls.ownerPlayer);
          }
        }, 50);
        notifyMultiplaySync();
        return;
      }

      applyLegendarySwordStrikePending({
        ...pls,
        phase: 2,
        hitTargets: [...pls.hitTargets, LEGENDARY_SWORD_HIT_PLAYER_MARK],
      });
      notifyMultiplaySync();
      return;
    }

    if (!attackingSlot || !state || winner) return;
    const [attackerPlayer, attackerSlotName] = attackingSlot.split("-") as ["A" | "B", "is" | "m" | "os"];
    
    if (attackerPlayer === targetPlayer) return; 

    const attackerFieldPeek = attackerPlayer === "A" ? state.playerA.field : state.playerB.field;
    if (isLibuty(attackerFieldPeek[attackerSlotName])) {
      alert("리부티는 적 플레이어 HP를 직접 공격할 수 없습니다. 기본 공격은 '모든 적 공격'으로만 사용할 수 있습니다.");
      setAttackingSlot(null);
      setAttackOptionOverride(null);
      return;
    }
    if (isRyeomcho(attackerFieldPeek[attackerSlotName])) {
      alert(BATTLE_MSG.ryeomcho.cannotAttackPlayer);
      setAttackingSlot(null);
      setAttackOptionOverride(null);
      return;
    }
    if (isRanigo(attackerFieldPeek[attackerSlotName])) {
      const ranigoFacing = facingOppUnitAtSlot(state, attackerPlayer, attackerSlotName);
      if (isRanigoAllyHealBasicAttackSealed(attackerFieldPeek[attackerSlotName], ranigoFacing)) {
        setAttackingSlot(null);
        setAttackOptionOverride(null);
        return;
      }
      alert(BATTLE_MSG.ranigo.cannotAttackEnemy);
      setAttackingSlot(null);
      setAttackOptionOverride(null);
      return;
    }

    const targetPlayerState = targetPlayer === "A" ? state.playerA : state.playerB;
    const attackerCardPeek = attackerFieldPeek[attackerSlotName];
    const defenderFieldForWraithPlayerStrike =
      targetPlayer === "A" ? state.playerA.field : state.playerB.field;
    const defenderFieldEmptyForWraithPlayerFollowUp =
      !defenderFieldForWraithPlayerStrike.is &&
      !defenderFieldForWraithPlayerStrike.m &&
      !defenderFieldForWraithPlayerStrike.os;
    const activeForPlayerStrikePre =
      attackerPlayer === "A" ? state.playerA : state.playerB;
    const wraithFacingPlayerStrike = facingOppUnitAtSlot(state, attackerPlayer, attackerSlotName);
    const wraithPlayerHpFollowUpValidate =
      !!attackerCardPeek &&
      isStartingWraithTrueStrikeBasicAttacker(attackerCardPeek, wraithFacingPlayerStrike) &&
      defenderFieldEmptyForWraithPlayerFollowUp &&
      (activeForPlayerStrikePre.attacksThisTurn || 0) < 2 &&
      (!!attackerCardPeek.hasAttacked || pendingStartingWraithChainPlayerHp);
    if (
      !wraithPlayerHpFollowUpValidate &&
      targetPlayerState.hasBeenAttackedThisTurn &&
      !fieldGrantsFocusedFireMultihitExemption(
        attackerFieldPeek,
        {
          allyPlayer: attackerPlayer,
          playerAField: state.playerA.field,
          playerBField: state.playerB.field,
        },
        attackerCardPeek
      ) &&
      !startingHeraldBasicAttackIgnoresTauntTargetingRestrictions(
        attackerCardPeek,
        wraithFacingPlayerStrike
      )
    ) {
      alert('다른 유닛이 이미 상대 플레이어를 공격했습니다. (플레이어 다구리 금지)');
      setAttackingSlot(null);
      setAttackOptionOverride(null);
      return;
    }

    const attackerField = attackerPlayer === "A" ? state.playerA.field : state.playerB.field;
    const attackerCard = attackerField[attackerSlotName];
    if (!attackerCard) return;
    if (isAttackDisabledUnit(attackerCard)) {
      setAttackingSlot(null);
      setAttackOptionOverride(null);
      return;
    }

    const activeForPlayerStrike =
      attackerPlayer === "A" ? state.playerA : state.playerB;
    const playerStrikeRules = validateAttack({
      attackerCard,
      currentTurnKey: `${state.turnCount}-${state.currentTurn}`,
      attacksUsedThisTurn: activeForPlayerStrike.attacksThisTurn || 0,
      isSilenced: isSilenced(attackerCard, null),
      isStunned: isStunned(attackerCard),
      overrideHasAttackedCheck: wraithPlayerHpFollowUpValidate,
    });
    if (!playerStrikeRules.canAttack) {
      alert(playerStrikeRules.reason ?? "공격할 수 없습니다.");
      setAttackingSlot(null);
      setAttackOptionOverride(null);
      return;
    }

    const baseAtkRaw = resolveFieldUnitSimulationBaseAtkRawWithFacing(
      attackerCard,
      attackOptionOverride,
      facingOppUnitAtSlot(state, attackerPlayer, attackerSlotName)
    );
    const atkRaw = baseAtkRaw.replace(/[\(\)]/g, ""); 
    const atkRawLower = atkRaw.toLowerCase();
    
    let primaryDamage = 0;
    
    if (atkRaw.includes("+")) {
      primaryDamage = parseInt(atkRaw.split("+")[0].trim()) || 0;
    } else if (atkRawLower.includes("x") || atkRaw.includes("*")) {
      const separator = atkRawLower.includes("x") ? "x" : "*";
      primaryDamage = parseInt(atkRawLower.split(separator)[0].trim()) || 0;
    } else {
      primaryDamage = parseInt(atkRaw.trim()) || 0; 
    }

    if (primaryDamage <= 0) {
      alert("공격력 데이터가 0이거나 유효하지 않습니다.");
      setAttackingSlot(null);
      setAttackOptionOverride(null);
      return;
    }

    ({ primaryDamage } = applyAttackerOutgoingBuffDamageModsUnlessCallieBanned(
      attackerPlayer,
      attackerSlotName,
      attackerCard,
      attackerField,
      targetPlayerState.field,
      state.playerA.field,
      state.playerB.field,
      primaryDamage,
      0
    ));

    primaryDamage = scalePakkiOutgoingHit(primaryDamage, attackerCard, attackerField, {
      allyPlayer: attackerPlayer,
      playerAField: state.playerA.field,
      playerBField: state.playerB.field,
    });

    let fieldHealAmount = 0;
    let fieldBuffKey = "";
    const skillUpdates = applyPostAttackSkills(
      attackerCard,
      {
        damageDealt: primaryDamage,
        targetDestroyed: false,
        applyFieldHeal: amt => {
          fieldHealAmount = amt;
        },
        applyFieldBuff: key => {
          fieldBuffKey = key;
        },
      },
      (attackerPlayer === "A" ? state.playerB.field : state.playerA.field)[attackerSlotName] ?? null
    );
    const attackerHeal = getHealFromSkillUpdates(attackerCard, skillUpdates);

    const maengCombatPatches: Array<{
      id: string | undefined;
      delta: Partial<
        Record<
          "damageDealt" | "kills" | "damageTaken" | "selfHeal" | "allyHealGiven" | "damageMitigated",
          number
        >
      >;
    }> = [];
    if (attackerCard.statsInstanceId && primaryDamage > 0) {
      maengCombatPatches.push({
        id: attackerCard.statsInstanceId,
        delta: { damageDealt: primaryDamage },
      });
    }
    if (attackerHeal > 0 && attackerCard.statsInstanceId) {
      maengCombatPatches.push({
        id: attackerCard.statsInstanceId,
        delta: { selfHeal: attackerHeal },
      });
    }
    if (fieldHealAmount > 0 && attackerCard.statsInstanceId) {
      const allySnapMaeng = attackerPlayer === "A" ? state.playerA.field : state.playerB.field;
      (["is", "m", "os"] as const).forEach(s => {
        const u = allySnapMaeng[s];
        if (!u?.statsInstanceId) return;
        const healedFld = computeFieldAllyHealApplied(
          u,
          fieldHealAmount,
          attackerCard,
          attackerSlotName,
          s
        );
        if (healedFld <= 0) return;
        if (u.statsInstanceId === attackerCard.statsInstanceId) {
          maengCombatPatches.push({ id: u.statsInstanceId, delta: { selfHeal: healedFld } });
        } else {
          maengCombatPatches.push({ id: attackerCard.statsInstanceId, delta: { allyHealGiven: healedFld } });
          maengCombatPatches.push({ id: u.statsInstanceId, delta: { selfHeal: healedFld } });
        }
      });
    }

    setState(prev => {
      if (!prev) return prev;
      const newPlayerA = { ...prev.playerA, field: { ...prev.playerA.field } };
      const newPlayerB = { ...prev.playerB, field: { ...prev.playerB.field } };
      
      const updatedAttacker = { ...attackerCard, hasAttacked: true, ...skillUpdates }; 
      
      if (attackerPlayer === "A") {
        newPlayerA.field[attackerSlotName] = updatedAttacker;
        newPlayerA.attacksThisTurn = (newPlayerA.attacksThisTurn || 0) + 1;
      } else {
        newPlayerB.field[attackerSlotName] = updatedAttacker;
        newPlayerB.attacksThisTurn = (newPlayerB.attacksThisTurn || 0) + 1;
      }

      if (targetPlayer === "A") {
        newPlayerA.hp = Math.max(0, newPlayerA.hp - primaryDamage);
        newPlayerA.hasBeenAttackedThisTurn = true; 
      } else {
        newPlayerB.hp = Math.max(0, newPlayerB.hp - primaryDamage);
        newPlayerB.hasBeenAttackedThisTurn = true; 
      }

      const activePlayer = attackerPlayer === "A" ? newPlayerA : newPlayerB;
      if (fieldHealAmount > 0 || fieldBuffKey) {
        (["is", "m", "os"] as const).forEach(s => {
          const unit = activePlayer.field[s];
          if (!unit) return;
          const updatedUnit = { ...unit };
          if (fieldHealAmount > 0) {
            Object.assign(
              updatedUnit,
              applyFieldAllyHealToUnit(
                updatedUnit,
                fieldHealAmount,
                attackerCard,
                attackerSlotName,
                s
              )
            );
          }
          if (fieldBuffKey && !suppressionBlocksExternalBuffEffects(updatedUnit)) {
            (updatedUnit as FieldCard & Record<string, unknown>)[fieldBuffKey] = true;
          }
          activePlayer.field[s] = updatedUnit;
        });
      }

      return {
        ...prev,
        unitCombatStats: patchManyUnitCombatStats(prev.unitCombatStats, maengCombatPatches),
        playerA: newPlayerA,
        playerB: newPlayerB,
      };
    });

    const newHp = targetPlayer === "A" ? state.playerA.hp - primaryDamage : state.playerB.hp - primaryDamage;

    showDamageNumber(`player-${targetPlayer}`, primaryDamage);
    if (attackerHeal > 0) {
      showHealNumber(`${attackerPlayer}-${attackerSlotName}`, attackerHeal);
    }
    if (fieldHealAmount > 0) {
      const allySnap = attackerPlayer === "A" ? state.playerA.field : state.playerB.field;
      (["is", "m", "os"] as const).forEach(s => {
        const u = allySnap[s];
        if (!u) return;
        const healed = computeFieldAllyHealApplied(
          u,
          fieldHealAmount,
          attackerCard,
          attackerSlotName,
          s
        );
        if (healed > 0) showHealNumber(`${attackerPlayer}-${s}`, healed);
      });
    }

    setTimeout(() => {
      if (newHp <= 0) {
        setWinner(attackerPlayer);
      }
    }, 50);

    setAttackingSlot(null);
    setAttackOptionOverride(null);
    applyStartingWraithChainPending(null);
    notifyMultiplaySync();
  };

  const commitLibutyAllEnemiesBasicAttack = () => {
    if (!pendingLibutyAllEnemiesAttack || !state || winner) return;
    const pend = pendingLibutyAllEnemiesAttack;
    setPendingLibutyAllEnemiesAttack(null);

    const { player: attackerPlayer, slot: attackerSlotName } = pend;
    const attackerFieldSnap =
      attackerPlayer === "A" ? state.playerA.field : state.playerB.field;
    const attackerCardSnap = attackerFieldSnap[attackerSlotName];
    if (!attackerCardSnap || !isLibuty(attackerCardSnap) || isAttackDisabledUnit(attackerCardSnap)) return;

    const activeForStrike = attackerPlayer === "A" ? state.playerA : state.playerB;
    const atkRules = validateAttack({
      attackerCard: attackerCardSnap,
      currentTurnKey: `${state.turnCount}-${state.currentTurn}`,
      attacksUsedThisTurn: activeForStrike.attacksThisTurn || 0,
      isSilenced: isSilenced(attackerCardSnap, null),
      isStunned: isStunned(attackerCardSnap),
    });
    if (!atkRules.canAttack) {
      alert(atkRules.reason ?? "공격할 수 없습니다.");
      return;
    }

    const defenderPlayer = attackerPlayer === "A" ? "B" : "A";
    const defenderFieldSnap =
      defenderPlayer === "A" ? state.playerA.field : state.playerB.field;
    const slotsToHit = (["is", "m", "os"] as const).filter(s => {
      const u = defenderFieldSnap[s];
      return u != null && (u.currentHp ?? 0) > 0;
    });
    if (slotsToHit.length === 0) {
      alert("필드에 공격할 적이 없습니다.");
      return;
    }

    const playerAField = state.playerA.field;
    const playerBField = state.playerB.field;
    const victimFieldForInvuln = defenderPlayer === "A" ? playerAField : playerBField;

    type LibutyHitRow = {
      slot: "is" | "m" | "os";
      card: FieldCard;
      newHp: number;
      isDestroyed: boolean;
      actualPrimaryDamage: number;
      kalliPurePrimary: number;
      hpLossPrimary: number;
      skillUpdates: Partial<FieldCard>;
      fieldHealAmountPrimary: number;
      fieldBuffKeyPrimary: string;
      morningMoodDeathHeal: number;
      startingTreeAllyHeal: number;
      baekseuLastStandPrimary: boolean;
      baekseuPatchPrimary: Partial<FieldCard>;
      barrierNextRemaining: number;
      pakkiDebuffPrimary: boolean;
      targetMitigationPrimary: number;
    };

    const rows: LibutyHitRow[] = [];
    let mergedSkillUpdates: Partial<FieldCard> = {};
    let anyPakkiDebuff = false;

    for (const slotName of slotsToHit) {
      const card = defenderFieldSnap[slotName]!;
      let primaryDamage = LIBUTY_BASIC_AOE_DAMAGE;
      let secondaryDamage = 0;
      const attackType = "NORMAL" as const;
      const secondaryHits = 0;

      ({ primaryDamage, secondaryDamage } = applyAttackerOutgoingBuffDamageModsUnlessCallieBanned(
        attackerPlayer,
        attackerSlotName,
        attackerCardSnap,
        attackerFieldSnap,
        defenderFieldSnap,
        playerAField,
        playerBField,
        primaryDamage,
        secondaryDamage,
        { attackType, secondaryHits }
      ));
      primaryDamage = scalePakkiOutgoingHit(primaryDamage, attackerCardSnap, attackerFieldSnap, {
        allyPlayer: attackerPlayer,
        playerAField,
        playerBField,
      });

      const attackerFacingOppLibuty =
        (attackerPlayer === "A" ? playerBField : playerAField)[attackerSlotName] ?? null;
      const kalliVsDefenseStrike = kalliBasicAttackSkipsTargetMitigationVsDefenseType(
        attackerCardSnap,
        card,
        attackerFacingOppLibuty
      );
      const kalliPurePrimary = getKalliVsDefenseTypePureBonus(
        attackerCardSnap,
        card,
        attackerFacingOppLibuty
      );
      let afterBanjitPrimary = primaryDamage;
      let banjitMitPrimary = 0;
      if (
        !kalliVsDefenseStrike &&
        (card as FieldCard & { hasBanjitgori?: boolean }).hasBanjitgori &&
        !callieBuffBanSuppressesBuffsForVictim(
          defenderPlayer,
          slotName,
          playerAField,
          playerBField
        )
      ) {
        const floored = Math.floor((primaryDamage * 0.75) / 50) * 50;
        banjitMitPrimary = Math.max(0, primaryDamage - floored);
        afterBanjitPrimary = floored;
      }

      const primaryDefenseResult = kalliVsDefenseStrike
        ? { finalDamage: afterBanjitPrimary }
        : applyIncomingDefenseDamage(
            afterBanjitPrimary,
            card,
            playerAField,
            playerBField,
            `${defenderPlayer}-${slotName}`
          );
      const defenseMitPrimary =
        !kalliVsDefenseStrike && !isInvulnerableFromBaekseuOrCheolbyeok(card, victimFieldForInvuln)
          ? Math.max(0, afterBanjitPrimary - primaryDefenseResult.finalDamage)
          : 0;
      const coreAfterDefense =
        kalliVsDefenseStrike || isInvulnerableFromBaekseuOrCheolbyeok(card, victimFieldForInvuln)
          ? afterBanjitPrimary
          : primaryDefenseResult.finalDamage;
      const preInvulnTotal = coreAfterDefense + kalliPurePrimary;
      let actualPrimaryDamage = isInvulnerableFromBaekseuOrCheolbyeok(card, victimFieldForInvuln)
        ? 0
        : preInvulnTotal;
      const cardForCombatPrimary = normalizeUnitHpSurvivalOnesForCombat(card);
      const barrierSplitPrimary = splitDamageThroughHpBarrier(cardForCombatPrimary, actualPrimaryDamage);
      const hpAfterRawPrimary = cardForCombatPrimary.currentHp - barrierSplitPrimary.damageToCurrentHp;
      const resolvedPrimary = resolveBaekseuFatalDamage(
        cardForCombatPrimary,
        hpAfterRawPrimary,
        barrierSplitPrimary.damageToCurrentHp,
        facingOppUnitAtSlot(state!, defenderPlayer, slotName)
      );
      const newHp = resolvedPrimary.finalHp;
      const hpLossPrimary = Math.max(0, cardForCombatPrimary.currentHp - newHp);
      const targetMitigationPrimary =
        banjitMitPrimary + defenseMitPrimary + Math.max(0, preInvulnTotal - hpLossPrimary);
      const isDestroyed = resolvedPrimary.isDestroyed;
      const baekseuPatchPrimary = resolvedPrimary.patch;
      const baekseuLastStandPrimary = resolvedPrimary.lastStandTriggered;

      const morningMoodDeathHeal = isDestroyed
        ? getMorningMoodDeathAllyHeal(card, facingOppUnitAtSlot(state!, defenderPlayer, slotName))
        : 0;
      const startingTreeAllyHeal = getStartingTreeAllyHealOnDamaged(
        card,
        actualPrimaryDamage,
        facingOppUnitAtSlot(state!, defenderPlayer, slotName)
      );

      let fieldHealAmountPrimary = 0;
      let fieldBuffKeyPrimary = "";
      const skillUpdates = applyPostAttackSkills(
        attackerCardSnap,
        {
          damageDealt: actualPrimaryDamage,
          targetDestroyed: isDestroyed,
          targetMaxHpWhenDestroyed: isDestroyed ? Number(card.hp) : undefined,
          applyFieldHeal: amt => {
            fieldHealAmountPrimary += amt;
          },
          applyFieldBuff: key => {
            fieldBuffKeyPrimary = key;
          },
        },
        facingOppUnitAtSlot(state, attackerPlayer, attackerSlotName)
      );
      mergedSkillUpdates = { ...mergedSkillUpdates, ...skillUpdates };

      const pakkiDebuffPrimary =
        isDestroyed &&
        shouldApplyPakkiKillDebuffOnDeath(
          card,
          facingOppUnitAtSlot(state, defenderPlayer, slotName),
          attackerFieldSnap,
          {
            allyPlayer: attackerPlayer,
            playerAField,
            playerBField,
          }
        );
      if (pakkiDebuffPrimary) anyPakkiDebuff = true;

      rows.push({
        slot: slotName,
        card: cardForCombatPrimary,
        newHp,
        isDestroyed,
        actualPrimaryDamage,
        kalliPurePrimary,
        hpLossPrimary,
        skillUpdates,
        fieldHealAmountPrimary,
        fieldBuffKeyPrimary,
        morningMoodDeathHeal,
        startingTreeAllyHeal,
        baekseuLastStandPrimary,
        baekseuPatchPrimary,
        barrierNextRemaining: barrierSplitPrimary.nextBarrierRemaining,
        pakkiDebuffPrimary,
        targetMitigationPrimary,
      });
    }

    const combatPatchList: Array<{
      id: string | undefined;
      delta: Partial<
        Record<
          "damageDealt" | "kills" | "damageTaken" | "selfHeal" | "allyHealGiven" | "damageMitigated",
          number
        >
      >;
    }> = [];

    for (const r of rows) {
      if (attackerCardSnap.statsInstanceId) {
        combatPatchList.push({
          id: attackerCardSnap.statsInstanceId,
          delta: { damageDealt: r.hpLossPrimary, kills: r.isDestroyed ? 1 : 0 },
        });
      }
      if (r.card.statsInstanceId) {
        combatPatchList.push({
          id: r.card.statsInstanceId,
          delta: { damageTaken: r.hpLossPrimary, damageMitigated: r.targetMitigationPrimary },
        });
      }
      const attackerHealFromHit = getHealFromSkillUpdates(attackerCardSnap, r.skillUpdates);
      if (attackerHealFromHit > 0 && attackerCardSnap.statsInstanceId) {
        combatPatchList.push({
          id: attackerCardSnap.statsInstanceId,
          delta: { selfHeal: attackerHealFromHit },
        });
      }
      if (r.morningMoodDeathHeal > 0 && r.isDestroyed && r.card.statsInstanceId) {
        (["is", "m", "os"] as const).forEach(s => {
          if (s === r.slot) return;
          const u = defenderFieldSnap[s];
          if (!u?.statsInstanceId) return;
          const healedMm = Math.min(Number(u.hp) - u.currentHp, r.morningMoodDeathHeal);
          if (healedMm <= 0) return;
          combatPatchList.push({ id: r.card.statsInstanceId, delta: { allyHealGiven: healedMm } });
          combatPatchList.push({ id: u.statsInstanceId, delta: { selfHeal: healedMm } });
        });
      }
      if (r.startingTreeAllyHeal > 0 && r.card.statsInstanceId) {
        (["is", "m", "os"] as const).forEach(s => {
          if (s === r.slot) return;
          const u = defenderFieldSnap[s];
          if (!u?.statsInstanceId) return;
          const healedSt = Math.min(Number(u.hp) - u.currentHp, r.startingTreeAllyHeal);
          if (healedSt <= 0) return;
          combatPatchList.push({ id: r.card.statsInstanceId, delta: { allyHealGiven: healedSt } });
          combatPatchList.push({ id: u.statsInstanceId, delta: { selfHeal: healedSt } });
        });
      }
      if (r.fieldHealAmountPrimary > 0 && attackerCardSnap.statsInstanceId) {
        const allySidePrimary = attackerPlayer === "A" ? state.playerA.field : state.playerB.field;
        (["is", "m", "os"] as const).forEach(s => {
          const u = allySidePrimary[s];
          if (!u?.statsInstanceId) return;
          const healedFld = computeFieldAllyHealApplied(
            u,
            r.fieldHealAmountPrimary,
            attackerCardSnap,
            attackerSlotName,
            s
          );
          if (healedFld <= 0) return;
          if (u.statsInstanceId === attackerCardSnap.statsInstanceId) {
            combatPatchList.push({ id: u.statsInstanceId, delta: { selfHeal: healedFld } });
          } else {
            combatPatchList.push({ id: attackerCardSnap.statsInstanceId, delta: { allyHealGiven: healedFld } });
            combatPatchList.push({ id: u.statsInstanceId, delta: { selfHeal: healedFld } });
          }
        });
      }
    }

    let maxellCum: Partial<FieldCard> = {};
    let gaugeSim: FieldCard = attackerCardSnap;
    for (const r of rows) {
      if (!r.isDestroyed) continue;
      const b = bumpMaxellandTenacityGaugeOnEnemyKill(
        { ...gaugeSim, ...maxellCum },
        true,
        facingOppUnitAtSlot(state, attackerPlayer, attackerSlotName)
      );
      maxellCum = { ...maxellCum, ...b };
    }

    const fieldHealDiagoTotal = rows.reduce((a, r) => a + r.fieldHealAmountPrimary, 0);
    const fieldBuffKeyDiago = rows.map(r => r.fieldBuffKeyPrimary).filter(Boolean).pop() ?? "";

    const updatedAttacker = {
      ...attackerCardSnap,
      hasAttacked: true,
      ...mergedSkillUpdates,
      ...maxellCum,
      ...(anyPakkiDebuff ? { hasPakiAttackHalveDebuff: true } : {}),
    } as FieldCard;

    /**
     * 애벌레킹(W) 통합 — 리부티의 모든 적 공격 패시브에 W를 포함시킨다.
     * - 각 host에 대해 (a) host→W 50% 공유 + (b) W에 직접 LIBUTY 데미지 + W→host 50% 공유 적용.
     * - aebVfxByRow: row별 W slot VFX 데이터(riderShown=실제 적용+보호막 흡수, hostShareShown=W→host 공유량).
     * - aebDeadHostFinalByRow: 공유 누적으로 host가 추가 사망한 경우의 finalTarget(rewind용, W 동반).
     */
    const aebVfxByRow: Record<string, { riderShown: number; hostShareShown: number; blockedInvuln: boolean }> = {};
    const aebDeadHostFinalByRow: Record<string, FieldCard | null> = {};
    const aebDeadRiderByRow: Record<string, FieldCard | null> = {};
    /* W→host 공유로 host(=시작의 나무)가 추가 데미지를 입을 때, 같은 진영 아군에 회복 — 슬롯 키별 회복량. */
    const aebStartingTreeAllyHealVfx: Record<string, number> = {};

    setState(prev => {
      if (!prev) return prev;
      const cleanupSkillLinksOnDeath = (deadCard: FieldCard, newPA: PlayerState, newPB: PlayerState, gt: number) => {
        cleanupSimulationUnitDeath(deadCard, newPA, newPB, gt);
      };

      const newPlayerA = { ...prev.playerA, field: { ...prev.playerA.field } };
      const newPlayerB = { ...prev.playerB, field: { ...prev.playerB.field } };

      if (attackerPlayer === "A") {
        newPlayerA.field[attackerSlotName] = updatedAttacker;
        newPlayerA.attacksThisTurn = (newPlayerA.attacksThisTurn || 0) + 1;
      } else {
        newPlayerB.field[attackerSlotName] = updatedAttacker;
        newPlayerB.attacksThisTurn = (newPlayerB.attacksThisTurn || 0) + 1;
      }

      const defSide = defenderPlayer === "A" ? newPlayerA : newPlayerB;
      const elixir5AttackerFacingOpp =
        (attackerPlayer === "A" ? playerBField : playerAField)[attackerSlotName] ?? null;
      for (const r of rows) {
        const baseTargetPrimary =
          Object.keys(r.baekseuPatchPrimary).length > 0
            ? stripBaekseuHarmfulEffectsForInvuln(r.card)
            : r.card;
        const updatedTarget: FieldCard = {
          ...baseTargetPrimary,
          ...elixir5StunTargetPatch(
            attackerCardSnap,
            r.actualPrimaryDamage,
            r.isDestroyed,
            elixir5AttackerFacingOpp
          ),
          ...r.baekseuPatchPrimary,
          ...hpBarrierPatchFromRemaining(r.barrierNextRemaining),
          currentHp: r.newHp,
          hasBeenAttackedThisTurn: true,
        };

        let finalTarget: FieldCard = updatedTarget;
        let hostKilledByAebShare = false;
        let riderShownVfx = 0;
        let hostShareVfx = 0;
        let blockedInvuln = false;
        let deadRiderRow: FieldCard | null = null;

        /* (a) host→W 50% 공유 — host 살아남고 W 부착 시. */
        if (!r.isDestroyed && hasAebeolaekingRider(finalTarget) && r.hpLossPrimary > 0) {
          const sa = applyAebeolaekingDamageShareFromHostToRiderWithProtection(
            finalTarget,
            r.hpLossPrimary,
            {
              hostOwner: defenderPlayer,
              playerAField: newPlayerA.field,
              playerBField: newPlayerB.field,
            }
          );
          finalTarget = sa.updatedHost;
          riderShownVfx += sa.sharedToRider + sa.absorbedByBarrier;
          if (sa.deadRider) deadRiderRow = sa.deadRider;
        }

        /* (b) W에 별도 LIBUTY 데미지 + W→host 50% 공유 — W 생존 시. */
        if (!r.isDestroyed && hasAebeolaekingRider(finalTarget) && (finalTarget.currentHp ?? 0) > 0) {
          const sb = applyAebeolaekingDamageToRiderAndShareToHostWithProtection(
            finalTarget,
            LIBUTY_BASIC_AOE_DAMAGE,
            {
              hostOwner: defenderPlayer,
              hostSlot: r.slot,
              playerAField: newPlayerA.field,
              playerBField: newPlayerB.field,
            }
          );
          finalTarget = sb.updatedHost;
          riderShownVfx += sb.riderDamageApplied + sb.absorbedByBarrier;
          hostShareVfx += sb.hostShareDamage;
          blockedInvuln = sb.blocked === "invuln";
          if (sb.deadRider) deadRiderRow = sb.deadRider;
          if ((finalTarget.currentHp ?? 0) <= 0) hostKilledByAebShare = true;
        }

        /**
         * 시작의 나무 패시브 — host가 시작의 나무이고 W→host 공유로 추가 hp 손실이 발생했으면
         * 모든 아군에 50%(50단위 내림) 회복. 데미지 종류와 무관하게 hp 감소가 트리거.
         * (r.hpLossPrimary 부분은 일반 1차 commit과 동일하게 별도 startingTreeAllyHeal에서 이미 처리됨.)
         */
        if (hostShareVfx > 0) {
          const hostFacingOpp =
            (defenderPlayer === "A" ? newPlayerB.field : newPlayerA.field)[r.slot] ?? null;
          const stHealFromShare = getStartingTreeAllyHealOnDamaged(r.card, hostShareVfx, hostFacingOpp);
          if (stHealFromShare > 0) {
            const beforeStHeal = {
              is: defSide.field.is,
              m: defSide.field.m,
              os: defSide.field.os,
            };
            applyStartingTreeDamagedHealSpread(
              defenderPlayer,
              r.slot,
              newPlayerA.field,
              newPlayerB.field,
              stHealFromShare
            );
            (["is", "m", "os"] as const).forEach(otherS => {
              if (otherS === r.slot) return;
              const before = beforeStHeal[otherS];
              const after = defSide.field[otherS];
              if (!before || !after) return;
              const healed = Math.max(0, (after.currentHp ?? 0) - (before.currentHp ?? 0));
              if (healed > 0) {
                aebStartingTreeAllyHealVfx[`${defenderPlayer}-${r.slot}->${otherS}`] = healed;
              }
            });
            const enemyFieldSt =
              defenderPlayer === "A" ? newPlayerB.field : newPlayerA.field;
            const riderStHeal = applyHealToOwnAebeolaekingRidersOnEnemyField(
              enemyFieldSt,
              defenderPlayer,
              stHealFromShare,
              "allyUnit"
            );
            riderStHeal.perSlot.forEach(({ slot: riderHostSlot, healed }) => {
              if (healed > 0) {
                aebStartingTreeAllyHealVfx[`${defenderPlayer}-${r.slot}->w-${riderHostSlot}`] =
                  healed;
              }
            });
          }
        }

        const hostDeadFinal = r.isDestroyed || hostKilledByAebShare;
        defSide.field[r.slot] = hostDeadFinal ? null : finalTarget;
        if (hostKilledByAebShare) {
          cleanupSkillLinksOnDeath(finalTarget, newPlayerA, newPlayerB, prev.globalTurnCount);
        }

        aebVfxByRow[r.slot] = { riderShown: riderShownVfx, hostShareShown: hostShareVfx, blockedInvuln };
        aebDeadHostFinalByRow[r.slot] = hostKilledByAebShare ? finalTarget : null;
        aebDeadRiderByRow[r.slot] = hostDeadFinal ? null : deadRiderRow;
      }

      for (const r of rows) {
        if (!r.isDestroyed) continue;
        if (r.morningMoodDeathHeal > 0) {
          applyMorningMoodDeathHealSpread(
            defenderPlayer,
            newPlayerA.field,
            newPlayerB.field,
            r.morningMoodDeathHeal
          );
        }
        cleanupSkillLinksOnDeath(r.card, newPlayerA, newPlayerB, prev.globalTurnCount);
      }

      for (const r of rows) {
        if (r.startingTreeAllyHeal <= 0) continue;
        applyStartingTreeDamagedHealSpread(
          defenderPlayer,
          r.slot,
          newPlayerA.field,
          newPlayerB.field,
          r.startingTreeAllyHeal
        );
      }

      const activePlayerPrimary = attackerPlayer === "A" ? newPlayerA : newPlayerB;
      if (fieldHealDiagoTotal > 0 || fieldBuffKeyDiago) {
        (["is", "m", "os"] as const).forEach(s => {
          const unit = activePlayerPrimary.field[s];
          if (!unit) return;
          const updatedUnit = { ...unit };
          if (fieldHealDiagoTotal > 0) {
            Object.assign(
              updatedUnit,
              applyFieldAllyHealToUnit(
                updatedUnit,
                fieldHealDiagoTotal,
                attackerCardSnap,
                attackerSlotName,
                s
              )
            );
          }
          if (fieldBuffKeyDiago && !suppressionBlocksExternalBuffEffects(updatedUnit)) {
            (updatedUnit as FieldCard & Record<string, unknown>)[fieldBuffKeyDiago] = true;
          }
          activePlayerPrimary.field[s] = updatedUnit;
        });
        if (fieldHealDiagoTotal > 0) {
          const enemyFieldDiago =
            attackerPlayer === "A" ? newPlayerB.field : newPlayerA.field;
          applyFieldAllyHealToOwnAebeolaekingRidersOnEnemyField(
            enemyFieldDiago,
            attackerPlayer,
            fieldHealDiagoTotal,
            attackerCardSnap,
            attackerSlotName
          );
        }
      }

      let rc = prev.rewindCards;
      let nextUnitCombatStats = prev.unitCombatStats;
      let nextUnitStatsOrder = prev.unitStatsOrder;
      for (const r of rows) {
        if (r.isDestroyed) {
          /* host 사망 시 부착된 W도 함께 리와인드(별개 카드). */
          rc = appendDeadHostWithRiderToRewindCards(rc, r.card);
        } else if (aebDeadHostFinalByRow[r.slot]) {
          /* 공유 누적으로 host가 추가 사망 — host(+W)를 finalTarget 기준으로 동반 rewind + stats 정리. */
          const deadFinal = aebDeadHostFinalByRow[r.slot]!;
          rc = appendDeadHostWithRiderToRewindCards(rc, deadFinal);
          const sid = deadFinal.statsInstanceId;
          if (sid) {
            const { [sid]: _r, ...rest } = nextUnitCombatStats;
            nextUnitCombatStats = rest;
            nextUnitStatsOrder = nextUnitStatsOrder.filter(x => x !== sid);
          }
        } else if (aebDeadRiderByRow[r.slot]) {
          /* host 생존 + W만 사망 — W를 별개 카드로 rewind. */
          rc = [...rc, stripAebeolaekingRiderMeta(aebDeadRiderByRow[r.slot]!)];
        }
      }

      return {
        ...prev,
        unitCombatStats: patchManyUnitCombatStats(nextUnitCombatStats, combatPatchList),
        unitStatsOrder: nextUnitStatsOrder,
        rewindCards: rc,
        playerA: newPlayerA,
        playerB: newPlayerB,
      };
    });

    /* 애벌레킹(W) VFX — 각 row의 W slot에 데미지 숫자 + 갈색 펄스, host에 W→host 공유 데미지. */
    for (const r of rows) {
      const ax = aebVfxByRow[r.slot];
      if (!ax) continue;
      if (ax.blockedInvuln && ax.riderShown <= 0 && ax.hostShareShown <= 0) continue;
      const aebRiderKey = aebeolaekingRiderSlotKey(defenderPlayer, r.slot);
      const aebHostKey = `${defenderPlayer}-${r.slot}`;
      if (ax.riderShown > 0) {
        showDamageNumber(aebRiderKey, ax.riderShown);
        window.setTimeout(() => triggerCardFlash(aebRiderKey, "aebeolaekingParasiteTick"), 0);
      }
      if (ax.hostShareShown > 0) {
        showDamageNumber(aebHostKey, ax.hostShareShown);
      }
    }
    /**
     * 시작의 나무 패시브 — W→host 공유로 host가 추가 hp 손실 시, 아군 회복 플로팅 텍스트 + 회복 플래시.
     * dedup 키(`${defenderPlayer}-${hostSlot}->${otherS}`)를 ally 슬롯 단위로 합산해 표시.
     */
    {
      const aggregated: Record<string, number> = {};
      for (const [dedupKey, healAmount] of Object.entries(aebStartingTreeAllyHealVfx)) {
        if (healAmount <= 0) continue;
        const arrow = dedupKey.indexOf("->");
        if (arrow < 0) continue;
        const targetPart = dedupKey.substring(arrow + 2);
        const sideMatch = dedupKey.substring(0, dedupKey.indexOf("-"));
        const allyKey = `${sideMatch}-${targetPart}`;
        aggregated[allyKey] = (aggregated[allyKey] ?? 0) + healAmount;
      }
      for (const [allyKey, healAmount] of Object.entries(aggregated)) {
        if (healAmount > 0) {
          showHealNumber(allyKey, healAmount);
        }
      }
    }

    const atkKey = `${attackerPlayer}-${attackerSlotName}`;
    for (const r of rows) {
      const tgt = `${defenderPlayer}-${r.slot}`;
      if (r.pakkiDebuffPrimary) {
        triggerCardFlash(atkKey, "pakkiDeathCurse");
      }
      const dkFacingPrimary = facingOppUnitAtSlot(state, attackerPlayer, attackerSlotName);
      const dkFullSoulStrike =
        attackerCardSnap.name === DARK_KNIGHT_ID &&
        darkKnightSoulGaugeFullForCombat(attackerCardSnap, dkFacingPrimary) &&
        r.actualPrimaryDamage > 0;
      const maxellFullStrikeVfx =
        attackerCardSnap.name === MAXELLAND_ID &&
        maxellandTenacityGaugeFullForCombat(
          attackerCardSnap,
          facingOppUnitAtSlot(state, attackerPlayer, attackerSlotName)
        ) &&
        r.actualPrimaryDamage > 0;
      const pakkiDestroyedPrimary = r.isDestroyed && String(r.card?.name ?? "").trim() === PAKKI_ID;
      if (pakkiDestroyedPrimary) {
        const dkKillExtrasPrimary =
          attackerCardSnap.name === DARK_KNIGHT_ID && dkFullSoulStrike
            ? ({ dkFullGaugeNavyDamageText: true } as const)
            : undefined;
        showPakkiSlainDamageOnTarget(
          tgt,
          r.actualPrimaryDamage,
          mergeKalliPureDamageFloat(r.kalliPurePrimary, dkKillExtrasPrimary)
        );
        if (
          attackerCardSnap.name === GHOSTONE_ID &&
          shouldShowGhostoneKillVisualFeedback(
            attackerCardSnap,
            facingOppUnitAtSlot(state, attackerPlayer, attackerSlotName),
            true
          )
        ) {
          triggerGhostoneKillFlashOnAttacker(atkKey);
        } else if (
          attackerCardSnap.name === DARK_KNIGHT_ID &&
          shouldPlayDarkKnightKillVfx(attackerCardSnap, dkFacingPrimary)
        ) {
          triggerCardFlash(atkKey, "darkKnightKill");
        } else if (
          attackerCardSnap.name === MAXELLAND_ID &&
          shouldPlayMaxellandKillVfx(
            attackerCardSnap,
            facingOppUnitAtSlot(state, attackerPlayer, attackerSlotName)
          )
        ) {
          triggerCardFlash(atkKey, "maxellandKill");
        }
      } else if (
        r.isDestroyed &&
        attackerCardSnap.name === GHOSTONE_ID &&
        shouldShowGhostoneKillVisualFeedback(
          attackerCardSnap,
          facingOppUnitAtSlot(state, attackerPlayer, attackerSlotName),
          true
        )
      ) {
        showGhostoneKillDamageOnTarget(tgt, r.actualPrimaryDamage, mergeKalliPureDamageFloat(r.kalliPurePrimary));
        triggerGhostoneKillFlashOnAttacker(atkKey);
      } else if (r.isDestroyed && attackerCardSnap.name === GHOSTONE_ID) {
        showDamageNumber(tgt, r.actualPrimaryDamage, mergeKalliPureDamageFloat(r.kalliPurePrimary));
      } else if (
        r.isDestroyed &&
        attackerCardSnap.name === DARK_KNIGHT_ID &&
        shouldPlayDarkKnightKillVfx(attackerCardSnap, dkFacingPrimary)
      ) {
        showDarkKnightKillDamageOnTarget(
          tgt,
          r.actualPrimaryDamage,
          atkKey,
          mergeKalliPureDamageFloat(
            r.kalliPurePrimary,
            dkFullSoulStrike ? { dkFullGaugeNavyDamageText: true } : undefined
          )
        );
      } else if (r.isDestroyed && attackerCardSnap.name === DARK_KNIGHT_ID) {
        showDamageNumber(tgt, r.actualPrimaryDamage, mergeKalliPureDamageFloat(r.kalliPurePrimary));
      } else if (r.isDestroyed && attackerCardSnap.name === MAXELLAND_ID) {
        const maxellFacing = facingOppUnitAtSlot(state, attackerPlayer, attackerSlotName);
        if (shouldPlayMaxellandKillVfx(attackerCardSnap, maxellFacing)) {
          showMaxellandKillDamageOnTarget(
            tgt,
            r.actualPrimaryDamage,
            atkKey,
            mergeKalliPureDamageFloat(r.kalliPurePrimary),
            attackerCardSnap,
            maxellFacing
          );
        } else {
          showDamageNumber(tgt, r.actualPrimaryDamage, mergeKalliPureDamageFloat(r.kalliPurePrimary));
        }
      } else if (
        attackerCardSnap.name === PHILIP_ID &&
        r.actualPrimaryDamage > 0
      ) {
        showPhilipBasicHitDamage(tgt, r.actualPrimaryDamage, mergeKalliPureDamageFloat(r.kalliPurePrimary));
      } else if (
        attackerCardSnap.name === CHEOLGIBYEONG_ID &&
        r.actualPrimaryDamage > 0
      ) {
        showCheolgibyeongBasicHitDamage(tgt, r.actualPrimaryDamage, mergeKalliPureDamageFloat(r.kalliPurePrimary));
      } else if (dkFullSoulStrike) {
        showDarkKnightFullSoulStrikeOnTarget(tgt, r.actualPrimaryDamage, mergeKalliPureDamageFloat(r.kalliPurePrimary));
      } else if (maxellFullStrikeVfx) {
        showMaxellandFullGaugeStrikeDamageOnTarget(
          tgt,
          r.actualPrimaryDamage,
          mergeKalliPureDamageFloat(r.kalliPurePrimary)
        );
      } else {
        showDamageNumber(tgt, r.actualPrimaryDamage, mergeKalliPureDamageFloat(r.kalliPurePrimary));
      }
      if (r.baekseuLastStandPrimary) {
        window.setTimeout(() => triggerCardFlash(tgt, "kalliBuffBan"), 0);
      }
      triggerGeunyangMojaHitFlame(attackerCardSnap, tgt, r.actualPrimaryDamage);
      triggerDiagoHitFlame(attackerCardSnap, tgt, r.actualPrimaryDamage);
      triggerMomoHitFlame(attackerCardSnap, tgt, r.actualPrimaryDamage);
      triggerGhostoneClawHit(attackerCardSnap, tgt, r.actualPrimaryDamage, "primary");
      triggerIversonClawHit(attackerCardSnap, tgt, r.actualPrimaryDamage, "primary");
      triggerEristinaHitLine(attackerCardSnap, tgt, r.actualPrimaryDamage, "primary");
    }

    for (const r of rows) {
      if (r.morningMoodDeathHeal > 0 && r.isDestroyed) {
        const deadSideSnap = defenderPlayer === "A" ? state.playerA.field : state.playerB.field;
        const oppSnap = defenderPlayer === "A" ? state.playerB.field : state.playerA.field;
        (["is", "m", "os"] as const).forEach(s => {
          if (s === r.slot) return;
          const unit = deadSideSnap[s];
          if (!unit) return;
          const healed = Math.min(Number(unit.hp) - unit.currentHp, r.morningMoodDeathHeal);
          if (healed > 0) showHealNumber(`${defenderPlayer}-${s}`, healed);
        });
        (["is", "m", "os"] as const).forEach(s => {
          const host = oppSnap[s];
          const rider = host?.parasiteRider;
          if (!rider || getAebeolaekingRiderTrueOwner(rider) !== defenderPlayer) return;
          const healed = Math.min(Number(rider.hp) - (rider.currentHp ?? 0), r.morningMoodDeathHeal);
          if (healed > 0) showHealNumber(aebeolaekingRiderSlotKey(defenderPlayer, s), healed);
        });
      }
      if (r.startingTreeAllyHeal > 0) {
        const sideSnap = defenderPlayer === "A" ? state.playerA.field : state.playerB.field;
        const oppSnap = defenderPlayer === "A" ? state.playerB.field : state.playerA.field;
        (["is", "m", "os"] as const).forEach(s => {
          if (s === r.slot) return;
          const unit = sideSnap[s];
          if (!unit) return;
          const healed = Math.min(Number(unit.hp) - unit.currentHp, r.startingTreeAllyHeal);
          if (healed > 0) showHealNumber(`${defenderPlayer}-${s}`, healed);
        });
        (["is", "m", "os"] as const).forEach(s => {
          const host = oppSnap[s];
          const rider = host?.parasiteRider;
          if (!rider || getAebeolaekingRiderTrueOwner(rider) !== defenderPlayer) return;
          const healed = Math.min(Number(rider.hp) - (rider.currentHp ?? 0), r.startingTreeAllyHeal);
          if (healed > 0) showHealNumber(aebeolaekingRiderSlotKey(defenderPlayer, s), healed);
        });
      }
      const ah = getHealFromSkillUpdates(attackerCardSnap, r.skillUpdates);
      if (ah > 0) {
        if (
          shouldShowGhostoneKillFullHealFeedback(
            attackerCardSnap,
            facingOppUnitAtSlot(state, attackerPlayer, attackerSlotName),
            ah,
            r.isDestroyed
          )
        ) {
          showHealNumberAfterGhostoneKillFlash(atkKey, ah);
        } else if (
          r.isDestroyed &&
          attackerCardSnap.name === DARK_KNIGHT_ID &&
          shouldPlayDarkKnightKillVfx(
            attackerCardSnap,
            facingOppUnitAtSlot(state, attackerPlayer, attackerSlotName)
          )
        ) {
          showHealNumberAfterDarkKnightKillFlash(atkKey, ah);
        } else {
          showHealNumber(atkKey, ah);
        }
      }
    }

    if (fieldHealDiagoTotal > 0) {
      const allySnapPrimary = attackerPlayer === "A" ? state.playerA.field : state.playerB.field;
      const enemySnapDiago =
        attackerPlayer === "A" ? state.playerB.field : state.playerA.field;
      (["is", "m", "os"] as const).forEach(s => {
        const u = allySnapPrimary[s];
        if (!u) return;
        const healed = computeFieldAllyHealApplied(
          u,
          fieldHealDiagoTotal,
          attackerCardSnap,
          attackerSlotName,
          s
        );
        if (healed > 0) showHealNumber(`${attackerPlayer}-${s}`, healed);
      });
      const enemyPlayerDiago = attackerPlayer === "A" ? "B" : "A";
      (["is", "m", "os"] as const).forEach(s => {
        const host = enemySnapDiago[s];
        const rider = host?.parasiteRider;
        if (!rider || getAebeolaekingRiderTrueOwner(rider) !== attackerPlayer) return;
        const healed = computeFieldAllyHealApplied(
          rider,
          fieldHealDiagoTotal,
          attackerCardSnap,
          attackerSlotName,
          s
        );
        if (healed > 0) showHealNumber(aebeolaekingRiderSlotKey(enemyPlayerDiago, s), healed);
      });
    }
  };

  const clearGonchungHiddenReveal = () => {
    if (gonchungHiddenRevealTimerRef.current != null) {
      window.clearTimeout(gonchungHiddenRevealTimerRef.current);
      gonchungHiddenRevealTimerRef.current = null;
    }
    setGonchungHiddenReveal(null);
  };

  const isGonchungHiddenPeekShowingFront = (
    spellPlayer: "A" | "B",
    spell: FieldCard | null | undefined
  ): boolean => {
    if (spellUsageTeslaFlipPlayer === spellPlayer) return true;
    if (!spell) return false;
    if (!isHiddenSpellCard(spell)) return true;
    return (
      gonchungHiddenReveal?.player === spellPlayer &&
      !!spell.statsInstanceId &&
      spell.statsInstanceId === gonchungHiddenReveal.spellStatsInstanceId
    );
  };

  const getGonchungHiddenPeekSpellSlotPulseClass = (player: "A" | "B"): string => {
    if (!pendingSkill || pendingSkill.name !== PENDING_SKILL.GONCHUNG_HIDDEN_PEEK || !state) {
      return "";
    }
    const opp = pendingSkill.player === "A" ? "B" : "A";
    if (player !== opp) return "";
    const oppField = opp === "A" ? state.playerA.field : state.playerB.field;
    if (!spellStackHasHiddenSpell(oppField)) return "";
    return "border-[3px] border-white/95 bg-white/12 shadow-[0_0_28px_rgba(255,255,255,0.88)] animate-pulse cursor-pointer z-[20]";
  };

  const handleSpellStackShuffleClick = (e: React.MouseEvent, player: "A" | "B") => {
    e.preventDefault();
    e.stopPropagation();
    if (winner) return;
    setState(prev => {
      if (!prev) return prev;
      const key = player === "A" ? "playerA" : "playerB";
      const side = prev[key];
      const stack = normalizeSpellStack(side.field);
      if (stack.length <= 1) return prev;
      const nextStack = rotateSpellStackTopToBottom(stack);
      return {
        ...prev,
        [key]: {
          ...side,
          field: { ...side.field, spellStack: nextStack },
        },
      };
    });
  };

  const handleFieldClick = (e: React.MouseEvent, player: "A" | "B", slot: "is" | "m" | "os" | "spell", card: FieldCard | null) => {
    if (spellUsageReveal || spellUsageFly || danhaStealFly || spellUsageMotionActiveRef.current) return;
    e.stopPropagation(); 
    if (winner) return;
    if (!state) return;
    if (pendingElWingSinseokDefense) return;

    if (state.guihwanPending && slot !== "spell") {
      const gp = state.guihwanPending;
      if (
        player === gp.ownerPlayer &&
        slot === gp.slot &&
        card &&
        isGuihwanSpellCard(card) &&
        card.statsInstanceId === gp.spellStatsInstanceId
      ) {
        setIsGuihwanRewindOpen(true);
        return;
      }
      return;
    }

    if (pendingLegendarySwordStrike) {
      if (slot === "spell" || player === pendingLegendarySwordStrike.ownerPlayer) {
        alert("전설의 검 연격 대상을 선택하세요.");
        return;
      }
    }

    if (slot === "spell" && gonchungHiddenReveal?.player === player) {
      const oppFieldSnap = player === "A" ? state.playerA.field : state.playerB.field;
      const topHidden = normalizeSpellStack(oppFieldSnap).at(-1);
      if (
        topHidden?.statsInstanceId &&
        topHidden.statsInstanceId === gonchungHiddenReveal.spellStatsInstanceId
      ) {
        clearGonchungHiddenReveal();
        return;
      }
    }

    // 사망 시 스킬 연결(링크)을 해제하고 에리스티나의 쿨타임을 시작시키는 헬퍼 함수
    const cleanupSkillLinksOnDeath = (deadCard: FieldCard, newPA: PlayerState, newPB: PlayerState, currentGlobalTurn: number) => {
      cleanupSimulationUnitDeath(deadCard, newPA, newPB, currentGlobalTurn);
    };

    // 에리스티나 '마법의 반짓고리' 스킬 적용 로직
    if (pendingSkill && pendingSkill.name === PENDING_SKILL.ERISTINA_BANJITGORI) {
      if (player !== pendingSkill.player) {
        alert("아군 유닛만 대상으로 지정할 수 있습니다.");
        return;
      }
      if (slot === pendingSkill.slot) {
        alert("자기 자신에게는 버프를 부여할 수 없습니다.");
        return;
      }
      if (slot === "spell") {
        alert("스펠 카드는 지정할 수 없습니다.");
        return;
      }
      if (!card) return;

      setState(prev => {
        if (!prev) return prev;
        const newPlayerA = { ...prev.playerA, field: { ...prev.playerA.field } };
        const newPlayerB = { ...prev.playerB, field: { ...prev.playerB.field } };
        const activePlayer = player === "A" ? newPlayerA : newPlayerB;

        const eristina = activePlayer.field[pendingSkill.slot as "is"|"m"|"os"];
        const target = activePlayer.field[slot as "is"|"m"|"os"];

        if (
          eristina &&
          target &&
          eristina.name === UNIT.ERISTINA &&
          !suppressionBlocksExternalBuffEffects(target)
        ) {
          activePlayer.field[pendingSkill.slot as "is"|"m"|"os"] = {
            ...eristina,
            isSkillActive: true,
            linkedTarget: `${player}-${slot}`
          };
          activePlayer.field[slot as "is"|"m"|"os"] = {
            ...target,
            hasBanjitgori: true,
            linkedSource: `${pendingSkill.player}-${pendingSkill.slot}`
          };
        }

        return { ...prev, playerA: newPlayerA, playerB: newPlayerB };
      });

      const allySlotKey = `${player}-${slot}` as const;
      const eristinaSlotKey = `${pendingSkill.player}-${pendingSkill.slot}` as const;
      /* 능력 발동 이펙트 — 에리스티나 반짓고리(대상·에리스티나 양쪽) */
      triggerCardFlash(allySlotKey, "eristinaBanjitgori");
      triggerCardFlash(eristinaSlotKey, "eristinaBanjitgori");
      pushBanjitgoriBuffFloat(allySlotKey);

      setPendingSkill(null);
      notifyMultiplaySync();
      return;
    }

    // 라임「방울 보호막」— 에리스티나 반짓고리와 동일한 링크·쿨 규칙, 대상에는 [방어력 +200]만 부여
    if (pendingSkill && pendingSkill.name === PENDING_SKILL.LIME_BUBBLE_SHIELD) {
      if (player !== pendingSkill.player) {
        alert("아군 유닛만 대상으로 지정할 수 있습니다.");
        return;
      }
      if (slot === pendingSkill.slot) {
        alert("자기 자신에게는 버프를 부여할 수 없습니다.");
        return;
      }
      if (slot === "spell") {
        alert("스펠 카드는 지정할 수 없습니다.");
        return;
      }
      if (!card) return;

      setState(prev => {
        if (!prev) return prev;
        const newPlayerA = { ...prev.playerA, field: { ...prev.playerA.field } };
        const newPlayerB = { ...prev.playerB, field: { ...prev.playerB.field } };
        const activePlayer = player === "A" ? newPlayerA : newPlayerB;

        const limeCaster = activePlayer.field[pendingSkill.slot as "is" | "m" | "os"];
        const target = activePlayer.field[slot as "is" | "m" | "os"];

        if (limeCaster && target && limeCaster.name === UNIT.LIME) {
          activePlayer.field[pendingSkill.slot as "is" | "m" | "os"] = {
            ...limeCaster,
            isSkillActive: true,
            linkedTarget: `${player}-${slot}`,
          };
          if (!suppressionBlocksExternalBuffEffects(target)) {
            activePlayer.field[slot as "is" | "m" | "os"] = {
              ...target,
              hasLimeBubbleShieldBuff: true,
              linkedSource: `${pendingSkill.player}-${pendingSkill.slot}`,
            };
          }
        }

        return { ...prev, playerA: newPlayerA, playerB: newPlayerB };
      });

      const allySlotKey = `${player}-${slot}` as const;
      const limeSlotKey = `${pendingSkill.player}-${pendingSkill.slot}` as const;
      triggerCardFlash(allySlotKey, "limeBubbleShield");
      triggerCardFlash(limeSlotKey, "limeBubbleShield");
      pushLimeBubbleBuffFloat(allySlotKey);

      setPendingSkill(null);
      notifyMultiplaySync();
      return;
    }

    if (pendingSkill && pendingSkill.name === PENDING_SKILL.GONCHUNG_HIDDEN_PEEK) {
      const ps = pendingSkill;
      const caster = ps.player;
      const expertSlot = ps.slot as "is" | "m" | "os";

      if (player === caster) {
        alert("상대방의 스펠 칸을 선택하세요.");
        return;
      }
      if (slot !== "spell") {
        alert("상대 스펠 칸을 선택하세요.");
        return;
      }

      const allyFieldSnap = caster === "A" ? state.playerA.field : state.playerB.field;
      const expert = allyFieldSnap[expertSlot];
      if (!expert || expert.name !== UNIT.GONCHUNG_JEONMOGA) {
        setPendingSkill(null);
        alert(BATTLE_MSG.gonchungJeonmoga.skillCancelled);
        return;
      }
      if (expert.gonchungHiddenPeekConsumed) {
        setPendingSkill(null);
        return;
      }
      if (
        isConfused(
          expert,
          getUnitFacingOppAtSlot(caster, expertSlot, state.playerA.field, state.playerB.field)
        )
      ) {
        setPendingSkill(null);
        return;
      }

      const oppFieldSnap = player === "A" ? state.playerA.field : state.playerB.field;
      if (!spellStackHasHiddenSpell(oppFieldSnap)) {
        pushInfoFloat(`${player}-spell`, BATTLE_MSG.gonchungJeonmoga.noHiddenSpell, INFO_FLOAT_MS);
        setPendingSkill(null);
        return;
      }

      const topHidden = normalizeSpellStack(oppFieldSnap).at(-1);
      if (!topHidden || !isHiddenSpellCard(topHidden)) {
        pushInfoFloat(`${player}-spell`, BATTLE_MSG.gonchungJeonmoga.topNotHidden, INFO_FLOAT_MS);
        return;
      }

      const spellStatsInstanceId = topHidden.statsInstanceId;
      if (!spellStatsInstanceId) {
        setPendingSkill(null);
        return;
      }

      const oppSpellKey = `${player}-spell`;
      triggerCardFlash(oppSpellKey, "gonchungHiddenPeek");

      setGonchungHiddenReveal({ player, spellStatsInstanceId });
      if (gonchungHiddenRevealTimerRef.current != null) {
        window.clearTimeout(gonchungHiddenRevealTimerRef.current);
      }
      gonchungHiddenRevealTimerRef.current = window.setTimeout(() => {
        gonchungHiddenRevealTimerRef.current = null;
        setGonchungHiddenReveal(null);
      }, GONCHUNG_JEONMOGA_ACTIVE.hiddenRevealMs);

      setState(prev => {
        if (!prev) return prev;
        const newPlayerA = { ...prev.playerA, field: { ...prev.playerA.field } };
        const newPlayerB = { ...prev.playerB, field: { ...prev.playerB.field } };
        const allyF = caster === "A" ? newPlayerA.field : newPlayerB.field;
        const eu = allyF[expertSlot];
        if (!eu || eu.name !== UNIT.GONCHUNG_JEONMOGA || eu.gonchungHiddenPeekConsumed) {
          return prev;
        }
        if (caster === "A") {
          newPlayerA.field = {
            ...newPlayerA.field,
            [expertSlot]: { ...eu, gonchungHiddenPeekConsumed: true },
          };
        } else {
          newPlayerB.field = {
            ...newPlayerB.field,
            [expertSlot]: { ...eu, gonchungHiddenPeekConsumed: true },
          };
        }
        return { ...prev, playerA: newPlayerA, playerB: newPlayerB };
      });

      setPendingSkill(null);
      notifyMultiplaySync();
      return;
    }

    if (pendingSkill && pendingSkill.name === PENDING_SKILL.SUPER_GREEN_KING_SPELL_BREAKER) {
      const ps = pendingSkill;
      const caster = ps.player;
      const kingSlot = ps.slot as "is" | "m" | "os";

      if (player === caster) {
        alert("상대방의 스펠 칸을 선택하세요.");
        return;
      }
      if (slot !== "spell") {
        alert("상대 스펠 칸을 선택하세요.");
        return;
      }

      const allyFieldSnap = caster === "A" ? state.playerA.field : state.playerB.field;
      const king = allyFieldSnap[kingSlot];
      if (!king || king.name !== UNIT.SUPER_GREEN_KING) {
        setPendingSkill(null);
        alert("슈퍼 그린킹이 필드에 없어 [주문 파괴자]가 취소되었습니다.");
        return;
      }
      if (king.superGreenKingSpellBreakerConsumed) {
        setPendingSkill(null);
        return;
      }
      if (
        isConfused(
          king,
          getUnitFacingOppAtSlot(caster, kingSlot, state.playerA.field, state.playerB.field)
        )
      ) {
        setPendingSkill(null);
        return;
      }

      const oppFieldSnap = player === "A" ? state.playerA.field : state.playerB.field;
      if (normalizeSpellStack(oppFieldSnap).length === 0) {
        alert("상대 스펠 칸에 제거할 마법이 없습니다.");
        return;
      }

      const oppSpellKey = `${player}-spell`;
      const casterFieldKey = `${caster}-${kingSlot}`;
      triggerCardFlash(casterFieldKey, "superGreenKingSpellBreaker");
      triggerCardFlash(oppSpellKey, "superGreenKingSpellBreaker");

      setState(prev => {
        if (!prev) return prev;
        const newPlayerA = { ...prev.playerA, field: { ...prev.playerA.field } };
        const newPlayerB = { ...prev.playerB, field: { ...prev.playerB.field } };

        const allyF = caster === "A" ? newPlayerA.field : newPlayerB.field;
        const ku = allyF[kingSlot];
        if (!ku || ku.name !== UNIT.SUPER_GREEN_KING || ku.superGreenKingSpellBreakerConsumed) {
          return prev;
        }

        const targetF = player === "A" ? newPlayerA.field : newPlayerB.field;
        const st = normalizeSpellStack(targetF);
        if (st.length === 0) return prev;
        const removedSpell = st[st.length - 1]!;
        const newStack = st.slice(0, -1);

        if (player === "A") {
          newPlayerA.field = { ...newPlayerA.field, spellStack: newStack };
        } else {
          newPlayerB.field = { ...newPlayerB.field, spellStack: newStack };
        }

        if (caster === "A") {
          const u = newPlayerA.field[kingSlot];
          if (u) {
            newPlayerA.field = {
              ...newPlayerA.field,
              [kingSlot]: { ...u, superGreenKingSpellBreakerConsumed: true },
            };
          }
        } else {
          const u = newPlayerB.field[kingSlot];
          if (u) {
            newPlayerB.field = {
              ...newPlayerB.field,
              [kingSlot]: { ...u, superGreenKingSpellBreakerConsumed: true },
            };
          }
        }

        return {
          ...prev,
          playerA: newPlayerA,
          playerB: newPlayerB,
          rewindCards: [...prev.rewindCards, removedSpell],
        };
      });

      setPendingSkill(null);
      notifyMultiplaySync();
      return;
    }

    if (pendingSkill && pendingSkill.name === PENDING_SKILL.DANHA_GALGORI) {
      alert("상대 패에 있는 카드를 선택하세요.");
      return;
    }

    if (pendingLegendarySwordStrike) {
      const pls = pendingLegendarySwordStrike;
      const targetId = `${player}-${slot}`;
      const enemyPlayer = pls.ownerPlayer === "A" ? "B" : "A";

      if (player !== enemyPlayer || slot === "spell" || !card) {
        alert("전설의 검 연격 대상을 선택하세요.");
        return;
      }
      if (pls.hitTargets.includes(targetId)) {
        alert("이미 이 연격의 대상이 된 유닛입니다. 다른 유닛을 선택해주세요.");
        return;
      }
      if (
        !canEnemyFieldSourceTargetMaengsugyeonPo(
          pls.ownerPlayer,
          pls.swordSlot,
          player,
          slot as "is" | "m" | "os",
          card,
          getUnitFacingOppAtSlot(player, slot as "is" | "m" | "os", state!.playerA.field, state!.playerB.field)
        )
      ) {
        pushInfoFloat(`${player}-${slot}`, "올바른 대상이 아닙니다", INFO_FLOAT_MS);
        return;
      }

      const strikePhase = Number(pls.phase) === 2 ? 2 : 1;
      const baseDamage =
        strikePhase === 1
          ? LEGENDARY_SWORD_FIRST_HIT_DAMAGE
          : legendarySwordSecondHitBaseFromFirstTarget(pls.hitTargets[0]!, slot);

      const resolved = resolveLegendarySwordStrikeOnUnit({
        baseDamage,
        target: card,
        targetPlayer: player,
        targetSlot: slot,
        playerAField: state.playerA.field,
        playerBField: state.playerB.field,
      });

      const targetKey = `${player}-${slot}`;
      const finishStrike = strikePhase >= 2;

      setState(prev => {
        if (!prev) return prev;
        const newPlayerA = { ...prev.playerA, field: { ...prev.playerA.field } };
        const newPlayerB = { ...prev.playerB, field: { ...prev.playerB.field } };
        const baseTarget =
          Object.keys(resolved.baekseuPatch).length > 0
            ? stripBaekseuHarmfulEffectsForInvuln(card)
            : card;
        const updatedTarget: FieldCard = {
          ...baseTarget,
          ...resolved.baekseuPatch,
          ...resolved.barrierPatch,
          currentHp: resolved.isDestroyed ? 0 : resolved.newHp,
        };

        if (player === "A") {
          newPlayerA.field[slot] = resolved.isDestroyed ? null : updatedTarget;
        } else {
          newPlayerB.field[slot] = resolved.isDestroyed ? null : updatedTarget;
        }

        if (resolved.isDestroyed) {
          cleanupSkillLinksOnDeath(card, newPlayerA, newPlayerB, prev.globalTurnCount);
        }

        let rewindCards = prev.rewindCards;
        if (resolved.isDestroyed) {
          rewindCards = [...rewindCards, card];
        }

        applyPostStrikeAllyHealsIncludingW({
          targetPlayer: player,
          targetSlot: slot,
          playerAField: newPlayerA.field,
          playerBField: newPlayerB.field,
          morningMoodDeathHeal: resolved.morningMoodDeathHeal,
          startingTreeAllyHeal: resolved.startingTreeAllyHeal,
        });

        if (finishStrike) {
          const newOwner = pls.ownerPlayer === "A" ? newPlayerA : newPlayerB;
          const sword = newOwner.field[pls.swordSlot];
          if (sword?.name === UNIT.LEGENDARY_SWORD) {
            rewindCards = [...rewindCards, stripLegendarySwordForRewind(sword)];
            newOwner.field[pls.swordSlot] = null;
          }
        }

        return {
          ...prev,
          rewindCards,
          playerA: newPlayerA,
          playerB: newPlayerB,
        };
      });

      showLegendarySwordSkillHit(targetKey, resolved.actualDamage);

      if (strikePhase === 1) {
        applyLegendarySwordStrikePending({
          ...pls,
          phase: 2,
          hitTargets: [...pls.hitTargets, targetId],
        });
      } else {
        flushSync(() => applyLegendarySwordStrikePending(null));
      }
      notifyMultiplaySync();
      return;
    }

    // 1. 연쇄 공격 처리
    if (pendingSecondaryAttack) {
      const targetId = `${player}-${slot}`;

      if (pendingSecondaryAttack.allyHealOnly) {
        if (player !== pendingSecondaryAttack.attackerPlayer || slot === "spell" || !card) {
          alert(BATTLE_MSG.ranigo.cannotAttackEnemy);
          return;
        }
        if (pendingSecondaryAttack.hitTargets.includes(targetId)) {
          alert(BATTLE_MSG.ranigo.chainDuplicateAlly);
          return;
        }
        if (
          player === pendingSecondaryAttack.attackerPlayer &&
          slot === pendingSecondaryAttack.attackerSlotName
        ) {
          alert(BATTLE_MSG.ranigo.cannotTargetSelf);
          return;
        }

        const attackerPlayer = pendingSecondaryAttack.attackerPlayer;
        const attackerSlotName = pendingSecondaryAttack.attackerSlotName;
        const attackerField = attackerPlayer === "A" ? state!.playerA.field : state!.playerB.field;
        const attackerCard = attackerField[attackerSlotName];
        if (isAttackDisabledUnit(attackerCard)) {
          setAttackingSlot(null);
          setAttackOptionOverride(null);
          setPendingSecondaryAttack(null);
          return;
        }
        if (
          isRanigoAllyHealBasicAttackSealed(
            attackerCard,
            facingOppUnitAtSlot(state!, attackerPlayer, attackerSlotName)
          )
        ) {
          setAttackingSlot(null);
          setAttackOptionOverride(null);
          setPendingSecondaryAttack(null);
          return;
        }

        const maxHp = Number(card.hp);
        if (card.currentHp >= maxHp) {
          alert(BATTLE_MSG.ranigo.allyFullyHealed);
          return;
        }

        const healedTarget = healUnitCurrentHp(card, RANIGO_ALLY_BASIC_HEAL_AMOUNT, { supportSource: "allyUnit" });
        const actualHeal = healedTarget.currentHp - card.currentHp;

        let fieldHealAmount = 0;
        let fieldBuffKey = "";
        let skillUpdates: Partial<FieldCard> = {};
        if (attackerCard) {
          skillUpdates = applyPostAttackSkills(
            attackerCard,
            {
              damageDealt: 0,
              targetDestroyed: false,
              applyFieldHeal: amt => {
                fieldHealAmount = amt;
              },
              applyFieldBuff: key => {
                fieldBuffKey = key;
              },
            },
            facingOppUnitAtSlot(state!, attackerPlayer, attackerSlotName)
          );
        }

        const ranigoChainPatches: Array<{
          id: string | undefined;
          delta: Partial<
            Record<
              "damageDealt" | "kills" | "damageTaken" | "selfHeal" | "allyHealGiven" | "damageMitigated",
              number
            >
          >;
        }> = [];
        if (actualHeal > 0 && attackerCard?.statsInstanceId) {
          ranigoChainPatches.push({
            id: attackerCard.statsInstanceId,
            delta: { allyHealGiven: actualHeal },
          });
        }
        if (actualHeal > 0 && card.statsInstanceId) {
          ranigoChainPatches.push({ id: card.statsInstanceId, delta: { selfHeal: actualHeal } });
        }
        if (fieldHealAmount > 0 && attackerCard?.statsInstanceId) {
          const allySnapRanigoC = attackerPlayer === "A" ? state!.playerA.field : state!.playerB.field;
          (["is", "m", "os"] as const).forEach(s => {
            const u = allySnapRanigoC[s];
            if (!u?.statsInstanceId) return;
            const healedFld = computeFieldAllyHealApplied(
          u,
          fieldHealAmount,
          attackerCard,
          attackerSlotName,
          s
        );
            if (healedFld <= 0) return;
            if (u.statsInstanceId === attackerCard.statsInstanceId) {
              ranigoChainPatches.push({ id: u.statsInstanceId, delta: { selfHeal: healedFld } });
            } else {
              ranigoChainPatches.push({ id: attackerCard.statsInstanceId, delta: { allyHealGiven: healedFld } });
              ranigoChainPatches.push({ id: u.statsInstanceId, delta: { selfHeal: healedFld } });
            }
          });
        }

        setState(prev => {
          if (!prev) return prev;
          const newPlayerA = { ...prev.playerA, field: { ...prev.playerA.field } };
          const newPlayerB = { ...prev.playerB, field: { ...prev.playerB.field } };

          const updatedTarget = { ...card, ...healedTarget };
          if (player === "A") newPlayerA.field[slot as "is" | "m" | "os"] = updatedTarget;
          else newPlayerB.field[slot as "is" | "m" | "os"] = updatedTarget;

          if (attackerCard) {
            const updatedAttacker = { ...attackerCard, ...skillUpdates };
            if (attackerPlayer === "A") {
              newPlayerA.field[attackerSlotName] = updatedAttacker;
            } else {
              newPlayerB.field[attackerSlotName] = updatedAttacker;
            }

            const activePlayerSec = attackerPlayer === "A" ? newPlayerA : newPlayerB;
            if (fieldHealAmount > 0 || fieldBuffKey) {
              (["is", "m", "os"] as const).forEach(s => {
                const unit = activePlayerSec.field[s];
                if (!unit) return;
                const updatedUnit = { ...unit };
                if (fieldHealAmount > 0) {
                  Object.assign(
              updatedUnit,
              applyFieldAllyHealToUnit(
                updatedUnit,
                fieldHealAmount,
                attackerCard,
                attackerSlotName,
                s
              )
            );
                }
                if (fieldBuffKey) {
                  (updatedUnit as FieldCard & Record<string, unknown>)[fieldBuffKey] = true;
                }
                activePlayerSec.field[s] = updatedUnit;
              });
            }
          }

          return {
            ...prev,
            unitCombatStats: patchManyUnitCombatStats(prev.unitCombatStats, ranigoChainPatches),
            playerA: newPlayerA,
            playerB: newPlayerB,
          };
        });

        if (actualHeal > 0) {
          showHealNumber(targetId, actualHeal);
        }
        if (fieldHealAmount > 0 && attackerCard) {
          const allySnap = attackerPlayer === "A" ? state!.playerA.field : state!.playerB.field;
          (["is", "m", "os"] as const).forEach(s => {
            const u = allySnap[s];
            if (!u) return;
            const healed = computeFieldAllyHealApplied(
          u,
          fieldHealAmount,
          attackerCard,
          attackerSlotName,
          s
        );
            if (healed > 0) showHealNumber(`${attackerPlayer}-${s}`, healed);
          });
        }

        const newHitsRemaining = pendingSecondaryAttack.hitsRemaining - 1;
        if (newHitsRemaining > 0) {
          setPendingSecondaryAttack(prev => ({
            ...prev!,
            hitsRemaining: newHitsRemaining,
            hitTargets: [...prev!.hitTargets, targetId],
          }));
        } else {
          setPendingSecondaryAttack(null);
        }
        return;
      }

      if (player !== pendingSecondaryAttack.attackerPlayer && slot !== "spell" && card) {
        if (pendingSecondaryAttack.hitTargets.includes(targetId)) {
          alert("이미 이 연쇄 공격의 대상이 된 유닛입니다. 다른 유닛을 선택해주세요.");
          return; 
        }

        const attackerPlayer = pendingSecondaryAttack.attackerPlayer;
        const attackerSlotName = pendingSecondaryAttack.attackerSlotName;
        const attackerField = attackerPlayer === "A" ? state!.playerA.field : state!.playerB.field;
        const attackerCard = attackerField[attackerSlotName];
        if (
          !startingHeraldBasicAttackIgnoresTauntTargetingRestrictions(
            attackerCard,
            facingOppUnitAtSlot(state!, attackerPlayer, attackerSlotName)
          ) &&
          !canEnemyFieldSourceTargetMaengsugyeonPo(
            attackerPlayer,
            attackerSlotName,
            player,
            slot as "is" | "m" | "os",
            card,
            getUnitFacingOppAtSlot(player, slot as "is" | "m" | "os", state!.playerA.field, state!.playerB.field)
          )
        ) {
          pushInfoFloat(`${player}-${slot}`, "올바른 대상이 아닙니다", INFO_FLOAT_MS);
          return;
        }
        if (isAttackDisabledUnit(attackerCard)) {
          setAttackingSlot(null);
          setAttackOptionOverride(null);
          return;
        }

        let damageSec = pendingSecondaryAttack.damage;

        if (attackerCard) {
          damageSec = scalePakkiOutgoingHit(damageSec, attackerCard, attackerField, {
            allyPlayer: attackerPlayer,
            playerAField: state!.playerA.field,
            playerBField: state!.playerB.field,
          });
        }
        const pakkiScaledSecondaryForMit = damageSec;

        const attackerFacingOppSecondary =
          (attackerPlayer === "A" ? state!.playerB.field : state!.playerA.field)[attackerSlotName] ??
          null;
        const kalliVsDefenseSecondary = kalliBasicAttackSkipsTargetMitigationVsDefenseType(
          attackerCard,
          card,
          attackerFacingOppSecondary
        );
        const mitigationBypassSecondary =
          kalliVsDefenseSecondary ||
          isStartingWraithTrueStrikeBasicAttacker(attackerCard, attackerFacingOppSecondary);
        const kalliPureSecondary = getKalliVsDefenseTypePureBonus(
          attackerCard,
          card,
          attackerFacingOppSecondary
        );
        let afterBanjitSecondary = pakkiScaledSecondaryForMit;
        let banjitMitSecondary = 0;
        if (
          !mitigationBypassSecondary &&
          (card as any).hasBanjitgori &&
          !callieBuffBanSuppressesBuffsForVictim(
            player,
            slot as "is" | "m" | "os",
            state!.playerA.field,
            state!.playerB.field
          )
        ) {
          const flooredS = Math.floor((pakkiScaledSecondaryForMit * 0.75) / 50) * 50;
          banjitMitSecondary = Math.max(0, pakkiScaledSecondaryForMit - flooredS);
          afterBanjitSecondary = flooredS;
        }

        const runElWingDeferrableSecondaryHit = () => {
          if (
            !elWingSinseokBypassRef.current &&
            shouldOfferElWingSinseokOnBasicAttackHit(
              card,
              player,
              slot as "is" | "m" | "os",
              attackerPlayer,
              attackerPlayer,
              state!.playerA.field,
              state!.playerB.field
            )
          ) {
            if (elWingSinseokTimerRef.current != null) {
              window.clearTimeout(elWingSinseokTimerRef.current);
            }
            const deadlineAt = Date.now() + EL_WING_SINSEOK_PROMPT_MS;
            setPendingElWingSinseokDefense({
              defenderPlayer: player,
              defenderSlot: slot as "is" | "m" | "os",
              attackerPlayer,
              attackerSlot: attackerSlotName,
              hitKind: "secondary",
              popupPosition: { x: e.clientX, y: e.clientY },
              deadlineAt,
              wraithChainFollowUp: false,
            });
            elWingSinseokTimeoutMetaRef.current = {
              hitKind: "secondary",
              wraithChainFollowUp: false,
            };
            elWingSinseokResumeRef.current = runElWingDeferrableSecondaryHit;
              setElWingSinseokSecondsLeft(Math.ceil(EL_WING_SINSEOK_PROMPT_MS / 1000));
              setElWingSinseokTimeRatio(1);
            elWingSinseokTimerRef.current = window.setTimeout(
              () => finishElWingSinseokTimeout(),
              EL_WING_SINSEOK_PROMPT_MS
            );
            return;
          }

        const victimFieldSecondary = player === "A" ? state!.playerA.field : state!.playerB.field;

        const secondaryDefenseResult = mitigationBypassSecondary
          ? { finalDamage: afterBanjitSecondary }
          : applyIncomingDefenseDamage(
              afterBanjitSecondary,
              card,
              state!.playerA.field,
              state!.playerB.field,
              `${player}-${slot}`
            );
        const defenseMitSecondary =
          !mitigationBypassSecondary && !isInvulnerableFromBaekseuOrCheolbyeok(card, victimFieldSecondary)
            ? Math.max(0, afterBanjitSecondary - secondaryDefenseResult.finalDamage)
            : 0;
        const coreAfterDefenseSecondary =
          mitigationBypassSecondary || isInvulnerableFromBaekseuOrCheolbyeok(card, victimFieldSecondary)
            ? afterBanjitSecondary
            : secondaryDefenseResult.finalDamage;
        const preInvulnTotalSecondary = coreAfterDefenseSecondary + kalliPureSecondary;
        let actualDamage = isInvulnerableFromBaekseuOrCheolbyeok(card, victimFieldSecondary)
          ? 0
          : preInvulnTotalSecondary;
        const cardForCombatSecondary = normalizeUnitHpSurvivalOnesForCombat(card);
        const barrierSplitSecondary = splitDamageThroughHpBarrier(
          cardForCombatSecondary,
          actualDamage,
          isStartingWraithTrueStrikeBasicAttacker(attackerCard, attackerFacingOppSecondary)
            ? { bypassAbsorption: true }
            : undefined
        );
        const hpAfterRaw = cardForCombatSecondary.currentHp - barrierSplitSecondary.damageToCurrentHp;
        const resolvedSecondary = resolveBaekseuFatalDamage(
          cardForCombatSecondary,
          hpAfterRaw,
          barrierSplitSecondary.damageToCurrentHp,
          facingOppUnitAtSlot(state!, player, slot as "is" | "m" | "os")
        );
        const newHp = resolvedSecondary.finalHp;
        const hpLossSecondary = Math.max(0, cardForCombatSecondary.currentHp - newHp);
        const targetMitigationSecondary =
          banjitMitSecondary + defenseMitSecondary + Math.max(0, preInvulnTotalSecondary - hpLossSecondary);
        const isDestroyed = resolvedSecondary.isDestroyed;
        const baekseuPatchSecondary = resolvedSecondary.patch;
        const baekseuLastStandSecondary = resolvedSecondary.lastStandTriggered;

        const morningMoodDeathHeal = isDestroyed
          ? getMorningMoodDeathAllyHeal(
              card,
              facingOppUnitAtSlot(state!, player, slot as "is" | "m" | "os")
            )
          : 0;
        const startingTreeAllyHeal = getStartingTreeAllyHealOnDamaged(
          card,
          actualDamage,
          facingOppUnitAtSlot(state!, player, slot as "is" | "m" | "os")
        );

        let skillUpdates: Partial<FieldCard> = {};
        let fieldHealAmount = 0;
        let fieldBuffKey = "";
        if (attackerCard) {
          skillUpdates = applyPostAttackSkills(
            attackerCard,
            {
              damageDealt: actualDamage,
              targetDestroyed: isDestroyed,
              targetMaxHpWhenDestroyed: isDestroyed ? Number(card.hp) : undefined,
              applyFieldHeal: amt => {
                fieldHealAmount = amt;
              },
              applyFieldBuff: key => {
                fieldBuffKey = key;
              },
            },
            facingOppUnitAtSlot(state!, attackerPlayer, attackerSlotName)
          );
        }

        const targetPlayerState = player === "A" ? state!.playerA : state!.playerB;
        const willBeEmpty = isDestroyed && 
          (slot === "is" ? true : targetPlayerState.field.is === null) &&
          (slot === "m" ? true : targetPlayerState.field.m === null) &&
          (slot === "os" ? true : targetPlayerState.field.os === null);

        const attackerFieldForPakkiCurseSec =
          attackerPlayer === "A" ? state!.playerA.field : state!.playerB.field;
        const pakkiDebuffSecondary =
          isDestroyed &&
          attackerCard &&
          shouldApplyPakkiKillDebuffOnDeath(
            card,
            facingOppUnitAtSlot(state!, player, slot),
            attackerFieldForPakkiCurseSec,
            {
              allyPlayer: attackerPlayer,
              playerAField: state!.playerA.field,
              playerBField: state!.playerB.field,
            }
          );

        const ahSecondary = attackerCard ? getHealFromSkillUpdates(attackerCard, skillUpdates) : 0;

        const secondaryCombatPatches: Array<{
          id: string | undefined;
          delta: Partial<
            Record<
              "damageDealt" | "kills" | "damageTaken" | "selfHeal" | "allyHealGiven" | "damageMitigated",
              number
            >
          >;
        }> = [];
        if (attackerCard?.statsInstanceId) {
          secondaryCombatPatches.push({
            id: attackerCard.statsInstanceId,
            delta: { damageDealt: hpLossSecondary, kills: isDestroyed ? 1 : 0 },
          });
        }
        if (card.statsInstanceId) {
          secondaryCombatPatches.push({
            id: card.statsInstanceId,
            delta: { damageTaken: hpLossSecondary, damageMitigated: targetMitigationSecondary },
          });
        }
        if (ahSecondary > 0 && attackerCard?.statsInstanceId) {
          secondaryCombatPatches.push({
            id: attackerCard.statsInstanceId,
            delta: { selfHeal: ahSecondary },
          });
        }
        if (morningMoodDeathHeal > 0 && isDestroyed && card.statsInstanceId) {
          (["is", "m", "os"] as const).forEach(s => {
            if (s === slot) return;
            const u = targetPlayerState.field[s];
            if (!u?.statsInstanceId) return;
            const healedMm = Math.min(Number(u.hp) - u.currentHp, morningMoodDeathHeal);
            if (healedMm <= 0) return;
            secondaryCombatPatches.push({ id: card.statsInstanceId, delta: { allyHealGiven: healedMm } });
            secondaryCombatPatches.push({ id: u.statsInstanceId, delta: { selfHeal: healedMm } });
          });
        }
        if (startingTreeAllyHeal > 0 && card.statsInstanceId) {
          (["is", "m", "os"] as const).forEach(s => {
            if (s === slot) return;
            const u = targetPlayerState.field[s];
            if (!u?.statsInstanceId) return;
            const healedSt = Math.min(Number(u.hp) - u.currentHp, startingTreeAllyHeal);
            if (healedSt <= 0) return;
            secondaryCombatPatches.push({ id: card.statsInstanceId, delta: { allyHealGiven: healedSt } });
            secondaryCombatPatches.push({ id: u.statsInstanceId, delta: { selfHeal: healedSt } });
          });
        }
        if (fieldHealAmount > 0 && attackerCard?.statsInstanceId) {
          const allySideSec = attackerPlayer === "A" ? state!.playerA.field : state!.playerB.field;
          (["is", "m", "os"] as const).forEach(s => {
            const u = allySideSec[s];
            if (!u?.statsInstanceId) return;
            const healedFld = computeFieldAllyHealApplied(
          u,
          fieldHealAmount,
          attackerCard,
          attackerSlotName,
          s
        );
            if (healedFld <= 0) return;
            if (u.statsInstanceId === attackerCard.statsInstanceId) {
              secondaryCombatPatches.push({ id: u.statsInstanceId, delta: { selfHeal: healedFld } });
            } else {
              secondaryCombatPatches.push({ id: attackerCard.statsInstanceId, delta: { allyHealGiven: healedFld } });
              secondaryCombatPatches.push({ id: u.statsInstanceId, delta: { selfHeal: healedFld } });
            }
          });
        }

        let reflectLibutySecondaryAgg: ReturnType<
          typeof computeLibutyReflectPureDamageOnAggressor
        > | null = null;
        if (
          attackerCard &&
          shouldApplyLibutyBasicAttackReflect(
            card,
            facingOppUnitAtSlot(state!, player, slot as "is" | "m" | "os"),
            hpLossSecondary
          )
        ) {
          const mergedForReflectSec: FieldCard = {
            ...attackerCard,
            ...skillUpdates,
            ...bumpMaxellandTenacityGaugeOnEnemyKill(
              attackerCard,
              isDestroyed,
              facingOppUnitAtSlot(state!, attackerPlayer, attackerSlotName)
            ),
            ...(pakkiDebuffSecondary ? { hasPakiAttackHalveDebuff: true } : {}),
          };
          reflectLibutySecondaryAgg =
            computeLibutyReflectPureDamageOnAggressor(
              mergedForReflectSec,
              undefined,
              facingOppUnitAtSlot(state!, attackerPlayer, attackerSlotName)
            );
          if (reflectLibutySecondaryAgg && reflectLibutySecondaryAgg.hpLoss > 0) {
            if (attackerCard.statsInstanceId) {
              secondaryCombatPatches.push({
                id: attackerCard.statsInstanceId,
                delta: { damageTaken: reflectLibutySecondaryAgg.hpLoss },
              });
            }
            if (card.statsInstanceId) {
              secondaryCombatPatches.push({
                id: card.statsInstanceId,
                delta: { damageDealt: reflectLibutySecondaryAgg.hpLoss },
              });
            }
          }
        }

        setState(prev => {
          if (!prev) return prev;
          const newPlayerA = { ...prev.playerA, field: { ...prev.playerA.field } };
          const newPlayerB = { ...prev.playerB, field: { ...prev.playerB.field } };
          
          const baseTargetCard =
            Object.keys(baekseuPatchSecondary).length > 0
              ? stripBaekseuHarmfulEffectsForInvuln(cardForCombatSecondary)
              : cardForCombatSecondary;
          const updatedTarget = {
            ...baseTargetCard,
            ...elixir5StunTargetPatch(
              attackerCard,
              actualDamage,
              isDestroyed,
              facingOppUnitAtSlot(state!, attackerPlayer, attackerSlotName)
            ),
            ...baekseuPatchSecondary,
            ...hpBarrierPatchFromRemaining(barrierSplitSecondary.nextBarrierRemaining),
            currentHp: newHp,
          }; 
          
          if (player === "A") newPlayerA.field[slot as "is"|"m"|"os"] = isDestroyed ? null : updatedTarget;
          else newPlayerB.field[slot as "is"|"m"|"os"] = isDestroyed ? null : updatedTarget;
          
          if (attackerCard) {
            const bumpKillSec = bumpMaxellandTenacityGaugeOnEnemyKill(
              attackerCard,
              isDestroyed,
              facingOppUnitAtSlot(state!, attackerPlayer, attackerSlotName)
            );
            let updatedAttacker: FieldCard = {
              ...attackerCard,
              ...skillUpdates,
              ...bumpKillSec,
              ...(pakkiDebuffSecondary ? { hasPakiAttackHalveDebuff: true } : {}),
            };
            if (reflectLibutySecondaryAgg && reflectLibutySecondaryAgg.hpLoss > 0) {
              updatedAttacker = applyLibutyReflectPatchToAggressorCard(
                updatedAttacker,
                reflectLibutySecondaryAgg
              );
            }
            const attackerDestroyedByLibutyReflectSec =
              reflectLibutySecondaryAgg?.isDestroyed === true;
            if (attackerPlayer === "A") {
                newPlayerA.field[attackerSlotName] = attackerDestroyedByLibutyReflectSec ? null : updatedAttacker;
            } else {
                newPlayerB.field[attackerSlotName] = attackerDestroyedByLibutyReflectSec ? null : updatedAttacker;
            }

            const activePlayerSec = attackerPlayer === "A" ? newPlayerA : newPlayerB;
            if (fieldHealAmount > 0 || fieldBuffKey) {
              (["is", "m", "os"] as const).forEach(s => {
                const unit = activePlayerSec.field[s];
                if (!unit) return;
                const updatedUnit = { ...unit };
                if (fieldHealAmount > 0) {
                  Object.assign(
              updatedUnit,
              applyFieldAllyHealToUnit(
                updatedUnit,
                fieldHealAmount,
                attackerCard,
                attackerSlotName,
                s
              )
            );
                }
                if (fieldBuffKey) {
                  (updatedUnit as FieldCard & Record<string, unknown>)[fieldBuffKey] = true;
                }
                activePlayerSec.field[s] = updatedUnit;
              });
              if (fieldHealAmount > 0) {
                const enemyFieldDiagoSec =
                  attackerPlayer === "A" ? newPlayerB.field : newPlayerA.field;
                applyFieldAllyHealToOwnAebeolaekingRidersOnEnemyField(
                  enemyFieldDiagoSec,
                  attackerPlayer,
                  fieldHealAmount,
                  attackerCard,
                  attackerSlotName
                );
              }
            }
          }

          if (isDestroyed) {
            if (morningMoodDeathHeal > 0) {
              applyMorningMoodDeathHealSpread(
                player,
                newPlayerA.field,
                newPlayerB.field,
                morningMoodDeathHeal
              );
            }
             cleanupSkillLinksOnDeath(card, newPlayerA, newPlayerB, prev.globalTurnCount);
          }
          if (attackerCard && reflectLibutySecondaryAgg?.isDestroyed) {
            cleanupSkillLinksOnDeath(attackerCard, newPlayerA, newPlayerB, prev.globalTurnCount);
          }
          if (startingTreeAllyHeal > 0) {
            applyStartingTreeDamagedHealSpread(
              player,
              slot,
              newPlayerA.field,
              newPlayerB.field,
              startingTreeAllyHeal
            );
          }

          let newRewindCards = prev.rewindCards;
          if (isDestroyed) newRewindCards = [...newRewindCards, card];
          if (attackerCard && reflectLibutySecondaryAgg?.isDestroyed) {
            newRewindCards = [...newRewindCards, attackerCard];
          }
          return {
            ...prev,
            unitCombatStats: patchManyUnitCombatStats(prev.unitCombatStats, secondaryCombatPatches),
            rewindCards: newRewindCards,
            playerA: newPlayerA,
            playerB: newPlayerB,
          };
        });

        const targetKey = `${player}-${slot}`;
        const attackerSlotKey = `${attackerPlayer}-${attackerSlotName}`;
        if (reflectLibutySecondaryAgg && reflectLibutySecondaryAgg.hpLoss > 0) {
          showDamageNumber(
            attackerSlotKey,
            LIBUTY_REFLECT_PURE_DAMAGE,
            mergeKalliPureDamageFloat(LIBUTY_REFLECT_PURE_DAMAGE)
          );
        }
        if (reflectLibutySecondaryAgg?.baekseuLastStand) {
          window.setTimeout(() => triggerCardFlash(attackerSlotKey, "kalliBuffBan"), 0);
        }
        const pakkiDestroyed =
          isDestroyed && String(card?.name ?? "").trim() === PAKKI_ID;
        const dkFacingSecondary = facingOppUnitAtSlot(state!, attackerPlayer, attackerSlotName);
        const dkFullSoulStrike =
          attackerCard != null &&
          attackerCard.name === DARK_KNIGHT_ID &&
          darkKnightSoulGaugeFullForCombat(attackerCard, dkFacingSecondary) &&
          actualDamage > 0;
        const maxellFullStrikeSecVfx =
          attackerCard != null &&
          attackerCard.name === MAXELLAND_ID &&
          maxellandTenacityGaugeFullForCombat(attackerCard, dkFacingSecondary) &&
          actualDamage > 0;
        /* 패키 처치: 대상은 붉은 피격 대신 패키색 능력 발동(필립 동형) — 고스톤·다크나이트·맥셀은 공격자 칸 처치 이펙트 유지 */
        if (pakkiDestroyed) {
          const dkKillExtras =
            attackerCard?.name === DARK_KNIGHT_ID && dkFullSoulStrike
              ? ({ dkFullGaugeNavyDamageText: true } as const)
              : undefined;
          showPakkiSlainDamageOnTarget(
            targetKey,
            actualDamage,
            mergeKalliPureDamageFloat(kalliPureSecondary, dkKillExtras)
          );
          if (
            attackerCard?.name === GHOSTONE_ID &&
            shouldShowGhostoneKillVisualFeedback(
              attackerCard,
              facingOppUnitAtSlot(state!, attackerPlayer, attackerSlotName),
              true
            )
          ) {
            triggerGhostoneKillFlashOnAttacker(attackerSlotKey);
          } else if (
            attackerCard?.name === DARK_KNIGHT_ID &&
            shouldPlayDarkKnightKillVfx(attackerCard, dkFacingSecondary)
          ) {
            triggerCardFlash(attackerSlotKey, "darkKnightKill");
          } else if (
            attackerCard?.name === MAXELLAND_ID &&
            shouldPlayMaxellandKillVfx(attackerCard, dkFacingSecondary)
          ) {
            triggerCardFlash(attackerSlotKey, "maxellandKill");
          }
        } else if (
          isDestroyed &&
          attackerCard?.name === GHOSTONE_ID &&
          shouldShowGhostoneKillVisualFeedback(
            attackerCard,
            facingOppUnitAtSlot(state!, attackerPlayer, attackerSlotName),
            true
          )
        ) {
          showGhostoneKillDamageOnTarget(targetKey, actualDamage, mergeKalliPureDamageFloat(kalliPureSecondary));
          triggerGhostoneKillFlashOnAttacker(attackerSlotKey);
        } else if (isDestroyed && attackerCard?.name === GHOSTONE_ID) {
          showDamageNumber(targetKey, actualDamage, mergeKalliPureDamageFloat(kalliPureSecondary));
        } else if (
          isDestroyed &&
          attackerCard?.name === DARK_KNIGHT_ID &&
          shouldPlayDarkKnightKillVfx(attackerCard, dkFacingSecondary)
        ) {
          showDarkKnightKillDamageOnTarget(
            targetKey,
            actualDamage,
            attackerSlotKey,
            mergeKalliPureDamageFloat(
              kalliPureSecondary,
              dkFullSoulStrike ? { dkFullGaugeNavyDamageText: true } : undefined
            )
          );
        } else if (isDestroyed && attackerCard?.name === DARK_KNIGHT_ID) {
          showDamageNumber(targetKey, actualDamage, mergeKalliPureDamageFloat(kalliPureSecondary));
        } else if (isDestroyed && attackerCard?.name === MAXELLAND_ID) {
          const maxellFacingSec = facingOppUnitAtSlot(state!, attackerPlayer, attackerSlotName);
          if (shouldPlayMaxellandKillVfx(attackerCard, maxellFacingSec)) {
            showMaxellandKillDamageOnTarget(
              targetKey,
              actualDamage,
              attackerSlotKey,
              mergeKalliPureDamageFloat(kalliPureSecondary),
              attackerCard,
              maxellFacingSec
            );
          } else {
            showDamageNumber(targetKey, actualDamage, mergeKalliPureDamageFloat(kalliPureSecondary));
          }
        } else if (
          isDestroyed &&
          attackerCard != null &&
          isStartingWraithTrueStrikeBasicAttacker(attackerCard, attackerFacingOppSecondary)
        ) {
          showStartingWraithChainKillOnTarget(
            targetKey,
            actualDamage,
            mergeStartingWraithTrueStrikeDamageFloat(mergeKalliPureDamageFloat(kalliPureSecondary))
          );
          triggerStartingWraithChainKillFlashOnAttacker(attackerSlotKey);
        } else if (dkFullSoulStrike) {
          showDarkKnightFullSoulStrikeOnTarget(targetKey, actualDamage, mergeKalliPureDamageFloat(kalliPureSecondary));
        } else if (maxellFullStrikeSecVfx) {
          showMaxellandFullGaugeStrikeDamageOnTarget(
            targetKey,
            actualDamage,
            mergeKalliPureDamageFloat(kalliPureSecondary)
          );
        } else if (
          attackerCard != null &&
          isStartingWraithTrueStrikeBasicAttacker(attackerCard, attackerFacingOppSecondary) &&
          actualDamage > 0
        ) {
          showStartingWraithTrueStrikeDamageOnTarget(
            targetKey,
            actualDamage,
            mergeStartingWraithTrueStrikeDamageFloat(mergeKalliPureDamageFloat(kalliPureSecondary))
          );
        } else {
          showDamageNumber(targetKey, actualDamage, mergeKalliPureDamageFloat(kalliPureSecondary));
        }
        if (baekseuLastStandSecondary) {
          window.setTimeout(() => triggerCardFlash(targetKey, "kalliBuffBan"), 0);
        }
        if (pakkiDebuffSecondary) {
          triggerCardFlash(attackerSlotKey, "pakkiDeathCurse");
        }
        triggerGeunyangMojaHitFlame(attackerCard, `${player}-${slot}`, actualDamage);
        triggerGhostoneClawHit(attackerCard, `${player}-${slot}`, actualDamage, "secondary");
        triggerIversonClawHit(attackerCard, `${player}-${slot}`, actualDamage, "secondary");
        triggerEristinaHitLine(attackerCard, `${player}-${slot}`, actualDamage, "secondary");
        if (morningMoodDeathHeal > 0) {
          const deadSideSnap = player === "A" ? state!.playerA.field : state!.playerB.field;
          const oppSnap = player === "A" ? state!.playerB.field : state!.playerA.field;
          (["is", "m", "os"] as const).forEach(s => {
            if (s === slot) return;
            const unit = deadSideSnap[s];
            if (!unit) return;
            const healed = Math.min(Number(unit.hp) - unit.currentHp, morningMoodDeathHeal);
            if (healed > 0) showHealNumber(`${player}-${s}`, healed);
          });
          (["is", "m", "os"] as const).forEach(s => {
            const host = oppSnap[s];
            const rider = host?.parasiteRider;
            if (!rider || getAebeolaekingRiderTrueOwner(rider) !== player) return;
            const healed = Math.min(Number(rider.hp) - (rider.currentHp ?? 0), morningMoodDeathHeal);
            if (healed > 0) showHealNumber(aebeolaekingRiderSlotKey(player, s), healed);
          });
        }
        if (startingTreeAllyHeal > 0) {
          const sideSnap = player === "A" ? state!.playerA.field : state!.playerB.field;
          const oppSnap = player === "A" ? state!.playerB.field : state!.playerA.field;
          (["is", "m", "os"] as const).forEach(s => {
            if (s === slot) return;
            const unit = sideSnap[s];
            if (!unit) return;
            const healed = Math.min(Number(unit.hp) - unit.currentHp, startingTreeAllyHeal);
            if (healed > 0) showHealNumber(`${player}-${s}`, healed);
          });
          (["is", "m", "os"] as const).forEach(s => {
            const host = oppSnap[s];
            const rider = host?.parasiteRider;
            if (!rider || getAebeolaekingRiderTrueOwner(rider) !== player) return;
            const healed = Math.min(Number(rider.hp) - (rider.currentHp ?? 0), startingTreeAllyHeal);
            if (healed > 0) showHealNumber(aebeolaekingRiderSlotKey(player, s), healed);
          });
        }
        if (attackerCard) {
          const ah = getHealFromSkillUpdates(attackerCard, skillUpdates);
          if (ah > 0) {
            if (
              shouldShowGhostoneKillFullHealFeedback(
                attackerCard,
                facingOppUnitAtSlot(state!, attackerPlayer, attackerSlotName),
                ah,
                isDestroyed
              )
            ) {
              showHealNumberAfterGhostoneKillFlash(attackerSlotKey, ah);
            } else if (
              isDestroyed &&
              attackerCard.name === DARK_KNIGHT_ID &&
              shouldPlayDarkKnightKillVfx(attackerCard, dkFacingSecondary)
            ) {
              showHealNumberAfterDarkKnightKillFlash(attackerSlotKey, ah);
            } else {
              showHealNumber(attackerSlotKey, ah);
            }
          }
          if (fieldHealAmount > 0) {
            const allySnap = attackerPlayer === "A" ? state!.playerA.field : state!.playerB.field;
            (["is", "m", "os"] as const).forEach(s => {
              const u = allySnap[s];
              if (!u) return;
              const healed = computeFieldAllyHealApplied(
          u,
          fieldHealAmount,
          attackerCard,
          attackerSlotName,
          s
        );
              if (healed > 0) showHealNumber(`${attackerPlayer}-${s}`, healed);
            });
          }
        }

        const newHitsRemaining = pendingSecondaryAttack.hitsRemaining - 1;
        if (newHitsRemaining > 0 && !willBeEmpty) {
          setPendingSecondaryAttack(prev => ({
            ...prev!,
            hitsRemaining: newHitsRemaining,
            hitTargets: [...prev!.hitTargets, targetId],
          }));
        } else {
          setPendingSecondaryAttack(null);
        }
        };
        runElWingDeferrableSecondaryHit();
      }
      return;
    }

    // 2. 1차 공격 (기본 공격) 처리
    if (attackingSlot) {
      const [attackerPlayer, attackerSlotName] = attackingSlot.split("-") as ["A" | "B", "is" | "m" | "os"];
      let keepAttackingModeForStartingWraithChain = false;
      const attackerFieldBanner = attackerPlayer === "A" ? state!.playerA.field : state!.playerB.field;
      const attackerCardBanner = attackerFieldBanner[attackerSlotName];
      if (
        attackerCardBanner &&
        isStartingWraithPassivesPausedByConfusion(
          attackerCardBanner,
          facingOppUnitAtSlot(state!, attackerPlayer, attackerSlotName)
        )
      ) {
        applyStartingWraithChainPending(null);
      }

      if (
        attackerCardBanner &&
        isRyeomchoSelfHealBasicAttackSealed(
          attackerCardBanner,
          facingOppUnitAtSlot(state!, attackerPlayer, attackerSlotName)
        )
      ) {
        if (player === attackerPlayer && slot === attackerSlotName && card) {
          const activeForAttack = attackerPlayer === "A" ? state!.playerA : state!.playerB;
          const atkValidation = validateAttack({
            attackerCard: attackerCardBanner,
            currentTurnKey: `${state!.turnCount}-${state!.currentTurn}`,
            attacksUsedThisTurn: activeForAttack.attacksThisTurn || 0,
            isSilenced: isSilenced(attackerCardBanner, null),
            isStunned: isStunned(attackerCardBanner),
          });
          if (!atkValidation.canAttack) {
            alert(atkValidation.reason);
            return;
          }

          const baseAtkRaw =
            resolveFieldUnitSimulationBaseAtkRaw(attackerCardBanner, attackOptionOverride);
          const healAmount = parseAttack(baseAtkRaw.replace(/[\(\)]/g, "")).primaryDamage;

          if (healAmount <= 0) {
            alert("공격력 데이터가 0이거나 유효하지 않습니다.");
            return;
          }

          const maxHp = Number(attackerCardBanner.hp);
          if (attackerCardBanner.currentHp >= maxHp) {
            pushInfoFloat(`${attackerPlayer}-${attackerSlotName}`, BATTLE_MSG.ryeomcho.alreadyMaxHp, INFO_FLOAT_MS);
            setAttackingSlot(null);
            setAttackOptionOverride(null);
            return;
          }

          const healedAttacker = healUnitCurrentHp(attackerCardBanner, healAmount, {
            supportSource: "selfAbility",
          });
          const actualHeal = healedAttacker.currentHp - attackerCardBanner.currentHp;

          const ryeomchoHealPatches: Array<{
            id: string | undefined;
            delta: Partial<
              Record<
                "damageDealt" | "kills" | "damageTaken" | "selfHeal" | "allyHealGiven" | "damageMitigated",
                number
              >
            >;
          }> = [];
          if (actualHeal > 0 && attackerCardBanner.statsInstanceId) {
            ryeomchoHealPatches.push({
              id: attackerCardBanner.statsInstanceId,
              delta: { selfHeal: actualHeal },
            });
          }

          setState(prev => {
            if (!prev) return prev;
            const newPlayerA = { ...prev.playerA, field: { ...prev.playerA.field } };
            const newPlayerB = { ...prev.playerB, field: { ...prev.playerB.field } };

            const updatedAttacker = { ...healedAttacker, hasAttacked: true };

            if (attackerPlayer === "A") {
              newPlayerA.field[attackerSlotName] = updatedAttacker;
              newPlayerA.attacksThisTurn = (newPlayerA.attacksThisTurn || 0) + 1;
            } else {
              newPlayerB.field[attackerSlotName] = updatedAttacker;
              newPlayerB.attacksThisTurn = (newPlayerB.attacksThisTurn || 0) + 1;
            }

            return {
              ...prev,
              unitCombatStats: patchManyUnitCombatStats(prev.unitCombatStats, ryeomchoHealPatches),
              playerA: newPlayerA,
              playerB: newPlayerB,
            };
          });

          if (actualHeal > 0) {
            showHealNumber(`${attackerPlayer}-${attackerSlotName}`, actualHeal);
          }

          setAttackingSlot(null);
          setAttackOptionOverride(null);
          return;
        }
        alert(BATTLE_MSG.ryeomcho.cannotAttackEnemy);
        return;
      }

      if (attackerCardBanner && isRanigo(attackerCardBanner)) {
        if (
          isRanigoAllyHealBasicAttackSealed(
            attackerCardBanner,
            facingOppUnitAtSlot(state!, attackerPlayer, attackerSlotName)
          )
        ) {
          return;
        }
        if (player === attackerPlayer && slot !== "spell" && card) {
          if (slot === attackerSlotName) {
            alert(BATTLE_MSG.ranigo.cannotTargetSelf);
            return;
          }
          const activeForAttack = attackerPlayer === "A" ? state!.playerA : state!.playerB;
          const atkValidation = validateAttack({
            attackerCard: attackerCardBanner,
            currentTurnKey: `${state!.turnCount}-${state!.currentTurn}`,
            attacksUsedThisTurn: activeForAttack.attacksThisTurn || 0,
            isSilenced: isSilenced(attackerCardBanner, null),
            isStunned: isStunned(attackerCardBanner),
          });
          if (!atkValidation.canAttack) {
            alert(atkValidation.reason);
            return;
          }

          const maxHp = Number(card.hp);
          if (card.currentHp >= maxHp) {
            pushInfoFloat(`${player}-${slot}`, BATTLE_MSG.ranigo.allyFullyHealed, INFO_FLOAT_MS);
            setAttackingSlot(null);
            setAttackOptionOverride(null);
            return;
          }

          const healedTarget = healUnitCurrentHp(card, RANIGO_ALLY_BASIC_HEAL_AMOUNT, { supportSource: "allyUnit" });
          const actualHeal = healedTarget.currentHp - card.currentHp;

          const baseAtkRaw = resolveFieldUnitSimulationBaseAtkRawWithFacing(
            attackerCardBanner,
            attackOptionOverride,
            facingOppUnitAtSlot(state!, attackerPlayer, attackerSlotName)
          );
          const parsed = parseAttack(baseAtkRaw.replace(/[\(\)]/g, ""));
          const chainEligible =
            (parsed.type === "ADDITION" || parsed.type === "MULTIPLICATION") &&
            parsed.secondaryHits > 0 &&
            parsed.secondaryDamage > 0;

          let fieldHealAmountPrimary = 0;
          let fieldBuffKeyPrimary = "";
          const skillUpdates = applyPostAttackSkills(
            attackerCardBanner,
            {
              damageDealt: 0,
              targetDestroyed: false,
              applyFieldHeal: amt => {
                fieldHealAmountPrimary = amt;
              },
              applyFieldBuff: key => {
                fieldBuffKeyPrimary = key;
              },
            },
            facingOppUnitAtSlot(state!, attackerPlayer, attackerSlotName)
          );

        const tgt = `${player}-${slot}`;

        const ranigoPrimaryPatches: Array<{
          id: string | undefined;
          delta: Partial<
            Record<
              "damageDealt" | "kills" | "damageTaken" | "selfHeal" | "allyHealGiven" | "damageMitigated",
              number
            >
          >;
        }> = [];
        if (actualHeal > 0 && attackerCardBanner.statsInstanceId) {
          ranigoPrimaryPatches.push({
            id: attackerCardBanner.statsInstanceId,
            delta: { allyHealGiven: actualHeal },
          });
        }
        if (actualHeal > 0 && card.statsInstanceId) {
          ranigoPrimaryPatches.push({ id: card.statsInstanceId, delta: { selfHeal: actualHeal } });
        }
        if (fieldHealAmountPrimary > 0 && attackerCardBanner.statsInstanceId) {
          const allySnapRanigoP = attackerPlayer === "A" ? state!.playerA.field : state!.playerB.field;
          (["is", "m", "os"] as const).forEach(s => {
            const u = allySnapRanigoP[s];
            if (!u?.statsInstanceId) return;
            const healedFld = computeFieldAllyHealApplied(
              u,
              fieldHealAmountPrimary,
              attackerCardBanner,
              attackerSlotName,
              s
            );
            if (healedFld <= 0) return;
            if (u.statsInstanceId === attackerCardBanner.statsInstanceId) {
              ranigoPrimaryPatches.push({ id: u.statsInstanceId, delta: { selfHeal: healedFld } });
            } else {
              ranigoPrimaryPatches.push({ id: attackerCardBanner.statsInstanceId, delta: { allyHealGiven: healedFld } });
              ranigoPrimaryPatches.push({ id: u.statsInstanceId, delta: { selfHeal: healedFld } });
            }
          });
        }

        setState(prev => {
            if (!prev) return prev;
            const newPlayerA = { ...prev.playerA, field: { ...prev.playerA.field } };
            const newPlayerB = { ...prev.playerB, field: { ...prev.playerB.field } };

            const updatedTarget = { ...card, ...healedTarget };
            const updatedAttacker = {
              ...attackerCardBanner,
              hasAttacked: true,
              ...skillUpdates,
            };

            if (player === "A") newPlayerA.field[slot as "is" | "m" | "os"] = updatedTarget;
            else newPlayerB.field[slot as "is" | "m" | "os"] = updatedTarget;

            if (attackerPlayer === "A") {
              newPlayerA.field[attackerSlotName] = updatedAttacker;
              newPlayerA.attacksThisTurn = (newPlayerA.attacksThisTurn || 0) + 1;
            } else {
              newPlayerB.field[attackerSlotName] = updatedAttacker;
              newPlayerB.attacksThisTurn = (newPlayerB.attacksThisTurn || 0) + 1;
            }

            const activePlayerPrimary = attackerPlayer === "A" ? newPlayerA : newPlayerB;
            if (fieldHealAmountPrimary > 0 || fieldBuffKeyPrimary) {
              (["is", "m", "os"] as const).forEach(s => {
                const unit = activePlayerPrimary.field[s];
                if (!unit) return;
                const updatedUnit = { ...unit };
                if (fieldHealAmountPrimary > 0) {
                  Object.assign(
                    updatedUnit,
                    applyFieldAllyHealToUnit(
                      updatedUnit,
                      fieldHealAmountPrimary,
                      attackerCardBanner,
                      attackerSlotName,
                      s
                    )
                  );
                }
                if (fieldBuffKeyPrimary && !suppressionBlocksExternalBuffEffects(updatedUnit)) {
                  (updatedUnit as FieldCard & Record<string, unknown>)[fieldBuffKeyPrimary] = true;
                }
                activePlayerPrimary.field[s] = updatedUnit;
              });
            }

            return {
              ...prev,
              unitCombatStats: patchManyUnitCombatStats(prev.unitCombatStats, ranigoPrimaryPatches),
              playerA: newPlayerA,
              playerB: newPlayerB,
            };
          });

          if (actualHeal > 0) {
            showHealNumber(tgt, actualHeal);
          }
          if (fieldHealAmountPrimary > 0) {
            const allySnapPrimary = attackerPlayer === "A" ? state!.playerA.field : state!.playerB.field;
            (["is", "m", "os"] as const).forEach(s => {
              const u = allySnapPrimary[s];
              if (!u) return;
              const healed = computeFieldAllyHealApplied(
                u,
                fieldHealAmountPrimary,
                attackerCardBanner,
                attackerSlotName,
                s
              );
              if (healed > 0) showHealNumber(`${attackerPlayer}-${s}`, healed);
            });
          }

          if (chainEligible) {
            setPendingSecondaryAttack({
              attackerPlayer,
              attackerSlotName,
              damage: 0,
              hitsRemaining: parsed.secondaryHits,
              hitTargets: [tgt],
              allyHealOnly: true,
            });
          }

          setAttackingSlot(null);
          setAttackOptionOverride(null);
          return;
        }
        alert(BATTLE_MSG.ranigo.cannotAttackEnemy);
        return;
      }

      if (player !== attackerPlayer && slot !== "spell" && card) {
        
        // 도발 로직 검사
        const targetPlayerState = player === "A" ? state!.playerA : state!.playerB;
        const oppFieldForTaunt = player === "A" ? state!.playerB.field : state!.playerA.field;
        const tauntBattleCtxBase = {
          playerAField: state!.playerA.field,
          playerBField: state!.playerB.field,
        };
        const slotsForTaunt = ["is", "m", "os"] as const;
        const tauntExists = slotsForTaunt.some(s => {
          const c = targetPlayerState.field[s];
          if (!c) return false;
          return isTaunting(c, oppFieldForTaunt[s] ?? null, targetPlayerState.field, {
            ...tauntBattleCtxBase,
            mySlotKey: `${player}-${s}`,
          });
        });
        const isTargetTaunted = isTaunting(card, oppFieldForTaunt[slot as "is" | "m" | "os"] ?? null, targetPlayerState.field, {
          ...tauntBattleCtxBase,
          mySlotKey: `${player}-${slot}`,
        });

        const startingHeraldAbsBasic = startingHeraldBasicAttackIgnoresTauntTargetingRestrictions(
          attackerCardBanner,
          facingOppUnitAtSlot(state!, attackerPlayer, attackerSlotName)
        );

        if (tauntExists && !isTargetTaunted && !startingHeraldAbsBasic) {
           alert("적 필드에 [도발] 능력을 가진 유닛이 있습니다! 도발 유닛을 먼저 공격해야 합니다.");
           return; 
        }

        if (
          shouldEnforceIversonNearestEnemyTargeting(
            attackerCardBanner,
            getUnitFacingOppAtSlot(attackerPlayer, attackerSlotName, state!.playerA.field, state!.playerB.field)
          )
        ) {
          const allowed = getIversonClosestEnemyTargetSlots(
            attackerSlotName,
            { is: targetPlayerState.field.is, m: targetPlayerState.field.m, os: targetPlayerState.field.os },
            tauntExists,
            {
              playerAField: state!.playerA.field,
              playerBField: state!.playerB.field,
              defenderPlayer: player,
            }
          );
          if (!allowed.includes(slot as "is" | "m" | "os")) {
            alert(IVERSON_NEAREST_ENEMY_MSG);
            return;
          }
        }

        if (
          !startingHeraldAbsBasic &&
          !canEnemyFieldSourceTargetMaengsugyeonPo(
            attackerPlayer,
            attackerSlotName,
            player,
            slot as "is" | "m" | "os",
            card,
            getUnitFacingOppAtSlot(player, slot as "is" | "m" | "os", state!.playerA.field, state!.playerB.field)
          )
        ) {
          pushInfoFloat(`${player}-${slot}`, "올바른 대상이 아닙니다", INFO_FLOAT_MS);
          return;
        }

        const attackerField = attackerPlayer === "A" ? state!.playerA.field : state!.playerB.field;
        const attackerCard = attackerField[attackerSlotName];
        const isStartingWraithChainFollowUp = isStartingWraithBasicAttackChainFollowUpPending(
          pendingStartingWraithChainKill,
          attackerPlayer,
          attackerSlotName
        );
        const wraithChainBypassesAntiGangup = startingWraithChainFollowUpBypassesAntiGangup(
          isStartingWraithChainFollowUp,
          attackerCardBanner,
          facingOppUnitAtSlot(state!, attackerPlayer, attackerSlotName)
        );

        if (
          card.hasBeenAttackedThisTurn &&
          !isTargetTaunted &&
          !fieldGrantsFocusedFireMultihitExemption(
            attackerField,
            {
              allyPlayer: attackerPlayer,
              playerAField: state!.playerA.field,
              playerBField: state!.playerB.field,
            },
            attackerCard
          ) &&
          !startingHeraldAbsBasic &&
          !wraithChainBypassesAntiGangup
        ) {
          alert("다른 유닛이 이미 이 유닛을 공격했습니다.\n(단, [도발] 효과를 가진 유닛은 한 턴에 여러 번 공격받을 수 있습니다.)");
          setAttackingSlot(null);
          setAttackOptionOverride(null);
          applyStartingWraithChainPending(null);
          return;
        }

        if (attackerCard) {
          if (isAttackDisabledUnit(attackerCard)) {
            setAttackingSlot(null);
            setAttackOptionOverride(null);
            applyStartingWraithChainPending(null);
            return;
          }
          const activeForUnitStrike =
            attackerPlayer === "A" ? state!.playerA : state!.playerB;
          const unitStrikeRules = validateAttack({
            attackerCard,
            currentTurnKey: `${state!.turnCount}-${state!.currentTurn}`,
            attacksUsedThisTurn: activeForUnitStrike.attacksThisTurn || 0,
            isSilenced: isSilenced(attackerCard, null),
            isStunned: isStunned(attackerCard),
            bypassTurnAttackBudget: isStartingWraithChainFollowUp,
          });
          if (!unitStrikeRules.canAttack) {
            alert(unitStrikeRules.reason ?? "공격할 수 없습니다.");
            setAttackingSlot(null);
            setAttackOptionOverride(null);
            applyStartingWraithChainPending(null);
            return;
          }

          const baseAtkRaw = resolveFieldUnitSimulationBaseAtkRawWithFacing(
            attackerCard,
            attackOptionOverride,
            facingOppUnitAtSlot(state!, attackerPlayer, attackerSlotName)
          );
          const atkRaw = baseAtkRaw.replace(/[\(\)]/g, ""); 
          const atkRawLower = atkRaw.toLowerCase();
          
          let primaryDamage = 0;
          let secondaryDamage = 0;
          let secondaryHits = 0;
          let attackType: "NORMAL" | "ADDITION" | "MULTIPLICATION" = "NORMAL";

          if (atkRaw.includes("+")) {
            const parts = atkRaw.split("+");
            primaryDamage = parseInt(parts[0].trim()) || 0;
            secondaryDamage = parseInt(parts[1].trim()) || 0;
            secondaryHits = 1;
            attackType = "ADDITION";
          } else if (atkRawLower.includes("x") || atkRaw.includes("*")) {
            const separator = atkRawLower.includes("x") ? "x" : "*";
            const parts = atkRawLower.split(separator);
            primaryDamage = parseInt(parts[0].trim()) || 0;
            const count = parseInt(parts[1].trim()) || 1;
            
            if (count > 1) {
              secondaryDamage = primaryDamage;
              secondaryHits = count - 1;
              attackType = "MULTIPLICATION";
            } else {
              primaryDamage = parseInt(parts[0].trim()) || 0;
            }
          } else {
            primaryDamage = parseInt(atkRaw.trim()) || 0; 
          }

          if (primaryDamage <= 0 && secondaryDamage <= 0) {
            alert("공격력 데이터가 0이거나 유효하지 않습니다.");
            setAttackingSlot(null);
            setAttackOptionOverride(null);
            return;
          }

          ({
            primaryDamage,
            secondaryDamage,
          } = applyAttackerOutgoingBuffDamageModsUnlessCallieBanned(
            attackerPlayer,
            attackerSlotName,
            attackerCard,
            attackerField,
            player === "A" ? state!.playerA.field : state!.playerB.field,
            state!.playerA.field,
            state!.playerB.field,
            primaryDamage,
            secondaryDamage,
            {
              attackType,
              secondaryHits,
            }
          ));

          /* 패키 디버프: 연쇄 타격마다 `scalePakkiOutgoingHit`으로만 적용 — pending에 넣는 secondary는 여기서 절반 처리하지 않음(중복 방지) */
          const pakkiScaledPrimaryForMit = scalePakkiOutgoingHit(
            primaryDamage,
            attackerCard,
            attackerField,
            {
              allyPlayer: attackerPlayer,
              playerAField: state!.playerA.field,
              playerBField: state!.playerB.field,
            }
          );
          const attackerFacingOppPrimary =
            (attackerPlayer === "A" ? state!.playerB.field : state!.playerA.field)[attackerSlotName] ??
            null;
          const kalliVsDefenseStrike = kalliBasicAttackSkipsTargetMitigationVsDefenseType(
            attackerCard,
            card,
            attackerFacingOppPrimary
          );
          const mitigationBypassPrimary =
            kalliVsDefenseStrike ||
            isStartingWraithTrueStrikeBasicAttacker(attackerCard, attackerFacingOppPrimary);
          const kalliPurePrimary = getKalliVsDefenseTypePureBonus(
            attackerCard,
            card,
            attackerFacingOppPrimary
          );
          let afterBanjitPrimary = pakkiScaledPrimaryForMit;
          let banjitMitPrimary = 0;
          if (
            !mitigationBypassPrimary &&
            (card as any).hasBanjitgori &&
            !callieBuffBanSuppressesBuffsForVictim(
              player,
              slot as "is" | "m" | "os",
              state!.playerA.field,
              state!.playerB.field
            )
          ) {
            const floored = Math.floor((pakkiScaledPrimaryForMit * 0.75) / 50) * 50;
            banjitMitPrimary = Math.max(0, pakkiScaledPrimaryForMit - floored);
            afterBanjitPrimary = floored;
          }

          const runElWingDeferrablePrimaryHit = () => {
            if (
              !elWingSinseokBypassRef.current &&
              shouldOfferElWingSinseokOnBasicAttackHit(
                card,
                player,
                slot as "is" | "m" | "os",
                attackerPlayer,
                attackerPlayer,
                state!.playerA.field,
                state!.playerB.field
              )
            ) {
              if (elWingSinseokTimerRef.current != null) {
                window.clearTimeout(elWingSinseokTimerRef.current);
              }
              const deadlineAt = Date.now() + EL_WING_SINSEOK_PROMPT_MS;
              setPendingElWingSinseokDefense({
                defenderPlayer: player,
                defenderSlot: slot as "is" | "m" | "os",
                attackerPlayer,
                attackerSlot: attackerSlotName,
                hitKind: "primary",
                popupPosition: { x: e.clientX, y: e.clientY },
                deadlineAt,
                wraithChainFollowUp: isStartingWraithChainFollowUp,
              });
              elWingSinseokTimeoutMetaRef.current = {
                hitKind: "primary",
                wraithChainFollowUp: isStartingWraithChainFollowUp,
              };
              elWingSinseokResumeRef.current = runElWingDeferrablePrimaryHit;
              setElWingSinseokSecondsLeft(Math.ceil(EL_WING_SINSEOK_PROMPT_MS / 1000));
              setElWingSinseokTimeRatio(1);
              elWingSinseokTimerRef.current = window.setTimeout(
                () => finishElWingSinseokTimeout(),
                EL_WING_SINSEOK_PROMPT_MS
              );
              return;
            }

          const victimFieldPrimary = player === "A" ? state!.playerA.field : state!.playerB.field;

          const primaryDefenseResult = mitigationBypassPrimary
            ? { finalDamage: afterBanjitPrimary }
            : applyIncomingDefenseDamage(
                afterBanjitPrimary,
                card,
                state!.playerA.field,
                state!.playerB.field,
                `${player}-${slot}`
              );
          const defenseMitPrimary =
            !mitigationBypassPrimary && !isInvulnerableFromBaekseuOrCheolbyeok(card, victimFieldPrimary)
              ? Math.max(0, afterBanjitPrimary - primaryDefenseResult.finalDamage)
              : 0;
          const coreAfterDefense =
            mitigationBypassPrimary || isInvulnerableFromBaekseuOrCheolbyeok(card, victimFieldPrimary)
              ? afterBanjitPrimary
              : primaryDefenseResult.finalDamage;
          const preInvulnTotal = coreAfterDefense + kalliPurePrimary;
          let actualPrimaryDamage = isInvulnerableFromBaekseuOrCheolbyeok(card, victimFieldPrimary)
            ? 0
            : preInvulnTotal;
          const cardForCombatPrimary = normalizeUnitHpSurvivalOnesForCombat(card);
          const barrierSplitPrimary = splitDamageThroughHpBarrier(
            cardForCombatPrimary,
            actualPrimaryDamage,
            isStartingWraithTrueStrikeBasicAttacker(attackerCard, attackerFacingOppPrimary)
              ? { bypassAbsorption: true }
              : undefined
          );
          const hpAfterRawPrimary = cardForCombatPrimary.currentHp - barrierSplitPrimary.damageToCurrentHp;
          const resolvedPrimary = resolveBaekseuFatalDamage(
            cardForCombatPrimary,
            hpAfterRawPrimary,
            barrierSplitPrimary.damageToCurrentHp,
            facingOppUnitAtSlot(state!, player, slot as "is" | "m" | "os")
          );
          const newHp = resolvedPrimary.finalHp;
          const hpLossPrimary = Math.max(0, cardForCombatPrimary.currentHp - newHp);
          const targetMitigationPrimary =
            banjitMitPrimary + defenseMitPrimary + Math.max(0, preInvulnTotal - hpLossPrimary);
          const isDestroyed = resolvedPrimary.isDestroyed;
          const baekseuPatchPrimary = resolvedPrimary.patch;
          const baekseuLastStandPrimary = resolvedPrimary.lastStandTriggered;

          const morningMoodDeathHeal = isDestroyed
            ? getMorningMoodDeathAllyHeal(
                card,
                facingOppUnitAtSlot(state!, player, slot as "is" | "m" | "os")
              )
            : 0;
          const startingTreeAllyHeal = getStartingTreeAllyHealOnDamaged(
            card,
            actualPrimaryDamage,
            facingOppUnitAtSlot(state!, player, slot as "is" | "m" | "os")
          );

          const attackerFieldForPakkiCurse =
            attackerPlayer === "A" ? state!.playerA.field : state!.playerB.field;
          const pakkiDebuffPrimary =
            isDestroyed &&
            attackerCard &&
            shouldApplyPakkiKillDebuffOnDeath(
              card,
              facingOppUnitAtSlot(state!, player, slot as "is" | "m" | "os"),
              attackerFieldForPakkiCurse,
              {
                allyPlayer: attackerPlayer,
                playerAField: state!.playerA.field,
                playerBField: state!.playerB.field,
              }
            );

          const willBeEmpty = isDestroyed && 
            (slot === "is" ? true : targetPlayerState.field.is === null) &&
            (slot === "m" ? true : targetPlayerState.field.m === null) &&
            (slot === "os" ? true : targetPlayerState.field.os === null);

          let fieldHealAmountPrimary = 0;
          let fieldBuffKeyPrimary = "";
          const skillUpdates = applyPostAttackSkills(
            attackerCard,
            {
              damageDealt: actualPrimaryDamage,
              targetDestroyed: isDestroyed,
              targetMaxHpWhenDestroyed: isDestroyed ? Number(card.hp) : undefined,
              applyFieldHeal: amt => {
                fieldHealAmountPrimary = amt;
              },
              applyFieldBuff: key => {
                fieldBuffKeyPrimary = key;
              },
            },
            facingOppUnitAtSlot(state!, attackerPlayer, attackerSlotName)
          );
          const attackerHealFromHit = getHealFromSkillUpdates(attackerCard, skillUpdates);

          const primaryCombatPatches: Array<{
            id: string | undefined;
            delta: Partial<
              Record<
                "damageDealt" | "kills" | "damageTaken" | "selfHeal" | "allyHealGiven" | "damageMitigated",
                number
              >
            >;
          }> = [];
          if (attackerCard.statsInstanceId) {
            primaryCombatPatches.push({
              id: attackerCard.statsInstanceId,
              delta: { damageDealt: hpLossPrimary, kills: isDestroyed ? 1 : 0 },
            });
          }
          if (card.statsInstanceId) {
            primaryCombatPatches.push({
              id: card.statsInstanceId,
              delta: { damageTaken: hpLossPrimary, damageMitigated: targetMitigationPrimary },
            });
          }
          if (attackerHealFromHit > 0 && attackerCard.statsInstanceId) {
            primaryCombatPatches.push({
              id: attackerCard.statsInstanceId,
              delta: { selfHeal: attackerHealFromHit },
            });
          }
          if (morningMoodDeathHeal > 0 && isDestroyed && card.statsInstanceId) {
            (["is", "m", "os"] as const).forEach(s => {
              if (s === slot) return;
              const u = targetPlayerState.field[s];
              if (!u?.statsInstanceId) return;
              const healedMm = Math.min(Number(u.hp) - u.currentHp, morningMoodDeathHeal);
              if (healedMm <= 0) return;
              primaryCombatPatches.push({ id: card.statsInstanceId, delta: { allyHealGiven: healedMm } });
              primaryCombatPatches.push({ id: u.statsInstanceId, delta: { selfHeal: healedMm } });
            });
          }
          if (startingTreeAllyHeal > 0 && card.statsInstanceId) {
            (["is", "m", "os"] as const).forEach(s => {
              if (s === slot) return;
              const u = targetPlayerState.field[s];
              if (!u?.statsInstanceId) return;
              const healedSt = Math.min(Number(u.hp) - u.currentHp, startingTreeAllyHeal);
              if (healedSt <= 0) return;
              primaryCombatPatches.push({ id: card.statsInstanceId, delta: { allyHealGiven: healedSt } });
              primaryCombatPatches.push({ id: u.statsInstanceId, delta: { selfHeal: healedSt } });
            });
          }
          if (fieldHealAmountPrimary > 0 && attackerCard.statsInstanceId) {
            const allySidePrimary = attackerPlayer === "A" ? state!.playerA.field : state!.playerB.field;
            (["is", "m", "os"] as const).forEach(s => {
              const u = allySidePrimary[s];
              if (!u?.statsInstanceId) return;
              const healedFld = computeFieldAllyHealApplied(
                u,
                fieldHealAmountPrimary,
                attackerCard,
                attackerSlotName,
                s
              );
              if (healedFld <= 0) return;
              if (u.statsInstanceId === attackerCard.statsInstanceId) {
                primaryCombatPatches.push({ id: u.statsInstanceId, delta: { selfHeal: healedFld } });
              } else {
                primaryCombatPatches.push({ id: attackerCard.statsInstanceId, delta: { allyHealGiven: healedFld } });
                primaryCombatPatches.push({ id: u.statsInstanceId, delta: { selfHeal: healedFld } });
              }
            });
          }

          let reflectLibutyOnAggressorResult: ReturnType<
            typeof computeLibutyReflectPureDamageOnAggressor
          > | null = null;
          if (
            shouldApplyLibutyBasicAttackReflect(
              card,
              facingOppUnitAtSlot(state!, player, slot as "is" | "m" | "os"),
              hpLossPrimary
            )
          ) {
            const mergedForReflect: FieldCard = {
              ...attackerCard,
              hasAttacked: true,
              ...skillUpdates,
              ...bumpMaxellandTenacityGaugeOnEnemyKill(
                attackerCard,
                isDestroyed,
                facingOppUnitAtSlot(state!, attackerPlayer, attackerSlotName)
              ),
              ...(pakkiDebuffPrimary ? { hasPakiAttackHalveDebuff: true } : {}),
            };
            reflectLibutyOnAggressorResult = computeLibutyReflectPureDamageOnAggressor(
              mergedForReflect,
              undefined,
              facingOppUnitAtSlot(state!, attackerPlayer, attackerSlotName)
            );
            if (reflectLibutyOnAggressorResult && reflectLibutyOnAggressorResult.hpLoss > 0) {
              if (attackerCard.statsInstanceId) {
                primaryCombatPatches.push({
                  id: attackerCard.statsInstanceId,
                  delta: { damageTaken: reflectLibutyOnAggressorResult.hpLoss },
                });
              }
              if (card.statsInstanceId) {
                primaryCombatPatches.push({
                  id: card.statsInstanceId,
                  delta: { damageDealt: reflectLibutyOnAggressorResult.hpLoss },
                });
              }
            }
          }

          const defenderFieldSnapForWraithChain =
            player === "A" ? state!.playerA.field : state!.playerB.field;
          const attackerDestroyedByLibutyReflect =
            reflectLibutyOnAggressorResult?.isDestroyed === true;
          const keepWraithChainForNextEnemy = isStartingWraithBasicAttackChainKillEligible({
            attackerCard,
            facingOppCard: attackerFacingOppPrimary,
            attackType,
            secondaryHits,
            isDestroyed,
            attackerDestroyedByReflect: attackerDestroyedByLibutyReflect,
            defenderFieldBeforeKill: defenderFieldSnapForWraithChain,
            killedSlot: slot as "is" | "m" | "os",
          });
          const wraithSeeksPlayerAfterClear =
            isStartingWraithTrueStrikeBasicAttacker(attackerCard, attackerFacingOppPrimary) &&
            attackType === "NORMAL" &&
            secondaryHits === 0 &&
            isDestroyed &&
            !attackerDestroyedByLibutyReflect &&
            countOtherLivingDefenderUnits(defenderFieldSnapForWraithChain, slot as "is" | "m" | "os") ===
              0;
          keepAttackingModeForStartingWraithChain =
            keepWraithChainForNextEnemy || wraithSeeksPlayerAfterClear;

          /* 애벌레킹(W) 데미지 공유 — host가 살아남고 W가 부착돼 있으면 host의 실제 hp 손실의 50%를 W에 공유. */
          let aebShareDmgPrimaryForRider = 0;
          let aebShareAbsorbedPrimary = 0;
          let aebShareBlockedByInvulnPrimary = false;
          let aebDeadRiderPrimary: FieldCard | null = null;

          setState(prev => {
            if (!prev) return prev;
            
            const newPlayerA = { ...prev.playerA, field: { ...prev.playerA.field } };
            const newPlayerB = { ...prev.playerB, field: { ...prev.playerB.field } };
            
            const baseTargetPrimary =
              Object.keys(baekseuPatchPrimary).length > 0
                ? stripBaekseuHarmfulEffectsForInvuln(cardForCombatPrimary)
                : cardForCombatPrimary;
            const wraithChainSkipsGangupMark = startingWraithChainFollowUpBypassesAntiGangup(
              isStartingWraithChainFollowUp,
              attackerCard,
              getUnitFacingOppAtSlot(
                attackerPlayer,
                attackerSlotName,
                prev.playerA.field,
                prev.playerB.field
              )
            );
            let updatedTarget: FieldCard = {
              ...baseTargetPrimary,
              ...elixir5StunTargetPatch(
                attackerCard,
                actualPrimaryDamage,
                isDestroyed,
                facingOppUnitAtSlot(state!, attackerPlayer, attackerSlotName)
              ),
              ...baekseuPatchPrimary,
              ...hpBarrierPatchFromRemaining(barrierSplitPrimary.nextBarrierRemaining),
              currentHp: newHp,
              ...(wraithChainSkipsGangupMark ? {} : { hasBeenAttackedThisTurn: true }),
            };
            /* host가 살아남고 W가 있으면 hpLossPrimary의 50%를 W에 공유([무적]·방어막·보호막 통과). */
            if (!isDestroyed && hasAebeolaekingRider(updatedTarget) && hpLossPrimary > 0) {
              const aebShareResult = applyAebeolaekingDamageShareFromHostToRiderWithProtection(
                updatedTarget,
                hpLossPrimary,
                {
                  hostOwner: player as "A" | "B",
                  playerAField: newPlayerA.field,
                  playerBField: newPlayerB.field,
                }
              );
              updatedTarget = aebShareResult.updatedHost;
              aebShareDmgPrimaryForRider = aebShareResult.sharedToRider;
              aebShareBlockedByInvulnPrimary = aebShareResult.blocked === "invuln";
              aebShareAbsorbedPrimary = aebShareResult.absorbedByBarrier;
              if (aebShareResult.deadRider) {
                aebDeadRiderPrimary = aebShareResult.deadRider;
              }
            }
            const bumpKill = bumpMaxellandTenacityGaugeOnEnemyKill(
              attackerCard,
              isDestroyed,
              facingOppUnitAtSlot(state!, attackerPlayer, attackerSlotName)
            );
            const defendFieldPrev = player === "A" ? prev.playerA.field : prev.playerB.field;
            const wraithChainContinues = isStartingWraithBasicAttackChainKillEligible({
              attackerCard,
              facingOppCard: getUnitFacingOppAtSlot(
                attackerPlayer,
                attackerSlotName,
                prev.playerA.field,
                prev.playerB.field
              ),
              attackType,
              secondaryHits,
              isDestroyed,
              attackerDestroyedByReflect: attackerDestroyedByLibutyReflect,
              defenderFieldBeforeKill: defendFieldPrev,
              killedSlot: slot as "is" | "m" | "os",
            });
            let updatedAttacker: FieldCard = {
              ...attackerCard,
              hasAttacked: wraithChainContinues || wraithSeeksPlayerAfterClear ? false : true,
              ...skillUpdates,
              ...bumpKill,
              ...(pakkiDebuffPrimary ? { hasPakiAttackHalveDebuff: true } : {}),
            };
            if (reflectLibutyOnAggressorResult && reflectLibutyOnAggressorResult.hpLoss > 0) {
              updatedAttacker = applyLibutyReflectPatchToAggressorCard(
                updatedAttacker,
                reflectLibutyOnAggressorResult
              );
            }
            
            if (player === "A") newPlayerA.field[slot as "is"|"m"|"os"] = isDestroyed ? null : updatedTarget;
            else newPlayerB.field[slot as "is"|"m"|"os"] = isDestroyed ? null : updatedTarget;
            
            if (attackerPlayer === "A") {
              newPlayerA.field[attackerSlotName] = attackerDestroyedByLibutyReflect ? null : updatedAttacker;
              if (!isStartingWraithChainFollowUp) {
                newPlayerA.attacksThisTurn = (newPlayerA.attacksThisTurn || 0) + 1;
              }
            } else {
              newPlayerB.field[attackerSlotName] = attackerDestroyedByLibutyReflect ? null : updatedAttacker;
              if (!isStartingWraithChainFollowUp) {
                newPlayerB.attacksThisTurn = (newPlayerB.attacksThisTurn || 0) + 1;
              }
            }

            const activePlayerPrimary = attackerPlayer === "A" ? newPlayerA : newPlayerB;
            if (fieldHealAmountPrimary > 0 || fieldBuffKeyPrimary) {
              (["is", "m", "os"] as const).forEach(s => {
                const unit = activePlayerPrimary.field[s];
                if (!unit) return;
                const updatedUnit = { ...unit };
                if (fieldHealAmountPrimary > 0) {
                  Object.assign(
                    updatedUnit,
                    applyFieldAllyHealToUnit(
                      updatedUnit,
                      fieldHealAmountPrimary,
                      attackerCard,
                      attackerSlotName,
                      s
                    )
                  );
                }
                if (fieldBuffKeyPrimary && !suppressionBlocksExternalBuffEffects(updatedUnit)) {
                  (updatedUnit as FieldCard & Record<string, unknown>)[fieldBuffKeyPrimary] = true;
                }
                activePlayerPrimary.field[s] = updatedUnit;
              });
              if (fieldHealAmountPrimary > 0) {
                const enemyFieldDiagoPri =
                  attackerPlayer === "A" ? newPlayerB.field : newPlayerA.field;
                applyFieldAllyHealToOwnAebeolaekingRidersOnEnemyField(
                  enemyFieldDiagoPri,
                  attackerPlayer,
                  fieldHealAmountPrimary,
                  attackerCard,
                  attackerSlotName
                );
              }
            }

            if (isDestroyed) {
              if (morningMoodDeathHeal > 0) {
                applyMorningMoodDeathHealSpread(
                  player,
                  newPlayerA.field,
                  newPlayerB.field,
                  morningMoodDeathHeal
                );
              }
               cleanupSkillLinksOnDeath(card, newPlayerA, newPlayerB, prev.globalTurnCount);
            }
            if (attackerDestroyedByLibutyReflect) {
              cleanupSkillLinksOnDeath(attackerCard, newPlayerA, newPlayerB, prev.globalTurnCount);
            }
            if (startingTreeAllyHeal > 0) {
              applyStartingTreeDamagedHealSpread(
                player,
                slot,
                newPlayerA.field,
                newPlayerB.field,
                startingTreeAllyHeal
              );
            }

            let newRewindCards = prev.rewindCards;
            if (isDestroyed) {
              /* host 사망 시 부착된 W도 함께 리와인드(별개 카드로 push). */
              newRewindCards = appendDeadHostWithRiderToRewindCards(newRewindCards, card);
            } else if (aebDeadRiderPrimary) {
              newRewindCards = [...newRewindCards, stripAebeolaekingRiderMeta(aebDeadRiderPrimary)];
            }
            if (attackerDestroyedByLibutyReflect) {
              newRewindCards = [...newRewindCards, attackerCard];
            }

            return {
              ...prev,
              unitCombatStats: patchManyUnitCombatStats(prev.unitCombatStats, primaryCombatPatches),
              rewindCards: newRewindCards,
              playerA: newPlayerA,
              playerB: newPlayerB
            };
          });

          /* 애벌레킹(W) 데미지 공유 VFX — W slot에 데미지 숫자 + 갈색 펄스(공격 1차 commit 후). */
          if (!aebShareBlockedByInvulnPrimary && (aebShareDmgPrimaryForRider > 0 || aebShareAbsorbedPrimary > 0)) {
            const aebRiderKey = aebeolaekingRiderSlotKey(player as "A" | "B", slot as "is" | "m" | "os");
            const aebShownDmg = aebShareDmgPrimaryForRider + aebShareAbsorbedPrimary;
            if (aebShownDmg > 0) {
              showDamageNumber(aebRiderKey, aebShownDmg);
              window.setTimeout(() => triggerCardFlash(aebRiderKey, "aebeolaekingParasiteTick"), 0);
            }
          }

          const tgt = `${player}-${slot}`;
          const atkKey = `${attackerPlayer}-${attackerSlotName}`;
          if (reflectLibutyOnAggressorResult && reflectLibutyOnAggressorResult.hpLoss > 0) {
            showDamageNumber(
              atkKey,
              LIBUTY_REFLECT_PURE_DAMAGE,
              mergeKalliPureDamageFloat(LIBUTY_REFLECT_PURE_DAMAGE)
            );
          }
          if (reflectLibutyOnAggressorResult?.baekseuLastStand) {
            window.setTimeout(() => triggerCardFlash(atkKey, "kalliBuffBan"), 0);
          }
          if (pakkiDebuffPrimary) {
            triggerCardFlash(atkKey, "pakkiDeathCurse");
          }
          const dkFacingLibuty = facingOppUnitAtSlot(state!, attackerPlayer, attackerSlotName);
          const dkFullSoulStrike =
            attackerCard.name === DARK_KNIGHT_ID &&
            darkKnightSoulGaugeFullForCombat(attackerCard, dkFacingLibuty) &&
            actualPrimaryDamage > 0;
          const maxellFullStrikeVfx =
            attackerCard.name === MAXELLAND_ID &&
            maxellandTenacityGaugeFullForCombat(attackerCard, dkFacingLibuty) &&
            actualPrimaryDamage > 0;
          const pakkiDestroyedPrimary =
            isDestroyed && String(card?.name ?? "").trim() === PAKKI_ID;
          /* 능력 발동 이펙트 — 고스톤 처치(1차 공격) */
          if (pakkiDestroyedPrimary) {
            const dkKillExtrasPrimary =
              attackerCard.name === DARK_KNIGHT_ID && dkFullSoulStrike
                ? ({ dkFullGaugeNavyDamageText: true } as const)
                : undefined;
            showPakkiSlainDamageOnTarget(
              tgt,
              actualPrimaryDamage,
              mergeKalliPureDamageFloat(kalliPurePrimary, dkKillExtrasPrimary)
            );
            if (
              attackerCard.name === GHOSTONE_ID &&
              shouldShowGhostoneKillVisualFeedback(
                attackerCard,
                facingOppUnitAtSlot(state!, attackerPlayer, attackerSlotName),
                true
              )
            ) {
              triggerGhostoneKillFlashOnAttacker(atkKey);
            } else if (
              attackerCard.name === DARK_KNIGHT_ID &&
              shouldPlayDarkKnightKillVfx(attackerCard, dkFacingLibuty)
            ) {
              triggerCardFlash(atkKey, "darkKnightKill");
            } else if (
              attackerCard.name === MAXELLAND_ID &&
              shouldPlayMaxellandKillVfx(attackerCard, dkFacingLibuty)
            ) {
              triggerCardFlash(atkKey, "maxellandKill");
            }
          } else if (
            isDestroyed &&
            attackerCard.name === GHOSTONE_ID &&
            shouldShowGhostoneKillVisualFeedback(
              attackerCard,
              facingOppUnitAtSlot(state!, attackerPlayer, attackerSlotName),
              true
            )
          ) {
            showGhostoneKillDamageOnTarget(tgt, actualPrimaryDamage, mergeKalliPureDamageFloat(kalliPurePrimary));
            triggerGhostoneKillFlashOnAttacker(atkKey);
          } else if (isDestroyed && attackerCard.name === GHOSTONE_ID) {
            showDamageNumber(tgt, actualPrimaryDamage, mergeKalliPureDamageFloat(kalliPurePrimary));
          } else if (
            isDestroyed &&
            attackerCard.name === DARK_KNIGHT_ID &&
            shouldPlayDarkKnightKillVfx(attackerCard, dkFacingLibuty)
          ) {
            showDarkKnightKillDamageOnTarget(
              tgt,
              actualPrimaryDamage,
              atkKey,
              mergeKalliPureDamageFloat(kalliPurePrimary, dkFullSoulStrike ? { dkFullGaugeNavyDamageText: true } : undefined)
            );
          } else if (isDestroyed && attackerCard.name === DARK_KNIGHT_ID) {
            showDamageNumber(tgt, actualPrimaryDamage, mergeKalliPureDamageFloat(kalliPurePrimary));
          } else if (isDestroyed && attackerCard.name === MAXELLAND_ID) {
            const maxellFacingPri = facingOppUnitAtSlot(state!, attackerPlayer, attackerSlotName);
            if (shouldPlayMaxellandKillVfx(attackerCard, maxellFacingPri)) {
              showMaxellandKillDamageOnTarget(
                tgt,
                actualPrimaryDamage,
                atkKey,
                mergeKalliPureDamageFloat(kalliPurePrimary),
                attackerCard,
                maxellFacingPri
              );
            } else {
              showDamageNumber(tgt, actualPrimaryDamage, mergeKalliPureDamageFloat(kalliPurePrimary));
            }
          } else if (
            isDestroyed &&
            isStartingWraithTrueStrikeBasicAttacker(attackerCard, attackerFacingOppPrimary)
          ) {
            showStartingWraithChainKillOnTarget(
              tgt,
              actualPrimaryDamage,
              mergeStartingWraithTrueStrikeDamageFloat(mergeKalliPureDamageFloat(kalliPurePrimary))
            );
            triggerStartingWraithChainKillFlashOnAttacker(atkKey);
          } else if (
            attackerCard.name === PHILIP_ID &&
            attackType === "NORMAL" &&
            actualPrimaryDamage > 0
          ) {
            showPhilipBasicHitDamage(tgt, actualPrimaryDamage, mergeKalliPureDamageFloat(kalliPurePrimary));
          } else if (
            attackerCard.name === CHEOLGIBYEONG_ID &&
            attackType === "NORMAL" &&
            actualPrimaryDamage > 0
          ) {
            showCheolgibyeongBasicHitDamage(tgt, actualPrimaryDamage, mergeKalliPureDamageFloat(kalliPurePrimary));
          } else if (dkFullSoulStrike) {
            showDarkKnightFullSoulStrikeOnTarget(tgt, actualPrimaryDamage, mergeKalliPureDamageFloat(kalliPurePrimary));
          } else if (maxellFullStrikeVfx) {
            showMaxellandFullGaugeStrikeDamageOnTarget(tgt, actualPrimaryDamage, mergeKalliPureDamageFloat(kalliPurePrimary));
          } else if (
            isStartingWraithTrueStrikeBasicAttacker(attackerCard, attackerFacingOppPrimary) &&
            attackType === "NORMAL" &&
            actualPrimaryDamage > 0
          ) {
            showStartingWraithTrueStrikeDamageOnTarget(
              tgt,
              actualPrimaryDamage,
              mergeStartingWraithTrueStrikeDamageFloat(mergeKalliPureDamageFloat(kalliPurePrimary))
            );
          } else {
            showDamageNumber(tgt, actualPrimaryDamage, mergeKalliPureDamageFloat(kalliPurePrimary));
          }
          if (baekseuLastStandPrimary) {
            window.setTimeout(() => triggerCardFlash(tgt, "kalliBuffBan"), 0);
          }
          triggerGeunyangMojaHitFlame(attackerCard, `${player}-${slot}`, actualPrimaryDamage);
          triggerDiagoHitFlame(attackerCard, `${player}-${slot}`, actualPrimaryDamage);
          triggerMomoHitFlame(attackerCard, `${player}-${slot}`, actualPrimaryDamage);
          triggerGhostoneClawHit(attackerCard, `${player}-${slot}`, actualPrimaryDamage, "primary");
          triggerIversonClawHit(attackerCard, `${player}-${slot}`, actualPrimaryDamage, "primary");
          triggerEristinaHitLine(attackerCard, `${player}-${slot}`, actualPrimaryDamage, "primary");
          if (morningMoodDeathHeal > 0) {
            const deadSideSnap = player === "A" ? state!.playerA.field : state!.playerB.field;
            const oppSnap = player === "A" ? state!.playerB.field : state!.playerA.field;
            (["is", "m", "os"] as const).forEach(s => {
              if (s === slot) return;
              const unit = deadSideSnap[s];
              if (!unit) return;
              const healed = Math.min(Number(unit.hp) - unit.currentHp, morningMoodDeathHeal);
              if (healed > 0) showHealNumber(`${player}-${s}`, healed);
            });
            (["is", "m", "os"] as const).forEach(s => {
              const host = oppSnap[s];
              const rider = host?.parasiteRider;
              if (!rider || getAebeolaekingRiderTrueOwner(rider) !== player) return;
              const healed = Math.min(Number(rider.hp) - (rider.currentHp ?? 0), morningMoodDeathHeal);
              if (healed > 0) showHealNumber(aebeolaekingRiderSlotKey(player, s), healed);
            });
          }
          if (startingTreeAllyHeal > 0) {
            const sideSnap = player === "A" ? state!.playerA.field : state!.playerB.field;
            const oppSnap = player === "A" ? state!.playerB.field : state!.playerA.field;
            (["is", "m", "os"] as const).forEach(s => {
              if (s === slot) return;
              const unit = sideSnap[s];
              if (!unit) return;
              const healed = Math.min(Number(unit.hp) - unit.currentHp, startingTreeAllyHeal);
              if (healed > 0) showHealNumber(`${player}-${s}`, healed);
            });
            (["is", "m", "os"] as const).forEach(s => {
              const host = oppSnap[s];
              const rider = host?.parasiteRider;
              if (!rider || getAebeolaekingRiderTrueOwner(rider) !== player) return;
              const healed = Math.min(Number(rider.hp) - (rider.currentHp ?? 0), startingTreeAllyHeal);
              if (healed > 0) showHealNumber(aebeolaekingRiderSlotKey(player, s), healed);
            });
          }
          if (attackerHealFromHit > 0) {
            if (
              shouldShowGhostoneKillFullHealFeedback(
                attackerCard,
                facingOppUnitAtSlot(state!, attackerPlayer, attackerSlotName),
                attackerHealFromHit,
                isDestroyed
              )
            ) {
              showHealNumberAfterGhostoneKillFlash(atkKey, attackerHealFromHit);
            } else if (
              isDestroyed &&
              attackerCard.name === DARK_KNIGHT_ID &&
              shouldPlayDarkKnightKillVfx(attackerCard, dkFacingLibuty)
            ) {
              showHealNumberAfterDarkKnightKillFlash(atkKey, attackerHealFromHit);
            } else {
              showHealNumber(atkKey, attackerHealFromHit);
            }
          }
          if (fieldHealAmountPrimary > 0) {
            const allySnapPrimary = attackerPlayer === "A" ? state!.playerA.field : state!.playerB.field;
            (["is", "m", "os"] as const).forEach(s => {
              const u = allySnapPrimary[s];
              if (!u) return;
              const healed = computeFieldAllyHealApplied(
                u,
                fieldHealAmountPrimary,
                attackerCard,
                attackerSlotName,
                s
              );
              if (healed > 0) showHealNumber(`${attackerPlayer}-${s}`, healed);
            });
          }

          if ((attackType === "ADDITION" || attackType === "MULTIPLICATION") && secondaryHits > 0 && secondaryDamage > 0 && !willBeEmpty) {
            const targetId = `${player}-${slot}`;
            setPendingSecondaryAttack({
              attackerPlayer,
              attackerSlotName,
              damage: secondaryDamage,
              hitsRemaining: secondaryHits,
              hitTargets: [targetId],
            });
          }

          if (keepWraithChainForNextEnemy) {
            applyStartingWraithChainPending({
              attackerPlayer,
              attackerSlot: attackerSlotName,
              targetKind: "enemyUnit",
            });
          } else if (wraithSeeksPlayerAfterClear) {
            applyStartingWraithChainPending({
              attackerPlayer,
              attackerSlot: attackerSlotName,
              targetKind: "playerHp",
            });
          } else {
            applyStartingWraithChainPending(null);
          }
          };
          runElWingDeferrablePrimaryHit();
        }
      }
      
      setAttackOptionOverride(null);
      if (!keepAttackingModeForStartingWraithChain) {
        setAttackingSlot(null);
      }
      notifyMultiplaySync();
      return;
    }

    if (!card) return; 
    const slotId = `${player}-${slot}`;
    setSelectedSlot(prev => prev === slotId ? null : slotId); 
  };

  const legendarySwordHasTargetableEnemyUnit = (
    pls: NonNullable<typeof pendingLegendarySwordStrike>
  ): boolean => {
    if (!state) return false;
    const enemy = pls.ownerPlayer === "A" ? "B" : "A";
    const enemyField = enemy === "A" ? state.playerA.field : state.playerB.field;
    for (const slotName of ["is", "m", "os"] as const) {
      const c = enemyField[slotName];
      if (!c || (c.currentHp ?? 0) <= 0) continue;
      const targetId = `${enemy}-${slotName}`;
      if (pls.hitTargets.includes(targetId)) continue;
      if (
        !canEnemyFieldSourceTargetMaengsugyeonPo(
          pls.ownerPlayer,
          pls.swordSlot,
          enemy,
          slotName,
          c,
          getUnitFacingOppAtSlot(enemy, slotName, state.playerA.field, state.playerB.field)
        )
      ) {
        continue;
      }
      return true;
    }
    return false;
  };

  const isTargetable = (targetPlayer: "A" | "B", slotName: string, card: FieldCard | null) => {
    const targetId = `${targetPlayer}-${slotName}`;

    const eondeokDragMode = ((): "off" | "yes" | "no" => {
      if (!state || !handDrag || winner) return "off";
      if (pendingSkill || pendingSecondaryAttack || pendingLegendarySwordStrike || attackingSlot || pendingLibutyAllEnemiesAttack || pendingElWingSinseokDefense) return "off";
      if (state.bubbleStationPending) return "off";
      if (!isEnemyUnitDragTargetSpell(handDrag.card)) return "off";
      if (state.currentTurn !== handDrag.player) return "off";
      if (slotName === "spell") return "no";
      const opp = handDrag.player === "A" ? "B" : "A";
      if (targetPlayer !== opp) return "no";
      if (!card) return "no";
      const tokens = handDrag.player === "A" ? state.playerA.tokens : state.playerB.tokens;
      const cost = Number(handDrag.card.cost) || 0;
      if (tokens < cost) return "no";
      if (handDrag.card.name === BEONGGAE_SPELL_ID) {
        if (
          isElWingBlockingEnemyAttackSpell(
            card,
            targetPlayer,
            slotName as "is" | "m" | "os",
            state.playerA.field,
            state.playerB.field
          )
        ) {
          return "yes";
        }
        if (!isBeonggaeValidTargetUnit(card)) return "no";
      }
      return "yes";
    })();
    if (eondeokDragMode === "yes") return true;
    if (eondeokDragMode === "no") return false;

    const orietDragMode = ((): "off" | "yes" | "no" => {
      if (!state || !handDrag || winner) return "off";
      if (pendingSkill || pendingSecondaryAttack || pendingLegendarySwordStrike || attackingSlot || pendingLibutyAllEnemiesAttack || pendingElWingSinseokDefense) return "off";
      if (state.bubbleStationPending) return "off";
      if (!isSpellCardRow(handDrag.card) || !isOrietChosangSpellCard(handDrag.card)) return "off";
      if (state.currentTurn !== handDrag.player) return "off";
      if (slotName === "spell") return "no";
      if (targetPlayer !== handDrag.player) return "no";
      if (!card || (card.currentHp ?? 0) <= 0) return "no";
      const tokens = handDrag.player === "A" ? state.playerA.tokens : state.playerB.tokens;
      const cost = Number(handDrag.card.cost) || 0;
      if (tokens < cost) return "no";
      return "yes";
    })();
    if (orietDragMode === "yes") return true;
    if (orietDragMode === "no") return false;

    if (pendingSkill && pendingSkill.name === PENDING_SKILL.GONCHUNG_HIDDEN_PEEK) {
      const caster = pendingSkill.player;
      const opp = caster === "A" ? "B" : "A";
      if (targetPlayer !== opp || slotName !== "spell") return false;
      const oppField = opp === "A" ? state!.playerA.field : state!.playerB.field;
      return spellStackHasHiddenSpell(oppField);
    }

    if (!card) return false;
    
    if (pendingSkill && pendingSkill.name === PENDING_SKILL.ERISTINA_BANJITGORI) {
        return pendingSkill.player === targetPlayer && slotName !== "spell" && slotName !== pendingSkill.slot;
    }

    if (pendingSkill && pendingSkill.name === PENDING_SKILL.LIME_BUBBLE_SHIELD) {
      return pendingSkill.player === targetPlayer && slotName !== "spell" && slotName !== pendingSkill.slot;
    }

    if (pendingSecondaryAttack) {
      if (pendingSecondaryAttack.allyHealOnly) {
        return (
          pendingSecondaryAttack.attackerPlayer === targetPlayer &&
          slotName !== "spell" &&
          slotName !== pendingSecondaryAttack.attackerSlotName &&
          !pendingSecondaryAttack.hitTargets.includes(targetId) &&
          card != null
        );
      }
      if (
        !startingHeraldBasicAttackIgnoresTauntTargetingRestrictions(
          (pendingSecondaryAttack.attackerPlayer === "A" ? state!.playerA.field : state!.playerB.field)[
            pendingSecondaryAttack.attackerSlotName
          ],
          facingOppUnitAtSlot(
            state!,
            pendingSecondaryAttack.attackerPlayer,
            pendingSecondaryAttack.attackerSlotName
          )
        ) &&
        !canEnemyFieldSourceTargetMaengsugyeonPo(
          pendingSecondaryAttack.attackerPlayer,
          pendingSecondaryAttack.attackerSlotName,
          targetPlayer,
          slotName as "is" | "m" | "os",
          card,
          getUnitFacingOppAtSlot(
            targetPlayer,
            slotName as "is" | "m" | "os",
            state!.playerA.field,
            state!.playerB.field
          )
        )
      ) {
        return false;
      }
      return pendingSecondaryAttack.attackerPlayer !== targetPlayer && !pendingSecondaryAttack.hitTargets.includes(targetId);
    }

    if (pendingLegendarySwordStrike) {
      const pls = pendingLegendarySwordStrike;
      const enemy = pls.ownerPlayer === "A" ? "B" : "A";
      if (targetPlayer !== enemy || slotName === "spell") return false;
      if (!card || (card.currentHp ?? 0) <= 0) return false;
      if (pls.hitTargets.includes(targetId)) return false;
      if (
        !canEnemyFieldSourceTargetMaengsugyeonPo(
          pls.ownerPlayer,
          pls.swordSlot,
          targetPlayer,
          slotName as "is" | "m" | "os",
          card,
          getUnitFacingOppAtSlot(
            targetPlayer,
            slotName as "is" | "m" | "os",
            state!.playerA.field,
            state!.playerB.field
          )
        )
      ) {
        return false;
      }
      return true;
    }
    
    if (attackingSlot) {
      const [attackerPlayer, attackerSlotName] = attackingSlot.split("-");
      const attackerCard = (attackerPlayer === "A" ? state!.playerA.field : state!.playerB.field)[
        attackerSlotName as "is" | "m" | "os"
      ];

      if (
        isRyeomchoSelfHealBasicAttackSealed(
          attackerCard,
          getUnitFacingOppAtSlot(
            attackerPlayer as "A" | "B",
            attackerSlotName as "is" | "m" | "os",
            state!.playerA.field,
            state!.playerB.field
          )
        )
      ) {
        return targetPlayer === attackerPlayer && slotName === attackerSlotName;
      }

      if (isRanigo(attackerCard)) {
        if (
          isRanigoAllyHealBasicAttackSealed(
            attackerCard,
            getUnitFacingOppAtSlot(
              attackerPlayer as "A" | "B",
              attackerSlotName as "is" | "m" | "os",
              state!.playerA.field,
              state!.playerB.field
            )
          )
        ) {
          return false;
        }
        return (
          targetPlayer === attackerPlayer &&
          slotName !== "spell" &&
          slotName !== attackerSlotName &&
          card != null
        );
      }

      if (attackerPlayer !== targetPlayer) {
        const targetPlayerState = targetPlayer === "A" ? state!.playerA : state!.playerB;
        const oppFieldForTaunt2 = targetPlayer === "A" ? state!.playerB.field : state!.playerA.field;
        const tauntCtxBase2 = {
          playerAField: state!.playerA.field,
          playerBField: state!.playerB.field,
        };
        const slotsTaunt2 = ["is", "m", "os"] as const;
        const tauntExists = slotsTaunt2.some(s => {
          const c = targetPlayerState.field[s];
          if (!c) return false;
          return isTaunting(c, oppFieldForTaunt2[s] ?? null, targetPlayerState.field, {
            ...tauntCtxBase2,
            mySlotKey: `${targetPlayer}-${s}`,
          });
        });

        const startingHeraldAbsTarget = startingHeraldBasicAttackIgnoresTauntTargetingRestrictions(
          attackerCard,
          facingOppUnitAtSlot(state!, attackerPlayer as "A" | "B", attackerSlotName as "is" | "m" | "os")
        );

        if (tauntExists) {
          if (
            !startingHeraldAbsTarget &&
            !isTaunting(
              card,
              oppFieldForTaunt2[slotName as "is" | "m" | "os"] ?? null,
              targetPlayerState.field,
              { ...tauntCtxBase2, mySlotKey: `${targetPlayer}-${slotName}` }
            )
          ) {
            return false;
          }
        }

        if (
          shouldEnforceIversonNearestEnemyTargeting(
            attackerCard,
            getUnitFacingOppAtSlot(
              attackerPlayer as "A" | "B",
              attackerSlotName as "is" | "m" | "os",
              state!.playerA.field,
              state!.playerB.field
            )
          )
        ) {
          const allowed = getIversonClosestEnemyTargetSlots(
            attackerSlotName as "is" | "m" | "os",
            { is: targetPlayerState.field.is, m: targetPlayerState.field.m, os: targetPlayerState.field.os },
            tauntExists,
            {
              playerAField: state!.playerA.field,
              playerBField: state!.playerB.field,
              defenderPlayer: targetPlayer as "A" | "B",
            }
          );
          if (!allowed.includes(slotName as "is" | "m" | "os")) return false;
        }

        if (
          !startingHeraldAbsTarget &&
          !canEnemyFieldSourceTargetMaengsugyeonPo(
            attackerPlayer as "A" | "B",
            attackerSlotName as "is" | "m" | "os",
            targetPlayer as "A" | "B",
            slotName as "is" | "m" | "os",
            card,
            getUnitFacingOppAtSlot(
              targetPlayer as "A" | "B",
              slotName as "is" | "m" | "os",
              state!.playerA.field,
              state!.playerB.field
            )
          )
        ) {
          return false;
        }

        return true;
      }
    }
    return false;
  };

  /**
   * 손패에서 유닛 카드를 드래그 중일 때, 배치 가능한 유닛 슬롯에 펄스 하이라이트.
   * - 일반 유닛: 자기 진영 빈 슬롯에 흰 펄스.
   * - 애벌레킹(W): 적 진영 점유 슬롯(부착 가능 host)에 갈색 펄스.
   * - 귀환: 자기 진영 빈 슬롯에 인디고 펄스.
   */
  const getHandDragUnitPlacementPulseClass = (
    player: "A" | "B",
    slot: "is" | "m" | "os",
    fieldCard: FieldCard | null
  ): string => {
    if (!handDrag || !state || winner) return "";
    if (state.currentTurn !== handDrag.player) return "";

    /* 애벌레킹(W) — 적 진영 점유 슬롯(부착 가능 host)에 갈색 펄스 */
    if (isAebeolaekingCard(handDrag.card)) {
      if (handDrag.player === player) return "";
      if (!fieldCard || (fieldCard.currentHp ?? 0) <= 0) return "";
      const can = canHandDragAttachAebeolaekingTo(handDrag.player, player, fieldCard);
      if (!can.ok) return "";
      const tokens = handDrag.player === "A" ? state.playerA.tokens : state.playerB.tokens;
      const cost = Number(handDrag.card.cost) || 0;
      if (tokens < cost) return "";
      if (isRonuBlockingSpellHandPlayAt(state, handDrag)) return "";
      return "border-[3px] border-amber-500/95 bg-amber-950/35 shadow-[0_0_28px_rgba(180,83,9,0.85),0_0_48px_rgba(217,119,6,0.55)] animate-pulse cursor-crosshair z-20";
    }

    if (handDrag.player !== player) return "";
    if (fieldCard !== null) return "";

    if (isGuihwanSpellCard(handDrag.card)) {
      const tokens = player === "A" ? state.playerA.tokens : state.playerB.tokens;
      const cost = Number(handDrag.card.cost) || 0;
      if (tokens < cost) return "";
      if (isRonuBlockingSpellHandPlayAt(state, handDrag)) return "";
      const revivable = getGuihwanRevivableRewindIndices(
        state.rewindCards,
        handDrag.player,
        state.unitCombatStats
      );
      if (revivable.length === 0) return "";
      return "border-[3px] border-indigo-400/95 bg-indigo-950/45 shadow-[0_0_28px_rgba(99,102,241,0.75)] animate-pulse cursor-crosshair z-20";
    }

    if (isSpellCardRow(handDrag.card)) return "";

    const tokens = player === "A" ? state.playerA.tokens : state.playerB.tokens;
    const cost = Number(handDrag.card.cost) || 0;
    if (tokens < cost) return "";

    return "border-[3px] border-white bg-white/20 shadow-[0_0_25px_rgba(255,255,255,0.9)] animate-pulse cursor-crosshair z-20";
  };

  const handDragSpellSlotHoverGlow = (player: "A" | "B") =>
    handDragHoverSlotKey === `${player}-spell`
      ? " ring-2 ring-white/95 shadow-[0_0_0_1px_rgba(255,255,255,0.9),0_0_28px_rgba(255,255,255,0.85),0_0_48px_rgba(255,255,255,0.45),inset_0_0_14px_rgba(255,255,255,0.12)] z-[25]"
      : "";

  /** 손패 스펠 드래그 중 자기 스펠 칸 — 유닛 빈 칸과 동형 하이라이트(겹침 시 흰 외곽선 강조) */
  const getHandDragSpellSlotPlacementPulseClass = (player: "A" | "B"): string => {
    if (!handDrag || !state || winner) return "";
    if (!canHandDragPlaceSpellOnOwnSpellSlot(handDrag, state, player)) return "";
    const field = player === "A" ? state.playerA.field : state.playerB.field;
    const stackLen = normalizeSpellStack(field).length;
    if (stackLen > 0) {
      return "pp-spell-slot-drag-stack-pulse cursor-crosshair";
    }
    if (
      handDrag.card.name === BANG_EOMAK_SPELL_ID ||
      handDrag.card.name === CHEOLBYEOK_SPELL_ID
    ) {
      return "";
    }
    return "border-[3px] border-white bg-white/20 shadow-[0_0_25px_rgba(255,255,255,0.9)] animate-pulse cursor-crosshair z-20";
  };

  /** 스펠 No.8 방어막 — 자기 스펠칸에 드래그 중일 때 슬롯 펄스(초록·연두 톤). 겹침 허용 후에도 표시 */
  const getHandDragBangEomakSpellSlotPulseClass = (player: "A" | "B"): string => {
    if (!handDrag || !state || winner) return "";
    if (!canHandDragPlaceSpellOnOwnSpellSlot(handDrag, state, player)) return "";
    if (handDrag.card.name !== BANG_EOMAK_SPELL_ID) return "";
    const field = player === "A" ? state.playerA.field : state.playerB.field;
    if (normalizeSpellStack(field).length > 0) return "";
    return "border-[3px] border-lime-300/95 bg-gradient-to-br from-emerald-500/30 to-lime-400/22 shadow-[0_0_26px_rgba(163,230,53,0.55),0_0_42px_rgba(52,211,153,0.35)] animate-pulse z-[18]";
  };

  /** 스펠 No.47 철벽 — 자기 스펠칸에 드래그 중일 때 슬롯 펄스(밝은 슬레이트·흰 톤). 겹침 허용 후에도 표시 */
  const getHandDragCheolbyeokSpellSlotPulseClass = (player: "A" | "B"): string => {
    if (!handDrag || !state || winner) return "";
    if (!canHandDragPlaceSpellOnOwnSpellSlot(handDrag, state, player)) return "";
    if (handDrag.card.name !== CHEOLBYEOK_SPELL_ID) return "";
    const field = player === "A" ? state.playerA.field : state.playerB.field;
    if (normalizeSpellStack(field).length > 0) return "";
    return "border-[3px] border-slate-100/95 bg-gradient-to-br from-slate-200/35 to-slate-50/22 shadow-[0_0_26px_rgba(248,250,252,0.65),0_0_42px_rgba(148,163,184,0.4)] animate-pulse z-[18]";
  };

  /** 스펠 No.30 비즈니스 강도단 — 자기 스펠칸에 드래그 중일 때 슬롯 펄스(주황). 겹침 시 공통 스택 펄스 */
  const getHandDragBusinessGangSpellSlotPulseClass = (player: "A" | "B"): string => {
    if (!handDrag || !state || winner) return "";
    if (!canHandDragPlaceSpellOnOwnSpellSlot(handDrag, state, player)) return "";
    if (handDrag.card.name !== BUSINESS_GANG_SPELL_ID) return "";
    const field = player === "A" ? state.playerA.field : state.playerB.field;
    if (normalizeSpellStack(field).length > 0) return "";
    return "border-[3px] border-orange-400/95 bg-gradient-to-br from-orange-600/35 to-amber-500/22 shadow-[0_0_26px_rgba(249,115,22,0.55),0_0_42px_rgba(234,88,12,0.38)] animate-pulse z-[18]";
  };

  /** 스펠 No.55 베프끼리 — 자기 스펠칸에 드래그 중일 때 슬롯 펄스(파랑). 겹침 시 공통 스택 펄스 */
  const getHandDragBefpkkiriSpellSlotPulseClass = (player: "A" | "B"): string => {
    if (!handDrag || !state || winner) return "";
    if (!canHandDragPlaceSpellOnOwnSpellSlot(handDrag, state, player)) return "";
    if (!isBefpkkiriSpellCard(handDrag.card)) return "";
    const field = player === "A" ? state.playerA.field : state.playerB.field;
    if (normalizeSpellStack(field).length > 0) return "";
    return "border-[3px] border-blue-400/95 bg-gradient-to-br from-blue-600/35 to-sky-500/22 shadow-[0_0_26px_rgba(96,165,250,0.55),0_0_42px_rgba(59,130,246,0.38)] animate-pulse z-[18]";
  };

  /** 스펠 No.56 보글보글 스테이션 — 자기 스펠칸에 드래그 중일 때 슬롯 펄스(시안). 겹침 시 공통 스택 펄스 */
  const getHandDragBubbleStationSpellSlotPulseClass = (player: "A" | "B"): string => {
    if (!handDrag || !state || winner) return "";
    if (!canHandDragPlaceSpellOnOwnSpellSlot(handDrag, state, player)) return "";
    if (!isBubbleStationSpellCard(handDrag.card)) return "";
    const field = player === "A" ? state.playerA.field : state.playerB.field;
    if (normalizeSpellStack(field).length > 0) return "";
    return "border-[3px] border-cyan-400/95 bg-gradient-to-br from-cyan-600/35 to-sky-500/22 shadow-[0_0_26px_rgba(34,211,238,0.55),0_0_42px_rgba(8,145,178,0.38)] animate-pulse z-[18]";
  };

  /** 스펠 칸 맨 위 카드 — 지속 스펠 남은 ×턴(B: 왼쪽 아래, A: 오른쪽 위) */
  const renderFieldSpellDurationBadge = (
    field: PlayerState["field"],
    player: "A" | "B"
  ) => {
    const top = getTopSpellFromField(field);
    const info = getSpellDurationBadgeInfo(top);
    if (!info) return null;

    const positionClass =
      player === "B" ? "bottom-0.5 left-0.5" : "top-0.5 right-0.5";

    return (
      <div
        className={`pointer-events-none absolute ${positionClass} z-[28] rounded border px-1 py-px text-[9px] font-black tabular-nums ${SPELL_DURATION_BADGE_TONE_CLASS[info.tone]}`}
        aria-hidden
      >
        {`${info.turnCount}*`}
      </div>
    );
  };

  const isStartingHeraldPrivilegeTargetOutlineVisible = (
    targetPlayer: "A" | "B",
    slot: "is" | "m" | "os",
    card: FieldCard | null
  ): boolean => {
    if (!state || !card) return false;

    let attackerPlayer: "A" | "B" | null = null;
    let attackerSlot: "is" | "m" | "os" | null = null;
    let attackerCard: FieldCard | null = null;

    if (attackingSlot) {
      const [ap, as] = attackingSlot.split("-") as ["A" | "B", "is" | "m" | "os"];
      attackerPlayer = ap;
      attackerSlot = as;
      attackerCard = (ap === "A" ? state.playerA.field : state.playerB.field)[as];
    } else if (pendingSecondaryAttack && !pendingSecondaryAttack.allyHealOnly) {
      attackerPlayer = pendingSecondaryAttack.attackerPlayer;
      attackerSlot = pendingSecondaryAttack.attackerSlotName;
      attackerCard =
        (attackerPlayer === "A" ? state.playerA.field : state.playerB.field)[attackerSlot];
    } else {
      return false;
    }

    if (!attackerCard || attackerCard.name !== STARTING_HERALD_ID) return false;
    if (!isTargetable(targetPlayer, slot, card)) return false;

    return isStartingHeraldExclusiveBasicAttackTarget(
      {
        attackerPlayer,
        attackerSlot,
        attackerCard,
        targetPlayer,
        targetSlot: slot,
        targetCard: card,
        playerAField: state.playerA.field,
        playerBField: state.playerB.field,
      },
      facingOppUnitAtSlot(state, attackerPlayer, attackerSlot)
    );
  };

  /** 시작의 전령 — 절대 타겟팅으로만 선택 가능한 적의 청록 윤곽(공격 대상 깜빡임과 동시) */
  const renderStartingHeraldPrivilegeTargetOutline = (
    player: "A" | "B",
    slot: "is" | "m" | "os",
    card: FieldCard | null
  ) => {
    if (!isStartingHeraldPrivilegeTargetOutlineVisible(player, slot, card)) return null;
    return (
      <div
        className="pointer-events-none absolute inset-0 z-[33] overflow-visible rounded-[8px] pp-starting-herald-privilege-target-outline"
        aria-hidden
      />
    );
  };

  const getTargetableClass = (targetPlayer: "A" | "B", slotName: string, card: FieldCard | null) => {
    if (
      handDrag &&
      isGuihwanSpellCard(handDrag.card) &&
      state?.currentTurn === handDrag.player &&
      targetPlayer === handDrag.player &&
      (slotName === "is" || slotName === "m" || slotName === "os") &&
      !card
    ) {
      const revivable = getGuihwanRevivableRewindIndices(
        state.rewindCards,
        handDrag.player,
        state.unitCombatStats
      );
      if (revivable.length > 0) {
        return "border-[3px] border-indigo-400/95 bg-indigo-950/45 shadow-[0_0_28px_rgba(99,102,241,0.75)] animate-pulse cursor-crosshair z-20";
      }
    }

    if (!isTargetable(targetPlayer, slotName, card)) return "";

    if (pendingSkill && pendingSkill.name === PENDING_SKILL.GONCHUNG_HIDDEN_PEEK) {
      return "border-[3px] border-white bg-white/20 shadow-[0_0_25px_rgba(255,255,255,0.9)] animate-pulse cursor-pointer z-20";
    }

    if (pendingSkill && pendingSkill.name === PENDING_SKILL.ERISTINA_BANJITGORI) {
          return 'border-[3px] border-pink-400 bg-pink-500/20 shadow-[0_0_25px_rgba(244,114,182,0.9)] animate-pulse cursor-pointer z-20';
      }

      if (pendingSkill && pendingSkill.name === PENDING_SKILL.LIME_BUBBLE_SHIELD) {
        return "border-[3px] border-sky-400 bg-sky-500/20 shadow-[0_0_25px_rgba(56,189,248,0.9)] animate-pulse cursor-pointer z-20";
      }

      if (
        handDrag &&
        isSpellCardRow(handDrag.card) &&
        isOrietChosangSpellCard(handDrag.card) &&
        state?.currentTurn === handDrag.player &&
        targetPlayer === handDrag.player
      ) {
        return "border-[3px] border-sky-400 bg-sky-500/25 shadow-[0_0_26px_rgba(56,189,248,0.88)] animate-pulse cursor-pointer z-20";
      }

      if (pendingSecondaryAttack?.allyHealOnly) {
        return "border-[3px] border-emerald-400 bg-emerald-500/20 shadow-[0_0_25px_rgba(52,211,153,0.85)] animate-pulse cursor-pointer z-20";
      }

      if (pendingLegendarySwordStrike) {
        return "border-[3px] border-sky-400 bg-sky-500/25 shadow-[0_0_26px_rgba(56,189,248,0.88)] animate-pulse cursor-crosshair z-20";
      }

      if (
        pendingStartingWraithChainKill &&
        attackingSlot ===
          `${pendingStartingWraithChainKill.attackerPlayer}-${pendingStartingWraithChainKill.attackerSlotName}`
      ) {
        return "border-[3px] border-amber-700 bg-amber-950/30 shadow-[0_0_28px_rgba(180,83,9,0.75)] animate-pulse cursor-crosshair z-20";
      }

      if (attackingSlot) {
        const [ap, aslot] = attackingSlot.split("-");
        const acard = (ap === "A" ? state!.playerA.field : state!.playerB.field)[aslot as "is" | "m" | "os"];
        if (
          isRyeomchoSelfHealBasicAttackSealed(
            acard,
            facingOppUnitAtSlot(state!, ap as "A" | "B", aslot as "is" | "m" | "os")
          )
        ) {
          return 'border-[3px] border-green-400 bg-green-500/20 shadow-[0_0_25px_rgba(74,222,128,0.9)] animate-pulse cursor-pointer z-20';
        }
        if (isRanigo(acard)) {
          if (
            isRanigoAllyHealBasicAttackSealed(
              acard,
              facingOppUnitAtSlot(state!, ap as "A" | "B", aslot as "is" | "m" | "os")
            )
          ) {
            return "";
          }
          return "border-[3px] border-emerald-400 bg-emerald-500/20 shadow-[0_0_25px_rgba(52,211,153,0.85)] animate-pulse cursor-pointer z-20";
        }
      }
      
      return 'border-[3px] border-white bg-white/20 shadow-[0_0_25px_rgba(255,255,255,0.9)] animate-pulse cursor-crosshair z-20';
  };

  // ⭐️ [신규] 코드가 길어지는 것을 방지하고 클래스 생성을 깔끔하게 관리하는 헬퍼 함수
  const getSlotClassName = (
    player: "A" | "B",
    slot: "is" | "m" | "os",
    card: FieldCard | null,
    cardStyle: string = fieldCardStyle
  ) => {
    const slotKeyForHover = `${player}-${slot}`;
    const handDragSlotHoverGlow =
      handDragHoverSlotKey === slotKeyForHover
        ? " ring-2 ring-white/95 shadow-[0_0_0_1px_rgba(255,255,255,0.9),0_0_28px_rgba(255,255,255,0.85),0_0_48px_rgba(255,255,255,0.45),inset_0_0_14px_rgba(255,255,255,0.12)] z-[25]"
        : "";

    if (
      card?.name === UNIT.LEGENDARY_SWORD &&
      pendingLegendarySwordStrike?.ownerPlayer === player &&
      pendingLegendarySwordStrike.swordSlot === slot
    ) {
      return `${cardStyle} pp-legendary-sword-charge-border pp-legendary-sword-charge-border--steady${handDragSlotHoverGlow}`;
    }

    if (card && isLegendarySwordCharging(card)) {
      const fast = card.legendarySwordChargeFastBlink ? " pp-legendary-sword-charge-border--fast" : "";
      return `${cardStyle} pp-legendary-sword-charge-border${fast}${handDragSlotHoverGlow}`;
    }

    if (
      state?.guihwanPending &&
      state.guihwanPending.ownerPlayer === player &&
      state.guihwanPending.slot === slot &&
      card &&
      isGuihwanSpellCard(card) &&
      card.statsInstanceId === state.guihwanPending.spellStatsInstanceId
    ) {
      return `${cardStyle} border-[3px] border-indigo-400/95 bg-indigo-950/50 shadow-[0_0_28px_rgba(99,102,241,0.85)] animate-pulse cursor-pointer z-20${handDragSlotHoverGlow}`;
    }

    const targetClass = getTargetableClass(player, slot, card);
    if (targetClass) return `${cardStyle} ${targetClass}${handDragSlotHoverGlow}`;

    const handDragPlacementClass = getHandDragUnitPlacementPulseClass(player, slot, card);
    if (handDragPlacementClass) {
      return `${cardStyle} ${handDragPlacementClass}${handDragSlotHoverGlow}`;
    }
    if (
      card &&
      (card as any).hasBanjitgori &&
      !callieBuffBanSuppressesBuffsForVictim(player, slot, state!.playerA.field, state!.playerB.field)
    ) {
      const banjitOutlineSuppressed =
        state &&
        isTauntSuppressedByRyeomhwaForUnitOwner(player, state.playerA.field, state.playerB.field);
      if (banjitOutlineSuppressed) {
        return `${cardStyle} z-10 border-[2px] border-purple-400/90 bg-purple-950/25 shadow-[0_0_12px_rgba(147,51,234,0.35)] ${!attackingSlot ? "cursor-pointer hover:border-purple-300" : ""}`;
      }
      return `${cardStyle} z-10 border-[2px] border-pink-400/90 bg-pink-950/25 shadow-[0_0_12px_rgba(236,72,153,0.35)] ${!attackingSlot ? "cursor-pointer hover:border-pink-300" : ""}`;
    }

    if (
      card?.name === MAXELLAND_ID &&
      state &&
      maxellandTenacityGaugeFullForCombat(card, facingOppUnitAtSlot(state, player, slot))
    ) {
      return `${cardStyle} z-10 border-[2px] border-red-600/95 bg-red-950/35 shadow-[0_0_12px_rgba(220,38,38,0.65),0_0_22px_rgba(249,115,22,0.42)] ${!attackingSlot ? "cursor-pointer hover:border-orange-500/90" : ""}`;
    }

    if (player === "A") {
      return `${cardStyle} border-sky-500/30 bg-sky-950/20 ${card && !attackingSlot ? "cursor-pointer hover:border-sky-400/80" : state?.currentTurn === "A" && !attackingSlot ? "hover:border-sky-400 transition-colors" : ""}`;
    }
    return `${cardStyle} border-blue-500/30 bg-blue-950/20 ${card && !attackingSlot ? "cursor-pointer hover:border-blue-400/80" : state?.currentTurn === "B" && !attackingSlot ? "hover:border-blue-400 transition-colors" : ""}`;
  };

  /** 효과 뱃지 표시 순서 (동일 카드에서 항상 이 순서) */
  const STATUS_BADGE_ORDER: readonly string[] = [
    "도발",
    "방어력 +200",
    BANG_EOMAK_DEFENSE_BADGE,
    "방어력 +400",
    "[무적]",
    "[공격력 +300]",
    DEBUFF_IMMUNITY_BADGE,
    EL_WING_MAGIC_IMMUNITY_BADGE,
    BUFF_BAN_BADGE,
    PAKKI_ATTACK_DEBUFF_BADGE,
    SUPPRESSION_DEBUFF_BADGE,
    "침묵",
    "혼란",
    "기절",
    "반짓고리",
    "집중 사격",
    YORIN_STATUS_BADGE,
  ];

  const sortStatusesForBadgeDisplay = (statuses: string[]) => {
    const rank = (s: string) => {
      const i = STATUS_BADGE_ORDER.indexOf(s);
      return i === -1 ? 999 : i;
    };
    return [...statuses].sort((a, b) => {
      const d = rank(a) - rank(b);
      return d !== 0 ? d : a.localeCompare(b);
    });
  };

  const getStatusBadgeSurfaceClass = (status: string) => {
    switch (status) {
      case "도발":
        return "bg-orange-600 border-orange-300 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)]";
      case "방어력 +200":
        return "bg-slate-500 border-slate-200 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)]";
      case BANG_EOMAK_DEFENSE_BADGE:
        return "bg-gradient-to-br from-emerald-500 to-lime-400 border-lime-100 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)] text-emerald-950";
      case "방어력 +400":
        return "bg-slate-100 border-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.55)]";
      case BAEKSEU_INVULN_BADGE:
        return "bg-slate-200 border-slate-50 text-slate-900 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.45)]";
      case "[공격력 +300]":
        return "bg-red-700 border-red-300 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)]";
      case DEBUFF_IMMUNITY_BADGE:
        return "bg-slate-400 border-slate-100 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.28)]";
      case EL_WING_MAGIC_IMMUNITY_BADGE:
        return "bg-gradient-to-br from-emerald-600 to-green-500 border-green-200 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)] text-emerald-950";
      case BUFF_BAN_BADGE:
        return "bg-red-800 border-red-300 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)]";
      case PAKKI_ATTACK_DEBUFF_BADGE:
        return "bg-amber-500 border-amber-200 shadow-[inset_0_0_0_1px_rgba(255,251,235,0.35)]";
      case SUPPRESSION_DEBUFF_BADGE:
        return "bg-orange-600 border-orange-300 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)]";
      case "반짓고리":
        return "bg-pink-600 border-pink-200 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)]";
      case "침묵":
      case "혼란":
        return "bg-violet-700 border-violet-300 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]";
      case "기절":
        return "bg-violet-700 border-violet-300 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]";
      case YORIN_STATUS_BADGE:
        return "bg-indigo-900 border-indigo-300 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]";
      case "집중 사격":
        return "bg-red-700 border-red-300 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)]";
      default:
        if (isMaxellandTenacityStatusBadge(status)) {
          return "bg-red-800 border-red-200 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)]";
        }
        return "bg-purple-700 border-purple-300 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]";
    }
  };

  /** 렴화 패시브로 [도발]이 무력화될 때 뱃지 색(유지·비활성 표시) */
  const RYEOMHWA_SUPPRESSED_TAUNT_BADGE_SURFACE =
    "bg-purple-700 border-purple-300 shadow-[inset_0_0_0_1px_rgba(233,213,255,0.35)]";

  /** `방어력 +200` — 철기병 패시브(슬레이트) vs 라임 보호막(하늘색) */
  const getStatusBadgeSurfaceClassForCard = (
    status: string,
    badgeCard: FieldCard,
    badgeOwner?: "A" | "B"
  ) => {
    if (
      status === "도발" &&
      badgeOwner &&
      state &&
      isTauntSuppressedByRyeomhwaForUnitOwner(badgeOwner, state.playerA.field, state.playerB.field)
    ) {
      return RYEOMHWA_SUPPRESSED_TAUNT_BADGE_SURFACE;
    }
    if (status === "방어력 +200" && badgeCard.hasLimeBubbleShieldBuff) {
      return "bg-sky-500 border-sky-100 text-slate-950 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.3)]";
    }
    return getStatusBadgeSurfaceClass(status);
  };

  /**
   * 필드 카드 특수 윤곽 링 z 순서 (높을수록 위):
   * z-33 맥셀렌드 [투지] 만축 외곽 붉은 광채 → z-31 소울·투지 만축 링 → z-32 맹수견 포 패시브(항상 붉은 글로우) → z-30 필립 마주 패시브(노랑) → z-29 반짓고리 부여 대상(핑크) → z-28 렴초·철기병 → z-27 메리 [방어력 +400].
   */
  const renderPhilipFacingRing = (
    player: "A" | "B",
    slot: "is" | "m" | "os",
    card: FieldCard | null
  ) => {
    if (!state || !card) return null;
    const philipOwner = player === "A" ? "B" : "A";
    if (
      !fieldSlotGrantsPhilipFacingSilence(
        philipOwner,
        slot,
        state.playerA.field,
        state.playerB.field
      )
    ) {
      return null;
    }
    return (
      <div
        className="pointer-events-none absolute inset-0 z-[30] overflow-visible rounded-[8px] pp-philip-facing-ring-overlay"
        aria-hidden
      />
    );
  };

  /** 디너 패시브 — 마주보는 적 [혼란](보라 뱃지, 필립 마주 링과 동형·보라 톤) */
  const renderDinnerFacingRing = (
    player: "A" | "B",
    slot: "is" | "m" | "os",
    card: FieldCard | null
  ) => {
    if (
      !state ||
      !card ||
      !isConfused(card, facingOppUnitAtSlot(state, player, slot))
    ) {
      return null;
    }
    return (
      <div
        className="pointer-events-none absolute inset-0 z-[30] overflow-visible rounded-[8px] pp-dinner-facing-ring-overlay"
        aria-hidden
      />
    );
  };

  /** 맹수견 포 — 마주 견제 패시브: 필드에 있을 때 붉은 외곽 글로우 ([혼란] 시 비활성) */
  const renderMaengsugyeonPoThreatRing = (
    player: "A" | "B",
    slot: "is" | "m" | "os",
    card: FieldCard | null
  ) => {
    if (!state || !card || card.name !== MAENGSUGYEON_PO_ID) return null;
    if (isMaengsugyeonPoFacingPassiveSuppressed(card, facingOppUnitAtSlot(state, player, slot))) {
      return null;
    }
    return (
      <div
        className="pointer-events-none absolute inset-0 z-[32] overflow-visible rounded-[8px] pp-maengsugyeon-po-threat-ring-overlay"
        aria-hidden
      />
    );
  };

  /** 맹수견 포 — 마주 적: 반투명 붉은 사각형(카드 z-[10] 아래). [혼란] 시 포·마주 적 모두 비표시. */
  const renderMaengsugyeonPoFacingEnemyRect = (
    player: "A" | "B",
    slot: "is" | "m" | "os",
    card: FieldCard | null
  ) => {
    if (!state || !card) return null;
    const opp = player === "A" ? "B" : "A";
    const oppField = opp === "A" ? state.playerA.field : state.playerB.field;
    const poOnOpposite = oppField[slot];
    if (!poOnOpposite || poOnOpposite.name !== MAENGSUGYEON_PO_ID) return null;
    if (isMaengsugyeonPoFacingPassiveSuppressed(poOnOpposite, card)) return null;
    return (
      <div
        className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center"
        aria-hidden
      >
        <div className="box-border h-[calc(100%+12px)] w-[calc(100%+12px)] shrink-0 rounded-[14px] border border-red-500/45 bg-red-600/[0.24] shadow-[inset_0_0_0_1px_rgba(254,202,202,0.2)]" />
      </div>
    );
  };

  /** [반짓고리] 필드 플래그 + [버프 금지] 미적용 시 링·체력바 연출 (혼란 아군도 `hasBanjitgori` 유지 시 표시) */
  const slotShowsActiveTauntBanjitBuffVisual = (player: "A" | "B", slot: "is" | "m" | "os"): boolean => {
    if (!state) return true;
    const card = (player === "A" ? state.playerA.field : state.playerB.field)[slot];
    if (!(card as FieldCard & { hasBanjitgori?: boolean })?.hasBanjitgori) return false;
    return !callieBuffBanSuppressesBuffsForVictim(player, slot, state.playerA.field, state.playerB.field);
  };

  /** 에리스티나 반짓고리 부여 아군 — 핑크 펄스(렴화 [도발] 무력화 시 보라, 렴초·철기병 링보다 위) */
  const renderBanjitgoriFieldRing = (
    player: "A" | "B",
    slot: "is" | "m" | "os",
    card: FieldCard | null
  ) => {
    if (!card || !(card as FieldCard & { hasBanjitgori?: boolean }).hasBanjitgori) return null;
    if (!slotShowsActiveTauntBanjitBuffVisual(player, slot)) return null;
    const banjitTauntSuppressed =
      !!state &&
      isTauntSuppressedByRyeomhwaForUnitOwner(player, state.playerA.field, state.playerB.field);
    return (
      <div
        className={`pointer-events-none absolute inset-0 z-[29] overflow-visible rounded-[8px] ${
          banjitTauntSuppressed
            ? "pp-ryeomhwa-suppressed-taunt-field-ring-overlay"
            : "pp-banjitgori-field-ring-overlay"
        }`}
        aria-hidden
      />
    );
  };

  /** 렴초 필드 체류 시 카드 윤곽 — 필립 마주 링과 동형(베이지 펄스) */
  const renderRyeomchoFieldRing = (
    player: "A" | "B",
    slot: "is" | "m" | "os",
    card: FieldCard | null
  ) => {
    if (!state || !card || !isRyeomcho(card) || (card.currentHp ?? 0) <= 0) return null;
    if (isRyeomchoPassivesPausedByConfusion(card, facingOppUnitAtSlot(state, player, slot))) {
      return null;
    }
    const tauntSuppressed =
      !!state &&
      isTauntSuppressedByRyeomhwaForUnitOwner(player, state.playerA.field, state.playerB.field);
    return (
      <div
        className={`pointer-events-none absolute inset-0 z-[28] overflow-visible rounded-[8px] ${
          tauntSuppressed
            ? "pp-ryeomhwa-suppressed-taunt-field-ring-overlay"
            : "pp-ryeomcho-field-ring-overlay"
        }`}
        aria-hidden
      />
    );
  };

  /** 철기병 필드 체류 시 카드 윤곽 — 회색·은빛 펄스(렴초 링과 동형) */
  const renderCheolgibyeongFieldRing = (
    player: "A" | "B",
    slot: "is" | "m" | "os",
    card: FieldCard | null
  ) => {
    if (!state || !card || card.name !== CHEOLGIBYEONG_ID || (card.currentHp ?? 0) <= 0) return null;
    if (isCheolgibyeongPassivesPausedByConfusion(card, facingOppUnitAtSlot(state, player, slot))) {
      return null;
    }
    const tauntSuppressedCheol =
      !!state &&
      isTauntSuppressedByRyeomhwaForUnitOwner(player, state.playerA.field, state.playerB.field);
    return (
      <div
        className={`pointer-events-none absolute inset-0 z-[28] overflow-visible rounded-[8px] ${
          tauntSuppressedCheol
            ? "pp-ryeomhwa-suppressed-taunt-field-ring-overlay"
            : "pp-cheolgibyeong-field-ring-overlay"
        }`}
        aria-hidden
      />
    );
  };

  /** 메리 [방어력 +400] — 에리스티나 반짓고리 링(z-29)보다 아래(z-27), 밝은 회색 링 */
  const renderMaryDefenseFieldRing = (
    player: "A" | "B",
    slot: "is" | "m" | "os",
    card: FieldCard | null
  ) => {
    if (!state || !card || card.name !== MARY_ID) return null;
    const slotKey = `${player}-${slot}`;
    if (
      !maryDefenseBuffActive(
        card,
        state.playerA.field,
        state.playerB.field,
        slotKey,
        facingOppUnitAtSlot(state, player, slot)
      )
    ) {
      return null;
    }
    return (
      <div
        className="pointer-events-none absolute inset-0 z-[27] overflow-visible rounded-[8px] pp-mary-defense-field-ring-overlay"
        aria-hidden
      />
    );
  };

  /** 필드 유닛 카드와 동일 가로 폭 (체력바·효과 뱃지 줄 정렬용) */
  const fieldUnitWidthClass = "w-[85px] md:w-[100px] lg:w-[120px]";
  const fieldSlotColumnReverseClass = (player: "A" | "B") => {
    const needsReverse =
      player === "B" ? fieldSlotIsPlayerA("B") : !fieldSlotIsPlayerA("A");
    return needsReverse ? " flex-col-reverse" : "";
  };
  /** 뱃지 최대 2줄 기준 고정 높이 — 빈 슬롯/체력만/뱃지+체력 모두 카드 밑면 동일 높이 */
  const fieldSlotBadgeZoneClass = `flex h-12 shrink-0 flex-col items-center justify-center overflow-visible ${fieldUnitWidthClass}`;
  /** 상대 진영(B): 게이지가 체력 위로 돌출 → 뱃지를 살짝 위로. 아군(A): 게이지는 체력 아래라 뱃지 이동 없음 */
  const fieldSlotBadgeZoneClassWithCard = (card: FieldCard | null, isPlayerA: boolean) =>
    `${fieldSlotBadgeZoneClass}${
      !isPlayerA && (card?.name === DARK_KNIGHT_ID || card?.name === MAXELLAND_ID) ? " -translate-y-1.5" : ""
    }`;
  const fieldSlotHpRowClass =
    "relative z-20 flex h-3.5 w-full shrink-0 items-center justify-center";
  const fieldSlotHpPlaceholder = (
    <div className={`${fieldUnitWidthClass} h-3.5 shrink-0 rounded-[3px] border border-transparent`} aria-hidden />
  );

  const renderDarkKnightSoulGaugeSegments = (card: FieldCard | null) => {
    if (!card || card.name !== DARK_KNIGHT_ID) return null;
    const filled = Math.max(0, Math.min(DARK_KNIGHT_GAUGE_CAP, card.darkKnightSoulGauge ?? 0));
    return (
      <>
        {Array.from({ length: DARK_KNIGHT_GAUGE_CAP }, (_, i) => (
          <div
            key={i}
            className={`min-h-0 min-w-0 flex-1 rounded-[2px] ${
              i < filled
                ? "border border-indigo-900/88 bg-gradient-to-b from-[#1e1b4b] via-[#4338ca] to-[#1a1033] shadow-[0_0_4px_rgba(91,33,182,0.48),inset_0_1px_0_rgba(167,139,250,0.16)]"
                : "border border-slate-500/70 bg-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]"
            }`}
          />
        ))}
      </>
    );
  };

  /** 상단 진영(B): 체력바 직선 위치 고정, 게이지만 위(뱃지 방향)로 돌출 */
  const renderDarkKnightSoulGaugeAboveHpAbsolute = (card: FieldCard | null, fieldSlotKey: string) => {
    if (!card || card.name !== DARK_KNIGHT_ID) return null;
    const filled = Math.max(0, Math.min(DARK_KNIGHT_GAUGE_CAP, card.darkKnightSoulGauge ?? 0));
    const [gaugeOwner, gaugeSlot] = fieldSlotKey.split("-") as ["A" | "B", "is" | "m" | "os"];
    const gaugeFacing =
      state && (gaugeSlot === "is" || gaugeSlot === "m" || gaugeSlot === "os")
        ? facingOppUnitAtSlot(state, gaugeOwner, gaugeSlot)
        : null;
    const dkPassivePaused = isDarkKnightPassivesPausedByConfusion(card, gaugeFacing);
    const full = darkKnightSoulGaugeFull(card) && !dkPassivePaused;
    const chargePulse = dkPassivePaused ? 0 : (darkKnightGaugeChargePulseBySlot[fieldSlotKey] ?? 0);
    const row = (
      <div className="flex h-[10px] w-full min-w-0 gap-0.5">
        {renderDarkKnightSoulGaugeSegments(card)}
      </div>
    );
    return (
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-full z-[22] mb-0.5 flex flex-col items-center ${fieldUnitWidthClass}`}
        aria-label={`다크나이트 소울 ${filled}/${DARK_KNIGHT_GAUGE_CAP}`}
      >
        <div
          key={chargePulse}
          className={`w-full rounded-[4px] ${chargePulse > 0 ? "pp-darkknight-gauge-charge-border-ring" : ""}`}
        >
          {full ? <div className="pp-darkknight-gauge-frame--full w-full p-[1px]">{row}</div> : row}
        </div>
      </div>
    );
  };

  /** 하단 진영(A): 카드 바로 아래 체력바 → 그 아래 게이지(자리 차지) → 뱃지 */
  const renderDarkKnightSoulGaugeBelowHpFlow = (card: FieldCard | null, fieldSlotKey: string) => {
    if (!card || card.name !== DARK_KNIGHT_ID) return null;
    const filled = Math.max(0, Math.min(DARK_KNIGHT_GAUGE_CAP, card.darkKnightSoulGauge ?? 0));
    const [gaugeOwner, gaugeSlot] = fieldSlotKey.split("-") as ["A" | "B", "is" | "m" | "os"];
    const gaugeFacing =
      state && (gaugeSlot === "is" || gaugeSlot === "m" || gaugeSlot === "os")
        ? facingOppUnitAtSlot(state, gaugeOwner, gaugeSlot)
        : null;
    const dkPassivePaused = isDarkKnightPassivesPausedByConfusion(card, gaugeFacing);
    const full = darkKnightSoulGaugeFull(card) && !dkPassivePaused;
    const chargePulse = dkPassivePaused ? 0 : (darkKnightGaugeChargePulseBySlot[fieldSlotKey] ?? 0);
    const row = (
      <div className="flex h-[10px] w-full min-w-0 shrink-0 gap-0.5">
        {renderDarkKnightSoulGaugeSegments(card)}
      </div>
    );
    return (
      <div
        className="w-full pointer-events-none"
        aria-label={`다크나이트 소울 ${filled}/${DARK_KNIGHT_GAUGE_CAP}`}
      >
        <div
          key={chargePulse}
          className={`w-full rounded-[4px] ${chargePulse > 0 ? "pp-darkknight-gauge-charge-border-ring" : ""}`}
        >
          {full ? <div className="pp-darkknight-gauge-frame--full w-full p-[1px]">{row}</div> : row}
        </div>
      </div>
    );
  };

  const renderElWingSinseokGaugeSegments = (card: FieldCard | null) => {
    if (!card || card.name !== EL_WING_ID) return null;
    const filled = elWingSinseokGaugeFilled(card);
    return (
      <>
        {Array.from({ length: EL_WING_SINSEOK_GAUGE_CAP }, (_, i) => (
          <div
            key={i}
            className={`min-h-0 min-w-0 flex-1 rounded-[2px] ${
              i < filled
                ? "border border-emerald-950/85 bg-gradient-to-b from-emerald-300 via-emerald-600 to-emerald-950 shadow-[0_0_4px_rgba(52,211,153,0.5),inset_0_1px_0_rgba(167,243,208,0.35)]"
                : "border border-slate-500/70 bg-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]"
            }`}
          />
        ))}
      </>
    );
  };

  const renderElWingSinseokGaugeAboveHpAbsolute = (card: FieldCard | null, fieldSlotKey: string) => {
    if (!card || card.name !== EL_WING_ID) return null;
    const filled = elWingSinseokGaugeFilled(card);
    const row = (
      <div className="flex h-[10px] w-full min-w-0 gap-0.5">
        {renderElWingSinseokGaugeSegments(card)}
      </div>
    );
    return (
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-full z-[22] mb-0.5 flex flex-col items-center ${fieldUnitWidthClass}`}
        aria-label={`엘 윙 ${EL_WING_SINSEOK_SKILL_LABEL} ${filled}/${EL_WING_SINSEOK_GAUGE_CAP}`}
      >
        <div className="w-full rounded-[4px]">{row}</div>
      </div>
    );
  };

  const renderElWingSinseokGaugeBelowHpFlow = (card: FieldCard | null) => {
    if (!card || card.name !== EL_WING_ID) return null;
    const filled = elWingSinseokGaugeFilled(card);
    const row = (
      <div className="flex h-[10px] w-full min-w-0 shrink-0 gap-0.5">
        {renderElWingSinseokGaugeSegments(card)}
      </div>
    );
    return (
      <div
        className="w-full pointer-events-none"
        aria-label={`엘 윙 ${EL_WING_SINSEOK_SKILL_LABEL} ${filled}/${EL_WING_SINSEOK_GAUGE_CAP}`}
      >
        <div className="w-full rounded-[4px]">{row}</div>
      </div>
    );
  };

  const renderMaxellandTenacityGaugeSegments = (card: FieldCard | null) => {
    if (!card || card.name !== MAXELLAND_ID) return null;
    const filled = Math.max(0, Math.min(MAXELLAND_TENACITY_GAUGE_CAP, card.maxellandTenacityGauge ?? 0));
    return (
      <>
        {Array.from({ length: MAXELLAND_TENACITY_GAUGE_CAP }, (_, i) => (
          <div
            key={i}
            className={`min-h-0 min-w-0 flex-1 rounded-[2px] ${
              i < filled
                ? "border border-red-950/80 bg-gradient-to-b from-red-300 via-red-600 to-red-950 shadow-[0_0_4px_rgba(239,68,68,0.55),inset_0_1px_0_rgba(254,226,226,0.35)]"
                : "border border-slate-500/70 bg-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]"
            }`}
          />
        ))}
      </>
    );
  };

  const renderMaxellandTenacityGaugeAboveHpAbsolute = (card: FieldCard | null, fieldSlotKey: string) => {
    if (!card || card.name !== MAXELLAND_ID) return null;
    const filled = Math.max(0, Math.min(MAXELLAND_TENACITY_GAUGE_CAP, card.maxellandTenacityGauge ?? 0));
    const full = maxellandTenacityGaugeFull(card);
    const chargePulse = maxellandGaugeChargePulseBySlot[fieldSlotKey] ?? 0;
    const row = (
      <div className="flex h-[10px] w-full min-w-0 gap-0.5">
        {renderMaxellandTenacityGaugeSegments(card)}
      </div>
    );
    return (
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-full z-[22] mb-0.5 flex flex-col items-center ${fieldUnitWidthClass}`}
        aria-label={`맥셀렌드 투지 ${filled}/${MAXELLAND_TENACITY_GAUGE_CAP}`}
      >
        <div
          key={chargePulse}
          className={`w-full rounded-[4px] ${chargePulse > 0 ? "pp-maxelland-gauge-charge-border-ring" : ""}`}
        >
          {full ? <div className="pp-maxelland-gauge-frame--full w-full p-[1px]">{row}</div> : row}
        </div>
      </div>
    );
  };

  const renderMaxellandTenacityGaugeBelowHpFlow = (card: FieldCard | null, fieldSlotKey: string) => {
    if (!card || card.name !== MAXELLAND_ID) return null;
    const filled = Math.max(0, Math.min(MAXELLAND_TENACITY_GAUGE_CAP, card.maxellandTenacityGauge ?? 0));
    const full = maxellandTenacityGaugeFull(card);
    const chargePulse = maxellandGaugeChargePulseBySlot[fieldSlotKey] ?? 0;
    const row = (
      <div className="flex h-[10px] w-full min-w-0 shrink-0 gap-0.5">
        {renderMaxellandTenacityGaugeSegments(card)}
      </div>
    );
    return (
      <div
        className="w-full pointer-events-none"
        aria-label={`맥셀렌드 투지 ${filled}/${MAXELLAND_TENACITY_GAUGE_CAP}`}
      >
        <div
          key={chargePulse}
          className={`w-full rounded-[4px] ${chargePulse > 0 ? "pp-maxelland-gauge-charge-border-ring" : ""}`}
        >
          {full ? <div className="pp-maxelland-gauge-frame--full w-full p-[1px]">{row}</div> : row}
        </div>
      </div>
    );
  };

  /** 아이버슨 — 소환 후 턴 넘김당 1/4씩 채워지는 단일 흰색 트랙(짙은 녹색 충전). 50%↑ 윤곽 초록 명멸, 75%↑ 명멸 2배 빠름 */
  const iversonWaitGaugeOutlineClass = (fill: number) => {
    if (fill >= 0.75) return "pp-iverson-wait-gauge-track--flicker-fast";
    if (fill >= 0.5) return "pp-iverson-wait-gauge-track--flicker";
    return "";
  };

  const renderIversonWaitGaugeAboveHpAbsolute = (card: FieldCard | null) => {
    if (!card || card.name !== IVERSON_ID) return null;
    const ticks = card.iversonSummonWaitEndTurnTicksRemaining ?? 0;
    if (ticks <= 0) return null;
    const fill = iversonWaitGaugeFill01(card);
    const flicker = iversonWaitGaugeOutlineClass(fill);
    return (
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-full z-[22] mb-0.5 flex flex-col items-center ${fieldUnitWidthClass}`}
        aria-label={iversonLiberationLabel(card) ?? "아이버슨 대기"}
      >
        <div
          className={`h-[10px] w-full overflow-hidden rounded-[4px] border border-slate-500/85 bg-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.14)] ${flicker}`}
        >
          <div
            className="h-full max-w-full rounded-[3px] bg-gradient-to-b from-emerald-700 via-emerald-900 to-emerald-950 shadow-[inset_0_1px_0_rgba(167,243,208,0.22)] transition-[width] duration-700 ease-out"
            style={{ width: `${Math.round(fill * 10000) / 100}%` }}
          />
        </div>
      </div>
    );
  };

  const renderIversonWaitGaugeRowPlayerA = (card: FieldCard | null) => {
    if (!card || card.name !== IVERSON_ID) return null;
    const ticks = card.iversonSummonWaitEndTurnTicksRemaining ?? 0;
    if (ticks <= 0) return null;
    const fill = iversonWaitGaugeFill01(card);
    const flicker = iversonWaitGaugeOutlineClass(fill);
    return (
      <div
        className="flex h-[10px] w-full min-w-0 shrink-0 flex-col items-stretch pointer-events-none"
        aria-label={iversonLiberationLabel(card) ?? "아이버슨 대기"}
      >
        <div
          className={`h-full w-full overflow-hidden rounded-[4px] border border-slate-500/85 bg-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.14)] ${flicker}`}
        >
          <div
            className="h-full max-w-full rounded-[3px] bg-gradient-to-b from-emerald-700 via-emerald-900 to-emerald-950 shadow-[inset_0_1px_0_rgba(167,243,208,0.22)] transition-[width] duration-700 ease-out"
            style={{ width: `${Math.round(fill * 10000) / 100}%` }}
          />
        </div>
      </div>
    );
  };

  /** 게이지 5칸 만축 시 border+p가 더해져 실제 높이 ≈14px이 됨 → 비 DK·비만축 슬롯과 동일하게 맞추기 위함 */
  const playerAFieldSlotBelowHpReserveClass = "flex h-[14px] w-full shrink-0 flex-col justify-center pointer-events-none";

  const renderHpRowWithOptionalDKGauge = (
    card: FieldCard | null,
    hpInner: ReactNode,
    isPlayerA: boolean,
    fieldSlotKey: string
  ) => {
    if (isPlayerA) {
      /* flex-1+justify-end 카드 영역 높이: HP 아래(게이지|스페이서) 총높이가 슬롯마다 동일해야 함 — 만축 게이지 ≈14px 기준 통일 */
      return (
        <div className={`relative z-20 flex shrink-0 flex-col items-center gap-0.5 ${fieldUnitWidthClass}`}>
          <div className={fieldSlotHpRowClass}>{hpInner}</div>
          <div className={playerAFieldSlotBelowHpReserveClass}>
            {card?.name === DARK_KNIGHT_ID ? (
              renderDarkKnightSoulGaugeBelowHpFlow(card, fieldSlotKey)
            ) : card?.name === EL_WING_ID ? (
              renderElWingSinseokGaugeBelowHpFlow(card)
            ) : card?.name === MAXELLAND_ID ? (
              renderMaxellandTenacityGaugeBelowHpFlow(card, fieldSlotKey)
            ) : card?.name === IVERSON_ID ? (
              renderIversonWaitGaugeRowPlayerA(card)
            ) : (
              <div className={`h-[10px] shrink-0 w-full rounded-[3px]`} aria-hidden />
            )}
          </div>
        </div>
      );
    }
    return (
      <div className={`relative z-20 shrink-0 ${fieldUnitWidthClass}`}>
        {renderDarkKnightSoulGaugeAboveHpAbsolute(card, fieldSlotKey)}
        {renderElWingSinseokGaugeAboveHpAbsolute(card, fieldSlotKey)}
        {renderMaxellandTenacityGaugeAboveHpAbsolute(card, fieldSlotKey)}
        {renderIversonWaitGaugeAboveHpAbsolute(card)}
        <div className={fieldSlotHpRowClass}>{hpInner}</div>
      </div>
    );
  };

  /** 5칸 만축 — 에리스티나 반짓고리 링과 같은 방식(윤곽 중심, simulation-combat-flash.css) */
  const renderDarkKnightSoulCompleteRing = (
    card: FieldCard | null,
    player: "A" | "B",
    slot: "is" | "m" | "os"
  ) => {
    if (
      !state ||
      !card ||
      !darkKnightSoulGaugeFullForCombat(card, facingOppUnitAtSlot(state, player, slot))
    ) {
      return null;
    }
    return (
      <div
        className="pp-darkknight-soul-field-ring-overlay pointer-events-none absolute inset-0 z-[31] overflow-visible rounded-[8px]"
        aria-hidden
      />
    );
  };

  const renderMaxellandTenacityCompleteRing = (card: FieldCard | null) => {
    if (!maxellandTenacityGaugeFull(card)) return null;
    return (
      <div
        className="pp-maxelland-tenacity-field-ring-overlay pointer-events-none absolute inset-0 z-[31] overflow-visible rounded-[8px]"
        aria-hidden
      />
    );
  };

  /** [투지] 4칸 만축 맥셀렌드 — 카드 외곽선 붉은 상시 광채(링 위층) */
  const renderMaxellandFullTenacityPerimeterGlow = (card: FieldCard | null) => {
    if (card?.name !== MAXELLAND_ID || !maxellandTenacityGaugeFull(card)) return null;
    return (
      <div
        className="pp-maxelland-full-tenacity-perimeter-glow pointer-events-none absolute inset-0 z-[33] overflow-visible rounded-[8px]"
        aria-hidden
      />
    );
  };

  const renderStackingGaugeFieldRings = (
    player: "A" | "B",
    slot: "is" | "m" | "os",
    card: FieldCard | null
  ) => {
    const maxellPassiveOn =
      !!state &&
      !!card &&
      card.name === MAXELLAND_ID &&
      !isMaxellandTenacityPassivePausedByConfusion(card, facingOppUnitAtSlot(state, player, slot));
    return (
      <>
        {renderDarkKnightSoulCompleteRing(card, player, slot)}
        {maxellPassiveOn && maxellandTenacityGaugeFull(card) ? renderMaxellandTenacityCompleteRing(card) : null}
        {maxellPassiveOn && maxellandTenacityGaugeFull(card)
          ? renderMaxellandFullTenacityPerimeterGlow(card)
          : null}
      </>
    );
  };

  const renderStunSwirlOverlay = (card: FieldCard | null, roundedClass: string, slotKey: string) => {
    if (!card || !isStunned(card)) return null;
    if (selectedSlot === slotKey) return null;
    return (
      <div className={`pp-stun-swirl-mount ${roundedClass}`} aria-hidden>
        <div className="pp-stun-swirl-core">
          <svg className="pp-stun-swirl-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
            <g className="pp-stun-spiral-group">
              <path className="pp-stun-swirl-path" d={STUN_SPIRAL_PATH_D} />
            </g>
          </svg>
        </div>
      </div>
    );
  };

  /** No.16 전설의 검 — 충전 깜빡임 / 연격 선택 시 고정 조명(체력바 z-20 위) */
  const renderLegendarySwordChargeAura = (
    player: "A" | "B",
    slot: "is" | "m" | "os",
    card: FieldCard | null,
    roundedClass: string
  ) => {
    const strikeTargeting =
      !!card &&
      card.name === UNIT.LEGENDARY_SWORD &&
      pendingLegendarySwordStrike?.ownerPlayer === player &&
      pendingLegendarySwordStrike.swordSlot === slot;
    const charging = !!card && isLegendarySwordCharging(card);
    if (!charging && !strikeTargeting) return null;

    const auraClass = strikeTargeting
      ? " pp-legendary-sword-charge-aura--steady"
      : card!.legendarySwordChargeFastBlink
        ? " pp-legendary-sword-charge-aura--fast"
        : "";

    return (
      <div
        className={`pp-legendary-sword-charge-aura pointer-events-none absolute inset-0 z-[8] ${roundedClass}${auraClass}`}
        aria-hidden
      />
    );
  };

  /** 아이버슨 대기 중 — 이미지 위 반투명 어둡게 + 카드 밖 녹색 글로우. 게이지 75%↑ 시 글로우가 게이지와 동일 속도(0.6s)로 명멸 */
  const renderIversonWaitAuraOverlay = (card: FieldCard | null, roundedClass: string, slotKey: string) => {
    if (!card || !isIversonAttackLocked(card)) return null;
    if (selectedSlot === slotKey) return null;
    const fill = iversonWaitGaugeFill01(card);
    const glowFlicker = fill >= 0.75 ? " pp-iverson-wait-aura-mount--glow-flicker" : "";
    return (
      <div
        className={`pp-iverson-wait-aura-mount pointer-events-none absolute inset-0 z-[32] ${roundedClass}${glowFlicker}`}
        aria-hidden
      />
    );
  };

  /** 백스 패시브 발동 후 — 회색 윤곽 + 바깥 정적 글로우; [무적] 중에는 외곽 글로우만 느리게 명멸. 철벽 오라 시 전 아군에 동일 링. */
  const renderBaekseuInvulnRing = (
    card: FieldCard | null,
    roundedClass: string,
    owningPlayer: "A" | "B",
    slot: "is" | "m" | "os"
  ) => {
    if (!state) return null;
    if (!card || (card.currentHp ?? 0) <= 0) return null;
    const owningField = owningPlayer === "A" ? state.playerA.field : state.playerB.field;
    const oppField = owningPlayer === "A" ? state.playerB.field : state.playerA.field;
    const cheolAura = getActiveCheolbyeokInvulnTicksFromField(owningField) > 0;
    const showRing =
      isBaekseuLastStandExecuteAuraActiveOnUnit(card, oppField[slot] ?? null) || cheolAura;
    if (!showRing) return null;
    const invulnGlow = isInvulnerableFromBaekseuOrCheolbyeok(card, owningField)
      ? " pp-baekseu-invuln-field-ring-overlay--invulnerable"
      : "";
    return (
      <div
        className={`pointer-events-none absolute inset-0 z-[34] overflow-visible ${roundedClass} pp-baekseu-invuln-field-ring-overlay${invulnGlow}`}
        aria-hidden
      />
    );
  };

  /** 언덕! [침묵] — 필립 마주 링(z-30)보다 위, 밝은 하늘 외곽 광채 */
  const renderEondeokSilenceOutline = (card: FieldCard | null, roundedClass: string) => {
    if (!card || !isEondeokSilenceActive(card)) return null;
    return (
      <div
        className={`pointer-events-none absolute inset-0 z-[35] overflow-visible ${roundedClass} shadow-[0_0_0_2px_rgba(186,230,253,0.95),0_0_26px_rgba(125,211,252,0.75),inset_0_0_16px_rgba(56,189,248,0.16)]`}
        aria-hidden
      />
    );
  };

  const renderStatusBadges = (
    player: "A" | "B",
    slot: "is" | "m" | "os" | "spell",
    card: FieldCard | null,
    isPlayerA: boolean,
    opts?: {
      mobileFieldLayout?: boolean;
      zoneWidth?: number;
      badgeW?: number;
      badgeH?: number;
      badgeGap?: number;
    }
  ) => {
    if (!card || !state || slot === "spell") return null;
    const oppPlayer = player === "A" ? "B" : "A";
    const oppField = oppPlayer === "A" ? state.playerA.field : state.playerB.field;
    const oppCard = oppField[slot as "is"|"m"|"os"];
    const myField = player === "A" ? state.playerA.field : state.playerB.field;

    const statuses = sortStatusesForBadgeDisplay(
      getActiveStatuses(card, oppCard, myField, {
        playerAField: state.playerA.field,
        playerBField: state.playerB.field,
        mySlotKey: `${player}-${slot}`,
      })
    );
    
    if (statuses.length === 0) return null;

    const bangeomakTicks = getActiveBangEomakDefenseTicksFromField(
      player === "A" ? state.playerA.field : state.playerB.field
    );
    const invulnBadgeTicks = isBaekseuInvulnerable(card)
      ? (card.baekseuInvulnerableEndTurnTicksRemaining ?? 0)
      : getActiveCheolbyeokInvulnTicksFromField(myField);

    const statusTooltip = (status: string) => {
      if (status === BANG_EOMAK_DEFENSE_BADGE) {
        return "[방어력 +200]";
      }
      if (status === BAEKSEU_INVULN_BADGE) {
        return "[무적]";
      }
      if (status === BUFF_BAN_BADGE) {
        return "[버프 금지]";
      }
      if (status === SUPPRESSION_DEBUFF_BADGE) {
        return "[제압]";
      }
      if (status === EL_WING_MAGIC_IMMUNITY_BADGE) {
        return "[마법 면역]";
      }
      if (status === "침묵" && isEondeokSilenceActive(card)) {
        return "[침묵]";
      }
      if (status === "혼란") {
        return "[혼란]";
      }
      if (status === YORIN_STATUS_BADGE && card.name === DARK_KNIGHT_ID) {
        return `역린: 공격력 +${getDarkKnightYorinAtkBonus(card, oppCard)}`;
      }
      if (isMaxellandTenacityStatusBadge(status) && card.name === MAXELLAND_ID) {
        return `투지: 공격력 +${getMaxellandTenacityAtkBonus(card, oppCard)}`;
      }
      return status;
    };

    const mobileBadgeGap = opts?.badgeGap ?? 2;
    const mobileBadgeW = opts?.badgeW ?? 18;
    const mobileBadgeH = opts?.badgeH ?? 16;
    const chip = opts?.mobileFieldLayout
      ? "relative shrink-0 flex cursor-default rounded-[3px] border-2 pointer-events-auto box-border justify-self-center"
      : "relative shrink-0 flex h-[18px] w-[18px] md:h-5 md:w-5 cursor-default rounded-[3px] border-2 pointer-events-auto";
    const mobileChipStyle: React.CSSProperties | undefined = opts?.mobileFieldLayout
      ? {
          width: mobileBadgeW,
          height: mobileBadgeH,
          maxWidth: "100%",
          boxSizing: "border-box",
        }
      : undefined;
    const mobileBadgeTextClass = "text-[8px] font-black tabular-nums leading-none";
    const pcBadgeTextClass = "text-[8px] font-black tabular-nums leading-none md:text-[9px]";
    /* 체력바가 있는 쪽과 반대로 툴팁 — B: 뱃지↑·체력바↓ → 위로 / A: 카드·체력바↑·뱃지↓ → 아래로 */
    const tipPos = isPlayerA ? "top-full mt-1.5" : "bottom-full mb-1.5";

    const badgeList = (
      <>
        {statuses.map((status, i) => {
          const badgeId = `${player}-${slot}-${status}`;
          const badgeLabel = statusTooltip(status);
          return (
          <div
            key={`${status}-${i}`}
            title={statusTooltip(status)}
            className={`group ${chip} ${
              status === "침묵" && isEondeokSilenceActive(card)
                ? "bg-sky-400 border-sky-100 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)] text-sky-950"
                : status === BANG_EOMAK_DEFENSE_BADGE
                  ? "bg-gradient-to-br from-emerald-500 to-lime-400 border-lime-100 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)] text-emerald-950"
                  : getStatusBadgeSurfaceClassForCard(status, card, player)
            }`}
            style={mobileChipStyle}
            role="listitem"
            aria-label={statusTooltip(status)}
            onTouchStart={
              opts?.mobileFieldLayout
                ? e => {
                    e.stopPropagation();
                    const t = e.touches[0];
                    if (!t) return;
                    const bgColor = window.getComputedStyle(e.currentTarget).backgroundColor;
                    setSelectedBadge({
                      id: badgeId,
                      label: badgeLabel,
                      x: t.clientX,
                      y: t.clientY,
                      bgColor,
                    });
                  }
                : undefined
            }
            onClick={
              opts?.mobileFieldLayout
                ? e => {
                    e.stopPropagation();
                  }
                : undefined
            }
          >
            {status === BUFF_BAN_BADGE || status === SUPPRESSION_DEBUFF_BADGE ? (
              <svg
                className="pointer-events-none absolute inset-0 z-[2] h-full w-full overflow-visible"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
              >
                <path
                  d="M2.5 2.5L17.5 17.5M17.5 2.5L2.5 17.5"
                  stroke="#0a0a0a"
                  strokeWidth="2.4"
                  strokeLinecap="square"
                />
              </svg>
            ) : status === SUPPRESSION_DEBUFF_BADGE && isSuppressionActive(card) ? (
              <span
                className={`pointer-events-none absolute inset-0 z-[1] flex items-center justify-center ${opts?.mobileFieldLayout ? mobileBadgeTextClass : pcBadgeTextClass} text-black`}
                aria-hidden
              >
                {`${Math.ceil((card.suppressionEndTurnTicksRemaining ?? 0) / 2)}*`}
              </span>
            ) : status === "침묵" && isEondeokSilenceActive(card) ? (
              <span
                className={`pointer-events-none absolute inset-0 z-[1] flex items-center justify-center ${opts?.mobileFieldLayout ? mobileBadgeTextClass : pcBadgeTextClass} text-black`}
                aria-hidden
              >
                {`${Math.ceil((card.eondeokSilenceEndTurnTicksRemaining ?? 0) / 2)}*`}
              </span>
            ) : status === "기절" && isStunned(card) ? (
              <span
                className={`pointer-events-none absolute inset-0 z-[1] flex items-center justify-center ${opts?.mobileFieldLayout ? mobileBadgeTextClass : pcBadgeTextClass} text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.92)]`}
                aria-hidden
              >
                {`${Math.ceil((card.stunEndTurnTicksRemaining ?? 0) / 2)}*`}
              </span>
            ) : status === BANG_EOMAK_DEFENSE_BADGE && bangeomakTicks > 0 ? (
              <span
                className={`pointer-events-none absolute inset-0 z-[1] flex items-center justify-center ${opts?.mobileFieldLayout ? mobileBadgeTextClass : pcBadgeTextClass} text-black`}
                aria-hidden
              >
                {`${Math.ceil(bangeomakTicks / 2)}*`}
              </span>
            ) : status === BAEKSEU_INVULN_BADGE && invulnBadgeTicks > 0 ? (
              <span
                className={`pointer-events-none absolute inset-0 z-[1] flex items-center justify-center ${opts?.mobileFieldLayout ? mobileBadgeTextClass : pcBadgeTextClass} text-slate-900`}
                aria-hidden
              >
                {`${Math.ceil(invulnBadgeTicks / 2)}*`}
              </span>
            ) : null}
            <span
              className={`pointer-events-none absolute ${tipPos} left-1/2 z-[80] -translate-x-1/2 rounded-md border border-white/15 bg-slate-950/95 px-2 py-1 text-[10px] font-bold text-white shadow-lg opacity-0 transition-opacity duration-150 group-hover:opacity-100 whitespace-nowrap`}
              role="tooltip"
            >
              {statusTooltip(status)}
            </span>
          </div>
          );
        })}
      </>
    );

    if (opts?.mobileFieldLayout) {
      const zoneWidth = opts.zoneWidth ?? 72;
      return (
        <div
          className="z-[36] grid shrink-0"
          style={{
            maxWidth: zoneWidth,
            width: zoneWidth,
            gap: mobileBadgeGap,
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          }}
          role="list"
          aria-label="필드 효과"
        >
          {badgeList}
        </div>
      );
    }

    return (
      <div
        className={`z-[36] grid shrink-0 ${fieldUnitWidthClass} grid-cols-4 justify-items-center gap-x-1 gap-y-1`}
        role="list"
        aria-label="필드 효과"
      >
        {badgeList}
      </div>
    );
  };

  const gonchungSpellSlotDisplayCard = (
    player: "A" | "B",
    field: PlayerState["field"],
  ): FieldCard | null => {
    const top = getTopSpellFromField(field);
    if (!top) return null;
    if (spellUsageHiddenRevealCards?.[player]) {
      return spellUsageHiddenRevealCards[player]!;
    }
    if (spellUsageTeslaFlipPlayer === player && spellUsageTeslaFieldCard) {
      return spellUsageTeslaFieldCard;
    }
    return top;
  };

  const renderGonchungSpellStackFace = (
    player: "A" | "B",
    field: PlayerState["field"],
    opts?: { mobileFieldLayout?: boolean; mobileSpellSlotW?: number; mobileSpellSlotH?: number }
  ) => {
    const display = gonchungSpellSlotDisplayCard(player, field);
    if (!display) return null;
    if (isMultiplayOpponent(player)) {
      // 히든 스펠만 뒷면, 일반 스펠은 앞면 표시
      if (isHiddenSpellCard(display)) {
        return (
          <div
            className={`pointer-events-none absolute inset-0 rounded-[6px] overflow-hidden ${opts?.mobileFieldLayout ? "" : "rounded-[8px]"}`}
          >
            <MultiplayCardBackFace />
          </div>
        );
      }
      // 일반 스펠: 앞면 그대로 표시
    }
    const showFront = isGonchungHiddenPeekShowingFront(player, display);
    const suppressed = !!state &&
      areHiddenSpellsOnFieldSuppressedByRyeomhwa(player, state.playerA.field, state.playerB.field);
    const isHidden = isHiddenSpellCard(display);
    const ryeomhwaSuppressedOutlineGlow = !showFront && isHidden && suppressed;
    return (
      <GonchungSpellStackTopFace
        player={player}
        spell={display}
        opponentCardFlipped={shouldFlipOpponentCard(player)}
        revealGlow={false}
        showFront={showFront}
        teslaCounterOutlineGlow={
          showFront && (spellUsageTeslaFlipPlayer === player || !!spellUsageHiddenRevealCards?.[player])
        }
        ryeomhwaSuppressedOutlineGlow={ryeomhwaSuppressedOutlineGlow}
        mobileFieldLayout={opts?.mobileFieldLayout}
        mobileSpellSlotW={opts?.mobileSpellSlotW}
        mobileSpellSlotH={opts?.mobileSpellSlotH}
      />
    );
  };

  /**
   * 유닛 No.37 애벌레킹 — host에 부착된 W를 host 카드 모서리 바깥에 작게 렌더링.
   * - top 진영(B) host: host 우하단으로 살짝 튀어나오게 배치(체력바는 W의 아래).
   * - bottom 진영(A) host: host 좌상단으로 살짝 튀어나오게 배치(체력바는 W의 위).
   * - W는 host slot div 바깥(unitSlotOuterClass div의 자식)으로 그려져 host의 overflow-hidden 영향을 받지 않음.
   * - 클릭 시 detail/✕ 메뉴(W 카드 본체 위에만 표시 — host를 덮지 않음).
   * - cardBox에 data-aebeolaeking-rider-target 부여 → W 직접 공격 hit-test 등(스펠 W 타깃은 미지원).
   */
  const renderAebeolaekingRiderOverlay = (
    ownerPlayer: "A" | "B",
    slot: "is" | "m" | "os",
    host: FieldCard | null
  ) => {
    if (!host || !hasAebeolaekingRider(host)) return null;
    const rider = host.parasiteRider!;
    const isTopPlayer = isTopPlayerInView(ownerPlayer);
    const riderSlotKey = aebeolaekingRiderSlotKey(ownerPlayer, slot);
    const menuOpen = selectedSlot === riderSlotKey;

    /* host 모서리 바깥으로 살짝 튀어나옴: 위 진영은 우하단, 아래 진영은 좌상단 */
    const wrapPos = isTopPlayer
      ? "absolute -bottom-3 -right-3 md:-bottom-4 md:-right-4 z-[40]"
      : "absolute -top-3 -left-3 md:-top-4 md:-left-4 z-[40]";
    /* B host: 카드 위→체력바 아래(flex-col). A host: 카드 아래→체력바 위(flex-col-reverse). */
    const stackDir = isTopPlayer ? "flex-col" : "flex-col-reverse";

    /**
     * 공격 가능 시각 글로우 — attackingSlot이 활성 + attacker가 host 진영(=W의 적, 아군 host의 진영)일 때.
     * - W의 hasBeenAttackedThisTurn이 true면 이미 공격받았으니 글로우 X(다굴 금지 룰).
     * - host의 trueOwner와 attacker가 같지 않으면(=W의 진영이 attacker와 같으면) 글로우 X.
     */
    const attackerInfo = attackingSlot ? attackingSlot.split("-") : null;
    const canRiderBeAttackedNow =
      !!attackerInfo &&
      (attackerInfo[0] as "A" | "B") === ownerPlayer &&
      !rider.hasBeenAttackedThisTurn &&
      (rider.currentHp ?? 0) > 0;
    const attackableGlow = canRiderBeAttackedNow
      ? " ring-2 ring-red-400 animate-pulse"
      : "";

    const cardBoxBaseClass =
      "border-2 border-yellow-400/90 shadow-[0_0_10px_rgba(250,204,21,0.85),0_0_20px_rgba(217,119,6,0.55)] cursor-pointer";

    const cardBox = (
      <div
        data-aebeolaeking-rider-target={riderSlotKey}
        data-aebeolaeking-rider-owner={ownerPlayer}
        data-aebeolaeking-rider-host-slot={slot}
        className={`relative w-full aspect-[1/1.58] rounded-[6px] overflow-hidden bg-slate-900 pointer-events-auto ${cardBoxBaseClass}${attackableGlow}`}
        onClick={e => {
          e.stopPropagation();
          /* 공격 모드 — attacker가 host 진영이면 W에 1차 공격 commit. */
          if (attackingSlot) {
            const [atkPlayer, atkSlot] = attackingSlot.split("-") as ["A" | "B", "is" | "m" | "os"];
            if (atkPlayer === ownerPlayer) {
              if (tryCommitAttackAgainstAebeolaekingRider(atkPlayer, atkSlot, ownerPlayer, slot)) {
                return;
              }
            }
          }
          setSelectedSlot(prev => (prev === riderSlotKey ? null : riderSlotKey));
        }}
      >
        {rider.image_url ? (
          <GuardedImg
            src={rider.image_url}
            alt={rider.name}
            className={`w-full h-full object-cover ${
              shouldFlipOpponentCard(ownerPlayer) ? "rotate-180" : ""
            }`}
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-[8px] md:text-[9px] font-bold text-yellow-200 text-center leading-tight p-1">
            {rider.name}
          </span>
        )}
        {/* 액션 메뉴 — W 카드 본체 위에만 표시(호스트 카드를 덮지 않음) */}
        {menuOpen && (
          <div
            className="pointer-events-auto absolute inset-0 bg-black/85 flex flex-col items-center justify-center gap-1 z-[45] backdrop-blur-[2px]"
            onClick={e => {
              e.stopPropagation();
              setSelectedSlot(null);
            }}
          >
            <button
              onClick={e => {
                e.stopPropagation();
                onOpenDetail?.(rider);
                setSelectedSlot(null);
              }}
              className={
                isMobile
                  ? "pointer-events-auto px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-100 text-[5px] font-bold rounded-md border border-slate-500 shadow active:scale-95 leading-tight whitespace-nowrap z-[46]"
                  : "pointer-events-auto px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-100 text-[7px] md:text-[8px] lg:text-[9px] font-bold rounded-md border border-slate-500 shadow active:scale-95 leading-tight whitespace-nowrap z-[46]"
              }
            >
              상세 보기
            </button>
            <button
              onClick={e => {
                e.stopPropagation();
                setSelectedSlot(null);
              }}
              className={
                isMobile
                  ? "absolute top-0 right-0.5 text-slate-300 hover:text-white text-[6px] font-bold leading-none z-[46]"
                  : "absolute top-0 right-0.5 text-slate-300 hover:text-white text-[9px] font-bold leading-none z-[46]"
              }
              aria-label="메뉴 닫기"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    );

    /* 체력바 — W 본체와 동일 너비. 보호막(오리에트의 초상) 시 시안 영역 분할 표시. */
    const maxHp = Math.max(1, Number(rider.hp) || 1);
    const curHp = Math.max(0, rider.currentHp ?? maxHp);
    const barrier = Math.max(0, rider.hpBarrierAbsorptionRemaining ?? 0);
    const greenPct = Math.min(100, (curHp / maxHp) * 100);
    const cyanPct = barrier > 0 ? Math.min(100, Math.max(0, (barrier / maxHp) * 100)) : 0;
    const cyanLeft = Math.min(100, greenPct);
    const cyanWidth = Math.min(100 - cyanLeft, cyanPct);
    const barColor =
      greenPct > 30
        ? "bg-gradient-to-r from-green-500 to-green-400"
        : "bg-gradient-to-r from-red-500 to-red-400";
    const hpBar = (
      <div className="relative h-1.5 md:h-2 w-full overflow-hidden rounded-[3px] border border-slate-700 bg-slate-900 shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
        <div
          className={`absolute left-0 top-0 z-[1] h-full transition-all duration-200 ${barColor}`}
          style={{ width: `${greenPct}%` }}
        />
        {cyanWidth > 0 ? (
          <div
            className="absolute top-0 z-[2] h-full bg-gradient-to-r from-sky-500 via-cyan-300 to-sky-200"
            style={{ left: `${cyanLeft}%`, width: `${cyanWidth}%` }}
            aria-hidden
          />
        ) : null}
        <span className="pointer-events-none absolute inset-0 z-[3] flex items-center justify-center text-[6px] md:text-[7px] font-black tabular-nums leading-none text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.95)]">
          {curHp}
          {barrier > 0 ? ` +${barrier}` : ""}
        </span>
      </div>
    );

    /**
     * 효과 뱃지 — W의 활성 상태(방어막/철벽/제압/무적/침묵 등)를 작은 칩으로 표기.
     * - W의 진정한 소유자(true owner) 필드 기준으로 활성 오라(방어막·철벽)를 조회.
     * - mySlotKey는 `${trueOwner}-${slot}` 형식으로 host slot을 그대로 사용 — 같은 슬롯의 spell stack 룰 일관성 유지.
     * - oppCard는 host(=W의 적측 동일 슬롯 카드)로 전달.
     * - 시각 연출(펄스·반짝임)은 일체 없음 — 데이터 기반 표기만.
     */
    const riderTrueOwner = getAebeolaekingRiderTrueOwner(rider);
    const riderAllyField =
      riderTrueOwner === "A"
        ? state?.playerA.field
        : riderTrueOwner === "B"
          ? state?.playerB.field
          : undefined;
    const riderStatuses =
      state && riderTrueOwner
        ? sortStatusesForBadgeDisplay(
            getActiveStatuses(rider, host, riderAllyField, {
              playerAField: state.playerA.field,
              playerBField: state.playerB.field,
              mySlotKey: `${riderTrueOwner}-${slot}`,
            })
          )
        : [];
    const riderChipClass =
      "shrink-0 flex h-3 w-3 md:h-3.5 md:w-3.5 rounded-[2px] border";
    const riderBadges =
      riderStatuses.length > 0 ? (
        <div
          className="z-[37] flex flex-wrap justify-center gap-0.5"
          role="list"
          aria-label="애벌레킹 효과"
        >
          {riderStatuses.map((status, i) => (
            <div
              key={`w-${status}-${i}`}
              title={status}
              className={`${riderChipClass} ${
                status === BANG_EOMAK_DEFENSE_BADGE
                  ? "bg-gradient-to-br from-emerald-500 to-lime-400 border-lime-100"
                  : getStatusBadgeSurfaceClassForCard(status, rider, ownerPlayer)
              }`}
              role="listitem"
              aria-label={status}
            />
          ))}
        </div>
      ) : null;

    return (
      <div
        className={`${wrapPos} flex ${stackDir} items-stretch gap-0.5 w-[42px] md:w-[50px] lg:w-[60px]`}
        aria-hidden={false}
      >
        {cardBox}
        {hpBar}
        {riderBadges}
      </div>
    );
  };

  const renderActionMenu = (player: "A" | "B", slot: "is" | "m" | "os" | "spell", card: FieldCard | null) => {
    if (!card || selectedSlot !== `${player}-${slot}`) return null;

    const actionMenuBtnShellClass = isMobile
      ? "px-3 py-1.5 text-[6px] font-black tracking-widest rounded-lg border shadow-lg transition-all w-[80%]"
      : "px-3 py-1.5 text-[10px] lg:text-xs font-black tracking-widest rounded-lg border shadow-lg transition-all w-[80%]";
    const actionMenuDetailBtnClass = isMobile
      ? "pointer-events-auto px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[6px] font-bold rounded-lg border border-slate-600 shadow-lg transition-colors w-[80%] active:scale-95 z-50"
      : "pointer-events-auto px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] lg:text-xs font-bold rounded-lg border border-slate-600 shadow-lg transition-colors w-[80%] active:scale-95 z-50";
    const actionMenuCloseBtnClass = isMobile
      ? "absolute top-1 right-2 text-slate-400 hover:text-white text-[7px] font-bold p-1"
      : "absolute top-1 right-2 text-slate-400 hover:text-white text-xs font-bold p-1";

    // 멀티플레이에서 상대 유닛: 상세보기만 표시
    if (isMultiplayOpponent(player)) {
      // 상대 히든 스펠: 클릭해도 아무것도 표시하지 않음
      if (slot === "spell" && card && isHiddenSpellCard(card)) {
        return null;
      }
      return (
        <div
          className="pointer-events-auto absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-2 z-30 backdrop-blur-[2px] animate-[fadeIn_0.15s_ease-out]"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedSlot(null);
          }}
        >
          <button
            className={actionMenuDetailBtnClass}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedSlot(null);
              openHandCardCodexDetail(card);
            }}
          >
            상세 보기
          </button>
          <button
            className={actionMenuCloseBtnClass}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedSlot(null);
            }}
          >
            ✕
          </button>
        </div>
      );
    }

    const isMyTurn = state?.currentTurn === player;
    
    const oppPlayer = player === "A" ? "B" : "A";
    const oppField = oppPlayer === "A" ? state?.playerA.field : state?.playerB.field;
    const oppCard = slot !== "spell" ? oppField?.[slot as "is"|"m"|"os"] : null;
    const allyFieldMenu = player === "A" ? state?.playerA.field : state?.playerB.field;
    const activeStatuses = getActiveStatuses(
      card,
      oppCard || null,
      allyFieldMenu,
      state && slot !== "spell"
        ? {
            playerAField: state.playerA.field,
            playerBField: state.playerB.field,
            mySlotKey: `${player}-${slot}`,
          }
        : undefined
    );
    const isSilenced = activeStatuses.includes("침묵");
    const eondeokSilent = isEondeokSilenceActive(card);
    const stunned = isStunned(card);
    const confused = activeStatuses.includes(DINNER_OPP_CONFUSION_STATUS);
    const blockActiveSkillUse = (): boolean => {
      if (stunned) {
        alert("이 유닛은 현재 [기절] 상태이므로 스킬을 사용할 수 없습니다!");
        return true;
      }
      if (confused) {
        alert("이 유닛은 현재 [혼란] 상태이므로 능력을 사용할 수 없습니다!");
        return true;
      }
      return false;
    };

    const isAttackDisabled = isAttackDisabledUnit(card);
    const ranigoHealBasicSealed = isRanigoAllyHealBasicAttackSealed(card, oppCard || null);
    const showBasicAttackButton = !isAttackDisabled && !ranigoHealBasicSealed;
    const summonLocked = card.summonedTurn === `${state?.turnCount}-${state?.currentTurn}`;
    const iversonLocked = isIversonAttackLocked(card);
    const canAttack =
      !isAttackDisabled &&
      !ranigoHealBasicSealed &&
      !card.hasAttacked &&
      isMyTurn &&
      !isSilenced &&
      !stunned &&
      !summonLocked &&
      !iversonLocked;

    return (
      <div
        className="pointer-events-auto absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-2 z-30 backdrop-blur-[2px] animate-[fadeIn_0.15s_ease-out]" 
        onClick={(e) => { e.stopPropagation(); setSelectedSlot(null); }}
      >
        {slot !== "spell" && showBasicAttackButton && (
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              if (!canAttack) {
                  if (stunned) alert("이 유닛은 현재 [기절] 상태이므로 기본 공격을 할 수 없습니다!");
                  else if (isSilenced) alert("이 유닛은 현재 [침묵] 상태이므로 기본 공격을 할 수 없습니다!");
                  else if (iversonLocked) {
                    const lib = iversonLiberationLabel(card);
                    alert(lib ?? "아이버슨은 아직 기본 공격을 할 수 없습니다.");
                  } else if (summonLocked) {
                    alert("다음 턴부터 공격이 가능합니다.");
                  }
                  return;
              }

              const activePlayerState = state?.currentTurn === 'A' ? state.playerA : state?.playerB;
              if ((activePlayerState?.attacksThisTurn || 0) >= 2) {
                alert("이미 모든 공격권을 사용했습니다.");
                return;
              }

              const atkStr = resolveFieldUnitSimulationBaseAtkRawWithFacing(
                card,
                null,
                oppCard || null
              ).trim();

              if (isLibuty(card)) {
                const rect = e.currentTarget.getBoundingClientRect();
                setPendingLibutyAllEnemiesAttack({
                  player,
                  slot: slot as "is" | "m" | "os",
                  position: { x: rect.left + rect.width / 2, y: rect.top },
                });
                setSelectedSlot(null);
                return;
              }

              const bracketMatch = atkStr.match(/^(\d+)\s*\((.+)\)$/);
              
              if (bracketMatch) {
                const rect = e.currentTarget.getBoundingClientRect();
                setPendingAttackSelection({
                  player,
                  slot: slot as "is"|"m"|"os",
                  primary: bracketMatch[1].trim(), 
                  secondary: bracketMatch[2].trim(),
                  position: { x: rect.left + rect.width / 2, y: rect.top }
                });
                setSelectedSlot(null);
                return;
              }

              setAttackingSlot(`${player}-${slot}`); 
              setAttackOptionOverride(null);
              setSelectedSlot(null); 
            }} 
            disabled={!canAttack}
            className={`${actionMenuBtnShellClass} ${!canAttack ? ((isSilenced || stunned) ? (eondeokSilent ? 'bg-sky-950 text-sky-200 border-sky-400' : 'bg-purple-900 text-purple-300 border-purple-700') : iversonLocked ? 'bg-emerald-950 text-emerald-200 border-emerald-800' : 'bg-slate-700 text-slate-400 border-slate-600') + ' cursor-not-allowed opacity-80 shadow-none' : 'bg-rose-600 hover:bg-rose-500 text-white border-white/20 shadow-[0_0_15px_rgba(225,29,72,0.6)] active:scale-95'}`}
          >
            {stunned
              ? '기절 (행동불가)'
              : isSilenced
                ? eondeokSilent
                  ? `침묵 (${Math.ceil((card.eondeokSilenceEndTurnTicksRemaining ?? 0) / 2)}*턴)`
                  : '침묵 (공격불가)'
                : iversonLocked
                  ? iversonLiberationLabel(card) ?? '해방 대기'
                  : summonLocked
                    ? '다음 턴 공격'
                    : card.hasAttacked
                      ? '공격 완료'
                      : !isMyTurn
                        ? '상대 턴'
                        : '공격'}
          </button>
        )}
        
        {/* 모모 스킬 버튼 */}
        {slot !== "spell" && card.name === UNIT.MOMO && (() => {
          const momoLastUsed = (card as FieldCard).skillLastUsedGlobalTurn ?? -999;
          const momoOnCooldown = (state?.globalTurnCount || 1) - momoLastUsed < 4;
          const momoSkillDisabled = !isMyTurn || stunned || confused || momoOnCooldown;
          return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (momoSkillDisabled) return;
              if (blockActiveSkillUse()) return;
              setPendingSkill({ player, slot: slot as "is"|"m"|"os", name: PENDING_SKILL.MOMO_EAT });
              setSelectedSlot(null);
            }}
            disabled={momoSkillDisabled}
            aria-disabled={momoSkillDisabled}
            className={`${actionMenuBtnShellClass} ${
              !isMyTurn ? 'bg-slate-700 text-slate-400 border-slate-600 cursor-not-allowed opacity-80 shadow-none pointer-events-none' :
              stunned ? 'bg-purple-900 text-purple-300 border-purple-700 cursor-not-allowed opacity-80 shadow-none pointer-events-none' :
              momoOnCooldown ? 'bg-slate-800 text-amber-600 border-amber-900 cursor-not-allowed opacity-80 pointer-events-none' :
              confused ? 'bg-purple-900 text-purple-300 border-purple-700 cursor-not-allowed opacity-80 shadow-none pointer-events-none' :
              'bg-amber-600 hover:bg-amber-500 text-white border-white/20 shadow-[0_0_15px_rgba(217,119,6,0.6)] active:scale-95'
            }`}
          >
            {(() => {
               if (!isMyTurn) return '상대 턴';
               if (stunned) return '기절 (스킬불가)';
               if (momoOnCooldown) {
                   const remainingTurns = Math.ceil((4 - ((state?.globalTurnCount || 1) - momoLastUsed)) / 2);
                   return `${remainingTurns}*턴 뒤 사용`;
               }
               if (confused) return '혼란 (능력불가)';
               return '스킬: 먹보';
            })()}
          </button>
          );
        })()}

        {/* 에리스티나 스킬 버튼 */}
        {slot !== "spell" && card.name === UNIT.ERISTINA && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (blockActiveSkillUse()) return;
              const isSkillActive = (card as any).isSkillActive;
              if (isSkillActive) return;

              const lastUsedGlobalTurn = (card as any).skillLastUsedGlobalTurn || -999;
              const turnsPassed = (state?.globalTurnCount || 1) - lastUsedGlobalTurn;
              const isCooldown = turnsPassed < 4;
              if (isCooldown) return;

              setPendingSkill({ player, slot: slot as "is"|"m"|"os", name: PENDING_SKILL.ERISTINA_BANJITGORI });
              setSelectedSlot(null);
            }}
            disabled={(() => {
              const lastUsed = (card as any).skillLastUsedGlobalTurn || -999;
              const onCooldown = (state?.globalTurnCount || 1) - lastUsed < 4;
              return (
                !isMyTurn ||
                isStunned(card) ||
                confused ||
                !!(card as any).isSkillActive ||
                onCooldown
              );
            })()}
            className={`${actionMenuBtnShellClass} ${
              !isMyTurn ? 'bg-slate-700 text-slate-400 border-slate-600 cursor-not-allowed opacity-80 shadow-none' :
              isStunned(card) ? 'bg-purple-900 text-purple-300 border-purple-700 cursor-not-allowed opacity-80 shadow-none' :
              ((state?.globalTurnCount || 1) - ((card as any).skillLastUsedGlobalTurn || -999) < 4) ? 'bg-slate-800 text-pink-600 border-pink-900 cursor-not-allowed opacity-80' :
              confused ? 'bg-purple-900 text-purple-300 border-purple-700 cursor-not-allowed opacity-80 shadow-none' :
              (card as any).isSkillActive ? 'bg-pink-900 text-pink-400 border-pink-700 cursor-not-allowed opacity-80 shadow-none' :
              'bg-pink-600 hover:bg-pink-500 text-white border-white/20 shadow-[0_0_15px_rgba(219,39,119,0.6)] active:scale-95'
            }`}
          >
            {(() => {
               if (!isMyTurn) return '상대 턴';
               if (isStunned(card)) return '기절 (스킬불가)';
               const lastUsedGlobalTurn = (card as any).skillLastUsedGlobalTurn || -999;
               const turnsPassed = (state?.globalTurnCount || 1) - lastUsedGlobalTurn;
               if (turnsPassed < 4) {
                   const remainingTurns = Math.ceil((4 - turnsPassed) / 2);
                   return `${remainingTurns}*턴 뒤 사용`;
               }
               if (confused) return '혼란 (능력불가)';
               if (isSilenced) return '침묵 (능력불가)';
               if ((card as any).isSkillActive) return '스킬 유지 중';
               return '마법의 반짓고리';
            })()}
          </button>
        )}

        {/* 라임 스킬 버튼 — 방울 보호막(에리스티나와 동형 링크·쿨) */}
        {slot !== "spell" && card.name === UNIT.LIME && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (blockActiveSkillUse()) return;
              const isSkillActive = (card as FieldCard).isSkillActive;
              if (isSkillActive) return;

              const lastUsedGlobalTurn = (card as FieldCard).skillLastUsedGlobalTurn ?? -999;
              const turnsPassed = (state?.globalTurnCount || 1) - lastUsedGlobalTurn;
              const isCooldown = turnsPassed < 4;
              if (isCooldown) return;

              setPendingSkill({ player, slot: slot as "is" | "m" | "os", name: PENDING_SKILL.LIME_BUBBLE_SHIELD });
              setSelectedSlot(null);
            }}
            disabled={(() => {
              const lastUsed = (card as FieldCard).skillLastUsedGlobalTurn ?? -999;
              const onCooldown = (state?.globalTurnCount || 1) - lastUsed < 4;
              return (
                !isMyTurn ||
                isStunned(card) ||
                confused ||
                !!(card as FieldCard).isSkillActive ||
                onCooldown
              );
            })()}
            className={`${actionMenuBtnShellClass} ${
              !isMyTurn
                ? "bg-slate-700 text-slate-400 border-slate-600 cursor-not-allowed opacity-80 shadow-none"
                : isStunned(card)
                  ? "bg-purple-900 text-purple-300 border-purple-700 cursor-not-allowed opacity-80 shadow-none"
                  : (state?.globalTurnCount || 1) - ((card as FieldCard).skillLastUsedGlobalTurn ?? -999) < 4
                    ? "bg-slate-800 text-sky-700 border-sky-900 cursor-not-allowed opacity-80"
                    : confused
                      ? "bg-purple-900 text-purple-300 border-purple-700 cursor-not-allowed opacity-80 shadow-none"
                      : (card as FieldCard).isSkillActive
                        ? "bg-sky-950 text-sky-300 border-sky-700 cursor-not-allowed opacity-80 shadow-none"
                        : "bg-sky-500 hover:bg-sky-400 text-white border-sky-100/30 shadow-[0_0_15px_rgba(56,189,248,0.55)] active:scale-95"
            }`}
          >
            {(() => {
              if (!isMyTurn) return "상대 턴";
              if (isStunned(card)) return "기절 (스킬불가)";
              if (confused) return "혼란 (능력불가)";
              if ((card as FieldCard).isSkillActive) return "스킬 유지 중";
              const lastUsedGlobalTurn = (card as FieldCard).skillLastUsedGlobalTurn ?? -999;
              const turnsPassed = (state?.globalTurnCount || 1) - lastUsedGlobalTurn;
              if (turnsPassed < 4) {
                const remainingTurns = Math.ceil((4 - turnsPassed) / 2);
                return `${remainingTurns}*턴 뒤 사용`;
              }
              return "방울 보호막";
            })()}
          </button>
        )}

        {/* 단하 스킬 버튼 — 마법의 갈고리(일회성) */}
        {slot !== "spell" && card.name === UNIT.DANHA && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (blockActiveSkillUse()) return;
              if (confused) return;
              if ((card as FieldCard).danhaMagicHookConsumed) return;

              const allyHand = player === "A" ? state?.playerA.hand : state?.playerB.hand;
              const oppHand = player === "A" ? state?.playerB.hand : state?.playerA.hand;
              if (!allyHand || !oppHand) return;
              if (allyHand.length >= 6) {
                alert("아군 패에 빈 슬롯이 없습니다. 카드를 1장 이상 비운 뒤 사용할 수 있습니다.");
                return;
              }
              if (oppHand.length === 0) {
                alert("상대 패에 빼앗을 카드가 없습니다.");
                return;
              }

              setPendingSkill({ player, slot: slot as "is" | "m" | "os", name: PENDING_SKILL.DANHA_GALGORI });
              setSelectedSlot(null);
            }}
            disabled={
              !isMyTurn ||
              isStunned(card) ||
              confused ||
              !!(card as FieldCard).danhaMagicHookConsumed ||
              (() => {
                const allyHand = player === "A" ? state?.playerA.hand : state?.playerB.hand;
                const oppHand = player === "A" ? state?.playerB.hand : state?.playerA.hand;
                if (!allyHand || !oppHand) return true;
                return allyHand.length >= 6 || oppHand.length === 0;
              })()
            }
            className={`${actionMenuBtnShellClass} ${
              !isMyTurn
                ? "bg-slate-700 text-slate-400 border-slate-600 cursor-not-allowed opacity-80 shadow-none pointer-events-none"
                : isStunned(card)
                  ? "bg-purple-900 text-purple-300 border-purple-700 cursor-not-allowed opacity-80 shadow-none pointer-events-none"
                  : confused
                    ? "bg-purple-900 text-purple-300 border-purple-700 cursor-not-allowed opacity-80 shadow-none pointer-events-none"
                    : (card as FieldCard).danhaMagicHookConsumed
                    ? "bg-slate-800 text-slate-500 border-slate-600 cursor-not-allowed opacity-80 shadow-none"
                    : (() => {
                        const allyHand = player === "A" ? state?.playerA.hand : state?.playerB.hand;
                        const oppHand = player === "A" ? state?.playerB.hand : state?.playerA.hand;
                        if (!allyHand || !oppHand) return "bg-slate-800 text-slate-500 border-slate-600 cursor-not-allowed opacity-80 shadow-none";
                        if (allyHand.length >= 6 || oppHand.length === 0) {
                          return "bg-slate-800 text-sky-700 border-sky-900 cursor-not-allowed opacity-80 shadow-none";
                        }
                        return "bg-sky-500 hover:bg-sky-400 text-white border-sky-200/40 shadow-[0_0_15px_rgba(56,189,248,0.55)] active:scale-95";
                      })()
            }`}
          >
            {(() => {
              if (!isMyTurn) return "상대 턴";
              if (isStunned(card)) return "기절 (스킬불가)";
              if (confused) return "혼란 (능력불가)";
              if ((card as FieldCard).danhaMagicHookConsumed) return "사용 완료";
              const allyHand = player === "A" ? state?.playerA.hand : state?.playerB.hand;
              const oppHand = player === "A" ? state?.playerB.hand : state?.playerA.hand;
              if (allyHand && allyHand.length >= 6) return "패 가득 참";
              if (oppHand && oppHand.length === 0) return "상대 패 없음";
              return "마법의 갈고리";
            })()}
          </button>
        )}

        {/* 슈퍼 그린킹 스킬 버튼 — 주문 파괴자(일회성) */}
        {slot !== "spell" && card.name === UNIT.SUPER_GREEN_KING && (() => {
          const oppSpellField = player === "A" ? state?.playerB.field : state?.playerA.field;
          const noOppSpells = !oppSpellField || normalizeSpellStack(oppSpellField).length === 0;
          const spellBreakerConsumed = !!(card as FieldCard).superGreenKingSpellBreakerConsumed;
          const sgtkSkillDisabled =
            !isMyTurn || stunned || confused || spellBreakerConsumed || noOppSpells;
          return (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              if (sgtkSkillDisabled) return;
              if (blockActiveSkillUse()) return;

              setPendingSkill({ player, slot: slot as "is" | "m" | "os", name: PENDING_SKILL.SUPER_GREEN_KING_SPELL_BREAKER });
              setSelectedSlot(null);
            }}
            disabled={sgtkSkillDisabled}
            aria-disabled={sgtkSkillDisabled}
            className={`${actionMenuBtnShellClass} ${
              !isMyTurn
                ? "bg-slate-700 text-slate-400 border-slate-600 cursor-not-allowed opacity-80 shadow-none pointer-events-none"
                : stunned
                  ? "bg-purple-900 text-purple-300 border-purple-700 cursor-not-allowed opacity-80 shadow-none pointer-events-none"
                  : confused
                    ? "bg-purple-900 text-purple-300 border-purple-700 cursor-not-allowed opacity-80 shadow-none pointer-events-none"
                    : spellBreakerConsumed
                      ? "bg-slate-800 text-slate-500 border-slate-600 cursor-not-allowed opacity-80 shadow-none pointer-events-none"
                      : noOppSpells
                        ? "bg-slate-800 text-emerald-900 border-emerald-950 cursor-not-allowed opacity-80 shadow-none pointer-events-none"
                        : "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-200/40 shadow-[0_0_15px_rgba(52,211,153,0.55)] active:scale-95"
            }`}
          >
            {(() => {
              if (!isMyTurn) return "상대 턴";
              if (stunned) return "기절 (스킬불가)";
              if (confused) return "혼란 (능력불가)";
              if (spellBreakerConsumed) return "사용 완료";
              if (noOppSpells) return "상대 스펠 없음";
              return "주문 파괴자";
            })()}
          </button>
          );
        })()}

        {slot !== "spell" && card.name === UNIT.GONCHUNG_JEONMOGA && (() => {
          const oppFieldForPeek = player === "A" ? state?.playerB.field : state?.playerA.field;
          const noHiddenSpells = !oppFieldForPeek || !spellStackHasHiddenSpell(oppFieldForPeek);
          const peekConsumed = !!(card as FieldCard).gonchungHiddenPeekConsumed;
          const gonchungSkillDisabled =
            !isMyTurn || stunned || confused || peekConsumed || noHiddenSpells;
          return (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              if (gonchungSkillDisabled) return;
              if (blockActiveSkillUse()) return;

              setPendingSkill({
                player,
                slot: slot as "is" | "m" | "os",
                name: PENDING_SKILL.GONCHUNG_HIDDEN_PEEK,
              });
              setSelectedSlot(null);
            }}
            disabled={gonchungSkillDisabled}
            aria-disabled={gonchungSkillDisabled}
            className={`${actionMenuBtnShellClass} ${
              !isMyTurn
                ? "bg-slate-700 text-slate-400 border-slate-600 cursor-not-allowed opacity-80 shadow-none pointer-events-none"
                : stunned
                  ? "bg-purple-900 text-purple-300 border-purple-700 cursor-not-allowed opacity-80 shadow-none pointer-events-none"
                  : confused
                    ? "bg-purple-900 text-purple-300 border-purple-700 cursor-not-allowed opacity-80 shadow-none pointer-events-none"
                    : peekConsumed
                      ? "bg-slate-800 text-slate-500 border-slate-600 cursor-not-allowed opacity-80 shadow-none pointer-events-none"
                      : noHiddenSpells
                        ? "bg-slate-800 text-slate-600 border-slate-700 cursor-not-allowed opacity-80 shadow-none pointer-events-none"
                        : "bg-lime-600 hover:bg-lime-500 text-white border-lime-200/40 shadow-[0_0_15px_rgba(132,204,22,0.55)] active:scale-95"
            }`}
          >
            {(() => {
              if (!isMyTurn) return "상대 턴";
              if (stunned) return "기절 (스킬불가)";
              if (confused) return "혼란 (능력불가)";
              if (peekConsumed) return "사용 완료";
              if (noHiddenSpells) return "히든 스펠 없음";
              return GONCHUNG_HIDDEN_PEEK_SKILL_LABEL;
            })()}
          </button>
          );
        })()}

        {/* 엘 윙 — [신속](상대 턴 피격 시 팝업에서 사용, 카드 버튼은 안내용) */}
        {slot !== "spell" && card.name === EL_WING_ID && (() => {
          const sinseokFilled = elWingSinseokGaugeFilled(card as FieldCard);
          const sinseokPopupActive =
            !!pendingElWingSinseokDefense &&
            pendingElWingSinseokDefense.defenderPlayer === player &&
            pendingElWingSinseokDefense.defenderSlot === slot;
          const sinseokFieldDisabled =
            isMyTurn || stunned || confused || sinseokFilled <= 0 || !sinseokPopupActive;
          return (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                if (sinseokFieldDisabled) return;
                commitElWingSinseokDodge();
              }}
              disabled={sinseokFieldDisabled}
              aria-disabled={sinseokFieldDisabled}
              className={`${actionMenuBtnShellClass} ${
                isMyTurn
                  ? "bg-slate-700 text-slate-400 border-slate-600 cursor-not-allowed opacity-80 shadow-none pointer-events-none"
                  : stunned
                    ? "bg-purple-900 text-purple-300 border-purple-700 cursor-not-allowed opacity-80 shadow-none pointer-events-none"
                    : confused
                      ? "bg-purple-900 text-purple-300 border-purple-700 cursor-not-allowed opacity-80 shadow-none pointer-events-none"
                      : sinseokFilled <= 0
                        ? "bg-slate-800 text-slate-500 border-slate-600 cursor-not-allowed opacity-80 shadow-none pointer-events-none"
                        : sinseokPopupActive
                          ? "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-200/40 shadow-[0_0_15px_rgba(52,211,153,0.6)] active:scale-95"
                          : "bg-emerald-950/80 text-emerald-400/90 border-emerald-900 cursor-not-allowed opacity-90 shadow-none pointer-events-none"
              }`}
            >
              {(() => {
                if (isMyTurn) return "사용 불가";
                if (stunned) return "기절 (스킬불가)";
                if (confused) return "혼란 (능력불가)";
                if (sinseokFilled <= 0) return `${EL_WING_SINSEOK_SKILL_LABEL} 없음`;
                if (sinseokPopupActive) return `${EL_WING_SINSEOK_SKILL_LABEL} (${elWingSinseokSecondsLeft}초)`;
                return `상대 턴 · ${EL_WING_SINSEOK_SKILL_LABEL} 대기`;
              })()}
            </button>
          );
        })()}

        <button 
          onClick={(e) => { 
            e.stopPropagation(); 
            onOpenDetail?.(card); 
            setSelectedSlot(null); 
          }} 
          className={actionMenuDetailBtnClass}
        >
          상세 보기
        </button>

        <button 
          onClick={(e) => { e.stopPropagation(); setSelectedSlot(null); }}
          className={actionMenuCloseBtnClass}
        >
          ✕
        </button>
      </div>
    );
  };

  const renderHpBar = (
    card: FieldCard | null,
    isPlayerA: boolean = false,
    layout: "overlay" | "inline" = "overlay",
    fieldSlot?: "is" | "m" | "os",
    mobileFieldDims?: { width: number; height: number }
  ) => {
    if (!card || !card.hp || Number(card.hp) <= 0) return null;
    
    const maxHp = Number(card.hp);
    const currentHp = card.currentHp;
    const barrierRem = Math.max(0, card.hpBarrierAbsorptionRemaining ?? 0);
    /** 실질 체력 비율 — 반짓고리·저체력 색·백스 처형선 등은 항상 유닛 `hp` 기준 */
    const realHpPctForTint = maxHp > 0 ? (currentHp / maxHp) * 100 : 0;

    const pool = currentHp + barrierRem;
    /**
     * 보호막 합이 실질 최대체력 이상이면: 합을 100%로 두고 녹/하늘 비율만 분할(막대 꽉 참).
     * 미만이면: (현재+보호막)/maxHp 만큼만 채우고, 그 안은 current/max·barrier/max 비율로 분할.
     */
    const useOverflowFullBar = barrierRem > 0 && maxHp > 0 && pool >= maxHp;
    let realGreenBarPct = 0;
    let cyanBarPct = 0;
    if (barrierRem > 0 && maxHp > 0) {
      if (useOverflowFullBar) {
        const vt = Math.max(1, pool);
        realGreenBarPct = Math.min(100, (currentHp / vt) * 100);
        cyanBarPct = Math.min(100, Math.max(0, (barrierRem / vt) * 100));
      } else {
        realGreenBarPct = Math.min(100, (currentHp / maxHp) * 100);
        cyanBarPct = Math.min(100, Math.max(0, (barrierRem / maxHp) * 100));
      }
    } else if (maxHp > 0) {
      realGreenBarPct = Math.min(100, (currentHp / maxHp) * 100);
    }

    const eondeokFrozenHp = isEondeokSilenceActive(card);
    const playerLetter: "A" | "B" = isPlayerA ? "A" : "B";
    const banjitPinkHpActive =
      !!(card as FieldCard & { hasBanjitgori?: boolean }).hasBanjitgori &&
      (!state ||
        !fieldSlot ||
        !callieBuffBanSuppressesBuffsForVictim(
          playerLetter,
          fieldSlot,
          state.playerA.field,
          state.playerB.field
        ));
    // ⭐️ 반짓고리 적용 시 전용 체력바 색상 (핑크색) — 언덕! [침묵]은 그보다 우선(얼음·하늘색 트랙)
    let barColor =
      realHpPctForTint > 30
        ? "bg-gradient-to-r from-green-500 to-green-400"
        : "bg-gradient-to-r from-red-500 to-red-400";
    if (eondeokFrozenHp) {
      barColor =
        'bg-gradient-to-r from-sky-600 via-cyan-400 to-sky-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]';
    } else if (banjitPinkHpActive) {
      barColor = 'bg-gradient-to-r from-pink-500 to-pink-300';
    }

    const hpTrackFrozenClass = eondeokFrozenHp
      ? "border-sky-400/60 bg-slate-950 shadow-[inset_0_0_10px_rgba(56,189,248,0.18),0_0_12px_rgba(125,211,252,0.35)]"
      : "border-slate-700 bg-slate-900 shadow-[0_2px_4px_rgba(0,0,0,0.5)]";

    const inner = (
      <>
        <div className="relative z-[2] h-full w-full overflow-hidden rounded-[inherit]">
          <div
            className={`absolute left-0 top-0 z-[1] h-full transition-all duration-300 ${barColor}`}
            style={{ width: `${realGreenBarPct}%` }}
          />
          {barrierRem > 0 && cyanBarPct > 0 ? (
            <div
              className="absolute top-0 z-[2] h-full bg-gradient-to-r from-sky-500 via-cyan-300 to-sky-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition-all duration-300"
              style={{ left: `${realGreenBarPct}%`, width: `${cyanBarPct}%` }}
              aria-hidden
            />
          ) : null}
        </div>
        <span className="pointer-events-none absolute inset-0 z-[6] flex flex-wrap items-center justify-center gap-x-0.5 px-0.5 text-center text-[8px] font-black tabular-nums leading-tight text-white drop-shadow-[0_1px_1.5px_rgba(0,0,0,1)] md:text-[9px]">
          {barrierRem > 0 ? (
            <>
              <span>{currentHp}</span>
              <span className="font-black text-sky-200 drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]">
                {" "}
                + {barrierRem}
              </span>
            </>
          ) : (
            <span>
              {currentHp} / {maxHp}
            </span>
          )}
        </span>
      </>
    );

    const baekseuExecuteAuraOwner = isPlayerA ? "B" : "A";
    const showBaekseuExecuteHpDecor =
      !!state &&
      fieldHasBaekseuLastStandExecuteAura(
        isPlayerA ? state.playerB.field : state.playerA.field,
        baekseuExecuteAuraOwner,
        state
          ? { playerAField: state.playerA.field, playerBField: state.playerB.field }
          : undefined
      );
    const warnLowHpForExecute = showBaekseuExecuteHpDecor && realHpPctForTint <= 30;
    const trackWarnClass = warnLowHpForExecute ? " pp-baekseu-exec-hpbar-track--warn" : "";
    
    if (layout === "inline") {
      if (mobileFieldDims) {
        return (
          <div
            className={`relative z-[1] shrink-0 rounded-[3px] border overflow-hidden pointer-events-none ${hpTrackFrozenClass}${trackWarnClass}`}
            style={{
              width: mobileFieldDims.width,
              height: mobileFieldDims.height,
              minHeight: mobileFieldDims.height,
              maxHeight: mobileFieldDims.height,
              boxSizing: "border-box",
            }}
          >
            {showBaekseuExecuteHpDecor ? (
              <div className="pp-baekseu-hp-exec-threshold-line" aria-hidden />
            ) : null}
            {inner}
          </div>
        );
      }
      return (
        <div
          className={`relative z-[1] h-3.5 shrink-0 ${fieldUnitWidthClass} rounded-[3px] border overflow-hidden pointer-events-none ${hpTrackFrozenClass}${trackWarnClass}`}
        >
          {showBaekseuExecuteHpDecor ? (
            <div className="pp-baekseu-hp-exec-threshold-line" aria-hidden />
          ) : null}
          {inner}
        </div>
      );
    }
    
    return (
      <div className={`absolute ${isPlayerA ? '-bottom-5' : '-top-5'} left-0 w-full h-3.5 rounded-[3px] border overflow-hidden z-[70] pointer-events-none ${hpTrackFrozenClass}${trackWarnClass}`}>
        {showBaekseuExecuteHpDecor ? (
          <div className="pp-baekseu-hp-exec-threshold-line" aria-hidden />
        ) : null}
        {inner}
      </div>
    );
  };

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const theme = isDarkMode 
    ? { bg: "bg-[#050a14]", border: "border-slate-800", text: "text-slate-200", panel: "bg-slate-900/60 border-slate-700" } 
    : { bg: "bg-slate-100", border: "border-slate-300", text: "text-slate-800", panel: "bg-white border-slate-300 shadow-sm" };

  const fieldCardStyle =
    "shrink-0 w-[85px] md:w-[100px] lg:w-[120px] aspect-[1/1.58] rounded-[8px] border border-white/20 relative z-[10] flex items-center justify-center shadow-lg bg-black/40 overflow-hidden transition-colors";
  const spellCardStyle = "shrink-0 w-[130px] md:w-[155px] lg:w-[190px] aspect-[1.58/1] rounded-[8px] border border-white/20 relative flex items-center justify-center shadow-lg bg-black/40 overflow-hidden transition-colors";
  const handSlotOuterStyle =
    "shrink-0 w-[85px] md:w-[110px] lg:w-[135px] relative overflow-visible";
  const handCardStyle =
    "w-full aspect-[1/1.58] rounded-[8px] border border-white/10 flex items-center justify-center transition-all shadow-md bg-black/30 relative overflow-visible";
  /** 손패 카드 면(이미지·호버 오버레이) — 바깥 셸은 호버 이동·신규 글로우용으로 overflow 유지 */
  const handCardFaceClipClass =
    "absolute inset-0 z-[2] overflow-hidden rounded-[8px] flex items-center justify-center";
  const handNewDrawGlowOverlayClass =
    "pointer-events-none absolute -inset-[3px] z-[1] rounded-[10px] border border-white/75 shadow-[0_0_14px_4px_rgba(255,255,255,0.38),0_0_4px_1px_rgba(255,255,255,0.92)]";
  /** 단하 갈고리 탈취 카드 패 도착 — 시안 외곽(이동 중 비행 카드에는 미적용) */
  const handDanhaStealArrivalGlowOverlayClass =
    "pointer-events-none absolute -inset-[3px] z-[1] rounded-[10px] border-2 border-sky-400/90 shadow-[0_0_22px_6px_rgba(56,189,248,0.55),0_0_8px_2px_rgba(125,211,252,0.85)] animate-pulse";
  /** No.14 무효화 — 상대 스펠 발동 중 손패·중앙 카드 동형 흰 윤곽 명멸 */
  const handMuhyohwaCounterGlowOverlayClass = "pp-muhyohwa-counter-outline";
  /** 심판 패 6장 교체 모드 — 공격 가능 유닛과 동형의 흰색 맥박 */
  const simpanHandReplaceSelectableClass =
    "border-[3px] border-white bg-white/20 shadow-[0_0_25px_rgba(255,255,255,0.9)] animate-pulse cursor-pointer z-[30]";

  const MOBILE_BOARD_W = 540;
  const MOBILE_BOARD_H = 720;
  /** data-mobile-board border 2px × 상하 — box-sizing:border-box 내부 가용 높이 */
  const MOBILE_BOARD_BORDER_INSET = 4;
  /** 모바일 시뮬 scale — 보드+헤더(40)보다 크게 잡아 세로 여유 확보 */
  const MOBILE_SIM_SHELL_HEADER_H = 40;
  const MOBILE_SCALE_BASE_W = MOBILE_BOARD_W;
  const MOBILE_SCALE_BASE_H = MOBILE_BOARD_H + MOBILE_SIM_SHELL_HEADER_H + 40;
  const MOBILE_HP_BAR_H = 8;
  const MOBILE_HAND_CARD_ASPECT = 1.58;
  const MOBILE_HAND_OUTER_W_RATIO = 0.78;
  const MOBILE_HAND_PAD_X = 6;
  const MOBILE_HAND_PAD_Y = 4;
  const MOBILE_HAND_GRID_GAP = 3;
  const MOBILE_HAND_OUTER_W = MOBILE_BOARD_W * MOBILE_HAND_OUTER_W_RATIO;
  const MOBILE_HAND_GRID_INNER_W = MOBILE_HAND_OUTER_W - MOBILE_HAND_PAD_X * 2;
  const MOBILE_HAND_SLOT_W = (MOBILE_HAND_GRID_INNER_W - MOBILE_HAND_GRID_GAP * 5) / 6;
  const MOBILE_HAND_CARD_H = MOBILE_HAND_SLOT_W * MOBILE_HAND_CARD_ASPECT;
  const MOBILE_HAND_H = Math.ceil(MOBILE_HAND_CARD_H) + MOBILE_HAND_PAD_Y * 2 + 4;
  const MOBILE_LEFT_W = 60;
  const MOBILE_RIGHT_W = 100;
  /** 오른쪽 사이드(더 넓은 쪽) 기준 대칭 여백 — 보드 정중앙 필드 */
  const MOBILE_CENTER_W = MOBILE_BOARD_W - MOBILE_RIGHT_W * 2;
  const MOBILE_UNIT_W = 72;
  const MOBILE_UNIT_SLOT_GAP = 8;
  /** 유닛 3칸 행 너비 — 스펠 행과 좌/우 가장자리 정렬 */
  const MOBILE_UNIT_ROW_W = MOBILE_UNIT_W * 3 + MOBILE_UNIT_SLOT_GAP * 2;
  const MOBILE_UNIT_H = 114;
  const MOBILE_SPELL_CARD_ASPECT = 1.58;
  const MOBILE_SPELL_W = 100;
  const MOBILE_SPELL_H = Math.round(MOBILE_SPELL_W / MOBILE_SPELL_CARD_ASPECT);
  /** 스펠↔유닛, 패↔필드 등 모바일 필드 스택 간격 (B/A 동일 값) */
  const MOBILE_FIELD_STACK_GAP = 8;
  const MOBILE_BOARD_EDGE_GAP = 8;
  const MOBILE_MID_H =
    MOBILE_BOARD_H -
    MOBILE_BOARD_BORDER_INSET -
    MOBILE_HP_BAR_H * 2 -
    MOBILE_HAND_H * 2 -
    MOBILE_BOARD_EDGE_GAP * 2;
  /** scale 분모용 — 유닛 뱃지 overflow(~12px), 720px 보드 박스 밖 */
  const MOBILE_BOARD_LAYOUT_BLEED = 12;
  const MOBILE_BOARD_LAYOUT_H = MOBILE_BOARD_H + MOBILE_BOARD_LAYOUT_BLEED;
  const MOBILE_SCALE_SAFETY_PAD = 24;
  const MOBILE_SPELL_SLOT_BOX_STYLE: React.CSSProperties = {
    width: MOBILE_SPELL_W,
    height: MOBILE_SPELL_H,
    aspectRatio: `${MOBILE_SPELL_CARD_ASPECT} / 1`,
    overflow: "hidden",
    flexShrink: 0,
    boxSizing: "border-box",
  };
  /** 모바일 우측 타이머·턴 박스 너비 — 토큰 패널과 동일 */
  const MOBILE_TIMER_BOX_W = 88;
  const MOBILE_TIMER_BOX_PAD_X = 4;
  const MOBILE_TIMER_INNER_W = MOBILE_TIMER_BOX_W - MOBILE_TIMER_BOX_PAD_X * 2;
  const MOBILE_TOKEN_GAP = 2;
  /** 5열×2행 — 패딩·gap 반영 후 살짝 여유 */
  const MOBILE_TOKEN_SIZE = Math.floor((MOBILE_TIMER_INNER_W - MOBILE_TOKEN_GAP * 4) / 5) - 1;
  /** 모바일 필드 유닛 체력바 — B/A 동일 두께 (PC h-3.5 ≈ 14px) */
  const MOBILE_FIELD_UNIT_HP_H = 14;
  const MOBILE_FIELD_HP_GAUGE_RESERVE_H = 14;
  /** 모바일 효과 뱃지 — 4열×gap 2px이 슬롯(72px) 안에 들어가도록 (72-6)/4=16.5 */
  const MOBILE_FIELD_BADGE_GAP = 2;
  const MOBILE_FIELD_BADGE_H = 16;
  const MOBILE_FIELD_BADGE_W = (MOBILE_UNIT_W - MOBILE_FIELD_BADGE_GAP * 3) / 4;
  const MOBILE_FIELD_BADGE_HP_GAP = 4;
  const mobileFieldUnitHpDims = { width: MOBILE_UNIT_W, height: MOBILE_FIELD_UNIT_HP_H };
  const mobileFieldSpellFaceOpts = {
    mobileFieldLayout: true as const,
    mobileSpellSlotW: MOBILE_SPELL_W,
    mobileSpellSlotH: MOBILE_SPELL_H,
  };

  const renderChatBubble = (
    emoji: string | null,
    isTyping: boolean,
    player: "A" | "B",
    isMobileCtx: boolean,
  ) => {
    const content = isTyping ? "···" : emoji;
    if (!content) return null;

    const isMyPlayer =
      (multiplayMyRole === "player_a" && player === "A") ||
      (multiplayMyRole === "player_b" && player === "B");

    const bubbleSize = isMobileCtx ? 36 : 42;
    const fontSize = isMobileCtx ? 18 : 22;

    return (
      <div
        style={{
          position: "absolute",
          left: isMobileCtx ? 4 : 6,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 9999,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            width: bubbleSize,
            height: bubbleSize,
            borderRadius: "50%",
            background: isMyPlayer ? "rgba(56,189,248,0.9)" : "rgba(248,113,113,0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize,
            boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
            border: "2px solid rgba(255,255,255,0.3)",
            flexShrink: 0,
          }}
        >
          {content}
        </div>
        <div
          style={{
            width: 0,
            height: 0,
            borderTop: "6px solid transparent",
            borderBottom: "6px solid transparent",
            borderLeft: `8px solid ${
              isMyPlayer ? "rgba(56,189,248,0.9)" : "rgba(248,113,113,0.9)"
            }`,
          }}
        />
      </div>
    );
  };
  const mobileFieldBadgeRenderOpts = {
    mobileFieldLayout: true as const,
    zoneWidth: MOBILE_UNIT_W,
    badgeW: MOBILE_FIELD_BADGE_W,
    badgeH: MOBILE_FIELD_BADGE_H,
    badgeGap: MOBILE_FIELD_BADGE_GAP,
  };

  const renderMobileFieldHpBar = (
    card: FieldCard | null,
    isPlayerA: boolean,
    slot: "is" | "m" | "os"
  ) => renderHpBar(card, isPlayerA, "inline", slot, mobileFieldUnitHpDims);

  const renderMobileHpRowWithOptionalDKGauge = (
    card: FieldCard | null,
    isPlayerA: boolean,
    fieldSlotKey: string,
    slot: "is" | "m" | "os"
  ) => {
    const player: "A" | "B" = isPlayerA ? "A" : "B";
    const hpInner =
      renderMobileFieldHpBar(card, isPlayerA, slot) ?? (
        <div style={{ width: MOBILE_UNIT_W, height: MOBILE_FIELD_UNIT_HP_H }} aria-hidden />
      );
    const badgeContent = renderStatusBadges(player, slot, card, isPlayerA, mobileFieldBadgeRenderOpts);
    const badgeOverlay = badgeContent ? (
      <div
        style={{
          position: "absolute",
          left: 0,
          width: MOBILE_UNIT_W,
          zIndex: 36,
          pointerEvents: "none",
          ...(isPlayerA
            ? { top: "100%", marginTop: MOBILE_FIELD_BADGE_HP_GAP }
            : { bottom: "100%", marginBottom: MOBILE_FIELD_BADGE_HP_GAP }),
        }}
      >
        {badgeContent}
      </div>
    ) : null;
    const hpBarAnchor = (
      <div style={{ position: "relative", width: MOBILE_UNIT_W, flexShrink: 0 }}>
        {!isPlayerA ? badgeOverlay : null}
        {hpInner}
        {isPlayerA ? badgeOverlay : null}
      </div>
    );
    const mobileHpColumnStyle: React.CSSProperties = {
      width: MOBILE_UNIT_W,
      flexShrink: 0,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 2,
    };
    const gaugeReserveStyle: React.CSSProperties = {
      width: MOBILE_UNIT_W,
      height: MOBILE_FIELD_HP_GAUGE_RESERVE_H,
      flexShrink: 0,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      position: "relative",
      pointerEvents: "none",
    };

    if (isPlayerA) {
      return (
        <div style={mobileHpColumnStyle}>
          {hpBarAnchor}
          <div style={gaugeReserveStyle}>
            {card?.name === DARK_KNIGHT_ID ? (
              renderDarkKnightSoulGaugeBelowHpFlow(card, fieldSlotKey)
            ) : card?.name === EL_WING_ID ? (
              renderElWingSinseokGaugeBelowHpFlow(card)
            ) : card?.name === MAXELLAND_ID ? (
              renderMaxellandTenacityGaugeBelowHpFlow(card, fieldSlotKey)
            ) : card?.name === IVERSON_ID ? (
              renderIversonWaitGaugeRowPlayerA(card)
            ) : (
              <div className="h-[10px] w-full shrink-0 rounded-[3px]" aria-hidden />
            )}
          </div>
        </div>
      );
    }

    return (
      <div style={mobileHpColumnStyle}>
        <div style={gaugeReserveStyle}>
          {renderDarkKnightSoulGaugeAboveHpAbsolute(card, fieldSlotKey)}
          {renderElWingSinseokGaugeAboveHpAbsolute(card, fieldSlotKey)}
          {renderMaxellandTenacityGaugeAboveHpAbsolute(card, fieldSlotKey)}
          {renderIversonWaitGaugeAboveHpAbsolute(card)}
        </div>
        {hpBarAnchor}
      </div>
    );
  };

  const mobileFieldCardStyle =
    "shrink-0 rounded-[6px] border border-white/20 relative z-[10] flex items-center justify-center shadow-lg bg-black/40 overflow-hidden transition-colors";
  const mobileSpellCardStyle =
    "shrink-0 rounded-[6px] border border-white/20 relative flex items-center justify-center shadow-lg bg-black/40 overflow-hidden transition-colors";

  useEffect(() => {
    if (!isMobile) return;
    const updateScale = () => {
      const viewportW = window.visualViewport?.width ?? window.innerWidth;
      const viewportH = window.visualViewport?.height ?? window.innerHeight;
      const scaleX = viewportW / MOBILE_SCALE_BASE_W;
      const scaleY = viewportH / MOBILE_SCALE_BASE_H;
      const scaleBindH =
        (viewportH - MOBILE_SIM_SHELL_HEADER_H - MOBILE_SCALE_SAFETY_PAD) / MOBILE_BOARD_LAYOUT_H;
      const next = Math.min(scaleX, scaleY, scaleBindH);
      setMobileScale(next);
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    window.visualViewport?.addEventListener("resize", updateScale);
    return () => {
      window.removeEventListener("resize", updateScale);
      window.visualViewport?.removeEventListener("resize", updateScale);
    };
  }, [isMobile]);

  const mobileModalOverlayStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 200,
    backgroundColor: "rgba(0,0,0,0.75)",
  };

  const mobileSettingsModalPanelStyle: React.CSSProperties = {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "88%",
    maxWidth: 360,
    maxHeight: "min(80vh, 560px)",
    overflowY: "auto",
    padding: 16,
    boxSizing: "border-box",
  };

  const mobileGameStatsModalPanelStyle: React.CSSProperties = {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "88%",
    maxWidth: 360,
    maxHeight: "80vh",
    overflowY: "auto",
    padding: 16,
    boxSizing: "border-box",
  };

  const SIM_MOBILE_TOUCH_LOCK_CLASS = "pp-simulation-mobile-touch-lock";

  const clearSimulationMobileTouchLock = () => {
    document.documentElement.classList.remove(SIM_MOBILE_TOUCH_LOCK_CLASS);
    document.body.classList.remove(SIM_MOBILE_TOUCH_LOCK_CLASS);
  };

  /** 모바일 시뮬레이션 뷰에서만 브라우저 기본 스크롤·줌 제스처 차단 (로비/메뉴는 영향 없음) */
  useEffect(() => {
    if (!isMobile) {
      clearSimulationMobileTouchLock();
      return;
    }
    document.documentElement.classList.add(SIM_MOBILE_TOUCH_LOCK_CLASS);
    document.body.classList.add(SIM_MOBILE_TOUCH_LOCK_CLASS);
    return clearSimulationMobileTouchLock;
  }, [isMobile]);

  const mobileTouchPassiveFalseOpts: AddEventListenerOptions = { passive: false };

  useEffect(() => {
    if (!isMobile || !state) return;
    const rowA = mobileHandRowRefA.current;
    const rowB = mobileHandRowRefB.current;
    if (!rowA || !rowB) return;

    const onTouchStart = (ev: TouchEvent) => {
      mobileHandTouchStartRef.current(ev);
    };

    rowA.addEventListener("touchstart", onTouchStart, mobileTouchPassiveFalseOpts);
    rowB.addEventListener("touchstart", onTouchStart, mobileTouchPassiveFalseOpts);
    return () => {
      rowA.removeEventListener("touchstart", onTouchStart, mobileTouchPassiveFalseOpts);
      rowB.removeEventListener("touchstart", onTouchStart, mobileTouchPassiveFalseOpts);
    };
  }, [isMobile, Boolean(state)]);

  useEffect(() => {
    if (!isMobile || !state) return;
    const shell = mobileSimulationShellRef.current;
    if (!shell) return;

    const onTouchMove = (ev: TouchEvent) => {
      ev.preventDefault();
    };

    shell.addEventListener("touchmove", onTouchMove, mobileTouchPassiveFalseOpts);
    return () => {
      shell.removeEventListener("touchmove", onTouchMove, mobileTouchPassiveFalseOpts);
    };
  }, [isMobile, Boolean(state)]);

  useEffect(() => {
    return () => {
      detachMobileTouchDocumentListeners();
      resetMobileTouchDragRef();
      clearSimulationMobileTouchLock();
    };
  }, []);

  if (!state) {
    return (
      <div className={`flex flex-col items-center justify-center h-screen w-full gap-5 ${theme.bg}`}>
        <div className="text-xl font-bold text-slate-400 animate-pulse">전장 로딩 중...</div>
        <div className="text-sm font-bold text-slate-500">불러온 카드: <span className={cards?.length === 0 ? "text-rose-500" : "text-sky-500"}>{cards?.length || 0}장</span></div>
        {!multiplayMyRole ? (
          <button
            onClick={() => {
              localStorage.removeItem("pp_sim_save");
              if (cards?.length > 0) runInitialization(cards);
            }}
            disabled={!cards || cards.length === 0}
            className="mt-4 px-6 py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-black text-sm shadow-[0_0_15px_rgba(14,165,233,0.4)] disabled:opacity-30 disabled:grayscale transition-all active:scale-95"
          >
            강제 초기화 및 시작
          </button>
        ) : null}
      </div>
    );
  }

  const simpanCenterDisplay =
    state.simpanHandChoice != null
      ? {
          kind: "replace" as const,
          player: state.simpanHandChoice.player,
          card: state.simpanHandChoice.pendingCard,
        }
      : state.simpanPeekReveal != null
        ? {
            kind: "peek" as const,
            player: state.simpanPeekReveal.player,
            card: state.simpanPeekReveal.pendingCard,
          }
        : null;

  const isMyHandChoice =
    !multiplayMyTeam ||
    !state.simpanHandChoice ||
    state.simpanHandChoice.player === multiplayMyTeam;

  const isMyDiscardTurn =
    !multiplayMyTeam ||
    !witchTarotDiscardPlayer ||
    witchTarotDiscardPlayer === multiplayMyTeam;

  const isOpponentPeekCard =
    !!multiplayMyTeam &&
    (state?.simpanPeekReveal?.player ?? simpanPeekFly?.player) !== multiplayMyTeam;

  /** No.14 무효화 — 상대 액티브 스펠 발동 연출 중 반격 가능 시 중앙 카드·손패 무효화 흰 윤곽 */
  const spellUsageMuhyohwaCounterGlow =
    !spellUsageMuhyohwaCounterResolve &&
    !!spellUsageReveal &&
    !spellUsageFly &&
    !!state.spellUsagePending &&
    state.spellUsagePending.phase === "centerReveal" &&
    !!resolveMuhyohwaCounterOpportunity(
      state,
      state.spellUsagePending.casterPlayer,
      state.spellUsagePending.previewCard
    );

  const activePlayerState = state.currentTurn === 'A' ? state.playerA : state.playerB;
  const isDrawDisabled =
    isInitializing ||
    !state.currentTurn ||
    !canMultiplayDraw() ||
    activePlayerState?.hasDrawnThisTurn ||
    activePlayerState?.hand.length >= 6 ||
    !!state.simpanPeekReveal ||
    !!state.simpanHandChoice ||
    !!spellUsageReveal ||
    !!spellUsageFly ||
    !!danhaStealFly ||
    !!oneNightWagerModal ||
    !!state.oneNightWagerPending ||
    !!state.spellUsagePending ||
    !!state.guihwanPending ||
    !!state.bubbleStationPending ||
    witchTarotFlowActive ||
    !!witchTarotCoin;
  const isDrawHighlight =
    state.currentTurn &&
    canMultiplayDraw() &&
    !isInitializing &&
    !activePlayerState?.hasDrawnThisTurn &&
    activePlayerState?.hand.length < 6 &&
    state.deckCards.length > 0 &&
    !state.simpanPeekReveal &&
    !state.simpanHandChoice &&
    !spellUsageReveal &&
    !spellUsageFly &&
    !danhaStealFly &&
    !oneNightWagerModal &&
    !state.oneNightWagerPending &&
    !state.spellUsagePending &&
    !state.guihwanPending &&
    !state.bubbleStationPending &&
    !witchTarotFlowActive &&
    !witchTarotCoin;

  const isBFieldEmpty = !state.playerB.field.is && !state.playerB.field.m && !state.playerB.field.os;
  const isAFieldEmpty = !state.playerA.field.is && !state.playerA.field.m && !state.playerA.field.os;

  /** 렴초 등 플레이어 HP 직접 공격 불가 유닛일 때는 상대 패널을 타겟 가능처럼 표시하지 않음 */
  const strikeAttackerCardForPlayerHp: FieldCard | null = (() => {
    if (!attackingSlot) return null;
    const [ap, aslot] = attackingSlot.split("-") as ["A" | "B", "is" | "m" | "os"];
    if (ap !== "A" && ap !== "B") return null;
    if (aslot !== "is" && aslot !== "m" && aslot !== "os") return null;
    return (ap === "A" ? state.playerA.field : state.playerB.field)[aslot] ?? null;
  })();
  const strikeAttackerFacingForPlayerHp =
    attackingSlot && strikeAttackerCardForPlayerHp
      ? facingOppUnitAtSlot(
          state,
          attackingSlot.split("-")[0] as "A" | "B",
          attackingSlot.split("-")[1] as "is" | "m" | "os"
        )
      : null;
  const wraithPlayerHpChainStrikeActive =
    !!pendingStartingWraithChainPlayerHp &&
    !!strikeAttackerCardForPlayerHp &&
    isStartingWraithTrueStrikeBasicAttacker(
      strikeAttackerCardForPlayerHp,
      strikeAttackerFacingForPlayerHp
    );
  const canDirectAttackOpponentPlayerHp =
    strikeAttackerCardForPlayerHp != null &&
    (wraithPlayerHpChainStrikeActive ||
      (!isRyeomcho(strikeAttackerCardForPlayerHp) &&
        !(
          isRanigo(strikeAttackerCardForPlayerHp) &&
          isRanigoAllyHealBasicAttackSealed(
            strikeAttackerCardForPlayerHp,
            strikeAttackerFacingForPlayerHp
          )
        )));

  const canLegendarySwordHitPlayerB =
    !!pendingLegendarySwordStrike &&
    pendingLegendarySwordStrike.ownerPlayer === "A" &&
    !legendarySwordHasTargetableEnemyUnit(pendingLegendarySwordStrike);

  const canLegendarySwordHitPlayerA =
    !!pendingLegendarySwordStrike &&
    pendingLegendarySwordStrike.ownerPlayer === "B" &&
    !legendarySwordHasTargetableEnemyUnit(pendingLegendarySwordStrike);

  const canAttackPlayerB =
    canLegendarySwordHitPlayerB ||
    (!!attackingSlot &&
      attackingSlot.startsWith("A-") &&
      isBFieldEmpty &&
      canDirectAttackOpponentPlayerHp);

  const canAttackPlayerA =
    canLegendarySwordHitPlayerA ||
    (!!attackingSlot &&
      attackingSlot.startsWith("B-") &&
      isAFieldEmpty &&
      canDirectAttackOpponentPlayerHp);

  const renderMobilePlayerHpBar = (player: "A" | "B") => {
    const ps = player === "A" ? state.playerA : state.playerB;
    const fillPx = Math.max(0, Math.min(MOBILE_BOARD_W, Math.round((ps.hp / 2000) * MOBILE_BOARD_W)));
    return (
      <div
        data-mobile-player-hp={player}
        style={{
          width: MOBILE_BOARD_W,
          height: MOBILE_HP_BAR_H,
          background: "#0f172a",
          position: "relative",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: fillPx,
            height: MOBILE_HP_BAR_H,
            background:
              player === "A"
                ? "linear-gradient(90deg, #0284c7 0%, #38bdf8 100%)"
                : "linear-gradient(90deg, #dc2626 0%, #fb7185 100%)",
            transition: "width 500ms",
          }}
        />
      </div>
    );
  };

  const renderMobileUnitSlot = (
    player: "A" | "B",
    slot: "is" | "m" | "os",
    slotLabel: string,
    isPlayerA: boolean
  ) => {
    const field = isPlayerA ? state.playerA.field : state.playerB.field;
    const card = field[slot];
    const slotKey = `${player}-${slot}`;
    const flipOpp = shouldFlipOpponentCard(player);

    return (
      <div
        style={{
          width: MOBILE_UNIT_W,
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div style={{ width: MOBILE_UNIT_W, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          {!fieldSlotIsPlayerA(player) ? renderMobileHpRowWithOptionalDKGauge(card, false, slotKey, slot) : null}
          <div className={unitSlotOuterClass} style={{ width: MOBILE_UNIT_W, height: MOBILE_UNIT_H }}>
            {renderMaengsugyeonPoFacingEnemyRect(player, slot, card)}
            <div
              className={getSlotClassName(player, slot, card, mobileFieldCardStyle)}
              style={{
                width: MOBILE_UNIT_W,
                height: MOBILE_UNIT_H,
                ...MOBILE_CARD_TOUCH_BLOCK_STYLE,
              }}
              onContextMenu={preventImageContextMenu}
              data-field-drop
              data-field-player={player}
              data-field-slot={slot}
              data-slot={slot}
              data-player={player}
              onDragOver={e => e.preventDefault()}
              onClick={e => handleFieldClick(e, player, slot, card)}
            >
              {card ? (
                card.image_url ? (
                  <GuardedImg
                    src={card.image_url}
                    alt={slotLabel}
                    style={{
                      width: MOBILE_UNIT_W,
                      height: MOBILE_UNIT_H,
                      objectFit: "cover",
                      transform: flipOpp ? "rotate(180deg)" : undefined,
                    }}
                  />
                ) : (
                  <span
                    style={{
                      fontSize: 8,
                      fontWeight: 700,
                      textAlign: "center",
                      padding: 4,
                      color: isPlayerA ? "#bae6fd" : "#bfdbfe",
                      transform: flipOpp ? "rotate(180deg)" : undefined,
                    }}
                  >
                    {card.name}
                  </span>
                )
              ) : (
                <span style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8" }}>{slotLabel}</span>
              )}
              {renderActionMenu(player, slot, card)}
            </div>
            {renderAebeolaekingRiderOverlay(player, slot, card)}
            {renderFlashOverlay(slotKey, "rounded-[6px]")}
            {renderGeunyangMojaHitFlameOverlay(slotKey, "rounded-[6px]")}
            {renderDiagoHitFlameOverlay(slotKey, "rounded-[6px]")}
            {renderMomoHitFlameOverlay(slotKey, "rounded-[6px]")}
            {renderGhostoneClawHitOverlay(slotKey, "rounded-[6px]")}
            {renderIversonClawHitOverlay(slotKey, "rounded-[6px]")}
            {renderEristinaHitLineOverlay(slotKey, "rounded-[6px]")}
            {renderCheolgibyeongFieldRing(player, slot, card)}
            {renderRyeomchoFieldRing(player, slot, card)}
            {renderMaryDefenseFieldRing(player, slot, card)}
            {renderBanjitgoriFieldRing(player, slot, card)}
            {renderPhilipFacingRing(player, slot, card)}
            {renderDinnerFacingRing(player, slot, card)}
            {renderMaengsugyeonPoThreatRing(player, slot, card)}
            {renderStartingHeraldPrivilegeTargetOutline(player, slot, card)}
            {renderEondeokSilenceOutline(card, "rounded-[6px]")}
            {renderStackingGaugeFieldRings(player, slot, card)}
            {renderStunSwirlOverlay(card, "rounded-[6px]", slotKey)}
            {renderLegendarySwordChargeAura(player, slot, card, "rounded-[6px]")}
            {renderIversonWaitAuraOverlay(card, "rounded-[6px]", slotKey)}
            {renderBaekseuInvulnRing(card, "rounded-[6px]", player, slot)}
          </div>
          {fieldSlotIsPlayerA(player) ? renderMobileHpRowWithOptionalDKGauge(card, true, slotKey, slot) : null}
          <div className={fieldSlotCombatPopupOverlayClass}>{renderCombatPopups(slotKey)}</div>
        </div>
      </div>
    );
  };

  const renderMobileHandRow = (player: "A" | "B") => {
    const isPlayerA = player === "A";
    const hand = isPlayerA ? state.playerA.hand : state.playerB.hand;
    const handRefs = isPlayerA ? handSlotOuterRefsA : handSlotOuterRefsB;
    const borderColor = isPlayerA
      ? state.currentTurn === "A"
        ? "#0ea5e9"
        : "#334155"
      : state.currentTurn === "B"
        ? "#f43f5e"
        : "#334155";
    const bgColor = isPlayerA
      ? state.currentTurn === "A"
        ? "rgba(8,47,73,0.45)"
        : "rgba(0,0,0,0.25)"
      : state.currentTurn === "B"
        ? "rgba(76,5,25,0.45)"
        : "rgba(0,0,0,0.25)";

    return (
      <div style={{ position: "relative", overflow: "visible" }}>
        {renderChatBubble(
          isPlayerA
            ? multiplayMyRole === "player_a"
              ? myEmoji
              : opponentEmoji
            : multiplayMyRole === "player_b"
              ? myEmoji
              : opponentEmoji,
          isPlayerA
            ? multiplayMyRole === "player_b" && opponentTyping
            : multiplayMyRole === "player_a" && opponentTyping,
          player,
          true,
        )}
        <div
          ref={isPlayerA ? mobileHandRowRefA : mobileHandRowRefB}
          onClick={() => setSelectedHandCard(null)}
          style={{
            width: "78%",
            marginLeft: "auto",
            marginRight: "auto",
            ...(isPlayerA
              ? { marginTop: MOBILE_BOARD_EDGE_GAP }
              : { marginBottom: MOBILE_BOARD_EDGE_GAP }),
            height: MOBILE_HAND_H,
            border: `2px solid ${borderColor}`,
            borderRadius: 12,
            background: bgColor,
            overflow: "hidden",
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            gap: MOBILE_HAND_GRID_GAP,
            paddingTop: MOBILE_HAND_PAD_Y,
            paddingBottom: MOBILE_HAND_PAD_Y,
            paddingLeft: MOBILE_HAND_PAD_X,
            paddingRight: MOBILE_HAND_PAD_X,
            boxSizing: "border-box",
            touchAction: "none",
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => {
            const card = hand[i];
            const momoDiscard =
              pendingSkill?.name === PENDING_SKILL.MOMO_EAT &&
              pendingSkill.player === player &&
              state.currentTurn === player &&
              !!card;
            const danhaSteal =
              pendingSkill?.name === PENDING_SKILL.DANHA_GALGORI &&
              pendingSkill.player === (isPlayerA ? "B" : "A") &&
              state.currentTurn === (isPlayerA ? "B" : "A") &&
              !!card;
            const simpanPick = state.simpanHandChoice?.player === player && !!card;
            const simpanPeekBlockDrag = state.simpanPeekReveal?.player === player;
            const witchTarotDiscard = witchTarotDiscardPlayer === player && !!card;
            const canPointerDrag =
              !!card &&
              canMultiplayHandDragPlayer(player) &&
              !pendingSkill &&
              !simpanPick &&
              !simpanPeekBlockDrag &&
              !witchTarotDiscard &&
              !witchTarotFlowActive &&
              (state.currentTurn === player ||
                canMuhyohwaCounterFromHandSlot(state, player, i, card));
            const muhyohwaHandGlow =
              spellUsageMuhyohwaCounterGlow &&
              !!card &&
              canMuhyohwaCounterFromHandSlot(state, player, i, card);
            const isDragSource = handDrag?.player === player && handDrag.cardIndex === i;
            const isDanhaStealFlySource =
              danhaStealFly?.victimPlayer === player && danhaStealFly.victimHandIndex === i;

            const isSelected =
              !!card &&
              selectedHandCard?.player === player &&
              selectedHandCard.index === i;

            mobileHandTapHandlersRef.current[`${player}-${i}`] = () => {
              if (simpanPick) {
                resolveSimpanHandPick(player, i);
              } else if (witchTarotDiscard) {
                resolveWitchTarotDiscard(player, i);
              } else if (momoDiscard) {
                handleSkillDiscard(i, player);
              } else if (danhaSteal) {
                handleDanhaSteal(i, player);
              }
            };

            return (
              <div
                key={i}
                ref={el => {
                  handRefs.current[i] = el;
                }}
                onClick={e => e.stopPropagation()}
                style={{
                  width: "100%",
                  minWidth: 0,
                  aspectRatio: "1 / 1.58",
                  position: "relative",
                  alignSelf: "center",
                }}
              >
                <div
                  draggable={false}
                  className={`touch-manipulation relative overflow-visible rounded-[6px] flex items-center justify-center ${
                    card
                      ? momoDiscard
                        ? "border-2 border-amber-400 bg-amber-900/40 animate-pulse cursor-pointer"
                        : danhaSteal
                          ? "border-2 border-sky-400 bg-sky-900/35 animate-pulse cursor-pointer"
                          : witchTarotDiscard
                            ? "border-2 border-violet-300 bg-violet-950/50 animate-pulse cursor-pointer"
                            : simpanPick
                              ? simpanHandReplaceSelectableClass
                              : isPlayerA
                                ? "border border-sky-400/50 bg-black/30"
                                : "border border-rose-400/40 bg-rose-950/60"
                      : "border border-dashed border-slate-700/50 bg-transparent"
                  } ${isDragSource || isDanhaStealFlySource ? (isMobile ? "pointer-events-none" : "opacity-0 pointer-events-none") : ""} ${isMultiplayOpponent(player) && !danhaSteal ? "pointer-events-none" : ""} ${canPointerDrag ? "cursor-grab active:cursor-grabbing select-none" : "cursor-pointer"}`}
                  style={{ width: "100%", height: "100%", touchAction: "none" }}
                  data-mobile-hand-card="1"
                  data-hand-player={player}
                  data-hand-index={i}
                >
                  {card && hasBubbleStationHandDiscardFlashMark(card) ? (
                    <div className="absolute inset-0 z-[6] rounded-[6px] pp-bubble-station-hand-wipe pointer-events-none" aria-hidden />
                  ) : card && ppSimHandDanhaStealArrivalToken(card) ? (
                    <div className={handDanhaStealArrivalGlowOverlayClass} aria-hidden />
                  ) : muhyohwaHandGlow ? (
                    <div className={handMuhyohwaCounterGlowOverlayClass} aria-hidden />
                  ) : card && ppSimHandNewGlowToken(card) ? (
                    <div className={handNewDrawGlowOverlayClass} aria-hidden />
                  ) : null}
                  {card ? (
                    <div
                      className={handCardFaceClipClass}
                      style={{ width: "100%", height: "100%", ...MOBILE_CARD_TOUCH_BLOCK_STYLE }}
                      onContextMenu={preventImageContextMenu}
                    >
                      {isMultiplayOpponent(player) ? (
                        <MultiplayCardBackFace />
                      ) : card.image_url ? (
                        <GuardedImg
                          src={card.image_url}
                          alt={card.name}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            transform: shouldFlipOpponentCard(player) ? "rotate(180deg)" : undefined,
                          }}
                        />
                      ) : (
                        <span
                          style={{
                            fontSize: 8,
                            fontWeight: 700,
                            textAlign: "center",
                            padding: 4,
                            color: isPlayerA ? "#bae6fd" : "#fecdd3",
                            transform: shouldFlipOpponentCard(player) ? "rotate(180deg)" : undefined,
                          }}
                        >
                          {card.name}
                        </span>
                      )}
                    </div>
                  ) : (
                    <IconDeck className={`w-5 h-5 opacity-20 ${isPlayerA ? "text-sky-300" : "text-rose-300"}`} />
                  )}
                  {isSelected && !isMultiplayOpponent(player) ? (
                    <div
                      data-mobile-hand-detail-overlay="1"
                      style={{
                        position: "absolute",
                        inset: 0,
                        backgroundColor: "rgba(0,0,0,0.7)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 30,
                        borderRadius: 6,
                        pointerEvents: "none",
                      }}
                    >
                      <button
                        type="button"
                        data-mobile-hand-detail-btn="1"
                        onClick={e => {
                          e.stopPropagation();
                          openHandCardCodexDetail(card);
                          setSelectedHandCard(null);
                        }}
                        style={{ pointerEvents: "auto" }}
                        className={`px-3 py-1.5 bg-slate-900/90 text-white text-[9px] font-bold rounded-lg border border-white/20 shadow-lg ${
                          isPlayerA ? "hover:bg-sky-600" : "hover:bg-rose-600"
                        }`}
                      >
                        상세 보기
                      </button>
                    </div>
                  ) : null}
                </div>
                {renderFlashOverlay(`hand-${player}-${i}`, "rounded-[6px]")}
              </div>
            );
        })}
        </div>
      </div>
    );
  };

  const renderMobilePlayerTokenPanel = (player: "A" | "B") => {
    const isPlayerA = player === "A";
    const ps = isPlayerA ? state.playerA : state.playerB;
    const canAttack = isPlayerA ? canAttackPlayerA : canAttackPlayerB;
    const turnActive = state.currentTurn === player;
    const panelH = 72;

    return (
      <div
        style={{
          width: MOBILE_TIMER_BOX_W,
          height: panelH,
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          borderRadius: 8,
          border: canAttack
            ? "2px solid #ffffff"
            : turnActive
              ? isPlayerA
                ? "2px solid #0ea5e9"
                : "2px solid #f43f5e"
              : "2px solid #334155",
          background: canAttack ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.35)",
          boxSizing: "border-box",
          paddingLeft: MOBILE_TIMER_BOX_PAD_X,
          paddingRight: MOBILE_TIMER_BOX_PAD_X,
          overflow: "hidden",
          cursor: canAttack ? "crosshair" : "default",
        }}
        onClick={e => {
          if (canAttack) {
            e.stopPropagation();
            handlePlayerAttack(player);
          }
        }}
      >
        {renderFlashOverlay(`player-${player}`, "rounded-lg")}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: MOBILE_TOKEN_GAP,
            width: MOBILE_TIMER_INNER_W,
            overflow: "hidden",
            pointerEvents: "none",
            justifyContent: "center",
          }}
        >
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              style={{
                width: MOBILE_TOKEN_SIZE,
                height: MOBILE_TOKEN_SIZE,
                borderRadius: 3,
                border: i < ps.tokens ? "1px solid #fdba74" : "1px solid #334155",
                background: i < ps.tokens ? "#f97316" : "#1e293b",
                flexShrink: 0,
                boxSizing: "border-box",
              }}
            />
          ))}
        </div>
        <div
          className="pointer-events-none absolute inset-0 z-[80] overflow-visible rounded-lg"
          style={{ width: MOBILE_TIMER_BOX_W, height: panelH }}
        >
          {renderCombatPopups(`player-${player}`)}
        </div>
      </div>
    );
  };

  const chatPanel = multiplayMyRole ? (
    <div
      onClick={e => e.stopPropagation()}
      style={{
      display: "flex",
      flexDirection: "column",
      flex: 1,
      minHeight: 0,
      borderTop: "1px solid rgba(255,255,255,0.08)",
      marginTop: 8,
      paddingTop: 8,
      width: "100%",
      overflowY: "auto",
      touchAction: "pan-y",
    }}>
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 5,
          paddingRight: 6,
          minHeight: 0,
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(148,163,184,0.3) transparent",
        }}
      >
        {chatMessages.length === 0 && (
          <p style={{ fontSize: 10, color: "#475569", textAlign: "center", marginTop: 8 }}>
            채팅을 시작해보세요
          </p>
        )}
        {chatMessages.map((msg, idx) => (
          <div key={idx} style={{
            display: "flex",
            flexDirection: "column",
            alignItems: msg.sender === "me" ? "flex-end" : "flex-start",
          }}>
            <div style={{
              maxWidth: "90%",
              padding: "5px 10px",
              borderRadius: msg.sender === "me" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
              background: msg.sender === "me" ? "rgba(56,189,248,0.25)" : "rgba(255,255,255,0.1)",
              fontSize: 12,
              color: msg.sender === "me" ? "#7dd3fc" : "#e2e8f0",
              wordBreak: "break-all",
              lineHeight: 1.5,
            }}>
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={chatBottomRef} />
      </div>

      {showEmojiPicker && (
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
          padding: 4,
          background: "rgba(0,0,0,0.3)",
          borderRadius: 8,
          marginBottom: 4,
        }}>
          {EMOJI_LIST.map(emoji => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
              if (myEmojiTimerRef.current) clearTimeout(myEmojiTimerRef.current);
              setMyEmoji(emoji);
              myEmojiTimerRef.current = setTimeout(() => setMyEmoji(null), 3000);
              onSendChatMessage?.(emoji, true);
                setShowEmojiPicker(false);
              }}
              style={{
                background: "none",
                border: "none",
                fontSize: 16,
                cursor: "pointer",
                padding: 2,
                borderRadius: 4,
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <button
          type="button"
          onClick={() => setShowEmojiPicker(prev => !prev)}
          style={{
            background: "none",
            border: "none",
            fontSize: 16,
            cursor: "pointer",
            padding: 2,
            flexShrink: 0,
          }}
        >
          😊
        </button>
        <input
          type="text"
          value={chatInput}
          onChange={e => {
            setChatInput(e.target.value);
            onSendTypingIndicator?.();
          }}
          onKeyDown={e => {
            if (e.key === "Enter" && chatInput.trim()) {
              onSendChatMessage?.(chatInput);
              setChatInput("");
              setShowEmojiPicker(false);
            }
          }}
          placeholder="채팅..."
          maxLength={50}
          style={{
            flex: 1,
            minWidth: 0,
            padding: "4px 6px",
            borderRadius: 6,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.06)",
            color: "#e2e8f0",
            fontSize: 11,
            outline: "none",
          }}
        />
        <button
          type="button"
          onClick={() => {
            if (!chatInput.trim()) return;
            onSendChatMessage?.(chatInput);
            setChatInput("");
            setShowEmojiPicker(false);
          }}
          style={{
            background: "rgba(56,189,248,0.2)",
            border: "none",
            borderRadius: 6,
            padding: "4px 6px",
            color: "#7dd3fc",
            fontSize: 11,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          전송
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div 
      className={`w-full h-screen ${isMobile ? "overflow-hidden bg-black" : `overflow-auto ${theme.bg}`} ${theme.text} flex items-center justify-center ${isMobile ? "p-0" : "p-4"} relative`}
      onClick={() => {
        setSelectedSlot(null);
        setAttackingSlot(null);
        setPendingSecondaryAttack(null);
        applyStartingWraithChainPending(null);
        setAttackOptionOverride(null);
        setPendingSkill(null);
        setPendingLibutyAllEnemiesAttack(null);
        setSelectedHandCard(null);
      }}
    >
      {!isWitchTarotOtherPlayerStep &&
      state?.simpanPeekReveal &&
      state.simpanPeekReveal.peekKind !== "opening" &&
      !simpanPeekFly ? (
        <div
          role="presentation"
          aria-label="클릭하면 패로 이동합니다"
          className="fixed inset-0 z-[124] cursor-pointer touch-manipulation bg-transparent"
          onPointerDown={e => {
            e.preventDefault();
            simpanPeekSkipToFlyRef.current?.();
          }}
        />
      ) : null}
      {!isWitchTarotOtherPlayerStep && simpanPeekFly ? (
        <div
          aria-hidden
          className={
            simpanPeekFly.isOpening
              ? "fixed z-[90] pointer-events-none overflow-hidden rounded-[10px] border border-slate-600/55 bg-black/85 shadow-md"
              : "fixed z-[126] pointer-events-none overflow-hidden rounded-[10px] border-2 border-white/90 bg-black/85 shadow-[0_0_28px_rgba(255,255,255,0.45)] pp-simpan-pending-glow"
          }
          style={{
            left: 0,
            top: 0,
            width: simpanPeekFly.phase === 1 ? simpanPeekFly.to.w : simpanPeekFly.from.w,
            height: simpanPeekFly.phase === 1 ? simpanPeekFly.to.h : simpanPeekFly.from.h,
            transform: `translate3d(${simpanPeekFly.phase === 1 ? simpanPeekFly.to.x : simpanPeekFly.from.x}px, ${simpanPeekFly.phase === 1 ? simpanPeekFly.to.y : simpanPeekFly.from.y}px, 0)`,
            transition:
              simpanPeekFly.phase === 1
                ? (() => {
                    const ms = simpanPeekFly.flyMs ?? SIMPAN_PEEK_HAND_FLY_MS;
                    const ease = "cubic-bezier(0.22, 1, 0.36, 1)";
                    return `transform ${ms}ms ${ease}, width ${ms}ms ${ease}, height ${ms}ms ${ease}`;
                  })()
                : "none",
            willChange: "transform, width, height",
          }}
        >
          {isOpponentPeekCard ? (
            <div className="w-full h-full bg-white rounded-xl" />
          ) : simpanPeekFly.pendingCard.image_url ? (
            <GuardedImg
              src={simpanPeekFly.pendingCard.image_url}
              alt={simpanPeekFly.pendingCard.name}
              className={`h-full w-full object-cover ${opponentCardRotateClass(simpanPeekFly.player)}`}
            />
          ) : (
            <div
              className={`flex h-full w-full items-center justify-center p-2 text-center text-[10px] font-bold text-amber-100 ${opponentCardRotateClass(simpanPeekFly.player)}`}
            >
              {simpanPeekFly.pendingCard.name}
            </div>
          )}
        </div>
      ) : null}
      {danhaStealFly ? (
        <div
          aria-hidden
          className="fixed z-[126] pointer-events-none overflow-hidden rounded-[10px] border border-white/25 bg-black/85 shadow-lg"
          style={{
            left: 0,
            top: 0,
            width: danhaStealFly.phase === 1 ? danhaStealFly.to.w : danhaStealFly.from.w,
            height: danhaStealFly.phase === 1 ? danhaStealFly.to.h : danhaStealFly.from.h,
            transform: `translate3d(${danhaStealFly.phase === 1 ? danhaStealFly.to.x : danhaStealFly.from.x}px, ${danhaStealFly.phase === 1 ? danhaStealFly.to.y : danhaStealFly.from.y}px, 0)`,
            transition:
              danhaStealFly.phase === 1
                ? (() => {
                    const ms = danhaStealFly.flyMs ?? DANHA_STEAL_HAND_FLY_MS;
                    const ease = "cubic-bezier(0.25, 0.85, 0.35, 1)";
                    return `transform ${ms}ms ${ease}, width ${ms}ms ${ease}, height ${ms}ms ${ease}`;
                  })()
                : "none",
            willChange: "transform, width, height",
          }}
        >
          {danhaStealFly.stolenCard.image_url ? (
            <GuardedImg
              src={danhaStealFly.stolenCard.image_url}
              alt={danhaStealFly.stolenCard.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center p-2 text-center text-[10px] font-bold text-sky-100">
              {danhaStealFly.stolenCard.name}
            </div>
          )}
        </div>
      ) : null}
      {spellUsageFly ? (
        <div
          aria-hidden
          className="fixed z-[126] pointer-events-none"
          style={{
            left: 0,
            top: 0,
            overflow: "visible",
            width: (() => {
              const isSlot = spellUsageFly.flyTarget === "spellSlot";
              const ph = spellUsageFly.phase;
              return isSlot ? spellUsageFly.from.w : ph === 1 ? spellUsageFly.to.w : spellUsageFly.from.w;
            })(),
            height: (() => {
              const isSlot = spellUsageFly.flyTarget === "spellSlot";
              const ph = spellUsageFly.phase;
              return isSlot ? spellUsageFly.from.h : ph === 1 ? spellUsageFly.to.h : spellUsageFly.from.h;
            })(),
            transform: `translate3d(${spellUsageFly.phase === 1 ? spellUsageFly.to.x : spellUsageFly.from.x}px, ${spellUsageFly.phase === 1 ? spellUsageFly.to.y : spellUsageFly.from.y}px, 0)`,
            transition:
              spellUsageFly.phase === 1
                ? (() => {
                    const ms = spellUsageFly.flyMs ?? SPELL_USAGE_HAND_FLY_MS;
                    const ease = "cubic-bezier(0.22, 1, 0.36, 1)";
                    const isSlot = spellUsageFly.flyTarget === "spellSlot";
                    return isSlot
                      ? `transform ${ms}ms ${ease}`
                      : `transform ${ms}ms ${ease}, width ${ms}ms ${ease}, height ${ms}ms ${ease}`;
                  })()
                : "none",
            willChange:
              spellUsageFly.flyTarget === "spellSlot"
                ? "transform"
                : "transform, width, height",
          }}
        >
          {(() => {
            const ms = spellUsageFly.flyMs ?? SPELL_USAGE_HAND_FLY_MS;
            const ease = "cubic-bezier(0.22, 1, 0.36, 1)";
            const isSpellSlotFly = spellUsageFly.flyTarget === "spellSlot";
            const rotateEndDeg = spellUsageFly.targetPlayer === "A" ? -90 : 90;
            const rotateDelayMs = isSpellSlotFly ? Math.round(ms * 0.52) : 0;
            const rotateDurMs = isSpellSlotFly ? Math.max(120, ms - rotateDelayMs) : 0;
            const innerTransform =
              spellUsageFly.phase === 1 && isSpellSlotFly
                ? `rotate(${rotateEndDeg}deg)`
                : "rotate(0deg)";
            return (
              <div
                className="relative box-border h-full w-full overflow-hidden rounded-[10px] border-2 border-white/90 bg-black/85 shadow-[0_0_28px_rgba(255,255,255,0.45)] pp-simpan-pending-glow"
                style={{
                  transform: innerTransform,
                  transformOrigin: "center center",
                  transition:
                    spellUsageFly.phase === 1 && isSpellSlotFly
                      ? `transform ${rotateDurMs}ms ${ease} ${rotateDelayMs}ms`
                      : "none",
                  willChange: "transform",
                }}
              >
                {shouldShowMultiplaySpellUsageBack(spellUsageFly.casterPlayer, spellUsageFly.previewCard) ? (
                  <MultiplayCardBackFace />
                ) : spellUsageFly.centerShowsCardBack ? (
                  <HiddenSpellCardBackFace />
                ) : spellUsageFly.previewCard.image_url ? (
                  <GuardedImg
                    src={spellUsageFly.previewCard.image_url}
                    alt={spellUsageFly.previewCard.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center p-2 text-center text-[10px] font-bold text-amber-100">
                    {spellUsageFly.previewCard.name}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      ) : null}
      {handDrag && !isMobile && (
        <div
          aria-hidden
          className="fixed z-[90] pointer-events-none overflow-hidden rounded-[8px] border border-white/15 bg-black/40 shadow-2xl"
          style={{
            width: handDrag.width,
            height: handDrag.height,
            left: handDrag.clientX - handDrag.offsetX,
            top: handDrag.clientY - handDrag.offsetY,
          }}
        >
          {handDrag.card.image_url ? (
            <GuardedImg
              src={handDrag.card.image_url}
              alt={handDrag.card.name}
              className={`h-full w-full object-cover ${handDrag.opponentCardFlipped ? "rotate-180" : ""}`}
            />
          ) : (
            <span
              className={`flex h-full items-center justify-center p-2 text-center text-[10px] font-bold leading-tight lg:text-[11px] ${handDrag.player === "B" ? "text-rose-200" : "text-sky-200"} ${handDrag.opponentCardFlipped ? "rotate-180" : ""}`}
            >
              {handDrag.card.name}
            </span>
          )}
        </div>
      )}

      {oneNightWagerModal ? (
        <OneNightWagerModal
          costsA={oneNightWagerModal.costsA}
          costsB={oneNightWagerModal.costsB}
          glowPlayer={oneNightWagerModal.glowPlayer}
        />
      ) : null}

      {witchTarotCoin ? (
        <WitchTarotCoinOverlay
          phase={witchTarotCoin.phase}
          heads={witchTarotCoin.phase === "RESULT" ? witchTarotCoin.heads : null}
          flipTick={witchTarotCoinFlipTick}
        />
      ) : null}

      {(displayWinner || isDraw) && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden">
          <div className={`absolute inset-0 animate-[pulse_1s_ease-in-out_infinite] mix-blend-screen pointer-events-none ${displayWinner === 'A' ? 'bg-sky-500/40' : displayWinner === 'B' ? 'bg-rose-500/40' : 'bg-amber-500/35'}`} />
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
          
          <div className={`relative z-10 flex flex-col items-center justify-center p-16 md:p-24 lg:p-32 rounded-[4rem] border-8 ${displayWinner === 'A' ? 'border-sky-500 shadow-[0_0_150px_rgba(14,165,233,0.8)] bg-sky-950/60' : displayWinner === 'B' ? 'border-rose-500 shadow-[0_0_150px_rgba(244,63,94,0.8)] bg-rose-950/60' : 'border-amber-400 shadow-[0_0_130px_rgba(251,191,36,0.65)] bg-amber-950/60'} animate-[scaleIn_0.5s_ease-out]`}>
            <h2 className={`text-6xl md:text-8xl lg:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b ${displayWinner === 'A' ? 'from-white to-sky-400' : displayWinner === 'B' ? 'from-white to-rose-400' : 'from-white to-amber-300'} tracking-widest drop-shadow-[0_10px_20px_rgba(0,0,0,1)] mb-4 animate-[bounce_1.5s_ease-in-out_infinite]`}>
              {displayWinner === "DRAW" ? "DRAW" : `PLAYER ${displayWinner} WIN!`}
            </h2>
            {multiplayEndUi?.opponentLeft ? (
              <p className="text-2xl md:text-3xl font-bold text-amber-300 mb-4 text-center drop-shadow-md">
                상대방이 게임을 떠났습니다.
              </p>
            ) : isDraw ? (
              <p className="text-2xl md:text-3xl font-bold text-amber-200 mb-4 text-center drop-shadow-md">
                {resultLabel}
              </p>
            ) : multiplaySessionWinner && multiplayMyRole ? (
              <p className="text-2xl md:text-3xl font-bold text-slate-200 mb-4 text-center drop-shadow-md">
                {isMyWin ? `${resultLabel}했습니다.` : `${resultLabel}했습니다.`}
              </p>
            ) : (
              <p className="text-2xl md:text-3xl font-bold text-slate-200 mb-4 text-center drop-shadow-md">
                상대 플레이어의 체력이 0이 되어 게임이 종료되었습니다.
              </p>
            )}
            {multiplayEndUi?.rematchStatus === "waiting" ? (
              <p className="text-lg md:text-xl font-semibold text-sky-300 mb-4 text-center">
                상대방의 응답을 기다리는 중...
              </p>
            ) : null}
            {multiplayEndUi?.rematchStatus === "incoming" ? (
              <p className="text-lg md:text-xl font-semibold text-amber-300 mb-4 text-center">
                상대방이 다시 플레이를 요청했습니다.
              </p>
            ) : null}
            
            <p className="text-xl md:text-2xl font-mono font-black text-amber-400 mb-16 tracking-widest drop-shadow-lg">
              게임 시간 : {Math.floor((state?.elapsedTime || 0) / 60)}분 {(state?.elapsedTime || 0) % 60}초
            </p>

            <div className="flex flex-col sm:flex-row gap-6 sm:gap-10 w-full sm:w-auto">
              <button 
                onClick={() => {
                  if (multiplayEndUi) {
                    multiplayEndUi.onLeaveLobby();
                  } else if (onBackToLobby) {
                    onBackToLobby();
                  } else {
                    window.location.href = '/';
                  }
                }}
                className="px-10 py-5 bg-slate-800 hover:bg-slate-700 text-white rounded-3xl font-black text-xl transition-colors border-2 border-slate-600 active:scale-95 shadow-2xl w-full sm:w-auto"
              >
                로비로 돌아가기
              </button>
              <button
                type="button"
                onClick={() => setIsGameStatsOpen(true)}
                className="px-10 py-5 bg-emerald-900 hover:bg-emerald-800 text-white rounded-3xl font-black text-xl transition-colors border-2 border-emerald-500 active:scale-95 shadow-2xl w-full sm:w-auto"
              >
                게임 통계
              </button>
              {multiplayEndUi?.rematchStatus === "incoming" ? (
                <>
                  <button
                    type="button"
                    onClick={multiplayEndUi.onRematchAccept}
                    className={`px-10 py-5 text-white rounded-3xl font-black text-xl transition-colors border-4 active:scale-95 shadow-2xl w-full sm:w-auto ${displayWinner === 'A' ? 'bg-sky-600 hover:bg-sky-500 border-sky-300 shadow-[0_0_30px_rgba(14,165,233,0.6)]' : displayWinner === 'B' ? 'bg-rose-600 hover:bg-rose-500 border-rose-300 shadow-[0_0_30px_rgba(244,63,94,0.6)]' : 'bg-amber-600 hover:bg-amber-500 border-amber-300 shadow-[0_0_30px_rgba(251,191,36,0.6)]'}`}
                  >
                    수락
                  </button>
                  <button
                    type="button"
                    onClick={multiplayEndUi.onRematchReject}
                    className="px-10 py-5 bg-slate-700 hover:bg-slate-600 text-white rounded-3xl font-black text-xl transition-colors border-2 border-slate-500 active:scale-95 shadow-2xl w-full sm:w-auto"
                  >
                    거절
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => {
                    if (multiplayEndUi) {
                      multiplayEndUi.onRematch();
                    } else {
                      handleReset();
                    }
                  }}
                  disabled={multiplayEndUi?.rematchStatus === "waiting"}
                  className={`px-10 py-5 text-white rounded-3xl font-black text-xl transition-colors border-4 active:scale-95 shadow-2xl w-full sm:w-auto disabled:opacity-60 disabled:cursor-not-allowed ${displayWinner === 'A' ? 'bg-sky-600 hover:bg-sky-500 border-sky-300 shadow-[0_0_30px_rgba(14,165,233,0.6)]' : displayWinner === 'B' ? 'bg-rose-600 hover:bg-rose-500 border-rose-300 shadow-[0_0_30px_rgba(244,63,94,0.6)]' : 'bg-amber-600 hover:bg-amber-500 border-amber-300 shadow-[0_0_30px_rgba(251,191,36,0.6)]'}`}
                >
                  다시 플레이
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {isGameStatsOpen && state && (
        <div
          style={isMobile ? mobileModalOverlayStyle : undefined}
          className={
            isMobile
              ? undefined
              : "fixed inset-0 z-[210] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          }
          onClick={() => setIsGameStatsOpen(false)}
        >
          <div
            style={isMobile ? mobileGameStatsModalPanelStyle : undefined}
            className={
              isMobile
                ? "bg-[#0a1628] border-2 border-slate-600 rounded-2xl shadow-2xl text-[13px]"
                : "bg-[#0a1628] border-2 border-slate-600 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            }
            onClick={e => e.stopPropagation()}
          >
            <div
              className={`flex items-center justify-between gap-4 border-b border-slate-700 shrink-0 ${
                isMobile ? "pb-3 mb-3" : "px-5 py-4"
              }`}
            >
              <h2
                className={`font-black text-white tracking-wide ${isMobile ? "text-[18px]" : "text-xl"}`}
              >
                게임 통계
              </h2>
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-bold text-slate-200 border border-slate-600"
                onClick={() => setIsGameStatsOpen(false)}
              >
                닫기
              </button>
            </div>
            <div
              className={`text-slate-300 border-b border-slate-800 shrink-0 space-y-1 ${
                isMobile ? "pb-3 mb-3 text-[13px]" : "px-5 py-4 text-sm"
              }`}
            >
              <p>
                <span className="text-slate-500">턴 수</span>{" "}
                <span className="font-mono font-bold text-amber-200">{state.turnCount}</span>
                {" · "}
                <span className="text-slate-500">경과</span>{" "}
                <span className="font-mono font-bold text-sky-200">
                  {Math.floor((state.elapsedTime || 0) / 60)}분 {(state.elapsedTime || 0) % 60}초
                </span>
                {winner && (
                  <>
                    {" · "}
                    <span className="text-slate-500">결과</span>{" "}
                    <span className="font-black text-white">PLAYER {winner} 승리</span>
                  </>
                )}
              </p>
              <p className="text-xs text-slate-500">
                필드에 코스트를 지불하고 배치한 유닛만 집계합니다. 감소된 피해는 반짓고리·방어 패시브·무적 등으로 막거나 줄인 양의 합(추정)입니다. 피해·회복·감소 피해 수치는 표시만 50 단위로 반올림합니다(처치 제외).
              </p>
            </div>
            <div className={isMobile ? "space-y-6" : "overflow-y-auto flex-1 px-5 py-4 space-y-8"}>
              <section>
                <h3
                  className={`font-black text-emerald-400 mb-3 tracking-wider ${
                    isMobile ? "text-[13px]" : "text-sm"
                  }`}
                >
                  유닛
                </h3>
                {gameStatsDisplayUnitRows.length === 0 ? (
                  <p className="text-sm text-slate-500">아직 기록된 유닛이 없습니다.</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-slate-700">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-2 px-1">
                      <label className="flex cursor-pointer items-center gap-2 select-none text-sm text-slate-300">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-500 bg-slate-900 text-emerald-600 focus:ring-emerald-500"
                          checked={gameStatsTeamSplit}
                          onChange={e => setGameStatsTeamSplit(e.target.checked)}
                        />
                        팀 구분
                      </label>
                      {gameStatsUnitSortKey !== "default" && (
                        <button
                          type="button"
                          className="text-xs font-bold text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline"
                          onClick={() => setGameStatsUnitSortKey("default")}
                        >
                          정렬 초기화
                        </button>
                      )}
                    </div>
                    <table className="w-full text-left text-xs sm:text-sm border-collapse">
                      <thead className="bg-slate-900/80 text-slate-400 font-bold tracking-wide">
                        <tr>
                          <th className="px-3 py-2 whitespace-nowrap">플레이어</th>
                          <th className="px-3 py-2">
                            <span className="inline-flex items-center gap-0.5">
                              이름
                              <button
                                type="button"
                                title="이름 가나다순 (ㄱ→ㅎ, 위에서 아래)"
                                className={`ml-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-black leading-none border transition-colors ${
                                  gameStatsUnitSortKey === "name"
                                    ? "border-emerald-500 bg-emerald-900/50 text-emerald-200"
                                    : "border-slate-600 bg-slate-800/90 text-slate-400 hover:border-slate-500 hover:text-slate-200"
                                }`}
                                onClick={() => setGameStatsUnitSortKey("name")}
                              >
                                ↑
                              </button>
                            </span>
                          </th>
                          <th className="px-3 py-2 whitespace-nowrap">
                            <span className="inline-flex items-center gap-0.5">
                              소환 턴
                              <button
                                type="button"
                                title="소환 턴 기준 내림차순"
                                className={`ml-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-black leading-none border transition-colors ${
                                  gameStatsUnitSortKey === "summonedTurn"
                                    ? "border-emerald-500 bg-emerald-900/50 text-emerald-200"
                                    : "border-slate-600 bg-slate-800/90 text-slate-400 hover:border-slate-500 hover:text-slate-200"
                                }`}
                                onClick={() => setGameStatsUnitSortKey("summonedTurn")}
                              >
                                ↓
                              </button>
                            </span>
                          </th>
                          <th className="px-3 py-2 text-right whitespace-nowrap">
                            <span className="inline-flex items-center justify-end gap-0.5">
                              총합 데미지
                              <button
                                type="button"
                                title="총합 데미지 내림차순"
                                className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-black leading-none border transition-colors ${
                                  gameStatsUnitSortKey === "damageDealt"
                                    ? "border-emerald-500 bg-emerald-900/50 text-emerald-200"
                                    : "border-slate-600 bg-slate-800/90 text-slate-400 hover:border-slate-500 hover:text-slate-200"
                                }`}
                                onClick={() => setGameStatsUnitSortKey("damageDealt")}
                              >
                                ↓
                              </button>
                            </span>
                          </th>
                          <th className="px-3 py-2 text-right whitespace-nowrap">
                            <span className="inline-flex items-center justify-end gap-0.5">
                              총합 처치
                              <button
                                type="button"
                                title="총합 처치 내림차순"
                                className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-black leading-none border transition-colors ${
                                  gameStatsUnitSortKey === "kills"
                                    ? "border-emerald-500 bg-emerald-900/50 text-emerald-200"
                                    : "border-slate-600 bg-slate-800/90 text-slate-400 hover:border-slate-500 hover:text-slate-200"
                                }`}
                                onClick={() => setGameStatsUnitSortKey("kills")}
                              >
                                ↓
                              </button>
                            </span>
                          </th>
                          <th className="px-3 py-2 text-right whitespace-nowrap">
                            <span className="inline-flex items-center justify-end gap-0.5">
                              받은 피해
                              <button
                                type="button"
                                title="받은 피해 내림차순"
                                className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-black leading-none border transition-colors ${
                                  gameStatsUnitSortKey === "damageTaken"
                                    ? "border-emerald-500 bg-emerald-900/50 text-emerald-200"
                                    : "border-slate-600 bg-slate-800/90 text-slate-400 hover:border-slate-500 hover:text-slate-200"
                                }`}
                                onClick={() => setGameStatsUnitSortKey("damageTaken")}
                              >
                                ↓
                              </button>
                            </span>
                          </th>
                          <th className="px-3 py-2 text-right whitespace-nowrap">
                            <span className="inline-flex items-center justify-end gap-0.5">
                              회복량
                              <button
                                type="button"
                                title="회복량 내림차순"
                                className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-black leading-none border transition-colors ${
                                  gameStatsUnitSortKey === "selfHeal"
                                    ? "border-emerald-500 bg-emerald-900/50 text-emerald-200"
                                    : "border-slate-600 bg-slate-800/90 text-slate-400 hover:border-slate-500 hover:text-slate-200"
                                }`}
                                onClick={() => setGameStatsUnitSortKey("selfHeal")}
                              >
                                ↓
                              </button>
                            </span>
                          </th>
                          <th className="px-3 py-2 text-right whitespace-nowrap">
                            <span className="inline-flex items-center justify-end gap-0.5">
                              회복 지원량
                              <button
                                type="button"
                                title="회복 지원량 내림차순"
                                className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-black leading-none border transition-colors ${
                                  gameStatsUnitSortKey === "allyHealGiven"
                                    ? "border-emerald-500 bg-emerald-900/50 text-emerald-200"
                                    : "border-slate-600 bg-slate-800/90 text-slate-400 hover:border-slate-500 hover:text-slate-200"
                                }`}
                                onClick={() => setGameStatsUnitSortKey("allyHealGiven")}
                              >
                                ↓
                              </button>
                            </span>
                          </th>
                          <th className="px-3 py-2 text-right whitespace-nowrap">
                            <span className="inline-flex items-center justify-end gap-0.5">
                              감소된 피해
                              <button
                                type="button"
                                title="감소된 피해 내림차순"
                                className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-black leading-none border transition-colors ${
                                  gameStatsUnitSortKey === "damageMitigated"
                                    ? "border-emerald-500 bg-emerald-900/50 text-emerald-200"
                                    : "border-slate-600 bg-slate-800/90 text-slate-400 hover:border-slate-500 hover:text-slate-200"
                                }`}
                                onClick={() => setGameStatsUnitSortKey("damageMitigated")}
                              >
                                ↓
                              </button>
                            </span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-200">
                        {gameStatsDisplayUnitRows.map((row, i) => (
                          <tr key={`${row.cardName}-${row.summonedTurn}-${row.player}-${i}`} className="border-t border-slate-800 hover:bg-slate-900/40">
                            <td
                              className={`px-3 py-2 font-black ${
                                row.player === "A" ? "text-sky-400" : "text-rose-400"
                              }`}
                            >
                              {row.player}
                            </td>
                            <td className="px-3 py-2 font-medium">{row.cardName}</td>
                            <td className="px-3 py-2 font-mono text-slate-400">{row.summonedTurn}</td>
                            <td
                              className={`px-3 py-2 text-right font-mono ${
                                gameStatsNumericColumnMax &&
                                gameStatsNumericColumnMax.damageDealt > 0 &&
                                formatGameStatInteger(row.damageDealt) === gameStatsNumericColumnMax.damageDealt
                                  ? "font-bold text-amber-300"
                                  : ""
                              }`}
                            >
                              {formatGameStatInteger(row.damageDealt)}
                            </td>
                            <td
                              className={`px-3 py-2 text-right font-mono ${
                                gameStatsNumericColumnMax &&
                                gameStatsNumericColumnMax.kills > 0 &&
                                row.kills === gameStatsNumericColumnMax.kills
                                  ? "font-bold text-amber-300"
                                  : ""
                              }`}
                            >
                              {row.kills}
                            </td>
                            <td
                              className={`px-3 py-2 text-right font-mono ${
                                gameStatsNumericColumnMax &&
                                gameStatsNumericColumnMax.damageTaken > 0 &&
                                formatGameStatInteger(row.damageTaken) === gameStatsNumericColumnMax.damageTaken
                                  ? "font-bold text-amber-300"
                                  : ""
                              }`}
                            >
                              {formatGameStatInteger(row.damageTaken)}
                            </td>
                            <td
                              className={`px-3 py-2 text-right font-mono ${
                                gameStatsNumericColumnMax &&
                                gameStatsNumericColumnMax.selfHeal > 0 &&
                                formatGameStatInteger(row.selfHeal) === gameStatsNumericColumnMax.selfHeal
                                  ? "font-bold text-amber-300"
                                  : ""
                              }`}
                            >
                              {formatGameStatInteger(row.selfHeal)}
                            </td>
                            <td
                              className={`px-3 py-2 text-right font-mono ${
                                gameStatsNumericColumnMax &&
                                gameStatsNumericColumnMax.allyHealGiven > 0 &&
                                formatGameStatInteger(row.allyHealGiven) === gameStatsNumericColumnMax.allyHealGiven
                                  ? "font-bold text-amber-300"
                                  : ""
                              }`}
                            >
                              {formatGameStatInteger(row.allyHealGiven)}
                            </td>
                            <td
                              className={`px-3 py-2 text-right font-mono ${
                                gameStatsNumericColumnMax &&
                                gameStatsNumericColumnMax.damageMitigated > 0 &&
                                formatGameStatInteger(row.damageMitigated) === gameStatsNumericColumnMax.damageMitigated
                                  ? "font-bold text-amber-300"
                                  : ""
                              }`}
                            >
                              {formatGameStatInteger(row.damageMitigated)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
              <section>
                <h3
                  className={`font-black text-violet-400 mb-3 tracking-wider ${
                    isMobile ? "text-[13px]" : "text-sm"
                  }`}
                >
                  마법 카드
                </h3>
                <p className={`text-slate-500 mb-3 ${isMobile ? "text-[13px]" : "text-xs"}`}>
                  배치된 마법만 목록으로 표시합니다. 상세 통계는 이후 버전에서 추가됩니다.
                </p>
                {state.spellDeployLog.length === 0 ? (
                  <p className="text-sm text-slate-500">배치된 마법이 없습니다.</p>
                ) : (
                  <ul className="rounded-lg border border-slate-700 divide-y divide-slate-800">
                    {state.spellDeployLog.map(entry => (
                      <li
                        key={entry.statsInstanceId}
                        className="px-3 py-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-200"
                      >
                        <span className={`font-black ${entry.player === "A" ? "text-sky-400" : "text-rose-400"}`}>
                          {entry.player}
                        </span>
                        <span className="font-medium">{entry.name}</span>
                        <span className="text-slate-500 font-mono text-xs">{entry.summonedTurn}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        </div>
      )}

      {isSettingsOpen && (
        <div
          style={isMobile ? mobileModalOverlayStyle : undefined}
          className={
            isMobile
              ? undefined
              : "fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]"
          }
          onClick={() => setIsSettingsOpen(false)}
        >
          <div
            style={isMobile ? mobileSettingsModalPanelStyle : undefined}
            className={
              isMobile
                ? "bg-[#0a1628] border-2 border-slate-700 rounded-2xl shadow-2xl flex flex-col items-center w-full"
                : "bg-[#0a1628] border-2 border-slate-700 rounded-[2rem] p-8 w-full max-w-sm shadow-2xl flex flex-col items-center"
            }
            onClick={e => e.stopPropagation()}
          >
            <h2
              className={`font-black text-white border-b border-slate-700 w-full text-center tracking-wider ${
                isMobile ? "text-[18px] mb-4 pb-3" : "text-2xl mb-6 pb-4"
              }`}
            >
              게임 설정
            </h2>

            <div className={`flex flex-col gap-4 w-full ${isMobile ? "" : "py-4"}`}>
              <div
                className={`flex items-center justify-between w-full bg-slate-800/50 rounded-xl border border-slate-700 ${
                  isMobile ? "p-3" : "p-4"
                }`}
              >
                <div className="flex flex-col text-left mr-4">
                  <h4 className="text-white font-bold mb-1">카드 뽑기 방식</h4>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    <span className="text-sky-400 font-bold">랜덤:</span> 덱에서 무작위로 뽑습니다.<br/>
                    <span className="text-rose-400 font-bold">선택:</span> 덱에서 원하는 카드를 골라 뽑습니다.
                  </p>
                </div>
                <button 
                  onClick={() => {
                    if(state) {
                      setState(prev => prev ? { 
                        ...prev, 
                        settings: { ...prev.settings, drawMode: prev.settings.drawMode === "RANDOM" ? "SELECT" : "RANDOM" } 
                      } : prev);
                    }
                  }}
                  className={`relative w-16 h-8 rounded-lg p-1 transition-colors duration-300 shrink-0 font-black text-[11px] flex items-center justify-center shadow-inner active:scale-95 border ${state?.settings?.drawMode === 'SELECT' ? 'bg-indigo-600 text-white border-indigo-400' : 'bg-slate-700 text-slate-300 border-slate-500'}`}
                >
                  {state?.settings?.drawMode === 'SELECT' ? '선택 뽑기' : '랜덤 뽑기'}
                </button>
              </div>

              <div
                className={`flex items-center justify-between w-full bg-slate-800/50 rounded-xl border border-slate-700 ${
                  isMobile ? "p-3" : "p-4"
                }`}
              >
                <div className="flex flex-col text-left mr-4">
                  <h4 className="text-white font-bold mb-1">턴 제한 시간 (1분)</h4>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    시간 소진 시 턴이 자동으로 넘어갑니다.
                  </p>
                </div>
                <button 
                  onClick={() => {
                    if(state) {
                      setState(prev => prev ? { 
                        ...prev, 
                        turnTimeLeft: 60, 
                        settings: { ...prev.settings, isTimeLimitEnabled: !prev.settings.isTimeLimitEnabled } 
                      } : prev);
                    }
                  }}
                  className={`relative w-12 h-6 rounded-full p-1 transition-colors duration-300 shrink-0 ${state?.settings?.isTimeLimitEnabled ? 'bg-sky-500' : 'bg-slate-600'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300 ${state?.settings?.isTimeLimitEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              {!multiplayMyRole ? (
              <div
                className={`flex items-center justify-between w-full bg-slate-800/50 rounded-xl border border-slate-700 ${
                  isMobile ? "p-3" : "p-4"
                }`}
              >
                <div className="flex flex-col text-left mr-4">
                  <h4 className="text-white font-bold mb-1">상대 카드 회전 (180도)</h4>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    상대방의 카드를 뒤집어 마주보는 느낌을 줍니다.
                  </p>
                </div>
                <button 
                  onClick={() => {
                    if(state) {
                      setState(prev => prev ? { 
                        ...prev, 
                        settings: { ...prev.settings, isOpponentCardFlipped: !prev.settings.isOpponentCardFlipped } 
                      } : prev);
                    }
                  }}
                  className={`relative w-12 h-6 rounded-full p-1 transition-colors duration-300 shrink-0 ${state?.settings?.isOpponentCardFlipped ? 'bg-sky-500' : 'bg-slate-600'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300 ${state?.settings?.isOpponentCardFlipped ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
              ) : null}
            </div>

            <button 
              onClick={() => setIsSettingsOpen(false)} 
              className="mt-4 w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-bold transition-colors active:scale-95 border border-slate-600 shadow-lg"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {isDrawModalOpen && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-[4px] animate-[fadeIn_0.2s_ease-out] p-4 md:p-8"
          onClick={() => setIsDrawModalOpen(false)}
        >
          <div 
            className="relative w-full max-w-[1400px] h-[85vh] bg-[#0a1628] border-2 border-indigo-500 rounded-3xl p-6 md:p-10 flex flex-col shadow-[0_0_80px_rgba(79,70,229,0.5)] overflow-hidden"
            onClick={(e) => e.stopPropagation()} 
          >
            <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4 shrink-0">
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-slate-200 tracking-wider">덱에서 카드 선택</h2>
                <p className="text-slate-400 text-sm mt-1">
                  남은 카드: <span className="text-indigo-400 font-bold">{state.deckCards.length}</span>장 
                  <span className="ml-2 px-2 py-0.5 bg-indigo-900/50 text-indigo-300 text-xs rounded-md border border-indigo-700">카드를 클릭하여 패로 즉시 가져옵니다.</span>
                </p>
              </div>
              <button 
                onClick={() => setIsDrawModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-colors active:scale-95 border border-slate-600"
              >
                ✕ 닫기
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-2 w-full custom-scrollbar">
              {state.deckCards.length === 0 ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 opacity-60">
                  <IconDeck className="w-20 h-20 mb-4" />
                  <p className="font-bold text-xl tracking-wider">덱에 카드가 없습니다.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 pb-10">
                  {state.deckCards.map((card, idx) => (
                    <div 
                      key={`deck-select-${idx}`}
                      className="group relative w-full aspect-[1/1.58] rounded-[10px] border border-slate-600 bg-black/50 overflow-hidden cursor-pointer hover:-translate-y-2 hover:shadow-[0_15px_30px_rgba(79,70,229,0.4)] hover:border-indigo-400 transition-all duration-300"
                      onClick={() => executeDraw(idx)} 
                    >
                      {card.image_url ? (
                        <GuardedImg src={card.image_url} alt={card.name} className="w-full h-full object-cover transition-all duration-300 group-hover:scale-110" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center p-4">
                          <span className="text-sm font-bold text-center text-slate-400 group-hover:text-slate-200">{card.name}</span>
                        </div>
                      )}
                      
                      <div className="absolute inset-0 bg-indigo-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                        <span className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-black tracking-widest rounded-xl shadow-lg border border-indigo-400/50 transition-colors">
                          뽑기
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {pendingAttackSelection && (
        <div 
          className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-[1px]"
          onClick={() => setPendingAttackSelection(null)}
        >
          <div 
            className="absolute bg-[#0a1628] border-2 border-sky-500 rounded-3xl p-5 md:p-6 shadow-[0_0_50px_rgba(14,165,233,0.8)] flex flex-col items-center min-w-[280px] z-[101] animate-[scaleIn_0.15s_ease-out]"
            style={{ 
              top: Math.max(20, pendingAttackSelection.position.y - 180) + 'px', 
              left: Math.max(140, Math.min(window.innerWidth - 140, pendingAttackSelection.position.x)) + 'px',
              transform: 'translateX(-50%)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg md:text-xl font-black text-white mb-4 tracking-wider">공격 방식 선택</h3>
            
            <div className="flex gap-3 w-full">
              <button 
                onClick={() => {
                  setAttackingSlot(`${pendingAttackSelection.player}-${pendingAttackSelection.slot}`);
                  setAttackOptionOverride(pendingAttackSelection.primary);
                  setPendingAttackSelection(null);
                }} 
                className="flex-1 flex flex-col items-center justify-center px-4 py-3 bg-slate-800 hover:bg-sky-600 border border-slate-600 hover:border-sky-300 rounded-2xl text-white font-bold transition-all group active:scale-95"
              >
                <span className="text-[10px] text-slate-400 group-hover:text-sky-200 mb-1">단일 타격</span>
                <span className="text-xl md:text-2xl font-black whitespace-nowrap">{pendingAttackSelection.primary}</span>
              </button>
              
              <button 
                onClick={() => {
                  setAttackingSlot(`${pendingAttackSelection.player}-${pendingAttackSelection.slot}`);
                  setAttackOptionOverride(pendingAttackSelection.secondary);
                  setPendingAttackSelection(null);
                }} 
                className="flex-1 flex flex-col items-center justify-center px-4 py-3 bg-slate-800 hover:bg-orange-600 border border-slate-600 hover:border-orange-300 rounded-2xl text-white font-bold transition-all group active:scale-95"
              >
                <span className="text-[10px] text-slate-400 group-hover:text-orange-200 mb-1">다중/연쇄</span>
                <span className="text-xl md:text-2xl font-black whitespace-nowrap">{pendingAttackSelection.secondary}</span>
              </button>
            </div>
            
            <button 
              onClick={() => setPendingAttackSelection(null)} 
              className="mt-4 px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 text-sm rounded-xl font-bold transition-colors w-full active:scale-95"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {pendingElWingSinseokDefense &&
        (!multiplayMyTeam || pendingElWingSinseokDefense.defenderPlayer === multiplayMyTeam) && (
        <div
          className="fixed inset-0 z-[110] bg-black/35 backdrop-blur-[2px]"
          onClick={() => {
            /* 클릭 무시 — 5초 후 자동 피해 또는 [신속] 버튼만 처리 */
          }}
        >
          <div
            className="absolute z-[111] min-w-[220px] max-w-[280px] rounded-2xl border-2 border-emerald-400 bg-[#0a1628] p-4 shadow-[0_0_40px_rgba(52,211,153,0.75)] animate-[scaleIn_0.15s_ease-out]"
            style={{
              top: Math.max(16, pendingElWingSinseokDefense.popupPosition.y - 120) + "px",
              left:
                Math.max(
                  120,
                  Math.min(window.innerWidth - 120, pendingElWingSinseokDefense.popupPosition.x)
                ) + "px",
              transform: "translateX(-50%)",
            }}
            onClick={ev => ev.stopPropagation()}
          >
            <p className="mb-1 text-center text-[11px] font-bold tracking-wide text-emerald-300/90">
              기본 공격 회피
            </p>
            <p className="mb-2 text-center text-xs text-slate-300">
              {elWingSinseokSecondsLeft}초 안에 [신속]을 사용하면 피해를 받지 않습니다.
            </p>
            <div
              className="mb-3 h-2.5 w-full overflow-hidden rounded-full border border-slate-400/80 bg-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.12)]"
              aria-hidden
            >
              <div
                className="h-full max-w-full rounded-full bg-gradient-to-r from-sky-300 via-sky-500 to-blue-700 shadow-[0_0_8px_rgba(56,189,248,0.45)] transition-[width] duration-75 ease-linear"
                style={{ width: `${Math.round(elWingSinseokTimeRatio * 10000) / 100}%` }}
              />
            </div>
            <button
              type="button"
              onClick={() => commitElWingSinseokDodge()}
              className="w-full rounded-xl border border-emerald-200/50 bg-emerald-600 px-4 py-2.5 text-sm font-black text-white shadow-[0_0_18px_rgba(52,211,153,0.55)] transition-all hover:bg-emerald-500 active:scale-95"
            >
              {EL_WING_SINSEOK_SKILL_LABEL}
            </button>
          </div>
        </div>
      )}

      {state.bubbleStationPending &&
        (state.bubbleStationPending.phase === "typeSelect" ||
          state.bubbleStationPending.phase === "selectionFlash") &&
        !state.spellUsagePending &&
        !spellUsageReveal &&
        !spellUsageFly && (
          <div
            className="fixed inset-0 z-[112] flex items-center justify-center bg-black/45 backdrop-blur-[2px]"
            onClick={() => {
              /* 외부 클릭 무시 — 7개 버튼 또는 5초 자동 선택만 처리 */
            }}
          >
            <div
              className="mx-3 w-full max-w-2xl rounded-2xl border-2 border-cyan-400 bg-[#0a1628] p-5 shadow-[0_0_48px_rgba(34,211,238,0.65)] animate-[scaleIn_0.15s_ease-out]"
              onClick={ev => ev.stopPropagation()}
            >
              <p className="mb-1 text-center text-sm font-black tracking-wide text-cyan-300">
                {BUBBLE_STATION_SPELL_ID}
              </p>
              <p className="mb-3 text-center text-xs text-slate-300">
                {state.bubbleStationPending.phase === "typeSelect"
                  ? `유닛 타입을 선택하세요 (${bubbleStationTypeSelectSecondsLeft}초)`
                  : "유닛 타입이 선택되었습니다"}
              </p>
              <div
                className="mb-4 h-2.5 w-full overflow-hidden rounded-full border border-slate-400/80 bg-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.12)]"
                aria-hidden
              >
                <div
                  className="h-full max-w-full rounded-full bg-gradient-to-r from-cyan-300 via-cyan-500 to-sky-700 shadow-[0_0_8px_rgba(34,211,238,0.45)] transition-[width] duration-75 ease-linear"
                  style={{
                    width:
                      state.bubbleStationPending.phase === "typeSelect"
                        ? `${Math.round(bubbleStationTypeSelectTimeRatio * 10000) / 100}%`
                        : "0%",
                  }}
                />
              </div>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                {BUBBLE_STATION_UNIT_TYPES.map(t => {
                  const isSelected =
                    state.bubbleStationPending?.selectedUnitType === t.id;
                  const isFlashing =
                    state.bubbleStationPending?.phase === "selectionFlash" && isSelected;
                  const isDisabled =
                    state.bubbleStationPending?.phase !== "typeSelect";
                  return (
                    <button
                      key={t.id}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => commitBubbleStationUnitType(t.id)}
                      className={`rounded-xl border px-2 py-3 text-xs font-black transition-all sm:text-sm ${
                        isFlashing
                          ? "border-cyan-200 bg-cyan-400 text-[#0a1628] shadow-[0_0_24px_rgba(34,211,238,0.95)] pp-bubble-station-button-flash"
                          : isDisabled && !isSelected
                            ? "cursor-not-allowed border-cyan-300/20 bg-cyan-950/40 text-cyan-100/40"
                            : "border-cyan-300/40 bg-cyan-950/80 text-cyan-100 shadow-[0_0_12px_rgba(34,211,238,0.35)] hover:border-cyan-200 hover:bg-cyan-800/80 active:scale-95"
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      {pendingLibutyAllEnemiesAttack && (
        <div
          className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-[1px]"
          onClick={() => setPendingLibutyAllEnemiesAttack(null)}
        >
          <div
            className="absolute bg-[#0a1628] border-2 border-sky-500 rounded-3xl p-5 md:p-6 shadow-[0_0_50px_rgba(14,165,233,0.8)] flex flex-col items-center min-w-[280px] z-[101] animate-[scaleIn_0.15s_ease-out]"
            style={{
              top: Math.max(20, pendingLibutyAllEnemiesAttack.position.y - 180) + "px",
              left:
                Math.max(140, Math.min(window.innerWidth - 140, pendingLibutyAllEnemiesAttack.position.x)) + "px",
              transform: "translateX(-50%)",
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg md:text-xl font-black text-white mb-4 tracking-wider">리부티 기본 공격</h3>
            <p className="text-slate-400 text-sm text-center mb-4 px-1">
              필드에 있는 모든 적 유닛에게 각각 {LIBUTY_BASIC_AOE_DAMAGE} 피해를 줍니다.
            </p>
            <button
              type="button"
              onClick={() => {
                commitLibutyAllEnemiesBasicAttack();
              }}
              className="w-full flex flex-col items-center justify-center px-4 py-3 bg-slate-800 hover:bg-rose-600 border border-slate-600 hover:border-rose-300 rounded-2xl text-white font-bold transition-all group active:scale-95"
            >
              <span className="text-[10px] text-slate-400 group-hover:text-rose-100 mb-1">전체 적</span>
              <span className="text-xl md:text-2xl font-black whitespace-nowrap">모든 적 공격</span>
            </button>
            <button
              type="button"
              onClick={() => setPendingLibutyAllEnemiesAttack(null)}
              className="mt-4 px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 text-sm rounded-xl font-bold transition-colors w-full active:scale-95"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {pendingSecondaryAttack && (
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-50 bg-gradient-to-r from-amber-600 to-orange-500 text-white px-8 py-3 rounded-full font-black text-sm md:text-base shadow-[0_0_30px_rgba(245,158,11,0.8)] animate-pulse border-2 border-white/50 pointer-events-none whitespace-nowrap">
          추가 피해({pendingSecondaryAttack.damage})를 입힐 적 유닛을 선택하세요! (남은 횟수: {pendingSecondaryAttack.hitsRemaining}회)
        </div>
      )}

      {pendingLegendarySwordStrike && (
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-50 bg-gradient-to-r from-sky-500 to-cyan-400 text-white px-8 py-3 rounded-full font-black text-sm md:text-base shadow-[0_0_30px_rgba(56,189,248,0.85)] animate-pulse border-2 border-white/50 pointer-events-none whitespace-nowrap">
          [전설의 검] {pendingLegendarySwordStrike.phase === 1 ? "1차" : "2차"} 연격 대상을 선택하세요!
        </div>
      )}

      {(pendingStartingWraithChainKill || pendingStartingWraithChainPlayerHp) && (
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-50 bg-gradient-to-r from-amber-700 to-orange-600 text-white px-8 py-3 rounded-full font-black text-sm md:text-base shadow-[0_0_30px_rgba(180,83,9,0.85)] animate-pulse border-2 border-white/50 pointer-events-none whitespace-nowrap">
          {pendingStartingWraithChainPlayerHp
            ? "[시작의 망령] 추가 공격을 가할 상대 플레이어를 선택하세요!"
            : "[시작의 망령] 추가 공격을 가할 적 유닛을 선택하세요!"}
        </div>
      )}

      {witchTarotDiscardPlayer && isMyDiscardTurn && (
        <div className="absolute top-20 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-white/50 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-8 py-3 text-sm font-black text-white shadow-[0_0_30px_rgba(139,92,246,0.85)] animate-pulse pointer-events-none md:text-base">
          [마녀 타로] Player {witchTarotDiscardPlayer} — 패에서 버릴 카드를 선택하세요.
        </div>
      )}

      {witchTarotFlowActive && !witchTarotCoin && !witchTarotDiscardPlayer && (
        <div className="absolute top-20 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-white/50 bg-gradient-to-r from-violet-700 to-purple-600 px-8 py-3 text-sm font-black text-white shadow-[0_0_30px_rgba(124,58,237,0.75)] pointer-events-none md:text-base">
          [마녀 타로] 카드 드로우·교체 연출 진행 중…
        </div>
      )}

      {state.guihwanPending && isGuihwanRewindOpen &&
        (!multiplayMyTeam || state.guihwanPending.ownerPlayer === multiplayMyTeam) && (
        <RewindModal
          onClose={closeGuihwanRewindModal}
          rewindCards={state.rewindCards}
          revivableIndices={getGuihwanRevivableRewindIndices(
            state.rewindCards,
            state.guihwanPending.ownerPlayer,
            state.unitCombatStats
          )}
          onSelectRevive={resolveGuihwanRevive}
          onOpenDetail={openHandCardCodexDetail}
        />
      )}

      {state.guihwanPending && !isGuihwanRewindOpen &&
        (!multiplayMyTeam || state.guihwanPending.ownerPlayer === multiplayMyTeam) && (
        <div className="absolute top-20 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-indigo-300/60 bg-gradient-to-r from-indigo-800 to-violet-700 px-8 py-3 text-sm font-black text-indigo-50 shadow-[0_0_30px_rgba(99,102,241,0.75)] animate-pulse pointer-events-none md:text-base">
          [귀환] 필드의 귀환 카드를 클릭해 리와인드 선택을 다시 열 수 있습니다.
        </div>
      )}

      {pendingSkill && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 bg-gradient-to-r from-pink-600 to-purple-500 text-white px-8 py-3 rounded-full font-black text-sm md:text-base shadow-[0_0_30px_rgba(219,39,119,0.8)] animate-pulse border-2 border-white/50 pointer-events-none whitespace-nowrap">
          {pendingSkill.name === PENDING_SKILL.ERISTINA_BANJITGORI ||
          pendingSkill.name === PENDING_SKILL.LIME_BUBBLE_SHIELD
            ? `[${pendingSkill.name}] 스킬 발동 대기 중! 연결할 아군 필드 유닛을 선택하세요.`
            : pendingSkill.name === PENDING_SKILL.DANHA_GALGORI
              ? `[${pendingSkill.name}] 스킬 발동 대기 중! 상대 패에서 빼앗을 카드를 선택하세요.`
              : pendingSkill.name === PENDING_SKILL.SUPER_GREEN_KING_SPELL_BREAKER
                ? `[${pendingSkill.name}] 스킬 발동 대기 중! 상대 스펠 칸에서 제거할 마법을 선택하세요.`
                : pendingSkill.name === PENDING_SKILL.GONCHUNG_HIDDEN_PEEK
                  ? `[${GONCHUNG_HIDDEN_PEEK_SKILL_LABEL}] 스킬 발동 대기 중! 상대 스펠 칸의 맨 위 히든 스펠을 선택하세요. (겹침 시 셔플 버튼으로 순서 변경 가능)`
                  : `[${pendingSkill.name}] 스킬 발동 대기 중! 패에서 버릴 카드를 선택하세요.`}
        </div>
      )}

      {isRewindModalOpen && (
        <RewindModal
          onClose={() => setIsRewindModalOpen(false)}
          rewindCards={state.rewindCards}
          onOpenDetail={openHandCardCodexDetail}
        />
      )}

      {/* 무승부 요청 수신 UI (모바일/PC 공통) */}
      {showDrawIncoming && (
        <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/50">
          <div className="bg-[#0a1628] border-2 border-yellow-500/50 rounded-2xl p-6 flex flex-col items-center gap-4 shadow-2xl">
            <p className="text-yellow-300 font-bold text-base">무승부로 하시겠습니까?</p>
            <div className="flex gap-3">
              <button
                className="px-5 py-2 rounded-xl bg-yellow-500/20 text-yellow-300 font-bold text-sm hover:bg-yellow-500/40 transition-colors"
                onClick={onDrawAccept}
              >
                수락
              </button>
              <button
                className="px-5 py-2 rounded-xl bg-slate-700/60 text-slate-300 font-bold text-sm hover:bg-slate-600/60 transition-colors"
                onClick={onDrawReject}
              >
                거절
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 무승부 거절 토스트 (모바일/PC 공통) */}
      {drawRejected && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[200] bg-slate-800 border border-slate-600 rounded-xl px-5 py-3 shadow-xl">
          <p className="text-slate-200 text-sm font-semibold">상대방이 무승부 신청을 거절했습니다.</p>
        </div>
      )}

      {isMobile ? (
        <div
          ref={mobileSimulationShellRef}
          onContextMenu={preventImageContextMenu}
          onTouchStart={() => setSelectedBadge(null)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "black",
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            justifyContent: "flex-start",
            touchAction: "none",
            overflow: "hidden",
          }}
        >
          {/* 모바일 상단 헤더(단순) */}
          <div
            style={{
              height: MOBILE_SIM_SHELL_HEADER_H,
              width: "100%",
              backgroundColor: "rgba(10,22,40,0.95)",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
              position: "absolute",
              top: 0,
              left: 0,
              boxSizing: "border-box",
              paddingLeft: 6,
              paddingRight: 8,
              zIndex: multiplayOpponentDisconnected ? 150 : 20,
            }}
          >
            <button
              type="button"
              onClick={() => {
                setIsDrawerOpen(true);
                onClearNewChat?.();
              }}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                paddingLeft: 8,
                paddingRight: 8,
                minWidth: 44,
                minHeight: 40,
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              {hasNewChat && (
                <div
                  style={{
                    position: "absolute",
                    top: 2,
                    right: 2,
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#f97316",
                    border: "1.5px solid #000",
                  }}
                />
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ width: 20, height: 2, borderRadius: 9999, backgroundColor: "#e5e7eb" }} />
                <span style={{ width: 20, height: 2, borderRadius: 9999, backgroundColor: "#e5e7eb" }} />
                <span style={{ width: 20, height: 2, borderRadius: 9999, backgroundColor: "#e5e7eb" }} />
              </div>
            </button>
          </div>

          {isDrawerOpen ? (
            <div
              role="presentation"
              onClick={() => setIsDrawerOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                backgroundColor: "rgba(0,0,0,0.5)",
                zIndex: 9998,
                pointerEvents: "auto",
              }}
            />
          ) : null}

          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              height: "100%",
              width: 220,
              zIndex: 9999,
              backgroundColor: "rgb(10, 22, 40)",
              borderRightWidth: "1px",
              borderRightStyle: "solid",
              borderRightColor: "rgba(255,255,255,0.1)",
              transform: isDrawerOpen ? "translateX(0)" : "translateX(-100%)",
              transition: "transform 300ms ease",
              pointerEvents: isDrawerOpen ? "auto" : "none",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
            }}
          >
            <button
              type="button"
              style={{
                height: 52,
                width: "100%",
                display: "flex",
                alignItems: "center",
                paddingLeft: 20,
                gap: 8,
                fontSize: 15,
                fontWeight: "bold",
                color: "white",
                background: "transparent",
                borderTopWidth: 0,
                borderLeftWidth: 0,
                borderRightWidth: 0,
                borderBottomWidth: "1px",
                borderBottomStyle: "solid",
                borderBottomColor: "rgba(255,255,255,0.08)",
                cursor: "pointer",
                textAlign: "left",
              }}
              onClick={() => {
                setIsDrawerOpen(false);
                if (onBackToLobby) onBackToLobby();
                else window.location.href = "/";
              }}
            >
              <IconHome className="w-5 h-5 shrink-0" />
              로비로 돌아가기
            </button>
            {!multiplayMyRole ? (
              <button
                type="button"
                style={{
                  height: 52,
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: 20,
                  gap: 8,
                  fontSize: 15,
                  fontWeight: "bold",
                  color: "white",
                  background: "transparent",
                  borderTopWidth: 0,
                  borderLeftWidth: 0,
                  borderRightWidth: 0,
                  borderBottomWidth: "1px",
                  borderBottomStyle: "solid",
                  borderBottomColor: "rgba(255,255,255,0.08)",
                  cursor: "pointer",
                  textAlign: "left",
                }}
                onClick={() => {
                  setIsDrawerOpen(false);
                  handleReset();
                }}
              >
                <svg
                  className="w-5 h-5 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                게임 초기화
              </button>
            ) : null}
            <button
              type="button"
              style={{
                height: 52,
                width: "100%",
                display: "flex",
                alignItems: "center",
                paddingLeft: 20,
                gap: 8,
                fontSize: 15,
                fontWeight: "bold",
                color: "white",
                background: "transparent",
                borderTopWidth: 0,
                borderLeftWidth: 0,
                borderRightWidth: 0,
                borderBottomWidth: "1px",
                borderBottomStyle: "solid",
                borderBottomColor: "rgba(255,255,255,0.08)",
                cursor: "pointer",
                textAlign: "left",
              }}
              onClick={() => {
                setIsDrawerOpen(false);
                setIsSettingsOpen(true);
              }}
            >
              <IconSettings className="w-5 h-5 shrink-0" />
              게임 설정
            </button>
            <button
              type="button"
              style={{
                height: 52,
                width: "100%",
                display: "flex",
                alignItems: "center",
                paddingLeft: 20,
                gap: 8,
                fontSize: 15,
                fontWeight: "bold",
                color: "white",
                background: "transparent",
                borderTopWidth: 0,
                borderLeftWidth: 0,
                borderRightWidth: 0,
                borderBottomWidth: "1px",
                borderBottomStyle: "solid",
                borderBottomColor: "rgba(255,255,255,0.08)",
                cursor: "pointer",
                textAlign: "left",
              }}
              onClick={() => {
                setIsDrawerOpen(false);
                setIsGameStatsOpen(true);
              }}
            >
              <IconBook className="w-5 h-5 shrink-0" />
              게임 통계
            </button>
            {multiplayMyRole && onSurrender && (
              <>
                <button
                  type="button"
                  style={{
                    height: 52,
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    paddingLeft: 20,
                    gap: 8,
                    fontSize: 15,
                    fontWeight: "bold",
                    color: (state?.turnCount ?? 0) >= 10 ? "#f87171" : "#475569",
                    background: "transparent",
                    borderTopWidth: 0,
                    borderLeftWidth: 0,
                    borderRightWidth: 0,
                    borderBottomWidth: "1px",
                    borderBottomStyle: "solid",
                    borderBottomColor: "rgba(255,255,255,0.08)",
                    cursor: (state?.turnCount ?? 0) >= 10 ? "pointer" : "not-allowed",
                    textAlign: "left",
                    opacity: (state?.turnCount ?? 0) >= 10 ? 1 : 0.5,
                  }}
                  disabled={(state?.turnCount ?? 0) < 10}
                  onClick={() => {
                    if ((state?.turnCount ?? 0) < 10) return;
                    setIsDrawerOpen(false);
                    onSurrender();
                  }}
                >
                  <IconLock className="w-5 h-5 shrink-0" />
                  게임 항복{(state?.turnCount ?? 0) < 10 ? " (10턴 이후 가능)" : ""}
                </button>
                <button
                  type="button"
                  style={{
                    height: 52,
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    paddingLeft: 20,
                    gap: 8,
                    fontSize: 15,
                    fontWeight: "bold",
                    color: (state?.turnCount ?? 0) >= (drawRequestCooldownTurn ?? 0) ? "#fbbf24" : "#475569",
                    background: "transparent",
                    borderTopWidth: 0,
                    borderLeftWidth: 0,
                    borderRightWidth: 0,
                    borderBottomWidth: "1px",
                    borderBottomStyle: "solid",
                    borderBottomColor: "rgba(255,255,255,0.08)",
                    cursor: (state?.turnCount ?? 0) >= (drawRequestCooldownTurn ?? 0) ? "pointer" : "not-allowed",
                    textAlign: "left",
                    opacity: (state?.turnCount ?? 0) >= (drawRequestCooldownTurn ?? 0) ? 1 : 0.5,
                  }}
                  disabled={(state?.turnCount ?? 0) < (drawRequestCooldownTurn ?? 0)}
                  onClick={() => {
                    if ((state?.turnCount ?? 0) < (drawRequestCooldownTurn ?? 0)) return;
                    setIsDrawerOpen(false);
                    onDrawRequest?.(state?.turnCount ?? 0);
                  }}
                >
                  <IconUsers className="w-5 h-5 shrink-0" />
                  무승부 신청{(state?.turnCount ?? 0) < (drawRequestCooldownTurn ?? 0) ? ` (${drawRequestCooldownTurn}턴 이후 가능)` : ""}
                </button>
              </>
            )}
            {/* 모바일 채팅 — 항복/무승부 버튼 아래 */}
            {chatPanel}
          </div>

          {/* 헤더 아래 게임 영역 */}
          <div
            data-mobile-game-area
            style={{
              width: "100%",
              height: `calc(100% - ${MOBILE_SIM_SHELL_HEADER_H}px)`,
              marginTop: MOBILE_SIM_SHELL_HEADER_H,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              data-mobile-board-scale-wrap
              style={{
                width: MOBILE_BOARD_W * mobileScale,
                height: MOBILE_BOARD_LAYOUT_H * mobileScale,
                flexShrink: 0,
                position: "relative",
                overflow: "hidden",
              }}
            >
            <div
              data-mobile-board
              style={{
                width: MOBILE_BOARD_W,
                height: MOBILE_BOARD_H,
                transform: `scale(${mobileScale})`,
                transformOrigin: "0 0",
                position: "absolute",
                left: 0,
                top: 0,
                overflow: "hidden",
                background: "linear-gradient(180deg, #0a1628 0%, #050a14 100%)",
                border: "2px solid #1e293b",
                boxSizing: "border-box",
              }}
            >
          {isInitializing && (
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 8,
                zIndex: 56,
                display: "flex",
                justifyContent: "center",
                pointerEvents: "none",
              }}
            >
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  skipOpeningInitialization();
                }}
                style={{
                  pointerEvents: "auto",
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "2px solid rgba(251,191,36,0.85)",
                  background: "rgba(69,26,3,0.92)",
                  color: "#fef3c7",
                  fontWeight: 900,
                  fontSize: 10,
                }}
              >
                시작 연출 스킵
              </button>
            </div>
          )}
          {coinTossDisplay && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 50,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0,0,0,0.6)",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <h3 style={{ color: "#fff", fontWeight: 900, fontSize: 14, marginBottom: 16 }}>선공 결정 코인 토스</h3>
                {coinTossDisplay === "FLIPPING" ? (
                  <div
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: 48,
                      border: "4px solid",
                      borderColor: coinFlipSide === "A" ? "#7dd3fc" : "#fda4af",
                      background: coinFlipSide === "A" ? "#0284c7" : "#e11d48",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <IconUser className="w-10 h-10 text-white opacity-80" />
                  </div>
                ) : (
                  <div
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: 48,
                      border: "4px solid",
                      borderColor: coinTossDisplay === "A" ? "#7dd3fc" : "#fda4af",
                      background: coinTossDisplay === "A" ? "#0284c7" : "#e11d48",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span style={{ fontSize: 32, fontWeight: 900, color: "#fff" }}>{coinTossDisplay}</span>
                  </div>
                )}
                <p style={{ marginTop: 16, fontSize: 18, fontWeight: 900, color: "#fff" }}>
                  {coinTossDisplay === "FLIPPING" ? "돌아가는 중..." : `Player ${coinTossDisplay} 선공!`}
                </p>
              </div>
            </div>
          )}

          <div
            style={{
              opacity: isInitializing ? 0.5 : 1,
              pointerEvents: isInitializing ? "none" : "auto",
              display: "flex",
              flexDirection: multiplayFlipBoard ? "column-reverse" : "column",
            }}
          >
            {renderMobilePlayerHpBar("B")}
            {renderMobileHandRow("B")}

            <div
              style={{
                width: MOBILE_BOARD_W,
                height: MOBILE_MID_H,
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: MOBILE_LEFT_W,
                  height: MOBILE_MID_H,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                }}
              >
                <button
                  onClick={handleDrawClick}
                  disabled={isDrawDisabled}
                  style={{
                    width: 52,
                    height: 234,
                    borderRadius: 8,
                    border: isDrawHighlight ? "2px solid #fff" : "2px solid rgba(99,102,241,0.5)",
                    background: isDrawHighlight ? "rgba(49,46,129,0.6)" : "rgba(30,27,75,0.4)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: isDrawDisabled ? 0.4 : 1,
                    cursor: isDrawDisabled ? "not-allowed" : "pointer",
                  }}
                >
                  <IconDeck className={`w-5 h-5 mb-1 ${isDrawHighlight ? "text-white" : "text-indigo-400"}`} />
                  <span style={{ fontSize: 9, fontWeight: 700, color: "#a5b4fc" }}>덱</span>
                  <span style={{ fontSize: 20, fontWeight: 900, color: "#fff", lineHeight: 1 }}>{state.deckCards.length}</span>
                </button>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    if (isWitchTarotOtherPlayerStep) return;
                    if (state.simpanHandChoice) dismissSimpanViaRewind();
                    else setIsRewindModalOpen(true);
                  }}
                  style={{
                    width: 52,
                    height: 234,
                    borderRadius: 8,
                    border: "2px dashed #475569",
                    background: "rgba(0,0,0,0.4)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  className={state.simpanHandChoice ? "pp-rewind-simpan-white-blink" : ""}
                >
                  <span style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8" }}>리와인드</span>
                  <span style={{ fontSize: 18, fontWeight: 900, color: "#64748b" }}>{state.rewindCards.length}</span>
                </button>
              </div>

              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: MOBILE_CENTER_W,
                  height: MOBILE_MID_H,
                  border: "2px solid rgba(217,119,6,0.35)",
                  borderRadius: 12,
                  background: "rgba(0,0,0,0.5)",
                  boxSizing: "border-box",
                  overflow: "visible",
                  paddingLeft: 4,
                  paddingRight: 4,
                }}
              >
                {multiplayOpponentDisconnected ? (
                  <MultiplayDisconnectOverlay secondsLeft={multiplayDisconnectSecondsLeft} />
                ) : null}
                {spellUsageReveal && !spellUsageFly ? (
                  <>
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 z-[119] bg-black/20 backdrop-blur-[1px]"
                    />
                    <div
                      className="pointer-events-none absolute inset-0 z-[121] flex items-center justify-center overflow-visible px-1"
                      aria-live="polite"
                    >
                      <div
                        className="relative flex items-center justify-center overflow-visible"
                        style={{ width: MOBILE_UNIT_W + 48, height: MOBILE_UNIT_H + 48 }}
                      >
                        <div
                          aria-hidden
                          key={`su-h1-m-${spellUsageRevealTick}`}
                          className={`${spellUsageCasterHaloLayerClass(spellUsageReveal.casterPlayer, 1)} !w-28 !blur-[28px] md:!w-28 md:!blur-[28px]`}
                        />
                        <div
                          aria-hidden
                          key={`su-h2-m-${spellUsageRevealTick}`}
                          className={`${spellUsageCasterHaloLayerClass(spellUsageReveal.casterPlayer, 2)} !w-24 !blur-[22px] md:!w-24 md:!blur-[22px]`}
                        />
                        <div
                          ref={spellUsageCardMeasureRef}
                          className={`pp-simpan-pending-glow relative z-[2] overflow-hidden rounded-[6px] border-2 bg-black/85 ${spellUsageCasterCardShellClass(spellUsageReveal.casterPlayer)}`}
                          style={{
                            width: MOBILE_UNIT_W,
                            height: MOBILE_UNIT_H,
                            flexShrink: 0,
                          }}
                        >
                          <div
                            ref={spellUsageCenterFlashRef}
                            className={`relative h-full w-full overflow-hidden rounded-[6px] ${spellUsageMuhyohwaCounterGlow ? "ring-0" : ""}`}
                          >
                            {spellUsageMuhyohwaCounterGlow ? (
                              <div className="pp-muhyohwa-counter-outline" aria-hidden />
                            ) : null}
                            {shouldShowMultiplaySpellUsageBack(
                              spellUsageReveal.casterPlayer,
                              // 우선 실제 카드, 없으면 프리뷰 카드 기준으로 히든 여부 판단
                              (spellUsageReveal as { card?: CardRow | null }).card ?? spellUsageReveal.previewCard
                            ) ? (
                              <div
                                className={
                                  spellUsageMuhyohwaCounterResolve
                                    ? "pp-muhyohwa-counter-vanish h-full w-full"
                                    : "h-full w-full"
                                }
                              >
                                <MultiplayCardBackFace />
                              </div>
                            ) : spellUsageReveal.centerShowsCardBack ? (
                              <div
                                className={
                                  spellUsageMuhyohwaCounterResolve
                                    ? "pp-muhyohwa-counter-vanish h-full w-full"
                                    : "h-full w-full"
                                }
                              >
                                <HiddenSpellCardBackFace />
                              </div>
                            ) : spellUsageReveal.previewCard.image_url ? (
                              <GuardedImg
                                src={spellUsageReveal.previewCard.image_url}
                                alt={spellUsageReveal.previewCard.name}
                                className={`h-full w-full object-contain ${
                                  opponentCardRotateClass(spellUsageReveal.casterPlayer)
                                } ${spellUsageTeslaHideOppCenterCard ? "brightness-0" : ""} ${spellUsageMuhyohwaCounterResolve ? "pp-muhyohwa-counter-vanish" : ""}`}
                              />
                            ) : (
                              <div
                                className={`flex h-full w-full items-center justify-center p-2 text-center text-[9px] font-bold ${spellUsageReveal.casterPlayer === "A" ? "text-sky-100" : "text-rose-100"} ${spellUsageTeslaHideOppCenterCard ? "brightness-0" : ""} ${spellUsageMuhyohwaCounterResolve ? "pp-muhyohwa-counter-vanish" : ""}`}
                              >
                                {spellUsageReveal.previewCard.name}
                              </div>
                            )}
                            {renderFlashOverlay(SPELL_USAGE_CENTER_KEY, "rounded-[6px]")}
                          </div>
                          <div className={fieldSlotCombatPopupOverlayClass}>
                            {renderCombatPopups(SPELL_USAGE_CENTER_KEY)}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      role="presentation"
                      aria-label="터치하면 다음 단계로 진행합니다"
                      className="absolute left-1/2 top-1/2 z-[122] -translate-x-1/2 -translate-y-1/2 touch-manipulation"
                      style={{
                        width: MOBILE_UNIT_W + 28,
                        height: MOBILE_UNIT_H + 28,
                      }}
                      onPointerDown={e => {
                        if (e.button !== 0) return;
                        if (
                          !isClientPointOverSpellUsageCenterCard(
                            e.clientX,
                            e.clientY,
                            spellUsageCardMeasureRef.current
                          )
                        ) {
                          return;
                        }
                        e.preventDefault();
                        e.stopPropagation();
                        spellUsageSkipToFlyRef.current?.();
                      }}
                    />
                  </>
                ) : null}
                {simpanCenterDisplay &&
                !simpanPeekFly &&
                !spellUsageReveal &&
                (simpanCenterDisplay.kind !== "peek" || !isWitchTarotOtherPlayerStep) &&
                (simpanCenterDisplay.kind !== "replace" ||
                  (state.simpanHandChoice && isMyHandChoice)) ? (
                  <div
                    className="pointer-events-none absolute inset-0 z-[120] flex flex-col items-center justify-center gap-2 px-1"
                    aria-live="polite"
                  >
                    <div
                      ref={simpanCenterDisplay.kind === "peek" ? simpanPeekCardMeasureRef : undefined}
                      className={
                        simpanCenterDisplay.kind === "peek" &&
                        state.simpanPeekReveal?.peekKind === "opening"
                          ? "relative overflow-visible rounded-[6px] border border-slate-600/55 bg-black/85 shadow-md"
                          : "pp-simpan-pending-glow relative overflow-visible rounded-[6px] border-2 border-white/90 bg-black/85 shadow-[0_0_28px_rgba(255,255,255,0.45)]"
                      }
                      style={{ width: MOBILE_UNIT_W, height: MOBILE_UNIT_H, flexShrink: 0 }}
                    >
                      <div className="absolute inset-0 overflow-hidden rounded-[6px]">
                        {simpanCenterDisplay.kind === "peek" && isOpponentPeekCard ? (
                          <div className="w-full h-full bg-white rounded-xl" />
                        ) : simpanCenterDisplay.card.image_url ? (
                          <GuardedImg
                            src={simpanCenterDisplay.card.image_url}
                            alt={simpanCenterDisplay.card.name}
                            className={`h-full w-full object-cover ${
                              opponentCardRotateClass(simpanCenterDisplay.player)
                            }`}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center p-2 text-center text-[9px] font-bold text-amber-100">
                            {simpanCenterDisplay.card.name}
                          </div>
                        )}
                      </div>
                    </div>
                    {simpanCenterDisplay.kind === "replace" ? (
                      <p className="max-w-full text-center text-[10px] font-black leading-tight tracking-wide text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                        교체할 카드를 선택
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100%",
                    gap: MOBILE_FIELD_STACK_GAP,
                  }}
                >
                  <div
                    data-mobile-units-row="B"
                    className={mobileFieldRowOrderClass("B", "units")}
                    style={{
                      width: MOBILE_UNIT_ROW_W,
                      display: "flex",
                      flexDirection: "row",
                      gap: MOBILE_UNIT_SLOT_GAP,
                      justifyContent: "center",
                      paddingTop: MOBILE_BOARD_EDGE_GAP,
                      boxSizing: "border-box",
                    }}
                  >
                    {renderMobileUnitSlot("B", "is", "Is", false)}
                    {renderMobileUnitSlot("B", "m", "M", false)}
                    {renderMobileUnitSlot("B", "os", "Os", false)}
                  </div>
                  <div
                    data-mobile-spell-row="B"
                    className={mobileFieldRowOrderClass("B", "spell")}
                    style={{
                      width: MOBILE_UNIT_ROW_W,
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "flex-start",
                      gap: 4,
                      boxSizing: "border-box",
                    }}
                  >
                    <div
                      className={`${mobileSpellCardStyle} border-purple-500/30 bg-purple-950/20 ${getHandDragBangEomakSpellSlotPulseClass("B")}${getHandDragCheolbyeokSpellSlotPulseClass("B")}${getHandDragBusinessGangSpellSlotPulseClass("B")}${getHandDragBefpkkiriSpellSlotPulseClass("B")}${getHandDragBubbleStationSpellSlotPulseClass("B")}${getHandDragSpellSlotPlacementPulseClass("B")}${getGonchungHiddenPeekSpellSlotPulseClass("B")}${handDragSpellSlotHoverGlow("B")}`}
                      style={MOBILE_SPELL_SLOT_BOX_STYLE}
                      data-field-drop
                      data-field-player="B"
                      data-field-slot="spell"
                      data-slot="spell"
                      data-player="B"
                      onDragOver={e => e.preventDefault()}
                      onClick={e => handleFieldClick(e, "B", "spell", getTopSpellFromField(state.playerB.field))}
                    >
                      {renderFlashOverlay("B-spell", "rounded-[6px]")}
                      {renderGonchungSpellStackFace("B", state.playerB.field, mobileFieldSpellFaceOpts)}
                      {renderFieldSpellDurationBadge(state.playerB.field, "B")}
                      {renderActionMenu("B", "spell", getTopSpellFromField(state.playerB.field))}
                      <div className={fieldSlotCombatPopupOverlayClass}>{renderCombatPopups("B-spell")}</div>
                    </div>
                    {normalizeSpellStack(state.playerB.field).length > 1 ? (
                      <button
                        type="button"
                        style={{ width: 28, height: 28, fontSize: 10, fontWeight: 900 }}
                        className="rounded border-2 border-purple-400/70 bg-slate-950/90 text-purple-100"
                        onClick={e => handleSpellStackShuffleClick(e, "B")}
                      >
                        {normalizeSpellStack(state.playerB.field).length}
                      </button>
                    ) : null}
                  </div>

                  <div
                    className="order-3"
                    style={{
                      width: MOBILE_CENTER_W - 8,
                      height: 2,
                      background: "linear-gradient(90deg, transparent, rgba(245,158,11,0.85), transparent)",
                    }}
                  />

                  <div
                    data-mobile-spell-row="A"
                    className={mobileFieldRowOrderClass("A", "spell")}
                    style={{
                      width: MOBILE_UNIT_ROW_W,
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      gap: 4,
                      boxSizing: "border-box",
                    }}
                  >
                    {normalizeSpellStack(state.playerA.field).length > 1 ? (
                      <button
                        type="button"
                        style={{ width: 28, height: 28, fontSize: 10, fontWeight: 900 }}
                        className="rounded border-2 border-purple-400/70 bg-slate-950/90 text-purple-100"
                        onClick={e => handleSpellStackShuffleClick(e, "A")}
                      >
                        {normalizeSpellStack(state.playerA.field).length}
                      </button>
                    ) : null}
                    <div
                      className={`${mobileSpellCardStyle} border-purple-500/30 bg-purple-950/20 ${getHandDragBangEomakSpellSlotPulseClass("A")}${getHandDragCheolbyeokSpellSlotPulseClass("A")}${getHandDragBusinessGangSpellSlotPulseClass("A")}${getHandDragBefpkkiriSpellSlotPulseClass("A")}${getHandDragBubbleStationSpellSlotPulseClass("A")}${getHandDragSpellSlotPlacementPulseClass("A")}${getGonchungHiddenPeekSpellSlotPulseClass("A")}${handDragSpellSlotHoverGlow("A")}`}
                      style={MOBILE_SPELL_SLOT_BOX_STYLE}
                      data-field-drop
                      data-field-player="A"
                      data-field-slot="spell"
                      data-slot="spell"
                      data-player="A"
                      onDragOver={e => e.preventDefault()}
                      onClick={e => handleFieldClick(e, "A", "spell", getTopSpellFromField(state.playerA.field))}
                    >
                      {renderFlashOverlay("A-spell", "rounded-[6px]")}
                      {renderGonchungSpellStackFace("A", state.playerA.field, mobileFieldSpellFaceOpts)}
                      {renderFieldSpellDurationBadge(state.playerA.field, "A")}
                      {renderActionMenu("A", "spell", getTopSpellFromField(state.playerA.field))}
                      <div className={fieldSlotCombatPopupOverlayClass}>{renderCombatPopups("A-spell")}</div>
                    </div>
                  </div>
                  <div
                    data-mobile-units-row="A"
                    className={mobileFieldRowOrderClass("A", "units")}
                    style={{
                      width: MOBILE_UNIT_ROW_W,
                      display: "flex",
                      flexDirection: "row",
                      gap: MOBILE_UNIT_SLOT_GAP,
                      justifyContent: "center",
                      paddingBottom: MOBILE_BOARD_EDGE_GAP,
                      boxSizing: "border-box",
                    }}
                  >
                    {renderMobileUnitSlot("A", "is", "Is", true)}
                    {renderMobileUnitSlot("A", "m", "M", true)}
                    {renderMobileUnitSlot("A", "os", "Os", true)}
                  </div>
                </div>
              </div>

              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: 0,
                  width: MOBILE_RIGHT_W,
                  height: MOBILE_MID_H,
                  display: "flex",
                  flexDirection: multiplayFlipBoard ? "column-reverse" : "column",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingTop: 4,
                  paddingBottom: 4,
                  boxSizing: "border-box",
                }}
              >
                {multiplayFlipBoard ? renderMobilePlayerTokenPanel(myEndTurnPlayer) : renderMobilePlayerTokenPanel(oppEndTurnPlayer)}
                {!multiplayMyRole ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: MOBILE_RIGHT_W }}>
                    {state.settings.isTimeLimitEnabled ? (
                      <span
                        style={{
                          fontSize: 9,
                          fontFamily: "monospace",
                          fontWeight: 900,
                          color:
                            state.currentTurn === oppEndTurnPlayer && state.turnTimeLeft <= 15
                              ? "#ef4444"
                              : oppEndTurnPlayer === "B"
                                ? "#fda4af"
                                : "#7dd3fc",
                        }}
                      >
                        {state.currentTurn === oppEndTurnPlayer
                          ? `00:${state.turnTimeLeft.toString().padStart(2, "0")}`
                          : "00:60"}
                      </span>
                    ) : null}
                    <button
                      onClick={() => handleEndTurn(oppEndTurnPlayer)}
                      disabled={state.currentTurn !== oppEndTurnPlayer || isInitializing}
                      style={{
                        width: 88,
                        height: 44,
                        borderRadius: 8,
                        fontWeight: 900,
                        fontSize: 9,
                        border: "2px solid",
                        borderColor:
                          state.currentTurn === oppEndTurnPlayer && !isInitializing ? "#fb923c" : "#334155",
                        background:
                          state.currentTurn === oppEndTurnPlayer && !isInitializing ? "#ea580c" : "#1e293b",
                        color: state.currentTurn === oppEndTurnPlayer && !isInitializing ? "#fff" : "#64748b",
                        opacity: state.currentTurn === oppEndTurnPlayer && !isInitializing ? 1 : 0.5,
                      }}
                    >
                      상대 턴 종료
                    </button>
                  </div>
                ) : null}
                <div
                  style={{
                    width: 88,
                    height: 72,
                    border: "2px solid #334155",
                    borderRadius: 8,
                    background: "rgba(0,0,0,0.6)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                  }}
                >
                  <span style={{ fontSize: 8, color: "#94a3b8", fontWeight: 900 }}>T{state.turnCount}</span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 900,
                      color: mobileTurnColor,
                    }}
                  >
                    {mobileTurnLabel}
                  </span>
                  <span style={{ fontSize: 10, fontFamily: "monospace", color: "#cbd5e1" }}>{formatTime(state.elapsedTime || 0)}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: MOBILE_RIGHT_W }}>
                  <button
                    onClick={() => handleEndTurn(myEndTurnPlayer)}
                    disabled={state.currentTurn !== myEndTurnPlayer || isInitializing}
                    style={{
                      width: 88,
                      height: 44,
                      borderRadius: 8,
                      fontWeight: 900,
                      fontSize: 9,
                      border: "2px solid",
                      borderColor:
                        state.currentTurn === myEndTurnPlayer && !isInitializing ? "#fb923c" : "#334155",
                      background:
                        state.currentTurn === myEndTurnPlayer && !isInitializing ? "#ea580c" : "#1e293b",
                      color: state.currentTurn === myEndTurnPlayer && !isInitializing ? "#fff" : "#64748b",
                      opacity: state.currentTurn === myEndTurnPlayer && !isInitializing ? 1 : 0.5,
                    }}
                  >
                    내 턴 종료
                  </button>
                  {state.settings.isTimeLimitEnabled ? (
                    <span
                      style={{
                        fontSize: 9,
                        fontFamily: "monospace",
                        fontWeight: 900,
                        color:
                          state.currentTurn === myEndTurnPlayer && state.turnTimeLeft <= 15
                            ? "#ef4444"
                            : myEndTurnPlayer === "A"
                              ? "#7dd3fc"
                              : "#fda4af",
                      }}
                    >
                      {state.currentTurn === myEndTurnPlayer
                        ? `00:${state.turnTimeLeft.toString().padStart(2, "0")}`
                        : "00:60"}
                    </span>
                  ) : null}
                </div>
                {multiplayFlipBoard ? renderMobilePlayerTokenPanel(oppEndTurnPlayer) : renderMobilePlayerTokenPanel(myEndTurnPlayer)}
              </div>
            </div>

            {renderMobileHandRow("A")}
            {renderMobilePlayerHpBar("A")}
          </div>
            </div>
          </div>
        </div>
          {selectedBadge
            ? (() => {
                const margin = 8;
                const gapAbove = 8;
                const estTooltipH = 28;
                const vw = typeof window !== "undefined" ? window.innerWidth : selectedBadge.x;
                const left = Math.max(margin, Math.min(selectedBadge.x, vw - margin));
                const top = Math.max(margin, selectedBadge.y - gapAbove - estTooltipH);
                return (
                  <div
                    role="tooltip"
                    aria-label={selectedBadge.label}
                    style={{
                      position: "fixed",
                      left,
                      top,
                      transform: "translateX(-50%)",
                      zIndex: 9999,
                      backgroundColor: selectedBadge.bgColor,
                      fontSize: 12,
                      padding: "6px 12px",
                      borderRadius: 6,
                      whiteSpace: "nowrap",
                      pointerEvents: "none",
                    }}
                  >
                    {selectedBadge.label}
                  </div>
                );
              })()
            : null}

          {/* 모바일 게임 종료 오버레이 */}
          {(displayWinner || isDraw) && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 300,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0,0,0,0.88)",
                backdropFilter: "blur(8px)",
                padding: 24,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 32,
                  borderRadius: 32,
                  border: `6px solid ${isDraw ? "#fbbf24" : displayWinner === "A" ? "#38bdf8" : "#fb7185"}`,
                  background: isDraw ? "rgba(120,53,15,0.7)" : displayWinner === "A" ? "rgba(12,74,110,0.7)" : "rgba(136,19,55,0.7)",
                  boxShadow: isDraw
                    ? "0 0 80px rgba(251,191,36,0.5)"
                    : displayWinner === "A"
                    ? "0 0 80px rgba(56,189,248,0.5)"
                    : "0 0 80px rgba(251,113,133,0.5)",
                  width: "100%",
                  maxWidth: 360,
                  gap: 16,
                }}
              >
                <h2
                  style={{
                    fontSize: 40,
                    fontWeight: 900,
                    color: "white",
                    letterSpacing: 4,
                    textAlign: "center",
                    marginBottom: 8,
                  }}
                >
                  {isDraw ? "DRAW" : `PLAYER ${displayWinner} WIN!`}
                </h2>
                <p
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: isDraw ? "#fde68a" : "#e2e8f0",
                    textAlign: "center",
                    marginBottom: 8,
                  }}
                >
                  {isDraw
                    ? "무승부"
                    : multiplaySessionWinner && multiplayMyRole
                    ? isMyWin
                      ? "승리했습니다."
                      : "패배했습니다."
                    : "게임이 종료되었습니다."}
                </p>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#fbbf24",
                    marginBottom: 20,
                    letterSpacing: 2,
                  }}
                >
                  게임 시간 : {Math.floor((state?.elapsedTime || 0) / 60)}분{" "}
                  {(state?.elapsedTime || 0) % 60}초
                </p>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    width: "100%",
                  }}
                >
                  <button
                    style={{
                      padding: "14px 0",
                      borderRadius: 16,
                      background: "#1e293b",
                      border: "2px solid #475569",
                      color: "white",
                      fontSize: 16,
                      fontWeight: 900,
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      if (multiplayEndUi) multiplayEndUi.onLeaveLobby();
                      else if (onBackToLobby) onBackToLobby();
                      else window.location.href = "/";
                    }}
                  >
                    로비로 돌아가기
                  </button>
                  <button
                    style={{
                      padding: "14px 0",
                      borderRadius: 16,
                      background: "#064e3b",
                      border: "2px solid #10b981",
                      color: "white",
                      fontSize: 16,
                      fontWeight: 900,
                      cursor: "pointer",
                    }}
                    onClick={() => setIsGameStatsOpen(true)}
                  >
                    게임 통계
                  </button>
                  {multiplayEndUi?.rematchStatus === "incoming" ? (
                    <>
                      <button
                        style={{
                          padding: "14px 0",
                          borderRadius: 16,
                          background: isDraw ? "#78350f" : displayWinner === "A" ? "#0c4a6e" : "#881337",
                          border: `2px solid ${isDraw ? "#fbbf24" : displayWinner === "A" ? "#38bdf8" : "#fb7185"}`,
                          color: "white",
                          fontSize: 16,
                          fontWeight: 900,
                          cursor: "pointer",
                        }}
                        onClick={multiplayEndUi.onRematchAccept}
                      >
                        수락
                      </button>
                      <button
                        style={{
                          padding: "14px 0",
                          borderRadius: 16,
                          background: "#1e293b",
                          border: "2px solid #475569",
                          color: "white",
                          fontSize: 16,
                          fontWeight: 900,
                          cursor: "pointer",
                        }}
                        onClick={multiplayEndUi.onRematchReject}
                      >
                        거절
                      </button>
                    </>
                  ) : (
                    <button
                      style={{
                        padding: "14px 0",
                        borderRadius: 16,
                        background: isDraw ? "#78350f" : displayWinner === "A" ? "#0c4a6e" : "#881337",
                        border: `2px solid ${isDraw ? "#fbbf24" : displayWinner === "A" ? "#38bdf8" : "#fb7185"}`,
                        color: "white",
                        fontSize: 16,
                        fontWeight: 900,
                        cursor: multiplayEndUi?.rematchStatus === "waiting" ? "not-allowed" : "pointer",
                        opacity: multiplayEndUi?.rematchStatus === "waiting" ? 0.6 : 1,
                      }}
                      disabled={multiplayEndUi?.rematchStatus === "waiting"}
                      onClick={() => {
                        if (multiplayEndUi) multiplayEndUi.onRematch();
                      }}
                    >
                      {multiplayEndUi?.rematchStatus === "waiting" ? "응답 대기 중..." : "다시 플레이"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 모바일 귀환 리와인드 모달 */}
          {state?.guihwanPending && isGuihwanRewindOpen &&
            (!multiplayMyTeam || state.guihwanPending.ownerPlayer === multiplayMyTeam) && (
            <div style={{ position: "fixed", inset: 0, zIndex: 300 }}>
              <RewindModal
                onClose={closeGuihwanRewindModal}
                rewindCards={state.rewindCards}
                revivableIndices={getGuihwanRevivableRewindIndices(
                  state.rewindCards,
                  state.guihwanPending.ownerPlayer,
                  state.unitCombatStats
                )}
                onSelectRevive={resolveGuihwanRevive}
                onOpenDetail={openHandCardCodexDetail}
              />
            </div>
          )}
        </div>
      ) : null}

      {!isMobile && (
      <div className={`relative w-full max-w-[1700px] min-w-[1300px] min-h-[750px] aspect-video flex flex-row gap-6 p-6 rounded-3xl border-2 ${theme.border} shadow-[0_0_50px_rgba(0,0,0,0.6)] bg-gradient-to-b from-[#0a1628] to-[#050a14] overflow-hidden`}>
        {isInitializing && (
          <div
            className="absolute inset-x-0 bottom-6 z-[56] flex justify-center pointer-events-none"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                skipOpeningInitialization();
              }}
              className="pointer-events-auto px-5 py-2.5 rounded-xl border-2 border-amber-400/85 bg-amber-950/92 text-amber-100 font-black text-xs tracking-wider shadow-[0_0_20px_rgba(251,191,36,0.25)] hover:bg-amber-900/95 hover:border-amber-300 active:scale-[0.98] transition-all"
            >
              시작 연출 스킵 (테스트)
            </button>
          </div>
        )}
        {coinTossDisplay && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-3xl animate-[fadeIn_0.3s_ease-out]">
            <div className="flex flex-col items-center">
              <h3 className="text-white font-black tracking-widest text-2xl mb-8 animate-pulse drop-shadow-lg">선공 결정 코인 토스</h3>
              {coinTossDisplay === "FLIPPING" ? (
                <div className={`w-40 h-40 rounded-full border-4 shadow-[0_0_40px_rgba(255,255,255,0.4)] flex items-center justify-center transition-colors duration-75 ${coinFlipSide === 'A' ? 'bg-sky-600 border-sky-300' : 'bg-rose-600 border-rose-300'}`}>
                  <IconUser className="w-16 h-16 text-white opacity-80" />
                </div>
              ) : (
                <div className={`w-40 h-40 rounded-full border-4 flex items-center justify-center animate-[bounce_0.5s_ease-out] shadow-[0_0_80px_rgba(255,255,255,0.6)] ${coinTossDisplay === 'A' ? 'bg-sky-600 border-sky-300 shadow-sky-500/50' : 'bg-rose-600 border-rose-300 shadow-rose-500/50'}`}>
                  <span className="text-5xl font-black text-white">{coinTossDisplay}</span>
                </div>
              )}
              <p className="mt-8 text-3xl font-black text-white drop-shadow-xl">
                {coinTossDisplay === "FLIPPING" ? "돌아가는 중..." : `Player ${coinTossDisplay} 선공!`}
              </p>
            </div>
          </div>
        )}

        {/* ===================== 1. 좌측 영역 (메뉴, 덱, 리와인드) ===================== */}
        <div className={`flex flex-col justify-start items-center shrink-0 w-[148px] h-full py-2 gap-2 transition-opacity min-h-0 ${isInitializing ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          <div
            className={`relative w-full flex justify-center ${multiplayOpponentDisconnected ? "z-[150]" : "z-50"}`}
          >
            <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }} disabled={isInitializing} className={`flex h-12 w-12 items-center justify-center rounded-2xl border-2 ${theme.panel} hover:bg-slate-800/50 transition-colors shadow-lg`}>
              <IconSettings className="w-6 h-6" />
            </button>
            {isMenuOpen && (
              <div className={`absolute top-14 left-4 w-44 flex flex-col rounded-xl border-2 ${theme.panel} overflow-hidden shadow-2xl bg-[#0a1628]`}>
                <button className="px-4 py-3 text-left text-xs font-bold hover:bg-sky-500/20 text-sky-400 transition-colors" onClick={() => { setIsMenuOpen(false); if(onBackToLobby) onBackToLobby(); else window.location.href = '/'; }}>로비로 돌아가기</button>
                {!multiplayMyRole ? (
                  <button className="px-4 py-3 text-left text-xs font-bold hover:bg-rose-500/20 text-rose-400 transition-colors" onClick={handleReset}>게임 초기화</button>
                ) : null}
                {multiplayMyRole && onSurrender && (
                  <>
                    <button
                      className={`px-4 py-3 text-left text-xs font-bold transition-colors border-t border-slate-700 ${
                        (state?.turnCount ?? 0) >= 10
                          ? "hover:bg-red-500/20 text-red-400 cursor-pointer"
                          : "text-slate-600 cursor-not-allowed opacity-50"
                      }`}
                      disabled={(state?.turnCount ?? 0) < 10}
                      onClick={() => {
                        if ((state?.turnCount ?? 0) < 10) return;
                        setIsMenuOpen(false);
                        onSurrender();
                      }}
                    >
                      게임 항복
                      {(state?.turnCount ?? 0) < 10 && (
                        <span className="block text-[10px] text-slate-500 font-normal mt-0.5">
                          10턴 이후 사용 가능
                        </span>
                      )}
                    </button>
                    <button
                      className={`px-4 py-3 text-left text-xs font-bold transition-colors border-t border-slate-700 ${
                        (state?.turnCount ?? 0) >= (drawRequestCooldownTurn ?? 0)
                          ? "hover:bg-yellow-500/20 text-yellow-400 cursor-pointer"
                          : "text-slate-600 cursor-not-allowed opacity-50"
                      }`}
                      disabled={(state?.turnCount ?? 0) < (drawRequestCooldownTurn ?? 0)}
                      onClick={() => {
                        if ((state?.turnCount ?? 0) < (drawRequestCooldownTurn ?? 0)) return;
                        setIsMenuOpen(false);
                        onDrawRequest?.(state?.turnCount ?? 0);
                      }}
                    >
                      무승부 신청
                      {(state?.turnCount ?? 0) < (drawRequestCooldownTurn ?? 0) && (
                        <span className="block text-[10px] text-slate-500 font-normal mt-0.5">
                          {drawRequestCooldownTurn}턴 이후 재신청 가능
                        </span>
                      )}
                    </button>
                  </>
                )}
                <button className="px-4 py-3 text-left text-xs font-bold hover:bg-amber-500/20 text-amber-400 transition-colors border-t border-slate-700" onClick={() => { setIsMenuOpen(false); setIsSettingsOpen(true); }}>게임 설정</button>
                <button
                  type="button"
                  className="px-4 py-3 text-left text-xs font-bold hover:bg-emerald-500/20 text-emerald-400 transition-colors border-t border-slate-700"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsGameStatsOpen(true);
                  }}
                >
                  게임 통계
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 mt-auto w-full">
            <button 
              onClick={handleDrawClick} 
              disabled={isDrawDisabled} 
              className={`group relative w-full aspect-[1/1.2] border-2 rounded-2xl flex flex-col items-center justify-center transition-all shadow-xl disabled:opacity-40 disabled:border-slate-700 disabled:bg-slate-800 disabled:cursor-not-allowed enabled:active:scale-95 ${
                isDrawHighlight 
                  ? 'border-white bg-indigo-900/60 shadow-[0_0_20px_rgba(255,255,255,0.8)] animate-pulse' 
                  : 'border-indigo-500/50 bg-indigo-950/40 enabled:hover:border-indigo-400'
              }`}
            >
              <IconDeck className={`w-8 h-8 mb-2 drop-shadow-md transition-colors ${isDrawHighlight ? 'text-white' : 'text-indigo-400'}`} />
              <span className={`text-[11px] font-bold transition-colors ${isDrawHighlight ? 'text-indigo-200' : 'text-indigo-300'}`}>공용 덱</span>
              <span className="text-3xl font-black text-white leading-tight drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">{state.deckCards.length}</span>
              
              {state.settings.drawMode === "SELECT" && (
                <div className="absolute -top-2 -right-2 bg-indigo-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-md border border-white/20">
                  선택
                </div>
              )}
            </button>
            
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (isWitchTarotOtherPlayerStep) return;
                if (state.simpanHandChoice) dismissSimpanViaRewind();
                else setIsRewindModalOpen(true);
              }}
              className={`w-full aspect-[1.58/1] border-2 border-slate-600 hover:border-slate-400 border-dashed bg-black/40 hover:bg-black/60 rounded-xl flex flex-col items-center justify-center transition-all opacity-80 hover:opacity-100 active:scale-95 group ${
                state.simpanHandChoice ? "pp-rewind-simpan-white-blink border-white/50" : ""
              }`}
            >
              <span className="text-[11px] font-bold text-slate-400 group-hover:text-slate-300 transition-colors">리와인드</span>
              <span className="text-2xl font-black text-slate-500 group-hover:text-slate-300 leading-tight transition-colors">{state.rewindCards.length}</span>
            </button>

          </div>

          {chatPanel}
        </div>

        {/* ===================== 2. 중앙 영역 (메인 필드) ===================== */}
        <div className="shrink-0 flex flex-col items-center justify-center relative h-full pl-2 lg:pl-6">
          <div className="border-2 border-amber-600/30 bg-black/50 rounded-[2.5rem] px-6 py-6 flex flex-col items-center justify-center relative shadow-[inset_0_0_80px_rgba(0,0,0,0.7)]">
            {multiplayOpponentDisconnected ? (
              <MultiplayDisconnectOverlay secondsLeft={multiplayDisconnectSecondsLeft} />
            ) : null}
            {spellUsageReveal && !spellUsageFly ? (
              <div
                className="pointer-events-none absolute inset-x-0 top-[48%] z-[121] flex -translate-y-1/2 flex-col items-center justify-center gap-2 overflow-visible px-4"
                aria-live="polite"
              >
                <div className="relative flex min-h-[min(52vw,16rem)] min-w-[min(92vw,28rem)] items-center justify-center overflow-visible">
                  <div
                    aria-hidden
                    key={`su-h1-${spellUsageRevealTick}`}
                    className={spellUsageCasterHaloLayerClass(spellUsageReveal.casterPlayer, 1)}
                  />
                  <div
                    aria-hidden
                    key={`su-h2-${spellUsageRevealTick}`}
                    className={spellUsageCasterHaloLayerClass(spellUsageReveal.casterPlayer, 2)}
                  />
                  <div
                    ref={spellUsageCardMeasureRef}
                    className={`pp-simpan-pending-glow relative z-[2] w-[92px] md:w-[105px] lg:w-[118px] aspect-[1/1.58] overflow-visible rounded-[10px] border-2 bg-black/85 ${spellUsageCasterCardShellClass(spellUsageReveal.casterPlayer)}`}
                  >
                  <div
                    ref={spellUsageCenterFlashRef}
                    className={`relative h-full w-full overflow-visible rounded-[8px] ${spellUsageMuhyohwaCounterGlow ? "ring-0" : "overflow-hidden"}`}
                  >
                    {spellUsageMuhyohwaCounterGlow ? (
                      <div className="pp-muhyohwa-counter-outline" aria-hidden />
                    ) : null}
                    {shouldShowMultiplaySpellUsageBack(spellUsageReveal.casterPlayer) ? (
                      <div className={spellUsageMuhyohwaCounterResolve ? "pp-muhyohwa-counter-vanish h-full w-full" : "h-full w-full"}>
                        <MultiplayCardBackFace />
                      </div>
                    ) : spellUsageReveal.centerShowsCardBack ? (
                      <div className={spellUsageMuhyohwaCounterResolve ? "pp-muhyohwa-counter-vanish h-full w-full" : "h-full w-full"}>
                        <HiddenSpellCardBackFace />
                      </div>
                    ) : spellUsageReveal.previewCard.image_url ? (
                      <GuardedImg
                        src={spellUsageReveal.previewCard.image_url}
                        alt={spellUsageReveal.previewCard.name}
                        className={`h-full w-full object-cover ${spellUsageTeslaHideOppCenterCard ? "brightness-0" : ""} ${spellUsageMuhyohwaCounterResolve ? "pp-muhyohwa-counter-vanish" : ""}`}
                      />
                    ) : (
                      <div
                        className={`flex h-full w-full items-center justify-center p-2 text-center text-[10px] font-bold ${spellUsageReveal.casterPlayer === "A" ? "text-sky-100" : "text-rose-100"} ${spellUsageTeslaHideOppCenterCard ? "brightness-0" : ""} ${spellUsageMuhyohwaCounterResolve ? "pp-muhyohwa-counter-vanish" : ""}`}
                      >
                        {spellUsageReveal.previewCard.name}
                      </div>
                    )}
                    {renderFlashOverlay(SPELL_USAGE_CENTER_KEY, "rounded-[8px]")}
                  </div>
                  <div className={fieldSlotCombatPopupOverlayClass}>
                    {renderCombatPopups(SPELL_USAGE_CENTER_KEY)}
                  </div>
                </div>
                </div>
              </div>
            ) : null}
            {simpanCenterDisplay &&
            !simpanPeekFly &&
            !spellUsageReveal &&
            (simpanCenterDisplay.kind !== "peek" || !isWitchTarotOtherPlayerStep) &&
            (simpanCenterDisplay.kind !== "replace" ||
              (state.simpanHandChoice && isMyHandChoice)) ? (
              <div
                className="pointer-events-none absolute inset-x-0 top-[48%] z-[120] flex -translate-y-1/2 flex-col items-center justify-center gap-2 px-4"
                aria-live="polite"
              >
                <div
                  ref={simpanCenterDisplay.kind === "peek" ? simpanPeekCardMeasureRef : undefined}
                  className={
                    simpanCenterDisplay.kind === "peek" &&
                    state.simpanPeekReveal?.peekKind === "opening"
                      ? "relative w-[92px] md:w-[105px] lg:w-[118px] aspect-[1/1.58] overflow-visible rounded-[10px] border border-slate-600/55 bg-black/85 shadow-md"
                      : "pp-simpan-pending-glow relative w-[92px] md:w-[105px] lg:w-[118px] aspect-[1/1.58] overflow-visible rounded-[10px] border-2 border-white/90 bg-black/85 shadow-[0_0_28px_rgba(255,255,255,0.45)]"
                  }
                >
                  <div className="absolute inset-0 overflow-hidden rounded-[8px]">
                    {simpanCenterDisplay.kind === "peek" && isOpponentPeekCard ? (
                      <div className="w-full h-full bg-white rounded-xl" />
                    ) : simpanCenterDisplay.card.image_url ? (
                      <GuardedImg
                        src={simpanCenterDisplay.card.image_url}
                        alt={simpanCenterDisplay.card.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center p-2 text-center text-[10px] font-bold text-amber-100">
                        {simpanCenterDisplay.card.name}
                      </div>
                    )}
                  </div>
                </div>
                {simpanCenterDisplay.kind === "replace" ? (
                  <p className="max-w-[min(100%,22rem)] text-center text-[11px] font-black leading-tight tracking-wide text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                    교체할 카드를 선택
                  </p>
                ) : null}
              </div>
            ) : null}
            
            {/* ⭐️ Player B 영역 (상단) */}
            <div className={`flex flex-col gap-2 z-10 w-full ${multiplayFlipBoard ? "order-3" : "order-1"}`}>
              <div className={`flex justify-between gap-4 w-full items-stretch ${desktopFieldBlockOrderClass("B", "units")}`}>
                 <div className="relative flex shrink-0 flex-col items-stretch self-stretch">
                   <div className={`relative flex min-h-0 flex-1 flex-col items-stretch gap-0.5 ${fieldUnitWidthClass}${fieldSlotColumnReverseClass("B")}`}>
                   <div className={fieldSlotBadgeZoneClassWithCard(state.playerB.field.is, fieldSlotIsPlayerA("B"))}>{renderStatusBadges("B", "is", state.playerB.field.is, fieldSlotIsPlayerA("B"))}</div>
                   {renderHpRowWithOptionalDKGauge(
                     state.playerB.field.is,
                     renderHpBar(state.playerB.field.is, fieldSlotIsPlayerA("B"), "inline", "is") ?? fieldSlotHpPlaceholder,
                     fieldSlotIsPlayerA("B"),
                     "B-is"
                   )}
                   <div className="flex min-h-0 flex-1 flex-col items-center justify-end overflow-visible">
                   <div className={unitSlotOuterClass}>
                     {renderMaengsugyeonPoFacingEnemyRect("B", "is", state.playerB.field.is)}
                    <div className={getSlotClassName("B", "is", state.playerB.field.is)} data-field-drop data-field-player="B" data-field-slot="is" onClick={(e) => handleFieldClick(e, "B", "is", state.playerB.field.is)}>
                    {state.playerB.field.is ? (
                      state.playerB.field.is.image_url ? <GuardedImg src={state.playerB.field.is.image_url} alt="Is" className={`w-full h-full object-cover transition-transform duration-300 ${opponentCardRotateClass("B")}`} /> : <span className={`text-xs font-bold text-center leading-tight p-2 text-blue-200 transition-transform duration-300 ${opponentCardRotateClass("B")}`}>{state.playerB.field.is.name}</span>
                    ) : <span className="absolute -top-6 text-xs text-slate-400 font-bold whitespace-nowrap">Is</span>}
                    {renderActionMenu("B", "is", state.playerB.field.is)}
                    </div>
                     {renderAebeolaekingRiderOverlay("B", "is", state.playerB.field.is)}
                     {renderFlashOverlay("B-is", "rounded-[8px]")}
                     {renderGeunyangMojaHitFlameOverlay("B-is", "rounded-[8px]")}
                     {renderDiagoHitFlameOverlay("B-is", "rounded-[8px]")}
                     {renderMomoHitFlameOverlay("B-is", "rounded-[8px]")}
                     {renderGhostoneClawHitOverlay("B-is", "rounded-[8px]")}
                     {renderIversonClawHitOverlay("B-is", "rounded-[8px]")}
                     {renderEristinaHitLineOverlay("B-is", "rounded-[8px]")}
                     {renderCheolgibyeongFieldRing("B", "is", state.playerB.field.is)}
                     {renderRyeomchoFieldRing("B", "is", state.playerB.field.is)}
                     {renderMaryDefenseFieldRing("B", "is", state.playerB.field.is)}
                     {renderBanjitgoriFieldRing("B", "is", state.playerB.field.is)}
                     {renderPhilipFacingRing("B", "is", state.playerB.field.is)}
                     {renderDinnerFacingRing("B", "is", state.playerB.field.is)}
                     {renderMaengsugyeonPoThreatRing("B", "is", state.playerB.field.is)}
                     {renderStartingHeraldPrivilegeTargetOutline("B", "is", state.playerB.field.is)}
                     {renderEondeokSilenceOutline(state.playerB.field.is, "rounded-[8px]")}
                     {renderStackingGaugeFieldRings("B", "is", state.playerB.field.is)}
                     {renderStunSwirlOverlay(state.playerB.field.is, "rounded-[8px]", "B-is")}
                     {renderLegendarySwordChargeAura("B", "is", state.playerB.field.is, "rounded-[8px]")}
                     {renderIversonWaitAuraOverlay(state.playerB.field.is, "rounded-[8px]", "B-is")}
                     {renderBaekseuInvulnRing(state.playerB.field.is, "rounded-[8px]", "B", "is")}
                   </div>
                   </div>
                   <div className={fieldSlotCombatPopupOverlayClass}>{renderCombatPopups("B-is")}</div>
                   </div>
                 </div>
                 <div className="relative flex shrink-0 flex-col items-stretch self-stretch">
                   <div className={`relative flex min-h-0 flex-1 flex-col items-stretch gap-0.5 ${fieldUnitWidthClass}${fieldSlotColumnReverseClass("B")}`}>
                   <div className={fieldSlotBadgeZoneClassWithCard(state.playerB.field.m, fieldSlotIsPlayerA("B"))}>{renderStatusBadges("B", "m", state.playerB.field.m, fieldSlotIsPlayerA("B"))}</div>
                   {renderHpRowWithOptionalDKGauge(
                     state.playerB.field.m,
                     renderHpBar(state.playerB.field.m, fieldSlotIsPlayerA("B"), "inline", "m") ?? fieldSlotHpPlaceholder,
                     fieldSlotIsPlayerA("B"),
                     "B-m"
                   )}
                   <div className="flex min-h-0 flex-1 flex-col items-center justify-end overflow-visible">
                   <div className={unitSlotOuterClass}>
                     {renderMaengsugyeonPoFacingEnemyRect("B", "m", state.playerB.field.m)}
                    <div className={getSlotClassName("B", "m", state.playerB.field.m)} data-field-drop data-field-player="B" data-field-slot="m" onClick={(e) => handleFieldClick(e, "B", "m", state.playerB.field.m)}>
                    {state.playerB.field.m ? (
                      state.playerB.field.m.image_url ? <GuardedImg src={state.playerB.field.m.image_url} alt="M" className={`w-full h-full object-cover transition-transform duration-300 ${opponentCardRotateClass("B")}`} /> : <span className={`text-xs font-bold text-center leading-tight p-2 text-blue-200 transition-transform duration-300 ${opponentCardRotateClass("B")}`}>{state.playerB.field.m.name}</span>
                    ) : <span className="absolute -top-6 text-xs text-slate-400 font-bold whitespace-nowrap">M</span>}
                    {renderActionMenu("B", "m", state.playerB.field.m)}
                    </div>
                     {renderAebeolaekingRiderOverlay("B", "m", state.playerB.field.m)}
                     {renderFlashOverlay("B-m", "rounded-[8px]")}
                     {renderGeunyangMojaHitFlameOverlay("B-m", "rounded-[8px]")}
                     {renderDiagoHitFlameOverlay("B-m", "rounded-[8px]")}
                     {renderMomoHitFlameOverlay("B-m", "rounded-[8px]")}
                     {renderGhostoneClawHitOverlay("B-m", "rounded-[8px]")}
                     {renderIversonClawHitOverlay("B-m", "rounded-[8px]")}
                     {renderEristinaHitLineOverlay("B-m", "rounded-[8px]")}
                     {renderCheolgibyeongFieldRing("B", "m", state.playerB.field.m)}
                     {renderRyeomchoFieldRing("B", "m", state.playerB.field.m)}
                     {renderMaryDefenseFieldRing("B", "m", state.playerB.field.m)}
                     {renderBanjitgoriFieldRing("B", "m", state.playerB.field.m)}
                     {renderPhilipFacingRing("B", "m", state.playerB.field.m)}
                     {renderDinnerFacingRing("B", "m", state.playerB.field.m)}
                     {renderMaengsugyeonPoThreatRing("B", "m", state.playerB.field.m)}
                     {renderStartingHeraldPrivilegeTargetOutline("B", "m", state.playerB.field.m)}
                     {renderEondeokSilenceOutline(state.playerB.field.m, "rounded-[8px]")}
                     {renderStackingGaugeFieldRings("B", "m", state.playerB.field.m)}
                     {renderStunSwirlOverlay(state.playerB.field.m, "rounded-[8px]", "B-m")}
                     {renderLegendarySwordChargeAura("B", "m", state.playerB.field.m, "rounded-[8px]")}
                     {renderIversonWaitAuraOverlay(state.playerB.field.m, "rounded-[8px]", "B-m")}
                     {renderBaekseuInvulnRing(state.playerB.field.m, "rounded-[8px]", "B", "m")}
                   </div>
                   </div>
                   <div className={fieldSlotCombatPopupOverlayClass}>{renderCombatPopups("B-m")}</div>
                   </div>
                 </div>
                 <div className="relative flex shrink-0 flex-col items-stretch self-stretch">
                   <div className={`relative flex min-h-0 flex-1 flex-col items-stretch gap-0.5 ${fieldUnitWidthClass}${fieldSlotColumnReverseClass("B")}`}>
                   <div className={fieldSlotBadgeZoneClassWithCard(state.playerB.field.os, fieldSlotIsPlayerA("B"))}>{renderStatusBadges("B", "os", state.playerB.field.os, fieldSlotIsPlayerA("B"))}</div>
                   {renderHpRowWithOptionalDKGauge(
                     state.playerB.field.os,
                     renderHpBar(state.playerB.field.os, fieldSlotIsPlayerA("B"), "inline", "os") ?? fieldSlotHpPlaceholder,
                     fieldSlotIsPlayerA("B"),
                     "B-os"
                   )}
                   <div className="flex min-h-0 flex-1 flex-col items-center justify-end overflow-visible">
                   <div className={unitSlotOuterClass}>
                     {renderMaengsugyeonPoFacingEnemyRect("B", "os", state.playerB.field.os)}
                    <div className={getSlotClassName("B", "os", state.playerB.field.os)} data-field-drop data-field-player="B" data-field-slot="os" onClick={(e) => handleFieldClick(e, "B", "os", state.playerB.field.os)}>
                    {state.playerB.field.os ? (
                      state.playerB.field.os.image_url ? <GuardedImg src={state.playerB.field.os.image_url} alt="Os" className={`w-full h-full object-cover transition-transform duration-300 ${opponentCardRotateClass("B")}`} /> : <span className={`text-xs font-bold text-center leading-tight p-2 text-blue-200 transition-transform duration-300 ${opponentCardRotateClass("B")}`}>{state.playerB.field.os.name}</span>
                    ) : <span className="absolute -top-6 text-xs text-slate-400 font-bold whitespace-nowrap">Os</span>}
                    {renderActionMenu("B", "os", state.playerB.field.os)}
                    </div>
                     {renderAebeolaekingRiderOverlay("B", "os", state.playerB.field.os)}
                     {renderFlashOverlay("B-os", "rounded-[8px]")}
                     {renderGeunyangMojaHitFlameOverlay("B-os", "rounded-[8px]")}
                     {renderDiagoHitFlameOverlay("B-os", "rounded-[8px]")}
                     {renderMomoHitFlameOverlay("B-os", "rounded-[8px]")}
                     {renderGhostoneClawHitOverlay("B-os", "rounded-[8px]")}
                     {renderIversonClawHitOverlay("B-os", "rounded-[8px]")}
                     {renderEristinaHitLineOverlay("B-os", "rounded-[8px]")}
                     {renderCheolgibyeongFieldRing("B", "os", state.playerB.field.os)}
                     {renderRyeomchoFieldRing("B", "os", state.playerB.field.os)}
                     {renderMaryDefenseFieldRing("B", "os", state.playerB.field.os)}
                     {renderBanjitgoriFieldRing("B", "os", state.playerB.field.os)}
                     {renderPhilipFacingRing("B", "os", state.playerB.field.os)}
                     {renderDinnerFacingRing("B", "os", state.playerB.field.os)}
                     {renderMaengsugyeonPoThreatRing("B", "os", state.playerB.field.os)}
                     {renderStartingHeraldPrivilegeTargetOutline("B", "os", state.playerB.field.os)}
                     {renderEondeokSilenceOutline(state.playerB.field.os, "rounded-[8px]")}
                     {renderStackingGaugeFieldRings("B", "os", state.playerB.field.os)}
                     {renderStunSwirlOverlay(state.playerB.field.os, "rounded-[8px]", "B-os")}
                     {renderLegendarySwordChargeAura("B", "os", state.playerB.field.os, "rounded-[8px]")}
                     {renderIversonWaitAuraOverlay(state.playerB.field.os, "rounded-[8px]", "B-os")}
                     {renderBaekseuInvulnRing(state.playerB.field.os, "rounded-[8px]", "B", "os")}
                  </div>
                   </div>
                   <div className={fieldSlotCombatPopupOverlayClass}>{renderCombatPopups("B-os")}</div>
                   </div>
                 </div>
              </div>
              <div
                className={`flex w-full ${fieldUnitsBeforeSpell("B") ? "mt-2 justify-start" : "mb-2 justify-start"} ${desktopFieldBlockOrderClass("B", "spell")}`}
              >
                <div className="flex flex-row items-center gap-1">
                  <div
                    className={`${spellCardStyle} !overflow-visible border-purple-500/30 bg-purple-950/20 ${getHandDragBangEomakSpellSlotPulseClass("B")}${getHandDragCheolbyeokSpellSlotPulseClass("B")}${getHandDragBusinessGangSpellSlotPulseClass("B")}${getHandDragBefpkkiriSpellSlotPulseClass("B")}${getHandDragBubbleStationSpellSlotPulseClass("B")}${getHandDragSpellSlotPlacementPulseClass("B")}${getGonchungHiddenPeekSpellSlotPulseClass("B")}${handDragSpellSlotHoverGlow("B")}${getTopSpellFromField(state.playerB.field) && !attackingSlot ? " cursor-pointer hover:border-purple-400/80" : state.currentTurn === "B" && !attackingSlot ? " transition-colors hover:border-purple-400" : ""}`}
                    data-field-drop
                    data-field-player="B"
                    data-field-slot="spell"
                    onClick={e =>
                      handleFieldClick(e, "B", "spell", getTopSpellFromField(state.playerB.field))
                    }
                  >
                    {renderFlashOverlay("B-spell", "rounded-[8px]")}
                    {renderGonchungSpellStackFace("B", state.playerB.field)}
                    {renderFieldSpellDurationBadge(state.playerB.field, "B")}
                    {renderActionMenu("B", "spell", getTopSpellFromField(state.playerB.field))}
                    <div className={fieldSlotCombatPopupOverlayClass}>{renderCombatPopups("B-spell")}</div>
                  </div>
                  {normalizeSpellStack(state.playerB.field).length > 1 ? (
                    <button
                      type="button"
                      title="겹친 스펠 순환 (맨 위 → 맨 아래)"
                      className="flex h-9 min-w-[2.25rem] shrink-0 cursor-pointer items-center justify-center rounded-md border-2 border-purple-400/70 bg-slate-950/90 px-1.5 text-sm font-black tabular-nums text-purple-100 shadow-md hover:border-purple-300 hover:bg-slate-900"
                      onClick={e => handleSpellStackShuffleClick(e, "B")}
                    >
                      {normalizeSpellStack(state.playerB.field).length}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            {/* 중앙선 */}
            <div className="order-2 w-[120%] h-[2px] bg-gradient-to-r from-transparent via-amber-500/80 to-transparent shadow-[0_0_20px_rgba(245,158,11,0.9)] shrink-0 my-5 z-0"></div>

            {/* ⭐️ Player A 영역 (하단) */}
            <div className={`flex flex-col gap-2 z-10 w-full ${multiplayFlipBoard ? "order-1" : "order-3"}`}>
              <div
                className={`flex w-full justify-end ${fieldUnitsBeforeSpell("A") ? "mt-2" : "mb-2"} ${desktopFieldBlockOrderClass("A", "spell")}`}
              >
                <div className="flex flex-row items-center gap-1">
                  {normalizeSpellStack(state.playerA.field).length > 1 ? (
                    <button
                      type="button"
                      title="겹친 스펠 순환 (맨 위 → 맨 아래)"
                      className="flex h-9 min-w-[2.25rem] shrink-0 cursor-pointer items-center justify-center rounded-md border-2 border-purple-400/70 bg-slate-950/90 px-1.5 text-sm font-black tabular-nums text-purple-100 shadow-md hover:border-purple-300 hover:bg-slate-900"
                      onClick={e => handleSpellStackShuffleClick(e, "A")}
                    >
                      {normalizeSpellStack(state.playerA.field).length}
                    </button>
                  ) : null}
                  <div
                    className={`${spellCardStyle} !overflow-visible border-purple-500/30 bg-purple-950/20 ${getHandDragBangEomakSpellSlotPulseClass("A")}${getHandDragCheolbyeokSpellSlotPulseClass("A")}${getHandDragBusinessGangSpellSlotPulseClass("A")}${getHandDragBefpkkiriSpellSlotPulseClass("A")}${getHandDragBubbleStationSpellSlotPulseClass("A")}${getHandDragSpellSlotPlacementPulseClass("A")}${getGonchungHiddenPeekSpellSlotPulseClass("A")}${handDragSpellSlotHoverGlow("A")}${getTopSpellFromField(state.playerA.field) && !attackingSlot ? " cursor-pointer hover:border-purple-400/80" : state.currentTurn === "A" && !attackingSlot ? " transition-colors hover:border-purple-400" : ""}`}
                    data-field-drop
                    data-field-player="A"
                    data-field-slot="spell"
                    onClick={e =>
                      handleFieldClick(e, "A", "spell", getTopSpellFromField(state.playerA.field))
                    }
                  >
                    {renderFlashOverlay("A-spell", "rounded-[8px]")}
                    {renderGonchungSpellStackFace("A", state.playerA.field)}
                    {renderFieldSpellDurationBadge(state.playerA.field, "A")}
                    {renderActionMenu("A", "spell", getTopSpellFromField(state.playerA.field))}
                    <div className={fieldSlotCombatPopupOverlayClass}>{renderCombatPopups("A-spell")}</div>
                  </div>
                </div>
              </div>
              <div className={`flex justify-between gap-4 w-full items-stretch ${desktopFieldBlockOrderClass("A", "units")}`}>
                 <div className="relative flex shrink-0 flex-col items-stretch self-stretch">
                   <div className={`relative flex min-h-0 flex-1 flex-col items-stretch gap-0.5 ${fieldUnitWidthClass}${fieldSlotColumnReverseClass("A")}`}>
                   <div className="flex min-h-0 flex-1 flex-col items-center justify-end overflow-visible">
                   <div className={unitSlotOuterClass}>
                     {renderMaengsugyeonPoFacingEnemyRect("A", "is", state.playerA.field.is)}
                    <div className={getSlotClassName("A", "is", state.playerA.field.is)} data-field-drop data-field-player="A" data-field-slot="is" onClick={(e) => handleFieldClick(e, "A", "is", state.playerA.field.is)}>
                    {state.playerA.field.is ? (
                      state.playerA.field.is.image_url ? <GuardedImg src={state.playerA.field.is.image_url} alt="Is" className={`w-full h-full object-cover transition-transform duration-300 ${opponentCardRotateClass("A")}`} /> : <span className={`text-xs font-bold text-center leading-tight p-2 text-sky-200 transition-transform duration-300 ${opponentCardRotateClass("A")}`}>{state.playerA.field.is.name}</span>
                    ) : <span className="absolute -bottom-6 text-xs text-slate-400 font-bold whitespace-nowrap">Is</span>}
                    {renderActionMenu("A", "is", state.playerA.field.is)}
                    </div>
                     {renderAebeolaekingRiderOverlay("A", "is", state.playerA.field.is)}
                     {renderFlashOverlay("A-is", "rounded-[8px]")}
                     {renderGeunyangMojaHitFlameOverlay("A-is", "rounded-[8px]")}
                     {renderDiagoHitFlameOverlay("A-is", "rounded-[8px]")}
                     {renderMomoHitFlameOverlay("A-is", "rounded-[8px]")}
                     {renderGhostoneClawHitOverlay("A-is", "rounded-[8px]")}
                     {renderIversonClawHitOverlay("A-is", "rounded-[8px]")}
                     {renderEristinaHitLineOverlay("A-is", "rounded-[8px]")}
                     {renderCheolgibyeongFieldRing("A", "is", state.playerA.field.is)}
                     {renderRyeomchoFieldRing("A", "is", state.playerA.field.is)}
                     {renderMaryDefenseFieldRing("A", "is", state.playerA.field.is)}
                     {renderBanjitgoriFieldRing("A", "is", state.playerA.field.is)}
                     {renderPhilipFacingRing("A", "is", state.playerA.field.is)}
                     {renderDinnerFacingRing("A", "is", state.playerA.field.is)}
                     {renderMaengsugyeonPoThreatRing("A", "is", state.playerA.field.is)}
                     {renderStartingHeraldPrivilegeTargetOutline("A", "is", state.playerA.field.is)}
                     {renderEondeokSilenceOutline(state.playerA.field.is, "rounded-[8px]")}
                     {renderStackingGaugeFieldRings("A", "is", state.playerA.field.is)}
                     {renderStunSwirlOverlay(state.playerA.field.is, "rounded-[8px]", "A-is")}
                     {renderLegendarySwordChargeAura("A", "is", state.playerA.field.is, "rounded-[8px]")}
                     {renderIversonWaitAuraOverlay(state.playerA.field.is, "rounded-[8px]", "A-is")}
                     {renderBaekseuInvulnRing(state.playerA.field.is, "rounded-[8px]", "A", "is")}
                   </div>
                   </div>
                   {renderHpRowWithOptionalDKGauge(
                     state.playerA.field.is,
                     renderHpBar(state.playerA.field.is, fieldSlotIsPlayerA("A"), "inline", "is") ?? fieldSlotHpPlaceholder,
                     fieldSlotIsPlayerA("A"),
                     "A-is"
                   )}
                   <div className={fieldSlotBadgeZoneClassWithCard(state.playerA.field.is, fieldSlotIsPlayerA("A"))}>{renderStatusBadges("A", "is", state.playerA.field.is, fieldSlotIsPlayerA("A"))}</div>
                   <div className={fieldSlotCombatPopupOverlayClass}>{renderCombatPopups("A-is")}</div>
                   </div>
                 </div>
                 <div className="relative flex shrink-0 flex-col items-stretch self-stretch">
                   <div className={`relative flex min-h-0 flex-1 flex-col items-stretch gap-0.5 ${fieldUnitWidthClass}${fieldSlotColumnReverseClass("A")}`}>
                   <div className="flex min-h-0 flex-1 flex-col items-center justify-end overflow-visible">
                   <div className={unitSlotOuterClass}>
                     {renderMaengsugyeonPoFacingEnemyRect("A", "m", state.playerA.field.m)}
                    <div className={getSlotClassName("A", "m", state.playerA.field.m)} data-field-drop data-field-player="A" data-field-slot="m" onClick={(e) => handleFieldClick(e, "A", "m", state.playerA.field.m)}>
                    {state.playerA.field.m ? (
                      state.playerA.field.m.image_url ? <GuardedImg src={state.playerA.field.m.image_url} alt="M" className={`w-full h-full object-cover transition-transform duration-300 ${opponentCardRotateClass("A")}`} /> : <span className={`text-xs font-bold text-center leading-tight p-2 text-sky-200 transition-transform duration-300 ${opponentCardRotateClass("A")}`}>{state.playerA.field.m.name}</span>
                    ) : <span className="absolute -bottom-6 text-xs text-slate-400 font-bold whitespace-nowrap">M</span>}
                    {renderActionMenu("A", "m", state.playerA.field.m)}
                    </div>
                     {renderAebeolaekingRiderOverlay("A", "m", state.playerA.field.m)}
                     {renderFlashOverlay("A-m", "rounded-[8px]")}
                     {renderGeunyangMojaHitFlameOverlay("A-m", "rounded-[8px]")}
                     {renderDiagoHitFlameOverlay("A-m", "rounded-[8px]")}
                     {renderMomoHitFlameOverlay("A-m", "rounded-[8px]")}
                     {renderGhostoneClawHitOverlay("A-m", "rounded-[8px]")}
                     {renderIversonClawHitOverlay("A-m", "rounded-[8px]")}
                     {renderEristinaHitLineOverlay("A-m", "rounded-[8px]")}
                     {renderCheolgibyeongFieldRing("A", "m", state.playerA.field.m)}
                     {renderRyeomchoFieldRing("A", "m", state.playerA.field.m)}
                     {renderMaryDefenseFieldRing("A", "m", state.playerA.field.m)}
                     {renderBanjitgoriFieldRing("A", "m", state.playerA.field.m)}
                     {renderPhilipFacingRing("A", "m", state.playerA.field.m)}
                     {renderDinnerFacingRing("A", "m", state.playerA.field.m)}
                     {renderMaengsugyeonPoThreatRing("A", "m", state.playerA.field.m)}
                     {renderStartingHeraldPrivilegeTargetOutline("A", "m", state.playerA.field.m)}
                     {renderEondeokSilenceOutline(state.playerA.field.m, "rounded-[8px]")}
                     {renderStackingGaugeFieldRings("A", "m", state.playerA.field.m)}
                     {renderStunSwirlOverlay(state.playerA.field.m, "rounded-[8px]", "A-m")}
                     {renderLegendarySwordChargeAura("A", "m", state.playerA.field.m, "rounded-[8px]")}
                     {renderIversonWaitAuraOverlay(state.playerA.field.m, "rounded-[8px]", "A-m")}
                     {renderBaekseuInvulnRing(state.playerA.field.m, "rounded-[8px]", "A", "m")}
                   </div>
                   </div>
                   {renderHpRowWithOptionalDKGauge(
                     state.playerA.field.m,
                     renderHpBar(state.playerA.field.m, fieldSlotIsPlayerA("A"), "inline", "m") ?? fieldSlotHpPlaceholder,
                     fieldSlotIsPlayerA("A"),
                     "A-m"
                   )}
                   <div className={fieldSlotBadgeZoneClassWithCard(state.playerA.field.m, fieldSlotIsPlayerA("A"))}>{renderStatusBadges("A", "m", state.playerA.field.m, fieldSlotIsPlayerA("A"))}</div>
                   <div className={fieldSlotCombatPopupOverlayClass}>{renderCombatPopups("A-m")}</div>
                   </div>
                 </div>
                 <div className="relative flex shrink-0 flex-col items-stretch self-stretch">
                   <div className={`relative flex min-h-0 flex-1 flex-col items-stretch gap-0.5 ${fieldUnitWidthClass}${fieldSlotColumnReverseClass("A")}`}>
                   <div className="flex min-h-0 flex-1 flex-col items-center justify-end overflow-visible">
                   <div className={unitSlotOuterClass}>
                     {renderMaengsugyeonPoFacingEnemyRect("A", "os", state.playerA.field.os)}
                    <div className={getSlotClassName("A", "os", state.playerA.field.os)} data-field-drop data-field-player="A" data-field-slot="os" onClick={(e) => handleFieldClick(e, "A", "os", state.playerA.field.os)}>
                    {state.playerA.field.os ? (
                      state.playerA.field.os.image_url ? <GuardedImg src={state.playerA.field.os.image_url} alt="Os" className={`w-full h-full object-cover transition-transform duration-300 ${opponentCardRotateClass("A")}`} /> : <span className={`text-xs font-bold text-center leading-tight p-2 text-sky-200 transition-transform duration-300 ${opponentCardRotateClass("A")}`}>{state.playerA.field.os.name}</span>
                    ) : <span className="absolute -bottom-6 text-xs text-slate-400 font-bold whitespace-nowrap">Os</span>}
                    {renderActionMenu("A", "os", state.playerA.field.os)}
                    </div>
                     {renderAebeolaekingRiderOverlay("A", "os", state.playerA.field.os)}
                     {renderFlashOverlay("A-os", "rounded-[8px]")}
                     {renderGeunyangMojaHitFlameOverlay("A-os", "rounded-[8px]")}
                     {renderDiagoHitFlameOverlay("A-os", "rounded-[8px]")}
                     {renderMomoHitFlameOverlay("A-os", "rounded-[8px]")}
                     {renderGhostoneClawHitOverlay("A-os", "rounded-[8px]")}
                     {renderIversonClawHitOverlay("A-os", "rounded-[8px]")}
                     {renderEristinaHitLineOverlay("A-os", "rounded-[8px]")}
                     {renderCheolgibyeongFieldRing("A", "os", state.playerA.field.os)}
                     {renderRyeomchoFieldRing("A", "os", state.playerA.field.os)}
                     {renderMaryDefenseFieldRing("A", "os", state.playerA.field.os)}
                     {renderBanjitgoriFieldRing("A", "os", state.playerA.field.os)}
                     {renderPhilipFacingRing("A", "os", state.playerA.field.os)}
                     {renderDinnerFacingRing("A", "os", state.playerA.field.os)}
                     {renderMaengsugyeonPoThreatRing("A", "os", state.playerA.field.os)}
                     {renderStartingHeraldPrivilegeTargetOutline("A", "os", state.playerA.field.os)}
                     {renderEondeokSilenceOutline(state.playerA.field.os, "rounded-[8px]")}
                     {renderStackingGaugeFieldRings("A", "os", state.playerA.field.os)}
                     {renderStunSwirlOverlay(state.playerA.field.os, "rounded-[8px]", "A-os")}
                     {renderLegendarySwordChargeAura("A", "os", state.playerA.field.os, "rounded-[8px]")}
                     {renderIversonWaitAuraOverlay(state.playerA.field.os, "rounded-[8px]", "A-os")}
                     {renderBaekseuInvulnRing(state.playerA.field.os, "rounded-[8px]", "A", "os")}
                   </div>
                   </div>
                   {renderHpRowWithOptionalDKGauge(
                     state.playerA.field.os,
                     renderHpBar(state.playerA.field.os, fieldSlotIsPlayerA("A"), "inline", "os") ?? fieldSlotHpPlaceholder,
                     fieldSlotIsPlayerA("A"),
                     "A-os"
                   )}
                   <div className={fieldSlotBadgeZoneClassWithCard(state.playerA.field.os, fieldSlotIsPlayerA("A"))}>{renderStatusBadges("A", "os", state.playerA.field.os, fieldSlotIsPlayerA("A"))}</div>
                   <div className={fieldSlotCombatPopupOverlayClass}>{renderCombatPopups("A-os")}</div>
                   </div>
                 </div>
              </div>
            </div>

          </div>
        </div>

        {/* ===================== 3. 우측 영역 (패, 토큰, 타이머, 종료 버튼) ===================== */}
        <div className={`flex-1 flex flex-col justify-between h-full py-2 pl-4 lg:pl-10 transition-opacity ${isInitializing ? 'opacity-50 pointer-events-none' : 'opacity-100'} ${multiplayFlipBoard ? 'flex-col-reverse' : ''}`}>
          
          {/* 우측 상단: 상대(Player B) 패 */}
          <div className={`border-2 rounded-2xl p-4 flex items-center justify-center gap-3 h-[200px] lg:h-[250px] ${state.currentTurn === 'B' ? 'border-rose-500/60 bg-rose-950/30 shadow-[inset_0_0_30px_rgba(244,63,94,0.15)]' : 'border-slate-700/50 bg-black/20'}`}>
            <div className="w-full flex justify-center gap-2 lg:gap-4 px-2">
            {Array.from({ length: 6 }).map((_, i) => {
                const card = state.playerB.hand[i];
                const momoDiscardHandB =
                  pendingSkill?.name === PENDING_SKILL.MOMO_EAT &&
                  pendingSkill.player === "B" &&
                  state.currentTurn === "B" &&
                  !!card;
                const danhaStealFromHandB =
                  pendingSkill?.name === PENDING_SKILL.DANHA_GALGORI &&
                  pendingSkill.player === "A" &&
                  state.currentTurn === "A" &&
                  !!card;
                const simpanPickHandB = state.simpanHandChoice?.player === "B" && !!card;
                const simpanPeekBlockDragB = state.simpanPeekReveal?.player === "B";
                const witchTarotDiscardHandB = witchTarotDiscardPlayer === "B" && !!card;
                const canPointerDragB =
                  !!card &&
                  canMultiplayHandDragPlayer("B") &&
                  !pendingSkill &&
                  !simpanPickHandB &&
                  !simpanPeekBlockDragB &&
                  !witchTarotDiscardHandB &&
                  !witchTarotFlowActive &&
                  (state.currentTurn === "B" ||
                    canMuhyohwaCounterFromHandSlot(state, "B", i, card));
                const muhyohwaHandGlowB =
                  spellUsageMuhyohwaCounterGlow &&
                  !!card &&
                  canMuhyohwaCounterFromHandSlot(state, "B", i, card);
                const isDragSourceB = handDrag?.player === "B" && handDrag.cardIndex === i;
                const isDanhaStealFlySourceB =
                  danhaStealFly?.victimPlayer === "B" && danhaStealFly.victimHandIndex === i;
                
                return (
                  <div key={i} ref={el => { handSlotOuterRefsB.current[i] = el; }} className={handSlotOuterStyle}>
                  <div 
                    onClick={(e) => {
                      if (simpanPickHandB) {
                        e.stopPropagation();
                        resolveSimpanHandPick("B", i);
                      } else if (witchTarotDiscardHandB) {
                        e.stopPropagation();
                        resolveWitchTarotDiscard("B", i);
                      } else if (momoDiscardHandB) {
                        e.stopPropagation();
                        handleSkillDiscard(i, "B");
                      } else if (danhaStealFromHandB) {
                        e.stopPropagation();
                        handleDanhaSteal(i, "B");
                      }
                    }}
                    className={`${handCardStyle} group touch-manipulation ${card ? (momoDiscardHandB ? 'border-[3px] border-amber-400 bg-amber-900/40 shadow-[0_0_25px_rgba(251,191,36,0.8)] animate-pulse cursor-pointer' : danhaStealFromHandB ? 'border-[3px] border-sky-400 bg-sky-900/35 shadow-[0_0_25px_rgba(56,189,248,0.85)] animate-pulse cursor-pointer' : witchTarotDiscardHandB ? 'border-[3px] border-violet-300 bg-violet-950/50 shadow-[0_0_25px_rgba(167,139,250,0.85)] animate-pulse cursor-pointer' : simpanPickHandB ? simpanHandReplaceSelectableClass : `border-rose-400/40 bg-rose-950/60 ${canPointerDragB ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"} hover:-translate-y-4 hover:shadow-[0_0_20px_rgba(244,63,94,0.6)] transition-transform duration-300`) : 'border-dashed border-slate-700/50 bg-transparent'} ${isDragSourceB || isDanhaStealFlySourceB ? "opacity-0 scale-[0.98] pointer-events-none" : ""} ${isMultiplayOpponent("B") && !danhaStealFromHandB ? "pointer-events-none" : ""} ${canPointerDragB ? "select-none" : ""}`}
                    onPointerDown={card && canPointerDragB ? (e) => beginHandDrag(e, i, "B", card) : undefined}
                    onPointerMove={handDrag ? updateHandDrag : undefined}
                    onPointerUp={handDrag ? finishHandDrag : undefined}
                    onPointerCancel={handDrag ? cancelHandDrag : undefined}
                    onLostPointerCapture={card && canPointerDragB ? (e) => {
                      if (activeHandDragRef.current?.pointerId !== e.pointerId) return;
                      activeHandDragRef.current = null;
                      setHandDrag(null);
                      setHandDragHoverSlotKey(null);
                    } : undefined}
                  >
                    {card && hasBubbleStationHandDiscardFlashMark(card) ? (
                      <div className="absolute inset-0 z-[6] rounded-[8px] pp-bubble-station-hand-wipe pointer-events-none" aria-hidden />
                    ) : card && ppSimHandDanhaStealArrivalToken(card) ? (
                      <div className={handDanhaStealArrivalGlowOverlayClass} aria-hidden />
                    ) : muhyohwaHandGlowB ? (
                      <div className={handMuhyohwaCounterGlowOverlayClass} aria-hidden />
                    ) : card && ppSimHandNewGlowToken(card) ? (
                      <div className={handNewDrawGlowOverlayClass} aria-hidden />
                    ) : null}
                     {card ? (
                       <div className={handCardFaceClipClass}>
                         {isMultiplayOpponent("B") ? (
                           <MultiplayCardBackFace />
                         ) : card.image_url ? (
                           <GuardedImg src={card.image_url} alt={card.name} className={`w-full h-full object-cover group-hover:opacity-100 transition-all duration-300 animate-[fadeIn_0.3s_ease-out] ${opponentCardRotateClass("B")}`} />
                         ) : (
                           <span className={`text-[10px] lg:text-[11px] font-bold text-center leading-tight p-2 text-rose-200 transition-transform duration-300 ${opponentCardRotateClass("B")}`}>{card.name}</span>
                         )}
                         
                        <div className={`absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10 backdrop-blur-[2px] ${pendingSkill || simpanPickHandB ? "hidden" : ""}`}>
                          <button onClick={(e) => { e.stopPropagation(); openHandCardCodexDetail(card); }} className="px-3 py-1.5 bg-slate-900/90 hover:bg-rose-600 text-white text-[10px] lg:text-xs font-bold rounded-lg border border-white/20 shadow-lg transition-colors">
                            상세 보기
                          </button>
                        </div>
                      </div>
                    ) : (
                      <IconDeck className="w-8 h-8 text-rose-300 opacity-20" />
                    )}
                  </div>
                    {renderFlashOverlay(`hand-B-${i}`, "rounded-[8px]")}
                  </div>
                )
              })}
            </div>
          </div>

          {/* 우측 중단: 종합 컨트롤 패널 */}
          <div className="flex flex-row items-stretch justify-between gap-4 h-[150px] lg:h-[170px] max-w-[800px] mx-auto w-full my-auto px-4">
            
            <div className={`flex flex-col justify-between gap-3 flex-1 ${multiplayFlipBoard ? 'flex-col-reverse' : ''}`}>
              <div 
                className={`relative flex flex-col overflow-visible border-2 rounded-xl py-3 h-full justify-center transition-colors 
                  ${canAttackPlayerB ? 'border-[3px] border-white bg-white/20 shadow-[0_0_25px_rgba(255,255,255,0.9)] animate-pulse cursor-crosshair' : 
                    state.currentTurn === 'B' ? 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.15)] bg-black/30' : 'border-slate-700 bg-black/30'}`}
                onClick={(e) => {
                  if (canAttackPlayerB) {
                    e.stopPropagation();
                    handlePlayerAttack("B");
                  }
                }}
              >
                {renderFlashOverlay("player-B", "rounded-xl")}
                <div className="flex justify-between items-center mb-1 px-4 pointer-events-none">
                  <span className="text-sm font-bold text-slate-400">Player B</span>
                  <span className="text-rose-500 font-black text-base transition-all">{state.playerB.hp}</span>
                </div>
                
                <div className="px-4 mb-2 pointer-events-none">
                  <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-700 shadow-inner">
                    <div className="h-full bg-gradient-to-r from-red-600 to-rose-400 transition-all duration-500" style={{ width: `${Math.max(0, Math.min(100, (state.playerB.hp / 2000) * 100))}%` }} />
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-1.5 px-4 pointer-events-none">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className={`h-3.5 rounded-[3px] border transition-all duration-300 ${i < state.playerB.tokens ? 'bg-orange-500 border-orange-300' : 'bg-slate-800 border-slate-700'}`} />
                  ))}
                </div>
                <div className="pointer-events-none absolute inset-0 z-[80] overflow-visible rounded-xl">
                  {renderCombatPopups("player-B")}
                </div>
              </div>
              
              <div 
                className={`relative flex flex-col overflow-visible border-2 rounded-xl py-3 h-full justify-center transition-colors 
                  ${canAttackPlayerA ? 'border-[3px] border-white bg-white/20 shadow-[0_0_25px_rgba(255,255,255,0.9)] animate-pulse cursor-crosshair' : 
                    state.currentTurn === 'A' ? 'border-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.15)] bg-black/30' : 'border-slate-700 bg-black/30'}`}
                onClick={(e) => {
                  if (canAttackPlayerA) {
                    e.stopPropagation();
                    handlePlayerAttack("A");
                  }
                }}
              >
                {renderFlashOverlay("player-A", "rounded-xl")}
                <div className="flex justify-between items-center mb-1 px-4 pointer-events-none">
                  <span className="text-sm font-bold text-slate-400">Player A</span>
                  <span className="text-sky-500 font-black text-base transition-all">{state.playerA.hp}</span>
                </div>

                <div className="px-4 mb-2 pointer-events-none">
                  <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-700 shadow-inner">
                    <div className="h-full bg-gradient-to-r from-sky-600 to-blue-400 transition-all duration-500" style={{ width: `${Math.max(0, Math.min(100, (state.playerA.hp / 2000) * 100))}%` }} />
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-1.5 px-4 pointer-events-none">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className={`h-3.5 rounded-[3px] border transition-all duration-300 ${i < state.playerA.tokens ? 'bg-orange-500 border-orange-300 shadow-[0_0_6px_rgba(249,115,22,0.6)]' : 'bg-slate-800 border-slate-700'}`} />
                  ))}
                </div>
                <div className="pointer-events-none absolute inset-0 z-[80] overflow-visible rounded-xl">
                  {renderCombatPopups("player-A")}
                </div>
              </div>
            </div>

            <div className="border-2 border-slate-700 bg-black/60 rounded-xl p-4 flex flex-col items-center justify-center w-[150px] shrink-0 shadow-inner">
              <span className="text-xs text-slate-400 font-black tracking-widest mb-2">TURN {state.turnCount}</span>
              <span className={`text-2xl font-black text-center leading-tight whitespace-pre-line ${desktopTurnColorClass} ${!isInitializing && 'animate-pulse'}`}>{desktopTurnLabel}</span>
              
              <span className="text-base font-mono text-slate-300 tracking-widest mt-3 bg-slate-900 px-3 py-1 rounded-md border border-slate-700">
                {formatTime(state.elapsedTime || 0)}
              </span>
            </div>

            <div className={`flex flex-col justify-between gap-3 w-[130px] shrink-0 h-full ${multiplayFlipBoard ? 'flex-col-reverse' : ''}`}>
              {!multiplayMyRole ? (
                <div className="flex flex-col gap-1.5 items-center flex-1 w-full">
                  {state.settings.isTimeLimitEnabled ? (
                    <span className={`text-[11px] lg:text-xs font-mono font-black tracking-widest ${state.currentTurn === oppEndTurnPlayer && state.turnTimeLeft <= 15 ? 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse scale-110 transition-all' : oppEndTurnPlayer === 'B' ? 'text-rose-300' : 'text-sky-300'}`}>
                      {state.currentTurn === oppEndTurnPlayer ? `00:${state.turnTimeLeft.toString().padStart(2, '0')}` : '00:60'}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-600 font-bold tracking-widest">무제한</span>
                  )}
                  <button onClick={() => handleEndTurn(oppEndTurnPlayer)} disabled={state.currentTurn !== oppEndTurnPlayer || isInitializing} className={`w-full h-full rounded-xl font-black text-sm border-2 transition-all ${state.currentTurn === oppEndTurnPlayer && !isInitializing ? 'bg-orange-600 text-white border-orange-400 hover:bg-orange-500 shadow-[0_0_15px_rgba(234,88,12,0.4)]' : 'bg-slate-800 text-slate-500 border-slate-700 opacity-50'}`}>상대 턴<br/>종료</button>
                </div>
              ) : null}

              <div className="flex flex-col gap-1.5 items-center flex-1 w-full">
                <button onClick={() => handleEndTurn(myEndTurnPlayer)} disabled={state.currentTurn !== myEndTurnPlayer || isInitializing} className={`w-full h-full rounded-xl font-black text-sm border-2 transition-all ${state.currentTurn === myEndTurnPlayer && !isInitializing ? 'bg-orange-600 text-white border-orange-400 hover:bg-orange-500 shadow-[0_0_15px_rgba(234,88,12,0.4)]' : 'bg-slate-800 text-slate-500 border-slate-700 opacity-50'}`}>내 턴<br/>종료</button>
                {state.settings.isTimeLimitEnabled ? (
                  <span className={`text-[11px] lg:text-xs font-mono font-black tracking-widest ${state.currentTurn === myEndTurnPlayer && state.turnTimeLeft <= 15 ? 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse scale-110 transition-all' : myEndTurnPlayer === 'A' ? 'text-sky-300' : 'text-rose-300'}`}>
                    {state.currentTurn === myEndTurnPlayer ? `00:${state.turnTimeLeft.toString().padStart(2, '0')}` : '00:60'}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-600 font-bold tracking-widest">무제한</span>
                )}
              </div>
            </div>

          </div>

          {/* 우측 하단: 내(Player A) 패 */}
          <div className={`border-2 rounded-2xl p-4 flex items-center justify-center gap-3 h-[200px] lg:h-[250px] ${state.currentTurn === 'A' ? 'border-sky-500/60 bg-sky-950/30 shadow-[inset_0_0_30px_rgba(14,165,233,0.15)]' : 'border-slate-700/50 bg-black/20'}`}>
            <div className="w-full flex justify-center gap-2 lg:gap-4 px-2">
              {Array.from({ length: 6 }).map((_, i) => {
                const card = state.playerA.hand[i];
                const momoDiscardHandA =
                  pendingSkill?.name === PENDING_SKILL.MOMO_EAT &&
                  pendingSkill.player === "A" &&
                  state.currentTurn === "A" &&
                  !!card;
                const danhaStealFromHandA =
                  pendingSkill?.name === PENDING_SKILL.DANHA_GALGORI &&
                  pendingSkill.player === "B" &&
                  state.currentTurn === "B" &&
                  !!card;
                const simpanPickHandA = state.simpanHandChoice?.player === "A" && !!card;
                const simpanPeekBlockDragA = state.simpanPeekReveal?.player === "A";
                const witchTarotDiscardHandA = witchTarotDiscardPlayer === "A" && !!card;
                const canPointerDragA =
                  !!card &&
                  canMultiplayHandDragPlayer("A") &&
                  !pendingSkill &&
                  !simpanPickHandA &&
                  !simpanPeekBlockDragA &&
                  !witchTarotDiscardHandA &&
                  !witchTarotFlowActive &&
                  (state.currentTurn === "A" ||
                    canMuhyohwaCounterFromHandSlot(state, "A", i, card));
                const muhyohwaHandGlowA =
                  spellUsageMuhyohwaCounterGlow &&
                  !!card &&
                  canMuhyohwaCounterFromHandSlot(state, "A", i, card);
                const isDragSourceA = handDrag?.player === "A" && handDrag.cardIndex === i;
                const isDanhaStealFlySourceA =
                  danhaStealFly?.victimPlayer === "A" && danhaStealFly.victimHandIndex === i;

                return (
                  <div key={i} ref={el => { handSlotOuterRefsA.current[i] = el; }} className={handSlotOuterStyle}>
                  <div 
                    onClick={(e) => {
                      if (simpanPickHandA) {
                        e.stopPropagation();
                        resolveSimpanHandPick("A", i);
                      } else if (witchTarotDiscardHandA) {
                        e.stopPropagation();
                        resolveWitchTarotDiscard("A", i);
                      } else if (momoDiscardHandA) {
                        e.stopPropagation();
                        handleSkillDiscard(i, "A");
                      } else if (danhaStealFromHandA) {
                        e.stopPropagation();
                        handleDanhaSteal(i, "A");
                      }
                    }}
                    className={`${handCardStyle} group touch-manipulation ${card ? (momoDiscardHandA ? 'border-[3px] border-amber-400 bg-amber-900/40 shadow-[0_0_25px_rgba(251,191,36,0.8)] animate-pulse cursor-pointer' : danhaStealFromHandA ? 'border-[3px] border-sky-400 bg-sky-900/35 shadow-[0_0_25px_rgba(56,189,248,0.85)] animate-pulse cursor-pointer' : witchTarotDiscardHandA ? 'border-[3px] border-violet-300 bg-violet-950/50 shadow-[0_0_25px_rgba(167,139,250,0.85)] animate-pulse cursor-pointer' : simpanPickHandA ? simpanHandReplaceSelectableClass : `border-sky-400/50 ${canPointerDragA ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"} hover:-translate-y-4 hover:shadow-[0_0_20px_rgba(56,189,248,0.6)] transition-transform duration-300`) : 'border-dashed border-slate-700/50 bg-transparent'} ${isDragSourceA || isDanhaStealFlySourceA ? "opacity-0 scale-[0.98] pointer-events-none" : ""} ${isMultiplayOpponent("A") && !danhaStealFromHandA ? "pointer-events-none" : ""} ${canPointerDragA ? "select-none" : ""}`}
                    onPointerDown={card && canPointerDragA ? (e) => beginHandDrag(e, i, "A", card) : undefined}
                    onPointerMove={handDrag ? updateHandDrag : undefined}
                    onPointerUp={handDrag ? finishHandDrag : undefined}
                    onPointerCancel={handDrag ? cancelHandDrag : undefined}
                    onLostPointerCapture={card && canPointerDragA ? (e) => {
                      if (activeHandDragRef.current?.pointerId !== e.pointerId) return;
                      activeHandDragRef.current = null;
                      setHandDrag(null);
                      setHandDragHoverSlotKey(null);
                    } : undefined}
                  >
                    {card && hasBubbleStationHandDiscardFlashMark(card) ? (
                      <div className="absolute inset-0 z-[6] rounded-[8px] pp-bubble-station-hand-wipe pointer-events-none" aria-hidden />
                    ) : card && ppSimHandDanhaStealArrivalToken(card) ? (
                      <div className={handDanhaStealArrivalGlowOverlayClass} aria-hidden />
                    ) : muhyohwaHandGlowA ? (
                      <div className={handMuhyohwaCounterGlowOverlayClass} aria-hidden />
                    ) : card && ppSimHandNewGlowToken(card) ? (
                      <div className={handNewDrawGlowOverlayClass} aria-hidden />
                    ) : null}
                     {card ? (
                       <div className={handCardFaceClipClass}>
                         {isMultiplayOpponent("A") ? (
                           <MultiplayCardBackFace />
                         ) : card.image_url ? (
                           <GuardedImg src={card.image_url} alt={card.name} className={`w-full h-full object-cover group-hover:opacity-100 transition-all duration-300 animate-[fadeIn_0.3s_ease-out] ${opponentCardRotateClass("A")}`} />
                         ) : (
                           <span className={`text-[10px] lg:text-[11px] font-bold text-center leading-tight p-2 text-sky-200 transition-transform duration-300 ${opponentCardRotateClass("A")}`}>{card.name}</span>
                         )}
                         
                         <div className={`absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10 backdrop-blur-[2px] ${pendingSkill || simpanPickHandA ? "hidden" : ""}`}>
                           <button onClick={(e) => { e.stopPropagation(); openHandCardCodexDetail(card); }} className="px-3 py-1.5 bg-slate-900/90 hover:bg-sky-600 text-white text-[10px] lg:text-xs font-bold rounded-lg border border-white/20 shadow-lg transition-colors">
                             상세 보기
                           </button>
                         </div>
                       </div>
                     ) : (
                       <IconDeck className="w-8 h-8 text-sky-300 opacity-20" />
                     )}
                  </div>
                    {renderFlashOverlay(`hand-A-${i}`, "rounded-[8px]")}
                  </div>
                )
              })}
            </div>
          </div>
          
        </div>

      </div>
      )}

    </div>
  );
}