-- Apply with the expanded Worker/catalog before publishing the larger bank.
-- Preserve existing anonymous counters while changing the old 92-question limit.
CREATE TABLE quiz_session_counts_expanded (
  questions INTEGER NOT NULL CHECK(questions BETWEEN 1 AND 200),
  correct INTEGER NOT NULL CHECK(correct BETWEEN 0 AND questions),
  sessions INTEGER NOT NULL DEFAULT 0 CHECK(sessions >= 0),
  PRIMARY KEY(questions, correct)
);
INSERT INTO quiz_session_counts_expanded (questions, correct, sessions)
SELECT questions, correct, sessions FROM quiz_session_counts;
DROP TABLE quiz_session_counts;
ALTER TABLE quiz_session_counts_expanded RENAME TO quiz_session_counts;
