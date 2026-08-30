const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(
  "if (part.text) {",
  "if (part.text) {\n                         console.log('[GEMINI LIVE TEXT]', part.text);"
);
fs.writeFileSync('server.ts', code);
