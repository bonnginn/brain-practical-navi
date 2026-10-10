export type SectionReader={inspectorOpen:boolean;inspectorScroll:number;inspectorDetails:number[];themeOpen:boolean;themeDetails?:number[];themeOffset:number|null};
export function captureSectionReader(root:Document,theme:boolean):SectionReader;
export function readSectionReader(value:unknown):SectionReader|null;
export function restoreSectionReader(root:Document,value:SectionReader):void;
