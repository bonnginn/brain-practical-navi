import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { sites } from "./build/sites-vite-plugin.ts";
import { execFileSync } from "node:child_process";

function gitOutput(args:string[]){try{return execFileSync("git",args,{encoding:"utf8"}).trim()}catch{return ""}}
const appBuildCommit=(process.env.VITE_APP_COMMIT??gitOutput(["rev-parse","HEAD"])).trim();
const appBuildDirty=process.env.VITE_APP_DIRTY?process.env.VITE_APP_DIRTY==="true":Boolean(gitOutput(["status","--porcelain"]));

export default defineConfig({
  base: process.env.DEPLOY_GITHUB_PAGES === "true" ? "/brain-practical-navi/" : "/",
  define:{__APP_BUILD_COMMIT__:JSON.stringify(appBuildCommit),__APP_BUILD_DIRTY__:JSON.stringify(appBuildDirty)},
  plugins: [react(), sites()],
});
