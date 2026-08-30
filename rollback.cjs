const fs = require('fs');

// 1. Revert Chat.tsx
let chatCode = fs.readFileSync('src/components/Chat.tsx', 'utf8');
chatCode = chatCode.replace(/\n\s*\/\/ Listen for live transcripts from VoiceDialog[\s\S]*?return \(\) => window\.removeEventListener\('thoth_add_live_transcripts', handleAddLiveTranscripts\);\n  \}, \[\]\);\n/m, '');
fs.writeFileSync('src/components/Chat.tsx', chatCode);

// 2. Revert VoiceDialog.tsx
let voiceCode = fs.readFileSync('src/components/VoiceDialog.tsx', 'utf8');
voiceCode = voiceCode.replace(/if \(transcripts\.length > 0\) \{\s*window\.dispatchEvent\(new CustomEvent\('thoth_add_live_transcripts', \{ detail: transcripts \}\)\);\s*\}/, '');
fs.writeFileSync('src/components/VoiceDialog.tsx', voiceCode);

