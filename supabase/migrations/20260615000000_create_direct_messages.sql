-- 개인 메시지 테이블
CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);

-- 조회 성능용 인덱스 (두 유저 간 대화 조회)
CREATE INDEX IF NOT EXISTS idx_dm_pair ON direct_messages (sender_id, receiver_id, created_at);
CREATE INDEX IF NOT EXISTS idx_dm_receiver_unread ON direct_messages (receiver_id, read_at);

-- RLS 활성화
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- 본인이 주고받은 메시지만 조회
CREATE POLICY "본인 대화만 조회" ON direct_messages
  FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- 본인이 보내는 메시지만 삽입 (sender가 본인이어야 함)
CREATE POLICY "본인이 발신만 삽입" ON direct_messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

-- 받은 메시지의 read_at만 업데이트 가능 (읽음 처리)
CREATE POLICY "수신자 읽음 처리" ON direct_messages
  FOR UPDATE TO authenticated
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);
