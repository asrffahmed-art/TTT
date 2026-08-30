const fs = require('fs');
let content = fs.readFileSync('src/components/VoiceDialog.tsx', 'utf8');

// 1. Add import for NativeAudioPlayer
if (!content.includes("import { NativeAudioPlayer }")) {
  content = 'import { NativeAudioPlayer } from "../services/nativeAudioPlayback";\n' + content;
}

// 2. Add NativeAudioPlayer Ref
if (!content.includes('const nativePlayerRef = useRef')) {
  content = content.replace(
    'const outputSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);',
    'const outputSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);\n  const nativePlayerRef = useRef<NativeAudioPlayer>(new NativeAudioPlayer());'
  );
}

// 3. Replace playAudioChunk definition to delegate to nativePlayerRef
const playAudioChunkStart = content.indexOf('const playAudioChunk = (base64Audio: string, mimeType?: string) => {');
const startSessionIndex = content.indexOf('const startSession = async () => {');

if (playAudioChunkStart > -1 && startSessionIndex > -1) {
  const newPlayAudioChunk = `const playAudioChunk = (base64Audio: string, mimeType?: string) => {
    const ctx = outputAudioCtxRef.current;
    if (!ctx) return;
    try {
      nativePlayerRef.current.playChunk(base64Audio, mimeType || "audio/pcm;rate=24000", ctx);
    } catch(e: any) {
      console.error("[VOICE] ERROR IN PLAYBACK DELEGATE", e.message);
    }
  };

  `;
  content = content.slice(0, playAudioChunkStart) + newPlayAudioChunk + content.slice(startSessionIndex);
}

// 4. Replace clearAudioQueue to delegate to nativePlayerRef
const clearAudioQueueRegex = /const clearAudioQueue = \(\) => \{[\s\S]*?\};/m;
const newClearAudioQueue = `const clearAudioQueue = () => {
    nativePlayerRef.current.clearQueue();
  };`;
content = content.replace(clearAudioQueueRegex, newClearAudioQueue);

// 5. Remove handleTestResponse
const testFnIndex = content.indexOf('const handleTestResponse = () => {');
if (testFnIndex > -1) {
  const endTestFnIndex = content.indexOf('};', testFnIndex);
  content = content.slice(0, testFnIndex) + content.slice(endTestFnIndex + 2);
}

// 6. Remove TEST RESPONSE (TEXT ONLY) button from markup
const buttonCodeRegex = /<div className="flex justify-center gap-2 mb-4 shrink-0">[\s\S]*?TEST RESPONSE \(TEXT ONLY\)[\s\S]*?<\/button>\s*<\/div>/m;
content = content.replace(buttonCodeRegex, '');

fs.writeFileSync('src/components/VoiceDialog.tsx', content);
console.log('VoiceDialog.tsx fully updated with shared player.');
