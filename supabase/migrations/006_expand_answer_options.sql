-- Migration: Expand answer options from 0-5 to 0-6
-- Changes:
--   - options[2] is now "いいえ" (fixed)
--   - options[3-5] are "どちらでもない" alternatives
--   - options[6] (selectedOption=6) is free text

-- 1. Drop existing constraints
ALTER TABLE answers DROP CONSTRAINT IF EXISTS answers_selected_option_check;
ALTER TABLE answers DROP CONSTRAINT IF EXISTS answers_free_text_check;

-- 2. Migrate answers.selected_option (update in reverse order to avoid conflicts)
-- Old: 0=はい, 1=わからない, 2-4=いいえの理由, 5=自由記述
-- New: 0=はい, 1=わからない, 2=いいえ, 3-5=どちらでもない選択肢, 6=自由記述
UPDATE answers SET selected_option = 6 WHERE selected_option = 5;
UPDATE answers SET selected_option = 5 WHERE selected_option = 4;
UPDATE answers SET selected_option = 4 WHERE selected_option = 3;
UPDATE answers SET selected_option = 3 WHERE selected_option = 2;

-- 3. Migrate questions.options (insert "いいえ" at index 2)
-- Old: [はい, わからない, 理由1, 理由2, 理由3]
-- New: [はい, わからない, いいえ, 理由1, 理由2, 理由3]
UPDATE questions
SET options = jsonb_build_array(
  options->0,
  options->1,
  'いいえ',
  options->2,
  options->3,
  options->4
)
WHERE jsonb_array_length(options) = 5;

-- 4. Add new constraints
ALTER TABLE answers
  ADD CONSTRAINT answers_selected_option_check
  CHECK (selected_option >= 0 AND selected_option <= 6);

ALTER TABLE answers
  ADD CONSTRAINT answers_free_text_check
  CHECK (
    (selected_option = 6 AND free_text IS NOT NULL AND length(trim(free_text)) > 0)
    OR (selected_option <> 6 AND free_text IS NULL)
  );
