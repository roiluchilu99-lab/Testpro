// 带种子的伪随机数（mulberry32），保证对局可复现
export class Random {
  private state: number;

  constructor(readonly seed: number) {
    this.state = seed >>> 0;
  }

  /** [0, 1) */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** [0, n) 的整数 */
  int(n: number): number {
    return Math.floor(this.next() * n);
  }

  /** [min, max) */
  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }
}

/** 对局之外（选人、随机模式）使用的随机源 */
export const lobbyRng = new Random(Date.now());
