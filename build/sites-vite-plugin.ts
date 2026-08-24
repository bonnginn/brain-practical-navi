import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Plugin } from "vite";

// Packages the static Sites metadata after Vite finishes compiling.
export function sites(): Plugin {
  let root = process.cwd();

  return {
    name: "sites",
    apply: "build",
    configResolved(config) {
      root = config.root;
    },
    async closeBundle() {
      const outputDirectory = resolve(root, "dist", ".openai");
      const serverDirectory = resolve(root, "dist", "server");
      const hostingConfig = resolve(root, ".openai", "hosting.json");

      await rm(outputDirectory, { recursive: true, force: true });
      await mkdir(outputDirectory, { recursive: true });

      await cp(hostingConfig, resolve(outputDirectory, "hosting.json"));

      await mkdir(serverDirectory, { recursive: true });
      await writeFile(
        resolve(serverDirectory, "index.js"),
        `const worker={async fetch(request,env){let response=await env.ASSETS.fetch(request);if(response.status===404&&(request.headers.get("accept")||"").includes("text/html")){const url=new URL(request.url);url.pathname="/index.html";response=await env.ASSETS.fetch(new Request(url,request))}return response}};export default worker;\n`,
      );
    },
  };
}
