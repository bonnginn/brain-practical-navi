// Temporary exclusion of model-dependent questions, not removal of nerve facts.
const heldTargets = new Set(["cn5", "cn9", "cn10", "cn11"]);
export function isQuizAnatomyAvailable(question) {
  return !heldTargets.has(question.target);
}
export function quizAnatomyHoldSummary(english=false){
  return english
    ?"Eight questions remain withheld: identification and function questions for V and IX–XI await confirmation that the new short or partial displayed segments are sufficiently visible and distinguishable."
    :"8問を引き続き保留しています。V・IX〜XIの名称同定・機能問題は、新しい短い表示区間または一部分が十分に見え、区別できるか確認中です。";
}
