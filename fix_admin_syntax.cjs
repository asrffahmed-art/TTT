const fs = require('fs');
let content = fs.readFileSync('src/components/admin/AdminAudioDiagnostics.tsx', 'utf8');

content = content.replace("})`);\n        }", "}");

fs.writeFileSync('src/components/admin/AdminAudioDiagnostics.tsx', content);
console.log('Fixed syntax in AdminAudioDiagnostics.tsx');
