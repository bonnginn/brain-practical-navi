import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  EXPECTED_QUIZ_TARGET_COUNTS,
  EXPECTED_QUIZ_TARGET_INVENTORY_SHA256,
  EXPECTED_QUIZ_VISIBILITY_OPTIONS_SHA256,
  QUIZ_TARGET_VISIBILITY_INVENTORY,
  QUIZ_TARGET_VISIBILITY_VIEWPORTS,
  auditQuizTargetVisibilitySource,
  buildQuizTargetVisibilityMatrix,
  compositeProjectionSelection,
  createValidQuizTargetVisibilityFixture,
  describeQuizTargetVisibilityArtifactRoot,
  describeQuizVisibilitySourceRoot,
  diffRgbaBuffers,
  runQuizTargetVisibilityBrowserAudit,
  sha256Bytes,
  validateQuizTargetVisibilityReport,
  validateQuizTargetVisibilityFixture,
} from "../scripts/audit_quiz_target_visibility_browser.mjs";

const root=new URL("../",import.meta.url),scriptPath=new URL("scripts/audit_quiz_target_visibility_browser.mjs",root),appSource=fs.readFileSync(new URL("app/page.tsx",root),"utf8"),atlasSource=fs.readFileSync(new URL("app/AtlasVolumeCanvas.tsx",root),"utf8"),runnerSource=fs.readFileSync(scriptPath,"utf8");
function validateFixture(fixture){return validateQuizTargetVisibilityFixture(fixture.report,{rawArtifactLoader:fixture.rawArtifactLoader,sourceRoot:fixture.sourceRoot})}

test("freezes exact 17/6/18 inventory, options/render dependency, and 123-row matrix",()=>{
  const audit=auditQuizTargetVisibilitySource({source:appSource});assert.equal(audit.ok,true,audit.errors.join("; "));assert.deepEqual(audit.counts,EXPECTED_QUIZ_TARGET_COUNTS);assert.equal(audit.inventorySha256,EXPECTED_QUIZ_TARGET_INVENTORY_SHA256);assert.equal(audit.optionsSha256,EXPECTED_QUIZ_VISIBILITY_OPTIONS_SHA256);
  const matrix=buildQuizTargetVisibilityMatrix();assert.equal(matrix.length,123);assert.equal(new Set(matrix.map(row=>row.key)).size,123);assert.deepEqual(QUIZ_TARGET_VISIBILITY_VIEWPORTS.at(-1),{id:"phone",label:"phone",width:390,height:768,dpr:1,deviceScaleFactor:1,mobile:true,isMobile:true,touch:true,hasTouch:true,coarse:true,pointer:"coarse"});
  assert.ok(QUIZ_TARGET_VISIBILITY_INVENTORY.every(entry=>entry.options.length===4&&entry.options.includes(entry.target)&&entry.expectedIds.length>0));
  assert.deepEqual(QUIZ_TARGET_VISIBILITY_INVENTORY[0].expectedTransform,{rotation:{x:-8,y:-28,z:0},zoom:1,pan:{x:0,y:0}});assert.deepEqual(QUIZ_TARGET_VISIBILITY_INVENTORY[17].expectedTransform,{rotation:{x:0,y:-90,z:0},zoom:1,pan:{x:0,y:0}});assert.deepEqual(QUIZ_TARGET_VISIBILITY_INVENTORY[23].expectedTransform,{rotation:{x:110,y:2,z:180},zoom:1,pan:{x:0,y:0}});assert.deepEqual(QUIZ_TARGET_VISIBILITY_INVENTORY[29].expectedTransform,{rotation:{x:-42,y:2,z:0},zoom:1,pan:{x:0,y:0}});
  const changedRotation=auditQuizTargetVisibilitySource({source:appSource.replace('lateral:{name:"左外側面",en:"LATERAL",visual:"cortex",rotation:{x:0,y:-90,z:0}','lateral:{name:"左外側面",en:"LATERAL",visual:"cortex",rotation:{x:1,y:-90,z:0}')});assert.equal(changedRotation.ok,false);assert.ok(changedRotation.errors.some(error=>error.includes("options/render hash")));
});

test("unit fixture is external-artifact evidence and is rejected by live mode",()=>{
  const fixture=createValidQuizTargetVisibilityFixture();assert.equal(validateFixture(fixture).passed,true,validateFixture(fixture).errors.join("; "));
  assert.equal(validateQuizTargetVisibilityReport(fixture.report,{rawArtifactLoader:fixture.rawArtifactLoader}).passed,false);
  const flipped=structuredClone(fixture.report);flipped.provenance="live-browser";assert.equal(validateQuizTargetVisibilityReport(flipped,{rawArtifactLoader:fixture.rawArtifactLoader}).passed,false);assert.equal(validateQuizTargetVisibilityFixture(flipped,{rawArtifactLoader:fixture.rawArtifactLoader}).passed,false);
  assert.ok(!JSON.stringify(fixture.report).includes('"rgba"'));
  assert.equal(typeof runQuizTargetVisibilityBrowserAudit,"function");
});

function materializeLiveFixture(){
  const fixture=createValidQuizTargetVisibilityFixture(),workRoot=path.join(process.cwd(),"work");fs.mkdirSync(workRoot,{recursive:true});const auditRoot=fs.mkdtempSync(path.join(workRoot,"quiz-visibility-live-test-"));
  for(const[ref,bytes]of fixture.artifacts){const file=path.join(auditRoot,...ref.split("/"));fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes)}
  const executablePath=path.join(auditRoot,"chrome.exe");fs.writeFileSync(executablePath,new Uint8Array([77,90]));const report=structuredClone(fixture.report);report.provenance="live-browser";report.artifactRoot=describeQuizTargetVisibilityArtifactRoot(auditRoot);report.sourceRootIdentity=describeQuizVisibilitySourceRoot();report.run={runId:"123e4567-e89b-42d3-a456-426614174000",browserSession:{browserTargetId:"browser-target-151",pageTargetId:"page-target-151",pageSessionId:"page-session-151"},browserVersionEvidence:{method:"Browser.getVersion",product:report.environment.browser.product,userAgent:report.environment.browser.userAgent,protocolVersion:report.environment.browser.protocolVersion,jsVersion:"15.1.0",revision:"fixture-revision"},executableEvidence:{source:"launch",path:executablePath}};
  return {report,auditRoot,sourceRoot:fixture.sourceRoot,cleanup:()=>{fs.rmSync(auditRoot,{recursive:true,force:true});fixture.cleanup()}};
}

test("live validator owns filesystem loading and requires run/session/root evidence",()=>{
  const live=materializeLiveFixture(),options={auditRoot:live.auditRoot};try{const baseline=validateQuizTargetVisibilityReport(live.report,options);assert.equal(baseline.passed,false);assert.ok(baseline.errors.some(error=>error.includes("live canvas CSS dimensions")));assert.ok(!baseline.errors.some(error=>error.includes("live CDP run")),baseline.errors.join("; "));
    const badRun=structuredClone(live.report);badRun.run.runId="fixture";const badRunResult=validateQuizTargetVisibilityReport(badRun,options);assert.ok(badRunResult.errors.some(error=>error.includes("live CDP run")));
    const badSession=structuredClone(live.report);badSession.run.browserSession.pageSessionId=badSession.run.browserSession.pageTargetId;assert.ok(validateQuizTargetVisibilityReport(badSession,options).errors.some(error=>error.includes("live CDP run")));
    const badExecutable=structuredClone(live.report);badExecutable.run.executableEvidence.path="chrome.exe";assert.ok(validateQuizTargetVisibilityReport(badExecutable,options).errors.some(error=>error.includes("live CDP run")));
    const badRoot=structuredClone(live.report);badRoot.artifactRoot.realPath=`${badRoot.artifactRoot.realPath}-other`;assert.equal(validateQuizTargetVisibilityReport(badRoot,options).passed,false);
    const badSourceIdentity=structuredClone(live.report);badSourceIdentity.sourceRootIdentity.realPath=live.sourceRoot;assert.ok(validateQuizTargetVisibilityReport(badSourceIdentity,options).errors.some(error=>error.includes("source root identity")));
    assert.equal(validateQuizTargetVisibilityReport(live.report,{auditRoot:live.auditRoot,sourceRoot:live.sourceRoot}).passed,false);
    assert.equal(validateQuizTargetVisibilityReport(live.report,{auditRoot:live.auditRoot,rawArtifactLoader:()=>new Uint8Array()}).passed,false);
    assert.equal(validateQuizTargetVisibilityFixture(live.report,{rawArtifactLoader:()=>new Uint8Array()}).passed,false);
  }finally{live.cleanup()}
});

test("CLI help succeeds and missing required live arguments fail closed",()=>{
  const script=fileURLToPath(scriptPath),help=spawnSync(process.execPath,[script,"--help"],{encoding:"utf8"});assert.equal(help.status,0,help.stderr);assert.match(help.stdout,/--base-url/);
  const run=spawnSync(process.execPath,[script],{encoding:"utf8"});assert.notEqual(run.status,0);assert.match(run.stderr,/--base-url and --output-dir are required/);
});

test("injected coordinator marks bounded fixture evidence non-production and derives failure",async()=>{const fixture=createValidQuizTargetVisibilityFixture(),work=fs.mkdtempSync(path.join(process.cwd(),"work","quiz-visibility-coordinator-")),output=path.join(work,"run"),row=fixture.report.results[17],events=[];const cdp={on(){return()=>{}},async send(method){events.push(method);if(method==="Browser.getVersion")return {product:"HeadlessChrome/151.0.0.0",userAgent:"Mozilla/5.0 HeadlessChrome/151.0.0.0",protocolVersion:"1.3",jsVersion:"15.1",revision:"fixture"};if(method==="Runtime.evaluate")return {result:{value:"complete"}};return {}}};const collect=async({phase,outputRoot})=>{const capture=structuredClone(row.captures[phase]);for(const descriptor of [capture.canvas.artifact,capture.visibility.projectionMask.artifact]){const bytes=fixture.artifacts.get(descriptor.ref),file=path.join(outputRoot,...descriptor.ref.split("/"));fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes)}return capture};try{const report=await runQuizTargetVisibilityBrowserAudit({baseUrl:"http://127.0.0.1:4173/",outputDir:output,targets:[row.identity.target],viewportIds:[row.identity.viewportId],dependencies:{launchChrome:async()=>({cdp,target:{id:"page-target-fixture"},port:41730,executable:process.execPath}),closeChrome:async()=>{},collectCapture:collect}});assert.equal(report.provenance,"smoke-browser");assert.equal(report.status,"smoke-complete");assert.equal(report.results.length,1);assert.equal(report.validation.productionEligible,false);assert.equal(report.validation.passed,false);assert.equal(report.summary.allPassed,false);assert.ok(report.validation.errors.length>0);assert.equal(events.filter(method=>method==="Emulation.setDeviceMetricsOverride").length,2);assert.equal(events.filter(method=>method==="Emulation.setTouchEmulationEnabled").length,2);assert.ok(events.includes("Page.navigate"))}finally{fixture.cleanup();fs.rmSync(work,{recursive:true,force:true})}});

function expectMutation(label,mutate,reason){const fixture=createValidQuizTargetVisibilityFixture();try{mutate(fixture);const validation=validateFixture(fixture);assert.equal(validation.passed,false,`${label} must fail`);if(reason)assert.ok(validation.errors.some(error=>error.includes(reason)),`${label}: ${validation.errors.join("; ")}`)}finally{fixture.cleanup()}}

test("rejects fabricated provenance, matrix, capture identity, URL, viewport, transform, and health",()=>{
  const cases=[
    ["provenance",f=>f.report.provenance="live-browser","provenance"],
    ["missing",f=>f.report.results.pop(),"123"],
    ["duplicate",f=>f.report.results[1].key=f.report.results[0].key,"duplicate"],
    ["unknown",f=>f.report.results[0].identity.target="unknown","identity"],
    ["matrix",f=>f.report.matrix[0].target="unknown","matrix fabricated"],
    ["environment",f=>f.report.environment.browser.product="HeadlessChrome/150.0","environment"],
    ["dependency",f=>f.report.dependency.runtimeReachability.optionsPerQuestion=3,"dependency"],
    ["emulation command",f=>f.report.emulationCommands[2].touch.params.maxTouchPoints=0,"emulation command"],
    ["URL",f=>f.report.results[0].captures.H1.url=f.report.results[0].captures.C.url,"URL/query"],
    ["question",f=>f.report.results[0].captures.H1.question.queueLength=2,"DOM question"],
    ["viewport",f=>f.report.results[0].captures.H1.viewport.observed.innerWidth=390,"viewport"],
    ["desktop touch observation",f=>f.report.results[0].captures.H1.viewport.observed.maxTouchPoints=1,"viewport"],
    ["phone coarse observation",f=>f.report.results.find(row=>row.identity.viewportId==="phone").captures.H1.viewport.observed.coarsePointer=false,"viewport"],
    ["phone desktop screen observation",f=>f.report.results.find(row=>row.identity.viewportId==="phone").captures.H1.viewport.observed.screen={width:800,height:600,availWidth:800,availHeight:600},"viewport"],
    ["rotation",f=>f.report.results[0].captures.H2.transform.rotation.x=5,"rotation/zoom"],
    ["all-phase surface transform",f=>{for(const phase of ["H1","C","H2"])f.report.results[17].captures[phase].transform={rotation:{x:123,y:456,z:789},zoom:5,pan:{x:999,y:-999}}},"runtime quiz default transform"],
    ["all-phase neuro transform",f=>{for(const phase of ["H1","C","H2"])f.report.results[23].captures[phase].transform={rotation:{x:123,y:456,z:789},zoom:5,pan:{x:999,y:-999}}},"runtime quiz default transform"],
    ["mesh depth policy",f=>f.report.results[17].captures.H1.visibility.projectionMask.provenance.projection.cullPolicy="conservative-no-depth","projection mask provenance"],
    ["all-phase section transform",f=>{for(const phase of ["H1","C","H2"])f.report.results[0].captures[phase].transform={rotation:{x:123,y:456,z:789},zoom:5,pan:{x:999,y:-999}}},"runtime quiz default transform"],
    ["loader",f=>f.report.results[0].captures.H1.probe.loadingCount=1,"loader"],
    ["errors",f=>f.report.results[0].captures.H1.probe.consoleErrors.push("boom"),"consoleErrors"],
    ["overflow",f=>f.report.results[0].captures.H1.probe.horizontalOverflow=true,"overflow"],
    ["fallback",f=>f.report.results[0].captures.H1.probe.webglFallback=true,"fallback"],
    ["summary",f=>f.report.summary.passedCount=122,"summary fabricated"],
  ];for(const [label,mutate,reason]of cases)expectMutation(label,mutate,reason);
});

test("accepts Chrome 151 product with HeadlessChrome 151 user agent and rejects old major",()=>{const fixture=createValidQuizTargetVisibilityFixture();try{fixture.report.environment.browser.product="Chrome/151.0.7922.170";assert.equal(validateFixture(fixture).passed,true);fixture.report.environment.browser.product="Chrome/150.0.0.0";const result=validateFixture(fixture);assert.equal(result.passed,false);assert.ok(result.errors.some(error=>error.includes("environment")))}finally{fixture.cleanup()}});

test("a persisted validation remains independently re-readable and stale validation is rejected",()=>{const fixture=createValidQuizTargetVisibilityFixture();try{fixture.report.validation=validateFixture(fixture);assert.equal(validateFixture(fixture).passed,true);fixture.report.validation.summary.passedCount=0;const result=validateFixture(fixture);assert.equal(result.passed,false);assert.ok(result.errors.some(error=>error.includes("persisted validation")))}finally{fixture.cleanup()}});

test("app and independent validator use depth, shader alpha, and identical conservative dilation",()=>{
  for(const [label,source] of [["app",atlasSource],["validator",runnerSource]]){
    assert.match(source,/depth\[index\]/,`${label} must resolve visible fragments with depth`);
    assert.match(source,/for\(let dy=-1;dy<=1;dy\+\+\)for\(let dx=-1;dx<=1;dx\+\+\)/,`${label} must apply exactly one conservative pixel of dilation`);
  }
  assert.match(atlasSource,/visible-highlight-depth-v3/);
  assert.match(runnerSource,/visible-highlight-depth-v3/);
  assert.match(runnerSource,/stableMeshInterior\(mask,width,height\)/);
  assert.match(runnerSource,/meshVisibilityCoverage\(loaded\.H1\.core,loaded\.H1\.mask/);
  assert.match(atlasSource,/if\(highlightAlpha>\.5\)mask\[index\]=1;else if\(namespace==="surface"\)mask\[index\]=0/);
  assert.match(runnerSource,/compositeProjectionSelection\(mask\[index\],highlightAlpha/);
});

test("semi-transparent neurovascular draw order preserves an earlier selected contribution",()=>{
  assert.equal(compositeProjectionSelection(0,.75,"neurovascular"),1);
  assert.equal(compositeProjectionSelection(1,0,"neurovascular"),1,"a later translucent unselected fragment must not erase blended selected colour");
  assert.equal(compositeProjectionSelection(1,0,"surface"),0,"an opaque surface fragment replaces the earlier contribution");
  assert.throws(()=>compositeProjectionSelection(0,.75,"unknown"));
  assert.throws(()=>compositeProjectionSelection(2,.75,"neurovascular"));
});

test("section projection follows the integer client box rather than a fractional DOM rect",()=>{const fixture=createValidQuizTargetVisibilityFixture();try{for(const phase of ["H1","C","H2"])fixture.report.results[0].captures[phase].canvas.cssRect.width=64.203125;assert.equal(validateFixture(fixture).passed,true)}finally{fixture.cleanup()}});

test("rejects artifact SHA/H mismatch, CSS geometry, intrinsic scaling, and raw byte length",()=>{
  const cases=[
    ["SHA",f=>f.report.results[0].captures.H1.canvas.artifact.sha256="0".repeat(64),"artifact SHA"],
    ["wrong artifact path",f=>f.report.results[0].captures.H1.canvas.artifact.ref="artifacts/wrong.rgba","artifact ref"],
    ["duplicate artifact path",f=>f.report.results[1].captures.H1.canvas.artifact.ref=f.report.results[0].captures.H1.canvas.artifact.ref,"globally unique"],
    ["H mismatch",f=>{const row=f.report.results[0],ref=row.captures.H2.canvas.artifact.ref,bytes=f.artifacts.get(ref).slice();bytes[0]++;f.artifacts.set(ref,bytes);row.captures.H2.canvas.artifact.sha256=sha256Bytes(bytes)},"H1/H2"],
    ["negative rect",f=>f.report.results[0].captures.H1.canvas.cssRect.width=0,"CSS rect"],
    ["wrong selector",f=>f.report.results[0].captures.H1.canvas.selector="canvas","selector/count"],
    ["duplicate canvas",f=>f.report.results[0].captures.H1.canvas.canvasCount=2,"selector/count"],
    ["outside rect",f=>f.report.results[0].captures.H1.canvas.cssRect.x=1365,"inside viewport"],
    ["intrinsic",f=>f.report.results[0].captures.H1.canvas.intrinsicWidth=7,"intrinsic canvas"],
    ["raw length",f=>{const d=f.report.results[0].captures.H1.canvas.artifact,b=f.artifacts.get(d.ref).slice(0,-4);f.artifacts.set(d.ref,b);d.byteLength=b.length;d.sha256=sha256Bytes(b)},"raw RGBA length"],
  ];for(const [label,mutate,reason]of cases)expectMutation(label,mutate,reason);
});

function replaceHighlight(fixture,pixels,rgb){
  const row=fixture.report.results[0],width=row.captures.H1.canvas.intrinsicWidth,height=row.captures.H1.canvas.intrinsicHeight,control=fixture.artifacts.get(row.captures.C.canvas.artifact.ref);
  for(const phase of ["H1","H2"]){const capture=row.captures[phase],bytes=control.slice();for(const[x,y]of pixels){const o=(y*width+x)*4;bytes[o]=rgb[0];bytes[o+1]=rgb[1];bytes[o+2]=rgb[2]}fixture.artifacts.set(capture.canvas.artifact.ref,bytes);capture.canvas.artifact.sha256=sha256Bytes(bytes);capture.canvas.artifact.byteLength=bytes.length}
  const h1=fixture.artifacts.get(row.captures.H1.canvas.artifact.ref),h2=fixture.artifacts.get(row.captures.H2.canvas.artifact.ref);row.comparisons.h1VsControl=diffRgbaBuffers(h1,control,{width,height});row.comparisons.controlVsH2=diffRgbaBuffers(control,h2,{width,height});
}

test("recomputes and rejects low area, 8-component, bbox, colour, and fabricated metrics",()=>{
  const cases=[
    ["area",Array.from({length:15},(_,i)=>[i%5+1,Math.floor(i/5)+1]),[120,180,90],"changed area"],
    ["component",[[0,0],[2,0],[4,0],[6,0],[1,2],[3,2],[5,2],[7,2],[0,4],[2,4],[4,4],[6,4],[1,6],[3,6],[5,6],[7,6]],[120,180,90],"largest component"],
    ["bbox",Array.from({length:16},(_,i)=>[i%8,Math.floor(i/8)]),[120,180,90],"bbox below"],
    ["colour",Array.from({length:16},(_,i)=>[i%4+2,Math.floor(i/4)+2]),[42,18,18],"median RGB"],
  ];for(const [label,pixels,rgb,reason]of cases)expectMutation(label,f=>replaceHighlight(f,pixels,rgb),reason);
  expectMutation("fabricated metrics",f=>f.report.results[0].comparisons.h1VsControl.changedArea=999,"fabricated diff");
});

test("section mask coverage and format-specific mesh namespaces/IDs are independently checked",()=>{
  expectMutation("mask target IDs",f=>f.report.results[0].captures.H1.visibility.targetIds=[999],"section namespace/IDs");
  expectMutation("mask provenance",f=>f.report.results[0].captures.H1.visibility.provenance.labelAsset.sha256="0".repeat(64),"provenance");
  expectMutation("mask ref",f=>f.report.results[0].captures.H1.visibility.mask.artifact.ref="masks/wrong.bin","mask artifact ref");
  expectMutation("mask summary",f=>f.report.results[0].captures.H1.visibility.mask.positiveCount=99,"mask positive");
  expectMutation("coverage",f=>f.report.results[0].comparisons.sectionCoverage.changedOutside=99,"coverage/outside"),
  expectMutation("surface namespace",f=>f.report.results[17].captures.H1.visibility.namespace="neurovascular","mesh namespace");
  expectMutation("surface IDs",f=>f.report.results[17].captures.H1.visibility.selectedIds=[999],"mesh IDs");
  expectMutation("neurovascular layer",f=>f.report.results[23].captures.H1.visibility.activeLayer="surfaceHighlights","mesh namespace/layer");
  expectMutation("control mesh",f=>f.report.results[23].captures.C.visibility.selectedVertexCount=1,"control mesh");
  expectMutation("mesh projection source",f=>f.report.results[17].captures.H1.visibility.projectionMask.provenance.sourceMeshes[0].sha256="0".repeat(64),"projection mask provenance");
  expectMutation("mesh projection summary",f=>f.report.results[17].captures.H1.visibility.projectionMask.positiveCount=99,"projection mask bytes/summary");
  expectMutation("mesh coverage",f=>f.report.results[17].comparisons.meshCoverage.changedOutside=1,"projection coverage/outside");
});

test("rejects a whole-canvas mesh tint even when SHA and raw diff metrics are recomputed",()=>{
  expectMutation("global mesh tint",fixture=>{const row=fixture.report.results[17],control=fixture.artifacts.get(row.captures.C.canvas.artifact.ref),width=row.captures.C.canvas.intrinsicWidth,height=row.captures.C.canvas.intrinsicHeight;for(const phase of ["H1","H2"]){const capture=row.captures[phase],bytes=control.slice();for(let pixel=0;pixel<width*height;pixel++){const offset=pixel*4;bytes[offset]=180;bytes[offset+1]=32;bytes[offset+2]=32}fixture.artifacts.set(capture.canvas.artifact.ref,bytes);capture.canvas.artifact.sha256=sha256Bytes(bytes)}const h1=fixture.artifacts.get(row.captures.H1.canvas.artifact.ref),h2=fixture.artifacts.get(row.captures.H2.canvas.artifact.ref);row.comparisons.h1VsControl=diffRgbaBuffers(h1,control,{width,height});row.comparisons.controlVsH2=diffRgbaBuffers(control,h2,{width,height});row.comparisons.meshCoverage={maskPositive:16,changedInside:16,changedOutside:48,coverageRatio:1,outsideRatio:.75}} ,"projection coverage/outside");
});

test("rejects coordinated all-ones mesh mask and whole-canvas tint by rebuilding BNM3 projection",()=>{
  expectMutation("coordinated mesh forgery",fixture=>{const row=fixture.report.results[17],width=row.captures.C.canvas.intrinsicWidth,height=row.captures.C.canvas.intrinsicHeight,control=fixture.artifacts.get(row.captures.C.canvas.artifact.ref),mask=new Uint8Array(width*height).fill(1),maskRef=row.captures.H1.visibility.projectionMask.artifact.ref;fixture.artifacts.set(maskRef,mask);for(const phase of ["H1","C","H2"]){const projection=row.captures[phase].visibility.projectionMask;projection.artifact.sha256=sha256Bytes(mask);projection.artifact.byteLength=mask.length;projection.positiveCount=mask.length;projection.bbox={x:0,y:0,width,height}}for(const phase of ["H1","H2"]){const capture=row.captures[phase],bytes=control.slice();for(let pixel=0;pixel<width*height;pixel++){const offset=pixel*4;bytes[offset]=180;bytes[offset+1]=32;bytes[offset+2]=32}fixture.artifacts.set(capture.canvas.artifact.ref,bytes);capture.canvas.artifact.sha256=sha256Bytes(bytes)}const h1=fixture.artifacts.get(row.captures.H1.canvas.artifact.ref),h2=fixture.artifacts.get(row.captures.H2.canvas.artifact.ref);row.comparisons.h1VsControl=diffRgbaBuffers(h1,control,{width,height});row.comparisons.controlVsH2=diffRgbaBuffers(control,h2,{width,height});row.comparisons.meshCoverage={maskPositive:mask.length,changedInside:mask.length,changedOutside:0,coverageRatio:1,outsideRatio:0}},"independently rebuilt BNM3 projection");
});

test("requires the exact independently rebuilt one-pixel conservative dilation",()=>{expectMutation("missing dilated pixel",fixture=>{const row=fixture.report.results[17],ref=row.captures.H1.visibility.projectionMask.artifact.ref,mask=fixture.artifacts.get(ref).slice(),index=mask.findIndex(value=>value===1);mask[index]=0;fixture.artifacts.set(ref,mask);for(const phase of ["H1","C","H2"]){const projection=row.captures[phase].visibility.projectionMask,stats={positiveCount:projection.positiveCount-1,bbox:projection.bbox};projection.artifact.sha256=sha256Bytes(mask);projection.artifact.byteLength=mask.length;projection.positiveCount=stats.positiveCount;projection.bbox=stats.bbox}},"independently rebuilt BNM3 projection")});

test("rejects a diff-derived section mask even when its coverage summary is self-consistent",()=>{
  expectMutation("diff-derived mask",fixture=>{const pixels=Array.from({length:16},(_,i)=>[i%4,Math.floor(i/4)]);replaceHighlight(fixture,pixels,[120,180,90]);const row=fixture.report.results[0],mask=new Uint8Array(64);for(const[x,y]of pixels)mask[y*8+x]=1;const ref=row.captures.H1.visibility.mask.artifact.ref;fixture.artifacts.set(ref,mask);for(const phase of ["H1","C","H2"]){const evidence=row.captures[phase].visibility.mask;evidence.artifact.sha256=sha256Bytes(mask);evidence.artifact.byteLength=mask.length;evidence.positiveCount=16;evidence.bbox={x:0,y:0,width:4,height:4}}row.comparisons.sectionCoverage={maskPositive:16,changedInside:16,changedOutside:0,coverageRatio:1,outsideRatio:0}},"independently rebuilt");
});

test("source hooks stay loopback opt-in, format-aware, and retain visible zoom glyphs",()=>{
  const atlas=fs.readFileSync(new URL("app/AtlasVolumeCanvas.tsx",root),"utf8");assert.match(appSource,/host!=="127\.0\.0\.1"&&host!=="localhost"&&host!=="::1"/);assert.match(appSource,/params\.get\("quizVisibilityAudit"\)!=="1"/);assert.match(appSource,/allQuizQuestions\.find\(question=>question\.target===target\)/);
  assert.match(atlas,/meshHighlightEvidence\(meshes\?\.surface\.slice\(0,2\)\?\?null,surfaceHighlights\)/);assert.match(atlas,/neurovascularOverlay==="vessels"\?meshes\.overlays\.slice\(0,2\)/);assert.match(atlas,/neurovascularOverlay==="nerves"\?meshes\.overlays\.slice\(2,5\)/);assert.match(atlas,/meshHighlightEvidence\(neurovascularEvidenceMeshes,neurovascularHighlights\)/);assert.match(atlas,/selectedTriangleProjection\(sourceMeshes,quizVisibilityExpectedHighlights/);assert.match(atlas,/__quizVisibilityProjectionMask/);assert.match(atlas,/for\(let dy=-1;dy<=1;dy\+\+\)/);assert.match(fs.readFileSync(scriptPath,"utf8"),/for\(let dy=-1;dy<=1;dy\+\+\)/);assert.match(atlas,/crypto\.subtle\.digest\("SHA-256",buffer\)/);assert.match(appSource,/quizVisibilityExpectedHighlights=\{quizVisibilityExpectedHighlights\}/);assert.match(atlas,/data-atlas-surface-selected-vertex-count/);assert.match(atlas,/data-atlas-neurovascular-selected-vertex-count/);assert.match(atlas,/aria-label="縮小">−<\/button>/);assert.match(atlas,/aria-label="拡大">＋<\/button>/);
});

test("section quiz uses a fixed high-contrast accent while ordinary section colours remain data-driven",()=>{
  const atlas=fs.readFileSync(new URL("app/AtlasVolumeCanvas.tsx",root),"utf8");
  assert.match(atlas,/QUIZ_SECTION_ACCENT_RGB:\[number,number,number\]=\[238,88,82\]/);
  assert.match(atlas,/appliedHighlightColor=highlightColor&&\(sectionHighlightMode==="quiz"\?QUIZ_SECTION_ACCENT_RGB:highlightColor\)/);
  assert.match(atlas,/cavityLabel&&appliedHighlightColor/);
  assert.match(appSource,/mode:"quiz"/);
  assert.match(appSource,/QUIZ_SECTION_ACCENT_HEX/);
});
