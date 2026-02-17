-- Invite links: allow guest access via shareable tokens
CREATE TABLE invite_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  label TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,          -- NULL = never expires
  max_uses INT,                    -- NULL = unlimited
  use_count INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast token lookup
CREATE INDEX idx_invite_links_token ON invite_links (token) WHERE is_active = true;

-- RLS
ALTER TABLE invite_links ENABLE ROW LEVEL SECURITY;

-- Anyone can read active invite links (needed for token validation via anon key)
CREATE POLICY "invite_links_select_active" ON invite_links
  FOR SELECT USING (is_active = true);

-- Authenticated users can see all their own invite links
CREATE POLICY "invite_links_select_own" ON invite_links
  FOR SELECT USING (auth.uid() = created_by);

-- Authenticated users can create invite links
CREATE POLICY "invite_links_insert_auth" ON invite_links
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Owners can update their invite links (deactivate, etc.)
CREATE POLICY "invite_links_update_own" ON invite_links
  FOR UPDATE USING (auth.uid() = created_by);

-- Owners can delete their invite links
CREATE POLICY "invite_links_delete_own" ON invite_links
  FOR DELETE USING (auth.uid() = created_by);

-- Function to validate and consume an invite token (called from server-side)
-- Uses SECURITY DEFINER to bypass RLS for atomic validation + increment
CREATE OR REPLACE FUNCTION validate_invite_token(p_token UUID)
RETURNS TABLE(invite_id UUID, invite_label TEXT) AS $$
DECLARE
  v_link invite_links%ROWTYPE;
BEGIN
  SELECT * INTO v_link
  FROM invite_links
  WHERE invite_links.token = p_token
    AND invite_links.is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Check expiration
  IF v_link.expires_at IS NOT NULL AND v_link.expires_at < now() THEN
    RETURN;
  END IF;

  -- Check usage limit
  IF v_link.max_uses IS NOT NULL AND v_link.use_count >= v_link.max_uses THEN
    RETURN;
  END IF;

  -- Increment use count
  UPDATE invite_links SET use_count = use_count + 1 WHERE id = v_link.id;

  invite_id := v_link.id;
  invite_label := v_link.label;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
