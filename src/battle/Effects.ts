import { GAME } from '../config/game';

export type HitKind = 'melee' | 'arrow' | 'dash';

// 战斗逻辑发出的事件，由场景消费来播放音效与特效（逻辑本身不依赖 DOM）
export type BattleEvent =
  | { type: 'wall' }
  | { type: 'shoot' }
  | { type: 'heal' }
  | { type: 'charge' }
  | { type: 'hit'; kind: HitKind; x: number; y: number; color: string; heavy: boolean }
  | { type: 'fatal'; x: number; y: number; color: string };

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  color: string;
}

// 粒子：纯视觉效果，用 Math.random，不影响可复现的战斗随机序列
export class Particles {
  private list: Particle[] = [];

  burst(x: number, y: number, color: string, count: number, speed: number): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.3 + Math.random() * 0.7);
      this.list.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        age: 0,
        life: 0.35 + Math.random() * 0.35,
        size: 3 + Math.random() * 4,
        color,
      });
    }
  }

  update(dt: number): void {
    for (const p of this.list) {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.list = this.list.filter((p) => p.age < p.life);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.list) {
      ctx.globalAlpha = 1 - p.age / p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }
}

// 伤害/回血飘字
export class FloatText {
  age = 0;
  constructor(
    public x: number,
    public y: number,
    readonly text: string,
    readonly color: string,
  ) {}

  get dead(): boolean {
    return this.age >= GAME.floatText.life;
  }

  update(dt: number): void {
    this.age += dt;
    this.y -= GAME.floatText.riseSpeed * dt;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - this.age / GAME.floatText.life);
    ctx.font = `bold ${GAME.floatText.fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#000';
    ctx.strokeText(this.text, this.x, this.y);
    ctx.fillStyle = this.color;
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}
