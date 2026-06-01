import { defineConfig } from "vite";
import path from "path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      include: "**/*.{jsx,js}",
    }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    proxy: {
      // Proxy requests under /print-service to the local print service to avoid CORS
      // and mixed-content issues when the app runs under HTTPS.
      '/print-service': {
        target: 'http://127.0.0.1:4891',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/print-service/, ''),
      },
    },
  },
  build: {
    // Disable source maps in production builds to avoid browsers attempting
    // to fetch .map files from external hosts that may require client certs
    // or be blocked by network proxies.
    sourcemap: false,
  },
});
