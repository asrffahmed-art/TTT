// Bundles the Vercel function entry into api/index.mjs (self-contained ESM).
// Why bundling? @vercel/node compiles api/*.ts per-file WITHOUT bundling, so
// an `import ... from "../server"` would stay unresolved at runtime
// (ERR_MODULE_NOT_FOUND). Pre-bundling inlines server.ts and all relative
// imports; --packages=external keeps node_modules as bare module imports
// (safe in ESM) which Vercel's dependency tracer packages into the lambda.
// NOTE: .cjs is NOT a supported function extension on Vercel — use .mjs.
const esbuild = require("esbuild");

esbuild
  .build({
    entryPoints: ["vercel-function-entry.ts"],
    bundle: true,
    platform: "node",
    format: "esm",
    packages: "external",
    sourcemap: true,
    outfile: "api/index.mjs",
    logLevel: "info",
    target: "node18",
  })
  .then(() => {
    console.log("[build-api] api/index.mjs built successfully");
  })
  .catch((err) => {
    console.error("[build-api] FAILED:", err);
    process.exit(1);
  });
