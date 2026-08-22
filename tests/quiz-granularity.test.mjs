import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { auditQuizGranularity, auditQuizGranularitySource, EXPECTED_QUIZ_CONTENT_SHA256, parseQuizGranularity } from "../scripts/audit_quiz_granularity.mjs";
import {
  countQuizChoice,
  detailOptionsForFormat,
  filtersForQuizChoice,
  filterQuizCandidates,
  validateQuizGranularity,
} from "../src/quizGranularity.mjs";

const root = new URL("..", import.meta.url);
const page = await readFile(new URL("app/page.tsx", root), "utf8");
const css = await readFile(new URL("app/canvas.css", root), "utf8");
const questions = parseQuizGranularity(page);
const baseFilters = { category: "all", format: "all", detail: "all", includeProvisional: true, wrongOnly: false };

test("quiz granularity audit classifies all 23 unchanged targets", () => {
  const result = auditQuizGranularity();
  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.equal(result.contentSha256, EXPECTED_QUIZ_CONTENT_SHA256);
  assert.deepEqual(result.summary, {
    questionCount: 23,
    uniqueTargetCount: 23,
    sectionCount: 17,
    surfaceCount: 6,
    standardCount: 11,
    provisionalCount: 12,
    formatCounts: { section: 17, surface: 6 },
  });
  assert.equal(questions.some(question => question.target === "opticChiasm"), false);
});

test("format and detail filters combine without crossing teaching formats", () => {
  assert.equal(filterQuizCandidates(questions, { ...baseFilters, format: "section" }, []).length, 17);
  assert.equal(filterQuizCandidates(questions, { ...baseFilters, format: "surface" }, []).length, 6);
  assert.equal(filterQuizCandidates(questions, { ...baseFilters, format: "section", detail: "sagittal" }, []).length, 1);
  assert.equal(filterQuizCandidates(questions, { ...baseFilters, format: "surface", detail: "medial" }, []).length, 2);
  assert.equal(filterQuizCandidates(questions, { ...baseFilters, format: "section", detail: "lateral" }, []).length, 0);
  assert.equal(filterQuizCandidates(questions, { ...baseFilters, category: "surface", format: "section" }, []).length, 0);
  assert.deepEqual(detailOptionsForFormat("section"), ["coronal", "horizontal", "sagittal"]);
  assert.deepEqual(detailOptionsForFormat("surface"), ["lateral", "superior", "inferior", "medial"]);
  assert.deepEqual(detailOptionsForFormat("neurovascular"), ["arteries", "cranialNerves"]);
  assert.equal(filterQuizCandidates(questions, { ...baseFilters, format: "neurovascular" }, []).length, 0);
});

test("topic, origin, and wrong-only filters affect the same candidate count", () => {
  assert.equal(countQuizChoice(questions, baseFilters, [], "category", "basal"), 4);
  assert.equal(countQuizChoice(questions, { ...baseFilters, includeProvisional: false }, [], "format", "surface"), 0);
  const sectionSagittal = { ...baseFilters, format: "section", detail: "sagittal" };
  assert.equal(countQuizChoice(questions, sectionSagittal, [], "format", "section"), 1);
  assert.equal(countQuizChoice(questions, sectionSagittal, [], "format", "surface"), 6);
  assert.deepEqual(filtersForQuizChoice(sectionSagittal, "format", "surface"), { ...baseFilters, format: "surface", detail: "all" });
  assert.equal(filterQuizCandidates(questions, { ...baseFilters, includeProvisional: false }, []).length, 11);
  assert.equal(filterQuizCandidates(questions, { ...baseFilters, wrongOnly: true }, ["mammillaryBody"]).length, 1);
  assert.equal(filterQuizCandidates(questions, { ...baseFilters, wrongOnly: true }, ["not-a-target"]).length, 0);
});

test("invalid and duplicate classifications fail the anomaly validator", () => {
  const invalid = [
    { ...questions[0], detail: "lateral" },
    { ...questions[0] },
  ];
  const errors = validateQuizGranularity(invalid);
  assert.ok(errors.some(error => /incompatible with section/.test(error)));
  assert.ok(errors.some(error => /target must be unique/.test(error)));
});

test("audit rejects a duplicated classification that disagrees with the registry", () => {
  const tampered = page.replace(
    '{target:"caudate",category:"basal",plane:"coronal",position:65,',
    '{target:"caudate",category:"basal",plane:"coronal",format:"surface",position:65,',
  );
  const result = auditQuizGranularitySource(tampered);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(error => /declared format surface disagrees with registry section/.test(error)), result.errors.join("\n"));
});

test("audit rejects a quiz content snapshot change", () => {
  const tampered = page.replace(
    '{target:"caudate",category:"basal",plane:"coronal",position:65,',
    '{target:"caudate",category:"basal",plane:"coronal",position:66,',
  );
  const result = auditQuizGranularitySource(tampered);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(error => /quiz prompt\/options\/position\/view snapshot changed/.test(error)), result.errors.join("\n"));
});

test("zero next-queue candidates keep a reasoned setting note without hiding the current queue", () => {
  assert.match(page, /quizCandidateCount===0&&<p className="quizCandidateEmptyNote" role="status" aria-live="polite">/);
  assert.match(page, /現在の条件の組合せに該当する問題がありません。トピック・形式・詳細・「間違った問題のみ」・「試作問題を含む」を見直してください。/);
  assert.match(page, /:quizEmpty\?<div className="quizEmptyState"/);
  assert.match(css, /\.quizCandidateEmptyNote\{margin-top:-4px;padding:7px;font-size:11px;line-height:1\.6\}/);
});
