const fs = require('fs');
let code = fs.readFileSync('src/components/Chat.tsx', 'utf8');

// Ensure that we show something if the response somehow didn't return text
code = code.replace(/setMessages\(prev => prev.filter\(m => m.id !== modelMessageId\)\);/g, `setMessages(prev => prev.map(m => m.id === modelMessageId ? { ...m, text: "عذراً، لم أتمكن من توثيق الرد النصي مؤقتاً." } : m));`);

fs.writeFileSync('src/components/Chat.tsx', code);
