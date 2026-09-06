import type { SegmentationPlane } from "./segmentationGeometry";

export type OpticReviewCandidate = Readonly<{
  id: "sagittal-x187" | "coronal-y262" | "horizontal-z114";
  plane: SegmentationPlane;
  axis: "x" | "y" | "z";
  sliceIndex: number;
  voxelCountOnSlice: number;
  accessibleName: string;
}>;

export const OPTIC_REVIEW_AUDIT = {
inputSha256: "098edfbf365016c6c53ccf7b7032258db72a4912378c457d348c01613a4a1694",
  dims: [394, 466, 378] as const,
  auditedLabelId: 33 as const,
};

export const OPTIC_REVIEW_CANDIDATES = [
  {
    id: "sagittal-x187",
    plane: "sagittal",
    axis: "x",
    sliceIndex: 187,
    voxelCountOnSlice: 275,
    accessibleName: "旧ID33 データ順位候補・矢状断 X187",
  },
  {
    id: "coronal-y262",
    plane: "coronal",
    axis: "y",
    sliceIndex: 262,
    voxelCountOnSlice: 379,
    accessibleName: "旧ID33 データ順位候補・冠状断 Y262",
  },
  {
    id: "horizontal-z114",
    plane: "horizontal",
    axis: "z",
    sliceIndex: 114,
    voxelCountOnSlice: 625,
    accessibleName: "旧ID33 データ順位候補・水平断 Z114",
  },
] as const satisfies readonly OpticReviewCandidate[];
