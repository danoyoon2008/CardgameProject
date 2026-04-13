// components/views/SimulationView.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { IconDeck, IconUser, IconSettings } from "../ui/Icons";
import { CardRow, FieldCard } from "../../types/game";
import { applyPostAttackSkills, getActiveStatuses } from "../../utils/cardskills";

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
    spell: FieldCard | null;
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
}

interface SimulationViewProps {
  isDarkMode: boolean;
  cards: CardRow[];
  onBackToLobby?: () => void;
  onOpenDetail?: (card: CardRow) => void;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function SimulationView({ isDarkMode, cards, onBackToLobby, onOpenDetail }: SimulationViewProps) {
  const [state, setState] = useState<SimulationState | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); 
  const [isDrawModalOpen, setIsDrawModalOpen] = useState(false);
  
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
  const [isRewindModalOpen, setIsRewindModalOpen] = useState(false);
  
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
    setIsRewindModalOpen(false);
    setIsSettingsOpen(false);
    setIsDrawModalOpen(false);
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

  const handleReset = () => {
    if (winner || window.confirm("진행 중인 모든 시뮬레이션 기록을 삭제하고 초기화할까요?")) {
      localStorage.removeItem("pp_sim_save");
      setIsMenuOpen(false);
      setIsSettingsOpen(false); 
      runInitialization(cards);
    }
  };

  const handleEndTurn = (player: "A" | "B") => {
    if (!state || state.currentTurn !== player || isInitializing || winner) return;
    setSelectedSlot(null);
    setAttackingSlot(null); 
    setPendingSecondaryAttack(null); 
    setPendingAttackSelection(null);
    setPendingSkill(null); 
    setAttackOptionOverride(null);
    setIsDrawModalOpen(false); 

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
    setTimeout(() => alert(`🍔 모모가 [${discardedCard.name}] 카드를 버리고(먹어치우고) 체력을 500 회복했습니다!`), 50);
  };

  const handleDrawClick = () => {
    if (!state || isInitializing || !state.currentTurn || winner) return;
    if (state.deckCards.length === 0) return alert("덱에 더 이상 카드가 없습니다!");
    
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
    
    setIsDrawModalOpen(false); 
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
    if (targetPlayerState.hasBeenAttackedThisTurn) {
      alert('다른 유닛이 이미 상대 플레이어를 공격했습니다. (플레이어 다구리 금지)');
      setAttackingSlot(null);
      setAttackOptionOverride(null);
      return;
    }

    const attackerField = attackerPlayer === "A" ? state.playerA.field : state.playerB.field;
    const attackerCard = attackerField[attackerSlotName];
    if (!attackerCard) return;

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

    const skillUpdates = applyPostAttackSkills(attackerCard, { damageDealt: primaryDamage, targetDestroyed: false });

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
    
    // 사망 시 스킬 연결(링크)을 해제하고 에리스티나의 쿨타임을 시작시키는 헬퍼 함수
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

    // 에리스티나 '마법의 반짓고리' 스킬 적용 로직
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

    // 1. 연쇄 공격 처리
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

        let skillUpdates = {};
        if (attackerCard) {
            skillUpdates = applyPostAttackSkills(attackerCard, { damageDealt: actualDamage, targetDestroyed: isDestroyed });
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

    // 2. 1차 공격 (기본 공격) 처리
    if (attackingSlot) {
      const [attackerPlayer, attackerSlotName] = attackingSlot.split("-") as ["A" | "B", "is" | "m" | "os"];
      
      if (player !== attackerPlayer && slot !== "spell" && card) {
        
        // 도발 로직 검사
        const targetPlayerState = player === "A" ? state!.playerA : state!.playerB;
        const fields = [targetPlayerState.field.is, targetPlayerState.field.m, targetPlayerState.field.os];
        const tauntExists = fields.some(c => c && (getActiveStatuses(c, null).includes("도발") || (c as any).hasBanjitgori));
        const isTargetTaunted = getActiveStatuses(card, null).includes("도발") || (card as any).hasBanjitgori;

        if (tauntExists && !isTargetTaunted) {
           alert("적 필드에 [도발] 능력을 가진 유닛이 있습니다! 도발 유닛을 먼저 공격해야 합니다.");
           return; 
        }

        if (card.hasBeenAttackedThisTurn && !isTargetTaunted) {
          alert("다른 유닛이 이미 이 유닛을 공격했습니다.\n(단, [도발] 효과를 가진 유닛은 한 턴에 여러 번 공격받을 수 있습니다.)");
          setAttackingSlot(null);
          setAttackOptionOverride(null);
          return;
        }

        const attackerField = attackerPlayer === "A" ? state!.playerA.field : state!.playerB.field;
        const attackerCard = attackerField[attackerSlotName];

        if (attackerCard) {
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

          const skillUpdates = applyPostAttackSkills(attackerCard, { damageDealt: actualPrimaryDamage, targetDestroyed: isDestroyed });

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
    
    if (attackingSlot && attackingSlot.split("-")[0] !== targetPlayer) {
      const targetPlayerState = targetPlayer === "A" ? state!.playerA : state!.playerB;
      const fields = [targetPlayerState.field.is, targetPlayerState.field.m, targetPlayerState.field.os];
      const tauntExists = fields.some(c => c && (getActiveStatuses(c, null).includes("도발") || (c as any).hasBanjitgori));

      if (tauntExists) {
        return getActiveStatuses(card, null).includes("도발") || (card as any).hasBanjitgori;
      }
      return true;
    }
    return false;
  };

  const getTargetableClass = (targetPlayer: "A" | "B", slotName: string, card: FieldCard | null) => {
      if (!isTargetable(targetPlayer, slotName, card)) return '';
      
      if (pendingSkill && pendingSkill.name === "마법의 반짓고리") {
          return 'border-[3px] border-pink-400 bg-pink-500/20 shadow-[0_0_25px_rgba(244,114,182,0.9)] animate-pulse cursor-pointer z-20';
      }
      
      return 'border-[3px] border-white bg-white/20 shadow-[0_0_25px_rgba(255,255,255,0.9)] animate-pulse cursor-crosshair z-20';
  };

  // ⭐️ [신규] 코드가 길어지는 것을 방지하고 클래스 생성을 깔끔하게 관리하는 헬퍼 함수
  const getSlotClassName = (player: "A" | "B", slot: "is" | "m" | "os", card: FieldCard | null) => {
    const targetClass = getTargetableClass(player, slot, card);
    if (targetClass) return `${fieldCardStyle} ${targetClass}`;

    // ⭐️ [신규] 반짓고리 특수 이펙트 (핑크 & 연두 그라데이션 빛)
    if (card && (card as any).hasBanjitgori) {
       return `${fieldCardStyle} z-10 border-[2px] border-pink-400 bg-pink-900/30 shadow-[-8px_-8px_20px_rgba(236,72,153,0.6),8px_8px_20px_rgba(132,204,22,0.6)] animate-[pulse_2s_ease-in-out_infinite] ${!attackingSlot ? 'cursor-pointer hover:border-pink-300' : ''}`;
    }

    if (player === "A") {
       return `${fieldCardStyle} border-sky-500/30 bg-sky-950/20 ${card && !attackingSlot ? 'cursor-pointer hover:border-sky-400/80' : state?.currentTurn === 'A' && !attackingSlot ? 'hover:border-sky-400 transition-colors' : ''}`;
    } else {
       return `${fieldCardStyle} border-blue-500/30 bg-blue-950/20 ${card && !attackingSlot ? 'cursor-pointer hover:border-blue-400/80' : ''}`;
    }
  };

  const renderStatusBadges = (player: "A" | "B", slot: "is" | "m" | "os" | "spell", card: FieldCard | null) => {
    if (!card || !state || slot === "spell") return null;
    const oppPlayer = player === "A" ? "B" : "A";
    const oppField = oppPlayer === "A" ? state.playerA.field : state.playerB.field;
    const oppCard = oppField[slot as "is"|"m"|"os"];
    
    const statuses = getActiveStatuses(card, oppCard);
    
    if (statuses.length === 0) return null;

    return (
      <div className="absolute top-1 -right-2 flex flex-col gap-1 z-30 pointer-events-none">
        {statuses.map(status => {
          let colorClass = "bg-purple-700/95 border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.8)]"; 
          if (status === "도발") {
            colorClass = "bg-red-700/95 border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.8)]";
          } else if (status === "방어력 +200") {
            colorClass = "bg-slate-600/95 border-slate-300 shadow-[0_0_10px_rgba(148,163,184,0.8)]";
          } else if (status === "반짓고리") {
            colorClass = "bg-pink-600/95 border-pink-300 shadow-[0_0_10px_rgba(219,39,119,0.8)] text-pink-100";
          }

          return (
            <span key={status} className={`px-1.5 py-0.5 ${colorClass} text-white text-[10px] font-black tracking-widest rounded-md border animate-[bounce_2s_infinite]`}>
              {status}
            </span>
          );
        })}
      </div>
    );
  };

  const renderActionMenu = (player: "A" | "B", slot: "is" | "m" | "os" | "spell", card: FieldCard | null) => {
    if (!card || selectedSlot !== `${player}-${slot}`) return null;
    
    const isMyTurn = state?.currentTurn === player;
    
    const oppPlayer = player === "A" ? "B" : "A";
    const oppField = oppPlayer === "A" ? state?.playerA.field : state?.playerB.field;
    const oppCard = slot !== "spell" ? oppField?.[slot as "is"|"m"|"os"] : null;
    const activeStatuses = getActiveStatuses(card, oppCard || null);
    const isSilenced = activeStatuses.includes("침묵");

    const canAttack = !card.hasAttacked && isMyTurn && !isSilenced;

    return (
      <div 
        className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-2 z-30 backdrop-blur-[2px] animate-[fadeIn_0.15s_ease-out]" 
        onClick={(e) => { e.stopPropagation(); setSelectedSlot(null); }}
      >
        {slot !== "spell" && (
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              if (!canAttack) {
                  if (isSilenced) alert("이 유닛은 현재 [침묵] 상태이므로 기본 공격을 할 수 없습니다!");
                  return;
              }

              if (card.summonedTurn === `${state?.turnCount}-${state?.currentTurn}`) {
                alert("다음 턴부터 공격이 가능합니다.");
                return;
              }

              const activePlayerState = state?.currentTurn === 'A' ? state.playerA : state?.playerB;
              if ((activePlayerState?.attacksThisTurn || 0) >= 2) {
                alert("이미 모든 공격권을 사용했습니다.");
                return;
              }

              const atkStr = String(card.atk || "0").trim();
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
            className={`px-3 py-1.5 text-[10px] lg:text-xs font-black tracking-widest rounded-lg border shadow-lg transition-all w-[80%] ${!canAttack ? (isSilenced ? 'bg-purple-900 text-purple-300 border-purple-700' : 'bg-slate-700 text-slate-400 border-slate-600') + ' cursor-not-allowed opacity-80 shadow-none' : 'bg-rose-600 hover:bg-rose-500 text-white border-white/20 shadow-[0_0_15px_rgba(225,29,72,0.6)] active:scale-95'}`}
          >
            {isSilenced ? '침묵 (공격불가)' : card.hasAttacked ? '공격 완료' : !isMyTurn ? '상대 턴' : '공격'}
          </button>
        )}
        
        {/* 모모 스킬 버튼 */}
        {slot !== "spell" && card.name === "모모" && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              const lastUsedGlobalTurn = (card as any).skillLastUsedGlobalTurn || -999;
              const turnsPassed = (state?.globalTurnCount || 1) - lastUsedGlobalTurn;
              const isCooldown = turnsPassed < 4;
              if (isCooldown) return;
              setPendingSkill({ player, slot: slot as "is"|"m"|"os", name: "먹보" });
              setSelectedSlot(null);
            }}
            disabled={!isMyTurn || ((state?.globalTurnCount || 1) - ((card as any).skillLastUsedGlobalTurn || -999) < 4)}
            className={`px-3 py-1.5 text-[10px] lg:text-xs font-black tracking-widest rounded-lg border shadow-lg transition-all w-[80%] ${
              !isMyTurn ? 'bg-slate-700 text-slate-400 border-slate-600 cursor-not-allowed opacity-80 shadow-none' :
              ((state?.globalTurnCount || 1) - ((card as any).skillLastUsedGlobalTurn || -999) < 4) ? 'bg-slate-800 text-amber-600 border-amber-900 cursor-not-allowed opacity-80' : 
              'bg-amber-600 hover:bg-amber-500 text-white border-white/20 shadow-[0_0_15px_rgba(217,119,6,0.6)] active:scale-95'
            }`}
          >
            {(() => {
               if (!isMyTurn) return '상대 턴';
               const lastUsedGlobalTurn = (card as any).skillLastUsedGlobalTurn || -999;
               const turnsPassed = (state?.globalTurnCount || 1) - lastUsedGlobalTurn;
               if (turnsPassed < 4) {
                   const remainingTurns = Math.ceil((4 - turnsPassed) / 2);
                   return `${remainingTurns}*턴 뒤 사용`;
               }
               return '스킬: 먹보';
            })()}
          </button>
        )}

        {/* 에리스티나 스킬 버튼 */}
        {slot !== "spell" && card.name === "에리스티나" && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              const isSkillActive = (card as any).isSkillActive;
              if (isSkillActive) return;

              const lastUsedGlobalTurn = (card as any).skillLastUsedGlobalTurn || -999;
              const turnsPassed = (state?.globalTurnCount || 1) - lastUsedGlobalTurn;
              const isCooldown = turnsPassed < 4;
              if (isCooldown) return;

              setPendingSkill({ player, slot: slot as "is"|"m"|"os", name: "마법의 반짓고리" });
              setSelectedSlot(null);
            }}
            disabled={!isMyTurn || (card as any).isSkillActive || ((state?.globalTurnCount || 1) - ((card as any).skillLastUsedGlobalTurn || -999) < 4)}
            className={`px-3 py-1.5 text-[10px] lg:text-xs font-black tracking-widest rounded-lg border shadow-lg transition-all w-[80%] ${
              !isMyTurn ? 'bg-slate-700 text-slate-400 border-slate-600 cursor-not-allowed opacity-80 shadow-none' :
              (card as any).isSkillActive ? 'bg-pink-900 text-pink-400 border-pink-700 cursor-not-allowed opacity-80 shadow-none' :
              ((state?.globalTurnCount || 1) - ((card as any).skillLastUsedGlobalTurn || -999) < 4) ? 'bg-slate-800 text-pink-600 border-pink-900 cursor-not-allowed opacity-80' : 
              'bg-pink-600 hover:bg-pink-500 text-white border-white/20 shadow-[0_0_15px_rgba(219,39,119,0.6)] active:scale-95'
            }`}
          >
            {(() => {
               if (!isMyTurn) return '상대 턴';
               if ((card as any).isSkillActive) return '스킬 유지 중';
               const lastUsedGlobalTurn = (card as any).skillLastUsedGlobalTurn || -999;
               const turnsPassed = (state?.globalTurnCount || 1) - lastUsedGlobalTurn;
               if (turnsPassed < 4) {
                   const remainingTurns = Math.ceil((4 - turnsPassed) / 2);
                   return `${remainingTurns}*턴 뒤 사용`;
               }
               return '마법의 반짓고리';
            })()}
          </button>
        )}

        <button 
          onClick={(e) => { 
            e.stopPropagation(); 
            if (onOpenDetail) onOpenDetail(card); 
            setSelectedSlot(null); 
          }} 
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] lg:text-xs font-bold rounded-lg border border-slate-600 shadow-lg transition-colors w-[80%] active:scale-95 z-50"
        >
          상세 보기
        </button>

        <button 
          onClick={(e) => { e.stopPropagation(); setSelectedSlot(null); }}
          className="absolute top-1 right-2 text-slate-400 hover:text-white text-xs font-bold p-1"
        >
          ✕
        </button>
      </div>
    );
  };

  const renderHpBar = (card: FieldCard | null, isPlayerA: boolean = false) => {
    if (!card || !card.hp || Number(card.hp) <= 0) return null;
    
    const maxHp = Number(card.hp);
    const currentHp = card.currentHp;
    const percentage = Math.max(0, Math.min(100, (currentHp / maxHp) * 100));
    
    // ⭐️ [신규] 반짓고리 적용 시 전용 체력바 색상 (핑크색)
    let barColor = percentage > 30 ? 'bg-gradient-to-r from-green-500 to-green-400' : 'bg-gradient-to-r from-red-500 to-red-400';
    if ((card as any).hasBanjitgori) {
      barColor = 'bg-gradient-to-r from-pink-500 to-pink-300';
    }
    
    return (
      <div className={`absolute ${isPlayerA ? '-bottom-5' : '-top-5'} left-0 w-full h-3.5 bg-slate-900 rounded-[3px] border border-slate-700 overflow-hidden z-20 shadow-[0_2px_4px_rgba(0,0,0,0.5)] pointer-events-none`}>
        <div 
          className={`h-full transition-all duration-300 ${barColor}`} 
          style={{ width: `${percentage}%` }} 
        />
        <span className="absolute inset-0 flex items-center justify-center text-[9px] md:text-[10px] font-black text-white drop-shadow-[0_1px_1.5px_rgba(0,0,0,1)] leading-none tracking-tight">
          {currentHp} / {maxHp}
        </span>
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

  const fieldCardStyle = "shrink-0 w-[85px] md:w-[100px] lg:w-[120px] aspect-[1/1.58] rounded-[8px] border border-white/20 relative flex items-center justify-center shadow-lg bg-black/40 overflow-hidden transition-colors";
  const spellCardStyle = "shrink-0 w-[130px] md:w-[155px] lg:w-[190px] aspect-[1.58/1] rounded-[8px] border border-white/20 relative flex items-center justify-center shadow-lg bg-black/40 overflow-hidden transition-colors";
  const handCardStyle = "shrink-0 w-[85px] md:w-[110px] lg:w-[135px] aspect-[1/1.58] rounded-[8px] border border-white/10 flex items-center justify-center transition-all shadow-md bg-black/30 overflow-hidden relative";

  if (!state) {
    return (
      <div className={`flex flex-col items-center justify-center h-screen w-full gap-5 ${theme.bg}`}>
        <div className="text-xl font-bold text-slate-400 animate-pulse">전장 로딩 중...</div>
        <div className="text-sm font-bold text-slate-500">불러온 카드: <span className={cards?.length === 0 ? "text-rose-500" : "text-sky-500"}>{cards?.length || 0}장</span></div>
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
      </div>
    );
  }

  const activePlayerState = state.currentTurn === 'A' ? state.playerA : state.playerB;
  const isDrawDisabled = isInitializing || !state.currentTurn || activePlayerState?.hasDrawnThisTurn || activePlayerState?.hand.length >= 6;
  const isDrawHighlight = state.currentTurn && !isInitializing && !activePlayerState?.hasDrawnThisTurn && activePlayerState?.hand.length < 6 && state.deckCards.length > 0;

  const isBFieldEmpty = !state.playerB.field.is && !state.playerB.field.m && !state.playerB.field.os;
  const canAttackPlayerB = attackingSlot && attackingSlot.startsWith("A-") && isBFieldEmpty;
  
  const isAFieldEmpty = !state.playerA.field.is && !state.playerA.field.m && !state.playerA.field.os;
  const canAttackPlayerA = attackingSlot && attackingSlot.startsWith("B-") && isAFieldEmpty;

  return (
    <div 
      className={`w-full h-screen overflow-auto ${theme.bg} ${theme.text} flex items-center justify-center p-4 relative`}
      onClick={() => { setSelectedSlot(null); setAttackingSlot(null); setPendingSecondaryAttack(null); setAttackOptionOverride(null); setPendingSkill(null); }} 
    >

      {winner && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden">
          <div className={`absolute inset-0 animate-[pulse_1s_ease-in-out_infinite] mix-blend-screen pointer-events-none ${winner === 'A' ? 'bg-sky-500/40' : 'bg-rose-500/40'}`} />
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
          
          <div className={`relative z-10 flex flex-col items-center justify-center p-16 md:p-24 lg:p-32 rounded-[4rem] border-8 ${winner === 'A' ? 'border-sky-500 shadow-[0_0_150px_rgba(14,165,233,0.8)] bg-sky-950/60' : 'border-rose-500 shadow-[0_0_150px_rgba(244,63,94,0.8)] bg-rose-950/60'} animate-[scaleIn_0.5s_ease-out]`}>
            <h2 className={`text-6xl md:text-8xl lg:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b ${winner === 'A' ? 'from-white to-sky-400' : 'from-white to-rose-400'} tracking-widest drop-shadow-[0_10px_20px_rgba(0,0,0,1)] mb-4 animate-[bounce_1.5s_ease-in-out_infinite]`}>
              PLAYER {winner} WIN!
            </h2>
            <p className="text-2xl md:text-3xl font-bold text-slate-200 mb-4 text-center drop-shadow-md">
              상대 플레이어의 체력이 0이 되어 게임이 종료되었습니다.
            </p>
            
            <p className="text-xl md:text-2xl font-mono font-black text-amber-400 mb-16 tracking-widest drop-shadow-lg">
              게임 시간 : {Math.floor((state?.elapsedTime || 0) / 60)}분 {(state?.elapsedTime || 0) % 60}초
            </p>

            <div className="flex flex-col sm:flex-row gap-6 sm:gap-10 w-full sm:w-auto">
              <button 
                onClick={() => { if(onBackToLobby) onBackToLobby(); else window.location.href = '/'; }}
                className="px-10 py-5 bg-slate-800 hover:bg-slate-700 text-white rounded-3xl font-black text-xl transition-colors border-2 border-slate-600 active:scale-95 shadow-2xl w-full sm:w-auto"
              >
                로비로 돌아가기
              </button>
              <button 
                onClick={handleReset}
                className={`px-10 py-5 text-white rounded-3xl font-black text-xl transition-colors border-4 active:scale-95 shadow-2xl w-full sm:w-auto ${winner === 'A' ? 'bg-sky-600 hover:bg-sky-500 border-sky-300 shadow-[0_0_30px_rgba(14,165,233,0.6)]' : 'bg-rose-600 hover:bg-rose-500 border-rose-300 shadow-[0_0_30px_rgba(244,63,94,0.6)]'}`}
              >
                다시 플레이
              </button>
            </div>
          </div>
        </div>
      )}

      {isSettingsOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]" onClick={() => setIsSettingsOpen(false)}>
          <div className="bg-[#0a1628] border-2 border-slate-700 rounded-[2rem] p-8 w-full max-w-sm shadow-2xl flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-black text-white mb-6 border-b border-slate-700 pb-4 w-full text-center tracking-wider">게임 설정</h2>
            
            <div className="flex flex-col gap-4 w-full py-4">
              
              <div className="flex items-center justify-between w-full bg-slate-800/50 p-4 rounded-xl border border-slate-700">
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

              <div className="flex items-center justify-between w-full bg-slate-800/50 p-4 rounded-xl border border-slate-700">
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

              <div className="flex items-center justify-between w-full bg-slate-800/50 p-4 rounded-xl border border-slate-700">
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
                        <img src={card.image_url} alt={card.name} className="w-full h-full object-cover transition-all duration-300 group-hover:scale-110" />
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

      {pendingSecondaryAttack && (
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-50 bg-gradient-to-r from-amber-600 to-orange-500 text-white px-8 py-3 rounded-full font-black text-sm md:text-base shadow-[0_0_30px_rgba(245,158,11,0.8)] animate-pulse border-2 border-white/50 pointer-events-none whitespace-nowrap">
          추가 피해({pendingSecondaryAttack.damage})를 입힐 적 유닛을 선택하세요! (남은 횟수: {pendingSecondaryAttack.hitsRemaining}회)
        </div>
      )}

      {pendingSkill && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 bg-gradient-to-r from-pink-600 to-purple-500 text-white px-8 py-3 rounded-full font-black text-sm md:text-base shadow-[0_0_30px_rgba(219,39,119,0.8)] animate-pulse border-2 border-white/50 pointer-events-none whitespace-nowrap">
          {pendingSkill.name === "마법의 반짓고리" ? `[${pendingSkill.name}] 스킬 발동 대기 중! 연결할 아군 필드 유닛을 선택하세요.` : `[${pendingSkill.name}] 스킬 발동 대기 중! 패에서 버릴 카드를 선택하세요.`}
        </div>
      )}

      {isRewindModalOpen && (
        <div 
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out] p-4 md:p-8"
          onClick={() => setIsRewindModalOpen(false)}
        >
          <div 
            className="relative w-full max-w-[1200px] h-[85vh] bg-[#0a1628] border-2 border-slate-700 rounded-3xl p-6 md:p-10 flex flex-col shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden"
            onClick={(e) => e.stopPropagation()} 
          >
            <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4 shrink-0">
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-slate-200 tracking-wider">리와인드 존</h2>
                <p className="text-slate-400 text-sm mt-1">총 <span className="text-sky-400 font-bold">{state.rewindCards.length}</span>장의 카드가 파괴되어 잠들어 있습니다.</p>
              </div>
              <button 
                onClick={() => setIsRewindModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-colors active:scale-95 border border-slate-600"
              >
                ✕ 닫기
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-2 w-full custom-scrollbar">
              {state.rewindCards.length === 0 ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 opacity-60">
                  <IconDeck className="w-20 h-20 mb-4" />
                  <p className="font-bold text-xl tracking-wider">파괴된 카드가 없습니다.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 pb-10">
                  {state.rewindCards.map((rCard, idx) => (
                    <div 
                      key={`rewind-${idx}`}
                      className="group relative w-full aspect-[1/1.58] rounded-[10px] border border-slate-600 bg-black/50 overflow-hidden cursor-pointer hover:-translate-y-2 hover:shadow-[0_15px_30px_rgba(0,0,0,0.6)] hover:border-slate-300 transition-all duration-300"
                      onClick={() => { if(onOpenDetail) onOpenDetail(rCard); }}
                    >
                      {rCard.image_url ? (
                        <img src={rCard.image_url} alt={rCard.name} className="w-full h-full object-cover grayscale-[0.4] group-hover:grayscale-0 transition-all duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center p-4">
                          <span className="text-sm font-bold text-center text-slate-400 group-hover:text-slate-200">{rCard.name}</span>
                        </div>
                      )}
                      
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                        <span className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-black tracking-widest rounded-xl shadow-lg border border-white/20 transition-colors">
                          상세 보기
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

      <div className={`relative w-full max-w-[1700px] min-w-[1300px] min-h-[750px] aspect-video flex flex-row gap-6 p-6 rounded-3xl border-2 ${theme.border} shadow-[0_0_50px_rgba(0,0,0,0.6)] bg-gradient-to-b from-[#0a1628] to-[#050a14] overflow-hidden`}>
        
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
        <div className={`flex flex-col justify-between items-center shrink-0 w-[120px] h-full py-2 transition-opacity ${isInitializing ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          <div className="relative z-50 w-full flex justify-center">
            <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }} disabled={isInitializing} className={`flex h-12 w-12 items-center justify-center rounded-2xl border-2 ${theme.panel} hover:bg-slate-800/50 transition-colors shadow-lg`}>
              <IconSettings className="w-6 h-6" />
            </button>
            {isMenuOpen && (
              <div className={`absolute top-14 left-4 w-44 flex flex-col rounded-xl border-2 ${theme.panel} overflow-hidden shadow-2xl bg-[#0a1628]`}>
                <button className="px-4 py-3 text-left text-xs font-bold hover:bg-sky-500/20 text-sky-400 transition-colors" onClick={() => { setIsMenuOpen(false); if(onBackToLobby) onBackToLobby(); else window.location.href = '/'; }}>로비로 돌아가기</button>
                <button className="px-4 py-3 text-left text-xs font-bold hover:bg-rose-500/20 text-rose-400 transition-colors" onClick={handleReset}>게임 초기화</button>
                <button className="px-4 py-3 text-left text-xs font-bold hover:bg-amber-500/20 text-amber-400 transition-colors border-t border-slate-700" onClick={() => { setIsMenuOpen(false); setIsSettingsOpen(true); }}>게임 설정</button>
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
              onClick={(e) => { e.stopPropagation(); setIsRewindModalOpen(true); }}
              className="w-full aspect-[1.58/1] border-2 border-slate-600 hover:border-slate-400 border-dashed bg-black/40 hover:bg-black/60 rounded-xl flex flex-col items-center justify-center transition-all opacity-80 hover:opacity-100 active:scale-95 group"
            >
              <span className="text-[11px] font-bold text-slate-400 group-hover:text-slate-300 transition-colors">리와인드</span>
              <span className="text-2xl font-black text-slate-500 group-hover:text-slate-300 leading-tight transition-colors">{state.rewindCards.length}</span>
            </button>

          </div>
        </div>

        {/* ===================== 2. 중앙 영역 (메인 필드) ===================== */}
        <div className="shrink-0 flex flex-col items-center justify-center relative h-full pl-2 lg:pl-6">
          <div className="border-2 border-amber-600/30 bg-black/50 rounded-[2.5rem] px-8 py-10 flex flex-col items-center justify-center relative shadow-[inset_0_0_80px_rgba(0,0,0,0.7)]">
            
            {/* ⭐️ Player B 영역 (상단) */}
            <div className="flex flex-col gap-3 z-10 w-full">
              <div className="flex justify-between gap-4 w-full">
                 <div className="relative shrink-0 flex flex-col items-center">
                   {renderHpBar(state.playerB.field.is, false)}
                   <div className={getSlotClassName("B", "is", state.playerB.field.is)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, "is", "B")} onClick={(e) => handleFieldClick(e, "B", "is", state.playerB.field.is)}>
                     {state.playerB.field.is ? (
                       state.playerB.field.is.image_url ? <img src={state.playerB.field.is.image_url} alt="Is" className={`w-full h-full object-cover transition-transform duration-300 ${state.settings.isOpponentCardFlipped ? 'rotate-180' : ''}`} /> : <span className={`text-xs font-bold text-center leading-tight p-2 text-blue-200 transition-transform duration-300 ${state.settings.isOpponentCardFlipped ? 'rotate-180' : ''}`}>{state.playerB.field.is.name}</span>
                     ) : <span className="absolute -top-6 text-xs text-slate-400 font-bold whitespace-nowrap">Is</span>}
                     {renderStatusBadges("B", "is", state.playerB.field.is)}
                     {renderActionMenu("B", "is", state.playerB.field.is)}
                   </div>
                 </div>
                 <div className="relative shrink-0 flex flex-col items-center">
                   {renderHpBar(state.playerB.field.m, false)}
                   <div className={getSlotClassName("B", "m", state.playerB.field.m)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, "m", "B")} onClick={(e) => handleFieldClick(e, "B", "m", state.playerB.field.m)}>
                     {state.playerB.field.m ? (
                       state.playerB.field.m.image_url ? <img src={state.playerB.field.m.image_url} alt="M" className={`w-full h-full object-cover transition-transform duration-300 ${state.settings.isOpponentCardFlipped ? 'rotate-180' : ''}`} /> : <span className={`text-xs font-bold text-center leading-tight p-2 text-blue-200 transition-transform duration-300 ${state.settings.isOpponentCardFlipped ? 'rotate-180' : ''}`}>{state.playerB.field.m.name}</span>
                     ) : <span className="absolute -top-6 text-xs text-slate-400 font-bold whitespace-nowrap">M</span>}
                     {renderStatusBadges("B", "m", state.playerB.field.m)}
                     {renderActionMenu("B", "m", state.playerB.field.m)}
                   </div>
                 </div>
                 <div className="relative shrink-0 flex flex-col items-center">
                   {renderHpBar(state.playerB.field.os, false)}
                   <div className={getSlotClassName("B", "os", state.playerB.field.os)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, "os", "B")} onClick={(e) => handleFieldClick(e, "B", "os", state.playerB.field.os)}>
                     {state.playerB.field.os ? (
                       state.playerB.field.os.image_url ? <img src={state.playerB.field.os.image_url} alt="Os" className={`w-full h-full object-cover transition-transform duration-300 ${state.settings.isOpponentCardFlipped ? 'rotate-180' : ''}`} /> : <span className={`text-xs font-bold text-center leading-tight p-2 text-blue-200 transition-transform duration-300 ${state.settings.isOpponentCardFlipped ? 'rotate-180' : ''}`}>{state.playerB.field.os.name}</span>
                     ) : <span className="absolute -top-6 text-xs text-slate-400 font-bold whitespace-nowrap">Os</span>}
                     {renderStatusBadges("B", "os", state.playerB.field.os)}
                     {renderActionMenu("B", "os", state.playerB.field.os)}
                   </div>
                 </div>
              </div>
              <div className="flex justify-start w-full mt-2">
                 <div className={`${spellCardStyle} border-purple-500/30 bg-purple-950/20 ${state.playerB.field.spell && !attackingSlot ? 'cursor-pointer hover:border-purple-400/80' : ''}`} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, "spell", "B")} onClick={(e) => handleFieldClick(e, "B", "spell", state.playerB.field.spell)}>
                   {state.playerB.field.spell ? (
                     state.playerB.field.spell.image_url ? (
                       <img src={state.playerB.field.spell.image_url} alt="Spell" className="w-full h-full object-contain rotate-90 scale-[1.58]" />
                     ) : (
                       <span className="text-xs font-bold text-center leading-tight p-2 text-purple-200">{state.playerB.field.spell.name}</span>
                     )
                   ) : <span className="absolute -right-14 text-xs font-bold text-purple-400/80 whitespace-nowrap">스펠</span>}
                   {renderActionMenu("B", "spell", state.playerB.field.spell)}
                 </div>
              </div>
            </div>

            {/* 중앙선 */}
            <div className="w-[120%] h-[2px] bg-gradient-to-r from-transparent via-amber-500/80 to-transparent shadow-[0_0_20px_rgba(245,158,11,0.9)] shrink-0 my-8 z-0"></div>

            {/* ⭐️ Player A 영역 (하단) */}
            <div className="flex flex-col gap-3 z-10 w-full">
              <div className="flex justify-end w-full mb-2">
                 <div className={`${spellCardStyle} border-purple-500/30 bg-purple-950/20 ${state.playerA.field.spell && !attackingSlot ? 'cursor-pointer hover:border-purple-400/80' : state.currentTurn === 'A' && !attackingSlot ? 'hover:border-purple-400 transition-colors' : ''}`} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, "spell", "A")} onClick={(e) => handleFieldClick(e, "A", "spell", state.playerA.field.spell)}>
                   {state.playerA.field.spell ? (
                     state.playerA.field.spell.image_url ? (
                       <img src={state.playerA.field.spell.image_url} alt="Spell" className="w-full h-full object-contain -rotate-90 scale-[1.58]" />
                     ) : (
                       <span className="text-xs font-bold text-center leading-tight p-2 text-purple-200">{state.playerA.field.spell.name}</span>
                     )
                   ) : <span className="absolute -left-14 text-xs font-bold text-purple-400/80 whitespace-nowrap">스펠</span>}
                   {renderActionMenu("A", "spell", state.playerA.field.spell)}
                 </div>
              </div>
              <div className="flex justify-between gap-4 w-full">
                 <div className="relative shrink-0 flex flex-col items-center">
                   {renderHpBar(state.playerA.field.is, true)}
                   <div className={getSlotClassName("A", "is", state.playerA.field.is)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, "is", "A")} onClick={(e) => handleFieldClick(e, "A", "is", state.playerA.field.is)}>
                     {state.playerA.field.is ? (
                       state.playerA.field.is.image_url ? <img src={state.playerA.field.is.image_url} alt="Is" className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-center leading-tight p-2 text-sky-200">{state.playerA.field.is.name}</span>
                     ) : <span className="absolute -bottom-6 text-xs text-slate-400 font-bold whitespace-nowrap">Is</span>}
                     {renderStatusBadges("A", "is", state.playerA.field.is)}
                     {renderActionMenu("A", "is", state.playerA.field.is)}
                   </div>
                 </div>
                 <div className="relative shrink-0 flex flex-col items-center">
                   {renderHpBar(state.playerA.field.m, true)}
                   <div className={getSlotClassName("A", "m", state.playerA.field.m)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, "m", "A")} onClick={(e) => handleFieldClick(e, "A", "m", state.playerA.field.m)}>
                     {state.playerA.field.m ? (
                       state.playerA.field.m.image_url ? <img src={state.playerA.field.m.image_url} alt="M" className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-center leading-tight p-2 text-sky-200">{state.playerA.field.m.name}</span>
                     ) : <span className="absolute -bottom-6 text-xs text-slate-400 font-bold whitespace-nowrap">M</span>}
                     {renderStatusBadges("A", "m", state.playerA.field.m)}
                     {renderActionMenu("A", "m", state.playerA.field.m)}
                   </div>
                 </div>
                 <div className="relative shrink-0 flex flex-col items-center">
                   {renderHpBar(state.playerA.field.os, true)}
                   <div className={getSlotClassName("A", "os", state.playerA.field.os)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, "os", "A")} onClick={(e) => handleFieldClick(e, "A", "os", state.playerA.field.os)}>
                     {state.playerA.field.os ? (
                       state.playerA.field.os.image_url ? <img src={state.playerA.field.os.image_url} alt="Os" className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-center leading-tight p-2 text-sky-200">{state.playerA.field.os.name}</span>
                     ) : <span className="absolute -bottom-6 text-xs text-slate-400 font-bold whitespace-nowrap">Os</span>}
                     {renderStatusBadges("A", "os", state.playerA.field.os)}
                     {renderActionMenu("A", "os", state.playerA.field.os)}
                   </div>
                 </div>
              </div>
            </div>

          </div>
        </div>

        {/* ===================== 3. 우측 영역 (패, 토큰, 타이머, 종료 버튼) ===================== */}
        <div className={`flex-1 flex flex-col justify-between h-full py-2 pl-4 lg:pl-10 transition-opacity ${isInitializing ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          
          {/* 우측 상단: 상대(Player B) 패 */}
          <div className={`border-2 rounded-2xl p-4 flex items-center justify-center gap-3 h-[200px] lg:h-[250px] ${state.currentTurn === 'B' ? 'border-rose-500/60 bg-rose-950/30 shadow-[inset_0_0_30px_rgba(244,63,94,0.15)]' : 'border-slate-700/50 bg-black/20'}`}>
            <div className="w-full flex justify-center gap-2 lg:gap-4 px-2">
            {Array.from({ length: 6 }).map((_, i) => {
                const card = state.playerB.hand[i];
                const isSkillTargetB = pendingSkill && pendingSkill.player === 'B' && state.currentTurn === 'B' && card;
                
                return (
                  <div 
                    key={i} 
                    onClick={(e) => {
                      if (isSkillTargetB) {
                        e.stopPropagation();
                        handleSkillDiscard(i, "B");
                      }
                    }}
                    className={`${handCardStyle} group ${card ? (isSkillTargetB && pendingSkill.name === "먹보" ? 'border-[3px] border-amber-400 bg-amber-900/40 shadow-[0_0_25px_rgba(251,191,36,0.8)] animate-pulse cursor-pointer' : 'border-rose-400/40 bg-rose-950/60 cursor-pointer hover:-translate-y-4 hover:shadow-[0_0_20px_rgba(244,63,94,0.6)] transition-transform duration-300') : 'border-dashed border-slate-700/50 bg-transparent'}`} 
                    draggable={state.currentTurn === 'B' && !!card && !pendingSkill} 
                    onDragStart={(e) => handleDragStart(e, i, "B")}
                  >
                     {card ? (
                       <>
                         {card.image_url ? <img src={card.image_url} alt={card.name} className={`w-full h-full object-cover group-hover:opacity-100 transition-all duration-300 animate-[fadeIn_0.3s_ease-out] ${state.settings.isOpponentCardFlipped ? 'rotate-180' : ''}`} /> : <span className={`text-[10px] lg:text-[11px] font-bold text-center leading-tight p-2 text-rose-200 transition-transform duration-300 ${state.settings.isOpponentCardFlipped ? 'rotate-180' : ''}`}>{card.name}</span>}
                         
                         <div className={`absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10 backdrop-blur-[2px] ${pendingSkill ? 'hidden' : ''}`}>
                           <button onClick={(e) => { e.stopPropagation(); if(onOpenDetail) onOpenDetail(card); }} className="px-3 py-1.5 bg-slate-900/90 hover:bg-rose-600 text-white text-[10px] lg:text-xs font-bold rounded-lg border border-white/20 shadow-lg transition-colors">
                             상세 보기
                           </button>
                         </div>
                       </>
                     ) : (
                       <IconDeck className="w-8 h-8 text-rose-300 opacity-20" />
                     )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* 우측 중단: 종합 컨트롤 패널 */}
          <div className="flex flex-row items-stretch justify-between gap-4 h-[150px] lg:h-[170px] max-w-[800px] mx-auto w-full my-auto px-4">
            
            <div className="flex flex-col justify-between gap-3 flex-1">
              <div 
                className={`flex flex-col border-2 rounded-xl py-3 h-full justify-center transition-colors 
                  ${canAttackPlayerB ? 'border-[3px] border-white bg-white/20 shadow-[0_0_25px_rgba(255,255,255,0.9)] animate-pulse cursor-crosshair' : 
                    state.currentTurn === 'B' ? 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.15)] bg-black/30' : 'border-slate-700 bg-black/30'}`}
                onClick={(e) => {
                  if (canAttackPlayerB) {
                    e.stopPropagation();
                    handlePlayerAttack("B");
                  }
                }}
              >
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
              </div>
              
              <div 
                className={`flex flex-col border-2 rounded-xl py-3 h-full justify-center transition-colors 
                  ${canAttackPlayerA ? 'border-[3px] border-white bg-white/20 shadow-[0_0_25px_rgba(255,255,255,0.9)] animate-pulse cursor-crosshair' : 
                    state.currentTurn === 'A' ? 'border-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.15)] bg-black/30' : 'border-slate-700 bg-black/30'}`}
                onClick={(e) => {
                  if (canAttackPlayerA) {
                    e.stopPropagation();
                    handlePlayerAttack("A");
                  }
                }}
              >
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
              </div>
            </div>

            <div className="border-2 border-slate-700 bg-black/60 rounded-xl p-4 flex flex-col items-center justify-center w-[150px] shrink-0 shadow-inner">
              <span className="text-xs text-slate-400 font-black tracking-widest mb-2">TURN {state.turnCount}</span>
              <span className={`text-2xl font-black text-center leading-tight ${state.currentTurn === 'A' ? 'text-sky-400' : state.currentTurn === 'B' ? 'text-rose-400' : 'text-slate-500'} ${!isInitializing && 'animate-pulse'}`}>{state.currentTurn === 'A' ? 'MY\nTURN' : state.currentTurn === 'B' ? 'OPP\nTURN' : 'READY'}</span>
              
              <span className="text-base font-mono text-slate-300 tracking-widest mt-3 bg-slate-900 px-3 py-1 rounded-md border border-slate-700">
                {formatTime(state.elapsedTime || 0)}
              </span>
            </div>

            <div className="flex flex-col justify-between gap-3 w-[130px] shrink-0 h-full">
              {/* 상대 턴 종료 버튼 (Player B) */}
              <div className="flex flex-col gap-1.5 items-center flex-1 w-full">
                {state.settings.isTimeLimitEnabled ? (
                  <span className={`text-[11px] lg:text-xs font-mono font-black tracking-widest ${state.currentTurn === 'B' && state.turnTimeLeft <= 15 ? 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse scale-110 transition-all' : 'text-rose-300'}`}>
                    {state.currentTurn === 'B' ? `00:${state.turnTimeLeft.toString().padStart(2, '0')}` : '00:60'}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-600 font-bold tracking-widest">무제한</span>
                )}
                <button onClick={() => handleEndTurn("B")} disabled={state.currentTurn !== "B" || isInitializing} className={`w-full h-full rounded-xl font-black text-sm border-2 transition-all ${state.currentTurn === 'B' && !isInitializing ? 'bg-orange-600 text-white border-orange-400 hover:bg-orange-500 shadow-[0_0_15px_rgba(234,88,12,0.4)]' : 'bg-slate-800 text-slate-500 border-slate-700 opacity-50'}`}>상대 턴<br/>종료</button>
              </div>

              {/* 내 턴 종료 버튼 (Player A) */}
              <div className="flex flex-col gap-1.5 items-center flex-1 w-full">
                <button onClick={() => handleEndTurn("A")} disabled={state.currentTurn !== "A" || isInitializing} className={`w-full h-full rounded-xl font-black text-sm border-2 transition-all ${state.currentTurn === 'A' && !isInitializing ? 'bg-orange-600 text-white border-orange-400 hover:bg-orange-500 shadow-[0_0_15px_rgba(234,88,12,0.4)]' : 'bg-slate-800 text-slate-500 border-slate-700 opacity-50'}`}>내 턴<br/>종료</button>
                {state.settings.isTimeLimitEnabled ? (
                  <span className={`text-[11px] lg:text-xs font-mono font-black tracking-widest ${state.currentTurn === 'A' && state.turnTimeLeft <= 15 ? 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse scale-110 transition-all' : 'text-sky-300'}`}>
                    {state.currentTurn === 'A' ? `00:${state.turnTimeLeft.toString().padStart(2, '0')}` : '00:60'}
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
                const isSkillTargetA = pendingSkill && pendingSkill.player === 'A' && state.currentTurn === 'A' && card;

                return (
                  <div 
                    key={i} 
                    onClick={(e) => {
                      if (isSkillTargetA) {
                        e.stopPropagation();
                        handleSkillDiscard(i, "A");
                      }
                    }}
                    className={`${handCardStyle} group ${card ? (isSkillTargetA && pendingSkill.name === "먹보" ? 'border-[3px] border-amber-400 bg-amber-900/40 shadow-[0_0_25px_rgba(251,191,36,0.8)] animate-pulse cursor-pointer' : 'border-sky-400/50 cursor-pointer hover:-translate-y-4 hover:shadow-[0_0_20px_rgba(56,189,248,0.6)] transition-transform duration-300') : 'border-dashed border-slate-700/50 bg-transparent'}`} 
                    draggable={state.currentTurn === 'A' && !!card && !pendingSkill} 
                    onDragStart={(e) => handleDragStart(e, i, "A")}
                  >
                     {card ? (
                       <>
                         {card.image_url ? <img src={card.image_url} alt={card.name} className="w-full h-full object-cover group-hover:opacity-100 transition-opacity animate-[fadeIn_0.3s_ease-out]" /> : <span className="text-[10px] lg:text-[11px] font-bold text-center leading-tight p-2 text-sky-200">{card.name}</span>}
                         
                         <div className={`absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10 backdrop-blur-[2px] ${pendingSkill ? 'hidden' : ''}`}>
                           <button onClick={(e) => { e.stopPropagation(); if(onOpenDetail) onOpenDetail(card); }} className="px-3 py-1.5 bg-slate-900/90 hover:bg-sky-600 text-white text-[10px] lg:text-xs font-bold rounded-lg border border-white/20 shadow-lg transition-colors">
                             상세 보기
                           </button>
                         </div>
                       </>
                     ) : (
                       <IconDeck className="w-8 h-8 text-sky-300 opacity-20" />
                     )}
                  </div>
                )
              })}
            </div>
          </div>
          
        </div>

      </div>
    </div>
  );
}