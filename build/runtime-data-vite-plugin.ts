import {readFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import type {Plugin} from 'vite';
// @ts-expect-error Build-only helper is verified by executable projection tests.
import {curriculumDisplayMap} from './curriculum-display.mjs';

export function runtimeDisplayData():Plugin{
  return {
    name:'runtime-display-data',apply:'build',enforce:'post',
    transform(_code,id){
      const normalized=id.replace(/\\/g,'/');
      if(normalized.endsWith('/data/curriculum/content-map.json')){
        return {code:`export default ${JSON.stringify(curriculumDisplayMap(JSON.parse(readFileSync(id,'utf8'))))};`,map:null};
      }
      if(normalized.endsWith('/app/english-catalog.json')){
        const encoded=gzipSync(readFileSync(id),{level:9}).toString('base64');
        // English consumers already load asynchronously. Preserve every byte.
        return {code:`const bytes=Uint8Array.from(atob(${JSON.stringify(encoded)}),c=>c.charCodeAt(0));const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));export default JSON.parse(await new Response(stream).text());`,map:null};
      }
    },
    generateBundle(){
      for(const id of this.getModuleIds()){
        if(!id.replace(/\\/g,'/').endsWith('/data/curriculum/content-map.json'))continue;
        const importers=this.getModuleInfo(id)?.importers??[];
        if(importers.some(importer=>!importer.replace(/\\/g,'/').endsWith('/src/CurriculumReferences.tsx')))throw new Error('Curriculum display inventory has an unexpected importer');
      }
    },
  };
}
