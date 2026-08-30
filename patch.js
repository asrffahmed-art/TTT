const fs = require('fs');

let server = fs.readFileSync('server.ts', 'utf8');

server = server.replace(
  `      if (modelParam) {
        selectedModel = modelParam;
      }`,
  `      if (modelParam === 'gemini-db-model') {
        const dbKeys = await getDbApiKeys();
        selectedModel = dbKeys.preferredModel || "gemini-3.1-flash-lite";
      } else if (modelParam) {
        selectedModel = modelParam;
      }`
);

server = server.replace(
  `      const targetModel = model.includes("2.5") ? "gemini-2.5-flash" : "gemini-3.1-flash-lite";`,
  `      let targetModel = model.includes("2.5") ? "gemini-2.5-flash" : "gemini-3.1-flash-lite";
      if (model === 'gemini-db-model') {
        const dbKeys = await getDbApiKeys();
        targetModel = dbKeys.preferredModel || "gemini-3.1-flash-lite";
      }`
);

fs.writeFileSync('server.ts', server);
