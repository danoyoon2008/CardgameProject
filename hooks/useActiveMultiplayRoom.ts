"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { PlayerRole } from "@/hooks/useMatchmaking";

export type ActiveMultiplayRoom = {
  roomId: string;
  myRole: PlayerRole;
  isFriendBattle?: boolean;
};

export function useActiveMultiplayRoom(userId: string | undefined | null, enabled: boolean) {
  const [activeRoom, setActiveRoom] = useState<ActiveMultiplayRoom | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled || !userId) {
      setActiveRoom(null);
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setActiveRoom(null);
      return;
    }

    const { data, error } = await supabase
      .from("game_rooms")
      .select("id, player_a_id, player_b_id, status")
      .eq("status", "playing")
      .neq("status", "finished")
      .or(`player_a_id.eq.${userId},player_b_id.eq.${userId}`)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      setActiveRoom(null);
      return;
    }

    const myRole: PlayerRole = data.player_a_id === userId ? "player_a" : "player_b";
    setActiveRoom({ roomId: data.id, myRole });
  }, [enabled, userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { activeRoom, refreshActiveMultiplayRoom: refresh };
}
