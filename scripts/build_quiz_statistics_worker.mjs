import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';

const source=readFileSync(new URL('../services/quiz-statistics/worker.mjs',import.meta.url),'utf8');
const catalog=JSON.parse(readFileSync(new URL('../services/quiz-statistics/catalog.json',import.meta.url),'utf8'));
const first="import catalog from './catalog.json' with {type:'json'};";
if(!source.startsWith(first))throw new Error('Unexpected Worker import');
const runtimeCatalog=catalog.map(({question,revision,options})=>({question,revision,options}));
const bundled=source.replace(first,`const catalog=${JSON.stringify(runtimeCatalog)};`);
const output=new URL('../work/quiz-statistics-worker.deploy.mjs',import.meta.url);
mkdirSync(new URL('../work/',import.meta.url),{recursive:true});
writeFileSync(output,bundled);
console.log(`Built ${runtimeCatalog.length} allowed questions for dashboard deployment`);
