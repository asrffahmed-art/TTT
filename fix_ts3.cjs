const fs = require('fs');
let client = fs.readFileSync('src/components/VoiceDialog.tsx', 'utf8');

// There are multiple getSampleRateFromMimeType now
client = client.replace(/const getSampleRateFromMimeType = \([^)]+\): number => \{[\s\S]*?24000;\s*\};/, '');

fs.writeFileSync('src/components/VoiceDialog.tsx', client);
