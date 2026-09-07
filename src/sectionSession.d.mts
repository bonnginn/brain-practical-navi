export type SectionSession = {version:1;positions:Record<'coronal'|'horizontal'|'sagittal',number>;visible:string[];selected:string;layout:'both'|'slice'|'model';views:1|2;share:number};
export declare const SECTION_SESSION_KEY:string;
export declare function readSectionSession(raw:string|null,allowedKeys:readonly string[]):SectionSession|null;
