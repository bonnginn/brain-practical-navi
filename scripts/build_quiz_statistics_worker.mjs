import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';

const source=readFileSync(new URL('../services/quiz-statistics/worker.mjs',import.meta.url),'utf8');
const catalog=JSON.parse(readFileSync(new URL('../services/quiz-statistics/catalog.json',import.meta.url),'utf8'));
const legacy=JSON.parse(readFileSync(new URL('../services/quiz-statistics/legacy-catalog.json',import.meta.url),'utf8'));
const first="import catalog from './catalog.json' with {type:'json'};\nimport legacyCatalog from './legacy-catalog.json' with {type:'json'};";
if(!source.startsWith(first))throw new Error('Unexpected Worker import');
const currentKeys=new Set(catalog.map(({question,revision})=>`${question}:${revision}`));
if(legacy.some(({question,revision})=>currentKeys.has(`${question}:${revision}`)))throw new Error('Legacy catalog duplicates current question revision');
const runtimeCatalog=catalog.map(({question,revision,options})=>({question,revision,options}));
const runtimeLegacy=legacy.map(({question,revision,options})=>({question,revision,options}));
const bundled=source.replace(first,`const catalog=${JSON.stringify(runtimeCatalog)};\nconst legacyCatalog=${JSON.stringify(runtimeLegacy)};`);
const output=new URL('../work/quiz-statistics-worker.deploy.mjs',import.meta.url);
mkdirSync(new URL('../work/',import.meta.url),{recursive:true});
writeFileSync(output,bundled);
console.log(`Built ${catalog.length} current and ${legacy.length} cached-beta revisions for dashboard deployment`);
