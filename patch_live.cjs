const fs = require('fs');
let code = fs.readFileSync('src/components/LiveTranslate.tsx', 'utf8');

// Add useRef to import if not present
if (!code.includes('useRef')) {
  code = code.replace(/import React, {([^}]*)} from 'react';/, "import React, { $1, useRef } from 'react';");
  if (!code.includes('useRef')) {
    code = code.replace("import { useState", "import { useState, useRef");
  }
}

// Add refs inside component
const refToAdd = `
  const mediaRecorderRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
`;
code = code.replace('const [isRecording, setIsRecording] = useState(false);', 'const [isRecording, setIsRecording] = useState(false);\n' + refToAdd);

const newVoiceInput = `  const handleVoiceInput = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try { mediaRecorderRef.current.stop(); } catch(e) {}
      }
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result;
          
          try {
            setSourceText(prev => prev ? prev + ' (جاري الاستماع...)' : '(جاري الاستماع...)');
            const res = await fetch('/api/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audioData: base64Audio })
            });
            const data = await res.json();
            setSourceText(prev => {
              const clean = prev.replace(' (جاري الاستماع...)', '').replace('(جاري الاستماع...)', '').trim();
              return clean ? clean + ' ' + data.text : data.text;
            });
          } catch (e) {
            console.error('Transcription error:', e);
            alert('حدث خطأ أثناء تحويل الصوت إلى نص.');
            setSourceText(prev => prev.replace(' (جاري الاستماع...)', '').replace('(جاري الاستماع...)', '').trim());
          } finally {
             stream.getTracks().forEach(track => track.stop());
          }
        };
      };

      mediaRecorder.start();
      setIsRecording(true);

    } catch (err) {
      console.warn('Error accessing microphone:', err);
      alert('يرجى السماح بالوصول للميكروفون من إعدادات المتصفح للتمكن من التحدث.');
      setIsRecording(false);
    }
  };`;

const startIdx = code.indexOf('const handleVoiceInput = () => {');
const endIdx = code.indexOf('return (', startIdx);
if (startIdx !== -1 && endIdx !== -1) {
  code = code.substring(0, startIdx) + newVoiceInput + '\n\n  ' + code.substring(endIdx);
}

fs.writeFileSync('src/components/LiveTranslate.tsx', code);
console.log('Live patched successfully');
