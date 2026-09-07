// Development assets only; no interception, publication or overwrite of evidence.
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {launchChrome,closeChrome,configurePage,navigate,waitForUiReady,evaluate,READY_PROBE} from './measure_browser_performance.mjs';
const outer40=process.argv.includes('--outer40');
const revision=outer40?'e98cd4060d735c732a5fd75030be2f701f57fe91b6cd5b9a12c65e1cb68b37e3':'58d8044071bd0b638bfdbbcc309c35ac3301a9c8f449b8ebcc5b77e5435cfae7';
const rawExpected=outer40?'9a524981ddf521236b8fec835aef04891fa2b6ef58d22a2b5f03ca1a9f68d64d':'94a8a3edd960256d0fc22e2c5fff2085d88e3f3e8fcc1415ae112b37c2d794f1';
const base='http://127.0.0.1:4345/',out=outer40?'work/anatomy-review/inferior-outer40-browser-v1':'work/anatomy-review/inferior-partial19-browser-v1';
const meshCases=[
  [
    "lateral-ventricle",
    "tissue",
    "69a38584da465619fe63205f44b7b26f956579ffbb79fabe9b1b8f774b338a3e"
  ],
  [
    "lateral-ventricle",
    "ventricular-cavity",
    "c46eb98b3438ff0b6d71912e26612117ff7bc6d5bcfa25aad93c5f3bf7e88125"
  ],
  [
    "radiations",
    "tissue",
    "7b931aa8a7817655d14cb23e499e997c970174e068ff997cd8255bef2fdd8896"
  ],
  [
    "choroid-plexus",
    "tissue",
    "4898d008d0d7e9de9bae8d159f20ea4246284588bcf3603808a207729f6f9054"
  ],
  [
    "choroid-plexus",
    "ventricular-cavity",
    "ef315678bcd93b1f0384cdf820e8c5bb2784d7b111cfbbcbb18acbaba1da83f8"
  ],
  [
    "medial-temporal",
    "tissue",
    "7cacad08a5838817f3aecc8c40f7b25b4d8188005d6c619194efffe168d2f370"
  ],
  [
    "medial-temporal",
    "inferior-horn",
    "6cb81b2877b80d0d1b964eb7b8ac1f8eae234509f1c03f498c1ece30a44032b9"
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
 const sections=outer40?[['horizontal',1366,900,105],['coronal',1366,900,246],['sagittal',1366,900,270],['horizontal',1366,900,101],['horizontal',390,844,105]]:[['horizontal',1366,900,108],['coronal',1366,900,248],['sagittal',1366,900,256],['horizontal',1366,900,111],['horizontal',390,844,108]];
 for(const [plane,width,height,index] of sections) {
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
