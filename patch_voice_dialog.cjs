const fs = require('fs');
let code = fs.readFileSync('src/components/VoiceDialog.tsx', 'utf8');

// 1. Add `isGeminiConnectedRef`
if (!code.includes('isGeminiConnectedRef = useRef')) {
    code = code.replace(
        'const isSessionActiveRef = useRef(false);',
        'const isSessionActiveRef = useRef(false);\n  const isGeminiConnectedRef = useRef(false);'
    );
}

// 2. Set `isGeminiConnectedRef.current = true` on `gemini_connected`
if (code.includes('if (msg.type === \'gemini_connected\') {')) {
    code = code.replace(
        "if (msg.type === 'gemini_connected') {",
        "if (msg.type === 'gemini_connected') {\n            isGeminiConnectedRef.current = true;"
    );
}

// 3. Reset it on close
if (code.includes('isSessionActiveRef.current = false;')) {
    code = code.replace(
        /isSessionActiveRef\.current = false;/g,
        "isSessionActiveRef.current = false;\n    isGeminiConnectedRef.current = false;"
    );
}

// 4. In `onaudioprocess`, check if connected
if (code.includes('if (!isSessionActiveRef.current) return;')) {
    code = code.replace(
        'if (!isSessionActiveRef.current) return;',
        'if (!isSessionActiveRef.current) return;\n        if (!isGeminiConnectedRef.current) return;\n        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;'
    );
}

// 5. Enforce Gemini 2.5 Native Audio model
code = code.replace(
  /useState<string>\('gemini-3\.1-flash-live-preview'\);/g,
  "useState<string>('gemini-2.5-flash-native-audio-preview-12-2025');"
);
code = code.replace(
  /'gemini-3\.1-flash-live-preview'/g,
  "'gemini-2.5-flash-native-audio-preview-12-2025'"
);

fs.writeFileSync('src/components/VoiceDialog.tsx', code);
