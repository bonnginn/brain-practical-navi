// Temporary exclusion of image-dependent questions, not removal of nerve facts.
// Six local source reviews: NERVE_ORIGIN_IMAGE_REVIEW.md (2026-09-06).
const heldTargets = new Set(["cn5", "cn9", "cn10", "cn11"]);
export function isQuizAnatomyAvailable(question) {
  return !heldTargets.has(question.target);
}
