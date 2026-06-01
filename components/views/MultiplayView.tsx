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
import {
  MULTIPLAY_HEARTBEAT_INTERVAL_MS,
  MY_CONNECTED_FIELD,
  MY_LAST_SEEN_FIELD,
  OPP_CONNECTED_FIELD,
  type GameRoomConnectionRow,
  parseOpponentLastSeenMs,
  isOpponentHeartbeatStale,
  sendDisconnectedOnBeforeUnload,
} from "@/utils/multiplayConnection";

const DISCONNECT_FORFEIT_SECONDS = 60;

async function updateMyConnectionStatus(
  client: SupabaseClient,
  roomId: string,
  myRole: PlayerRole,
  connected: boolean,
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await client
    .from("game_rooms")
    .update({
      [MY_CONNECTED_FIELD[myRole]]: connected,
      [MY_LAST_SEEN_FIELD[myRole]]: now,
      updated_at: now,
    })
    .eq("id", roomId);

  if (error) {
    console.warn("[MultiplayView] 연결 상태 업데이트 실패:", error.message);
  }
}

async function finishGameRoom(
  client: SupabaseClient,
  roomId: string,
  winnerRole: PlayerRole,
): Promise<void> {
  const { error } = await client
    .from("game_rooms")
    .update({
      status: "finished",
      winner: winnerRole,
      updated_at: new Date().toISOString(),
    })
    .eq("id", roomId);

  if (error) {
    console.warn("[MultiplayView] 게임 종료 저장 실패:", error.message);
  }
}

interface MultiplayViewProps {
  roomId: string;
  myRole: PlayerRole;
  onBackToLobby: () => void;
  onRematchReady: () => void;
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
    return cardsProp;
  }

  const { data, error } = await client.from("cards").select("*");
  if (error) {
    console.error("[MultiplayView] cards 테이블 조회 실패:", error.message);
    return [];
  }

  return (data ?? []) as CardRow[];
}

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

type MultiplayRematchStatus = "none" | "waiting" | "incoming";

type MultiplayGameSessionProps = {
  roomId: string;
  myRole: PlayerRole;
  bootstrapSnapshot: SimulationState;
  catalogForView: CardRow[];
  isDarkMode: boolean;
  onBackToLobby: () => void;
  onRematchReady: () => void;
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
  onRematchReady,
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
  const opponentLastSeenMsRef = useRef<number | null>(null);
  const gameFinishedRef = useRef(false);
  const rematchBothReadyRef = useRef(false);

  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [disconnectSecondsLeft, setDisconnectSecondsLeft] = useState<number | null>(null);
  const [sessionWinner, setSessionWinner] = useState<"A" | "B" | null>(null);
  const [opponentLeft, setOpponentLeft] = useState(false);
  const [rematchStatus, setRematchStatus] = useState<MultiplayRematchStatus>("none");
  const [myRematchRequested, setMyRematchRequested] = useState(false);
  const [opponentRematchRequested, setOpponentRematchRequested] = useState(false);

  const opponentRole: PlayerRole = myRole === "player_a" ? "player_b" : "player_a";

  const simulation = useSimulationLogic(catalogForView, { skipAutoInit: true, multiplay: true });
  const { state, setState, isInitializing, setIsInitializing } = simulation;

  stateRef.current = state;

  const syncGameState = useCallback(
    (newState: SimulationState) => {
      if (isSyncing.current || gameFinishedRef.current) return;

      const channel = channelRef.current;
      if (channel) {
        void channel.send({
          type: "broadcast",
          event: "game_state_update",
          payload: { game_state: newState },
        });
      }

      const supabase = createClient();
      if (supabase) {
        void supabase
          .from("game_rooms")
          .update({ game_state: newState, updated_at: new Date().toISOString() })
          .eq("id", roomId)
          .eq("status", "playing");
      }
    },
    [roomId],
  );

  const scheduleSyncAfterAction = useCallback(() => {
    setTimeout(() => {
      const latest = stateRef.current;
      if (latest) syncGameState(latest);
    }, 100);
  }, [syncGameState]);

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
  }, [bootstrapSnapshot, setState, setIsInitializing]);

  const markGameFinished = useCallback(
    async (winnerRole: PlayerRole, winnerTeam: "A" | "B") => {
      if (gameFinishedRef.current) return;
      gameFinishedRef.current = true;
      setSessionWinner(winnerTeam);

      const supabase = createClient();
      if (supabase) {
        await finishGameRoom(supabase, roomId, winnerRole);
      }
    },
    [roomId],
  );

  const handleMultiplayWin = useCallback(
    (winnerTeam: "A" | "B") => {
      const winnerRole: PlayerRole = winnerTeam === "A" ? "player_a" : "player_b";
      void markGameFinished(winnerRole, winnerTeam);
    },
    [markGameFinished],
  );

  const triggerRematchIfBothReady = useCallback(() => {
    if (rematchBothReadyRef.current) return;
    if (!myRematchRequested || !opponentRematchRequested) return;
    rematchBothReadyRef.current = true;
    onRematchReady();
  }, [myRematchRequested, opponentRematchRequested, onRematchReady]);

  useEffect(() => {
    triggerRematchIfBothReady();
  }, [myRematchRequested, opponentRematchRequested, triggerRematchIfBothReady]);

  const handleLeaveLobby = useCallback(async () => {
    const supabase = createClient();
    if (supabase && !gameFinishedRef.current) {
      await finishGameRoom(supabase, roomId, opponentRole);
      gameFinishedRef.current = true;
      void channelRef.current?.send({
        type: "broadcast",
        event: "opponent_left",
        payload: {},
      });
    }
    onBackToLobby();
  }, [roomId, opponentRole, onBackToLobby]);

  const handleRematchRequest = useCallback(() => {
    setMyRematchRequested(true);
    setRematchStatus("waiting");
    void channelRef.current?.send({
      type: "broadcast",
      event: "rematch_request",
      payload: {},
    });
  }, []);

  const handleRematchAccept = useCallback(() => {
    setMyRematchRequested(true);
    setOpponentRematchRequested(true);
    setRematchStatus("none");
    void channelRef.current?.send({
      type: "broadcast",
      event: "rematch_accept",
      payload: {},
    });
  }, []);

  const handleRematchReject = useCallback(() => {
    setRematchStatus("none");
    setOpponentRematchRequested(false);
    void channelRef.current?.send({
      type: "broadcast",
      event: "rematch_decline",
      payload: {},
    });
  }, []);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`game-room-${roomId}`)
      .on("broadcast", { event: "game_state_update" }, ({ payload }) => {
        if (gameFinishedRef.current) return;
        const remote = (payload as { game_state?: SimulationState | null })?.game_state;
        if (!remote) return;

        isSyncing.current = true;
        setState((prev) => ({
          ...remote,
          elapsedTime: prev?.elapsedTime ?? remote.elapsedTime ?? 0,
          turnTimeLeft: prev?.turnTimeLeft ?? remote.turnTimeLeft ?? 60,
        }));
        isSyncing.current = false;
      })
      .on("broadcast", { event: "opponent_left" }, () => {
        setOpponentLeft(true);
        if (!gameFinishedRef.current) {
          gameFinishedRef.current = true;
          const myWinnerTeam: "A" | "B" = myRole === "player_a" ? "A" : "B";
          setSessionWinner(myWinnerTeam);
        }
      })
      .on("broadcast", { event: "rematch_request" }, () => {
        setMyRematchRequested((mine) => {
          if (mine) {
            setOpponentRematchRequested(true);
            setRematchStatus("none");
          } else {
            setRematchStatus("incoming");
          }
          return mine;
        });
      })
      .on("broadcast", { event: "rematch_accept" }, () => {
        setOpponentRematchRequested(true);
        setRematchStatus("none");
      })
      .on("broadcast", { event: "rematch_decline" }, () => {
        setOpponentRematchRequested(false);
        setRematchStatus("none");
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomId, setState, myRematchRequested]);

  const evaluateOpponentConnection = useCallback(
    (row: GameRoomConnectionRow) => {
      const oppField = OPP_CONNECTED_FIELD[myRole];
      const oppConnected = row[oppField] !== false;
      const lastSeenMs = parseOpponentLastSeenMs(row, myRole);
      if (lastSeenMs != null) {
        opponentLastSeenMsRef.current = lastSeenMs;
      }
      const stale = isOpponentHeartbeatStale(opponentLastSeenMsRef.current);
      setOpponentDisconnected(!oppConnected || stale);
    },
    [myRole],
  );

  const finishRoomBothDisconnected = useCallback(async () => {
    if (roomDeletedRef.current || gameFinishedRef.current) return;
    roomDeletedRef.current = true;

    const supabase = createClient();
    if (!supabase) {
      roomDeletedRef.current = false;
      return;
    }

    const { error } = await supabase
      .from("game_rooms")
      .update({
        status: "finished",
        player_a_connected: false,
        player_b_connected: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", roomId);

    if (error) roomDeletedRef.current = false;
  }, [roomId]);

  const applyConnectionRow = useCallback(
    (row: GameRoomConnectionRow) => {
      if (row.status === "finished") {
        if (!gameFinishedRef.current) {
          const winnerRole = (row as { winner?: PlayerRole | null }).winner ?? null;
          if (winnerRole === "player_a" || winnerRole === "player_b") {
            gameFinishedRef.current = true;
            const winnerTeam: "A" | "B" = winnerRole === "player_a" ? "A" : "B";
            setSessionWinner(winnerTeam);
          } else {
            gameFinishedRef.current = true;
            onBackToLobby();
          }
        }
        return;
      }

      evaluateOpponentConnection(row);

      if (
        row.player_a_connected === false &&
        row.player_b_connected === false &&
        !roomDeletedRef.current &&
        !gameFinishedRef.current
      ) {
        void finishRoomBothDisconnected();
      }
    },
    [evaluateOpponentConnection, onBackToLobby, finishRoomBothDisconnected],
  );

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    let visibilityDisconnectPending = false;

    const markConnected = (connected: boolean) => {
      void updateMyConnectionStatus(supabase, roomId, myRole, connected);
    };

    void markConnected(true);
    void supabase
      .from("game_rooms")
      .update({ status: "playing", updated_at: new Date().toISOString() })
      .eq("id", roomId);

    const heartbeatId = window.setInterval(() => {
      void markConnected(true);
    }, MULTIPLAY_HEARTBEAT_INTERVAL_MS);

    const staleCheckId = window.setInterval(() => {
      if (isOpponentHeartbeatStale(opponentLastSeenMsRef.current)) {
        setOpponentDisconnected(true);
      }
    }, 5_000);

    void supabase
      .from("game_rooms")
      .select(
        "player_a_connected, player_b_connected, player_a_last_seen, player_b_last_seen, status, winner, updated_at",
      )
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

    const handleBeforeUnload = () => {
      sendDisconnectedOnBeforeUnload(roomId, myRole);
      void markConnected(false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        visibilityDisconnectPending = true;
        void markConnected(false);
      } else if (document.visibilityState === "visible") {
        visibilityDisconnectPending = false;
        void markConnected(true);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(heartbeatId);
      window.clearInterval(staleCheckId);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (!visibilityDisconnectPending) {
        void markConnected(false);
      }
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
      setDisconnectSecondsLeft((prev) => (prev === null ? null : Math.max(0, prev - 1)));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [opponentDisconnected]);

  useEffect(() => {
    if (!opponentDisconnected || disconnectSecondsLeft !== 0 || forfeitHandledRef.current) return;

    forfeitHandledRef.current = true;
    const myWinnerTeam: "A" | "B" = myRole === "player_a" ? "A" : "B";
    void markGameFinished(myRole, myWinnerTeam);
  }, [opponentDisconnected, disconnectSecondsLeft, myRole, markGameFinished]);

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
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {state ? (
          <SimulationView
            isDarkMode={isDarkMode}
            cards={catalogForView}
            onOpenDetail={onOpenDetail}
            onBackToLobby={onBackToLobby}
            controlledSimulation={controlledSimulation as never}
            multiplayMyRole={myRole}
            multiplayOpponentDisconnected={opponentDisconnected && !sessionWinner}
            multiplayDisconnectSecondsLeft={disconnectSecondsLeft}
            multiplaySessionWinner={sessionWinner}
            onMultiplayWin={handleMultiplayWin}
            multiplayEndUi={{
              opponentLeft,
              rematchStatus,
              onLeaveLobby: () => void handleLeaveLobby(),
              onRematch: handleRematchRequest,
              onRematchAccept: handleRematchAccept,
              onRematchReject: handleRematchReject,
            }}
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

function hasPersistedGameState(value: unknown): value is SimulationState {
  return value != null && typeof value === "object";
}

async function fetchRoomGameState(
  client: SupabaseClient,
  roomId: string,
): Promise<{ game_state: SimulationState | null; status: string | null } | null> {
  const { data, error } = await client
    .from("game_rooms")
    .select("game_state, status")
    .eq("id", roomId)
    .single();

  if (error || !data) return null;
  const gameState = hasPersistedGameState(data.game_state)
    ? (data.game_state as SimulationState)
    : null;
  return { game_state: gameState, status: data.status ?? null };
}

export default function MultiplayView({
  roomId,
  myRole,
  onBackToLobby,
  onRematchReady,
  isDarkMode,
  cards,
  onOpenDetail,
}: MultiplayViewProps) {
  const [bootstrapSnapshot, setBootstrapSnapshot] = useState<SimulationState | null>(null);
  const [deckCatalog, setDeckCatalog] = useState<CardRow[]>(cards);
  const [opponentNickname, setOpponentNickname] = useState<string | null>(null);
  const [roomRejected, setRoomRejected] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    let cancelled = false;

    void (async () => {
      const { data, error } = await supabase
        .from("game_rooms")
        .select("status")
        .eq("id", roomId)
        .single();

      if (cancelled) return;
      if (!error && data?.status === "finished") {
        setRoomRejected(true);
        onBackToLobby();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [roomId, onBackToLobby]);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase || roomRejected) return;

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
        if (!cancelled) setOpponentNickname(nickname);
        return;
      }

      for (let attempt = 1; attempt <= 15; attempt++) {
        if (cancelled) return;
        const room = await fetchGameRoomPlayerIds(client, roomId);
        const opponentId = room?.player_b_id;
        if (typeof opponentId === "string" && opponentId.length > 0) {
          const nickname = await fetchOpponentNickname(client, opponentId);
          if (!cancelled) setOpponentNickname(nickname);
          return;
        }
        if (attempt < 15) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
      if (!cancelled) setOpponentNickname(null);
    }

    void resolveOpponentNickname();
    return () => {
      cancelled = true;
    };
  }, [roomId, myRole, roomRejected]);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase || roomRejected) return;

    let cancelled = false;

    async function bootstrapRoom() {
      const client = supabase;
      if (!client) return;

      const deckCards = await resolveDeckCatalog(cards, client);
      if (!cancelled) setDeckCatalog(deckCards);

      const loadSnapshot = async (): Promise<SimulationState | null> => {
        const row = await fetchRoomGameState(client, roomId);
        if (!row) return null;
        if (row.status === "finished") {
          setRoomRejected(true);
          onBackToLobby();
          return null;
        }
        return row.game_state;
      };

      let snapshot = await loadSnapshot();
      if (cancelled) return;
      if (snapshot) {
        setBootstrapSnapshot(snapshot);
        return;
      }

      if (myRole !== "player_a") {
        for (let attempt = 1; attempt <= 30; attempt++) {
          if (cancelled) return;
          await new Promise((resolve) => setTimeout(resolve, 1000));
          snapshot = await loadSnapshot();
          if (cancelled) return;
          if (snapshot) {
            setBootstrapSnapshot(snapshot);
            return;
          }
        }
        return;
      }

      if (deckCards.length === 0) return;

      const initialState = createInitialGameState(deckCards);
      const { data: inserted } = await client
        .from("game_rooms")
        .update({
          game_state: initialState,
          status: "playing",
          player_a_connected: true,
          player_b_connected: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", roomId)
        .is("game_state", null)
        .select("game_state")
        .maybeSingle();

      if (cancelled) return;

      if (hasPersistedGameState(inserted?.game_state)) {
        setBootstrapSnapshot(inserted.game_state as SimulationState);
        return;
      }

      for (let attempt = 1; attempt <= 15; attempt++) {
        if (cancelled) return;
        snapshot = await loadSnapshot();
        if (cancelled) return;
        if (snapshot) {
          setBootstrapSnapshot(snapshot);
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    void bootstrapRoom();
    return () => {
      cancelled = true;
    };
  }, [roomId, myRole, cards, roomRejected, onBackToLobby]);

  if (roomRejected) {
    return null;
  }

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
          onRematchReady={onRematchReady}
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
