import type { VampireConfig } from '../../config/characters';
import { Ball, type World } from '../Ball';

// 吸血鬼：用獠牙咬敌人造成伤害并回血，碰到敌人会把对方吸住
export class Vampire extends Ball {
  private cooldown = 0;
  /** 獠牙朝向（始终朝着敌人） */
  private aim = 0;
  /** 当前被我吸住的对象（供绘制连线用） */
  grabbedTarget: Ball | null = null;

  constructor(private cfg: VampireConfig, x: number, y: number, angle: number) {
    super(cfg, x, y, angle);
  }

  /** 第 i 颗獠牙（0/1）的中心坐标与朝向 */
  private fang(i: number): { x: number; y: number; a: number } {
    const spread = (this.cfg.fangSpreadDeg * Math.PI) / 180;
    const a = this.aim + (i === 0 ? -spread / 2 : spread / 2);
    return {
      x: this.x + Math.cos(a) * this.cfg.fangOrbit,
      y: this.y + Math.sin(a) * this.cfg.fangOrbit,
      a,
    };
  }

  /** 放开后必须先分开再碰到才能再吸（不是时间冷却） */
  private ignore: Ball | null = null;

  private grab(enemy: Ball, world: World): void {
    // 已经吸着一个、对方被别人吸着、刚放开还没分开、或对方先冲到我身上（如雷电位移）时，不能吸
    if (this.grabbedTarget || enemy.grabbedBy || this.ignore === enemy) return;
    if (world.initiatorOf(this, enemy) === enemy) return;
    enemy.grabbedBy = this;
    enemy.grabTimer = this.cfg.grabDuration;
    this.grabbedTarget = enemy;
  }

  /** 吸住对方期间吸血鬼自己也不动 */
  protected canMove(world: World): boolean {
    return !world.enemies(this).some((e) => e.grabbedBy === this);
  }

  protected act(dt: number, world: World): void {
    this.cooldown = Math.max(0, this.cooldown - dt);

    const enemies = world.enemies(this);
    const prev = this.grabbedTarget;
    this.grabbedTarget = enemies.find((e) => e.grabbedBy === this) ?? null;
    const focus = this.grabbedTarget ?? world.enemyOf(this);
    this.aim = Math.atan2(focus.y - this.y, focus.x - this.x);

    // 刚放开：两球向相反方向弹开，避免贴着立刻被再次吸住
    if (prev && !this.grabbedTarget && !prev.dead) {
      this.ignore = prev;
      const dx = prev.x - this.x;
      const dy = prev.y - this.y;
      const d = Math.hypot(dx, dy) || 1;
      prev.vx = (dx / d) * prev.speed;
      prev.vy = (dy / d) * prev.speed;
      this.vx = (-dx / d) * this.speed;
      this.vy = (-dy / d) * this.speed;
    }
    if (this.ignore) {
      const far = Math.hypot(this.ignore.x - this.x, this.ignore.y - this.y) > this.radius + this.ignore.radius + 4;
      if (this.ignore.dead || far) this.ignore = null;
    }

    // 本体碰到对方：吸住（无冷却；已吸住时不刷新，放开后再碰立刻再吸）
    for (const e of enemies) {
      if (Math.hypot(e.x - this.x, e.y - this.y) < this.radius + e.radius) this.grab(e, world);
    }
    if (this.cooldown > 0) return;

    for (const e of enemies) {
      for (let i = 0; i < 2; i++) {
        const f = this.fang(i);
        if (Math.hypot(e.x - f.x, e.y - f.y) < e.radius + this.cfg.fangRadius) {
          e.takeDamage(this.cfg.damage, world, 'melee', this);
          this.damageDealt += this.cfg.damage;
          this.hits++;
          this.heal(Math.round(this.cfg.damage * this.cfg.lifesteal), world);
          this.cooldown = this.cfg.cooldown;
          this.grab(e, world);
          return;
        }
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    // 吸住的连线（对方的球在 Renderer 里随后绘制）
    const t = this.grabbedTarget;
    if (t) {
      ctx.strokeStyle = '#ff4d6d';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(t.x, t.y);
      ctx.stroke();
    }
    super.draw(ctx);

    // 两颗獠牙：从球体边缘朝敌人伸出的白色尖牙
    const r = this.cfg.fangRadius;
    for (let i = 0; i < 2; i++) {
      const f = this.fang(i);
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.a);
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#8b0000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(r, 0);
      ctx.lineTo(-r * 0.8, -r * 0.55);
      ctx.lineTo(-r * 0.8, r * 0.55);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }
}
