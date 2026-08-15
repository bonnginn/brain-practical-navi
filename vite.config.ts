import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { sites } from "./build/sites-vite-plugin.ts";
import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

function gitOutput(args:string[]){try{return execFileSync("git",args,{encoding:"utf8"}).trim()}catch{return ""}}
const appBuildCommit=(process.env.VITE_APP_COMMIT??gitOutput(["rev-parse","HEAD"])).trim();
const appBuildDirty=process.env.VITE_APP_DIRTY?process.env.VITE_APP_DIRTY==="true":Boolean(gitOutput(["status","--porcelain"]));
const pagesBuild=process.env.DEPLOY_GITHUB_PAGES === "true";
const appBasePath=pagesBuild?"/brain-practical-navi/":"/";
const publicBaseUrl="https://bonnginn.github.io/brain-practical-navi/";
const buildInfoPlugin={name:"build-info",apply:"build" as const,async closeBundle(){await writeFile(resolve(process.cwd(),"dist","build-info.json"),JSON.stringify({format:"brain-practical-build-info",schemaVersion:1,commit:appBuildCommit,dirty:appBuildDirty,basePath:appBasePath,publicBaseUrl},null,2)+"\n")}};

export default defineConfig({
  base: appBasePath,
  define:{__APP_BUILD_COMMIT__:JSON.stringify(appBuildCommit),__APP_BUILD_DIRTY__:JSON.stringify(appBuildDirty)},
  plugins: [react(),...(pagesBuild?[]:[sites()]),buildInfoPlugin],
});
