-- Add report_target column to sessions and presets tables
-- Allows configuring the number of responses before survey completion (in multiples of 5)

-- Add to sessions table (default 25)
ALTER TABLE sessions ADD COLUMN report_target INTEGER NOT NULL DEFAULT 25;
ALTER TABLE sessions ADD CONSTRAINT sessions_report_target_check
    CHECK (report_target >= 5 AND report_target % 5 = 0);

-- Add to presets table (default 25)
ALTER TABLE presets ADD COLUMN report_target INTEGER NOT NULL DEFAULT 25;
ALTER TABLE presets ADD CONSTRAINT presets_report_target_check
    CHECK (report_target >= 5 AND report_target % 5 = 0);

-- Update create_preset_with_token function to accept report_target
CREATE OR REPLACE FUNCTION create_preset_with_token(
    p_slug TEXT,
    p_title TEXT,
    p_purpose TEXT,
    p_background_text TEXT DEFAULT NULL,
    p_report_instructions TEXT DEFAULT NULL,
    p_og_title TEXT DEFAULT NULL,
    p_og_description TEXT DEFAULT NULL,
    p_report_target INTEGER DEFAULT 25
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
    INSERT INTO presets (slug, title, purpose, background_text, report_instructions, og_title, og_description, report_target)
    VALUES (p_slug, p_title, p_purpose, p_background_text, p_report_instructions, p_og_title, p_og_description, p_report_target)
    RETURNING presets.id INTO new_preset_id;

    -- Insert admin token
    INSERT INTO preset_admin_tokens (preset_id)
    VALUES (new_preset_id)
    RETURNING preset_admin_tokens.admin_token INTO new_admin_token;

    RETURN QUERY SELECT p_slug, new_admin_token;
END;
$$;
