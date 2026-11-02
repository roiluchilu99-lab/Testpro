import type { SwordsmanConfig } from '../../config/characters';
import { Ball, type World } from '../Ball';
import type { Projectile } from '../Projectile';

// 剑士：剑绕身体持续旋转，碰到敌人造成伤害；箭碰到剑会被反弹回射箭者
export class Swordsman extends Ball {
  private cooldown = 0;
  /** 已经掷过反弹概率的箭（每支箭只掷一次） */
  private rolled = new WeakSet<Projectile>();
  /** 剑当前的朝向 */
  private angle: number;

  constructor(private cfg: SwordsmanConfig, x: number, y: number, angle: number) {
    super(cfg, x, y, angle);
    this.angle = angle;
  }

  /** 剑身上的判定点（从剑柄到剑尖均匀取 3 点） */
  private blade(): { x: number; y: number }[] {
    const { bladeStart, bladeLen } = this.cfg;
    return [0, 0.5, 1].map((k) => {
      const d = bladeStart + bladeLen * k;
      return { x: this.x + Math.cos(this.angle) * d, y: this.y + Math.sin(this.angle) * d };
    });
  }

  protected act(dt: number, world: World): void {
    this.angle += this.cfg.spinSpeed * dt;
    this.cooldown = Math.max(0, this.cooldown - dt);
    const blade = this.blade();
    const w = this.cfg.bladeWidth;

    // 反弹箭矢：改成自己的箭，速率不变，朝原主人当前位置飞回去
    for (const p of world.projectiles) {
      if (p.dead || p.owner === this) continue;
      if (!blade.some((b) => Math.hypot(b.x - p.x, b.y - p.y) < w + p.radius)) continue;
      if (this.rolled.has(p)) continue;
      this.rolled.add(p);
      if (world.rng.next() >= this.cfg.reflectChance) continue;
      const back = p.owner;
      const speed = Math.hypot(p.vx, p.vy);
      const a = Math.atan2(back.y - p.y, back.x - p.x);
      p.vx = Math.cos(a) * speed;
      p.vy = Math.sin(a) * speed;
      p.owner = this;
      p.color = this.color;
      world.events.push({ type: 'wall' });
    }

    if (this.cooldown > 0) return;
    for (const e of world.enemies(this)) {
      if (!blade.some((b) => Math.hypot(b.x - e.x, b.y - e.y) < w + e.radius)) continue;
      e.takeDamage(this.cfg.damage, world, 'melee', this);
      this.damageDealt += this.cfg.damage;
      this.hits++;
      this.cooldown = this.cfg.cooldown;
      return;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    super.draw(ctx);
    const { bladeStart, bladeLen } = this.cfg;
    const c = Math.cos(this.angle);
    const s = Math.sin(this.angle);
    ctx.lineCap = 'round';
    // 护手
    ctx.strokeStyle = '#8a6d3b';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(this.x + c * bladeStart - s * 10, this.y + s * bladeStart + c * 10);
    ctx.lineTo(this.x + c * bladeStart + s * 10, this.y + s * bladeStart - c * 10);
    ctx.stroke();
    // 剑身
    ctx.strokeStyle = '#e8eef5';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(this.x + c * bladeStart, this.y + s * bladeStart);
    ctx.lineTo(this.x + c * (bladeStart + bladeLen), this.y + s * (bladeStart + bladeLen));
    ctx.stroke();
    ctx.lineCap = 'butt';
  }
}
