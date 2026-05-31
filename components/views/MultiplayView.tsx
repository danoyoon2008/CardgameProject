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

const HEARTBEAT_INTERVAL_MS = 30_000;
const DISCONNECT_FORFEIT_SECONDS = 60;

const MY_CONNECTED_FIELD: Record<PlayerRole, "player_a_connected" | "player_b_connected"> = {
  player_a: "player_a_connected",
  player_b: "player_b_connected",
};

const OPP_CONNECTED_FIELD: Record<PlayerRole, "player_a_connected" | "player_b_connected"> = {
  player_a: "player_b_connected",
  player_b: "player_a_connected",
};

type GameRoomConnectionRow = {
  player_a_connected?: boolean | null;
  player_b_connected?: boolean | null;
  status?: string | null;
  winner?: string | null;
};

async function updateMyConnectionStatus(
  client: SupabaseClient,
  roomId: string,
  myRole: PlayerRole,
  connected: boolean,
): Promise<void> {
  const field = MY_CONNECTED_FIELD[myRole];
  const { error } = await client
    .from("game_rooms")
    .update({
      [field]: connected,
      updated_at: new Date().toISOString(),
    })
    .eq("id", roomId);

  if (error) {
    console.warn("[MultiplayView] 연결 상태 업데이트 실패:", error.message);
  }
}

interface MultiplayViewProps {
  roomId: string;
  myRole: PlayerRole;
  onBackToLobby: () => void;
  isDarkMode: boolean;
  cards: CardRow[];
  onOpenDetail?: (card: CardRow) => void;
}

const ANONYMOUS_OPPONENT_LABEL = "익명의 플레이어";

function normalizeNickname(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function fetchOpponentNickname(
  client: SupabaseClient,
  opponentId: string,
): Promise<string | null> {
  const { data, error } = await client
    .from("user_profiles")
    .select("nickname")
    .eq("id", opponentId)
    .maybeSingle();

  if (error) {
    console.warn("[MultiplayView] 상대 닉네임 조회 실패:", error.message);
    return null;
  }

  return normalizeNickname(data?.nickname);
}

async function fetchGameRoomPlayerIds(
  client: SupabaseClient,
  roomId: string,
): Promise<{ player_a_id: string | null; player_b_id: string | null } | null> {
  const { data, error } = await client
    .from("game_rooms")
    .select("player_a_id, player_b_id")
    .eq("id", roomId)
    .single();

  if (error || !data) {
    console.error("[MultiplayView] 방 player id 조회 실패:", error?.message);
    return null;
  }

  return {
    player_a_id: data.player_a_id ?? null,
    player_b_id: data.player_b_id ?? null,
  };
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
function createInitialGameState(initialDeck: CardRow[]): SimulationState {
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
      drawMode: "RANDOM",
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
  } as SimulationState;
}

type MultiplayGameSessionProps = {
  roomId: string;
  myRole: PlayerRole;
  bootstrapSnapshot: SimulationState;
  catalogForView: CardRow[];
  isDarkMode: boolean;
  onBackToLobby: () => void;
  opponentNickname: string | null;
  onOpenDetail?: (card: CardRow) => void;
};

function MultiplayGameSession({
  roomId,
  myRole,
  bootstrapSnapshot,
  catalogForView,
  isDarkMode,
  onBackToLobby,
  opponentNickname,
  onOpenDetail,
}: MultiplayGameSessionProps) {
  const hasHydrated = useRef(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const connectionChannelRef = useRef<RealtimeChannel | null>(null);
  const isSyncing = useRef(false);
  const stateRef = useRef<SimulationState | null>(null);
  const forfeitHandledRef = useRef(false);
  const roomDeletedRef = useRef(false);

  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [disconnectSecondsLeft, setDisconnectSecondsLeft] = useState<number | null>(null);
  const [multiplayForcedWinner, setMultiplayForcedWinner] = useState<"A" | "B" | null>(null);

  const simulation = useSimulationLogic(catalogForView, { skipAutoInit: true, multiplay: true });
  const {
    state,
    setState,
    isInitializing,
    setIsInitializing,
    handleEndTurn: rawHandleEndTurn,
    handleDrop: rawHandleDrop,
    handleFieldClick: rawHandleFieldClick,
    handlePlayerAttack: rawHandlePlayerAttack,
    handleSkillDiscard: rawHandleSkillDiscard,
    executeDraw: rawExecuteDraw,
  } = simulation;

  stateRef.current = state;

  const syncGameState = useCallback(
    (newState: SimulationState) => {
      if (isSyncing.current) {
        console.log("[MultiplayView] syncGameState 건너뜀 (원격 동기화 중)");
        return;
      }

      const channel = channelRef.current;
      if (!channel) {
        console.error("[MultiplayView] syncGameState — Broadcast 채널 없음");
        return;
      }

      console.log("[MultiplayView] syncGameState Broadcast 전송", {
        myRole,
        currentTurn: newState.currentTurn,
        globalTurnCount: newState.globalTurnCount,
        handA: newState.playerA.hand.length,
        handB: newState.playerB.hand.length,
      });

      void channel.send({
        type: "broadcast",
        event: "game_state_update",
        payload: { game_state: newState },
      });
    },
    [myRole],
  );

  const scheduleSyncAfterAction = useCallback(() => {
    setTimeout(() => {
      const latest = stateRef.current;
      if (latest) syncGameState(latest);
    }, 100);
  }, [syncGameState]);

  const wrapHandlerWithSync = <T extends (...args: never[]) => void>(fn: T): T =>
    ((...args: Parameters<T>) => {
      fn(...args);
      scheduleSyncAfterAction();
    }) as T;

  void [
    wrapHandlerWithSync(rawHandleEndTurn),
    wrapHandlerWithSync(rawHandleDrop),
    wrapHandlerWithSync(rawHandleFieldClick),
    wrapHandlerWithSync(rawHandlePlayerAttack),
    wrapHandlerWithSync(rawHandleSkillDiscard),
    wrapHandlerWithSync(rawExecuteDraw),
  ];

  const controlledSimulation: ControlledSimulationBinding = {
    state,
    setState,
    isInitializing,
    setIsInitializing,
    syncAfterAction: scheduleSyncAfterAction,
  };

  useEffect(() => {
    if (hasHydrated.current) return;
    hasHydrated.current = true;
    setIsInitializing(false);
    setState(bootstrapSnapshot);
    console.log("[MultiplayView] bootstrap game_state 주입 완료");
  }, [bootstrapSnapshot, setState, setIsInitializing]);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`game-room-${roomId}`)
      .on("broadcast", { event: "game_state_update" }, ({ payload }) => {
        const remote = (payload as { game_state?: SimulationState | null })?.game_state;
        console.log("[MultiplayView] Broadcast game_state 수신:", remote);

        if (!remote) return;

        isSyncing.current = true;
        setState((prev) => ({
          ...remote,
          elapsedTime: prev?.elapsedTime ?? remote.elapsedTime ?? 0,
          turnTimeLeft: prev?.turnTimeLeft ?? remote.turnTimeLeft ?? 60,
        }));
        isSyncing.current = false;
      })
      .subscribe((status) => {
        console.log("[MultiplayView] Broadcast 구독 상태:", status);
      });

    channelRef.current = channel;

    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomId, setState]);

  const applyConnectionRow = useCallback(
    (row: GameRoomConnectionRow) => {
      const oppField = OPP_CONNECTED_FIELD[myRole];
      const oppConnected = row[oppField] !== false;
      setOpponentDisconnected(!oppConnected);

      if (row.player_a_connected === false && row.player_b_connected === false && !roomDeletedRef.current) {
        roomDeletedRef.current = true;
        const supabase = createClient();
        if (supabase) {
          void supabase
            .from("game_rooms")
            .delete()
            .eq("id", roomId)
            .then(({ error }) => {
              if (error) {
                console.warn("[MultiplayView] 양쪽 연결 끊김 — 방 삭제 실패:", error.message);
                roomDeletedRef.current = false;
              }
            });
        }
      }

      if (row.status === "finished" && row.winner) {
        const winnerTeam: "A" | "B" = row.winner === "player_a" ? "A" : "B";
        setMultiplayForcedWinner(winnerTeam);
      }
    },
    [myRole, roomId],
  );

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    void updateMyConnectionStatus(supabase, roomId, myRole, true);
    void supabase
      .from("game_rooms")
      .update({ status: "playing", updated_at: new Date().toISOString() })
      .eq("id", roomId);

    const heartbeatId = window.setInterval(() => {
      void updateMyConnectionStatus(supabase, roomId, myRole, true);
    }, HEARTBEAT_INTERVAL_MS);

    void supabase
      .from("game_rooms")
      .select("player_a_connected, player_b_connected, status, winner")
      .eq("id", roomId)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          applyConnectionRow(data as GameRoomConnectionRow);
        }
      });

    const connectionChannel = supabase
      .channel(`game-room-connection-${roomId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "game_rooms", filter: `id=eq.${roomId}` },
        (payload) => {
          applyConnectionRow((payload.new ?? {}) as GameRoomConnectionRow);
        },
      )
      .subscribe();

    connectionChannelRef.current = connectionChannel;

    return () => {
      window.clearInterval(heartbeatId);
      void updateMyConnectionStatus(supabase, roomId, myRole, false);
      void supabase.removeChannel(connectionChannel);
      connectionChannelRef.current = null;
    };
  }, [roomId, myRole, applyConnectionRow]);

  useEffect(() => {
    if (!opponentDisconnected) {
      setDisconnectSecondsLeft(null);
      forfeitHandledRef.current = false;
      return;
    }

    setDisconnectSecondsLeft(DISCONNECT_FORFEIT_SECONDS);
    const intervalId = window.setInterval(() => {
      setDisconnectSecondsLeft((prev) => {
        if (prev === null) return null;
        return Math.max(0, prev - 1);
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [opponentDisconnected]);

  useEffect(() => {
    if (!opponentDisconnected || disconnectSecondsLeft !== 0 || forfeitHandledRef.current) return;

    forfeitHandledRef.current = true;
    const myWinnerTeam: "A" | "B" = myRole === "player_a" ? "A" : "B";
    setMultiplayForcedWinner(myWinnerTeam);

    const supabase = createClient();
    if (!supabase) return;

    void supabase
      .from("game_rooms")
      .update({
        status: "finished",
        winner: myRole,
        updated_at: new Date().toISOString(),
      })
      .eq("id", roomId)
      .then(({ error }) => {
        if (error) {
          console.warn("[MultiplayView] 연결 끊김 자동 승리 처리 실패:", error.message);
        }
      });
  }, [opponentDisconnected, disconnectSecondsLeft, myRole, roomId]);

  const opponentLabel = opponentNickname ?? ANONYMOUS_OPPONENT_LABEL;
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

      <div className={`min-h-0 flex-1 ${opponentDisconnected ? "pointer-events-none" : ""}`}>
        {state ? (
          <SimulationView
            isDarkMode={isDarkMode}
            cards={catalogForView}
            onBackToLobby={onBackToLobby}
            onOpenDetail={onOpenDetail}
            controlledSimulation={controlledSimulation as never}
            multiplayMyRole={myRole}
            multiplayOpponentDisconnected={opponentDisconnected}
            multiplayDisconnectSecondsLeft={disconnectSecondsLeft}
            multiplayForcedWinner={multiplayForcedWinner}
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

async function fetchInitialGameState(
  client: SupabaseClient,
  roomId: string,
): Promise<SimulationState | null> {
  const { data, error } = await client
    .from("game_rooms")
    .select("game_state")
    .eq("id", roomId)
    .single();

  if (error) {
    console.error("[MultiplayView] game_state 조회 실패:", error.message);
    return null;
  }

  return (data?.game_state as SimulationState | null) ?? null;
}

export default function MultiplayView({
  roomId,
  myRole,
  onBackToLobby,
  isDarkMode,
  cards,
  onOpenDetail,
}: MultiplayViewProps) {
  const [bootstrapSnapshot, setBootstrapSnapshot] = useState<SimulationState | null>(null);
  const [deckCatalog, setDeckCatalog] = useState<CardRow[]>(cards);
  const [opponentNickname, setOpponentNickname] = useState<string | null>(null);

  useEffect(() => {
    console.log("[MultiplayView] 마운트 — cards prop 길이:", cards.length);
  }, [cards.length]);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    let cancelled = false;

    async function resolveOpponentNickname() {
      const client = supabase;
      if (!client) return;

      if (myRole === "player_b") {
        const room = await fetchGameRoomPlayerIds(client, roomId);
        if (cancelled) return;

        const opponentId = room?.player_a_id;
        if (!opponentId) {
          setOpponentNickname(null);
          return;
        }

        const nickname = await fetchOpponentNickname(client, opponentId);
        if (!cancelled) {
          setOpponentNickname(nickname);
        }
        return;
      }

      for (let attempt = 1; attempt <= 15; attempt++) {
        if (cancelled) return;

        const room = await fetchGameRoomPlayerIds(client, roomId);
        const opponentId = room?.player_b_id;

        if (typeof opponentId === "string" && opponentId.length > 0) {
          const nickname = await fetchOpponentNickname(client, opponentId);
          if (!cancelled) {
            setOpponentNickname(nickname);
          }
          return;
        }

        console.log("[MultiplayView] player_b_id 대기 — 재시도:", attempt);
        if (attempt < 15) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      if (!cancelled) {
        setOpponentNickname(null);
      }
    }

    void resolveOpponentNickname();

    return () => {
      cancelled = true;
    };
  }, [roomId, myRole]);

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

      if (room.game_state) {
        console.log("[MultiplayView] 기존 game_state 로드");
        if (!cancelled) {
          setBootstrapSnapshot(room.game_state as SimulationState);
        }
        return;
      }

      if (myRole === "player_b") {
        console.log("[MultiplayView] player_b — 초기 game_state DB 조회 대기");
        for (let attempt = 1; attempt <= 10; attempt++) {
          if (cancelled) return;
          await new Promise((resolve) => setTimeout(resolve, 1000));
          if (cancelled) return;

          const gameState = await fetchInitialGameState(client, roomId);
          if (gameState) {
            console.log("[MultiplayView] player_b 초기 game_state 조회 성공 — 시도:", attempt);
            if (!cancelled) {
              setBootstrapSnapshot(gameState);
            }
            return;
          }

          console.log("[MultiplayView] player_b game_state 아직 없음 — 재시도:", attempt);
        }
        console.warn("[MultiplayView] player_b 초기 game_state 조회 실패 — 최대 재시도 초과");
        return;
      }

      if (deckCards.length === 0) {
        console.error("[MultiplayView] 초기 상태 생성 불가 — 덱 카드 없음");
        return;
      }

      const initialState = createInitialGameState(deckCards);
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
          status: "playing",
          player_a_connected: true,
          player_b_connected: true,
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
        setBootstrapSnapshot(refetch.game_state as SimulationState);
      } else if (!cancelled && !updateError) {
        setBootstrapSnapshot(initialState);
      }
    }

    void bootstrapRoom();

    return () => {
      cancelled = true;
    };
  }, [roomId, myRole, cards]);

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
          onOpenDetail={onOpenDetail}
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
