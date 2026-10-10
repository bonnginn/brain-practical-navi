export function sectionIdentificationAvailability({tasks,target,source,revisionMatches,findSlice}){
  const task=tasks.find(item=>item.kind==='section'&&item.key===target)??null;
  if(!task)return {status:'not-recorded',task:null};
  if(source!=='bigbrain')return {status:'wrong-source',task};
  if(!revisionMatches)return {status:'unavailable-data',task};
  if(findSlice(task)===null)return {status:'unavailable-plane',task};
  return {status:'available',task};
}
export function identificationUnavailableMessage(status,english=false){
  const copy={
    'not-recorded':[
      'この構造の同定課題は未収録です。解説と観察で確認してください。',
      'There is no identification exercise for this structure. Use its explanation and observation view instead.',
    ],
    'wrong-source':[
      '同定課題にはBigBrainの組織画像を使います。画像ソースを切り替えてください。',
      'Identification uses the BigBrain tissue image. Switch the image source to continue.',
    ],
    'unavailable-data':[
      '現在のデータでは同定課題を開けません。観察と解説で確認してください。',
      'The identification exercise is unavailable with the current data. Continue with observation and explanation.',
    ],
    'unavailable-plane':[
      'この切断方向では同定課題を開けません。別の断面方向で確認してください。',
      'Identification is unavailable in this section plane. Choose another plane to continue.',
    ],
  };
  return copy[status]?.[english?1:0]??'';
}

// Callers supply the existing, anatomy-hold-filtered question bank.
export function identificationReviewQuestions(questions,task){
  if(task.kind!=='section')return [];
  return questions.filter(question=>question.target===task.key
    &&question.category!=='surface'&&question.category!=='neurovascular'
    &&(question.format===undefined||question.format==='section'));
}

// Availability copy uses real surface-bank membership, independently of the
// section-only identification-to-review connection above.
export function hasSurfaceIdentificationQuestions(questions,task){
  return task.kind==='surface'&&questions.some(question=>question.target===task.key
    &&question.category==='surface'
    &&(question.format===undefined||question.format==='surface'));
}
