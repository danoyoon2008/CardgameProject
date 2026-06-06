// hooks/useGameLogic.ts
"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import { MainView, CardRow, PullResult } from "../types/game";
import { displayNameFromUser, profileImageUrl, getRarityWeight, getShardRewardValue, getShardShopPrice } from "../utils/cardUtils";

export function useGameLogic() {
  const [mode, setMode] = useState<"global" | "friend">("global");
  const [mainView, setMainView] = useState<MainView>("battle"); 
  const [cards, setCards] = useState<CardRow[]>([]);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [cardsError, setCardsError] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<CardRow | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [volume, setVolume] = useState(50);
  const [gold, setGold] = useState(0);
  const [primeTokens, setPrimeTokens] = useState(0);
  const [cardShards, setCardShards] = useState(0);
  const [nickname, setNickname] = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);

  const [newCardIds, setNewCardIds] = useState<Set<number>>(new Set());
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  
  const [sortOption, setSortOption] = useState<string>("number_asc");
  const [filterOwnedFirst, setFilterOwnedFirst] = useState<boolean>(false);
  const [showOutline, setShowOutline] = useState<boolean>(false);

  const [ownedCardIds, setOwnedCardIds] = useState<Set<number>>(new Set());
  const [pullState, setPullState] = useState<"idle" | "pulling" | "revealing">("idle");
  const [pulledCards, setPulledCards] = useState<PullResult[]>([]);
  const [flippedCards, setFlippedCards] = useState<boolean[]>([]);
  
  const [specialFlipped, setSpecialFlipped] = useState<Set<number>>(new Set());
  const [flashState, setFlashState] = useState<{ type: 'L' | 'A', key: number } | null>(null);

  const [isShardShopOpen, setIsShardShopOpen] = useState(false);
  const [shopFilterUnowned, setShopFilterUnowned] = useState(true);
  
  const [isDealt, setIsDealt] = useState(true);
  const [isSpecialAnimating, setIsSpecialAnimating] = useState(false);
  const [unlockQueue, setUnlockQueue] = useState<CardRow[]>([]);
  const [showProbModal, setShowProbModal] = useState(false);

  const [isFlipping, setIsFlipping] = useState(false);

  const TUTORIAL_CARD_IDS = [21, 25, 30, 35, 36, 38, 39, 46, 58, 59, 62, 64];

  const [deck, setDeck] = useState<number[]>(TUTORIAL_CARD_IDS);
  const [selectedForDeck, setSelectedForDeck] = useState<CardRow | null>(null);
  const deckContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) { setAuthReady(true); return; }

    let cancelled = false;
    /** 망·VPN 등에서 getSession 이 끝나지 않을 때 UI 가 영구 로딩에 걸리지 않도록 */
    const SESSION_INIT_MS = 15_000;
    const timeoutId = window.setTimeout(() => {
      if (cancelled) return;
      console.warn(`[Supabase auth] ${SESSION_INIT_MS / 1000}s 내 세션 응답 없음 — 게스트로 계속합니다.`);
      setUser(null);
      setAuthReady(true);
    }, SESSION_INIT_MS);

    const clearInitTimeout = () => window.clearTimeout(timeoutId);

    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        clearInitTimeout();
        if (cancelled) return;
        if (error) console.error("[Supabase auth] getSession 오류:", error.message);
        setUser(session?.user ?? null);
        setAuthReady(true);
      })
      .catch((err) => {
        clearInitTimeout();
        if (cancelled) return;
        console.error("[Supabase auth] getSession 실패 — 게스트로 계속합니다.", err);
        setUser(null);
        setAuthReady(true);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      cancelled = true;
      clearInitTimeout();
      subscription.unsubscribe();
    };
  }, []);

  const resetProfileState = () => {
    setGold(0);
    setPrimeTokens(0);
    setCardShards(0);
    setNickname(null);
    setProfileLoaded(false);
  };

  useEffect(() => {
    if (!authReady) return;

    if (!user) {
      resetProfileState();
      return;
    }

    let cancelled = false;
    setProfileLoaded(false);

    async function loadUserProfile() {
      const supabase = createClient();
      if (!supabase) {
        console.error("[user_profiles] Supabase 클라이언트를 사용할 수 없습니다.");
        if (!cancelled) setProfileLoaded(true);
        return;
      }

      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user!.id)
        .single();

      if (cancelled) return;

      if (error && error.code !== "PGRST116") {
        console.error("[user_profiles] 프로필 불러오기 실패:", error.message);
        setProfileLoaded(true);
        return;
      }

      if (data) {
        setGold(Number(data.gold ?? 0));
        setCardShards(Number(data.shards ?? 0));
        setPrimeTokens(Number(data.tokens ?? 0));
        setNickname(typeof data.nickname === "string" ? data.nickname : null);
        setProfileLoaded(true);
        return;
      }

      const { error: insertError } = await supabase.from("user_profiles").insert({
        id: user!.id,
        gold: 10000,
        shards: 0,
        tokens: 0,
        nickname: null,
      });

      if (cancelled) return;

      if (insertError) {
        console.error("[user_profiles] 프로필 생성 실패:", insertError.message);
      } else {
        setGold(10000);
        setCardShards(0);
        setPrimeTokens(0);
        setNickname(null);
        setIsNewUser(true);
      }
      setProfileLoaded(true);
    }

    void loadUserProfile();
    return () => {
      cancelled = true;
    };
  }, [user, authReady]);

  useEffect(() => {
    if (!user || !profileLoaded) return;

    const timeoutId = window.setTimeout(async () => {
      const supabase = createClient();
      if (!supabase) {
        console.error("[user_profiles] Supabase 클라이언트를 사용할 수 없습니다.");
        return;
      }

      const { error } = await supabase.from("user_profiles").upsert({
        id: user.id,
        gold,
        shards: cardShards,
        tokens: primeTokens,
        nickname,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error("[user_profiles] 프로필 저장 실패:", error.message);
      }
    }, 1500);

    return () => window.clearTimeout(timeoutId);
  }, [user, profileLoaded, gold, cardShards, primeTokens, nickname]);

  useEffect(() => {
    if (!authReady) return; 
    const storageKey = user ? `powerprime_settings_${user.id}` : "powerprime_settings_guest";
    const savedData = localStorage.getItem(storageKey);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (typeof parsed.isDarkMode === "boolean") setIsDarkMode(parsed.isDarkMode);
        if (typeof parsed.volume === "number") setVolume(parsed.volume);
        if (Array.isArray(parsed.newCardIds)) setNewCardIds(new Set(parsed.newCardIds));
        if (typeof parsed.sortOption === "string") setSortOption(parsed.sortOption);
        if (typeof parsed.filterOwnedFirst === "boolean") setFilterOwnedFirst(parsed.filterOwnedFirst);
        if (typeof parsed.showOutline === "boolean") setShowOutline(parsed.showOutline);
        if (Array.isArray(parsed.deck) && parsed.deck.length === 12) setDeck(parsed.deck);
      } catch (e) { console.error("설정 로드 실패", e); }
    }
    setSettingsLoaded(true);
  }, [user, authReady]);

  useEffect(() => {
    if (!settingsLoaded) return; 
    const storageKey = user ? `powerprime_settings_${user.id}` : "powerprime_settings_guest";
    localStorage.setItem(storageKey, JSON.stringify({
      isDarkMode, volume,
      newCardIds: Array.from(newCardIds), sortOption, filterOwnedFirst, showOutline, deck
    }));
  }, [isDarkMode, volume, newCardIds, sortOption, filterOwnedFirst, showOutline, deck, user, settingsLoaded]);

  useEffect(() => {
    if (!["codex", "shop", "deck", "simulation", "multiplay"].includes(mainView) || !user) return; 
    let cancelled = false;

    async function loadCardsAndInventory() {
      if (cards.length > 0) return; 
      setCardsLoading(true); 
      setCardsError(null);
      const supabase = createClient();
      if (!supabase) { if (!cancelled) { setCardsError("연결 실패"); setCardsLoading(false); } return; }

      const { data: allCards, error: cardsError } = await supabase.from("cards").select("*");
      const { data: userInventory } = await supabase.from("user_cards").select("card_id").eq("user_id", user!.id);

      if (cancelled) return;

      if (cardsError) { 
        setCardsError(cardsError.message); 
      } else {
        let ownedIds = new Set(userInventory?.map(item => Number(item.card_id)) || []);

        if (ownedIds.size === 0) {
          const tutorialInserts = TUTORIAL_CARD_IDS.map(id => ({ user_id: user!.id, card_id: id, quantity: 1 }));
          const { error: insertError } = await supabase.from("user_cards").insert(tutorialInserts);
          if (!insertError) ownedIds = new Set(TUTORIAL_CARD_IDS);
        }

        setOwnedCardIds(ownedIds);
        const processedCards = (allCards as CardRow[]).map(card => ({
          ...card, isOwned: ownedIds.has(Number(card.id))
        }));
        setCards(processedCards);
      }
      setCardsLoading(false);
    }
    
    void loadCardsAndInventory();
    return () => { cancelled = true; };
  }, [mainView, user, cards.length]);

  const sortedCards = useMemo(() => {
    let arr = [...cards];
    arr.sort((a, b) => {
      if (filterOwnedFirst && a.isOwned !== b.isOwned) return a.isOwned ? -1 : 1;
      switch (sortOption) {
        case "rarity_desc": return getRarityWeight(b.rarity) - getRarityWeight(a.rarity) || Number(a.id) - Number(b.id);
        case "rarity_asc": return getRarityWeight(a.rarity) - getRarityWeight(b.rarity) || Number(a.id) - Number(b.id);
        case "cost_desc": return (Number(b.cost) || 0) - (Number(a.cost) || 0) || Number(a.id) - Number(b.id);
        case "cost_asc": return (Number(a.cost) || 0) - (Number(b.cost) || 0) || Number(a.id) - Number(b.id);
        case "number_desc": return Number(b.id) - Number(a.id);
        case "number_asc": default: return Number(a.id) - Number(b.id);
      }
    });
    return arr;
  }, [cards, sortOption, filterOwnedFirst]);

  const deckAvailableCards = useMemo(() => sortedCards.filter(c => c.isOwned), [sortedCards]);

  const shopAvailableCards = useMemo(() => {
    let list = cards.filter(c => getShardShopPrice(c.rarity) !== null);
    if (shopFilterUnowned) list = list.filter(c => !c.isOwned);
    return list.sort((a, b) => getRarityWeight(b.rarity) - getRarityWeight(a.rarity) || Number(a.id) - Number(b.id));
  }, [cards, shopFilterUnowned]);

  useEffect(() => {
    if (pullState === "revealing") {
      setIsDealt(false);
      const timer = setTimeout(() => setIsDealt(true), pulledCards.length * 120 + 500);
      return () => clearTimeout(timer);
    }
  }, [pullState, pulledCards.length]);

  const handleOpenCardDetail = (card: CardRow) => {
    setSelectedCard(card);
    if (card.id && newCardIds.has(Number(card.id))) {
      setNewCardIds(prev => { const next = new Set(prev); next.delete(Number(card.id)); return next; });
    }
  };

  const handleSelectForDeck = (card: CardRow) => {
    setSelectedForDeck(card);
    deckContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSlotReplace = (slotIndex: number) => {
    if (!selectedForDeck) return;
    const targetId = Number(selectedForDeck.id);
    const newDeck = [...deck];
    const existingIdx = newDeck.indexOf(targetId);
    if (existingIdx !== -1) newDeck[existingIdx] = newDeck[slotIndex];
    newDeck[slotIndex] = targetId;
    setDeck(newDeck);
    setSelectedForDeck(null); 
  };

  const handleSlotClear = (slotIndex: number) => {
    if (slotIndex < 0 || slotIndex >= deck.length) return;
    const newDeck = [...deck];
    newDeck[slotIndex] = 0;
    setDeck(newDeck);
  };

  const handleGoogleLogin = async () => {
    const supabase = createClient();
    if (!supabase) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${origin}/`, queryParams: { prompt: 'select_account' } } });
  };

  const handleLogout = async () => {
    const supabase = createClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    resetProfileState();
    setMainView("battle");
  };

  const handleResetData = async () => {
    if(!window.confirm('정말로 모든 데이터를 초기화하시겠습니까?\n보유한 카드와 재화가 모두 삭제되며, 이 작업은 되돌릴 수 없습니다.')) return;
    if (!user) return alert("로그인 정보가 없습니다.");
    try {
      const supabase = createClient();
      if (supabase) {
        await supabase.from("user_cards").delete().eq("user_id", user.id);
        const { error: profileError } = await supabase.from("user_profiles").upsert({
          id: user.id,
          gold: 10000,
          shards: 0,
          tokens: 0,
          nickname: null,
          updated_at: new Date().toISOString(),
        });
        if (profileError) console.error("[user_profiles] 초기화 실패:", profileError.message);
      }
      localStorage.removeItem(`powerprime_settings_${user.id}`);
      alert("계정이 완벽하게 초기화되었습니다.");
      window.location.reload();
    } catch (error) { console.error("초기화 실패:", error); alert("초기화 중 오류가 발생했습니다."); }
  };

  const handleEditGold = () => { const val = prompt("테스트용 골드 수량을 입력하세요:", String(gold)); if (val !== null && !isNaN(parseInt(val, 10)) && parseInt(val, 10) >= 0) setGold(parseInt(val, 10)); };
  const handleEditTokens = () => { const val = prompt("테스트용 프라임 토큰 수량을 입력하세요:", String(primeTokens)); if (val !== null && !isNaN(parseInt(val, 10)) && parseInt(val, 10) >= 0) setPrimeTokens(parseInt(val, 10)); };
  const handleEditShards = () => { const val = prompt("테스트용 카드 파편 수량을 입력하세요:", String(cardShards)); if (val !== null && !isNaN(parseInt(val, 10)) && parseInt(val, 10) >= 0) setCardShards(parseInt(val, 10)); };
  const handleEditNickname = () => {
    const val = prompt("새로운 닉네임을 입력하세요:", nickname ?? displayNameFromUser(user));
    if (val !== null) setNickname(val.trim() || null);
  };

  const handleBuyCardFromShop = async (card: CardRow) => {
    const price = getShardShopPrice(card.rarity);
    if (!price || card.isOwned) return;
    if (cardShards < price) return alert("파편이 부족합니다.");
    if (!window.confirm(`'${card.name}' 카드를 ${price} 파편으로 구매하시겠습니까?`)) return;

    setCardShards(prev => prev - price);
    const cardIdNum = Number(card.id);
    const supabase = createClient();
    if (supabase) await supabase.from("user_cards").insert([{ user_id: user!.id, card_id: cardIdNum, quantity: 1 }]);

    setOwnedCardIds(prev => new Set([...Array.from(prev), cardIdNum]));
    setNewCardIds(prev => new Set([...Array.from(prev), cardIdNum])); 
    setCards(prevCards => prevCards.map(c => Number(c.id) === cardIdNum ? { ...c, isOwned: true } : c));
    setUnlockQueue([card]);
  };

  const handleGacha = async (count: number) => {
    if (cards.length === 0) return alert("데이터를 불러오는 중입니다. 잠시만 기다려주세요.");
    const cost = count === 1 ? 300 : 3000;
    if (gold < cost) return alert("골드가 부족합니다!");

    setGold(prev => prev - cost);
    setPullState("pulling");
    setSpecialFlipped(new Set());
    setFlashState(null);
    setIsSpecialAnimating(false);
    setUnlockQueue([]);

    const commons = cards.filter(c => { const r = (c.rarity || "").toUpperCase(); return r === "C" || r === "COMMON"; });
    const rares = cards.filter(c => { const r = (c.rarity || "").toUpperCase(); return r === "R" || r === "RARE"; });
    const epics = cards.filter(c => { const r = (c.rarity || "").toUpperCase(); return r === "E" || r === "EPIC"; });
    const legendaries = cards.filter(c => { const r = (c.rarity || "").toUpperCase(); return r === "L" || r === "LEGENDARY"; });
    const ancients = cards.filter(c => { const r = (c.rarity || "").toUpperCase(); return r === "A" || r === "ANCIENT"; });

    const results: PullResult[] = [];
    const newAcquisitions = new Set<number>();
    let totalShardsGained = 0;
    const cardsToInsert: any[] = [];

    for (let i = 0; i < count; i++) {
      const roll = Math.random() * 100;
      let pool = commons;
      if (roll <= 60) pool = commons; else if (roll <= 90) pool = rares; else if (roll <= 98) pool = epics; else if (roll <= 99) pool = legendaries; else pool = ancients; 
      if (pool.length === 0) pool = cards; 

      const pickedCard = pool[Math.floor(Math.random() * pool.length)];
      const cardIdNum = Number(pickedCard.id);
      const trueShardVal = getShardRewardValue(pickedCard.rarity);
      const isAlreadyOwned = ownedCardIds.has(cardIdNum) || newAcquisitions.has(cardIdNum);

      results.push({ ...pickedCard, isNew: !isAlreadyOwned, shardReward: isAlreadyOwned ? trueShardVal : 0 });

      if (!isAlreadyOwned) {
        newAcquisitions.add(cardIdNum);
        cardsToInsert.push({ user_id: user!.id, card_id: cardIdNum, quantity: 1 });
      } else { totalShardsGained += trueShardVal; }
    }

    if (cardsToInsert.length > 0) {
      const supabase = createClient();
      if (supabase) await supabase.from("user_cards").insert(cardsToInsert);
    }

    setTimeout(() => {
      setPullState("revealing");
      setPulledCards(results);
      setFlippedCards(new Array(count).fill(false)); 
      setCardShards(prev => prev + totalShardsGained);
      setOwnedCardIds(prev => new Set([...Array.from(prev), ...Array.from(newAcquisitions)]));
      setNewCardIds(prev => new Set([...Array.from(prev), ...Array.from(newAcquisitions)]));
      setCards(prevCards => prevCards.map(c => ({ ...c, isOwned: c.isOwned || newAcquisitions.has(Number(c.id)) })));
    }, 2500); 
  };

  const handleFlipCard = (index: number) => {
    // ⭐️ 중복 카드는 회전 중에도 클릭을 허용하되, 신규 카드를 뽑아 'isFlipping' 락이 걸린 상태면 클릭 방지
    if (!isDealt || isSpecialAnimating || isFlipping || flippedCards[index] || unlockQueue.length > 0) return; 

    const card = pulledCards[index];
    const r = (card.rarity || "").toUpperCase();
    const isLegendary = r === 'L' || r === 'LEGENDARY';
    const isAncient = r === 'A' || r === 'ANCIENT';

    setFlippedCards(prev => { const n = [...prev]; n[index] = true; return n; });
    const delay = (isLegendary || isAncient) ? 3500 : 600;

    // ⭐️ 신규 카드(NEW)일 때만 글로벌 클릭 락을 겁니다.
    if (card.isNew) {
      setIsFlipping(true); 
    }

    if (isLegendary || isAncient) {
      setSpecialFlipped(prev => new Set(prev).add(index));
      setFlashState({ type: isAncient ? 'A' : 'L', key: Date.now() });
      setIsSpecialAnimating(true);
      setTimeout(() => setIsSpecialAnimating(false), delay);
    }
    
    // 신규 카드라면 애니메이션이 끝난 후 락을 풀고 해금 창(모달)을 띄웁니다.
    if (card.isNew) {
      setTimeout(() => {
        setIsFlipping(false);
        setUnlockQueue(prev => [...prev, card]);
      }, delay);
    }
  };

  const handleFlipAll = () => {
    if (!isDealt || isSpecialAnimating || isFlipping || unlockQueue.length > 0) return;

    let hasL = false; let hasA = false;
    const newFlipped = [...flippedCards]; const newSpecial = new Set(specialFlipped);
    const newlyFlippedNewCards: CardRow[] = [];

    pulledCards.forEach((card, i) => {
      if (newFlipped[i]) return;
      newFlipped[i] = true;
      const r = (card.rarity || "").toUpperCase();
      if (r === 'A' || r === 'ANCIENT') { newSpecial.add(i); hasA = true; }
      else if (r === 'L' || r === 'LEGENDARY') { newSpecial.add(i); hasL = true; }
      if (card.isNew) newlyFlippedNewCards.push(card);
    });

    const delay = (hasA || hasL) ? 3500 : 600;
    
    // ⭐️ 일괄 뒤집기 시, 신규 카드가 한 장이라도 있으면 락을 겁니다.
    if (newlyFlippedNewCards.length > 0) {
      setIsFlipping(true);
    }

    if (hasA || hasL) { setIsSpecialAnimating(true); setTimeout(() => setIsSpecialAnimating(false), delay); }
    if (hasA) setFlashState({ type: 'A', key: Date.now() }); else if (hasL) setFlashState({ type: 'L', key: Date.now() });

    setFlippedCards(newFlipped);
    setSpecialFlipped(newSpecial);
    
    // 락 해제 및 해금 큐 삽입
    if (newlyFlippedNewCards.length > 0) {
      setTimeout(() => {
        setIsFlipping(false);
        setUnlockQueue(prev => [...prev, ...newlyFlippedNewCards]);
      }, delay);
    }
  };

  const handleCloseSummon = () => { setPullState("idle"); setUnlockQueue([]); setIsSpecialAnimating(false); };

  const isAllFlipped = flippedCards.length > 0 && flippedCards.every(Boolean);
  const userAvatarUrl = user ? profileImageUrl(user) : null;
  const currentDisplayName = nickname?.trim() ? nickname : displayNameFromUser(user);
  const loginRequiredViews: MainView[] = ["shop", "deck", "codex", "simulation", "multiplay"]; 
  const isProtectedView = loginRequiredViews.includes(mainView);
  const shouldShowLoginRequired = !user && isProtectedView;

  return {
    mainView, setMainView, cards, cardsLoading, selectedCard, setSelectedCard,
    user, authReady, isDarkMode, setIsDarkMode, volume, setVolume,
    gold, primeTokens, cardShards, nickname, newCardIds,
    sortOption, setSortOption, filterOwnedFirst, setFilterOwnedFirst,
    showOutline, setShowOutline, pullState, pulledCards, flippedCards,
    specialFlipped, flashState, isShardShopOpen, setIsShardShopOpen,
    shopFilterUnowned, setShopFilterUnowned, isDealt, isSpecialAnimating,
    unlockQueue, setUnlockQueue, showProbModal, setShowProbModal,
    deck, selectedForDeck, setSelectedForDeck, deckContainerRef,
    deckAvailableCards, shopAvailableCards, userAvatarUrl, currentDisplayName,
    shouldShowLoginRequired, isAllFlipped, isNewUser,
    handleSetInitialNickname: async (newNickname: string) => {
      const supabase = createClient();
      if (!supabase || !user) return;
      await supabase.from("user_profiles").update({ nickname: newNickname }).eq("id", user.id);
      setNickname(newNickname);
      setIsNewUser(false);
    },
    handleOpenCardDetail, handleSelectForDeck, handleSlotReplace, handleSlotClear,
    handleGoogleLogin, handleLogout, handleResetData,
    handleEditGold, handleEditTokens, handleEditShards, handleEditNickname,
    handleBuyCardFromShop, handleGacha, handleFlipCard, handleFlipAll, handleCloseSummon
  };
}