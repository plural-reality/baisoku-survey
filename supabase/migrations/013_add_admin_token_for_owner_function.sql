-- Allow authenticated preset owners to retrieve their admin token by slug
-- This bypasses RLS on preset_admin_tokens (which has no policies = deny all)
CREATE OR REPLACE FUNCTION get_admin_token_for_owner(p_slug TEXT, p_user_id UUID)
RETURNS TABLE (admin_token UUID)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT pat.admin_token
    FROM preset_admin_tokens pat
    JOIN presets p ON p.id = pat.preset_id
    WHERE p.slug = p_slug AND p.user_id = p_user_id;
$$;
