import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { sites } from "./build/sites-vite-plugin.ts";
import { pwa } from "./build/pwa-vite-plugin.ts";

const sourceRepositoryUrl = process.env.VITE_SOURCE_REPOSITORY_URL?.trim() || "https://github.com/bonnginn/brain-practical-navi";

function correspondingSourceMeta() {
  return {
    name: "corresponding-source-meta",
    transformIndexHtml(html: string) {
      const escaped = sourceRepositoryUrl.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
      return html.replace("<head>", `<head>\n    <meta name="brain-practical-corresponding-source" content="${escaped}">`);
    },
  };
}

export default defineConfig({
  base: process.env.DEPLOY_GITHUB_PAGES === "true" ? "/brain-practical-navi/" : "/",
  plugins: [react(), pwa(), sites(), correspondingSourceMeta()],
});
