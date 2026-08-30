const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace("  });\n}\nstartServer();", "  });\n\n  server.listen(PORT, \"0.0.0.0\", () => {\n    console.log(`Server running on http://0.0.0.0:${PORT}`);\n  });\n}\nstartServer();");
fs.writeFileSync('server.ts', code);
