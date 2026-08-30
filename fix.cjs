const fs = require('fs');
let code = fs.readFileSync('src/components/VoiceDialog.tsx', 'utf8');

code = code.replace(
  'const isSessionActiveRef = useRef<boolean>(false);',
  'const isSessionActiveRef = useRef<boolean>(false);\n  const isGeminiConnectedRef = useRef<boolean>(false);'
);

fs.writeFileSync('src/components/VoiceDialog.tsx', code);
