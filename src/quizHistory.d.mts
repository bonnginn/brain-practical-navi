type HistoryQuestion = {id?:string;target:string};
export declare function quizHistoryKey(question:HistoryQuestion):string;
export declare function restoreQuizHistory(current:string|null,legacy:string|null,questions:readonly HistoryQuestion[]):string[];
export declare function recordQuizAnswer(history:readonly string[],question:HistoryQuestion,correct:boolean):string[];
