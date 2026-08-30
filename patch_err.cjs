const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
    "ws.send(JSON.stringify({ type: 'error', error: 'فشل تهيئة الاتصال المباشر.' }));",
    "ws.send(JSON.stringify({ type: 'error', error: 'فشل تهيئة الاتصال المباشر: ' + String(err) }));"
);

fs.writeFileSync('server.ts', code);
