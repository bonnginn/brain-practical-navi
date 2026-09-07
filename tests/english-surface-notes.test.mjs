import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const catalog=JSON.parse(fs.readFileSync(new URL("../app/english-catalog.json",import.meta.url),"utf8"));

test("release credits retain the no-warranty meaning and readable English",()=>{
  assert.match(catalog["で提供し、無保証です。変更したWeb版は利用者へ対応ソースを取得する機会を提供する必要があります。"],/without warranty/);
  assert.doesNotMatch(JSON.stringify(catalog),/anical orientation|andd materials|Guaranteed The modified/);
  const status=JSON.parse(fs.readFileSync(new URL("../app/beta-status.json",import.meta.url),"utf8"));
  for(const item of status.changes.filter(item=>["change-september-adopted-segmentation","change-browser-segmentation-references"].includes(item.id))){
    assert.ok(catalog[item.heading]);assert.ok(catalog[item.body]);
  }
});

test("surface controls and full structure names retain their meaning",()=>{
  assert.equal(catalog["半球"],"Hemisphere");
  assert.equal(catalog["脳表を透過"],"Make brain surface transparent");
  assert.equal(catalog["［アトラス区画］"],"[Atlas region]");
  assert.equal(catalog["下前頭回 弁蓋部・三角部"],"Opercular and triangular parts of the inferior frontal gyrus");
  assert.match(catalog["初期状態は非表示・左側だけを描画"],/Hidden initially; only the left side/);
});

test("arterial explanations retain the named connections and limitations",()=>{
  assert.equal(catalog["内頸動脈系"],"Internal carotid system");
  assert.equal(catalog["椎骨脳底系"],"Vertebrobasilar system");
  const introduction=catalog["高密度全脳モデルの下面へ主要動脈を重ね、内頸動脈系と椎骨脳底動脈系が脳底の動脈輪で連絡する標準的な配置を追います。"];
  for(const term of ["internal carotid","vertebrobasilar","circle of Willis"])assert.ok(introduction.includes(term));
  assert.match(catalog["左右の前大脳動脈を正中で連絡し、動脈輪前方を閉じる。"],/left and right anterior cerebral arteries/);
  const caution=catalog["赤い管は主要幹の典型的な連絡を標準空間へ置いた模式3Dです。Willis動脈輪は欠損・低形成・胎児型などの個体差が多く、完全な輪が常に存在するわけではありません。穿通枝・正確な血管径・個人差は再現していません。"];
  for(const term of ["schematically","hypoplastic","fetal-type","not always present","not reproduced"])assert.ok(caution.includes(term));
});

test("nerve descriptions do not lose emergence sites or relative directions",()=>{
  assert.equal(catalog["舌下神経と錐体・オリーブ"],"Hypoglossal nerve, medullary pyramids and olives");
  const cn3=catalog["中脳の脚間窩から腹側へ現れる神経です。現行の模式管には中脳組織内を通る部分があり、実際の脳内線維束を追跡したものではありません。脳外の近位経路・根糸・正確な出現境界も未確定です。出現位置の正解図としては扱わないでください。"];
  assert.match(cn3,/ventrally from the interpeduncular fossa/);
  assert.match(cn3,/not traced intramesencephalic nerve fascicles/);
  assert.match(cn3,/extra-axial proximal course, rootlets and precise root exit zone remain unresolved/);
  assert.match(catalog["橋延髄境界の正中寄りから現れる。"],/near the midline at the pontomedullary junction/);
  for(const nerve of ["顔面神経","前庭蝸牛神経"]){
    const entry=Object.entries(catalog).find(([key])=>key.startsWith(nerve+"の近位部だけを示す模式です。"));
    assert.ok(entry);
    assert.match(entry[1],/display cutoff, not the end of the nerve/);
    assert.match(entry[1],/precise root exit.*not reconstructed/);
    assert.match(entry[1],/not shown separately/);
  }
  const accessory=Object.entries(catalog).find(([key])=>key.startsWith("配置を修正中です。")&&key.includes("副神経全体"));
  assert.match(accessory?.[1]??'',/must not be used to identify the entire nerve/);
});

test("deep and block notes retain schematic scope and projection destinations",()=>{
  assert.match(catalog["脳梁下面と脳弓上面を結ぶ両葉性の薄い隔壁の位置を示します。現在の3Dは左葉だけの模式です。"],/schematic of the left lamina only/);
  assert.match(catalog["内側膝状体から側頭葉の聴覚皮質へ向かいます。"],/medial geniculate body toward the auditory cortex in the temporal lobe/);
  assert.match(catalog["海馬の前方、側脳室下角前端の近くに位置します。"],/anterior to the hippocampus.*inferior horn/);
  assert.match(catalog["間脳の視床下域にある小さな核を左右表示します。視床下部・中脳そのものとは区別してください。"],/subthalamus of the diencephalon/);
  assert.equal(catalog["画像誘導・試作"],"Image-guided · provisional");
  assert.match(catalog["クリックで同定・ホイールで拡大"],/wheel to zoom/);
  assert.match(catalog["現行の同一格子分節から再構成した左右側脳室と第三脳室の比較用3D表示"],/left and right lateral ventricles and the third ventricle/);
  assert.match(catalog["現行再構成と、実標本由来ではない専門家未確認の模式案を、同じ操作条件でA/B比較します。学習用モデルやラベルは変更しません。"],/not derived from an actual specimen.*not been reviewed by an expert/);
  assert.ok(!JSON.stringify(catalog).includes("lateralrd"));
});
