-- Split key_questions into fixed_questions and exploration_themes
-- fixed_questions: creator-defined questions with statement, detail, options
-- exploration_themes: string[] themes for AI question generation guidance

-- Presets
ALTER TABLE presets ADD COLUMN fixed_questions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE presets ADD COLUMN exploration_themes JSONB DEFAULT '[]'::jsonb;

-- Sessions (inherited from preset at creation time)
ALTER TABLE sessions ADD COLUMN fixed_questions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE sessions ADD COLUMN exploration_themes JSONB DEFAULT '[]'::jsonb;

-- Questions: track whether a question was AI-generated or fixed
ALTER TABLE questions ADD COLUMN source TEXT DEFAULT 'ai';

-- Update create_preset_with_token to accept new columns
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
    p_user_id UUID DEFAULT NULL,
    p_fixed_questions JSONB DEFAULT '[]'::jsonb,
    p_exploration_themes JSONB DEFAULT '[]'::jsonb
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
    INSERT INTO presets (slug, title, purpose, background_text, report_instructions, og_title, og_description, key_questions, report_target, user_id, fixed_questions, exploration_themes)
    VALUES (p_slug, p_title, p_purpose, p_background_text, p_report_instructions, p_og_title, p_og_description, p_key_questions, p_report_target, p_user_id, p_fixed_questions, p_exploration_themes)
    RETURNING presets.id INTO new_preset_id;

    -- Insert admin token
    INSERT INTO preset_admin_tokens (preset_id)
    VALUES (new_preset_id)
    RETURNING preset_admin_tokens.admin_token INTO new_admin_token;

    RETURN QUERY SELECT p_slug, new_admin_token;
END;
$$;
