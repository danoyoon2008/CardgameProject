"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";

export type MatchStatus = "idle" | "searching" | "matched" | "error";
export type PlayerRole = "player_a" | "player_b";

type MatchmakingQueueRow = {
  id: string;
  user_id: string;
  status: string;
  room_id: string | null;
  created_at: string;
};

// -------------------------------------------------------
// 상대 닉네임 조회
// -------------------------------------------------------
async function fetchNickname(opponentId: string): Promise<string | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("user_profiles")
    .select("nickname")
    .eq("id", opponentId)
    .maybeSingle();
  return typeof data?.nickname === "string" ? data.nickname : null;
}

// -------------------------------------------------------
// 현재 유저가 포함된 playing 방 조회 (재접속 판정용)
// -------------------------------------------------------
async function findMyPlayingRoom(
  userId: string
): Promise<{ id: string; player_a_id: string; player_b_id: string } | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("game_rooms")
    .select("id, player_a_id, player_b_id")
    .or(`player_a_id.eq.${userId},player_b_id.eq.${userId}`)
    .eq("status", "playing")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

// -------------------------------------------------------
// 매칭 시작 전 비정상 방 일괄 정리
// -------------------------------------------------------
async function cleanupStaleRooms(userId: string): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;
  await supabase
    .from("game_rooms")
    .update({ status: "finished", updated_at: new Date().toISOString() })
    .or(`player_a_id.eq.${userId},player_b_id.eq.${userId}`)
    .in("status", ["waiting"]);
}

// -------------------------------------------------------
// Hook
// -------------------------------------------------------
export function useMatchmaking() {
  const [matchStatus, setMatchStatus] = useState<MatchStatus>("idle");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<PlayerRole | null>(null);
  const [opponentNickname, setOpponentNickname] = useState<string | null>(null);

  const queueChannelRef = useRef<RealtimeChannel | null>(null);
  const roomChannelRef = useRef<RealtimeChannel | null>(null);
  const matchedRef = useRef(false);
  const makingRoomRef = useRef(false);
  const userIdRef = useRef<string | null>(null);

  // -------------------------------------------------------
  // 채널 구독 해제
  // -------------------------------------------------------
  const unsubscribeAll = useCallback(() => {
    const supabase = createClient();
    if (!supabase) return;
    if (queueChannelRef.current) {
      void supabase.removeChannel(queueChannelRef.current);
      queueChannelRef.current = null;
    }
    if (roomChannelRef.current) {
      void supabase.removeChannel(roomChannelRef.current);
      roomChannelRef.current = null;
    }
  }, []);

  // -------------------------------------------------------
  // 매칭 완료 처리 (양쪽 공통)
  // -------------------------------------------------------
  const finishMatch = useCallback(
    async (params: { roomId: string; role: PlayerRole; opponentId: string }) => {
      if (matchedRef.current) return;
      matchedRef.current = true;
      makingRoomRef.current = false;
      unsubscribeAll();

      setRoomId(params.roomId);
      setMyRole(params.role);
      setMatchStatus("matched");

      const nickname = await fetchNickname(params.opponentId);
      setOpponentNickname(nickname);
    },
    [unsubscribeAll]
  );

  // -------------------------------------------------------
  // player_a: 방 생성 + 큐 상태 업데이트
  // -------------------------------------------------------
  const makeRoom = useCallback(
    async (myUserId: string, opponent: MatchmakingQueueRow) => {
      // 이미 방을 만들고 있거나 매칭 완료된 경우 중단
      if (makingRoomRef.current || matchedRef.current) return;
      makingRoomRef.current = true;

      const supabase = createClient();
      if (!supabase) {
        makingRoomRef.current = false;
        setMatchStatus("error");
        return;
      }

      try {
        // 상대가 아직 waiting 상태인지 재확인
        const { data: freshOpponent } = await supabase
          .from("matchmaking_queue")
          .select("status")
          .eq("user_id", opponent.user_id)
          .maybeSingle();

        if (freshOpponent?.status !== "waiting") {
          makingRoomRef.current = false;
          return;
        }

        // 방 INSERT (status: playing으로 바로 생성)
        // DB 유니크 인덱스가 중복 방 생성을 막아줌
        const { data: room, error: roomError } = await supabase
          .from("game_rooms")
          .insert({
            player_a_id: myUserId,
            player_b_id: opponent.user_id,
            status: "playing",
            player_a_connected: true,
            player_b_connected: true,
          })
          .select("id")
          .single();

        if (roomError || !room) {
          console.error("[matchmaking] 방 생성 실패:", roomError?.message);
          makingRoomRef.current = false;
          return;
        }

        // 두 유저의 큐 상태를 matched로 업데이트
        await supabase
          .from("matchmaking_queue")
          .update({ status: "matched", room_id: room.id })
          .in("user_id", [myUserId, opponent.user_id]);

        await finishMatch({ roomId: room.id, role: "player_a", opponentId: opponent.user_id });
      } catch (err) {
        console.error("[matchmaking] makeRoom 오류:", err);
        makingRoomRef.current = false;
        setMatchStatus("error");
      }
    },
    [finishMatch]
  );

  // -------------------------------------------------------
  // player_a: 대기 중인 상대 검색
  // -------------------------------------------------------
  const findOpponent = useCallback(async (myUserId: string): Promise<MatchmakingQueueRow | null> => {
    const supabase = createClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from("matchmaking_queue")
      .select("id, user_id, status, room_id, created_at")
      .eq("status", "waiting")
      .neq("user_id", myUserId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[matchmaking] 상대 검색 실패:", error.message);
      return null;
    }
    return data ?? null;
  }, []);

  // -------------------------------------------------------
  // player_a 역할: 큐 INSERT 이벤트 구독
  // 새 유저가 들어오면 방 생성 시도
  // -------------------------------------------------------
  const subscribeAsPlayerA = useCallback(
    (myUserId: string) => {
      const supabase = createClient();
      if (!supabase) return;

      const channel = supabase
        .channel(`matchmaking-queue-watch-${myUserId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "matchmaking_queue" },
          (payload) => {
            if (matchedRef.current || makingRoomRef.current) return;
            const row = payload.new as MatchmakingQueueRow;
            if (row.user_id === myUserId || row.status !== "waiting") return;
            void makeRoom(myUserId, row);
          }
        )
        .subscribe();

      queueChannelRef.current = channel;
    },
    [makeRoom]
  );

  // -------------------------------------------------------
  // player_b 역할: game_rooms INSERT 이벤트 구독
  // 자신이 포함된 방이 생성되면 매칭 완료 처리
  // -------------------------------------------------------
  const subscribeAsPlayerB = useCallback(
    (myUserId: string) => {
      const supabase = createClient();
      if (!supabase) return;

      const channel = supabase
        .channel(`matchmaking-room-watch-${myUserId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "game_rooms" },
          async (payload) => {
            if (matchedRef.current) return;
            const room = payload.new as {
              id: string;
              player_a_id: string;
              player_b_id: string;
              status?: string;
            };
            if (room.player_b_id !== myUserId) return;
            if (room.status === "finished") return;

            const supabaseClient = createClient();
            if (!supabaseClient) return;

            await supabaseClient
              .from("matchmaking_queue")
              .update({ status: "matched", room_id: room.id })
              .eq("user_id", myUserId);

            await finishMatch({
              roomId: room.id,
              role: "player_b",
              opponentId: room.player_a_id,
            });
          }
        )
        .subscribe();

      roomChannelRef.current = channel;
    },
    [finishMatch]
  );

  // -------------------------------------------------------
  // 매칭 시작 (외부에서 호출)
  // -------------------------------------------------------
  const startMatchmaking = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) {
      setMatchStatus("error");
      return;
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setMatchStatus("error");
      return;
    }

    // 1. 비정상 방(waiting 상태로 남은 것) 먼저 정리
    await cleanupStaleRooms(user.id);

    // 2. 현재 playing 중인 방 확인 → 있으면 재접속
    const playingRoom = await findMyPlayingRoom(user.id);
    if (playingRoom) {
      const role: PlayerRole = playingRoom.player_a_id === user.id ? "player_a" : "player_b";
      const opponentId = role === "player_a" ? playingRoom.player_b_id : playingRoom.player_a_id;
      if (opponentId) {
        await finishMatch({ roomId: playingRoom.id, role, opponentId });
        return;
      }
    }

    // 3. 새 매칭 시작 준비
    unsubscribeAll();
    matchedRef.current = false;
    makingRoomRef.current = false;
    userIdRef.current = user.id;

    setMatchStatus("searching");
    setRoomId(null);
    setMyRole(null);
    setOpponentNickname(null);

    // 4. 기존 대기열 항목 삭제 후 새로 등록
    await supabase.from("matchmaking_queue").delete().eq("user_id", user.id);

    const { error: insertError } = await supabase
      .from("matchmaking_queue")
      .insert({ user_id: user.id, status: "waiting" });

    if (insertError) {
      console.error("[matchmaking] 큐 등록 실패:", insertError.message);
      setMatchStatus("error");
      return;
    }

    // 5. player_b 역할로 방 생성 이벤트 구독 (항상 먼저)
    subscribeAsPlayerB(user.id);

    // 6. 이미 대기 중인 상대가 있으면 player_a로서 방 생성
    const opponent = await findOpponent(user.id);
    if (opponent) {
      await makeRoom(user.id, opponent);
      return;
    }

    // 7. 상대가 없으면 player_a 역할로 큐 구독 (상대가 들어오길 대기)
    subscribeAsPlayerA(user.id);
  }, [
    finishMatch,
    unsubscribeAll,
    subscribeAsPlayerA,
    subscribeAsPlayerB,
    findOpponent,
    makeRoom,
  ]);

  // -------------------------------------------------------
  // 매칭 취소
  // -------------------------------------------------------
  const cancelMatchmaking = useCallback(async () => {
    unsubscribeAll();
    matchedRef.current = false;
    makingRoomRef.current = false;

    const myUserId = userIdRef.current;
    userIdRef.current = null;

    if (myUserId) {
      const supabase = createClient();
      if (supabase) {
        await supabase
          .from("matchmaking_queue")
          .delete()
          .eq("user_id", myUserId)
          .eq("status", "waiting");
      }
    }

    setMatchStatus("idle");
    setRoomId(null);
    setMyRole(null);
    setOpponentNickname(null);
  }, [unsubscribeAll]);

  // 컴포넌트 언마운트 시 자동 취소
  const cancelRef = useRef(cancelMatchmaking);
  cancelRef.current = cancelMatchmaking;
  useEffect(() => {
    return () => {
      void cancelRef.current();
    };
  }, []);

  return {
    matchStatus,
    roomId,
    myRole,
    opponentNickname,
    startMatchmaking,
    cancelMatchmaking,
  };
}
