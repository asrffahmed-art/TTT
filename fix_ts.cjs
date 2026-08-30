const fs = require('fs');
let client = fs.readFileSync('src/components/VoiceDialog.tsx', 'utf8');

// The file needs:
// const outputAudioCtxRef = useRef<AudioContext | null>(null);
if (!client.includes('outputAudioCtxRef = useRef')) {
    client = client.replace('const activeAudioRef = useRef<HTMLAudioElement | null>(null);',
        'const activeAudioRef = useRef<HTMLAudioElement | null>(null);\n  const outputAudioCtxRef = useRef<AudioContext | null>(null);');
}

// It needs initOutputCtx
if (client.includes('initOutputCtx();') && !client.includes('const initOutputCtx =')) {
    client = client.replace('const startSession = async () => {',
        `const initOutputCtx = () => {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!outputAudioCtxRef.current) {
        outputAudioCtxRef.current = new AudioCtx();
    }
    if (outputAudioCtxRef.current.state === 'suspended') {
        outputAudioCtxRef.current.resume();
    }
  };\n\n  const startSession = async () => {`);
}

// Wait, the errors are:
// (144,13): error TS2304: Cannot find name 'playAudioChunk'.
// (146,13): error TS2304: Cannot find name 'clearAudioQueue'.
// These were lost? Let's check if they exist in the file.
fs.writeFileSync('src/components/VoiceDialog.tsx', client);
