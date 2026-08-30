const fs = require('fs');
let content = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

content = content.replace("import { AdvertisingManager } from './admin/AdvertisingManager';\\nimport { AdminAudioDiagnostics } from './admin/AdminAudioDiagnostics';", "import { AdvertisingManager } from './admin/AdvertisingManager';\nimport { AdminAudioDiagnostics } from './admin/AdminAudioDiagnostics';");

fs.writeFileSync('src/components/AdminPanel.tsx', content);
