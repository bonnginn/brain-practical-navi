/** Independent future overlay contract. Numeric segmentation IDs are not node IDs. */
export type Hemisphere = 'left' | 'right' | 'midline';
export type XYZ = [number, number, number];
export interface SourceAsset {
  id: string;
  datasetUrl: string;
  version: string;
  sha256: string;
  licenceUrl: string;
  redistribution: 'pending' | 'permitted' | 'restricted';
  referenceSpace: string; // Exact template/version, not just "MNI".
  voxelToWorld: [number[], number[], number[], number[]];
  dimensionsXYZ: XYZ;
  units: 'mm';
  coordinateConvention: 'RAS' | 'LPS';
  representation: 'probability' | 'discrete-label' | 'surface';
  atlasLabel: string;
}
export interface RegistrationEvidence {
  sourceAssetId: string;
  targetSpace: 'project:bigbrain-icbm500-scientific';
  targetImageSha256: string;
  sourceToTargetTransform: { path: string; sha256: string; kind: 'affine' | 'deformation' | 'verified-identity' };
  interpolation: 'nearest' | 'linear';
  reviewRecord: string; // Adjacent/orthogonal sections plus laterality checks.
  status: 'candidate' | 'project-reviewed';
  expertReview: string | null;
}
export interface NucleusLocation {
  id: string;
  targetId: string;
  hemisphere: Hemisphere;
  status: 'unlocalized' | 'candidate' | 'project-reviewed';
  anchor: { xyz: XYZ; space: 'project:bigbrain-icbm500-scientific' } | null;
  evidence: { sourceId: string; reviewRecord: string; targetSha256: string } | null;
  mask: { path: string; sha256: string; sourceAssetId: string; registrationId: string; threshold: number | null } | null;
  mesh: { path: string; sha256: string; derivedFromMaskSha256: string } | null;
  expertReview: string | null;
}
export interface CircuitEdge {
  id: string;
  fromLocationId: string;
  toLocationId: string;
  direction: 'forward' | 'bidirectional';
  laterality: 'ipsilateral' | 'contralateral' | 'bilateral' | 'unresolved';
  effect: 'excitatory' | 'inhibitory' | 'mixed' | 'unspecified';
  relay: 'direct' | 'via-unspecified-relays';
  viaLocationIds: string[];
  references: { url: string; locator: string }[];
  topologyStatus: 'draft' | 'source-reviewed';
  // A connection in a graph does not establish a trajectory through tissue.
  trajectory: null | {
    kind: 'schematic' | 'image-derived';
    xyz: XYZ[];
    space: 'project:bigbrain-icbm500-scientific';
    evidenceRecord: string;
  };
}
