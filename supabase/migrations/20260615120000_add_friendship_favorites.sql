-- Per-user favorite flag on friendships (requester side / addressee side)
ALTER TABLE friendships
  ADD COLUMN IF NOT EXISTS requester_favorite boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS addressee_favorite boolean NOT NULL DEFAULT false;
