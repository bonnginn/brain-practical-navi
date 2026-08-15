import { access, readFile, readdir, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const manifest=JSON.parse(await readFile(resolve(root,"public","manifest.webmanifest"),"utf8"));
const catalog=JSON.parse(await readFile(resolve(root,"public","offline-packs.json"),"utf8"));
const index=await readFile(resolve(root,"index.html"),"utf8");
const registration=await readFile(resolve(root,"src","pwa.ts"),"utf8");
const manager=await readFile(resolve(root,"app","OfflineManager.tsx"),"utf8");
const builder=await readFile(resolve(root,"scripts","build_service_worker.mjs"),"utf8");
const page=await readFile(resolve(root,"app","page.tsx"),"utf8");
const phoneQr=await readFile(resolve(root,"public","phone-home-qr.svg"),"utf8");

function check(value,message){if(!value)throw new Error(message)}
check(manifest.name==="脳実習ナビ","manifest name must be Japanese product name");
check(manifest.display==="standalone"&&manifest.start_url.startsWith("./"),"manifest must be standalone and base-relative");
check(Array.isArray(manifest.icons)&&manifest.icons.some(icon=>icon.sizes==="any"&&icon.purpose.includes("maskable")),"manifest needs a maskable icon");
check(/rel="manifest"/.test(index)&&/apple-mobile-web-app-capable/.test(index),"index must expose manifest and iOS standalone metadata");
check(/import\.meta\.env\.PROD/.test(registration)&&/new URL\("sw\.js",document\.baseURI\)/.test(registration),"service worker registration must be production-only and base-relative");
check(/beforeinstallprompt/.test(registration)&&/event\.preventDefault\(\)/.test(registration)&&/appinstalled/.test(registration),"install prompt lifecycle is not exposed to the offline manager");
check(/networkThenCache/.test(builder)&&/request\.mode==="navigate"/.test(builder)&&/\/atlas\//.test(builder),"worker must provide navigation fallback and atlas runtime caching");
check(/ATLAS_BYTES/.test(builder)&&/healthyAtlasResponse/.test(builder)&&/text\/html/.test(builder)&&/Content-Length/.test(builder)&&/Content-Encoding/.test(builder)&&/response=>healthyAtlasResponse\(request,response\)/.test(builder),"atlas runtime cache must reject HTTP failures, HTML fallbacks, and unencoded declared-size mismatches");
check(/builderSource=await readFile\(fileURLToPath\(import\.meta\.url\)/.test(builder)&&/builderSource\)\.digest/.test(builder),"worker logic changes must rotate generated cache versions");
check(/phone-home-qr\.svg/.test(page)&&/https:\/\/bonnginn\.github\.io\/brain-practical-navi\/#workspace\/home/.test(page),"home must expose the canonical smartphone QR link");
check(/data:image\/png;base64,iVBORw0KGgo/.test(phoneQr)&&!/api\.qrserver|chart\.googleapis|quickchart/.test(page),"smartphone QR must be locally bundled without a runtime QR service");
check(/url\.pathname\.endsWith\("\/offline-packs\.json"\)/.test(builder)&&/controllerchange/.test(manager),"offline catalog updates must cross service worker version changes");
check(/request\.cache==="reload"/.test(builder),"explicit pack downloads must bypass runtime-cache duplication");
check(/caches\.open\(PACK_CACHE\).*cache\.match\(request\).*hit&&healthyAtlasResponse\(request,hit\)\?hit:networkThenCache/s.test(builder),"healthy explicit pack resources must be served before waiting for the network");
check(/PACK_CACHE="brain-practical-offline-packs"/.test(manager)&&/cache:\s*"reload"/.test(manager)&&/removeFromRuntime/.test(manager),"pack manager must use a stable explicit cache and remove duplicate runtime entries");
check(/X-Brain-Practical-Pack-Version/.test(manager)&&/X-Brain-Practical-Pack-Complete/.test(manager)&&/state==="stale"\?"更新が必要"/.test(manager),"pack versions must distinguish current, interrupted, and stale offline data");
check(/protectedPaths/.test(manager)&&/otherComplete/.test(manager)&&/!protectedPaths\.has\(path\)/.test(manager),"deleting one pack must preserve resources owned by another complete pack");
check(/busy=Object\.values\(states\)\.includes\("working"\)/.test(manager)&&/disabled=\{busy\|\|!online\}/.test(manager),"pack writes must be serialized");
check(/navigator\.onLine/.test(manager)&&/navigator\.storage\?\.persisted/.test(manager)&&/navigator\.storage\?\.persist/.test(manager),"offline manager must report connection and storage persistence state");
check(/offlineResourceResponseError/.test(manager)&&/responseError/.test(manager),"pack manager must reject HTTP failures, HTML fallbacks, and declared-size mismatches");
check(catalog.format==="brain-practical-offline-packs"&&/^[0-9a-f]{12}$/.test(catalog.version),"offline catalog format/version invalid");
check(Array.isArray(catalog.packs)&&catalog.packs.length===3,"exactly three user-facing packs are required");

const expected=new Set(["surface","sections","blocks"]),union=new Set();
let largest=0,totalReferences=0;
for(const pack of catalog.packs){
  check(expected.delete(pack.id),`unexpected or duplicate pack ${pack.id}`);
  check(/^[0-9a-f]{12}$/.test(pack.version),`invalid content version in ${pack.id}`);
  check(pack.urls.length>0&&pack.bytes>0,`empty pack ${pack.id}`);
  check(Array.isArray(pack.resources)&&pack.resources.length===pack.urls.length,`resource size table missing in ${pack.id}`);
  check(pack.resources.every((resource,index)=>resource.url===pack.urls[index]&&Number.isInteger(resource.bytes)&&resource.bytes>0),`resource size table invalid in ${pack.id}`);
  let measured=0;const versionEntries=[];
  for(const item of pack.urls){
    check(!item.startsWith("/")&&!item.includes(".."),`pack URL must be safe and base-relative: ${item}`);
    const target=resolve(root,"public",item);await access(target);const size=(await stat(target)).size,bytes=await readFile(target);measured+=size;union.add(item);
    versionEntries.push({url:item,bytes:size,digest:createHash("sha256").update(bytes).digest("hex")});
  }
  check(measured===pack.bytes,`size drift in ${pack.id}: catalog ${pack.bytes}, measured ${measured}`);
  check(pack.resources.reduce((sum,resource)=>sum+resource.bytes,0)===pack.bytes,`resource size total drift in ${pack.id}`);
  const measuredVersion=createHash("sha256").update(JSON.stringify(versionEntries)).digest("hex").slice(0,12);
  check(measuredVersion===pack.version,`content version drift in ${pack.id}: catalog ${pack.version}, measured ${measuredVersion}`);
  largest=Math.max(largest,pack.bytes);totalReferences+=pack.bytes;
  console.log(`PASS\tpwa pack ${pack.id}: ${(pack.bytes/1048576).toFixed(1)} MiB, ${pack.urls.length} files`);
}
check(expected.size===0,"required pack missing");
check(new Set(catalog.packs.map(pack=>pack.version)).size===catalog.packs.length,"pack content versions must be independent");
const unpackedTeachingFiles=(await readdir(resolve(root,"public","atlas"),{withFileTypes:true}))
  .filter(entry=>entry.isFile()&&!/LICENSE|NOTICE|ATTRIBUTION|DATA-MANIFEST/.test(entry.name))
  .map(entry=>`atlas/${entry.name}`)
  .filter(path=>!union.has(path));
check(unpackedTeachingFiles.length===0,`teaching resources missing from offline packs: ${unpackedTeachingFiles.join(", ")}`);
const sharedSurfaceSections=catalog.packs.find(pack=>pack.id==="sections").urls.filter(path=>catalog.packs.find(pack=>pack.id==="surface").urls.includes(path));
check(sharedSurfaceSections.length===10,"surface/sections shared resource count changed; re-audit pack deletion ownership");
check(largest<45*1048576,"a single optional pack exceeds the 45 MiB mobile budget");
check(union.size>=90,"offline packs do not cover enough distinct teaching resources");
check(!CORE_AUTODOWNLOADS_ATLAS(builder),"app-shell precache must not automatically download atlas resources");
console.log(`PASS\tpwa catalog ${catalog.version}: ${union.size} distinct resources, ${(totalReferences/1048576).toFixed(1)} MiB referenced across packs`);
console.log("PASS\tpwa install shell, runtime cache and explicit offline packs audited");

function CORE_AUTODOWNLOADS_ATLAS(source){
  return /if\(name==="sw\.js"\)continue/.test(source)&&!/name\.startsWith\("atlas\/"\)/.test(source);
}
