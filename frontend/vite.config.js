import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    react(),

    // ─── PWA PLUGIN ───
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["favicon.svg", "logo.png", "loader.svg"],
      manifest: {
        name: "TVSM School - Attendance System",
        short_name: "TVSM School",
        description:
          "Thakur Virendra Singh Memorial School - Attendance Management System",
        theme_color: "#0D1B3E",
        background_color: "#0D1B3E",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        lang: "en",
        categories: ["education", "productivity"],
        icons: [
          {
            src: "/logo.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/logo.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/logo.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/logo.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        shortcuts: [
          {
            name: "Mark Attendance",
            short_name: "Attendance",
            description: "Mark today's attendance",
            url: "/attendance/mark",
            icons: [{ src: "/logo.png", sizes: "192x192" }],
          },
          {
            name: "Students",
            short_name: "Students",
            description: "View students list",
            url: "/students",
            icons: [{ src: "/logo.png", sizes: "192x192" }],
          },
          {
            name: "Reports",
            short_name: "Reports",
            description: "View reports",
            url: "/reports",
            icons: [{ src: "/logo.png", sizes: "192x192" }],
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.onrender\.com\/api\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\/api\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "local-api-cache",
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5,
              },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "image-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
        type: "module",
      },
    }),
  ],

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
    // ✅ Vite 8 — do NOT set minify: 'esbuild' (handled internally)
    target: "esnext",
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // ✅ manualChunks MUST be a function in Vite 8
        manualChunks(id) {
          if (id.includes("node_modules")) {
            // ── React core ──
            if (
              id.includes("react-dom") ||
              id.includes("react/") ||
              id.includes("react-is") ||
              id.includes("scheduler")
            ) {
              return "vendor-react";
            }

            // ── Router ──
            if (id.includes("react-router")) {
              return "vendor-router";
            }

            // ── MUI Icons (separate — very large) ──
            if (id.includes("@mui/icons-material")) {
              return "vendor-mui-icons";
            }

            // ── MUI Core + Emotion ──
            if (
              id.includes("@mui/material") ||
              id.includes("@mui/system") ||
              id.includes("@mui/base") ||
              id.includes("@mui/utils") ||
              id.includes("@emotion/react") ||
              id.includes("@emotion/styled") ||
              id.includes("@emotion/cache") ||
              id.includes("@emotion/serialize") ||
              id.includes("@emotion/utils")
            ) {
              return "vendor-mui-core";
            }

            // ── Charts (recharts is large) ──
            if (
              id.includes("recharts") ||
              id.includes("d3-") ||
              id.includes("victory-") ||
              id.includes("react-smooth")
            ) {
              return "vendor-charts";
            }

            // ── Excel ──
            if (id.includes("xlsx") || id.includes("file-saver")) {
              return "vendor-excel";
            }

            // ── PDF ──
            if (id.includes("jspdf")) {
              return "vendor-pdf";
            }

            // ── Forms ──
            if (
              id.includes("react-hook-form") ||
              id.includes("yup") ||
              id.includes("@hookform")
            ) {
              return "vendor-forms";
            }

            // ── HTTP ──
            if (id.includes("axios")) {
              return "vendor-axios";
            }

            // ── Notifications ──
            if (id.includes("notistack")) {
              return "vendor-notistack";
            }

            // ── TanStack Query ──
            if (id.includes("@tanstack")) {
              return "vendor-tanstack";
            }

            // ── PWA / Workbox ──
            if (id.includes("workbox") || id.includes("vite-plugin-pwa")) {
              return "vendor-pwa";
            }

            // ── Date utilities ──
            if (
              id.includes("date-fns") ||
              id.includes("dayjs") ||
              id.includes("lodash")
            ) {
              return "vendor-utils";
            }

            // ── Dropzone ──
            if (id.includes("react-dropzone")) {
              return "vendor-dropzone";
            }

            // ── Everything else in node_modules ──
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
      "@emotion/react",
      "@emotion/styled",
      "axios",
      "@tanstack/react-query",
    ],
  },
});
