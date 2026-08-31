/**
 * Real-time Gemini Live Audio Service (chat live modal)
 * Pure live bidirectional voice streaming via WebSockets with zero text conversions.
 *
 * All audio plumbing (capture, playback, echo guards, teardown) now lives in
 * LiveCallEngine — the call-grade engine shared by the whole platform. This
 * class keeps the exact same public API and WS protocol as before, so no
 * caller, server route, quota or model behaviour changes.
 */

import { liveWsUrl } from './wsUrl';
import { LiveCallEngine } from './liveCallEngine';

export type LiveAudioState = 'disconnected' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'error';

export interface LiveAudioCallbacks {
  onStateChange: (state: LiveAudioState, error?: string) => void;
  onTranscript?: (text: string, isUser: boolean) => void;
  onVolumeChange?: (volume: number) => void;
}

export class LiveAudioService {
  private engine: LiveCallEngine;
  private currentAudio: HTMLAudioElement | null = null;
  private state: LiveAudioState = 'disconnected';
  private isRunning: boolean = false;
  private callbacks: LiveAudioCallbacks;
  private activeModel: string = 'gemini-3.1-flash-live-preview';

  constructor(callbacks: LiveAudioCallbacks) {
    this.callbacks = callbacks;
    this.engine = new LiveCallEngine({
      onMessage: (msg) => this.handleServerMessage(msg),
      onState: (s, error) => {
        if (s === 'error' && this.isRunning) {
          this.setState('error', error || 'حدث خطأ في الجلسة المباشرة');
        }
      },
      onPlaybackEnded: () => {
        if (this.isRunning && this.state === 'speaking') {
          this.setState('listening');
        }
      }
    });
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
      // Connect WebSocket with selected voice
      const preferredVoice = localStorage.getItem('thoth_selected_voice') || 'Puck';
      const wsUrl = liveWsUrl(`/api/live-audio?model=${encodeURIComponent(model)}&voice=${encodeURIComponent(preferredVoice)}`);

      await this.engine.connect(wsUrl);
      if (!this.isRunning) return;
      this.setState('listening');

      // Engine capture is idempotent per session — duplicated live_ready or a
      // second call here never duplicates the mic stream
      await this.engine.startCapture();
    } catch (err: any) {
      console.warn('Microphone error:', err);
      let errorMsg = 'تعذر الوصول للميكروفون.';
      const name = String(err?.name || '');
      const m = String(err?.message || '');
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || m.includes('NotAllowedError')) {
        errorMsg = 'تم رفض صلاحية الميكروفون. يرجى تفعيل صلاحية الميكروفون من شريط العنوان.';
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || m.includes('NotFoundError')) {
        errorMsg = 'لم يتم العثور على ميكروفون متصل بجهازك.';
      } else if (m.includes('timeout') || m.includes('connection')) {
        errorMsg = 'تعذر الاتصال بالخادم الصوتي المباشر.';
      }
      this.setState('error', errorMsg);
      this.disconnect();
    }
  }

  private handleServerMessage(msg: any) {
    if (!this.isRunning) return;

    switch (msg.type) {
      case 'text':
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
        // Raw PCM chunk (audio/pcm;rate=24000) from Gemini Live passthrough
        if (msg.audio) {
          this.engine.playPcm(msg.audio, msg.mimeType);
          this.setState('speaking');
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

      case 'ws_closed':
        if (this.isRunning && this.state !== 'error') {
          this.setState('disconnected');
        }
        break;

      case 'error':
        this.setState('error', msg.error || msg.message || 'حدث خطأ في الجلسة المباشرة');
        break;

      default:
        break;
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
        this.currentAudio = null;
        if (this.isRunning && this.state === 'speaking') {
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
    try { this.engine.stopPlayback(); } catch (e) {}
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
    try { this.engine.stop(true); } catch (e) {}
    if (this.currentAudio) {
      try { this.currentAudio.pause(); } catch (e) {}
      this.currentAudio = null;
    }
    this.callbacks.onStateChange('disconnected');
  }
}
