import type { BaseCharacterConfig } from '../config/characters';
import { GAME } from '../config/game';
import type { Random } from '../core/Random';
import type { Arena } from './Arena';
import { FloatText, type BattleEvent, type HitKind } from './Effects';
import type { Projectile } from './Projectile';

// 角色逻辑可访问的战场信息
export interface World {
  arena: Arena;
  rng: Random;
  balls: Ball[];
  /** 离 b 最近的存活对手（没有对手时返回 b 自己） */
  enemyOf(b: Ball): Ball;
  /** b 之外的所有存活对手 */
  enemies(b: Ball): Ball[];
  /** a、b 当前接触中谁先碰到谁：先碰到的一方；同时或未接触为 null */
  initiatorOf(a: Ball, b: Ball): Ball | null;
  projectiles: Projectile[];
  texts: FloatText[];
  events: BattleEvent[];
}

export abstract class Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  readonly maxHp: number;
  readonly radius: number;
  readonly speed: number;
  readonly color: string;
  readonly name: string;
  /** 选手编号（0 起，由 Battle 设置） */
  player = 0;

  /** 被谁吸住；吸住期间不能自行移动，也不能攻击或释放技能 */
  grabbedBy: Ball | null = null;
  grabTimer = 0;
  /** 上一次 update 中的位移（用于判定谁先碰到谁） */
  /** 弹飞：当前速度倍率（衰减回 1）与衰减速率 */
  knockMul = 1;
  private knockDecay = 0;
  moveX = 0;
  moveY = 0;

  // 本局统计
  damageDealt = 0;
  healed = 0;
  hits = 0;
  /** 受击闪白剩余时间 */
  flash = 0;

  constructor(cfg: BaseCharacterConfig, x: number, y: number, angle: number) {
    this.x = x;
    this.y = y;
    this.speed = cfg.speed;
    this.vx = Math.cos(angle) * cfg.speed;
    this.vy = Math.sin(angle) * cfg.speed;
    this.hp = this.maxHp = cfg.hp;
    this.radius = cfg.radius;
    this.color = cfg.color;
    this.name = cfg.name;
  }

  get dead(): boolean {
    return this.hp <= 0;
  }

  /** 每个物理步长调用：移动 + 角色自己的攻击逻辑 */
  update(dt: number, world: World): void {
    this.flash = Math.max(0, this.flash - dt);
    const sx = this.x;
    const sy = this.y;
    this.step(dt, world);
    this.moveX = this.x - sx;
    this.moveY = this.y - sy;
  }

  /** 沿 (dx,dy) 方向弹飞：速度瞬间乘以 mul，并在 time 秒内线性衰减回正常 */
  knockback(dx: number, dy: number, mul: number, time: number): void {
    const len = Math.hypot(dx, dy) || 1;
    this.vx = (dx / len) * this.speed;
    this.vy = (dy / len) * this.speed;
    this.knockMul = mul;
    this.knockDecay = (mul - 1) / time;
  }

  private step(dt: number, world: World): void {
    if (this.knockMul > 1) this.knockMul = Math.max(1, this.knockMul - this.knockDecay * dt);
    if (this.grabbedBy?.dead) this.grabbedBy = null;
    if (this.grabbedBy) {
      this.grabTimer -= dt;
      if (this.grabTimer <= 0) this.grabbedBy = null;
      return;
    }
    if (this.canMove(world)) {
      this.x += this.vx * dt * this.knockMul;
      this.y += this.vy * dt * this.knockMul;
    }
    this.act(dt, world);
  }

  /** 是否允许自行移动（角色可覆写） */
  protected canMove(_world: World): boolean {
    return true;
  }

  protected abstract act(dt: number, world: World): void;

  /** 把速度重新归一到恒定速率（碰撞后调用） */
  normalizeSpeed(): void {
    const len = Math.hypot(this.vx, this.vy);
    if (len < 1e-6) return;
    this.vx = (this.vx / len) * this.speed;
    this.vy = (this.vy / len) * this.speed;
  }

  /** 被吸住的球贴着吸血鬼走：逐步拉近到刚好接触 */
  follow(h: Ball, pull: number): void {
    let dx = this.x - h.x;
    let dy = this.y - h.y;
    const dist = Math.hypot(dx, dy) || 1;
    dx /= dist;
    dy /= dist;
    const d = dist + (h.radius + this.radius - dist) * pull;
    this.x = h.x + dx * d;
    this.y = h.y + dy * d;
  }

  takeDamage(amount: number, world: World, kind: HitKind, attacker: Ball): void {
    const wasAlive = !this.dead;
    this.hp -= amount;
    this.flash = GAME.fx.flashTime;
    world.events.push({
      type: 'hit',
      kind,
      x: this.x,
      y: this.y,
      color: attacker.color,
      heavy: amount >= GAME.fx.heavyDamage,
    });
    if (wasAlive && this.dead) world.events.push({ type: 'fatal', x: this.x, y: this.y, color: this.color });
    world.texts.push(
      new FloatText(
        this.x + world.rng.range(-12, 12),
        this.y - this.radius,
        `-${amount}`,
        GAME.floatText.damageColor,
      ),
    );
  }

  heal(amount: number, world: World): void {
    this.hp += amount;
    this.healed += amount;
    world.events.push({ type: 'heal' });
    world.texts.push(
      new FloatText(
        this.x + world.rng.range(-12, 12),
        this.y - this.radius - 28,
        `+${amount}`,
        GAME.floatText.healColor,
      ),
    );
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#fff';
    ctx.stroke();
    if (this.flash > 0) {
      ctx.fillStyle = '#fff';
      ctx.fill();
    }

    // 吸着：冰蓝色覆盖 + 剩余时间
    if (this.grabbedBy) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,77,109,0.45)';
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#ff4d6d';
      ctx.stroke();
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff4d6d';
      ctx.fillText(`吸着 ${this.grabTimer.toFixed(1)}`, this.x, this.y + this.radius + 26);
    }

    // 血量数字
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(String(Math.max(0, Math.ceil(this.hp))), this.x, this.y + 1);
  }
}
