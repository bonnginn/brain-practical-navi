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

export function statisticsEndpoint(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash ? url.href : null; } catch { return null; }
}

// No queue, replay, cookies, referrer, retries, or identifiers. Failure never blocks learning.
export async function sendQuizStatistic(question, choice, endpoint, fetcher = fetch) {
  try {
    const url = statisticsEndpoint(endpoint);
    if (!url || !question.options.includes(choice)) return false;
    const metric = await questionMetric(question);
    const response = await fetcher(url, {method:'POST', credentials:'omit', referrerPolicy:'no-referrer',
      headers:{'Content-Type':'application/json'}, body:JSON.stringify({...metric, choice}),
      signal:AbortSignal.timeout(4000)});
    return response.ok;
  } catch { return false; }
}

export async function readQuizStatistics(endpoint, fetcher = fetch) {
  try {
    const url = statisticsEndpoint(endpoint);
    if (!url || !url.endsWith('/answer')) return null;
    const response = await fetcher(new URL('results', url).href, {method:'GET', credentials:'omit', referrerPolicy:'no-referrer', signal:AbortSignal.timeout(4000)});
    if (!response.ok) return null;
    const data = await response.json();
    return Array.isArray(data) ? data : null;
  } catch { return null; }
}

// A completed set contributes one counter for (questions, correct). No ID,
// question list, answer order, time, or history is transmitted.
export async function sendQuizSessionStatistic(questions, correct, endpoint, fetcher = fetch) {
  try {
    const url = statisticsEndpoint(endpoint);
    if (!url?.endsWith('/answer') || !Number.isInteger(questions) || questions<1 || questions>92 || !Number.isInteger(correct) || correct<0 || correct>questions) return false;
    const response = await fetcher(new URL('session',url).href, {method:'POST', credentials:'omit', referrerPolicy:'no-referrer',
      headers:{'Content-Type':'application/json'}, body:JSON.stringify({questions,correct}), signal:AbortSignal.timeout(4000)});
    return response.ok;
  } catch { return false; }
}

export async function readQuizSessionStatistics(endpoint, fetcher = fetch) {
  try {
    const url = statisticsEndpoint(endpoint);
    if (!url?.endsWith('/answer')) return null;
    const response = await fetcher(new URL('session-results',url).href, {method:'GET', credentials:'omit', referrerPolicy:'no-referrer', signal:AbortSignal.timeout(4000)});
    if (!response.ok) return null;
    const data = await response.json();
    return Array.isArray(data) ? data.filter(row=>Number.isInteger(row.questions)&&row.questions>=1&&row.questions<=92&&Number.isInteger(row.correct)&&row.correct>=0&&row.correct<=row.questions&&Number.isInteger(row.sessions)&&row.sessions>0) : null;
  } catch { return null; }
}
