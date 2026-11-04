import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { startBridge, type BridgeHandle } from "./bridge/server.mjs";

function nowPlayingBridgePlugin(): Plugin {
  let bridge: BridgeHandle | null = null;
  let starting: Promise<void> | null = null;

  const ensureBridge = async () => {
    if (bridge) return;
    if (!starting) {
      starting = startBridge({ quiet: false })
        .then((handle) => {
          bridge = handle;
        })
        .catch((error: Error) => {
          console.warn("[now-playing] bridge unavailable:", error.message);
        })
        .finally(() => {
          starting = null;
        });
    }
    await starting;
  };

  const attach = (httpServer: { on: (event: string, cb: () => void) => void } | null) => {
    void ensureBridge();
    httpServer?.on("close", () => {
      void bridge?.close();
      bridge = null;
    });
  };

  return {
    name: "raakh-now-playing-bridge",
    apply: "serve",
    configureServer(server) {
      attach(server.httpServer);
    },
    configurePreviewServer(server) {
      attach(server.httpServer);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), nowPlayingBridgePlugin()],
  server: {
    port: 5173,
  },
  preview: {
    port: 4173,
  },
});
