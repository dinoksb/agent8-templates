import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import glsl from "vite-plugin-glsl";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), glsl()],
  optimizeDeps: {
    exclude: ["lucide-react"],
  },
  base: "./",
  build: {
    outDir: "dist",
  },
});
