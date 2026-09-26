-- Aggregate counters only. No answer log, timestamp, IP, or learner identifier.
CREATE TABLE IF NOT EXISTS quiz_counts (
  question TEXT NOT NULL,
  revision TEXT NOT NULL,
  answers INTEGER NOT NULL DEFAULT 0 CHECK(answers >= 0),
  correct INTEGER NOT NULL DEFAULT 0 CHECK(correct >= 0 AND correct <= answers),
  PRIMARY KEY(question, revision)
);
