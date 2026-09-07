/** Identification questions retain their legacy target key; concept questions have stable IDs. */
export function quizHistoryKey(question) { return question.id ?? question.target; }

export function restoreQuizHistory(current, legacy, questions) {
  const keys = new Set(questions.map(quizHistoryKey));
  if (current !== null) {
    const saved = JSON.parse(current);
    if (!Array.isArray(saved)) return [];
    return [...new Set(saved.filter(key => typeof key === 'string' && keys.has(key)))];
  }
  const targets = JSON.parse(legacy ?? '[]');
  if (!Array.isArray(targets)) return [];
  // The old data cannot identify which variant was missed. Retain all related
  // questions conservatively; never infer that a concept question was mastered.
  return [...new Set(questions.filter(q => targets.includes(q.target)).map(quizHistoryKey))];
}

export function recordQuizAnswer(history, question, correct) {
  const key = quizHistoryKey(question);
  return correct ? history.filter(item => item !== key) : [...new Set([...history, key])];
}
