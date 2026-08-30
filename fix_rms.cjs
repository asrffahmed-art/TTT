const fs = require('fs');
let content = fs.readFileSync('src/components/VoiceDialog.tsx', 'utf8');

content = content.replace('const rms = Math.sqrt(sum / inputData.length);\n        const currentVol = Math.min(100, Math.floor(rms * 400));', 'const currentVol = Math.min(100, Math.floor(rms * 400));');

fs.writeFileSync('src/components/VoiceDialog.tsx', content);
