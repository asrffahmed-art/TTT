// THOTH — Vercel serverless function entry (bundled to api/index.cjs).
// This file lives OUTSIDE api/ because every .ts file inside api/ would
// become its own function. The vercel build command bundles THIS file with
// esbuild into a self-contained CommonJS function bundle:
//   esbuild vercel-function-entry.ts --bundle --platform=node --format=cjs \
//     --packages=external --outfile=api/index.cjs
// --packages=external keeps node_modules as runtime requires, which Vercel's
// dependency tracer packages into the lambda automatically.
import { app } from "./server";

export const maxDuration = 60;

export default async function handler(req: any, res: any) {
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
