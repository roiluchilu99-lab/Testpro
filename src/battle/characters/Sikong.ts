import type { SikongConfig } from '../../config/characters';
import { Ball, type World } from '../Ball';

interface Trail {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  age: number;
}

type State = 'idle' | 'charge' | 'dash';

// 司空震：定时蓄力后化作雷电向敌人方向位移，路径上的敌人受到伤害
export class Sikong extends Ball {
  private state: State = 'idle';
  private timer: number;
  private aim = 0;
  private dirX = 1;
  private dirY = 0;
  private startX = 0;
  private startY = 0;
  private travelled = 0;
  /** 本次冲刺已命中的对象（每人只打一次） */
  private hitSet = new Set<Ball>();
  /** 命中闪光 */
  private flashes: { x: number; y: number; t: number }[] = [];
  private trails: Trail[] = [];

  constructor(private cfg: SikongConfig, x: number, y: number, angle: number) {
    super(cfg, x, y, angle);
    this.timer = cfg.skillCooldown;
  }

  /** 冲刺期间位置由技能控制 */
  protected canMove(): boolean {
    return this.state !== 'dash';
  }

  protected act(dt: number, world: World): void {
    for (const t of this.trails) t.age += dt;
    this.trails = this.trails.filter((t) => t.age < this.cfg.trailLife);
    for (const f of this.flashes) f.t -= dt;
    this.flashes = this.flashes.filter((f) => f.t > 0);

    const enemy = world.enemyOf(this);
    if (this.state !== 'dash') this.aim = Math.atan2(enemy.y - this.y, enemy.x - this.x);

    if (this.state === 'idle') {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.state = 'charge';
        this.timer = this.cfg.chargeTime;
        // 雷声从蓄力开始：蓄力期间是「滋滋」，蓄力结束（冲刺）时炸响，时长与 chargeTime 对应
        world.events.push({ type: 'charge' });
      }
    } else if (this.state === 'charge') {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.state = 'dash';
        this.dirX = Math.cos(this.aim);
        this.dirY = Math.sin(this.aim);
        this.startX = this.x;
        this.startY = this.y;
        this.travelled = 0;
        this.hitSet.clear();
      }
    }
    if (this.state === 'dash') this.dash(dt, world);
  }

  private dash(dt: number, world: World): void {
    const step = Math.min(this.cfg.dashSpeed * dt, this.cfg.dashDistance - this.travelled);
    const px = this.x;
    const py = this.y;
    this.x += this.dirX * step;
    this.y += this.dirY * step;
    this.travelled += step;

    // 本帧移动线段扫过的所有敌人
    const sx = this.x - px;
    const sy = this.y - py;
    const len2 = sx * sx + sy * sy || 1;
    for (const enemy of world.enemies(this)) {
      if (this.hitSet.has(enemy)) continue;
      const t = Math.max(0, Math.min(1, ((enemy.x - px) * sx + (enemy.y - py) * sy) / len2));
      const d = Math.hypot(enemy.x - (px + sx * t), enemy.y - (py + sy * t));
      if (d < enemy.radius + this.radius) {
        this.hitSet.add(enemy);
        enemy.takeDamage(this.cfg.damage, world, 'dash', this);
        this.damageDealt += this.cfg.damage;
        this.hits++;
        enemy.knockback(this.dirX, this.dirY, this.cfg.knockMul, this.cfg.knockTime);
        this.flashes.push({ x: enemy.x, y: enemy.y, t: 0.3 });
      }
    }

    const hitWall = !world.arena.contains(this.x, this.y, this.radius);
    if (hitWall) {
      this.x = px;
      this.y = py;
    }
    if (hitWall || this.travelled >= this.cfg.dashDistance - 1e-6) {
      this.trails.push({ x1: this.startX, y1: this.startY, x2: this.x, y2: this.y, age: 0 });
      this.state = 'idle';
      this.timer = this.cfg.skillCooldown;
      // 冲刺后沿冲刺方向继续滚动
      this.vx = this.dirX * this.speed;
      this.vy = this.dirY * this.speed;
    }
  }

  /** 画一条抖动的闪电 */
  private bolt(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, alpha: number): void {
    const len = Math.hypot(x2 - x1, y2 - y1);
    if (len < 1) return;
    const nx = -(y2 - y1) / len;
    const ny = (x2 - x1) / len;
    const n = Math.max(2, Math.round(len / 28));
    const pts: [number, number][] = [[x1, y1]];
    for (let i = 1; i < n; i++) {
      const off = (Math.random() - 0.5) * 36;
      pts.push([x1 + ((x2 - x1) * i) / n + nx * off, y1 + ((y2 - y1) * i) / n + ny * off]);
    }
    pts.push([x2, y2]);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineJoin = 'round';
    for (const [w, c] of [
      [14, 'rgba(80,170,255,0.55)'],
      [4, '#fff'],
    ] as const) {
      ctx.strokeStyle = c;
      ctx.lineWidth = w;
      ctx.beginPath();
      pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
      ctx.stroke();
    }
    ctx.restore();
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const t of this.trails) {
      this.bolt(ctx, t.x1, t.y1, t.x2, t.y2, 1 - t.age / this.cfg.trailLife);
    }
    if (this.state === 'dash') this.bolt(ctx, this.startX, this.startY, this.x, this.y, 1);

    // 蓄力：预警线 + 电弧环
    if (this.state === 'charge') {
      ctx.save();
      ctx.setLineDash([12, 12]);
      ctx.strokeStyle = 'rgba(120,200,255,0.6)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x + Math.cos(this.aim) * this.cfg.dashDistance, this.y + Math.sin(this.aim) * this.cfg.dashDistance);
      ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = `rgba(140,210,255,${0.5 + Math.random() * 0.5})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 6 + Math.random() * 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    super.draw(ctx);

    for (const f of this.flashes) {
      const k = f.t / 0.3;
      ctx.strokeStyle = `rgba(160,220,255,${k})`;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(f.x, f.y, 40 + (1 - k) * 50, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}
