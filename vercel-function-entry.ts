// THOTH — Vercel serverless function entry (bundled to api/index.mjs).
// This file lives OUTSIDE api/ because every .ts file inside api/ would
// become its own function. The vercel build command bundles THIS file with
// esbuild into a self-contained ESM function bundle:
//   node scripts/build-api.cjs
// --packages=external keeps node_modules as runtime imports, which Vercel's
// dependency tracer packages into the lambda automatically.
import { app, handleLiveUpgrade } from "./server";

export const maxDuration = 300;

export default async function handler(req: any, res: any) {
  // WebSocket upgrade interception (THOTH Live voice / live translate).
  // On Fluid compute the function receives the raw request; if the runtime
  // supports socket hijack, handleLiveUpgrade performs the 101 handshake and
  // keeps the Gemini Live session inside this invocation. Regular HTTP
  // requests are unaffected.
  try {
    const isUpgrade =
      req &&
      typeof req.headers?.upgrade === "string" &&
      req.headers.upgrade.toLowerCase() === "websocket";
    if (isUpgrade) {
      const handled = handleLiveUpgrade(req, req.socket, Buffer.alloc(0));
      if (handled) {
        return; // socket is now owned by the WebSocketServer
      }
      // Unknown WS path — close politely instead of HTTP 404.
      if (!res.headersSent && res.socket && typeof res.socket.end === "function") {
        res.socket.end("HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n");
      }
      return;
    }
  } catch (wsErr: any) {
    console.error("[THOTH FUNC] WS upgrade dispatch error:", wsErr);
  }

  try {
    return await app(req, res);
  } catch (err: any) {
    console.error("[THOTH FUNC] Unhandled error:", err);
    if (!res.headersSent) {
      res.status(500).json({
        error: "حدث خطأ غير متوقع في الخادم.",
        diagnostic: String((err && (err.stack || err.message)) || err)
      });
    }
  }
}
