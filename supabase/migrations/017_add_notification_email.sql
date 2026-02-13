-- Add notification_email column to presets
ALTER TABLE presets ADD COLUMN notification_email TEXT;

-- RPC returns TABLE so we must DROP + CREATE to change the return type
DROP FUNCTION IF EXISTS get_preset_by_admin_token(UUID);

CREATE FUNCTION get_preset_by_admin_token(token UUID)
RETURNS TABLE (
    id UUID, slug TEXT, title TEXT, purpose TEXT,
    created_at TIMESTAMPTZ, notification_email TEXT
)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
    SELECT p.id, p.slug, p.title, p.purpose, p.created_at, p.notification_email
    FROM presets p
    INNER JOIN preset_admin_tokens pat ON pat.preset_id = p.id
    WHERE pat.admin_token = token;
$$;
