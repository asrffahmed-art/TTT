const fs = require('fs');
let content = fs.readFileSync('src/components/VoiceDialog.tsx', 'utf8');

// Remove test Functions
content = content.replace(/const runEnvDiagnostics = \(\w+\) => \{[\s\S]*?const startSession = async \(\) => \{/m, 'const startSession = async () => {');

// Remove test Buttons
content = content.replace(/<div className="flex flex-wrap gap-2 justify-center mb-4 shrink-0 relative z-10" id="debug-buttons">[\s\S]*?<\/div>/m, '');

fs.writeFileSync('src/components/VoiceDialog.tsx', content);
