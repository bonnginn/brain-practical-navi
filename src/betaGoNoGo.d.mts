export type BetaGoNoGoState = "proven-local" | "partial-local" | "expert-blocked" | "administrator-blocked" | "deployment-blocked";
export type BetaGoNoGoItem = {
  readonly id: string;
  readonly heading: string;
  readonly state: BetaGoNoGoState;
  readonly stateLabel: string;
  readonly locallyProven: readonly string[];
  readonly unprovenScope: string;
  readonly nextAction: string;
};
export type BetaGoNoGoGroup = {
  readonly state: BetaGoNoGoState;
  readonly stateLabel: string;
  readonly items: readonly BetaGoNoGoItem[];
};
export type BetaGoNoGoProjection = {
  readonly ledgerId: string;
  readonly updated: string;
  readonly itemCount: 12;
  readonly stateCounts: Readonly<Record<BetaGoNoGoState, number>>;
  readonly items: readonly BetaGoNoGoItem[];
  readonly groups: readonly BetaGoNoGoGroup[];
};
export const BETA_GO_NO_GO_STATE_ENUM: readonly BetaGoNoGoState[];
export const BETA_GO_NO_GO_STATE_LABELS: Readonly<Record<BetaGoNoGoState, string>>;
export const BETA_GO_NO_GO_HEADINGS: Readonly<Record<string, string>>;
export function createBetaGoNoGoProjection(ledger: unknown): BetaGoNoGoProjection;
export const REQUIRED_CRITERION_FIELDS: readonly string[];
export function shortHeading(text: string): string;
