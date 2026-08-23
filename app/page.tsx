"use client";

import { KeyboardEvent as ReactKeyboardEvent, lazy, PointerEvent, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { AtlasVolumeCanvas, QUIZ_SECTION_ACCENT_HEX, type BlockContextSpecimen, type HighlightLayer, type IdentifiedPoint } from "./AtlasVolumeCanvas";
import { ManualSegmentationWorkbench } from "./ManualSegmentationWorkbench";
import betaStatus from "./beta-status.json";
import anatomyReviewRegistry from "../public/atlas/structure-provenance.json";
import { freeObservationReadings, matchesJapaneseSearch, normalizeJapaneseSearch } from "../src/japaneseSearch";
import { QUIZ_GRANULARITY_BY_TARGET, countQuizChoice, detailOptionsForFormat, filterQuizCandidates } from "../src/quizGranularity.mjs";
import type { QuizDetail, QuizFormat, QuizFilterQuestion, QuizFilters, QuizOrigin } from "../src/quizGranularity.mjs";
import { createBlockContextState, shouldRenderBlockContext, transitionBlockContext } from "../src/blockContext.mjs";
import type { BlockContextEvent } from "../src/blockContext.mjs";
import { phoneCapabilityFromMedia } from "../src/mobileUi.mjs";
import { deriveAnatomyReviewQueue, filterAnatomyReviewQueue, isLegacyOpticEntry, isMammillaryEntry, observationHashForEntry, observationWorkspaceForEntry } from "../src/anatomyReviewQueue.mjs";
import type { AnatomyReviewQueueItem, AnatomyReviewSurface } from "../src/anatomyReviewQueue.mjs";
import { advanceBasalStepperIndex, advancePapezStepperIndex, BASAL_GANGLIA_STEPS, PAPEZ_STEPS, startBasalGangliaStepperTimer, startPapezStepperTimer } from "../src/pathwayStepper.mjs";
import type { BasalGangliaStep, PapezStep } from "../src/pathwayStepper.mjs";
import { BLOCK_PRIORITY_DISCLAIMER, BLOCK_PRIORITY_ENTRY_BY_KEY, BLOCK_PRIORITY_GROUPS, BLOCK_PRIORITY_GROUP_KEYS, BLOCK_SPECIMEN_KEYS } from "../src/blockPriority.mjs";
import type { BlockPrioritySpecimenKey } from "../src/blockPriority.mjs";
import { BLOCK_GUIDED_SPECIMEN_KEYS, createBlockGuidedState, finishBlockGuidedObservation, firstBlockGuidedObservation, guidedStepLayers, moveBlockGuidedObservation, startBlockGuidedObservation } from "../src/blockGuidedObservation.mjs";
import type { BlockGuidedSpecimenKey, BlockGuidedState } from "../src/blockGuidedObservation.mjs";

const ModelStrategyComparison=lazy(()=>import("./ModelStrategyComparison"));

type Plane = "coronal" | "horizontal" | "sagittal";
type Focus = "ventricle" | "caudate" | "hippocampus" | "thalamus";
type WorkspaceMode = "home" | "sections" | "surface" | "blocks" | "quiz" | "collaborate" | "segment";
type OverlayMode = "help" | "feedback" | "legal" | "status";
type BetaStatusItem = { id:string; heading:string; body:string; evidenceRefs:string[]; provenanceKeys?:string[] };
type BetaStatusData = { schemaVersion:number; updated:string; phase:string; knownLimitations:BetaStatusItem[]; changes:BetaStatusItem[] };
const betaStatusData=betaStatus as BetaStatusData;
const anatomyReviewQueue=deriveAnatomyReviewQueue(anatomyReviewRegistry);
type SurfaceViewKey = "lateral" | "superior" | "inferior" | "medial" | "arteries" | "cranialNerves" | "free";
const surfaceViewKeys:SurfaceViewKey[]=["lateral","superior","inferior","medial","arteries","cranialNerves","free"];
const planeKeys:Plane[]=["coronal","horizontal","sagittal"];
type SurfaceRegionKey = "precentral" | "postcentral" | "superiorFrontal" | "rostralMiddleFrontal" | "caudalMiddleFrontal" | "inferiorFrontal" | "parsOrbitalis" | "superiorTemporal" | "middleTemporal" | "inferiorTemporal" | "transverseTemporal" | "supramarginal" | "superiorParietal" | "inferiorParietal" | "paracentral" | "precuneus" | "cuneus" | "pericalcarine" | "lingual" | "fusiform" | "parahippocampal" | "entorhinal" | "insula" | "orbitofrontal" | "lateralOccipital" | "cingulate";
type SurfaceLandmarkKey = "central-sulcus" | "precentral-sulcus" | "lateral-sulcus" | "superior-frontal-sulcus" | "parieto-occipital-sulcus" | "calcarine-sulcus" | "olfactory-sulcus" | "longitudinal-fissure";
type SurfaceDeepLandmarkKey = "corpus-callosum" | "septum-pellucidum" | "fornix" | "thalami" | "hypothalamus";
type BasalLandmarkKey = "all" | "olfactory" | "optic" | "hypothalamus" | "infundibulum" | "mammillary" | "perforated" | "peduncles" | "midbrain" | "superior-colliculi" | "inferior-colliculi" | "pons" | "medulla" | "pyramids" | "olives";
type BasalLandmarkPartKey = Exclude<BasalLandmarkKey,"all">;
type BlockSpecimenKey = BlockPrioritySpecimenKey;
const blockSpecimenKeys:BlockSpecimenKey[]=[...BLOCK_SPECIMEN_KEYS];
type Rotation = {x:number;y:number;z?:number};
type BlockViewPreset = "initial" | "opposite" | "superior" | "inferior";
type BlockContextView = "whole" | "section";
type SpecimenTissueMode = "solid" | "ghost" | "hidden";
type BlockVisual = "model";
type BlockLayer = {key:string;name:string;latin:string;color:string;source:"標本分節"|"試作分節"|"模式補助"|"位置目安";note:string};
type BlockLesson = {name:string;en:string;visual:BlockVisual;plane:Plane;position:number;focus:Focus;view:"inside"|"ghost"|"extracted"|"segmented";rotation:Rotation;intro:string;observe:string[];caution:string;layers:BlockLayer[]};
type NeurovascularStructureKey = "ica" | "aca" | "acomm" | "mca" | "pcomm" | "vertebral" | "basilar" | "pca" | "cerebellarArteries" | "cn1" | "cn2" | "opticChiasm" | "cn3" | "cn4" | "cn5" | "cn6" | "cn7" | "cn8" | "cn9" | "cn10" | "cn11" | "cn12";
type StructureKey = Focus | "thirdVentricle" | "fourthVentricle" | "corpusCallosum" | "internalCapsule" | "putamen" | "pallidumExternal" | "pallidumInternal" | "pallidum" | "amygdala" | "accumbens" | "redNucleus" | "substantiaNigra" | "subthalamic" | "brainstem" | "cerebellum" | "opticChiasm" | "mammillaryBody" | "insula";
type LabelSource = "manual" | "atlas-provisional" | "image-guided" | "image-guided-reviewed";
type StructureInfo = { name: string; latin: string; color: string; rgb: [number,number,number]; ids: number[]; bigbrainIds?: number[]; labelSource?: LabelSource; note: string; relation: string; meshFocus?: Focus };
const labelSourceDisplay:Record<LabelSource,{label:string;detail:string;className:"source"|"provisional"}>={
  manual:{label:"標本同一格子・手動分節",detail:"BigBrain画像と同じ格子で公開された手動ラベルです。構造範囲の最終的な解剖学監修は継続中です。",className:"source"},
  "atlas-provisional":{label:"アトラス照合・試作",detail:"別アトラスを位置照合した教育用候補です。手動正解分節ではありません。",className:"provisional"},
  "image-guided":{label:"画像誘導・試作",detail:"画像を参照して作成した未確定の教育用候補です。",className:"provisional"},
  "image-guided-reviewed":{label:"画像誘導・確認済み",detail:"BigBrain連続切片を参照して作成し、プロジェクト内で採用した教材用ラベルです。研究用の正解マスクではなく、直交断確認により改訂する場合があります。",className:"source"},
};
const learnerLabelSourceDisplay:Record<LabelSource,{label:string;className:"source"|"provisional"}>={
  manual:{label:"標本対応",className:"source"},
  "atlas-provisional":{label:"試作",className:"provisional"},
  "image-guided":{label:"試作",className:"provisional"},
  "image-guided-reviewed":{label:"教材ラベル",className:"source"},
};
function learnerSourceLabel(source:string){
  if(source.includes("模式")||source.includes("位置目安"))return "模式";
  if(source.includes("試作")||source.includes("アトラス"))return "試作";
  if(source.includes("確認済み"))return "教材ラベル";
  return "標本対応";
}
type QuizCategory = "basal" | "limbic" | "midbrain" | "ventricles" | "connections" | "hindbrain" | "surface" | "neurovascular";
type QuizTargetKey = StructureKey | SurfaceRegionKey | NeurovascularStructureKey;
type SectionQuizQuestion = { target: StructureKey; category: Exclude<QuizCategory,"surface"|"neurovascular">; plane: Plane; position: number; prompt: string; options: StructureKey[]; format?:"section"; detail?:Plane; origin?:QuizOrigin };
type SurfaceQuizQuestion = { target: SurfaceRegionKey; category: "surface"; view: SurfaceViewKey; prompt: string; options: SurfaceRegionKey[]; format?:"surface"; detail?:Exclude<QuizDetail,Plane>; origin?:QuizOrigin };
type NeurovascularQuizQuestion = { target: NeurovascularStructureKey; category:"neurovascular"; view:"arteries"|"cranialNerves"; prompt:string; options:NeurovascularStructureKey[]; format:"neurovascular"; detail:"arteries"|"cranialNerves"; origin:"provisional" };
type QuizQuestion = SectionQuizQuestion | SurfaceQuizQuestion | NeurovascularQuizQuestion;
type QuizFormatFilter = "all"|QuizFormat;
type QuizDetailFilter = "all"|QuizDetail;

const planeData: Record<Plane, { ja: string; en: string; axis: string; from: string; to: string }> = {
  coronal: { ja: "冠状断", en: "CORONAL", axis: "前後位置", from: "後方", to: "前方" },
  horizontal: { ja: "水平断", en: "HORIZONTAL", axis: "上下位置", from: "上方", to: "下方" },
  sagittal: { ja: "矢状断", en: "SAGITTAL", axis: "左右位置", from: "左外側", to: "右外側" },
};

const workspaceModes:{key:WorkspaceMode;label:string;sub:string}[]=[
  {key:"home",label:"Home",sub:"概要"},
  {key:"surface",label:"脳表",sub:"外表・脳溝"},
  {key:"sections",label:"断面",sub:"連続切片"},
  {key:"blocks",label:"ブロック標本",sub:"試作品"},
  {key:"quiz",label:"復習",sub:"構造同定"},
];
const workspaceModeKeys:WorkspaceMode[]=[...workspaceModes.map(item=>item.key),"collaborate","segment"];
function workspaceFromHash(hash:string):WorkspaceMode{
  const candidate=hash.replace(/^#/,"").replace(/^workspace\/?/,"").split("/")[0];
  return workspaceModeKeys.includes(candidate as WorkspaceMode)?candidate as WorkspaceMode:"home";
}
function overlayFromHash(hash:string):OverlayMode|null{const candidate=hash.replace(/^#/,"").replace(/^workspace\/?/,"").split("/")[0];return candidate==="help"||candidate==="feedback"||candidate==="legal"||candidate==="status"?candidate:null}
function surfaceViewFromHash(hash:string):SurfaceViewKey{const candidate=hash.replace(/^#/,"").replace(/^workspace\/?/,"").split("/")[1];if(candidate==="nerves")return "cranialNerves";return surfaceViewKeys.includes(candidate as SurfaceViewKey)?candidate as SurfaceViewKey:"lateral"}
function planeFromHash(hash:string):Plane{const candidate=hash.replace(/^#/,"").replace(/^workspace\/?/,"").split("/")[1];return planeKeys.includes(candidate as Plane)?candidate as Plane:"coronal"}
function blockSpecimenFromHash(hash:string):BlockSpecimenKey{const candidate=hash.replace(/^#/,"").replace(/^workspace\/?/,"").split("/")[1];return blockSpecimenKeys.includes(candidate as BlockSpecimenKey)?candidate as BlockSpecimenKey:"lateral-ventricle"}
function workspaceHash(key:WorkspaceMode,surfaceView:SurfaceViewKey="lateral",plane:Plane="coronal",blockSpecimen:BlockSpecimenKey="lateral-ventricle"){const detail=key==="surface"?(surfaceView==="cranialNerves"?"nerves":surfaceView):key==="sections"?plane:key==="blocks"?blockSpecimen:"";return `#workspace/${key}${detail?`/${detail}`:""}`}
const MODEL_STRATEGY_ROUTE="#workspace/collaborate/model-strategy";
function modelStrategyFromHash(hash:string){return hash.replace(/^#/,"").replace(/^workspace\/?/,"")==="collaborate/model-strategy"}
const homeRotation:Rotation={x:-8,y:-28,z:0};
const quizCategories:{key:"all"|QuizCategory;label:string}[]=[
  {key:"all",label:"全項目"},
  {key:"basal",label:"大脳基底核"},
  {key:"limbic",label:"辺縁系"},
  {key:"midbrain",label:"中脳・視床下域"},
  {key:"ventricles",label:"脳室系"},
  {key:"connections",label:"間脳・白質"},
  {key:"hindbrain",label:"脳幹・小脳"},
  {key:"surface",label:"脳表・主要脳回"},
  {key:"neurovascular",label:"脳神経・主要血管"},
];
const quizFormatOptions:{key:QuizFormatFilter;label:string}[]=[
  {key:"all",label:"すべての形式"},
  {key:"section",label:"断面・深部"},
  {key:"surface",label:"脳表"},
  {key:"neurovascular",label:"脳神経・血管3D"},
];
const quizDetailLabels:Record<QuizDetail,string>={coronal:"冠状断",horizontal:"水平断",sagittal:"矢状断",lateral:"外側面",superior:"上面",inferior:"下面",medial:"内側面",arteries:"主要血管3D",cranialNerves:"脳神経3D"};
const QUIZ_WRONG_CACHE_KEY="brain-practical-quiz-wrong-v1";

const surfaceViews:Record<SurfaceViewKey,{name:string;en:string;visual:"cortex"|"arteries"|"nerves";rotation:Rotation;hemisphere:"both"|"left"|"right";intro:string;structures:string[];caution?:string}>= {
  lateral:{name:"左外側面",en:"LATERAL",visual:"cortex",rotation:{x:0,y:-90,z:0},hemisphere:"both",intro:"外側溝から中心溝をたどり、前頭・頭頂・側頭葉の境界を組み立てます。",structures:["外側溝（シルビウス溝）","中心前溝・中心溝","中心前回・中心後回","上側頭回","下前頭回 弁蓋部・三角部"]},
  superior:{name:"上面",en:"SUPERIOR",visual:"cortex",rotation:{x:-72,y:-6},hemisphere:"both",intro:"大脳縦裂を基準に、上前頭溝と逆Ω型の中心前回を見つけます。",structures:["大脳縦裂","上前頭溝","中心前溝","中心溝","中心前回・中心後回"]},
  inferior:{name:"下面",en:"INFERIOR",visual:"cortex",rotation:{x:70,y:4},hemisphere:"both",intro:"嗅覚路・視覚路、視床下部底面と脳幹を前後方向に並べ、中脳から橋・延髄への連続も観察します。",structures:["嗅球・嗅索・嗅溝","視神経・視交叉・視索","視床下部・漏斗・乳頭体","大脳脚・中脳・上丘・下丘","橋・延髄","錐体・オリーブ","小脳半球"]},
  medial:{name:"左半球・内側面",en:"LEFT MEDIAL HEMISPHERE",visual:"cortex",rotation:{x:0,y:90,z:0},hemisphere:"left",intro:"右半球を外し、左半球の内側面を正中側から観察します。まず皮質と脳溝を確認し、深部構造は必要なものだけ追加します。",structures:["帯状回・脳梁周囲","中心傍小葉","楔前部・楔部","頭頂後頭溝","鳥距溝","必要時のみ脳梁・左視床・視床下部を追加"]},
  arteries:{name:"脳底の主要動脈",en:"BASAL CEREBRAL ARTERIES",visual:"arteries",rotation:{x:110,y:2,z:180},hemisphere:"both",intro:"高密度全脳モデルの下面へ主要動脈を重ね、内頸動脈系と椎骨脳底動脈系が脳底の動脈輪で連絡する標準的な配置を追います。",structures:["内頸動脈・中大脳動脈","前大脳動脈・前交通動脈","後交通動脈・後大脳動脈","椎骨動脈・脳底動脈","上小脳・前下小脳・後下小脳動脈","視交叉・脳幹との位置関係"],caution:"赤い管は主要幹の典型的な連絡を標準空間へ置いた模式3Dです。Willis動脈輪は欠損・低形成・胎児型などの個体差が多く、完全な輪が常に存在するわけではありません。穿通枝・正確な血管径・個人差は再現していません。"},
  cranialNerves:{name:"脳神経・脳幹",en:"CRANIAL NERVES",visual:"nerves",rotation:{x:-42,y:2,z:0},hemisphere:"both",intro:"脳底面モデルへ脳神経の近位部を重ね、I・IIは前脳側、III–XIIは中脳・橋・延髄のどの高さから現れるかを区別します。",structures:["嗅球・嗅索・視神経・視交叉","動眼神経・滑車神経","三叉神経","外転・顔面・内耳神経","舌咽・迷走・副神経","舌下神経と錐体・オリーブ"],caution:"I・IIは脳幹から出る神経根ではありません。IIIは脚間窩、IVは下丘尾側の中脳背側、Vは橋外側、VI–VIIIは橋延髄境界、IX–XIはオリーブ後溝、XIIは錐体とオリーブの間に置いた模式です。神経核・頭蓋孔・遠位走行・太さは再現していません。"},
  free:{name:"自由観察",en:"FREE EXPLORATION",visual:"cortex",rotation:{x:-8,y:-28,z:0},hemisphere:"both",intro:"3Dを自由に回転し、表面をクリックするか構造名を検索して、複数の構造を同時に着色します。",structures:["主要な脳回・皮質領域","主要な溝・裂","内側の深部構造","脳底動脈","脳神経"]},
};

const surfaceRegions:Record<SurfaceRegionKey,{name:string;latin:string;ids:number[];color:string;rgb:[number,number,number];note:string}>={
  precentral:{name:"中心前回",latin:"Gyrus precentralis",ids:[86,35],color:"#d66e58",rgb:[214,110,88],note:"中心溝の前方に沿う一次運動野の主要部"},
  postcentral:{name:"中心後回",latin:"Gyrus postcentralis",ids:[64,13],color:"#4f9aae",rgb:[79,154,174],note:"中心溝の後方に沿う一次体性感覚野の主要部"},
  superiorFrontal:{name:"上前頭回",latin:"Gyrus frontalis superior",ids:[89,38],color:"#c18c4b",rgb:[193,140,75],note:"大脳縦裂に近い前頭葉上面"},
  rostralMiddleFrontal:{name:"中前頭回前部",latin:"Gyrus frontalis medius, pars rostralis",ids:[52,1],color:"#cf9a55",rgb:[207,154,85],note:"上前頭溝と下前頭溝の間にある中前頭回の前方部"},
  caudalMiddleFrontal:{name:"中前頭回後部",latin:"Gyrus frontalis medius, pars caudalis",ids:[93,42],color:"#bf824f",rgb:[191,130,79],note:"中心前溝の前方にある中前頭回の後方部"},
  inferiorFrontal:{name:"下前頭回 弁蓋部・三角部",latin:"Pars opercularis et triangularis",ids:[83,32,73,22],color:"#dd9650",rgb:[221,150,80],note:"外側溝前方、上行枝・前枝に区切られる領域"},
  parsOrbitalis:{name:"下前頭回 眼窩部",latin:"Pars orbitalis gyri frontalis inferioris",ids:[95,44],color:"#d7a16a",rgb:[215,161,106],note:"下前頭回の前下方で眼窩面へ続く部分"},
  superiorTemporal:{name:"上側頭回",latin:"Gyrus temporalis superior",ids:[96,45],color:"#9970b4",rgb:[153,112,180],note:"外側溝の下縁に沿う側頭葉上部"},
  middleTemporal:{name:"中側頭回",latin:"Gyrus temporalis medius",ids:[79,28],color:"#7d5aa8",rgb:[125,90,168],note:"上・下側頭溝の間にある側頭葉外側面"},
  inferiorTemporal:{name:"下側頭回",latin:"Gyrus temporalis inferior",ids:[54,3],color:"#9a6885",rgb:[154,104,133],note:"下側頭溝の下方で側頭葉下面へ続く脳回"},
  transverseTemporal:{name:"横側頭回",latin:"Gyri temporales transversi",ids:[65,14],color:"#8266a9",rgb:[130,102,169],note:"外側溝の深部に位置する聴覚皮質周辺の横走脳回"},
  supramarginal:{name:"縁上回",latin:"Gyrus supramarginalis",ids:[102,51],color:"#5967c2",rgb:[89,103,194],note:"外側溝後端を取り囲む下頭頂小葉"},
  superiorParietal:{name:"上頭頂小葉",latin:"Lobulus parietalis superior",ids:[60,9],color:"#68a06c",rgb:[104,160,108],note:"頭頂間溝の上方に広がる頭頂葉領域"},
  inferiorParietal:{name:"下頭頂小葉",latin:"Lobulus parietalis inferior",ids:[61,10],color:"#5b91a4",rgb:[91,145,164],note:"頭頂間溝の下方で縁上回・角回周辺を含む領域"},
  paracentral:{name:"中心傍小葉",latin:"Lobulus paracentralis",ids:[67,16],color:"#ad708c",rgb:[173,112,140],note:"中心前回・後回が内側面へ連続する部分"},
  precuneus:{name:"楔前部",latin:"Precuneus",ids:[82,31],color:"#7d9c5e",rgb:[125,156,94],note:"中心傍小葉の後方、頭頂後頭溝の前方"},
  cuneus:{name:"楔部",latin:"Cuneus",ids:[94,43],color:"#6d8db7",rgb:[109,141,183],note:"頭頂後頭溝と鳥距溝に挟まれる内側後頭葉"},
  pericalcarine:{name:"鳥距溝周囲皮質",latin:"Cortex pericalcarinus",ids:[57,6],color:"#c35f75",rgb:[195,95,117],note:"鳥距溝の上下に沿う一次視覚野周辺"},
  lingual:{name:"舌状回",latin:"Gyrus lingualis",ids:[63,12],color:"#b28a53",rgb:[178,138,83],note:"鳥距溝の下方にある後頭葉内側下面"},
  fusiform:{name:"紡錘状回",latin:"Gyrus fusiformis",ids:[75,24],color:"#a76f78",rgb:[167,111,120],note:"側頭葉・後頭葉下面の内外側溝間"},
  parahippocampal:{name:"海馬傍回",latin:"Gyrus parahippocampalis",ids:[69,18],color:"#9b795d",rgb:[155,121,93],note:"側頭葉内側面で海馬形成を外側から取り巻く脳回"},
  entorhinal:{name:"嗅内野",latin:"Cortex entorhinalis",ids:[87,36],color:"#b06f62",rgb:[176,111,98],note:"海馬傍回前部に位置し、海馬への主要な皮質入力となる領域"},
  insula:{name:"島皮質",latin:"Cortex insularis",ids:[74,23],color:"#5d8f87",rgb:[93,143,135],note:"外側溝の深部で前頭・頭頂・側頭弁蓋に覆われる皮質"},
  orbitofrontal:{name:"眼窩前頭皮質",latin:"Cortex orbitofrontalis",ids:[58,7,66,15],color:"#d4775b",rgb:[212,119,91],note:"前頭葉下面の眼窩面"},
  lateralOccipital:{name:"外側後頭皮質",latin:"Cortex occipitalis lateralis",ids:[85,34],color:"#4d7e97",rgb:[77,126,151],note:"後頭葉外側面の広い領域"},
  cingulate:{name:"帯状回",latin:"Gyrus cinguli",ids:[81,30,59,8,98,47,84,33],color:"#c86044",rgb:[200,96,68],note:"脳梁の上方を前後へ取り巻く内側面の脳回"},
};
const surfaceRegionKeys=Object.keys(surfaceRegions) as SurfaceRegionKey[];
const surfaceAtlasNomenclatureNote="中前頭回前部・中前頭回後部・鳥距溝周囲皮質・外側後頭皮質・眼窩前頭皮質の5領域は、CerebrA／Desikan-styleアトラスの区画名を教材上で対応づけた表示です。併記する英語・ラテン語はアトラス表示用の文字列で、国際標準Terminologia Neuroanatomica（FIPAT／TNA）の確定用語だとは主張しません。標準ラテン語への置換は行っていません。";

const surfaceViewRegions:Record<SurfaceViewKey,SurfaceRegionKey[]>={
  lateral:["precentral","postcentral","inferiorFrontal","superiorTemporal","supramarginal","lateralOccipital"],
  superior:["superiorFrontal","precentral","postcentral","superiorParietal","paracentral"],
  inferior:["orbitofrontal","superiorTemporal","middleTemporal","fusiform","lingual","lateralOccipital"],
  medial:["cingulate","paracentral","precuneus","cuneus","lingual"],
  arteries:[],
  cranialNerves:[],
  free:surfaceRegionKeys,
};

const surfaceLandmarks:Record<SurfaceLandmarkKey,{name:string;latin:string;color:string;note:string}>={
  "central-sulcus":{name:"中心溝",latin:"Sulcus centralis",color:"#fff36a",note:"中心前回と中心後回の間を示す位置目安です。"},
  "precentral-sulcus":{name:"中心前溝",latin:"Sulcus precentralis",color:"#ff8bd1",note:"中心前回の前縁に沿う位置目安です。"},
  "lateral-sulcus":{name:"外側溝",latin:"Sulcus lateralis",color:"#72e5ff",note:"前頭・頭頂葉と側頭葉を分ける主要溝の位置目安です。"},
  "superior-frontal-sulcus":{name:"上前頭溝",latin:"Sulcus frontalis superior",color:"#c7ff65",note:"上前頭回の外側縁をたどる位置目安です。"},
  "parieto-occipital-sulcus":{name:"頭頂後頭溝",latin:"Sulcus parietooccipitalis",color:"#ffb45c",note:"内側面で頭頂葉と後頭葉を分ける位置目安です。"},
  "calcarine-sulcus":{name:"鳥距溝",latin:"Sulcus calcarinus",color:"#bca4ff",note:"楔部と舌状回の間を後方へ走る位置目安です。"},
  "olfactory-sulcus":{name:"嗅溝",latin:"Sulcus olfactorius",color:"#ff786f",note:"直回の外側で嗅索に沿う位置目安です。"},
  "longitudinal-fissure":{name:"大脳縦裂",latin:"Fissura longitudinalis cerebri",color:"#f7f7f2",note:"左右大脳半球を分ける正中の裂を示します。"},
};
const surfaceLandmarkKeys=Object.keys(surfaceLandmarks) as SurfaceLandmarkKey[];
const surfaceViewLandmarks:Record<SurfaceViewKey,SurfaceLandmarkKey[]>={
  lateral:["lateral-sulcus","central-sulcus","precentral-sulcus","superior-frontal-sulcus"],
  superior:["longitudinal-fissure","superior-frontal-sulcus","central-sulcus","precentral-sulcus"],
  inferior:["olfactory-sulcus"],
  medial:["parieto-occipital-sulcus","calcarine-sulcus","central-sulcus"],
  arteries:[],
  cranialNerves:[],
  free:surfaceLandmarkKeys,
};
const surfaceDeepLandmarks:Record<SurfaceDeepLandmarkKey,{name:string;latin:string;color:string;source:string;note:string}>={
  "corpus-callosum":{name:"脳梁",latin:"Corpus callosum",color:"#dbc270",source:"試作分節",note:"左右半球を結ぶ大交連のうち、左半球側だけを内側面の位置関係用に表示します。"},
  "septum-pellucidum":{name:"透明中隔（位置目安）",latin:"Septum pellucidum",color:"#a9c5bd",source:"模式補助",note:"脳梁下面と脳弓上面を結ぶ両葉性の薄い隔壁のうち、左葉の位置だけを示します。輪郭は正解分節ではなく、上下関係の確認に限ってください。"},
  fornix:{name:"脳弓",latin:"Fornix",color:"#e8d9a6",source:"模式補助",note:"左海馬系から乳頭体方向へ弓状に走る概略形状です。右側成分は表示しません。"},
  thalami:{name:"視床",latin:"Thalamus",color:"#8d82c4",source:"標本分節",note:"第三脳室の外側を占める灰白質のうち、左視床だけを表示します。"},
  hypothalamus:{name:"視床下部領域",latin:"Hypothalamus",color:"#b97864",source:"位置目安",note:"左視床腹側から第三脳室底へ続く概略領域です。核境界ではなく、右側成分は表示しません。"},
};
const surfaceDeepLandmarkKeys=Object.keys(surfaceDeepLandmarks) as SurfaceDeepLandmarkKey[];
// This hemisected teaching specimen does not visibly preserve the fornix or
// septum pellucidum.  The third-ventricle-facing structures retained here are
// the thalamus and hypothalamus; the caudate belongs along the lateral ventricle.
const medialDeepLandmarkKeys:SurfaceDeepLandmarkKey[]=["corpus-callosum","thalami","hypothalamus"];
// The medial lesson starts with the exposed cortical surface only. Deep
// structures are opt-in so a schematic or normally hidden structure is never
// presented as if it were visible on the intact medial surface.
const defaultMedialDeepLandmarks:SurfaceDeepLandmarkKey[]=[];

const basalLandmarks:Record<BasalLandmarkKey,{name:string;latin:string;note:string;color:string}>={
  all:{name:"すべて",latin:"Basal landmarks",note:"脳底構造をまとめて表示します。",color:"#c5d1d4"},
  olfactory:{name:"嗅球・嗅索",latin:"Bulbus et tractus olfactorius",note:"前頭葉下面の嗅溝に沿って後方へ走る一対の嗅覚路を示します。",color:"#e1a545"},
  optic:{name:"視神経・視交叉・視索",latin:"N. opticus / chiasma / tractus",note:"左右の視神経が正中の視交叉へ集まり、後方では視索として外側へ向かいます。",color:"#f2d56b"},
  hypothalamus:{name:"視床下部領域",latin:"Hypothalamus",note:"視交叉の後方から漏斗、乳頭体へ続く第三脳室底の概略領域です。核ごとの境界ではありません。",color:"#c45783"},
  infundibulum:{name:"漏斗（下垂体茎）",latin:"Infundibulum / hypophysial stalk",note:"視交叉の後方、乳頭体の前方で、視床下部底面から下方へ伸びる正中構造です。",color:"#d96b8a"},
  mammillary:{name:"乳頭体",latin:"Corpora mamillaria",note:"漏斗の後方、脚間窩の前方に左右一対の小さな隆起として並びます。",color:"#b96f46"},
  perforated:{name:"前有孔質（位置目安）",latin:"Substantia perforata anterior",note:"嗅三角の後方、視索・側頭葉内側の前方にある左右一対の領域を示します。表面孔は再現していません。",color:"#4fa5a0"},
  peduncles:{name:"大脳脚領域",latin:"Pedunculi cerebri",note:"中脳腹側で脚間窩を挟む左右の大脳脚の概略領域です。",color:"#4f79b7"},
  midbrain:{name:"中脳",latin:"Mesencephalon",note:"間脳の尾側、橋の頭側に続く脳幹上部です。大脳脚は腹側、上丘・下丘は背側にあります。",color:"#7667af"},
  "superior-colliculi":{name:"上丘",latin:"Colliculi superiores",note:"中脳蓋の背側にある一対の隆起です。下面正面からは隠れるため、モデルを回転して背側から確認します。",color:"#d95365"},
  "inferior-colliculi":{name:"下丘",latin:"Colliculi inferiores",note:"上丘の尾側にある一対の隆起です。下面正面からは隠れるため、モデルを回転して背側から確認します。",color:"#e38a42"},
  pons:{name:"橋",latin:"Pons",note:"中脳と延髄の間にある脳幹の膨隆部です。腹側面と小脳へ続く方向を確認します。",color:"#369a9a"},
  medulla:{name:"延髄",latin:"Medulla oblongata",note:"橋の尾側から脊髄へ続く部分です。腹側の錐体と、その外側のオリーブを位置の基準にします。",color:"#659b68"},
  pyramids:{name:"延髄錐体",latin:"Pyramides medullae oblongatae",note:"延髄腹側正中寄りを縦走する左右一対の位置目安です。",color:"#e2ae43"},
  olives:{name:"オリーブ",latin:"Olivae",note:"錐体の外側に並ぶ延髄腹外側の隆起を示す位置目安です。",color:"#d66a55"},
};
// The schematic mammillary bodies are retained as a source asset only. They are not
// learner-facing substitutes for the mammillary bodies visible in the section volume.
const basalLandmarkKeys=(Object.keys(basalLandmarks) as BasalLandmarkKey[]).filter((key):key is BasalLandmarkPartKey=>key!=="all"&&key!=="mammillary");
const cranialNerveBrainstemKeys:BasalLandmarkPartKey[]=["midbrain","pons","medulla","peduncles","pyramids","olives","superior-colliculi","inferior-colliculi"];
const detachableBrainstemNerveKeys:NeurovascularStructureKey[]=["cn5","cn6","cn7","cn8","cn9","cn10","cn11","cn12"];

const blockSpecimens:Record<BlockSpecimenKey,BlockLesson>={
  "lateral-ventricle":{name:"側脳室の全景",en:"LATERAL VENTRICLE",visual:"model",plane:"sagittal",position:58,focus:"ventricle",view:"inside",rotation:{x:-12,y:-58},intro:"側脳室のC字形の連続を隠さないよう、右側脳室の外側壁を開き、周囲実質を必要最小限だけ残した局所標本です。色レイヤーを着脱して、腔と周囲構造の隣接を組み立てます。",observe:["前角・体部・三角部・後角・下角","尾状核頭・体・尾との並走","視床と体部の位置関係","海馬と下角の位置関係","正中側にある第三脳室の方向"],caution:"側脳室腔は同一0.5 mm格子の教育用ラベル、尾状核・視床・海馬は手動分節です。脳弓・モンロー孔・薄い脳室壁は独立分節できていないため、全境界を正解形状として扱わないでください。",layers:[
    {key:"ventricular-cavity",name:"側脳室腔",latin:"Ventriculus lateralis",color:"#45aebd",source:"試作分節",note:"前角から下角まで連続する腔の形を示します。"},
    {key:"caudate",name:"尾状核",latin:"Nucleus caudatus",color:"#dc914b",source:"標本分節",note:"頭部は側脳室前角の外側壁を形成し、体部は側脳室体部の外側に位置し、尾部は下角の上方・天井側を走ります。"},
    {key:"thalamus",name:"視床",latin:"Thalamus",color:"#8d82c4",source:"標本分節",note:"側脳室体部の床と第三脳室の外側に位置します。"},
    {key:"hippocampus",name:"海馬",latin:"Hippocampus",color:"#c8798d",source:"標本分節",note:"側脳室下角の床を内側から隆起させます。"},
  ]},
  diencephalon:{name:"視床・視床下部標本",en:"DIENCEPHALON",visual:"model",plane:"sagittal",position:50,focus:"thalamus",view:"inside",rotation:{x:-10,y:-48},intro:"第三脳室を正中の空間基準にして、左右の視床、その腹側に続く視床下部領域、さらに腹外側の間脳・視床下域にある視床下核を一つの切り出しで比較します。構造を外しながら上下・内外・前後の関係を組み立てます。",observe:["左右の視床と第三脳室","第三脳室側壁に沿う視床と視床下部の上下関係","間脳の視床下域にある視床下核と、視床・黒質の位置関係","第三脳室底へ続く視床下部領域"],caution:"視床と視床下核は手動分節、第三脳室は同一格子の試作分節です。視床下部は独立分節ではなく保守的な位置目安です。乳頭体はID39・40の水平断ラベルを採用済みですが、この3D標本には原画像由来の乳頭体3D形状がないため表示せず、旧模式部品で代用しません。視床核群、視床下溝、視交叉、漏斗の厳密な境界も示しません。",layers:[
    {key:"thalami",name:"視床",latin:"Thalamus",color:"#8d82c4",source:"標本分節",note:"第三脳室を挟んで左右に並ぶ間脳背側部です。"},
    {key:"third-ventricle",name:"第三脳室",latin:"Ventriculus tertius",color:"#45aebd",source:"試作分節",note:"視床と視床下部の内側面を読む正中の空間基準です。"},
    {key:"hypothalamus",name:"視床下部領域",latin:"Hypothalamus",color:"#b97864",source:"位置目安",note:"視床腹側から第三脳室底へ続く領域を示します。核境界ではありません。"},
    {key:"subthalamic-nuclei",name:"視床下核",latin:"Nucleus subthalamicus",color:"#e0ad45",source:"標本分節",note:"間脳の視床下域にある小さな核を左右表示します。視床下部・中脳そのものとは区別してください。"},
  ]},
  radiations:{name:"レンズ核・投射線維",en:"LENTIFORM & RADIATIONS",visual:"model",plane:"horizontal",position:53,focus:"caudate",view:"inside",rotation:{x:-58,y:-8},intro:"レンズ核と内包を含む水平切断標本に、放線冠・視放線・聴放線の走行目安を重ねます。被殻・淡蒼球外節・内節を別々に外しながら、内包を中心とする広がりを確認します。",observe:["被殻・淡蒼球外節・内節の層状配列","レンズ核内側の内包","上方へ扇状に広がる放線冠","外側膝状体から後頭葉へ向かう視放線","内側膝状体から側頭葉へ向かう聴放線"],caution:"被殻と淡蒼球外節・内節は手動分節、内包は画像誘導の試作分節です。3種類の放線は現在の組織像から抽出した線維束ではなく、切断面上へ投影した走行模式です。位置関係の学習用で、束の太さ・全線維・個人差は表しません。",layers:[
    {key:"putamen",name:"被殻",latin:"Putamen",color:"#d9854f",source:"標本分節",note:"レンズ核の外側部です。"},
    {key:"pallidum-external",name:"淡蒼球外節",latin:"Globus pallidus externus",color:"#d0ae5c",source:"標本分節",note:"被殻の内側、淡蒼球内節の外側に位置する、内部の中継・調節部です。"},
    {key:"pallidum-internal",name:"淡蒼球内節",latin:"Globus pallidus internus",color:"#b88d42",source:"標本分節",note:"外節の内側で内包に接し、淡蒼球から視床などへ向かう主要な出力部です。"},
    {key:"internal-capsule",name:"内包",latin:"Capsula interna",color:"#e3d8b0",source:"試作分節",note:"レンズ核の内側、尾状核・視床の外側を通ります。"},
    {key:"corona-radiata",name:"放線冠",latin:"Corona radiata",color:"#e7c85d",source:"模式補助",note:"内包より上方で皮質へ扇状に広がる投射線維です。"},
    {key:"optic-radiation",name:"視放線",latin:"Radiatio optica",color:"#7d9fd0",source:"模式補助",note:"外側膝状体から側頭・頭頂葉を経て後頭葉へ向かいます。"},
    {key:"auditory-radiation",name:"聴放線",latin:"Radiatio acustica",color:"#74b99e",source:"模式補助",note:"内側膝状体から側頭葉の聴覚皮質へ向かいます。"},
  ]},
  "commissural-system":{name:"脳梁・脳弓標本",en:"CORPUS CALLOSUM AND FORNIX",visual:"model",plane:"sagittal",position:50,focus:"ventricle",view:"inside",rotation:{x:-7,y:76},intro:"正中周囲だけを残し、脳梁の弧、側脳室、透明中隔、脳弓の上下関係を内側から見る標本です。側脳室を空間基準に、交連線維と辺縁系の出力路を分けて観察します。",observe:["脳梁の膝・幹・膨大へ続く弧","脳梁直下の側脳室","脳梁と脳弓の間の透明中隔","海馬から乳頭体方向へ続く脳弓","脳梁と脳弓が別の線維系であること"],caution:"脳梁は画像誘導の試作分節、側脳室は同一格子の試作分節です。脳弓は模式3D、透明中隔は位置目安であり、薄い膜や線維束の実測境界ではありません。脳弓柱・交連前後の詳細形態は今後の修正対象です。",layers:[
    {key:"corpus-callosum",name:"脳梁",latin:"Corpus callosum",color:"#dbc270",source:"試作分節",note:"左右大脳半球を結ぶ大きな交連線維の弧です。"},
    {key:"lateral-ventricles",name:"側脳室",latin:"Ventriculi laterales",color:"#45aebd",source:"試作分節",note:"脳梁・透明中隔・脳弓の位置を読む空間基準です。"},
    {key:"fornix",name:"脳弓",latin:"Fornix",color:"#e7d9a6",source:"模式補助",note:"海馬から中隔野・乳頭体方向へ弧を描く線維路の模式です。"},
    {key:"septum-pellucidum",name:"透明中隔",latin:"Septum pellucidum",color:"#a9c5bd",source:"位置目安",note:"脳梁下面と脳弓上面を結ぶ両葉性の薄い隔壁の位置を示します。現在の3Dは左葉だけの模式です。"},
  ]},
  "choroid-plexus":{name:"脈絡叢を開く",en:"CHOROID PLEXUS",visual:"model",plane:"sagittal",position:55,focus:"ventricle",view:"inside",rotation:{x:-18,y:-54},intro:"側脳室の内側壁を開き、脳室腔、海馬、脈絡裂に沿う脈絡叢を観察する局所標本です。腔の全体像と脈絡叢の付着位置を混同しないよう、別レイヤーにしました。",observe:["側脳室体部・三角部・下角","脈絡裂のC字形の方向","脈絡叢と視床・海馬の位置関係","下角の床をつくる海馬","脈絡叢が存在しない前角・後角の方向"],caution:"組織像から脈絡叢を安定して抽出できないため、赤紫の房状構造は脈絡裂に沿わせた模式3Dです。側脳室腔と海馬は同一標本格子に基づきます。脈絡叢の細かな形・付着範囲は検証用標本で今後修正します。",layers:[
    {key:"ventricular-cavity",name:"側脳室腔",latin:"Ventriculus lateralis",color:"#45aebd",source:"試作分節",note:"脈絡叢が入る腔を先に把握するための基準です。"},
    {key:"choroid-plexus",name:"脈絡叢",latin:"Plexus choroideus",color:"#b34c62",source:"模式補助",note:"脈絡裂に沿う付着方向を示す房状モデルです。"},
    {key:"hippocampus",name:"海馬",latin:"Hippocampus",color:"#c8798d",source:"標本分節",note:"側脳室下角の床と脈絡裂の位置を理解する基準です。"},
  ]},
  "medial-temporal":{name:"海馬・扁桃体標本",en:"MEDIAL TEMPORAL SPECIMEN",visual:"model",plane:"horizontal",position:69,focus:"hippocampus",view:"inside",rotation:{x:-20,y:-48},intro:"右内側側頭葉だけを小さく切り出し、同一格子上の海馬、側脳室下角、扁桃体の前後関係を見比べる標本です。前後方向を回転させ、扁桃体から海馬へ移る関係を追います。",observe:["海馬頭・体と側脳室下角","海馬前方の扁桃体","海馬采・鉤は信頼できる境界データがなく3D未収録"],caution:"海馬と扁桃体は同一標本の手動分節、側脳室下角は試作腔ラベルです。海馬采と鉤は、手置き形状では位置と連続性を正確に示せないためβ候補の3Dから除外しました。海馬采は海馬の内側縁から脳弓へ続く白質帯、鉤は海馬傍回前端の複雑な折り返しとして実標本・検証済み資料で確認してください。表面の線維感、湿潤感、切断面の質感も再現していません。",layers:[
    {key:"hippocampus",name:"海馬",latin:"Hippocampus",color:"#c8798d",source:"標本分節",note:"下角の床を隆起させ、後方へ細く続きます。"},
    {key:"amygdala",name:"扁桃体",latin:"Corpus amygdaloideum",color:"#9c6cae",source:"標本分節",note:"海馬の前方、側脳室下角前端の近くに位置します。"},
    {key:"inferior-horn",name:"側脳室下角",latin:"Cornu inferius",color:"#45aebd",source:"試作分節",note:"海馬と扁桃体の上下前後関係を読む空間基準です。"},
  ]},
  "midbrain-section":{name:"中脳核・大脳脚標本",en:"MIDBRAIN TRANSVERSE",visual:"model",plane:"horizontal",position:67,focus:"thalamus",view:"inside",rotation:{x:-62,y:0},intro:"赤核と黒質が現れる高さで中脳を横断した局所標本です。中脳水道を背側の基準に、被蓋の赤核、腹側の黒質と大脳脚を層状に比較し、丘・膝状体の方向も確認します。",observe:["正中背側寄りの中脳水道","被蓋に並ぶ左右の赤核","赤核の腹外側に沿う黒質","黒質腹側の大脳脚と脚間窩","上丘・下丘と外側・内側膝状体の対応"],caution:"赤核・黒質は手動分節、褐色組織は同一標本の脳幹ラベルから作った10 mm厚の横断標本です。中脳水道は模式3D、大脳脚、上丘・下丘、膝状体、脚間窩は位置目安で、核境界の正解分節ではありません。",layers:[
    {key:"red-nuclei",name:"赤核",latin:"Nuclei rubri",color:"#d24f49",source:"標本分節",note:"中脳被蓋内に左右一対で現れる円形の核です。"},
    {key:"substantia-nigra",name:"黒質",latin:"Substantia nigra",color:"#716387",source:"標本分節",note:"被蓋と大脳脚の間に沿う帯状の核です。"},
    {key:"aqueduct",name:"中脳水道",latin:"Aqueductus mesencephali",color:"#45aebd",source:"模式補助",note:"第三脳室と第四脳室を結ぶ正中の細い腔を、視認できる太さで示します。"},
    {key:"cerebral-peduncles",name:"大脳脚領域",latin:"Pedunculi cerebri",color:"#d29a55",source:"位置目安",note:"黒質の腹側にある大脳脚底部の概略領域です。"},
    {key:"superior-colliculi",name:"上丘",latin:"Colliculi superiores",color:"#bd6f56",source:"位置目安",note:"中脳蓋上部にある一対の隆起の位置です。"},
    {key:"inferior-colliculi",name:"下丘",latin:"Colliculi inferiores",color:"#a85d4e",source:"位置目安",note:"上丘の尾側にある一対の聴覚系隆起の位置です。"},
    {key:"lateral-geniculate-bodies",name:"外側膝状体",latin:"Corpora geniculata lateralia",color:"#648fc2",source:"位置目安",note:"視索から視放線へ続く視覚系中継部の方向を示します。"},
    {key:"medial-geniculate-bodies",name:"内側膝状体",latin:"Corpora geniculata medialia",color:"#69a78a",source:"位置目安",note:"下丘から聴放線へ続く聴覚系中継部の方向を示します。"},
    {key:"interpeduncular-fossa",name:"脚間窩",latin:"Fossa interpeduncularis",color:"#8f6d58",source:"位置目安",note:"左右大脳脚の間で動眼神経が現れる腹側のくぼみです。"},
  ]},
  hindbrain:{name:"脳幹・小脳の脱着",en:"BRAINSTEM & CEREBELLUM",visual:"model",plane:"horizontal",position:80,focus:"thalamus",view:"inside",rotation:{x:-4,y:8},intro:"単一標本から脳幹・小脳を切り離した標本です。橋・延髄と小脳を外して第四脳室と菱形窩を露出し、小脳脚や表面隆起の位置目安を重ねられます。中脳は上方との連続を保つため残します。",observe:["中脳・橋・延髄","第四脳室と菱形窩","小脳虫部・半球","上・中・下小脳脚の方向","顔面神経丘・前庭野・舌下／迷走神経三角","錐体・オリーブ"],caution:"橋・延髄、第四脳室、小脳は同一格子に基づきます。小脳脚は走行の模式3D、菱形窩の隆起と錐体・オリーブは表面上の位置目安で、神経核・線維束の正解分節ではありません。",layers:[
    {key:"fourth-ventricle",name:"第四脳室",latin:"Ventriculus quartus",color:"#45aebd",source:"試作分節",note:"橋・延髄の背側と小脳の腹側にある腔を示します。"},
    {key:"superior-cerebellar-peduncles",name:"上小脳脚",latin:"Pedunculus cerebellaris superior",color:"#e8ba52",source:"模式補助",note:"小脳から中脳方向へ上行する結合の概略走行です。"},
    {key:"middle-cerebellar-peduncles",name:"中小脳脚",latin:"Pedunculus cerebellaris medius",color:"#db8747",source:"模式補助",note:"橋外側から小脳半球へ入る最も太い結合の概略走行です。"},
    {key:"inferior-cerebellar-peduncles",name:"下小脳脚",latin:"Pedunculus cerebellaris inferior",color:"#6dad7a",source:"模式補助",note:"延髄背外側から小脳へ向かう結合の概略走行です。"},
    {key:"facial-colliculi",name:"顔面神経丘",latin:"Colliculi faciales",color:"#d46e7f",source:"位置目安",note:"菱形窩橋部の正中寄りにある一対の隆起の位置です。"},
    {key:"vestibular-areas",name:"前庭野",latin:"Areae vestibulares",color:"#579ec0",source:"位置目安",note:"菱形窩の外側部に広がる領域の位置を示します。"},
    {key:"hypoglossal-trigones",name:"舌下神経三角",latin:"Trigona nervi hypoglossi",color:"#a386bf",source:"位置目安",note:"延髄部菱形窩の正中寄りにある隆起の位置です。"},
    {key:"vagal-trigones",name:"迷走神経三角",latin:"Trigona nervi vagi",color:"#7b6aa6",source:"位置目安",note:"舌下神経三角の外側に続く隆起の位置です。"},
    {key:"pyramids",name:"錐体",latin:"Pyramides medullae oblongatae",color:"#d1a863",source:"位置目安",note:"延髄腹側正中の両側を縦走する隆起の位置です。"},
    {key:"olives",name:"オリーブ",latin:"Olivae",color:"#bd6e5c",source:"位置目安",note:"錐体の外側にある長円形の隆起の位置です。"},
  ]},
};

// Each specimen opens in a three-quarter or near-orthogonal view chosen to expose its teaching structures.
const blockSpecimenDisclaimer="褐色組織は位置関係を読むための表示で、湿潤感・線維感・切断面など実標本の質感は再現していません。見た目の実在感を形状や境界の正確性の根拠にせず、実標本・検証済み資料と照合してください。";
const blockInitialRotations:Record<BlockSpecimenKey,Rotation>={
  "lateral-ventricle":{x:-14,y:-64,z:4},
  diencephalon:{x:-8,y:-38,z:0},
  radiations:{x:-70,y:-12,z:0},
  "commissural-system":{x:-7,y:88,z:0},
  "choroid-plexus":{x:-14,y:-62,z:4},
  "medial-temporal":{x:-26,y:-56,z:5},
  "midbrain-section":{x:-78,y:0,z:0},
  hindbrain:{x:-10,y:164,z:0},
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
  cn1:{name:"I 嗅球・嗅索",latin:"Olfactory bulb and tract",kind:"nerves",ids:[21,22],note:"前端の嗅球から、前頭葉下面の嗅溝に沿って嗅索が後方へ走る模式です。"},
  cn2:{name:"II 視神経・視索",latin:"Optic nerve / tract",kind:"nerves",ids:[23,24],note:"視神経は後内側の視交叉へ集まり、その後方では視索として外後方へ続く。"},
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
type FreeObservationKey=`region:${SurfaceRegionKey}`|`landmark:${SurfaceLandmarkKey}`|`deep:${SurfaceDeepLandmarkKey}`|`basal:${BasalLandmarkPartKey}`|`neuro:${NeurovascularStructureKey}`;
type FreeObservationKind="脳回・皮質"|"溝・裂"|"深部構造"|"脳底構造"|"血管"|"脳神経";
type FreeObservationItem={key:FreeObservationKey;kind:FreeObservationKind;name:string;latin:string;color:string;source:string;note:string};
const freeObservationItems:FreeObservationItem[]=[
  ...surfaceRegionKeys.map(key=>({key:`region:${key}` as const,kind:"脳回・皮質" as const,name:surfaceRegions[key].name,latin:surfaceRegions[key].latin,color:surfaceRegions[key].color,source:"CerebrAアトラス対応",note:surfaceRegions[key].note})),
  ...surfaceLandmarkKeys.map(key=>({key:`landmark:${key}` as const,kind:"溝・裂" as const,name:surfaceLandmarks[key].name,latin:surfaceLandmarks[key].latin,color:surfaceLandmarks[key].color,source:"模式ガイド",note:surfaceLandmarks[key].note})),
  ...surfaceDeepLandmarkKeys.map(key=>({key:`deep:${key}` as const,kind:"深部構造" as const,name:key==="hypothalamus"?"視床下部領域（内側面）":surfaceDeepLandmarks[key].name,latin:surfaceDeepLandmarks[key].latin,color:surfaceDeepLandmarks[key].color,source:surfaceDeepLandmarks[key].source,note:surfaceDeepLandmarks[key].note})),
  ...basalLandmarkKeys.filter(key=>key!=="olfactory"&&key!=="optic").map(key=>({key:`basal:${key}` as const,kind:"脳底構造" as const,name:key==="hypothalamus"?"視床下部領域（脳底面）":basalLandmarks[key].name,latin:basalLandmarks[key].latin,color:basalLandmarks[key].color,source:"模式・位置目安",note:basalLandmarks[key].note})),
  ...neurovascularStructureKeys.map(key=>{const item=neurovascularStructures[key];return{key:`neuro:${key}` as const,kind:item.kind==="arteries"?"血管" as const:"脳神経" as const,name:item.name,latin:item.latin,color:item.kind==="arteries"?"#d92e24":"#f3cf66",source:"模式3D",note:item.note}}),
];
const freeObservationKinds:FreeObservationKind[]=["脳回・皮質","溝・裂","深部構造","脳底構造","血管","脳神経"];
const freeObservationByKey=new Map(freeObservationItems.map(item=>[item.key,item]));
type PathwayPresetKey="visual"|"papez"|"basal-ganglia";
type PathwayPreset={name:string;summary:string;steps:string[];freeKeys:FreeObservationKey[];sectionKeys:StructureKey[];extraLayers?:{files:string[];color:[number,number,number]}[]};
const pathwayPresets:Record<PathwayPresetKey,PathwayPreset>={
  visual:{name:"視覚路",summary:"視神経から視交叉・視索、視床後部、視放線、一次視覚野までの並びを追います。視交叉と左右視索の断面分節は再作業中です。",steps:["視神経（II）","視交叉・左右視索（画像由来分節待ち）","外側膝状体付近","視放線","鳥距溝周囲の視覚皮質"],freeKeys:["neuro:cn2","neuro:opticChiasm","deep:thalami","region:pericalcarine","region:cuneus","region:lingual"],sectionKeys:["thalamus"],extraLayers:[{files:["block-radiations-optic-radiation"],color:[125,159,208]}]},
  papez:{name:"Papez回路",summary:"内側側頭葉周囲の既存断面ラベル、脳弓の模式3D、アトラス対応領域を由来別に順に観察します。線維走行や結合を再現する表示ではありません。乳頭体はBigBrain水平連続切片から作成した画像誘導ラベルです。",steps:["海馬体","脳弓","乳頭体","視床（前部核は未分節）","帯状回","海馬傍回・嗅内野"],freeKeys:["deep:fornix","deep:thalami","region:cingulate","region:parahippocampal","region:entorhinal"],sectionKeys:["hippocampus","mammillaryBody","thalamus"]},
  "basal-ganglia":{name:"大脳基底核回路",summary:"既存の線条体、淡蒼球、視床下核、黒質、視床を3Dと断面で同じ色に同期し、相互の位置関係を順に確認します。投射や回路結合を再現する表示ではありません。",steps:["尾状核・被殻（線条体）","淡蒼球外節・内節","視床下核","黒質","視床"],freeKeys:["deep:thalami"],sectionKeys:["caudate","putamen","pallidumExternal","pallidumInternal","subthalamic","substantiaNigra","thalamus"]},
};
const pathwayPresetKeys=Object.keys(pathwayPresets) as PathwayPresetKey[];
const papezStepKindLabels:Record<PapezStep["kind"],string>={"section-label":"断面ラベル","schematic-3d":"模式3D","atlas-3d":"アトラス3D"};
const papezStepSourceLabels:Record<PapezStep["source"],string>={"existing-quiz-section-label":"既存クイズ断面ラベル","schematic-3d":"模式3D","atlas-3d":"CerebrA／Desikan系アトラス3D"};

const structures: Record<StructureKey, StructureInfo> = {
  ventricle: { name: "側脳室", latin: "Ventriculus lateralis", color: "#49a9b4", rgb:[73,169,180], ids:[92,41,56,5], bigbrainIds:[23,24], labelSource:"atlas-provisional", meshFocus:"ventricle", note: "前角・体部・後角・下角が連続する空間です。断面を動かして形の変化を追います。", relation: "脳梁の下方、尾状核・視床の内側" },
  thirdVentricle: { name:"第三脳室", latin:"Ventriculus tertius", color:"#58aeb8", rgb:[88,174,184], ids:[80,29], bigbrainIds:[25], labelSource:"atlas-provisional", meshFocus:"ventricle", note:"左右の視床・視床下部に囲まれる正中の細い腔です。上方は視床、下方（底側）は視床下部に接し、水平断・冠状断で側脳室との位置関係を確認します。", relation:"左右の視床・視床下部の間（上方：視床、下方：視床下部）" },
  fourthVentricle: { name:"第四脳室", latin:"Ventriculus quartus", color:"#4997b0", rgb:[73,151,176], ids:[88,37], bigbrainIds:[26], labelSource:"atlas-provisional", meshFocus:"ventricle", note:"橋・延髄と小脳の間にある腔です。矢状断で中脳水道から中心管への連続を追います。", relation:"脳幹の背側、小脳の腹側" },
  corpusCallosum: { name:"脳梁", latin:"Corpus callosum", color:"#dbc270", rgb:[219,194,112], ids:[], bigbrainIds:[30], labelSource:"image-guided", note:"左右大脳半球を結ぶ交連線維です。矢状断で膝・幹・膨大を連続して確認します。", relation:"側脳室の上方、帯状回の下方" },
  internalCapsule: { name:"内包", latin:"Capsula interna", color:"#e3d8b0", rgb:[227,216,176], ids:[], bigbrainIds:[31,32], labelSource:"image-guided", note:"尾状核・視床とレンズ核の間を走る白質路です。冠状断で前脚・膝・後脚の曲がりを追います。", relation:"尾状核・視床の外側、被殻・淡蒼球の内側" },
  caudate: { name: "尾状核", latin: "Nucleus caudatus", color: "#e19749", rgb:[225,151,73], ids:[100,49], bigbrainIds:[7,8], labelSource:"manual", meshFocus:"caudate", note: "側脳室に沿って前後へ連続する核です。断面を移動して頭・体・尾の位置変化を追います。", relation: "側脳室の外側、内包の内側" },
  putamen: { name:"被殻", latin:"Putamen", color:"#d9854f", rgb:[217,133,79], ids:[72,21], bigbrainIds:[9,10], labelSource:"manual", note:"レンズ核の外側部です。淡蒼球との境界と、外側を走る外包を確認します。", relation:"淡蒼球の外側、島皮質の内側" },
  pallidumExternal: { name:"淡蒼球外節", latin:"Globus pallidus externus", color:"#d0ae5c", rgb:[208,174,92], ids:[], bigbrainIds:[11,12], labelSource:"manual", note:"淡蒼球の外側区画です。内節の主要出力へつながる大脳基底核内の中継・調節部として、内外の髄板を手がかりに確認します。", relation:"被殻の内側、淡蒼球内節の外側" },
  pallidumInternal: { name:"淡蒼球内節", latin:"Globus pallidus internus", color:"#b88d42", rgb:[184,141,66], ids:[], bigbrainIds:[13,14], labelSource:"manual", note:"淡蒼球の内側区画です。大脳基底核から視床などへ向かう主要な出力部で、外節より小さく内包に接する位置を確認します。", relation:"淡蒼球外節の内側、内包の外側" },
  pallidum: { name:"淡蒼球（全体）", latin:"Globus pallidus", color:"#c8a451", rgb:[200,164,81], ids:[78,27], bigbrainIds:[11,12,13,14], labelSource:"manual", note:"外節と内節を一括表示します。細部の学習では、別項目の外節・内節を使ってください。", relation:"被殻の内側、内包の外側" },
  thalamus: { name: "視床", latin: "Thalamus", color: "#8d82c4", rgb:[141,130,196], ids:[91,40], bigbrainIds:[15,16], labelSource:"manual", meshFocus:"thalamus", note: "第三脳室を挟んで左右に位置します。水平断と冠状断で内包との境界を比較します。", relation: "第三脳室外側、内包の内側" },
  hippocampus: { name: "海馬", latin: "Hippocampus", color: "#c8798d", rgb:[200,121,141], ids:[99,48], bigbrainIds:[17,18], labelSource:"manual", meshFocus:"hippocampus", note: "側脳室下角の床に沿う構造です。冠状断と矢状断を往復して前後方向の連続を確認します。", relation: "側脳室下角の内側・床" },
  amygdala: { name:"扁桃体", latin:"Corpus amygdaloideum", color:"#c76878", rgb:[199,104,120], ids:[70,19], bigbrainIds:[21,22], labelSource:"manual", note:"側頭葉内側前方の核群です。海馬の前端との移行を連続断面で追います。", relation:"海馬頭の前上方、側脳室下角の前方" },
  accumbens: { name:"側坐核", latin:"Nucleus accumbens", color:"#78b579", rgb:[120,181,121], ids:[55,4], bigbrainIds:[19,20], labelSource:"manual", note:"尾状核頭と被殻が腹側で連続する領域に位置します。前方の冠状断で確認します。", relation:"尾状核頭・被殻の腹側、前交連の前下方" },
  redNucleus: { name:"赤核", latin:"Nucleus ruber", color:"#d24f49", rgb:[210,79,73], ids:[], bigbrainIds:[1,2], labelSource:"manual", note:"中脳被蓋にある円形の核です。黒質・中脳水道との位置関係を確認します。", relation:"中脳水道の腹外側、黒質の背内側" },
  substantiaNigra: { name:"黒質", latin:"Substantia nigra", color:"#716387", rgb:[113,99,135], ids:[], bigbrainIds:[3,4], labelSource:"manual", note:"中脳脚と被蓋の境界に沿う帯状の核です。赤核より腹側に位置します。", relation:"大脳脚の背側、赤核の腹外側" },
  subthalamic: { name:"視床下核", latin:"Nucleus subthalamicus", color:"#e0ad45", rgb:[224,173,69], ids:[], bigbrainIds:[5,6], labelSource:"manual", note:"間脳の視床下域にある小さなレンズ状の核です。視床下部や中脳そのものとは区別し、淡蒼球内節・黒質との位置関係を連続断面で追います。", relation:"視床の腹側、黒質の背側、内包の内側" },
  brainstem: { name:"脳幹", latin:"Truncus encephali", color:"#739b72", rgb:[115,155,114], ids:[62,11], bigbrainIds:[27], labelSource:"atlas-provisional", note:"中脳・橋・延髄へ連続する軸性構造です。脳神経の出入口を考える基準になります。", relation:"間脳の下方、小脳の前方" },
  cerebellum: { name:"小脳", latin:"Cerebellum", color:"#8ba867", rgb:[139,168,103], ids:[97,46,90,39], bigbrainIds:[28,29], labelSource:"atlas-provisional", note:"皮質と白質、正中の虫部を区別します。水平断と矢状断で小脳脚との連続を追います。", relation:"脳幹の後方、後頭葉の下方" },
  opticChiasm: { name:"視交叉〜視索候補", latin:"Chiasma et tractus optici (atlas candidate)", color:"#d4b65b", rgb:[212,182,91], ids:[68,17], bigbrainIds:[33], labelSource:"atlas-provisional", note:"CerebrAのOptic Chiasmラベルは、視交叉と視索の連続性を保つよう再定義された範囲です。視交叉だけの境界や乳頭体の分節を示すものではありません。", relation:"視床下部の前下方から視索方向へ連続し、模式乳頭体の前外側に近接" },
  mammillaryBody: { name:"乳頭体", latin:"Corpora mamillaria", color:"#a66749", rgb:[166,103,73], ids:[], bigbrainIds:[39,40], labelSource:"image-guided-reviewed", note:"BigBrain水平連続切片で、核領域と独立した丸い外形を画像誘導分節しました。視床下部との付着境界は直交断で継続確認します。", relation:"漏斗の後方、脚間窩の前方に左右一対で位置" },
  insula: { name:"島皮質", latin:"Insula", color:"#6f9db0", rgb:[111,157,176], ids:[74,23], bigbrainIds:[34,35], labelSource:"atlas-provisional", note:"外側溝の深部にある皮質です。弁蓋を除いた位置関係を断面で確認します。", relation:"被殻・外包の外側、前頭・頭頂・側頭弁蓋の深部" },
};
const structureMeshFiles:Partial<Record<StructureKey,string[]>>={
  ventricle:["ventricle"],thirdVentricle:["block-diencephalon-third-ventricle"],fourthVentricle:["block-hindbrain-fourth-ventricle"],
  corpusCallosum:["block-commissural-system-corpus-callosum"],internalCapsule:["block-radiations-internal-capsule"],caudate:["caudate"],putamen:["block-radiations-putamen"],
  pallidumExternal:["block-radiations-pallidum-external"],pallidumInternal:["block-radiations-pallidum-internal"],pallidum:["block-radiations-pallidum-external","block-radiations-pallidum-internal"],
  thalamus:["thalamus"],hippocampus:["hippocampus"],amygdala:["block-medial-temporal-amygdala"],redNucleus:["block-midbrain-section-red-nuclei"],
  accumbens:["section-accumbens"],substantiaNigra:["block-midbrain-section-substantia-nigra"],subthalamic:["block-diencephalon-subthalamic-nuclei"],brainstem:["segment-brainstem"],cerebellum:["segment-cerebellum"],
  opticChiasm:["section-optic-chiasm"],insula:["section-insula"],
};

const structureGroups:{key:string;name:string;color:string;members:StructureKey[]}[]=[
  {key:"ventricles",name:"脳室系",color:"#49a9b4",members:["ventricle","thirdVentricle","fourthVentricle"]},
  {key:"basal",name:"大脳基底核",color:"#d9854f",members:["caudate","putamen","pallidumExternal","pallidumInternal","accumbens"]},
  {key:"midline",name:"白質・視床",color:"#d2b765",members:["corpusCallosum","internalCapsule","thalamus"]},
  {key:"limbic",name:"辺縁系",color:"#c8798d",members:["hippocampus","amygdala","mammillaryBody"]},
  {key:"midbrain",name:"中脳核・視床下域",color:"#b06e75",members:["redNucleus","substantiaNigra","subthalamic"]},
  {key:"posterior",name:"脳幹・小脳",color:"#7e9f6c",members:["brainstem","cerebellum"]},
];

const structureFunctions:Record<StructureKey,string>={
  ventricle:"脳脊髄液を含む腔で、脳室系の連続性と周囲構造の位置を知る基準になります。",
  thirdVentricle:"左右の視床・視床下部に囲まれる間脳正中の髄液腔です。上方は視床、下方（底側）は視床下部で、各構造の位置関係を読む基準になります。",
  fourthVentricle:"後脳の髄液腔で、中脳水道からくも膜下腔へ至る髄液循環の通路です。",
  corpusCallosum:"左右大脳半球の皮質間を連絡し、両半球の情報統合を担う最大の交連線維です。",
  internalCapsule:"皮質と視床・脳幹・脊髄を結ぶ投射線維が密集し、運動・感覚経路が通ります。",
  caudate:"行動選択、眼球運動、認知的な運動制御に関わる線条体の一部です。",
  putamen:"随意運動の開始・大きさの調節や、習慣化された運動に関わります。",
  pallidumExternal:"淡蒼球外節（GPe）は大脳基底核内の中継・調節部として、視床下核などとの間接路を調整します。",
  pallidumInternal:"淡蒼球内節（GPi）は大脳基底核から視床などへ向かう主要な出力部として、運動選択を調節します。",
  pallidum:"淡蒼球は外節（GPe）の内部中継・調節部と、内節（GPi）の主要出力部からなり、基底核回路の運動選択を調節します。",
  thalamus:"感覚・運動・認知情報を大脳皮質へ中継し、皮質活動を調整します。",
  hippocampus:"エピソード記憶の形成と空間情報の処理に重要です。",
  amygdala:"情動、脅威や報酬の評価、自律反応を伴う記憶形成に関わります。",
  accumbens:"報酬予測、動機づけ、行動を起こす価値判断に関わる腹側線条体です。",
  redNucleus:"小脳などから入力を受ける中脳核で、運動調節系の位置理解に重要です。",
  substantiaNigra:"線条体へドパミンを送り、運動開始、学習、報酬処理を調節します。",
  subthalamic:"間脳の視床下域にある視床下核（STN）です。視床下部や中脳そのものとは区別し、大脳基底核回路を興奮性に調節して競合する運動の抑制に関わります。",
  brainstem:"脳神経核、上下行路、覚醒・呼吸・循環など生命維持に関わる中枢を含みます。",
  cerebellum:"運動の正確さ、タイミング、平衡、姿勢、運動学習を調整します。",
  opticChiasm:"左右の視神経線維が部分交叉し、両眼の視野情報を左右半球へ振り分けます。",
  mammillaryBody:"海馬体から脳弓を介して入力を受け、乳頭視床路を通じて前部視床へ伝えるPapez回路の中継部です。",
  insula:"内臓感覚、味覚、痛み、情動、自律反応を統合し、身体内部の状態認識に関わります。",
};

const atlasRegions:{ids:number[];name:string}[]=[
  {ids:[80,29],name:"第三脳室"},{ids:[88,37],name:"第四脳室"},{ids:[62,11],name:"脳幹"},{ids:[92,41],name:"側脳室"},{ids:[56,5],name:"側脳室下角"},{ids:[97,46],name:"小脳皮質"},{ids:[90,39],name:"小脳白質"},{ids:[91,40],name:"視床"},{ids:[100,49],name:"尾状核"},{ids:[72,21],name:"被殻"},{ids:[78,27],name:"淡蒼球"},{ids:[99,48],name:"海馬"},{ids:[70,19],name:"扁桃体"},{ids:[55,4],name:"側坐核"},{ids:[77,26],name:"腹側間脳"},{ids:[68,17],name:"視交叉"},{ids:[76,25],name:"前脳基底部"},{ids:[101,50],name:"小脳虫部 I–V"},{ids:[53,2],name:"小脳虫部 VI–VII"},{ids:[71,20],name:"小脳虫部 VIII–X"},
  {ids:[81,30],name:"尾側前帯状皮質"},{ids:[93,42],name:"尾側中前頭回"},{ids:[94,43],name:"楔部"},{ids:[87,36],name:"嗅内野"},{ids:[75,24],name:"紡錘状回"},{ids:[61,10],name:"下頭頂小葉"},{ids:[54,3],name:"下側頭回"},{ids:[84,33],name:"帯状回峡部"},{ids:[85,34],name:"外側後頭皮質"},{ids:[58,7],name:"外側眼窩前頭皮質"},{ids:[63,12],name:"舌状回"},{ids:[66,15],name:"内側眼窩前頭皮質"},{ids:[79,28],name:"中側頭回"},{ids:[69,18],name:"海馬傍回"},{ids:[67,16],name:"中心傍小葉"},{ids:[83,32],name:"下前頭回弁蓋部"},{ids:[95,44],name:"下前頭回眼窩部"},{ids:[73,22],name:"下前頭回三角部"},{ids:[57,6],name:"鳥距溝周囲皮質"},{ids:[64,13],name:"中心後回"},{ids:[98,47],name:"後帯状皮質"},{ids:[86,35],name:"中心前回"},{ids:[82,31],name:"楔前部"},{ids:[59,8],name:"吻側前帯状皮質"},{ids:[52,1],name:"吻側中前頭回"},{ids:[89,38],name:"上前頭回"},{ids:[60,9],name:"上頭頂小葉"},{ids:[96,45],name:"上側頭回"},{ids:[102,51],name:"縁上回"},{ids:[65,14],name:"横側頭回"},{ids:[74,23],name:"島皮質"}
];
const atlasNameById=new Map(atlasRegions.flatMap(region=>region.ids.map(id=>[id,region.name] as const)));
atlasNameById.set(201,"白質");atlasNameById.set(202,"灰白質");atlasNameById.set(203,"髄液腔");
const bigBrainNameById=new Map<number,string>([[1,"左赤核"],[2,"右赤核"],[3,"左黒質"],[4,"右黒質"],[5,"左視床下核"],[6,"右視床下核"],[7,"左尾状核"],[8,"右尾状核"],[9,"左被殻"],[10,"右被殻"],[11,"左淡蒼球外節"],[12,"右淡蒼球外節"],[13,"左淡蒼球内節"],[14,"右淡蒼球内節"],[15,"左視床"],[16,"右視床"],[17,"左海馬"],[18,"右海馬"],[19,"左側坐核"],[20,"右側坐核"],[21,"左扁桃体"],[22,"右扁桃体"],[23,"左側脳室（試作）"],[24,"右側脳室（試作）"],[25,"第三脳室（試作）"],[26,"第四脳室（試作）"],[27,"脳幹（試作）"],[28,"左小脳（試作）"],[29,"右小脳（試作）"],[30,"脳梁候補（試作）"],[31,"左内包候補（試作）"],[32,"右内包候補（試作）"],[33,"視交叉候補（試作）"],[34,"左島皮質候補（試作）"],[35,"右島皮質候補（試作）"],[39,"左乳頭体"],[40,"右乳頭体"]]);

const quizQuestions:QuizQuestion[]=[
  {target:"caudate",category:"basal",plane:"coronal",position:65,prompt:"側脳室前角の外側に沿う核はどれですか？",options:["caudate","putamen","pallidum","thalamus"]},
  {target:"putamen",category:"basal",plane:"coronal",position:61,prompt:"淡蒼球の外側にあるレンズ核の構成要素はどれですか？",options:["putamen","pallidum","caudate","amygdala"]},
  {target:"pallidum",category:"basal",plane:"coronal",position:57,prompt:"被殻の内側、内包の外側に位置する構造はどれですか？",options:["pallidum","putamen","thalamus","internalCapsule"]},
  {target:"accumbens",category:"basal",plane:"coronal",position:62,prompt:"尾状核頭と被殻が腹側で連続する領域はどれですか？",options:["accumbens","caudate","pallidum","opticChiasm"]},
  {target:"hippocampus",category:"limbic",plane:"coronal",position:51,prompt:"側脳室下角の床に沿う構造はどれですか？",options:["hippocampus","amygdala","accumbens","insula"]},
  {target:"amygdala",category:"limbic",plane:"coronal",position:56,prompt:"海馬頭の前上方にある核群はどれですか？",options:["amygdala","hippocampus","putamen","thalamus"]},
  {target:"mammillaryBody",category:"limbic",plane:"horizontal",position:69,prompt:"漏斗の後方、脚間窩の前方に左右一対で見える小隆起はどれですか？",options:["mammillaryBody","redNucleus","thalamus","opticChiasm"]},
  {target:"redNucleus",category:"midbrain",plane:"horizontal",position:67,prompt:"中脳水道の腹外側、黒質の背内側に見える核はどれですか？",options:["redNucleus","substantiaNigra","subthalamic","thalamus"]},
  {target:"substantiaNigra",category:"midbrain",plane:"horizontal",position:69,prompt:"大脳脚の背側に沿う帯状の核はどれですか？",options:["substantiaNigra","redNucleus","pallidum","putamen"]},
  {target:"subthalamic",category:"midbrain",plane:"horizontal",position:66,prompt:"間脳の視床下域にあり、視床の腹側・黒質の背側にある小さな核はどれですか？",options:["subthalamic","redNucleus","accumbens","amygdala"]},
  {target:"ventricle",category:"ventricles",plane:"horizontal",position:51,prompt:"左右大脳半球の内部でC字形に連続する髄液腔はどれですか？",options:["ventricle","thirdVentricle","fourthVentricle","corpusCallosum"]},
  {target:"thalamus",category:"connections",plane:"coronal",position:49,prompt:"第三脳室の両側を占める大きな灰白質はどれですか？",options:["thalamus","caudate","hippocampus","subthalamic"]},
  {target:"corpusCallosum",category:"connections",plane:"sagittal",position:50,prompt:"正中矢状断で側脳室の上方を弓状に走る交連線維はどれですか？",options:["corpusCallosum","internalCapsule","thalamus","caudate"]},
  {target:"internalCapsule",category:"connections",plane:"coronal",position:58,prompt:"尾状核・視床とレンズ核の間を通る白質路はどれですか？",options:["internalCapsule","corpusCallosum","pallidum","insula"]},
  {target:"insula",category:"connections",plane:"coronal",position:64,prompt:"外側溝の深部で、被殻・外包より外側にある皮質はどれですか？",options:["insula","putamen","internalCapsule","pallidum"]},
  {target:"brainstem",category:"hindbrain",plane:"horizontal",position:83,prompt:"第四脳室の腹側で中脳・橋・延髄へ連続する構造はどれですか？",options:["brainstem","cerebellum","thalamus","fourthVentricle"]},
  {target:"cerebellum",category:"hindbrain",plane:"horizontal",position:80,prompt:"橋・延髄の後方にあり、左右半球と虫部をもつ構造はどれですか？",options:["cerebellum","brainstem","thalamus","hippocampus"]},
  {target:"precentral",category:"surface",view:"lateral",prompt:"中心溝の前方に沿う脳回はどれですか？",options:["precentral","postcentral","inferiorFrontal","superiorTemporal"]},
  {target:"superiorTemporal",category:"surface",view:"lateral",prompt:"外側溝の下縁に沿う側頭葉の脳回はどれですか？",options:["superiorTemporal","middleTemporal","supramarginal","inferiorFrontal"]},
  {target:"superiorFrontal",category:"surface",view:"superior",prompt:"大脳縦裂に近い前頭葉上面を占める脳回はどれですか？",options:["superiorFrontal","precentral","postcentral","superiorParietal"]},
  {target:"precuneus",category:"surface",view:"medial",prompt:"中心傍小葉の後方、頭頂後頭溝の前方にある領域はどれですか？",options:["precuneus","paracentral","cuneus","pericalcarine"]},
  {target:"cuneus",category:"surface",view:"medial",prompt:"頭頂後頭溝と鳥距溝に挟まれる領域はどれですか？",options:["cuneus","precuneus","lingual","pericalcarine"]},
  {target:"fusiform",category:"surface",view:"inferior",prompt:"側頭葉・後頭葉下面で内外側の溝間にある脳回はどれですか？",options:["fusiform","lingual","middleTemporal","orbitofrontal"]},
];

// This pilot is deliberately separate from the 23-question content snapshot
// above. It only asks learners to identify an already-rendered, white-selected
// schematic overlay; it does not add origin, course, or connection claims.
const neurovascularQuizQuestions:NeurovascularQuizQuestion[]=[
  {target:"ica",category:"neurovascular",view:"arteries",format:"neurovascular",detail:"arteries",origin:"provisional",prompt:"白色で強調された模式3Dの名称はどれですか？",options:["ica","aca","mca","pca"]},
  {target:"aca",category:"neurovascular",view:"arteries",format:"neurovascular",detail:"arteries",origin:"provisional",prompt:"白色で強調された模式3Dの名称はどれですか？",options:["aca","ica","mca","pca"]},
  {target:"mca",category:"neurovascular",view:"arteries",format:"neurovascular",detail:"arteries",origin:"provisional",prompt:"白色で強調された模式3Dの名称はどれですか？",options:["mca","ica","aca","pca"]},
  {target:"vertebral",category:"neurovascular",view:"arteries",format:"neurovascular",detail:"arteries",origin:"provisional",prompt:"白色で強調された模式3Dの名称はどれですか？",options:["vertebral","basilar","pca","mca"]},
  {target:"basilar",category:"neurovascular",view:"arteries",format:"neurovascular",detail:"arteries",origin:"provisional",prompt:"白色で強調された模式3Dの名称はどれですか？",options:["basilar","vertebral","pca","mca"]},
  {target:"pca",category:"neurovascular",view:"arteries",format:"neurovascular",detail:"arteries",origin:"provisional",prompt:"白色で強調された模式3Dの名称はどれですか？",options:["pca","basilar","vertebral","mca"]},
  {target:"cn1",category:"neurovascular",view:"cranialNerves",format:"neurovascular",detail:"cranialNerves",origin:"provisional",prompt:"白色で強調された模式3Dの名称はどれですか？",options:["cn1","cn3","cn5","cn12"]},
  {target:"cn3",category:"neurovascular",view:"cranialNerves",format:"neurovascular",detail:"cranialNerves",origin:"provisional",prompt:"白色で強調された模式3Dの名称はどれですか？",options:["cn3","cn4","cn5","cn6"]},
  {target:"cn4",category:"neurovascular",view:"cranialNerves",format:"neurovascular",detail:"cranialNerves",origin:"provisional",prompt:"白色で強調された模式3Dの名称はどれですか？",options:["cn4","cn3","cn6","cn7"]},
  {target:"cn5",category:"neurovascular",view:"cranialNerves",format:"neurovascular",detail:"cranialNerves",origin:"provisional",prompt:"白色で強調された模式3Dの名称はどれですか？",options:["cn5","cn6","cn7","cn8"]},
  {target:"cn6",category:"neurovascular",view:"cranialNerves",format:"neurovascular",detail:"cranialNerves",origin:"provisional",prompt:"白色で強調された模式3Dの名称はどれですか？",options:["cn6","cn5","cn7","cn8"]},
  {target:"cn7",category:"neurovascular",view:"cranialNerves",format:"neurovascular",detail:"cranialNerves",origin:"provisional",prompt:"白色で強調された模式3Dの名称はどれですか？",options:["cn7","cn6","cn8","cn9"]},
  {target:"cn8",category:"neurovascular",view:"cranialNerves",format:"neurovascular",detail:"cranialNerves",origin:"provisional",prompt:"白色で強調された模式3Dの名称はどれですか？",options:["cn8","cn7","cn9","cn10"]},
  {target:"cn9",category:"neurovascular",view:"cranialNerves",format:"neurovascular",detail:"cranialNerves",origin:"provisional",prompt:"白色で強調された模式3Dの名称はどれですか？",options:["cn9","cn10","cn11","cn12"]},
  {target:"cn10",category:"neurovascular",view:"cranialNerves",format:"neurovascular",detail:"cranialNerves",origin:"provisional",prompt:"白色で強調された模式3Dの名称はどれですか？",options:["cn10","cn9","cn11","cn12"]},
  {target:"cn11",category:"neurovascular",view:"cranialNerves",format:"neurovascular",detail:"cranialNerves",origin:"provisional",prompt:"白色で強調された模式3Dの名称はどれですか？",options:["cn11","cn10","cn12","cn9"]},
  {target:"cn12",category:"neurovascular",view:"cranialNerves",format:"neurovascular",detail:"cranialNerves",origin:"provisional",prompt:"白色で強調された模式3Dの名称はどれですか？",options:["cn12","cn9","cn10","cn11"]},
];
const allQuizQuestions:QuizQuestion[]=[...quizQuestions,...neurovascularQuizQuestions];

function isNeurovascularQuiz(question:QuizQuestion):question is NeurovascularQuizQuestion{return question.category==="neurovascular"}
function isSurfaceQuiz(question:QuizQuestion):question is SurfaceQuizQuestion{return question.category==="surface"}
function isStandardQuizStructure(key:string){const source=structures[key as StructureKey]?.labelSource;return source==="manual"||source==="image-guided-reviewed"}
function isProvisionalQuiz(question:QuizQuestion){
  if(isNeurovascularQuiz(question)||isSurfaceQuiz(question))return true;
  return !isStandardQuizStructure(question.target)||question.options.some(option=>!isStandardQuizStructure(option));
}
type QuizGranularityFields=Pick<QuizFilterQuestion,"format"|"detail"|"origin">;
type QuizQuestionWithGranularity=QuizQuestion&QuizGranularityFields;
function withQuizGranularity(question:QuizQuestion):QuizQuestionWithGranularity{return {...question,...QUIZ_GRANULARITY_BY_TARGET[question.target]} as QuizQuestionWithGranularity}
const quizQuestionsForFiltering:QuizQuestionWithGranularity[]=allQuizQuestions.map(withQuizGranularity);
const standardQuizQuestions=quizQuestions.filter(question=>!isProvisionalQuiz(question));

function sliceVariant(position: number) {
  if (position < 25) return "anterior";
  if (position < 46) return "capsular";
  if (position < 64) return "thalamic";
  if (position < 79) return "hippocampal";
  return "posterior";
}

function shuffledItems<T>(items:readonly T[]) {
  const next=[...items];
  for(let i=next.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[next[i],next[j]]=[next[j],next[i]]}
  return next;
}
function shuffledQuestions(items:QuizQuestion[]):QuizQuestion[] {
  return shuffledItems(items.map(question=>{const enriched=withQuizGranularity(question);return isSurfaceQuiz(enriched)
    ? {...enriched,options:shuffledItems(question.options)}
    : {...enriched,options:shuffledItems(question.options)}})) as QuizQuestion[];
}

function OrientationCompass({rotation,compact=false}:{rotation:Rotation;compact?:boolean}) {
  const ax=rotation.x*Math.PI/180,ay=rotation.y*Math.PI/180,az=(rotation.z??0)*Math.PI/180;
  const cx=Math.cos(ax),sx=Math.sin(ax),cy=Math.cos(ay),sy=Math.sin(ay),cz=Math.cos(az),sz=Math.sin(az);
  const matrix=[cz*cy-sz*sx*sy,sz*cy+cz*sx*sy,-cx*sy,-sz*cx,cz*cx,sx,cz*sy+sz*sx*cy,sz*sy-cz*sx*cy,cx*cy];
  const axes:{positive:string;negative:string;vector:[number,number,number]}[]=[
    {positive:"R",negative:"L",vector:[1,0,0]},
    {positive:"S",negative:"I",vector:[0,1,0]},
    {positive:"A",negative:"P",vector:[0,0,1]},
  ];
  return <div className={`orientationCompass ${compact?"compact":""}`} aria-label="現在の解剖学的方位。R 右、L 左、A 前、P 後、S 上、I 下">
    {axes.map(axis=>{
      const [x,y,z]=axis.vector,rx=matrix[0]*x+matrix[3]*y+matrix[6]*z,ry=matrix[1]*x+matrix[4]*y+matrix[7]*z,rz=matrix[2]*x+matrix[5]*y+matrix[8]*z;
      const length=compact?15:24,dx=rx*length,dy=-ry*length;
      // An axis pointing into/out of the screen has no truthful 2D endpoint.
      // Keep its pair in the legend instead of stacking two unreadable labels.
      if(Math.hypot(dx,dy)<8)return null;
      return <div className="compassAxis" key={axis.positive} style={{opacity:.48+Math.abs(rz)*.42}}>
        <i style={{transform:`rotate(${Math.atan2(dy,dx)*180/Math.PI}deg)`,width:`${Math.hypot(dx,dy)}px`}}/>
        <b className="compassPositive" style={{transform:`translate(${dx}px,${dy}px)`,zIndex:rz<0?2:1}}>{axis.positive}</b>
        <b className="compassNegative" style={{transform:`translate(${-dx}px,${-dy}px)`,zIndex:rz>0?2:1}}>{axis.negative}</b>
      </div>;
    })}
    <span>R/L · A/P · S/I</span>
  </div>;
}

function currentPhoneCapability(){
  if(typeof window==="undefined")return false;
  return phoneCapabilityFromMedia({
    width:window.innerWidth,
    hoverMatches:window.matchMedia("(hover: none)").matches,
    pointerMatches:window.matchMedia("(pointer: coarse)").matches,
  });
}

// This is deliberately a loopback-only, query-opt-in hook for the local
// Canvas visibility audit. It is inert for ordinary users and for any hosted
// URL. The audit navigates afresh with highlight=on/off so the question,
// queue, and all non-highlight state are reconstructed identically.
function quizVisibilityAuditHighlightOverride():boolean|null{
  if(typeof window==="undefined")return null;
  const host=window.location.hostname;
  if(host!=="127.0.0.1"&&host!=="localhost"&&host!=="::1")return null;
  const params=new URLSearchParams(window.location.search);
  if(params.get("quizVisibilityAudit")!=="1")return null;
  const value=params.get("highlight");
  return value==="off"?false:value==="on"?true:null;
}

function quizVisibilityAuditTargetOverride():QuizQuestion|null{
  if(typeof window==="undefined")return null;
  const host=window.location.hostname;
  if(host!=="127.0.0.1"&&host!=="localhost"&&host!=="::1")return null;
  const params=new URLSearchParams(window.location.search);
  if(params.get("quizVisibilityAudit")!=="1")return null;
  const target=params.get("target");
  return allQuizQuestions.find(question=>question.target===target)??null;
}
const QUIZ_VISIBILITY_INVENTORY_SHA256="91b9b9cd4f14ccbe740643d3714ea03819f9dfee24aa52e67315d8127222773b";

const anatomyReviewSurfaceLabels:Record<AnatomyReviewSurface,string>={all:"すべての表示面",surface:"脳表",sections:"断面",blocks:"ブロック標本",quiz:"復習"};
const anatomyReviewRepresentationLabels:Record<string,string>={
  "manual-same-grid":"同一格子・手動分節",
  "atlas-provisional":"アトラス照合・試作",
  "image-guided-provisional":"画像誘導・試作",
  "image-guided-reviewed":"画像誘導・プロジェクト採用",
  "atlas-surface":"脳表アトラス",
  "schematic-3d":"模式3D",
  "position-guide":"位置目安",
  "text-only":"文章のみ",
  "not-recorded":"未収録",
};
const anatomyReviewProjectLabels:Record<string,string>={pending:"プロジェクト内レビュー未完了","reviewed-by-project":"プロジェクト内レビュー済み（専門家レビューとは別）"};
const anatomyReviewQuizLabels:Record<string,string>={standard:"通常クイズ対象",pilot:"試作クイズ対象",none:"クイズ対象外"};

function AnatomyReviewQueuePanel({items,total,surfaceFilter,representationFilter,onSurfaceChange,onRepresentationChange}:{items:AnatomyReviewQueueItem[];total:number;surfaceFilter:AnatomyReviewSurface;representationFilter:string;onSurfaceChange:(value:AnatomyReviewSurface)=>void;onRepresentationChange:(value:string)=>void}){
  const representationOptions=Array.isArray(anatomyReviewRegistry.representationEnum)?anatomyReviewRegistry.representationEnum:[];
  return <details className="anatomyReviewPanel anatomyReviewReadOnly">
    <summary className="anatomyReviewPanelSummary"><span><span>REVIEW PREPARATION · READ ONLY</span><b>専門家レビュー準備</b><small>expert pending {total}件・フィルタ後 {items.length}件</small></span><em className="anatomyReviewReadOnlyBadge">読み取り専用</em></summary>
    <div className="anatomyReviewPanelBody">
      <p className="anatomyReviewIntro">この一覧は、由来台帳で <code>expertReview: pending</code> の項目を、専門家が確認する前の準備用に表示します。専門家レビュー完了、解剖学的妥当性、採否は示しません。項目の編集・承認・保存や、レビュー担当者名の入力はできません。</p>
      <div className="anatomyReviewFilters">
        <label><span>表示面</span><select value={surfaceFilter} onChange={event=>onSurfaceChange(event.target.value as AnatomyReviewSurface)}>{Object.entries(anatomyReviewSurfaceLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
        <label><span>表示区分</span><select value={representationFilter} onChange={event=>onRepresentationChange(event.target.value)}><option value="all">すべての表示区分</option>{representationOptions.map(value=><option key={value} value={value}>{anatomyReviewRepresentationLabels[value]??value}</option>)}</select></label>
        <output aria-live="polite">{total}件中 {items.length}件</output>
      </div>
      {items.length?<div className="anatomyReviewList">{items.map(item=>{
      const entry=item.entry;
      const legacyOptic=isLegacyOpticEntry(entry);
      const mammillary=isMammillaryEntry(entry);
      const observationHash=observationHashForEntry(entry);
      const observationWorkspace=observationWorkspaceForEntry(entry);
      const observationLabel=observationWorkspace?anatomyReviewSurfaceLabels[observationWorkspace]:"";
      return <details className="anatomyReviewCard" key={item.key}>
        <summary><span><b>{entry.lectureLabel??entry.appLabel??item.key}</b><small>{item.key}</small></span><em>専門家レビュー未完了</em></summary>
        <div className="anatomyReviewCardBody">
          <dl className="anatomyReviewFacts">
            <div><dt>由来区分</dt><dd>{entry.representations.map(value=><span key={value}>{anatomyReviewRepresentationLabels[value]??value}</span>)}</dd></div>
            <div><dt>表示面</dt><dd>{entry.learnerSurfaces.length?entry.learnerSurfaces.map(value=><span key={value}>{anatomyReviewSurfaceLabels[value as AnatomyReviewSurface]??value}</span>):<span>利用者向け表示なし</span>}</dd></div>
            <div><dt>専門家レビュー</dt><dd>未完了（pending）</dd></div>
            <div><dt>プロジェクトレビュー</dt><dd>{anatomyReviewProjectLabels[entry.projectReview]??entry.projectReview}</dd></div>
            <div><dt>クイズ扱い</dt><dd>{anatomyReviewQuizLabels[entry.quizEligibility]??entry.quizEligibility}</dd></div>
          </dl>
          {legacyOptic&&<p className="anatomyReviewWarning"><b>旧ID33混合領域</b> 断面学習画面・通常クイズの正答対象と分節編集入口には結びません。脳表の一般観察入口だけを表示します。</p>}
          {mammillary&&<p className="anatomyReviewNote"><b>ID39・40</b> プロジェクト内レビューを経て公開教材ラベルとして採用していますが、専門家レビューは未完了です。</p>}
          <details className="anatomyReviewSubdetails"><summary>既知の制限</summary><ul>{entry.knownLimitations.map((value,index)=><li key={`${item.key}-limit-${index}`}>{value}</li>)}</ul></details>
          <details className="anatomyReviewSubdetails"><summary>source refs</summary>{entry.sourceRefs.length?<ul>{entry.sourceRefs.map(value=><li key={value}><code>{value}</code></li>)}</ul>:<p>この項目に記録されたsource refsはありません。</p>}</details>
          {observationHash?<a className="anatomyReviewObserve" href={observationHash}>一般の{observationLabel}画面を開く（この項目・構造・位置は自動選択されません） →</a>:<span className="anatomyReviewNoObserve">対応する利用者向け観察入口はありません</span>}
        </div>
      </details>;
      })}</div>:<p className="anatomyReviewEmpty">この条件に一致する準備項目はありません。</p>}
      <footer className="anatomyReviewFooter">由来・確度・既知の制限を確認するための準備一覧です。専門家による確認、解剖学的判断、採用判断を代行しません。</footer>
    </div>
  </details>;
}

export default function Home() {
  const initialPlane=typeof window==="undefined"?"coronal":planeFromHash(window.location.hash);
  const initialBlockSpecimen=typeof window==="undefined"?"lateral-ventricle":blockSpecimenFromHash(window.location.hash);
  const [workspace, setWorkspace] = useState<WorkspaceMode>(()=>typeof window==="undefined"?"home":workspaceFromHash(window.location.hash));
  const [surfaceView,setSurfaceView]=useState<SurfaceViewKey>(()=>typeof window==="undefined"?"lateral":surfaceViewFromHash(window.location.hash));
  const [plane, setPlane] = useState<Plane>(initialPlane);
  const [position, setPosition] = useState(52);
  const [focus, setFocus] = useState<Focus>("ventricle");
  const [selectedStructure, setSelectedStructure] = useState<StructureKey>("ventricle");
  const [visibleStructures, setVisibleStructures] = useState<StructureKey[]>(["ventricle", "caudate"]);
  const [identified, setIdentified] = useState<(IdentifiedPoint & {name:string;side:string}) | null>(null);
  const [labels, setLabels] = useState(true);
  const [block, setBlock] = useState<"inside" | "ghost" | "extracted" | "segmented">("ghost");
  const [sectionLayout,setSectionLayout]=useState<"both"|"slice"|"model">(()=>typeof window!=="undefined"&&window.matchMedia("(max-width: 760px)").matches?"slice":"both");
  const [display, setDisplay] = useState<"specimen" | "diagram" | "outline">("specimen");
  const [contrast, setContrast] = useState<"t1" | "t2" | "bigbrain" | "single">("bigbrain");
  const [rotation, setRotation] = useState<Rotation>(()=>workspace==="sections"?{x:-7,y:-18,z:0}:workspace==="surface"?surfaceViews[surfaceView].rotation:workspace==="blocks"?blockInitialRotations[initialBlockSpecimen]:{...homeRotation});
  const [webglUnavailable,setWebglUnavailable]=useState(false);
  const [playing, setPlaying] = useState(false);
  const [drag, setDrag] = useState<{ x: number; y: number; mode:"orbit"|"roll" } | null>(null);
  const [detailsOpen,setDetailsOpen]=useState(false);
  const [helpOpen,setHelpOpen]=useState(()=>typeof window!=="undefined"&&overlayFromHash(window.location.hash)==="help");
  const [legalOpen,setLegalOpen]=useState(()=>typeof window!=="undefined"&&overlayFromHash(window.location.hash)==="legal");
  const [feedbackOpen,setFeedbackOpen]=useState(()=>typeof window!=="undefined"&&overlayFromHash(window.location.hash)==="feedback");
  const [statusOpen,setStatusOpen]=useState(()=>typeof window!=="undefined"&&overlayFromHash(window.location.hash)==="status");
  const [offline,setOffline]=useState(()=>typeof navigator!=="undefined"&&!navigator.onLine);
  const [phoneMode,setPhoneMode]=useState(currentPhoneCapability);
  const [phoneSettingsOpen,setPhoneSettingsOpen]=useState(false);
  const [anatomyReviewSurfaceFilter,setAnatomyReviewSurfaceFilter]=useState<AnatomyReviewSurface>("all");
  const [anatomyReviewRepresentationFilter,setAnatomyReviewRepresentationFilter]=useState("all");
  const overlayReturnFocus=useRef<HTMLElement|null>(null);
  const phoneSettingsDialogRef=useRef<HTMLDialogElement|null>(null);
  const phoneSettingsReturnFocus=useRef<HTMLElement|null>(null);
  const overlayOpen=helpOpen||feedbackOpen||legalOpen||statusOpen;
  const [surfaceCerebellum,setSurfaceCerebellum]=useState(surfaceView!=="cranialNerves"&&surfaceView!=="arteries"&&surfaceView!=="medial"&&surfaceView!=="inferior");
  const [surfaceVisibleRegions,setSurfaceVisibleRegions]=useState<SurfaceRegionKey[]>([]);
  const [surfaceVisibleLandmarks,setSurfaceVisibleLandmarks]=useState<SurfaceLandmarkKey[]>([]);
  const [surfaceVisibleDeepLandmarks,setSurfaceVisibleDeepLandmarks]=useState<SurfaceDeepLandmarkKey[]>(surfaceView==="medial"?defaultMedialDeepLandmarks:[]);
  const [surfaceVisibleBasalLandmarks,setSurfaceVisibleBasalLandmarks]=useState<BasalLandmarkPartKey[]>([]);
  const [surfaceVessels,setSurfaceVessels]=useState(surfaceView==="arteries");
  const [surfaceNerves,setSurfaceNerves]=useState(surfaceView==="cranialNerves"||surfaceView==="arteries"||surfaceView==="inferior");
  const [surfaceGhost,setSurfaceGhost]=useState(surfaceView==="cranialNerves"||surfaceView==="arteries");
  const [surfacePonsMedulla,setSurfacePonsMedulla]=useState(surfaceView!=="medial");
  const [selectedNeurovascularStructure,setSelectedNeurovascularStructure]=useState<NeurovascularStructureKey>(surfaceView==="cranialNerves"?"cn1":"ica");
  const [freeHemisphere,setFreeHemisphere]=useState<"both"|"left"|"right">("both");
  const [freeSearch,setFreeSearch]=useState("");
  const [freeSelections,setFreeSelections]=useState<FreeObservationKey[]>([]);
  const [freeFocusedKey,setFreeFocusedKey]=useState<FreeObservationKey|null>(null);
  const [selectedPathway,setSelectedPathway]=useState<PathwayPresetKey|null>(null);
  const [basalStepperIndex,setBasalStepperIndex]=useState(0);
  const [basalStepperPlaying,setBasalStepperPlaying]=useState(false);
  const [papezStepperIndex,setPapezStepperIndex]=useState(0);
  const [papezStepperPlaying,setPapezStepperPlaying]=useState(false);
  const [blockSpecimen,setBlockSpecimen]=useState<BlockSpecimenKey>(initialBlockSpecimen);
  const [blockLayers,setBlockLayers]=useState<string[]>(blockSpecimens[initialBlockSpecimen].layers.map(layer=>layer.key));
  const [blockLayerFocus,setBlockLayerFocus]=useState(blockSpecimens[initialBlockSpecimen].layers[0]?.key??"");
  const [blockTissueMode,setBlockTissueMode]=useState<SpecimenTissueMode>("ghost");
  const [blockCerebellum,setBlockCerebellum]=useState(true);
  const [blockPonsMedulla,setBlockPonsMedulla]=useState(true);
  const [blockViewPreset,setBlockViewPreset]=useState<BlockViewPreset|"custom">("initial");
  const [blockIntroOpen,setBlockIntroOpen]=useState(workspace==="blocks");
  const [blockGuidedState,setBlockGuidedState]=useState<BlockGuidedState>(()=>createBlockGuidedState());
  const blockGuidedStateRef=useRef<BlockGuidedState>(blockGuidedState);
  blockGuidedStateRef.current=blockGuidedState;
  const [blockContextState,setBlockContextState]=useState(()=>createBlockContextState());
  const [blockContextRotation,setBlockContextRotation]=useState<Rotation>(()=>({...blockInitialRotations[initialBlockSpecimen]}));
  const [blockContextDrag,setBlockContextDrag]=useState<{x:number;y:number;mode:"orbit"|"roll"}|null>(null);
  const [blockContextWebglUnavailable,setBlockContextWebglUnavailable]=useState(false);
  const blockContextLauncherRef=useRef<HTMLButtonElement|null>(null);
  const blockContextView=blockContextState.view as BlockContextView;
  const [modelStrategyComparisonOpen,setModelStrategyComparisonOpen]=useState(()=>typeof window!=="undefined"&&modelStrategyFromHash(window.location.hash));
  const modelStrategyPanelRef=useRef<HTMLDivElement|null>(null);
  const modelStrategyReturnFocus=useRef<HTMLElement|null>(null);
  const [quizIndex,setQuizIndex]=useState(0);
  const [quizQueue,setQuizQueue]=useState<QuizQuestion[]>(()=>shuffledQuestions(allQuizQuestions).slice(0,10));
  const quizVisibilityAuditTarget=quizVisibilityAuditTargetOverride();
  const [quizCategory,setQuizCategory]=useState<"all"|QuizCategory>("all");
  const [quizFormat,setQuizFormat]=useState<QuizFormatFilter>("all");
  const [quizDetail,setQuizDetail]=useState<QuizDetailFilter>("all");
  const [quizCount,setQuizCount]=useState<5|10|15|20>(10);
  const [quizWrongOnly,setQuizWrongOnly]=useState(false);
  const [quizIncludeProvisional,setQuizIncludeProvisional]=useState(true);
  const [wrongTargets,setWrongTargets]=useState<QuizTargetKey[]>([]);
  const [quizChoice,setQuizChoice]=useState<QuizTargetKey|null>(null);
  const [quizScore,setQuizScore]=useState(0);
  const [quizFinished,setQuizFinished]=useState(false);
  const [quizSlicePosition,setQuizSlicePosition]=useState(52);
  const [quizMisses,setQuizMisses]=useState<QuizTargetKey[]>([]);
  const quizVisibilityAuditHighlight=quizVisibilityAuditHighlightOverride();
  const feedbackFormUrl=(import.meta.env.VITE_FEEDBACK_FORM_URL as string|undefined)?.trim()||"https://docs.google.com/forms/d/e/1FAIpQLSeM5Kge0Zl9Q0lCHMEP1g____uHvDZsfzjSGA0FzeT9Gf75dA/viewform";
  const sourceRepositoryUrl=(import.meta.env.VITE_SOURCE_REPOSITORY_URL as string|undefined)?.trim()||"https://github.com/bonnginn/brain-practical-navi";
  const repositoryBaseUrl=sourceRepositoryUrl.replace(/\/$/,"");
  const issueTrackerUrl=`${repositoryBaseUrl}/issues`;
  const contributingGuideUrl=`${repositoryBaseUrl}/blob/main/CONTRIBUTING.md`;
  const pullRequestUrl=`${repositoryBaseUrl}/pulls`;
  const governanceGuideUrl=`${repositoryBaseUrl}/blob/main/GOVERNANCE.md`;
  const licenseGuideUrl=`${repositoryBaseUrl}/blob/main/LICENSES.md`;
  const anatomyReviewItems=useMemo(()=>filterAnatomyReviewQueue(anatomyReviewQueue,{surface:anatomyReviewSurfaceFilter,representation:anatomyReviewRepresentationFilter}),[anatomyReviewSurfaceFilter,anatomyReviewRepresentationFilter]);
  const sectionDeveloperControls=(import.meta.env.VITE_SECTION_DEVELOPER_CONTROLS as string|undefined)==="true";
  const current = structures[selectedStructure];
  const cavitySelection=selectedStructure==="ventricle"||selectedStructure==="thirdVentricle"||selectedStructure==="fourthVentricle";
  // ID 33 is an atlas-derived scaffold that merges the optic chiasm and tracts.
  // Keep it out of learner-facing identification until image-guided labels 36-38 are reviewed.
  const structureKeys:StructureKey[]=(Object.keys(structures) as StructureKey[]).filter(key=>key!=="opticChiasm");
  const structureAvailable=(key:StructureKey)=>contrast==="single"?false:contrast==="bigbrain"?(structures[key].bigbrainIds?.length??0)>0:structures[key].ids.length>0;
  const activeVisibleStructures=visibleStructures.filter(structureAvailable);
  const visibleSet=useMemo(()=>new Set(visibleStructures),[visibleStructures]);
  const sectionSelectionMeshLayers=activeVisibleStructures.flatMap(key=>{const files=structureMeshFiles[key]??[];return files.length?[{files,color:structures[key].rgb}]:[]});
  const modelFocusVisible=labels&&sectionSelectionMeshLayers.length>0;
  const currentSourceNote=contrast==="single"?"固定脳MRIでは未検証ラベルを表示しません":!structureAvailable(selectedStructure)?"現在の画像ソースでは未分節・着色できません":contrast==="bigbrain"?(cavitySelection?"脳実質を避け、腔の範囲だけを塗りつぶし":current.labelSource==="manual"?"同一格子の手動ラベル":current.labelSource==="image-guided-reviewed"?"連続切片で確認した画像誘導ラベル":current.labelSource==="image-guided"?"画像誘導の試作ラベル":"位置照合済みアトラスの試作ラベル"):"アトラス領域を表示中";
  const sectionModelRotations:Rotation[]=[rotation,{...rotation,y:wrapAngle(rotation.y+90)}];
  const highlightLayers=useMemo(()=>{
    if(!labels||contrast==="single")return [];
    return activeVisibleStructures.map(key=>({ids:contrast==="bigbrain"?(structures[key].bigbrainIds??[]):structures[key].ids,color:structures[key].rgb}));
  },[contrast,labels,visibleStructures]);
  const surfaceLesson=surfaceViews[surfaceView];
  const surfaceNeurovascularKind=surfaceLesson.visual==="arteries"?"arteries":surfaceLesson.visual==="nerves"?"nerves":null;
  const surfaceNeurovascular=surfaceNeurovascularKind!==null;
  const freeSelectedSet=useMemo(()=>new Set(freeSelections),[freeSelections]);
  const freeRegionSelections=useMemo(()=>surfaceRegionKeys.filter(key=>freeSelectedSet.has(`region:${key}`)),[freeSelectedSet]);
  const freeLandmarkSelections=useMemo(()=>surfaceLandmarkKeys.filter(key=>freeSelectedSet.has(`landmark:${key}`)),[freeSelectedSet]);
  const freeDeepSelections=useMemo(()=>surfaceDeepLandmarkKeys.filter(key=>freeSelectedSet.has(`deep:${key}`)),[freeSelectedSet]);
  const freeBasalSelections=useMemo(()=>basalLandmarkKeys.filter(key=>freeSelectedSet.has(`basal:${key}`)),[freeSelectedSet]);
  const freeNeurovascularSelections=useMemo(()=>neurovascularStructureKeys.filter(key=>freeSelectedSet.has(`neuro:${key}`)),[freeSelectedSet]);
  const renderedSurfaceRegions=surfaceView==="free"?freeRegionSelections:surfaceVisibleRegions;
  const renderedSurfaceLandmarks=surfaceView==="free"?freeLandmarkSelections:surfaceVisibleLandmarks;
  const renderedSurfaceDeepLandmarks=surfaceView==="free"?freeDeepSelections:surfaceVisibleDeepLandmarks;
  const renderedBasalLandmarks=surfaceView==="free"?freeBasalSelections:surfaceVisibleBasalLandmarks;
  const renderedHemisphere=surfaceView==="free"?freeHemisphere:surfaceLesson.hemisphere;
  const surfaceHighlightLayers=useMemo<HighlightLayer[]>(()=>renderedSurfaceRegions.map(key=>({ids:surfaceRegions[key].ids,color:surfaceRegions[key].rgb,conditional:surfaceView==="medial"&&key==="cuneus"?{ids:surfaceRegions.pericalcarine.ids,axis:0,min:-14}:surfaceView==="medial"&&key==="lingual"?{ids:surfaceRegions.pericalcarine.ids,axis:0,max:-14}:undefined})),[renderedSurfaceRegions,surfaceView]);
  const normalizedFreeSearch=normalizeJapaneseSearch(freeSearch);
  const freeFilteredItems=useMemo(()=>freeObservationItems.filter(item=>matchesJapaneseSearch(normalizedFreeSearch,[item.name,item.latin,item.kind,item.source,...(freeObservationReadings[item.key]??[])])),[normalizedFreeSearch]);
  const freeSelectedItems=useMemo(()=>freeSelections.map(key=>freeObservationByKey.get(key)).filter((item):item is FreeObservationItem=>!!item),[freeSelections]);
  const freeFocusedItem=freeFocusedKey?freeObservationByKey.get(freeFocusedKey):undefined;
  const activePathway=selectedPathway?pathwayPresets[selectedPathway]:null;
  const basalStepperActive=selectedPathway==="basal-ganglia"&&workspace==="surface"&&surfaceView==="free";
  const basalStepperStep=(BASAL_GANGLIA_STEPS[basalStepperIndex]??BASAL_GANGLIA_STEPS[0]) as BasalGangliaStep;
  const basalStepperStructureKeys=basalStepperStep.targetKeys as readonly StructureKey[];
  const papezStepperActive=selectedPathway==="papez"&&workspace==="surface"&&surfaceView==="free";
  const papezStepperStep=(PAPEZ_STEPS[papezStepperIndex]??PAPEZ_STEPS[0]) as PapezStep;
  const papezStepperSectionKeys=(papezStepperStep.kind==="section-label"?papezStepperStep.targetKeys:[]) as readonly StructureKey[];
  const papezStepperRegionKeys=(papezStepperStep.kind==="atlas-3d"?papezStepperStep.targetKeys:[]) as readonly SurfaceRegionKey[];
  const papezStepperDeepKeys=(papezStepperStep.kind==="schematic-3d"?papezStepperStep.targetKeys:[]) as readonly SurfaceDeepLandmarkKey[];
  const freePathwayMeshLayers=useMemo(()=>{
    if(!activePathway)return [];
    const keys=selectedPathway==="basal-ganglia"?basalStepperStructureKeys:activePathway.sectionKeys;
    return [...keys.flatMap(key=>{const files=structureMeshFiles[key]??[];return files.length?[{files,color:structures[key].rgb}]:[]}),...(selectedPathway==="basal-ganglia"?[]:(activePathway.extraLayers??[]))];
  },[activePathway,basalStepperStructureKeys,selectedPathway]);
  const papezStepperMeshLayers=useMemo(()=>papezStepperStep.kind!=="section-label"?[]:papezStepperSectionKeys.flatMap(key=>{const files=structureMeshFiles[key]??[];return files.length?[{files,color:structures[key].rgb}]:[]}),[papezStepperSectionKeys,papezStepperStep.kind]);
  const papezStepperHasMesh=papezStepperMeshLayers.length>0;
  const basalStepperSliceHighlights=useMemo<HighlightLayer[]>(()=>basalStepperStructureKeys.map(key=>({ids:structures[key].bigbrainIds??[],color:structures[key].rgb})),[basalStepperStructureKeys]);
  const basalStepperTargetNames=useMemo(()=>basalStepperStructureKeys.map(key=>structures[key].name),[basalStepperStructureKeys]);
  const papezStepperSliceHighlights=useMemo<HighlightLayer[]>(()=>papezStepperSectionKeys.map(key=>({ids:structures[key].bigbrainIds??[],color:structures[key].rgb})),[papezStepperSectionKeys]);
  const papezStepperTargetNames=useMemo(()=>papezStepperStep.targetKeys.map(key=>surfaceDeepLandmarks[key as SurfaceDeepLandmarkKey]?.name??surfaceRegions[key as SurfaceRegionKey]?.name??structures[key as StructureKey]?.name??key),[papezStepperStep]);
  const papezStepperSurfaceHighlights=useMemo<HighlightLayer[]>(()=>papezStepperRegionKeys.map(key=>({ids:surfaceRegions[key].ids,color:surfaceRegions[key].rgb})),[papezStepperRegionKeys]);
  const specimenLesson={...blockSpecimens[blockSpecimen],caution:`${blockSpecimenDisclaimer} ${blockSpecimens[blockSpecimen].caution}`};
  const blockGuidedSpecimenKey=([...BLOCK_GUIDED_SPECIMEN_KEYS] as string[]).includes(blockSpecimen)?blockSpecimen as BlockGuidedSpecimenKey:null;
  const blockGuidedActive=blockGuidedState.active&&blockGuidedSpecimenKey!==null;
  const blockGuidedStep=blockGuidedActive?blockGuidedState.steps[blockGuidedState.stageIndex]??null:null;
  const blockGuidedAtFirst=blockGuidedActive&&blockGuidedState.stageIndex===0;
  const blockGuidedAtLast=blockGuidedActive&&blockGuidedState.stageIndex===blockGuidedState.steps.length-1;
  const blockContextVisible=shouldRenderBlockContext({workspace,specimen:blockSpecimen,state:blockContextState});
  const renderedSurfaceNerves=surfaceView==="inferior"||surfaceView==="free"?true:surfaceNerves;
  const surfaceOverlay=surfaceVessels&&renderedSurfaceNerves?"both":surfaceVessels?"vessels":renderedSurfaceNerves?"nerves":"none";
  const selectedNeurovascular=neurovascularStructures[selectedNeurovascularStructure];
  const neurovascularHighlightLayers=useMemo<HighlightLayer[]>(()=>surfaceView==="free"?freeNeurovascularSelections.map(key=>({ids:neurovascularStructures[key].ids,color:[255,255,255]})):[{ids:selectedNeurovascular.ids,color:[255,255,255]}],[freeNeurovascularSelections,selectedNeurovascular,surfaceView]);
  const inferiorCanonicalNerveHighlights=useMemo<HighlightLayer[]>(()=>surfaceView!=="inferior"?[]:[...(surfaceVisibleBasalLandmarks.includes("olfactory")?[{ids:neurovascularStructures.cn1.ids,color:[255,255,255] as [number,number,number]}]:[]),...(surfaceVisibleBasalLandmarks.includes("optic")?[{ids:[...neurovascularStructures.cn2.ids,...neurovascularStructures.opticChiasm.ids],color:[255,255,255] as [number,number,number]}]:[])],[surfaceView,surfaceVisibleBasalLandmarks]);
  const quizQuestion=quizQueue[quizIndex]??quizQuestions[0];
  const quizEmpty=quizQueue.length===0;
  const neurovascularQuiz=isNeurovascularQuiz(quizQuestion);
  const surfaceQuiz=isSurfaceQuiz(quizQuestion);
  const quizModelQuestion=surfaceQuiz||neurovascularQuiz;
  const quizSurfaceView=quizModelQuestion?quizQuestion.view:"lateral";
  const quizFilters:QuizFilters={category:quizCategory,format:quizFormat,detail:quizDetail,includeProvisional:quizIncludeProvisional,wrongOnly:quizWrongOnly};
  // The registry origin is an audited expectation for this existing
  // isProvisionalQuiz rule; it is used only to count/filter the next queue.
  const quizCandidates=useMemo(()=>filterQuizCandidates(quizQuestionsForFiltering,quizFilters,wrongTargets),[quizCategory,quizFormat,quizDetail,quizIncludeProvisional,quizWrongOnly,wrongTargets]);
  const quizCandidateCount=quizCandidates.length;
  const quizActualCount=Math.min(quizCount,quizCandidateCount);
  const quizStandardCandidateCount=quizCandidates.filter(question=>question.origin==="standard").length;
  const quizProvisionalCandidateCount=quizCandidates.filter(question=>question.origin==="provisional").length;
  const quizDetailOptions=detailOptionsForFormat(quizFormat);
  const quizStartPosition=quizModelQuestion?50:quizQuestion.position;
  const sectionQuizTarget=surfaceQuiz||neurovascularQuiz?structures.caudate:structures[quizQuestion.target];
  const surfaceQuizTarget=surfaceQuiz?surfaceRegions[quizQuestion.target]:surfaceRegions.precentral;
  const neurovascularQuizTarget=neurovascularQuiz?neurovascularStructures[quizQuestion.target]:neurovascularStructures.ica;
  // The pilot canvas always renders the selected overlay in white. Keep the
  // target swatch and the on-screen wording aligned with that contract.
  const quizTarget=neurovascularQuiz?{...neurovascularQuizTarget,color:"#ffffff"}:surfaceQuiz?surfaceQuizTarget:{...sectionQuizTarget,color:QUIZ_SECTION_ACCENT_HEX};
  const quizSource=neurovascularQuiz?"模式3D・専門家未確認":surfaceQuiz?"":sectionQuizTarget.labelSource==="manual"?"同一格子の手動ラベル":sectionQuizTarget.labelSource==="atlas-provisional"?"位置照合済みアトラス由来":sectionQuizTarget.labelSource==="image-guided-reviewed"?"画像誘導・確認済み":sectionQuizTarget.labelSource==="image-guided"?"画像誘導の試作ラベル":"学習用領域";
  let quizHighlight=useMemo<HighlightLayer[]>(()=>surfaceQuiz||neurovascularQuiz?[]:[{ids:sectionQuizTarget.bigbrainIds??[],color:sectionQuizTarget.rgb,mode:"quiz"}],[sectionQuizTarget,surfaceQuiz,neurovascularQuiz]);
  let quizSurfaceHighlight=useMemo<HighlightLayer[]>(()=>surfaceQuiz?[{ids:surfaceQuizTarget.ids,color:surfaceQuizTarget.rgb}]:[],[surfaceQuizTarget,surfaceQuiz]);
  let quizNeurovascularHighlight=useMemo<HighlightLayer[]>(()=>neurovascularQuiz?[{ids:neurovascularQuizTarget.ids,color:[255,255,255]}]:[],[neurovascularQuiz,neurovascularQuizTarget]);
  const quizVisibilityExpectedHighlights=quizVisibilityAuditHighlight===null?[]:neurovascularQuiz?quizNeurovascularHighlight:quizSurfaceHighlight;
  if(quizVisibilityAuditHighlight===false){quizHighlight=[];quizSurfaceHighlight=[];quizNeurovascularHighlight=[]}
  useEffect(() => { if (!playing) return; const timer = window.setInterval(() => setPosition(p => p >= 95 ? 5 : p + 1), 90); return () => window.clearInterval(timer); }, [playing]);
  useEffect(()=>{if(quizVisibilityAuditTarget){setQuizQueue([quizVisibilityAuditTarget]);if(!isSurfaceQuiz(quizVisibilityAuditTarget)&&!isNeurovascularQuiz(quizVisibilityAuditTarget))setRotation({...homeRotation})}},[quizVisibilityAuditTarget?.target]);
  useEffect(()=>startBasalGangliaStepperTimer({
    active:basalStepperActive&&basalStepperPlaying,
    onStep:()=>setBasalStepperIndex(current=>advanceBasalStepperIndex(current,BASAL_GANGLIA_STEPS.length)),
  }),[basalStepperActive,basalStepperPlaying]);
  useEffect(()=>{if(!basalStepperActive)setBasalStepperPlaying(false)},[basalStepperActive]);
  useEffect(()=>{if(basalStepperPlaying&&basalStepperIndex>=BASAL_GANGLIA_STEPS.length-1)setBasalStepperPlaying(false)},[basalStepperIndex,basalStepperPlaying]);
  useEffect(()=>startPapezStepperTimer({
    active:papezStepperActive&&papezStepperPlaying,
    onStep:()=>setPapezStepperIndex(current=>advancePapezStepperIndex(current,PAPEZ_STEPS.length)),
  }),[papezStepperActive,papezStepperPlaying]);
  useEffect(()=>{if(!papezStepperActive)setPapezStepperPlaying(false)},[papezStepperActive]);
  useEffect(()=>{if(papezStepperPlaying&&papezStepperIndex>=PAPEZ_STEPS.length-1)setPapezStepperPlaying(false)},[papezStepperIndex,papezStepperPlaying]);
  useEffect(()=>setIdentified(null),[plane,position,contrast]);
  useEffect(()=>{setDetailsOpen(false);setPlaying(false)},[workspace]);
  useEffect(()=>()=>{
    const current=blockGuidedStateRef.current;
    if(!current.active)return;
    const finished=finishBlockGuidedObservation(current);
    blockGuidedStateRef.current=finished;
    setBlockGuidedState(finished);
    setBlockLayers([...finished.restoredLayers]);
  },[workspace,blockSpecimen]);
  useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem(QUIZ_WRONG_CACHE_KEY)??"[]");if(Array.isArray(saved))setWrongTargets(saved.filter((key):key is QuizTargetKey=>typeof key==="string"&&(key in structures||key in surfaceRegions||key in neurovascularStructures)))}catch{/* invalid cache is ignored */}},[]);
  useEffect(()=>setQuizSlicePosition(quizStartPosition),[quizStartPosition,surfaceQuiz]);
  useEffect(()=>{if(isSurfaceQuiz(quizQuestion)||isNeurovascularQuiz(quizQuestion))setRotation({...surfaceViews[quizQuestion.view].rotation})},[quizQuestion]);
  useEffect(()=>{if(quizVisibilityAuditTarget&&!isSurfaceQuiz(quizQuestion)&&!isNeurovascularQuiz(quizQuestion))setRotation({...homeRotation})},[quizVisibilityAuditTarget?.target,quizQuestion]);
  useEffect(()=>{
    const widthQuery=window.matchMedia("(max-width: 760px)");
    const hoverQuery=window.matchMedia("(hover: none)");
    const pointerQuery=window.matchMedia("(pointer: coarse)");
    const mediaQueries=[widthQuery,hoverQuery,pointerQuery];
    const update=()=>setPhoneMode(phoneCapabilityFromMedia({width:window.innerWidth,hoverMatches:hoverQuery.matches,pointerMatches:pointerQuery.matches}));
    update();
    window.addEventListener("resize",update);
    window.addEventListener("orientationchange",update);
    mediaQueries.forEach(query=>query.addEventListener("change",update));
    return()=>{window.removeEventListener("resize",update);window.removeEventListener("orientationchange",update);mediaQueries.forEach(query=>query.removeEventListener("change",update))};
  },[]);
  useEffect(()=>{if(!phoneMode)setPhoneSettingsOpen(false)},[phoneMode]);
  useEffect(()=>{const update=()=>setOffline(!navigator.onLine);window.addEventListener("online",update);window.addEventListener("offline",update);return()=>{window.removeEventListener("online",update);window.removeEventListener("offline",update)}},[]);
  useEffect(()=>{
    const close=(event:KeyboardEvent)=>{if(event.key==="Escape"){if(phoneSettingsOpen){setPhoneSettingsOpen(false);return}if(modelStrategyComparisonOpen){closeModelStrategyComparison();return}closeOverlay();setDetailsOpen(false)}};
    window.addEventListener("keydown",close);
    return()=>window.removeEventListener("keydown",close);
  },[workspace,surfaceView,plane,blockSpecimen,phoneSettingsOpen,modelStrategyComparisonOpen]);
  useEffect(()=>{if(!overlayOpen)return;const previousOverflow=document.body.style.overflow;document.body.style.overflow="hidden";const frame=window.requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>('.legalDialog header button')?.focus());const trap=(event:KeyboardEvent)=>{if(event.key!=="Tab")return;const dialog=document.querySelector<HTMLElement>('.legalDialog');if(!dialog)return;const focusable=[...dialog.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])')].filter(element=>element.getClientRects().length>0);if(!focusable.length)return;const first=focusable[0],last=focusable.at(-1)!;if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}};window.addEventListener("keydown",trap);return()=>{window.cancelAnimationFrame(frame);window.removeEventListener("keydown",trap);document.body.style.overflow=previousOverflow}},[helpOpen,feedbackOpen,legalOpen,statusOpen]);
  useEffect(()=>{if(!overlayOpen)overlayReturnFocus.current?.focus()},[overlayOpen]);
  useEffect(()=>{if(!modelStrategyComparisonOpen)return;const frame=window.requestAnimationFrame(()=>modelStrategyPanelRef.current?.scrollIntoView({block:"start"}));return()=>window.cancelAnimationFrame(frame)},[modelStrategyComparisonOpen]);
  useEffect(()=>{
    const dialog=phoneSettingsDialogRef.current;
    if(!dialog)return;
    const handleClose=()=>{if(phoneSettingsOpen)setPhoneSettingsOpen(false)};
    dialog.addEventListener("close",handleClose);
    if(phoneMode&&phoneSettingsOpen&&!dialog.open)dialog.showModal();
    else if((!phoneMode||!phoneSettingsOpen)&&dialog.open)dialog.close();
    return()=>dialog.removeEventListener("close",handleClose);
  },[phoneMode,phoneSettingsOpen]);
  useEffect(()=>{const restore=()=>{const overlay=overlayFromHash(window.location.hash);setHelpOpen(overlay==="help");setFeedbackOpen(overlay==="feedback");setLegalOpen(overlay==="legal");setStatusOpen(overlay==="status");setPhoneSettingsOpen(false);const nextWorkspace=workspaceFromHash(window.location.hash);setModelStrategyComparisonOpen(nextWorkspace==="collaborate"&&modelStrategyFromHash(window.location.hash));transitionBlockContextState({type:"restore-route",workspace:nextWorkspace,specimen:blockSpecimenFromHash(window.location.hash)});setBlockContextDrag(null);setWorkspace(nextWorkspace);if(nextWorkspace==="surface")chooseSurface(surfaceViewFromHash(window.location.hash),"none");else if(nextWorkspace==="sections")jump(planeFromHash(window.location.hash),52,"none");else if(nextWorkspace==="blocks")chooseBlock(blockSpecimenFromHash(window.location.hash),"none")};window.addEventListener("hashchange",restore);window.addEventListener("popstate",restore);return()=>{window.removeEventListener("hashchange",restore);window.removeEventListener("popstate",restore)}},[]);
  useEffect(()=>{
    if(!phoneMode||!phoneSettingsOpen)return;
    const dialog=phoneSettingsDialogRef.current;
    if(!dialog)return;
    const previousHtmlOverflow=document.documentElement.style.overflow;
    const previousBodyOverflow=document.body.style.overflow;
    document.documentElement.style.overflow="hidden";
    document.body.style.overflow="hidden";
    const frame=window.requestAnimationFrame(()=>dialog.querySelector<HTMLButtonElement>(".phoneSettingsClose, .leftRail button:not(:disabled), .leftRail input:not(:disabled)")?.focus());
    const trap=(event:KeyboardEvent)=>{
      if(event.key!=="Tab")return;
      const focusable=[...dialog.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])')].filter(element=>element.getClientRects().length>0);
      if(!focusable.length)return;
      const first=focusable[0],last=focusable.at(-1)!;
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
    };
    window.addEventListener("keydown",trap);
    return()=>{window.cancelAnimationFrame(frame);window.removeEventListener("keydown",trap);document.documentElement.style.overflow=previousHtmlOverflow;document.body.style.overflow=previousBodyOverflow};
  },[phoneMode,phoneSettingsOpen,workspace]);
  useEffect(()=>{
    if(phoneSettingsOpen)return;
    const target=phoneSettingsReturnFocus.current;
    phoneSettingsReturnFocus.current=null;
    if(target&&target.isConnected)window.requestAnimationFrame(()=>target.focus());
  },[phoneSettingsOpen]);
  useEffect(()=>{if(!phoneMode)return;const frame=window.requestAnimationFrame(()=>{document.querySelector<HTMLElement>(".workspaceSwitch button.active")?.scrollIntoView({block:"nearest",inline:"center"});document.querySelector<HTMLElement>(".leftRail .planeBtn.active")?.scrollIntoView({block:"nearest",inline:"center"})});return()=>window.cancelAnimationFrame(frame)},[phoneMode,workspace,surfaceView,plane,blockSpecimen]);

  function wrapAngle(value:number){return ((value+180)%360+360)%360-180}

  function transitionBlockContextState(event:BlockContextEvent){
    setBlockContextState(current=>transitionBlockContext(current,event));
  }

  function closeBlockContext(){
    transitionBlockContextState({type:"close"});
    setBlockContextDrag(null);
    setBlockContextWebglUnavailable(false);
    window.requestAnimationFrame(()=>blockContextLauncherRef.current?.focus());
  }

  function beginRotation(e:PointerEvent<HTMLDivElement>){
    if((e.target as HTMLElement).closest("button"))return;
    e.preventDefault();
    e.currentTarget.focus();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDrag({x:e.clientX,y:e.clientY,mode:e.button===2||e.shiftKey?"roll":"orbit"});
  }

  function resetCurrentModelRotation(){
    if(workspace==="surface")return resetSurfaceView();
    if(workspace==="blocks"){setBlockViewPreset("initial");setRotation({...blockInitialRotations[blockSpecimen]});return}
    if(workspace==="quiz"&&(isSurfaceQuiz(quizQuestion)||isNeurovascularQuiz(quizQuestion))){setRotation({...surfaceViews[quizQuestion.view].rotation});return}
    setRotation(workspace==="sections"?{x:-7,y:-18,z:0}:{...homeRotation});
  }

  function handleModelKey(event:ReactKeyboardEvent<HTMLDivElement>){
    const step=8;
    if(event.key.toLowerCase()==="r"){event.preventDefault();resetCurrentModelRotation();return}
    if(!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(event.key))return;
    event.preventDefault();
    setRotation(current=>({
      ...current,
      x:wrapAngle(current.x+(event.key==="ArrowUp"?-step:event.key==="ArrowDown"?step:0)),
      y:wrapAngle(current.y+(event.key==="ArrowLeft"?-step:event.key==="ArrowRight"?step:0)),
    }));
    if(workspace==="blocks")setBlockViewPreset("custom");
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

  function beginBlockContextRotation(e:PointerEvent<HTMLDivElement>){
    if((e.target as HTMLElement).closest("button"))return;
    e.preventDefault();
    e.currentTarget.focus();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setBlockContextDrag({x:e.clientX,y:e.clientY,mode:e.button===2||e.shiftKey?"roll":"orbit"});
  }

  function moveBlockContext(e:PointerEvent<HTMLDivElement>){
    if(!blockContextDrag)return;
    const dx=e.clientX-blockContextDrag.x,dy=e.clientY-blockContextDrag.y;
    setBlockContextRotation(current=>blockContextDrag.mode==="roll"
      ?{...current,z:wrapAngle((current.z??0)+dx*.45-dy*.18)}
      :{...current,x:wrapAngle(current.x-dy*.42),y:wrapAngle(current.y+dx*.42)});
    setBlockContextDrag({x:e.clientX,y:e.clientY,mode:blockContextDrag.mode});
  }

  function resetBlockContextRotation(){setBlockContextRotation({...blockInitialRotations[blockSpecimen]})}

  function handleBlockContextKey(event:ReactKeyboardEvent<HTMLDivElement>){
    const step=8;
    if(event.key.toLowerCase()==="r"){event.preventDefault();resetBlockContextRotation();return}
    if(!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(event.key))return;
    event.preventDefault();
    setBlockContextRotation(current=>({
      ...current,
      x:wrapAngle(current.x+(event.key==="ArrowUp"?-step:event.key==="ArrowDown"?step:0)),
      y:wrapAngle(current.y+(event.key==="ArrowLeft"?-step:event.key==="ArrowRight"?step:0)),
    }));
  }

  function updateScreenHistory(nextHash:string,mode:"push"|"replace"|"none"="push"){
    if(mode==="none"||window.location.hash===nextHash)return;
    window.history[mode==="push"?"pushState":"replaceState"](null,"",nextHash);
  }

  function jump(nextPlane: Plane, nextPosition?: number,historyMode:"push"|"replace"|"none"="push") {
    updateScreenHistory(workspaceHash("sections",surfaceView,nextPlane,blockSpecimen),historyMode);
    setPlane(nextPlane);
    if (nextPosition !== undefined) setPosition(nextPosition);
  }

  function focusStructure(key:StructureKey,ensureVisible=false){setSelectedStructure(key);if(ensureVisible)setVisibleStructures(previous=>previous.includes(key)?previous:[...previous,key]);const meshFocus=structures[key].meshFocus;if(meshFocus)setFocus(meshFocus)}
  function toggleStructure(key:StructureKey){focusStructure(key);if(!structureAvailable(key))return;setVisibleStructures(previous=>previous.includes(key)?previous.filter(item=>item!==key):[...previous,key])}
  function toggleGroup(members:StructureKey[]){const available=members.filter(structureAvailable);if(!available.length)return;const allVisible=available.every(key=>visibleSet.has(key));setVisibleStructures(previous=>allVisible?previous.filter(key=>!available.includes(key)):Array.from(new Set([...previous,...available])));if(!allVisible)focusStructure(available[0])}
  function identify(point:IdentifiedPoint){
    const bigbrain=point.certainty!=="atlas",name=bigbrain?(bigBrainNameById.get(point.id)??(point.id===0?"ラベルの範囲外":`未登録領域 ${point.id}`)):(atlasNameById.get(point.id)??(point.id===0?"アトラス領域外":`未登録領域 ${point.id}`)),side=bigbrain||point.id===0||point.id>=200?"":point.id>=52?"左":"右";
    setIdentified({...point,name,side});
    const match=structureKeys.find(key=>(bigbrain?structures[key].bigbrainIds:structures[key].ids)?.includes(point.id));if(match)focusStructure(match,true);
  }

  function chooseSurface(key:SurfaceViewKey,historyMode:"push"|"replace"|"none"="push"){const next=surfaceViews[key];updateScreenHistory(workspaceHash("surface",key),historyMode);setSurfaceView(key);setRotation(next.rotation);setSurfaceVisibleRegions([]);setSurfaceVisibleLandmarks([]);setSurfaceVisibleDeepLandmarks(key==="medial"?defaultMedialDeepLandmarks:[]);setSurfaceVisibleBasalLandmarks([]);setSurfaceGhost(key==="cranialNerves"||key==="arteries");setSurfacePonsMedulla(key!=="medial");if(key==="arteries"){setSurfaceVessels(true);setSurfaceNerves(true);setSurfaceCerebellum(false);setSelectedNeurovascularStructure("ica")}else if(key==="cranialNerves"){setSurfaceVessels(false);setSurfaceNerves(true);setSurfaceCerebellum(false);setSelectedNeurovascularStructure("cn1")}else{setSurfaceVessels(false);setSurfaceNerves(key==="inferior");setSurfaceCerebellum(key!=="medial"&&key!=="inferior")}}
  function toggleInferiorHindbrain(){const next=!(surfacePonsMedulla&&surfaceNerves);setSurfacePonsMedulla(next);setSurfaceNerves(next)}
  function toggleFreeHindbrain(){setSurfacePonsMedulla(value=>!value)}
  function toggleSurfaceRegion(key:SurfaceRegionKey){setSurfaceVisibleRegions(previous=>previous.includes(key)?previous.filter(item=>item!==key):[...previous,key])}
  function toggleSurfaceLandmark(key:SurfaceLandmarkKey){setSurfaceVisibleLandmarks(previous=>previous.includes(key)?previous.filter(item=>item!==key):[...previous,key])}
  function toggleBasalLandmark(key:BasalLandmarkPartKey){setSurfaceVisibleBasalLandmarks(previous=>previous.includes(key)?previous.filter(item=>item!==key):[...previous,key])}
  function toggleSurfaceDeepLandmark(key:SurfaceDeepLandmarkKey){setSurfaceVisibleDeepLandmarks(previous=>previous.includes(key)?previous.filter(item=>item!==key):[...previous,key])}
  function resetSurfaceView(){setRotation({...surfaceViews[surfaceView].rotation})}
  function toggleFreeObservation(key:FreeObservationKey){const selecting=!freeSelectedSet.has(key);setFreeSelections(previous=>selecting?[...previous,key]:previous.filter(item=>item!==key));setFreeFocusedKey(selecting?key:null);if(selecting&&key.startsWith("neuro:")){const neuroKey=key.slice(6) as NeurovascularStructureKey,item=neurovascularStructures[neuroKey];if(item.kind==="arteries")setSurfaceVessels(true);else if(detachableBrainstemNerveKeys.includes(neuroKey))setSurfacePonsMedulla(true)}if(selecting&&key.startsWith("deep:")&&freeHemisphere==="both")setFreeHemisphere("left")}
  function clearFreeObservation(){setFreeSelections([]);setFreeFocusedKey(null);setSelectedPathway(null);setBasalStepperIndex(0);setBasalStepperPlaying(false);setPapezStepperIndex(0);setPapezStepperPlaying(false)}
  function selectFreeObservation(key:FreeObservationKey){if(!freeSelectedSet.has(key))toggleFreeObservation(key);else setFreeFocusedKey(key)}
  function applyPathwayPreset(key:PathwayPresetKey){
    const preset=pathwayPresets[key];
    setSelectedPathway(key);
    setBasalStepperPlaying(false);
    setPapezStepperPlaying(false);
    if(key==="basal-ganglia"){
      // The stepper is intentionally independent from manually selected free
      // observations. Selecting it never clears or silently adds free items.
      setBasalStepperIndex(0);
      setSurfaceGhost(true);
      return;
    }
    if(key==="papez"){
      // Like the basal-ganglia stepper, Papez is independent from manual free
      // selections. Only the current stage is highlighted, and switching to a
      // different preset cannot leave all six Papez stages selected behind.
      setPapezStepperIndex(0);
      setSurfaceGhost(true);
      return;
    }
    setFreeSelections(previous=>[...new Set([...previous,...preset.freeKeys])]);
    setFreeFocusedKey(preset.freeKeys[0]??null);
    setSurfaceGhost(true);
    if(preset.freeKeys.some(item=>item.startsWith("neuro:")))setSurfacePonsMedulla(true)
  }
  function chooseBasalStepperStep(index:number){setBasalStepperPlaying(false);setBasalStepperIndex(Math.max(0,Math.min(BASAL_GANGLIA_STEPS.length-1,index)))}
  function toggleBasalStepperPlaying(){if(basalStepperPlaying){setBasalStepperPlaying(false);return}if(basalStepperIndex>=BASAL_GANGLIA_STEPS.length-1)return;setBasalStepperPlaying(true)}
  function choosePapezStepperStep(index:number){setPapezStepperPlaying(false);setPapezStepperIndex(Math.max(0,Math.min(PAPEZ_STEPS.length-1,index)))}
  function togglePapezStepperPlaying(){if(papezStepperPlaying){setPapezStepperPlaying(false);return}if(papezStepperIndex>=PAPEZ_STEPS.length-1)return;setPapezStepperPlaying(true)}
  function identifyFreeSurface(point:{source:"surface"|"neurovascular";id:number}){if(point.source==="surface"){const key=surfaceRegionKeys.find(regionKey=>surfaceRegions[regionKey].ids.includes(point.id));if(key)toggleFreeObservation(`region:${key}`);return}const key=neurovascularStructureKeys.find(structureKey=>neurovascularStructures[structureKey].ids.includes(point.id));if(key)toggleFreeObservation(`neuro:${key}`)}
  function blockPresetRotation(preset:BlockViewPreset):Rotation{const initial=blockInitialRotations[blockSpecimen];if(preset==="opposite")return{...initial,y:wrapAngle(initial.y+180)};if(preset==="superior")return{x:-82,y:0,z:0};if(preset==="inferior")return{x:82,y:0,z:0};return{...initial}}
  function chooseBlockView(preset:BlockViewPreset){setBlockViewPreset(preset);setRotation(blockPresetRotation(preset))}
  function applyBlockGuidedState(next:BlockGuidedState){blockGuidedStateRef.current=next;setBlockGuidedState(next);setBlockLayers(next.active?[...guidedStepLayers(next)]:[...next.restoredLayers])}
  function startBlockGuided(){if(!blockGuidedSpecimenKey)return;applyBlockGuidedState(startBlockGuidedObservation({specimenKey:blockGuidedSpecimenKey,layers:specimenLesson.layers,currentLayers:blockLayers}))}
  function moveBlockGuided(delta:number){if(!blockGuidedStateRef.current.active)return;applyBlockGuidedState(moveBlockGuidedObservation(blockGuidedStateRef.current,delta))}
  function firstBlockGuided(){if(!blockGuidedStateRef.current.active)return;applyBlockGuidedState(firstBlockGuidedObservation(blockGuidedStateRef.current))}
  function stopBlockGuided(){const current=blockGuidedStateRef.current;if(!current.active)return;applyBlockGuidedState(finishBlockGuidedObservation(current))}
  function chooseBlock(key:BlockSpecimenKey,historyMode:"push"|"replace"|"none"="push"){stopBlockGuided();const next=blockSpecimens[key];updateScreenHistory(workspaceHash("blocks",surfaceView,plane,key),historyMode);transitionBlockContextState({type:"select-specimen",specimen:key});setBlockContextDrag(null);setBlockContextWebglUnavailable(false);setBlockContextRotation({...blockInitialRotations[key]});setBlockIntroOpen(false);setBlockSpecimen(key);setBlockLayers(next.layers.map(layer=>layer.key));setBlockLayerFocus(next.layers[0]?.key??"");setBlockTissueMode(next.layers.length?"ghost":"solid");setRotation({...blockInitialRotations[key]});setBlockViewPreset("initial");setBlockPonsMedulla(true);setBlockCerebellum(true)}
  function toggleBlockLayer(key:string){setBlockLayerFocus(key);setBlockLayers(previous=>previous.includes(key)?previous.filter(item=>item!==key):[...previous,key])}
  function chooseNeurovascularStructure(key:NeurovascularStructureKey){const item=neurovascularStructures[key];setSelectedNeurovascularStructure(key);if(item.kind==="arteries")setSurfaceVessels(true);else setSurfaceNerves(true)}
  function closeOverlay(){setHelpOpen(false);setFeedbackOpen(false);setLegalOpen(false);setStatusOpen(false);const nextHash=workspaceHash(workspace,surfaceView,plane,blockSpecimen);if(window.location.hash!==nextHash)window.history.replaceState(null,"",nextHash)}
  function openOverlay(key:OverlayMode){if(!overlayOpen)overlayReturnFocus.current=document.activeElement instanceof HTMLElement?document.activeElement:null;window.history.pushState(null,"",`#workspace/${key}`);setHelpOpen(key==="help");setFeedbackOpen(key==="feedback");setLegalOpen(key==="legal");setStatusOpen(key==="status")}
  function openPhoneSettings(origin?:HTMLElement){if(!phoneMode||workspace==="home"||workspace==="collaborate"||workspace==="segment")return;phoneSettingsReturnFocus.current=origin??(document.activeElement instanceof HTMLElement?document.activeElement:null);setPhoneSettingsOpen(true)}
  function closePhoneSettings(){setPhoneSettingsOpen(false)}
  function openWorkspace(key:WorkspaceMode){if(key!=="blocks")stopBlockGuided();setPhoneSettingsOpen(false);setHelpOpen(false);setFeedbackOpen(false);setLegalOpen(false);setStatusOpen(false);setModelStrategyComparisonOpen(false);const nextHash=workspaceHash(key,surfaceView,plane,blockSpecimen);if(window.location.hash!==nextHash)window.history.pushState(null,"",nextHash);transitionBlockContextState({type:key==="blocks"?"enter-workspace":"leave-workspace",workspace:key});setBlockContextDrag(null);setWorkspace(key);if(key==="home")setRotation({...homeRotation});if(key==="sections")setRotation({x:-7,y:-18,z:0});if(key==="surface")setRotation(surfaceViews[surfaceView].rotation);if(key==="blocks"){setBlockIntroOpen(true);setRotation({...blockInitialRotations[blockSpecimen]});setBlockViewPreset("initial")}}
  function openModelStrategyComparison(origin?:HTMLElement){modelStrategyReturnFocus.current=origin??(document.activeElement instanceof HTMLElement?document.activeElement:null);setModelStrategyComparisonOpen(true);updateScreenHistory(MODEL_STRATEGY_ROUTE,"push")}
  function closeModelStrategyComparison(){setModelStrategyComparisonOpen(false);updateScreenHistory(workspaceHash("collaborate",surfaceView,plane,blockSpecimen),"replace");window.requestAnimationFrame(()=>modelStrategyReturnFocus.current?.focus())}
  function saveWrongTargets(next:QuizTargetKey[]){setWrongTargets(next);try{localStorage.setItem(QUIZ_WRONG_CACHE_KEY,JSON.stringify(next))}catch{/* private browsing may block storage */}}
  function quizChoiceCount(dimension:"category"|"format"|"detail",value:string){return countQuizChoice(quizQuestionsForFiltering,quizFilters,wrongTargets,dimension,value)}
  function chooseQuizFormat(value:QuizFormatFilter){setQuizFormat(value);if(quizDetail!=="all"&&!detailOptionsForFormat(value).includes(quizDetail))setQuizDetail("all")}
  function startQuiz(){let candidates=quizCandidates;setQuizQueue(shuffledQuestions(candidates).slice(0,quizActualCount));setQuizIndex(0);setQuizChoice(null);setQuizScore(0);setQuizMisses([]);setQuizFinished(false)}
  function answerQuiz(key:QuizTargetKey){if(quizChoice||quizEmpty)return;setQuizChoice(key);const correct=key===quizQuestion.target;if(correct){setQuizScore(score=>score+1);if(wrongTargets.includes(quizQuestion.target))saveWrongTargets(wrongTargets.filter(target=>target!==quizQuestion.target))}else{setQuizMisses(previous=>previous.includes(quizQuestion.target)?previous:[...previous,quizQuestion.target]);if(!wrongTargets.includes(quizQuestion.target))saveWrongTargets([...wrongTargets,quizQuestion.target])}}
  function nextQuiz(){if(quizIndex>=quizQueue.length-1){setQuizChoice(null);setQuizFinished(true);return}setQuizChoice(null);setQuizIndex(index=>index+1)}
  function resetQuiz(){setQuizIndex(0);setQuizChoice(null);setQuizScore(0);setQuizMisses([]);setQuizFinished(false)}
  function reviewQuizQuestion(question:QuizQuestion){if(isNeurovascularQuiz(question)){openWorkspace("surface");chooseSurface(question.view,"replace");setSelectedNeurovascularStructure(question.target);setSurfaceVessels(question.view==="arteries");setSurfaceNerves(question.view==="cranialNerves");return}if(isSurfaceQuiz(question)){openWorkspace("surface");chooseSurface(question.view,"replace");setSurfaceVisibleRegions([question.target]);return}openWorkspace("sections");jump(question.plane,question.position,"replace");setVisibleStructures([question.target]);focusStructure(question.target,true);setLabels(true)}
  function retryQuiz(){setQuizQueue(previous=>shuffledQuestions(previous));resetQuiz()}
  function restoreAllQuiz(){setQuizWrongOnly(false);setQuizCategory("all");setQuizFormat("all");setQuizDetail("all");setQuizIncludeProvisional(true);setQuizQueue(shuffledQuestions(allQuizQuestions).slice(0,quizCount));resetQuiz()}
  function resetWrongHistory(){saveWrongTargets([]);if(quizWrongOnly){setQuizQueue([]);resetQuiz()}}

  return <main className={`appShell workspace-${workspace} ${workspace==="home"?"homeShell":""} ${phoneMode?"phone-mode":""}`}>
    <button className="skipLink" onClick={()=>document.getElementById("workspace")?.focus()}>本文へ移動</button>
    <header className="topbar">
      <a className="brand" href="#workspace/home" onClick={event=>{event.preventDefault();openWorkspace("home")}}><span className="brandMark">脳</span><span>脳実習ナビ<small>脳解剖実習 学習補助アプリ</small></span></a>
      <nav className="modeSwitch workspaceSwitch" aria-label="教材を選択">
        {workspaceModes.map(item=><button key={item.key} className={`${workspace===item.key?"active":""} ${item.key==="blocks"?"prototype":""}`} aria-current={workspace===item.key?"page":undefined} onClick={()=>openWorkspace(item.key)}><span>{item.label}</span><i>{item.sub}</i></button>)}
      </nav>
      <div className="topActions">{offline&&<span className="offlineStatus" role="status">オフライン</span>}<span title="スマートフォンでも閲覧・クイズ・基本操作を利用できます">PC・横向きタブレット推奨</span><button className="phoneRailToggle" onClick={event=>openPhoneSettings(event.currentTarget)} aria-controls="phone-settings-panel" aria-label="現在の教材の設定を表示">設定</button><button className="helpButton" onClick={()=>openOverlay("help")} aria-label="操作ガイドを表示">操作ガイド</button><button className="feedbackButton" onClick={()=>openOverlay("feedback")} aria-label="匿名の意見・誤り報告を表示">意見・誤り報告</button><button className="collaborateButton" onClick={()=>openWorkspace("collaborate")} aria-label="共同制作ページを表示">共同制作</button><button className="legalButton" onClick={()=>openOverlay("legal")} aria-label="利用条件・クレジットを表示">利用条件</button></div>
    </header>

    {phoneMode&&<nav className="phoneDock" aria-label="学習者向け教材"><div>{workspaceModes.map(item=><button key={item.key} data-workspace-key={item.key} className={workspace===item.key?"active":""} aria-current={workspace===item.key?"page":undefined} onClick={()=>openWorkspace(item.key)}><span>{item.label}</span><small>{item.sub}</small></button>)}</div></nav>}

    <dialog ref={phoneSettingsDialogRef} id="phone-settings-panel" className="phoneSettingsSheet" role={phoneMode?"dialog":"presentation"} aria-labelledby={phoneMode?"phone-settings-title":undefined} onCancel={event=>{event.preventDefault();closePhoneSettings()}} onMouseDown={event=>{if(event.target===event.currentTarget)closePhoneSettings()}}>
      <div className="phoneSettingsBackdrop" aria-hidden="true" onClick={closePhoneSettings}/>
      <div className="phoneSettingsHeader"><span id="phone-settings-title">{workspaceModes.find(item=>item.key===workspace)?.label??"教材"}の設定</span><button type="button" className="phoneSettingsClose" onClick={closePhoneSettings} aria-label="設定を閉じる">×</button></div>
    <aside className={`leftRail rail-${workspace}`} key={`rail-${workspace}`}>
      {workspace==="sections"&&<>
        <p className="eyebrow">CUTTING PLANE</p>
        {(Object.keys(planeData) as Plane[]).map((p, i) => <button key={p} className={`planeBtn ${plane === p ? "active" : ""}`} aria-current={plane===p?"page":undefined} onClick={() => jump(p,p===plane?undefined:52)}><span>0{i + 1}</span><b>{planeData[p].ja}</b><small>{planeData[p].en}</small></button>)}
        <div className="railLine"/>
        <p className="eyebrow structureHeading">FOCUS STRUCTURE <small>複数選択</small></p>
        <div className="structureGroupGrid" role="group" aria-label="構造グループの一括表示">
          {structureGroups.map(group=>{const available=group.members.filter(structureAvailable),count=available.filter(key=>visibleSet.has(key)).length,all=available.length>0&&count===available.length;return <button key={group.key} className={`${all?"active":""} ${count>0&&!all?"partial":""}`} aria-pressed={all} onClick={()=>toggleGroup(group.members)} disabled={available.length===0}><i style={{background:group.color}}/><span>{group.name}</span><small>{count}/{available.length}</small></button>})}
        </div>
        <button className="clearStructures" onClick={()=>setVisibleStructures([])} disabled={visibleStructures.length===0}>すべて解除</button>
        {structureKeys.map(key => {const item=structures[key],available=structureAvailable(key),active=available&&visibleSet.has(key);return <button key={key} data-structure-key={key} aria-pressed={active} aria-disabled={!available} className={`structureBtn ${active?"active":""} ${selectedStructure===key?"current":""} ${available?"":"unavailable"}`} title={available?`${item.name}を着色`:"現在の画像ソースには対応ラベルがありません"} onClick={()=>toggleStructure(key)}><i style={{background:item.color}}/><span>{item.name}</span><strong>{available?(active?"✓":"＋"):"—"}</strong></button>})}
      </>}
      {workspace==="surface"&&<>
        <p className="eyebrow">SURFACE VIEW</p>
        {(Object.keys(surfaceViews) as SurfaceViewKey[]).map((key,i)=><button key={key} className={`planeBtn lessonRailBtn ${surfaceView===key?"active":""}`} aria-current={surfaceView===key?"page":undefined} onClick={()=>chooseSurface(key)}><span>{key==="free"?"自由":`0${i+1}`}</span><b>{surfaceViews[key].name}</b><small>{surfaceViews[key].en}</small></button>)}
        <div className="railLine"/>
      </>}
      {workspace==="blocks"&&<>
        <p className="eyebrow">SPECIMEN BLOCK</p>
        <p className="blockPriorityDisclaimer">{BLOCK_PRIORITY_DISCLAIMER}</p>
        {BLOCK_PRIORITY_GROUP_KEYS.map(groupKey=>{const group=BLOCK_PRIORITY_GROUPS[groupKey];return <section key={groupKey} className={`blockPriorityGroup blockPriorityGroup-${groupKey}`} aria-labelledby={`block-priority-${groupKey}`}>
          <header><b id={`block-priority-${groupKey}`}>{group.label}</b><small>{group.description}</small></header>
          <div>{group.specimenKeys.map(key=>{const index=blockSpecimenKeys.indexOf(key),entry=BLOCK_PRIORITY_ENTRY_BY_KEY[key];return <button key={key} data-block-priority-group={groupKey} className={`planeBtn lessonRailBtn ${blockSpecimen===key?"active":""}`} aria-current={blockSpecimen===key?"page":undefined} onClick={()=>chooseBlock(key)}><span>0{index+1}</span><b>{blockSpecimens[key].name}</b><small>{blockSpecimens[key].en}</small><small className="blockPriorityReason">{entry.reason}</small></button>})}</div>
        </section>})}
        <div className="railLine"/><p className="railMemo">「切り離した途端に位置関係が分からない」を避けるため、全脳の中での位置を残したまま観察します。</p>
      </>}
      {workspace==="quiz"&&<>
        <p className="eyebrow">REVIEW QUIZ</p>
        <div className="quizRailScore"><strong>{quizEmpty?"00":String(quizFinished?quizQueue.length:quizIndex+1).padStart(2,"0")}</strong><span>/ {quizQueue.length}</span><small>{quizEmpty?"今回の出題なし":quizFinished?`完了・正答 ${quizScore}`:`正答 ${quizScore}`}</small></div>
        <div className="quizRailDots">{quizQueue.map((_,i)=><i key={i} className={quizFinished||i<quizIndex?"done":i===quizIndex?"current":""}/>)}</div>
        <div className="quizSetup">
          <div className="quizSetupHeading"><b>次回出題の条件</b><small>条件を変えても、現在の問題はそのままです。</small></div>
          <label><span>次回出題項目（トピック）</span><select value={quizCategory} onChange={event=>setQuizCategory(event.target.value as "all"|QuizCategory)}>{quizCategories.map(category=><option key={category.key} value={category.key}>{category.label}（{quizChoiceCount("category",category.key)}問）</option>)}</select></label>
          <label><span>次回の教材形式</span><select value={quizFormat} onChange={event=>chooseQuizFormat(event.target.value as QuizFormatFilter)}>{quizFormatOptions.map(option=><option key={option.key} value={option.key}>{option.label}（{quizChoiceCount("format",option.key)}問）</option>)}</select></label>
          <label><span>次回の詳細（形式と組合せ）</span><select value={quizDetail} onChange={event=>setQuizDetail(event.target.value as QuizDetailFilter)}><option value="all">すべての詳細（{quizChoiceCount("detail","all")}問）</option>{quizDetailOptions.map(detail=><option key={detail} value={detail}>{quizDetailLabels[detail]}（{quizChoiceCount("detail",detail)}問）</option>)}</select><small className="quizFilterHint">脳神経・主要血管3Dは、既存の模式形状を名称同定だけで確認する試作問題です。</small></label>
          <div className="quizCandidateSummary" role="status" aria-live="polite"><b>次回 {quizCandidateCount}問候補</b><span>標準 {quizStandardCandidateCount}・試作 {quizProvisionalCandidateCount}</span></div>
          {quizCandidateCount===0&&<p className="quizCandidateEmptyNote" role="status" aria-live="polite">現在の条件の組合せに該当する問題がありません。トピック・形式・詳細・「間違った問題のみ」・「試作問題を含む」を見直してください。</p>}
          <div><span>次回の問題数（候補に応じて）</span><div className="quizCountButtons" role="group" aria-label="次回の問題数（上限）">{([5,10,15,20] as const).map(count=>{const actual=Math.min(count,quizCandidateCount);const label=quizCandidateCount<count?`${count}問（実際${actual}問）`:`${count}問`;return <button key={count} className={quizCount===count?"active":""} onClick={()=>setQuizCount(count)} disabled={quizCandidateCount===0} aria-pressed={quizCount===count} aria-label={`${count}問を上限に${actual}問（候補${quizCandidateCount}）`}>{label}</button>})}</div></div>
          <label className="wrongOnlyToggle"><input data-quiz-wrong-only="true" type="checkbox" checked={quizWrongOnly} onChange={event=>setQuizWrongOnly(event.target.checked)}/><span>間違った問題のみ</span><b data-quiz-candidate-count={quizCandidateCount}>{wrongTargets.length}</b></label>
          <label className="provisionalQuizToggle"><input type="checkbox" checked={quizIncludeProvisional} onChange={event=>setQuizIncludeProvisional(event.target.checked)}/><span>試作問題を含む<small>専門家未確認・位置照合ラベル</small></span></label>
          <button data-quiz-start="true" className="quizStart" onClick={startQuiz} disabled={quizCandidateCount===0}>この条件で出題（{quizActualCount}問）</button>
        </div>
        <button className="railReset" onClick={resetQuiz} disabled={quizEmpty}>今回を最初から</button><button className="historyReset" onClick={resetWrongHistory} disabled={wrongTargets.length===0}>間違い履歴を消去</button>
      </>}
      {workspace==="segment"&&<><p className="eyebrow">SEGMENTATION</p><div className="segRailIntro"><b>差分編集</b><p>元データを直接変更せず、修正したボクセルだけをJSONへ保存します。</p><ol><li>水平断を選ぶ</li><li>冠状・矢状断で位置を照合する</li><li>水平断で構造とブラシを選ぶ</li><li>境界を修正する</li><li>JSONをPRへ添付</li></ol></div><div className="railLine"/><p className="railMemo">共同制作者向けのα機能です。冠状断・矢状断は照合専用です。公式ラベルへの統合には、別のレビューと変換処理が必要です。</p></>}
    </aside>
    </dialog>

    {workspace==="home"&&<section className="homeArea homeNoticeArea" id="workspace" tabIndex={-1}>
      <article className="homeNotice">
        <header><span>PUBLIC ALPHA · EDUCATIONAL USE ONLY</span><h1>脳実習ナビ</h1><p><strong>本アプリは、神経解剖学の教育・自主学習目的で提供しています。</strong>教育目的以外での利用はお控えください。</p></header>
        <div className="homeNoticePoints">
          <section><b>教育目的での利用</b><p>脳表、断面、3Dモデルを行き来しながら、構造の見え方と位置関係を確認する学習教材です。</p></section>
          <section><b>公開α版</b><p>解剖学的表示は継続して確認・改訂しています。教科書や検証済み資料と照合して利用してください。</p></section>
          <section><b>利用上の注意</b><p>診断、治療、手術計画、定量研究のためには使用できません。出典・利用条件は事前に確認してください。</p></section>
        </div>
        <footer><button className="homeEnter" onClick={()=>openWorkspace("surface")}>教育目的で教材を開く</button><button onClick={()=>openOverlay("legal")}>利用条件・データ・クレジット</button><button onClick={()=>openOverlay("status")}>更新履歴・既知の制限</button><button onClick={()=>openOverlay("feedback")}>匿名の意見・誤り報告</button></footer>
      </article>
      <p className="homeQuietNote">教育目的の試作教材です。内容への懸念や解剖学的な指摘は、匿名の意見・誤り報告からお知らせください。</p>
    </section>}

    {workspace==="sections"&&<section className="workArea" id="workspace" tabIndex={-1}><h1 className="srOnly">断面実習</h1>
      <div className="visualGrid"><section className="slicePanel">
        <div className="panelHead"><div><b>{planeData[plane].ja}</b><small>位置 {position}・BigBrain公開組織画像 0.5 mm（表示用再標本化・同一格子で検証済み）・実習標本調</small></div><div className="sliceTools">{sectionDeveloperControls&&<><div className="contrastSwitch" aria-label="開発者用・断面画像ソース"><button className={contrast === "bigbrain" ? "active" : ""} onClick={() => setContrast("bigbrain")}>BigBrain組織 0.5</button><button className={contrast === "single" ? "active" : ""} onClick={() => setContrast("single")}>単一固定脳 MRI 0.444 mm</button><button className={contrast === "t1" ? "active" : ""} onClick={() => setContrast("t1")}>平均T1</button><button className={contrast === "t2" ? "active" : ""} onClick={() => setContrast("t2")}>T2</button></div><div className="displaySwitch" aria-label="開発者用・断面表示調"><button className={display === "specimen" ? "active" : ""} onClick={() => setDisplay("specimen")}>実習標本調</button><button className={display === "diagram" ? "active" : ""} onClick={() => setDisplay("diagram")}>学習図</button><button className={display === "outline" ? "active" : ""} onClick={() => setDisplay("outline")}>輪郭</button></div></>}<div className="sectionLayoutSwitch" aria-label="断面と全脳3Dの表示"><button className={sectionLayout==="both"?"active":""} aria-pressed={sectionLayout==="both"} onClick={()=>setSectionLayout("both")} disabled={webglUnavailable}>断面＋3D</button><button className={sectionLayout==="slice"?"active":""} aria-pressed={sectionLayout==="slice"} onClick={()=>setSectionLayout("slice")}>断面のみ</button><button className={sectionLayout==="model"?"active":""} aria-pressed={sectionLayout==="model"} onClick={()=>setSectionLayout("model")} disabled={webglUnavailable}>3Dのみ</button></div><label className="labelToggle compactToggle"><input type="checkbox" checked={labels} onChange={e => setLabels(e.target.checked)}/><span/>構造表示</label></div></div>
        <div className={`sliceStage ${plane} ${sliceVariant(position)} layout-${sectionLayout}`}>
          {sectionLayout!=="model"&&<div className="sliceViewport">
            <AtlasVolumeCanvas kind="slice" plane={plane} position={position} focus={focus} display={display} rotation={rotation} contrast={contrast} highlights={highlightLayers} onIdentify={contrast==="single"?undefined:identify} onViewChange={()=>setIdentified(null)}/>
            <div className={`identifyHint ${contrast==="single"?"unavailable":""}`}><b>{contrast==="single"?"ホイールで拡大縮小":"クリックで同定・ホイールで拡大"}</b><span>{contrast==="bigbrain"?"0.5 mm格子・Shiftドラッグで移動":contrast==="single"?"画像参照・Shiftドラッグで移動":"アトラス対応・Shiftドラッグで移動"}</span></div>
            {identified&&<div className={`identifyMarker ${identified.id===0?"outside":""}`} style={{left:`clamp(88px, ${identified.x}px, calc(100% - 88px))`,top:`clamp(70px, ${identified.y}px, calc(100% - 18px))`}}><i/><b>{labels?`${identified.side}${identified.name}`:"？"}</b>{sectionDeveloperControls&&<small>{identified.certainty==="atlas"?"ATLAS":identified.certainty==="manual"?"MANUAL":identified.certainty==="reviewed"?"REVIEWED":"PILOT"}</small>}</div>}
          </div>}
          {sectionLayout!=="slice"&&<aside className="modelInset" aria-label="全脳を2方向から見て切断位置を確認">
            <div className="insetHead"><div><b>全脳モデル</b><small>{contrast==="single"?"別個体MRIのため切断位置は概略":block==="ghost"?"透過脳表で内部構造を確認":block==="segmented"?"不透明な分節モデルで切断位置を確認":"切断面と選択構造を確認"}</small></div><span>{planeData[plane].en.slice(0,3)} {position}</span></div>
            <div className={`insetViews ${webglUnavailable?"webglUnavailable":""}`}>{sectionModelRotations.slice(0,webglUnavailable?1:undefined).map((modelRotation,index)=><div key={index} className={`modelStage insetStage ${webglUnavailable?"webglUnavailable":""}`} tabIndex={webglUnavailable?undefined:0} aria-label={webglUnavailable?undefined:`切断位置の全脳3Dモデル・${index===0?"基準方向":"直交方向"}。ドラッグまたは矢印キーで回転、Rキーで向きを戻す`} onKeyDown={webglUnavailable?undefined:handleModelKey} onPointerDown={webglUnavailable?undefined:beginRotation} onPointerMove={webglUnavailable?undefined:move} onPointerUp={webglUnavailable?undefined:()=>setDrag(null)} onPointerCancel={webglUnavailable?undefined:()=>setDrag(null)} onContextMenu={webglUnavailable?undefined:event=>event.preventDefault()}>
              <AtlasVolumeCanvas kind="surface" plane={plane} position={position} focus={focus} display={display} rotation={modelRotation} view={block} contrast={contrast} showFocus={modelFocusVisible} showZoomControls={false} selectionMeshLayers={sectionSelectionMeshLayers} onWebGLUnavailableChange={setWebglUnavailable}/>
              {!webglUnavailable&&<><OrientationCompass rotation={modelRotation} compact/><span className="insetViewLabel">{index===0?"基準方向":"90°直交"}</span></>}
            </div>)}</div>
            {!webglUnavailable&&<div className="blockControls"><button className={block === "segmented" ? "active" : ""} onClick={e => {e.stopPropagation();setBlock("segmented")}}>分節</button><button className={block === "ghost" ? "active" : ""} onClick={e => {e.stopPropagation();setBlock("ghost")}}>透過</button><button className={block === "extracted" ? "active" : ""} onClick={e => {e.stopPropagation();setBlock("extracted")}}>切断</button></div>}
          </aside>}
        </div>
        <section className="timeline sliceTimeline">
          <div className="timelineHead"><button className={`playButton ${playing ? "active" : ""}`} onClick={() => setPlaying(!playing)} aria-label={playing ? "連続断面を停止" : "連続断面を再生"}>{playing ? "Ⅱ" : "▶"}</button><div><span>{planeData[plane].from}</span><b>{planeData[plane].axis}</b><span>{planeData[plane].to}</span></div><output>{position}</output></div>
          <div className="rangeWrap"><input aria-label={`${planeData[plane].ja}の${planeData[plane].axis}`} type="range" min="0" max="100" value={position} onChange={e => {setPlaying(false);setPosition(Number(e.target.value))}} onKeyDown={e => {if(e.key==="ArrowLeft"||e.key==="ArrowRight")setPlaying(false)}}/></div>
        </section>
        <div className="selectedStructureBar">
          <div className="selectedStructureSummary"><span style={{background:current.color}}/><div><small>{activeVisibleStructures.length}構造を同時表示中</small><b>{activeVisibleStructures.length?"選択中の構造":"構造を選択してください"}</b></div><div className="selectedBarActions"><button className="detailToggle" onClick={()=>setDetailsOpen(true)} disabled={!visibleSet.has(selectedStructure)}>詳細解説</button><button onClick={()=>setLabels(!labels)} disabled={contrast==="single"}>{labels?"隠す":"表示"}</button></div></div>
          {activeVisibleStructures.length>0&&<div className="selectedStructureList" aria-label="選択中の構造と解説">{activeVisibleStructures.map(key=>{const item=structures[key],source=item.labelSource?learnerLabelSourceDisplay[item.labelSource]:null;return <button key={key} className={selectedStructure===key?"current":""} onClick={()=>focusStructure(key)}><i style={{background:item.color}}/><span><b>{item.name}</b><small>{item.latin}</small>{source&&<small className={`provenanceBadge ${source.className}`}>{source.label}</small>}</span><p>{labels?(sectionDeveloperControls&&key===selectedStructure?currentSourceNote:item.note):"解答を隠しています"}<em>{labels&&item.relation}</em></p></button>})}</div>}
        </div>
      </section></div>
    </section>}

    {workspace==="surface"&&<section className="workArea learningArea" id="workspace" tabIndex={-1}>
      <div className="workHead"><div><span className="eyebrow">SURFACE PRACTICAL</span><h1>脳表観察</h1></div><span className="sourceBadge">MNI高密度脳表＋教材レイヤー</span></div>
      <div className="learningGrid">
        <section className="learningModelCard"><div className="panelHead"><div><b>{surfaceLesson.name}</b><small>{surfaceLesson.en}・ドラッグで回転</small></div><div className="panelActions">{surfaceView==="free"?<span>{freeSelections.length} 構造を選択中</span>:surfaceNeurovascular?<span>3D OVERLAY · PILOT</span>:surfaceView!=="medial"?<button className={surfaceCerebellum?"active":""} aria-pressed={surfaceCerebellum} onClick={()=>setSurfaceCerebellum(value=>!value)} disabled={webglUnavailable}>{surfaceCerebellum?"小脳を外す":"小脳を戻す"}</button>:null}<button onClick={resetSurfaceView} disabled={webglUnavailable}>向きを戻す</button></div></div>
          <div className={`learningModelStage modelStage ${webglUnavailable?"webglUnavailable":""}`} data-rotation-x={rotation.x} data-rotation-y={rotation.y} data-rotation-z={rotation.z??0} tabIndex={webglUnavailable?undefined:0} aria-label={webglUnavailable?undefined:"脳表3Dモデル。ドラッグまたは矢印キーで回転、Rキーで向きを戻す"} onKeyDown={webglUnavailable?undefined:handleModelKey} onPointerDown={webglUnavailable?undefined:beginRotation} onPointerMove={webglUnavailable?undefined:move} onPointerUp={webglUnavailable?undefined:()=>setDrag(null)} onPointerCancel={webglUnavailable?undefined:()=>setDrag(null)} onContextMenu={webglUnavailable?undefined:event=>event.preventDefault()}>
            <AtlasVolumeCanvas kind="surface" plane="sagittal" position={50} focus="thalamus" display="specimen" rotation={rotation} view={(surfaceNeurovascular||surfaceView==="free")&&surfaceGhost?"ghost":"inside"} contrast="bigbrain" showFocus={surfaceView==="free"} showCutPlane={false} hemisphere={renderedHemisphere} showCerebellum={surfaceCerebellum} showPonsMedulla={surfacePonsMedulla} showMidbrain={surfaceView!=="medial"} surfaceHighlights={surfaceNeurovascular?[]:papezStepperActive?papezStepperSurfaceHighlights:surfaceHighlightLayers} surfaceLandmarks={surfaceNeurovascular?[]:renderedSurfaceLandmarks} surfaceDeepLandmarks={surfaceNeurovascular?[]:papezStepperActive?[...papezStepperDeepKeys]:renderedSurfaceDeepLandmarks} neurovascularOverlay={surfaceNeurovascular||surfaceView==="inferior"||surfaceView==="free"?surfaceOverlay:"none"} showBrainstemNerves={surfaceView==="inferior"||surfaceView==="free"?surfacePonsMedulla:surfaceNerves} neurovascularHighlights={surfaceNeurovascular||surfaceView==="free"?neurovascularHighlightLayers:surfaceView==="inferior"?inferiorCanonicalNerveHighlights:[]} showBasalLandmarks={surfaceView==="inferior"||surfaceView==="arteries"||surfaceView==="cranialNerves"||surfaceView==="free"} basalLandmark={surfaceView==="cranialNerves"?"brainstem-only":surfaceView==="arteries"?"without-brainstem-patches":"all"} basalHighlights={surfaceView==="free"?renderedBasalLandmarks:(surfaceView==="inferior"||surfaceView==="cranialNerves")?surfaceVisibleBasalLandmarks:[]} basalOnlySelected={false} selectionMeshLayers={surfaceView==="free"?(basalStepperActive?freePathwayMeshLayers:papezStepperActive?papezStepperMeshLayers:freePathwayMeshLayers):[]} onSurfaceIdentify={surfaceView==="free"?identifyFreeSurface:undefined} onWebGLUnavailableChange={setWebglUnavailable}/>
            {!webglUnavailable&&<><OrientationCompass rotation={rotation}/>
            {surfaceNeurovascular&&<div className="neurovascularControls specimenPartControls" aria-label="脳表・神経血管レイヤー"><button className={surfaceVessels?"active vessels":""} aria-pressed={surfaceVessels} onClick={()=>setSurfaceVessels(value=>!value)}><i/>血管</button><button className={surfaceNerves?"active nerves":""} aria-pressed={surfaceNerves} onClick={()=>setSurfaceNerves(value=>!value)}><i/>脳神経</button><button className={surfaceCerebellum?"active":""} aria-pressed={surfaceCerebellum} onClick={()=>setSurfaceCerebellum(value=>!value)}>{surfaceCerebellum?"小脳を外す":"小脳を戻す"}</button><button className={surfaceGhost?"active":""} aria-pressed={surfaceGhost} onClick={()=>setSurfaceGhost(value=>!value)}>{surfaceGhost?"脳表を戻す":"脳表を透過"}</button></div>}
            {surfaceView==="inferior"&&<div className="neurovascularControls specimenPartControls basalOverlayControls" aria-label="下面の補助レイヤー"><button className={surfaceVessels?"active vessels":""} aria-pressed={surfaceVessels} onClick={()=>setSurfaceVessels(value=>!value)}><i/>血管</button><button className={surfacePonsMedulla&&surfaceNerves?"active nerves":""} aria-pressed={surfacePonsMedulla&&surfaceNerves} onClick={toggleInferiorHindbrain}>橋・延髄</button></div>}
            {surfaceView==="free"&&<div className="freeObservationControls" aria-label="自由観察の表示レイヤー"><div className="freeHemisphereSwitch"><span>半球</span>{(["both","left","right"] as const).map(side=><button key={side} className={freeHemisphere===side?"active":""} aria-pressed={freeHemisphere===side} onClick={()=>setFreeHemisphere(side)}>{side==="both"?"全脳":side==="left"?"左半球":"右半球"}</button>)}</div><div><button className={surfaceGhost?"active":""} aria-pressed={surfaceGhost} onClick={()=>setSurfaceGhost(value=>!value)}>{surfaceGhost?"脳表を戻す":"脳表を透過"}</button><button className={surfaceCerebellum?"active":""} aria-pressed={surfaceCerebellum} onClick={()=>setSurfaceCerebellum(value=>!value)}>小脳</button><button className={surfaceVessels?"active vessels":""} aria-pressed={surfaceVessels} onClick={()=>setSurfaceVessels(value=>!value)}>血管</button><button className={surfacePonsMedulla?"active nerves":""} aria-pressed={surfacePonsMedulla} onClick={toggleFreeHindbrain}>橋・延髄</button></div></div>}
            {surfaceView==="free"&&<div className="freeSelectionOverlay" aria-live="polite"><small>クリック／検索で複数選択</small><b>{freeFocusedItem?.name??(freeSelectedItems.length?`${freeSelectedItems.length}構造を着色中`:"構造を選択してください")}</b>{freeFocusedItem&&<span>{freeFocusedItem.latin}</span>}</div>}
            {basalStepperActive&&<div className="pathwayStepperModelTag" aria-live="polite"><span>位置関係ステッパー・試作</span><b>{basalStepperStep.label}</b><small>{basalStepperTargetNames.join(" ／ ")}・3Dと断面を同じ色で表示</small></div>}
            {papezStepperActive&&<div className="pathwayStepperModelTag papezStepperModelTag" aria-live="polite"><span>PAPEZ・由来別ステッパー</span><b>{papezStepperStep.label}</b><small>{papezStepperTargetNames.join(" ／ ")}・{papezStepSourceLabels[papezStepperStep.source]}・{papezStepperStep.kind==="section-label"?(papezStepperHasMesh?"3D／断面同期":"断面ラベルのみ"):"3Dのみ"}</small></div>}
            {surfaceNeurovascular&&<div className="neurovascularLegend">{surfaceVessels&&<><span><i className="arterialAnterior"/>内頸動脈系</span><span><i className="arterialPosterior"/>椎骨脳底系</span></>}{surfaceNerves&&<><span><i className="nerveAnterior"/>I–IV</span><span><i className="nervePontine"/>V–VIII</span><span><i className="nerveMedullary"/>IX–XII</span></>}</div>}</>}
          </div>
        </section>
        <aside className="learningGuide" key={surfaceView}>
          <span className="guideIndex">{surfaceView==="free"?"FREE EXPLORATION":`観察 0${(Object.keys(surfaceViews) as SurfaceViewKey[]).indexOf(surfaceView)+1}`}</span><h2>{surfaceLesson.name}</h2><p>{surfaceLesson.intro}</p>
          {surfaceView!=="arteries"&&surfaceView!=="cranialNerves"&&<div className="accuracyNote surfaceNomenclatureNote" data-surface-nomenclature-note="cerebra-desikan-five"><b>脳表ラベルの注意</b><p>{surfaceAtlasNomenclatureNote}</p></div>}
          {surfaceView==="inferior"&&<div className="basalLandmarkPicker surfaceRegionPicker"><header><div><b>同定する構造</b><small>脳底構造は常時表示し、選択した構造を着色</small></div><span className="pickerActions"><button onClick={()=>setSurfaceVisibleBasalLandmarks(basalLandmarkKeys)} disabled={surfaceVisibleBasalLandmarks.length===basalLandmarkKeys.length}>すべて選択</button><button onClick={()=>setSurfaceVisibleBasalLandmarks([])} disabled={surfaceVisibleBasalLandmarks.length===0}>すべて解除</button></span></header><div>{basalLandmarkKeys.map(key=>{const item=basalLandmarks[key],active=surfaceVisibleBasalLandmarks.includes(key);return <button key={key} className={active?"active":""} aria-pressed={active} title={item.note} onClick={()=>toggleBasalLandmark(key)}><i style={{background:item.color}}/><span>{item.name}<small>{item.latin}</small></span></button>})}</div><em>上丘・下丘は中脳背側の構造です。選択後にモデルを回転して確認します。橋・延髄のボタンでは、付随する脳神経も一緒に着脱します。</em></div>}
          {surfaceView==="free"?<div className="freeExplorer">
            <header><div><b>構造を探す</b><small>文字検索または分類別索引から追加</small></div><button onClick={clearFreeObservation} disabled={freeSelections.length===0&&selectedPathway===null}>すべて解除</button></header>
            <section className="pathwayPresets" aria-label="経路観察プリセット"><div><b>経路観察（試作）</b><small>既存の構造を順に結び、位置関係だけを確認</small></div><nav>{pathwayPresetKeys.map(key=><button key={key} className={selectedPathway===key?"active":""} aria-pressed={selectedPathway===key} onClick={()=>applyPathwayPreset(key)}>{pathwayPresets[key].name}</button>)}</nav>{activePathway&&<article><p>{activePathway.summary}</p><ol>{pathwayPresets[selectedPathway!].steps.map(step=><li key={step}>{step}</li>)}</ol><small>模式・試作表示です。線維の全経路、核内結合、興奮性／抑制性、個体差は再現していません。</small></article>}</section>
            {basalStepperActive&&<section className="pathwayStepper" aria-label="大脳基底核回路の位置関係ステッパー">
              <header><div><b>大脳基底核回路・位置関係ステッパー</b><small>回路を完全再現せず、既存構造の位置関係を順に確認する試作</small></div><span>{basalStepperIndex+1} / {BASAL_GANGLIA_STEPS.length}</span></header>
              <div className="pathwayStepperStageTitle"><span>STEP {String(basalStepperIndex+1).padStart(2,"0")}</span><b>{basalStepperStep.label}</b><small>{planeData[basalStepperStep.plane].ja}・位置 {basalStepperStep.position}（既存クイズ位置）</small></div>
              <div className="pathwayStepperSlice" aria-label={`${basalStepperStep.label}の同期断面`}><div className="pathwayStepperSliceHead"><b>{planeData[basalStepperStep.plane].ja}・同期断面</b><small>色付き画素を確認</small></div><div className="pathwayStepperSliceStage"><AtlasVolumeCanvas kind="slice" plane={basalStepperStep.plane} position={basalStepperStep.position} focus={structures[basalStepperStructureKeys[0]].meshFocus??"thalamus"} display="specimen" rotation={{x:-7,y:-18,z:0}} contrast="bigbrain" highlights={basalStepperSliceHighlights}/><div className="pathwayStepperSliceLegend">{basalStepperStructureKeys.map(key=><span key={key}><i style={{background:structures[key].color}}/>{structures[key].name}</span>)}</div></div></div>
              <div className="pathwayStepperControls" role="group" aria-label="ステッパー操作"><button onClick={()=>chooseBasalStepperStep(0)} disabled={basalStepperIndex===0}>最初へ戻る</button><button onClick={()=>chooseBasalStepperStep(basalStepperIndex-1)} disabled={basalStepperIndex===0}>前</button><button className="stepperPlay" onClick={toggleBasalStepperPlaying} disabled={!basalStepperPlaying&&basalStepperIndex>=BASAL_GANGLIA_STEPS.length-1}>{basalStepperPlaying?"一時停止":"再生"}</button><button onClick={()=>chooseBasalStepperStep(basalStepperIndex+1)} disabled={basalStepperIndex>=BASAL_GANGLIA_STEPS.length-1}>次</button></div>
              <p className="pathwayStepperCaution">この試作は、既存の手動分節ラベルを3Dと断面で同期表示します。新しい境界、線、結合、興奮／抑制、投射方向は追加していません。手動の自由観察選択とは別に動作します。</p>
            </section>}
            {papezStepperActive&&<section className="pathwayStepper papezPathwayStepper" aria-label="Papez回路の由来別位置関係ステッパー">
              <header><div><b>Papez回路・由来別位置関係ステッパー</b><small>既存ラベルと既存3Dガイドを、由来を分けて順に確認する試作</small></div><span>{papezStepperIndex+1} / {PAPEZ_STEPS.length}</span></header>
              <div className="pathwayStepperStageTitle"><span>STEP {String(papezStepperIndex+1).padStart(2,"0")} · {papezStepKindLabels[papezStepperStep.kind]}</span><b>{papezStepperStep.label}</b><small>{papezStepSourceLabels[papezStepperStep.source]}・{papezStepperTargetNames.join(" ／ ")}</small></div>
              {papezStepperStep.kind==="section-label"&&<div className="pathwayStepperSlice" aria-label={`${papezStepperStep.label}の同期断面`}><div className="pathwayStepperSliceHead"><b>{planeData[papezStepperStep.plane!].ja}・同期断面</b><small>既存クイズ位置・色付き画素を確認</small></div><div className="pathwayStepperSliceStage"><AtlasVolumeCanvas kind="slice" plane={papezStepperStep.plane!} position={papezStepperStep.position!} focus={structures[papezStepperSectionKeys[0]].meshFocus??"thalamus"} display="specimen" rotation={{x:-7,y:-18,z:0}} contrast="bigbrain" highlights={papezStepperSliceHighlights}/><div className="pathwayStepperSliceLegend">{papezStepperSectionKeys.map(key=><span key={key}><i style={{background:structures[key].color}}/>{structures[key].name}</span>)}</div></div></div>}
              {papezStepperStep.kind!=="section-label"&&<div className="pathwayStepper3dOnlyNote"><b>この段階は3Dのみ</b><p>{papezStepperStep.note}</p><small>断面Canvasは作成していません。未分節の実標本境界を示すものではありません。</small></div>}
              <div className="pathwayStepperProvenance"><b>由来</b><span>{papezStepperStep.provenance}</span>{papezStepperStep.key==="mammillaryBody"&&<em>専門家レビュー未完了</em>}{papezStepperStep.key==="thalamus"&&<em>前部核は未分節</em>}</div>
              <div className="pathwayStepperControls" role="group" aria-label="Papezステッパー操作"><button onClick={()=>choosePapezStepperStep(0)} disabled={papezStepperIndex===0}>最初へ戻る</button><button onClick={()=>choosePapezStepperStep(papezStepperIndex-1)} disabled={papezStepperIndex===0}>前</button><button className="stepperPlay" onClick={togglePapezStepperPlaying} disabled={!papezStepperPlaying&&papezStepperIndex>=PAPEZ_STEPS.length-1}>{papezStepperPlaying?"一時停止":"再生"}</button><button onClick={()=>choosePapezStepperStep(papezStepperIndex+1)} disabled={papezStepperIndex>=PAPEZ_STEPS.length-1}>次</button></div>
              <p className="pathwayStepperCaution">この試作は既存の断面ラベル・模式補助・アトラス領域を由来別に表示します。新しいボクセル、メッシュ、線維束、結合、投射方向、興奮／抑制は追加していません。乳頭体ID39・40は専門家レビュー待ちです。</p>
            </section>}
            <label className="freeSearch"><span>検索</span><input type="search" value={freeSearch} placeholder="例：中心前回、視神経、artery" onChange={event=>setFreeSearch(event.target.value)} onKeyDown={event=>{if(event.key==="Enter"&&freeFilteredItems[0])selectFreeObservation(freeFilteredItems[0].key)}}/>{freeSearch&&<button aria-label="検索をクリア" onClick={()=>setFreeSearch("")}>×</button>}</label>
            {normalizedFreeSearch&&<div className="freeSearchResults" aria-label="検索結果"><div className="freeResultSummary"><b>{freeFilteredItems.length}件</b><span>クリックして表示へ追加</span></div>{freeFilteredItems.length?<div>{freeFilteredItems.map(item=>{const active=freeSelectedSet.has(item.key);return <button key={item.key} className={active?"active":""} aria-pressed={active} onClick={()=>selectFreeObservation(item.key)}><i style={{background:item.color}}/><span><b>{item.name}</b><small>{item.latin}</small></span><em>{item.kind}</em><strong>{active?"✓":"＋"}</strong></button>})}</div>:<p>該当する構造はありません。</p>}</div>}
            <label className="freeStructureIndex"><span><b>構造索引</b><small>分類から名称を選択</small></span><select value="" onChange={event=>{if(event.target.value)selectFreeObservation(event.target.value as FreeObservationKey)}}><option value="">構造を選んで追加…</option>{freeObservationKinds.map(kind=><optgroup key={kind} label={kind}>{freeObservationItems.filter(item=>item.kind===kind).map(item=><option key={item.key} value={item.key}>{item.name} — {item.latin}</option>)}</optgroup>)}</select></label>
            <div className="freeSelectedHeader"><div><b>表示中の構造</b><small>{freeSelectedItems.length?`${freeSelectedItems.length}件を着色中`:"まだ選択されていません"}</small></div><span>3D上のクリックでも追加できます</span></div>
            {freeSelectedItems.length?<div className="freeSelectedCards" aria-label="表示中の構造">{freeSelectedItems.map(item=><article key={item.key} className={freeFocusedKey===item.key?"focused":""}><i style={{background:item.color}}/><div><em>{item.kind} · {learnerSourceLabel(item.source)}</em><b>{item.name}</b><small>{item.latin}</small><p>{item.note}</p><details><summary>由来の詳細</summary><p>{item.source}。詳細な根拠と確度は共同制作ページおよび由来台帳で確認できます。</p></details></div><button aria-label={`${item.name}の表示を解除`} onClick={()=>toggleFreeObservation(item.key)}>×</button></article>)}</div>:<div className="freeEmptySelection"><b>構造を選択してください</b><p>検索、構造索引、または3Dモデルのクリックから複数選択できます。</p></div>}
          </div>:surfaceNeurovascular?<><div className="neurovascularPicker"><header><b>個別に同定</b><small>選択した管・神経根を白色で強調</small></header><div>{neurovascularStructureKeys.filter(key=>neurovascularStructures[key].kind===surfaceNeurovascularKind).map(key=>{const item=neurovascularStructures[key],active=key===selectedNeurovascularStructure;return <button key={key} data-neurovascular-key={key} className={active?"active":""} aria-pressed={active} onClick={()=>chooseNeurovascularStructure(key)}><span>{item.name}<small>{item.latin}</small></span></button>})}</div><p><b>{selectedNeurovascular.name}</b>{selectedNeurovascular.note}</p></div>{surfaceView==="cranialNerves"&&<div className="basalLandmarkPicker surfaceRegionPicker cranialNerveBrainstemPicker"><header><div><b>脳幹の位置関係</b><small>複数の構造を同時に着色</small></div><span className="pickerActions"><button onClick={()=>setSurfaceVisibleBasalLandmarks(cranialNerveBrainstemKeys)} disabled={cranialNerveBrainstemKeys.every(key=>surfaceVisibleBasalLandmarks.includes(key))}>すべて選択</button><button onClick={()=>setSurfaceVisibleBasalLandmarks([])} disabled={surfaceVisibleBasalLandmarks.length===0}>すべて解除</button></span></header><div>{cranialNerveBrainstemKeys.map(key=>{const item=basalLandmarks[key],active=surfaceVisibleBasalLandmarks.includes(key);return <button key={key} className={active?"active":""} aria-pressed={active} onClick={()=>toggleBasalLandmark(key)}><i style={{background:item.color}}/><span>{item.name}<small>{item.latin}</small></span></button>})}</div><em>神経根は、着色した中脳・橋・延髄および錐体・オリーブとの位置関係で確認します。上丘・下丘とIVは背側から観察します。</em></div>}</>:<>
            <div className="surfaceRegionPicker"><header><div><b>同定する構造</b><small>無着色の標本から、確認する構造だけを追加</small></div><span className="pickerActions"><button onClick={()=>setSurfaceVisibleRegions(surfaceViewRegions[surfaceView])} disabled={surfaceVisibleRegions.length===surfaceViewRegions[surfaceView].length}>すべて選択</button><button onClick={()=>setSurfaceVisibleRegions([])} disabled={surfaceVisibleRegions.length===0}>すべて解除</button></span></header><div>{surfaceViewRegions[surfaceView].map(key=>{const region=surfaceRegions[key],active=surfaceVisibleRegions.includes(key);return <button key={key} data-surface-region-key={key} className={active?"active":""} aria-pressed={active} onClick={()=>toggleSurfaceRegion(key)}><i style={{background:region.color}}/><span>{region.name}<small>{region.latin}</small></span></button>})}</div></div>
            {surfaceViewLandmarks[surfaceView].length>0&&<div className="surfaceLandmarkPicker"><header><div><b>溝・裂</b><small>クリックして表示</small></div><span className="pickerActions"><button onClick={()=>setSurfaceVisibleLandmarks(surfaceViewLandmarks[surfaceView])} disabled={surfaceVisibleLandmarks.length===surfaceViewLandmarks[surfaceView].length}>すべて選択</button><button onClick={()=>setSurfaceVisibleLandmarks([])} disabled={surfaceVisibleLandmarks.length===0}>すべて解除</button></span></header><div>{surfaceViewLandmarks[surfaceView].map(key=>{const landmark=surfaceLandmarks[key],active=surfaceVisibleLandmarks.includes(key);return <button key={key} className={active?"active":""} aria-pressed={active} title={landmark.note} onClick={()=>toggleSurfaceLandmark(key)}><i style={{background:landmark.color}}/><span>{landmark.name}<small>{landmark.latin}</small></span></button>})}</div><p>脳回間の位置関係を読む教材ガイドです。両岸の間を仮想的な色面で埋めており、厳密な溝の輪郭や分節境界ではありません。</p></div>}
            {surfaceView==="medial"&&<div className="surfaceLandmarkPicker surfaceDeepPicker"><header><div><b>内側面に追加する深部構造</b><small>初期状態は非表示・左側だけを描画</small></div><button onClick={()=>setSurfaceVisibleDeepLandmarks([])} disabled={surfaceVisibleDeepLandmarks.length===0}>すべて解除</button></header><div>{medialDeepLandmarkKeys.map(key=>{const landmark=surfaceDeepLandmarks[key],active=surfaceVisibleDeepLandmarks.includes(key);return <button key={key} className={active?"active":""} aria-pressed={active} title={`${landmark.source}。${landmark.note}`} onClick={()=>toggleSurfaceDeepLandmark(key)}><i style={{background:landmark.color}}/><span>{landmark.name}<small>{landmark.latin}</small></span><b>{active?learnerSourceLabel(landmark.source):"＋"}</b></button>})}</div><p>この標本では脳弓と透明中隔を表示しません。第三脳室の側壁に接する視床と視床下部を、選択時だけ左側の位置関係として重ねます。尾状核は側脳室に沿うため、この内側面標本の候補には含めません。</p></div>}
          </>}
          {surfaceNeurovascular&&<div className="accuracyNote warning"><b>模式3Dの範囲</b><p>{surfaceLesson.caution}</p><p className="transparencyPolicyNote">透過時も補助レイヤーはモデルの奥行きを保って描画します。通常は半透明、選択中の神経・血管は白色と高い不透明度で追跡しやすくします。これは教育用表示の方針で、実標本の奥行きや境界を保証するものではありません。</p></div>}
        </aside>
      </div>
    </section>}

    {workspace==="blocks"&&blockIntroOpen&&<section className="workArea blockIntroPage" id="workspace" tabIndex={-1}>
      <div className="blockIntroCard"><span>PROTOTYPE</span><h1>ブロック標本は試作中です</h1><p>位置関係を検討するための試作品であり、形状・範囲・接続関係の完全性や解剖学的正確性は保証しません。</p><div><button onClick={()=>setBlockIntroOpen(false)}>試作品を確認する</button><button onClick={()=>openOverlay("feedback")}>誤りを報告する</button></div></div>
    </section>}

    {workspace==="blocks"&&!blockIntroOpen&&<section className={`workArea learningArea ${blockContextVisible?"blockContext-open":""}`} id="workspace" tabIndex={-1}>
      <div className="workHead"><div><span className="eyebrow">LOCAL SPECIMEN</span><h1>標本観察</h1></div><div className="blockReleaseNote"><span className="sourceBadge">試作中・解剖学的正確性は未保証</span><button onClick={()=>openOverlay("feedback")}>誤りを報告</button></div></div>
      <div className={`learningGrid ${blockContextVisible?"blockContext-active":""}`}>
        <section className="learningModelCard"><div className="panelHead"><div><b>{specimenLesson.name}</b><small>{specimenLesson.en}・ドラッグ：回転／Shift・右：傾き</small></div><span>SPECIMEN + SELECTABLE PARTS</span></div>
          <div className={`learningModelStage modelStage ${webglUnavailable?"webglUnavailable":""}`} tabIndex={webglUnavailable?undefined:0} aria-label={webglUnavailable?undefined:"局所標本3Dモデル。ドラッグまたは矢印キーで回転、Rキーで向きを戻す"} onKeyDown={webglUnavailable?undefined:handleModelKey} onPointerDown={webglUnavailable?undefined:beginRotation} onPointerMove={webglUnavailable?undefined:move} onPointerUp={webglUnavailable?undefined:()=>setDrag(null)} onPointerCancel={webglUnavailable?undefined:()=>setDrag(null)} onContextMenu={webglUnavailable?undefined:event=>event.preventDefault()}>
            <AtlasVolumeCanvas kind="surface" plane={specimenLesson.plane} position={specimenLesson.position} focus={specimenLesson.focus} display="specimen" rotation={rotation} view="inside" contrast="bigbrain" showFocus={false} showCutPlane={false} showCerebellum={blockCerebellum} showPonsMedulla={blockPonsMedulla} specimenBlock={blockSpecimen} specimenLayers={blockLayers} specimenTissueMode={blockTissueMode} onWebGLUnavailableChange={setWebglUnavailable}/>
            {!webglUnavailable&&<><OrientationCompass rotation={rotation}/>
            {blockSpecimen==="hindbrain"&&<div className="neurovascularControls specimenPartControls specimenAttachmentControls" aria-label="標本3Dレイヤー"><button className={blockCerebellum?"active":""} aria-pressed={blockCerebellum} onClick={()=>setBlockCerebellum(value=>!value)}>{blockCerebellum?"小脳を外す":"小脳を戻す"}</button><button className={blockPonsMedulla?"active":""} aria-pressed={blockPonsMedulla} onClick={()=>setBlockPonsMedulla(value=>!value)}>{blockPonsMedulla?"橋・延髄を外す":"橋・延髄を戻す"}</button></div>}
            {specimenLesson.layers.length>0&&<div className="specimenTissueControls" aria-label="標本組織の表示"><span>標本組織</span>{(["ghost","solid","hidden"] as SpecimenTissueMode[]).map(mode=><button key={mode} className={blockTissueMode===mode?"active":""} aria-pressed={blockTissueMode===mode} onClick={()=>setBlockTissueMode(mode)}>{mode==="ghost"?"透過":mode==="solid"?"通常":"非表示"}</button>)}</div>}
            <div className="specimenViewControls" aria-label="標本の視点"><span>VIEW</span>{(["initial","opposite","superior","inferior"] as BlockViewPreset[]).map(preset=><button key={preset} className={blockViewPreset===preset?"active":""} aria-pressed={blockViewPreset===preset} onClick={()=>chooseBlockView(preset)}>{blockViewLabels[preset]}</button>)}</div>
            <div className="specimenRotationHint"><b>ドラッグ</b> 自由回転 <i/> <b>Shift・右ドラッグ</b> 傾き</div>
            <div className="modelLegend"><span>0.5 mm標本組織＋構造レイヤー</span><b>{specimenLesson.name}</b><small>{specimenLesson.layers.length?`${blockLayers.length} / ${specimenLesson.layers.length} レイヤーを選択中`:"橋・延髄と小脳を脱着可能"}</small></div></>}
          </div>
        </section>
        <aside className="learningGuide" key={blockSpecimen}><span className="guideIndex">SPECIMEN 0{(Object.keys(blockSpecimens) as BlockSpecimenKey[]).indexOf(blockSpecimen)+1}</span><h2>{specimenLesson.name}</h2><p>{specimenLesson.intro}</p><div className="blockPrioritySelection" data-block-priority-group={BLOCK_PRIORITY_ENTRY_BY_KEY[blockSpecimen].group}><span className="blockPriorityBadge">{BLOCK_PRIORITY_GROUPS[BLOCK_PRIORITY_ENTRY_BY_KEY[blockSpecimen].group].shortLabel}</span><p>{BLOCK_PRIORITY_ENTRY_BY_KEY[blockSpecimen].reason}</p></div>{blockGuidedSpecimenKey&&<section className={"blockGuidedObservation"+(blockGuidedActive?" is-active":"")} data-block-guided-status={blockGuidedActive?"active":"off"} aria-label="部品を順に確認"><header><div><b>部品を順に確認</b><small>UI上の確認順です。解剖・摘出の順序や実習手順を示しません。</small></div>{blockGuidedActive?<span className="blockGuidedStageCount" data-block-guided-stage={"段階 "+(blockGuidedState.stageIndex+1)+" / "+blockGuidedState.steps.length}>段階 {blockGuidedState.stageIndex+1} / {blockGuidedState.steps.length}</span>:<button type="button" data-block-guided-start onClick={startBlockGuided}>開始</button>}</header>{blockGuidedActive&&blockGuidedStep&&<div className="blockGuidedStep" data-block-guided-step-key={blockGuidedStep.key} data-block-guided-final={blockGuidedStep.final?"true":"false"}><div><b>{blockGuidedStep.final?"全ての部品":blockGuidedStep.name}</b><small>{blockGuidedStep.final?"既存の全レイヤーを表示中":blockGuidedStep.note}</small><em>{blockGuidedStep.source}</em></div><nav aria-label="部品確認の移動"><button type="button" data-block-guided-first onClick={firstBlockGuided} disabled={blockGuidedAtFirst}>最初へ</button><button type="button" data-block-guided-previous onClick={()=>moveBlockGuided(-1)} disabled={blockGuidedAtFirst}>前へ</button><button type="button" data-block-guided-next onClick={()=>moveBlockGuided(1)} disabled={blockGuidedAtLast}>次へ</button><button type="button" data-block-guided-stop onClick={stopBlockGuided}>ガイドを終了</button></nav></div>}</section>}<div className="blockContextLauncher"><div><b>切り出し位置を確認</b><small>全脳との位置関係を別表示</small></div><button ref={blockContextLauncherRef} type="button" aria-expanded={blockContextVisible} aria-controls="block-context-panel" onClick={()=>{if(blockContextVisible){closeBlockContext();return}transitionBlockContextState({type:"toggle",specimen:blockSpecimen});setBlockContextDrag(null);setBlockContextWebglUnavailable(false);setBlockContextRotation({...blockInitialRotations[blockSpecimen]})}}>{blockContextVisible?"位置表示を閉じる":"全脳で位置を確認"}</button></div>{specimenLesson.layers.length>0&&<div className="specimenLayerPicker"><header><div><b>標本の部品</b><small>複数を同時に表示できます</small></div><span className="specimenLayerActions"><button onClick={()=>blockLayerFocus&&setBlockLayers([blockLayerFocus])} disabled={blockGuidedActive||!blockLayerFocus||blockLayers.length===1&&blockLayers[0]===blockLayerFocus}>選択だけ</button><button onClick={()=>setBlockLayers(specimenLesson.layers.map(layer=>layer.key))} disabled={blockGuidedActive||blockLayers.length===specimenLesson.layers.length}>すべて表示</button></span></header><div>{specimenLesson.layers.map(layer=>{const active=blockLayers.includes(layer.key);return <button key={layer.key} className={active?"active":""} aria-pressed={active} title={`${layer.source}。${layer.note}`} onClick={()=>toggleBlockLayer(layer.key)} disabled={blockGuidedActive}><i style={{background:layer.color}}/><span>{layer.name}<small>{layer.latin}</small></span><em>{learnerSourceLabel(layer.source)}</em><b>{active?"✓":"＋"}</b></button>})}</div><p>{specimenLesson.layers.find(layer=>layer.key===blockLayerFocus)?.note??"色レイヤーはすべて非表示です。標本組織だけを回転して観察できます。"}</p>{blockLayerFocus&&<details className="provenanceDetails"><summary>由来の詳細</summary><p>{specimenLesson.layers.find(layer=>layer.key===blockLayerFocus)?.source}。詳細な根拠と確度は共同制作ページと由来台帳で確認できます。</p></details>}<footer><span><i/>標本対応・試作</span><span><i/>模式</span></footer></div>}<h3>この標本で追う構造</h3><ol>{specimenLesson.observe.map((item,i)=><li key={item}><i>{String(i+1).padStart(2,"0")}</i><span>{item}</span></li>)}</ol><div className="accuracyNote warning"><b>標本由来と模式補助</b><p>{specimenLesson.caution}</p></div></aside>
        {blockContextVisible&&<section id="block-context-panel" className="blockContextPanel" aria-labelledby="block-context-title"><header className="blockContextHead"><div><span className="guideIndex">CONTEXT PILOT</span><h2 id="block-context-title">全脳内位置と代表断面</h2><p>標本をどこから見ているかを確認するための位置目安です。</p></div><button type="button" className="blockContextClose" onClick={closeBlockContext} aria-label="全脳位置表示を閉じる">×</button></header><div className="blockContextSwitch" role="group" aria-label="位置コンテキスト表示"><button type="button" className={blockContextView==="whole"?"active":""} aria-pressed={blockContextView==="whole"} onClick={()=>transitionBlockContextState({type:"set-view",view:"whole"})}>全脳＋切断面</button><button type="button" className={blockContextView==="section"?"active":""} aria-pressed={blockContextView==="section"} onClick={()=>transitionBlockContextState({type:"set-view",view:"section"})}>代表断面</button></div>{blockContextView==="whole"?<div className={`blockContextStage ${blockContextWebglUnavailable?"webglUnavailable":""}`} tabIndex={blockContextWebglUnavailable?undefined:0} aria-label={blockContextWebglUnavailable?undefined:`透過した全脳と${specimenLesson.name}の位置目安。ドラッグまたは矢印キーで回転、Rキーで向きを戻す`} onKeyDown={blockContextWebglUnavailable?undefined:handleBlockContextKey} onPointerDown={blockContextWebglUnavailable?undefined:beginBlockContextRotation} onPointerMove={blockContextWebglUnavailable?undefined:moveBlockContext} onPointerUp={blockContextWebglUnavailable?undefined:()=>setBlockContextDrag(null)} onPointerCancel={blockContextWebglUnavailable?undefined:()=>setBlockContextDrag(null)} onContextMenu={blockContextWebglUnavailable?undefined:event=>event.preventDefault()}><AtlasVolumeCanvas kind="surface" plane={specimenLesson.plane} position={specimenLesson.position} focus={specimenLesson.focus} display="specimen" rotation={blockContextRotation} view="ghost" contrast="bigbrain" showFocus={false} showCutPlane={true} showZoomControls={false} specimenBlock="none" blockContext={blockSpecimen as BlockContextSpecimen} onWebGLUnavailableChange={setBlockContextWebglUnavailable}/>{!blockContextWebglUnavailable&&<><OrientationCompass rotation={blockContextRotation} compact/><div className="blockContextCanvasLegend"><b>位置目安</b><span>褐色：収録済み標本メッシュ</span><small>{planeData[specimenLesson.plane].ja} {specimenLesson.position} の切断面</small></div><button type="button" className="blockContextReset" onClick={resetBlockContextRotation}>向きを戻す</button></>}</div>:<div className="blockContextStage blockContextSectionStage"><AtlasVolumeCanvas kind="slice" plane={specimenLesson.plane} position={specimenLesson.position} focus={specimenLesson.focus} display="specimen" rotation={blockContextRotation} contrast="bigbrain" showCutPlane={false}/><div className="blockContextCanvasLegend"><b>教材内代表断面</b><span>{planeData[specimenLesson.plane].ja} {specimenLesson.position}・BigBrain公開組織画像 0.5 mm</span></div></div>}<div className="blockContextNotice"><b>位置目安・教材内代表断面</b><p>この表示は、収録済み標本メッシュの位置目安と、教材内で対応づけた{planeData[specimenLesson.plane].ja}{specimenLesson.position}を示します。全切断面、切断幅、摘出順、実習手順を再現するものではありません。実標本の代替ではなく、標本作製や解剖学的境界を推測するための表示でもありません。</p></div></section>}
      </div>
    </section>}

    {workspace==="quiz"&&<section className="workArea quizArea" id="workspace" tabIndex={-1}>
      <div className="workHead"><div><span className="eyebrow">IDENTIFICATION QUIZ</span><h1>復習クイズ</h1></div><span className="sourceBadge">色で示した構造を同定</span></div>
      {quizFinished?<div className="quizEmptyState quizResultState" role="status" aria-live="polite"><span>QUIZ COMPLETE</span><h2>{quizScore} / {quizQueue.length} 問正解</h2><p>{quizScore===quizQueue.length?"全問正解です。別の項目へ進むか、同じ問題を順番を変えて再確認できます。":"間違えた問題は端末内に保存しました。下の構造から観察画面へ戻るか、左の「間違った問題のみ」から再出題できます。"}</p>{quizMisses.length>0&&<div className="quizReviewTargets" aria-label="今回間違えた構造">{quizMisses.map(target=>{const question=quizQueue.find(item=>item.target===target);if(!question)return null;const item=isNeurovascularQuiz(question)?neurovascularStructures[question.target]:isSurfaceQuiz(question)?surfaceRegions[question.target]:structures[question.target];return <button key={target} onClick={()=>reviewQuizQuestion(question)}><b>{item.name}</b><small>{isNeurovascularQuiz(question)||isSurfaceQuiz(question)?surfaceViews[question.view].name:`${planeData[question.plane].ja}・位置 ${question.position}`}</small><span>観察画面で位置を確認 →</span></button>})}</div>}<div><button onClick={retryQuiz}>同じ問題を再挑戦</button><button onClick={startQuiz}>この条件で新しく出題</button></div></div>:quizEmpty?<div className="quizEmptyState" role="status"><span>REVIEW CACHE</span><h2>{quizWrongOnly&&wrongTargets.length===0?"間違い履歴がありません":"今回の出題はありません"}</h2><p>{quizWrongOnly&&wrongTargets.length===0?"間違い履歴がまだありません。左の「次回出題条件」で「間違った問題のみ」を解除するか、通常の条件で出題してください。":"現在の問題キューは空です。左の「次回出題条件」と候補数を確認し、「この条件で出題」を押してください。フィルタ変更は現在の問題ではなく次回の出題に反映されます。"}</p><button onClick={restoreAllQuiz}>標準問題へ戻る</button></div>:<div className="quizWorkspace">
        <section className="quizImageCard"><div className="panelHead"><div><b>問題 {quizIndex+1}</b><small>{quizModelQuestion?surfaceViews[quizSurfaceView].name:`${planeData[quizQuestion.plane].ja}・位置 ${quizSlicePosition}・BigBrain公開組織画像 0.5 mm`}</small></div><span>{quizModelQuestion&&!webglUnavailable?"ドラッグで回転・ホイールで拡大":quizModelQuestion?"3D表示を利用できません":"ホイールで拡大"}</span></div><div className={`quizImageStage ${quizModelQuestion?"modelStage":""} ${quizModelQuestion&&webglUnavailable?"webglUnavailable":""}`} tabIndex={quizModelQuestion&&!webglUnavailable?0:undefined} aria-label={quizModelQuestion&&!webglUnavailable?(neurovascularQuiz?"復習問題の模式3D神経血管モデル。ドラッグまたは矢印キーで回転、Rキーで向きを戻す":"復習問題の脳表3Dモデル。ドラッグまたは矢印キーで回転、Rキーで向きを戻す"):undefined} onKeyDown={quizModelQuestion&&!webglUnavailable?handleModelKey:undefined} onPointerDown={quizModelQuestion&&!webglUnavailable?beginRotation:undefined} onPointerMove={quizModelQuestion&&!webglUnavailable?move:undefined} onPointerUp={quizModelQuestion&&!webglUnavailable?()=>setDrag(null):undefined} onPointerCancel={quizModelQuestion&&!webglUnavailable?()=>setDrag(null):undefined} onContextMenu={quizModelQuestion&&!webglUnavailable?event=>event.preventDefault():undefined}>{quizModelQuestion?<><AtlasVolumeCanvas kind="surface" plane="sagittal" position={50} focus="thalamus" display="specimen" rotation={rotation} view={neurovascularQuiz?"ghost":"inside"} contrast="bigbrain" showFocus={false} showCutPlane={false} hemisphere={surfaceViews[quizQuestion.view].hemisphere} showCerebellum={neurovascularQuiz?false:quizQuestion.view!=="medial"} showPonsMedulla={quizQuestion.view!=="medial"} showMidbrain={quizQuestion.view!=="medial"} surfaceHighlights={neurovascularQuiz?[]:quizSurfaceHighlight} neurovascularOverlay={neurovascularQuiz?(quizQuestion.detail==="arteries"?"vessels":"nerves"):"none"} neurovascularHighlights={neurovascularQuiz?quizNeurovascularHighlight:[]} quizVisibilityExpectedHighlights={quizVisibilityExpectedHighlights} showBrainstemNerves={neurovascularQuiz||quizSurfaceView==="cranialNerves"} onWebGLUnavailableChange={setWebglUnavailable}/>{!webglUnavailable&&<OrientationCompass rotation={rotation}/>}</>:<AtlasVolumeCanvas kind="slice" plane={quizQuestion.plane} position={quizSlicePosition} focus={sectionQuizTarget.meshFocus??"thalamus"} display="specimen" rotation={rotation} contrast="bigbrain" highlights={quizHighlight}/>}<div className="quizTargetTag"><i style={{background:quizTarget.color}}/><span><b>{neurovascularQuiz?"白色で強調された構造は？":"この色の構造は？"}</b>{sectionDeveloperControls&&quizSource&&<small>{quizSource}</small>}</span></div></div>{!quizModelQuestion&&<div className="quizSliceNavigator"><div className="quizSliceAxis"><span>{planeData[quizQuestion.plane].from}</span><b>{planeData[quizQuestion.plane].axis}</b><span>{planeData[quizQuestion.plane].to}</span></div><div className="quizSliceControl"><button aria-label="1断面戻る" onClick={()=>setQuizSlicePosition(value=>Math.max(0,value-1))} disabled={quizSlicePosition===0}>−</button><input aria-label={`復習問題の${planeData[quizQuestion.plane].axis}`} type="range" min="0" max="100" value={quizSlicePosition} onChange={event=>setQuizSlicePosition(Number(event.target.value))}/><button aria-label="1断面進む" onClick={()=>setQuizSlicePosition(value=>Math.min(100,value+1))} disabled={quizSlicePosition===100}>＋</button></div><output>{quizSlicePosition}</output><button onClick={()=>setQuizSlicePosition(quizQuestion.position)} disabled={quizSlicePosition===quizQuestion.position}>出題位置へ戻す</button></div>}</section>
        <aside className="quizQuestionCard" data-quiz-target={quizQuestion.target} data-quiz-format={neurovascularQuiz?"neurovascular":surfaceQuiz?"surface":"section"} data-quiz-plane={quizModelQuestion?undefined:quizQuestion.plane} data-quiz-position={quizModelQuestion?undefined:quizQuestion.position} data-quiz-view={quizModelQuestion?quizQuestion.view:undefined} data-quiz-detail={quizQuestion.detail} data-quiz-queue-length={quizQueue.length} data-quiz-queue-index={quizIndex} data-quiz-inventory-audit={quizVisibilityAuditHighlight!==null?"quizVisibilityAudit":"off"} data-quiz-inventory-sha256={quizVisibilityAuditHighlight!==null?QUIZ_VISIBILITY_INVENTORY_SHA256:undefined}><span className="guideIndex">QUESTION {String(quizIndex+1).padStart(2,"0")} / {quizQueue.length}</span>{neurovascularQuiz?<span className="provisionalQuizFlag">模式3D・専門家未確認</span>:isProvisionalQuiz(quizQuestion)&&<span className="provisionalQuizFlag">試作・専門家未確認</span>}<h2>{quizQuestion.prompt}</h2><div className="quizOptions">{quizQuestion.options.map((key,i)=>{const correct=key===quizQuestion.target,chosen=quizChoice===key,option=neurovascularQuiz?neurovascularStructures[key as NeurovascularStructureKey]:surfaceQuiz?surfaceRegions[key as SurfaceRegionKey]:structures[key as StructureKey];return <button key={key} data-quiz-option={key} className={quizChoice?(correct?"correct":chosen?"wrong":"muted"):""} onClick={()=>answerQuiz(key)} disabled={!!quizChoice}><i>{String.fromCharCode(65+i)}</i><span>{option.name}<small>{option.latin}</small></span>{quizChoice&&correct&&<b>正解</b>}{quizChoice&&chosen&&!correct&&<b>選択</b>}</button>})}</div>{quizChoice&&<div className={`quizFeedback ${quizChoice===quizQuestion.target?"correct":"wrong"}`} role="status" aria-live="polite"><b>{quizChoice===quizQuestion.target?"正解です":"もう一度位置関係を確認"}</b><p>{neurovascularQuiz?"このpilotは既存の模式3D名称だけを確認します。専門家未確認のため、起始・走行・接続は判定しません。":surfaceQuiz?surfaceQuizTarget.note:`${sectionQuizTarget.relation}。${sectionQuizTarget.note}`}</p>{!surfaceQuiz&&!neurovascularQuiz&&sectionQuizTarget.labelSource&&<small className={`provenanceBadge ${learnerLabelSourceDisplay[sectionQuizTarget.labelSource].className}`}>{learnerLabelSourceDisplay[sectionQuizTarget.labelSource].label}</small>}<div>{quizChoice!==quizQuestion.target&&<button className="reviewTarget" onClick={()=>reviewQuizQuestion(quizQuestion)}>観察画面で位置を確認</button>}<button className="quizNextPrimary" onClick={nextQuiz}>{quizIndex===quizQueue.length-1?"結果を見る":"次の問題へ"} →</button></div></div>}<div className="quizScoreLine"><span>現在の正答</span><b>{quizScore}</b><small>/ {quizChoice?quizIndex+1:quizIndex}</small></div></aside>
      </div>}
    </section>}

    {workspace==="collaborate"&&<section className="workArea collaborationArea" id="workspace" tabIndex={-1}>
      <div className="workHead"><div><span className="eyebrow">OPEN COLLABORATION</span><h1>共同制作</h1></div><span className="sourceBadge">解剖監修・教育設計・制作・実装</span></div>
      <div className="collaborationIntro"><h2>関わり方に合う入口を選んでください</h2><p>単発の匿名報告と、継続的な共同制作は分けて受け付けます。患者・学生・献体者を特定できる情報、許諾のない標本写真・講義資料・教科書図版は送らないでください。</p><div><span>解剖監修</span><span>教育設計</span><span>セグメンテーション</span><span>3D制作</span><span>Web開発</span></div></div>
      <aside className="modelStrategyShortcut" aria-labelledby="model-strategy-shortcut-title"><div><span>M2 · CONTRIBUTOR PILOT</span><h2 id="model-strategy-shortcut-title">3Dモデル方針のA/B比較試作</h2><p>現行再構成と専門家未確認の模式案を、同じ向き・色・表示条件ですぐ比較できます。通常教材やラベルは変更しません。</p></div><button type="button" aria-expanded={modelStrategyComparisonOpen} aria-controls="model-strategy-comparison" onClick={event=>modelStrategyComparisonOpen?closeModelStrategyComparison():openModelStrategyComparison(event.currentTarget)}>{modelStrategyComparisonOpen?"比較を閉じる":"A/B比較を開く →"}</button></aside>
      <div className="collaborationGrid">
        <article><span>非公開・匿名</span><h2>意見・誤り報告</h2><p>表示位置、名称、操作性、クイズなどの気づきをGoogle Formへ送れます。継続参加や連絡先の記入は任意です。</p>{feedbackFormUrl?<a href={feedbackFormUrl} target="_blank" rel="noreferrer">Google Formを開く →</a>:<button disabled>フォームURL設定待ち</button>}</article>
        <article><span>公開相談</span><h2>改善案を相談する</h2><p>再現手順や根拠URLを公開し、検討経過を追跡したい不具合・提案はGitHub Issuesへ送ります。</p><a href={issueTrackerUrl} target="_blank" rel="noreferrer">GitHub Issuesを開く →</a></article>
        <article><span>具体的な変更</span><h2>Pull Requestを提案する</h2><p>コード、教材文、3Dデータの変更条件、DCO、出典・ライセンスの確認方法を共同制作ガイドにまとめています。</p><div><a href={contributingGuideUrl} target="_blank" rel="noreferrer">CONTRIBUTINGを読む</a><a href={pullRequestUrl} target="_blank" rel="noreferrer">Pull Request一覧 →</a></div></article>
        <article className="segmentationEntry"><span>端末内の差分</span><h2>セグメンテーションを修正する</h2><p>編集内容はこの端末内の差分で、公式データを直接変更しません。採用には、画像上の根拠、差分JSON、レビュー、プロジェクト管理者の判断が必要です。</p><button onClick={()=>openWorkspace("segment")}>編集ツールを開く →</button></article>
        <article className="modelStrategyEntry"><span>寄稿者限定・比較試作</span><h2>3Dモデル方針を比較する</h2><p>現行再構成と、実標本由来ではない専門家未確認の模式案を、同じ操作条件でA/B比較します。学習用モデルやラベルは変更しません。</p><button type="button" aria-expanded={modelStrategyComparisonOpen} aria-controls="model-strategy-comparison" onClick={event=>modelStrategyComparisonOpen?closeModelStrategyComparison():openModelStrategyComparison(event.currentTarget)}>{modelStrategyComparisonOpen?"比較を閉じる":"比較試作を開く →"}</button></article>
        <article><span>方針・採否</span><h2>運営方針を確認する</h2><p>公式版への採否、役割、クレジット、匿名参加、継続参加、運営承継の考え方を確認できます。</p><a href={governanceGuideUrl} target="_blank" rel="noreferrer">GOVERNANCEを読む →</a></article>
         <article><span>権利・再利用</span><h2>ライセンスを確認する</h2><p>コード、教材文書、BigBrain・MNI・CerebrA由来データでは適用条件が異なります。公開・再配布前に確認してください。</p><div><a href={licenseGuideUrl} target="_blank" rel="noreferrer">ライセンス境界</a><button onClick={()=>openOverlay("legal")}>画面上の利用条件 →</button></div></article>
      </div>
      {modelStrategyComparisonOpen&&<div id="model-strategy-comparison" ref={modelStrategyPanelRef}><Suspense fallback={<div className="modelStrategyLoading" role="status">比較試作を読み込み中…</div>}><ModelStrategyComparison onClose={closeModelStrategyComparison}/></Suspense></div>}
      <AnatomyReviewQueuePanel items={anatomyReviewItems} total={anatomyReviewQueue.length} surfaceFilter={anatomyReviewSurfaceFilter} representationFilter={anatomyReviewRepresentationFilter} onSurfaceChange={setAnatomyReviewSurfaceFilter} onRepresentationChange={setAnatomyReviewRepresentationFilter}/>
    </section>}

    {workspace==="segment"&&<section className="workArea segmentationArea" id="workspace" tabIndex={-1}>
      <div className="workHead"><div><span className="eyebrow">MANUAL SEGMENTATION · ALPHA</span><h1>セグメンテーション編集</h1></div><span className="sourceBadge">BigBrain公開組織画像 0.5 mm・水平断編集／直交断照合</span></div>
      {phoneMode?<div className="phoneSegmentGuard"><span className="eyebrow">PHONE VIEW</span><h2>編集ツールはPCで利用</h2><p>セグメンテーション編集は、画像とCanvasを安全に扱えるPC向け機能です。スマートフォンでは編集Canvasを読み込まず、教材の閲覧と共同制作の案内だけを表示します。</p><div><button onClick={()=>openWorkspace("collaborate")}>共同制作の入口へ</button><button onClick={()=>openWorkspace("surface")}>学習画面へ戻る</button></div></div>:<><div className="segmentationReviewNotice"><b>端末内の差分編集です</b><p>ここでの編集は公式データを直接変更しません。差分JSONへ根拠を記録し、Pull Requestと解剖学的レビューを経て、採用された変更だけが公開版へ統合されます。</p><button onClick={()=>openWorkspace("collaborate")}>共同制作の入口へ戻る</button></div><ManualSegmentationWorkbench/></>}
    </section>}

    {workspace==="sections"&&detailsOpen&&<button className="inspectorBackdrop" aria-label="解説を閉じる" onClick={()=>setDetailsOpen(false)}/>}
    {workspace==="sections"&&detailsOpen&&<aside className="inspector open">
      <div className="inspectorTop"><div className="inspectIndex"><span>STRUCTURE GUIDE</span><b>{String(structureKeys.indexOf(selectedStructure)+1).padStart(2,"0")} / {structureKeys.length}</b></div><button className="inspectorClose" onClick={()=>setDetailsOpen(false)} aria-label="解説を閉じる">×</button></div>
      <div className="structureColor" style={{background:current.color}}/>
      <h2>{current.name}</h2><em>{current.latin}</em>
      {current.labelSource&&<div className={`structureProvenance ${labelSourceDisplay[current.labelSource].className}`}><b>{labelSourceDisplay[current.labelSource].label}</b><span>{labelSourceDisplay[current.labelSource].detail}</span></div>}
      <div className="rule"/><h3>主な役割</h3><p>{structureFunctions[selectedStructure]}</p>
      <h3>この断面で見ること</h3><p>{current.note}</p>
      <dl><div><dt>位置関係</dt><dd>{current.relation}</dd></div><div><dt>現在の断面</dt><dd>{planeData[plane].ja}・位置 {position}</dd></div></dl>
      <div className="identifyCard"><span>クリック同定</span>{contrast==="single"?<><b>画像参照モード</b><small>座標未確認のラベルは重ねません。照合済みの「BigBrain組織 0.5」を選択してください。</small></>:identified?<><b>{labels?`${identified.side}${identified.name}`:"解答非表示"}</b><small>{sectionDeveloperControls?(identified.certainty==="atlas"?"位置照合した試作ラベル":identified.certainty==="manual"?"画像と同一格子のBigBrain手動ラベル":identified.certainty==="reviewed"?"連続切片で確認した画像誘導ラベル":"位置照合または画像誘導による試作ラベル"):current.note}</small></>:<><b>断面上をクリック</b><small>指した場所の構造名を表示します。ホイールで拡大縮小できます。</small></>}</div>
      <div className="continuity"><span>連続性</span><div><i style={{width:`${Math.max(18, 100-Math.abs(position-52)*1.35)}%`,background:current.color}}/></div><small>この断面での見えやすさ</small></div>
      <button className="quiz" onClick={() => setLabels(!labels)} disabled={contrast==="single"}>{contrast==="single"?"固定脳MRIは画像参照のみ":labels ? "ラベルを隠して確認" : "答えを表示"}<b>→</b></button>
      {sectionDeveloperControls&&<p className="atlasCredit">解剖基盤：BigBrain（Amunts et al., 2013）、BigBrain manual subcortical segmentation（Xiao et al.）、CerebrA。BigBrainは単一個体の20 µm組織再構成で、本アプリでは表示用0.5 mmへ再標本化しています。1–22は同一格子の手動ラベル、脳室・脳幹・小脳・島皮質は位置照合済みアトラス由来、脳梁・内包は画像誘導の試作です。旧ID 33は視交叉と視索を未分割のため学習表示から除外しています。試作輪郭は手動正解データではありません。診断用途ではありません。</p>}
    </aside>}

    {statusOpen&&<div className="legalBackdrop betaStatusBackdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)closeOverlay()}}><section className="legalDialog betaStatusDialog" role="dialog" aria-modal="true" aria-labelledby="status-title"><header><div><span>BETA CANDIDATE STATUS</span><h2 id="status-title">更新履歴・既知の制限</h2></div><button onClick={closeOverlay} aria-label="更新履歴と既知の制限を閉じる">×</button></header><div className="betaStatusIntro"><div><b>{betaStatusData.phase}</b><span>更新 {betaStatusData.updated}</span></div><p>この画面は、β候補の掲載範囲、更新履歴、既知の制限を同じJSONデータから表示します。公開判断前のローカル候補であり、専門家による最終確認や公開URLでの確認を意味しません。</p></div><div className="betaStatusColumns"><section className="betaStatusColumn"><h3>既知の制限</h3><div className="betaStatusTimeline">{betaStatusData.knownLimitations.map(item=><article className="betaStatusCard" data-status-id={item.id} key={item.id}><span className="betaStatusKind">LIMITATION</span><h4>{item.heading}</h4><p>{item.body}</p><details className="betaStatusEvidence"><summary>根拠参照</summary><ul>{item.evidenceRefs.map(ref=><li key={ref}><code>{ref}</code></li>)}</ul></details></article>)}</div></section><section className="betaStatusColumn"><h3>更新履歴</h3><div className="betaStatusTimeline">{betaStatusData.changes.map(item=><article className="betaStatusCard" data-status-id={item.id} key={item.id}><span className="betaStatusKind">CHANGE</span><h4>{item.heading}</h4><p>{item.body}</p><details className="betaStatusEvidence"><summary>根拠参照</summary><ul>{item.evidenceRefs.map(ref=><li key={ref}><code>{ref}</code></li>)}</ul></details></article>)}</div></section></div><footer><span>根拠参照は掲載時点のローカル資料です。</span><button onClick={closeOverlay}>観察へ戻る</button></footer></section></div>}
   {helpOpen&&<div className="legalBackdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)closeOverlay()}}><section className="legalDialog helpDialog" role="dialog" aria-modal="true" aria-labelledby="help-title"><header><div><span>VIEWER CONTROLS</span><h2 id="help-title">操作ガイド</h2></div><button onClick={closeOverlay} aria-label="操作ガイドを閉じる">×</button></header><p className="helpIntro">マウス、トラックパッド、タッチ、キーボードで同じ教材を観察できます。操作に迷ったときは、この画面を閉じずに一覧を確認できます。</p><div className="helpGrid"><article><h3>3Dモデル</h3><dl><div><dt>回転</dt><dd>ドラッグ。キーボードでは<kbd>←</kbd><kbd>↑</kbd><kbd>↓</kbd><kbd>→</kbd></dd></div><div><dt>軸回転</dt><dd><kbd>Shift</kbd>＋ドラッグ、または右ドラッグ</dd></div><div><dt>拡大・縮小</dt><dd>ホイール／トラックパッド、画面上の<kbd>−</kbd><kbd>＋</kbd></dd></div><div><dt>向きを戻す</dt><dd><kbd>R</kbd>、ダブルクリック、または「向きを戻す」</dd></div></dl></article><article><h3>断面実習</h3><dl><div><dt>断面位置</dt><dd>スライダー、<kbd>←</kbd><kbd>→</kbd><kbd>Home</kbd><kbd>End</kbd></dd></div><div><dt>画像の拡大</dt><dd>ホイール。表示中の倍率を押すと100%へ戻る</dd></div><div><dt>画像の移動</dt><dd><kbd>Shift</kbd>＋ドラッグ、または中ドラッグ</dd></div><div><dt>構造の同定</dt><dd>断面をクリック。左欄では複数構造を同時選択できる</dd></div></dl></article><article><h3>脳表・局所標本</h3><dl><div><dt>着色</dt><dd>構造名を押して追加・解除。脳表では「全選択」「すべて解除」も利用可能</dd></div><div><dt>透過・単独表示</dt><dd>透過、選択だけ、組織表示、脱着の各ボタンを使う</dd></div><div><dt>自由観察</dt><dd>構造索引または検索から複数の対象を追加する</dd></div></dl></article><article><h3>クイズ・編集ツール</h3><dl><div><dt>復習</dt><dd>解答後の「観察画面で位置を確認」で、出題位置と対象を保って教材へ戻る</dd></div><div><dt>塗る</dt><dd>編集Canvasを左ドラッグ。右・中・<kbd>Alt</kbd>ドラッグで移動</dd></div><div><dt>元に戻す</dt><dd><kbd>Ctrl</kbd>／<kbd>⌘</kbd>＋<kbd>Z</kbd>。やり直しは<kbd>Shift</kbd>も同時に押す</dd></div></dl></article></div><footer><span><kbd>Tab</kbd>で項目移動・<kbd>Esc</kbd>で閉じる</span><button onClick={closeOverlay}>観察へ戻る</button></footer></section></div>}

    {feedbackOpen&&<div className="legalBackdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)closeOverlay()}}><section className="legalDialog feedbackDialog compactFeedbackDialog" role="dialog" aria-modal="true" aria-labelledby="feedback-title"><header><div><span>PRIVATE FEEDBACK</span><h2 id="feedback-title">匿名の意見・誤り報告</h2></div><button onClick={closeOverlay} aria-label="意見・誤り報告を閉じる">×</button></header><p className="feedbackIntro">構造名、表示位置、操作性、クイズなどの気づきを非公開で送れます。氏名・所属・連絡先は任意です。患者・学生・献体者を特定できる情報、標本写真、第三者の個人情報は送らないでください。</p><div className="feedbackOptions singleFeedbackOption"><article><h3>Google Formで報告</h3><p>単発の報告は匿名で送信できます。公開相談、具体的な変更提案、継続的な参加は、独立した共同制作ページで入口を選べます。</p>{feedbackFormUrl?<a href={feedbackFormUrl} target="_blank" rel="noreferrer">Google Formを開く →</a>:<button disabled>フォームURL設定待ち</button>}</article></div><footer className="feedbackDialogFooter"><span>継続的な参加や公開相談はこちら</span><button onClick={()=>{closeOverlay();openWorkspace("collaborate")}}>共同制作ページを開く →</button></footer></section></div>}

      {legalOpen&&<div className="legalBackdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)closeOverlay()}}><section className="legalDialog" role="dialog" aria-modal="true" aria-labelledby="legal-title"><header><div><span>LICENSE & DATA NOTICE</span><h2 id="legal-title">利用条件・データ・クレジット</h2></div><button onClick={closeOverlay} aria-label="利用条件とクレジット表示を閉じる">×</button></header><div className="legalStatus"><b>データを含む公開α版: 非営利教育用</b><p>BigBrain由来データのCC BY-NC-SA 4.0に従います。アプリコードはAGPL-3.0-or-later、自作教材文書はCC BY-NC-SA 4.0です。</p></div><div className="projectCredit"><span>PROJECT</span><b>脳実習ナビ</b><small>企画・医学教育・教材設計・実装方針。解剖学的表示は公開αとして継続検証中です。</small></div><p className="projectIndependence">本プロジェクトは独立した教育開発として運営する試作教材です。特定の教育機関・部局の公式教材、公式見解、内容の承認を示すものではありません。</p><div className="legalColumns"><article><h3>アプリコード</h3><p>Copyright © 2026 脳実習ナビ contributors。<a href="https://spdx.org/licenses/AGPL-3.0-or-later.html" target="_blank" rel="noreferrer">AGPL-3.0-or-later</a>で提供し、無保証です。変更したWeb版は利用者へ対応ソースを取得する機会を提供する必要があります。</p><h3>自作教材文書</h3><p>本プロジェクトが作成した解説・共同制作文書は <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noreferrer">CC BY-NC-SA 4.0</a>です。外部データの条件は変更しません。</p><h3>BigBrain</h3><p>BigBrain公開組織画像0.5 mmと同一提供脳の固定脳MRI 0.444 mmは <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noreferrer">CC BY-NC-SA 4.0</a>。提供者は死後組織の研究・教育目的の一般利用に書面同意し、Heinrich Heine University Düsseldorf医学部倫理委員会の承認（#4863）を受けています（<a href="https://bigbrainproject.org/about.html" target="_blank" rel="noreferrer">BigBrain公式の倫理情報</a>）。本アプリでは表示用に再標本化・8-bit化・圧縮・マスク・色調調整を行っています。局所3D標本の褐色組織は0.5 mm組織像から1 mm形状を再構成したBigBrain派生物です。脳室腔・核・一部白質を別部品化しています。</p><h3>手動皮質下核</h3><p>XiaoらのBigBrain co-registration datasetは <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>。基になるBigBrainのCC BY-NC-SA条件は変わりません。</p><h3>アクセス解析</h3><p>公開HTTPSホストの本番版だけで、利用状況と表示性能の把握に<a href="https://developers.cloudflare.com/web-analytics/about/" target="_blank" rel="noreferrer">Cloudflare Web Analytics</a>を使用します。localhost、127.0.0.1、開発ビルドでは読み込みません。Cloudflareの説明ではCookieやlocalStorageを使わず、訪問者の個人データを収集・利用しません。本アプリ側でも利用者を識別する独自IDは付与しません。</p></article><article><h3>MNI152 / CerebrA</h3><p>MNIライセンスに基づき使用し、Louis Collins / MNI / McGillの著作権表示を保持します。</p><h3>断面ラベル</h3><p>IDs 23–29と33–35はCerebrA由来の教育用マスク、30–32は画像誘導の候補です。IDs 39–40の乳頭体はBigBrain水平連続切片から作成し、プロジェクト内確認を経て採用した教材用ラベルです。研究用の正解マスクではありません。</p><h3>プロジェクト独自の模式3D</h3><p>主要な溝・裂の線状ガイド、放線群、脈絡叢、脳弓、乳頭体、中脳水道、小脳脚、嗅球・嗅索と、視床下部・透明中隔・大脳脚・丘・膝状体・前有孔質・菱形窩・錐体・オリーブの位置目安、視覚路・漏斗、主要脳底動脈、脳神経根は手作業で標準空間へ置いたCC BY-NC-SA 4.0教材データです。BigBrainから抽出した正解形状ではなく、学習画面に表示する形状は「模式補助」「位置目安」と明示します。海馬采・鉤はβ候補から除外し、現行3Dには収録していません。旧模式乳頭体2資産は配布されても学習画面の代用表示には使用しません。</p><h3>ブロック標本（試作中）</h3><p>局所標本と各部品は位置関係の学習を目的とした試作表示です。形状・範囲・接続関係の完全性や解剖学的正確性を保証せず、実標本や検証済み資料との照合を前提とします。</p><h3>α版で未収録・専門家未確認</h3><p>XIの脊髄根、閂・薄束／楔状束の詳細、静脈・静脈洞は未収録です。試作分節、脳表ラベル・脳溝ガイド、神経血管、小脳脚・菱形窩の模式表示は専門家未確認で、指摘により変更します。</p><h3>参考資料</h3><p>講義資料、教科書、3D Brain、標本閲覧サイトを学習項目とUIの検討に参照しています。外部図版は収録していません。</p><h3>免責</h3><p>教育用α版です。正確性や継続提供を保証せず、診断・治療・手術計画・定量研究には使用できません。</p></article></div><footer><span>更新 {betaStatusData.updated}・AGPL-3.0-or-later・無保証</span><div>{sourceRepositoryUrl?<a href={sourceRepositoryUrl} target="_blank" rel="noreferrer">対応ソース</a>:<span className="sourcePending">GitHub未作成・ソースURL設定待ち</span>}<a href="https://bigbrainproject.org/" target="_blank" rel="noreferrer">BigBrain</a><a href="https://nist.mni.mcgill.ca/multi-contrast-pd25-atlas/" target="_blank" rel="noreferrer">MNI PD25</a><a href="https://github.com/templateflow/tpl-MNI152NLin2009cSym" target="_blank" rel="noreferrer">TemplateFlow</a><button onClick={()=>openOverlay("status")}>更新履歴・既知の制限</button></div></footer></section></div>}
  </main>;
}
