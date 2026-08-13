"use client";

import { PointerEvent, useEffect, useMemo, useState } from "react";
import { AtlasVolumeCanvas, type HighlightLayer, type IdentifiedPoint } from "./AtlasVolumeCanvas";
import { ManualSegmentationWorkbench } from "./ManualSegmentationWorkbench";

type Plane = "coronal" | "horizontal" | "sagittal";
type Focus = "ventricle" | "caudate" | "hippocampus" | "thalamus";
type WorkspaceMode = "home" | "sections" | "surface" | "blocks" | "quiz" | "segment";
type SurfaceViewKey = "lateral" | "superior" | "inferior" | "medial" | "arteries" | "cranialNerves";
type SurfaceRegionKey = "precentral" | "postcentral" | "superiorFrontal" | "inferiorFrontal" | "superiorTemporal" | "middleTemporal" | "supramarginal" | "superiorParietal" | "paracentral" | "precuneus" | "cuneus" | "pericalcarine" | "lingual" | "fusiform" | "orbitofrontal" | "lateralOccipital";
type BasalLandmarkKey = "all" | "optic" | "infundibulum" | "mammillary";
type BlockSpecimenKey = "lateral-ventricle" | "diencephalon" | "radiations" | "commissural-system" | "choroid-plexus" | "medial-temporal" | "midbrain-section" | "hindbrain";
type Rotation = {x:number;y:number;z?:number};
type BlockViewPreset = "initial" | "opposite" | "superior" | "inferior";
type BlockVisual = "model";
type BlockLayer = {key:string;name:string;latin:string;color:string;source:"標本分節"|"試作分節"|"模式補助"|"位置目安";note:string};
type BlockLesson = {name:string;en:string;visual:BlockVisual;plane:Plane;position:number;focus:Focus;view:"inside"|"ghost"|"extracted"|"segmented";rotation:Rotation;intro:string;observe:string[];caution:string;layers:BlockLayer[]};
type NeurovascularStructureKey = "ica" | "aca" | "acomm" | "mca" | "pcomm" | "vertebral" | "basilar" | "pca" | "cerebellarArteries" | "cn1" | "cn2" | "opticChiasm" | "cn3" | "cn4" | "cn5" | "cn6" | "cn7" | "cn8" | "cn9" | "cn10" | "cn11" | "cn12";
type StructureKey = Focus | "thirdVentricle" | "fourthVentricle" | "corpusCallosum" | "internalCapsule" | "putamen" | "pallidumExternal" | "pallidumInternal" | "pallidum" | "amygdala" | "accumbens" | "redNucleus" | "substantiaNigra" | "subthalamic" | "brainstem" | "cerebellum" | "opticChiasm" | "insula";
type LabelSource = "manual" | "atlas-provisional" | "image-guided";
type StructureInfo = { name: string; latin: string; color: string; rgb: [number,number,number]; ids: number[]; bigbrainIds?: number[]; labelSource?: LabelSource; note: string; relation: string; meshFocus?: Focus };
type Landmark = { p: number; label: string; short: string; row?: 0 | 1 };
type QuizCategory = "basal" | "limbic" | "midbrain" | "ventricles" | "connections" | "hindbrain" | "surface";
type QuizTargetKey = StructureKey | SurfaceRegionKey;
type SectionQuizQuestion = { target: StructureKey; category: Exclude<QuizCategory,"surface">; plane: Plane; position: number; prompt: string; options: StructureKey[] };
type SurfaceQuizQuestion = { target: SurfaceRegionKey; category: "surface"; view: SurfaceViewKey; prompt: string; options: SurfaceRegionKey[] };
type QuizQuestion = SectionQuizQuestion | SurfaceQuizQuestion;

const planeData: Record<Plane, { ja: string; en: string; axis: string; from: string; to: string }> = {
  coronal: { ja: "冠状断", en: "CORONAL", axis: "前後位置", from: "後方", to: "前方" },
  horizontal: { ja: "水平断", en: "HORIZONTAL", axis: "上下位置", from: "上方", to: "下方" },
  sagittal: { ja: "矢状断", en: "SAGITTAL", axis: "左右位置", from: "左外側", to: "右外側" },
};

const workspaceModes:{key:WorkspaceMode;label:string;sub:string}[]=[
  {key:"home",label:"トップ",sub:"概要"},
  {key:"sections",label:"断面実習",sub:"連続切片"},
  {key:"surface",label:"脳表観察",sub:"外表・脳溝"},
  {key:"blocks",label:"ブロック標本",sub:"位置関係"},
  {key:"quiz",label:"復習クイズ",sub:"構造同定"},
  {key:"segment",label:"編集ツール",sub:"共同制作用"},
];
const homeRotation:Rotation={x:-8,y:-28,z:0};

const quizCategories:{key:"all"|QuizCategory;label:string}[]=[
  {key:"all",label:"全項目"},
  {key:"basal",label:"大脳基底核"},
  {key:"limbic",label:"辺縁系"},
  {key:"midbrain",label:"中脳・視床下部"},
  {key:"ventricles",label:"脳室系"},
  {key:"connections",label:"間脳・白質"},
  {key:"hindbrain",label:"脳幹・小脳"},
  {key:"surface",label:"脳表・主要脳回"},
];
const QUIZ_WRONG_CACHE_KEY="brain-practical-quiz-wrong-v1";

const surfaceViews:Record<SurfaceViewKey,{name:string;en:string;visual:"cortex"|"arteries"|"nerves";rotation:Rotation;hemisphere:"both"|"left"|"right";intro:string;structures:string[];caution?:string}>= {
  lateral:{name:"左外側面",en:"LATERAL",visual:"cortex",rotation:{x:-7,y:-74},hemisphere:"both",intro:"外側溝から中心溝をたどり、前頭・頭頂・側頭葉の境界を組み立てます。",structures:["外側溝（シルビウス溝）","中心前溝・中心溝","中心前回・中心後回","上側頭回","下前頭回 弁蓋部・三角部"]},
  superior:{name:"上面",en:"SUPERIOR",visual:"cortex",rotation:{x:-72,y:-6},hemisphere:"both",intro:"大脳縦裂を基準に、上前頭溝と逆Ω型の中心前回を見つけます。",structures:["大脳縦裂","上前頭溝","中心前溝","中心溝","中心前回・中心後回"]},
  inferior:{name:"下面",en:"INFERIOR",visual:"cortex",rotation:{x:70,y:4},hemisphere:"both",intro:"嗅覚路・視覚路と脳幹腹側を、前後方向に並べて観察します。",structures:["嗅球・嗅索・嗅溝","視神経・視交叉・視索","乳頭体・大脳脚","橋・延髄","錐体・オリーブ","小脳半球"]},
  medial:{name:"左半球内側面",en:"MEDIAL",visual:"cortex",rotation:{x:-5,y:86},hemisphere:"left",intro:"片側半球を外して、脳梁周囲と内側面の脳溝・脳回を確認します。",structures:["脳梁・帯状回","中心傍小葉","楔前部・楔部","頭頂後頭溝","鳥距溝","脳弓・視床・視床下部"]},
  arteries:{name:"脳底動脈",en:"BASAL ARTERIES",visual:"arteries",rotation:{x:68,y:2},hemisphere:"both",intro:"高密度全脳モデルの下面へ主要動脈を重ね、内頸動脈系と椎骨脳底動脈系がウィリス動脈輪で連絡する配置を追います。",structures:["内頸動脈・中大脳動脈","前大脳動脈・前交通動脈","後交通動脈・後大脳動脈","椎骨動脈・脳底動脈","上小脳・前下小脳・後下小脳動脈","視交叉・脳幹との位置関係"],caution:"赤い管は主要幹を手作業で標準空間へ置いた模式3Dです。BigBrain画像から血管を抽出したものではなく、個人差・穿通枝・正確な血管径は再現していません。"},
  cranialNerves:{name:"脳神経・脳幹",en:"CRANIAL NERVES",visual:"nerves",rotation:{x:68,y:2},hemisphere:"both",intro:"脳底面モデルへ脳神経根を重ね、前脳・中脳・橋・延髄のどの高さから現れるかを確認します。",structures:["嗅索・視神経・視交叉","動眼神経・滑車神経","三叉神経","外転・顔面・内耳神経","舌咽・迷走・副神経","舌下神経と錐体・オリーブ"],caution:"III–XIIの見かけの起始部は同一標本の脳幹表面へ再配置しました。黄系の管は近位走行の模式3Dであり、神経核・頭蓋孔・遠位走行・太さは再現していません。"},
};

const surfaceRegions:Record<SurfaceRegionKey,{name:string;latin:string;ids:number[];color:string;rgb:[number,number,number];note:string}>={
  precentral:{name:"中心前回",latin:"Gyrus precentralis",ids:[86,35],color:"#d66e58",rgb:[214,110,88],note:"中心溝の前方に沿う一次運動野の主要部"},
  postcentral:{name:"中心後回",latin:"Gyrus postcentralis",ids:[64,13],color:"#4f9aae",rgb:[79,154,174],note:"中心溝の後方に沿う一次体性感覚野の主要部"},
  superiorFrontal:{name:"上前頭回",latin:"Gyrus frontalis superior",ids:[89,38],color:"#c18c4b",rgb:[193,140,75],note:"大脳縦裂に近い前頭葉上面"},
  inferiorFrontal:{name:"下前頭回 弁蓋部・三角部",latin:"Pars opercularis et triangularis",ids:[83,32,73,22],color:"#dd9650",rgb:[221,150,80],note:"外側溝前方、上行枝・前枝に区切られる領域"},
  superiorTemporal:{name:"上側頭回",latin:"Gyrus temporalis superior",ids:[96,45],color:"#9970b4",rgb:[153,112,180],note:"外側溝の下縁に沿う側頭葉上部"},
  middleTemporal:{name:"中側頭回",latin:"Gyrus temporalis medius",ids:[79,28],color:"#a46996",rgb:[164,105,150],note:"上・下側頭溝の間にある側頭葉外側面"},
  supramarginal:{name:"縁上回",latin:"Gyrus supramarginalis",ids:[102,51],color:"#4d86b2",rgb:[77,134,178],note:"外側溝後端を取り囲む下頭頂小葉"},
  superiorParietal:{name:"上頭頂小葉",latin:"Lobulus parietalis superior",ids:[60,9],color:"#68a06c",rgb:[104,160,108],note:"頭頂間溝の上方に広がる頭頂葉領域"},
  paracentral:{name:"中心傍小葉",latin:"Lobulus paracentralis",ids:[67,16],color:"#ad708c",rgb:[173,112,140],note:"中心前回・後回が内側面へ連続する部分"},
  precuneus:{name:"楔前部",latin:"Precuneus",ids:[82,31],color:"#7d9c5e",rgb:[125,156,94],note:"中心傍小葉の後方、頭頂後頭溝の前方"},
  cuneus:{name:"楔部",latin:"Cuneus",ids:[94,43],color:"#6d8db7",rgb:[109,141,183],note:"頭頂後頭溝と鳥距溝に挟まれる内側後頭葉"},
  pericalcarine:{name:"鳥距溝周囲皮質",latin:"Cortex pericalcarinus",ids:[57,6],color:"#c35f75",rgb:[195,95,117],note:"鳥距溝の上下に沿う一次視覚野周辺"},
  lingual:{name:"舌状回",latin:"Gyrus lingualis",ids:[63,12],color:"#b28a53",rgb:[178,138,83],note:"鳥距溝の下方にある後頭葉内側下面"},
  fusiform:{name:"紡錘状回",latin:"Gyrus fusiformis",ids:[75,24],color:"#a76f78",rgb:[167,111,120],note:"側頭葉・後頭葉下面の内外側溝間"},
  orbitofrontal:{name:"眼窩前頭皮質",latin:"Cortex orbitofrontalis",ids:[58,7,66,15],color:"#c38b65",rgb:[195,139,101],note:"前頭葉下面の眼窩面"},
  lateralOccipital:{name:"外側後頭皮質",latin:"Cortex occipitalis lateralis",ids:[85,34],color:"#638db3",rgb:[99,141,179],note:"後頭葉外側面の広い領域"},
};

const surfaceViewRegions:Record<SurfaceViewKey,SurfaceRegionKey[]>={
  lateral:["precentral","postcentral","inferiorFrontal","superiorTemporal","supramarginal","lateralOccipital"],
  superior:["superiorFrontal","precentral","postcentral","superiorParietal","paracentral"],
  inferior:["orbitofrontal","superiorTemporal","middleTemporal","fusiform","lingual","lateralOccipital"],
  medial:["paracentral","precuneus","cuneus","pericalcarine","lingual"],
  arteries:[],
  cranialNerves:[],
};

const basalLandmarks:Record<BasalLandmarkKey,{name:string;latin:string;note:string}>={
  all:{name:"脳底ランドマークをすべて表示",latin:"Basal landmarks",note:"前から視神経・視交叉、漏斗、乳頭体の順に位置関係を確認します。"},
  optic:{name:"視神経・視交叉・視索",latin:"N. opticus / chiasma / tractus",note:"左右の視神経が正中の視交叉へ集まり、後方では視索として外側へ向かいます。"},
  infundibulum:{name:"漏斗（下垂体茎）",latin:"Infundibulum / hypophysial stalk",note:"視交叉の後方、乳頭体の前方で、視床下部底面から下方へ伸びる正中構造です。"},
  mammillary:{name:"乳頭体",latin:"Corpora mamillaria",note:"漏斗の後方、脚間窩の前方に左右一対の小さな隆起として並びます。"},
};
const basalLandmarkKeys=Object.keys(basalLandmarks) as BasalLandmarkKey[];

const blockSpecimens:Record<BlockSpecimenKey,BlockLesson>={
  "lateral-ventricle":{name:"側脳室の全景",en:"LATERAL VENTRICLE",visual:"model",plane:"sagittal",position:58,focus:"ventricle",view:"inside",rotation:{x:-12,y:-58},intro:"側脳室のC字形の連続を隠さないよう、右側脳室の外側壁を開き、周囲実質を必要最小限だけ残した局所標本です。色レイヤーを着脱して、腔と周囲構造の隣接を組み立てます。",observe:["前角・体部・三角部・後角・下角","尾状核頭・体・尾との並走","視床と体部の位置関係","海馬と下角の位置関係","正中側にある第三脳室の方向"],caution:"側脳室腔は同一0.5 mm格子の教育用ラベル、尾状核・視床・海馬は手動分節です。脳弓・モンロー孔・薄い脳室壁は独立分節できていないため、全境界を正解形状として扱わないでください。",layers:[
    {key:"ventricular-cavity",name:"側脳室腔",latin:"Ventriculus lateralis",color:"#45aebd",source:"試作分節",note:"前角から下角まで連続する腔の形を示します。"},
    {key:"caudate",name:"尾状核",latin:"Nucleus caudatus",color:"#dc914b",source:"標本分節",note:"頭部・体部・尾部が側脳室の外側壁に沿います。"},
    {key:"thalamus",name:"視床",latin:"Thalamus",color:"#8d82c4",source:"標本分節",note:"側脳室体部の床と第三脳室の外側に位置します。"},
    {key:"hippocampus",name:"海馬",latin:"Hippocampus",color:"#c8798d",source:"標本分節",note:"側脳室下角の床を内側から隆起させます。"},
  ]},
  diencephalon:{name:"視床・視床下部標本",en:"DIENCEPHALON",visual:"model",plane:"sagittal",position:50,focus:"thalamus",view:"inside",rotation:{x:-10,y:-48},intro:"第三脳室を正中の空間基準にして、左右の視床、その腹側に続く視床下部領域、さらに腹外側の視床下核を一つの切り出しで比較します。構造を外しながら上下・内外・前後の関係を組み立てます。",observe:["左右の視床と第三脳室","第三脳室側壁に沿う視床と視床下部の上下関係","視床下核と視床・中脳の間の位置","第三脳室底へ続く視床下部領域","乳頭体の後下方への隆起"],caution:"視床と視床下核は手動分節、第三脳室は同一格子の試作分節です。視床下部は独立分節ではなく保守的な位置目安、乳頭体は模式3Dです。視床核群、視床下溝、視交叉、漏斗の厳密な境界はこの標本では示しません。",layers:[
    {key:"thalami",name:"視床",latin:"Thalamus",color:"#8d82c4",source:"標本分節",note:"第三脳室を挟んで左右に並ぶ間脳背側部です。"},
    {key:"third-ventricle",name:"第三脳室",latin:"Ventriculus tertius",color:"#45aebd",source:"試作分節",note:"視床と視床下部の内側面を読む正中の空間基準です。"},
    {key:"hypothalamus",name:"視床下部領域",latin:"Hypothalamus",color:"#b97864",source:"位置目安",note:"視床腹側から第三脳室底へ続く領域を示します。核境界ではありません。"},
    {key:"subthalamic-nuclei",name:"視床下核",latin:"Nucleus subthalamicus",color:"#e0ad45",source:"標本分節",note:"視床腹側・中脳吻側の小さな核を左右表示します。"},
    {key:"mammillary-bodies",name:"乳頭体",latin:"Corpora mamillaria",color:"#a8795f",source:"模式補助",note:"視床下部下面の後方にある一対の小隆起の位置を示します。"},
  ]},
  radiations:{name:"レンズ核・投射線維",en:"LENTIFORM & RADIATIONS",visual:"model",plane:"horizontal",position:53,focus:"caudate",view:"inside",rotation:{x:-58,y:-8},intro:"レンズ核と内包を含む水平切断標本に、放線冠・視放線・聴放線の走行目安を重ねます。被殻・淡蒼球外節・内節を別々に外しながら、内包を中心とする広がりを確認します。",observe:["被殻・淡蒼球外節・内節の層状配列","レンズ核内側の内包","上方へ扇状に広がる放線冠","外側膝状体から後頭葉へ向かう視放線","内側膝状体から側頭葉へ向かう聴放線"],caution:"被殻と淡蒼球外節・内節は手動分節、内包は画像誘導の試作分節です。3種類の放線は現在の組織像から抽出した線維束ではなく、切断面上へ投影した走行模式です。位置関係の学習用で、束の太さ・全線維・個人差は表しません。",layers:[
    {key:"putamen",name:"被殻",latin:"Putamen",color:"#d9854f",source:"標本分節",note:"レンズ核の外側部です。"},
    {key:"pallidum-external",name:"淡蒼球外節",latin:"Globus pallidus externus",color:"#d0ae5c",source:"標本分節",note:"被殻の内側、淡蒼球内節の外側に位置します。"},
    {key:"pallidum-internal",name:"淡蒼球内節",latin:"Globus pallidus internus",color:"#b88d42",source:"標本分節",note:"外節の内側で、内包に接します。"},
    {key:"internal-capsule",name:"内包",latin:"Capsula interna",color:"#e4d27a",source:"試作分節",note:"レンズ核の内側、尾状核・視床の外側を通ります。"},
    {key:"corona-radiata",name:"放線冠",latin:"Corona radiata",color:"#e7c85d",source:"模式補助",note:"内包より上方で皮質へ扇状に広がる投射線維です。"},
    {key:"optic-radiation",name:"視放線",latin:"Radiatio optica",color:"#7d9fd0",source:"模式補助",note:"外側膝状体から側頭・頭頂葉を経て後頭葉へ向かいます。"},
    {key:"auditory-radiation",name:"聴放線",latin:"Radiatio acustica",color:"#74b99e",source:"模式補助",note:"内側膝状体から側頭葉の聴覚皮質へ向かいます。"},
  ]},
  "commissural-system":{name:"脳梁・脳弓標本",en:"COMMISSURAL SYSTEM",visual:"model",plane:"sagittal",position:50,focus:"ventricle",view:"inside",rotation:{x:-7,y:76},intro:"正中周囲だけを残し、脳梁の弧、側脳室、透明中隔、脳弓の上下関係を内側から見る標本です。側脳室を空間基準に、交連線維と辺縁系の出力路を分けて観察します。",observe:["脳梁の膝・幹・膨大へ続く弧","脳梁直下の側脳室","脳梁と脳弓の間の透明中隔","海馬から乳頭体方向へ続く脳弓","脳梁と脳弓が別の線維系であること"],caution:"脳梁は画像誘導の試作分節、側脳室は同一格子の試作分節です。脳弓は模式3D、透明中隔は位置目安であり、薄い膜や線維束の実測境界ではありません。脳弓柱・交連前後の詳細形態は今後の修正対象です。",layers:[
    {key:"corpus-callosum",name:"脳梁",latin:"Corpus callosum",color:"#dbc270",source:"試作分節",note:"左右大脳半球を結ぶ大きな交連線維の弧です。"},
    {key:"lateral-ventricles",name:"側脳室",latin:"Ventriculi laterales",color:"#45aebd",source:"試作分節",note:"脳梁・透明中隔・脳弓の位置を読む空間基準です。"},
    {key:"fornix",name:"脳弓",latin:"Fornix",color:"#e7d9a6",source:"模式補助",note:"海馬から中隔野・乳頭体方向へ弧を描く線維路の模式です。"},
    {key:"septum-pellucidum",name:"透明中隔",latin:"Septum pellucidum",color:"#a9c5bd",source:"位置目安",note:"脳梁と脳弓の間に張る薄い隔壁の領域を示します。"},
  ]},
  "choroid-plexus":{name:"脈絡叢を開く",en:"CHOROID PLEXUS",visual:"model",plane:"sagittal",position:55,focus:"ventricle",view:"inside",rotation:{x:-18,y:-54},intro:"側脳室の内側壁を開き、脳室腔、海馬、脈絡裂に沿う脈絡叢を観察する局所標本です。腔の全体像と脈絡叢の付着位置を混同しないよう、別レイヤーにしました。",observe:["側脳室体部・三角部・下角","脈絡裂のC字形の方向","脈絡叢と視床・海馬の位置関係","下角の床をつくる海馬","脈絡叢が存在しない前角・後角の方向"],caution:"組織像から脈絡叢を安定して抽出できないため、赤紫の房状構造は脈絡裂に沿わせた模式3Dです。側脳室腔と海馬は同一標本格子に基づきます。脈絡叢の細かな形・付着範囲は検証用標本で今後修正します。",layers:[
    {key:"ventricular-cavity",name:"側脳室腔",latin:"Ventriculus lateralis",color:"#45aebd",source:"試作分節",note:"脈絡叢が入る腔を先に把握するための基準です。"},
    {key:"choroid-plexus",name:"脈絡叢",latin:"Plexus choroideus",color:"#b34c62",source:"模式補助",note:"脈絡裂に沿う付着方向を示す房状モデルです。"},
    {key:"hippocampus",name:"海馬",latin:"Hippocampus",color:"#c8798d",source:"標本分節",note:"側脳室下角の床と脈絡裂の位置を理解する基準です。"},
  ]},
  "medial-temporal":{name:"海馬・扁桃体標本",en:"MEDIAL TEMPORAL SPECIMEN",visual:"model",plane:"horizontal",position:69,focus:"hippocampus",view:"inside",rotation:{x:-20,y:-48},intro:"右内側側頭葉だけを小さく切り出し、海馬、海馬采、側脳室下角、扁桃体、鉤の位置を見比べる標本です。前後方向を回転させ、扁桃体から海馬へ移る関係を追います。",observe:["海馬頭・体と側脳室下角","海馬表面から内側へ集まる海馬采","海馬前方の扁桃体","鉤と扁桃体・海馬頭の位置関係","後方へ脳弓へ続く方向"],caution:"海馬と扁桃体は同一標本の手動分節、側脳室下角は試作腔ラベルです。海馬采は模式3D、鉤は独立した正解分節ではなく位置目安です。模式補助を実標本由来の輪郭として暗記しないでください。",layers:[
    {key:"hippocampus",name:"海馬",latin:"Hippocampus",color:"#c8798d",source:"標本分節",note:"下角の床を隆起させ、後方へ細く続きます。"},
    {key:"amygdala",name:"扁桃体",latin:"Corpus amygdaloideum",color:"#9c6cae",source:"標本分節",note:"海馬の前方、側脳室下角前端の近くに位置します。"},
    {key:"inferior-horn",name:"側脳室下角",latin:"Cornu inferius",color:"#45aebd",source:"試作分節",note:"海馬と扁桃体の上下前後関係を読む空間基準です。"},
    {key:"fimbria",name:"海馬采",latin:"Fimbria hippocampi",color:"#e3d8b0",source:"模式補助",note:"海馬表面の線維が内側縁へ集まる方向を示します。"},
    {key:"uncus",name:"鉤（位置目安）",latin:"Uncus",color:"#b78165",source:"位置目安",note:"海馬傍回前端が内側へ鉤状に曲がる領域です。"},
  ]},
  "midbrain-section":{name:"中脳核・大脳脚標本",en:"MIDBRAIN TRANSVERSE",visual:"model",plane:"horizontal",position:67,focus:"thalamus",view:"inside",rotation:{x:-62,y:0},intro:"赤核と黒質が現れる高さで中脳を横断した局所標本です。中脳水道を背側の基準に、被蓋の赤核、腹側の黒質と大脳脚を層状に比較します。",observe:["正中背側寄りの中脳水道","被蓋に並ぶ左右の赤核","赤核の腹外側に沿う黒質","黒質腹側の大脳脚領域","背側の蓋と腹側の大脳脚の方向"],caution:"赤核・黒質は手動分節、褐色組織は同一標本の脳幹ラベルから作った10 mm厚の横断標本です。中脳水道は見やすさを優先した模式3D、大脳脚は位置目安です。上丘・下丘、動眼神経核、被蓋核群の境界は示しません。",layers:[
    {key:"red-nuclei",name:"赤核",latin:"Nuclei rubri",color:"#d24f49",source:"標本分節",note:"中脳被蓋内に左右一対で現れる円形の核です。"},
    {key:"substantia-nigra",name:"黒質",latin:"Substantia nigra",color:"#716387",source:"標本分節",note:"被蓋と大脳脚の間に沿う帯状の核です。"},
    {key:"aqueduct",name:"中脳水道",latin:"Aqueductus mesencephali",color:"#45aebd",source:"模式補助",note:"第三脳室と第四脳室を結ぶ正中の細い腔を、視認できる太さで示します。"},
    {key:"cerebral-peduncles",name:"大脳脚領域",latin:"Pedunculi cerebri",color:"#d29a55",source:"位置目安",note:"黒質の腹側にある大脳脚底部の概略領域です。"},
  ]},
  hindbrain:{name:"脳幹・小脳の脱着",en:"BRAINSTEM & CEREBELLUM",visual:"model",plane:"horizontal",position:80,focus:"thalamus",view:"inside",rotation:{x:-4,y:8},intro:"単一標本から脳幹・小脳を切り離した標本です。この項目だけは局所の切断面ではなく、橋・延髄と小脳を個別に外して第四脳室周囲を露出する脱着観察です。中脳は上方との連続を保つため残します。",observe:["中脳・橋・延髄","第四脳室と菱形窩","小脳虫部・半球","上・中・下小脳脚の方向","錐体・オリーブ","脳神経起始部を探す表面"],caution:"橋・延髄は同一格子の脳幹ラベルから中脳近似部を除いた一体部品です。中脳との境界、小脳脚・菱形窩・脳神経根の微細な境界は独立分節されていません。",layers:[]},
};

// Each specimen opens in a three-quarter or near-orthogonal view chosen to expose its teaching structures.
const blockInitialRotations:Record<BlockSpecimenKey,Rotation>={
  "lateral-ventricle":{x:-14,y:-64,z:4},
  diencephalon:{x:-8,y:-38,z:0},
  radiations:{x:-70,y:-12,z:0},
  "commissural-system":{x:-7,y:88,z:0},
  "choroid-plexus":{x:-14,y:-62,z:4},
  "medial-temporal":{x:-26,y:-56,z:5},
  "midbrain-section":{x:-78,y:0,z:0},
  hindbrain:{x:-10,y:-26,z:0},
};

const blockViewLabels:Record<BlockViewPreset,string>={initial:"初期",opposite:"反対側",superior:"上面",inferior:"下面"};

const neurovascularStructures:Record<NeurovascularStructureKey,{name:string;latin:string;kind:"arteries"|"nerves";ids:number[];note:string}>={
  ica:{name:"内頸動脈",latin:"Internal carotid artery",kind:"arteries",ids:[1,2],note:"前床突近傍から前・中大脳動脈へ分かれる前方循環の入口。"},
  aca:{name:"前大脳動脈",latin:"Anterior cerebral artery",kind:"arteries",ids:[3,4],note:"視交叉の上方から大脳縦裂へ入り、内側面を前上方へ走る。"},
  acomm:{name:"前交通動脈",latin:"Anterior communicating artery",kind:"arteries",ids:[5],note:"左右の前大脳動脈を正中で連絡し、動脈輪前方を閉じる。"},
  mca:{name:"中大脳動脈",latin:"Middle cerebral artery",kind:"arteries",ids:[6,7],note:"内頸動脈から外側へ分かれ、外側溝へ向かう太い枝。"},
  pcomm:{name:"後交通動脈",latin:"Posterior communicating artery",kind:"arteries",ids:[8,9],note:"内頸動脈系と後大脳動脈を前後に連絡する。"},
  vertebral:{name:"椎骨動脈",latin:"Vertebral artery",kind:"arteries",ids:[10,11],note:"延髄腹側を上行し、左右が合流して脳底動脈となる。"},
  basilar:{name:"脳底動脈",latin:"Basilar artery",kind:"arteries",ids:[12],note:"橋腹側正中の脳底溝を上行し、終末で後大脳動脈へ分岐する。"},
  pca:{name:"後大脳動脈",latin:"Posterior cerebral artery",kind:"arteries",ids:[13,14],note:"中脳周囲を外側・後方へ回り、後頭葉下面へ向かう。"},
  cerebellarArteries:{name:"小脳動脈群",latin:"SCA / AICA / PICA",kind:"arteries",ids:[15,16,17,18,19,20],note:"脳底動脈・椎骨動脈から小脳へ向かう上・前下・後下小脳動脈。"},
  cn1:{name:"I 嗅索",latin:"Olfactory tract",kind:"nerves",ids:[21,22],note:"前頭葉下面の嗅溝に沿って前後へ走る。"},
  cn2:{name:"II 視神経",latin:"Optic nerve",kind:"nerves",ids:[23,24],note:"眼窩側から後内側へ向かい、正中の視交叉へ集まる。"},
  opticChiasm:{name:"II 視交叉",latin:"Optic chiasm",kind:"nerves",ids:[25],note:"視床下部前下方で左右の視神経線維が交叉する。"},
  cn3:{name:"III 動眼神経",latin:"Oculomotor nerve",kind:"nerves",ids:[26,27],note:"中脳の脚間窩から腹側へ現れる。"},
  cn4:{name:"IV 滑車神経",latin:"Trochlear nerve",kind:"nerves",ids:[28,29],note:"中脳背側から出た後、外側を回って腹面へ現れる。"},
  cn5:{name:"V 三叉神経",latin:"Trigeminal nerve",kind:"nerves",ids:[30,31],note:"橋外側から太い根として現れる。"},
  cn6:{name:"VI 外転神経",latin:"Abducens nerve",kind:"nerves",ids:[32,33],note:"橋延髄境界の正中寄りから現れる。"},
  cn7:{name:"VII 顔面神経",latin:"Facial nerve",kind:"nerves",ids:[34,35],note:"橋延髄境界の外側で、内耳神経の内側に並ぶ。"},
  cn8:{name:"VIII 内耳神経",latin:"Vestibulocochlear nerve",kind:"nerves",ids:[36,37],note:"小脳橋角で顔面神経の外側に並ぶ。"},
  cn9:{name:"IX 舌咽神経",latin:"Glossopharyngeal nerve",kind:"nerves",ids:[38,39],note:"延髄オリーブ後溝の上部から現れる。"},
  cn10:{name:"X 迷走神経",latin:"Vagus nerve",kind:"nerves",ids:[40,41],note:"舌咽神経の下方、オリーブ後溝に沿って現れる。"},
  cn11:{name:"XI 副神経",latin:"Accessory nerve",kind:"nerves",ids:[42,43],note:"迷走神経より尾側の根列として並ぶ。"},
  cn12:{name:"XII 舌下神経",latin:"Hypoglossal nerve",kind:"nerves",ids:[44,45],note:"錐体とオリーブの間にあるオリーブ前溝から現れる。"},
};
const neurovascularStructureKeys=Object.keys(neurovascularStructures) as NeurovascularStructureKey[];

const structures: Record<StructureKey, StructureInfo> = {
  ventricle: { name: "側脳室", latin: "Ventriculus lateralis", color: "#49a9b4", rgb:[73,169,180], ids:[92,41,56,5], bigbrainIds:[23,24], labelSource:"atlas-provisional", meshFocus:"ventricle", note: "前角・体部・後角・下角が連続する空間です。断面を動かして形の変化を追います。", relation: "脳梁の下方、尾状核・視床の内側" },
  thirdVentricle: { name:"第三脳室", latin:"Ventriculus tertius", color:"#58aeb8", rgb:[88,174,184], ids:[80,29], bigbrainIds:[25], labelSource:"atlas-provisional", meshFocus:"ventricle", note:"左右の視床間にある正中の細い腔です。水平断・冠状断で側脳室との連続を確認します。", relation:"左右視床の間、視床下部の上方" },
  fourthVentricle: { name:"第四脳室", latin:"Ventriculus quartus", color:"#4997b0", rgb:[73,151,176], ids:[88,37], bigbrainIds:[26], labelSource:"atlas-provisional", meshFocus:"ventricle", note:"橋・延髄と小脳の間にある腔です。矢状断で中脳水道から中心管への連続を追います。", relation:"脳幹の背側、小脳の腹側" },
  corpusCallosum: { name:"脳梁", latin:"Corpus callosum", color:"#dbc270", rgb:[219,194,112], ids:[], bigbrainIds:[30], labelSource:"image-guided", note:"左右大脳半球を結ぶ交連線維です。矢状断で膝・幹・膨大を連続して確認します。", relation:"側脳室の上方、帯状回の下方" },
  internalCapsule: { name:"内包", latin:"Capsula interna", color:"#e2964f", rgb:[226,150,79], ids:[], bigbrainIds:[31,32], labelSource:"image-guided", note:"尾状核・視床とレンズ核の間を走る白質路です。冠状断で前脚・膝・後脚の曲がりを追います。", relation:"尾状核・視床の外側、被殻・淡蒼球の内側" },
  caudate: { name: "尾状核", latin: "Nucleus caudatus", color: "#e19749", rgb:[225,151,73], ids:[100,49], bigbrainIds:[7,8], labelSource:"manual", meshFocus:"caudate", note: "側脳室に沿って前後へ連続する核です。断面を移動して頭・体・尾の位置変化を追います。", relation: "側脳室の外側、内包の内側" },
  putamen: { name:"被殻", latin:"Putamen", color:"#d9854f", rgb:[217,133,79], ids:[72,21], bigbrainIds:[9,10], labelSource:"manual", note:"レンズ核の外側部です。淡蒼球との境界と、外側を走る外包を確認します。", relation:"淡蒼球の外側、島皮質の内側" },
  pallidumExternal: { name:"淡蒼球外節", latin:"Globus pallidus externus", color:"#d0ae5c", rgb:[208,174,92], ids:[], bigbrainIds:[11,12], labelSource:"manual", note:"淡蒼球の外側区画です。内外の髄板を手がかりに、内節と分けて確認します。", relation:"被殻の内側、淡蒼球内節の外側" },
  pallidumInternal: { name:"淡蒼球内節", latin:"Globus pallidus internus", color:"#b88d42", rgb:[184,141,66], ids:[], bigbrainIds:[13,14], labelSource:"manual", note:"淡蒼球の内側区画です。外節より小さく、内包に接する位置を確認します。", relation:"淡蒼球外節の内側、内包の外側" },
  pallidum: { name:"淡蒼球（全体）", latin:"Globus pallidus", color:"#c8a451", rgb:[200,164,81], ids:[78,27], bigbrainIds:[11,12,13,14], labelSource:"manual", note:"外節と内節を一括表示します。細部の学習では、別項目の外節・内節を使ってください。", relation:"被殻の内側、内包の外側" },
  thalamus: { name: "視床", latin: "Thalamus", color: "#8d82c4", rgb:[141,130,196], ids:[91,40], bigbrainIds:[15,16], labelSource:"manual", meshFocus:"thalamus", note: "第三脳室を挟んで左右に位置します。水平断と冠状断で内包との境界を比較します。", relation: "第三脳室外側、内包の内側" },
  hippocampus: { name: "海馬", latin: "Hippocampus", color: "#c8798d", rgb:[200,121,141], ids:[99,48], bigbrainIds:[17,18], labelSource:"manual", meshFocus:"hippocampus", note: "側脳室下角の床に沿う構造です。冠状断と矢状断を往復して前後方向の連続を確認します。", relation: "側脳室下角の内側・床" },
  amygdala: { name:"扁桃体", latin:"Corpus amygdaloideum", color:"#c76878", rgb:[199,104,120], ids:[70,19], bigbrainIds:[21,22], labelSource:"manual", note:"側頭葉内側前方の核群です。海馬の前端との移行を連続断面で追います。", relation:"海馬頭の前上方、側脳室下角の前方" },
  accumbens: { name:"側坐核", latin:"Nucleus accumbens", color:"#78b579", rgb:[120,181,121], ids:[55,4], bigbrainIds:[19,20], labelSource:"manual", note:"尾状核頭と被殻が腹側で連続する領域に位置します。前方の冠状断で確認します。", relation:"尾状核頭・被殻の腹側、前交連の前下方" },
  redNucleus: { name:"赤核", latin:"Nucleus ruber", color:"#d24f49", rgb:[210,79,73], ids:[], bigbrainIds:[1,2], labelSource:"manual", note:"中脳被蓋にある円形の核です。黒質・中脳水道との位置関係を確認します。", relation:"中脳水道の腹外側、黒質の背内側" },
  substantiaNigra: { name:"黒質", latin:"Substantia nigra", color:"#716387", rgb:[113,99,135], ids:[], bigbrainIds:[3,4], labelSource:"manual", note:"中脳脚と被蓋の境界に沿う帯状の核です。赤核より腹側に位置します。", relation:"大脳脚の背側、赤核の腹外側" },
  subthalamic: { name:"視床下核", latin:"Nucleus subthalamicus", color:"#e0ad45", rgb:[224,173,69], ids:[], bigbrainIds:[5,6], labelSource:"manual", note:"小さなレンズ状の核です。淡蒼球内節・黒質との位置関係を連続断面で追います。", relation:"視床の腹側、黒質の背側、内包の内側" },
  brainstem: { name:"脳幹", latin:"Truncus encephali", color:"#739b72", rgb:[115,155,114], ids:[62,11], bigbrainIds:[27], labelSource:"atlas-provisional", note:"中脳・橋・延髄へ連続する軸性構造です。脳神経の出入口を考える基準になります。", relation:"間脳の下方、小脳の前方" },
  cerebellum: { name:"小脳", latin:"Cerebellum", color:"#8ba867", rgb:[139,168,103], ids:[97,46,90,39], bigbrainIds:[28,29], labelSource:"atlas-provisional", note:"皮質と白質、正中の虫部を区別します。水平断と矢状断で小脳脚との連続を追います。", relation:"脳幹の後方、後頭葉の下方" },
  opticChiasm: { name:"視交叉", latin:"Chiasma opticum", color:"#d4b65b", rgb:[212,182,91], ids:[68,17], note:"左右の視神経線維が交叉する正中構造です。小さいため前後の断面を細かく動かします。", relation:"視床下部の前下方、下垂体柄の前方" },
  insula: { name:"島皮質", latin:"Insula", color:"#6f9db0", rgb:[111,157,176], ids:[74,23], note:"外側溝の深部にある皮質です。弁蓋を除いた位置関係を断面で確認します。", relation:"被殻・外包の外側、前頭・頭頂・側頭弁蓋の深部" },
};

const structureGroups:{key:string;name:string;color:string;members:StructureKey[]}[]=[
  {key:"ventricles",name:"脳室系",color:"#49a9b4",members:["ventricle","thirdVentricle","fourthVentricle"]},
  {key:"basal",name:"大脳基底核",color:"#d9854f",members:["caudate","putamen","pallidumExternal","pallidumInternal","accumbens"]},
  {key:"midline",name:"正中・白質",color:"#d2b765",members:["corpusCallosum","internalCapsule","thalamus"]},
  {key:"limbic",name:"辺縁系",color:"#c8798d",members:["hippocampus","amygdala"]},
  {key:"midbrain",name:"中脳核",color:"#b06e75",members:["redNucleus","substantiaNigra","subthalamic"]},
  {key:"posterior",name:"脳幹・小脳",color:"#7e9f6c",members:["brainstem","cerebellum"]},
];

const structureFunctions:Record<StructureKey,string>={
  ventricle:"脳脊髄液を含む腔で、脳室系の連続性と周囲構造の位置を知る基準になります。",
  thirdVentricle:"間脳正中の髄液腔で、左右の視床・視床下部を区切る位置基準になります。",
  fourthVentricle:"後脳の髄液腔で、中脳水道からくも膜下腔へ至る髄液循環の通路です。",
  corpusCallosum:"左右大脳半球の皮質間を連絡し、両半球の情報統合を担う最大の交連線維です。",
  internalCapsule:"皮質と視床・脳幹・脊髄を結ぶ投射線維が密集し、運動・感覚経路が通ります。",
  caudate:"行動選択、眼球運動、認知的な運動制御に関わる線条体の一部です。",
  putamen:"随意運動の開始・大きさの調節や、習慣化された運動に関わります。",
  pallidumExternal:"大脳基底核の間接路を調節する中継部として、視床下核などとの回路を構成します。",
  pallidumInternal:"大脳基底核から視床などへ向かう主要な出力部として、運動の選択を調節します。",
  pallidum:"大脳基底核回路の主要な出力部として、不要な運動を抑え必要な運動を通します。",
  thalamus:"感覚・運動・認知情報を大脳皮質へ中継し、皮質活動を調整します。",
  hippocampus:"エピソード記憶の形成と空間情報の処理に重要です。",
  amygdala:"情動、脅威や報酬の評価、自律反応を伴う記憶形成に関わります。",
  accumbens:"報酬予測、動機づけ、行動を起こす価値判断に関わる腹側線条体です。",
  redNucleus:"小脳などから入力を受ける中脳核で、運動調節系の位置理解に重要です。",
  substantiaNigra:"線条体へドパミンを送り、運動開始、学習、報酬処理を調節します。",
  subthalamic:"大脳基底核回路を興奮性に調節し、競合する運動の抑制に関わります。",
  brainstem:"脳神経核、上下行路、覚醒・呼吸・循環など生命維持に関わる中枢を含みます。",
  cerebellum:"運動の正確さ、タイミング、平衡、姿勢、運動学習を調整します。",
  opticChiasm:"左右の視神経線維が部分交叉し、両眼の視野情報を左右半球へ振り分けます。",
  insula:"内臓感覚、味覚、痛み、情動、自律反応を統合し、身体内部の状態認識に関わります。",
};

const atlasRegions:{ids:number[];name:string}[]=[
  {ids:[80,29],name:"第三脳室"},{ids:[88,37],name:"第四脳室"},{ids:[62,11],name:"脳幹"},{ids:[92,41],name:"側脳室"},{ids:[56,5],name:"側脳室下角"},{ids:[97,46],name:"小脳皮質"},{ids:[90,39],name:"小脳白質"},{ids:[91,40],name:"視床"},{ids:[100,49],name:"尾状核"},{ids:[72,21],name:"被殻"},{ids:[78,27],name:"淡蒼球"},{ids:[99,48],name:"海馬"},{ids:[70,19],name:"扁桃体"},{ids:[55,4],name:"側坐核"},{ids:[77,26],name:"腹側間脳"},{ids:[68,17],name:"視交叉"},{ids:[76,25],name:"前脳基底部"},{ids:[101,50],name:"小脳虫部 I–V"},{ids:[53,2],name:"小脳虫部 VI–VII"},{ids:[71,20],name:"小脳虫部 VIII–X"},
  {ids:[81,30],name:"尾側前帯状皮質"},{ids:[93,42],name:"尾側中前頭回"},{ids:[94,43],name:"楔部"},{ids:[87,36],name:"嗅内野"},{ids:[75,24],name:"紡錘状回"},{ids:[61,10],name:"下頭頂小葉"},{ids:[54,3],name:"下側頭回"},{ids:[84,33],name:"帯状回峡部"},{ids:[85,34],name:"外側後頭皮質"},{ids:[58,7],name:"外側眼窩前頭皮質"},{ids:[63,12],name:"舌状回"},{ids:[66,15],name:"内側眼窩前頭皮質"},{ids:[79,28],name:"中側頭回"},{ids:[69,18],name:"海馬傍回"},{ids:[67,16],name:"中心傍小葉"},{ids:[83,32],name:"下前頭回弁蓋部"},{ids:[95,44],name:"下前頭回眼窩部"},{ids:[73,22],name:"下前頭回三角部"},{ids:[57,6],name:"鳥距溝周囲皮質"},{ids:[64,13],name:"中心後回"},{ids:[98,47],name:"後帯状皮質"},{ids:[86,35],name:"中心前回"},{ids:[82,31],name:"楔前部"},{ids:[59,8],name:"吻側前帯状皮質"},{ids:[52,1],name:"吻側中前頭回"},{ids:[89,38],name:"上前頭回"},{ids:[60,9],name:"上頭頂小葉"},{ids:[96,45],name:"上側頭回"},{ids:[102,51],name:"縁上回"},{ids:[65,14],name:"横側頭回"},{ids:[74,23],name:"島皮質"}
];
const atlasNameById=new Map(atlasRegions.flatMap(region=>region.ids.map(id=>[id,region.name] as const)));
atlasNameById.set(201,"白質");atlasNameById.set(202,"灰白質");atlasNameById.set(203,"髄液腔");
const bigBrainNameById=new Map<number,string>([[1,"左赤核"],[2,"右赤核"],[3,"左黒質"],[4,"右黒質"],[5,"左視床下核"],[6,"右視床下核"],[7,"左尾状核"],[8,"右尾状核"],[9,"左被殻"],[10,"右被殻"],[11,"左淡蒼球外節"],[12,"右淡蒼球外節"],[13,"左淡蒼球内節"],[14,"右淡蒼球内節"],[15,"左視床"],[16,"右視床"],[17,"左海馬"],[18,"右海馬"],[19,"左側坐核"],[20,"右側坐核"],[21,"左扁桃体"],[22,"右扁桃体"],[23,"左側脳室（試作）"],[24,"右側脳室（試作）"],[25,"第三脳室（試作）"],[26,"第四脳室（試作）"],[27,"脳幹（試作）"],[28,"左小脳（試作）"],[29,"右小脳（試作）"],[30,"脳梁候補（試作）"],[31,"左内包候補（試作）"],[32,"右内包候補（試作）"]]);

const landmarksByPlane: Record<Plane, Landmark[]> = {
  coronal: [
    { p: 39, label: "側脳室後角が目立つ後方断", short: "後角" },
    { p: 49, label: "視床・第三脳室・赤核を含む断面", short: "視床" },
    { p: 56, label: "扁桃体・乳頭体を含む断面", short: "扁桃体", row: 1 },
    { p: 62, label: "被殻・淡蒼球・内包を含む断面", short: "基底核" },
    { p: 69, label: "側脳室前角・尾状核頭を含む前方断", short: "前角", row: 1 },
  ],
  horizontal: [
    { p: 36, label: "半卵円中心を通る上方断", short: "半卵円" },
    { p: 49, label: "脳梁・側脳室体部を含む断面", short: "脳室体部" },
    { p: 59, label: "基底核・内包・視床を含む断面", short: "基底核", row: 1 },
    { p: 67, label: "上丘・赤核・黒質を含む中脳断", short: "上丘" },
    { p: 73, label: "下丘・黒質・海馬を含む断面", short: "下丘", row: 1 },
    { p: 81, label: "橋・第四脳室・小脳を含む下方断", short: "橋・小脳" },
  ],
  sagittal: [
    { p: 37, label: "左の島・被殻を通る外側矢状断", short: "左外側" },
    { p: 43, label: "左側脳室・尾状核・視床を通る傍正中断", short: "左傍正中", row: 1 },
    { p: 50, label: "脳梁・第三脳室・中脳水道を通る正中断", short: "正中" },
    { p: 57, label: "右側脳室・尾状核・視床を通る傍正中断", short: "右傍正中", row: 1 },
    { p: 63, label: "右の島・被殻を通る外側矢状断", short: "右外側" },
  ],
};

const quizQuestions:QuizQuestion[]=[
  {target:"caudate",category:"basal",plane:"coronal",position:65,prompt:"側脳室前角の外側に沿う核はどれですか？",options:["caudate","putamen","pallidum","thalamus"]},
  {target:"putamen",category:"basal",plane:"coronal",position:61,prompt:"淡蒼球の外側にあるレンズ核の構成要素はどれですか？",options:["putamen","pallidum","caudate","amygdala"]},
  {target:"pallidum",category:"basal",plane:"coronal",position:57,prompt:"被殻の内側、内包の外側に位置する構造はどれですか？",options:["pallidum","putamen","thalamus","internalCapsule"]},
  {target:"accumbens",category:"basal",plane:"coronal",position:62,prompt:"尾状核頭と被殻が腹側で連続する領域はどれですか？",options:["accumbens","caudate","pallidum","opticChiasm"]},
  {target:"hippocampus",category:"limbic",plane:"coronal",position:51,prompt:"側脳室下角の床に沿う構造はどれですか？",options:["hippocampus","amygdala","accumbens","insula"]},
  {target:"amygdala",category:"limbic",plane:"coronal",position:56,prompt:"海馬頭の前上方にある核群はどれですか？",options:["amygdala","hippocampus","putamen","thalamus"]},
  {target:"redNucleus",category:"midbrain",plane:"horizontal",position:67,prompt:"中脳水道の腹外側、黒質の背内側に見える核はどれですか？",options:["redNucleus","substantiaNigra","subthalamic","thalamus"]},
  {target:"substantiaNigra",category:"midbrain",plane:"horizontal",position:69,prompt:"大脳脚の背側に沿う帯状の核はどれですか？",options:["substantiaNigra","redNucleus","pallidum","putamen"]},
  {target:"subthalamic",category:"midbrain",plane:"horizontal",position:66,prompt:"視床の腹側、黒質の背側にある小さな核はどれですか？",options:["subthalamic","redNucleus","accumbens","amygdala"]},
  {target:"ventricle",category:"ventricles",plane:"horizontal",position:51,prompt:"左右大脳半球の内部でC字形に連続する髄液腔はどれですか？",options:["ventricle","thirdVentricle","fourthVentricle","corpusCallosum"]},
  {target:"thalamus",category:"connections",plane:"coronal",position:49,prompt:"第三脳室の両側を占める大きな灰白質はどれですか？",options:["thalamus","caudate","hippocampus","subthalamic"]},
  {target:"corpusCallosum",category:"connections",plane:"sagittal",position:50,prompt:"正中矢状断で側脳室の上方を弓状に走る交連線維はどれですか？",options:["corpusCallosum","internalCapsule","thalamus","caudate"]},
  {target:"internalCapsule",category:"connections",plane:"coronal",position:58,prompt:"尾状核・視床とレンズ核の間を通る白質路はどれですか？",options:["internalCapsule","corpusCallosum","pallidum","insula"]},
  {target:"brainstem",category:"hindbrain",plane:"horizontal",position:83,prompt:"第四脳室の腹側で中脳・橋・延髄へ連続する構造はどれですか？",options:["brainstem","cerebellum","thalamus","fourthVentricle"]},
  {target:"cerebellum",category:"hindbrain",plane:"horizontal",position:80,prompt:"橋・延髄の後方にあり、左右半球と虫部をもつ構造はどれですか？",options:["cerebellum","brainstem","thalamus","hippocampus"]},
  {target:"precentral",category:"surface",view:"lateral",prompt:"中心溝の前方に沿う脳回はどれですか？",options:["precentral","postcentral","inferiorFrontal","superiorTemporal"]},
  {target:"superiorTemporal",category:"surface",view:"lateral",prompt:"外側溝の下縁に沿う側頭葉の脳回はどれですか？",options:["superiorTemporal","middleTemporal","supramarginal","inferiorFrontal"]},
  {target:"superiorFrontal",category:"surface",view:"superior",prompt:"大脳縦裂に近い前頭葉上面を占める脳回はどれですか？",options:["superiorFrontal","precentral","postcentral","superiorParietal"]},
  {target:"precuneus",category:"surface",view:"medial",prompt:"中心傍小葉の後方、頭頂後頭溝の前方にある領域はどれですか？",options:["precuneus","paracentral","cuneus","pericalcarine"]},
  {target:"cuneus",category:"surface",view:"medial",prompt:"頭頂後頭溝と鳥距溝に挟まれる領域はどれですか？",options:["cuneus","precuneus","lingual","pericalcarine"]},
  {target:"fusiform",category:"surface",view:"inferior",prompt:"側頭葉・後頭葉下面で内外側の溝間にある脳回はどれですか？",options:["fusiform","lingual","middleTemporal","orbitofrontal"]},
];

function isSurfaceQuiz(question:QuizQuestion):question is SurfaceQuizQuestion{return "view" in question}

function sliceVariant(position: number) {
  if (position < 25) return "anterior";
  if (position < 46) return "capsular";
  if (position < 64) return "thalamic";
  if (position < 79) return "hippocampal";
  return "posterior";
}

function shuffledQuestions(items:QuizQuestion[]) {
  const next=[...items];
  for(let i=next.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[next[i],next[j]]=[next[j],next[i]]}
  return next;
}

export default function Home() {
  const [workspace, setWorkspace] = useState<WorkspaceMode>("home");
  const [plane, setPlane] = useState<Plane>("coronal");
  const [position, setPosition] = useState(52);
  const [focus, setFocus] = useState<Focus>("ventricle");
  const [selectedStructure, setSelectedStructure] = useState<StructureKey>("ventricle");
  const [visibleStructures, setVisibleStructures] = useState<StructureKey[]>(["ventricle", "caudate"]);
  const [identified, setIdentified] = useState<(IdentifiedPoint & {name:string;side:string}) | null>(null);
  const [labels, setLabels] = useState(true);
  const [block, setBlock] = useState<"inside" | "ghost" | "extracted" | "segmented">("segmented");
  const [display, setDisplay] = useState<"specimen" | "diagram" | "outline">("specimen");
  const [contrast, setContrast] = useState<"t1" | "t2" | "bigbrain" | "single">("bigbrain");
  const [rotation, setRotation] = useState<Rotation>({...homeRotation});
  const [playing, setPlaying] = useState(false);
  const [drag, setDrag] = useState<{ x: number; y: number; mode:"orbit"|"roll" } | null>(null);
  const [detailsOpen,setDetailsOpen]=useState(false);
  const [legalOpen,setLegalOpen]=useState(false);
  const [feedbackOpen,setFeedbackOpen]=useState(false);
  const [surfaceView,setSurfaceView]=useState<SurfaceViewKey>("lateral");
  const [surfaceCerebellum,setSurfaceCerebellum]=useState(true);
  const [surfaceVisibleRegions,setSurfaceVisibleRegions]=useState<SurfaceRegionKey[]>(["precentral","postcentral"]);
  const [surfaceBasalLandmark,setSurfaceBasalLandmark]=useState<BasalLandmarkKey>("all");
  const [surfaceVessels,setSurfaceVessels]=useState(false);
  const [surfaceNerves,setSurfaceNerves]=useState(false);
  const [surfaceGhost,setSurfaceGhost]=useState(false);
  const [surfacePonsMedulla,setSurfacePonsMedulla]=useState(true);
  const [selectedNeurovascularStructure,setSelectedNeurovascularStructure]=useState<NeurovascularStructureKey>("ica");
  const [blockSpecimen,setBlockSpecimen]=useState<BlockSpecimenKey>("lateral-ventricle");
  const [blockLayers,setBlockLayers]=useState<string[]>(blockSpecimens["lateral-ventricle"].layers.map(layer=>layer.key));
  const [blockLayerFocus,setBlockLayerFocus]=useState("ventricular-cavity");
  const [blockCerebellum,setBlockCerebellum]=useState(true);
  const [blockPonsMedulla,setBlockPonsMedulla]=useState(true);
  const [blockViewPreset,setBlockViewPreset]=useState<BlockViewPreset|"custom">("initial");
  const [quizIndex,setQuizIndex]=useState(0);
  const [quizQueue,setQuizQueue]=useState<QuizQuestion[]>(quizQuestions.slice(0,10));
  const [quizCategory,setQuizCategory]=useState<"all"|QuizCategory>("all");
  const [quizCount,setQuizCount]=useState<5|10|15|20>(10);
  const [quizWrongOnly,setQuizWrongOnly]=useState(false);
  const [wrongTargets,setWrongTargets]=useState<QuizTargetKey[]>([]);
  const [quizChoice,setQuizChoice]=useState<QuizTargetKey|null>(null);
  const [quizScore,setQuizScore]=useState(0);
  const [quizFinished,setQuizFinished]=useState(false);
  const feedbackFormUrl=(import.meta.env.VITE_FEEDBACK_FORM_URL as string|undefined)?.trim()||"https://docs.google.com/forms/d/e/1FAIpQLSeM5Kge0Zl9Q0lCHMEP1g____uHvDZsfzjSGA0FzeT9Gf75dA/viewform";
  const sourceRepositoryUrl=(import.meta.env.VITE_SOURCE_REPOSITORY_URL as string|undefined)?.trim()||"https://github.com/bonnginn/brain-practical-navi";
  const current = structures[selectedStructure];
  const cavitySelection=selectedStructure==="ventricle"||selectedStructure==="thirdVentricle"||selectedStructure==="fourthVentricle";
  const structureKeys=Object.keys(structures) as StructureKey[];
  const visibleSet=useMemo(()=>new Set(visibleStructures),[visibleStructures]);
  const modelFocusVisible=labels&&visibleSet.has(selectedStructure)&&!!current.meshFocus&&(block==="ghost"||block==="extracted");
  const modelTag=block==="inside"?{caption:"表示",name:"脳表モデル"}:block==="segmented"?{caption:"表示",name:"分節モデル"}:{caption:"選択構造",name:modelFocusVisible?current.name:"非表示"};
  const highlightLayers=useMemo(()=>{
    if(!labels||contrast==="single")return [];
    return visibleStructures.map(key=>({ids:contrast==="bigbrain"?(structures[key].bigbrainIds??[]):structures[key].ids,color:structures[key].rgb})).filter(layer=>layer.ids.length>0);
  },[contrast,labels,visibleStructures]);
  const landmarks=landmarksByPlane[plane];
  const nearest = useMemo(() => landmarks.reduce((a, b) => Math.abs(b.p - position) < Math.abs(a.p - position) ? b : a), [plane,position]);
  const surfaceLesson=surfaceViews[surfaceView];
  const surfaceNeurovascularKind=surfaceLesson.visual==="arteries"?"arteries":surfaceLesson.visual==="nerves"?"nerves":null;
  const surfaceNeurovascular=surfaceNeurovascularKind!==null;
  const surfaceHighlightLayers=useMemo<HighlightLayer[]>(()=>surfaceVisibleRegions.map(key=>({ids:surfaceRegions[key].ids,color:surfaceRegions[key].rgb})),[surfaceVisibleRegions]);
  const specimenLesson=blockSpecimens[blockSpecimen];
  const surfaceOverlay=surfaceVessels&&surfaceNerves?"both":surfaceVessels?"vessels":surfaceNerves?"nerves":"none";
  const selectedNeurovascular=neurovascularStructures[selectedNeurovascularStructure];
  const neurovascularHighlightLayers=useMemo<HighlightLayer[]>(()=>[{ids:selectedNeurovascular.ids,color:[255,255,255]}],[selectedNeurovascular]);
  const quizQuestion=quizQueue[quizIndex]??quizQuestions[0];
  const quizEmpty=quizQueue.length===0;
  const surfaceQuiz=isSurfaceQuiz(quizQuestion);
  const sectionQuizTarget=surfaceQuiz?structures.caudate:structures[quizQuestion.target];
  const surfaceQuizTarget=surfaceQuiz?surfaceRegions[quizQuestion.target]:surfaceRegions.precentral;
  const quizTarget=surfaceQuiz?surfaceQuizTarget:sectionQuizTarget;
  const quizSource=surfaceQuiz?"CerebrA対応・試作表面ラベル":sectionQuizTarget.labelSource==="manual"?"同一格子の手動ラベル":sectionQuizTarget.labelSource==="atlas-provisional"?"位置照合済みアトラス由来":sectionQuizTarget.labelSource==="image-guided"?"画像誘導の試作ラベル":"学習用領域";
  const quizHighlight=useMemo<HighlightLayer[]>(()=>surfaceQuiz?[]:[{ids:sectionQuizTarget.bigbrainIds??[],color:sectionQuizTarget.rgb}],[sectionQuizTarget,surfaceQuiz]);
  const quizSurfaceHighlight=useMemo<HighlightLayer[]>(()=>surfaceQuiz?[{ids:surfaceQuizTarget.ids,color:surfaceQuizTarget.rgb}]:[],[surfaceQuizTarget,surfaceQuiz]);
  useEffect(() => { if (!playing) return; const timer = window.setInterval(() => setPosition(p => p >= 95 ? 5 : p + 1), 90); return () => window.clearInterval(timer); }, [playing]);
  useEffect(()=>setIdentified(null),[plane,position,contrast]);
  useEffect(()=>{setDetailsOpen(false);setPlaying(false)},[workspace]);
  useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem(QUIZ_WRONG_CACHE_KEY)??"[]");if(Array.isArray(saved))setWrongTargets(saved.filter((key):key is QuizTargetKey=>typeof key==="string"&&(key in structures||key in surfaceRegions)))}catch{/* invalid cache is ignored */}},[]);
  useEffect(()=>{const close=(event:KeyboardEvent)=>{if(event.key==="Escape"){setLegalOpen(false);setFeedbackOpen(false);setDetailsOpen(false)}};window.addEventListener("keydown",close);return()=>window.removeEventListener("keydown",close)},[]);

  function wrapAngle(value:number){return ((value+180)%360+360)%360-180}

  function beginRotation(e:PointerEvent<HTMLDivElement>){
    if((e.target as HTMLElement).closest("button"))return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({x:e.clientX,y:e.clientY,mode:e.button===2||e.shiftKey?"roll":"orbit"});
  }

  function move(e: PointerEvent<HTMLDivElement>) {
    if (!drag) return;
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    setRotation(r=>drag.mode==="roll"
      ?{...r,z:wrapAngle((r.z??0)+dx*.45-dy*.18)}
      :{...r,x:wrapAngle(r.x-dy*.42),y:wrapAngle(r.y+dx*.42)});
    if(workspace==="blocks")setBlockViewPreset("custom");
    setDrag({x:e.clientX,y:e.clientY,mode:drag.mode});
  }

  function jump(nextPlane: Plane, nextPosition?: number) {
    setPlane(nextPlane);
    if (nextPosition !== undefined) setPosition(nextPosition);
  }

  function focusStructure(key:StructureKey,ensureVisible=false){setSelectedStructure(key);if(ensureVisible)setVisibleStructures(previous=>previous.includes(key)?previous:[...previous,key]);const meshFocus=structures[key].meshFocus;if(meshFocus)setFocus(meshFocus)}
  function toggleStructure(key:StructureKey){focusStructure(key);setVisibleStructures(previous=>previous.includes(key)?previous.filter(item=>item!==key):[...previous,key])}
  function toggleGroup(members:StructureKey[]){const allVisible=members.every(key=>visibleSet.has(key));setVisibleStructures(previous=>allVisible?previous.filter(key=>!members.includes(key)):Array.from(new Set([...previous,...members])));if(!allVisible)focusStructure(members[0])}
  function identify(point:IdentifiedPoint){
    const bigbrain=point.certainty!=="atlas",name=bigbrain?(bigBrainNameById.get(point.id)??(point.id===0?"ラベルの範囲外":`未登録領域 ${point.id}`)):(atlasNameById.get(point.id)??(point.id===0?"アトラス領域外":`未登録領域 ${point.id}`)),side=bigbrain||point.id===0||point.id>=200?"":point.id>=52?"左":"右";
    setIdentified({...point,name,side});
    const match=structureKeys.find(key=>(bigbrain?structures[key].bigbrainIds:structures[key].ids)?.includes(point.id));if(match)focusStructure(match,true);
  }

  function chooseSurface(key:SurfaceViewKey){const next=surfaceViews[key];setSurfaceView(key);setRotation(next.rotation);setSurfaceVisibleRegions(surfaceViewRegions[key].slice(0,2));setSurfaceGhost(false);setSurfacePonsMedulla(true);if(key==="inferior")setSurfaceBasalLandmark("all");if(key==="arteries"){setSurfaceVessels(true);setSurfaceNerves(false);setSurfaceCerebellum(true);setSelectedNeurovascularStructure("ica")}else if(key==="cranialNerves"){setSurfaceVessels(false);setSurfaceNerves(true);setSurfaceCerebellum(false);setSelectedNeurovascularStructure("cn1")}else{setSurfaceVessels(false);setSurfaceNerves(false)}}
  function toggleSurfaceRegion(key:SurfaceRegionKey){setSurfaceVisibleRegions(previous=>previous.includes(key)?previous.filter(item=>item!==key):[...previous,key])}
  function blockPresetRotation(preset:BlockViewPreset):Rotation{const initial=blockInitialRotations[blockSpecimen];if(preset==="opposite")return{...initial,y:wrapAngle(initial.y+180)};if(preset==="superior")return{x:-82,y:0,z:0};if(preset==="inferior")return{x:82,y:0,z:0};return{...initial}}
  function chooseBlockView(preset:BlockViewPreset){setBlockViewPreset(preset);setRotation(blockPresetRotation(preset))}
  function chooseBlock(key:BlockSpecimenKey){const next=blockSpecimens[key];setBlockSpecimen(key);setBlockLayers(next.layers.map(layer=>layer.key));setBlockLayerFocus(next.layers[0]?.key??"");setRotation({...blockInitialRotations[key]});setBlockViewPreset("initial");setBlockPonsMedulla(true);setBlockCerebellum(true)}
  function toggleBlockLayer(key:string){setBlockLayerFocus(key);setBlockLayers(previous=>previous.includes(key)?previous.filter(item=>item!==key):[...previous,key])}
  function chooseNeurovascularStructure(key:NeurovascularStructureKey){const item=neurovascularStructures[key];setSelectedNeurovascularStructure(key);if(item.kind==="arteries")setSurfaceVessels(true);else setSurfaceNerves(true)}
  function openWorkspace(key:WorkspaceMode){setWorkspace(key);if(key==="home")setRotation({...homeRotation});if(key==="sections")setRotation({x:-7,y:-18,z:0});if(key==="surface")setRotation(surfaceViews[surfaceView].rotation);if(key==="blocks"){setRotation({...blockInitialRotations[blockSpecimen]});setBlockViewPreset("initial")}}
  function saveWrongTargets(next:QuizTargetKey[]){setWrongTargets(next);try{localStorage.setItem(QUIZ_WRONG_CACHE_KEY,JSON.stringify(next))}catch{/* private browsing may block storage */}}
  function startQuiz(){let candidates=quizQuestions.filter(question=>quizCategory==="all"||question.category===quizCategory);if(quizWrongOnly)candidates=candidates.filter(question=>wrongTargets.includes(question.target));setQuizQueue(shuffledQuestions(candidates).slice(0,quizCount));setQuizIndex(0);setQuizChoice(null);setQuizScore(0);setQuizFinished(false)}
  function answerQuiz(key:QuizTargetKey){if(quizChoice||quizEmpty)return;setQuizChoice(key);const correct=key===quizQuestion.target;if(correct){setQuizScore(score=>score+1);if(wrongTargets.includes(quizQuestion.target))saveWrongTargets(wrongTargets.filter(target=>target!==quizQuestion.target))}else if(!wrongTargets.includes(quizQuestion.target))saveWrongTargets([...wrongTargets,quizQuestion.target])}
  function nextQuiz(){if(quizIndex>=quizQueue.length-1){setQuizChoice(null);setQuizFinished(true);return}setQuizChoice(null);setQuizIndex(index=>index+1)}
  function resetQuiz(){setQuizIndex(0);setQuizChoice(null);setQuizScore(0);setQuizFinished(false)}
  function retryQuiz(){setQuizQueue(previous=>shuffledQuestions(previous));resetQuiz()}
  function restoreAllQuiz(){setQuizWrongOnly(false);setQuizCategory("all");setQuizQueue(shuffledQuestions(quizQuestions).slice(0,quizCount));resetQuiz()}
  function resetWrongHistory(){saveWrongTargets([]);if(quizWrongOnly){setQuizQueue([]);resetQuiz()}}

  return <main className={`appShell ${workspace==="home"?"homeShell":""}`}>
    <header className="topbar">
      <a className="brand" href="#workspace" onClick={()=>openWorkspace("home")}><span className="brandMark">脳</span><span>脳実習ナビ<small>脳解剖実習 学習補助アプリ</small></span></a>
      <nav className="modeSwitch workspaceSwitch" aria-label="教材を選択">
        {workspaceModes.map(item=><button key={item.key} className={workspace===item.key?"active":""} onClick={()=>openWorkspace(item.key)}><span>{item.label}</span><i>{item.sub}</i></button>)}
      </nav>
      <div className="topActions"><span>α版・非営利教育用</span><button className="feedbackButton" onClick={()=>setFeedbackOpen(true)}>意見・共同制作</button><button className="legalButton" onClick={()=>setLegalOpen(true)}>CC・権利</button></div>
    </header>

    <aside className={`leftRail rail-${workspace}`}>
      {workspace==="sections"&&<>
        <p className="eyebrow">CUTTING PLANE</p>
        {(Object.keys(planeData) as Plane[]).map((p, i) => <button key={p} className={`planeBtn ${plane === p ? "active" : ""}`} onClick={() => jump(p)}><span>0{i + 1}</span><b>{planeData[p].ja}</b><small>{planeData[p].en}</small></button>)}
        <div className="railLine"/>
        <p className="eyebrow structureHeading">FOCUS STRUCTURE <small>複数選択</small></p>
        <div className="structureGroupGrid" aria-label="構造グループの一括表示">
          {structureGroups.map(group=>{const count=group.members.filter(key=>visibleSet.has(key)).length,all=count===group.members.length;return <button key={group.key} className={`${all?"active":""} ${count>0&&!all?"partial":""}`} aria-pressed={all} onClick={()=>toggleGroup(group.members)}><i style={{background:group.color}}/><span>{group.name}</span><small>{count}/{group.members.length}</small></button>})}
        </div>
        <button className="clearStructures" onClick={()=>setVisibleStructures([])} disabled={visibleStructures.length===0}>すべて解除</button>
        {structureKeys.map(key => <button key={key} aria-pressed={visibleSet.has(key)} className={`structureBtn ${visibleSet.has(key) ? "active" : ""} ${selectedStructure === key ? "current" : ""}`} onClick={() => toggleStructure(key)}><i style={{background: structures[key].color}}/><span>{structures[key].name}</span><strong>{visibleSet.has(key)?"✓":"＋"}</strong></button>)}
      </>}
      {workspace==="surface"&&<>
        <p className="eyebrow">SURFACE VIEW</p>
        {(Object.keys(surfaceViews) as SurfaceViewKey[]).map((key,i)=><button key={key} className={`planeBtn lessonRailBtn ${surfaceView===key?"active":""}`} onClick={()=>chooseSurface(key)}><span>0{i+1}</span><b>{surfaceViews[key].name}</b><small>{surfaceViews[key].en}</small></button>)}
        <div className="railLine"/><p className="railMemo">講義資料の課題スケッチにある外側面・上面・下面・内側面の観察項目を整理しています。</p>
      </>}
      {workspace==="blocks"&&<>
        <p className="eyebrow">SPECIMEN BLOCK</p>
        {(Object.keys(blockSpecimens) as BlockSpecimenKey[]).map((key,i)=><button key={key} className={`planeBtn lessonRailBtn ${blockSpecimen===key?"active":""}`} onClick={()=>chooseBlock(key)}><span>0{i+1}</span><b>{blockSpecimens[key].name}</b><small>{blockSpecimens[key].en}</small></button>)}
        <div className="railLine"/><p className="railMemo">「切り離した途端に位置関係が分からない」を避けるため、全脳の中での位置を残したまま観察します。</p>
      </>}
      {workspace==="quiz"&&<>
        <p className="eyebrow">REVIEW QUIZ</p>
        <div className="quizRailScore"><strong>{quizEmpty?"00":String(quizFinished?quizQueue.length:quizIndex+1).padStart(2,"0")}</strong><span>/ {quizQueue.length}</span><small>{quizFinished?`完了・正答 ${quizScore}`:`正答 ${quizScore}`}</small></div>
        <div className="quizRailDots">{quizQueue.map((_,i)=><i key={i} className={quizFinished||i<quizIndex?"done":i===quizIndex?"current":""}/>)}</div>
        <div className="quizSetup"><label><span>出題項目</span><select value={quizCategory} onChange={event=>setQuizCategory(event.target.value as "all"|QuizCategory)}>{quizCategories.map(category=><option key={category.key} value={category.key}>{category.label}</option>)}</select></label><div><span>問題数</span><div className="quizCountButtons">{([5,10,15,20] as const).map(count=><button key={count} className={quizCount===count?"active":""} onClick={()=>setQuizCount(count)}>{count}</button>)}</div></div><label className="wrongOnlyToggle"><input type="checkbox" checked={quizWrongOnly} onChange={event=>setQuizWrongOnly(event.target.checked)}/><span>間違った問題のみ</span><b>{wrongTargets.length}</b></label><button className="quizStart" onClick={startQuiz}>この条件で出題</button></div>
        <button className="railReset" onClick={resetQuiz} disabled={quizEmpty}>今回を最初から</button><button className="historyReset" onClick={resetWrongHistory} disabled={wrongTargets.length===0}>間違い履歴を消去</button>
      </>}
      {workspace==="segment"&&<><p className="eyebrow">SEGMENTATION</p><div className="segRailIntro"><b>差分編集</b><p>元データを直接変更せず、修正したボクセルだけをJSONへ保存します。</p><ol><li>水平断を選ぶ</li><li>構造とブラシを選ぶ</li><li>境界を修正する</li><li>JSONをPRへ添付</li></ol></div><div className="railLine"/><p className="railMemo">共同制作者向けのα機能です。公式ラベルへの統合には、別のレビューと変換処理が必要です。</p></>}
    </aside>

    {workspace==="home"&&<section className="homeArea" id="workspace">
      <div className="homeHero">
        <div className="homeIntro">
          <div className="homeBadges"><span>OPEN ALPHA</span><b>非営利教育用</b></div>
          <p className="homeEyebrow">BRAIN PRACTICAL LEARNING</p>
          <h1>脳実習を、<br/><em>切る前から立体で。</em></h1>
          <p className="homeLead">単一標本の連続断面と3Dモデルを行き来しながら、断面の見え方、脳表、局所標本の位置関係を日本語で学ぶ実習補助アプリです。</p>
          <div className="homeActions"><button onClick={()=>openWorkspace("sections")}>断面実習を始める <b>→</b></button><button onClick={()=>openWorkspace("surface")}>3D脳表を見る</button></div>
          <div className="homeMetrics"><div><b>3</b><span>連続断面<br/>冠状・水平・矢状</span></div><div><b>6</b><span>脳表観察<br/>神経・血管を含む</span></div><div><b>8</b><span>局所標本<br/>部品を着脱可能</span></div></div>
        </div>
        <div className="homeModelStage modelStage" onPointerDown={beginRotation} onPointerMove={move} onPointerUp={()=>setDrag(null)} onPointerCancel={()=>setDrag(null)} onContextMenu={event=>event.preventDefault()}>
          <AtlasVolumeCanvas kind="surface" plane="sagittal" position={50} focus="thalamus" display="specimen" rotation={rotation} view="segmented" contrast="bigbrain" showFocus={false} showCutPlane={false}/>
          <div className="homeModelLabel"><span>INTERACTIVE 3D</span><b>全脳分節モデル</b><small>ドラッグで回転・ホイールで拡大</small></div>
          <div className="orientation"><b>S</b><i/><b>I</b><span><b>A</b><i/><b>P</b></span></div>
        </div>
      </div>
      <div className="homeModeGrid" aria-label="学習メニュー">
        <button onClick={()=>openWorkspace("sections")}><i>01</i><span><b>断面実習</b><small>0.5 mm単一標本を連続して追い、複数構造を同時に同定</small></span><em>→</em></button>
        <button onClick={()=>openWorkspace("surface")}><i>02</i><span><b>脳表観察</b><small>脳回・脳神経・脳底動脈を回転可能な3Dで確認</small></span><em>→</em></button>
        <button onClick={()=>openWorkspace("blocks")}><i>03</i><span><b>ブロック標本</b><small>脳室・辺縁系・投射線維などを局所標本として分解</small></span><em>→</em></button>
        <button onClick={()=>openWorkspace("quiz")}><i>04</i><span><b>復習クイズ</b><small>項目・問題数・間違い履歴を指定して構造同定を復習</small></span><em>→</em></button>
      </div>
      <footer className="homeFooter"><p><b>公開α版</b> 解剖学的誤りや使いにくさの指摘を受けながら改善します。診断・治療・手術計画には使用できません。</p><div><button onClick={()=>setFeedbackOpen(true)}>意見・共同制作</button><a href={sourceRepositoryUrl} target="_blank" rel="noreferrer">GitHub</a><button onClick={()=>setLegalOpen(true)}>CC・権利</button></div></footer>
    </section>}

    {workspace==="sections"&&<section className="workArea" id="workspace">
      <div className="visualGrid"><section className="slicePanel">
        <div className="panelHead"><div><b>{planeData[plane].ja}</b><small>位置 {position}{contrast === "bigbrain" ? "・単一標本脳 0.5 mm（同一格子で検証済み）" : contrast === "single" ? "・単一固定脳 MRI 0.44 mm（画像参照）" : "・平均標準脳"}</small></div><div className="sliceTools"><div className="contrastSwitch" aria-label="断面画像ソース"><button className={contrast === "bigbrain" ? "active" : ""} onClick={() => setContrast("bigbrain")}>単一標本 0.5</button><button className={contrast === "single" ? "active" : ""} onClick={() => setContrast("single")}>固定脳MRI 0.44</button><button className={contrast === "t1" ? "active" : ""} onClick={() => setContrast("t1")}>平均T1</button><button className={contrast === "t2" ? "active" : ""} onClick={() => setContrast("t2")}>T2</button></div><div className="displaySwitch"><button className={display === "specimen" ? "active" : ""} onClick={() => setDisplay("specimen")}>実習標本調</button><button className={display === "diagram" ? "active" : ""} onClick={() => setDisplay("diagram")}>学習図</button><button className={display === "outline" ? "active" : ""} onClick={() => setDisplay("outline")}>輪郭</button></div><label className="labelToggle compactToggle"><input type="checkbox" checked={labels} onChange={e => setLabels(e.target.checked)}/><span/>構造表示</label></div></div>
        <div className={`sliceStage ${plane} ${sliceVariant(position)}`}>
          <div className="sliceViewport">
            <AtlasVolumeCanvas kind="slice" plane={plane} position={position} focus={focus} display={display} rotation={rotation} contrast={contrast} highlights={highlightLayers} onIdentify={contrast==="single"?undefined:identify} onViewChange={()=>setIdentified(null)}/>
            <div className={`identifyHint ${contrast==="single"?"unavailable":""}`}><b>{contrast==="single"?"ホイールで拡大縮小":"クリックで同定・ホイールで拡大"}</b><span>{contrast==="bigbrain"?"0.5 mm格子・Shiftドラッグで移動":contrast==="single"?"画像参照・Shiftドラッグで移動":"アトラス対応・Shiftドラッグで移動"}</span></div>
            {identified&&<div className={`identifyMarker ${identified.id===0?"outside":""}`} style={{left:`clamp(88px, ${identified.x}px, calc(100% - 88px))`,top:`clamp(70px, ${identified.y}px, calc(100% - 18px))`}}><i/><b>{labels?`${identified.side}${identified.name}`:"？"}</b><small>{identified.certainty==="atlas"?"ATLAS":identified.certainty==="manual"?"MANUAL":"PILOT"}</small></div>}
          </div>
          <aside className="modelInset" aria-label="全脳で切断位置を確認">
            <div className="insetHead"><div><b>全脳モデル</b><small>{contrast==="single"?"別個体MRIのため切断位置は概略":block==="ghost"?"透過脳表で内部構造を確認":block==="segmented"?"不透明な分節モデルで切断位置を確認":"不透明な脳表で切断位置を確認"}</small></div><span>{planeData[plane].en.slice(0,3)} {position}</span></div>
            <div className="modelStage insetStage" onPointerDown={beginRotation} onPointerMove={move} onPointerUp={()=>setDrag(null)} onPointerCancel={()=>setDrag(null)} onContextMenu={event=>event.preventDefault()}>
              <AtlasVolumeCanvas kind="surface" plane={plane} position={position} focus={focus} display={display} rotation={rotation} view={block} contrast={contrast} showFocus={modelFocusVisible}/>
              <div className="modelFocusTag"><i style={{background:modelFocusVisible?current.color:"#aeb8bb"}}/><span>{modelTag.caption}</span><b>{modelTag.name}</b></div>
              <div className="orientation"><b>S</b><i/><b>I</b><span><b>A</b><i/><b>P</b></span></div>
              <div className="blockControls"><button className={block === "segmented" ? "active" : ""} onClick={e => {e.stopPropagation();setBlock("segmented")}}>分節</button><button className={block === "inside" ? "active" : ""} onClick={e => {e.stopPropagation();setBlock("inside")}}>脳表</button><button className={block === "ghost" ? "active" : ""} onClick={e => {e.stopPropagation();setBlock("ghost")}}>透過</button><button className={block === "extracted" ? "active" : ""} onClick={e => {e.stopPropagation();setBlock("extracted")}}>切断</button></div>
            </div>
          </aside>
        </div>
        <section className="timeline sliceTimeline">
          <div className="timelineHead"><button className={`playButton ${playing ? "active" : ""}`} onClick={() => setPlaying(!playing)} aria-label={playing ? "連続断面を停止" : "連続断面を再生"}>{playing ? "Ⅱ" : "▶"}</button><div><span>{planeData[plane].from}</span><b>{planeData[plane].axis}</b><span>{planeData[plane].to}</span></div><output>{position}</output></div>
          <div className="rangeWrap"><input aria-label={`${planeData[plane].ja}の${planeData[plane].axis}`} type="range" min="0" max="100" value={position} onChange={e => {setPlaying(false);setPosition(Number(e.target.value))}} onKeyDown={e => {if(e.key==="ArrowLeft"||e.key==="ArrowRight")setPlaying(false)}}/>{landmarks.map(mark => <button key={mark.p} className={`${Math.abs(mark.p-position)<5 ? "active" : ""} ${mark.row===1?"level1":""}`} style={{left:`${mark.p}%`}} onClick={() => setPosition(mark.p)} aria-label={`${planeData[plane].ja}：${mark.label}`}><i/><span>{mark.short}</span></button>)}</div>
          <p><b>{planeData[plane].ja}の目安：{nearest.label}</b> に近い位置です。目印をクリックすると、その断面へ移動します。</p>
        </section>
        <div className="selectedStructureBar"><span style={{background:current.color}}/><div><small>{visibleStructures.length}構造を同時表示中</small><b>{current.name}</b></div><p>{labels?(contrast==="bigbrain"?(cavitySelection?"脳実質を避け、腔の範囲だけを塗りつぶし":current.labelSource==="manual"?"同一格子の手動ラベル":current.labelSource==="image-guided"?"画像誘導の試作ラベル":current.labelSource==="atlas-provisional"?"位置照合済みアトラスの試作ラベル":"この構造は未収録"):contrast==="single"?"固定脳MRIでは未検証ラベルを表示しません":"アトラス領域を表示中"):"解答を隠しています"}</p><div className="selectedBarActions"><button className="detailToggle" onClick={()=>setDetailsOpen(true)}>解説</button><button onClick={()=>setLabels(!labels)} disabled={contrast==="single"}>{labels?"隠す":"表示"}</button></div></div>
      </section></div>
    </section>}

    {workspace==="surface"&&<section className="workArea learningArea" id="workspace">
      <div className="workHead"><div><span className="eyebrow">SURFACE PRACTICAL</span><h1>脳表観察</h1></div><span className="sourceBadge">講義到達目標から再構成</span></div>
      <div className="learningGrid">
        <section className="learningModelCard"><div className="panelHead"><div><b>{surfaceLesson.name}</b><small>{surfaceLesson.en}・ドラッグで回転</small></div>{surfaceNeurovascular?<span>ALIGNED 3D OVERLAY · PILOT</span>:<div className="panelActions"><button className={surfaceCerebellum?"active":""} aria-pressed={surfaceCerebellum} onClick={()=>setSurfaceCerebellum(value=>!value)}>{surfaceCerebellum?"小脳を外す":"小脳を戻す"}</button><span>{surfaceVisibleRegions.length} REGIONS</span></div>}</div>
          <div className="learningModelStage modelStage" onPointerDown={beginRotation} onPointerMove={move} onPointerUp={()=>setDrag(null)} onPointerCancel={()=>setDrag(null)} onContextMenu={event=>event.preventDefault()}>
            <AtlasVolumeCanvas kind="surface" plane="sagittal" position={50} focus="thalamus" display="specimen" rotation={rotation} view={surfaceNeurovascular&&surfaceGhost?"ghost":"inside"} contrast="bigbrain" showFocus={false} showCutPlane={false} hemisphere={surfaceLesson.hemisphere} showCerebellum={surfaceCerebellum} showPonsMedulla={surfacePonsMedulla} surfaceHighlights={surfaceNeurovascular?[]:surfaceHighlightLayers} neurovascularOverlay={surfaceNeurovascular?surfaceOverlay:"none"} neurovascularHighlights={surfaceNeurovascular?neurovascularHighlightLayers:[]} showBasalLandmarks={surfaceView==="inferior"||surfaceNeurovascular} basalLandmark={surfaceView==="cranialNerves"?"hypothalamic":surfaceView==="inferior"?surfaceBasalLandmark:"all"}/>
            {surfaceNeurovascular&&<div className="neurovascularControls specimenPartControls" aria-label="脳表・神経血管レイヤー"><button className={surfaceVessels?"active vessels":""} aria-pressed={surfaceVessels} onClick={()=>setSurfaceVessels(value=>!value)}><i/>血管</button><button className={surfaceNerves?"active nerves":""} aria-pressed={surfaceNerves} onClick={()=>setSurfaceNerves(value=>!value)}><i/>脳神経</button><button className={surfaceCerebellum?"active":""} aria-pressed={surfaceCerebellum} onClick={()=>setSurfaceCerebellum(value=>!value)}>{surfaceCerebellum?"小脳を外す":"小脳を戻す"}</button><button className={surfacePonsMedulla?"active":""} aria-pressed={surfacePonsMedulla} onClick={()=>setSurfacePonsMedulla(value=>!value)}>{surfacePonsMedulla?"橋・延髄を外す":"橋・延髄を戻す"}</button><button className={surfaceGhost?"active":""} aria-pressed={surfaceGhost} onClick={()=>setSurfaceGhost(value=>!value)}>{surfaceGhost?"脳表を戻す":"脳表を透過"}</button></div>}
            {surfaceNeurovascular&&<div className="neurovascularLegend"><span><i className="arterialAnterior"/>内頸動脈系</span><span><i className="arterialPosterior"/>椎骨脳底系</span><span><i className="nerveAnterior"/>I–IV</span><span><i className="nervePontine"/>V–VIII</span><span><i className="nerveMedullary"/>IX–XII</span></div>}
            <div className="modelLegend"><span>{surfaceNeurovascular?"全脳＋模式3D":surfaceView==="inferior"?"脳表＋模式脳底ランドマーク":"CerebrA対応・試作表面ラベル"}</span><b>{surfaceNeurovascular?selectedNeurovascular.name:surfaceLesson.name}</b><small>{surfaceNeurovascular?(surfaceGhost?"選択構造を白色強調・透過脳表":"選択構造を白色強調"):surfaceView==="inferior"?basalLandmarks[surfaceBasalLandmark].name:surfaceVisibleRegions.length?surfaceVisibleRegions.map(key=>surfaceRegions[key].name).join("・"):"色分けなし"}</small></div><div className="orientation"><b>S</b><i/><b>I</b><span><b>A</b><i/><b>P</b></span></div>
          </div>
        </section>
        <aside className="learningGuide"><span className="guideIndex">観察 0{(Object.keys(surfaceViews) as SurfaceViewKey[]).indexOf(surfaceView)+1}</span><h2>{surfaceLesson.name}</h2><p>{surfaceLesson.intro}</p><h3>同定チェック</h3><ol>{surfaceLesson.structures.map((item,i)=><li key={item}><i>{String(i+1).padStart(2,"0")}</i><span>{item}</span></li>)}</ol>{surfaceView==="inferior"&&<div className="basalLandmarkPicker"><header><b>脳底ランドマーク</b><small>選択部を明るく、その他を薄く表示</small></header><div>{basalLandmarkKeys.map(key=>{const item=basalLandmarks[key],active=key===surfaceBasalLandmark;return <button key={key} className={active?"active":""} aria-pressed={active} onClick={()=>setSurfaceBasalLandmark(key)}><span>{item.name}<small>{item.latin}</small></span><b>{active?"表示中":"表示"}</b></button>})}</div><p><b>{basalLandmarks[surfaceBasalLandmark].name}</b>{basalLandmarks[surfaceBasalLandmark].note}</p><em>下垂体そのものは表示せず、実標本で残りうる漏斗・茎の位置を示します。</em></div>}{surfaceNeurovascular?<div className="neurovascularPicker"><header><b>個別に同定</b><small>選択した管・神経根を白色で強調</small></header><div>{neurovascularStructureKeys.filter(key=>neurovascularStructures[key].kind===surfaceNeurovascularKind).map(key=>{const item=neurovascularStructures[key],active=key===selectedNeurovascularStructure;return <button key={key} className={active?"active":""} aria-pressed={active} onClick={()=>chooseNeurovascularStructure(key)}><span>{item.name}<small>{item.latin}</small></span><b>{active?"表示中":"表示"}</b></button>})}</div><p><b>{selectedNeurovascular.name}</b>{selectedNeurovascular.note}</p></div>:<div className="surfaceRegionPicker"><header><div><b>脳回を色づける</b><small>複数選択</small></div><button onClick={()=>setSurfaceVisibleRegions([])} disabled={surfaceVisibleRegions.length===0}>すべて解除</button></header><div>{surfaceViewRegions[surfaceView].map(key=>{const region=surfaceRegions[key],active=surfaceVisibleRegions.includes(key);return <button key={key} className={active?"active":""} aria-pressed={active} onClick={()=>toggleSurfaceRegion(key)}><i style={{background:region.color}}/><span>{region.name}<small>{region.latin}</small></span><b>{active?"✓":"＋"}</b></button>})}</div></div>}<div className={`accuracyNote ${surfaceNeurovascular?"warning":""}`}><b>{surfaceNeurovascular?"模式3Dの範囲":"ラベルの範囲"}</b><p>{surfaceNeurovascular?surfaceLesson.caution:"CerebrAを高密度表面へ法線方向±3 mm以内で対応させた試作表示です。左右各163,842頂点の93.6%を被覆しますが、手動の脳表正解ラベルではありません。"}</p></div></aside>
      </div>
    </section>}

    {workspace==="blocks"&&<section className="workArea learningArea" id="workspace">
      <div className="workHead"><div><span className="eyebrow">LOCAL SPECIMEN</span><h1>標本観察</h1></div><span className="sourceBadge">目的構造ごとに周囲を局所切り出し</span></div>
      <div className="learningGrid">
        <section className="learningModelCard"><div className="panelHead"><div><b>{specimenLesson.name}</b><small>{specimenLesson.en}・ドラッグで自由回転／Shift・右ドラッグで傾き</small></div><span>SPECIMEN + SELECTABLE PARTS</span></div>
          <div className="learningModelStage modelStage" onPointerDown={beginRotation} onPointerMove={move} onPointerUp={()=>setDrag(null)} onPointerCancel={()=>setDrag(null)} onContextMenu={event=>event.preventDefault()}>
            <AtlasVolumeCanvas key={blockSpecimen} kind="surface" plane={specimenLesson.plane} position={specimenLesson.position} focus={specimenLesson.focus} display="specimen" rotation={rotation} view="inside" contrast="bigbrain" showFocus={false} showCutPlane={false} showCerebellum={blockCerebellum} showPonsMedulla={blockPonsMedulla} specimenBlock={blockSpecimen} specimenLayers={blockLayers}/>
            {blockSpecimen==="hindbrain"&&<div className="neurovascularControls specimenPartControls" aria-label="標本3Dレイヤー"><button className={blockCerebellum?"active":""} aria-pressed={blockCerebellum} onClick={()=>setBlockCerebellum(value=>!value)}>{blockCerebellum?"小脳を外す":"小脳を戻す"}</button><button className={blockPonsMedulla?"active":""} aria-pressed={blockPonsMedulla} onClick={()=>setBlockPonsMedulla(value=>!value)}>{blockPonsMedulla?"橋・延髄を外す":"橋・延髄を戻す"}</button></div>}
            <div className="specimenViewControls" aria-label="標本の視点"><span>VIEW</span>{(["initial","opposite","superior","inferior"] as BlockViewPreset[]).map(preset=><button key={preset} className={blockViewPreset===preset?"active":""} aria-pressed={blockViewPreset===preset} onClick={()=>chooseBlockView(preset)}>{blockViewLabels[preset]}</button>)}</div>
            <div className="specimenRotationHint"><b>ドラッグ</b> 自由回転 <i/> <b>Shift・右ドラッグ</b> 傾き</div>
            <div className="modelLegend"><span>0.5 mm標本組織＋構造レイヤー</span><b>{specimenLesson.name}</b><small>{specimenLesson.layers.length?`${blockLayers.length} / ${specimenLesson.layers.length} 部品を表示中`:"橋・延髄と小脳を脱着可能"}</small></div><div className="orientation"><b>S</b><i/><b>I</b><span><b>A</b><i/><b>P</b></span></div>
          </div>
        </section>
        <aside className="learningGuide"><span className="guideIndex">SPECIMEN 0{(Object.keys(blockSpecimens) as BlockSpecimenKey[]).indexOf(blockSpecimen)+1}</span><h2>{specimenLesson.name}</h2><p>{specimenLesson.intro}</p>{specimenLesson.layers.length>0&&<div className="specimenLayerPicker"><header><div><b>標本の部品</b><small>複数を同時に表示できます</small></div><button onClick={()=>setBlockLayers(specimenLesson.layers.map(layer=>layer.key))} disabled={blockLayers.length===specimenLesson.layers.length}>すべて表示</button></header><div>{specimenLesson.layers.map(layer=>{const active=blockLayers.includes(layer.key);return <button key={layer.key} className={active?"active":""} aria-pressed={active} onClick={()=>toggleBlockLayer(layer.key)}><i style={{background:layer.color}}/><span>{layer.name}<small>{layer.latin}</small></span><em>{layer.source}</em><b>{active?"✓":"＋"}</b></button>})}</div><p>{specimenLesson.layers.find(layer=>layer.key===blockLayerFocus)?.note??"色レイヤーはすべて非表示です。標本組織だけを回転して観察できます。"}</p><footer><span><i/>標本分節・試作分節</span><span><i/>模式補助・位置目安</span></footer></div>}<h3>この標本で追う構造</h3><ol>{specimenLesson.observe.map((item,i)=><li key={item}><i>{String(i+1).padStart(2,"0")}</i><span>{item}</span></li>)}</ol><div className="accuracyNote warning"><b>標本由来と模式補助</b><p>{specimenLesson.caution}</p></div></aside>
      </div>
    </section>}

    {workspace==="quiz"&&<section className="workArea quizArea" id="workspace">
      <div className="workHead"><div><span className="eyebrow">IDENTIFICATION QUIZ</span><h1>復習クイズ</h1></div><span className="sourceBadge">色で示した構造を同定</span></div>
      {quizFinished?<div className="quizEmptyState quizResultState" role="status" aria-live="polite"><span>QUIZ COMPLETE</span><h2>{quizScore} / {quizQueue.length} 問正解</h2><p>{quizScore===quizQueue.length?"全問正解です。別の項目へ進むか、同じ問題を順番を変えて再確認できます。":"間違えた問題は端末内に保存しました。左の「間違った問題のみ」から再出題できます。"}</p><div><button onClick={retryQuiz}>同じ問題を再挑戦</button><button onClick={startQuiz}>この条件で新しく出題</button></div></div>:quizEmpty?<div className="quizEmptyState" role="status"><span>REVIEW CACHE</span><h2>{quizWrongOnly?"この条件の間違い履歴はありません":"出題できる問題がありません"}</h2><p>{quizWrongOnly?"一度間違えた問題は端末に保存されます。別の項目を選ぶか、「間違った問題のみ」を解除してください。":"出題項目または問題数を変更してください。"}</p><button onClick={restoreAllQuiz}>全問題で出題を再開</button></div>:<div className="quizWorkspace">
        <section className="quizImageCard"><div className="panelHead"><div><b>問題 {quizIndex+1}</b><small>{surfaceQuiz?`${surfaceViews[quizQuestion.view].name}・高密度脳表モデル`:`${planeData[quizQuestion.plane].ja}・位置 ${quizQuestion.position}・単一標本脳 0.5 mm`}</small></div><span>SCROLL TO ZOOM</span></div><div className="quizImageStage">{surfaceQuiz?<AtlasVolumeCanvas kind="surface" plane="sagittal" position={50} focus="thalamus" display="specimen" rotation={surfaceViews[quizQuestion.view].rotation} view="inside" contrast="bigbrain" showFocus={false} showCutPlane={false} hemisphere={surfaceViews[quizQuestion.view].hemisphere} showCerebellum={true} surfaceHighlights={quizSurfaceHighlight}/>:<AtlasVolumeCanvas kind="slice" plane={quizQuestion.plane} position={quizQuestion.position} focus={sectionQuizTarget.meshFocus??"thalamus"} display="specimen" rotation={rotation} contrast="bigbrain" highlights={quizHighlight}/>}<div className="quizTargetTag"><i style={{background:quizTarget.color}}/><span><b>この色の構造は？</b><small>{quizSource}</small></span></div></div></section>
        <aside className="quizQuestionCard"><span className="guideIndex">QUESTION {String(quizIndex+1).padStart(2,"0")} / {quizQueue.length}</span><h2>{quizQuestion.prompt}</h2><div className="quizOptions">{quizQuestion.options.map((key,i)=>{const correct=key===quizQuestion.target,chosen=quizChoice===key,option=surfaceQuiz?surfaceRegions[key as SurfaceRegionKey]:structures[key as StructureKey];return <button key={key} className={quizChoice?(correct?"correct":chosen?"wrong":"muted"):""} onClick={()=>answerQuiz(key)} disabled={!!quizChoice}><i>{String.fromCharCode(65+i)}</i><span>{option.name}<small>{option.latin}</small></span>{quizChoice&&correct&&<b>正解</b>}{quizChoice&&chosen&&!correct&&<b>選択</b>}</button>})}</div>{quizChoice&&<div className={`quizFeedback ${quizChoice===quizQuestion.target?"correct":"wrong"}`} role="status" aria-live="polite"><b>{quizChoice===quizQuestion.target?"正解です":"もう一度位置関係を確認"}</b><p>{surfaceQuiz?surfaceQuizTarget.note:`${sectionQuizTarget.relation}。${sectionQuizTarget.note}`}</p><button onClick={nextQuiz}>{quizIndex===quizQueue.length-1?"結果を見る":"次の問題へ"} →</button></div>}<div className="quizScoreLine"><span>現在の正答</span><b>{quizScore}</b><small>/ {quizChoice?quizIndex+1:quizIndex}</small></div></aside>
      </div>}
    </section>}

    {workspace==="segment"&&<section className="workArea segmentationArea" id="workspace">
      <div className="workHead"><div><span className="eyebrow">MANUAL SEGMENTATION · ALPHA</span><h1>セグメンテーション編集</h1></div><span className="sourceBadge">0.5 mm単一標本・水平断中心</span></div>
      <ManualSegmentationWorkbench/>
    </section>}

    {workspace==="sections"&&detailsOpen&&<button className="inspectorBackdrop" aria-label="解説を閉じる" onClick={()=>setDetailsOpen(false)}/>}
    {workspace==="sections"&&detailsOpen&&<aside className="inspector open">
      <div className="inspectorTop"><div className="inspectIndex"><span>STRUCTURE GUIDE</span><b>{String(structureKeys.indexOf(selectedStructure)+1).padStart(2,"0")} / {structureKeys.length}</b></div><button className="inspectorClose" onClick={()=>setDetailsOpen(false)} aria-label="解説を閉じる">×</button></div>
      <div className="structureColor" style={{background:current.color}}/>
      <h2>{current.name}</h2><em>{current.latin}</em>
      <div className="rule"/><h3>主な役割</h3><p>{structureFunctions[selectedStructure]}</p>
      <h3>この断面で見ること</h3><p>{current.note}</p>
      <dl><div><dt>位置関係</dt><dd>{current.relation}</dd></div><div><dt>現在の断面</dt><dd>{planeData[plane].ja}・位置 {position}</dd></div><div><dt>近い指標</dt><dd>{nearest.label}</dd></div></dl>
      <div className="identifyCard"><span>クリック同定</span>{contrast==="single"?<><b>画像参照モード</b><small>座標未確認のラベルは重ねません。照合済みの「単一標本 0.5」を選択してください。</small></>:identified?<><b>{labels?`${identified.side}${identified.name}`:"解答非表示"}</b><small>{identified.certainty==="atlas"?"CerebAアトラス対応":identified.certainty==="manual"?"画像と同一格子のBigBrain手動ラベル":"位置照合または画像誘導による試作ラベル"}</small></>:<><b>断面上をクリック</b><small>指した場所の構造名を表示します。ホイールで拡大縮小できます。</small></>}</div>
      <div className="continuity"><span>連続性</span><div><i style={{width:`${Math.max(18, 100-Math.abs(position-52)*1.35)}%`,background:current.color}}/></div><small>この断面での見えやすさ</small></div>
      <button className="quiz" onClick={() => setLabels(!labels)} disabled={contrast==="single"}>{contrast==="single"?"固定脳MRIは画像参照のみ":labels ? "ラベルを隠して確認" : "答えを表示"}<b>→</b></button>
      <p className="atlasCredit">解剖基盤：BigBrain 2015（Amunts et al.）、BigBrain manual subcortical segmentation（Xiao et al.）、CerebrA。1–22は同一0.5 mm格子の手動ラベル、脳室・脳幹・小脳は位置照合済みアトラス由来、脳梁・内包は画像誘導の試作です。試作輪郭は手動正解データではありません。診断用途ではありません。</p>
    </aside>}

    {feedbackOpen&&<div className="legalBackdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setFeedbackOpen(false)}}><section className="legalDialog feedbackDialog" role="dialog" aria-modal="true" aria-labelledby="feedback-title"><header><div><span>OPEN ALPHA</span><h2 id="feedback-title">意見・共同制作</h2></div><button onClick={()=>setFeedbackOpen(false)} aria-label="意見募集を閉じる">×</button></header><p className="feedbackIntro">脳解剖の専門家、実習担当者、学生、3D・画像処理・Web開発者からの指摘を歓迎します。未完成の公開αとして、誤りを隠さず、報告と専門家確認を通じて育てます。氏名・所属・連絡先は共同制作を希望する場合だけ任意で送信してください。</p><div className="feedbackOptions"><article><h3>修正案・使いにくさを送る</h3><p>構造名、表示位置、解説、操作性、クイズの誤りなどを匿名でも報告できます。知見・意見だけで継続参加する場合は役割を相談します。患者情報、標本写真、第三者の個人情報は送信しないでください。</p>{feedbackFormUrl?<a href={feedbackFormUrl} target="_blank" rel="noreferrer">Google Formを開く →</a>:<button disabled>フォームURL設定待ち</button>}</article><article><h3>共同制作者として参加する</h3><p>GitHubアカウントを持ち、本人またはCodex・Claude Code等を使って変更とPull Requestを管理できる方を基本対象とします。セグメンテーション、3D、教材設計、Web開発、神経解剖学監修を募集します。</p>{feedbackFormUrl?<a href={feedbackFormUrl} target="_blank" rel="noreferrer">参加希望を送る →</a>:<button disabled>フォームURL設定待ち</button>}</article></div>{!feedbackFormUrl&&<p className="feedbackConfig">公開前に <code>VITE_FEEDBACK_FORM_URL</code> へGoogle Formの共有URLを設定すると、2つのボタンが有効になります。</p>}</section></div>}

      {legalOpen&&<div className="legalBackdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setLegalOpen(false)}}><section className="legalDialog" role="dialog" aria-modal="true" aria-labelledby="legal-title"><header><div><span>LICENSE & DATA NOTICE</span><h2 id="legal-title">CC・コード・データ・免責</h2></div><button onClick={()=>setLegalOpen(false)} aria-label="権利・データ表示を閉じる">×</button></header><div className="legalStatus"><b>データを含む公式α版: 非営利教育用</b><p>BigBrain由来データのCC BY-NC-SA 4.0に従います。アプリコードはAGPL-3.0-or-later、自作教材文書はCC BY-NC-SA 4.0です。</p></div><div className="legalColumns"><article><h3>アプリコード</h3><p>Copyright © 2026 脳実習ナビ contributors。<a href="https://spdx.org/licenses/AGPL-3.0-or-later.html" target="_blank" rel="noreferrer">AGPL-3.0-or-later</a>で提供し、無保証です。変更したWeb版は利用者へ対応ソースを取得する機会を提供する必要があります。</p><h3>自作教材文書</h3><p>本プロジェクトが作成した解説・共同制作文書は <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noreferrer">CC BY-NC-SA 4.0</a>です。外部データの条件は変更しません。</p><h3>BigBrain</h3><p>単一標本脳0.5 mmと固定脳MRI0.444 mmは <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noreferrer">CC BY-NC-SA 4.0</a>。表示用に再標本化・8-bit化・圧縮・マスク・色調調整を行っています。局所3D標本の褐色組織は0.5 mm組織像から1 mm形状を再構成したBigBrain派生物です。脳室腔・核・一部白質を別部品化しています。</p><h3>手動皮質下核</h3><p>XiaoらのBigBrain co-registration datasetは <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>。基になるBigBrainのCC BY-NC-SA条件は変わりません。</p></article><article><h3>MNI152 / CerebrA</h3><p>MNIライセンスに基づき使用し、Louis Collins / MNI / McGillの著作権表示を保持します。</p><h3>試作ラベル</h3><p>IDs 23–29はCerebrA由来の教育用マスク、30–32は画像誘導の候補です。手動正解ラベルや研究用マスクではありません。</p><h3>プロジェクト独自の模式3D</h3><p>放線群、脈絡叢、海馬采、脳弓、乳頭体、中脳水道と、鉤・視床下部・透明中隔・大脳脚の位置目安、視覚路・漏斗、主要脳底動脈、脳神経根は手作業で標準空間へ置いたCC BY-NC-SA 4.0教材データです。BigBrainから抽出した正解形状ではなく、画面上でも「模式補助」「位置目安」と表示します。</p><h3>参考資料</h3><p>講義資料、教科書、3D Brain、標本閲覧サイトを学習項目とUIの検討に参照しています。外部図版は収録していません。</p><h3>免責</h3><p>教育用α版です。正確性や継続提供を保証せず、診断・治療・手術計画・定量研究には使用できません。</p></article></div><footer><span>更新 2026-08-13・AGPL-3.0-or-later・無保証</span><div>{sourceRepositoryUrl?<a href={sourceRepositoryUrl} target="_blank" rel="noreferrer">対応ソース</a>:<span className="sourcePending">GitHub未作成・ソースURL設定待ち</span>}<a href="https://bigbrainproject.org/" target="_blank" rel="noreferrer">BigBrain</a><a href="https://nist.mni.mcgill.ca/multi-contrast-pd25-atlas/" target="_blank" rel="noreferrer">MNI PD25</a><a href="https://github.com/templateflow/tpl-MNI152NLin2009cSym" target="_blank" rel="noreferrer">TemplateFlow</a></div></footer></section></div>}
  </main>;
}
