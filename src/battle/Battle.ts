import { GAME } from '../config/game';
import { Random } from '../core/Random';
import { Arena } from './Arena';
import type { Ball, World } from './Ball';
import type { BattleEvent, FloatText } from './Effects';
import type { Projectile } from './Projectile';
import { getCharacter } from './characters';

export interface BattleResult {
  /** null 表示平局 */
  winner: Ball | null;
  reason: 'ko' | 'timeout';
}

// 一局战斗的纯逻辑（不依赖 DOM，可在 Node 中无画面运行）。支持 2 人对战与多人大乱斗
export class Battle implements World {
  readonly arena: Arena;
  readonly rng: Random;
  readonly balls: Ball[];
  readonly timeLimit: number;
  /** 3 人以上为大乱斗 */
  readonly ffa: boolean;
  projectiles: Projectile[] = [];
  texts: FloatText[] = [];
  /** 本帧产生的事件，由外部（场景）取走后清空 */
  events: BattleEvent[] = [];
  time = 0;
  result: BattleResult | null = null;
  /** 接触中的球对 -> 先碰到的一方（null 表示同时） */
  private contacts = new Map<string, Ball | null>();

  constructor(ids: string[], readonly seed: number) {
    if (ids.length < 2) throw new Error('至少需要 2 名选手');
    this.rng = new Random(seed);
    this.ffa = ids.length > 2;
    this.arena = this.ffa ? new Arena(GAME.arenaFfa.radius, GAME.arenaFfa.cy) : new Arena();
    this.timeLimit = this.ffa ? GAME.timeLimitFfa : GAME.timeLimit;

    // 各球均匀分布在一个圆环上（2 人时关于圆心对称），位置/朝向随机
    const n = ids.length;
    const { cx, cy } = this.arena;
    const a0 = this.rng.range(0, Math.PI * 2);
    let d = this.rng.range(GAME.spawnMinDist, GAME.spawnMaxDist);
    if (n > 2) {
      // 保证相邻两球不重叠，且不超出场地
      const radius = 40;
      const need = (radius + 4) / Math.sin(Math.PI / n);
      d = Math.min(Math.max(d, need), this.arena.apothem - radius - 8);
    }
    this.balls = ids.map((id, i) => {
      const a = a0 + (i * Math.PI * 2) / n;
      const ball = getCharacter(id).create(
        cx + Math.cos(a) * d,
        cy + Math.sin(a) * d,
        this.rng.range(0, Math.PI * 2),
      );
      ball.player = i;
      return ball;
    });
  }

  get alive(): Ball[] {
    return this.balls.filter((b) => !b.dead);
  }

  enemies(b: Ball): Ball[] {
    return this.balls.filter((o) => o !== b && !o.dead);
  }

  enemyOf(b: Ball): Ball {
    let best: Ball = b;
    let bestD = Infinity;
    for (const o of this.enemies(b)) {
      const d = Math.hypot(o.x - b.x, o.y - b.y);
      if (d < bestD) {
        bestD = d;
        best = o;
      }
    }
    return best;
  }

  initiatorOf(a: Ball, b: Ball): Ball | null {
    return this.contacts.get(this.pairKey(a, b)) ?? null;
  }

  private pairKey(a: Ball, b: Ball): string {
    return a.player < b.player ? `${a.player}-${b.player}` : `${b.player}-${a.player}`;
  }

  step(dt: number): void {
    if (this.result) return;
    this.time += dt;

    for (const b of this.balls) {
      if (b.dead) continue;
      b.update(dt, this);
      this.trackContact(b);
    }
    for (const p of this.projectiles) p.update(dt, this);
    this.projectiles = this.projectiles.filter((p) => !p.dead);

    // 球与球碰撞（吸住与被吸住的两球除外）。人多时多迭代一次减少重叠
    const alive = this.alive;
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < alive.length; i++) {
        for (let j = i + 1; j < alive.length; j++) {
          const a = alive[i];
          const b = alive[j];
          if (a.grabbedBy === b || b.grabbedBy === a) continue;
          this.collideBalls(a, b);
        }
      }
    }
    for (const b of alive) if (this.arena.collide(b)) this.events.push({ type: 'wall' });
    // 被吸住的球贴着吸血鬼走，位置再按墙壁修正
    for (const g of alive) {
      if (!g.grabbedBy || g.grabbedBy.dead) continue;
      g.follow(g.grabbedBy, 0.25);
      const tmp = { x: g.x, y: g.y, vx: 0, vy: 0, radius: g.radius };
      this.arena.collide(tmp);
      g.x = tmp.x;
      g.y = tmp.y;
    }

    this.stepEffects(dt);
    this.judge();
  }

  /** 只推进飘字等视觉元素（分出胜负后的慢动作期间继续调用） */
  stepEffects(dt: number): void {
    for (const t of this.texts) t.update(dt);
    this.texts = this.texts.filter((t) => !t.dead);
  }

  /**
   * 判定谁先碰到谁：mover 刚移动完，对方只有上一步的位移可比。
   * 接触开始瞬间，哪一方朝对方的靠近量明显更大，哪一方就是先手；
   * 差不多则视为同时（null）。接触期间结果保持不变，直到分开。
   */
  private trackContact(mover: Ball): void {
    const { engageDist, disengageDist, firstRatio } = GAME.contact;
    for (const other of this.enemies(mover)) {
      const dist = Math.hypot(other.x - mover.x, other.y - mover.y);
      const key = this.pairKey(mover, other);
      if (this.contacts.has(key)) {
        if (dist > disengageDist) this.contacts.delete(key);
        continue;
      }
      if (dist >= engageDist) continue;

      const nx = (other.x - mover.x) / (dist || 1);
      const ny = (other.y - mover.y) / (dist || 1);
      const closeMover = mover.moveX * nx + mover.moveY * ny;
      const closeOther = -(other.moveX * nx + other.moveY * ny);
      this.contacts.set(
        key,
        closeMover > Math.max(closeOther, 0) * firstRatio
          ? mover
          : closeOther > Math.max(closeMover, 0) * firstRatio
            ? other
            : null,
      );
    }
  }

  /** 两球弹性碰撞（等质量：交换法向速度分量），并分开防止重叠 */
  private collideBalls(a: Ball, b: Ball): void {
    let dx = b.x - a.x;
    let dy = b.y - a.y;
    let dist = Math.hypot(dx, dy);
    const minDist = a.radius + b.radius;
    if (dist >= minDist) return;
    if (dist < 1e-6) {
      dx = 1;
      dy = 0;
      dist = 1;
    }
    const nx = dx / dist;
    const ny = dy / dist;

    const overlap = minDist - dist;
    a.x -= (nx * overlap) / 2;
    a.y -= (ny * overlap) / 2;
    b.x += (nx * overlap) / 2;
    b.y += (ny * overlap) / 2;

    const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
    if (rel > 0) {
      a.vx -= rel * nx;
      a.vy -= rel * ny;
      b.vx += rel * nx;
      b.vy += rel * ny;
    }
    // 速率恒定
    a.normalizeSpeed();
    b.normalizeSpeed();
  }

  private judge(): void {
    const alive = this.alive;
    if (alive.length <= 1) {
      this.result = { winner: alive[0] ?? null, reason: 'ko' };
    } else if (this.time >= this.timeLimit) {
      // 时间到：剩余血量比例最高者胜，并列最高则平局
      let best = -1;
      let winners: Ball[] = [];
      for (const b of alive) {
        const r = b.hp / b.maxHp;
        if (r > best + 1e-9) {
          best = r;
          winners = [b];
        } else if (Math.abs(r - best) <= 1e-9) {
          winners.push(b);
        }
      }
      this.result = { winner: winners.length === 1 ? winners[0] : null, reason: 'timeout' };
    }
  }
}
