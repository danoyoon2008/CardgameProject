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

type GameRoomRow = {
  id: string;
  player_a_id: string;
  player_b_id: string;
  status?: string;
};

async function fetchPlayingUserIds(): Promise<Set<string>> {
  const supabase = createClient();
  if (!supabase) return new Set();

  const { data, error } = await supabase
    .from("game_rooms")
    .select("player_a_id, player_b_id")
    .eq("status", "playing");

  if (error) {
    console.warn("[matchmaking] playing 방 조회 실패:", error.message);
    return new Set();
  }

  const ids = new Set<string>();
  for (const row of data ?? []) {
    if (row.player_a_id) ids.add(row.player_a_id);
    if (row.player_b_id) ids.add(row.player_b_id);
  }
  return ids;
}

async function isUserInPlayingGame(userId: string): Promise<boolean> {
  const supabase = createClient();
  if (!supabase) return false;

  const { data, error } = await supabase
    .from("game_rooms")
    .select("id")
    .or(`player_a_id.eq.${userId},player_b_id.eq.${userId}`)
    .eq("status", "playing")
    .limit(1);

  if (error) {
    console.warn("[matchmaking] 참여 중 방 조회 실패:", error.message);
    return false;
  }

  return (data?.length ?? 0) > 0;
}

export function useMatchmaking() {
  const [matchStatus, setMatchStatus] = useState<MatchStatus>("idle");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<PlayerRole | null>(null);
  const [opponentNickname, setOpponentNickname] = useState<string | null>(null);

  const queueChannelRef = useRef<RealtimeChannel | null>(null);
  const roomsChannelRef = useRef<RealtimeChannel | null>(null);
  const matchingRef = useRef(false);
  const matchedRef = useRef(false);
  const userIdRef = useRef<string | null>(null);

  const unsubscribeChannels = useCallback(() => {
    const supabase = createClient();
    if (!supabase) return;

    if (queueChannelRef.current) {
      void supabase.removeChannel(queueChannelRef.current);
      queueChannelRef.current = null;
    }
    if (roomsChannelRef.current) {
      void supabase.removeChannel(roomsChannelRef.current);
      roomsChannelRef.current = null;
    }
  }, []);

  const fetchOpponentNickname = useCallback(async (opponentId: string) => {
    const supabase = createClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from("user_profiles")
      .select("nickname")
      .eq("id", opponentId)
      .maybeSingle();

    if (error) {
      console.warn("[matchmaking] 상대 닉네임 조회 실패:", error.message);
      return null;
    }

    return typeof data?.nickname === "string" ? data.nickname : null;
  }, []);

  const completeMatch = useCallback(
    async (params: { roomId: string; role: PlayerRole; opponentId: string }) => {
      if (matchedRef.current) return;

      matchedRef.current = true;
      matchingRef.current = false;
      unsubscribeChannels();

      setRoomId(params.roomId);
      setMyRole(params.role);
      setMatchStatus("matched");

      const nickname = await fetchOpponentNickname(params.opponentId);
      setOpponentNickname(nickname);
    },
    [fetchOpponentNickname, unsubscribeChannels],
  );

  const finalizeMatch = useCallback(
    async (myUserId: string, matchedRoomId: string, role: PlayerRole, opponentId: string) => {
      const supabase = createClient();
      if (!supabase) {
        setMatchStatus("error");
        return;
      }

      const { error: ownUpdateError } = await supabase
        .from("matchmaking_queue")
        .update({ status: "matched", room_id: matchedRoomId })
        .eq("user_id", myUserId);

      if (ownUpdateError) {
        console.error("[matchmaking] 내 큐 업데이트 실패:", ownUpdateError.message);
        setMatchStatus("error");
        matchingRef.current = false;
        return;
      }

      await supabase
        .from("matchmaking_queue")
        .update({ status: "matched", room_id: matchedRoomId })
        .eq("user_id", opponentId);

      await completeMatch({ roomId: matchedRoomId, role, opponentId });
    },
    [completeMatch],
  );

  const attemptMatch = useCallback(
    async (myUserId: string, opponent: MatchmakingQueueRow) => {
      if (matchedRef.current || matchingRef.current) return;

      const supabase = createClient();
      if (!supabase) {
        setMatchStatus("error");
        return;
      }

      matchingRef.current = true;

      try {
        if (await isUserInPlayingGame(myUserId)) {
          matchingRef.current = false;
          return;
        }

        const { data: freshOpponent, error: opponentError } = await supabase
          .from("matchmaking_queue")
          .select("id, user_id, status, room_id, created_at")
          .eq("user_id", opponent.user_id)
          .maybeSingle();

        if (opponentError) {
          console.error("[matchmaking] 상대 큐 확인 실패:", opponentError.message);
          matchingRef.current = false;
          return;
        }

        if (!freshOpponent || freshOpponent.status !== "waiting") {
          matchingRef.current = false;
          return;
        }

        if (await isUserInPlayingGame(opponent.user_id)) {
          matchingRef.current = false;
          return;
        }

        const { data: room, error: roomError } = await supabase
          .from("game_rooms")
          .insert({
            player_a_id: myUserId,
            player_b_id: opponent.user_id,
            status: "waiting",
            player_a_connected: true,
            player_b_connected: true,
          })
          .select("id")
          .single();

        if (roomError || !room) {
          console.error("[matchmaking] 방 생성 실패:", roomError?.message);
          matchingRef.current = false;
          return;
        }

        await supabase
          .from("game_rooms")
          .update({ status: "playing", updated_at: new Date().toISOString() })
          .eq("id", room.id);

        await finalizeMatch(myUserId, room.id, "player_a", opponent.user_id);
      } catch (error) {
        console.error("[matchmaking] 매칭 시도 중 오류:", error);
        setMatchStatus("error");
        matchingRef.current = false;
      }
    },
    [finalizeMatch],
  );

  const findWaitingOpponent = useCallback(async (myUserId: string) => {
    const supabase = createClient();
    if (!supabase) return null;

    const playingIds = await fetchPlayingUserIds();

    const { data, error } = await supabase
      .from("matchmaking_queue")
      .select("id, user_id, status, room_id, created_at")
      .eq("status", "waiting")
      .neq("user_id", myUserId)
      .order("created_at", { ascending: true })
      .limit(20);

    if (error) {
      console.error("[matchmaking] 대기 상대 조회 실패:", error.message);
      return null;
    }

    return (data ?? []).find((row) => !playingIds.has(row.user_id)) ?? null;
  }, []);

  const subscribeToQueueInserts = useCallback(
    (myUserId: string) => {
      const supabase = createClient();
      if (!supabase) return;

      const channel = supabase
        .channel(`matchmaking-queue-${myUserId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "matchmaking_queue" },
          (payload) => {
            const row = payload.new as MatchmakingQueueRow;
            if (row.user_id === myUserId || row.status !== "waiting") return;
            void attemptMatch(myUserId, row);
          },
        )
        .subscribe();

      queueChannelRef.current = channel;
    },
    [attemptMatch],
  );

  const subscribeToRoomInserts = useCallback(
    (myUserId: string) => {
      const supabase = createClient();
      if (!supabase) return;

      const channel = supabase
        .channel(`matchmaking-rooms-${myUserId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "game_rooms" },
          async (payload) => {
            if (matchedRef.current) return;

            const room = payload.new as GameRoomRow;
            if (room.player_b_id !== myUserId) return;
            if (room.status === "finished") return;
            if (await isUserInPlayingGame(myUserId)) return;

            const supabaseClient = createClient();
            if (!supabaseClient) return;

            await supabaseClient
              .from("matchmaking_queue")
              .update({ status: "matched", room_id: room.id })
              .eq("user_id", myUserId);

            await completeMatch({
              roomId: room.id,
              role: "player_b",
              opponentId: room.player_a_id,
            });
          },
        )
        .subscribe();

      roomsChannelRef.current = channel;
    },
    [completeMatch],
  );

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
      console.error("[matchmaking] 로그인 필요:", authError?.message);
      setMatchStatus("error");
      return;
    }

    await supabase
      .from("game_rooms")
      .update({ status: "finished", updated_at: new Date().toISOString() })
      .or(`player_a_id.eq.${user.id},player_b_id.eq.${user.id}`)
      .eq("status", "waiting");

    const { data: existingPlayingRooms, error: existingPlayingRoomsError } = await supabase
      .from("game_rooms")
      .select("id")
      .eq("status", "playing")
      .or(`player_a_id.eq.${user.id},player_b_id.eq.${user.id}`)
      .limit(1);

    if (existingPlayingRoomsError) {
      console.error("[matchmaking] 기존 playing 방 조회 실패:", existingPlayingRoomsError.message);
      setMatchStatus("error");
      return;
    }

    const existingRoomId = existingPlayingRooms?.[0]?.id ?? null;
    if (existingRoomId) {
      const { data: existingRoom, error: existingRoomError } = await supabase
        .from("game_rooms")
        .select("player_a_id, player_b_id")
        .eq("id", existingRoomId)
        .maybeSingle();

      if (existingRoomError || !existingRoom) {
        console.error("[matchmaking] 기존 playing 방 정보 조회 실패:", existingRoomError?.message);
        setMatchStatus("error");
        return;
      }

      const reconnectRole: PlayerRole = existingRoom.player_a_id === user.id ? "player_a" : "player_b";
      const opponentId =
        reconnectRole === "player_a" ? existingRoom.player_b_id : existingRoom.player_a_id;

      if (!opponentId) {
        console.error("[matchmaking] 재접속 상대 정보가 없습니다.");
        setMatchStatus("error");
        return;
      }

      await completeMatch({
        roomId: existingRoomId,
        role: reconnectRole,
        opponentId,
      });
      return;
    }

    unsubscribeChannels();
    matchedRef.current = false;
    matchingRef.current = false;
    userIdRef.current = user.id;

    setMatchStatus("searching");
    setRoomId(null);
    setMyRole(null);
    setOpponentNickname(null);

    const { error: deleteError } = await supabase
      .from("matchmaking_queue")
      .delete()
      .eq("user_id", user.id)
      .eq("status", "waiting");

    if (deleteError) {
      console.error("[matchmaking] 기존 대기열 삭제 실패:", deleteError.message);
      setMatchStatus("error");
      return;
    }

    const { error: insertError } = await supabase
      .from("matchmaking_queue")
      .insert({ user_id: user.id, status: "waiting" });

    if (insertError) {
      console.error("[matchmaking] 대기열 등록 실패:", insertError.message);
      setMatchStatus("error");
      return;
    }

    subscribeToRoomInserts(user.id);

    const opponent = await findWaitingOpponent(user.id);
    if (opponent) {
      await attemptMatch(user.id, opponent);
      return;
    }

    subscribeToQueueInserts(user.id);
  }, [
    attemptMatch,
    findWaitingOpponent,
    subscribeToQueueInserts,
    subscribeToRoomInserts,
    unsubscribeChannels,
  ]);

  const cancelMatchmaking = useCallback(async () => {
    unsubscribeChannels();
    matchingRef.current = false;
    matchedRef.current = false;

    const myUserId = userIdRef.current;
    userIdRef.current = null;

    if (myUserId) {
      const supabase = createClient();
      if (supabase) {
        const { error } = await supabase.from("matchmaking_queue").delete().eq("user_id", myUserId);
        if (error) {
          console.warn("[matchmaking] 큐 삭제 실패:", error.message);
        }
      }
    }

    setMatchStatus("idle");
    setRoomId(null);
    setMyRole(null);
    setOpponentNickname(null);
  }, [unsubscribeChannels]);

  const cancelMatchmakingRef = useRef(cancelMatchmaking);
  cancelMatchmakingRef.current = cancelMatchmaking;

  useEffect(() => {
    return () => {
      void cancelMatchmakingRef.current();
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
