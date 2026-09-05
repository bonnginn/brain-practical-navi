// Read-only staged A/B or --integrated built-asset identification check.
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {launchChrome,closeChrome,configurePage,navigate,evaluate,waitForUiReady} from './measure_browser_performance.mjs';
const integrated=process.argv.includes('--integrated');
const root=resolve('dist'),out=resolve(`work/anatomy-review/ventricle-classification-browser-${integrated?'integrated-callosal-v2':'v1'}`);
assert.match(await readFile(resolve(root,'index.html'),'utf8'),/src="\/assets\//,'Requires a normal-base build, not the Pages-base artifact left by some tests');
const variants=integrated?{}:{old:await readFile('tests/fixtures/bigbrain-practical-segmentation-pre-classification-b75a.bin.gz'),new:await readFile('tests/fixtures/bigbrain-practical-segmentation-pre-callosum-930e.bin.gz')};
const integratedSha='5348b7650a3ba28c95a00407d62cf4054fb0c670a62de717f2c572f66a51c9a3';
const digests={old:'b75a24903ec08526b3e7f08df9efc8cee15af80d86bb96a821260913a2b176f3',new:'930eaaed7eed8782b1b162f3aa5c59c2428f4062d0d2da3a9a1cb563f49b7db7'};
for(const key of Object.keys(variants))assert.equal(createHash('sha256').update(variants[key]).digest('hex'),digests[key]);
let variant='old';const responses=[];
const server=createServer(async(req,res)=>{try{
 const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(!integrated&&path==='/atlas/bigbrain-practical-segmentation-icbm500.bin.gz'){
  responses.push({variant,sha256:digests[variant]});res.writeHead(200,{'Content-Type':'application/octet-stream','Cache-Control':'no-store'});res.end(variants[variant]);return;
 }
 const file=resolve(root,'.'+(path==='/'?'/index.html':path));if(!file.startsWith(root+sep))throw Error('path');
 const data=await readFile(file),type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'}[extname(file)]??'application/octet-stream';
 if(integrated&&path==='/atlas/bigbrain-practical-segmentation-icbm500.bin.gz'){
  const sha256=createHash('sha256').update(data).digest('hex');assert.equal(sha256,integratedSha);responses.push({variant:'new',sha256,source:'actual dist file'});
 }
 res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});res.end(data);
}catch{res.writeHead(404);res.end();}});
await mkdir(out,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));
let session;const report={scope:integrated?'Actual normal-base development build; no asset override; no publication':'Staged asset override, not distributed revision integration or publication',results:[],responses};
try{
 session=await launchChrome();const cdp=session.cdp;report.browser=session.version;await configurePage(cdp);
 await cdp.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 const frame=()=>evaluate(cdp,'new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
 for(const scenario of (integrated?[{key:'new',lang:'ja'},{key:'new',lang:'en'}]:[{key:'old',lang:'ja'},{key:'new',lang:'ja'}]))for(const job of [{name:'aqueduct',plane:'horizontal',position:69,a:195,b:466-1-200},{name:'anterior',plane:'sagittal',position:44,a:239,b:378-1-73}]){
  const {key,lang}=scenario;
  await navigate(cdp,'about:blank');variant=key;
  await navigate(cdp,`http://127.0.0.1:${server.address().port}/?lang=${lang}#workspace/sections/${job.plane}`);await waitForUiReady(cdp);
  await evaluate(cdp,"document.querySelector('.rangeWrap input').focus()");
  await cdp.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Home',code:'Home',windowsVirtualKeyCode:36});
  await cdp.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Home',code:'Home',windowsVirtualKeyCode:36});
  for(let n=0;n<job.position;n++){
   await cdp.send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
   await cdp.send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
  }
  await frame();assert.equal(await evaluate(cdp,"Number(document.querySelector('.rangeWrap input').value)"),job.position);
  const rect=await evaluate(cdp,"document.querySelector('.sliceViewport canvas').getBoundingClientRect().toJSON()");
  const sw=job.plane==='horizontal'?394:466,sh=job.plane==='horizontal'?466:378;
  const scale=Math.min((rect.width-10)/sw,(rect.height-10)/sh);
  const x=rect.x+(rect.width-sw*scale)/2+(job.a+.5)*scale,y=rect.y+(rect.height-sh*scale)/2+(job.b+.5)*scale;
  await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1});
  await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',clickCount:1});
  await evaluate(cdp,"document.querySelector('.detailToggle').click()");await frame();
  await evaluate(cdp,'Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{})))');
  const probe=await evaluate(cdp,"({name:document.querySelector('.identifyCard b')?.textContent,note:document.querySelector('.identifyCard small')?.textContent,errors:[...document.querySelectorAll('.atlasLoading.error,.atlasWebglFallback')].map(x=>x.textContent)})");
  const expected=lang==='en'?(job.name==='aqueduct'?'Cerebral aqueduct candidate (partial)':'Out of Label Range'):key==='old'?'第四脳室（試作）':job.name==='aqueduct'?'中脳水道候補（部分）':'ラベルの範囲外';
  assert.equal(probe.name,expected);assert.equal(probe.errors.length,0);
  if(key==='new'&&job.name==='aqueduct')assert.match(probe.note,lang==='en'?/excluded from regular quiz targets/:/通常クイズの正答対象には含めません/);
  const file=`${key}-${lang}-${job.name}.png`,shot=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
  await writeFile(resolve(out,file),Buffer.from(shot.data,'base64'));
  report.results.push({variant:key,lang,job,expected,probe,file});
 }
 assert.equal(report.results.length,4);for(const key of (integrated?['new']:['old','new']))assert.ok(responses.some(r=>r.variant===key));
 await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2));console.log(`4 ${integrated?'integrated':'staged'} browser identification checks passed`);
}finally{if(session)await closeChrome(session);await new Promise(r=>server.close(r));}
