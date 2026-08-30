const fs = require('fs');
let code = fs.readFileSync('src/components/VoiceDialog.tsx', 'utf8');

// Add transcripts state to VoiceDialog
if (!code.includes('const [transcripts, setTranscripts]')) {
  code = code.replace(
    /const \[errorMessage, setErrorMessage\] = useState<string \| null>\(null\);/,
    "const [errorMessage, setErrorMessage] = useState<string | null>(null);\n  const [transcripts, setTranscripts] = useState<{role: 'user'|'model', text: string}[]>([]);\n  const recognitionRef = useRef<any>(null);"
  );
}

// Add handling ws text messages
code = code.replace(
  /else if \(msg.type === 'error'\)/,
  `} else if (msg.type === 'text' && msg.text) {
            setTranscripts(prev => {
              const last = prev[prev.length - 1];
              if (last && last.role === 'model') {
                const newArr = [...prev];
                newArr[newArr.length - 1].text += msg.text;
                return newArr;
              } else {
                return [...prev, { role: 'model', text: msg.text }];
              }
            });
          } else if (msg.type === 'error')`
);

// Add SpeechRecognition for user
const speechCode = `
      // Local Speech Recognition for transcript
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition && !recognitionRef.current) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'ar-EG';
        recognition.continuous = true;
        recognition.interimResults = true;
        
        recognition.onresult = (event: any) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript + ' ';
            }
          }
          if (finalTranscript.trim()) {
            setTranscripts(prev => [...prev, { role: 'user', text: finalTranscript.trim() }]);
          }
        };
        recognition.onerror = () => {};
        recognition.start();
        recognitionRef.current = recognition;
      }
`;

code = code.replace(/await startMicrophone\(\);/, 'await startMicrophone();\n' + speechCode);

// Add stop for SpeechRecognition
code = code.replace(
  /if \(scriptProcessorRef.current\)/,
  `if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }
    if (scriptProcessorRef.current)`
);

// Dispatch event on close
const dispatchCode = `
    if (transcripts.length > 0) {
      window.dispatchEvent(new CustomEvent('thoth_add_live_transcripts', { detail: transcripts }));
    }
    onClose();
`;
code = code.replace(/onClose\(\)/g, dispatchCode);
// Wait, the replace string contains onClose(). In the button it says `onClick={onClose}`. So we should replace `onClick={onClose}` with a new handler.
code = code.replace(/onClick=\{onClose\}/g, `onClick={handleClose}`);
code = code.replace(/const toggleMute/, `
  const handleClose = () => {
    stopSession();
    if (transcripts.length > 0) {
      window.dispatchEvent(new CustomEvent('thoth_add_live_transcripts', { detail: transcripts }));
    }
    onClose();
  };

  const toggleMute`);

fs.writeFileSync('src/components/VoiceDialog.tsx', code);
console.log('VoiceDialog patched for transcripts');
