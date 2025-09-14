import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { youwareVitePlugin } from "@youware/vite-plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [youwareVitePlugin(), react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
  optimizeDeps: {
    // Force include AI SDK packages for YouWare
    include: ['@ai-sdk/openai', 'ai', 'zod'],
    // Exclude packages that should be external in YouWare
    exclude: [],
    // Force esbuild to pre-bundle
    force: true
  },
  resolve: {
    alias: {
      // Ensure proper module resolution for AI SDK
      '@ai-sdk/openai': '@ai-sdk/openai',
      'ai': 'ai',
      'zod': 'zod'
    }
  },
  build: {
    sourcemap: true,
    // Ensure debug panel is not removed in production
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Keep console logs for debugging
        drop_debugger: false, // Keep debugger statements
      },
    },
    // CommonJS optimization for YouWare
    commonjsOptions: {
      transformMixedEsModules: true,
      include: [/node_modules/],
    },
    // Force fresh builds with timestamp
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `assets/[name]-[hash].[ext]`,
        // Manual chunks for AI SDK
        manualChunks: {
          'ai-sdk': ['@ai-sdk/openai', 'ai', 'zod']
        }
      },
    },
  },
  // Base path for YouWare deployment (adjust if needed)
  base: './',
});
