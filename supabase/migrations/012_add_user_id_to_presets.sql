-- Add user_id to presets table to track which user created each preset
-- NULL is allowed (presets created before auth, or by unauthenticated users)

ALTER TABLE presets ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX idx_presets_user_id ON presets(user_id);

-- Enable RLS on presets (was not enabled before)
ALTER TABLE presets ENABLE ROW LEVEL SECURITY;

-- Everyone can read presets (survey participants need to access them)
CREATE POLICY "presets_select_all" ON presets
    FOR SELECT USING (true);

-- Anyone can insert presets (unauthenticated users too)
CREATE POLICY "presets_insert_all" ON presets
    FOR INSERT WITH CHECK (true);

-- Only the owner can update their own presets (or presets with no owner)
CREATE POLICY "presets_update_own" ON presets
    FOR UPDATE USING (
        user_id IS NULL OR user_id = auth.uid()
    );

-- Only the owner can delete their own presets
CREATE POLICY "presets_delete_own" ON presets
    FOR DELETE USING (
        user_id = auth.uid()
    );

-- Update create_preset_with_token to accept user_id
-- This replaces the version from 009 migrations
CREATE OR REPLACE FUNCTION create_preset_with_token(
    p_slug TEXT,
    p_title TEXT,
    p_purpose TEXT,
    p_background_text TEXT DEFAULT NULL,
    p_report_instructions TEXT DEFAULT NULL,
    p_og_title TEXT DEFAULT NULL,
    p_og_description TEXT DEFAULT NULL,
    p_key_questions JSONB DEFAULT '[]'::jsonb,
    p_report_target INTEGER DEFAULT 25,
    p_user_id UUID DEFAULT NULL
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
    INSERT INTO presets (slug, title, purpose, background_text, report_instructions, og_title, og_description, key_questions, report_target, user_id)
    VALUES (p_slug, p_title, p_purpose, p_background_text, p_report_instructions, p_og_title, p_og_description, p_key_questions, p_report_target, p_user_id)
    RETURNING presets.id INTO new_preset_id;

    -- Insert admin token
    INSERT INTO preset_admin_tokens (preset_id)
    VALUES (new_preset_id)
    RETURNING preset_admin_tokens.admin_token INTO new_admin_token;

    RETURN QUERY SELECT p_slug, new_admin_token;
END;
$$;
