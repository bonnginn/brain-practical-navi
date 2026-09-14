import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page=fs.readFileSync(new URL("../app/page.tsx",import.meta.url),"utf8");
const catalog=JSON.parse(fs.readFileSync(new URL("../app/english-catalog.json",import.meta.url),"utf8"));

test("section summary reuses the detailed role copy for its active focus",()=>{
  const functionBlock=page.match(/const structureFunctions:Record<StructureKey,string>=\{([\s\S]*?)\n\};/)?.[1];
  assert.ok(functionBlock,"structure function copy must remain available");
  const roles=[...functionBlock.matchAll(/^\s+\w+:"([^"]+)",?$/gm)].map(match=>match[1]);
  assert.ok(roles.length>=20,"all section structures need role copy");
  for(const role of roles)assert.ok(catalog[role],`English role copy is missing: ${role}`);
  assert.match(page,/selectedSummaryKey:StructureKey\|undefined=activeVisibleStructures\.includes\(selectedStructure\)\?selectedStructure:activeVisibleStructures\[0\]/);
  assert.match(page,/selectedSummary&&selectedSummaryKey\?<><b className="selectedStructureTarget">[\s\S]*structureFunctions\[selectedSummaryKey\]/);
  assert.match(page,/<h3>主な役割<\/h3><p>\{structureFunctions\[selectedStructure\]\}<\/p>/);
});

test("section summary clears stale anatomy when no structure is visible",()=>{
  assert.match(page,/selectedSummary\?\{background:selectedSummary\.color\}:undefined/);
  assert.match(page,/selectedSummary&&selectedSummaryKey\?[\s\S]*:<b>構造を選択してください<\/b>/);
  assert.match(page,/disabled=\{!selectedSummary\}>詳細解説<\/button>/);
  assert.equal(catalog["現在の対象"],"Current focus");
});
