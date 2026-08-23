export const MODEL_STRATEGY_REVIEW_SCHEMA_VERSION = 1;
export const MODEL_STRATEGY_REVIEW_COMPARISON_ID = "deep-ventricle";
export const MODEL_STRATEGY_REVIEW_STORAGE_KEY = "brain-practical-navi:model-strategy-review:deep-ventricle:v1";
export const MODEL_STRATEGY_REVIEW_SOURCE = "model-comparison/deep-ventricle-evaluation.json";
export const MODEL_STRATEGY_REVIEW_ROLES = Object.freeze([
  "not-selected",
  "neuroanatomy-expert",
  "anatomy-educator",
  "learner",
  "other-contributor",
]);
export const MODEL_STRATEGY_REVIEW_PREFERENCES = Object.freeze(["undecided", "A", "B", "no-preference"]);

function validIso(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function exactKeys(value, expected) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  return actual.length === expected.length && actual.every((key, index) => key === [...expected].sort()[index]);
}

function validScore(value) {
  return value === null || (Number.isInteger(value) && value >= 1 && value <= 5);
}

function normalizedDimensions(dimensions) {
  if (!Array.isArray(dimensions) || dimensions.length !== 7) throw new Error("model strategy review requires exactly seven dimensions");
  const keys = dimensions.map(item => item?.key);
  if (keys.some(key => typeof key !== "string" || !key) || new Set(keys).size !== keys.length) throw new Error("model strategy review dimensions must have unique keys");
  return dimensions.map(item => ({ dimensionKey: item.key, labelJa: item.labelJa, A: null, B: null }));
}

export function createModelStrategyReviewDraft(dimensions, now = new Date().toISOString()) {
  if (!validIso(now)) throw new Error("model strategy review requires an ISO timestamp");
  return {
    schemaVersion: MODEL_STRATEGY_REVIEW_SCHEMA_VERSION,
    comparisonId: MODEL_STRATEGY_REVIEW_COMPARISON_ID,
    status: "local-unsubmitted-draft",
    privacy: "氏名・メールアドレス・所属など、個人を特定できる情報は記録しない",
    reviewerRole: "not-selected",
    ratings: normalizedDimensions(dimensions),
    overallPreference: "undecided",
    notes: "",
    createdAt: now,
    updatedAt: now,
    adoptionDecision: "not-recorded",
    expertReviewStatus: "not-claimed",
    sourceEvaluation: MODEL_STRATEGY_REVIEW_SOURCE,
  };
}

export function validateModelStrategyReviewDraft(value, dimensions) {
  const errors = [];
  const expectedTopKeys = ["schemaVersion", "comparisonId", "status", "privacy", "reviewerRole", "ratings", "overallPreference", "notes", "createdAt", "updatedAt", "adoptionDecision", "expertReviewStatus", "sourceEvaluation"];
  if (!exactKeys(value, expectedTopKeys)) errors.push("draft must contain only the fixed review fields");
  if (value?.schemaVersion !== MODEL_STRATEGY_REVIEW_SCHEMA_VERSION) errors.push("schemaVersion must be 1");
  if (value?.comparisonId !== MODEL_STRATEGY_REVIEW_COMPARISON_ID) errors.push("comparisonId must be deep-ventricle");
  if (value?.status !== "local-unsubmitted-draft") errors.push("status must remain local-unsubmitted-draft");
  if (value?.adoptionDecision !== "not-recorded") errors.push("draft cannot record an adoption decision");
  if (value?.expertReviewStatus !== "not-claimed") errors.push("draft cannot claim expert review");
  if (value?.sourceEvaluation !== MODEL_STRATEGY_REVIEW_SOURCE) errors.push("source evaluation must be fixed");
  if (!MODEL_STRATEGY_REVIEW_ROLES.includes(value?.reviewerRole)) errors.push("reviewerRole is invalid");
  if (!MODEL_STRATEGY_REVIEW_PREFERENCES.includes(value?.overallPreference)) errors.push("overallPreference is invalid");
  if (typeof value?.notes !== "string" || value.notes.length > 1200) errors.push("notes must be at most 1200 characters");
  if (typeof value?.privacy !== "string" || !/個人を特定/.test(value.privacy)) errors.push("privacy notice is required");
  if (!validIso(value?.createdAt) || !validIso(value?.updatedAt)) errors.push("timestamps must be ISO dates");

  let expectedRatings;
  try { expectedRatings = normalizedDimensions(dimensions); }
  catch (error) { errors.push(error.message); expectedRatings = []; }
  if (!Array.isArray(value?.ratings) || value.ratings.length !== expectedRatings.length) errors.push("ratings must cover exactly seven dimensions");
  else value.ratings.forEach((rating, index) => {
    const expected = expectedRatings[index];
    if (!exactKeys(rating, ["dimensionKey", "labelJa", "A", "B"])) errors.push(`rating ${index} has unexpected fields`);
    if (rating?.dimensionKey !== expected.dimensionKey || rating?.labelJa !== expected.labelJa) errors.push(`rating ${index} does not match the source dimension`);
    if (!validScore(rating?.A) || !validScore(rating?.B)) errors.push(`rating ${index} must use null or integer scores 1-5`);
  });
  return { ok: errors.length === 0, errors };
}

export function restoreModelStrategyReviewDraft(serialized, dimensions, now = new Date().toISOString()) {
  try {
    const parsed = JSON.parse(serialized);
    if (validateModelStrategyReviewDraft(parsed, dimensions).ok) return parsed;
  } catch { /* invalid local data is replaced with a safe empty draft */ }
  return createModelStrategyReviewDraft(dimensions, now);
}

export function countModelStrategyReviewScores(draft) {
  return Array.isArray(draft?.ratings)
    ? draft.ratings.reduce((count, rating) => count + (validScore(rating.A) && rating.A !== null ? 1 : 0) + (validScore(rating.B) && rating.B !== null ? 1 : 0), 0)
    : 0;
}

export function buildModelStrategyReviewExport(draft, dimensions, exportedAt = new Date().toISOString()) {
  const validation = validateModelStrategyReviewDraft(draft, dimensions);
  if (!validation.ok) throw new Error(validation.errors.join("; "));
  if (!validIso(exportedAt)) throw new Error("exportedAt must be an ISO timestamp");
  const scoreCount = countModelStrategyReviewScores(draft);
  return {
    ...draft,
    exportedAt,
    completeness: {
      scoreCount,
      scoreTotal: dimensions.length * 2,
      ratingsComplete: scoreCount === dimensions.length * 2,
      reviewerRoleSelected: draft.reviewerRole !== "not-selected",
      preferenceRecorded: draft.overallPreference !== "undecided",
    },
    submissionStatus: "not-submitted",
    adoptionDecision: "not-recorded",
    expertReviewStatus: "not-claimed",
  };
}

export function validateModelStrategyReviewExport(value, dimensions) {
  const errors = [];
  const draftKeys = ["schemaVersion", "comparisonId", "status", "privacy", "reviewerRole", "ratings", "overallPreference", "notes", "createdAt", "updatedAt", "adoptionDecision", "expertReviewStatus", "sourceEvaluation"];
  const exportKeys = [...draftKeys, "exportedAt", "completeness", "submissionStatus"];
  if (!exactKeys(value, exportKeys)) errors.push("export must contain only the fixed review and export fields");
  const draft = Object.fromEntries(draftKeys.map(key => [key, value?.[key]]));
  errors.push(...validateModelStrategyReviewDraft(draft, dimensions).errors);
  if (!validIso(value?.exportedAt)) errors.push("exportedAt must be an ISO date");
  if (value?.submissionStatus !== "not-submitted") errors.push("export cannot claim submission");
  const expectedScoreCount = countModelStrategyReviewScores(draft);
  const expectedCompleteness = {
    scoreCount: expectedScoreCount,
    scoreTotal: dimensions.length * 2,
    ratingsComplete: expectedScoreCount === dimensions.length * 2,
    reviewerRoleSelected: draft.reviewerRole !== "not-selected",
    preferenceRecorded: draft.overallPreference !== "undecided",
  };
  if (!exactKeys(value?.completeness, Object.keys(expectedCompleteness))) errors.push("completeness must contain only the derived fields");
  else for (const [key, expected] of Object.entries(expectedCompleteness)) if (value.completeness[key] !== expected) errors.push(`completeness.${key} must be derived from the draft`);
  return { ok: errors.length === 0, errors, summary: expectedCompleteness };
}
