import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const catalog=JSON.parse(fs.readFileSync(new URL("../app/english-catalog.json",import.meta.url),"utf8"));

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
  assert.match(catalog["中脳の脚間窩から腹側へ現れる。現行の模式表示では脳幹に隠れて経路を確認しにくいため、出現位置の正解図としては扱わないでください。"],/ventrally from the interpeduncular fossa/);
  assert.match(catalog["橋延髄境界の正中寄りから現れる。"],/near the midline at the pontomedullary junction/);
  assert.match(catalog["橋延髄境界の外側で、内耳神経の内側に並ぶ。"],/medial to the vestibulocochlear nerve/);
  assert.match(catalog["迷走神経より尾側の根列として並ぶ。"],/roots caudal to the vagus nerve/);
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
