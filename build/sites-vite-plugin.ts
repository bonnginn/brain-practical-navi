import { cp, mkdir, readdir, rename, rm, writeFile } from "node:fs/promises";
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
      const distributionDirectory = resolve(root, "dist");
      const outputDirectory = resolve(distributionDirectory, ".openai");
      const serverDirectory = resolve(distributionDirectory, "server");
      const hostingConfig = resolve(root, ".openai", "hosting.json");

      await rm(outputDirectory, { recursive: true, force: true });
      await mkdir(outputDirectory, { recursive: true });

      await cp(hostingConfig, resolve(outputDirectory, "hosting.json"));

      await mkdir(serverDirectory, { recursive: true });
      await writeFile(
        resolve(serverDirectory, "index.js"),
        `const worker={async fetch(request,env){let response=await env.ASSETS.fetch(request);if(response.status===404&&(request.headers.get("accept")||"").includes("text/html")){const url=new URL(request.url);url.pathname="/index.html";response=await env.ASSETS.fetch(new Request(url,request))}return response}};export default worker;\n`,
      );

      // Sites serves static files from dist/client, while GitHub Pages and the
      // ordinary local preview require Vite's flat dist layout. Move only for
      // the dedicated Sites build so both hosting targets keep their contract.
      if (process.env.DEPLOY_OPENAI_SITES === "true") {
        const clientDirectory = resolve(distributionDirectory, "client");
        await rm(clientDirectory, { recursive: true, force: true });
        await mkdir(clientDirectory, { recursive: true });
        for (const entry of await readdir(distributionDirectory, { withFileTypes: true })) {
          if ([".openai", "client", "server"].includes(entry.name)) continue;
          await rename(resolve(distributionDirectory, entry.name), resolve(clientDirectory, entry.name));
        }
      }
    },
  };
}
