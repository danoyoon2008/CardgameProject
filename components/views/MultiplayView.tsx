"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import SimulationView from "./SimulationView";
import { createClient } from "@/utils/supabase/client";
import type { CardRow } from "@/types/game";
import {
  useSimulationLogic,
  type SimulationState,
  type ControlledSimulationBinding,
} from "@/hooks/useSimulationLogic";
import type { PlayerRole } from "@/hooks/useMatchmaking";

interface MultiplayViewProps {
  roomId: string;
  myRole: PlayerRole;
  onBackToLobby: () => void;
  isDarkMode: boolean;
  cards: CardRow[];
}

type StoredGameState = SimulationState & {
  lastUpdatedBy?: PlayerRole;
  [key: string]: unknown;
};

function stripSyncMeta(stored: StoredGameState): SimulationState {
  const { lastUpdatedBy: _lastUpdatedBy, ...gameState } = stored;
  return gameState as SimulationState;
}

async function resolveDeckCatalog(
  cardsProp: CardRow[],
  client: SupabaseClient,
): Promise<CardRow[]> {
  if (cardsProp.length > 0) {
    console.log("[MultiplayView] cards prop 사용, 길이:", cardsProp.length);
    return cardsProp;
  }

  console.warn("[MultiplayView] cards prop 비어 있음 — Supabase cards 테이블 조회");
  const { data, error } = await client.from("cards").select("*");

  if (error) {
    console.error("[MultiplayView] cards 테이블 조회 실패:", error.message);
    return [];
  }

  const fetched = (data ?? []) as CardRow[];
  console.log("[MultiplayView] Supabase cards 조회 완료, 길이:", fetched.length);
  return fetched;
}

/** useSimulationLogic.runInitialization 과 동일한 최종 상태를 동기적으로 생성 */
function createInitialGameState(initialDeck: CardRow[], authorRole: PlayerRole): StoredGameState {
  const currentDeck = [...initialDeck].sort(() => Math.random() - 0.5);
  const pAHand: CardRow[] = [];
  const pBHand: CardRow[] = [];

  for (let i = 0; i < 4; i++) {
    pAHand.push(currentDeck.pop()!);
    pBHand.push(currentDeck.pop()!);
  }

  const firstTurn: "A" | "B" = Math.random() < 0.5 ? "A" : "B";

  return {
    currentTurn: firstTurn,
    turnCount: 1,
    globalTurnCount: 1,
    elapsedTime: 0,
    turnTimeLeft: 60,
    settings: {
      isTimeLimitEnabled: false,
      isOpponentCardFlipped: false,
      drawMode: "SELECT",
    },
    deckCards: currentDeck,
    rewindCards: [],
    playerA: {
      hp: 2000,
      tokens: 4,
      hand: pAHand,
      hasDrawnThisTurn: false,
      attacksThisTurn: 0,
      hasBeenAttackedThisTurn: false,
      field: { is: null, m: null, os: null, spellStack: [] },
    },
    playerB: {
      hp: 2000,
      tokens: 4,
      hand: pBHand,
      hasDrawnThisTurn: false,
      attacksThisTurn: 0,
      hasBeenAttackedThisTurn: false,
      field: { is: null, m: null, os: null, spellStack: [] },
    },
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
    lastUpdatedBy: authorRole,
  };
}

type MultiplayGameSessionProps = {
  roomId: string;
  myRole: PlayerRole;
  bootstrapSnapshot: StoredGameState;
  catalogForView: CardRow[];
  isDarkMode: boolean;
  onBackToLobby: () => void;
  opponentNickname: string | null;
};

function MultiplayGameSession({
  roomId,
  myRole,
  bootstrapSnapshot,
  catalogForView,
  isDarkMode,
  onBackToLobby,
  opponentNickname,
}: MultiplayGameSessionProps) {
  const isRemoteUpdate = useRef(false);
  const hasHydrated = useRef(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const simulation = useSimulationLogic(catalogForView, { skipAutoInit: true, multiplay: true });
  const { state, setState, isInitializing, setIsInitializing } = simulation;

  const controlledSimulation: ControlledSimulationBinding = {
    state,
    setState,
    isInitializing,
    setIsInitializing,
  };

  const syncGameState = useCallback(
    async (newState: SimulationState) => {
      const client = createClient();
      if (!client) {
        console.error("[MultiplayView] syncGameState — Supabase 클라이언트 없음");
        return;
      }

      const payload: StoredGameState = {
        ...(newState as StoredGameState),
        lastUpdatedBy: myRole,
      };

      console.log("[MultiplayView] syncGameState 호출", {
        myRole,
        currentTurn: payload.currentTurn,
        globalTurnCount: payload.globalTurnCount,
        handA: payload.playerA.hand.length,
        handB: payload.playerB.hand.length,
      });

      const { error } = await client
        .from("game_rooms")
        .update({
          game_state: payload,
          updated_at: new Date().toISOString(),
        })
        .eq("id", roomId);

      if (error) {
        console.error("[MultiplayView] syncGameState 실패:", error.message, error);
      } else {
        console.log("[MultiplayView] syncGameState 성공 — roomId:", roomId);
      }
    },
    [myRole, roomId],
  );

  useEffect(() => {
    if (hasHydrated.current) return;
    hasHydrated.current = true;
    isRemoteUpdate.current = true;
    setIsInitializing(false);
    setState(stripSyncMeta(bootstrapSnapshot));
    console.log("[MultiplayView] bootstrap game_state 주입 완료");
  }, [bootstrapSnapshot, setState, setIsInitializing]);

  useEffect(() => {
    if (!state || isInitializing) return;

    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      console.log("[MultiplayView] syncGameState 건너뜀 (원격 업데이트)");
      return;
    }

    void syncGameState(state);
  }, [state, isInitializing, syncGameState]);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`game-room-sync-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          const next = payload.new as { game_state?: StoredGameState | null };
          const remote = next.game_state;
          console.log("[MultiplayView] game_state Realtime 수신:", remote);

          if (!remote) return;

          if (remote.lastUpdatedBy === myRole) {
            console.log("[MultiplayView] 자신이 보낸 변경 — 무시", { lastUpdatedBy: remote.lastUpdatedBy });
            return;
          }

          console.log("[MultiplayView] 상대 변경 반영", { lastUpdatedBy: remote.lastUpdatedBy });
          isRemoteUpdate.current = true;
          setState(stripSyncMeta(remote));
        },
      )
      .subscribe((status) => {
        console.log("[MultiplayView] Realtime 구독 상태:", status);
      });

    channelRef.current = channel;

    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomId, myRole, setState]);

  const opponentLabel = opponentNickname ?? "상대방";
  const myTeamLabel = myRole === "player_a" ? "Player A" : "Player B";

  return (
    <>
      <div
        className={`shrink-0 border-b px-3 py-2 sm:px-5 sm:py-2.5 ${
          isDarkMode
            ? "border-sky-500/25 bg-gradient-to-r from-slate-900/95 via-slate-900/90 to-slate-900/95"
            : "border-sky-200 bg-gradient-to-r from-white via-slate-50 to-white"
        }`}
      >
        <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-center gap-x-3 gap-y-1.5 sm:justify-between">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider sm:px-3 sm:py-1 sm:text-xs ${
                isDarkMode
                  ? "bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/40"
                  : "bg-sky-100 text-sky-700 ring-1 ring-sky-300/60"
              }`}
            >
              멀티플레이
            </span>
            <span
              className={`text-xs font-semibold sm:text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
            >
              {myTeamLabel}
            </span>
          </div>

          <p
            className={`text-center text-sm font-bold sm:text-base ${isDarkMode ? "text-white" : "text-slate-800"}`}
          >
            <span className={isDarkMode ? "text-slate-500" : "text-slate-400"}>vs </span>
            <span className={isDarkMode ? "text-amber-300" : "text-amber-600"}>{opponentLabel}</span>
          </p>

          <div
            className={`hidden text-xs sm:block ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}
            aria-hidden
          >
            {state?.currentTurn
              ? `선공: ${state.currentTurn === (myRole === "player_a" ? "A" : "B") ? "나" : "상대"}`
              : "게임 준비 중"}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {state ? (
          <SimulationView
            isDarkMode={isDarkMode}
            cards={catalogForView}
            onBackToLobby={onBackToLobby}
            controlledSimulation={controlledSimulation as never}
            multiplayMyRole={myRole}
          />
        ) : (
          <div className="flex h-full min-h-[40vh] flex-col items-center justify-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
            <p className={`text-sm font-semibold ${isDarkMode ? "text-sky-300" : "text-sky-600"}`}>
              게임 상태를 불러오는 중...
            </p>
          </div>
        )}
      </div>
    </>
  );
}

export default function MultiplayView({
  roomId,
  myRole,
  onBackToLobby,
  isDarkMode,
  cards,
}: MultiplayViewProps) {
  const [bootstrapSnapshot, setBootstrapSnapshot] = useState<StoredGameState | null>(null);
  const [deckCatalog, setDeckCatalog] = useState<CardRow[]>(cards);
  const [opponentNickname, setOpponentNickname] = useState<string | null>(null);

  useEffect(() => {
    console.log("[MultiplayView] 마운트 — cards prop 길이:", cards.length);
  }, [cards.length]);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    let cancelled = false;

    async function bootstrapRoom() {
      const client = supabase;
      if (!client) return;

      const deckCards = await resolveDeckCatalog(cards, client);
      if (!cancelled) {
        setDeckCatalog(deckCards);
      }

      const { data: room, error } = await client
        .from("game_rooms")
        .select("game_state, player_a_id, player_b_id")
        .eq("id", roomId)
        .single();

      if (cancelled || error || !room) {
        if (error) console.error("[MultiplayView] 방 조회 실패:", error.message);
        return;
      }

      const opponentId = myRole === "player_a" ? room.player_b_id : room.player_a_id;
      if (opponentId) {
        const { data: profile } = await client
          .from("user_profiles")
          .select("nickname")
          .eq("id", opponentId)
          .maybeSingle();

        if (!cancelled) {
          setOpponentNickname(typeof profile?.nickname === "string" ? profile.nickname : null);
        }
      }

      if (room.game_state) {
        console.log("[MultiplayView] 기존 game_state 로드");
        if (!cancelled) {
          setBootstrapSnapshot(room.game_state as StoredGameState);
        }
        return;
      }

      if (myRole !== "player_a") {
        console.log("[MultiplayView] player_b — game_state Realtime 대기");
        return;
      }

      if (deckCards.length === 0) {
        console.error("[MultiplayView] 초기 상태 생성 불가 — 덱 카드 없음");
        return;
      }

      const initialState = createInitialGameState(deckCards, myRole);
      console.log("[MultiplayView] player_a 초기 game_state 생성", {
        deckRemaining: initialState.deckCards.length,
        handA: initialState.playerA.hand.length,
        handB: initialState.playerB.hand.length,
        firstTurn: initialState.currentTurn,
      });

      const { error: updateError } = await client
        .from("game_rooms")
        .update({
          game_state: initialState,
          updated_at: new Date().toISOString(),
        })
        .eq("id", roomId);

      if (updateError) {
        console.error("[MultiplayView] game_rooms update 실패:", updateError.message, updateError);
      } else {
        console.log("[MultiplayView] game_rooms update 성공 — roomId:", roomId);
      }

      const { data: refetch, error: refetchError } = await client
        .from("game_rooms")
        .select("game_state")
        .eq("id", roomId)
        .single();

      if (refetchError) {
        console.error("[MultiplayView] game_state 재조회 실패:", refetchError.message);
      } else if (!cancelled && refetch?.game_state) {
        setBootstrapSnapshot(refetch.game_state as StoredGameState);
      } else if (!cancelled && !updateError) {
        setBootstrapSnapshot(initialState);
      }
    }

    void bootstrapRoom();

    return () => {
      cancelled = true;
    };
  }, [roomId, myRole, cards]);

  useEffect(() => {
    if (bootstrapSnapshot || myRole !== "player_b") return;

    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`game-room-bootstrap-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          const next = payload.new as { game_state?: StoredGameState | null };
          if (next.game_state) {
            console.log("[MultiplayView] player_b bootstrap game_state 수신");
            setBootstrapSnapshot(next.game_state);
          }
        },
      )
      .subscribe((status) => {
        console.log("[MultiplayView] bootstrap Realtime 구독 상태:", status);
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [bootstrapSnapshot, myRole, roomId]);

  const catalogForView = deckCatalog.length > 0 ? deckCatalog : cards;

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      {bootstrapSnapshot ? (
        <MultiplayGameSession
          roomId={roomId}
          myRole={myRole}
          bootstrapSnapshot={bootstrapSnapshot}
          catalogForView={catalogForView}
          isDarkMode={isDarkMode}
          onBackToLobby={onBackToLobby}
          opponentNickname={opponentNickname}
        />
      ) : (
        <div className="flex h-full min-h-[40vh] flex-col items-center justify-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
          <p className={`text-sm font-semibold ${isDarkMode ? "text-sky-300" : "text-sky-600"}`}>
            {myRole === "player_b" ? "상대방의 게임 준비를 기다리는 중..." : "게임 상태를 불러오는 중..."}
          </p>
        </div>
      )}
    </div>
  );
}
