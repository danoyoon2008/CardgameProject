// components/layout/Header.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import type { User } from "@supabase/supabase-js";
import { MainView } from "../../types/game";
import { IconUser, IconGold, IconToken, IconShard, IconPencil } from "../ui/Icons";
import MobileLobbyDrawer from "./mobile/MobileLobbyDrawer";
import { createClient } from "../../utils/supabase/client";
import {
  MOBILE_LOBBY_BASE_W,
  MOBILE_LOBBY_PAD_X,
  MOBILE_HEADER_H,
  MOBILE_HEADER_AVATAR,
  MOBILE_HEADER_NAME_FS,
  MOBILE_HEADER_CURRENCY_H,
  MOBILE_HEADER_CURRENCY_FS,
} from "./mobile/mobileLobbyConstants";

interface UserProfile {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
  last_seen_at: string | null;
  // 게임 진행 상태 (loadAllUsers에서 조합)
  inGame?: boolean;
  inGameModeLabel?: string; // 예: "클래식"
  inGamePlayerA?: string | null;
  inGamePlayerB?: string | null;
}

interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  other: UserProfile;
}

function HamburgerIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

function IconFriends() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="7" r="3" stroke="currentColor" strokeWidth={1.8} />
      <path d="M3 19c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
      <circle cx="18" cy="8" r="2.5" stroke="currentColor" strokeWidth={1.8} />
      <path d="M15 19c0-2.485 1.567-4.5 3.5-4.5" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
    </svg>
  );
}

function IconPersonAdd() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth={1.8} />
      <path d="M3 20c0-3.866 3.134-7 7-7" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
      <path d="M18 13v6M15 16h6" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
    </svg>
  );
}

interface HeaderProps {
  authReady: boolean;
  user: User | null;
  userAvatarUrl: string | null;
  currentDisplayName: string;
  isDarkMode: boolean;
  gold: number;
  primeTokens: number;
  cardShards: number;
  handleGoogleLogin: () => void;
  handleEditGold: () => void;
  handleEditTokens: () => void;
  handleEditShards: () => void;
  handleEditNickname?: () => void;
  layoutMobile?: boolean;
  mainView?: MainView;
  setMainView?: (view: MainView) => void;
  newCardIdsSize?: number;
  onSendFriendChallenge?: (friendId: string, friendNickname: string) => void;
}

export default function Header({
  authReady, user, userAvatarUrl, currentDisplayName, isDarkMode,
  gold, primeTokens, cardShards,
  handleGoogleLogin, handleEditGold, handleEditTokens, handleEditShards,
  handleEditNickname,
  layoutMobile = false,
  mainView = "battle",
  setMainView,
  newCardIdsSize = 0,
  onSendFriendChallenge,
}: HeaderProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [friendPanelOpen, setFriendPanelOpen] = useState(false);
  const friendPanelRef = useRef<HTMLDivElement>(null);

  // 친구 패널 탭
  const [friendTab, setFriendTab] = useState<"list" | "add" | "requests">("list");

  // 유저 검색
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<UserProfile[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  // 친구 목록 및 요청
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [friendRequests, setFriendRequests] = useState<Friendship[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [requestActionLoading, setRequestActionLoading] = useState<string | null>(null);
  const [sendRequestStatus, setSendRequestStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [selectedFriend, setSelectedFriend] = useState<Friendship | null>(null);
  const [showFriendProfile, setShowFriendProfile] = useState(false);
  const [showMyProfile, setShowMyProfile] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [profileDeck, setProfileDeck] = useState<number[] | null>(null);
  const [profileDeckLoading, setProfileDeckLoading] = useState(false);
  const [profileRecord, setProfileRecord] = useState<{
    all: { games: number; wins: number };
    classic: { games: number; wins: number };
    normal: { games: number; wins: number };
  } | null>(null);
  const [profileRecordLoading, setProfileRecordLoading] = useState(false);
  const [profileGames, setProfileGames] = useState<Array<{
    id: string;
    game_mode: string;
    room_type: string;
    player_a_id: string | null;
    player_b_id: string | null;
    player_a_nickname: string | null;
    player_b_nickname: string | null;
    winner: string | null;
    played_at: string;
  }> | null>(null);
  const profileRecordsRef = useRef<HTMLDivElement>(null);
  const [scrollToRecords, setScrollToRecords] = useState(false);
  const [cardMetaById, setCardMetaById] = useState<Record<number, { name: string; image_url: string | null; cost: number }>>({});

  const formatLastSeen = (lastSeenAt: string | null): string => {
    if (!lastSeenAt) return "접속 기록 없음";
    const diff = Date.now() - new Date(lastSeenAt).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 2) return "방금 전";
    if (minutes < 60) return `${minutes}분 전`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    return `${days}일 전`;
  };

  const isOnline = (lastSeenAt: string | null): boolean => {
    if (!lastSeenAt) return false;
    return Date.now() - new Date(lastSeenAt).getTime() < 120000; // 2분
  };

  const loadFriends = async () => {
    if (!user) return;
    setFriendsLoading(true);
    const supabase = createClient();
    if (!supabase) return;

    // 수락된 친구 목록
    const { data: accepted } = await supabase
      .from("friendships")
      .select("id, requester_id, addressee_id, status")
      .eq("status", "accepted")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (accepted) {
      const withProfiles = await Promise.all(
        accepted.map(async (f) => {
          const otherId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("id, nickname, avatar_url, last_seen_at")
            .eq("id", otherId)
            .single();
          return { ...f, other: profile as UserProfile };
        })
      );
      const validFriends = withProfiles.filter(f => f.other);

      // 친구들의 게임 진행 상태 조회
      if (validFriends.length > 0) {
        const friendIdsList = validFriends.map(f => f.other.id);
        const { data: roomData } = await supabase
          .from("game_rooms")
          .select("player_a_id, player_b_id, game_mode")
          .eq("status", "playing");

        if (roomData && roomData.length > 0) {
          const playerIds = Array.from(new Set(
            roomData.flatMap(r => [r.player_a_id, r.player_b_id])
          ));
          const { data: playerProfiles } = await supabase
            .from("user_profiles")
            .select("id, nickname")
            .in("id", playerIds);

          const nickMap = new Map<string, string | null>(
            (playerProfiles ?? []).map((p: { id: string; nickname: string | null }) => [p.id, p.nickname])
          );

          type RoomInfo = { modeLabel: string; playerANick: string | null; playerBNick: string | null };
          const inGameMap = new Map<string, RoomInfo>();
          for (const room of roomData) {
            const modeLabel = room.game_mode === "normal" ? "일반전" : "클래식";
            const info: RoomInfo = {
              modeLabel,
              playerANick: nickMap.get(room.player_a_id) ?? null,
              playerBNick: nickMap.get(room.player_b_id) ?? null,
            };
            inGameMap.set(room.player_a_id, info);
            inGameMap.set(room.player_b_id, info);
          }

          for (const f of validFriends) {
            const info = inGameMap.get(f.other.id);
            if (info) {
              f.other.inGame = true;
              f.other.inGameModeLabel = info.modeLabel;
              f.other.inGamePlayerA = info.playerANick;
              f.other.inGamePlayerB = info.playerBNick;
            }
          }
        }
      }

      setFriends(validFriends);
    }

    // 받은 친구 요청 목록
    const { data: pending } = await supabase
      .from("friendships")
      .select("id, requester_id, addressee_id, status")
      .eq("addressee_id", user.id)
      .eq("status", "pending");

    if (pending) {
      const withProfiles = await Promise.all(
        pending.map(async (f) => {
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("id, nickname, avatar_url, last_seen_at")
            .eq("id", f.requester_id)
            .single();
          return { ...f, other: profile as UserProfile };
        })
      );
      setFriendRequests(withProfiles.filter(f => f.other));
    }

    setFriendsLoading(false);
  };

  const searchUsers = async (query: string) => {
    if (!query.trim() || !user) return;
    setUserSearchLoading(true);
    const supabase = createClient();
    if (!supabase) { setUserSearchLoading(false); return; }

    const friendIds = new Set(friends.map(f => f.other.id));

    const { data: profileData } = await supabase
      .from("user_profiles")
      .select("id, nickname, avatar_url, last_seen_at")
      .ilike("nickname", `%${query}%`)
      .neq("id", user.id)
      .limit(50);

    const { data: roomData } = await supabase
      .from("game_rooms")
      .select("player_a_id, player_b_id, game_mode")
      .eq("status", "playing");

    type RoomInfo = { modeLabel: string; playerANick: string | null; playerBNick: string | null };
    const inGameMap = new Map<string, RoomInfo>();

    if (roomData && roomData.length > 0) {
      // 게임 중인 모든 플레이어 ID 수집
      const playerIds = Array.from(new Set(
        roomData.flatMap(r => [r.player_a_id, r.player_b_id])
      ));

      // 해당 플레이어들의 닉네임을 직접 조회 (profileData와 무관하게)
      const { data: playerProfiles } = await supabase
        .from("user_profiles")
        .select("id, nickname")
        .in("id", playerIds);

      const nickMap = new Map<string, string | null>(
        (playerProfiles ?? []).map((p: { id: string; nickname: string | null }) => [p.id, p.nickname])
      );

      for (const room of roomData) {
        const modeLabel = room.game_mode === "normal" ? "일반전" : "클래식";
        const info: RoomInfo = {
          modeLabel,
          playerANick: nickMap.get(room.player_a_id) ?? null,
          playerBNick: nickMap.get(room.player_b_id) ?? null,
        };
        inGameMap.set(room.player_a_id, info);
        inGameMap.set(room.player_b_id, info);
      }
    }

    const profiles = (profileData as UserProfile[] || []).map(p => ({
      ...p,
      inGame: inGameMap.has(p.id),
      inGameModeLabel: inGameMap.get(p.id)?.modeLabel ?? undefined,
      inGamePlayerA: inGameMap.get(p.id)?.playerANick ?? null,
      inGamePlayerB: inGameMap.get(p.id)?.playerBNick ?? null,
    }));

    const filtered = profiles.filter(u => !friendIds.has(u.id));
    setUserSearchResults(filtered);
    setUserSearchLoading(false);
  };

  const loadAllUsers = async () => {
    if (!user) return;
    setUserSearchLoading(true);
    const supabase = createClient();
    if (!supabase) { setUserSearchLoading(false); return; }

    const friendIds = new Set(friends.map(f => f.other.id));

    // 유저 목록 로드
    const { data: profileData } = await supabase
      .from("user_profiles")
      .select("id, nickname, avatar_url, last_seen_at")
      .neq("id", user.id)
      .order("last_seen_at", { ascending: false })
      .limit(100);

    // 현재 진행 중인 게임 방 목록 로드 (플레이어 닉네임 포함)
    const { data: roomData } = await supabase
      .from("game_rooms")
      .select("player_a_id, player_b_id, game_mode")
      .eq("status", "playing");

    // 각 방의 플레이어 닉네임 매핑 빌드
    type RoomInfo = { modeLabel: string; playerANick: string | null; playerBNick: string | null };
    const inGameMap = new Map<string, RoomInfo>();

    if (roomData && roomData.length > 0) {
      // 게임 중인 모든 플레이어 ID 수집
      const playerIds = Array.from(new Set(
        roomData.flatMap(r => [r.player_a_id, r.player_b_id])
      ));

      // 해당 플레이어들의 닉네임을 직접 조회 (profileData와 무관하게)
      const { data: playerProfiles } = await supabase
        .from("user_profiles")
        .select("id, nickname")
        .in("id", playerIds);

      const nickMap = new Map<string, string | null>(
        (playerProfiles ?? []).map((p: { id: string; nickname: string | null }) => [p.id, p.nickname])
      );

      for (const room of roomData) {
        const modeLabel = room.game_mode === "normal" ? "일반전" : "클래식";
        const info: RoomInfo = {
          modeLabel,
          playerANick: nickMap.get(room.player_a_id) ?? null,
          playerBNick: nickMap.get(room.player_b_id) ?? null,
        };
        inGameMap.set(room.player_a_id, info);
        inGameMap.set(room.player_b_id, info);
      }
    }

    const profiles = (profileData as UserProfile[] || []).map(p => ({
      ...p,
      inGame: inGameMap.has(p.id),
      inGameModeLabel: inGameMap.get(p.id)?.modeLabel ?? undefined,
      inGamePlayerA: inGameMap.get(p.id)?.playerANick ?? null,
      inGamePlayerB: inGameMap.get(p.id)?.playerBNick ?? null,
    }));

    const filtered = profiles.filter(u => !friendIds.has(u.id));
    setUserSearchResults(filtered);
    setUserSearchLoading(false);
  };

  const sendFriendRequest = async (targetId: string) => {
    if (!user) return;
    setSendRequestStatus("sending");
    const supabase = createClient();
    if (!supabase) { setSendRequestStatus("error"); return; }

    const { error } = await supabase
      .from("friendships")
      .insert({ requester_id: user.id, addressee_id: targetId, status: "pending" });

    setSendRequestStatus(error ? "error" : "sent");
    setTimeout(() => setSendRequestStatus("idle"), 2000);
  };

  const respondToRequest = async (friendshipId: string, accept: boolean) => {
    setRequestActionLoading(friendshipId);
    const supabase = createClient();
    if (!supabase) { setRequestActionLoading(null); return; }

    if (accept) {
      await supabase.from("friendships").update({ status: "accepted" }).eq("id", friendshipId);
    } else {
      await supabase.from("friendships").delete().eq("id", friendshipId);
    }

    await loadFriends();
    setRequestActionLoading(null);
  };

  const removeFriend = async (friendshipId: string) => {
    const supabase = createClient();
    if (!supabase) return;
    await supabase.from("friendships").delete().eq("id", friendshipId);
    setSelectedFriend(null);
    await loadFriends();
  };

  useEffect(() => {
    if (!friendPanelOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (friendPanelRef.current && !friendPanelRef.current.contains(e.target as Node)) {
        setFriendPanelOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [friendPanelOpen]);

  useEffect(() => {
    if (friendPanelOpen) {
      loadFriends();
      if (friendTab === "add") loadAllUsers();
    }
  }, [friendPanelOpen]);

  useEffect(() => {
    if (friendTab === "add") {
      setUserSearchQuery("");
      loadAllUsers();
      setSelectedUser(null);
    } else if (friendTab === "requests" || friendTab === "list") {
      loadFriends();
    }
  }, [friendTab]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (userSearchQuery.trim()) searchUsers(userSearchQuery);
      else if (friendTab === "add") loadAllUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearchQuery]);

  // 친구 요청 실시간 반영 — 15초마다 폴링
  useEffect(() => {
    if (!user || !friendPanelOpen) return;
    const interval = setInterval(() => {
      void loadFriends();
    }, 15000);
    return () => clearInterval(interval);
  }, [user, friendPanelOpen]);

  // 패널 닫혀있어도 요청 수 갱신 (뱃지 표시용) — 30초마다
  useEffect(() => {
    if (!user) return;
    const pollRequests = async () => {
      const supabase = createClient();
      if (!supabase) return;
      const { data } = await supabase
        .from("friendships")
        .select("id, requester_id, addressee_id, status")
        .eq("addressee_id", user.id)
        .eq("status", "pending");
      if (data) {
        const withProfiles = await Promise.all(
          data.map(async (f) => {
            const supa = createClient();
            if (!supa) return null;
            const { data: profile } = await supa
              .from("user_profiles")
              .select("id, nickname, avatar_url, last_seen_at")
              .eq("id", f.requester_id)
              .single();
            return profile ? { ...f, other: profile as UserProfile } : null;
          })
        );
        setFriendRequests(withProfiles.filter(Boolean) as Friendship[]);
      }
    };
    void pollRequests();
    const interval = setInterval(() => { void pollRequests(); }, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // 카드 메타(ID→이미지/코스트) 1회 로드 — 프로필 덱 표시에 사용
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    supabase
      .from("cards")
      .select("id, name, image_url, cost")
      .then(({ data }) => {
        if (!data) return;
        const byId: Record<number, { name: string; image_url: string | null; cost: number }> = {};
        for (const c of data as Array<{ id: number | string; name: string; image_url: string | null; cost: number | string }>) {
          byId[Number(c.id)] = { name: c.name, image_url: c.image_url, cost: Number(c.cost) || 0 };
        }
        setCardMetaById(byId);
      });
  }, []);

  const loadProfileRecord = (userId: string) => {
    const supabase = createClient();
    if (!supabase) return;
    setProfileRecordLoading(true);
    setProfileRecord(null);
    setProfileGames(null);

    supabase
      .from("game_stats")
      .select("id, player_a_id, player_b_id, player_a_nickname, player_b_nickname, winner, game_mode, room_type, played_at")
      .or(`player_a_id.eq.${userId},player_b_id.eq.${userId}`)
      .then(({ data }) => {
        setProfileRecordLoading(false);
        const rows = data ?? [];
        const acc = {
          all: { games: 0, wins: 0 },
          classic: { games: 0, wins: 0 },
          normal: { games: 0, wins: 0 },
        };
        for (const r of rows as Array<{ player_a_id: string | null; player_b_id: string | null; winner: string | null; game_mode: string }>) {
          const isA = r.player_a_id === userId;
          const won = (isA && r.winner === "A") || (!isA && r.winner === "B");
          const mode = r.game_mode === "normal" ? "normal" : "classic";
          acc.all.games += 1;
          acc[mode].games += 1;
          if (won) {
            acc.all.wins += 1;
            acc[mode].wins += 1;
          }
        }
        setProfileRecord(acc);
        const sorted = [...(rows as Array<{
          id: string; game_mode: string; room_type: string;
          player_a_id: string | null; player_b_id: string | null;
          player_a_nickname: string | null; player_b_nickname: string | null;
          winner: string | null; played_at: string;
        }>)].sort((a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime());
        setProfileGames(sorted.slice(0, 15));
      });
  };

  // 프로필 모달 열릴 때 해당 유저의 가장 최근 일반전 덱 로드
  useEffect(() => {
    if (!showFriendProfile || !selectedFriend?.other?.id) {
      setProfileDeck(null);
      setProfileRecord(null);
      setProfileGames(null);
      return;
    }
    const userId = selectedFriend.other.id;
    const supabase = createClient();
    if (!supabase) return;

    setProfileDeckLoading(true);
    setProfileDeck(null);
    loadProfileRecord(userId);

    supabase
      .from("game_stats")
      .select("player_a_id, player_b_id, deck_a, deck_b, played_at")
      .eq("game_mode", "normal")
      .or(`player_a_id.eq.${userId},player_b_id.eq.${userId}`)
      .order("played_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        setProfileDeckLoading(false);
        const row = data?.[0];
        if (!row) { setProfileDeck(null); return; }
        const deck = row.player_a_id === userId ? row.deck_a : row.deck_b;
        setProfileDeck(Array.isArray(deck) ? deck : null);
      });
  }, [showFriendProfile, selectedFriend?.other?.id, showMyProfile]);

  // 본인 프로필용 덱/기록 로드 (showMyProfile 기준)
  useEffect(() => {
    if (!showMyProfile || !user?.id) {
      if (!showFriendProfile) {
        setProfileDeck(null);
        setProfileRecord(null);
        setProfileGames(null);
      }
      return;
    }
    const userId = user.id;
    const supabase = createClient();
    if (!supabase) return;
    setProfileDeckLoading(true);
    setProfileDeck(null);
    loadProfileRecord(userId);
    supabase
      .from("game_stats")
      .select("player_a_id, player_b_id, deck_a, deck_b, played_at")
      .eq("game_mode", "normal")
      .or(`player_a_id.eq.${userId},player_b_id.eq.${userId}`)
      .order("played_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        setProfileDeckLoading(false);
        const row = data?.[0];
        if (!row) { setProfileDeck(null); return; }
        const deck = row.player_a_id === userId ? row.deck_a : row.deck_b;
        setProfileDeck(Array.isArray(deck) ? deck : null);
      });
  }, [showMyProfile, user?.id, showFriendProfile]);

  useEffect(() => {
    if (scrollToRecords && profileGames && profileRecordsRef.current) {
      const t = setTimeout(() => {
        profileRecordsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        setScrollToRecords(false);
      }, 150);
      return () => clearTimeout(t);
    }
  }, [scrollToRecords, profileGames]);

  const renderProfileDeck = (deck: number[]) => {
    const avgCost = deck.length > 0
      ? deck.reduce((sum, id) => sum + (cardMetaById[Number(id)]?.cost ?? 0), 0) / deck.length
      : 0;
    return (
      <div style={{ width: "100%" }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#7dd3fc", marginBottom: 8, letterSpacing: 1 }}>DECK</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4 }}>
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
        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 8, textAlign: "right" }}>
          평균 코스트 {avgCost.toFixed(1)}
        </div>
      </div>
    );
  };

  const renderProfileRecord = () => {
    if (profileRecordLoading) {
      return <div style={{ textAlign: "center", color: "#64748b", fontSize: 13, padding: 8 }}>전적 불러오는 중...</div>;
    }
    if (!profileRecord) return null;
    const modes: Array<{ label: string; data: { games: number; wins: number }; color: string }> = [
      { label: "클래식", data: profileRecord.classic, color: "#94a3b8" },
      { label: "일반전", data: profileRecord.normal, color: "#fbbf24" },
    ];
    const block = (title: string, pick: (m: { games: number; wins: number }) => number) => (
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#7dd3fc", letterSpacing: 1, marginBottom: 8 }}>{title}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {modes.map((m) => (
            <div key={m.label} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "7px 12px",
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: m.color }}>{m.label}</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: "#e2e8f0" }}>{pick(m.data)}</span>
            </div>
          ))}
        </div>
      </div>
    );
    return (
      <div style={{ width: "100%", display: "flex", gap: 16 }}>
        {block("게임 수", (m) => m.games)}
        {block("승리한 게임 수", (m) => m.wins)}
      </div>
    );
  };

  const renderProfileGames = (viewerUserId: string) => {
    if (!profileGames) return null;
    if (profileGames.length === 0) {
      return <div style={{ textAlign: "center", color: "#475569", fontSize: 13, padding: 12 }}>대전 기록이 없습니다.</div>;
    }
    const fmtDate = (iso: string) => {
      const d = new Date(iso);
      return `${d.getMonth() + 1}.${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    };
    return (
      <div ref={profileRecordsRef} style={{ width: "100%" }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#7dd3fc", letterSpacing: 1, marginBottom: 8 }}>대전 기록</div>
        <div className="pp-thin-scroll" style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 280, overflowY: "auto", paddingRight: 4 }}>
          {profileGames.map((g) => {
            const isA = g.player_a_id === viewerUserId;
            const won = (isA && g.winner === "A") || (!isA && g.winner === "B");
            const draw = g.winner !== "A" && g.winner !== "B";
            const oppName = isA ? (g.player_b_nickname ?? "상대") : (g.player_a_nickname ?? "상대");
            const resultColor = draw ? "#94a3b8" : won ? "#4ade80" : "#f87171";
            const resultText = draw ? "무" : won ? "승" : "패";
            return (
              <div key={g.id} style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "8px 12px",
              }}>
                <span style={{
                  fontSize: 13, fontWeight: 900, color: resultColor,
                  width: 20, textAlign: "center",
                }}>{resultText}</span>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                  background: g.game_mode === "normal" ? "rgba(245,158,11,0.2)" : "rgba(148,163,184,0.18)",
                  color: g.game_mode === "normal" ? "#fbbf24" : "#94a3b8",
                }}>{g.game_mode === "normal" ? "일반전" : "클래식"}</span>
                <span style={{ flex: 1, fontSize: 12, color: "#cbd5e1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  vs {oppName}
                </span>
                <span style={{ fontSize: 11, color: "#64748b" }}>{fmtDate(g.played_at)}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const friendPanel = (
    <div
      ref={friendPanelRef}
      style={{
        position: "absolute",
        top: layoutMobile ? MOBILE_HEADER_H : 56,
        right: 0,
        width: 300,
        maxHeight: 520,
        background: isDarkMode ? "#0d1f3c" : "#ffffff",
        border: `1px solid ${isDarkMode ? "rgba(255,255,255,0.12)" : "#e2e8f0"}`,
        borderRadius: 16,
        boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* 탭 헤더 */}
      <div style={{ display: "flex", borderBottom: `1px solid ${isDarkMode ? "rgba(255,255,255,0.08)" : "#f1f5f9"}` }}>
        {(["list", "add", "requests"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFriendTab(tab)}
            style={{
              flex: 1,
              padding: "10px 4px",
              fontSize: 12,
              fontWeight: 700,
              border: "none",
              background: "transparent",
              color: friendTab === tab
                ? (isDarkMode ? "#7dd3fc" : "#2563eb")
                : (isDarkMode ? "#475569" : "#94a3b8"),
              borderBottom: friendTab === tab ? "2px solid #7dd3fc" : "2px solid transparent",
              cursor: "pointer",
            }}
          >
            {tab === "list" ? "친구 목록" : tab === "add" ? "친구 추가" : `요청${friendRequests.length > 0 ? ` (${friendRequests.length})` : ""}`}
          </button>
        ))}
      </div>

      {/* 친구 목록 탭 */}
      {friendTab === "list" && (
        <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
          {friendsLoading ? (
            <div style={{ textAlign: "center", padding: 24, color: "#64748b", fontSize: 13 }}>불러오는 중...</div>
          ) : friends.length === 0 ? (
            <div style={{ textAlign: "center", padding: 24, color: isDarkMode ? "#334155" : "#cbd5e1", fontSize: 13 }}>
              아직 친구가 없습니다.
            </div>
          ) : (
            friends.map((f) => (
              <div key={f.id}>
                <button
                  type="button"
                  onClick={() => setSelectedFriend(selectedFriend?.id === f.id ? null : f)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 6px",
                    borderRadius: 10,
                    border: "none",
                    background: selectedFriend?.id === f.id
                      ? (isDarkMode ? "rgba(56,189,248,0.1)" : "#eff6ff")
                      : "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, rgba(14,165,233,0.35), rgba(79,70,229,0.45))", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                      {f.other.avatar_url
                        ? <img src={f.other.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <IconUser className="h-5 w-5 text-sky-200" />}
                    </div>
                    <div style={{ position: "absolute", top: 0, left: 0, width: 10, height: 10, borderRadius: "50%", background: isOnline(f.other.last_seen_at) ? "#22c55e" : "#475569", border: "2px solid " + (isDarkMode ? "#0d1f3c" : "#fff") }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: isDarkMode ? "#e2e8f0" : "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {f.other.nickname || "닉네임 없음"}
                    </div>
                    <div style={{ fontSize: 11 }}>
                      {f.other.inGame ? (
                        <span style={{ color: "#f59e0b" }}>
                          🎮 게임 진행 중 - {f.other.inGameModeLabel} ({f.other.inGamePlayerA ?? "?"} vs {f.other.inGamePlayerB ?? "?"})
                        </span>
                      ) : isOnline(f.other.last_seen_at) ? (
                        <span style={{ color: "#22c55e" }}>접속 중</span>
                      ) : (
                        <span style={{ color: "#64748b" }}>마지막 접속: {formatLastSeen(f.other.last_seen_at)}</span>
                      )}
                    </div>
                  </div>
                </button>

                {/* 선택된 친구 팝업 버튼 */}
                {selectedFriend?.id === f.id && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "4px 6px 8px" }}>
                    <button
                      type="button"
                      onClick={() => setShowFriendProfile(true)}
                      style={{ width: "100%", padding: "8px 0", borderRadius: 8, border: `1px solid ${isDarkMode ? "rgba(255,255,255,0.1)" : "#e2e8f0"}`, background: "transparent", color: isDarkMode ? "#94a3b8" : "#64748b", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                    >
                      프로필 보기
                    </button>
                    <button
                      type="button"
                      onClick={() => { setScrollToRecords(true); setShowFriendProfile(true); }}
                      style={{ width: "100%", padding: "8px 0", borderRadius: 8, border: `1px solid ${isDarkMode ? "rgba(255,255,255,0.1)" : "#e2e8f0"}`, background: "transparent", color: isDarkMode ? "#94a3b8" : "#64748b", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                    >
                      대전 기록
                    </button>
                    <button
                      type="button"
                      disabled={f.other.inGame}
                      onClick={() => {
                        if (f.other.inGame) return;
                        setFriendPanelOpen(false);
                        setSelectedFriend(null);
                        onSendFriendChallenge?.(f.other.id, f.other.nickname ?? "상대방");
                      }}
                      style={{
                        width: "100%", padding: "8px 0", borderRadius: 8, border: "none",
                        background: f.other.inGame ? "rgba(71,85,105,0.4)" : "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                        color: f.other.inGame ? "#64748b" : "#fff",
                        fontSize: 13, fontWeight: 700, cursor: f.other.inGame ? "not-allowed" : "pointer",
                      }}
                    >
                      {f.other.inGame ? "게임 중" : "친선전"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`${f.other.nickname || "이 친구"}와 친구를 끊겠습니까?`)) {
                          void removeFriend(f.id);
                        }
                      }}
                      style={{ width: "100%", padding: "8px 0", borderRadius: 8, border: `1px solid rgba(239,68,68,0.3)`, background: "transparent", color: "#ef4444", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                    >
                      친구 삭제
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* 친구 추가 탭 */}
      {friendTab === "add" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "8px 10px", borderBottom: `1px solid ${isDarkMode ? "rgba(255,255,255,0.08)" : "#f1f5f9"}` }}>
            <input
              type="text"
              placeholder="닉네임으로 검색..."
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                border: `1px solid ${isDarkMode ? "rgba(255,255,255,0.15)" : "#e2e8f0"}`,
                background: isDarkMode ? "rgba(255,255,255,0.05)" : "#f8fafc",
                color: isDarkMode ? "#e2e8f0" : "#1e293b",
                fontSize: 13,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
            {userSearchLoading ? (
              <div style={{ textAlign: "center", padding: 24, color: "#64748b", fontSize: 13 }}>검색 중...</div>
            ) : userSearchResults.length === 0 ? (
              <div style={{ textAlign: "center", padding: 24, color: "#64748b", fontSize: 13 }}>유저를 찾을 수 없습니다.</div>
            ) : (
              userSearchResults.map((u) => (
                <div key={u.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedUser(selectedUser?.id === u.id ? null : u)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 6px",
                      borderRadius: 10,
                      border: "none",
                      background: selectedUser?.id === u.id ? (isDarkMode ? "rgba(56,189,248,0.1)" : "#eff6ff") : "transparent",
                      cursor: "pointer",
                      marginBottom: 2,
                      textAlign: "left",
                    }}
                  >
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, rgba(14,165,233,0.35), rgba(79,70,229,0.45))", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                      {u.avatar_url
                        ? <img src={u.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <IconUser className="h-4 w-4 text-sky-200" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {/* 온라인/오프라인 상태 점 */}
                        <div style={{
                          width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                          background: isOnline(u.last_seen_at) ? "#22c55e" : "#475569",
                        }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: isDarkMode ? "#e2e8f0" : "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {u.nickname || "닉네임 없음"}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, marginTop: 1 }}>
                        {u.inGame ? (
                          <span style={{ color: "#f59e0b" }}>
                            🎮 게임 진행 중 - {u.inGameModeLabel} ({u.inGamePlayerA ?? "?"} vs {u.inGamePlayerB ?? "?"})
                          </span>
                        ) : isOnline(u.last_seen_at) ? (
                          <span style={{ color: "#22c55e" }}>접속 중</span>
                        ) : (
                          <span style={{ color: "#475569" }}>마지막 접속: {formatLastSeen(u.last_seen_at)}</span>
                        )}
                      </div>
                    </div>
                  </button>
                  {selectedUser?.id === u.id && (
                    <div style={{ display: "flex", gap: 6, padding: "4px 6px 8px", marginBottom: 4 }}>
                      <button
                        type="button"
                        disabled
                        style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: `1px solid ${isDarkMode ? "rgba(255,255,255,0.1)" : "#e2e8f0"}`, background: "transparent", color: "#64748b", fontSize: 12, fontWeight: 700, cursor: "not-allowed" }}
                      >
                        프로필 보기
                      </button>
                      <button
                        type="button"
                        onClick={() => sendFriendRequest(u.id)}
                        disabled={sendRequestStatus !== "idle"}
                        style={{
                          flex: 1,
                          padding: "7px 0",
                          borderRadius: 8,
                          border: "none",
                          background: sendRequestStatus === "sent" ? "#22c55e" : sendRequestStatus === "error" ? "#ef4444" : "#3b82f6",
                          color: "#fff",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: sendRequestStatus !== "idle" ? "not-allowed" : "pointer",
                        }}
                      >
                        {sendRequestStatus === "sending" ? "전송 중..." : sendRequestStatus === "sent" ? "요청 완료!" : sendRequestStatus === "error" ? "오류" : "친구 요청"}
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 친구 요청 탭 */}
      {friendTab === "requests" && (
        <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
          {friendsLoading ? (
            <div style={{ textAlign: "center", padding: 24, color: "#64748b", fontSize: 13 }}>불러오는 중...</div>
          ) : friendRequests.length === 0 ? (
            <div style={{ textAlign: "center", padding: 24, color: isDarkMode ? "#334155" : "#cbd5e1", fontSize: 13 }}>
              받은 친구 요청이 없습니다.
            </div>
          ) : (
            friendRequests.map((f) => (
              <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 6px", borderRadius: 10, marginBottom: 4 }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, rgba(14,165,233,0.35), rgba(79,70,229,0.45))", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                  {f.other.avatar_url
                    ? <img src={f.other.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <IconUser className="h-4 w-4 text-sky-200" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: isDarkMode ? "#e2e8f0" : "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {f.other.nickname || "닉네임 없음"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => respondToRequest(f.id, true)}
                  disabled={requestActionLoading === f.id}
                  style={{ padding: "5px 10px", borderRadius: 7, border: "none", background: "#22c55e", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                >
                  수락
                </button>
                <button
                  type="button"
                  onClick={() => respondToRequest(f.id, false)}
                  disabled={requestActionLoading === f.id}
                  style={{ padding: "5px 10px", borderRadius: 7, border: "none", background: isDarkMode ? "rgba(255,255,255,0.08)" : "#f1f5f9", color: isDarkMode ? "#94a3b8" : "#475569", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                >
                  거절
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );

  const friendProfileModalContent = showFriendProfile && selectedFriend ? (
    <div
      className="pp-thin-scroll"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 99999,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        overflowY: "auto",
        padding: "5vh 16px",
      }}
      onClick={() => setShowFriendProfile(false)}
    >
      <div
        style={{
          width: layoutMobile ? "92%" : "min(90vw, 720px)",
          maxWidth: layoutMobile ? 460 : 720,
          margin: "auto",
          background: "linear-gradient(180deg, #0d1f3c 0%, #050a14 100%)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 24,
          padding: 32,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setShowFriendProfile(false)}
          style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 8, width: 32, height: 32, color: "#94a3b8", cursor: "pointer", fontSize: 16 }}
        >
          ✕
        </button>
        <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg, rgba(14,165,233,0.35), rgba(79,70,229,0.45))", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "2px solid rgba(56,189,248,0.3)" }}>
          {selectedFriend.other.avatar_url
            ? <img src={selectedFriend.other.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <IconUser className="h-10 w-10 text-sky-200" />}
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", marginBottom: 4 }}>
            {selectedFriend.other.nickname || "닉네임 없음"}
          </div>
          <div style={{ fontSize: 13, color: isOnline(selectedFriend.other.last_seen_at) ? "#22c55e" : "#64748b" }}>
            {isOnline(selectedFriend.other.last_seen_at) ? "● 접속 중" : `마지막 접속: ${formatLastSeen(selectedFriend.other.last_seen_at)}`}
          </div>
        </div>
        <div style={{ width: "100%", background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 16 }}>
          {profileDeckLoading ? (
            <div style={{ textAlign: "center", color: "#64748b", fontSize: 13 }}>덱 불러오는 중...</div>
          ) : profileDeck && profileDeck.length > 0 ? (
            renderProfileDeck(profileDeck)
          ) : (
            <div style={{ textAlign: "center", color: "#475569", fontSize: 13 }}>최근 일반전 기록이 없습니다.</div>
          )}
        </div>
        <div style={{ width: "100%", background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 16 }}>
          {renderProfileRecord()}
        </div>
        <div style={{ width: "100%", background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 16 }}>
          {renderProfileGames(selectedFriend.other.id)}
        </div>
      </div>
    </div>
  ) : null;

  const friendProfileModal = friendProfileModalContent && typeof document !== "undefined"
    ? createPortal(friendProfileModalContent, document.body)
    : null;

  const myProfileModalContent = showMyProfile && user ? (
    <div className="pp-thin-scroll" style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "5vh 16px" }}
      onClick={() => setShowMyProfile(false)}
    >
      <div style={{
        width: layoutMobile ? "92%" : "min(90vw, 720px)",
        maxWidth: layoutMobile ? 460 : 720,
        margin: "auto",
        background: "linear-gradient(180deg, #0d1f3c 0%, #050a14 100%)",
        border: "1px solid rgba(255,255,255,0.12)", borderRadius: 24, padding: 32,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 16, position: "relative",
      }}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" onClick={() => setShowProfileEdit(true)}
          title="프로필 수정"
          style={{ position: "absolute", top: 16, right: 56, background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 8, width: 32, height: 32, color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <IconPencil className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => setShowMyProfile(false)}
          style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 8, width: 32, height: 32, color: "#94a3b8", cursor: "pointer", fontSize: 16 }}>✕</button>
        <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg, rgba(14,165,233,0.35), rgba(79,70,229,0.45))", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "2px solid rgba(56,189,248,0.3)" }}>
          {userAvatarUrl ? <img src={userAvatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <IconUser className="h-10 w-10 text-sky-200" />}
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", marginBottom: 4 }}>{currentDisplayName}</div>
        </div>
        <div style={{ width: "100%", background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 16 }}>
          {profileDeckLoading ? (
            <div style={{ textAlign: "center", color: "#64748b", fontSize: 13 }}>덱 불러오는 중...</div>
          ) : profileDeck && profileDeck.length > 0 ? (
            renderProfileDeck(profileDeck)
          ) : (
            <div style={{ textAlign: "center", color: "#475569", fontSize: 13 }}>최근 일반전 기록이 없습니다.</div>
          )}
        </div>
        <div style={{ width: "100%", background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 16 }}>
          {renderProfileRecord()}
        </div>
        <div style={{ width: "100%", background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 16 }}>
          {renderProfileGames(user.id)}
        </div>
      </div>
    </div>
  ) : null;

  const myProfileModal = myProfileModalContent && typeof document !== "undefined"
    ? createPortal(myProfileModalContent, document.body)
    : null;

  const profileEditModalContent = showProfileEdit && user ? (
    <div style={{ position: "fixed", inset: 0, zIndex: 1001, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={() => setShowProfileEdit(false)}
    >
      <div style={{
        width: layoutMobile ? "92%" : "min(90vw, 480px)",
        maxWidth: layoutMobile ? 420 : 480,
        background: "linear-gradient(180deg, #0d1f3c 0%, #050a14 100%)",
        border: "1px solid rgba(255,255,255,0.12)", borderRadius: 24, padding: 32,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 20, position: "relative",
      }}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" onClick={() => setShowProfileEdit(false)}
          style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 8, width: 32, height: 32, color: "#94a3b8", cursor: "pointer", fontSize: 16 }}>✕</button>

        <div style={{ fontSize: 18, fontWeight: 900, color: "#7dd3fc", letterSpacing: 1 }}>프로필 수정</div>

        <div style={{ position: "relative" }}>
          <div style={{ width: 90, height: 90, borderRadius: "50%", background: "linear-gradient(135deg, rgba(14,165,233,0.35), rgba(79,70,229,0.45))", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "2px solid rgba(56,189,248,0.3)" }}>
            {userAvatarUrl ? <img src={userAvatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <IconUser className="h-12 w-12 text-sky-200" />}
          </div>
          <button type="button"
            title="프로필 사진 변경 (준비 중)"
            onClick={() => alert("프로필 사진 변경은 준비 중입니다.")}
            style={{ position: "absolute", bottom: 0, right: 0, width: 28, height: 28, borderRadius: "50%", background: "#1e293b", border: "1px solid rgba(255,255,255,0.2)", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <IconPencil className="h-3.5 w-3.5" />
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>{currentDisplayName}</span>
          <button type="button"
            title="닉네임 변경"
            onClick={() => handleEditNickname?.()}
            style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <IconPencil className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  ) : null;

  const profileEditModal = profileEditModalContent && typeof document !== "undefined"
    ? createPortal(profileEditModalContent, document.body)
    : null;

  if (layoutMobile) {
    const borderColor = isDarkMode ? "rgba(255,255,255,0.1)" : "#cbd5e1";
    const bg = isDarkMode ? "rgba(10,22,40,0.95)" : "#ffffff";
    const textColor = isDarkMode ? "#fff" : "#1e293b";

    const currencyItems = [
      { onClick: handleEditGold, Icon: IconGold, value: gold, ring: "rgba(245,158,11,0.35)", color: "#fde68a", key: "gold" },
      { onClick: handleEditShards, Icon: IconShard, value: cardShards, ring: "rgba(6,182,212,0.35)", color: "#a5f3fc", key: "shards" },
      { onClick: handleEditTokens, Icon: IconToken, value: primeTokens, ring: "rgba(139,92,246,0.35)", color: "#ddd6fe", key: "tokens" },
    ];

    return (
      <>
        <header
          style={{
            width: MOBILE_LOBBY_BASE_W,
            height: MOBILE_HEADER_H,
            boxSizing: "border-box",
            paddingLeft: MOBILE_LOBBY_PAD_X,
            paddingRight: MOBILE_LOBBY_PAD_X,
            borderBottom: `1px solid ${borderColor}`,
            background: bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            flexShrink: 0,
            position: "relative",
            zIndex: 40,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
            <button
              type="button"
              aria-label="메뉴 열기"
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen(true)}
              style={{
                width: 44,
                height: 44,
                minWidth: 44,
                minHeight: 44,
                padding: 0,
                border: "none",
                borderRadius: 10,
                background: isDarkMode ? "rgba(255,255,255,0.08)" : "#f1f5f9",
                color: textColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                cursor: "pointer",
              }}
            >
              <HamburgerIcon />
            </button>

            {!authReady ? (
              <span style={{ fontSize: 14, color: "#94a3b8" }}>로딩 중…</span>
            ) : user ? (
              <div
                style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1, cursor: "pointer" }}
                onClick={() => setShowMyProfile(true)}
                title="내 프로필 보기"
              >
                <div
                  style={{
                    width: MOBILE_HEADER_AVATAR,
                    height: MOBILE_HEADER_AVATAR,
                    borderRadius: "50%",
                    overflow: "hidden",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "linear-gradient(135deg, rgba(14,165,233,0.35), rgba(79,70,229,0.45))",
                    boxShadow: "0 0 0 2px rgba(255,255,255,0.15)",
                  }}
                >
                  {userAvatarUrl ? (
                    <img src={userAvatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <IconUser className="h-[22px] w-[22px] text-sky-200" />
                  )}
                </div>
                <span
                  style={{
                    fontSize: MOBILE_HEADER_NAME_FS,
                    fontWeight: 600,
                    color: textColor,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {currentDisplayName}
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGoogleLogin}
                style={{
                  height: 40,
                  paddingLeft: 12,
                  paddingRight: 12,
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  background: "#fff",
                  color: "#0f172a",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                구글로 시작
              </button>
            )}
          </div>

          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {currencyItems.map(({ onClick, Icon, value, ring, color, key }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={onClick}
                    style={{
                      height: MOBILE_HEADER_CURRENCY_H,
                      paddingLeft: 8,
                      paddingRight: 8,
                      borderRadius: 999,
                      border: `1px solid ${ring}`,
                      background: isDarkMode ? "rgba(0,0,0,0.4)" : "#fff",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span
                      style={{
                        fontSize: MOBILE_HEADER_CURRENCY_FS,
                        fontWeight: 700,
                        color,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {value.toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                aria-label="친구"
                onClick={() => setFriendPanelOpen(prev => !prev)}
                style={{
                  position: "relative",
                  width: MOBILE_HEADER_CURRENCY_H,
                  height: MOBILE_HEADER_CURRENCY_H,
                  borderRadius: 10,
                  border: `1px solid ${isDarkMode ? "rgba(255,255,255,0.15)" : "#e2e8f0"}`,
                  background: friendPanelOpen
                    ? (isDarkMode ? "rgba(56,189,248,0.2)" : "#eff6ff")
                    : (isDarkMode ? "rgba(255,255,255,0.08)" : "#f8fafc"),
                  color: isDarkMode ? "#7dd3fc" : "#2563eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <IconFriends />
                {friendRequests.length > 0 && (
                  <div style={{
                    position: "absolute",
                    top: 2,
                    right: 2,
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    background: "#f97316",
                    border: "1.5px solid " + (isDarkMode ? "#0a1628" : "#fff"),
                  }} />
                )}
              </button>

              {friendPanelOpen && friendPanel}
              {friendProfileModal}
              {myProfileModal}
              {profileEditModal}
            </div>
          ) : null}
        </header>

        {setMainView ? (
          <MobileLobbyDrawer
            isOpen={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            mainView={mainView}
            setMainView={setMainView}
            isDarkMode={isDarkMode}
            newCardIdsSize={newCardIdsSize}
          />
        ) : null}
      </>
    );
  }

  return (
    <header className={`shrink-0 border-b px-4 py-3 sm:px-6 sm:py-4 transition-colors duration-500 z-40 ${isDarkMode ? "bg-[#0a1628]/80 border-white/10 backdrop-blur-md" : "bg-white border-slate-300 shadow-sm"}`}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <div className="flex min-h-[44px] items-center gap-3">
          {!authReady ? (<span className="text-sm text-slate-400">로딩 중…</span>) : user ? (
            <div
              className="flex min-w-0 max-w-full flex-wrap items-center gap-2 sm:gap-3 cursor-pointer"
              onClick={() => setShowMyProfile(true)}
              title="내 프로필 보기"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-sky-500/30 to-indigo-600/40 ring-2 ring-white/15 sm:h-11 sm:w-11">
                {userAvatarUrl ? <img src={userAvatarUrl} alt="" className="h-full w-full object-cover" /> : <IconUser className="h-5 w-5 text-sky-200" />}
              </div>
              <span className={`min-w-0 truncate text-base font-semibold tracking-tight sm:text-lg ${isDarkMode ? "text-white" : "text-slate-800"}`}>
                {currentDisplayName}
              </span>
            </div>
          ) : (
            <button type="button" onClick={handleGoogleLogin} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-md transition hover:bg-slate-100 border border-slate-200">구글로 시작하기</button>
          )}
        </div>
        
        {user && (
          <div className="relative flex flex-wrap items-center gap-2 sm:gap-3">
            <button onClick={handleEditGold} className={`flex items-center gap-1.5 sm:gap-2 rounded-full px-2.5 py-1.5 sm:px-3 sm:py-2 ring-1 transition-all hover:scale-105 active:scale-95 ${isDarkMode ? "bg-black/40 ring-amber-500/30 shadow-[inset_0_1px_4px_rgba(245,158,11,0.2)]" : "bg-white ring-amber-300 shadow-sm"}`} title="클릭하여 골드 수정">
              <IconGold className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]" />
              <span className={`font-bold tabular-nums tracking-wide text-sm sm:text-base ${isDarkMode ? "text-amber-100" : "text-amber-600"}`}>{gold.toLocaleString()}</span>
            </button>
            <button onClick={handleEditTokens} className={`flex items-center gap-1.5 sm:gap-2 rounded-full px-2.5 py-1.5 sm:px-3 sm:py-2 ring-1 transition-all hover:scale-105 active:scale-95 ${isDarkMode ? "bg-black/40 ring-violet-500/30 shadow-[inset_0_1px_4px_rgba(139,92,246,0.2)]" : "bg-white ring-violet-300 shadow-sm"}`} title="클릭하여 프라임 토큰 수정">
              <IconToken className="w-4 h-4 sm:w-5 sm:h-5 text-violet-400 drop-shadow-[0_0_6px_rgba(167,139,250,0.5)]" />
              <span className={`font-bold tabular-nums tracking-wide text-sm sm:text-base ${isDarkMode ? "text-violet-100" : "text-violet-600"}`}>{primeTokens.toLocaleString()}</span>
            </button>
            <button onClick={handleEditShards} className={`flex items-center gap-1.5 sm:gap-2 rounded-full px-2.5 py-1.5 sm:px-3 sm:py-2 ring-1 transition-all hover:scale-105 active:scale-95 ${isDarkMode ? "bg-black/40 ring-cyan-500/30 shadow-[inset_0_1px_4px_rgba(6,182,212,0.2)]" : "bg-white ring-cyan-300 shadow-sm"}`} title="클릭하여 파편 수정">
              <IconShard className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.5)]" />
              <span className={`font-bold tabular-nums tracking-wide text-sm sm:text-base ${isDarkMode ? "text-cyan-100" : "text-cyan-600"}`}>{cardShards.toLocaleString()}</span>
            </button>

            <button
              type="button"
              aria-label="친구"
              onClick={() => setFriendPanelOpen(prev => !prev)}
              className={`relative flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
                friendPanelOpen
                  ? "border-sky-500/50 bg-sky-500/20 text-sky-300"
                  : isDarkMode
                  ? "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <IconFriends />
              {friendRequests.length > 0 && (
                <div style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: "#f97316",
                  border: "1.5px solid " + (isDarkMode ? "#0a1628" : "#fff"),
                }} />
              )}
            </button>

            {friendPanelOpen && friendPanel}
            {friendProfileModal}
            {myProfileModal}
            {profileEditModal}
          </div>
        )}
      </div>
    </header>
  );
}
