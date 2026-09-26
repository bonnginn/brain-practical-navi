// Only authored question content enters the revision hash, never learner state.
export async function questionMetric(question) {
  const id = question.id ?? `identify-${question.target}`;
  const definition = [id, question.prompt, question.correctAnswer ?? question.target,
    [...question.options].sort().map(key => [key, question.optionLabels?.[key] ?? key]),
    question.plane ?? null, question.position ?? null, question.view ?? null,
    question.explanation ?? null];
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(definition)));
  return {question: id, revision: Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')};
}

const consentKey = 'brain-quiz-statistics-opt-in-v1';
export function statisticsConsent(storage, endpoint) {
  try { return Boolean(statisticsEndpoint(endpoint)) && storage.getItem(consentKey) === statisticsEndpoint(endpoint); } catch { return false; }
}
export function setStatisticsConsent(storage, enabled, endpoint) {
  try { storage.setItem(consentKey, enabled ? (statisticsEndpoint(endpoint) ?? 'no') : 'no'); return true; } catch { return false; }
}
export function statisticsEndpoint(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash ? url.href : null; } catch { return null; }
}

// No queue, replay, cookies, referrer, retries, or identifiers. Failure never blocks learning.
export async function sendQuizStatistic(question, correct, endpoint, storage, fetcher = fetch) {
  try {
    const url = statisticsEndpoint(endpoint);
    if (!url || !statisticsConsent(storage, url) || typeof correct !== 'boolean') return false;
    const metric = await questionMetric(question);
    if (!statisticsConsent(storage, url)) return false;
    const response = await fetcher(url, {method:'POST', credentials:'omit', referrerPolicy:'no-referrer',
      headers:{'Content-Type':'application/json'}, body:JSON.stringify({...metric, correct}),
      signal:AbortSignal.timeout(4000)});
    return response.ok;
  } catch { return false; }
}
