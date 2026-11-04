import http from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PS_SCRIPT = path.join(__dirname, "nowplaying.ps1");
const DEFAULT_PORT = Number(process.env.BRIDGE_PORT || 4319);
const HOST = "127.0.0.1";
const CACHE_MS = 1500;
const PS_TIMEOUT_MS = 6000;

const localOrigin = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;
const extraOrigins = (process.env.BRIDGE_ALLOWED_ORIGINS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

let cache = null;
let inflight = null;

function isAllowedOrigin(origin) {
  if (!origin) return true;
  return localOrigin.test(origin) || extraOrigins.includes(origin);
}

function sendJson(res, status, payload, origin) {
  const body = JSON.stringify(payload);
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(body),
  };
  if (origin && isAllowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }
  res.writeHead(status, headers);
  res.end(body);
}

function runNowPlayingScript() {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "powershell.exe",
      ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", PS_SCRIPT],
      { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
    );

    const stdout = [];
    const stderr = [];
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill();
      reject(new Error("Windows media query timed out"));
    }, PS_TIMEOUT_MS);

    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));

    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      const raw = Buffer.concat(stdout).toString("utf8").replace(/\uFEFF/g, "").trim();
      const errorText = Buffer.concat(stderr).toString("utf8").trim();

      if (!raw) {
        reject(new Error(errorText || `No output from Windows media bridge (exit ${code})`));
        return;
      }

      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      if (start === -1 || end === -1) {
        reject(new Error(errorText || "Unexpected output from Windows media bridge"));
        return;
      }

      try {
        resolve(JSON.parse(raw.slice(start, end + 1)));
      } catch (error) {
        reject(new Error(`Could not parse Windows media response: ${error.message}`));
      }
    });
  });
}

async function getNowPlaying() {
  const now = Date.now();
  if (cache && now - cache.receivedAt < CACHE_MS) {
    return { ...cache.payload, cached: true };
  }
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const payload = await runNowPlayingScript();
      cache = { receivedAt: Date.now(), payload };
      return payload;
    } catch (error) {
      const payload = {
        supported: false,
        fetchedAt: Date.now(),
        sessions: [],
        error: error instanceof Error ? error.message : String(error),
      };
      cache = { receivedAt: Date.now(), payload };
      return payload;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

function probeExistingBridge(port) {
  return new Promise((resolve) => {
    const request = http.get(
      { host: HOST, port, path: "/health", timeout: 900 },
      (response) => {
        response.resume();
        resolve(response.statusCode === 200);
      },
    );
    request.on("timeout", () => {
      request.destroy();
      resolve(false);
    });
    request.on("error", () => resolve(false));
  });
}

export async function startBridge(options = {}) {
  const port = Number(options.port || DEFAULT_PORT);
  const quiet = Boolean(options.quiet);

  if (await probeExistingBridge(port)) {
    if (!quiet) console.log(`[now-playing] bridge already running at http://${HOST}:${port}`);
    return {
      url: `http://${HOST}:${port}`,
      reused: true,
      close: async () => {},
    };
  }

  const server = http.createServer(async (req, res) => {
    const origin = req.headers.origin;
    const url = new URL(req.url || "/", `http://${HOST}:${port}`);

    if (origin && !isAllowedOrigin(origin)) {
      sendJson(res, 403, { ok: false, error: "Origin not allowed" }, origin);
      return;
    }

    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": origin || "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "600",
        Vary: "Origin",
      });
      res.end();
      return;
    }

    if (req.method !== "GET") {
      sendJson(res, 405, { ok: false, error: "Method not allowed" }, origin);
      return;
    }

    if (url.pathname === "/health") {
      sendJson(res, 200, { ok: true, service: "raakh-now-playing", platform: process.platform }, origin);
      return;
    }

    if (url.pathname === "/nowplaying") {
      try {
        const payload = await getNowPlaying();
        sendJson(res, 200, { ok: true, ...payload }, origin);
      } catch (error) {
        sendJson(
          res,
          500,
          { ok: false, supported: false, sessions: [], error: error instanceof Error ? error.message : String(error) },
          origin,
        );
      }
      return;
    }

    sendJson(res, 404, { ok: false, error: "Not found" }, origin);
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, HOST, () => {
      server.off("error", reject);
      resolve();
    });
  });

  if (!quiet) {
    console.log(`[now-playing] listening on http://${HOST}:${port}`);
    if (process.platform !== "win32") {
      console.warn("[now-playing] Windows media detection requires Windows 10/11.");
    }
  }

  return {
    url: `http://${HOST}:${port}`,
    reused: false,
    close: () =>
      new Promise((resolve) => {
        server.close(() => resolve());
        setTimeout(resolve, 500).unref?.();
      }),
  };
}

const directExecution = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (directExecution) {
  startBridge()
    .then((bridge) => {
      if (bridge.reused) return;
      const stop = () => {
        bridge.close().finally(() => process.exit(0));
      };
      process.on("SIGINT", stop);
      process.on("SIGTERM", stop);
    })
    .catch((error) => {
      console.error("[now-playing] failed to start:", error.message);
      process.exit(1);
    });
}
