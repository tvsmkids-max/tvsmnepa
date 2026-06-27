import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },

  build: {
    outDir: "dist",
    sourcemap: false,
    minify: "esbuild",
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vendor chunks
          if (id.includes("node_modules")) {
            if (id.includes("react-dom") || id.includes("react/")) {
              return "vendor-react";
            }
            if (id.includes("react-router")) {
              return "vendor-router";
            }
            if (id.includes("@mui")) {
              return "vendor-mui";
            }
            if (id.includes("recharts")) {
              return "vendor-charts";
            }
            if (id.includes("xlsx")) {
              return "vendor-excel";
            }
            if (id.includes("jspdf")) {
              return "vendor-pdf";
            }
            if (
              id.includes("react-hook-form") ||
              id.includes("yup") ||
              id.includes("@hookform")
            ) {
              return "vendor-forms";
            }
            if (id.includes("axios")) {
              return "vendor-axios";
            }
            if (id.includes("notistack")) {
              return "vendor-notistack";
            }
            // All other node_modules
            return "vendor";
          }
        },
      },
    },
  },

  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@mui/material",
      "@mui/icons-material",
      "axios",
    ],
  },
});
