"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

const DEV_PASSWORD = "1234";

interface GameStatRow {
  id: string;
  room_id: string | null;
  room_type: string;
  game_mode: string;
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
          <div style={{ color: "#475569", padding: 48, textAlign: "center", fontSize: 15 }}>
            준비 중입니다.
          </div>
        )}
      </div>
    </div>
  );
}
