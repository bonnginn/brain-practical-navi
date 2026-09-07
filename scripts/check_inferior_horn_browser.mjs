// Development assets only; no interception, publication or overwrite of evidence.
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {launchChrome,closeChrome,configurePage,navigate,waitForUiReady,evaluate,READY_PROBE} from './measure_browser_performance.mjs';
const revision='5f1847a300e0a988ec19037c947e18b525f5d4dc01da8de87222035abbf88eba';
const rawExpected='6335e0b37e926a9523a1c4d451104157e044a968bddfcaadd069f0c1b7f471dd';
const base='http://127.0.0.1:4345/',out='work/anatomy-review/inferior-horn-browser-v1';
const meshCases=[
  [
    "lateral-ventricle",
    "tissue",
    "da76b2cb472f40b45d31957c526ea7c159be188f93dfbd03d289c34e6278918e"
  ],
  [
    "lateral-ventricle",
    "ventricular-cavity",
    "5c0e6e2eb2f423954d813325a95829a87494424d7c77e9829bfbe7f865bd9820"
  ],
  [
    "radiations",
    "tissue",
    "7b931aa8a7817655d14cb23e499e997c970174e068ff997cd8255bef2fdd8896"
  ],
  [
    "choroid-plexus",
    "tissue",
    "b20bfebab5861e2481869c7cd15d48497c668fd062b2c5cd85823089f05885c3"
  ],
  [
    "choroid-plexus",
    "ventricular-cavity",
    "adfb4f21e5a246cccadf3ae8ae30adac4ddb6161d7bc2d7c8bd4dfd2bb86cc56"
  ],
  [
    "medial-temporal",
    "tissue",
    "cc33df1889bdb1f692fe27981ac89fa45d8b59c1670ee2d6e1fb431214953010"
  ],
  [
    "medial-temporal",
    "inferior-horn",
    "d944f922b098649f93d28fe982e1b7c5eafdabaa670ac578d36d58d8204bda9a"
  ]
];
assert.ok((await fetch(base)).ok);
await mkdir(out);
const session=await launchChrome(),records=[];
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
try {
 const cdp=session.cdp;await configurePage(cdp);
 const capture=async(name)=>writeFile(`${out}/${name}.png`,Buffer.from((await cdp.send('Page.captureScreenshot',{format:'png'})).data,'base64'),{flag:'wx'});
 const health=async()=>{
  const result=await evaluate(cdp,`({health:${READY_PROBE},resources:performance.getEntriesByType('resource').map(e=>e.name)})`);
  const h=result.health;assert.ok(h.appRootPresent&&h.canvasCount&&!h.loadingCount&&!h.uiErrors.length&&!h.horizontalOverflow&&!h.webglFallback);
  return result;
 };
 for(const [plane,width,height,index] of [['horizontal',1366,900,139],['coronal',1366,900,190],['sagittal',1366,900,265],['horizontal',1366,900,130],['horizontal',390,844,139]]) {
  const position=plane==='horizontal'?(1-index/377)*100:plane==='coronal'?index/465*100:index/393*100;
  await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
  await navigate(cdp,`${base}#workspace/sections/${plane}/observe?v=1&revision=${revision}&position=${position}&visible=ventricle&selected=ventricle&layout=both&views=2&share=40`);
  await waitForUiReady(cdp);const observation=await health();
  assert.ok(await evaluate(cdp,"document.body.innerText.includes('側脳室')"));
  const url=observation.resources.find(x=>x.includes('segmentation-icbm500.bin')&&x.includes(revision.slice(0,16)));assert.ok(url);
  const response=await fetch(url);assert.ok(response.ok);const bytes=Buffer.from(await response.arrayBuffer());
  assert.equal(bytes.subarray(0,4).toString(),'BBS1');assert.equal(sha(bytes.subarray(10)),rawExpected);
  const screenshot=`${plane}-${width}-${index}`;await capture(screenshot);
  records.push({plane,width,height,index,position,url,rawSha:rawExpected,observation,screenshot});
 }
 for(const [specimen,part,expectedSha] of meshCases) {
  await cdp.send('Emulation.setDeviceMetricsOverride',{width:1366,height:900,deviceScaleFactor:1,mobile:false});
  await navigate(cdp,`${base}#workspace/blocks/${specimen}`);
  await evaluate(cdp,"document.querySelector('[data-block-intro-action=close]')?.click()");await waitForUiReady(cdp);
  await evaluate(cdp,`(()=>{for(const b of document.querySelectorAll('[data-block-layer-key]')){const wanted=b.dataset.blockLayerKey==='${part}';if((b.getAttribute('aria-pressed')==='true')!==wanted)b.click()}})()`);
  await waitForUiReady(cdp);const observation=await health();
  if(part==='tissue') await evaluate(cdp,"[...document.querySelectorAll('button')].find(b=>b.textContent==='通常')?.click()");
  await waitForUiReady(cdp);
  const active=await evaluate(cdp,"[...document.querySelectorAll('[data-block-layer-key][aria-pressed=true]')].map(x=>x.dataset.blockLayerKey)");assert.deepEqual(active,part==='tissue'?[]:[part]);
  const url=observation.resources.find(x=>x.includes(`block-${specimen}-${part}.mesh`));assert.ok(url);
  const response=await fetch(url);assert.ok(response.ok);const actualSha=sha(Buffer.from(await response.arrayBuffer()));assert.equal(actualSha,expectedSha);
  const screenshot=`block-${specimen}-${part}`;await capture(screenshot);
  records.push({specimen,part,active,url,meshSha:actualSha,observation,screenshot});
 }
 await writeFile(`${out}/report.json`,JSON.stringify({browser:session.version,base,revision,interception:false,mobileEmulation:false,records,visualReviewPending:true},null,2),{flag:'wx'});
 console.log(`5 section views and ${meshCases.length} block parts passed; ${records.length} screenshots await visual review.`);
} finally {await closeChrome(session);}
