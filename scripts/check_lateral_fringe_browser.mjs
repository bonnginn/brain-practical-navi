// Development assets only; no interception, publication or overwrite of evidence.
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {launchChrome,closeChrome,configurePage,navigate,waitForUiReady,evaluate,READY_PROBE} from './measure_browser_performance.mjs';
const next=process.argv.includes('--next-components');
const remaining=process.argv.includes('--remaining-large');
assert.ok(!(next&&remaining));
const revision=remaining?'b473638881ac75dc3ce27cf9963d612ffa41f768906e895f2281954c44be9567':next?'7c54fdd2e391ca3e1ed70f7e5fdead7be940d1007b891eb4bb4dd22d7407f0ef':'83dcbdda59e86f393cc93b9d91ccd8f68c1fa08bc1156df99467fe3aef792567';
const rawExpected=remaining?'3c295bb532aacc1654f44fd20d2c6524644ef42e83d0ac44f8078607bffaf922':next?'bed9a7d37c5f8709aa4c82845112ed7f5f429c689b1a111bad95b22e31d09e7e':'cfe86d863d828dbae8051f148114368f25b54b668f973715da02bd95f7d25672';
const base='http://127.0.0.1:4345/',out=remaining?'work/anatomy-review/lateral-remaining-browser-v2':next?'work/anatomy-review/lateral-next-browser-v1':'work/anatomy-review/lateral-fringe-browser-v1';
const meshCases=remaining?[
 ['lateral-ventricle','tissue','d67a9c94cb0eb01a949807d450d17f0555087a35221a1038edfe8bd92f5ff4b8'],
 ['lateral-ventricle','ventricular-cavity','d2079d96b24f1e6a4fb9d781d438e96fc8cd6e64088a7efd616bed623d33e06c'],
 ['commissural-system','lateral-ventricles','df54a2aa454070d9099183911dc9be4da21e8a77be188f1fd88ca88f38a71683'],
 ['choroid-plexus','tissue','3900332e9fce7a63e6baa1f94a8fc7fa20aae801f4fa6af669ed30f9e400c3d6'],
 ['choroid-plexus','ventricular-cavity','69f9147afcd8c9a7c1840ed4f185344547e4e73e535609b839e28a739389c72e'],
 ['medial-temporal','inferior-horn','3ef7e853ed6b0e30ed3c9b922062aaa287c222aa97b4ec7aee07313c9d83faed']
]:next?[
 ['lateral-ventricle','ventricular-cavity','e03b22f6d7bdd46befa0eef503b0f522b8f5e6bb4df50bee25e24419acf9564e'],
 ['commissural-system','lateral-ventricles','2add58f332cff472deeaef1506ca4dfbe5be24db7946c3487b400481eb89f276'],
 ['choroid-plexus','tissue','143f24d5f6db0beea3d58d070f971cba9eace01bc58dd853cf0b00c3742058b7'],
 ['choroid-plexus','ventricular-cavity','114f774dd112a526aa63f2119cd23e16d8a2bcc37a8860eefaef9614c0d25855']
]:[
 ['lateral-ventricle','ventricular-cavity','55214d8de21dd37a865e1aff422aa4ba4e396056ae85749cb2f2733d88c3e894'],
 ['commissural-system','lateral-ventricles','69b9190491a1df9835bb5195547744a851bb7684f8ae590219b1ccf28458d2dc'],
 ['choroid-plexus','ventricular-cavity','c0a4cf588ecc8a351d6702e07fa00dc267fea340d5aaeb88cb7bd7e075162424']
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
 for(const [plane,width,height,index] of (remaining?[['horizontal',1366,900,160],['coronal',1366,900,272],['sagittal',1366,900,191],['sagittal',1366,900,213],['horizontal',390,844,187]]:next?[['horizontal',1366,900,181],['coronal',1366,900,266],['sagittal',1366,900,193],['sagittal',1366,900,207],['horizontal',390,844,152]]:[['horizontal',1366,900,157],['coronal',1366,900,293],['sagittal',1366,900,193],['sagittal',1366,900,209],['horizontal',390,844,154]])) {
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
