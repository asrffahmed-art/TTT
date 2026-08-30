const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  'const validVoices = ["Aoede", "Charon", "Fenrir", "Kore", "Puck"];',
  'const validVoices = ["Aoede", "Charon", "Fenrir", "Kore", "Puck", "Zephyr"];'
);

fs.writeFileSync('server.ts', code);
console.log("Updated server.ts with Zephyr voice!");
