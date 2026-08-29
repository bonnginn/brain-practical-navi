import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { anatomyDisplayEnglish, translatedLatinAnatomyTerms } from "../src/anatomyDisplayEnglish.mjs";

const page = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

const latinPrefixes = /^(?:Aqueductus|Areae|Bulbus|Capsula|Chiasma|Colliculi|Cornu|Corpora|Corpus amygdaloideum|Cortex|Fissura|Fossa|Gyri|Gyrus|Lobulus|Mesencephalon|N\. opticus|Nuclei|Nucleus (?:caudatus|ruber|subthalamicus)|Olivae|Pars|Peduncul|Plexus|Pyramides|Radiatio|Substantia perforata|Sulcus|Trigona|Truncus|Ventricul)/;

test("all Latin anatomy labels in the learner data have an English display value", () => {
  const values = [...page.matchAll(/latin:"([^"]+)"/g)].map((match) => match[1]);
  const latinValues = [...new Set(values.filter((value) => latinPrefixes.test(value)))];

  assert.ok(latinValues.length >= 60, "expected the complete Latin label inventory");
  assert.deepEqual(
    latinValues.filter((value) => anatomyDisplayEnglish(value) === value),
    [],
    "a Latin learner label is missing from the English display map",
  );
  assert.deepEqual(
    translatedLatinAnatomyTerms.filter((value) => !values.includes(value)),
    [],
    "the display map contains a stale source label",
  );
});

test("the display map translates representative anatomy groups and preserves English", () => {
  assert.equal(anatomyDisplayEnglish("Gyrus precentralis"), "Precentral gyrus");
  assert.equal(anatomyDisplayEnglish("Nucleus subthalamicus"), "Subthalamic nucleus");
  assert.equal(anatomyDisplayEnglish("Ventriculus quartus"), "Fourth ventricle");
  assert.equal(anatomyDisplayEnglish("Pedunculus cerebellaris medius"), "Middle cerebellar peduncle");
  assert.equal(anatomyDisplayEnglish("Abducens nerve"), "Abducens nerve");
});

test("learner-visible Latin fields pass through the English display helper", () => {
  const displayCalls = page.match(/anatomyDisplayEnglish\([^)]*\.latin\)/g) ?? [];
  assert.ok(displayCalls.length >= 10, "expected all learner-visible label sites");
  assert.doesNotMatch(page, /<(?:small|span|em)>\{[^{}]*\.latin\}<\/(?:small|span|em)>/);
  assert.doesNotMatch(page, /— \{item\.latin\}/);
  assert.match(page, /matchesJapaneseSearch\(normalizedFreeSearch,\[item\.name,item\.latin,/);
});
