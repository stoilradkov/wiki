import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, normalizePath } from "vite";
import { fileURLToPath, URL } from "node:url";
import { loadFrontendDevEnv } from "./env";

const envDir = fileURLToPath(new URL("../..", import.meta.url));
const frontendSrc = normalizePath(fileURLToPath(new URL("./src", import.meta.url)));
const sharedSrc = normalizePath(
  fileURLToPath(new URL("../../packages/shared/src", import.meta.url))
);
const sharedIndex = normalizePath(
  fileURLToPath(new URL("../../packages/shared/src/index.ts", import.meta.url))
);

export default defineConfig(({ mode }) => {
  const env = loadFrontendDevEnv(mode, envDir);

  return {
    plugins: [react(), tailwindcss()],
    envDir,
    resolve: {
      alias: [
        {
          find: /^@wiki\/frontend\/(.*)$/,
          replacement: `${frontendSrc}/$1`
        },
        {
          find: /^@wiki\/frontend$/,
          replacement: frontendSrc
        },
        {
          find: /^@wiki\/shared\/(.*)$/,
          replacement: `${sharedSrc}/$1`
        },
        {
          find: /^@wiki\/shared$/,
          replacement: sharedIndex
        }
      ]
    },
    server: {
      host: env.VITE_DEV_HOST,
      port: env.VITE_DEV_PORT,
      strictPort: true,
      proxy: {
        "/api": {
          target: env.VITE_API_PROXY_TARGET,
          changeOrigin: true
        }
      }
    }
  };
});
