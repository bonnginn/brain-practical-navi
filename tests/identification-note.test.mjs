import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const page=readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');
const catalog=JSON.parse(readFileSync(new URL('../app/english-catalog.json',import.meta.url),'utf8'));

test('identification stores its own explanation rather than borrowing the current selection',()=>{
 assert.match(page,/setIdentified\(\{\.\.\.point,name,side,note\}\)/);
 const card=page.match(/<div className="identifyCard">[^\n]+/)[0];
 assert.match(card,/identified\.note/);
 assert.doesNotMatch(card,/current\.note/);
});
test('partial aqueduct has an identifiable name but is not added as a normal structure target',()=>{
 assert.match(page,/bigBrainNameById\.set\(41,"中脳水道候補（部分）"\)/);
 assert.doesNotMatch(page,/bigbrainIds:\[[^\]]*\b41\b/);
 assert.match(page,/bigbrain&&point\.id===41/);
 assert.equal(catalog['中脳水道候補（部分）'],'Cerebral aqueduct candidate (partial)');
});
test('unlabelled and partial explanations have complete English counterparts',()=>{
 assert.match(catalog['この位置には対応するラベルがありません。組織が存在しないことを意味するものではありません。'],/does not imply that tissue is absent/);
 assert.match(catalog['中脳水道の一部分だけを示す候補です。全長や境界の確定を意味せず、通常クイズの正答対象には含めません。'],/excluded from regular quiz targets/);
});
