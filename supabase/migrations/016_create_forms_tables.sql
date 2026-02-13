-- Create forms table (Google Forms-like, auth-based ownership)
CREATE TABLE forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    purpose TEXT NOT NULL,
    background_text TEXT,
    report_instructions TEXT,
    exploration_themes JSONB DEFAULT '[]'::jsonb,
    report_target INTEGER NOT NULL DEFAULT 10,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'closed')),
    og_title TEXT,
    og_description TEXT,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create form_questions table (normalized from JSONB)
CREATE TABLE form_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    statement TEXT NOT NULL,
    detail TEXT,
    question_type TEXT NOT NULL DEFAULT 'radio'
        CHECK (question_type IN ('radio','checkbox','dropdown','text','textarea','scale')),
    options JSONB DEFAULT '[]'::jsonb,
    scale_config JSONB,
    is_required BOOLEAN NOT NULL DEFAULT true,
    source TEXT NOT NULL DEFAULT 'manual',
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(form_id, position) DEFERRABLE INITIALLY DEFERRED
);

-- Add form references to existing tables
ALTER TABLE sessions ADD COLUMN form_id UUID REFERENCES forms(id) ON DELETE SET NULL;
ALTER TABLE questions ADD COLUMN form_question_id UUID REFERENCES form_questions(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX idx_forms_slug ON forms(slug);
CREATE INDEX idx_forms_user_id ON forms(user_id);
CREATE INDEX idx_forms_status ON forms(status);
CREATE INDEX idx_form_questions_form_id ON form_questions(form_id);
CREATE INDEX idx_sessions_form_id ON sessions(form_id);
CREATE INDEX idx_questions_form_question_id ON questions(form_question_id);

-- Updated at triggers
CREATE TRIGGER update_forms_updated_at
    BEFORE UPDATE ON forms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_form_questions_updated_at
    BEFORE UPDATE ON form_questions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS for forms
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published forms are viewable by everyone"
    ON forms FOR SELECT
    USING (status = 'published');

CREATE POLICY "Owners can view all their forms"
    ON forms FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can create forms"
    ON forms FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update their forms"
    ON forms FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Owners can delete their forms"
    ON forms FOR DELETE
    USING (auth.uid() = user_id);

-- RLS for form_questions
ALTER TABLE form_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Questions of published forms are viewable by everyone"
    ON form_questions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM forms
            WHERE forms.id = form_questions.form_id
            AND (forms.status = 'published' OR forms.user_id = auth.uid())
        )
    );

CREATE POLICY "Form owners can insert questions"
    ON form_questions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM forms
            WHERE forms.id = form_questions.form_id
            AND forms.user_id = auth.uid()
        )
    );

CREATE POLICY "Form owners can update questions"
    ON form_questions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM forms
            WHERE forms.id = form_questions.form_id
            AND forms.user_id = auth.uid()
        )
    );

CREATE POLICY "Form owners can delete questions"
    ON form_questions FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM forms
            WHERE forms.id = form_questions.form_id
            AND forms.user_id = auth.uid()
        )
    );
