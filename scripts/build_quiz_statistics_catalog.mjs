import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {parseQuizGranularity} from './audit_quiz_granularity.mjs';
import {parseNeurovascularQuizInventory} from './audit_neurovascular_quiz.mjs';
import {isQuizAnatomyAvailable} from '../src/quizAnatomyHold.mjs';
import {questionMetric} from '../src/quizStatistics.mjs';
const source=readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');
const bank=JSON.parse(readFileSync(new URL('../app/quiz-concept-bank.json',import.meta.url),'utf8'));
const visual=[...parseQuizGranularity(source),...parseNeurovascularQuizInventory(source)];
const concepts=bank.questions.map(seed=>({...visual.find(q=>q.target===seed.target),id:seed.id,prompt:seed.prompt,
  correctAnswer:seed.correctAnswer,options:seed.options.map(o=>o.key),optionLabels:Object.fromEntries(seed.options.map(o=>[o.key,o.label])),explanation:seed.explanation}));
const questions=[...visual,...concepts].filter(isQuizAnatomyAvailable);
const rows=await Promise.all(questions.map(async q=>({...await questionMetric(q),prompt:q.prompt,options:q.options})));
if(new Set(rows.map(q=>q.question)).size!==rows.length)throw Error('Duplicate question identity');
const folder=new URL('../services/quiz-statistics/',import.meta.url);mkdirSync(folder,{recursive:true});
writeFileSync(new URL('catalog.json',folder),JSON.stringify(rows,null,2)+'\n');
console.log(`Statistics allowlist: ${rows.length} questions (held questions excluded)`);
