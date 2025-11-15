import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { resolve } from "path"

export default defineConfig({
  // Match the old Vue dev server so dev:main can keep using the same URL
  server: {
    port: 3000,
    host: "0.0.0.0",
  },

  // Single-page app at the package root, so no custom root needed
  base: "",
  build: {
    outDir: resolve(__dirname, "./dist"),
    sourcemap: true,
    assetsInlineLimit: 0,
    rollupOptions: {
      // If you ever import 'electron' in the renderer, don't bundle it
      external: ["electron"],
    },
  },

  resolve: {
    alias: {
      // Optional, if you want a simple alias
      "@": resolve(__dirname, "./"),
    },
  },

  optimizeDeps: {
    // Keep electron out of pre-bundling, same as the old config
    exclude: ["electron"],
  },

  plugins: [react()],
})
