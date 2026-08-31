/**
 * LiveCallEngine — call-grade audio engine for Gemini Live (built from scratch,
 * following the official Gemini Live web-sample architecture).
 *
 * Design (mirrors how Claude / Gemini / ChatGPT ship live voice on the web):
 *  - One WebSocket transport, generation-guarded: every restart bumps a session
 *    generation; any async callback from an older generation is dropped, so a
 *    closed call can never keep sending or playing audio.
 *  - Capture: dedicated 16 kHz AudioContext + AudioWorkletNode (the official
 *    replacement for the deprecated ScriptProcessor) with an automatic
 *    native-rate fallback (cubic resampler) for devices whose Chrome delivers
 *    silent input on forced-rate contexts.
 *  - Playback: scheduled AudioBufferSourceNodes (24 kHz PCM) on the default-rate
 *    output context with a 150 ms jitter pre-buffer, 5 ms onset fade-in and a
 *    12 ms master fade-out on interrupts (no clicks).
 *  - Call behaviour: browser Wake Lock while the call is live (screen stays on,
 *    like a real call) + MediaSession playback state (the OS treats the tab as
 *    an active media/call session). The mic-in-use pill is provided by the
 *    browser itself.
 *  - Half-duplex echo guard: the mic never streams while the assistant's queue
 *    is playing (with a staleness sweep so a lost `onended` can never deadlock
 *    the mic), a 600 ms mic-open pop filter and a gentle noise gate.
 *
 * The engine is protocol-agnostic: it only speaks
 *   out: { type: 'audio', audio: <b64>, mimeType: 'audio/pcm;rate=16000' } / { type: 'stop' }
 *   in : raw JSON messages passed to onMessage (audio / text / interrupted /
 *        live_ready / guest_status / guest_limit_reached / error ...)
 * No model, prompt, server, quota or database behaviour is changed here.
 */

export type CallEngineState = 'idle' | 'connecting' | 'live' | 'stopped' | 'error';

export interface LiveCallEngineCallbacks {
  /** Every JSON message from the server (raw protocol passthrough). */
  onMessage: (msg: any) => void;
  /** Transport-level state changes. */
  onState: (state: CallEngineState, error?: string) => void;
  /** Mic input level 0..100 (for visualizers). */
  onMicLevel?: (level: number) => void;
  /** All scheduled playback finished playing. */
  onPlaybackEnded?: () => void;
}

const INPUT_RATE = 16000;
const OUTPUT_CHUNK_RATE = 24000;
const MIC_OPEN_FILTER_MS = 600;   // drop the mic-open "recording start" pop
const PLAYBACK_TAIL_MS = 300;     // speaker echo decay before mic reopens
const NOISE_GATE_RMS = 0.004;     // skip near-silence so hum never confuses the model
const JITTER_PREBUFFER_S = 0.15;  // initial play delay per speech burst (anti-stutter)
const STALE_QUEUE_S = 0.25;       // queue finished this long ago -> force-unblock mic

// Inline AudioWorklet processor: buffers 2048 samples (~43 ms @48k, ~128 ms @16k)
// then posts {rms, data} to the main thread. Runs on the real-time audio thread.
const WORKLET_SRC = `
class ThothCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._size = 2048;
    this._buf = new Float32Array(this._size);
    this._idx = 0;
    this._sum = 0;
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    const b = this._buf, size = this._size;
    let r = this._idx;
    for (let i = 0; i < ch.length; i++) {
      const s = ch[i];
      this._sum += s * s;
      b[r++] = s;
      if (r >= size) {
        const rms = Math.sqrt(this._sum / size);
        this._sum = 0;
        this.port.postMessage({ rms, data: b.slice(0) });
        r = 0;
      }
    }
    this._idx = r;
    return true;
  }
}
registerProcessor('thoth-capture-processor', ThothCaptureProcessor);
`;

/** Cubic Hermite resampler — used only by the native-rate fallback path. */
function resampleTo16k(input: Float32Array, inRate: number): Float32Array {
  if (Math.abs(inRate - INPUT_RATE) < 1) return input;
  const ratio = inRate / INPUT_RATE;
  const outLen = Math.floor(input.length / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const t = i * ratio;
    const i1 = Math.floor(t);
    const p = t - i1;
    const x0 = input[Math.max(0, i1 - 1)];
    const x1 = input[i1];
    const x2 = input[Math.min(input.length - 1, i1 + 1)];
    const x3 = input[Math.min(input.length - 1, i1 + 2)];
    const a = -0.5 * x0 + 1.5 * x1 - 1.5 * x2 + 0.5 * x3;
    const b = x0 - 2.5 * x1 + 2 * x2 - 0.5 * x3;
    const c = -0.5 * x0 + 0.5 * x2;
    out[i] = ((a * p + b) * p + c) * p + x1;
  }
  return out;
}

export class LiveCallEngine {
  private cb: LiveCallEngineCallbacks;
  private gen = 0;
  private state: CallEngineState = 'idle';

  private ws: WebSocket | null = null;
  private micStream: MediaStream | null = null;

  private inCtx: AudioContext | null = null;
  private worklet: AudioWorkletNode | null = null;
  private legacyProcessor: ScriptProcessorNode | null = null;
  private legacySource: MediaStreamAudioSourceNode | null = null;
  private legacyMute: GainNode | null = null;
  private workletSource: MediaStreamAudioSourceNode | null = null;

  private outCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private nextPlayTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];

  private micOpenTime = 0;
  private lastPlaybackEnd = 0;
  private muted = false;
  private captureStartedForGen = 0;
  private usingNativeFallback = false;
  private wakeLock: any = null;

  /** Live counters — exposed on window.__thothLive by consumers for debugging. */
  public stats = {
    micFrames: 0, sent: 0, sentBytes: 0, blockedFrames: 0, silentFrames: 0,
    received: 0, playedChunks: 0, underruns: 0, interrupts: 0, fallbacks: 0,
    lastSendAgoMs: 0, lastSendAt: 0
  };

  constructor(cb: LiveCallEngineCallbacks) {
    this.cb = cb;
  }

  public get currentGen(): number {
    return this.gen;
  }

  public get hasPlaybackQueue(): boolean {
    return this.activeSources.length > 0;
  }

  /** Mute the mic stream without tearing the call down. */
  public setMuted(m: boolean): void {
    this.muted = m;
  }

  private setState(s: CallEngineState, error?: string) {
    this.state = s;
    this.cb.onState(s, error);
  }

  // ---------------------------------------------------------------- transport

  /** Opens the WebSocket. Resolves once open; rejects on error/timeout. */
  public connect(url: string): Promise<void> {
    const gen = ++this.gen;
    this.teardownTransportOnly();
    this.setState('connecting');
    return new Promise((resolve, reject) => {
      let settled = false;
      const ws = new WebSocket(url);
      this.ws = ws;
      const timer = setTimeout(() => {
        if (!settled) { settled = true; reject(new Error('timeout')); try { ws.close(); } catch {} }
      }, 20000);

      ws.onopen = () => {
        if (gen !== this.gen) return;
        clearTimeout(timer);
        if (!settled) { settled = true; resolve(); }
      };
      ws.onerror = () => {
        if (gen !== this.gen) return;
        clearTimeout(timer);
        if (!settled) { settled = true; reject(new Error('connection-failed')); }
        this.cb.onState('error', 'تعذر الاتصال بالخادم الصوتي المباشر');
      };
      ws.onclose = (e) => {
        if (gen !== this.gen) return;
        this.cb.onMessage({ type: 'ws_closed', code: e.code, reason: e.reason });
      };
      ws.onmessage = (ev) => {
        if (gen !== this.gen) return;
        let msg: any;
        try { msg = JSON.parse(ev.data); } catch { return; }
        this.stats.received++;
        this.cb.onMessage(msg);
      };
    });
  }

  public sendRaw(obj: any): boolean {
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    try { ws.send(JSON.stringify(obj)); return true; } catch { return false; }
  }

  // ------------------------------------------------------------------ capture

  /**
   * Starts mic capture (idempotent per session generation — calling it twice
   * for the same call is a no-op, which makes duplicated `live_ready` messages
   * from the server harmless).
   */
  public async startCapture(): Promise<void> {
    if (this.captureStartedForGen === this.gen) return; // idempotent
    this.captureStartedForGen = this.gen;
    const gen = this.gen;

    // 1. Mic (call-grade processing: AEC + NS + AGC are what make the browser
    //    treat this as a call and stop the model from hearing itself)
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
    if (gen !== this.gen) {
      stream.getTracks().forEach(t => { try { t.stop(); } catch {} });
      return;
    }
    this.micStream = stream;
    this.micOpenTime = performance.now();
    this.requestWakeLock();

    // 2. Input graph — 16 kHz context + AudioWorklet (official architecture),
    //    with one automatic retry in native-rate mode if the device yields
    //    silence on forced-rate contexts (known Chrome quirk on some phones).
    try {
      await this.buildCaptureGraph(gen, false);
    } catch (err) {
      console.warn('[LiveCallEngine] worklet capture failed, trying legacy path:', err);
      await this.buildCaptureGraph(gen, true);
    }
    if (gen !== this.gen) return;
  }

  private async buildCaptureGraph(gen: number, legacy: boolean): Promise<void> {
    const stream = this.micStream;
    if (!stream) return;
    this.destroyCaptureNodes();

    const AudioCtxCtor = window.AudioContext || (window as any).webkitAudioContext;
    const inCtx = new AudioCtxCtor({ sampleRate: INPUT_RATE });
    if (inCtx.state === 'suspended') {
      try { await inCtx.resume(); } catch {}
    }
    if (gen !== this.gen) {
      try { inCtx.close(); } catch {}
      return;
    }
    this.inCtx = inCtx;

    const source = inCtx.createMediaStreamSource(stream);

    if (!legacy && inCtx.audioWorklet) {
      const blob = new Blob([WORKLET_SRC], { type: 'application/javascript' });
      const moduleUrl = URL.createObjectURL(blob);
      try {
        await inCtx.audioWorklet.addModule(moduleUrl);
      } finally {
        URL.revokeObjectURL(moduleUrl);
      }
      if (gen !== this.gen) return;
      const worklet = new AudioWorkletNode(inCtx, 'thoth-capture-processor', {
        numberOfInputs: 1, numberOfOutputs: 1,
        outputChannelCount: [1]
      });
      worklet.port.onmessage = (ev) => this.handleMicFrame(ev.data.data as Float32Array, ev.data.rms as number, inCtx.sampleRate, gen);
      source.connect(worklet);
      // Muted output keeps the graph pulled in every browser
      const sink = inCtx.createGain();
      sink.gain.value = 0;
      worklet.connect(sink);
      sink.connect(inCtx.destination);
      this.worklet = worklet;
      this.workletSource = source;
    } else {
      const processor = inCtx.createScriptProcessor(2048, 1, 1);
      processor.onaudioprocess = (e) => {
        const d = e.inputBuffer.getChannelData(0);
        let sum = 0;
        for (let i = 0; i < d.length; i++) sum += d[i] * d[i];
        this.handleMicFrame(new Float32Array(d), Math.sqrt(sum / d.length), inCtx.sampleRate, gen);
      };
      source.connect(processor);
      const sink = inCtx.createGain();
      sink.gain.value = 0;
      processor.connect(sink);
      sink.connect(inCtx.destination);
      this.legacyProcessor = processor;
      this.legacySource = source;
      this.legacyMute = sink;
    }
  }

  private handleMicFrame(data: Float32Array, rms: number, ctxRate: number, gen: number) {
    if (gen !== this.gen) return;
    if (this.muted) return;
    this.stats.micFrames++;

    this.cb.onMicLevel?.(Math.min(100, Math.floor(rms * 400)));

    const nowMs = performance.now();
    if (nowMs - this.micOpenTime < MIC_OPEN_FILTER_MS) return;

    // Half-duplex echo guard: never stream while the assistant plays, but with
    // a staleness sweep so a lost onended handler can never deadlock the mic.
    if (this.activeSources.length > 0) {
      const out = this.outCtx;
      const queueDone = !out || out.state === 'closed' || this.nextPlayTime < out.currentTime - STALE_QUEUE_S;
      if (queueDone) {
        this.activeSources.forEach(s => { try { s.onended = null; s.stop(); } catch {} });
        this.activeSources = [];
      } else {
        this.stats.blockedFrames++;
        this.lastPlaybackEnd = nowMs;
        return;
      }
    }
    if (nowMs - this.lastPlaybackEnd < PLAYBACK_TAIL_MS) return;

    // Gentle noise gate
    if (rms < NOISE_GATE_RMS) {
      this.stats.silentFrames++;
      return;
    }

    const pcm = this.usingNativeFallback ? resampleTo16k(data, ctxRate) : data;
    const bytes = new Uint8Array(pcm.length * 2);
    const view = new DataView(bytes.buffer);
    for (let i = 0; i < pcm.length; i++) {
      const s = Math.max(-1, Math.min(1, pcm[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    let binary = '';
    const CHUNK = 8192;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)) as any);
    }
    const ok = this.sendRaw({
      type: 'audio',
      audio: window.btoa(binary),
      mimeType: `audio/pcm;rate=${INPUT_RATE}`
    });
    if (ok) {
      this.stats.sent++;
      this.stats.sentBytes += bytes.length;
      this.stats.lastSendAt = nowMs;
    }

    if (gen !== this.gen) return;
    this.scheduleFallbackCheck(gen);
  }

  private scheduleFallbackCheck(gen: number) {
    // After ~2 s of capture, if every frame was silence, rebuild natively once.
    setTimeout(() => {
      if (gen !== this.gen || this.usingNativeFallback) return;
      if (this.stats.micFrames >= 20 && this.stats.silentFrames >= this.stats.micFrames - 2 && this.stats.sent === 0) {
        console.warn('[LiveCallEngine] silent forced-rate input detected — switching to native-rate capture');
        this.usingNativeFallback = true;
        this.stats.fallbacks++;
        this.micOpenTime = performance.now();
        this.buildCaptureGraph(gen, true).catch(() => {});
      }
    }, 2200);
  }

  // ----------------------------------------------------------------- playback

  /** Schedules one PCM16 chunk (base64) for gapless playback. */
  public playPcm(base64: string, mimeType?: string): void {
    if (!base64) return;
    const gen = this.gen;
    const ctx = this.ensureOutputCtx();
    if (!ctx || gen !== this.gen) return;

    try {
      const rateMatch = /rate=(\d+)/.exec(mimeType || '');
      const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : OUTPUT_CHUNK_RATE;

      const binary = atob(base64);
      const len = binary.length;
      if (len < 2) return;
      const buffer = new ArrayBuffer(len);
      const view = new Uint8Array(buffer);
      for (let i = 0; i < len; i++) view[i] = binary.charCodeAt(i);

      const int16 = new Int16Array(buffer, 0, Math.floor(len / 2));
      if (int16.length === 0) return;

      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768.0;

      const currentTime = ctx.currentTime;
      const freshBurst = this.activeSources.length === 0 || this.nextPlayTime < currentTime;
      if (freshBurst) {
        // 150 ms jitter pre-buffer then a 5 ms fade-in — no onset click, no stutter
        this.nextPlayTime = Math.max(currentTime + JITTER_PREBUFFER_S, this.nextPlayTime);
        const fadeLen = Math.min(120, float32.length);
        for (let i = 0; i < fadeLen; i++) float32[i] *= i / fadeLen;
      } else if (this.nextPlayTime < currentTime) {
        this.stats.underruns++;
        this.nextPlayTime = currentTime + 0.01;
      }

      const audioBuffer = ctx.createBuffer(1, float32.length, sampleRate);
      audioBuffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.masterGain || ctx.destination);
      const startTime = this.nextPlayTime;
      source.start(startTime);
      this.stats.playedChunks++;
      this.setMediaSession(true);

      source.onended = () => {
        if (gen !== this.gen) return;
        this.activeSources = this.activeSources.filter(s => s !== source);
        if (this.activeSources.length === 0) {
          this.lastPlaybackEnd = performance.now();
          this.setMediaSession(false);
          this.cb.onPlaybackEnded?.();
        }
      };
      this.activeSources.push(source);
      this.nextPlayTime = startTime + audioBuffer.duration;
    } catch (err) {
      console.warn('[LiveCallEngine] playback notice:', err);
    }
  }

  /** Fades out and stops all queued playback (interrupt / hangup path). */
  public stopPlayback(fadeMs = 12): void {
    const ctx = this.outCtx;
    const master = this.masterGain;
    const sources = this.activeSources;
    this.activeSources = [];
    this.stats.interrupts++;
    this.lastPlaybackEnd = performance.now();
    this.setMediaSession(false);

    if (ctx && master && sources.length > 0 && ctx.state !== 'closed') {
      const now = ctx.currentTime;
      try {
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(master.gain.value, now);
        master.gain.linearRampToValueAtTime(0.0001, now + fadeMs / 1000);
      } catch {}
      setTimeout(() => {
        sources.forEach(s => { try { s.stop(); } catch {} });
        try {
          if (ctx.state !== 'closed') {
            const t = ctx.currentTime;
            master.gain.cancelScheduledValues(t);
            master.gain.setValueAtTime(1, t);
          }
        } catch {}
      }, fadeMs + 8);
    } else {
      sources.forEach(s => { try { s.stop(); } catch {} });
    }
    if (ctx && ctx.state !== 'closed') this.nextPlayTime = ctx.currentTime;
  }

  private ensureOutputCtx(): AudioContext | null {
    try {
      if (!this.outCtx || this.outCtx.state === 'closed') {
        const AudioCtxCtor = window.AudioContext || (window as any).webkitAudioContext;
        this.outCtx = new AudioCtxCtor();
        const master = this.outCtx.createGain();
        master.gain.value = 1;
        master.connect(this.outCtx.destination);
        this.masterGain = master;
        // Silent unlock: open the output device exactly once, here, at click
        // time — instead of waking it mid-session with an audible pop.
        try {
          const unlock = this.outCtx.createBuffer(1, 2048, this.outCtx.sampleRate);
          const src = this.outCtx.createBufferSource();
          src.buffer = unlock;
          src.connect(master);
          src.start();
        } catch {}
      }
      if (this.outCtx.state === 'suspended') {
        this.outCtx.resume().catch(() => {});
        try {
          const g = this.masterGain?.gain;
          if (g) {
            g.cancelScheduledValues(this.outCtx.currentTime);
            g.setValueAtTime(1, this.outCtx.currentTime);
          }
        } catch {}
      }
      return this.outCtx;
    } catch {
      return null;
    }
  }

  // ------------------------------------------------------------------ teardown

  /** Full stop: kills transport, mic, playback and wake lock. Never throws. */
  public stop(sendStopMessage = true): void {
    this.gen++; // invalidates every pending async callback of the old call
    if (sendStopMessage && this.ws && this.ws.readyState === WebSocket.OPEN) {
      try { this.ws.send(JSON.stringify({ type: 'stop' })); } catch {}
    }
    this.teardownTransportOnly();
    this.destroyCaptureNodes();
    if (this.micStream) {
      this.micStream.getTracks().forEach(t => { try { t.enabled = false; t.stop(); } catch {} });
      this.micStream = null;
    }
    if (this.inCtx) {
      try { this.inCtx.close().catch(() => {}); } catch {}
      this.inCtx = null;
    }
    this.stopPlayback(0);
    if (this.outCtx && this.outCtx.state === 'running') {
      try { this.outCtx.suspend().catch(() => {}); } catch {}
    }
    this.micOpenTime = 0;
    this.lastPlaybackEnd = 0;
    this.captureStartedForGen = 0;
    this.usingNativeFallback = false;
    this.releaseWakeLock();
    this.setMediaSession(false);
    this.setState('stopped');
  }

  private teardownTransportOnly() {
    if (this.ws) {
      const ws = this.ws;
      this.ws = null;
      try { ws.onmessage = null as any; ws.onerror = null as any; ws.onclose = null as any; ws.onopen = null as any; } catch {}
      try { ws.close(); } catch {}
    }
  }

  private destroyCaptureNodes() {
    if (this.worklet) {
      try { this.worklet.port.onmessage = null; this.worklet.disconnect(); } catch {}
      this.worklet = null;
    }
    if (this.legacyProcessor) {
      try { this.legacyProcessor.onaudioprocess = null; this.legacyProcessor.disconnect(); } catch {}
      this.legacyProcessor = null;
    }
    if (this.legacySource) { try { this.legacySource.disconnect(); } catch {} this.legacySource = null; }
    if (this.workletSource) { try { this.workletSource.disconnect(); } catch {} this.workletSource = null; }
    if (this.legacyMute) { try { this.legacyMute.disconnect(); } catch {} this.legacyMute = null; }
  }

  // ------------------------------------------------------------- call extras

  private async requestWakeLock() {
    try {
      const wl = (navigator as any).wakeLock;
      if (wl) this.wakeLock = await wl.request('screen');
    } catch {}
  }

  private releaseWakeLock() {
    try { this.wakeLock?.release?.(); } catch {}
    this.wakeLock = null;
  }

  private setMediaSession(playing: boolean) {
    try {
      const ms = (navigator as any).mediaSession;
      if (ms) ms.playbackState = playing ? 'playing' : 'paused';
    } catch {}
  }
}
