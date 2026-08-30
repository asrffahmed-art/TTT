const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const target = 'if (msg.type === "audio" && msg.data) {';
const replacement = `let pcmSequence = 0;
          if (msg.type === "audio" && msg.data) {
            pcmSequence++;
            if (pcmSequence === 1) {
              if (ws.readyState === 1) {
                 ws.send(JSON.stringify({ type: 'pcm_ack', sequence: pcmSequence }));
              }
            }
`;
if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync('server.ts', content);
    console.log('Server ACK added.');
}
