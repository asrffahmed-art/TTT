/**
 * Real-time Gemini Live Audio Service
 * Pure live bidirectional voice streaming via WebSockets with zero text conversions.
 */

export type LiveAudioState = 'disconnected' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'error';

export interface LiveAudioCallbacks {
  onStateChange: (state: LiveAudioState, error?: string) => void;
  onTranscript?: (text: string, isUser: boolean) => void;
  onVolumeChange?: (volume: number) => void;
}

export class LiveAudioService {
  private ws: WebSocket | null = null;
  private mediaStream: MediaStream | null = null;
  private inputAudioCtx: AudioContext | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private state: LiveAudioState = 'disconnected';
  private isRunning: boolean = false;
  private callbacks: LiveAudioCallbacks;
  private activeModel: string = 'gemini-3.1-flash-live-preview';

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
          sampleRate: 16000,
          sampleSize: 16,
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
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/live-audio?model=${encodeURIComponent(model)}&voice=${encodeURIComponent(preferredVoice)}`;
      
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
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.inputAudioCtx = new AudioCtx({ sampleRate: 16000 });
      if (this.inputAudioCtx.state === 'suspended') {
        this.inputAudioCtx.resume();
      }

      const source = this.inputAudioCtx.createMediaStreamSource(this.mediaStream);
      this.scriptProcessor = this.inputAudioCtx.createScriptProcessor(2048, 1, 1);

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

        // Don't send mic audio when the assistant is currently speaking to prevent echo
        if (this.state === 'speaking') return;

        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        // Send audio PCM chunk directly to server
        const pcmBuffer = this.floatTo16BitPCM(inputData);
        const base64Audio = this.arrayBufferToBase64(pcmBuffer);

        this.ws.send(JSON.stringify({
          type: 'audio',
          data: base64Audio
        }));
      };

      source.connect(this.scriptProcessor);
      const muteGain = this.inputAudioCtx.createGain();
      muteGain.gain.value = 0;
      this.scriptProcessor.connect(muteGain);
      muteGain.connect(this.inputAudioCtx.destination);
    } catch (err) {
      console.error('Error starting mic stream:', err);
    }
  }

  private handleServerMessage(msg: any) {
    if (!this.isRunning) return;

    switch (msg.type) {
      case 'state':
        if (msg.state === 'thinking') {
          this.setState('thinking');
        }
        break;

      case 'input_text':
        this.callbacks.onTranscript?.(msg.text, true);
        break;

      case 'output_text':
        this.callbacks.onTranscript?.(msg.text, false);
        if (msg.audio) {
          this.playAudioData(msg.audio, 'audio/wav');
        }
        break;

      case 'audio':
        if (msg.data) {
          this.playAudioData(msg.data, 'audio/wav');
        }
        break;

      case 'turn_complete':
        break;

      case 'error':
        this.setState('error', msg.error || 'حدث خطأ في الجلسة المباشرة');
        break;

      default:
        break;
    }
  }

  private playAudioData(base64Data: string, mimeType: string = 'audio/wav') {
    if (!this.isRunning) return;

    this.stopCurrentAudio();
    this.setState('speaking');

    try {
      const audio = new Audio(`data:${mimeType};base64,${base64Data}`);
      this.currentAudio = audio;

      audio.onended = () => {
        this.currentAudio = null;
        if (this.isRunning) {
          this.setState('listening');
        }
      };

      audio.onerror = () => {
        this.currentAudio = null;
        if (this.isRunning) {
          this.setState('listening');
        }
      };

      audio.play().catch(() => {
        this.currentAudio = null;
        if (this.isRunning) {
          this.setState('listening');
        }
      });
    } catch (err) {
      this.currentAudio = null;
      if (this.isRunning) {
        this.setState('listening');
      }
    }
  }

  public stopCurrentAudio() {
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

    if (this.inputAudioCtx) {
      try {
        this.inputAudioCtx.close();
      } catch (e) {}
      this.inputAudioCtx = null;
    }

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
