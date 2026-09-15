import assert from "node:assert/strict";
import {mkdtemp,readFile,rm,writeFile} from "node:fs/promises";
import {spawnSync} from "node:child_process";
import {createHash} from "node:crypto";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {gunzipSync} from "node:zlib";
import test from "node:test";
import {LEARNER_PROVENANCE_MAPPINGS} from "../src/learnerProvenance.mjs";

const root=new URL("../",import.meta.url);
const read=path=>readFile(new URL(path,root),"utf8");
const local=path=>fileURLToPath(new URL(path,root));
function python(){
 const bundled=process.platform==="win32"&&process.env.USERPROFILE?join(process.env.USERPROFILE,".cache","codex-runtimes","codex-primary-runtime","dependencies","python","python.exe"):null;
 for(const command of [process.env.PYTHON,bundled,"python3","python"].filter(Boolean))if(spawnSync(command,["--version"]).status===0)return command;
 throw new Error("Python 3 is required");
}

test("browser patch metadata and the independent validator accept an ID43 edit",async()=>{
 const labelsFile=await readFile(new URL("public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz",root));
 const payload=gunzipSync(labelsFile),labels=new Uint8Array(payload.subarray(10));
 const index=labels.findIndex(value=>value===0),helper=await import(new URL("app/segmentationPatchMetadata.ts",root));
 const patch=helper.buildSegmentationPatch({edits:new Map([[index,43]]),labels,dims:[394,466,378],sourceLabelsSha256:createHash("sha256").update(labelsFile).digest("hex"),createdAt:"2026-09-16T00:00:00.000Z",authorNote:"ID43 behavior",authorGitHub:"",targetSide:"midline",evidence:"fixture",confidence:"medium"});
 assert.deepEqual(patch.targetStructures,[{id:43,name:"透明中隔（部分）"}]);assert.deepEqual(patch.changeSummary.transitions,[{from:0,to:43,voxels:1}]);
 const dir=await mkdtemp(join(tmpdir(),"septum-patch-"));
 try{const path=join(dir,"patch.json");await writeFile(path,JSON.stringify(patch));const result=spawnSync(python(),[local("scripts/apply_segmentation_patch.py"),path,"--input",local("public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz"),"--check"],{encoding:"utf8"});assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(result.stdout).changedVoxelCount,1)}finally{await rm(dir,{recursive:true,force:true})}
});

test("partial septum provenance is independently reviewed, section-only, and quiz-ineligible",async()=>{
 const registry=JSON.parse(await read("public/atlas/structure-provenance.json"));
 const entry=registry.entries.find(row=>row.key==="section-septum-pellucidum-partial");
 assert.ok(entry);assert.equal(entry.appLabel,"透明中隔（部分）");
 assert.deepEqual(entry.representations,["image-guided-reviewed"]);assert.deepEqual(entry.learnerSurfaces,["sections"]);
 assert.equal(entry.expertReview,"pending");assert.equal(entry.projectReview,"reviewed-by-project");assert.equal(entry.quizEligibility,"none");
 assert.deepEqual(entry.appKeys,["septumPellucidumPartial"]);
 const mapping=LEARNER_PROVENANCE_MAPPINGS.find(row=>row.target==="sections:structure:septumPellucidumPartial");
 assert.deepEqual(mapping.entryKeys,["section-septum-pellucidum-partial"]);
});
