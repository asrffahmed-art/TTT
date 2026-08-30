const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:3000/api/live-audio?model=gemini-2.5-flash-native-audio-preview-12-2025');

ws.on('open', () => {
  console.log('Connected to THOTH websocket');
  // Send 1 second of silent PCM audio
  const silentPcm = Buffer.alloc(16000 * 2); // 1 sec of 16-bit PCM
  ws.send(JSON.stringify({ type: 'audio', data: silentPcm.toString('base64') }));
});

ws.on('message', (data) => {
  console.log('Received:', data.toString().substring(0, 100));
});

ws.on('error', (err) => {
  console.error('WS Error:', err);
});

ws.on('close', () => {
  console.log('WS closed');
});
