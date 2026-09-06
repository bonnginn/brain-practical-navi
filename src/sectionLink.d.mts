import type {SectionSession} from './sectionSession.mjs';
export function observationUrl(currentUrl:string,hash:string):string;
export type SectionLinkResult={status:'absent'|'invalid'|'revision-mismatch'}|{status:'valid';plane:'coronal'|'horizontal'|'sagittal';state:SectionSession};
export function readSectionLink(hash:string,allowedKeys:readonly string[],revision:string):SectionLinkResult;
export function sectionLinkHash(plane:string,state:SectionSession,allowedKeys:readonly string[],revision:string):string|null;
