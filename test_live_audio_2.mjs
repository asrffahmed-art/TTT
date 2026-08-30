import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:3000/api/live-audio?model=gemini-2.5-flash-native-audio-preview-12-2025&voice=Aoede');

let geminiConnected = false;
let audioBytesReceived = 0;
let geminiAudioRms = 0;

ws.on('open', () => {
  console.log('[BROWSER WS] Connected');
});

ws.on('message', (data) => {
  const msgStr = data.toString();
  console.log('[WS RECV MSG]', msgStr.length > 200 ? msgStr.substring(0, 200) + '...' : msgStr);
  const msg = JSON.parse(msgStr);
  
  if (msg.type === 'gemini_connected') {
    geminiConnected = true;
    console.log('[GEMINI CONNECT] PASS');
    
    // Generate a 1 second 440Hz sine wave at 16000Hz, PCM16
    const sampleRate = 16000;
    const numSamples = sampleRate;
    const buffer = new ArrayBuffer(numSamples * 2);
    const view = new DataView(buffer);
    for(let i = 0; i < numSamples; i++) {
        const val = Math.sin(2 * Math.PI * 440 * i / sampleRate);
        const pcm = Math.max(-1, Math.min(1, val));
        view.setInt16(i * 2, pcm < 0 ? pcm * 0x8000 : pcm * 0x7FFF, true);
    }
    
    console.log('[SEND REALTIME INPUT] Sending audio chunks...');
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.length; i += 4096) {
        const chunk = bytes.slice(i, i + 4096);
        const binary = Array.from(chunk).map(b => String.fromCharCode(b)).join('');
        const b64 = btoa(binary);
        ws.send(JSON.stringify({ type: 'audio', data: b64 }));
    }
    // Also send some text to force a response just in case
    ws.send(JSON.stringify({ type: 'text', text: "مرحباً كيف حالك؟" }));
    console.log('[SEND REALTIME INPUT] PASS');
  }
  
  if (msg.type === 'audio_stream') {
    console.log('[GEMINI RESPONSE] PASS');
    const b64 = msg.audio;
    const binary = atob(b64);
    audioBytesReceived += binary.length;
    
    const buffer = new ArrayBuffer(binary.length);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < binary.length; i++) {
        view[i] = binary.charCodeAt(i);
    }
    
    const int16View = new Int16Array(buffer);
    let sumSquares = 0;
    for (let i = 0; i < int16View.length; i++) {
        const s = int16View[i];
        sumSquares += s * s;
    }
    
    const rms = Math.sqrt(sumSquares / int16View.length);
    geminiAudioRms = rms;
    console.log('[GEMINI AUDIO BYTES]', audioBytesReceived);
    console.log('[GEMINI AUDIO RMS]', rms);
    
    setTimeout(() => {
        ws.close();
        process.exit(0);
    }, 1000);
  }
});

ws.on('close', (code, reason) => {
    console.log('[BROWSER WS] Closed', code, reason.toString());
});

ws.on('error', (err) => {
    console.error('[BROWSER WS ERROR]', err);
});

setTimeout(() => {
    console.log('Timeout waiting for response.');
    process.exit(1);
}, 10000);
