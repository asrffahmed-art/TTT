/**
 * Real-time Gemini Live Audio Service
 * Pure live bidirectional voice streaming via WebSockets with zero text conversions.
 */

import { liveWsUrl } from './wsUrl';

export type LiveAudioState = 'disconnected' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'error';

export interface LiveAudioCallbacks {
  onStateChange: (state: LiveAudioState, error?: string) => void;
  onTranscript?: (text: string, isUser: boolean) => void;
  onVolumeChange?: (volume: number) => void;
}

export class LiveAudioService {
  private ws: WebSocket | null = null;
  private mediaStream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private state: LiveAudioState = 'disconnected';
  private isRunning: boolean = false;
  private callbacks: LiveAudioCallbacks;
  private activeModel: string = 'gemini-3.1-flash-live-preview';

  // Output playback (raw PCM queue via WebAudio)
  private outputAudioCtx: AudioContext | null = null;
  private outputGain: GainNode | null = null;
  private nextPlayTime: number = 0;
  private queuedSources: AudioBufferSourceNode[] = [];

  // Echo protection: mic gating timestamps (ms) — prevents the model from hearing its own voice
  private micOpenTime: number = 0;
  private lastPlaybackEndTime: number = 0;

  constructor(callbacks: LiveAudioCallbacks) {
    this.callbacks = callbacks;
  }

  public getState(): LiveAudioState {
    return this.state;
  }

  private setState(newState: LiveAudioState, errorMsg?: string) {
    this.state = newState;
    this.callbacks.onStateChange(newState, errorMsg);
  }

  public async connect(model: string = 'gemini-3.1-flash-live-preview') {
    if (this.isRunning) {
      this.disconnect();
    }

    this.isRunning = true;
    this.activeModel = model;
    this.setState('connecting');

    try {
      // 1. Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      if (!this.isRunning) {
        this.cleanup();
        return;
      }

      // 2. Connect WebSocket with selected voice
      const preferredVoice = localStorage.getItem('thoth_selected_voice') || 'Puck';
      const wsUrl = liveWsUrl(`/api/live-audio?model=${encodeURIComponent(model)}&voice=${encodeURIComponent(preferredVoice)}`);
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        if (!this.isRunning) return;
        this.setState('listening');
        this.startMicStream();
      };

      this.ws.onmessage = (event) => {
        if (!this.isRunning) return;
        try {
          const msg = JSON.parse(event.data);
          this.handleServerMessage(msg);
        } catch (err) {
          console.error('Error parsing live WS message:', err);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('WebSocket live error:', err);
        if (this.isRunning && this.state !== 'error') {
          this.setState('listening');
        }
      };

      this.ws.onclose = () => {
        if (this.isRunning && this.state !== 'error') {
          this.setState('disconnected');
        }
      };

    } catch (err: any) {
      console.warn('Microphone error:', err);
      let errorMsg = 'تعذر الوصول للميكروفون.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = 'تم رفض صلاحية الميكروفون. يرجى تفعيل صلاحية الميكروفون من شريط العنوان.';
      }
      this.setState('error', errorMsg);
      this.cleanup();
    }
  }

  private startMicStream() {
    if (!this.mediaStream || !this.isRunning) return;

    try {
      // Single native-rate AudioContext for both capture and playback: no audio
      // device reconfiguration (the classic audible pop) when the session starts
      const audioCtx = this.ensureOutputCtx();
      if (!audioCtx) return;
      // Mark mic open time: the first frames contain the mic-open pop/recording-start artifact
      this.micOpenTime = performance.now();

      const source = audioCtx.createMediaStreamSource(this.mediaStream);
      this.scriptProcessor = audioCtx.createScriptProcessor(2048, 1, 1);

      this.scriptProcessor.onaudioprocess = (e) => {
        if (!this.isRunning) return;

        const inputData = e.inputBuffer.getChannelData(0);
        
        // Calculate volume level for visualizer
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        const volLevel = Math.min(100, Math.floor(rms * 400));
        
        if (this.callbacks.onVolumeChange) {
          this.callbacks.onVolumeChange(volLevel);
        }

        const nowMs = performance.now();

        // Drop the mic-open pop / "recording start" artifact so the model never hears it
        if (nowMs - this.micOpenTime < 600) return;

        // Don't send mic audio when the assistant is currently speaking to prevent echo
        if (this.state === 'speaking') {
          this.lastPlaybackEndTime = nowMs;
          return;
        }
        // Short tail after playback ends so speaker echo/reverb decays before mic reopens
        if (nowMs - this.lastPlaybackEndTime < 300) return;

        // Gentle noise gate: skip near-silence so background hum never confuses the model
        if (rms < 0.004) return;

        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        // Downsample from the context's native rate to 16kHz for Gemini Live
        let pcmData = inputData;
        const nativeRate = this.outputAudioCtx ? this.outputAudioCtx.sampleRate : 16000;
        if (nativeRate > 16000 * 1.01) {
          const ratio = nativeRate / 16000;
          const outLen = Math.floor(inputData.length / ratio);
          const down = new Float32Array(outLen);
          for (let i = 0; i < outLen; i++) {
            const start = Math.floor(i * ratio);
            const end = Math.min(Math.floor((i + 1) * ratio), inputData.length);
            let acc = 0;
            for (let j = start; j < end; j++) acc += inputData[j];
            down[i] = acc / Math.max(1, end - start);
          }
          pcmData = down;
        }

        // Send audio PCM chunk directly to server
        const pcmBuffer = this.floatTo16BitPCM(pcmData);
        const base64Audio = this.arrayBufferToBase64(pcmBuffer);

        this.ws.send(JSON.stringify({
          type: 'audio',
          data: base64Audio
        }));
      };

      source.connect(this.scriptProcessor);
      const muteGain = audioCtx.createGain();
      muteGain.gain.value = 0;
      this.scriptProcessor.connect(muteGain);
      muteGain.connect(audioCtx.destination);
    } catch (err) {
      console.error('Error starting mic stream:', err);
    }
  }

  private handleServerMessage(msg: any) {
    if (!this.isRunning) return;

    switch (msg.type) {
      case 'text':
        // Real protocol: model text part from Gemini Live
        this.callbacks.onTranscript?.(msg.text, false);
        break;

      case 'input_text':
        this.callbacks.onTranscript?.(msg.text, true);
        break;

      case 'output_text':
        this.callbacks.onTranscript?.(msg.text, false);
        if (msg.audio) {
          this.playWavData(msg.audio);
        }
        break;

      case 'interrupted':
        this.stopCurrentAudio();
        if (this.isRunning && this.state !== 'error') {
          this.setState('listening');
        }
        break;

      case 'audio':
        // Real protocol: raw PCM chunk (audio/pcm;rate=24000) from Gemini Live passthrough
        if (msg.audio) {
          this.playPcmChunk(msg.audio, msg.mimeType);
        } else if (msg.data) {
          this.playWavData(msg.data);
        }
        break;

      case 'guest_limit_reached':
        this.setState('error', msg.message || 'انتهت مدة الاستخدام اليومية للصوت المباشر');
        this.disconnect();
        break;

      case 'turn_complete':
        break;

      case 'error':
        this.setState('error', msg.error || msg.message || 'حدث خطأ في الجلسة المباشرة');
        break;

      default:
        break;
    }
  }

  private ensureOutputCtx(): AudioContext | null {
    try {
      if (!this.outputAudioCtx || this.outputAudioCtx.state === 'closed') {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.outputAudioCtx = new AudioCtx();
        // Master gain allows smooth fade in/out of playback (no hard-stop clicks)
        const master = this.outputAudioCtx.createGain();
        master.gain.value = 1;
        master.connect(this.outputAudioCtx.destination);
        this.outputGain = master;
        this.nextPlayTime = 0;
      }
      if (this.outputAudioCtx.state === 'suspended') {
        this.outputAudioCtx.resume().catch(() => {});
      }
      return this.outputAudioCtx;
    } catch (err) {
      return null;
    }
  }

  private base64ToUint8(base64Data: string): Uint8Array {
    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  /** Plays a raw PCM16 chunk (audio/pcm;rate=NNNNN) through a queued WebAudio graph. */
  private playPcmChunk(base64Data: string, mimeType?: string) {
    if (!this.isRunning || !base64Data) return;

    try {
      const rateMatch = /rate=(\d+)/.exec(mimeType || '');
      const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;

      const bytes = this.base64ToUint8(base64Data);
      if (bytes.byteLength < 2) return;

      const int16 = new Int16Array(bytes.buffer, 0, Math.floor(bytes.byteLength / 2));
      if (int16.length === 0) return;

      const ctx = this.ensureOutputCtx();
      if (!ctx) return;

      const float32Data = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32Data[i] = int16[i] / 32768.0;
      }

      const currentTime = ctx.currentTime;
      // If queue is empty or lagged behind, sync playback time to current time + 20ms
      if (this.queuedSources.length === 0 || this.nextPlayTime < currentTime) {
        this.nextPlayTime = currentTime + 0.02;
        // Speech onset click guard: tiny 5ms fade-in on the first samples of a fresh burst
        const fadeLen = Math.min(120, float32Data.length);
        for (let i = 0; i < fadeLen; i++) {
          float32Data[i] *= i / fadeLen;
        }
      }

      const audioBuffer = ctx.createBuffer(1, float32Data.length, sampleRate);
      audioBuffer.getChannelData(0).set(float32Data);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.outputGain || ctx.destination);

      const startTime = this.nextPlayTime;
      source.start(startTime);
      this.setState('speaking');

      source.onended = () => {
        this.queuedSources = this.queuedSources.filter(s => s !== source);
        if (this.queuedSources.length === 0 && this.isRunning) {
          this.lastPlaybackEndTime = performance.now();
          this.setState('listening');
        }
      };

      this.queuedSources.push(source);
      this.nextPlayTime = startTime + audioBuffer.duration;
    } catch (err) {
      console.warn('PCM playback notice:', err);
    }
  }

  /** Legacy path: plays a full WAV file (base64) as an HTMLAudio element. */
  private playWavData(base64Data: string) {
    if (!this.isRunning || !base64Data) return;

    this.stopCurrentAudio();
    this.setState('speaking');

    try {
      const audio = new Audio(`data:audio/wav;base64,${base64Data}`);
      this.currentAudio = audio;

      const finish = () => {
        this.lastPlaybackEndTime = performance.now();
        this.currentAudio = null;
        if (this.isRunning && this.queuedSources.length === 0) {
          this.setState('listening');
        }
      };

      audio.onended = finish;
      audio.onerror = finish;
      audio.play().catch(finish);
    } catch (err) {
      this.currentAudio = null;
      if (this.isRunning) {
        this.setState('listening');
      }
    }
  }

  public stopCurrentAudio() {
    if (this.queuedSources.length > 0) {
      const sources = this.queuedSources;
      this.queuedSources = [];
      this.lastPlaybackEndTime = performance.now();
      const ctx = this.outputAudioCtx;
      const master = this.outputGain;
      if (ctx && master && ctx.state !== 'closed') {
        // Fade out over ~12ms before stopping so interrupts never click
        const now = ctx.currentTime;
        try {
          master.gain.cancelScheduledValues(now);
          master.gain.setValueAtTime(master.gain.value, now);
          master.gain.linearRampToValueAtTime(0.0001, now + 0.012);
        } catch (e) {}
        setTimeout(() => {
          sources.forEach(source => {
            try { source.stop(); } catch (e) {}
          });
          try {
            if (ctx.state !== 'closed') {
              const t = ctx.currentTime;
              master.gain.cancelScheduledValues(t);
              master.gain.setValueAtTime(1, t);
            }
          } catch (e) {}
        }, 20);
        this.nextPlayTime = ctx.currentTime;
      } else {
        sources.forEach(source => {
          try { source.stop(); } catch (e) {}
        });
      }
    }
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio.src = '';
      } catch (e) {}
      this.currentAudio = null;
    }
  }

  public disconnect() {
    this.isRunning = false;
    this.state = 'disconnected';
    this.stopCurrentAudio();

    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {}
      this.ws = null;
    }

    this.cleanup();
    this.callbacks.onStateChange('disconnected');
  }

  private cleanup() {
    if (this.scriptProcessor) {
      try {
        this.scriptProcessor.disconnect();
      } catch (e) {}
      this.scriptProcessor = null;
    }

    if (this.outputAudioCtx) {
      try {
        this.outputAudioCtx.close().catch(() => {});
      } catch (e) {}
      this.outputAudioCtx = null;
    }
    this.outputGain = null;
    this.queuedSources = [];

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {}
      });
      this.mediaStream = null;
    }
  }

  private floatTo16BitPCM(input: Float32Array): ArrayBuffer {
    const output = new DataView(new ArrayBuffer(input.length * 2));
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return output.buffer;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}
