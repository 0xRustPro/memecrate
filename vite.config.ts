import react from "@vitejs/plugin-react";
import tailwind from "tailwindcss";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/",
  css: {
    postcss: {
      plugins: [tailwind()],
    },
  },
  server: {
    host: '0.0.0.0',  // Listen on all interfaces
    port: 5173,
    strictPort: false,
    cors: true,
    // HMR configuration - try to auto-detect the correct host
    hmr: {
      protocol: 'ws',
      // Use the same host as the server for remote access
      // If accessing locally, this will work. For remote, you may need to set it explicitly
      host: process.env.VITE_HMR_HOST || 'localhost',
      clientPort: 5173,
    },
    watch: {
      usePolling: true, // Helps with file watching in some environments
      interval: 100, // Polling interval in milliseconds
      ignored: ['**/node_modules/**', '**/.git/**'], // Ignore certain files
    },
  },
  build: {
    // Ensure proper module format
    rollupOptions: {
      output: {
        format: 'es',
        // Ensure unique chunk names
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // Ensure proper chunking
    chunkSizeWarningLimit: 1000,
    // Ensure source maps don't cause issues
    sourcemap: false,
  },
});
