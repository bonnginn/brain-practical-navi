// Actual development build only. No staged overrides, external writes or publication.
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {launchChrome,closeChrome,configurePage,navigate,evaluate,waitForUiReady} from './measure_browser_performance.mjs';
const root=resolve('dist'),out=resolve('work/anatomy-review/callosal-inferior-browser-v1');
const expectedAssets={
 '/atlas/bigbrain-practical-segmentation-icbm500.bin.gz':'098edfbf365016c6c53ccf7b7032258db72a4912378c457d348c01613a4a1694',
 '/atlas/block-commissural-system-corpus-callosum.mesh':'c9e4162ee7e4c43c5c8356c50db34b0e69488cf73c6c061dadddc9d84724bed3',
 '/atlas/block-commissural-system-tissue.mesh':'8aec8d9a37e9709aa32911d19848967d7a7f1281ddc1664da5ce583aa08b2478',
};
assert.match(await readFile(resolve(root,'index.html'),'utf8'),/src="\/assets\//,'Requires normal-base build');
const responses=[],serverErrors=[];
const server=createServer(async(req,res)=>{try{
 const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=resolve(root,'.'+(path==='/'?'/index.html':path));
 if(!file.startsWith(root+sep))throw Error('path');
 const data=await readFile(file);
 if(expectedAssets[path]){const sha256=createHash('sha256').update(data).digest('hex');assert.equal(sha256,expectedAssets[path]);responses.push({path,sha256});}
 res.writeHead(200,{'Content-Type':{'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'}[extname(file)]??'application/octet-stream','Cache-Control':'no-store'});res.end(data);
}catch(e){serverErrors.push({url:req.url,message:e.message});res.writeHead(404);res.end();}});
await mkdir(out,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const report={scope:'Local built-asset integration, not expert anatomical review or publication',responses,serverErrors,results:[]};let session;
try{
 session=await launchChrome();const cdp=session.cdp;report.browser=session.version;await configurePage(cdp);
 await cdp.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 const base=`http://127.0.0.1:${server.address().port}`;
 const frame=()=>evaluate(cdp,'new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
 const clickText=async(selector,label)=>evaluate(cdp,`(()=>{const b=[...document.querySelectorAll(${JSON.stringify(selector)})].find(x=>x.textContent.trim()===${JSON.stringify(label)});if(!b)throw Error('Missing control: '+${JSON.stringify(label)});b.click()})()`);
 const capture=async(file)=>{const shot=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await writeFile(resolve(out,file),Buffer.from(shot.data,'base64'));};
 for(const lang of ['ja','en']){
  await navigate(cdp,'about:blank');await navigate(cdp,`${base}/?lang=${lang}#workspace/sections/sagittal`);await waitForUiReady(cdp);
  for(const job of [{key:'removed',xyz:[212,314,196],position:54},{key:'retained',xyz:[212,271,191],position:54},{key:'removed-left15',xyz:[181,276,202],position:46},{key:'removed-right76',xyz:[212,197,205],position:54},{key:'removed-right83',xyz:[212,293,203],position:54},{key:'removed-inferior-body',xyz:[197,248,177],position:50},{key:'removed-inferior-column',xyz:[197,270,157],position:50},{key:'retained-main-body',xyz:[197,260,197],position:50}]){
   assert.equal(Math.round(393*job.position/100),job.xyz[0]);
   await evaluate(cdp,"document.querySelector('.inspectorClose')?.click()");await frame();
   await evaluate(cdp,'Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{})))');
   await evaluate(cdp,"document.querySelector('.rangeWrap input').focus()");
   for(const [key,code,count] of [['Home',36,1],['ArrowRight',39,job.position]])for(let n=0;n<count;n++)for(const type of ['keyDown','keyUp'])await cdp.send('Input.dispatchKeyEvent',{type,key,code:key,windowsVirtualKeyCode:code});
   await frame();assert.equal(await evaluate(cdp,"Number(document.querySelector('.rangeWrap input').value)"),job.position);
   const rect=await evaluate(cdp,"document.querySelector('.sliceViewport canvas').getBoundingClientRect().toJSON()"),sw=466,sh=378;
   const scale=Math.min((rect.width-10)/sw,(rect.height-10)/sh),x=rect.x+(rect.width-sw*scale)/2+(job.xyz[1]+.5)*scale,y=rect.y+(rect.height-sh*scale)/2+(377-job.xyz[2]+.5)*scale;
   for(const type of ['mousePressed','mouseReleased'])await cdp.send('Input.dispatchMouseEvent',{type,x,y,button:'left',clickCount:1});await frame();
   await evaluate(cdp,"if(!document.querySelector('.identifyCard'))document.querySelector('.detailToggle').click()");await frame();
   await evaluate(cdp,'Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{})))');
   const probe=await evaluate(cdp,"({name:document.querySelector('.identifyCard b')?.textContent,errors:[...document.querySelectorAll('.atlasLoading.error,.atlasWebglFallback')].map(x=>x.textContent)})");
   const expected=job.key.startsWith('removed')?(lang==='ja'?'ラベルの範囲外':'Out of Label Range'):(lang==='ja'?'脳梁候補（試作）':'Corpus callosum candidate (provisional)');
   assert.equal(probe.name,expected);assert.deepEqual(probe.errors,[]);
   const file=`${lang}-${job.key}.png`;await capture(file);report.results.push({lang,...job,probe,file});
  }
 }
 await navigate(cdp,`${base}/?lang=ja#workspace/blocks/commissural-system`);await evaluate(cdp,"document.querySelector('[data-block-intro-action=close]')?.click()");await waitForUiReady(cdp);
 await evaluate(cdp,"(()=>{for(const b of document.querySelectorAll('[data-block-layer-key]')){const want=b.dataset.blockLayerKey==='corpus-callosum';if((b.getAttribute('aria-pressed')==='true')!==want)b.click()}})()");
 for(const mode of ['通常','透過'])for(const view of ['初期','反対側','上面','下面']){
  await clickText('.specimenTissueControls button',mode);await clickText('.specimenViewControls button',view);await waitForUiReady(cdp);await frame();
  const probe=await evaluate(cdp,"({active:[...document.querySelectorAll('[data-block-layer-key][aria-pressed=true]')].map(x=>x.dataset.blockLayerKey),canvas:document.querySelectorAll('.learningModelStage canvas').length,errors:[...document.querySelectorAll('.atlasLoading.error,.atlasWebglFallback')].map(x=>x.textContent)})");
  assert.deepEqual(probe.active,['corpus-callosum']);assert.equal(probe.canvas,1);assert.deepEqual(probe.errors,[]);
  const file=`mesh-${mode==='通常'?'solid':'ghost'}-${({'初期':'initial','反対側':'opposite','上面':'top','下面':'bottom'})[view]}.png`;await capture(file);report.results.push({mode,view,probe,file});
 }
 for(const path of Object.keys(expectedAssets))assert.ok(responses.some(r=>r.path===path));
 assert.equal(report.results.length,24);assert.deepEqual(serverErrors,[]);
 await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2));console.log('24 actual callosal inferior label/mesh checks passed');
}finally{if(session)await closeChrome(session);await new Promise(r=>server.close(r));}
