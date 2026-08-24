export type BlockSpecimenPriorityGroup = "focus" | "development";
export type BlockPrioritySpecimenKey = "lateral-ventricle" | "diencephalon" | "radiations" | "commissural-system" | "choroid-plexus" | "medial-temporal" | "midbrain-section" | "hindbrain";
export type BlockPriorityGroup = {
  readonly key: BlockSpecimenPriorityGroup;
  readonly label: string;
  readonly shortLabel: string;
  readonly description: string;
  readonly specimenKeys: readonly BlockPrioritySpecimenKey[];
};
export type BlockPriorityEntry = {
  readonly key: BlockPrioritySpecimenKey;
  readonly group: BlockSpecimenPriorityGroup;
  readonly reason: string;
};
export type BlockPriorityContract = {
  readonly specimenKeys: readonly BlockPrioritySpecimenKey[];
  readonly groupKeys: readonly BlockSpecimenPriorityGroup[];
  readonly groups: Readonly<Record<BlockSpecimenPriorityGroup, BlockPriorityGroup>>;
  readonly entries: readonly BlockPriorityEntry[];
  readonly disclaimer: string;
};
export const BLOCK_SPECIMEN_KEYS: readonly BlockPrioritySpecimenKey[];
export const BLOCK_PRIORITY_GROUP_KEYS: readonly BlockSpecimenPriorityGroup[];
export const BLOCK_PRIORITY_GROUPS: Readonly<Record<BlockSpecimenPriorityGroup, BlockPriorityGroup>>;
export const BLOCK_PRIORITY_ENTRIES: readonly BlockPriorityEntry[];
export const BLOCK_PRIORITY_DISCLAIMER: string;
export const BLOCK_PRIORITY_GROUP_BY_KEY: Readonly<Record<BlockPrioritySpecimenKey, BlockSpecimenPriorityGroup>>;
export const BLOCK_PRIORITY_ENTRY_BY_KEY: Readonly<Record<BlockPrioritySpecimenKey, BlockPriorityEntry>>;
export const PRIORITY_TEXT_FORBIDDEN: RegExp;
export function validateBlockPriorityContract(value?: BlockPriorityContract): {ok: boolean; errors: string[]; summary: {specimenCount: number; groupCount: number; focusKeys: readonly BlockPrioritySpecimenKey[]; developmentKeys: readonly BlockPrioritySpecimenKey[]}};
