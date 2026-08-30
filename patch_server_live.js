const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Update responseModalities
code = code.replace(/responseModalities:\s*\["AUDIO"\]/, 'responseModalities: ["AUDIO"] // Can add "TEXT" if needed, but AUDIO already includes text parts often if not explicitly AUDIO only, actually let us specify ["AUDIO", "TEXT"] if possible. Wait, the SDK might only accept one. Let us try ["AUDIO", "TEXT"]');
code = code.replace(/responseModalities:\s*\["AUDIO"\]/, 'responseModalities: ["AUDIO"]'); // Reverting that just in case

// Add part.text forward
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
