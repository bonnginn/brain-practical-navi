-- Aggregate counters only. No answer log, timestamp, IP, or learner identifier.
CREATE TABLE IF NOT EXISTS quiz_option_counts (
  question TEXT NOT NULL,
  revision TEXT NOT NULL,
  choice TEXT NOT NULL,
  answers INTEGER NOT NULL DEFAULT 0 CHECK(answers >= 0),
  PRIMARY KEY(question, revision, choice)
);
