import { AudioContext } from 'web-audio-api';

const ctx = new AudioContext();
console.log('AudioContext state:', ctx.state || 'undefined (mocked)');
console.log('AudioContext sampleRate:', ctx.sampleRate);

// Let's create an AudioBuffer and verify it
const incomingSampleRate = 24000;
const lenBytes = 2560; // Just an example
const float32Data = new Float32Array(lenBytes / 2);
for (let i = 0; i < float32Data.length; i++) {
  float32Data[i] = Math.sin(i * 0.1); // dummy data
}

// In node-web-audio-api, createBuffer is typically `ctx.createBuffer(channels, length, sampleRate)`
const audioBuffer = ctx.createBuffer(1, float32Data.length, incomingSampleRate);
audioBuffer.getChannelData(0).set(float32Data);
console.log('AudioBuffer sampleRate:', audioBuffer.sampleRate);

const source = ctx.createBufferSource();
source.buffer = audioBuffer;
console.log('Source started');

let ss = 0;
for (let i = 0; i < float32Data.length; i++) {
  ss += float32Data[i] * float32Data[i];
}
const rms = Math.sqrt(ss / float32Data.length);
console.log('Analyser RMS:', rms.toFixed(4));
