const fs = require('fs');
let code = fs.readFileSync('src/components/VoiceDialog.tsx', 'utf8');

// Undo first occurrence
code = code.replace(
  'if (!isSessionActiveRef.current) return;\n        if (!isGeminiConnectedRef.current) return;\n        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;',
  'if (!isSessionActiveRef.current) return;'
);

// Specifically replace the one in onaudioprocess
const searchStr = 'scriptProcessor.onaudioprocess = (e) => {\n        if (!isSessionActiveRef.current) return;';
const replaceStr = 'scriptProcessor.onaudioprocess = (e) => {\n        if (!isSessionActiveRef.current) return;\n        if (!isGeminiConnectedRef.current) return;\n        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;';
code = code.replace(searchStr, replaceStr);

fs.writeFileSync('src/components/VoiceDialog.tsx', code);
