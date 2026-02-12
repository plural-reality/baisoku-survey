-- Separate admin_token into its own table with restricted RLS
-- This prevents anonymous Supabase clients from reading admin tokens directly

-- 1. Create the admin tokens table
CREATE TABLE preset_admin_tokens (
    preset_id UUID PRIMARY KEY REFERENCES presets(id) ON DELETE CASCADE,
    admin_token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_preset_admin_tokens_token ON preset_admin_tokens(admin_token);

-- 2. Migrate existing admin_token data
INSERT INTO preset_admin_tokens (preset_id, admin_token)
SELECT id, admin_token FROM presets;

-- 3. Drop admin_token from presets
DROP INDEX IF EXISTS idx_presets_admin_token;
ALTER TABLE presets DROP COLUMN admin_token;

-- 4. RLS: enable but add NO policies = deny all via anon key
ALTER TABLE preset_admin_tokens ENABLE ROW LEVEL SECURITY;
-- No policies intentionally: anon key cannot SELECT/INSERT/UPDATE/DELETE

-- 5. SECURITY DEFINER function: verify admin token and return preset info
--    This bypasses RLS, so the anon key client can call it via .rpc()
CREATE OR REPLACE FUNCTION get_preset_by_admin_token(token UUID)
RETURNS TABLE (
    id UUID,
    slug TEXT,
    title TEXT,
    purpose TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT p.id, p.slug, p.title, p.purpose, p.created_at
    FROM presets p
    INNER JOIN preset_admin_tokens pat ON pat.preset_id = p.id
    WHERE pat.admin_token = token;
$$;

-- 6. SECURITY DEFINER function: create preset with admin token atomically
--    Returns the slug and admin_token so the API can show them to the creator
CREATE OR REPLACE FUNCTION create_preset_with_token(
    p_slug TEXT,
    p_title TEXT,
    p_purpose TEXT,
    p_background_text TEXT DEFAULT NULL,
    p_report_instructions TEXT DEFAULT NULL,
    p_og_title TEXT DEFAULT NULL,
    p_og_description TEXT DEFAULT NULL
)
RETURNS TABLE (
    slug TEXT,
    admin_token UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_preset_id UUID;
    new_admin_token UUID;
BEGIN
    -- Insert preset
    INSERT INTO presets (slug, title, purpose, background_text, report_instructions, og_title, og_description)
    VALUES (p_slug, p_title, p_purpose, p_background_text, p_report_instructions, p_og_title, p_og_description)
    RETURNING presets.id INTO new_preset_id;

    -- Insert admin token
    INSERT INTO preset_admin_tokens (preset_id)
    VALUES (new_preset_id)
    RETURNING preset_admin_tokens.admin_token INTO new_admin_token;

    RETURN QUERY SELECT p_slug, new_admin_token;
END;
$$;
