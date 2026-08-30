// Vercel Serverless Function entry.
// The heavy Express app lives in ../server (all routes registered there).
// We wrap the import so that any module-load crash is REPORTED in the
// response body instead of an opaque FUNCTION_INVOCATION_FAILED.

type Handler = (req: any, res: any) => void;

function createDiagnosticHandler(err: any): Handler {
  return function diagnosticHandler(req: any, res: any) {
    console.error("[THOTH FUNC] Module load failed:", err);
    res.status(500).json({
      error: "THOTH server failed to initialize",
      diagnostic: String((err && (err.stack || err.message)) || err),
      hint: "Check the error details above and fix server.ts initialization."
    });
  };
}

function createNotFoundHandler(): Handler {
  return function notFoundHandler(req: any, res: any) {
    res.status(404).json({ error: "الرابط المطلوب في API غير موجود." });
  };
}

let handler: Handler = createNotFoundHandler();

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require("../server");
  const app = mod.app || mod.default || mod;
  if (typeof app === "function") {
    handler = app;
    console.log("[THOTH FUNC] Server module loaded successfully");
  } else {
    console.error("[THOTH FUNC] Exported app is not a handler function:", typeof app);
  }
} catch (err: any) {
  console.error("[THOTH FUNC] CRITICAL: failed to load ../server:", err);
  handler = createDiagnosticHandler(err);
}

export const maxDuration = 60;

export default handler;
