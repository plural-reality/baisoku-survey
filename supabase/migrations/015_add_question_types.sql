-- Add question_type to questions table
ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_type TEXT DEFAULT 'radio'
  CHECK (question_type IN ('radio','checkbox','dropdown','text','textarea','scale'));
ALTER TABLE questions ADD COLUMN IF NOT EXISTS scale_config JSONB;

-- Make selected_option nullable (text/textarea questions won't use it)
ALTER TABLE answers ALTER COLUMN selected_option DROP NOT NULL;

-- Add new answer columns
ALTER TABLE answers ADD COLUMN IF NOT EXISTS selected_options JSONB;
ALTER TABLE answers ADD COLUMN IF NOT EXISTS answer_text TEXT;

-- Drop old constraints that require selected_option to be non-null
ALTER TABLE answers DROP CONSTRAINT IF EXISTS answers_selected_option_check;
ALTER TABLE answers DROP CONSTRAINT IF EXISTS answers_free_text_check;

-- Add flexible constraint: at least one answer field must be filled
ALTER TABLE answers ADD CONSTRAINT answers_has_some_answer CHECK (
  selected_option IS NOT NULL OR selected_options IS NOT NULL
  OR answer_text IS NOT NULL OR free_text IS NOT NULL
);
