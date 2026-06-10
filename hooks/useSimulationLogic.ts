// hooks/useSimulationLogic.ts
import { useState, useEffect, useRef, useMemo, type Dispatch, type SetStateAction, type MutableRefObject } from "react";
import { CardRow, FieldCard } from "../types/game";
import {
  applyPostAttackSkills,
  getActiveStatuses,
  parseAttack,
  validateAttack,
  isSilenced,
  isStunned,
  isTaunting,
} from "../utils/cardskills";
import {
  applyAttackerOutgoingBuffDamageModsUnlessCallieBanned,
  resolveFieldUnitSimulationBaseAtkRaw,
  bumpMaxellandTenacityGaugeOnEnemyKill,
  applyIncomingDefenseDamage,
  PAKKI_ID,
  scalePakkiOutgoingHit,
  shouldApplyPakkiKillDebuffOnDeath,
  stripPakkiDebuffUnderImmunityOnClonedFields,
  BATTLE_MSG,
  DARK_KNIGHT_ID,
  getMorningMoodDeathAllyHeal,
  getStartingTreeAllyHealOnDamaged,
  MAXELLAND_ID,
  fieldGrantsFocusedFireMultihitExemption,
  isRyeomcho,
  isRyeomchoSelfHealBasicAttackSealed,
  isRanigo,
  isRanigoAllyHealBasicAttackSealed,
  RANIGO_ALLY_BASIC_HEAL_AMOUNT,
  elixir5StunTargetPatch,
  applyEndTurnStunTickToFieldUnit,
  applyEndTurnIversonWaitTickToFieldUnit,
  applyEndTurnToSpellStack,
  normalizeSpellStack,
  appendSpellToStack,
  IVERSON_ID,
  IVERSON_SUMMON_WAIT_END_TURNS,
  IVERSON_NEAREST_ENEMY_MSG,
  getIversonClosestEnemyTargetSlots,
  shouldEnforceIversonNearestEnemyTargeting,
  MOMO_SKILL_HEAL_AMOUNT,
  PENDING_SKILL,
  UNIT,
  BANG_EOMAK_SPELL_ID,
  BANG_EOMAK_DEFENSE_INITIAL_END_TURN_TICKS,
  CHEOLBYEOK_SPELL_ID,
  CHEOLBYEOK_ALLY_INVULN_INITIAL_END_TURN_TICKS,
  HYUGESOJAUI_ANSIK_SPELL_ID,
  HYUGESOJAUI_ANSIK_HEAL_PER_TRIGGER,
  HYUGESOJAUI_ANSIK_INITIAL_END_TURN_TICKS,
  BUSINESS_GANG_SPELL_ID,
  BUSINESS_GANG_INITIAL_END_TURN_TICKS,
  getTurnStartTokenGainForPlayer,
  applyHyugesojauiAnsikHealAttempt,
  applyHyugesojauiAnsikTurnStartForOwner,
  isInvulnerableFromBaekseuOrCheolbyeok,
  callieBuffBanSuppressesBuffsForVictim,
  getKalliVsDefenseTypePureBonus,
  kalliBasicAttackSkipsTargetMitigationVsDefenseType,
  startingHeraldBasicAttackIgnoresTauntTargetingRestrictions,
  isStartingWraithTrueStrikeBasicAttacker,
  isStartingWraithBasicAttackChainKillEligible,
  isStartingWraithBasicAttackChainFollowUpPending,
  startingWraithChainFollowUpBypassesAntiGangup,
  isStartingWraithPassivesPausedByConfusion,
  countOtherLivingDefenderUnits,
  canEnemyFieldSourceTargetMaengsugyeonPo,
  getUnitFacingOppAtSlot,
  splitDamageThroughHpBarrier,
  hpBarrierPatchFromRemaining,
  applyEndTurnBaekseuInvulnTickToFieldUnit,
  applyEndTurnEondeokSilenceTickToFieldUnit,
  applyEndTurnSuppressionTickToFieldUnit,
  resolveBaekseuFatalDamage,
  isBaekseuPassivesPausedByConfusion,
  stripBaekseuHarmfulEffectsForInvuln,
  applyBaekseuInvulnThresholdExecutePass,
  cleanupSimulationUnitDeath,
  suppressActiveSkillLinksForConfusion,
  isHiddenSpellCard,
  GONCHUNG_JEONMOGA_ACTIVE,
  spellStackHasHiddenSpell,
  healUnitCurrentHp,
  applyFieldAllyHealToUnit,
  suppressionBlocksExternalBuffEffects,
  normalizeUnitHpSurvivalOnesForCombat,
} from "../utils/battle";

const ATTACK_DISABLED_UNITS: Set<string> = new Set(["모닝 무드", "시작의 나무", "전설의 검", "애벌레킹"]);
const isAttackDisabledUnit = (card: FieldCard | null | undefined): boolean =>
  !!card && ATTACK_DISABLED_UNITS.has(String(card.name ?? ""));

export interface PlayerState {
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

export interface SimulationState {
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
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export type SimulationLogicOptions = {
  skipAutoInit?: boolean;
  multiplay?: boolean;
};

export type ControlledSimulationBinding = {
  state: SimulationState | null;
  setState: Dispatch<SetStateAction<SimulationState | null>>;
  isInitializing: boolean;
  setIsInitializing: Dispatch<SetStateAction<boolean>>;
  /** 멀티플레이 — 게임 행동 후 Broadcast 동기화 예약 */
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
  /** 멀티플레이 — VFX 이벤트를 상대에게 전송 */
  onCombatVfx?: (slotKey: string, kind: string, clearMs: number) => void;
  onCombatPopup?: (slotKey: string, entries: unknown[]) => void;
  /** 멀티플레이 — 수신 중 여부 (수신 중엔 재전송 차단) */
  isReceivingVfx?: MutableRefObject<boolean>;
  /** 멀티플레이 — 수신된 VFX를 SimulationView에서 처리할 핸들러 ref */
  receiveVfxRef?: MutableRefObject<((slotKey: string, kind: string, clearMs: number) => void) | null>;
  receivePopupRef?: MutableRefObject<((slotKey: string, entries: unknown[]) => void) | null>;
  /** 멀티플레이 — 상대방이 최신 상태를 즉시 재전송 요청 */
  onRequestStateSync?: () => void;
  onUnitFocus?: (slotKey: string | null) => void;
  opponentFocusedSlot?: string | null;
};

export function useSimulationLogic(cards: CardRow[], options?: SimulationLogicOptions) {
  const isMultiplay = options?.multiplay === true;
  const skipAutoInit = options?.skipAutoInit === true || isMultiplay;
  const [state, setState] = useState<SimulationState | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
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
    allyHealOnly?: boolean;
  } | null>(null);

  const [pendingStartingWraithChainKill, setPendingStartingWraithChainKill] = useState<{
    attackerPlayer: "A" | "B";
    attackerSlotName: "is" | "m" | "os";
  } | null>(null);

  const [pendingStartingWraithChainPlayerHp, setPendingStartingWraithChainPlayerHp] = useState(false);

  const [pendingAttackSelection, setPendingAttackSelection] = useState<{
    player: "A" | "B";
    slot: "is" | "m" | "os";
    primary: string;
    secondary: string;
    position: { x: number; y: number }; 
  } | null>(null);
  
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
  /** UI가 pushInfoFloat 등으로 표시 — 로직 훅은 문구만 발행 */
  const [gonchungInfoFloat, setGonchungInfoFloat] = useState<{
    slotKey: string;
    text: string;
  } | null>(null);

  const [attackOptionOverride, setAttackOptionOverride] = useState<string | null>(null);
  const [winner, setWinner] = useState<"A" | "B" | null>(null);
  
  const initialized = useRef(false);

  const baekseuExecuteFieldsSig = useMemo(() => {
    if (!state) return "";
    const u = (c: FieldCard | null, facing: FieldCard | null) =>
      c
        ? `${c.currentHp};${Number(c.hp) || 0};${c.baekseuInvulnerableEndTurnTicksRemaining ?? 0};${c.baekseuLastStandUsed ? 1 : 0};${isBaekseuPassivesPausedByConfusion(c, facing) ? 1 : 0}`
        : "x";
    const pack = (f: PlayerState["field"], opp: PlayerState["field"]) =>
      [u(f.is, opp.is), u(f.m, opp.m), u(f.os, opp.os)].join("/");
    return `${pack(state.playerA.field, state.playerB.field)}|${pack(state.playerB.field, state.playerA.field)}`;
  }, [state?.playerA.field, state?.playerB.field]);

  useEffect(() => {
    if (isMultiplay) return;
    if (!state || winner || isInitializing) return;
    setState(prev => {
      if (!prev) return prev;
      const r = applyBaekseuInvulnThresholdExecutePass(prev.playerA, prev.playerB, prev.globalTurnCount);
      if (r.rewindAdds.length === 0) return prev;
      return {
        ...prev,
        playerA: r.playerA,
        playerB: r.playerB,
        rewindCards: [...prev.rewindCards, ...r.rewindAdds],
      };
    });
  }, [baekseuExecuteFieldsSig, winner, isInitializing]);

  useEffect(() => {
    if (!gonchungInfoFloat) return;
    const id = window.setTimeout(() => setGonchungInfoFloat(null), 2900);
    return () => window.clearTimeout(id);
  }, [gonchungInfoFloat]);

  useEffect(() => {
    return () => {
      if (gonchungHiddenRevealTimerRef.current != null) {
        window.clearTimeout(gonchungHiddenRevealTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!state || !pendingSkill || pendingSkill.name !== PENDING_SKILL.GONCHUNG_HIDDEN_PEEK) return;
    const { player, slot } = pendingSkill;
    const f = player === "A" ? state.playerA.field : state.playerB.field;
    const u = f[slot as "is" | "m" | "os"];
    if (!u || u.name !== UNIT.GONCHUNG_JEONMOGA) {
      setPendingSkill(null);
    }
  }, [state, pendingSkill]);

  const runInitialization = async (initialDeck: CardRow[]) => {
    if (!initialDeck || initialDeck.length === 0) return;

    setIsInitializing(true);
    setCoinTossDisplay(null);
    setSelectedSlot(null);
    setAttackingSlot(null);
    setPendingSecondaryAttack(null); 
    setPendingAttackSelection(null);
    setPendingSkill(null);
    setGonchungHiddenReveal(null);
    setGonchungInfoFloat(null);
    if (gonchungHiddenRevealTimerRef.current != null) {
      window.clearTimeout(gonchungHiddenRevealTimerRef.current);
      gonchungHiddenRevealTimerRef.current = null;
    }
    setAttackOptionOverride(null);
    setPendingStartingWraithChainKill(null);
    setPendingStartingWraithChainPlayerHp(false);
    setWinner(null); 
    
    let currentDeck = [...initialDeck].sort(() => Math.random() - 0.5);
    let pAHand: CardRow[] = [];
    let pBHand: CardRow[] = [];

    setState({
      currentTurn: null,
      turnCount: 1,
      globalTurnCount: 1, 
      elapsedTime: 0, 
      turnTimeLeft: 60,
      settings: { isTimeLimitEnabled: false, isOpponentCardFlipped: false, drawMode: "RANDOM" },
      deckCards: currentDeck,
      rewindCards: [],
      playerA: { hp: 2000, tokens: 0, hand: [], hasDrawnThisTurn: false, attacksThisTurn: 0, hasBeenAttackedThisTurn: false, field: { is: null, m: null, os: null, spellStack: [] } },
      playerB: { hp: 2000, tokens: 0, hand: [], hasDrawnThisTurn: false, attacksThisTurn: 0, hasBeenAttackedThisTurn: false, field: { is: null, m: null, os: null, spellStack: [] } },
    });

    await delay(800);

    for (let i = 0; i < 4; i++) {
      const cardA = currentDeck.pop()!;
      pAHand = [...pAHand, cardA];
      setState(prev => ({...prev!, deckCards: currentDeck, playerA: { ...prev!.playerA, hand: pAHand }}));
      await delay(300);

      const cardB = currentDeck.pop()!;
      pBHand = [...pBHand, cardB];
      setState(prev => ({...prev!, deckCards: currentDeck, playerB: { ...prev!.playerB, hand: pBHand }}));
      await delay(300);
    }

    await delay(500);

    for (let i = 1; i <= 4; i++) {
      setState(prev => ({
        ...prev!,
        playerA: { ...prev!.playerA, tokens: i },
        playerB: { ...prev!.playerB, tokens: i },
      }));
      await delay(250);
    }

    await delay(600);

    setCoinTossDisplay("FLIPPING");
    
    const flipInterval = setInterval(() => {
      setCoinFlipSide(prev => prev === "A" ? "B" : "A");
    }, 100);

    await delay(1500);
    clearInterval(flipInterval);

    const firstTurn: "A" | "B" = Math.random() < 0.5 ? "A" : "B";
    setCoinTossDisplay(firstTurn);

    await delay(2000);

    setState(prev => ({ ...prev!, currentTurn: firstTurn, turnTimeLeft: 60 }));
    setCoinTossDisplay(null);
    setIsInitializing(false);
  };

  const isGameActive = state?.currentTurn !== null && !winner && !isInitializing;
  
  useEffect(() => {
    if (isMultiplay) return;
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
    if (isMultiplay) return;
    if (state?.settings?.isTimeLimitEnabled && state.turnTimeLeft === 0 && state.currentTurn && !winner && !isInitializing) {
      if (state && state.currentTurn) {
        handleEndTurn(state.currentTurn);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.turnTimeLeft]); 

  useEffect(() => {
    if (skipAutoInit) return;
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
        
        setState(parsed); 
      } catch (e) { 
        localStorage.removeItem("pp_sim_save");
        runInitialization(cards); 
      }
    } else {
      runInitialization(cards);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, skipAutoInit]);

  useEffect(() => {
    if (isMultiplay) return;
    if (state && !isInitializing && state.currentTurn !== null && !winner) {
      localStorage.setItem("pp_sim_save", JSON.stringify(state));
    }
  }, [state, isInitializing, winner]);

  useEffect(() => {
    if (isMultiplay) return;
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
  }, [state, isMultiplay]);

  useEffect(() => {
    if (isMultiplay) return;
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

  const handleReset = (onCloseModals: () => void) => {
    if (winner || window.confirm("진행 중인 모든 시뮬레이션 기록을 삭제하고 초기화할까요?")) {
      localStorage.removeItem("pp_sim_save");
      onCloseModals(); 
      runInitialization(cards);
    }
  };

  const handleEndTurn = (player: "A" | "B", onCloseModals?: () => void) => {
    if (!state || state.currentTurn !== player || isInitializing || winner) return;
    setSelectedSlot(null);
    setAttackingSlot(null); 
    setPendingSecondaryAttack(null); 
    setPendingAttackSelection(null);
    setPendingSkill(null); 
    setAttackOptionOverride(null);
    setPendingStartingWraithChainKill(null);
    setPendingStartingWraithChainPlayerHp(false);
    if(onCloseModals) onCloseModals(); 

    setState(prev => {
      if (!prev) return prev;
      const isA = player === "A";

      const resetFieldUnits = (f: PlayerState["field"]) => ({
        is: f.is
          ? {
              ...applyEndTurnIversonWaitTickToFieldUnit(
                applyEndTurnStunTickToFieldUnit(
                  applyEndTurnBaekseuInvulnTickToFieldUnit(
                    applyEndTurnEondeokSilenceTickToFieldUnit(
                      applyEndTurnSuppressionTickToFieldUnit(f.is),
                    ),
                  ),
                ),
              ),
              hasAttacked: false,
              hasBeenAttackedThisTurn: false,
            }
          : null,
        m: f.m
          ? {
              ...applyEndTurnIversonWaitTickToFieldUnit(
                applyEndTurnStunTickToFieldUnit(
                  applyEndTurnBaekseuInvulnTickToFieldUnit(
                    applyEndTurnEondeokSilenceTickToFieldUnit(
                      applyEndTurnSuppressionTickToFieldUnit(f.m),
                    ),
                  ),
                ),
              ),
              hasAttacked: false,
              hasBeenAttackedThisTurn: false,
            }
          : null,
        os: f.os
          ? {
              ...applyEndTurnIversonWaitTickToFieldUnit(
                applyEndTurnStunTickToFieldUnit(
                  applyEndTurnBaekseuInvulnTickToFieldUnit(
                    applyEndTurnEondeokSilenceTickToFieldUnit(
                      applyEndTurnSuppressionTickToFieldUnit(f.os),
                    ),
                  ),
                ),
              ),
              hasAttacked: false,
              hasBeenAttackedThisTurn: false,
            }
          : null,
      });

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
      }
      if (tb.expiredBusinessGangToRewind.length > 0) {
        rewindCards = [...rewindCards, ...tb.expiredBusinessGangToRewind];
      }
      if (ta.expiredAntHellToRewind.length > 0) {
        rewindCards = [...rewindCards, ...ta.expiredAntHellToRewind];
      }
      if (tb.expiredAntHellToRewind.length > 0) {
        rewindCards = [...rewindCards, ...tb.expiredAntHellToRewind];
      }

      const nextTurn = isA ? "B" : "A";
      let fieldA = { ...resetFieldUnits(prev.playerA.field), spellStack: ta.nextStack };
      let fieldB = { ...resetFieldUnits(prev.playerB.field), spellStack: tb.nextStack };

      const hyu = applyHyugesojauiAnsikTurnStartForOwner({
        nextTurnOwner: nextTurn,
        playerAField: fieldA,
        playerBField: fieldB,
      });
      fieldA = hyu.nextPlayerAField;
      fieldB = hyu.nextPlayerBField;

      return {
        ...prev,
        rewindCards,
        currentTurn: isA ? "B" : "A",
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
    });
  };

  const handleSkillDiscard = (cardIndex: number, player: "A" | "B") => {
    if (!pendingSkill || !state || pendingSkill.name !== PENDING_SKILL.MOMO_EAT) return;

    const targetPlayerState = player === "A" ? state.playerA : state.playerB;
    const hand = targetPlayerState.hand;
    const discardedCard = hand[cardIndex];

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
        playerA: newPlayerA,
        playerB: newPlayerB,
        rewindCards: newRewind
      };
    });

    setPendingSkill(null);
  };

  const handleDrawClick = (onOpenSelectModal: () => void) => {
    if (!state || isInitializing || !state.currentTurn || winner) return;
    if (state.deckCards.length === 0) return alert("덱에 더 이상 카드가 없습니다!");
    
    const isA = state.currentTurn === "A";
    const targetPlayer = isA ? state.playerA : state.playerB;
    
    if (targetPlayer.hasDrawnThisTurn) return alert("이번 턴에는 이미 카드를 뽑았습니다! (턴당 1회 제한)");
    if (targetPlayer.hand.length >= 6) return alert("패가 가득 찼습니다! (최대 6장)");

    if (state.settings.drawMode === "SELECT") {
      onOpenSelectModal();
      return;
    }

    executeDraw(null, () => {});
  };

  const executeDraw = (selectedCardIndex: number | null, onCloseModal: () => void) => {
    setState(prev => {
      if (!prev) return prev;
      const isA = prev.currentTurn === "A";
      const targetPlayer = isA ? prev.playerA : prev.playerB;

      const newDeck = [...prev.deckCards];
      let drawnCard: CardRow;

      if (selectedCardIndex !== null) {
        drawnCard = newDeck.splice(selectedCardIndex, 1)[0];
      } else {
        drawnCard = newDeck.pop()!;
      }

      return {
        ...prev,
        deckCards: newDeck,
        [isA ? "playerA" : "playerB"]: {
          ...targetPlayer,
          hand: [...targetPlayer.hand, drawnCard],
          hasDrawnThisTurn: true 
        },
      };
    });
    
    onCloseModal(); 
  };

  const handleDragStart = (e: React.DragEvent, cardIndex: number, player: "A" | "B") => {
    if (state?.currentTurn !== player || winner || pendingSkill) {
      e.preventDefault();
      return;
    }
    setSelectedSlot(null);
    setAttackingSlot(null); 
    setPendingSecondaryAttack(null);
    setPendingAttackSelection(null);
    setAttackOptionOverride(null);

    e.dataTransfer.setData("cardIndex", cardIndex.toString());
    e.dataTransfer.setData("player", player);
  };

  const handleDrop = (e: React.DragEvent, slot: "is" | "m" | "os" | "spell", targetPlayer: "A" | "B") => {
    e.preventDefault();
    if (!state || winner) return;

    const cardIndexStr = e.dataTransfer.getData("cardIndex");
    const sourcePlayer = e.dataTransfer.getData("player");

    if (!cardIndexStr || sourcePlayer !== targetPlayer || state.currentTurn !== sourcePlayer) {
      return;
    }

    const cardIndex = parseInt(cardIndexStr, 10);
    const isPlayerA = sourcePlayer === "A";

    const hand = isPlayerA ? state.playerA.hand : state.playerB.hand;
    const handCard = hand.slice(cardIndex, cardIndex + 1).pop();
    if (!handCard) return;

    const card: FieldCard = {
      ...handCard,
      currentHp: Number(handCard.hp) || 0,
      hasAttacked: false,
      hasBeenAttackedThisTurn: false,
      summonedTurn: `${state.turnCount}-${state.currentTurn}` 
    };
    if (handCard.name === DARK_KNIGHT_ID) {
      card.darkKnightSoulGauge = 0;
    }
    if (handCard.name === MAXELLAND_ID) {
      card.maxellandTenacityGauge = 0;
    }
    if (handCard.name === IVERSON_ID) {
      card.iversonSummonWaitEndTurnTicksRemaining = IVERSON_SUMMON_WAIT_END_TURNS;
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

    const targetField = isPlayerA ? state.playerA.field : state.playerB.field;
    const spellStackBefore = normalizeSpellStack(targetField);

    if (!isSpellSlot) {
      const isUnitSlotOccupied =
        slot === "is" ? targetField.is : slot === "m" ? targetField.m : targetField.os;
      if (isUnitSlotOccupied !== null) {
        alert("이미 카드가 배치된 자리입니다.");
        return;
      }
    }

    const currentTokens = isPlayerA ? state.playerA.tokens : state.playerB.tokens;
    const placementCost =
      isSpellSlot && isHiddenSpellCard(handCard) ? 0 : Number(card.cost) || 0;
    if (currentTokens < placementCost) {
      alert(`토큰이 부족합니다! (필요 코스트: ${placementCost}, 현재 토큰: ${currentTokens})`);
      return;
    }

    setState(prev => {
      if (!prev) return prev;
      
      const newHand = Array.from(isPlayerA ? prev.playerA.hand : prev.playerB.hand);
      newHand.splice(cardIndex, 1);

      const nextSpellStack = isSpellSlot ? appendSpellToStack(spellStackBefore, card) : spellStackBefore;
      let updatedField = {
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
      if (isSpellSlot && handCard.name === HYUGESOJAUI_ANSIK_SPELL_ID) {
        const hr = applyHyugesojauiAnsikHealAttempt(updatedField, HYUGESOJAUI_ANSIK_HEAL_PER_TRIGGER);
        updatedField = hr.nextField;
      }

      if (isPlayerA) {
        return {
          ...prev,
          playerA: {
            ...prev.playerA,
            tokens: prev.playerA.tokens - placementCost,
            hand: newHand,
            field: updatedField
          }
        };
      } else {
        return {
          ...prev,
          playerB: {
            ...prev.playerB,
            tokens: prev.playerB.tokens - placementCost,
            hand: newHand,
            field: updatedField
          }
        };
      }
    });
  };

  const handlePlayerAttack = (targetPlayer: "A" | "B") => {
    if (!attackingSlot || !state || winner) return;
    const [attackerPlayer, attackerSlotName] = attackingSlot.split("-") as ["A" | "B", "is" | "m" | "os"];
    
    if (attackerPlayer === targetPlayer) return; 

    const targetPlayerState = targetPlayer === "A" ? state.playerA : state.playerB;
    const attackerField = attackerPlayer === "A" ? state.playerA.field : state.playerB.field;
    const attackerCard = attackerField[attackerSlotName];
    
    if (!attackerCard) return;
    if (isAttackDisabledUnit(attackerCard)) {
      setAttackingSlot(null);
      setAttackOptionOverride(null);
      return;
    }

    if (
      isRyeomchoSelfHealBasicAttackSealed(
        attackerCard,
        getUnitFacingOppAtSlot(
          attackerPlayer,
          attackerSlotName,
          state.playerA.field,
          state.playerB.field
        )
      )
    ) {
      alert(BATTLE_MSG.ryeomcho.cannotAttackOrTarget);
      setAttackingSlot(null);
      setAttackOptionOverride(null);
      return;
    }

    if (isRanigo(attackerCard)) {
      if (
        isRanigoAllyHealBasicAttackSealed(
          attackerCard,
          getUnitFacingOppAtSlot(
            attackerPlayer,
            attackerSlotName,
            state.playerA.field,
            state.playerB.field
          )
        )
      ) {
        setAttackingSlot(null);
        setAttackOptionOverride(null);
        return;
      }
      alert(BATTLE_MSG.ranigo.cannotAttackEnemy);
      setAttackingSlot(null);
      setAttackOptionOverride(null);
      return;
    }

    const activeForPlayerStrike = attackerPlayer === "A" ? state.playerA : state.playerB;
    const defenderFieldForPlayerStrike =
      targetPlayer === "A" ? state.playerA.field : state.playerB.field;
    const defenderFieldEmptyForWraithPlayerFollowUp =
      !defenderFieldForPlayerStrike.is &&
      !defenderFieldForPlayerStrike.m &&
      !defenderFieldForPlayerStrike.os;
    const wraithFacingPlayerStrike = getUnitFacingOppAtSlot(
      attackerPlayer,
      attackerSlotName,
      state.playerA.field,
      state.playerB.field
    );
    const wraithPlayerHpFollowUpValidate =
      isStartingWraithTrueStrikeBasicAttacker(attackerCard, wraithFacingPlayerStrike) &&
      defenderFieldEmptyForWraithPlayerFollowUp &&
      (activeForPlayerStrike.attacksThisTurn || 0) < 2 &&
      (!!attackerCard.hasAttacked || pendingStartingWraithChainPlayerHp);
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

    // ⭐️ [집중 사격] — 다이아고·검은 황제 오라 또는 No.12 스펠(스택 내 위치 무관) 시 플레이어 다구리 금지 면제
    if (
      !wraithPlayerHpFollowUpValidate &&
      targetPlayerState.hasBeenAttackedThisTurn &&
      !fieldGrantsFocusedFireMultihitExemption(
        attackerField,
        {
          allyPlayer: attackerPlayer,
          playerAField: state!.playerA.field,
          playerBField: state!.playerB.field,
        },
        attackerCard
      ) &&
      !startingHeraldBasicAttackIgnoresTauntTargetingRestrictions(
        attackerCard,
        getUnitFacingOppAtSlot(attackerPlayer, attackerSlotName, state!.playerA.field, state!.playerB.field)
      )
    ) {
      alert('다른 유닛이 이미 상대 플레이어를 공격했습니다. (플레이어 다구리 금지)');
      setAttackingSlot(null);
      setAttackOptionOverride(null);
      return;
    }

    const baseAtkRaw = resolveFieldUnitSimulationBaseAtkRaw(attackerCard, attackOptionOverride);
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
      playerAField: state!.playerA.field,
      playerBField: state!.playerB.field,
    });

    let fieldHealAmount = 0;
    let fieldBuffKey = "";

    const skillUpdates = applyPostAttackSkills(attackerCard, { 
      damageDealt: primaryDamage, 
      targetDestroyed: false,
      applyFieldHeal: (amt) => fieldHealAmount = amt,
      applyFieldBuff: (key) => fieldBuffKey = key
    });

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

      // ⭐️ 필드 광역 효과 적용 (불변성 훼손 버그 수정 완료)
      const activePlayer = attackerPlayer === "A" ? newPlayerA : newPlayerB;
      if (fieldHealAmount > 0 || fieldBuffKey) {
        ['is', 'm', 'os'].forEach(s => {
          const unit = activePlayer.field[s as "is"|"m"|"os"];
          if (unit) {
            const updatedUnit = { ...unit }; // ✨ 깊은 복사로 불변성 유지 (2배 힐링 버그 방지)
            if (fieldHealAmount > 0) {
              Object.assign(
                updatedUnit,
                applyFieldAllyHealToUnit(
                  updatedUnit,
                  fieldHealAmount,
                  attackerCard,
                  attackerSlotName,
                  s as "is" | "m" | "os"
                )
              );
            }
            if (fieldBuffKey && !suppressionBlocksExternalBuffEffects(updatedUnit)) {
              (updatedUnit as any)[fieldBuffKey] = true;
            }
            activePlayer.field[s as "is"|"m"|"os"] = updatedUnit;
          }
        });
      }

      return { ...prev, playerA: newPlayerA, playerB: newPlayerB };
    });

    const newHp = targetPlayer === "A" ? state.playerA.hp - primaryDamage : state.playerB.hp - primaryDamage;
    
    setTimeout(() => {
      if (newHp <= 0) {
        setWinner(attackerPlayer);
      } else {
        alert(`⚔️ 플레이어 직접 공격! 적 플레이어에게 ${primaryDamage}의 피해를 입혔습니다.`);
      }
    }, 50);

    setAttackingSlot(null);
    setAttackOptionOverride(null);
    setPendingStartingWraithChainPlayerHp(false);
  };

  const handleFieldClick = (e: React.MouseEvent, player: "A" | "B", slot: "is" | "m" | "os" | "spell", card: FieldCard | null) => {
    e.stopPropagation(); 
    if (winner) return;
    
    const cleanupSkillLinksOnDeath = (deadCard: FieldCard, newPA: PlayerState, newPB: PlayerState, currentGlobalTurn: number) => {
      cleanupSimulationUnitDeath(deadCard, newPA, newPB, currentGlobalTurn);
    };

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

        if (eristina && target && eristina.name === UNIT.ERISTINA) {
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

      setPendingSkill(null);
      return;
    }

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
          activePlayer.field[slot as "is" | "m" | "os"] = {
            ...target,
            hasLimeBubbleShieldBuff: true,
            linkedSource: `${pendingSkill.player}-${pendingSkill.slot}`,
          };
        }

        return { ...prev, playerA: newPlayerA, playerB: newPlayerB };
      });

      setPendingSkill(null);
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

      const allyFieldSnap = caster === "A" ? state!.playerA.field : state!.playerB.field;
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

      const oppFieldSnap = player === "A" ? state!.playerA.field : state!.playerB.field;
      if (!spellStackHasHiddenSpell(oppFieldSnap)) {
        setGonchungInfoFloat({
          slotKey: `${player}-spell`,
          text: BATTLE_MSG.gonchungJeonmoga.noHiddenSpell,
        });
        setPendingSkill(null);
        return;
      }

      const topHidden = normalizeSpellStack(oppFieldSnap).at(-1);
      if (!topHidden || !isHiddenSpellCard(topHidden)) {
        setGonchungInfoFloat({
          slotKey: `${player}-spell`,
          text: BATTLE_MSG.gonchungJeonmoga.topNotHidden,
        });
        return;
      }

      const spellStatsInstanceId = topHidden.statsInstanceId;
      if (!spellStatsInstanceId) {
        setPendingSkill(null);
        return;
      }

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
      return;
    }

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
            getUnitFacingOppAtSlot(
              attackerPlayer,
              attackerSlotName,
              state!.playerA.field,
              state!.playerB.field
            )
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
          skillUpdates = applyPostAttackSkills(attackerCard, {
            damageDealt: 0,
            targetDestroyed: false,
            applyFieldHeal: amt => {
              fieldHealAmount = amt;
            },
            applyFieldBuff: key => {
              fieldBuffKey = key;
            },
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
                if (fieldBuffKey && !suppressionBlocksExternalBuffEffects(updatedUnit)) {
                  (updatedUnit as FieldCard & Record<string, unknown>)[fieldBuffKey] = true;
                }
                activePlayerSec.field[s] = updatedUnit;
              });
            }
          }

          return { ...prev, playerA: newPlayerA, playerB: newPlayerB };
        });

        setTimeout(
          () => alert(`💚 라니고 연쇄 — 아군에게 체력을 ${actualHeal} 회복시켰습니다.`),
          50
        );

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
        if (isAttackDisabledUnit(attackerCard)) {
          setAttackingSlot(null);
          setAttackOptionOverride(null);
          return;
        }

        if (
          !startingHeraldBasicAttackIgnoresTauntTargetingRestrictions(
            attackerCard,
            getUnitFacingOppAtSlot(attackerPlayer, attackerSlotName, state!.playerA.field, state!.playerB.field)
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
          alert("올바른 대상이 아닙니다.");
          return;
        }

        let damage = pendingSecondaryAttack.damage;

        if (attackerCard) {
          damage = scalePakkiOutgoingHit(damage, attackerCard, attackerField, {
            allyPlayer: attackerPlayer,
            playerAField: state!.playerA.field,
            playerBField: state!.playerB.field,
          });
        }

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
           damage = Math.floor((damage * 0.75) / 50) * 50;
        }

        const victimFieldHookSecondary = player === "A" ? state!.playerA.field : state!.playerB.field;

        const secondaryIncomingDefense = mitigationBypassSecondary
          ? { finalDamage: damage, kind: "none" as const }
          : applyIncomingDefenseDamage(
              damage,
              card,
              state!.playerA.field,
              state!.playerB.field,
              `${player}-${slot}`
            );
        let actualDamage = secondaryIncomingDefense.finalDamage + kalliPureSecondary;
        if (isInvulnerableFromBaekseuOrCheolbyeok(card, victimFieldHookSecondary)) {
          actualDamage = 0;
        }
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
          getUnitFacingOppAtSlot(player, slot as "is" | "m" | "os", state!.playerA.field, state!.playerB.field)
        );
        const newHp = resolvedSecondary.finalHp;
        const isDestroyed = resolvedSecondary.isDestroyed;
        const baekseuPatchSecondary = resolvedSecondary.patch;

        const morningMoodFacingOpp = getUnitFacingOppAtSlot(
          player,
          slot as "is" | "m" | "os",
          state!.playerA.field,
          state!.playerB.field
        );
        const morningMoodDeathHeal = isDestroyed
          ? getMorningMoodDeathAllyHeal(card, morningMoodFacingOpp)
          : 0;
        const startingTreeAllyHeal = getStartingTreeAllyHealOnDamaged(
          card,
          actualDamage,
          morningMoodFacingOpp
        );

        let fieldHealAmount = 0;
        let fieldBuffKey = "";
        let skillUpdates = {};

        if (attackerCard) {
            skillUpdates = applyPostAttackSkills(attackerCard, { 
              damageDealt: actualDamage, 
              targetDestroyed: isDestroyed,
              targetMaxHpWhenDestroyed: isDestroyed ? Number(card.hp) : undefined,
              applyFieldHeal: (amt) => fieldHealAmount = amt,
              applyFieldBuff: (key) => fieldBuffKey = key
            });
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
            getUnitFacingOppAtSlot(player, slot, state!.playerA.field, state!.playerB.field),
            attackerFieldForPakkiCurseSec,
            {
              allyPlayer: attackerPlayer,
              playerAField: state!.playerA.field,
              playerBField: state!.playerB.field,
            }
          );

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
              getUnitFacingOppAtSlot(
                attackerPlayer,
                attackerSlotName,
                prev.playerA.field,
                prev.playerB.field
              )
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
              getUnitFacingOppAtSlot(
                attackerPlayer,
                attackerSlotName,
                state!.playerA.field,
                state!.playerB.field
              )
            );
            const updatedAttacker = {
              ...attackerCard,
              ...skillUpdates,
              ...bumpKillSec,
              ...(pakkiDebuffSecondary ? { hasPakiAttackHalveDebuff: true } : {}),
            };
            if (attackerPlayer === "A") {
                newPlayerA.field[attackerSlotName] = updatedAttacker;
            } else {
                newPlayerB.field[attackerSlotName] = updatedAttacker;
            }

            // ⭐️ 필드 광역 효과 적용 (불변성 훼손 버그 수정 완료)
            const activePlayer = attackerPlayer === "A" ? newPlayerA : newPlayerB;
            if (fieldHealAmount > 0 || fieldBuffKey) {
              ['is', 'm', 'os'].forEach(s => {
                const unit = activePlayer.field[s as "is"|"m"|"os"];
                if (unit) {
                  const updatedUnit = { ...unit }; // ✨ 클론본 생성
                  if (fieldHealAmount > 0) {
                    Object.assign(
                      updatedUnit,
                      applyFieldAllyHealToUnit(
                        updatedUnit,
                        fieldHealAmount,
                        attackerCard,
                        attackerSlotName,
                        s as "is" | "m" | "os"
                      )
                    );
                  }
                  if (fieldBuffKey && !suppressionBlocksExternalBuffEffects(updatedUnit)) {
                    (updatedUnit as any)[fieldBuffKey] = true;
                  }
                  activePlayer.field[s as "is"|"m"|"os"] = updatedUnit;
                }
              });
            }
          }

          if (isDestroyed) {
            if (morningMoodDeathHeal > 0) {
              const deadSide = player === "A" ? newPlayerA : newPlayerB;
              (["is", "m", "os"] as const).forEach(s => {
                const unit = deadSide.field[s];
                if (!unit) return;
                deadSide.field[s] = healUnitCurrentHp(unit, morningMoodDeathHeal, { supportSource: "allyUnit" });
              });
            }
             cleanupSkillLinksOnDeath(card, newPlayerA, newPlayerB, prev.globalTurnCount);
          }
          if (startingTreeAllyHeal > 0) {
            const damagedSide = player === "A" ? newPlayerA : newPlayerB;
            (["is", "m", "os"] as const).forEach(s => {
              if (s === slot) return;
              const unit = damagedSide.field[s];
              if (!unit) return;
              damagedSide.field[s] = healUnitCurrentHp(unit, startingTreeAllyHeal, { supportSource: "allyUnit" });
            });
          }

          const newRewindCards = isDestroyed ? [...prev.rewindCards, card] : prev.rewindCards;
          return { ...prev, rewindCards: newRewindCards, playerA: newPlayerA, playerB: newPlayerB };
        });

        const newHitsRemaining = pendingSecondaryAttack.hitsRemaining - 1;

        setTimeout(() => {
          let msg = isDestroyed
            ? `💥 연쇄 공격 치명타! 추가 ${actualDamage} 데미지로 적 유닛을 파괴했습니다!`
            : `⚡ 연쇄 공격 적중! 적 유닛에게 ${actualDamage}의 추가 데미지를 입혔습니다.`;

          if (
            !kalliVsDefenseSecondary &&
            (card as any).hasBanjitgori &&
            !callieBuffBanSuppressesBuffsForVictim(
              player,
              slot as "is" | "m" | "os",
              state!.playerA.field,
              state!.playerB.field
            )
          ) {
             msg = `🎀 [반짓고리] 효과로 받는 피해가 25% 감소되었습니다!\n` + msg;
          }
          if (secondaryIncomingDefense.kind !== "none") {
             msg = `🛡️ [방어력] 효과로 방어력이 적용되었습니다!\n` + msg;
          }

          alert(msg);
        }, 50);

        if (newHitsRemaining > 0 && !willBeEmpty) {
          setPendingSecondaryAttack(prev => ({
            ...prev!,
            hitsRemaining: newHitsRemaining,
            hitTargets: [...prev!.hitTargets, targetId]
          }));
        } else {
          setPendingSecondaryAttack(null);
          if (willBeEmpty && newHitsRemaining > 0) {
            setTimeout(() => alert("(적 필드의 모든 유닛이 파괴되어 더 이상의 연쇄 공격이 중단됩니다.)"), 100);
          }
        }
      }
      return;
    }

    if (attackingSlot) {
      const [attackerPlayer, attackerSlotName] = attackingSlot.split("-") as ["A" | "B", "is" | "m" | "os"];
      let keepAttackingModeForStartingWraithChain = false;
      const attackerField = attackerPlayer === "A" ? state!.playerA.field : state!.playerB.field;
      const attackerCard = attackerField[attackerSlotName];

      if (
        attackerCard &&
        isStartingWraithPassivesPausedByConfusion(
          attackerCard,
          getUnitFacingOppAtSlot(
            attackerPlayer,
            attackerSlotName,
            state!.playerA.field,
            state!.playerB.field
          )
        )
      ) {
        setPendingStartingWraithChainKill(null);
        setPendingStartingWraithChainPlayerHp(false);
      }

      if (
        attackerCard &&
        isRyeomchoSelfHealBasicAttackSealed(
          attackerCard,
          getUnitFacingOppAtSlot(
            attackerPlayer,
            attackerSlotName,
            state!.playerA.field,
            state!.playerB.field
          )
        )
      ) {
        if (player === attackerPlayer && slot === attackerSlotName && card) {
          const activeForAttack = attackerPlayer === "A" ? state!.playerA : state!.playerB;
          const atkValidation = validateAttack({
            attackerCard,
            currentTurnKey: `${state!.turnCount}-${state!.currentTurn}`,
            attacksUsedThisTurn: activeForAttack.attacksThisTurn || 0,
            isSilenced: isSilenced(attackerCard, null),
            isStunned: isStunned(attackerCard),
          });
          if (!atkValidation.canAttack) {
            alert(atkValidation.reason);
            return;
          }

          const baseAtkRaw =
            resolveFieldUnitSimulationBaseAtkRaw(attackerCard, attackOptionOverride);
          const healAmount = parseAttack(baseAtkRaw.replace(/[\(\)]/g, "")).primaryDamage;

          if (healAmount <= 0) {
            alert("공격력 데이터가 0이거나 유효하지 않습니다.");
            return;
          }

          const maxHp = Number(attackerCard.hp);
          if (attackerCard.currentHp >= maxHp) {
            alert(BATTLE_MSG.ryeomcho.alreadyMaxHp);
            setAttackingSlot(null);
            setAttackOptionOverride(null);
            return;
          }

          const healedAttacker = healUnitCurrentHp(attackerCard, healAmount, {
            supportSource: "selfAbility",
          });
          const actualHeal = healedAttacker.currentHp - attackerCard.currentHp;

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

            return { ...prev, playerA: newPlayerA, playerB: newPlayerB };
          });

          setTimeout(() => alert(BATTLE_MSG.ryeomcho.selfHeal(actualHeal)), 50);
          setAttackingSlot(null);
          setAttackOptionOverride(null);
          return;
        } else {
          alert(BATTLE_MSG.ryeomcho.cannotAttackEnemy);
          return;
        }
      }

      if (attackerCard && isRanigo(attackerCard)) {
        if (
          isRanigoAllyHealBasicAttackSealed(
            attackerCard,
            getUnitFacingOppAtSlot(
              attackerPlayer,
              attackerSlotName,
              state!.playerA.field,
              state!.playerB.field
            )
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
            attackerCard,
            currentTurnKey: `${state!.turnCount}-${state!.currentTurn}`,
            attacksUsedThisTurn: activeForAttack.attacksThisTurn || 0,
            isSilenced: isSilenced(attackerCard, null),
            isStunned: isStunned(attackerCard),
          });
          if (!atkValidation.canAttack) {
            alert(atkValidation.reason);
            return;
          }

          const maxHp = Number(card.hp);
          if (card.currentHp >= maxHp) {
            alert(BATTLE_MSG.ranigo.allyFullyHealed);
            setAttackingSlot(null);
            setAttackOptionOverride(null);
            return;
          }

          const healedTarget = healUnitCurrentHp(card, RANIGO_ALLY_BASIC_HEAL_AMOUNT, { supportSource: "allyUnit" });
          const actualHeal = healedTarget.currentHp - card.currentHp;

          const baseAtkRaw =
            resolveFieldUnitSimulationBaseAtkRaw(attackerCard, attackOptionOverride);
          const parsed = parseAttack(baseAtkRaw.replace(/[\(\)]/g, ""));
          const chainEligible =
            (parsed.type === "ADDITION" || parsed.type === "MULTIPLICATION") &&
            parsed.secondaryHits > 0 &&
            parsed.secondaryDamage > 0;

          let fieldHealAmountPrimary = 0;
          let fieldBuffKeyPrimary = "";
          const skillUpdates = applyPostAttackSkills(attackerCard, {
            damageDealt: 0,
            targetDestroyed: false,
            applyFieldHeal: amt => {
              fieldHealAmountPrimary = amt;
            },
            applyFieldBuff: key => {
              fieldBuffKeyPrimary = key;
            },
          });

          const tgt = `${player}-${slot}`;

          setState(prev => {
            if (!prev) return prev;
            const newPlayerA = { ...prev.playerA, field: { ...prev.playerA.field } };
            const newPlayerB = { ...prev.playerB, field: { ...prev.playerB.field } };

            const updatedTarget = { ...card, ...healedTarget };
            const updatedAttacker = { ...attackerCard, hasAttacked: true, ...skillUpdates };

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
            }

            return { ...prev, playerA: newPlayerA, playerB: newPlayerB };
          });

          setTimeout(
            () =>
              alert(
                `💚 [라니고] 기본 공격 — 아군 체력을 ${actualHeal} 회복했습니다.` +
                  (chainEligible
                    ? `\n\n연쇄: 남은 ${parsed.secondaryHits}회 — 추가로 회복시킬 아군을 선택하세요.`
                    : "")
              ),
            50
          );

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
          attackerCard,
          getUnitFacingOppAtSlot(attackerPlayer, attackerSlotName, state!.playerA.field, state!.playerB.field)
        );

        if (tauntExists && !isTargetTaunted && !startingHeraldAbsBasic) {
           alert("적 필드에 [도발] 능력을 가진 유닛이 있습니다! 도발 유닛을 먼저 공격해야 합니다.");
           return; 
        }

        if (
          shouldEnforceIversonNearestEnemyTargeting(
            attackerCard,
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
          alert("올바른 대상이 아닙니다");
          return;
        }

        const isStartingWraithChainFollowUp = isStartingWraithBasicAttackChainFollowUpPending(
          pendingStartingWraithChainKill,
          attackerPlayer,
          attackerSlotName
        );
        const wraithChainBypassesAntiGangup = startingWraithChainFollowUpBypassesAntiGangup(
          isStartingWraithChainFollowUp,
          attackerCard,
          getUnitFacingOppAtSlot(attackerPlayer, attackerSlotName, state!.playerA.field, state!.playerB.field)
        );

        if (attackerCard) {
          if (isAttackDisabledUnit(attackerCard)) {
            setAttackingSlot(null);
            setAttackOptionOverride(null);
            setPendingStartingWraithChainKill(null);
            setPendingStartingWraithChainPlayerHp(false);
            return;
          }
          // ⭐️ [집중 사격] — 다이아고·검은 황제 오라 또는 No.12 스펠(스택 내 위치 무관) 시 다굴 금지 면제
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
            setPendingStartingWraithChainKill(null);
            setPendingStartingWraithChainPlayerHp(false);
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
            setPendingStartingWraithChainKill(null);
            setPendingStartingWraithChainPlayerHp(false);
            return;
          }

          const baseAtkRaw = resolveFieldUnitSimulationBaseAtkRaw(attackerCard, attackOptionOverride);
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
            setPendingStartingWraithChainKill(null);
            setPendingStartingWraithChainPlayerHp(false);
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

          /* 패키: 1차·연쇄 각각 `scalePakkiOutgoingHit` 한 번만 — pending secondary는 미스케일 저장 */
          let actualPrimaryDamage = scalePakkiOutgoingHit(
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
             actualPrimaryDamage = Math.floor((actualPrimaryDamage * 0.75) / 50) * 50;
          }

          const victimFieldHookPrimary = player === "A" ? state!.playerA.field : state!.playerB.field;

          const primaryIncomingDefense = mitigationBypassPrimary
            ? { finalDamage: actualPrimaryDamage, kind: "none" as const }
            : applyIncomingDefenseDamage(
                actualPrimaryDamage,
                card,
                state!.playerA.field,
                state!.playerB.field,
                `${player}-${slot}`
              );
          actualPrimaryDamage = primaryIncomingDefense.finalDamage + kalliPurePrimary;
          if (isInvulnerableFromBaekseuOrCheolbyeok(card, victimFieldHookPrimary)) {
            actualPrimaryDamage = 0;
          }
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
            getUnitFacingOppAtSlot(player, slot as "is" | "m" | "os", state!.playerA.field, state!.playerB.field)
          );
          const newHp = resolvedPrimary.finalHp;
          const isDestroyed = resolvedPrimary.isDestroyed;
          const baekseuPatchPrimary = resolvedPrimary.patch;

          const morningMoodFacingOppPrimary = getUnitFacingOppAtSlot(
            player,
            slot as "is" | "m" | "os",
            state!.playerA.field,
            state!.playerB.field
          );
          const morningMoodDeathHeal = isDestroyed
            ? getMorningMoodDeathAllyHeal(card, morningMoodFacingOppPrimary)
            : 0;
          const startingTreeAllyHeal = getStartingTreeAllyHealOnDamaged(
            card,
            actualPrimaryDamage,
            morningMoodFacingOppPrimary
          );

          const attackerFieldForPakkiCurse =
            attackerPlayer === "A" ? state!.playerA.field : state!.playerB.field;
          const pakkiDebuffPrimary =
            isDestroyed &&
            attackerCard &&
            shouldApplyPakkiKillDebuffOnDeath(
              card,
              getUnitFacingOppAtSlot(player, slot as "is" | "m" | "os", state!.playerA.field, state!.playerB.field),
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

          let fieldHealAmount = 0;
          let fieldBuffKey = "";

          const skillUpdates = applyPostAttackSkills(attackerCard, { 
             damageDealt: actualPrimaryDamage, 
             targetDestroyed: isDestroyed,
             targetMaxHpWhenDestroyed: isDestroyed ? Number(card.hp) : undefined,
             applyFieldHeal: (amt) => fieldHealAmount = amt,
             applyFieldBuff: (key) => fieldBuffKey = key
          });

          const defenderFieldSnapForWraithChain =
            player === "A" ? state!.playerA.field : state!.playerB.field;
          const keepWraithChainForNextEnemy = isStartingWraithBasicAttackChainKillEligible({
            attackerCard,
            facingOppCard: attackerFacingOppPrimary,
            attackType,
            secondaryHits,
            isDestroyed,
            attackerDestroyedByReflect: false,
            defenderFieldBeforeKill: defenderFieldSnapForWraithChain,
            killedSlot: slot as "is" | "m" | "os",
          });
          const wraithSeeksPlayerAfterClear =
            isStartingWraithTrueStrikeBasicAttacker(attackerCard, attackerFacingOppPrimary) &&
            attackType === "NORMAL" &&
            secondaryHits === 0 &&
            isDestroyed &&
            countOtherLivingDefenderUnits(
              defenderFieldSnapForWraithChain,
              slot as "is" | "m" | "os"
            ) === 0;
          keepAttackingModeForStartingWraithChain =
            keepWraithChainForNextEnemy || wraithSeeksPlayerAfterClear;

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
            const updatedTarget = {
              ...baseTargetPrimary,
              ...elixir5StunTargetPatch(
                attackerCard,
                actualPrimaryDamage,
                isDestroyed,
                getUnitFacingOppAtSlot(
                  attackerPlayer,
                  attackerSlotName,
                  prev.playerA.field,
                  prev.playerB.field
                )
              ),
              ...baekseuPatchPrimary,
              ...hpBarrierPatchFromRemaining(barrierSplitPrimary.nextBarrierRemaining),
              currentHp: newHp,
              ...(wraithChainSkipsGangupMark ? {} : { hasBeenAttackedThisTurn: true }),
            }; 
            const bumpKill = bumpMaxellandTenacityGaugeOnEnemyKill(
              attackerCard,
              isDestroyed,
              getUnitFacingOppAtSlot(
                attackerPlayer,
                attackerSlotName,
                state!.playerA.field,
                state!.playerB.field
              )
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
              attackerDestroyedByReflect: false,
              defenderFieldBeforeKill: defendFieldPrev,
              killedSlot: slot as "is" | "m" | "os",
            });
            const updatedAttacker = {
              ...attackerCard,
              hasAttacked: wraithChainContinues || wraithSeeksPlayerAfterClear ? false : true,
              ...skillUpdates,
              ...bumpKill,
              ...(pakkiDebuffPrimary ? { hasPakiAttackHalveDebuff: true } : {}),
            }; 
            
            if (player === "A") newPlayerA.field[slot as "is"|"m"|"os"] = isDestroyed ? null : updatedTarget;
            else newPlayerB.field[slot as "is"|"m"|"os"] = isDestroyed ? null : updatedTarget;
            
            if (attackerPlayer === "A") {
              newPlayerA.field[attackerSlotName] = updatedAttacker;
              if (!isStartingWraithChainFollowUp) {
                newPlayerA.attacksThisTurn = (newPlayerA.attacksThisTurn || 0) + 1;
              }
            } else {
              newPlayerB.field[attackerSlotName] = updatedAttacker;
              if (!isStartingWraithChainFollowUp) {
                newPlayerB.attacksThisTurn = (newPlayerB.attacksThisTurn || 0) + 1;
              }
            }

            // ⭐️ 필드 광역 효과 적용 (불변성 훼손 버그 수정 완료)
            const activePlayer = attackerPlayer === "A" ? newPlayerA : newPlayerB;
            if (fieldHealAmount > 0 || fieldBuffKey) {
              ['is', 'm', 'os'].forEach(s => {
                const unit = activePlayer.field[s as "is"|"m"|"os"];
                if (unit) {
                  const updatedUnit = { ...unit }; // ✨ 클론본 생성
                  if (fieldHealAmount > 0) {
                    Object.assign(
                      updatedUnit,
                      applyFieldAllyHealToUnit(
                        updatedUnit,
                        fieldHealAmount,
                        attackerCard,
                        attackerSlotName,
                        s as "is" | "m" | "os"
                      )
                    );
                  }
                  if (fieldBuffKey && !suppressionBlocksExternalBuffEffects(updatedUnit)) {
                    (updatedUnit as any)[fieldBuffKey] = true;
                  }
                  activePlayer.field[s as "is"|"m"|"os"] = updatedUnit;
                }
              });
            }

            if (isDestroyed) {
              if (morningMoodDeathHeal > 0) {
                const deadSide = player === "A" ? newPlayerA : newPlayerB;
                (["is", "m", "os"] as const).forEach(s => {
                  const unit = deadSide.field[s];
                  if (!unit) return;
                  deadSide.field[s] = healUnitCurrentHp(unit, morningMoodDeathHeal, { supportSource: "allyUnit" });
                });
              }
               cleanupSkillLinksOnDeath(card, newPlayerA, newPlayerB, prev.globalTurnCount);
            }
            if (startingTreeAllyHeal > 0) {
              const damagedSide = player === "A" ? newPlayerA : newPlayerB;
              (["is", "m", "os"] as const).forEach(s => {
                if (s === slot) return;
                const unit = damagedSide.field[s];
                if (!unit) return;
                damagedSide.field[s] = healUnitCurrentHp(unit, startingTreeAllyHeal, { supportSource: "allyUnit" });
              });
            }

            const newRewindCards = isDestroyed ? [...prev.rewindCards, card] : prev.rewindCards;

            return {
              ...prev,
              rewindCards: newRewindCards,
              playerA: newPlayerA,
              playerB: newPlayerB
            };
          });

          if (keepWraithChainForNextEnemy) {
            setPendingStartingWraithChainKill({ attackerPlayer, attackerSlotName });
            setPendingStartingWraithChainPlayerHp(false);
          } else if (wraithSeeksPlayerAfterClear) {
            setPendingStartingWraithChainKill(null);
            setPendingStartingWraithChainPlayerHp(true);
          } else {
            setPendingStartingWraithChainKill(null);
            setPendingStartingWraithChainPlayerHp(false);
          }

          setTimeout(() => {
            let msg = isDestroyed 
              ? `💥 치명타! ${actualPrimaryDamage}의 데미지를 입혀 적 유닛을 파괴했습니다!` 
              : `⚔️ 공격 적중! 적 유닛에게 ${actualPrimaryDamage}의 데미지를 입혔습니다.`;

            if (
              !kalliVsDefenseStrike &&
              (card as any).hasBanjitgori &&
              !callieBuffBanSuppressesBuffsForVictim(
                player,
                slot as "is" | "m" | "os",
                state!.playerA.field,
                state!.playerB.field
              )
            ) {
               msg = `🎀 [반짓고리] 효과로 받는 피해가 25% 감소되었습니다!\n` + msg;
            }
            if (primaryIncomingDefense.kind !== "none") {
               msg = `🛡️ [방어력] 효과로 방어력이 적용되었습니다!\n` + msg;
            }

            if ((attackType === "ADDITION" || attackType === "MULTIPLICATION") && secondaryHits > 0 && secondaryDamage > 0) {
              if (willBeEmpty) {
                msg += `\n\n(적 필드의 모든 유닛이 파괴되어 연쇄 공격이 자동으로 중단됩니다.)`;
              } else {
                const targetId = `${player}-${slot}`;
                msg += `\n\n연쇄 공격 발동! 추가 피해(${secondaryDamage})를 입힐 적을 선택해주세요. (남은 횟수: ${secondaryHits}회)`;
                
                setPendingSecondaryAttack({ 
                  attackerPlayer,
                  attackerSlotName, 
                  damage: secondaryDamage, 
                  hitsRemaining: secondaryHits,
                  hitTargets: [targetId]
                });
              }
            }
            alert(msg);
          }, 50);
        }
      }
      
      setAttackOptionOverride(null);
      if (!keepAttackingModeForStartingWraithChain) {
        setAttackingSlot(null);
      }
      return;
    }

    if (!card) return; 
    const slotId = `${player}-${slot}`;
    setSelectedSlot(prev => prev === slotId ? null : slotId); 
  };

  const isTargetable = (targetPlayer: "A" | "B", slotName: string, card: FieldCard | null) => {
    if (pendingSkill && pendingSkill.name === PENDING_SKILL.GONCHUNG_HIDDEN_PEEK) {
      const caster = pendingSkill.player;
      const opp = caster === "A" ? "B" : "A";
      if (targetPlayer !== opp || slotName !== "spell") return false;
      const oppField = opp === "A" ? state!.playerA.field : state!.playerB.field;
      return spellStackHasHiddenSpell(oppField);
    }

    if (!card) return false;
    const targetId = `${targetPlayer}-${slotName}`;
    
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
      return pendingSecondaryAttack.attackerPlayer !== targetPlayer && !pendingSecondaryAttack.hitTargets.includes(targetId);
    }
    
    if (attackingSlot) {
      const [attackerPlayer, attackerSlotName] = attackingSlot.split("-");
      const attackerCard = (attackerPlayer === "A" ? state!.playerA.field : state!.playerB.field)[attackerSlotName as "is"|"m"|"os"];

      if (
        attackerCard &&
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

      if (attackerCard && isRanigo(attackerCard)) {
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

        if (tauntExists) {
          if (
            !isTaunting(
              card!,
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

        return true;
      }
    }
    return false;
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

  const getTargetableClass = (targetPlayer: "A" | "B", slotName: string, card: FieldCard | null) => {
    if (!isTargetable(targetPlayer, slotName, card)) return '';
    
    if (pendingSkill && pendingSkill.name === PENDING_SKILL.ERISTINA_BANJITGORI) {
        return 'border-[3px] border-pink-400 bg-pink-500/20 shadow-[0_0_25px_rgba(244,114,182,0.9)] animate-pulse cursor-pointer z-20';
    }

    if (pendingSkill && pendingSkill.name === PENDING_SKILL.LIME_BUBBLE_SHIELD) {
      return "border-[3px] border-sky-400 bg-sky-500/20 shadow-[0_0_25px_rgba(56,189,248,0.9)] animate-pulse cursor-pointer z-20";
    }

    if (pendingSecondaryAttack?.allyHealOnly) {
      return "border-[3px] border-emerald-400 bg-emerald-500/20 shadow-[0_0_25px_rgba(52,211,153,0.85)] animate-pulse cursor-pointer z-20";
    }

    if (
      pendingStartingWraithChainKill &&
      attackingSlot ===
        `${pendingStartingWraithChainKill.attackerPlayer}-${pendingStartingWraithChainKill.attackerSlotName}`
    ) {
      return "border-[3px] border-amber-700 bg-amber-950/30 shadow-[0_0_28px_rgba(180,83,9,0.75)] animate-pulse cursor-crosshair z-20";
    }

    if (attackingSlot) {
      const [attackerPlayer, attackerSlotName] = attackingSlot.split("-");
      const attackerCard = (attackerPlayer === "A" ? state!.playerA.field : state!.playerB.field)[attackerSlotName as "is"|"m"|"os"];
      if (
        attackerCard &&
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
          return 'border-[3px] border-green-400 bg-green-500/20 shadow-[0_0_25px_rgba(74,222,128,0.9)] animate-pulse cursor-pointer z-20';
      }
      if (attackerCard && isRanigo(attackerCard)) {
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
          return "";
        }
        return "border-[3px] border-emerald-400 bg-emerald-500/20 shadow-[0_0_25px_rgba(52,211,153,0.85)] animate-pulse cursor-pointer z-20";
      }
    }
    
    return 'border-[3px] border-white bg-white/20 shadow-[0_0_25px_rgba(255,255,255,0.9)] animate-pulse cursor-crosshair z-20';
};

  return {
    state, setState,
    isInitializing, setIsInitializing,
    coinTossDisplay,
    coinFlipSide,
    selectedSlot, setSelectedSlot,
    attackingSlot, setAttackingSlot,
    pendingSecondaryAttack, setPendingSecondaryAttack,
    pendingStartingWraithChainKill, setPendingStartingWraithChainKill,
    pendingStartingWraithChainPlayerHp, setPendingStartingWraithChainPlayerHp,
    pendingAttackSelection, setPendingAttackSelection,
    pendingSkill, setPendingSkill,
    gonchungHiddenReveal,
    gonchungInfoFloat,
    activateGonchungHiddenPeek: (
      player: "A" | "B",
      slot: "is" | "m" | "os",
      card: FieldCard
    ) => {
      if (card.gonchungHiddenPeekConsumed) return;
      const opp = player === "A" ? state?.playerB.field : state?.playerA.field;
      const oppPl = player === "A" ? "B" : "A";
      if (!opp || !spellStackHasHiddenSpell(opp)) {
        setGonchungInfoFloat({
          slotKey: `${oppPl}-spell`,
          text: BATTLE_MSG.gonchungJeonmoga.noHiddenSpell,
        });
        return;
      }
      setPendingSkill({
        player,
        slot,
        name: PENDING_SKILL.GONCHUNG_HIDDEN_PEEK,
      });
      setSelectedSlot(null);
    },
    isGonchungHiddenPeekShowingFront: (
      spellPlayer: "A" | "B",
      spell: FieldCard | null | undefined
    ) => {
      if (!spell) return false;
      if (!isHiddenSpellCard(spell)) return true;
      return (
        gonchungHiddenReveal?.player === spellPlayer &&
        !!spell.statsInstanceId &&
        spell.statsInstanceId === gonchungHiddenReveal.spellStatsInstanceId
      );
    },
    getGonchungHiddenPeekSpellSlotPulseClass,
    attackOptionOverride, setAttackOptionOverride,
    winner, setWinner,
    runInitialization,
    handleReset,
    handleEndTurn,
    handleSkillDiscard,
    handleDrawClick,
    executeDraw,
    handleDragStart,
    handleDrop,
    handlePlayerAttack,
    handleFieldClick,
    isTargetable,
    getTargetableClass
  };
}