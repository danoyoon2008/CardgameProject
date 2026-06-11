"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { createClient } from "@/utils/supabase/client";

const DEV_PASSWORD = "1234";

interface GameStatRow {
  id: string;
  room_id: string | null;
  room_type: string;
  game_mode: string;
  player_a_id: string | null;
  player_b_id: string | null;
  player_a_nickname: string | null;
  player_b_nickname: string | null;
  winner: string | null;
  turn_count: number | null;
  elapsed_seconds: number | null;
  played_at: string;
  unit_stats: Array<{
    id: string;
    cardName: string;
    player: "A" | "B";
    summonedTurn: string;
    damageDealt: number;
    kills: number;
    damageTaken: number;
    selfHeal: number;
    allyHealGiven: number;
    damageMitigated: number;
  }>;
}

function formatElapsed(seconds: number | null): string {
  if (!seconds) return "-";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}분 ${s}초`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ko-KR", {
    month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

interface UnitStat {
  cardName: string;
  player: "A" | "B";
  damageDealt: number;
  kills: number;
  damageTaken: number;
  selfHeal: number;
  allyHealGiven: number;
  damageMitigated: number;
}

interface AggregatedUnit {
  cardName: string;
  games: number;
  wins: number;
  damageDealt: number;
  kills: number;
  damageTaken: number;
  selfHeal: number;
  allyHealGiven: number;
  damageMitigated: number;
}

interface PlayerAgg {
  nickname: string;
  games: number;
  wins: number;
  unitCount: Record<string, { count: number; wins: number }>;
  recentGames: GameStatRow[];
}

function MetricsTab({ stats }: { stats: GameStatRow[] }) {
  const [subTab, setSubTab] = useState<"units" | "players">("units");
  const [expandedName, setExpandedName] = useState<string | null>(null);

  const unitMap = useMemo(() => {
    const map: Record<string, AggregatedUnit> = {};
    for (const game of stats) {
      for (const u of game.unit_stats as UnitStat[]) {
        if (!map[u.cardName]) {
          map[u.cardName] = { cardName: u.cardName, games: 0, wins: 0, damageDealt: 0, kills: 0, damageTaken: 0, selfHeal: 0, allyHealGiven: 0, damageMitigated: 0 };
        }
        const agg = map[u.cardName];
        agg.games += 1;
        const playerWon = (u.player === "A" && game.winner === "A") || (u.player === "B" && game.winner === "B");
        if (playerWon) agg.wins += 1;
        agg.damageDealt += u.damageDealt;
        agg.kills += u.kills;
        agg.damageTaken += u.damageTaken;
        agg.selfHeal += u.selfHeal;
        agg.allyHealGiven += u.allyHealGiven;
        agg.damageMitigated += u.damageMitigated;
      }
    }
    return map;
  }, [stats]);

  const unitList = useMemo(() =>
    Object.values(unitMap).sort((a, b) => b.games - a.games),
    [unitMap]
  );

  const playerMap = useMemo(() => {
    const map: Record<string, PlayerAgg> = {};
    const ensure = (id: string, nick: string) => {
      if (!map[id]) map[id] = { nickname: nick, games: 0, wins: 0, unitCount: {}, recentGames: [] };
    };
    for (const game of stats) {
      if (game.player_a_id) {
        ensure(game.player_a_id, game.player_a_nickname ?? "A");
        const p = map[game.player_a_id];
        p.games += 1;
        if (game.winner === "A") p.wins += 1;
        p.recentGames.push(game);
        for (const u of game.unit_stats as UnitStat[]) {
          if (u.player === "A") {
            if (!p.unitCount[u.cardName]) p.unitCount[u.cardName] = { count: 0, wins: 0 };
            p.unitCount[u.cardName].count += 1;
            if (game.winner === "A") p.unitCount[u.cardName].wins += 1;
          }
        }
      }
      if (game.player_b_id) {
        ensure(game.player_b_id, game.player_b_nickname ?? "B");
        const p = map[game.player_b_id];
        p.games += 1;
        if (game.winner === "B") p.wins += 1;
        p.recentGames.push(game);
        for (const u of game.unit_stats as UnitStat[]) {
          if (u.player === "B") {
            if (!p.unitCount[u.cardName]) p.unitCount[u.cardName] = { count: 0, wins: 0 };
            p.unitCount[u.cardName].count += 1;
            if (game.winner === "B") p.unitCount[u.cardName].wins += 1;
          }
        }
      }
    }
    return map;
  }, [stats]);

  const playerList = useMemo(() =>
    Object.entries(playerMap)
      .map(([id, p]) => ({ id, ...p }))
      .sort((a, b) => b.games - a.games),
    [playerMap]
  );

  const cellStyle: CSSProperties = { padding: "7px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)", whiteSpace: "nowrap" };
  const headStyle: CSSProperties = { ...cellStyle, color: "#475569", fontWeight: 700, fontSize: 12 };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {(["units", "players"] as const).map(t => (
          <button key={t} onClick={() => { setSubTab(t); setExpandedName(null); }}
            style={{ padding: "6px 18px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer",
              background: subTab === t ? "rgba(14,165,233,0.25)" : "rgba(255,255,255,0.05)",
              color: subTab === t ? "#38bdf8" : "#64748b" }}>
            {t === "units" ? "유닛 지표" : "플레이어 지표"}
          </button>
        ))}
      </div>

      {subTab === "units" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {unitList.length === 0 && <div style={{ color: "#475569", padding: 32 }}>데이터 없음</div>}
          {unitList.map(u => {
            const winRate = u.games > 0 ? Math.round((u.wins / u.games) * 100) : 0;
            const expanded = expandedName === u.cardName;
            return (
              <div key={u.cardName}>
                <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: expanded ? "12px 12px 0 0" : 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ fontSize: 20, width: 36, textAlign: "center" }}>🃏</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#e2e8f0" }}>{u.cardName}</div>
                  </div>
                  <div style={{ fontSize: 13, color: winRate >= 50 ? "#4ade80" : "#f87171", fontWeight: 700, minWidth: 60, textAlign: "right" }}>
                    승률 {winRate}%
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", minWidth: 50, textAlign: "right" }}>
                    {u.games}판
                  </div>
                  <button onClick={() => setExpandedName(expanded ? null : u.cardName)}
                    style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 7, color: "#94a3b8", fontSize: 16, cursor: "pointer", padding: "2px 10px" }}>
                    ···
                  </button>
                </div>
                {expanded && (
                  <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderTop: "none", borderRadius: "0 0 12px 12px", padding: 16, overflowX: "auto" }}>
                    <table style={{ borderCollapse: "collapse", fontSize: 13, width: "100%" }}>
                      <thead>
                        <tr>
                          {["항목", "입힌 피해", "총 처치", "받은 피해", "자가힐", "힐 제공", "피해 감소"].map(h => (
                            <th key={h} style={headStyle}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ ...cellStyle, color: "#94a3b8", fontWeight: 700 }}>합산 ({u.games}판)</td>
                          <td style={{ ...cellStyle, color: "#f97316" }}>{u.damageDealt.toLocaleString()}</td>
                          <td style={{ ...cellStyle, color: "#ef4444" }}>{u.kills}</td>
                          <td style={{ ...cellStyle, color: "#94a3b8" }}>{u.damageTaken.toLocaleString()}</td>
                          <td style={{ ...cellStyle, color: "#22c55e" }}>{u.selfHeal.toLocaleString()}</td>
                          <td style={{ ...cellStyle, color: "#4ade80" }}>{u.allyHealGiven.toLocaleString()}</td>
                          <td style={{ ...cellStyle, color: "#60a5fa" }}>{u.damageMitigated.toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td style={{ ...cellStyle, color: "#94a3b8", fontWeight: 700 }}>판당 평균</td>
                          <td style={{ ...cellStyle, color: "#f97316" }}>{u.games > 0 ? Math.round(u.damageDealt / u.games).toLocaleString() : 0}</td>
                          <td style={{ ...cellStyle, color: "#ef4444" }}>{u.games > 0 ? (u.kills / u.games).toFixed(2) : 0}</td>
                          <td style={{ ...cellStyle, color: "#94a3b8" }}>{u.games > 0 ? Math.round(u.damageTaken / u.games).toLocaleString() : 0}</td>
                          <td style={{ ...cellStyle, color: "#22c55e" }}>{u.games > 0 ? Math.round(u.selfHeal / u.games).toLocaleString() : 0}</td>
                          <td style={{ ...cellStyle, color: "#4ade80" }}>{u.games > 0 ? Math.round(u.allyHealGiven / u.games).toLocaleString() : 0}</td>
                          <td style={{ ...cellStyle, color: "#60a5fa" }}>{u.games > 0 ? Math.round(u.damageMitigated / u.games).toLocaleString() : 0}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {subTab === "players" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {playerList.length === 0 && <div style={{ color: "#475569", padding: 32 }}>데이터 없음</div>}
          {playerList.map(p => {
            const winRate = p.games > 0 ? Math.round((p.wins / p.games) * 100) : 0;
            const expanded = expandedName === p.id;
            const top5Units = Object.entries(p.unitCount)
              .sort((a, b) => b[1].count - a[1].count)
              .slice(0, 5);
            return (
              <div key={p.id}>
                <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: expanded ? "12px 12px 0 0" : 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ fontSize: 20 }}>👤</div>
                  <div style={{ flex: 1, fontSize: 14, fontWeight: 800, color: "#e2e8f0" }}>{p.nickname}</div>
                  <div style={{ fontSize: 13, color: winRate >= 50 ? "#4ade80" : "#f87171", fontWeight: 700, minWidth: 60, textAlign: "right" }}>
                    승률 {winRate}%
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", minWidth: 50, textAlign: "right" }}>{p.games}판</div>
                  <button onClick={() => setExpandedName(expanded ? null : p.id)}
                    style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 7, color: "#94a3b8", fontSize: 16, cursor: "pointer", padding: "2px 10px" }}>
                    ···
                  </button>
                </div>
                {expanded && (
                  <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderTop: "none", borderRadius: "0 0 12px 12px", padding: 16 }}>
                    <div style={{ fontSize: 12, color: "#475569", fontWeight: 700, marginBottom: 10 }}>자주 사용한 유닛 TOP 5</div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
                      {top5Units.map(([name, data]) => {
                        const wr = data.count > 0 ? Math.round((data.wins / data.count) * 100) : 0;
                        return (
                          <div key={name} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "10px 14px", minWidth: 110, textAlign: "center" }}>
                            <div style={{ fontSize: 24, marginBottom: 4 }}>🃏</div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 2 }}>{name}</div>
                            <div style={{ fontSize: 11, color: "#64748b" }}>{data.count}판</div>
                            <div style={{ fontSize: 11, color: wr >= 50 ? "#4ade80" : "#f87171", fontWeight: 700 }}>승률 {wr}%</div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ fontSize: 12, color: "#475569", fontWeight: 700, marginBottom: 10 }}>참여 게임 전적</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {p.recentGames.slice(0, 20).map(game => (
                        <div key={game.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 9, padding: "9px 14px", display: "flex", alignItems: "center", gap: 12, fontSize: 12 }}>
                          <div style={{ color: "#475569", minWidth: 80 }}>{formatDate(game.played_at)}</div>
                          <div style={{ padding: "2px 7px", borderRadius: 5, background: game.room_type === "friend" ? "rgba(99,102,241,0.2)" : "rgba(14,165,233,0.2)", color: game.room_type === "friend" ? "#818cf8" : "#38bdf8", fontWeight: 700, fontSize: 11 }}>
                            {game.room_type === "friend" ? "친선전" : "글로벌"}
                          </div>
                          <div style={{ flex: 1 }}>
                            <span style={{ color: "#7dd3fc" }}>{game.player_a_nickname ?? "A"}</span>
                            <span style={{ color: "#475569", margin: "0 6px" }}>vs</span>
                            <span style={{ color: "#fca5a5" }}>{game.player_b_nickname ?? "B"}</span>
                          </div>
                          <div style={{ fontWeight: 700, color: game.winner === "A" ? "#7dd3fc" : game.winner === "B" ? "#fca5a5" : "#94a3b8" }}>
                            {game.winner === "A" ? `${game.player_a_nickname ?? "A"} 승` : game.winner === "B" ? `${game.player_b_nickname ?? "B"} 승` : "무승부"}
                          </div>
                          <div style={{ color: "#475569" }}>{formatElapsed(game.elapsed_seconds)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DevStatsPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState(false);
  const [tab, setTab] = useState<"records" | "metrics">("records");
  const [stats, setStats] = useState<GameStatRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleUnlock = () => {
    if (pwInput === DEV_PASSWORD) {
      setUnlocked(true);
      setPwError(false);
    } else {
      setPwError(true);
    }
  };

  useEffect(() => {
    if (!unlocked) return;
    setLoading(true);
    const supabase = createClient();
    if (!supabase) return;
    supabase
      .from("game_stats")
      .select("*")
      .order("played_at", { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setStats((data as GameStatRow[]) ?? []);
        setLoading(false);
      });
  }, [unlocked]);

  if (!unlocked) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse at 50% 30%, #0d1f3c 0%, #050a14 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "sans-serif",
      }}>
        <div style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 20,
          padding: "40px 48px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
          minWidth: 320,
        }}>
          <div style={{ fontSize: 32, fontWeight: 900, color: "#e2e8f0", letterSpacing: 2 }}>
            🔒 DEV STATS
          </div>
          <div style={{ fontSize: 13, color: "#64748b" }}>PowerPrime 개발자 전용</div>
          <input
            type="password"
            value={pwInput}
            onChange={e => { setPwInput(e.target.value); setPwError(false); }}
            onKeyDown={e => e.key === "Enter" && handleUnlock()}
            placeholder="비밀번호 입력"
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: 10,
              border: `1px solid ${pwError ? "#ef4444" : "rgba(255,255,255,0.15)"}`,
              background: "rgba(255,255,255,0.06)",
              color: "#e2e8f0",
              fontSize: 15,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          {pwError && <div style={{ color: "#ef4444", fontSize: 12 }}>비밀번호가 올바르지 않습니다.</div>}
          <button
            onClick={handleUnlock}
            style={{
              width: "100%",
              padding: "11px 0",
              borderRadius: 10,
              border: "none",
              background: "linear-gradient(90deg, #0ea5e9, #6366f1)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            접속
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 50% 30%, #0d1f3c 0%, #050a14 100%)",
      color: "#e2e8f0",
      fontFamily: "sans-serif",
      padding: "32px 24px",
    }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
          <span style={{ fontSize: 26, fontWeight: 900, letterSpacing: 2 }}>⚡ DEV STATS</span>
          <span style={{ fontSize: 12, color: "#475569", background: "rgba(255,255,255,0.05)", padding: "3px 10px", borderRadius: 20 }}>
            PowerPrime 개발자 전용
          </span>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
          {(["records", "metrics"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "8px 22px",
                borderRadius: 10,
                border: "none",
                background: tab === t ? "linear-gradient(90deg, #0ea5e9, #6366f1)" : "rgba(255,255,255,0.06)",
                color: tab === t ? "#fff" : "#94a3b8",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              {t === "records" ? "게임 기록 및 전적" : "모든 지표"}
            </button>
          ))}
        </div>

        {tab === "records" && (
          <div>
            {loading && <div style={{ color: "#64748b", padding: 32 }}>불러오는 중...</div>}
            {!loading && stats.length === 0 && (
              <div style={{ color: "#64748b", padding: 32 }}>저장된 게임 기록이 없습니다.</div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {stats.map(row => (
                <div key={row.id}>
                  <div style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 14,
                    padding: "14px 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                  }}>
                    <div style={{ fontSize: 12, color: "#475569", minWidth: 90 }}>
                      {formatDate(row.played_at)}
                    </div>

                    <div style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 6,
                      background: row.room_type === "friend" ? "rgba(99,102,241,0.2)" : "rgba(14,165,233,0.2)",
                      color: row.room_type === "friend" ? "#818cf8" : "#38bdf8",
                      minWidth: 48,
                      textAlign: "center",
                    }}>
                      {row.room_type === "friend" ? "친선전" : "글로벌"}
                    </div>

                    <div style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>
                      <span style={{ color: "#7dd3fc" }}>{row.player_a_nickname ?? "Player A"}</span>
                      <span style={{ color: "#475569", margin: "0 8px" }}>vs</span>
                      <span style={{ color: "#fca5a5" }}>{row.player_b_nickname ?? "Player B"}</span>
                    </div>

                    <div style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: row.winner === "A" ? "#7dd3fc" : row.winner === "B" ? "#fca5a5" : "#94a3b8",
                      minWidth: 80,
                      textAlign: "center",
                    }}>
                      {row.winner === "A"
                        ? `${row.player_a_nickname ?? "A"} 승`
                        : row.winner === "B"
                        ? `${row.player_b_nickname ?? "B"} 승`
                        : "무승부"}
                    </div>

                    <div style={{ fontSize: 12, color: "#64748b", minWidth: 70, textAlign: "right" }}>
                      {formatElapsed(row.elapsed_seconds)}
                    </div>

                    <div style={{ fontSize: 12, color: "#64748b", minWidth: 50, textAlign: "right" }}>
                      {row.turn_count != null ? `T${row.turn_count}` : "-"}
                    </div>

                    <button
                      onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        border: "none",
                        borderRadius: 8,
                        color: "#94a3b8",
                        fontSize: 18,
                        cursor: "pointer",
                        padding: "2px 10px",
                        lineHeight: 1,
                      }}
                    >
                      ···
                    </button>
                  </div>

                  {expandedId === row.id && (
                    <div style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderTop: "none",
                      borderRadius: "0 0 14px 14px",
                      padding: "16px 20px",
                      overflowX: "auto",
                    }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead>
                          <tr style={{ color: "#475569" }}>
                            {["진영", "카드명", "소환 턴", "딜량", "킬", "피해", "자가힐", "힐 제공", "피해 감소"].map(h => (
                              <th key={h} style={{ textAlign: "left", padding: "6px 10px", borderBottom: "1px solid rgba(255,255,255,0.06)", whiteSpace: "nowrap" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {row.unit_stats.length === 0 && (
                            <tr><td colSpan={9} style={{ color: "#475569", padding: 12 }}>유닛 통계 없음</td></tr>
                          )}
                          {row.unit_stats.map((u, i) => (
                            <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                              <td style={{ padding: "6px 10px", color: u.player === "A" ? "#7dd3fc" : "#fca5a5" }}>
                                {u.player === "A" ? (row.player_a_nickname ?? "A") : (row.player_b_nickname ?? "B")}
                              </td>
                              <td style={{ padding: "6px 10px", fontWeight: 700 }}>{u.cardName}</td>
                              <td style={{ padding: "6px 10px", color: "#64748b" }}>{u.summonedTurn}</td>
                              <td style={{ padding: "6px 10px", color: "#f97316" }}>{u.damageDealt.toLocaleString()}</td>
                              <td style={{ padding: "6px 10px", color: "#ef4444" }}>{u.kills}</td>
                              <td style={{ padding: "6px 10px", color: "#94a3b8" }}>{u.damageTaken.toLocaleString()}</td>
                              <td style={{ padding: "6px 10px", color: "#22c55e" }}>{u.selfHeal.toLocaleString()}</td>
                              <td style={{ padding: "6px 10px", color: "#4ade80" }}>{u.allyHealGiven.toLocaleString()}</td>
                              <td style={{ padding: "6px 10px", color: "#60a5fa" }}>{u.damageMitigated.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "metrics" && (
          <MetricsTab stats={stats} />
        )}
      </div>
    </div>
  );
}
