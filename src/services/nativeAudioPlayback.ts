export class NativeAudioPlayer {
  private nextPlayTime: number = 0;
  private activeSources: AudioBufferSourceNode[] = [];

  constructor() {}

  public playChunk(base64Audio: string, mimeType: string, ctx: AudioContext, destinationNode?: AudioNode) {
    try {
      if (!ctx || ctx.state === 'closed') {
        console.warn("[NATIVE PLAYBACK] Context is not available or closed.");
        return;
      }

      if (!base64Audio) return;
      const incomingSampleRate = this.getSampleRateFromMimeType(mimeType);
      const binary = atob(base64Audio);
      const len = binary.length;
      if (len < 2 || len % 2 !== 0) {
        return;
      }

      const buffer = new ArrayBuffer(len);
      const view = new Uint8Array(buffer);
      for (let i = 0; i < len; i++) {
        view[i] = binary.charCodeAt(i);
      }

      const int16View = new Int16Array(buffer);
      if (int16View.length === 0) return;

      const float32Data = new Float32Array(int16View.length);
      for (let i = 0; i < int16View.length; i++) {
        float32Data[i] = int16View[i] / 32768.0;
      }

      if (float32Data.length === 0) return;

      const audioBuffer = ctx.createBuffer(1, float32Data.length, incomingSampleRate);
      audioBuffer.getChannelData(0).set(float32Data);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      
      // If a destinationNode (like an AnalyserNode) is provided, connect through it, otherwise connect to destination
      if (destinationNode) {
        source.connect(destinationNode);
      } else {
        source.connect(ctx.destination);
      }

      // Web Audio API scheduling
      if (this.nextPlayTime < ctx.currentTime) {
        this.nextPlayTime = ctx.currentTime;
      }

      source.start(this.nextPlayTime);
      this.nextPlayTime += audioBuffer.duration;

      this.activeSources.push(source);
      source.onended = () => {
        this.activeSources = this.activeSources.filter(s => s !== source);
      };
    } catch (e) {
      console.error("[NATIVE PLAYBACK SERVICE ERROR]:", e);
    }
  }

  public clearQueue() {
    this.activeSources.forEach(source => {
      try {
        source.stop();
      } catch (e) {}
      try {
        source.disconnect();
      } catch (e) {}
    });
    this.activeSources = [];
    this.nextPlayTime = 0;
  }

  private getSampleRateFromMimeType(mimeType?: string): number {
    if (!mimeType) return 24000;
    const match = mimeType.match(/rate=(\d+)/);
    return match ? Number(match[1]) : 24000;
  }
}
