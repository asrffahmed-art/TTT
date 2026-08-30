const fs = require('fs');

// Fix server.ts
let server = fs.readFileSync('server.ts', 'utf8');
server = server.replace(/error: e\.message/g, 'error: (e as any).message');
server = server.replace(/let ai: GoogleGenAI;\nconst embeddingManager = new AiEmbeddingManager\(ai, dbWeb\);/, 'let ai: GoogleGenAI | any;\nconst embeddingManager = new AiEmbeddingManager(ai as any, dbWeb);');
fs.writeFileSync('server.ts', server);

// Fix Chat.tsx
let chat = fs.readFileSync('src/components/Chat.tsx', 'utf8');
chat = chat.replace(/msg\.images\.map/g, '(msg.images || []).map');
chat = chat.replace(/msg\.images\.length/g, '(msg.images || []).length');
fs.writeFileSync('src/components/Chat.tsx', chat);

