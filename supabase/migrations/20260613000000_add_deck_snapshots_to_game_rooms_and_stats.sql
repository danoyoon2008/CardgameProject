-- game_rooms: 게임 시작 시 덱 스냅샷 (일반전만 사용)
ALTER TABLE game_rooms
ADD COLUMN IF NOT EXISTS deck_a JSONB,
ADD COLUMN IF NOT EXISTS deck_b JSONB;

-- game_stats: 전적에 덱 스냅샷 보존 (유저 프로필 전적에서도 재사용)
ALTER TABLE game_stats
ADD COLUMN IF NOT EXISTS deck_a JSONB,
ADD COLUMN IF NOT EXISTS deck_b JSONB;
