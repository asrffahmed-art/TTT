const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Strip all mis-inserted server.listen calls at the end
code = code.replace(/  server\.listen\(PORT, "0\.0\.0\.0".*\n/g, "");

// Replace the final "}\nstartServer();" with "  server.listen(PORT, '0.0.0.0', () => console.log('Running'));\n}\nstartServer();"
code = code.replace(/\n\}\nstartServer\(\);[\s\S]*$/, '\n  server.listen(PORT, "0.0.0.0", () => { console.log(`Server running on http://0.0.0.0:${PORT}`); });\n}\nstartServer();\n');

fs.writeFileSync('server.ts', code);
