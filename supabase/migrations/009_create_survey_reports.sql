-- Survey reports: aggregate reports for an entire preset (all participants)
CREATE TABLE survey_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    preset_id UUID NOT NULL REFERENCES presets(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    report_text TEXT NOT NULL DEFAULT '',
    custom_instructions TEXT,
    status TEXT NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(preset_id, version)
);

CREATE INDEX idx_survey_reports_preset_id ON survey_reports(preset_id);

-- RLS (same permissive pattern as other tables)
ALTER TABLE survey_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all survey_report operations" ON survey_reports FOR ALL USING (true);
