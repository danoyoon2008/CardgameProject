// components/layout/Header.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { MainView } from "../../types/game";
import { IconUser, IconGold, IconToken, IconShard } from "../ui/Icons";
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
  layoutMobile?: boolean;
  mainView?: MainView;
  setMainView?: (view: MainView) => void;
  newCardIdsSize?: number;
}

export default function Header({
  authReady, user, userAvatarUrl, currentDisplayName, isDarkMode,
  gold, primeTokens, cardShards,
  handleGoogleLogin, handleEditGold, handleEditTokens, handleEditShards,
  layoutMobile = false,
  mainView = "battle",
  setMainView,
  newCardIdsSize = 0,
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
      setFriends(withProfiles.filter(f => f.other));
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

    const { data } = await supabase
      .from("user_profiles")
      .select("id, nickname, avatar_url, last_seen_at")
      .ilike("nickname", `%${query}%`)
      .neq("id", user.id)
      .limit(50);

    setUserSearchResults(data as UserProfile[] || []);
    setUserSearchLoading(false);
  };

  const loadAllUsers = async () => {
    if (!user) return;
    setUserSearchLoading(true);
    const supabase = createClient();
    if (!supabase) { setUserSearchLoading(false); return; }

    const { data } = await supabase
      .from("user_profiles")
      .select("id, nickname, avatar_url, last_seen_at")
      .neq("id", user.id)
      .not("nickname", "is", null)
      .order("last_seen_at", { ascending: false })
      .limit(100);

    setUserSearchResults(data as UserProfile[] || []);
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
                    <div style={{ fontSize: 11, color: "#64748b" }}>
                      {isOnline(f.other.last_seen_at) ? "접속 중" : `마지막 접속: ${formatLastSeen(f.other.last_seen_at)}`}
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
                      onClick={() => {/* 2단계에서 구현 */}}
                      style={{ width: "100%", padding: "8px 0", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                    >
                      친선전
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
                    <span style={{ fontSize: 13, fontWeight: 600, color: isDarkMode ? "#e2e8f0" : "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {u.nickname || "닉네임 없음"}
                    </span>
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

  const friendProfileModal = showFriendProfile && selectedFriend ? (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={() => setShowFriendProfile(false)}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
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
        <div style={{ width: "100%", background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 16, textAlign: "center", color: "#475569", fontSize: 13 }}>
          프로필 기능은 준비 중입니다.
        </div>
      </div>
    </div>
  ) : null;

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
              <>
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
              </>
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
              </button>

              {friendPanelOpen && friendPanel}
              {friendProfileModal}
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
            <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2 sm:gap-3">
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
              className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
                friendPanelOpen
                  ? "border-sky-500/50 bg-sky-500/20 text-sky-300"
                  : isDarkMode
                  ? "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <IconFriends />
            </button>

            {friendPanelOpen && friendPanel}
            {friendProfileModal}
          </div>
        )}
      </div>
    </header>
  );
}
