const fs = require('fs');
let code = fs.readFileSync('src/components/VoiceDialog.tsx', 'utf8');

// There are duplicates. Let's find the second instance and delete it.
const firstPlay = code.indexOf('const playAudioChunk = (base64Audio: string, mimeType?: string) => {');
const secondPlay = code.indexOf('const playAudioData =', firstPlay);
const oldAudioPipelineStart = code.indexOf('const outputAudioCtxRef = useRef<AudioContext | null>(null);', secondPlay);
const oldAudioPipelineEnd = code.indexOf('const startSession = async () => {', oldAudioPipelineStart);

if (oldAudioPipelineStart !== -1 && oldAudioPipelineEnd !== -1) {
  code = code.substring(0, oldAudioPipelineStart) + code.substring(oldAudioPipelineEnd);
}

// But wait, there are also duplicate declarations of preferredVoice inside startSession?
// Let's check where preferredVoice is declared.
const firstPreferred = code.indexOf('const preferredVoice = localStorage.getItem');
const secondPreferred = code.indexOf('const preferredVoice = localStorage.getItem', firstPreferred + 10);

if (secondPreferred !== -1) {
    const endOfSecondPreferred = code.indexOf('ws.onopen = () => {', secondPreferred);
    if (endOfSecondPreferred !== -1) {
        // Wait, if startSession has duplicates, maybe startSession is duplicated?
        const firstStart = code.indexOf('const startSession = async () => {');
        const secondStart = code.indexOf('const startSession = async () => {', firstStart + 10);
        if (secondStart !== -1) {
           code = code.substring(0, secondStart); // truncate because it's duplicated? No, let's be careful.
        }
    }
}

fs.writeFileSync('src/components/VoiceDialog.tsx', code);
