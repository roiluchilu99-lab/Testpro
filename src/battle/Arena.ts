import { GAME } from '../config/game';

const SIDES = 8;

// 正八边形场地：用 8 个半平面表示，墙壁为镜面反射
export class Arena {
  readonly cx = GAME.arena.cx;
  /** 中心到边的距离 */
  readonly apothem: number;
  /** 各边外法线（单位向量）。顶点在 22.5°+45°k，边的法线在 45°k */
  private readonly normals: { nx: number; ny: number }[] = [];

  constructor(
    readonly radius: number = GAME.arena.radius,
    readonly cy: number = GAME.arena.cy,
  ) {
    this.apothem = radius * Math.cos(Math.PI / SIDES);
    for (let k = 0; k < SIDES; k++) {
      const a = (k * 2 * Math.PI) / SIDES;
      this.normals.push({ nx: Math.cos(a), ny: Math.sin(a) });
    }
  }

  /** 圆（半径 r）是否完全在场内 */
  contains(x: number, y: number, r = 0): boolean {
    for (const { nx, ny } of this.normals) {
      if ((x - this.cx) * nx + (y - this.cy) * ny + r > this.apothem) return false;
    }
    return true;
  }

  /**
   * 墙壁碰撞：把穿墙的圆推回场内并反射速度。
   * 返回是否撞墙。
   */
  collide(b: { x: number; y: number; vx: number; vy: number; radius: number }): boolean {
    let hit = false;
    for (const { nx, ny } of this.normals) {
      const over = (b.x - this.cx) * nx + (b.y - this.cy) * ny + b.radius - this.apothem;
      if (over > 0) {
        b.x -= nx * over;
        b.y -= ny * over;
        const vn = b.vx * nx + b.vy * ny;
        if (vn > 0) {
          b.vx -= 2 * vn * nx;
          b.vy -= 2 * vn * ny;
        }
        hit = true;
      }
    }
    return hit;
  }

  /** 描出八边形路径 */
  path(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    for (let k = 0; k < SIDES; k++) {
      const a = ((k + 0.5) * 2 * Math.PI) / SIDES;
      const px = this.cx + Math.cos(a) * this.radius;
      const py = this.cy + Math.sin(a) * this.radius;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }
}
