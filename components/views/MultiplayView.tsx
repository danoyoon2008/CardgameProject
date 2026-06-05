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
  const drawRequestCooldownTurnRef = useRef<number>(0);
  const suppressVisibilityRef = useRef(false);
  const witchTarotTransferRef = useRef<{ stepIndex: number; casterPlayer: "A" | "B" } | null>(null);

  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [witchTarotTransferTick, setWitchTarotTransferTick] = useState(0);
  const [showDrawIncoming, setShowDrawIncoming] = useState(false);
  const [drawRejected, setDrawRejected] = useState(false);
  const [disconnectSecondsLeft, setDisconnectSecondsLeft] = useState<number | null>(null);
  const [sessionWinner, setSessionWinner] = useState<"A" | "B" | "DRAW" | null>(null);
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
    onWitchTarotTransfer: (stepIndex: number, casterPlayer: "A" | "B") => {
      void channelRef.current?.send({
        type: "broadcast",
        event: "witch_tarot_transfer",
        payload: { stepIndex, casterPlayer },
      });
    },
  };

  useEffect(() => {
    if (hasHydrated.current) return;
    hasHydrated.current = true;
    setIsInitializing(false);
    setState(bootstrapSnapshot);

    // 재접속 상황 대비: 마운트 직후 DB에서 최신 game_state를 한 번 더 확인
    // bootstrapSnapshot이 약간 오래된 상태일 수 있기 때문
    const supabase = createClient();
    if (!supabase) return;
    void supabase
      .from("game_rooms")
      .select("game_state, status")
      .eq("id", roomId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) return;
        if (data.status === "finished") return;
        if (
          data.game_state &&
          typeof data.game_state === "object" &&
          "turnCount" in (data.game_state as object)
        ) {
          const dbState = data.game_state as SimulationState;
          // DB 상태가 bootstrapSnapshot보다 턴이 더 진행됐으면 DB 상태 우선 적용
          const currentTurn = (bootstrapSnapshot as SimulationState).turnCount ?? 0;
          const dbTurn = dbState.turnCount ?? 0;
          if (dbTurn > currentTurn) {
            setState(dbState);
          }
        }
      });
  }, [bootstrapSnapshot, setState, setIsInitializing, roomId]);

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

  const handleSurrender = useCallback(() => {
    if (gameFinishedRef.current) return;
    const loserTeam: "A" | "B" = myRole === "player_a" ? "A" : "B";
    const winnerTeam: "A" | "B" = loserTeam === "A" ? "B" : "A";
    const winnerRole: PlayerRole = winnerTeam === "A" ? "player_a" : "player_b";

    void channelRef.current?.send({
      type: "broadcast",
      event: "opponent_surrendered",
      payload: {},
    });

    void markGameFinished(winnerRole, winnerTeam);
  }, [myRole, markGameFinished]);

  const handleDrawRequest = useCallback((currentTurnCount: number) => {
    if (gameFinishedRef.current) return;
    drawRequestCooldownTurnRef.current = currentTurnCount + 5;
    void channelRef.current?.send({
      type: "broadcast",
      event: "draw_request",
      payload: {},
    });
  }, []);

  const handleDrawAccept = useCallback(() => {
    if (gameFinishedRef.current) return;
    gameFinishedRef.current = true;
    setShowDrawIncoming(false);
    setSessionWinner("DRAW");
    void channelRef.current?.send({
      type: "broadcast",
      event: "draw_accept",
      payload: {},
    });
    const supabase = createClient();
    if (supabase) {
      void supabase
        .from("game_rooms")
        .update({ status: "finished", updated_at: new Date().toISOString() })
        .eq("id", roomId);
    }
  }, [roomId]);

  const handleDrawReject = useCallback(() => {
    setShowDrawIncoming(false);
    void channelRef.current?.send({
      type: "broadcast",
      event: "draw_reject",
      payload: {},
    });
  }, []);

  const triggerRematchIfBothReady = useCallback(async () => {
    if (rematchBothReadyRef.current) return;
    if (!myRematchRequested || !opponentRematchRequested) return;
    rematchBothReadyRef.current = true;
    // 재매칭 전 현재 방 반드시 finished 처리
    const supabase = createClient();
    if (supabase) {
      await supabase
        .from("game_rooms")
        .update({ status: "finished", updated_at: new Date().toISOString() })
        .eq("id", roomId)
        .neq("status", "finished");
    }
    onRematchReady();
  }, [myRematchRequested, opponentRematchRequested, onRematchReady, roomId]);

  useEffect(() => {
    void triggerRematchIfBothReady();
  }, [myRematchRequested, opponentRematchRequested, triggerRematchIfBothReady]);

  const handleLeaveLobby = useCallback(async () => {
    const supabase = createClient();
    if (supabase) {
      if (!gameFinishedRef.current) {
        // 정상 이탈: 상대방에게 패배 처리
        await finishGameRoom(supabase, roomId, opponentRole);
        gameFinishedRef.current = true;
        void channelRef.current?.send({
          type: "broadcast",
          event: "opponent_left",
          payload: {},
        });
      } else {
        // 이미 종료된 게임(무승부 등): DB가 finished인지 확인 후 아니면 강제 종료
        await supabase
          .from("game_rooms")
          .update({ status: "finished", updated_at: new Date().toISOString() })
          .eq("id", roomId)
          .neq("status", "finished");
      }
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

        // 상대 행동 수신 시 DB에도 저장 — 재접속 시 복원 기반
        const supabaseForSync = createClient();
        if (supabaseForSync) {
          void supabaseForSync
            .from("game_rooms")
            .update({ game_state: remote, updated_at: new Date().toISOString() })
            .eq("id", roomId)
            .eq("status", "playing");
        }
      })
      .on("broadcast", { event: "request_state_sync" }, () => {
        // 상대가 재접속해서 현재 상태를 요청함 — 즉시 최신 상태 전송
        const latest = stateRef.current;
        if (!latest || gameFinishedRef.current) return;
        const ch = channelRef.current;
        if (ch) {
          void ch.send({
            type: "broadcast",
            event: "game_state_update",
            payload: { game_state: latest },
          });
        }
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
      .on("broadcast", { event: "opponent_surrendered" }, () => {
        if (gameFinishedRef.current) return;
        const myWinnerTeam: "A" | "B" = myRole === "player_a" ? "A" : "B";
        const myWinnerRole: PlayerRole = myRole;
        void markGameFinished(myWinnerRole, myWinnerTeam);
      })
      .on("broadcast", { event: "draw_request" }, () => {
        if (gameFinishedRef.current) return;
        setShowDrawIncoming(true);
      })
      .on("broadcast", { event: "draw_accept" }, () => {
        if (gameFinishedRef.current) return;
        gameFinishedRef.current = true;
        setSessionWinner("DRAW");
        const supabaseDraw = createClient();
        if (supabaseDraw) {
          void supabaseDraw
            .from("game_rooms")
            .update({ status: "finished", updated_at: new Date().toISOString() })
            .eq("id", roomId);
        }
      })
      .on("broadcast", { event: "draw_reject" }, () => {
        setDrawRejected(true);
        setTimeout(() => setDrawRejected(false), 4000);
      })
      .on("broadcast", { event: "witch_tarot_transfer" }, ({ payload }) => {
        const { stepIndex, casterPlayer } = payload as { stepIndex: number; casterPlayer: "A" | "B" };
        const myLetter: "A" | "B" = myRole === "player_a" ? "A" : "B";
        const stepPlayer = stepIndex < 2 ? casterPlayer : (casterPlayer === "A" ? "B" : "A");
        if (stepPlayer !== myLetter) return; // 내 스텝이 아님

        // 내 스텝 — 즉시 시퀀스 시작 요청
        setState(prev => prev); // 강제 리렌더 없이 외부 트리거만
        witchTarotTransferRef.current = { stepIndex, casterPlayer };
        setWitchTarotTransferTick(t => t + 1);
      });

    // 재접속 감지: 구독 완료 후 상대에게 현재 상태 요청
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        void channel.send({
          type: "broadcast",
          event: "request_state_sync",
          payload: {},
        });
      }
    });

    channelRef.current = channel;

    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomId, setState, myRematchRequested, myRole, markGameFinished]);

  useEffect(() => {
    if (witchTarotTransferTick === 0) return;
    const transfer = witchTarotTransferRef.current;
    if (!transfer) return;
    witchTarotTransferRef.current = null;

    // SimulationView의 runWitchTarotCurrentStep을 직접 트리거할 수 없으므로
    // state를 통해 stepIndex가 반영된 상태로 restoreWitchTarotSession이 작동하도록 함
    // controlledSimulation의 setState로 witchTarotPending을 재설정
    setState(prev => {
      const snap = prev as (SimulationState & {
        witchTarotPending?: { stepIndex: number } & Record<string, unknown> | null;
      }) | null;
      if (!snap?.witchTarotPending) return prev;
      return {
        ...snap,
        witchTarotPending: {
          ...snap.witchTarotPending,
          stepIndex: transfer.stepIndex,
        },
      } as SimulationState;
    });
  }, [witchTarotTransferTick, setState]);

  const evaluateOpponentConnection = useCallback(
    (row: GameRoomConnectionRow) => {
      const lastSeenMs = parseOpponentLastSeenMs(row, myRole);
      if (lastSeenMs != null) {
        opponentLastSeenMsRef.current = lastSeenMs;
      }
      // connected 필드는 무시하고 last_seen 기반으로만 판정
      // (모달 열기/닫기로 인한 visibilitychange 오탐 방지)
      const stale = isOpponentHeartbeatStale(opponentLastSeenMsRef.current);
      setOpponentDisconnected(stale);
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
            // winner가 null인 경우:
            // 무승부(draw_accept)로 인한 finished일 수 있으므로
            // 즉시 로비로 보내지 않고 잠시 대기 후 sessionWinner가 없을 때만 로비로 이동
            gameFinishedRef.current = true;
            setTimeout(() => {
              setSessionWinner((prev) => {
                if (prev === null) {
                  // draw_accept Broadcast도 못 받은 경우 → DRAW로 처리
                  return "DRAW";
                }
                return prev;
              });
            }, 1500);
          }
        }
        return;
      }

      evaluateOpponentConnection(row);
    },
    [evaluateOpponentConnection, onBackToLobby],
  );

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

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

    let visibilityHideTimer: ReturnType<typeof setTimeout> | null = null;
    const handleVisibilityChange = () => {
      if (suppressVisibilityRef.current) return;
      if (document.visibilityState === "hidden") {
        visibilityHideTimer = setTimeout(() => {
          if (document.visibilityState === "hidden" && !suppressVisibilityRef.current) {
            void markConnected(false);
          }
        }, 8000);
      } else if (document.visibilityState === "visible") {
        if (visibilityHideTimer) {
          clearTimeout(visibilityHideTimer);
          visibilityHideTimer = null;
        }
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
      if (visibilityHideTimer) clearTimeout(visibilityHideTimer);
      // Broadcast로 즉시 이탈 알림 (postgres_changes보다 빠름)
      void channelRef.current?.send({
        type: "broadcast",
        event: "player_disconnected",
        payload: { role: myRole },
      });
      void markConnected(false);
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
            onOpenDetail={(card) => {
              suppressVisibilityRef.current = true;
              onOpenDetail?.(card);
              // 상세보기 닫힘 시점을 직접 알기 어려워 안전하게 자동 복원
              setTimeout(() => {
                suppressVisibilityRef.current = false;
              }, 10000);
            }}
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
              onSurrender: handleSurrender,
              onDrawRequest: handleDrawRequest,
              onDrawAccept: handleDrawAccept,
              onDrawReject: handleDrawReject,
              showDrawIncoming,
              drawRejected,
              drawRequestCooldownTurn: drawRequestCooldownTurnRef.current,
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
        const supabaseClient = createClient();
        if (supabaseClient) {
          await supabaseClient
            .from("game_rooms")
            .update({ status: "finished", updated_at: new Date().toISOString() })
            .eq("id", roomId);
        }
        if (!cancelled) onBackToLobby();
        return;
      }

      if (deckCards.length === 0) return;

      // player_a 재접속 시: DB에 이미 game_state가 있으면 새로 만들지 않음
      const recheckSnapshot = await loadSnapshot();
      if (cancelled) return;
      if (recheckSnapshot) {
        setBootstrapSnapshot(recheckSnapshot);
        return;
      }

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
      if (!cancelled) onBackToLobby();
      return;
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
