export type BlockContextSpecimen = "lateral-ventricle";
export type BlockContextView = "whole" | "section";
export type BlockContextState = {
  enabled: boolean;
  view: BlockContextView;
  [key: string]: unknown;
};
export type BlockContextEvent =
  | {type: "toggle"; specimen?: string}
  | {type: "set-enabled"; enabled: boolean; specimen?: string}
  | {type: "set-view"; view: BlockContextView}
  | {type: "close" | "leave-workspace" | "restore-route" | "enter-workspace" | "select-specimen"; workspace?: string; specimen?: string};
export const BLOCK_CONTEXT_SPECIMEN: BlockContextSpecimen;
export const BLOCK_CONTEXT_INITIAL_STATE: Readonly<BlockContextState>;
export function createBlockContextState<T extends Record<string, unknown> = Record<string, never>>(overrides?: T): BlockContextState & T;
export function transitionBlockContext<T extends BlockContextState>(state: T, event?: BlockContextEvent): T;
export function shouldRenderBlockContext(args?: {workspace?: string; specimen?: string; state?: {enabled?: boolean}; enabled?: boolean}): boolean;
