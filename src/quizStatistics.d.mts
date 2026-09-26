export type MetricQuestion={id?:string;target:string;prompt:string;options:readonly string[];correctAnswer?:string;optionLabels?:Record<string,string>;plane?:string;position?:number;view?:string;explanation?:string};
type StorageAccess={getItem:(key:string)=>string|null;setItem:(key:string,value:string)=>void};
export function questionMetric(question:MetricQuestion):Promise<{question:string;revision:string}>;
export function statisticsConsent(storage:StorageAccess,endpoint:string):boolean;
export function setStatisticsConsent(storage:StorageAccess,enabled:boolean,endpoint:string):boolean;
export function statisticsEndpoint(value:string):string|null;
export function sendQuizStatistic(question:MetricQuestion,correct:boolean,endpoint:string,storage:StorageAccess,fetcher?:typeof fetch):Promise<boolean>;
