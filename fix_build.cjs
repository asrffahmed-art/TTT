const fs = require('fs');
let voice = fs.readFileSync('src/components/VoiceDialog.tsx', 'utf8');

voice = voice.replace(/const seq = msg\.sequence \|\| 1;/g, 'const seq = msg.sequence || 1;');
fs.writeFileSync('src/components/VoiceDialog.tsx', voice);
