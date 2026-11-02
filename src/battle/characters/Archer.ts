import type { ArcherConfig } from '../../config/characters';
import { Ball, type World } from '../Ball';
import { Projectile } from '../Projectile';

// 弓手：持续向敌人射箭，命中越多每轮箭越多
export class Archer extends Ball {
  private timer: number;
  private aim = 0;

  constructor(private cfg: ArcherConfig, x: number, y: number, angle: number) {
    super(cfg, x, y, angle);
    this.timer = cfg.fireInterval;
  }

  /** 当前每轮箭数 */
  private get arrowCount(): number {
    const extra = Math.floor(this.hits / this.cfg.streakEvery);
    return Math.min(this.cfg.maxArrows, 1 + extra);
  }

  protected act(dt: number, world: World): void {
    const enemy = world.enemyOf(this);
    this.aim = Math.atan2(enemy.y - this.y, enemy.x - this.x);

    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer += this.cfg.fireInterval;

    world.events.push({ type: 'shoot' });
    const n = this.arrowCount;
    const spread = (this.cfg.spreadDeg * Math.PI) / 180;
    for (let i = 0; i < n; i++) {
      // 以瞄准方向为中心对称扇形展开
      const a = this.aim + (i - (n - 1) / 2) * spread;
      world.projectiles.push(
        new Projectile(
          this.x + Math.cos(a) * this.radius,
          this.y + Math.sin(a) * this.radius,
          Math.cos(a) * this.cfg.arrowSpeed,
          Math.sin(a) * this.cfg.arrowSpeed,
          this.cfg.arrowRadius,
          this.cfg.arrowDamage,
          this,
          this.color,
        ),
      );
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    super.draw(ctx);
    // 弓：始终朝向敌人
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.aim);
    ctx.strokeStyle = '#d7a86e';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(-this.radius * 0.2, 0, this.radius + 14, -0.9, 0.9);
    ctx.stroke();
    ctx.restore();
  }
}
