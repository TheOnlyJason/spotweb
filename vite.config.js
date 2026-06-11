import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  // Custom domain serves from /. (Project URL theonlyjason.github.io/spotweb/ needs base: "/spotweb/".)
  base: "/",
  plugins: [],
});
