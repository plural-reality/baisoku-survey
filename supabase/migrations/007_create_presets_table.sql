-- Create presets table for user-created survey presets
CREATE TABLE presets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    admin_token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    purpose TEXT NOT NULL,
    background_text TEXT,
    report_instructions TEXT,
    og_title TEXT,
    og_description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add preset_id to sessions to link sessions to presets
ALTER TABLE sessions ADD COLUMN preset_id UUID REFERENCES presets(id);

-- Indexes
CREATE INDEX idx_presets_slug ON presets(slug);
CREATE INDEX idx_presets_admin_token ON presets(admin_token);
CREATE INDEX idx_sessions_preset_id ON sessions(preset_id);

-- Updated at trigger
CREATE TRIGGER update_presets_updated_at
    BEFORE UPDATE ON presets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all preset operations" ON presets FOR ALL USING (true);
