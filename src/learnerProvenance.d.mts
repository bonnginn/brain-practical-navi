export type LearnerDisplayFamily = "sections" | "surface" | "free" | "neurovascular" | "blocks";
export type LearnerBadge = {
  label: string;
  className: "source" | "provisional";
  representation: string | null;
  rank: number;
};
export type LearnerProvenanceEntry = {
  key: string;
  representations: readonly string[];
  learnerSurfaces: readonly string[];
  expertReview?: string;
  projectReview?: string;
  hiddenAssets?: readonly string[];
  [key: string]: unknown;
};
export type LearnerProvenanceMapping = {
  target: string;
  family: LearnerDisplayFamily;
  entryKeys: readonly string[];
  composite: boolean;
  requiredSurfaces: readonly string[];
  unresolvedTargetKeys: readonly string[];
  unresolvedReason: string | null;
};
export type LearnerProvenanceDisplay = LearnerProvenanceMapping & {
  entries: readonly LearnerProvenanceEntry[];
  missingEntryKeys: readonly string[];
  unresolved: boolean;
  badge: LearnerBadge;
};
export declare const LEARNER_DISPLAY_FAMILIES: readonly LearnerDisplayFamily[];
export declare const LEARNER_BADGE_REPRESENTATIONS: readonly string[];
export declare const LEARNER_SURFACE_BY_FAMILY: Readonly<Record<LearnerDisplayFamily, readonly string[]>>;
export declare const LEARNER_SURFACE_REGION_KEYS: readonly string[];
export declare const LEARNER_SURFACE_LANDMARK_KEYS: readonly string[];
export declare const LEARNER_SURFACE_DEEP_KEYS: readonly string[];
export declare const LEARNER_SURFACE_BASAL_KEYS: readonly string[];
export declare const LEARNER_NEUROVASCULAR_KEYS: readonly string[];
export declare const LEARNER_BLOCK_SPECIMEN_KEYS: readonly string[];
export declare const LEARNER_BLOCK_LAYERS_BY_SPECIMEN: Readonly<Record<string, readonly string[]>>;
export declare const LEARNER_PROVENANCE_MAPPINGS: readonly LearnerProvenanceMapping[];
export declare function shortBadgeForEntry(entry: LearnerProvenanceEntry | null | undefined): LearnerBadge;
export declare function shortBadgeForEntries(entries: readonly LearnerProvenanceEntry[]): LearnerBadge;
export declare function deriveLearnerProvenanceDisplay(registry: {entries: readonly LearnerProvenanceEntry[]}, mappings?: readonly LearnerProvenanceMapping[]): readonly LearnerProvenanceDisplay[];
export declare function mappingTargetSet(mappings?: readonly LearnerProvenanceMapping[]): Set<string>;
