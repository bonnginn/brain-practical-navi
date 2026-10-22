import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import {sectionAlignedRotation,segmentationPlaneNames} from '../app/segmentationGeometry.ts';
const canvas=readFileSync(new URL('../app/AtlasVolumeCanvas.tsx',import.meta.url),'utf8');
test('section-aligned 3D projects anatomical axes in the same directions as each 2D view',()=>{
  // Use the actual renderer matrix, rather than assuming its Euler order.
  const expression=canvas.match(/const ax=rot.x\*Math.PI\/180[^\n]+?m=new Float32Array\((\[[^;]+?\])\);/)[0];
  const matrix=expression.slice(0,expression.indexOf(';gl.'))+';globalThis.matrix=Array.from(m);';
  const vectors={R:[1,0,0],L:[-1,0,0],S:[0,1,0],I:[0,-1,0],A:[0,0,1],P:[0,0,-1]};
  for(const plane of ['coronal','horizontal','sagittal']){
    const ctx={rot:sectionAlignedRotation(plane)};vm.runInNewContext(matrix,ctx);
    const m=ctx.matrix,project=v=>[m[0]*v[0]+m[3]*v[1]+m[6]*v[2],m[1]*v[0]+m[4]*v[1]+m[7]*v[2]];
    const names=segmentationPlaneNames[plane];
    assert.ok(project(vectors[names.right])[0]>.999,plane+' right');
    assert.ok(project(vectors[names.top])[1]>.999,plane+' top');
    const det=m[0]*(m[4]*m[8]-m[7]*m[5])-m[3]*(m[1]*m[8]-m[7]*m[2])+m[6]*(m[1]*m[5]-m[4]*m[2]);
    assert.ok(Math.abs(det-1)<1e-6,'rotation preserves handedness');
  }
});
test('plain wheel preserves image zoom and page scrolling; Alt+wheel zooms explicitly',()=>{
  const ast=ts.createSourceFile('canvas.tsx',canvas,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let fn;
  function visit(n){if(ts.isFunctionDeclaration(n)&&n.name?.text==='handleWheel')fn=n.getText(ast);ts.forEachChild(n,visit)}visit(ast);
  const js=ts.transpileModule(fn+';globalThis.wheel=handleWheel',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  let zoom=1,cancelled=0,changes=0;
  const ctx={kind:'surface',setZoom:f=>{zoom=f(zoom)},onViewChange:()=>changes++};vm.runInNewContext(js,ctx);
  const event={deltaY:100,altKey:false,preventDefault:()=>cancelled++};
  ctx.wheel(event);assert.equal(zoom,1);assert.equal(cancelled,0);assert.equal(changes,0);
  ctx.wheel({...event,altKey:true});assert.ok(zoom<1);assert.equal(cancelled,1);assert.equal(changes,1);
});
