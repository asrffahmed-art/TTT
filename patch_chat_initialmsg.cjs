const fs = require('fs');
let code = fs.readFileSync('src/components/Chat.tsx', 'utf8');
code = code.replace(/if \(initialMessage && !isLoading && messages\.length > 0\) \{/g, 'if (initialMessage && !isLoading) {');
fs.writeFileSync('src/components/Chat.tsx', code);
console.log("Patched Chat.tsx initialMessage");
