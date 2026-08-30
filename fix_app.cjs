const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(
  /<div className=\{activeTab === 'voice' \? 'flex flex-col h-full w-full overflow-hidden' : 'hidden'\}>\s*<VoiceDialog onClose=\{\(\) => setShowVoiceDialog\(false\)\} \/>\s*<\/div>/g,
  "{isLiveAudioOpen && <VoiceDialog onClose={() => setIsLiveAudioOpen(false)} />}"
);
fs.writeFileSync('src/App.tsx', code);
