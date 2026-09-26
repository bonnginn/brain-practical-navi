export type MetricQuestion={id?:string;target:string;prompt:string;options:readonly string[];correctAnswer?:string;optionLabels?:Record<string,string>;plane?:string;position?:number;view?:string;explanation?:string};
export function questionMetric(question:MetricQuestion):Promise<{question:string;revision:string}>;
export function statisticsEndpoint(value:string):string|null;
export function sendQuizStatistic(question:MetricQuestion,choice:string,endpoint:string,fetcher?:typeof fetch):Promise<boolean>;
export type QuizOptionCount={question:string;revision:string;choice:string;answers:number};
export function readQuizStatistics(endpoint:string,fetcher?:typeof fetch):Promise<QuizOptionCount[]|null>;
