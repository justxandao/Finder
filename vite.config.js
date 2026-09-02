import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST;

const removeCrossoriginPlugin = () => {
  return {
    name: 'remove-crossorigin',
    transformIndexHtml(html) {
      return html.replace(/crossorigin/g, '');
    }
  }
}

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react(), removeCrossoriginPlugin()],
  base: './',

  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
