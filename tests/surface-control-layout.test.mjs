import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

test("surface layer controls are outside the rotation stage and inside the model card",()=>{
  const code=fs.readFileSync(new URL("../app/page.tsx",import.meta.url),"utf8");
  const source=ts.createSourceFile("page.tsx",code,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let found=0;
  function visit(node){
    if(ts.isJsxElement(node)&&node.openingElement.attributes.properties.some(p=>ts.isJsxAttribute(p)&&p.name.text==="className"&&p.initializer&&ts.isStringLiteral(p.initializer)&&p.initializer.text==="surfaceDisplayControls")){
      found++;
      const ancestors=[];
      for(let parent=node.parent;parent;parent=parent.parent)if(ts.isJsxElement(parent))ancestors.push(parent.openingElement.getText(source));
      assert.ok(ancestors.some(s=>s.includes('className="learningModelCard surfaceModelCard"')));
      assert.ok(ancestors.every(s=>!s.includes("learningModelStage")),"controls must not cover or receive rotation gestures from the stage");
      const text=node.getText(source);
      for(const name of ["脳表・神経血管レイヤー","下面の補助レイヤー","自由観察の表示レイヤー"])assert.ok(text.includes(name));
    }
    ts.forEachChild(node,visit);
  }
  visit(source);
  assert.equal(found,1);
});

test("the dedicated control row wraps labels and retains a usable model and touch targets",()=>{
  const css=fs.readFileSync(new URL("../app/canvas.css",import.meta.url),"utf8");
  assert.match(css,/\.surfaceModelCard:has\(\.surfaceDisplayControls\)\{grid-template-rows:max-content minmax\(280px,1fr\) max-content;overflow-y:auto\}/);
  assert.match(css,/\.surfaceDisplayControls \.freeObservationControls>div\{flex-wrap:wrap\}/);
  assert.match(css,/\.surfaceDisplayControls button\{min-height:44px;white-space:normal\}/);
});
