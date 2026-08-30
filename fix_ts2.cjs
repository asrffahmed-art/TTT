const fs = require('fs');
let client = fs.readFileSync('src/components/VoiceDialog.tsx', 'utf8');

const playAudioChunkAndClearQueue = `
  const getSampleRateFromMimeType = (mimeType?: string): number => {
    if (!mimeType) return 24000;
    const match = mimeType.match(/rate=(\\d+)/);
    return match ? Number(match[1]) : 24000;
  };

  const clearAudioQueue = () => {
    if (outputSourceNodeRef.current) {
      try {
        outputSourceNodeRef.current.stop();
      } catch (e) {}
      outputSourceNodeRef.current = null;
    }
  };

  const playAudioChunk = (base64Audio: string, mimeType?: string) => {
    const ctx = outputAudioCtxRef.current;
    if (!ctx) return;
    try {
      const incomingSampleRate = getSampleRateFromMimeType(mimeType);
      const binary = atob(base64Audio);
      const len = binary.length;
      
      console.log("[BROWSER AUDIO]");
      console.log("mimeType=", mimeType || 'unknown');
      console.log("bytes=", len);

      if (len % 2 !== 0) return;
      const buffer = new ArrayBuffer(len);
      const view = new Uint8Array(buffer);
      for (let i = 0; i < len; i++) view[i] = binary.charCodeAt(i);
      
      const int16View = new Int16Array(buffer);
      const float32Data = new Float32Array(int16View.length);
      for (let i = 0; i < int16View.length; i++) {
        float32Data[i] = int16View[i] / 32768.0;
      }
      
      console.log("[AUDIO BUFFER]");
      console.log("sampleRate=", incomingSampleRate);
      console.log("samples=", float32Data.length);
      
      const audioBuffer = ctx.createBuffer(1, float32Data.length, incomingSampleRate);
      audioBuffer.getChannelData(0).set(float32Data);
      console.log("duration=", audioBuffer.duration.toFixed(2));
      
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start();
      console.log("[AUDIO SOURCE STARTED]");
      outputSourceNodeRef.current = source;
      
      source.onended = () => {
        // completed
      };
    } catch(e) {
      console.error(e);
    }
  };
`;

if (!client.includes('const playAudioChunk =')) {
    client = client.replace('const startSession = async () => {', playAudioChunkAndClearQueue + '\n\n  const startSession = async () => {');
}

fs.writeFileSync('src/components/VoiceDialog.tsx', client);
