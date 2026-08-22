import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  EXPECTED_NEUROVASCULAR_QUIZ_SHA256,
  PILOT_ARTERY_TARGETS,
  PILOT_NERVE_TARGETS,
  PILOT_TARGETS,
  auditNeurovascularQuiz,
  parseNeurovascularQuizInventory,
} from "../scripts/audit_neurovascular_quiz.mjs";

const root = new URL("..", import.meta.url);
const [page, css, canvas] = await Promise.all([
  readFile(new URL("app/page.tsx", root), "utf8"),
  readFile(new URL("app/canvas.css", root), "utf8"),
  readFile(new URL("app/AtlasVolumeCanvas.tsx", root), "utf8"),
]);

test("neurovascular pilot has a separate frozen 17-question inventory", () => {
  const report = auditNeurovascularQuiz();
  assert.equal(report.ok, true, report.errors.join("\n"));
  assert.equal(report.contentSha256, EXPECTED_NEUROVASCULAR_QUIZ_SHA256);
  assert.deepEqual(report.summary, {
    questionCount: 17,
    arteryCount: 6,
    nerveCount: 11,
    uniqueTargetCount: 17,
    overlayRegionCount: 45,
    bnm3FileCount: 5,
    oldSectionId33Excluded: true,
  });
  assert.deepEqual(parseNeurovascularQuizInventory(page).map(question => question.target), PILOT_TARGETS);
});

test("pilot target/options stay in the overlay namespace and distinguish valid overlay ID 33", () => {
  const report = auditNeurovascularQuiz();
  assert.equal(report.ok, true, report.errors.join("\n"));
  assert.match(page, /cn6[^\n]*ids:\[32,33\]/);
  const pilotBlock = page.match(/const neurovascularQuizQuestions:NeurovascularQuizQuestion\[\]=\[[\s\S]*?\n\];/)?.[0] ?? "";
  assert.doesNotMatch(pilotBlock, /cn2|opticChiasm|acomm|pcomm|cerebellarArteries/);
  assert.doesNotMatch(pilotBlock, /(?:target|options):[^\n]*33/);
});

test("candidate counts and provisional gating are fixed for each pilot detail", () => {
  const report = auditNeurovascularQuiz();
  assert.equal(report.ok, true, report.errors.join("\n"));
  assert.equal(report.summary.arteryCount, PILOT_ARTERY_TARGETS.length);
  assert.equal(report.summary.nerveCount, PILOT_NERVE_TARGETS.length);
  assert.match(page, /quizIncludeProvisional,setQuizIncludeProvisional\]=useState\(true\)/);
  assert.match(page, /const allQuizQuestions:QuizQuestion\[\]=\[\.\.\.quizQuestions,\.\.\.neurovascularQuizQuestions\]/);
  assert.match(page, /function isProvisionalQuiz\(question:QuizQuestion\)\{return isNeurovascularQuiz\(question\)/);
});

test("pilot uses lazy relevant overlays, white target highlights, and review links", () => {
  assert.match(canvas, /loadOptional\(wantVessels,"overlay-arteries-anterior"\)/);
  assert.match(canvas, /loadOptional\(wantVessels,"overlay-arteries-posterior"\)/);
  assert.match(canvas, /loadOptional\(wantNerves,"overlay-nerves-anterior"\)/);
  assert.match(canvas, /loadOptional\(wantNerves,"overlay-nerves-pontine"\)/);
  assert.match(canvas, /loadOptional\(wantNerves,"overlay-nerves-medullary"\)/);
  assert.match(page, /neurovascularHighlights=\{neurovascularQuiz\?quizNeurovascularHighlight:\[\]\}/);
  assert.match(page, /quizNeurovascularHighlight=useMemo<HighlightLayer\[\]>\(\(\)=>neurovascularQuiz\?\[\{ids:neurovascularQuizTarget\.ids,color:\[255,255,255\]\}/);
  assert.match(page, /白色で強調された構造は？/);
  assert.match(page, /view=\{neurovascularQuiz\?"ghost":"inside"\}/);
  assert.match(page, /showCerebellum=\{neurovascularQuiz\?false:quizQuestion\.view!=="medial"\}/);
  assert.match(page, /setSelectedNeurovascularStructure\(question\.target\)/);
  assert.match(page, /chooseSurface\(question\.view,"replace"\)/);
  assert.doesNotMatch(page, /isNeurovascularQuiz\(question\)[\s\S]{0,500}setSurfaceGhost\(false\)/);
  assert.match(page, /復習問題の模式3D神経血管モデル/);
});

test("pilot controls preserve 44px touch targets and narrow-flow behavior", () => {
  assert.match(css, /\.quizSetup select \{[^}]*min-height: 44px/);
  assert.match(css, /\.quizOptions button \{[^}]*min-height: 58px/);
  assert.match(css, /\.neurovascularPicker button \{[^}]*min-height: 44px/);
  assert.match(css, /@media\(max-width:760px\)[\s\S]*\.quizCountButtons button\{min-height:44px\}/);
  assert.match(css, /@media\(max-width:1320px\)[\s\S]*\.neurovascularPicker>div\{grid-template-columns:1fr\}/);
});

test("overlay audit rejects a changed pilot inventory hash", () => {
  const changed = page.replace('{target:"ica",category:"neurovascular"', '{target:"cn2",category:"neurovascular"');
  const report = auditNeurovascularQuiz({ source: changed });
  assert.equal(report.ok, false);
  assert.match(report.errors.join("\n"), /forbidden target is present|unexpected pilot target|inventory hash changed/);
});
