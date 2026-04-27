// hooks/useSimulationLogic.ts
import { useState, useEffect, useRef } from "react";
import { CardRow, FieldCard } from "../types/game";
import { applyPostAttackSkills, getActiveStatuses, isTaunting, hasTauntUnit } from "../utils/cardskills";

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
    spell: FieldCard | null;
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

export function useSimulationLogic(cards: CardRow[]) {
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
  } | null>(null);

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

  const [attackOptionOverride, setAttackOptionOverride] = useState<string | null>(null);
  const [winner, setWinner] = useState<"A" | "B" | null>(null);
  
  const initialized = useRef(false);

  const runInitialization = async (initialDeck: CardRow[]) => {
    if (!initialDeck || initialDeck.length === 0) return;

    setIsInitializing(true);
    setCoinTossDisplay(null);
    setSelectedSlot(null);
    setAttackingSlot(null);
    setPendingSecondaryAttack(null); 
    setPendingAttackSelection(null);
    setPendingSkill(null); 
    setAttackOptionOverride(null);
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
      playerA: { hp: 2000, tokens: 0, hand: [], hasDrawnThisTurn: false, attacksThisTurn: 0, hasBeenAttackedThisTurn: false, field: { is: null, m: null, os: null, spell: null } },
      playerB: { hp: 2000, tokens: 0, hand: [], hasDrawnThisTurn: false, attacksThisTurn: 0, hasBeenAttackedThisTurn: false, field: { is: null, m: null, os: null, spell: null } },
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

  useEffect(() => {
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
  }, [cards]);

  useEffect(() => {
    if (state && !isInitializing && state.currentTurn !== null && !winner) {
      localStorage.setItem("pp_sim_save", JSON.stringify(state));
    }
  }, [state, isInitializing, winner]);

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
    if(onCloseModals) onCloseModals(); 

    setState(prev => {
      if (!prev) return prev;
      const isA = player === "A";

      const resetField = (f: PlayerState['field']) => ({
        is: f.is ? { ...f.is, hasAttacked: false, hasBeenAttackedThisTurn: false } : null,
        m: f.m ? { ...f.m, hasAttacked: false, hasBeenAttackedThisTurn: false } : null,
        os: f.os ? { ...f.os, hasAttacked: false, hasBeenAttackedThisTurn: false } : null,
        spell: f.spell,
      });

      return {
        ...prev,
        currentTurn: isA ? "B" : "A",
        turnCount: !isA ? prev.turnCount + 1 : prev.turnCount,
        globalTurnCount: prev.globalTurnCount + 1, 
        turnTimeLeft: 60,
        playerA: { 
          ...prev.playerA, 
          tokens: !isA ? Math.min(prev.playerA.tokens + 2, 10) : prev.playerA.tokens,
          hasDrawnThisTurn: false,
          attacksThisTurn: 0, 
          hasBeenAttackedThisTurn: false, 
          field: resetField(prev.playerA.field)
        },
        playerB: { 
          ...prev.playerB, 
          tokens: isA ? Math.min(prev.playerB.tokens + 2, 10) : prev.playerB.tokens,
          hasDrawnThisTurn: false,
          attacksThisTurn: 0, 
          hasBeenAttackedThisTurn: false, 
          field: resetField(prev.playerB.field)
        },
      };
    });
  };

  const handleSkillDiscard = (cardIndex: number, player: "A" | "B") => {
    if (!pendingSkill || !state || pendingSkill.name !== "먹보") return;

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
      const targetUnit = targetPlayer.field[pendingSkill.slot as "is"|"m"|"os"];

      if (targetUnit) {
        const healAmount = 500; 
        const maxHp = Number(targetUnit.hp);
        targetUnit.currentHp = Math.min(maxHp, targetUnit.currentHp + healAmount);
        (targetUnit as any).skillLastUsedGlobalTurn = prev.globalTurnCount; 
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
    setTimeout(() => alert(`🍔 모모가 [${discardedCard.name}] 카드를 버리고(먹어치우고) 체력을 1000 회복했습니다!`), 50);
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
    const isSlotOccupied = slot === "is" ? targetField.is : slot === "m" ? targetField.m : slot === "os" ? targetField.os : targetField.spell;
    
    if (isSlotOccupied !== null) {
      alert("이미 카드가 배치된 자리입니다.");
      return;
    }

    const currentTokens = isPlayerA ? state.playerA.tokens : state.playerB.tokens;
    const cost = Number(card.cost) || 0;
    if (currentTokens < cost) {
      alert(`토큰이 부족합니다! (필요 코스트: ${cost}, 현재 토큰: ${currentTokens})`);
      return;
    }

    setState(prev => {
      if (!prev) return prev;
      
      const newHand = Array.from(isPlayerA ? prev.playerA.hand : prev.playerB.hand);
      newHand.splice(cardIndex, 1);

      const updatedField = {
        is: slot === "is" ? card : targetField.is,
        m: slot === "m" ? card : targetField.m,
        os: slot === "os" ? card : targetField.os,
        spell: slot === "spell" ? card : targetField.spell
      };

      if (isPlayerA) {
        return {
          ...prev,
          playerA: {
            ...prev.playerA,
            tokens: prev.playerA.tokens - cost,
            hand: newHand,
            field: updatedField
          }
        };
      } else {
        return {
          ...prev,
          playerB: {
            ...prev.playerB,
            tokens: prev.playerB.tokens - cost,
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

    if (attackerCard.name === "렴초") {
      alert("렴초는 다른 유닛을 공격하거나 지정할 수 없습니다. 반드시 자기 자신을 선택해 체력을 회복하세요.");
      setAttackingSlot(null);
      setAttackOptionOverride(null);
      return;
    }

    // ⭐️ [집중 사격] 버프 확인 - 다굴 금지 룰 면제
    const hasConcentratedFire = (attackerCard as any).hasConcentratedFire;

    if (targetPlayerState.hasBeenAttackedThisTurn && !hasConcentratedFire) {
      alert('다른 유닛이 이미 상대 플레이어를 공격했습니다. (플레이어 다구리 금지)');
      setAttackingSlot(null);
      setAttackOptionOverride(null);
      return;
    }

    const baseAtkRaw = attackOptionOverride !== null ? attackOptionOverride : String(attackerCard.atk || "0");
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
              updatedUnit.currentHp = Math.min(Number(updatedUnit.hp), updatedUnit.currentHp + fieldHealAmount);
            }
            if (fieldBuffKey) {
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
  };

  const handleFieldClick = (e: React.MouseEvent, player: "A" | "B", slot: "is" | "m" | "os" | "spell", card: FieldCard | null) => {
    e.stopPropagation(); 
    if (winner) return;
    
    const cleanupSkillLinksOnDeath = (deadCard: FieldCard, newPA: PlayerState, newPB: PlayerState, currentGlobalTurn: number) => {
      if ((deadCard as any).hasBanjitgori && (deadCard as any).linkedSource) {
          const [sPlayer, sSlot] = (deadCard as any).linkedSource.split('-');
          const sField = sPlayer === "A" ? newPA.field : newPB.field;
          if (sField[sSlot as "is"|"m"|"os"]) {
              sField[sSlot as "is"|"m"|"os"] = { 
                ...sField[sSlot as "is"|"m"|"os"]!, 
                isSkillActive: false, 
                linkedTarget: null, 
                skillLastUsedGlobalTurn: currentGlobalTurn 
              };
          }
      }
      if ((deadCard as any).isSkillActive && (deadCard as any).linkedTarget) {
          const [tPlayer, tSlot] = (deadCard as any).linkedTarget.split('-');
          const tField = tPlayer === "A" ? newPA.field : newPB.field;
          if (tField[tSlot as "is"|"m"|"os"]) {
              tField[tSlot as "is"|"m"|"os"] = { 
                ...tField[tSlot as "is"|"m"|"os"]!, 
                hasBanjitgori: false, 
                linkedSource: null 
              };
          }
      }
    };

    if (pendingSkill && pendingSkill.name === "마법의 반짓고리") {
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

        if (eristina && target) {
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
      setTimeout(() => alert(`🎀 에리스티나가 [${card.name}]에게 [반짓고리] 버프를 연결했습니다!\n(대상이 받는 모든 피해 25% 감소 & 도발 효과 부여)`), 50);
      return;
    }

    if (pendingSecondaryAttack) {
      const targetId = `${player}-${slot}`;

      if (player !== pendingSecondaryAttack.attackerPlayer && slot !== "spell" && card) {
        if (pendingSecondaryAttack.hitTargets.includes(targetId)) {
          alert("이미 이 연쇄 공격의 대상이 된 유닛입니다. 다른 유닛을 선택해주세요.");
          return; 
        }

        const attackerPlayer = pendingSecondaryAttack.attackerPlayer;
        const attackerSlotName = pendingSecondaryAttack.attackerSlotName;
        const attackerField = attackerPlayer === "A" ? state!.playerA.field : state!.playerB.field;
        const attackerCard = attackerField[attackerSlotName];

        let damage = pendingSecondaryAttack.damage;
        
        if ((card as any).hasBanjitgori) {
           damage = Math.floor((damage * 0.75) / 50) * 50;
        }

        const isDefending = getActiveStatuses(card, null).includes("방어력 +200");
        const actualDamage = isDefending && damage > 100 ? Math.max(100, damage - 200) : damage;

        const newHp = card.currentHp - actualDamage;
        const isDestroyed = newHp <= 0;

        let fieldHealAmount = 0;
        let fieldBuffKey = "";
        let skillUpdates = {};

        if (attackerCard) {
            skillUpdates = applyPostAttackSkills(attackerCard, { 
              damageDealt: actualDamage, 
              targetDestroyed: isDestroyed,
              applyFieldHeal: (amt) => fieldHealAmount = amt,
              applyFieldBuff: (key) => fieldBuffKey = key
            });
        }

        const targetPlayerState = player === "A" ? state!.playerA : state!.playerB;
        const willBeEmpty = isDestroyed && 
          (slot === "is" ? true : targetPlayerState.field.is === null) &&
          (slot === "m" ? true : targetPlayerState.field.m === null) &&
          (slot === "os" ? true : targetPlayerState.field.os === null);

        setState(prev => {
          if (!prev) return prev;
          const newPlayerA = { ...prev.playerA, field: { ...prev.playerA.field } };
          const newPlayerB = { ...prev.playerB, field: { ...prev.playerB.field } };
          
          const updatedTarget = { ...card, currentHp: newHp }; 
          
          if (player === "A") newPlayerA.field[slot as "is"|"m"|"os"] = isDestroyed ? null : updatedTarget;
          else newPlayerB.field[slot as "is"|"m"|"os"] = isDestroyed ? null : updatedTarget;
          
          if (attackerCard) {
            const updatedAttacker = { ...attackerCard, ...skillUpdates };
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
                    updatedUnit.currentHp = Math.min(Number(updatedUnit.hp), updatedUnit.currentHp + fieldHealAmount);
                  }
                  if (fieldBuffKey) {
                    (updatedUnit as any)[fieldBuffKey] = true;
                  }
                  activePlayer.field[s as "is"|"m"|"os"] = updatedUnit;
                }
              });
            }
          }

          if (isDestroyed) {
             cleanupSkillLinksOnDeath(card, newPlayerA, newPlayerB, prev.globalTurnCount);
          }

          const newRewindCards = isDestroyed ? [...prev.rewindCards, card] : prev.rewindCards;
          return { ...prev, rewindCards: newRewindCards, playerA: newPlayerA, playerB: newPlayerB };
        });

        const newHitsRemaining = pendingSecondaryAttack.hitsRemaining - 1;

        setTimeout(() => {
          let msg = isDestroyed
            ? `💥 연쇄 공격 치명타! 추가 ${actualDamage} 데미지로 적 유닛을 파괴했습니다!`
            : `⚡ 연쇄 공격 적중! 적 유닛에게 ${actualDamage}의 추가 데미지를 입혔습니다.`;

          if ((card as any).hasBanjitgori) {
             msg = `🎀 [반짓고리] 효과로 받는 피해가 25% 감소되었습니다!\n` + msg;
          }
          if (isDefending && damage > 100) {
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
      const attackerField = attackerPlayer === "A" ? state!.playerA.field : state!.playerB.field;
      const attackerCard = attackerField[attackerSlotName];

      if (attackerCard && attackerCard.name === "렴초") {
        if (player === attackerPlayer && slot === attackerSlotName) {
          const healAmount = parseInt(String(attackerCard.atk).replace(/[^0-9]/g, '')) || 500;
          const maxHp = Number(attackerCard.hp);
          const newHp = Math.min(maxHp, attackerCard.currentHp + healAmount);
          const actualHeal = newHp - attackerCard.currentHp;

          setState(prev => {
            if (!prev) return prev;
            const newPlayerA = { ...prev.playerA, field: { ...prev.playerA.field } };
            const newPlayerB = { ...prev.playerB, field: { ...prev.playerB.field } };
            
            const updatedAttacker = { ...attackerCard, currentHp: newHp, hasAttacked: true };
            
            if (attackerPlayer === "A") {
              newPlayerA.field[attackerSlotName] = updatedAttacker;
              newPlayerA.attacksThisTurn = (newPlayerA.attacksThisTurn || 0) + 1;
            } else {
              newPlayerB.field[attackerSlotName] = updatedAttacker;
              newPlayerB.attacksThisTurn = (newPlayerB.attacksThisTurn || 0) + 1;
            }

            return { ...prev, playerA: newPlayerA, playerB: newPlayerB };
          });

          setTimeout(() => alert(`🌿 [렴초]가 자신의 체력을 ${actualHeal}만큼 회복했습니다!`), 50);
          setAttackingSlot(null);
          setAttackOptionOverride(null);
          return;
        } else {
          alert("렴초는 적을 공격할 수 없습니다. 자기 자신을 선택해 체력을 회복하세요.");
          return;
        }
      }
      if (player !== attackerPlayer && slot !== "spell" && card) {
        
        const targetPlayerState = player === "A" ? state!.playerA : state!.playerB;
        const fields = [targetPlayerState.field.is, targetPlayerState.field.m, targetPlayerState.field.os];
        const tauntExists = fields.some(c => c && (getActiveStatuses(c, null).includes("도발") || (c as any).hasBanjitgori));
        const isTargetTaunted = getActiveStatuses(card, null).includes("도발") || (card as any).hasBanjitgori;

        if (tauntExists && !isTargetTaunted) {
           alert("적 필드에 [도발] 능력을 가진 유닛이 있습니다! 도발 유닛을 먼저 공격해야 합니다.");
           return; 
        }

        if (attackerCard) {
          // ⭐️ [집중 사격] 버프 확인 - 다굴 금지 룰 면제
          const hasConcentratedFire = (attackerCard as any).hasConcentratedFire;

          if (card.hasBeenAttackedThisTurn && !isTargetTaunted && !hasConcentratedFire) {
            alert("다른 유닛이 이미 이 유닛을 공격했습니다.\n(단, [도발] 효과를 가진 유닛은 한 턴에 여러 번 공격받을 수 있습니다.)");
            setAttackingSlot(null);
            setAttackOptionOverride(null);
            return;
          }

          const baseAtkRaw = attackOptionOverride !== null ? attackOptionOverride : String(attackerCard.atk || "0");
          const atkRaw = baseAtkRaw.replace(/[\(\)]/g, ""); 
          const atkRawLower = atkRaw.toLowerCase();
          
          let primaryDamage = 0;
          let secondaryDamage = 0;
          let secondaryHits = 0;
          let attackType = "NORMAL"; 

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

          let actualPrimaryDamage = primaryDamage;
          if ((card as any).hasBanjitgori) {
             actualPrimaryDamage = Math.floor((actualPrimaryDamage * 0.75) / 50) * 50;
          }

          const isDefending = getActiveStatuses(card, null).includes("방어력 +200");
          if (isDefending && actualPrimaryDamage > 100) {
             actualPrimaryDamage = Math.max(100, actualPrimaryDamage - 200);
          }

          const newHp = card.currentHp - actualPrimaryDamage;
          const isDestroyed = newHp <= 0;

          const willBeEmpty = isDestroyed && 
            (slot === "is" ? true : targetPlayerState.field.is === null) &&
            (slot === "m" ? true : targetPlayerState.field.m === null) &&
            (slot === "os" ? true : targetPlayerState.field.os === null);

          let fieldHealAmount = 0;
          let fieldBuffKey = "";

          const skillUpdates = applyPostAttackSkills(attackerCard, { 
             damageDealt: actualPrimaryDamage, 
             targetDestroyed: isDestroyed,
             applyFieldHeal: (amt) => fieldHealAmount = amt,
             applyFieldBuff: (key) => fieldBuffKey = key
          });

          setState(prev => {
            if (!prev) return prev;
            
            const newPlayerA = { ...prev.playerA, field: { ...prev.playerA.field } };
            const newPlayerB = { ...prev.playerB, field: { ...prev.playerB.field } };
            
            const updatedTarget = { ...card, currentHp: newHp, hasBeenAttackedThisTurn: true }; 
            const updatedAttacker = { ...attackerCard, hasAttacked: true, ...skillUpdates }; 
            
            if (player === "A") newPlayerA.field[slot as "is"|"m"|"os"] = isDestroyed ? null : updatedTarget;
            else newPlayerB.field[slot as "is"|"m"|"os"] = isDestroyed ? null : updatedTarget;
            
            if (attackerPlayer === "A") {
              newPlayerA.field[attackerSlotName] = updatedAttacker;
              newPlayerA.attacksThisTurn = (newPlayerA.attacksThisTurn || 0) + 1;
            } else {
              newPlayerB.field[attackerSlotName] = updatedAttacker;
              newPlayerB.attacksThisTurn = (newPlayerB.attacksThisTurn || 0) + 1;
            }

            // ⭐️ 필드 광역 효과 적용 (불변성 훼손 버그 수정 완료)
            const activePlayer = attackerPlayer === "A" ? newPlayerA : newPlayerB;
            if (fieldHealAmount > 0 || fieldBuffKey) {
              ['is', 'm', 'os'].forEach(s => {
                const unit = activePlayer.field[s as "is"|"m"|"os"];
                if (unit) {
                  const updatedUnit = { ...unit }; // ✨ 클론본 생성
                  if (fieldHealAmount > 0) {
                    updatedUnit.currentHp = Math.min(Number(updatedUnit.hp), updatedUnit.currentHp + fieldHealAmount);
                  }
                  if (fieldBuffKey) {
                    (updatedUnit as any)[fieldBuffKey] = true;
                  }
                  activePlayer.field[s as "is"|"m"|"os"] = updatedUnit;
                }
              });
            }

            if (isDestroyed) {
               cleanupSkillLinksOnDeath(card, newPlayerA, newPlayerB, prev.globalTurnCount);
            }

            const newRewindCards = isDestroyed ? [...prev.rewindCards, card] : prev.rewindCards;

            return {
              ...prev,
              rewindCards: newRewindCards,
              playerA: newPlayerA,
              playerB: newPlayerB
            };
          });

          setTimeout(() => {
            let msg = isDestroyed 
              ? `💥 치명타! ${actualPrimaryDamage}의 데미지를 입혀 적 유닛을 파괴했습니다!` 
              : `⚔️ 공격 적중! 적 유닛에게 ${actualPrimaryDamage}의 데미지를 입혔습니다.`;

            if ((card as any).hasBanjitgori) {
               msg = `🎀 [반짓고리] 효과로 받는 피해가 25% 감소되었습니다!\n` + msg;
            }
            if (isDefending && actualPrimaryDamage > 100) {
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
      
      setAttackingSlot(null);
      setAttackOptionOverride(null);
      return;
    }

    if (!card) return; 
    const slotId = `${player}-${slot}`;
    setSelectedSlot(prev => prev === slotId ? null : slotId); 
  };

  const isTargetable = (targetPlayer: "A" | "B", slotName: string, card: FieldCard | null) => {
    if (!card) return false;
    const targetId = `${targetPlayer}-${slotName}`;
    
    if (pendingSkill && pendingSkill.name === "마법의 반짓고리") {
        return pendingSkill.player === targetPlayer && slotName !== "spell" && slotName !== pendingSkill.slot;
    }

    if (pendingSecondaryAttack) {
      return pendingSecondaryAttack.attackerPlayer !== targetPlayer && !pendingSecondaryAttack.hitTargets.includes(targetId);
    }
    
    if (attackingSlot) {
      const [attackerPlayer, attackerSlotName] = attackingSlot.split("-");
      const attackerCard = (attackerPlayer === "A" ? state!.playerA.field : state!.playerB.field)[attackerSlotName as "is"|"m"|"os"];

      if (attackerCard && attackerCard.name === "렴초") {
        return targetPlayer === attackerPlayer && slotName === attackerSlotName;
      }

      if (attackerPlayer !== targetPlayer) {
        const targetPlayerState = targetPlayer === "A" ? state!.playerA : state!.playerB;
        const fields = [targetPlayerState.field.is, targetPlayerState.field.m, targetPlayerState.field.os];
        const tauntExists = fields.some(c => c && (getActiveStatuses(c, null).includes("도발") || (c as any).hasBanjitgori));

        if (tauntExists) {
          return getActiveStatuses(card, null).includes("도발") || (card as any).hasBanjitgori;
        }
        return true;
      }
    }
    return false;
  };

  const getTargetableClass = (targetPlayer: "A" | "B", slotName: string, card: FieldCard | null) => {
    if (!isTargetable(targetPlayer, slotName, card)) return '';
    
    if (pendingSkill && pendingSkill.name === "마법의 반짓고리") {
        return 'border-[3px] border-pink-400 bg-pink-500/20 shadow-[0_0_25px_rgba(244,114,182,0.9)] animate-pulse cursor-pointer z-20';
    }

    if (attackingSlot) {
      const [attackerPlayer, attackerSlotName] = attackingSlot.split("-");
      const attackerCard = (attackerPlayer === "A" ? state!.playerA.field : state!.playerB.field)[attackerSlotName as "is"|"m"|"os"];
      if (attackerCard && attackerCard.name === "렴초") {
          return 'border-[3px] border-green-400 bg-green-500/20 shadow-[0_0_25px_rgba(74,222,128,0.9)] animate-pulse cursor-pointer z-20';
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
    pendingAttackSelection, setPendingAttackSelection,
    pendingSkill, setPendingSkill,
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