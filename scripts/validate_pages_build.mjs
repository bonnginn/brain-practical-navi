import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const args=process.argv.slice(2).filter(argument=>argument!=="--");
const valueAfter=flag=>{const index=args.indexOf(flag);return index>=0?args[index+1]:""};
const expectedCommit=valueAfter("--commit");
const dist=resolve(process.cwd(),valueAfter("--dir")||"dist");
const basePath="/brain-practical-navi/";
const publicBaseUrl="https://bonnginn.github.io/brain-practical-navi/";
if(!/^[0-9a-f]{40}$/i.test(expectedCommit)){console.error("Usage: npm run validate:pages-build -- --commit <40-char-SHA> [--dir <artifact-dir>]");process.exit(2)}

const errors=[];
const read=async name=>{try{return await readFile(resolve(dist,name),"utf8")}catch(error){errors.push(`missing or unreadable ${name}: ${error instanceof Error?error.message:String(error)}`);return ""}};
const exists=async name=>{try{await access(resolve(dist,name));return true}catch{return false}};
const [index,manifestText,worker,buildInfoText,qr]=await Promise.all([read("index.html"),read("manifest.webmanifest"),read("sw.js"),read("build-info.json"),read("phone-home-qr.svg")]);
let manifest={},buildInfo={};
try{manifest=JSON.parse(manifestText)}catch{errors.push("manifest.webmanifest must be valid JSON")}
try{buildInfo=JSON.parse(buildInfoText)}catch{errors.push("build-info.json must be valid JSON")}

if(buildInfo.format!=="brain-practical-build-info"||buildInfo.schemaVersion!==1)errors.push("build-info.json format/schemaVersion is invalid");
if((buildInfo.commit??"").toLowerCase()!==expectedCommit.toLowerCase())errors.push("build-info.json commit must match --commit");
if(buildInfo.dirty!==false)errors.push("build-info.json dirty must be false");
if(buildInfo.basePath!==basePath)errors.push(`build-info.json basePath must be ${basePath}`);
if(buildInfo.publicBaseUrl!==publicBaseUrl)errors.push(`build-info.json publicBaseUrl must be ${publicBaseUrl}`);
if(manifest.start_url!=="./#workspace/home"||manifest.scope!=="./"||manifest.display!=="standalone")errors.push("manifest must use a base-relative standalone home entry");
if(!qr.includes(`${publicBaseUrl}#workspace/home`))errors.push("phone QR must target the canonical public home URL");

const references=[...index.matchAll(/(?:src|href)="([^"]+)"/g)].map(match=>match[1]).filter(value=>!value.startsWith("http"));
for(const reference of references){
  if(!reference.startsWith(basePath)){errors.push(`index local reference must start with ${basePath}: ${reference}`);continue}
  const relative=reference.slice(basePath.length);
  if(!relative||!await exists(relative))errors.push(`index references a missing artifact: ${reference}`);
}
const scriptReference=references.find(reference=>/\/assets\/[^/]+\.js$/.test(reference));
const styleReference=references.find(reference=>/\/assets\/[^/]+\.css$/.test(reference));
if(!scriptReference)errors.push("index must reference one built JavaScript entry under the Pages base path");
if(!styleReference)errors.push("index must reference one built stylesheet under the Pages base path");
if(await exists(".openai"))errors.push("GitHub Pages artifact must not contain Sites runtime metadata");
if(await exists("server"))errors.push("GitHub Pages artifact must not contain the Sites worker entry");

let corePaths=[];
const coreMatch=worker.match(/const CORE_PATHS=(\[[^;]+\]);/);
try{corePaths=coreMatch?JSON.parse(coreMatch[1]):[]}catch{/* reported below */}
const requiredCore=["","build-info.json","index.html","manifest.webmanifest","offline-packs.json","phone-home-qr.svg",scriptReference?.slice(basePath.length),styleReference?.slice(basePath.length)].filter(value=>value!==undefined);
for(const path of requiredCore){if(!corePaths.includes(path))errors.push(`service worker core cache is missing ${path||"the navigation root"}`);if(path&&!await exists(path))errors.push(`service worker core cache references a missing artifact: ${path}`)}
if(corePaths.some(path=>path.startsWith(".openai/")||path.startsWith("server/")))errors.push("service worker must not precache Sites-only files in the Pages artifact");
if(!worker.includes("new URL(path,self.registration.scope).href"))errors.push("service worker paths must resolve from its registration scope");

if(errors.length){for(const error of errors)console.error(`FAIL\t${error}`);process.exitCode=1}else{
  console.log(`PASS\tGitHub Pages artifact ${expectedCommit}`);
  console.log(`PASS\t${references.length} HTML references exist under ${basePath}; ${corePaths.length} PWA shell entries are scoped and complete`);
  console.log("PASS\tPages artifact excludes Sites-only runtime files and is ready for public-URL regression testing");
}
