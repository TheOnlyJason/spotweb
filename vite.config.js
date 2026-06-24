import { defineConfig } from "vite";

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  root: ".",
  // Custom domain serves from /. (Project URL theonlyjason.github.io/spotweb/ needs base: "/spotweb/".)
  base: "/",
  plugins: [cloudflare()],
});