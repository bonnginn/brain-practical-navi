import ledgerData from "./quiz-review-ledger.json";

export type QuizReviewApproval={target:string;reviewedCommit:string;evidenceTargetIds:string[];bundleDirectory:string;adoptedAt:string;adoptedBy:string;reason:string;caution:string};
type QuizReviewLedger={format:"brain-practical-quiz-review-ledger";schemaVersion:1;approvals:QuizReviewApproval[]};

export const quizReviewLedger=ledgerData as QuizReviewLedger;
const approvalsByTarget=new Map(quizReviewLedger.approvals.map(approval=>[approval.target,approval]));
export const quizReviewApprovalFor=(target:string)=>approvalsByTarget.get(target)??null;
export const quizReviewApprovalCount=approvalsByTarget.size;
