/** Input order supplies randomized tie breaks. Prefer new structures, then
 * underrepresented topics; avoid adjacent repeats whenever alternatives exist. */
export function balancedQuizOrder(questions) {
  const remaining=[...questions], result=[], targets=new Map(), categories=new Map();
  while(remaining.length){
    const previous=result.at(-1)?.target;
    const alternatives=remaining.some(q=>q.target!==previous);
    let best=-1, bestScore=null;
    remaining.forEach((q,i)=>{
      if(alternatives&&q.target===previous)return;
      const score=[targets.get(q.target)??0,categories.get(q.category)??0];
      if(bestScore===null||score[0]<bestScore[0]||(score[0]===bestScore[0]&&score[1]<bestScore[1])){best=i;bestScore=score;}
    });
    const [q]=remaining.splice(best,1);result.push(q);
    targets.set(q.target,(targets.get(q.target)??0)+1);
    categories.set(q.category,(categories.get(q.category)??0)+1);
  }
  return result;
}
