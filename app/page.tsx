// app/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useGameLogic } from "../hooks/useGameLogic";
import { useMatchmaking, type PlayerRole } from "../hooks/useMatchmaking";
import { createClient } from "../utils/supabase/client";
import { getGlowColor, getShardShopPrice } from "../utils/cardUtils";
import { IconShard, IconDeck, IconBook, IconLock } from "../components/ui/Icons";

import { CardPlaceholder } from "../components/ui/Card";
import { CardDetailModal, NewCardUnlockModal } from "../components/ui/CardModals";
import Header from "../components/layout/Header";
import Sidebar from "../components/layout/Sidebar";
import MobileWrapper from "../components/layout/MobileWrapper";
import { useIsMobile } from "../hooks/useIsMobile";
import { usePreventUiTextSelection } from "../hooks/usePreventUiTextSelection";
import CodexView from "../components/views/CodexView";
import ShopView from "../components/views/ShopView";
import DeckView from "../components/views/DeckView";
import SettingsView from "../components/views/SettingsView";
import BattleView from "../components/views/BattleView";
import SimulationView from "../components/views/SimulationView";
import MultiplayView from "../components/views/MultiplayView";
import BossRaidView from "../components/views/BossRaidView";
import { useActiveMultiplayRoom } from "../hooks/useActiveMultiplayRoom";
import { isDeveloperAccount } from "../utils/developerAccounts";

function LoginRequiredView({
  onLogin,
  isDarkMode,
  layoutMobile = false,
}: {
  onLogin: () => void;
  isDarkMode: boolean;
  layoutMobile?: boolean;
}) {
  if (layoutMobile) {
    return (
      <div
        style={{
          width: 768,
          boxSizing: "border-box",
          padding: "48px 20px 64px",
          textAlign: "center",
          background: isDarkMode
            ? "linear-gradient(180deg, #0a1628 0%, #0d1f3c 45%, #050a14 100%)"
            : "linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%)",
          minHeight: 480,
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            margin: "0 auto 24px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: isDarkMode ? "rgba(255,255,255,0.05)" : "#e2e8f0",
          }}
        >
          <IconLock className="h-10 w-10 text-slate-500" />
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 8px", color: isDarkMode ? "#fff" : "#0f172a" }}>
          로그인이 필요한 기능입니다.
        </h2>
        <p style={{ fontSize: 14, lineHeight: 1.5, margin: "0 0 32px", color: isDarkMode ? "#94a3b8" : "#64748b", maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>
          카드 도감 열람, 덱 구성 및 상점 이용을 위해 구글 계정으로 로그인해 주세요.
        </p>
        <button
          type="button"
          onClick={onLogin}
          style={{
            height: 48,
            paddingLeft: 24,
            paddingRight: 24,
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            background: "#fff",
            color: "#0f172a",
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          구글 계정으로 로그인
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className={`mb-6 flex h-20 w-20 items-center justify-center rounded-full transition-colors ${isDarkMode ? "bg-white/5 text-slate-500" : "bg-slate-200 text-slate-400"}`}>
        <IconLock className="h-10 w-10" />
      </div>
      <h2 className="mb-2 text-2xl font-bold tracking-tight">로그인이 필요한 기능입니다.</h2>
      <p className={`mb-8 max-w-sm text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>카드 도감 열람, 덱 구성 및 상점 이용을 위해 구글 계정으로 로그인해 주세요.</p>
      <button onClick={onLogin} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-white px-6 py-2 text-base font-semibold text-slate-900 shadow-lg transition hover:bg-slate-100 active:scale-[0.98] border border-slate-200">구글 계정으로 로그인</button>
    </div>
  );
}

function NicknameSetupModal({
  onConfirm,
  isMobile,
  mode = "setup",
  initialValue = "",
  onCancel,
}: {
  onConfirm: (nickname: string) => Promise<void>;
  isMobile: boolean;
  mode?: "setup" | "edit";
  initialValue?: string;
  onCancel?: () => void;
}) {
  const [value, setValue] = useState(initialValue);
  const [checkStatus, setCheckStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [submitting, setSubmitting] = useState(false);

  const handleCheck = async () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed.length < 2) return;
    setCheckStatus("checking");
    const supabase = (await import("../utils/supabase/client")).createClient();
    if (!supabase) { setCheckStatus("idle"); return; }
    const { data } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("nickname", trimmed)
      .maybeSingle();
    setCheckStatus(data ? "taken" : "available");
  };

  const handleConfirm = async () => {
    if (checkStatus !== "available" || submitting) return;
    setSubmitting(true);
    await onConfirm(value.trim());
    setSubmitting(false);
  };

  const isValidLength = value.trim().length >= 2 && value.trim().length <= 12;

  const containerStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    background: "rgba(0,0,0,0.85)",
    backdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  };

  const boxStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: isMobile ? 340 : 440,
    background: "linear-gradient(180deg, #0d1f3c 0%, #050a14 100%)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 24,
    padding: isMobile ? "32px 24px" : "48px 40px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 20,
    boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
  };

  return (
    <div style={containerStyle}>
      <div style={boxStyle}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: isMobile ? 28 : 36, fontWeight: 900, color: "#fff", marginBottom: 8 }}>
            {mode === "edit" ? "닉네임 변경" : "⚡ PowerPrime"}
          </div>
          <div style={{ fontSize: isMobile ? 15 : 17, color: "#94a3b8", lineHeight: 1.6 }}>
            {mode === "edit" ? (
              <>새 닉네임을 입력해주세요.<br />
              <span style={{ fontSize: isMobile ? 12 : 13, color: "#64748b" }}>2~12자, 공백 불가</span></>
            ) : (
              <>닉네임을 설정해주세요.<br />
              <span style={{ fontSize: isMobile ? 12 : 13, color: "#64748b" }}>2~12자, 나중에 변경 가능합니다.</span></>
            )}
          </div>
        </div>

        <div style={{ width: "100%", display: "flex", gap: 8 }}>
          <input
            type="text"
            value={value}
            onChange={(e) => { setValue(e.target.value); setCheckStatus("idle"); }}
            onKeyDown={(e) => e.key === "Enter" && isValidLength && handleCheck()}
            placeholder="닉네임 입력..."
            maxLength={12}
            style={{
              flex: 1,
              padding: "12px 14px",
              borderRadius: 12,
              border: `1px solid ${checkStatus === "taken" ? "#ef4444" : checkStatus === "available" ? "#22c55e" : "rgba(255,255,255,0.15)"}`,
              background: "rgba(255,255,255,0.06)",
              color: "#fff",
              fontSize: 15,
              outline: "none",
            }}
          />
          <button
            type="button"
            onClick={handleCheck}
            disabled={!isValidLength || checkStatus === "checking"}
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              border: "none",
              background: isValidLength ? "#3b82f6" : "rgba(255,255,255,0.08)",
              color: isValidLength ? "#fff" : "#475569",
              fontSize: 13,
              fontWeight: 700,
              cursor: isValidLength ? "pointer" : "not-allowed",
              whiteSpace: "nowrap",
            }}
          >
            {checkStatus === "checking" ? "확인 중..." : "중복 확인"}
          </button>
        </div>

        {checkStatus === "taken" && (
          <div style={{ color: "#ef4444", fontSize: 13, fontWeight: 600, marginTop: -12 }}>
            이미 사용 중인 닉네임입니다.
          </div>
        )}
        {checkStatus === "available" && (
          <div style={{ color: "#22c55e", fontSize: 13, fontWeight: 600, marginTop: -12 }}>
            사용 가능한 닉네임입니다!
          </div>
        )}

        <button
          type="button"
          onClick={handleConfirm}
          disabled={checkStatus !== "available" || submitting}
          style={{
            width: "100%",
            padding: "14px 0",
            borderRadius: 14,
            border: "none",
            background: checkStatus === "available" ? "linear-gradient(135deg, #3b82f6, #8b5cf6)" : "rgba(255,255,255,0.08)",
            color: checkStatus === "available" ? "#fff" : "#475569",
            fontSize: 16,
            fontWeight: 900,
            cursor: checkStatus === "available" ? "pointer" : "not-allowed",
            transition: "all 0.2s",
          }}
        >
          {submitting ? (mode === "edit" ? "변경 중..." : "설정 중...") : "확인"}
        </button>
        {mode === "edit" && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{ width: "100%", padding: "10px 0", borderRadius: 12, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "#94a3b8", fontSize: 14, fontWeight: 700, cursor: "pointer", marginTop: 4 }}
          >
            취소
          </button>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const game = useGameLogic();
  const isMobile = useIsMobile();
  const [multiplayRoomId, setMultiplayRoomId] = useState<string | null>(null);
  const [multiplayRole, setMultiplayRole] = useState<PlayerRole | null>(null);
  const [multiplayOpponentNickname, setMultiplayOpponentNickname] = useState<string | null>(null);
  const [profileViewTarget, setProfileViewTarget] = useState<{ userId: string; nickname: string | null; avatarUrl: string | null } | null>(null);
  const [multiplayOpponentUserId, setMultiplayOpponentUserId] = useState<string | null>(null);
  const [multiplayOpponentAvatarUrl, setMultiplayOpponentAvatarUrl] = useState<string | null>(null);
  const [autoStartMatchmaking, setAutoStartMatchmaking] = useState(false);
  const [friendChallengeTarget, setFriendChallengeTarget] = useState<{ id: string; nickname: string } | null>(null);
  const [challengeBannerDismissed, setChallengeBannerDismissed] = useState(false);
  const [friends, setFriends] = useState<
    { id: string; nickname: string | null; last_seen_at: string | null; myFavorite?: boolean }[]
  >([]);

  const sortBattleFriends = (
    list: { id: string; nickname: string | null; last_seen_at: string | null; myFavorite?: boolean }[]
  ) =>
    [...list].sort((a, b) => {
      if (!!a.myFavorite !== !!b.myFavorite) return a.myFavorite ? -1 : 1;
      const onlineThreshold = 120000;
      const aOnline = a.last_seen_at
        ? Date.now() - new Date(a.last_seen_at).getTime() < onlineThreshold
        : false;
      const bOnline = b.last_seen_at
        ? Date.now() - new Date(b.last_seen_at).getTime() < onlineThreshold
        : false;
      if (aOnline !== bOnline) return aOnline ? -1 : 1;
      const aTime = a.last_seen_at ? new Date(a.last_seen_at).getTime() : 0;
      const bTime = b.last_seen_at ? new Date(b.last_seen_at).getTime() : 0;
      return bTime - aTime;
    });
  const [showNicknameEdit, setShowNicknameEdit] = useState(false);
  const [battleLobbyResetSignal, setBattleLobbyResetSignal] = useState(0);
  const isSimulation = game.mainView === "simulation";
  const isMultiplay = game.mainView === "multiplay";
  const isDeveloper = isDeveloperAccount(game.user?.id);
  const isFullScreenGame = isSimulation || isMultiplay;
  const useMobileLobbyWrapper = isMobile && !isFullScreenGame;

  const { activeRoom: activeMultiplayRoom, refreshActiveMultiplayRoom } = useActiveMultiplayRoom(
    game.user?.id,
    game.mainView === "battle" && !!game.user,
  );
  const { matchStatus } = useMatchmaking();
  const isGlobalPlaying = matchStatus === "searching" || matchStatus === "matched";
  // 빈 슬롯(0)을 제외하고, 실제 카드가 정확히 12장 채워졌는지 검증
  const deckIsValid =
    game.deck.length === 12 &&
    game.deck.filter((id) => id && id !== 0).length === 12;

  useEffect(() => {
    if (game.mainView === "bossraid" && !isDeveloper) {
      game.setMainView("battle");
    }
  }, [game.mainView, isDeveloper, game.setMainView]);

  useEffect(() => {
    if (game.mainView === "battle" && game.user) {
      void refreshActiveMultiplayRoom();
    }
  }, [game.mainView, game.user, refreshActiveMultiplayRoom]);

  useEffect(() => {
    if (!game.user) return;
    const loadFriends = async () => {
      const supabase = createClient();
      if (!supabase) return;
      const { data } = await supabase
        .from("friendships")
        .select("id, requester_id, addressee_id, requester_favorite, addressee_favorite")
        .eq("status", "accepted")
        .or(`requester_id.eq.${game.user!.id},addressee_id.eq.${game.user!.id}`);
      if (!data) return;
      const profiles = await Promise.all(
        data.map(async (f) => {
          const otherId = f.requester_id === game.user!.id ? f.addressee_id : f.requester_id;
          const { data: p } = await supabase
            .from("user_profiles")
            .select("id, nickname, last_seen_at")
            .eq("id", otherId)
            .maybeSingle();
          if (!p) return null;
          const myFavorite =
            f.requester_id === game.user!.id ? !!f.requester_favorite : !!f.addressee_favorite;
          return { ...p, myFavorite };
        })
      );
      setFriends(sortBattleFriends(profiles.filter(Boolean) as NonNullable<(typeof profiles)[number]>[]));
    };
    void loadFriends();
    const interval = setInterval(() => { void loadFriends(); }, 30000);
    return () => clearInterval(interval);
  }, [game.user]);

  // 친선전 알림 배너: 새 요청이 오면 표시, 1분 후 자동 종료
  useEffect(() => {
    if (!game.incomingChallenge) {
      setChallengeBannerDismissed(false);
      return;
    }
    setChallengeBannerDismissed(false);
    const t = setTimeout(() => setChallengeBannerDismissed(true), 60000);
    return () => clearTimeout(t);
  }, [game.incomingChallenge?.id]);

  const handleStartMultiplay = (roomId: string, myRole: PlayerRole) => {
    setMultiplayRoomId(roomId);
    setMultiplayRole(myRole);
    game.setMainView("multiplay");
  };

  const handleSendFriendChallenge = useCallback((friendId: string, friendNickname: string) => {
    setFriendChallengeTarget({ id: friendId, nickname: friendNickname });
    game.setMainView("battle");
  }, [game]);

  const handleSendChallenge = useCallback(async (friendId: string, mode: string) => {
    const supabase = createClient();
    if (!supabase || !game.user) return;
    await supabase.from("friend_challenges")
      .update({ status: "cancelled" })
      .eq("challenger_id", game.user.id)
      .eq("status", "pending");
    await supabase.from("friend_challenges")
      .insert({ challenger_id: game.user.id, challenged_id: friendId, mode, status: "pending" });
    game.setIsWaitingFriendAccept(true);
  }, [game]);

  const handleCancelFriendChallenge = useCallback(async () => {
    const supabase = createClient();
    if (!supabase || !game.user) return;
    await supabase
      .from("friend_challenges")
      .delete()
      .eq("challenger_id", game.user.id)
      .eq("status", "pending");
    game.setIsWaitingFriendAccept(false);
    game.setFriendChallengeCancelled(true);
    setTimeout(() => game.setFriendChallengeCancelled(false), 3000);
  }, [game]);

  const handleAcceptChallenge = useCallback(async (challengeId: string, challengerId: string) => {
    const supabase = createClient();
    if (!supabase || !game.user) return;
    const now = new Date().toISOString();
    const challengeMode = game.incomingChallenge?.mode === "normal" ? "normal" : "classic";
    const { data: room, error: roomError } = await supabase.from("game_rooms").insert({
      player_a_id: challengerId,
      player_b_id: game.user.id,
      status: "playing",
      room_type: "friend",
      game_mode: challengeMode,
      player_a_last_seen: now,
      player_b_last_seen: now,
      player_a_connected: true,
      player_b_connected: true,
      updated_at: now,
    }).select().single();
    if (roomError || !room) {
      console.error("[친선전] 방 생성 실패:", roomError?.message);
      return;
    }
    await supabase.from("friend_challenges")
      .update({ status: "accepted", room_id: room.id })
      .eq("id", challengeId);
    game.setIsInFriendBattle(true);
    game.setIncomingChallenge(null);
    handleStartMultiplay(room.id, "player_b");
  }, [game, game.incomingChallenge]);

  const handleRejectChallenge = useCallback(async (challengeId: string) => {
    const supabase = createClient();
    if (!supabase) return;
    await supabase.from("friend_challenges").update({ status: "rejected" }).eq("id", challengeId);
    game.setIncomingChallenge(null);
  }, [game]);

  useEffect(() => {
    const handler = (e: Event) => {
      const { roomId } = (e as CustomEvent<{ roomId: string }>).detail;
      game.setIsInFriendBattle(true);
      game.setIsWaitingFriendAccept(false);
      handleStartMultiplay(roomId, "player_a");
    };
    window.addEventListener("friendChallengeAccepted", handler);
    return () => window.removeEventListener("friendChallengeAccepted", handler);
  }, [game]);

  const handleBackFromMultiplay = () => {
    setMultiplayRoomId(null);
    setMultiplayRole(null);
    setMultiplayOpponentNickname(null);
    setMultiplayOpponentUserId(null);
    setMultiplayOpponentAvatarUrl(null);
    game.setIsInFriendBattle(false);
    game.setMainView("battle");
    void refreshActiveMultiplayRoom();
  };

  const handleRematchFromMultiplay = () => {
    setMultiplayRoomId(null);
    setMultiplayRole(null);
    game.setIsInFriendBattle(false);
    setAutoStartMatchmaking(true);
    game.setMainView("battle");
  };

  usePreventUiTextSelection(!isMobile);

  /** 시뮬레이션 이탈 시 모바일 터치 잠금 클래스가 남지 않도록 보장 */
  useEffect(() => {
    if (game.mainView === "simulation" || game.mainView === "multiplay") return;
    document.documentElement.classList.remove("pp-simulation-mobile-touch-lock");
    document.body.classList.remove("pp-simulation-mobile-touch-lock");
  }, [game.mainView]);

  const lobbyChrome = (
    <>
      <Header 
        authReady={game.authReady} user={game.user} userAvatarUrl={game.userAvatarUrl} currentDisplayName={game.currentDisplayName} isDarkMode={game.isDarkMode}
        gold={game.gold} primeTokens={game.primeTokens} cardShards={game.cardShards} handleGoogleLogin={game.handleGoogleLogin}
        handleEditGold={game.handleEditGold} handleEditTokens={game.handleEditTokens} handleEditShards={game.handleEditShards}
        handleEditNickname={() => setShowNicknameEdit(true)}
        onSendFriendChallenge={handleSendFriendChallenge}
        mainView={game.mainView}
        multiplayOpponentNickname={multiplayOpponentNickname}
        externalProfileTarget={profileViewTarget}
        onExternalProfileHandled={() => setProfileViewTarget(null)}
      />

      <div className="flex w-full min-h-0 flex-1 flex-col gap-6 pl-2 pr-4 pb-6 pt-4 sm:pl-3 sm:pr-6 sm:pb-8 sm:pt-5 lg:flex-row lg:gap-5 lg:pl-3 lg:pr-8">
        
        <Sidebar mainView={game.mainView} setMainView={game.setMainView} isDarkMode={game.isDarkMode} newCardIdsSize={game.newCardIds.size} isDeveloper={isDeveloper} />

        <main className={`order-1 flex min-h-full flex-1 flex-col lg:order-2 ${game.mainView === "battle" ? "justify-center" : "justify-start overflow-y-auto"}`}>
          {game.shouldShowLoginRequired ? (
            <LoginRequiredView onLogin={game.handleGoogleLogin} isDarkMode={game.isDarkMode} />
          ) : (
            <>
              {game.mainView === "battle" && (
                <BattleView
                  isDarkMode={game.isDarkMode}
                  cards={game.cards}
                  onStartSimulation={() => game.setMainView("simulation")}
                  onStartMultiplay={handleStartMultiplay}
                  activeMultiplayRoom={activeMultiplayRoom ? {
                    ...activeMultiplayRoom,
                    isFriendBattle: game.isInFriendBattle,
                  } : null}
                  onRejoinMultiplay={handleStartMultiplay}
                  autoStartMatchmaking={autoStartMatchmaking}
                  onAutoMatchStarted={() => setAutoStartMatchmaking(false)}
                  incomingChallenge={game.incomingChallenge}
                  isInFriendBattle={game.isInFriendBattle}
                  isGlobalPlaying={isGlobalPlaying}
                  friendChallengeTarget={friendChallengeTarget}
                  onClearFriendChallengeTarget={() => setFriendChallengeTarget(null)}
                  onSendChallenge={handleSendChallenge}
                  onAcceptChallenge={handleAcceptChallenge}
                  onRejectChallenge={handleRejectChallenge}
                  isWaitingFriendAccept={game.isWaitingFriendAccept}
                  onCancelFriendChallenge={handleCancelFriendChallenge}
                  friendChallengeRejected={game.friendChallengeRejected}
                  friendChallengeCancelled={game.friendChallengeCancelled}
                  friends={friends}
                  onSetFriendChallengeTarget={setFriendChallengeTarget}
                  deckIsValid={deckIsValid}
                  lobbyResetSignal={battleLobbyResetSignal}
                />
              )}
              
              {game.mainView === "shop" && <ShopView gold={game.gold} cardsLoading={game.cardsLoading} isDarkMode={game.isDarkMode} handleGacha={game.handleGacha} setShowProbModal={game.setShowProbModal} setIsShardShopOpen={game.setIsShardShopOpen} />}
              {game.mainView === "codex" && <CodexView cards={game.cards} loading={game.cardsLoading} sortOption={game.sortOption} setSortOption={game.setSortOption} filterOwnedFirst={game.filterOwnedFirst} setFilterOwnedFirst={game.setFilterOwnedFirst} showOutline={game.showOutline} setShowOutline={game.setShowOutline} newCardIds={game.newCardIds} onOpenDetail={game.handleOpenCardDetail} />}
              {game.mainView === "deck" && <DeckView deck={game.deck} cards={game.cards} deckAvailableCards={game.deckAvailableCards} deckContainerRef={game.deckContainerRef} selectedForDeck={game.selectedForDeck} setSelectedForDeck={game.setSelectedForDeck} handleSlotReplace={game.handleSlotReplace} handleSlotClear={game.handleSlotClear} handleClearAllDeck={game.handleClearAllDeck} handleOpenCardDetail={game.handleOpenCardDetail} handleSelectForDeck={game.handleSelectForDeck} showOutline={game.showOutline} setShowOutline={game.setShowOutline} sortOption={game.sortOption} setSortOption={game.setSortOption} cardsLoading={game.cardsLoading} decks={game.decks} activeDeckIndex={game.activeDeckIndex} handleSelectDeckSlot={game.handleSelectDeckSlot} />}
              {game.mainView === "settings" && <SettingsView isDarkMode={game.isDarkMode} setIsDarkMode={game.setIsDarkMode} volume={game.volume} setVolume={game.setVolume} user={game.user} handleLogout={game.handleLogout} handleResetData={game.handleResetData} />}
              {game.mainView === "bossraid" && isDeveloper && (
                <BossRaidView
                  cards={game.cards}
                  onBackToLobby={() => game.setMainView("battle")}
                />
              )}
            </>
          )}
        </main>
      </div>
    </>
  );

  const mobileLobbyMain = game.shouldShowLoginRequired ? (
    <LoginRequiredView onLogin={game.handleGoogleLogin} isDarkMode={game.isDarkMode} layoutMobile />
  ) : (
    <>
      {game.mainView === "battle" && (
        <BattleView
          isDarkMode={game.isDarkMode}
          layoutMobile
          cards={game.cards}
          onStartSimulation={() => game.setMainView("simulation")}
          onStartMultiplay={handleStartMultiplay}
          activeMultiplayRoom={activeMultiplayRoom ? {
            ...activeMultiplayRoom,
            isFriendBattle: game.isInFriendBattle,
          } : null}
          onRejoinMultiplay={handleStartMultiplay}
          autoStartMatchmaking={autoStartMatchmaking}
          onAutoMatchStarted={() => setAutoStartMatchmaking(false)}
          incomingChallenge={game.incomingChallenge}
          isInFriendBattle={game.isInFriendBattle}
          isGlobalPlaying={isGlobalPlaying}
          friendChallengeTarget={friendChallengeTarget}
          onClearFriendChallengeTarget={() => setFriendChallengeTarget(null)}
          onSendChallenge={handleSendChallenge}
          onAcceptChallenge={handleAcceptChallenge}
          onRejectChallenge={handleRejectChallenge}
          isWaitingFriendAccept={game.isWaitingFriendAccept}
          onCancelFriendChallenge={handleCancelFriendChallenge}
          friendChallengeRejected={game.friendChallengeRejected}
          friendChallengeCancelled={game.friendChallengeCancelled}
          friends={friends}
          onSetFriendChallengeTarget={setFriendChallengeTarget}
          deckIsValid={deckIsValid}
          lobbyResetSignal={battleLobbyResetSignal}
        />
      )}
      {game.mainView === "shop" && (
        <ShopView
          layoutMobile
          gold={game.gold}
          cardsLoading={game.cardsLoading}
          isDarkMode={game.isDarkMode}
          handleGacha={game.handleGacha}
          setShowProbModal={game.setShowProbModal}
          setIsShardShopOpen={game.setIsShardShopOpen}
        />
      )}
      {game.mainView === "codex" && (
        <CodexView
          layoutMobile
          isDarkMode={game.isDarkMode}
          cards={game.cards}
          loading={game.cardsLoading}
          sortOption={game.sortOption}
          setSortOption={game.setSortOption}
          filterOwnedFirst={game.filterOwnedFirst}
          setFilterOwnedFirst={game.setFilterOwnedFirst}
          showOutline={game.showOutline}
          setShowOutline={game.setShowOutline}
          newCardIds={game.newCardIds}
          onOpenDetail={game.handleOpenCardDetail}
        />
      )}
      {game.mainView === "deck" && (
        <DeckView
          layoutMobile
          isDarkMode={game.isDarkMode}
          deck={game.deck}
          cards={game.cards}
          deckAvailableCards={game.deckAvailableCards}
          deckContainerRef={game.deckContainerRef}
          selectedForDeck={game.selectedForDeck}
          setSelectedForDeck={game.setSelectedForDeck}
          handleSlotReplace={game.handleSlotReplace}
          handleSlotClear={game.handleSlotClear}
          handleClearAllDeck={game.handleClearAllDeck}
          handleOpenCardDetail={game.handleOpenCardDetail}
          handleSelectForDeck={game.handleSelectForDeck}
          showOutline={game.showOutline}
          setShowOutline={game.setShowOutline}
          sortOption={game.sortOption}
          setSortOption={game.setSortOption}
          cardsLoading={game.cardsLoading}
          decks={game.decks}
          activeDeckIndex={game.activeDeckIndex}
          handleSelectDeckSlot={game.handleSelectDeckSlot}
        />
      )}
      {game.mainView === "settings" && (
        <SettingsView
          layoutMobile
          isDarkMode={game.isDarkMode}
          setIsDarkMode={game.setIsDarkMode}
          volume={game.volume}
          setVolume={game.setVolume}
          user={game.user}
          handleLogout={game.handleLogout}
          handleResetData={game.handleResetData}
        />
      )}
      {game.mainView === "bossraid" && isDeveloper && (
        <BossRaidView cards={game.cards} onBackToLobby={() => game.setMainView("battle")} />
      )}
    </>
  );

  const mobileLobbyChrome = (
    <>
      <Header
        layoutMobile
        mainView={game.mainView}
        multiplayOpponentNickname={multiplayOpponentNickname}
        externalProfileTarget={profileViewTarget}
        onExternalProfileHandled={() => setProfileViewTarget(null)}
        setMainView={game.setMainView}
        newCardIdsSize={game.newCardIds.size}
        isDeveloper={isDeveloper}
        authReady={game.authReady}
        user={game.user}
        userAvatarUrl={game.userAvatarUrl}
        currentDisplayName={game.currentDisplayName}
        isDarkMode={game.isDarkMode}
        gold={game.gold}
        primeTokens={game.primeTokens}
        cardShards={game.cardShards}
        handleGoogleLogin={game.handleGoogleLogin}
        handleEditGold={game.handleEditGold}
        handleEditTokens={game.handleEditTokens}
        handleEditShards={game.handleEditShards}
        handleEditNickname={() => setShowNicknameEdit(true)}
        onSendFriendChallenge={handleSendFriendChallenge}
      />
      {mobileLobbyMain}
    </>
  );

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-500 ${!isMobile ? "pp-ui-no-select" : ""} ${game.isDarkMode ? "bg-gradient-to-b from-[#0a1628] via-[#0d1f3c] to-[#050a14] text-slate-100" : "bg-slate-100 text-slate-900"}`}
      onContextMenu={!isMobile ? e => e.preventDefault() : undefined}
    >
      {game.isNewUser && (
        <NicknameSetupModal
          onConfirm={game.handleSetInitialNickname}
          isMobile={isMobile}
        />
      )}

      {showNicknameEdit && game.user && (
        <NicknameSetupModal
          mode="edit"
          initialValue={game.nickname ?? ""}
          isMobile={isMobile}
          onConfirm={async (nn) => {
            await game.handleSetInitialNickname(nn);
            setShowNicknameEdit(false);
          }}
          onCancel={() => setShowNicknameEdit(false)}
        />
      )}

      {game.incomingChallenge && game.mainView !== "multiplay" && !challengeBannerDismissed && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 9998,
          display: "flex", justifyContent: "center", padding: "12px 16px",
          pointerEvents: "none",
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            background: "linear-gradient(135deg, rgba(30,41,59,0.97), rgba(15,23,42,0.97))",
            border: "1px solid rgba(99,102,241,0.4)",
            borderRadius: 14, padding: "10px 16px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            maxWidth: 520, width: "100%",
            pointerEvents: "auto",
          }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", overflow: "hidden", flexShrink: 0, background: "linear-gradient(135deg, rgba(14,165,233,0.35), rgba(79,70,229,0.45))", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {game.incomingChallenge.challengerAvatarUrl ? (
                <img src={game.incomingChallenge.challengerAvatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 16 }}>👤</span>
              )}
            </div>
            <div style={{ flex: 1, fontSize: 13, color: "#e2e8f0", lineHeight: 1.4 }}>
              <span style={{ fontWeight: 800, color: "#a5b4fc" }}>{game.incomingChallenge.challengerNickname}</span>
              님이 <span style={{ fontWeight: 700, color: "#fbbf24" }}>{game.incomingChallenge.mode === "normal" ? "일반전" : "클래식"}</span> 모드 친선전을 요청했습니다.
            </div>
            <button
              type="button"
              onClick={() => {
                game.setMainView("battle");
                setBattleLobbyResetSignal((n) => n + 1);
              }}
              style={{
                flexShrink: 0, padding: "7px 16px", borderRadius: 10, border: "none",
                background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", color: "#fff",
                fontSize: 13, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              바로 가기
            </button>
            <button
              type="button"
              onClick={() => setChallengeBannerDismissed(true)}
              title="알림 닫기"
              style={{
                flexShrink: 0, width: 30, height: 30, borderRadius: 8, border: "none",
                background: "rgba(255,255,255,0.08)", color: "#94a3b8",
                fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .perspective-1000 { perspective: 1000px; } .preserve-3d { transform-style: preserve-3d; } .backface-hidden { backface-visibility: hidden; } .rotate-y-180 { transform: rotateY(180deg); }
        @keyframes epicFlashL { 0% { background: rgba(255,255,255,0); } 5% { background: rgba(255,255,255,0.85); } 20% { background: rgba(234,179,8,0.4); } 100% { background: rgba(234,179,8,0); } }
        @keyframes epicFlashA { 0% { background: rgba(255,255,255,0); } 5% { background: rgba(255,255,255,0.85); } 20% { background: rgba(239,68,68,0.4); } 100% { background: rgba(239,68,68,0); } }
        @keyframes epicWave { 0% { transform: scale(0.5); opacity: 0.7; } 100% { transform: scale(15); opacity: 0; } }
        @keyframes superSpin { 0% { transform: scale(1) translateY(0) rotateY(0deg); animation-timing-function: ease-in; } 15% { transform: scale(1.5) translateY(-30px) rotateY(540deg); animation-timing-function: linear; } 85% { transform: scale(1.5) translateY(-30px) rotateY(2880deg); animation-timing-function: ease-out; } 100% { transform: scale(1) translateY(0) rotateY(3420deg); } }
        .animate-superSpin { animation: superSpin 3.5s forwards; }
        @keyframes flyFromDeck { 0% { opacity: 0; transform: translateY(60vh) scale(0.1) rotateZ(-20deg); } 50% { opacity: 1; transform: translateY(-5vh) scale(1.05) rotateZ(5deg); } 100% { opacity: 1; transform: translateY(0) scale(1) rotateZ(0deg); } }
      `}} />

      {isFullScreenGame ? (
        <>
        {isMultiplay && game.user ? (
          <Header
            modalOnly
            layoutMobile={isMobile}
            mainView={game.mainView}
            externalProfileTarget={profileViewTarget}
            onExternalProfileHandled={() => setProfileViewTarget(null)}
            authReady={game.authReady}
            user={game.user}
            userAvatarUrl={game.userAvatarUrl}
            currentDisplayName={game.currentDisplayName}
            isDarkMode={game.isDarkMode}
            gold={game.gold}
            primeTokens={game.primeTokens}
            cardShards={game.cardShards}
            handleGoogleLogin={game.handleGoogleLogin}
            handleEditGold={game.handleEditGold}
            handleEditTokens={game.handleEditTokens}
            handleEditShards={game.handleEditShards}
            handleEditNickname={() => setShowNicknameEdit(true)}
            onSendFriendChallenge={handleSendFriendChallenge}
          />
        ) : null}
        <main className={`order-1 flex min-h-full flex-1 flex-col lg:order-2 justify-center`}>
          {game.shouldShowLoginRequired ? (
            <LoginRequiredView onLogin={game.handleGoogleLogin} isDarkMode={game.isDarkMode} />
          ) : game.cardsLoading ? (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
              <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sky-400 font-bold animate-pulse tracking-widest">전장 세팅을 위해 카드를 불러오는 중...</p>
            </div>
          ) : isMultiplay ? (
            multiplayRoomId && multiplayRole ? (
              <MultiplayView
                roomId={multiplayRoomId}
                myRole={multiplayRole}
                onBackToLobby={handleBackFromMultiplay}
                onRematchReady={handleRematchFromMultiplay}
                isDarkMode={game.isDarkMode}
                cards={game.cards}
                onOpenDetail={game.handleOpenCardDetail}
                myUserId={game.user?.id ?? ""}
                myNickname={game.nickname ?? null}
                roomType={game.isInFriendBattle ? "friend" : "global"}
                onOpponentNicknameResolved={setMultiplayOpponentNickname}
                onOpponentInfoResolved={(info) => {
                  setMultiplayOpponentUserId(info.userId);
                  setMultiplayOpponentAvatarUrl(info.avatarUrl);
                }}
                onMyProfileClick={() => {
                  if (game.user) {
                    setProfileViewTarget({ userId: game.user.id, nickname: game.nickname ?? null, avatarUrl: game.userAvatarUrl ?? null });
                  }
                }}
                onOpponentProfileClick={() => {
                  if (multiplayOpponentUserId) {
                    setProfileViewTarget({ userId: multiplayOpponentUserId, nickname: multiplayOpponentNickname, avatarUrl: multiplayOpponentAvatarUrl });
                  }
                }}
              />
            ) : null
          ) : (
            <SimulationView
              isDarkMode={game.isDarkMode}
              cards={game.cards}
              onBackToLobby={() => game.setMainView("battle")}
              onOpenDetail={game.handleOpenCardDetail}
            />
          )}
        </main>
        </>
      ) : useMobileLobbyWrapper ? (
        <MobileWrapper>{mobileLobbyChrome}</MobileWrapper>
      ) : (
        lobbyChrome
      )}

      <CardDetailModal card={game.selectedCard} onClose={() => game.setSelectedCard(null)} />
      {game.unlockQueue.length > 0 && <NewCardUnlockModal card={game.unlockQueue[0]} onClose={() => game.setUnlockQueue(prev => prev.slice(1))} />}

      {/* 확률표 모달 */}
      {game.showProbModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]" onClick={() => game.setShowProbModal(false)}>
          <div className="relative bg-gradient-to-b from-[#0d1f3c] to-[#050a14] border border-white/20 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
             <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 border-b border-white/10 pb-4"><IconBook className="w-5 h-5 text-amber-400" /> 상세 확률표</h3>
             <ul className="space-y-4 font-medium text-slate-300">
                <li className="flex justify-between items-center"><span className="text-sky-300">Common (C)</span><span>60.00%</span></li>
                <li className="flex justify-between items-center"><span className="text-lime-300">Rare (R)</span><span>30.00%</span></li>
                <li className="flex justify-between items-center"><span className="text-purple-400">Epic (E)</span><span>8.00%</span></li>
                <li className="flex justify-between items-center"><span className="text-amber-400">Legendary (L)</span><span>1.00%</span></li>
                <li className="flex justify-between items-center bg-rose-950/30 p-2 rounded-lg border border-rose-900/50"><span className="text-rose-400 font-bold">Ancient (A)</span><span className="font-bold text-rose-400">1.00%</span></li>
             </ul>
             <button onClick={() => game.setShowProbModal(false)} className="mt-8 w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white font-bold transition">닫기</button>
          </div>
        </div>
      )}

      {/* 파편 상점 */}
      {game.isShardShopOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-4xl h-[75vh] flex flex-col bg-gradient-to-b from-[#0a1628] to-[#0d1f3c] rounded-3xl border border-cyan-500/30 shadow-[0_0_40px_rgba(34,211,238,0.15)] overflow-hidden">
            <header className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#050a14]/50">
              <div className="flex items-center gap-3">
                <div className="bg-cyan-950 p-2 rounded-lg border border-cyan-500/30"><IconShard className="w-6 h-6 text-cyan-400" /></div>
                <div><h2 className="text-xl font-bold text-white">차원 파편 상점</h2><p className="text-xs text-cyan-300">현재 보유 파편: <span className="font-bold text-base">{game.cardShards.toLocaleString()}</span> 개</p></div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" checked={game.shopFilterUnowned} onChange={(e) => game.setShopFilterUnowned(e.target.checked)} className="w-4 h-4 accent-cyan-500 rounded" />
                  <span className={game.shopFilterUnowned ? "text-cyan-300 font-medium" : "text-slate-400"}>미보유 카드만 보기</span>
                </label>
                <button onClick={() => game.setIsShardShopOpen(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"><span className="sr-only">닫기</span><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
              {game.shopAvailableCards.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400"><IconBook className="w-12 h-12 mb-4 opacity-50" /><p>조건에 맞는 카드가 없습니다.</p></div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                  {game.shopAvailableCards.map((card) => {
                    const price = getShardShopPrice(card.rarity);
                    const isOwned = card.isOwned;
                    const canAfford = game.cardShards >= (price || 0);
                    return (
                      <div key={card.id} className="flex flex-col gap-2">
                        <CardPlaceholder card={card} isShopView={true} onOpenDetail={game.handleOpenCardDetail} />
                        <button onClick={() => game.handleBuyCardFromShop(card)} disabled={isOwned || !canAfford} className={`w-full py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1.5 transition-all ${isOwned ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed" : canAfford ? "bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg active:scale-95" : "bg-rose-950 text-rose-500 border border-rose-900 cursor-not-allowed"}`}>
                          {isOwned ? "보유중" : <><IconShard className="w-3.5 h-3.5" />{price} 파편</>}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 가차 연출 이펙트 */}
      {game.flashState && (
         <>
           <div key={`${game.flashState.key}-flash`} className={`fixed inset-0 z-[110] pointer-events-none ${game.flashState.type === 'A' ? 'animate-[epicFlashA_3.5s_ease-out_forwards]' : 'animate-[epicFlashL_3.5s_ease-out_forwards]'}`} />
           <div key={`${game.flashState.key}-wave1`} className="fixed inset-0 z-[111] pointer-events-none flex items-center justify-center overflow-hidden">
              <div className={`w-40 h-40 rounded-full mix-blend-screen blur-3xl ${game.flashState.type === 'A' ? 'bg-red-500' : 'bg-yellow-500'} animate-[epicWave_1.5s_ease-out_forwards]`} />
           </div>
         </>
      )}

      {/* 가차 진행 화면 */}
      {game.pullState !== "idle" && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 p-4 backdrop-blur-md overflow-hidden">
          {game.pullState === "pulling" && (
            <div className="flex flex-col items-center animate-[fadeIn_0.5s_ease-out]">
              <div className="relative mb-8 h-48 w-32 animate-[bounce_1s_infinite] perspective-1000">
                <div className="w-full h-full rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-[0_0_50px_rgba(168,85,247,0.8)] border-2 border-white/50 flex items-center justify-center rotate-y-180">
                   <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-50 mix-blend-overlay"></div>
                   <IconDeck className="w-16 h-16 text-white/80 animate-pulse" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white tracking-widest animate-pulse drop-shadow-lg">차원의 문을 여는 중...</h2>
            </div>
          )}
          
          {game.pullState === "revealing" && (
            <div className="flex flex-col items-center w-full max-w-6xl transition-opacity duration-500 pt-2 sm:pt-8">
              <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-600 mb-8 tracking-widest drop-shadow-lg z-20">소환 결과</h2>
              <div
                className={`${game.pulledCards.length === 1 ? 'flex justify-center items-center w-full' : 'grid grid-cols-5 gap-1 sm:gap-3 px-1 sm:px-4'} mt-4 sm:mt-6`}
                style={
                  game.pulledCards.length === 1
                    ? undefined
                    : {
                        width: "100%",
                        maxWidth: "min(1152px, 92vh)",
                      }
                }
              >
                {game.pulledCards.map((res, i) => {
                  const isFlipped = game.flippedCards[i];
                  const isSpecialSpin = game.specialFlipped.has(i);
                  const glowColor = getGlowColor(res.rarity);
                  const wrapperClass = game.pulledCards.length === 1 ? 'w-48 sm:w-56' : 'w-full';
                  const transitionClass = isSpecialSpin ? '' : 'transition-transform duration-700 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]';
                  const transformClass = isSpecialSpin ? 'animate-superSpin' : (isFlipped ? 'rotate-y-180' : '');
                  const zIndexClass = isSpecialSpin ? 'z-50' : 'z-10';

                  const isHighTier = ['L', 'LEGENDARY', 'A', 'ANCIENT'].includes((res.rarity || '').toUpperCase());
                  const backfaceStyle = isHighTier 
                    ? "border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.6)] animate-pulse hover:shadow-[0_0_25px_rgba(245,158,11,0.8)]" 
                    : "border-slate-600 shadow-xl hover:border-sky-400/50";

                  return (
                    <div key={i} className={`relative aspect-[53.98/85.6] perspective-1000 cursor-pointer animate-[flyFromDeck_0.6s_ease-out_forwards] opacity-0 ${zIndexClass} ${wrapperClass}`} style={{ animationDelay: `${i * 120}ms` }} onClick={() => game.handleFlipCard(i)}>
                      <div className={`w-full h-full relative preserve-3d ${transitionClass} ${transformClass}`}>
                        
                        <div className={`absolute inset-0 backface-hidden rounded-lg border-2 bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center transition-all duration-300 ${backfaceStyle}`}>
                           <IconBook className={`w-4 h-4 sm:w-5 sm:h-5 opacity-50 ${isHighTier ? 'text-amber-400' : 'text-slate-500'}`} />
                           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 mix-blend-overlay pointer-events-none"></div>
                        </div>

                        <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-lg shadow-2xl bg-[#0a1628]" style={{ boxShadow: isFlipped ? `0 0 20px ${glowColor}` : 'none' }}>
                           <div className="w-full h-full rounded-lg overflow-hidden relative" style={{ border: `2px solid ${glowColor}` }}>
                             <CardPlaceholder card={{...res, isOwned: true}} />
                           </div>
                           {res.isNew ? (
                              <div className="absolute -top-3 -right-3 z-20 rounded-full bg-rose-500 px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-black tracking-wider text-white shadow-[0_0_10px_rgba(244,63,94,0.8)] border border-white/20 animate-bounce">NEW!</div>
                           ) : (
                              <div className="absolute -bottom-3 sm:-bottom-4 left-1/2 -translate-x-1/2 z-20 hidden sm:flex items-center gap-1 rounded-full bg-slate-900 px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-black tracking-wider text-cyan-400 shadow-lg border border-cyan-500/30 whitespace-nowrap"><IconShard className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> +{res.shardReward}</div>
                           )}
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>

              <div className={`fixed bottom-[-20px] left-1/2 -translate-x-1/2 z-50 transition-all duration-700 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] ${game.isDealt ? 'translate-y-40 opacity-0' : 'translate-y-0 opacity-100'}`}>
                 <div className="relative w-24 h-36 sm:w-28 sm:h-40 perspective-1000">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl border-2 border-cyan-500/50 shadow-[0_0_30px_rgba(34,211,238,0.3)] transform rotate-[-6deg] -translate-x-3"></div>
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl border-2 border-cyan-500/50 shadow-[0_0_30px_rgba(34,211,238,0.3)] transform rotate-[4deg] translate-x-3"></div>
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-[#0a1628] rounded-xl border-2 border-cyan-400 shadow-[0_0_40px_rgba(34,211,238,0.6)] flex items-center justify-center animate-[pulse_1s_infinite]"><IconDeck className="w-12 h-12 text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]" /></div>
                 </div>
              </div>

              <div className={`mt-4 flex flex-col items-center gap-4 h-16 transition-all duration-700 z-20 ${game.isDealt && !game.isSpecialAnimating ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-8 pointer-events-none'}`}>
                {!game.isAllFlipped ? (
                  <button onClick={game.handleFlipAll} className="px-8 py-2.5 bg-slate-800 text-white rounded-full font-bold text-sm sm:text-base border border-slate-600 hover:bg-slate-700 hover:border-sky-400 active:scale-95 transition-all shadow-lg animate-pulse">일괄 확인</button>
                ) : (
                  <button onClick={game.handleCloseSummon} className="px-12 py-3 bg-white text-slate-900 rounded-xl font-bold text-lg shadow-[0_0_20px_rgba(255,255,255,0.4)] hover:scale-105 active:scale-95 transition-all animate-[fadeIn_0.5s_ease-out]">소환 종료</button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}