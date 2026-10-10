export type IdentificationAvailabilityStatus='available'|'not-recorded'|'wrong-source'|'unavailable-data'|'unavailable-plane';
export function sectionIdentificationAvailability<T extends {key:string;kind:string}>(options:{
  tasks:readonly T[];
  target:string|undefined;
  source:string;
  revisionMatches:boolean;
  findSlice:(task:T)=>number|null;
}):{status:'available';task:T}|{status:Exclude<IdentificationAvailabilityStatus,'available'>;task:T|null};
export function identificationUnavailableMessage(status:IdentificationAvailabilityStatus,english?:boolean):string;

export function identificationReviewQuestions<T extends {target:string;category?:string;format?:string}>(
  questions:readonly T[],task:{key:string;kind:string}
):T[];

export function hasSurfaceIdentificationQuestions(
  questions:readonly {target:string;category?:string;format?:string}[],task:{key:string;kind:string}
):boolean;
