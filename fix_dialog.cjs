const fs = require('fs');
let code = fs.readFileSync('src/components/VoiceDialog.tsx', 'utf8');
code = code.replace(/\\\`\$\\{protocol\\}\/\/\$\\{window\.location\.host\\}\/api\/live-audio\\\`/g, "\`${protocol}//${window.location.host}/api/live-audio\`");
code = code.replace(/\\\$/g, "$");
code = code.replace(/\\\`/g, "`");
fs.writeFileSync('src/components/VoiceDialog.tsx', code);
