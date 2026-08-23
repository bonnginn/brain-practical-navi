import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { sites } from "./build/sites-vite-plugin.ts";
import { pwa } from "./build/pwa-vite-plugin.ts";

export default defineConfig({
  base: process.env.DEPLOY_GITHUB_PAGES === "true" ? "/brain-practical-navi/" : "/",
  plugins: [react(), pwa(), sites()],
});
