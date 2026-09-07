import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const catalog=JSON.parse(fs.readFileSync(new URL("../app/english-catalog.json",import.meta.url),"utf8"));

test("block observation lists retain relations instead of only structure names",()=>{
  assert.equal(catalog["レンズ核内側の内包"],"Internal capsule medial to the lentiform nucleus");
  assert.match(catalog["第三脳室側壁に沿う視床と視床下部の上下関係"],/thalamus and hypothalamus.*lateral wall of the third ventricle/);
  assert.match(catalog["外側膝状体から後頭葉へ向かう視放線"],/Optic radiation.*lateral geniculate.*occipital/);
  assert.match(catalog["内側膝状体から側頭葉へ向かう聴放線"],/Auditory radiation.*medial geniculate.*temporal/);
  assert.match(catalog["脳梁の膝・幹・膨大へ続く弧"],/genu, body, and splenium/);
  assert.equal(catalog["第四脳室と菱形窩"],"Fourth ventricle and rhomboid fossa");
  assert.equal(catalog["小脳虫部・半球"],"Cerebellar vermis and hemispheres");
  assert.equal(catalog["錐体・オリーブ"],"Pyramids and olives");
});

test("ventricular and temporal descriptions preserve the side, parts and absence caveat",()=>{
  assert.equal(catalog["側脳室体部・三角部・下角"],"Body, atrium, and inferior horn of the lateral ventricle");
  assert.match(catalog["脈絡叢が存在しない前角・後角の方向"],/anterior and posterior horns.*choroid plexus is absent/);
  assert.equal(catalog["海馬前方の扁桃体"],"Amygdala anterior to the hippocampus");
  assert.match(catalog["右内側側頭葉だけを小さく切り出し、同一格子上の海馬、側脳室下角、扁桃体の前後関係を見比べる標本です。前後方向を回転させ、扁桃体から海馬へ移る関係を追います。"],/right medial temporal lobe.*anterior–posterior.*same grid/);
});

test("English provenance guidance does not point learners to its excluded collaboration page",()=>{
  for(const key of ["。詳細な根拠と確度は共同制作ページおよび由来台帳で確認できます。","。詳細な根拠と確度は共同制作ページと由来台帳で確認できます。"]){
    assert.match(catalog[key],/project documentation and provenance registry/);
    assert.doesNotMatch(catalog[key],/collaboration page/);
  }
});
