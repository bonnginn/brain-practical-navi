/** Reuse existing descriptions; never infer the anatomy behind an option key. */
export function quizAnswerComparison(question,choice,registry){
  const correct=question.correctAnswer??question.target;
  if(!choice||choice===correct||!question.options.includes(choice)||!question.options.includes(correct))return null;
  const named=(question.questionKind??'identification')==='identification'||question.questionKind==='function-to-structure';
  const entry=key=>{
    const record=Object.hasOwn(registry,key)?registry[key]:null;
    const name=question.optionLabels?.[key]??record?.name;
    if(!name)return null;
    return {key,name,note:named?record?.note??null:null,relation:named?record?.relation??null:null};
  };
  const expected=entry(correct),selected=entry(choice);
  return expected&&selected?{expected,selected}:null;
}
