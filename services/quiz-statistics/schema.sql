-- Aggregate counters only. No answer log, timestamp, IP, or learner identifier.
CREATE TABLE IF NOT EXISTS quiz_option_counts (
  question TEXT NOT NULL,
  revision TEXT NOT NULL,
  choice TEXT NOT NULL,
  answers INTEGER NOT NULL DEFAULT 0 CHECK(answers >= 0),
  PRIMARY KEY(question, revision, choice)
);

-- Completed quiz sets only. Scores are grouped by set length and correct count;
-- there is no learner, device, session, answer sequence, timestamp, or IP column.
CREATE TABLE IF NOT EXISTS quiz_session_counts (
  questions INTEGER NOT NULL CHECK(questions BETWEEN 1 AND 92),
  correct INTEGER NOT NULL CHECK(correct BETWEEN 0 AND questions),
  sessions INTEGER NOT NULL DEFAULT 0 CHECK(sessions >= 0),
  PRIMARY KEY(questions, correct)
);
