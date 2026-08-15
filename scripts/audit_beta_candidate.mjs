import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const audits=[
  ["assets","scripts/audit_asset_budgets.mjs"],
  ["sections","scripts/audit_section_continuity.mjs"],
  ["deep relations","scripts/audit_deep_relations.mjs"],
  ["provenance","scripts/audit_structure_provenance.mjs"],
  ["landmarks","scripts/audit_specimen_relations.mjs"],
  ["basal and neurovascular","scripts/audit_basal_neurovascular_relations.mjs"],
  ["surface","scripts/audit_surface_relations.mjs"],
  ["model comparison","scripts/audit_model_comparison.mjs"],
  ["expert review targets","scripts/audit_expert_review_targets.mjs"],
  ["quiz review ledger","scripts/audit_quiz_review_ledger.mjs"],
  ["PWA offline","scripts/audit_pwa.mjs"],
];

for(const [label,script] of audits){
  const result=spawnSync(process.execPath,[resolve(root,script)],{cwd:root,encoding:"utf8"});
  if(result.status!==0){
    console.error(`FAIL\t${label}`);
    if(result.stdout)console.error(result.stdout.trim());
    if(result.stderr)console.error(result.stderr.trim());
    process.exit(1);
  }
  const finalPass=result.stdout.trim().split(/\r?\n/).filter(line=>line.startsWith("PASS\t")).at(-1)?.slice(5)??"completed";
  console.log(`PASS\t${label}: ${finalPass}`);
}

const gate=readFileSync(resolve(root,"BETA_GATE_AUDIT.md"),"utf8");
const rows=gate.split(/\r?\n/).map(line=>line.match(/^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*(ローカル合格|実機待ち|公開待ち|管理者待ち|専門家待ち)\s*\|/)).filter(Boolean).map(match=>({id:Number(match[1]),condition:match[2].trim(),status:match[3]}));
if(rows.length!==10||new Set(rows.map(row=>row.id)).size!==10){console.error(`FAIL\tBETA_GATE_AUDIT.md must contain 10 unique gate rows; found ${rows.length}`);process.exit(1)}
const local=rows.filter(row=>row.status==="ローカル合格"),waiting=rows.filter(row=>row.status!=="ローカル合格");
for(const row of local)console.log(`GATE\t${row.id}\tLOCAL PASS\t${row.condition}`);
for(const row of waiting)console.log(`GATE\t${row.id}\tWAIT ${row.status}\t${row.condition}`);
if(!/No-Go（β候補のローカル検証中）/.test(gate)){console.error("FAIL\tgate conclusion must remain No-Go before external evidence is complete");process.exit(1)}
console.log(`SUMMARY\t${local.length} local gates passed; ${waiting.length} external-evidence gates remain`);
console.log("PASS\tbeta-candidate local audits complete; release remains No-Go");
