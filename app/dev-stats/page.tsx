"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { createClient } from "@/utils/supabase/client";

const DEV_PASSWORD = "1234";

const ADMIN_USER_IDS = [
  "9dce5c0e-7540-480b-b88b-597f40432158",
  "83954306-319c-4287-bb5c-275d69717f46",
  "dbc01cba-456e-4c0b-bce8-22df2b7bcf5d",
];

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
  deck_a: number[] | null;
  deck_b: number[] | null;
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

interface CardMeta {
  name: string;
  number: number | string;
  rarity: string;
  cost: number | string;
  image_url: string | null;
}

function parseCardNumber(value: any, fallback = 0): number {
  const n = Number(value);
  return isNaN(n) ? fallback : n;
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

function MetricsTab({ stats, cardMeta }: { stats: GameStatRow[]; cardMeta: Record<string, CardMeta> }) {
  const [subTab, setSubTab] = useState<"units" | "players">("units");
  const [expandedName, setExpandedName] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<
    "number" | "rarity" | "cost" | "pickRate" | "winRate" |
    "damageDealt" | "kills" | "damageTaken" | "selfHeal" | "allyHealGiven" | "damageMitigated"
  >("number");

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

  const totalGames = stats.length;

  const unitList = useMemo(() => {
    const list = Object.values(unitMap);
    return list.sort((a, b) => {
      const ma = cardMeta[a.cardName];
      const mb = cardMeta[b.cardName];
      if (sortBy === "number") {
        return parseCardNumber(ma?.number, 99999) - parseCardNumber(mb?.number, 99999);
      }
      if (sortBy === "rarity") {
        const order: Record<string, number> = { C: 0, R: 1, E: 2, L: 3, A: 4 };
        const ra = order[ma?.rarity ?? ""] ?? 9;
        const rb = order[mb?.rarity ?? ""] ?? 9;
        return ra - rb;
      }
      if (sortBy === "cost") return (Number(ma?.cost) || 0) - (Number(mb?.cost) || 0);
      // 지표 기반 정렬 (높은 순)
      const pickRate = (u: AggregatedUnit) => (totalGames > 0 ? u.games / totalGames : 0);
      const winRate = (u: AggregatedUnit) => (u.games > 0 ? u.wins / u.games : 0);
      if (sortBy === "pickRate") return pickRate(b) - pickRate(a);
      if (sortBy === "winRate") return winRate(b) - winRate(a);
      const avg = (val: number, games: number) => (games > 0 ? val / games : 0);
      if (sortBy === "damageDealt") return avg(b.damageDealt, b.games) - avg(a.damageDealt, a.games);
      if (sortBy === "kills") return avg(b.kills, b.games) - avg(a.kills, a.games);
      if (sortBy === "damageTaken") return avg(b.damageTaken, b.games) - avg(a.damageTaken, a.games);
      if (sortBy === "selfHeal") return avg(b.selfHeal, b.games) - avg(a.selfHeal, a.games);
      if (sortBy === "allyHealGiven") return avg(b.allyHealGiven, b.games) - avg(a.allyHealGiven, a.games);
      if (sortBy === "damageMitigated") return avg(b.damageMitigated, b.games) - avg(a.damageMitigated, a.games);
      return 0;
    });
  }, [unitMap, cardMeta, sortBy, totalGames]);

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
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {([
            { key: "number", label: "번호순" },
            { key: "rarity", label: "레어도" },
            { key: "cost", label: "코스트" },
            { key: "pickRate", label: "픽률" },
            { key: "winRate", label: "승률" },
            { key: "damageDealt", label: "입힌 피해" },
            { key: "kills", label: "처치 수" },
            { key: "damageTaken", label: "받은 피해" },
            { key: "selfHeal", label: "자가 회복" },
            { key: "allyHealGiven", label: "아군 회복" },
            { key: "damageMitigated", label: "피해 경감" },
          ] as const).map(({ key, label }) => (
            <button key={key} onClick={() => setSortBy(key)}
              style={{
                padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
                background: sortBy === key ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.05)",
                color: sortBy === key ? "#a5b4fc" : "#64748b",
              }}>
              {label}
            </button>
          ))}
        </div>
      )}

      {subTab === "units" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {unitList.length === 0 && <div style={{ color: "#475569", padding: 32 }}>데이터 없음</div>}
          {unitList.map(u => {
            const winRate = u.games > 0 ? Math.round((u.wins / u.games) * 100) : 0;
            const expanded = expandedName === u.cardName;
            return (
              <div key={u.cardName}>
                <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: expanded ? "12px 12px 0 0" : 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 40, aspectRatio: "53.98 / 85.6", borderRadius: 6, overflow: "hidden", flexShrink: 0, background: "rgba(255,255,255,0.05)" }}>
                    {cardMeta[u.cardName]?.image_url ? (
                      <img src={cardMeta[u.cardName].image_url!} alt={u.cardName}
                        style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🃏</div>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#e2e8f0" }}>{u.cardName}</div>
                  </div>
                  <div style={{ fontSize: 13, color: "#a5b4fc", fontWeight: 700, minWidth: 60, textAlign: "right" }}>
                    픽률 {totalGames > 0 ? Math.round((u.games / totalGames) * 100) : 0}%
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
            const usedUnits = Object.entries(p.unitCount)
              .sort((a, b) => b[1].count - a[1].count);
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
                    <div style={{ fontSize: 12, color: "#475569", fontWeight: 700, marginBottom: 10 }}>유닛 사용 통계</div>
                    <div className="pp-thin-scroll" style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8, marginBottom: 20 }}>
                      {usedUnits.map(([name, data]) => {
                        const wr = data.count > 0 ? Math.round((data.wins / data.count) * 100) : 0;
                        return (
                          <div key={name} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "10px 14px", minWidth: 110, flexShrink: 0, textAlign: "center" }}>
                            <div style={{ width: 52, aspectRatio: "53.98 / 85.6", borderRadius: 7, overflow: "hidden", margin: "0 auto 6px", background: "rgba(255,255,255,0.05)" }}>
                              {cardMeta[name]?.image_url ? (
                                <img src={cardMeta[name].image_url!} alt={name}
                                  style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                              ) : (
                                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🃏</div>
                              )}
                            </div>
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
  const [modeTab, setModeTab] = useState<"all" | "classic" | "normal">("all");
  const [stats, setStats] = useState<GameStatRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [cardMeta, setCardMeta] = useState<Record<string, CardMeta>>({});
  const [cardMetaById, setCardMetaById] = useState<Record<number, CardMeta>>({});
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
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
    supabase
      .from("game_stats")
      .select("*")
      .order("played_at", { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setStats((data as GameStatRow[]) ?? []);
        setLoading(false);
      });

    supabase
      .from("cards")
      .select("id, name, number, rarity, cost, image_url, category")
      .then(({ data }) => {
        const rows = [...(data ?? [])].sort(
          (a, b) => parseCardNumber(a.number) - parseCardNumber(b.number),
        );
        const map: Record<string, CardMeta> = {};
        const byId: Record<number, CardMeta> = {};
        for (const c of rows as (CardMeta & { id: number | string; category?: string })[]) {
          const meta: CardMeta = {
            ...c,
            number: parseCardNumber(c.number),
            cost: Number(c.cost) || 0,
          };
          if (c.category === "unit") {
            map[c.name] = meta;
          }
          byId[Number(c.id)] = meta;
        }
        setCardMeta(map);
        setCardMetaById(byId);
      });
  }, [unlocked]);

  const filteredStats = useMemo(() => {
    if (modeTab === "all") return stats;
    return stats.filter((s) => {
      const mode = s.game_mode === "normal" ? "normal" : "classic";
      return mode === modeTab;
    });
  }, [stats, modeTab]);

  const isAdmin = currentUserId != null && ADMIN_USER_IDS.includes(currentUserId);

  const renderDeck = (deck: number[] | null, color: string) => {
    if (!deck || deck.length === 0) return null;
    return (
      <div style={{ flex: "1 1 0", minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color, marginBottom: 8, letterSpacing: 1 }}>DECK</div>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: 4,
        }}>
          {deck.map((cardId, i) => {
            const meta = cardMetaById[Number(cardId)];
            return (
              <div key={`${cardId}-${i}`} style={{
                aspectRatio: "53.98 / 85.6",
                borderRadius: 4, overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
                title={meta?.name ?? String(cardId)}
              >
                {meta?.image_url ? (
                  <img src={meta.image_url} alt={meta.name}
                    style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                ) : (
                  <span style={{ fontSize: 8, color: "#64748b" }}>{cardId}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const handleDeleteGame = async (gameId: string) => {
    if (!isAdmin) {
      alert("이 계정은 전적 삭제 권한이 없습니다.");
      setDeleteTargetId(null);
      return;
    }
    setDeleting(true);
    const supabase = createClient();
    if (!supabase) { setDeleting(false); return; }

    const { error } = await supabase.from("game_stats").delete().eq("id", gameId);
    setDeleting(false);

    if (error) {
      alert("삭제에 실패했습니다: " + error.message);
      return;
    }
    setStats(prev => prev.filter(g => g.id !== gameId));
    setDeleteTargetId(null);
    if (expandedId === gameId) setExpandedId(null);
  };

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

        {/* 상위 분류: 게임 모드 */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {([
            { key: "all", label: "전체 모드" },
            { key: "classic", label: "클래식 모드" },
            { key: "normal", label: "일반전 모드" },
          ] as const).map((m) => (
            <button
              key={m.key}
              onClick={() => setModeTab(m.key)}
              style={{
                padding: "8px 22px",
                borderRadius: 10,
                border: modeTab === m.key ? "2px solid #38bdf8" : "2px solid transparent",
                background: modeTab === m.key ? "rgba(56,189,248,0.15)" : "rgba(255,255,255,0.04)",
                color: modeTab === m.key ? "#7dd3fc" : "#64748b",
                fontWeight: 800,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              {m.label}
            </button>
          ))}
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
            {!loading && filteredStats.length === 0 && (
              <div style={{ color: "#64748b", padding: 32 }}>저장된 게임 기록이 없습니다.</div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filteredStats.map(row => (
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

                    <div style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 6,
                      background: row.game_mode === "normal" ? "rgba(245,158,11,0.2)" : "rgba(148,163,184,0.18)",
                      color: row.game_mode === "normal" ? "#fbbf24" : "#94a3b8",
                      minWidth: 48,
                      textAlign: "center",
                    }}>
                      {row.game_mode === "normal" ? "일반전" : "클래식"}
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
                    {isAdmin && (
                      <button
                        onClick={() => setDeleteTargetId(row.id)}
                        title="이 전적 삭제"
                        style={{
                          background: "rgba(239,68,68,0.12)",
                          border: "1px solid rgba(239,68,68,0.3)",
                          borderRadius: 8,
                          color: "#f87171",
                          fontSize: 14,
                          cursor: "pointer",
                          padding: "4px 10px",
                          lineHeight: 1,
                        }}
                      >
                        🗑
                      </button>
                    )}
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
                      {row.game_mode === "normal" && (row.deck_a || row.deck_b) && (
                        <div style={{
                          display: "flex",
                          gap: 24,
                          marginBottom: 18,
                          paddingBottom: 16,
                          borderBottom: "1px solid rgba(255,255,255,0.08)",
                        }}>
                          {renderDeck(row.deck_a, "#7dd3fc")}
                          {renderDeck(row.deck_b, "#fca5a5")}
                        </div>
                      )}
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
          <MetricsTab stats={filteredStats} cardMeta={cardMeta} />
        )}
      </div>

        {deleteTargetId && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
            onClick={() => !deleting && setDeleteTargetId(null)}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: "#0f172a",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: 16,
                padding: "28px 32px",
                display: "flex", flexDirection: "column", gap: 18,
                minWidth: 320, maxWidth: 400,
              }}
            >
              <div style={{ fontSize: 17, fontWeight: 800, color: "#f87171" }}>전적 삭제</div>
              <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.6 }}>
                이 게임 기록을 영구적으로 삭제합니다.<br />
                삭제된 전적은 모든 통계 집계에서 제외되며, 되돌릴 수 없습니다.
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  disabled={deleting}
                  onClick={() => setDeleteTargetId(null)}
                  style={{
                    padding: "8px 18px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)",
                    background: "transparent", color: "#94a3b8", fontSize: 13, fontWeight: 700,
                    cursor: deleting ? "not-allowed" : "pointer",
                  }}
                >
                  취소
                </button>
                <button
                  disabled={deleting}
                  onClick={() => handleDeleteGame(deleteTargetId)}
                  style={{
                    padding: "8px 18px", borderRadius: 10, border: "none",
                    background: "#dc2626", color: "#fff", fontSize: 13, fontWeight: 800,
                    cursor: deleting ? "not-allowed" : "pointer",
                    opacity: deleting ? 0.6 : 1,
                  }}
                >
                  {deleting ? "삭제 중..." : "삭제"}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
