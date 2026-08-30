const fs = require('fs');
let content = fs.readFileSync('src/components/VoiceDialog.tsx', 'utf8');

const testFn = `  const handleTestResponse = () => {
    console.log("[VOICE TEST] SENDING TEXT TO WS");
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'text', text: 'قل مرحباً هذا اختبار.' }));
      setVoiceState('listening');
    } else {
      console.log("[VOICE TEST] WS NOT OPEN");
    }
  };

`;

const startSessionIndex = content.indexOf('const startSession = async () => {');
if (startSessionIndex > -1) {
    content = content.slice(0, startSessionIndex) + testFn + content.slice(startSessionIndex);
}

const btnCode = `      <div className="flex justify-center gap-2 mb-4 shrink-0">
        <button onClick={handleTestResponse} className="bg-blue-600/30 text-blue-300 border border-blue-500/50 px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-600/50 transition-all">
          TEST RESPONSE (TEXT ONLY)
        </button>
      </div>`;

const targetBtn = '<div className="flex flex-col items-center justify-center p-6 bg-[#121624]/80 rounded-3xl border border-white/10 mb-4 shadow-2xl relative overflow-hidden shrink-0">';
content = content.replace(targetBtn, btnCode + '\n      ' + targetBtn);

fs.writeFileSync('src/components/VoiceDialog.tsx', content);
console.log('Test button added.');
