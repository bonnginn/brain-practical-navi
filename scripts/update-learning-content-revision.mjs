import {createHash} from 'node:crypto';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {resolve,relative,extname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('..',import.meta.url));
const generated='src/learningContentRevision.ts';
const extensions=new Set(['.ts','.tsx','.mjs','.json','.css']);
async function collect(directory){
  const files=[];
  for(const entry of await readdir(directory,{withFileTypes:true})){
    const path=resolve(directory,entry.name);
    if(entry.isDirectory())files.push(...await collect(path));
    else if(entry.isFile()&&extensions.has(extname(entry.name))&&relative(root,path).replaceAll('\\','/')!==generated)files.push(path);
  }
  return files;
}
const files=(await Promise.all(['app','src'].map(folder=>collect(resolve(root,folder))))).flat()
  .sort((a,b)=>relative(root,a).replaceAll('\\','/')<relative(root,b).replaceAll('\\','/')?-1:1);
const hash=createHash('sha256');
for(const file of files){hash.update(relative(root,file).replaceAll('\\','/'));hash.update('\0');hash.update(await readFile(file));hash.update('\0');}
const revision=hash.digest('hex');
const source=`export const LEARNING_CONTENT_REVISION="${revision}";\n`;
if(process.argv.includes('--check')){
  if(await readFile(resolve(root,generated),'utf8')!==source)throw new Error('Learning content revision is stale; regenerate it before building.');
}else await writeFile(resolve(root,generated),source);
process.stdout.write(JSON.stringify({files:files.length,revision,mode:process.argv.includes('--check')?'check':'generate'})+'\n');
