import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../app/canvas.css',import.meta.url),'utf8');
test('quiz keeps a readable desktop rail without overriding phone settings',()=>{
  assert.match(css,/\.appShell\.workspace-quiz:not\(\.phone-mode\).*grid-template-columns: clamp\(250px,20vw,290px\)/);
  assert.match(css,/\.quizSetup \.quizCandidateSummary \{ grid-template-columns: minmax\(0,1fr\)/);
});
test('quiz reflows by panel width while retaining readable answer text',()=>{
  assert.match(css,/@container quiz-area \(max-width: 42rem\)/);
  assert.match(css,/@container quiz-image \(max-width: 32rem\)/);
  assert.match(css,/\.quizOptions button > span \{ min-width: 0; font-size: 1rem; overflow-wrap: anywhere/);
  assert.match(css,/\.quizQuestionCard h2 \{ font-size: clamp\(1\.125rem/);
});
