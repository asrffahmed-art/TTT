const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(
  'app.get("/api/health", (req, res) => {',
  `app.get("/api/test-live-modality", async (req, res) => {
  try {
    if (!ai) await refreshAiClient();
    const session = await ai.live.connect({
      model: 'gemini-3.1-flash-live-preview',
      config: { responseModalities: ["AUDIO", "TEXT"] },
      callbacks: {}
    });
    session.close();
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.toString() });
  }
});
app.get("/api/health", (req, res) => {`
);
fs.writeFileSync('server.ts', code);
