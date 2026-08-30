const fs = require('fs');
let code = fs.readFileSync('src/components/Chat.tsx', 'utf8');

code = code.replace(/if \(data\.reply\) \{/g, 'if (data.text) {');
code = code.replace(/text: data\.reply/g, 'text: data.text');

fs.writeFileSync('src/components/Chat.tsx', code);
