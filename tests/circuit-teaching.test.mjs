import assert from "node:assert/strict";
import test from "node:test";
import {CIRCUIT_TEACHING,CIRCUIT_KEYS,circuitText} from "../src/circuitTeaching.mjs";

test("three circuit guides contain the complete bilingual teaching contract",()=>{
  assert.deepEqual(CIRCUIT_KEYS,["papez","visual","basal-ganglia"]);
  for(const circuit of Object.values(CIRCUIT_TEACHING)){
    assert.ok(circuit.goal.ja&&circuit.goal.en);
    assert.ok(circuit.role.ja&&circuit.role.en);
    assert.ok(circuit.paths.length>0);
    assert.ok(circuit.nodes.length>=5);
    assert.ok(circuit.sources.every(source=>source.url.startsWith("https://")));
    for(const node of circuit.nodes)for(const field of [node.label,node.detail,node.specimen,node.limitation])assert.ok(field.ja&&field.en);
    const keys=new Set(circuit.nodes.map(node=>node.key));
    for(const path of circuit.paths)for(const key of path.nodes)assert.ok(keys.has(key),`${circuit.key}: missing ${key}`);
  }
});

test("teaching data keeps information flow separate from specimen observation",()=>{
  const papez=CIRCUIT_TEACHING.papez;
  assert.equal(papez.nodes.find(node=>node.key==="mammillothalamic").observationIndex,null);
  assert.match(papez.nodes.find(node=>node.key==="anterior-thalamus").limitation.ja,/前部核そのものは未分節/);
  assert.match(CIRCUIT_TEACHING.visual.nodes.find(node=>node.key==="optic-chiasm").detail.ja,/鼻側網膜.*交叉.*耳側網膜.*同側/);
  assert.match(CIRCUIT_TEACHING["basal-ganglia"].displayLimit.ja,/興奮性.*抑制性/);
  assert.deepEqual(CIRCUIT_TEACHING["basal-ganglia"].paths.map(path=>path.signs),[["+","−","−","+"],["+","−","−","+","−","+"],["+","+","−","+"]]);
});

test("bilingual selector returns the requested edition",()=>{
  assert.equal(circuitText({ja:"役割",en:"Role"}),"役割");
  assert.equal(circuitText({ja:"役割",en:"Role"},true),"Role");
});
