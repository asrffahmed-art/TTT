const fs = require('fs');
let content = fs.readFileSync('src/components/VoiceDialog.tsx', 'utf8');

const target = `} else if (msg.type === 'state') {`;
const replacement = `} else if (msg.type === 'pcm_ack') {
            console.log("[VOICE 10] SERVER ACK / PCM RECEIVED", msg.sequence);
            console.log("[VOICE 11] PCM SENT TO GEMINI (Server Forwarded)");
          } else if (msg.type === 'state') {`;

if (content.includes(target) && !content.includes('pcm_ack')) {
    content = content.replace(target, replacement);
    fs.writeFileSync('src/components/VoiceDialog.tsx', content);
    console.log('VoiceDialog ACK handler added.');
}
