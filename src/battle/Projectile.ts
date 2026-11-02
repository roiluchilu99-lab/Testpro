import { GAME } from '../config/game';
import type { Ball, World } from './Ball';

// 飞行道具（箭）
export class Projectile {
  dead = false;
  /** 最近的历史位置，用于画拖尾 */
  private trail: { x: number; y: number }[] = [];

  constructor(
    public x: number,
    public y: number,
    public vx: number,
    public vy: number,
    readonly radius: number,
    readonly damage: number,
    // 被剑士反弹后会换主人和颜色
    public owner: Ball,
    public color: string,
  ) {}

  update(dt: number, world: World): void {
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > GAME.fx.trailLen) this.trail.shift();
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // 出场地即消失
    if (!world.arena.contains(this.x, this.y)) {
      this.dead = true;
      return;
    }

    for (const target of world.balls) {
      if (target === this.owner || target.dead) continue;
      if (Math.hypot(target.x - this.x, target.y - this.y) < target.radius + this.radius) {
        target.takeDamage(this.damage, world, 'arrow', this.owner);
        this.owner.damageDealt += this.damage;
        this.owner.hits++;
        this.dead = true;
        return;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    // 拖尾：越旧越细越淡
    ctx.lineCap = 'round';
    for (let i = 1; i < this.trail.length; i++) {
      const k = i / this.trail.length;
      ctx.globalAlpha = k * 0.6;
      ctx.strokeStyle = this.color;
      ctx.lineWidth = this.radius * 2 * k;
      ctx.beginPath();
      ctx.moveTo(this.trail[i - 1].x, this.trail[i - 1].y);
      ctx.lineTo(this.trail[i].x, this.trail[i].y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.lineCap = 'butt';
    const a = Math.atan2(this.vy, this.vx);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(a);
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-14, 0);
    ctx.lineTo(10, 0);
    ctx.stroke();
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(8, -5);
    ctx.lineTo(8, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
