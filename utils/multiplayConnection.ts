import type { PlayerRole } from "@/hooks/useMatchmaking";

export const MULTIPLAY_HEARTBEAT_INTERVAL_MS = 10_000;
export const MULTIPLAY_OPPONENT_STALE_MS = 20_000;

export const MY_CONNECTED_FIELD: Record<PlayerRole, "player_a_connected" | "player_b_connected"> = {
  player_a: "player_a_connected",
  player_b: "player_b_connected",
};

export const OPP_CONNECTED_FIELD: Record<PlayerRole, "player_a_connected" | "player_b_connected"> = {
  player_a: "player_b_connected",
  player_b: "player_a_connected",
};

export const MY_LAST_SEEN_FIELD: Record<PlayerRole, "player_a_last_seen" | "player_b_last_seen"> = {
  player_a: "player_a_last_seen",
  player_b: "player_b_last_seen",
};

export const OPP_LAST_SEEN_FIELD: Record<PlayerRole, "player_a_last_seen" | "player_b_last_seen"> = {
  player_a: "player_b_last_seen",
  player_b: "player_a_last_seen",
};

export type GameRoomConnectionRow = {
  player_a_connected?: boolean | null;
  player_b_connected?: boolean | null;
  player_a_last_seen?: string | null;
  player_b_last_seen?: string | null;
  status?: string | null;
  winner?: string | null;
  updated_at?: string | null;
};

export function parseOpponentLastSeenMs(row: GameRoomConnectionRow, myRole: PlayerRole): number | null {
  const raw = row[OPP_LAST_SEEN_FIELD[myRole]];
  if (!raw) return null;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : null;
}

export function isOpponentHeartbeatStale(lastSeenMs: number | null, nowMs = Date.now()): boolean {
  if (lastSeenMs == null) return false;
  return nowMs - lastSeenMs > MULTIPLAY_OPPONENT_STALE_MS;
}

/** beforeunload / pagehide — fetch keepalive로 connected false 전송 */
export function sendDisconnectedKeepalive(
  roomId: string,
  myRole: PlayerRole,
  accessToken: string,
): void {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !supabaseAnonKey) return;

  const field = MY_CONNECTED_FIELD[myRole];
  const lastSeenField = MY_LAST_SEEN_FIELD[myRole];
  const now = new Date().toISOString();
  const url = `${supabaseUrl}/rest/v1/game_rooms?id=eq.${roomId}`;

  void fetch(url, {
    method: "PATCH",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      [field]: false,
      [lastSeenField]: now,
      updated_at: now,
    }),
    keepalive: true,
  });
}
