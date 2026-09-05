// Actual development build only. No staged overrides, external writes or publication.
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {launchChrome,closeChrome,configurePage,navigate,evaluate,waitForUiReady} from './measure_browser_performance.mjs';
const root=resolve('dist'),out=resolve('work/anatomy-review/callosal-repair-browser-v2');
const expectedAssets={
 '/atlas/bigbrain-practical-segmentation-icbm500.bin.gz':'5348b7650a3ba28c95a00407d62cf4054fb0c670a62de717f2c572f66a51c9a3',
 '/atlas/block-commissural-system-corpus-callosum.mesh':'ae2fd10bc23547c47dc12558acf6c8868da97de3dc369a2e665fa23cb2eb9504',
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
  await evaluate(cdp,"document.querySelector('.rangeWrap input').focus()");
  for(const [key,code,count] of [['Home',36,1],['ArrowRight',39,54]])for(let n=0;n<count;n++)for(const type of ['keyDown','keyUp'])await cdp.send('Input.dispatchKeyEvent',{type,key,code:key,windowsVirtualKeyCode:code});
  await frame();assert.equal(await evaluate(cdp,"Number(document.querySelector('.rangeWrap input').value)"),54);
  for(const job of [{key:'removed',xyz:[212,314,196]},{key:'retained',xyz:[212,271,191]}]){
   await evaluate(cdp,"document.querySelector('.inspectorClose')?.click()");await frame();
   await evaluate(cdp,'Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{})))');
   const rect=await evaluate(cdp,"document.querySelector('.sliceViewport canvas').getBoundingClientRect().toJSON()"),sw=466,sh=378;
   const scale=Math.min((rect.width-10)/sw,(rect.height-10)/sh),x=rect.x+(rect.width-sw*scale)/2+(job.xyz[1]+.5)*scale,y=rect.y+(rect.height-sh*scale)/2+(377-job.xyz[2]+.5)*scale;
   for(const type of ['mousePressed','mouseReleased'])await cdp.send('Input.dispatchMouseEvent',{type,x,y,button:'left',clickCount:1});await frame();
   await evaluate(cdp,"if(!document.querySelector('.identifyCard'))document.querySelector('.detailToggle').click()");await frame();
   await evaluate(cdp,'Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{})))');
   const probe=await evaluate(cdp,"({name:document.querySelector('.identifyCard b')?.textContent,errors:[...document.querySelectorAll('.atlasLoading.error,.atlasWebglFallback')].map(x=>x.textContent)})");
   const expected=job.key==='removed'?(lang==='ja'?'ラベルの範囲外':'Out of Label Range'):(lang==='ja'?'脳梁候補（試作）':'Corpus callosum candidate (provisional)');
   assert.equal(probe.name,expected);assert.deepEqual(probe.errors,[]);
   const file=`${lang}-${job.key}.png`;await capture(file);report.results.push({lang,...job,probe,file});
  }
 }
 await navigate(cdp,`${base}/?lang=ja#workspace/blocks/commissural-system`);await evaluate(cdp,"document.querySelector('[data-block-intro-action=close]')?.click()");await waitForUiReady(cdp);
 await evaluate(cdp,"(()=>{for(const b of document.querySelectorAll('[data-block-layer-key]')){const want=b.dataset.blockLayerKey==='corpus-callosum';if((b.getAttribute('aria-pressed')==='true')!==want)b.click()}})()");
 for(const mode of ['通常','透過'])for(const view of ['上面','下面']){
  await clickText('.specimenTissueControls button',mode);await clickText('.specimenViewControls button',view);await waitForUiReady(cdp);await frame();
  const probe=await evaluate(cdp,"({active:[...document.querySelectorAll('[data-block-layer-key][aria-pressed=true]')].map(x=>x.dataset.blockLayerKey),canvas:document.querySelectorAll('.learningModelStage canvas').length,errors:[...document.querySelectorAll('.atlasLoading.error,.atlasWebglFallback')].map(x=>x.textContent)})");
  assert.deepEqual(probe.active,['corpus-callosum']);assert.equal(probe.canvas,1);assert.deepEqual(probe.errors,[]);
  const file=`mesh-${mode==='通常'?'solid':'ghost'}-${view==='上面'?'top':'bottom'}.png`;await capture(file);report.results.push({mode,view,probe,file});
 }
 for(const path of Object.keys(expectedAssets))assert.ok(responses.some(r=>r.path===path));
 assert.equal(report.results.length,8);assert.deepEqual(serverErrors,[]);
 await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2));console.log('8 actual callosal label/mesh checks passed');
}finally{if(session)await closeChrome(session);await new Promise(r=>server.close(r));}
