// Actual local development assets; no response substitution or publication.
import {writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {launchChrome,closeChrome,configurePage,navigate,waitForUiReady,evaluate,READY_PROBE} from './measure_browser_performance.mjs';
const fourth=process.argv.includes('--fourth-paired');
const revision=fourth?'d4295e7cc00edd3639b631473445d5db1bb25f9fbe18c5c7f21ff8b8471d7152':'9bc51ab0b0f6932871a93a0d225491ed0649ef827012a7db41d3f3e049b166a8';
const rawExpected=fourth?'b17bcfbcad38430f33d3bb6973d6ea847295e37670a4f04710d78a2986546142':'f5d552ac7856dfb5bb555e289f16c5d1f0dfa918107af2b567491202dba54fbe';
const key=fourth?'fourthVentricle':'thirdVentricle',part=fourth?'fourth-ventricle':'third-ventricle',specimen=fourth?'hindbrain':'diencephalon';
const out=fourth?'work/anatomy-review/fourth-paired-browser-v1':'work/anatomy-review/third-core-browser-v1';
await mkdir(out); // Refuse overwriting earlier evidence.
const session=await launchChrome(),records=[];
try{
 const cdp=session.cdp;await configurePage(cdp);
 for(const [plane,width,height,position] of [['horizontal',1366,900,(1-(fourth?71:153)/377)*100],['coronal',1366,900,(fourth?182:240)/465*100],['sagittal',1366,900,(fourth?188:196)/393*100],['horizontal',390,844,(1-(fourth?71:153)/377)*100]]){
  await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
  await navigate(cdp,`http://127.0.0.1:4345/#workspace/sections/${plane}/observe?v=1&revision=${revision}&position=${position}&visible=${key}&selected=${key}&layout=both&views=2&share=40`);
  await waitForUiReady(cdp);
  const observation=await evaluate(cdp,`({health:${READY_PROBE},selectedText:document.body.innerText.includes('${fourth?'第四脳室':'第三脳室'}'),resources:performance.getEntriesByType('resource').map(e=>e.name).filter(x=>x.includes('segmentation-icbm500.bin'))})`);
  const h=observation.health;
  assert.ok(h.appRootPresent&&h.canvasCount&&!h.loadingCount&&!h.uiErrors.length&&!h.horizontalOverflow&&!h.webglFallback&&observation.selectedText);
  const url=observation.resources.find(x=>x.includes(revision.slice(0,16)));assert.ok(url,'New revision requested');
  const response=await fetch(url);assert.ok(response.ok);const bytes=Buffer.from(await response.arrayBuffer());
  const rawSha=createHash('sha256').update(bytes.subarray(10)).digest('hex');
  assert.equal(bytes.subarray(0,4).toString(),'BBS1');assert.equal(rawSha,rawExpected);
  const screenshot=`${plane}-${width}.png`;
  await writeFile(`${out}/${screenshot}`,Buffer.from((await cdp.send('Page.captureScreenshot',{format:'png'})).data,'base64'),{flag:'wx'});
  records.push({plane,width,height,position,observation,url,rawSha,screenshot});
 }
 await cdp.send('Emulation.setDeviceMetricsOverride',{width:1366,height:900,deviceScaleFactor:1,mobile:false});
 await navigate(cdp,`http://127.0.0.1:4345/#workspace/blocks/${specimen}`);
 await evaluate(cdp,"document.querySelector('[data-block-intro-action=close]')?.click()");
 await waitForUiReady(cdp);
 await evaluate(cdp,`(()=>{for(const b of document.querySelectorAll('[data-block-layer-key]')){const want=b.dataset.blockLayerKey==='${part}';if((b.getAttribute('aria-pressed')==='true')!==want)b.click()}})()`);
 await waitForUiReady(cdp);
 const block=await evaluate(cdp,`({health:${READY_PROBE},active:[...document.querySelectorAll('[data-block-layer-key][aria-pressed=true]')].map(x=>x.dataset.blockLayerKey),resources:performance.getEntriesByType('resource').map(e=>e.name)})`);
 assert.deepEqual(block.active,[part]);assert.ok(block.health.canvasCount&&!block.health.loadingCount&&!block.health.uiErrors.length&&!block.health.webglFallback);
 const meshUrl=block.resources.find(x=>x.includes(`block-${specimen}-${part}.mesh`));assert.ok(meshUrl);
 const meshResponse=await fetch(meshUrl);assert.ok(meshResponse.ok);
 const meshSha=createHash('sha256').update(Buffer.from(await meshResponse.arrayBuffer())).digest('hex');
 assert.equal(meshSha,fourth?'e821185cbf03824d477627d35db14bfd3cdadb33a5437edf6285e13ce1910291':'47c1ec43e59f7303954a510d111d9cc19a62adc5338deb9d9716a6e079e87f1a');
 await writeFile(`${out}/block.png`,Buffer.from((await cdp.send('Page.captureScreenshot',{format:'png'})).data,'base64'),{flag:'wx'});
 await writeFile(`${out}/report.json`,JSON.stringify({browser:session.version,interception:false,records,block,meshSha,visualReviewPending:true},null,2),{flag:'wx'});
 console.log('4 section routes/widths and 1 block passed; screenshots await visual review.');
}finally{await closeChrome(session);}
