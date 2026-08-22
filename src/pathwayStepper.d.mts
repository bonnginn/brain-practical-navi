export type PathwayStepperPlane = "coronal" | "horizontal" | "sagittal";
export type BasalGangliaTarget = "caudate" | "putamen" | "pallidumExternal" | "pallidumInternal" | "subthalamic" | "substantiaNigra" | "thalamus";
export type BasalGangliaStep = {
  readonly key: string;
  readonly label: string;
  readonly targetKeys: readonly BasalGangliaTarget[];
  readonly plane: PathwayStepperPlane;
  readonly position: number;
  readonly quizRefs: readonly string[];
};
export const BASAL_GANGLIA_STEPS: readonly BasalGangliaStep[];
export const BASAL_GANGLIA_TARGETS: readonly BasalGangliaTarget[];
export const BASAL_GANGLIA_LABEL_IDS: Readonly<Record<BasalGangliaTarget, readonly number[]>>;
export const BASAL_GANGLIA_TARGET_SET: ReadonlySet<string>;
export function sliceIndexForPosition(plane: PathwayStepperPlane, position: number, dims: readonly number[]): number;
export function countLabelPixelsAtSlice(labels: Uint8Array, dims: readonly number[], plane: PathwayStepperPlane, position: number, labelIds: readonly number[]): number;
export function advanceBasalStepperIndex(current: number, stepCount?: number): number;
export function startBasalGangliaStepperTimer(options?: {active?: boolean; onStep?: () => void; intervalMs?: number; schedule?: (callback: () => void, delay: number) => unknown; cancel?: (timer: unknown) => void}): () => void;
export function auditBasalGangliaStepper(options?: {steps?: readonly BasalGangliaStep[]; quizQuestions?: readonly {target?: string; plane?: string; position?: number}[]; dims?: readonly number[]; labels?: Uint8Array; labelIdsByTarget?: Partial<Record<BasalGangliaTarget, readonly number[]>>}): {ok: boolean; errors: string[]; summary: Record<string, unknown>};
