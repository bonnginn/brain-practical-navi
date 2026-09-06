export type AnatomyReviewSurface = "all" | "surface" | "sections" | "blocks" | "quiz";
export function observationQuestionsForEntry<T extends {target:string;format?:string;plane?:string;view?:string}>(entry:AnatomyReviewRegistryEntry,questions:readonly T[]):T[];
export type AnatomyReviewRegistryEntry = {
  key: string;
  lectureLabel?: string | null;
  appLabel?: string | null;
  representations: readonly string[];
  learnerSurfaces: readonly string[];
  expertReview: string;
  projectReview: string;
  quizEligibility: string;
  sourceRefs: readonly string[];
  knownLimitations: readonly string[];
  legacyIds?: readonly number[];
  labelIds?: readonly number[];
  excludedFromSectionAndQuizTargets?: boolean;
  [key: string]: unknown;
};
export type AnatomyReviewRegistry = {
  entries: readonly AnatomyReviewRegistryEntry[];
  representationEnum?: readonly string[];
  learnerSurfaceEnum?: readonly string[];
  [key: string]: unknown;
};
export type AnatomyReviewQueueItem = {
  readonly key: string;
  readonly entry: AnatomyReviewRegistryEntry;
};
export declare const REVIEW_SURFACE_FILTERS: readonly ["all", "surface", "sections", "blocks", "quiz"];
export declare const OBSERVATION_SURFACE_ORDER: readonly ["surface", "sections", "blocks", "quiz"];
export declare function deriveAnatomyReviewQueue(registry: AnatomyReviewRegistry): AnatomyReviewQueueItem[];
export declare function filterAnatomyReviewQueue(queue: readonly AnatomyReviewQueueItem[], filters?: {surface?: AnatomyReviewSurface; representation?: string}): AnatomyReviewQueueItem[];
export declare function isLegacyOpticEntry(entry: AnatomyReviewRegistryEntry): boolean;
export declare function isMammillaryEntry(entry: AnatomyReviewRegistryEntry): boolean;
export declare function observationWorkspaceForEntry(entry: AnatomyReviewRegistryEntry): Exclude<AnatomyReviewSurface, "all"> | null;
export declare function observationHashForEntry(entry: AnatomyReviewRegistryEntry): `#workspace/${Exclude<AnatomyReviewSurface, "all">}` | null;
