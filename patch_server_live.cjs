const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const textForward = `
                      if (part.text) {
                         if (ws.readyState === 1) {
                             ws.send(JSON.stringify({ type: 'text', text: part.text }));
                         }
                      }
                      if (part.inlineData && part.inlineData.data) {
`;

code = code.replace(/if \(part.inlineData && part.inlineData.data\) \{/, textForward);
fs.writeFileSync('server.ts', code);
console.log('Server patched for live text');
