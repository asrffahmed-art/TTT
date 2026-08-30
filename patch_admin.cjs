const fs = require('fs');
let content = fs.readFileSync('src/components/admin/AdminAudioDiagnostics.tsx', 'utf8');

// 1. Add import
if (!content.includes('import { NativeAudioPlayer }')) {
  content = "import { NativeAudioPlayer } from '../../services/nativeAudioPlayback';\n" + content;
}

// 2. Add player ref
if (!content.includes('const nativePlayerRef')) {
  content = content.replace(
    'const outputAudioCtxRef = useRef(null);',
    'const outputAudioCtxRef = useRef(null);\n  const nativePlayerRef = useRef(new NativeAudioPlayer());'
  );
}

// 3. Replace play in testGeminiAudio ws.onmessage
const startStr = "addLog('GEMINI', `MIME TYPE = ${msg.mimeType}`);";
const endStr = "addLog('PLAYBACK', 'Source.start = PASS');";

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr);

if (startIndex > -1 && endIndex > -1) {
  // Find the closing block of the try/catch or keep analyser
  // Actually, we can just replace the whole try/catch block inside that "else if (msg.type === 'audio_stream' && msg.audio)"
  // Let's look at the try block structure:
  // try { const binary = atob(msg.audio); ... } catch(e) { addLog('PLAYBACK', `PCM DECODE = FAIL (${e.message})`); }
  const blockStart = content.indexOf('try {', startIndex);
  // find the corresponding catch block end
  const blockEnd = content.indexOf('} catch (e) {', blockStart);
  const catchEnd = content.indexOf('}', blockEnd + 15); // after catch (e) { ... }
  
  const replacement = `try {
          addLog('TEST', '--- Gemini Playback Test via NativeAudioPlayer ---');
          nativePlayerRef.current.playChunk(msg.audio, msg.mimeType, ctx);
          addLog('PLAYBACK', 'AudioBuffer scheduled & played = PASS');
        } catch (e) {
          addLog('PLAYBACK', \`PCM DECODE = FAIL (\${e.message})\`);
        }`;
        
  content = content.slice(0, blockStart) + replacement + content.slice(catchEnd + 1);
  console.log("AdminAudioDiagnostics patched successfully!");
} else {
  console.log("Could not find start/end indices in AdminAudioDiagnostics.tsx", startIndex, endIndex);
}

fs.writeFileSync('src/components/admin/AdminAudioDiagnostics.tsx', content);
