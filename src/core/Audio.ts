// 音效：全部用 Web Audio 代码合成，不依赖外部音频文件
export type Sfx =
  | 'wall'
  | 'hit'
  | 'shoot'
  | 'arrowHit'
  | 'heal'
  | 'blip'
  | 'confirm'
  | 'tick'
  | 'fatal'
  | 'win'
  | 'coin'
  | 'thunder'
  | 'kill';

const MUTE_KEY = 'ballArena.muted';
/** 同一种音效的最短重复间隔（秒），避免人多时刷屏 */
const MIN_GAP: Partial<Record<Sfx, number>> = { wall: 0.06, thunder: 0.5, hit: 0.04, shoot: 0.05, arrowHit: 0.03, heal: 0.06 };

class AudioFx {
  muted = false;
  private ctx: AudioContext | null = null;
  private noise: AudioBuffer | null = null;
  private lastPlay = new Map<Sfx, number>();

  constructor() {
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === '1';
    } catch {
      // 存储不可用时默认有声
    }
  }

  /** 浏览器要求用户操作之后才能创建 AudioContext */
  unlock(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      const len = this.ctx.sampleRate;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  toggleMute(): void {
    this.muted = !this.muted;
    try {
      localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0');
    } catch {
      // 忽略写入失败
    }
  }

  play(name: Sfx): void {
    const ctx = this.ctx;
    if (!ctx || this.muted || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    if (t - (this.lastPlay.get(name) ?? -1) < (MIN_GAP[name] ?? 0)) return;
    this.lastPlay.set(name, t);

    switch (name) {
      case 'wall':
        this.tone('sine', 140, 60, 0.09, 0.3, t);
        break;
      case 'hit':
        this.tone('sine', 110, 55, 0.14, 0.4, t);
        this.burst('lowpass', 600, 600, 0.1, 0.35, t);
        break;
      case 'shoot':
        this.burst('bandpass', 1200, 3200, 0.1, 0.18, t);
        break;
      case 'arrowHit':
        this.tone('triangle', 640, 280, 0.07, 0.3, t);
        break;
      case 'heal':
        this.tone('sine', 600, 960, 0.13, 0.22, t);
        break;
      case 'blip':
        this.tone('square', 880, 880, 0.04, 0.1, t);
        break;
      case 'confirm':
        this.tone('sine', 1320, 1320, 0.25, 0.25, t);
        this.tone('sine', 1980, 1980, 0.18, 0.1, t);
        break;
      case 'tick':
        this.tone('square', 700, 700, 0.025, 0.07, t);
        break;
      case 'fatal':
        this.tone('sine', 90, 30, 0.7, 0.6, t);
        this.burst('lowpass', 900, 200, 0.5, 0.5, t);
        break;
      case 'win':
        [523, 659, 784, 1047].forEach((f, i) => this.tone('triangle', f, f, 0.22, 0.25, t + i * 0.12));
        break;
      case 'coin':
        for (let i = 0; i < 4; i++) {
          this.tone('sine', 1568, 1568, 0.12, 0.15, t + i * 0.08);
          this.tone('sine', 2093, 2093, 0.18, 0.12, t + i * 0.08 + 0.04);
        }
        break;
      case 'thunder':
        // 先是密集随机的「滋滋」电流声，再是炸响的「咔」，最后是逐渐变弱、忽大忽小的低沉雷鸣
        for (let i = 0; i < 22; i++) {
          const at = t + i * 0.016 + Math.random() * 0.012;
          const f = 2500 + Math.random() * 5000;
          this.burst('bandpass', f, f, 0.012 + Math.random() * 0.02, 0.2 + Math.random() * 0.2, at);
        }
        this.burst('highpass', 1500, 6000, 0.09, 0.8, t + 0.3);
        this.tone('sawtooth', 3000, 120, 0.12, 0.25, t + 0.3);
        this.burst('lowpass', 700, 90, 1.6, 0.7, t + 0.32);
        this.burst('lowpass', 400, 70, 1.1, 0.5, t + 0.75);
        this.burst('lowpass', 300, 60, 0.9, 0.35, t + 1.2);
        this.tone('sine', 62, 28, 1.6, 0.6, t + 0.32);
        break;
      case 'kill':
        // 击杀爆金币：先一个上扬的亮音，再接密集、逐渐变弱的金币碰撞声
        this.tone('triangle', 660, 1320, 0.16, 0.3, t);
        for (let i = 0; i < 16; i++) {
          const at = t + 0.05 + i * 0.04 + Math.random() * 0.02;
          const f = 2200 + Math.random() * 1400;
          const v = 0.22 * (1 - i / 22);
          this.tone('sine', f, f, 0.1, v, at);
          this.tone('sine', f * 1.5, f * 1.5, 0.07, v * 0.6, at);
        }
        break;
    }
  }

  /** 带频率滑动和指数衰减的单音 */
  private tone(type: OscillatorType, f0: number, f1: number, dur: number, vol: number, t: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  /** 滤波噪声（打击声 / 嗖声） */
  private burst(type: BiquadFilterType, f0: number, f1: number, dur: number, vol: number, t: number): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) filter.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(t);
    src.stop(t + dur + 0.02);
  }
}

export const audio = new AudioFx();
