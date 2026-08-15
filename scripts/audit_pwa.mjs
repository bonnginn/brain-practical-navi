import { access, readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const manifest=JSON.parse(await readFile(resolve(root,"public","manifest.webmanifest"),"utf8"));
const catalog=JSON.parse(await readFile(resolve(root,"public","offline-packs.json"),"utf8"));
const index=await readFile(resolve(root,"index.html"),"utf8");
const registration=await readFile(resolve(root,"src","pwa.ts"),"utf8");
const manager=await readFile(resolve(root,"app","OfflineManager.tsx"),"utf8");
const builder=await readFile(resolve(root,"scripts","build_service_worker.mjs"),"utf8");

function check(value,message){if(!value)throw new Error(message)}
check(manifest.name==="脳実習ナビ","manifest name must be Japanese product name");
check(manifest.display==="standalone"&&manifest.start_url.startsWith("./"),"manifest must be standalone and base-relative");
check(Array.isArray(manifest.icons)&&manifest.icons.some(icon=>icon.sizes==="any"&&icon.purpose.includes("maskable")),"manifest needs a maskable icon");
check(/rel="manifest"/.test(index)&&/apple-mobile-web-app-capable/.test(index),"index must expose manifest and iOS standalone metadata");
check(/import\.meta\.env\.PROD/.test(registration)&&/new URL\("sw\.js",document\.baseURI\)/.test(registration),"service worker registration must be production-only and base-relative");
check(/beforeinstallprompt/.test(registration)&&/event\.preventDefault\(\)/.test(registration)&&/appinstalled/.test(registration),"install prompt lifecycle is not exposed to the offline manager");
check(/networkThenCache/.test(builder)&&/request\.mode==="navigate"/.test(builder)&&/\/atlas\//.test(builder),"worker must provide navigation fallback and atlas runtime caching");
check(/request\.cache==="reload"/.test(builder),"explicit pack downloads must bypass runtime-cache duplication");
check(/PACK_CACHE="brain-practical-offline-packs"/.test(manager)&&/cache:\s*"reload"/.test(manager)&&/removeFromRuntime/.test(manager),"pack manager must use a stable explicit cache and remove duplicate runtime entries");
check(/X-Brain-Practical-Pack-Version/.test(manager)&&/X-Brain-Practical-Pack-Complete/.test(manager)&&/state==="stale"\?"更新が必要"/.test(manager),"pack versions must distinguish current, interrupted, and stale offline data");
check(/protectedPaths/.test(manager)&&/otherComplete/.test(manager)&&/!protectedPaths\.has\(path\)/.test(manager),"deleting one pack must preserve resources owned by another complete pack");
check(/busy=Object\.values\(states\)\.includes\("working"\)/.test(manager)&&/disabled=\{busy\|\|!online\}/.test(manager),"pack writes must be serialized");
check(/navigator\.onLine/.test(manager)&&/navigator\.storage\?\.persisted/.test(manager)&&/navigator\.storage\?\.persist/.test(manager),"offline manager must report connection and storage persistence state");
check(catalog.format==="brain-practical-offline-packs"&&/^[0-9a-f]{12}$/.test(catalog.version),"offline catalog format/version invalid");
check(Array.isArray(catalog.packs)&&catalog.packs.length===3,"exactly three user-facing packs are required");

const expected=new Set(["surface","sections","blocks"]),union=new Set();
let largest=0,totalReferences=0;
for(const pack of catalog.packs){
  check(expected.delete(pack.id),`unexpected or duplicate pack ${pack.id}`);
  check(pack.urls.length>0&&pack.bytes>0,`empty pack ${pack.id}`);
  let measured=0;
  for(const item of pack.urls){
    check(!item.startsWith("/")&&!item.includes(".."),`pack URL must be safe and base-relative: ${item}`);
    const target=resolve(root,"public",item);await access(target);measured+=(await stat(target)).size;union.add(item);
  }
  check(measured===pack.bytes,`size drift in ${pack.id}: catalog ${pack.bytes}, measured ${measured}`);
  largest=Math.max(largest,pack.bytes);totalReferences+=pack.bytes;
  console.log(`PASS\tpwa pack ${pack.id}: ${(pack.bytes/1048576).toFixed(1)} MiB, ${pack.urls.length} files`);
}
check(expected.size===0,"required pack missing");
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
