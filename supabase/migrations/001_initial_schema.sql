-- Sonar Database Schema

-- Sessions table
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT,
    purpose TEXT NOT NULL,
    background_text TEXT,
    phase_profile JSONB DEFAULT '{
        "ranges": [
            {"start": 1, "end": 15, "phase": "exploration"},
            {"start": 16, "end": 30, "phase": "deep-dive"},
            {"start": 31, "end": 45, "phase": "exploration"},
            {"start": 46, "end": 60, "phase": "deep-dive"},
            {"start": 61, "end": 75, "phase": "exploration"},
            {"start": 76, "end": 90, "phase": "deep-dive"},
            {"start": 91, "end": 100, "phase": "exploration"}
        ]
    }'::jsonb,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
    current_question_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Questions table
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    question_index INTEGER NOT NULL,
    statement TEXT NOT NULL,
    detail TEXT,
    options JSONB NOT NULL,
    phase TEXT NOT NULL CHECK (phase IN ('exploration', 'deep-dive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, question_index)
);

-- Answers table
CREATE TABLE answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    selected_option INTEGER NOT NULL CHECK (selected_option >= 0 AND selected_option <= 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, question_id)
);

-- Analyses table
CREATE TABLE analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    batch_index INTEGER NOT NULL,
    start_index INTEGER NOT NULL,
    end_index INTEGER NOT NULL,
    analysis_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, batch_index)
);

-- Reports table
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    report_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, version)
);

-- Indexes for performance
CREATE INDEX idx_questions_session_id ON questions(session_id);
CREATE INDEX idx_questions_session_index ON questions(session_id, question_index);
CREATE INDEX idx_answers_session_id ON answers(session_id);
CREATE INDEX idx_analyses_session_id ON analyses(session_id);
CREATE INDEX idx_reports_session_id ON reports(session_id);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to sessions
CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to answers
CREATE TRIGGER update_answers_updated_at
    BEFORE UPDATE ON answers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies (allowing public access for simplicity)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Allow all operations (session-id based access in application layer)
CREATE POLICY "Allow all session operations" ON sessions FOR ALL USING (true);
CREATE POLICY "Allow all question operations" ON questions FOR ALL USING (true);
CREATE POLICY "Allow all answer operations" ON answers FOR ALL USING (true);
CREATE POLICY "Allow all analysis operations" ON analyses FOR ALL USING (true);
CREATE POLICY "Allow all report operations" ON reports FOR ALL USING (true);
