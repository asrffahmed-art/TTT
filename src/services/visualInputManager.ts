/**
 * VisualInputManager — THOTH's centralized visual input pipeline (Task 42).
 *
 * Owns screen-share and camera capture for the Live call and is the ONLY
 * component that talks to the Live session about visual frames:
 *
 *   Camera / Screen (getDisplayMedia / getUserMedia)
 *        ↓  (per-source <video> decoders, never attached to the DOM)
 *   VisualInputManager (source registry + lifecycle + permissions)
 *        ↓
 *   Frame Scheduler (max 1 frame / second TOTAL, alternating sources)
 *        ↓
 *   Duplicate suppression (8x8 average-hash, ~2% tolerance)
 *        ↓
 *   JPEG encode (max 768px, quality 0.6)
 *        ↓
 *   onFrame(base64) -> caller -> Live session ({type:'image'})
 *
 * Official Live API constraint: video input = still image frames, max 1 fps.
 * There is deliberately no 15/30 fps pipeline and no raw video stream.
 *
 * Cleanup guarantees: stop() stops every MediaStreamTrack, cancels the
 * scheduler timer, clears the internal <video> decoders and resets state.
 * Track 'ended' events (user stops sharing from the browser UI, device
 * unplug) are surfaced through onSourceChange so the UI can never show an
 * ON state for a dead track.
 */

export type VisualSource = 'screen' | 'camera';
export type VisualSourceState = 'off' | 'active' | 'denied' | 'unavailable' | 'ended';

export interface VisualInputManagerCallbacks {
  /** Encoded JPEG frame (base64, no data: prefix) ready for the session. */
  onFrame: (base64Jpeg: string, source: VisualSource) => void;
  /** Source lifecycle changes (permission, start/stop, browser stop-share). */
  onSourceChange: (source: VisualSource, state: VisualSourceState) => void;
}

const FRAME_INTERVAL_MS = 1000;   // Live API maximum: 1 visual frame / second
const MAX_DIMENSION = 768;        // keeps each frame ~30-70 KB at q0.6
const JPEG_QUALITY = 0.6;
const HASH_DIFF_THRESHOLD = 2;    // average-hash mean channel diff (%) — skip near-duplicates

interface SourceSlot {
  stream: MediaStream | null;
  video: HTMLVideoElement | null;
  canvas: HTMLCanvasElement | null;
  lastHash: Uint8Array | null;
  state: VisualSourceState;
}

export class VisualInputManager {
  private cb: VisualInputManagerCallbacks;
  private slots: Record<VisualSource, SourceSlot> = {
    screen: { stream: null, video: null, canvas: null, lastHash: null, state: 'off' },
    camera: { stream: null, video: null, canvas: null, lastHash: null, state: 'off' }
  };
  private schedulerTimer: any = null;
  private nextSourceIndex = 0;
  private destroyed = false;

  constructor(cb: VisualInputManagerCallbacks) {
    this.cb = cb;
  }

  public getState(source: VisualSource): VisualSourceState {
    return this.slots[source].state;
  }

  public getStream(source: VisualSource): MediaStream | null {
    return this.slots[source].stream;
  }

  public anyActive(): boolean {
    return this.slots.screen.state === 'active' || this.slots.camera.state === 'active';
  }

  // ------------------------------------------------------------ screen

  public async toggleScreen(): Promise<void> {
    if (this.slots.screen.state === 'active') { this.stop('screen'); return; }
    await this.startScreen();
  }

  public async startScreen(): Promise<void> {
    if (this.destroyed) return;
    if (!navigator.mediaDevices || !(navigator.mediaDevices as any).getDisplayMedia) {
      this.setState('screen', 'unavailable');
      return;
    }
    try {
      const stream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: { frameRate: { ideal: 5, max: 10 } },
        audio: false
      });
      this.attach('screen', stream);
      // The browser's own "Stop sharing" button must be reflected instantly.
      const track = stream.getVideoTracks()[0];
      if (track) {
        track.addEventListener('ended', () => { this.stop('screen'); });
      }
    } catch (err: any) {
      const name = String(err?.name || '');
      this.setState('screen', (name === 'NotAllowedError' || name === 'PermissionDeniedError') ? 'denied' : 'unavailable');
    }
  }

  // ------------------------------------------------------------ camera

  public async toggleCamera(): Promise<void> {
    if (this.slots.camera.state === 'active') { this.stop('camera'); return; }
    await this.startCamera();
  }

  // ── [TASK 43 — GEMINI-STYLE CAMERA] ─────────────────────────────────
  // Phones start on the BACK camera ("environment") so the learner can point
  // at homework / objects, with a one-tap flip. Desktops keep the user-facing
  // webcam. facingMode uses { ideal } (never exact) so single-camera devices
  // always succeed. Flip acquires the NEW stream BEFORE dropping the old one,
  // so a failure leaves the running capture completely untouched.
  private cameraFacing: 'user' | 'environment' = 'user';

  public getCameraFacing(): 'user' | 'environment' {
    return this.cameraFacing;
  }

  private static defaultFacing(): 'user' | 'environment' {
    try {
      return (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
        ? 'environment'
        : 'user';
    } catch { return 'user'; }
  }

  private async acquireCamera(facing: 'user' | 'environment'): Promise<MediaStream> {
    return navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: { ideal: facing } },
      audio: false
    });
  }

  /** One-tap camera flip while the session is live. Resolves false when the
   *  switch is impossible (no second camera / busy sensor) — the current feed
   *  keeps streaming in that case. */
  public async flipCamera(): Promise<boolean> {
    if (this.destroyed || this.slots.camera.state !== 'active') return false;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return false;
    const next = this.cameraFacing === 'user' ? 'environment' : 'user';
    try {
      const stream = await this.acquireCamera(next);
      this.cameraFacing = next;
      this.attach('camera', stream); // drops the old capture only after the new one is live
      const track = stream.getVideoTracks()[0];
      if (track) {
        track.addEventListener('ended', () => { this.stop('camera'); });
      }
      return true;
    } catch {
      return false;
    }
  }

  public async startCamera(facing?: 'user' | 'environment'): Promise<void> {
    if (this.destroyed) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.setState('camera', 'unavailable');
      return;
    }
    const want = facing || VisualInputManager.defaultFacing();
    try {
      const stream = await this.acquireCamera(want);
      this.cameraFacing = want;
      this.attach('camera', stream);
      const track = stream.getVideoTracks()[0];
      if (track) {
        track.addEventListener('ended', () => { this.stop('camera'); });
      }
    } catch (err: any) {
      const name = String(err?.name || '');
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
        this.setState('camera', 'denied');
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'NotReadableError') {
        this.setState('camera', 'unavailable');
      } else {
        this.setState('camera', 'unavailable');
      }
    }
  }

  // ---------------------------------------------------------- internals

  private attach(source: VisualSource, stream: MediaStream) {
    const slot = this.slots[source];
    this.stop(source, true); // idempotent re-start: drop any previous capture
    try {
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;
      video.srcObject = stream;
      // [TASK 44 — DECODER FIX] off-DOM video elements stall on iOS Safari /
      // some Android WebViews (videoWidth stays 0 -> captureTick bails forever
      // -> the model never receives a single frame). Attach the decoder to the
      // document, visually hidden and untouchable — the standard reliable way.
      video.setAttribute('playsinline', '');
      video.setAttribute('disablepictureinpicture', '');
      video.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:2px;height:2px;opacity:0.001;pointer-events:none;z-index:-1;';
      try { document.body.appendChild(video); } catch {}
      video.play().catch(() => {});
      slot.video = video;
      slot.canvas = document.createElement('canvas');
      slot.canvas.width = MAX_DIMENSION;
      slot.canvas.height = MAX_DIMENSION;
      slot.stream = stream;
      slot.lastHash = null;
      slot.state = 'active';
      this.cb.onSourceChange(source, 'active');
      this.ensureScheduler();
    } catch (e) {
      try { stream.getTracks().forEach(t => t.stop()); } catch {}
      this.setState(source, 'unavailable');
    }
  }

  /** Public stop (also used internally) — full track + decoder cleanup. */
  public stop(source: VisualSource, silent = false) {
    const slot = this.slots[source];
    try { slot.stream?.getTracks().forEach(t => { try { t.stop(); } catch {} }); } catch {}
    try { if (slot.video) { slot.video.srcObject = null; try { slot.video.remove(); } catch {} } } catch {}
    slot.stream = null;
    slot.video = null;
    slot.canvas = null;
    slot.lastHash = null;
    const wasActive = slot.state === 'active';
    slot.state = 'off';
    if (!silent && (wasActive || true)) this.cb.onSourceChange(source, 'off');
    if (!this.anyActive()) this.stopScheduler();
  }

  /** Stops everything (session end / unmount / reconnect). Never throws. */
  public stopAll() {
    this.destroyed = true;
    this.stop('screen', true);
    this.stop('camera', true);
    this.stopScheduler();
  }

  private setState(source: VisualSource, state: VisualSourceState) {
    this.slots[source].state = state;
    this.cb.onSourceChange(source, state);
    if (state !== 'active') {
      const slot = this.slots[source];
      try { slot.stream?.getTracks().forEach(t => { try { t.stop(); } catch {} }); } catch {}
      try { if (slot.video) { slot.video.srcObject = null; try { slot.video.remove(); } catch {} } } catch {}
      slot.stream = null; slot.video = null; slot.canvas = null;
      if (!this.anyActive()) this.stopScheduler();
    }
  }

  private ensureScheduler() {
    if (this.schedulerTimer) return;
    this.schedulerTimer = setInterval(() => this.captureTick(), FRAME_INTERVAL_MS);
  }

  private stopScheduler() {
    if (this.schedulerTimer) { clearInterval(this.schedulerTimer); this.schedulerTimer = null; }
  }

  /** One frame per tick TOTAL across all active sources (alternating). */
  private captureTick() {
    const active: VisualSource[] = (['screen', 'camera'] as VisualSource[])
      .filter(src => this.slots[src].state === 'active' && this.slots[src].video);
    if (active.length === 0) { this.stopScheduler(); return; }

    // Round-robin when both are live; single source otherwise.
    const source = active[this.nextSourceIndex % active.length];
    this.nextSourceIndex++;

    const slot = this.slots[source];
    const video = slot.video!;
    if (!video.videoWidth || !video.videoHeight) return; // decoder not ready yet

    // Scale into the shared-size canvas.
    const scale = Math.min(1, MAX_DIMENSION / Math.max(video.videoWidth, video.videoHeight));
    const w = Math.max(2, Math.round(video.videoWidth * scale));
    const h = Math.max(2, Math.round(video.videoHeight * scale));
    const canvas = slot.canvas!;
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    try { ctx.drawImage(video, 0, 0, w, h); } catch { return; }

    // Duplicate-frame suppression: 8x8 average hash on the downscaled frame.
    const hash = this.averageHash(canvas, ctx, w, h);
    if (hash && slot.lastHash && this.hashDiff(hash, slot.lastHash) < HASH_DIFF_THRESHOLD) {
      return; // scene unchanged — burn zero tokens
    }
    slot.lastHash = hash;

    const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
    const b64 = dataUrl.substring(dataUrl.indexOf(',') + 1);
    if (b64 && b64.length > 100) {
      try { this.cb.onFrame(b64, source); } catch {}
    }
  }

  private averageHash(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, w: number, h: number): Uint8Array | null {
    try {
      const H = 8, W = 8;
      const tiny = document.createElement('canvas');
      tiny.width = W; tiny.height = H;
      const tctx = tiny.getContext('2d');
      if (!tctx) return null;
      tctx.drawImage(canvas, 0, 0, w, h, 0, 0, W, H);
      const d = tctx.getImageData(0, 0, W, H).data;
      const out = new Uint8Array(W * H);
      for (let i = 0; i < W * H; i++) {
        out[i] = (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) / 3;
      }
      return out;
    } catch { return null; }
  }

  private hashDiff(a: Uint8Array, b: Uint8Array): number {
    if (a.length !== b.length) return 100;
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
    return sum / a.length;
  }
}
