import { app } from "../server";

// Vercel Serverless Function configuration.
// maxDuration: up to 60s on Hobby (Fluid Compute), higher on Pro.
// This keeps long AI generations from being cut off too early.
export const maxDuration = 60;

export default app;
