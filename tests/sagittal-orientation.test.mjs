import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { planeVoxel, planeSliceIndex, segmentationPlaneNames } from "../app/segmentationGeometry.ts";

const source = fs.readFileSync(new URL("../app/AtlasVolumeCanvas.tsx", import.meta.url), "utf8");
const ast = ts.createSourceFile("canvas.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const names = ["sectionSize", "sectionVoxel", "viewTransform", "drawFixedSlice", "drawSlice"];
const functions = ast.statements.filter(node => ts.isFunctionDeclaration(node) && names.includes(node.name?.text));
assert.equal(functions.length, names.length);
// Execute the actual render functions against an in-memory Canvas test double.
// This proves source/label indexing, not visual QA of a real browser.
let pixels;
const noop = () => {};
const context = { clearRect:noop, fillRect:noop, drawImage:noop };
const scope = vm.createContext({
  idx:(x,y,z,d)=>x+d[0]*(y+d[1]*z),
  drawScale:noop, drawSectionOrientation:noop, QUIZ_SECTION_ACCENT_RGB:[234,184,62],
  document:{createElement:()=>({getContext:()=>({
    createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),
    putImageData:image=>{pixels=image.data;},
  })})},
});
vm.runInContext(ts.transpileModule(functions.map(node=>node.getText(ast)).join("\n"), {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,scope);

const dims=[3,5,4], count=dims.reduce((a,b)=>a*b,1);
const values=Uint8Array.from({length:count},(_,i)=>35+i*2), labels=Uint8Array.from({length:count},(_,i)=>i%4===0?7:0);
const volume={dims,t1:values,t2:values,values,labels,mask:new Uint8Array(count).fill(1)};
const tone={sharpness:0,brightness:0,contrast:1};
const index=([x,y,z])=>x+dims[0]*(y+dims[1]*z);
const clamp=value=>new Uint8ClampedArray([value])[0];

function expectedVoxel(a,b,plane,p){
  const slice=Math.round((plane==="horizontal"?1-p/100:p/100)*(dims[plane==="horizontal"?2:plane==="coronal"?1:0]-1));
  return plane==="sagittal"?[slice,4-a,3-b]:plane==="horizontal"?[a,4-b,slice]:[a,slice,3-b];
}

test("learner picking and editor inspection preserve voxel identity with anterior on the left",()=>{
  assert.equal(segmentationPlaneNames.sagittal.left,"A");
  assert.equal(segmentationPlaneNames.sagittal.right,"P");
  for(const plane of ["horizontal","coronal","sagittal"])for(const p of [0,50,100]){
    const [w,h]=scope.sectionSize(dims,plane);
    for(let b=0;b<h;b++)for(let a=0;a<w;a++){
      const expected=expectedVoxel(a,b,plane,p);
      assert.deepEqual(Array.from(scope.sectionVoxel(a,b,dims,plane,p)),expected);
      assert.deepEqual(planeVoxel(a,b,planeSliceIndex(p,plane,dims),plane,dims),expected);
    }
  }
});

test("BigBrain, T1, T2 and fixed MRI pixels use the same orientation as labels and picking",()=>{
  const color=[200,30,90],colors=new Map([[7,color]]);
  for(const plane of ["horizontal","coronal","sagittal"])for(const p of [0,50,100])for(const contrast of ["bigbrain","t1","t2","single"]){
    const fixed=contrast==="single",bigbrain=contrast==="bigbrain";
    if(fixed)scope.drawFixedSlice(context,500,400,volume,plane,p,"diagram",tone,1,{x:0,y:0});
    else scope.drawSlice(context,500,400,volume,volume,{dims,labels},plane,p,"diagram",contrast,tone,colors,1,{x:0,y:0});
    const [w,h]=scope.sectionSize(dims,plane);
    for(let b=0;b<h;b++)for(let a=0;a<w;a++){
      const si=index(expectedVoxel(a,b,plane,p)),raw=values[si];
      let expected=fixed?[78+raw*.66,65+raw*.59,51+raw*.49]:bigbrain?[76+raw*.70,64+raw*.63,49+raw*.53]:[92+raw*.7,78+raw*.64,61+raw*.54];
      if(!fixed&&labels[si]===7)expected=expected.map((value,i)=>value*.14+color[i]*.86);
      assert.deepEqual(Array.from(pixels.slice((b*w+a)*4,(b*w+a)*4+4)),[...expected.map(clamp),255],`${plane}/${p}/${contrast}/${a},${b}`);
    }
  }
});

test("both image renderers draw orientation markers and sagittal inspection remains read-only",()=>{
  for(const name of ["drawFixedSlice","drawSlice"]){
    assert.match(functions.find(node=>node.name.text===name).getText(ast),/drawSectionOrientation\(c,w,h,plane\)/);
  }
  const editor=fs.readFileSync(new URL("../app/ManualSegmentationWorkbench.tsx",import.meta.url),"utf8");
  assert.match(editor,/isEditablePlane=plane==="horizontal"/);
  assert.match(editor,/planeVoxel\(/);
});

test("selected aqueduct lumen remains colored over bright background like the other ventricles",()=>{
  const d=[1,1,1],color=[213,139,168];
  for(const raw of [251,252,255])for(const label of [25,26,41])for(const display of ["specimen","diagram","outline"]){
    const bb={dims:d,values:new Uint8Array([raw])},manual={dims:d,labels:new Uint8Array([label])};
    scope.drawSlice(context,500,400,null,bb,manual,"sagittal",0,display,"bigbrain",tone,new Map([[label,color]]),1,{x:0,y:0});
    assert.deepEqual(Array.from(pixels),[...color,display==="specimen"?220:245],`raw=${raw} label=${label} display=${display}`);
    scope.drawSlice(context,500,400,null,bb,manual,"sagittal",0,display,"bigbrain",tone,new Map(),1,{x:0,y:0});
    assert.equal(pixels[3],raw>=252?0:255,"unselected lumen preserves source display");
  }
});
