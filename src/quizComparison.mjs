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

/** The registry supplied here contains teaching text, not rendering/provenance notes. */
export function quizFeedbackParagraphs(question,choice,registry,optionTargets={}){
  const target=registry[question.target];
  const paragraphs=question.explanation?[question.explanation]:[target?.note,target?.relation].filter(Boolean);
  if(choice&&choice!==(question.correctAnswer??question.target)&&question.options.includes(choice)){
    const key=Object.hasOwn(optionTargets,choice)?optionTargets[choice]:null;
    const selected=key&&Object.hasOwn(registry,key)?registry[key]:null;
    if(selected?.note)paragraphs.push(selected.note);
  }
  return [...new Set(paragraphs)];
}
