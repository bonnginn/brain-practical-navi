// Development assets only; no interception, publication or overwrite of evidence.
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {launchChrome,closeChrome,configurePage,navigate,waitForUiReady,evaluate,READY_PROBE} from './measure_browser_performance.mjs';
const revision='681fb599fd6d2181d7b7398a775abf5f1335eb644ce95afc2149b39fab9f9c88';
const rawExpected='eaee5e5809932b06e8b497c4b195edf659438e2a6d0fdb823b55ea2dea2b3086';
const base='http://127.0.0.1:4345/',out='work/anatomy-review/inferior-residual-browser-v1';
const meshCases=[
  [
    "lateral-ventricle",
    "tissue",
    "8c296678ed657712a5d91317532881ffe0ceae85be1890b6d28db308a6e58c7d"
  ],
  [
    "lateral-ventricle",
    "ventricular-cavity",
    "17f285abf46e4134b7deb976accc1ba5b7809fe1ef3f024d72a230987ac2e637"
  ],
  [
    "radiations",
    "tissue",
    "7b931aa8a7817655d14cb23e499e997c970174e068ff997cd8255bef2fdd8896"
  ],
  [
    "choroid-plexus",
    "tissue",
    "1eeea021566cb9e2e01e807e753bd997575c77958f65aae84018a910ac7ae324"
  ],
  [
    "choroid-plexus",
    "ventricular-cavity",
    "145349be3a2d46b457d92a07c0ede71d0176a10cc4c6098b7fa6fc0742982c57"
  ],
  [
    "medial-temporal",
    "tissue",
    "23a19a1f8ba0d108c094af1b0bf99f6ac303512082a4336c911d2ec2a7b6212b"
  ],
  [
    "medial-temporal",
    "inferior-horn",
    "de710e0f3747490732135e109154624fd73ba238b034f327898891d6a7b8998c"
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
 for(const [plane,width,height,index] of [['horizontal',1366,900,110],['coronal',1366,900,246],['sagittal',1366,900,249],['horizontal',1366,900,106],['horizontal',390,844,110]]) {
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
