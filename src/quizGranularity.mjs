const SECTION_DETAILS = Object.freeze(["coronal", "horizontal", "sagittal"]);
const SURFACE_DETAILS = Object.freeze(["lateral", "superior", "inferior", "medial"]);
const NEUROVASCULAR_DETAILS = Object.freeze(["arteries", "cranialNerves"]);
const QUIZ_FORMATS = Object.freeze(["section", "surface", "neurovascular"]);
const QUIZ_ORIGINS = Object.freeze(["standard", "provisional"]);

// This is the audited classification source for the unchanged 23-question
// section/surface inventory. The separate neurovascular pilot freezes its
// format/detail/origin fields in app/page.tsx and audits them independently.
export const QUIZ_GRANULARITY_BY_TARGET = Object.freeze({
  caudate: {format: "section", detail: "coronal", origin: "standard"},
  putamen: {format: "section", detail: "coronal", origin: "standard"},
  pallidum: {format: "section", detail: "coronal", origin: "standard"},
  accumbens: {format: "section", detail: "coronal", origin: "standard"},
  hippocampus: {format: "section", detail: "coronal", origin: "standard"},
  amygdala: {format: "section", detail: "coronal", origin: "standard"},
  mammillaryBody: {format: "section", detail: "horizontal", origin: "standard"},
  redNucleus: {format: "section", detail: "horizontal", origin: "standard"},
  substantiaNigra: {format: "section", detail: "horizontal", origin: "standard"},
  subthalamic: {format: "section", detail: "horizontal", origin: "standard"},
  ventricle: {format: "section", detail: "horizontal", origin: "provisional"},
  thalamus: {format: "section", detail: "coronal", origin: "standard"},
  corpusCallosum: {format: "section", detail: "sagittal", origin: "provisional"},
  internalCapsule: {format: "section", detail: "coronal", origin: "provisional"},
  insula: {format: "section", detail: "coronal", origin: "provisional"},
  brainstem: {format: "section", detail: "horizontal", origin: "provisional"},
  cerebellum: {format: "section", detail: "horizontal", origin: "provisional"},
  precentral: {format: "surface", detail: "lateral", origin: "provisional"},
  superiorTemporal: {format: "surface", detail: "lateral", origin: "provisional"},
  superiorFrontal: {format: "surface", detail: "superior", origin: "provisional"},
  precuneus: {format: "surface", detail: "medial", origin: "provisional"},
  cuneus: {format: "surface", detail: "medial", origin: "provisional"},
  fusiform: {format: "surface", detail: "inferior", origin: "provisional"},
});

/** @typedef {"section"|"surface"|"neurovascular"} QuizFormat */
/** @typedef {"coronal"|"horizontal"|"sagittal"|"lateral"|"superior"|"inferior"|"medial"|"arteries"|"cranialNerves"} QuizDetail */
/** @typedef {"standard"|"provisional"} QuizOrigin */

/**
 * Return the detail choices that are meaningful for a format. The all-format
 * list is intentionally grouped by the two teaching presentations so a detail
 * filter can still be combined with the format filter in either order.
 *
 * @param {"all"|QuizFormat} format
 * @returns {readonly QuizDetail[]}
 */
export function detailOptionsForFormat(format) {
  if (format === "section") return SECTION_DETAILS;
  if (format === "surface") return SURFACE_DETAILS;
  if (format === "neurovascular") return NEUROVASCULAR_DETAILS;
  return Object.freeze([...SECTION_DETAILS, ...SURFACE_DETAILS, ...NEUROVASCULAR_DETAILS]);
}

/** @param {"all"|QuizFormat} format @param {string} detail */
export function isDetailCompatible(format, detail) {
  if (detail === "all") return true;
  if (format === "section") return SECTION_DETAILS.includes(detail);
  if (format === "surface") return SURFACE_DETAILS.includes(detail);
  if (format === "neurovascular") return NEUROVASCULAR_DETAILS.includes(detail);
  return [...SECTION_DETAILS, ...SURFACE_DETAILS, ...NEUROVASCULAR_DETAILS].includes(detail);
}

/**
 * Apply the same normalization as the UI when a format choice invalidates the
 * currently selected detail. A format choice therefore never reports a
 * misleading zero merely because its dependent detail would be reset to all.
 *
 * @param {QuizFilters} filters
 * @param {"category"|"format"|"detail"} dimension
 * @param {string} value
 * @returns {QuizFilters}
 */
export function filtersForQuizChoice(filters, dimension, value) {
  const next = {...filters, [dimension]: value};
  if (dimension === "format" && !isDetailCompatible(next.format, next.detail)) next.detail = "all";
  return next;
}

/**
 * @typedef {{target:string;category:string;format:QuizFormat;detail:QuizDetail;origin:QuizOrigin}} QuizFilterQuestion
 * @typedef {{category:string;format:"all"|QuizFormat;detail:string;includeProvisional:boolean;wrongOnly:boolean}} QuizFilters
 */

/**
 * Keep the filter predicate independent from the React state so every count
 * and the actual quiz queue use exactly the same candidate definition.
 *
 * @param {QuizFilterQuestion} question
 * @param {QuizFilters} filters
 * @param {readonly string[]} wrongTargets
 */
export function matchesQuizFilters(question, filters, wrongTargets) {
  if (filters.category !== "all" && question.category !== filters.category) return false;
  if (filters.format !== "all" && question.format !== filters.format) return false;
  if (filters.detail !== "all" && question.detail !== filters.detail) return false;
  if (!filters.includeProvisional && question.origin === "provisional") return false;
  if (filters.wrongOnly && !wrongTargets.includes(question.target)) return false;
  return true;
}

/**
 * @template {QuizFilterQuestion} T
 * @param {readonly T[]} questions
 * @param {QuizFilters} filters
 * @param {readonly string[]} wrongTargets
 * @returns {T[]}
 */
export function filterQuizCandidates(questions, filters, wrongTargets) {
  return questions.filter(question => matchesQuizFilters(question, filters, wrongTargets));
}

/**
 * Count choices while replacing one dimension of the current filter. This
 * makes a displayed count answer “how many would I get if I chose this?”
 * rather than merely repeating the currently selected count.
 *
 * @template {QuizFilterQuestion} T
 * @param {readonly T[]} questions
 * @param {QuizFilters} filters
 * @param {readonly string[]} wrongTargets
 * @param {"category"|"format"|"detail"} dimension
 * @param {string} value
 */
export function countQuizChoice(questions, filters, wrongTargets, dimension, value) {
  return filterQuizCandidates(questions, filtersForQuizChoice(filters, dimension, value), wrongTargets).length;
}

/**
 * Validate the one-to-one classification contract used by the audit script and
 * by tests. Returning errors instead of throwing keeps this usable for both a
 * CLI audit and focused anomaly tests.
 *
 * @param {readonly QuizFilterQuestion[]} questions
 * @returns {string[]}
 */
export function validateQuizGranularity(questions) {
  const errors = [];
  const seenTargets = new Set();
  for (const [index, question] of questions.entries()) {
    const prefix = `question ${index + 1}`;
    if (!question || typeof question !== "object") {
      errors.push(`${prefix}: question must be an object`);
      continue;
    }
    if (!question.target || seenTargets.has(question.target)) errors.push(`${prefix}: target must be unique`);
    seenTargets.add(question.target);
    if (!question.category) errors.push(`${prefix}: category is required`);
    if (!QUIZ_FORMATS.includes(question.format)) errors.push(`${prefix}: unknown format ${question.format}`);
    if (!QUIZ_ORIGINS.includes(question.origin)) errors.push(`${prefix}: unknown origin ${question.origin}`);
    if (!isDetailCompatible(question.format, question.detail)) errors.push(`${prefix}: detail ${question.detail} is incompatible with ${question.format}`);
    if (question.format === "section" && !SECTION_DETAILS.includes(question.detail)) errors.push(`${prefix}: section detail must be a plane`);
    if (question.format === "surface" && !SURFACE_DETAILS.includes(question.detail)) errors.push(`${prefix}: surface detail must be a surface view`);
  }
  return errors;
}

export { SECTION_DETAILS, SURFACE_DETAILS, NEUROVASCULAR_DETAILS, QUIZ_FORMATS, QUIZ_ORIGINS };
