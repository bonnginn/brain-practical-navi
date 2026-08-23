export type PwaInstallOutcome = "accepted" | "dismissed" | "error" | "already-installed" | "unavailable";

export interface PwaInstallState {
  readonly supported: boolean;
  readonly mounted: boolean;
  readonly installed: boolean;
  readonly eventPending: boolean;
  readonly canInstall: boolean;
  readonly promptInFlight: boolean;
}

export interface PwaInstallResult {
  readonly status: PwaInstallOutcome;
  readonly outcome?: "accepted" | "dismissed";
  readonly error?: unknown;
}

export interface PwaInstallAffordanceOptions {
  readonly windowLike?: {
    readonly navigator?: { readonly standalone?: boolean };
    readonly matchMedia?: (query: string) => { readonly matches?: boolean };
    addEventListener?: (type: string, listener: (event?: unknown) => void) => void;
    removeEventListener?: (type: string, listener: (event?: unknown) => void) => void;
  } | null;
  readonly onChange?: (state: PwaInstallState) => void;
}

export interface PwaInstallAffordance {
  readonly mount: () => PwaInstallState;
  readonly cleanup: () => void;
  readonly destroy: () => void;
  readonly requestInstall: () => Promise<PwaInstallResult>;
  readonly getState: () => PwaInstallState;
}

export function isPwaStandalone(windowLike?: PwaInstallAffordanceOptions["windowLike"]): boolean;
export function createPwaInstallAffordance(options?: PwaInstallAffordanceOptions): PwaInstallAffordance;

