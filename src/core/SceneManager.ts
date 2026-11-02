import { GAME } from '../config/game';
import { drawText, inside, type Rect } from '../ui/widgets';
import { audio } from './Audio';
import { Save } from './Save';

export interface Scene {
  /** dt 为真实经过的秒数 */
  update(dt: number): void;
  draw(ctx: CanvasRenderingContext2D): void;
  /** 点击（逻辑坐标） */
  tap?(x: number, y: number): void;
  key?(code: string): void;
}

/** 场景之间共享的应用状态 */
export interface App {
  go(scene: Scene): void;
  save: Save;
}

// 开发模式：?seed=12345 重放第一局
let firstSeed = true;
export function newSeed(): number {
  const param = firstSeed ? Number(new URLSearchParams(location.search).get('seed')) : 0;
  firstSeed = false;
  return param > 0 ? param : Math.floor(Math.random() * 1e9) + 1;
}

/** 右上角静音按钮 */
const MUTE: Rect = { x: GAME.width - 76, y: 16, w: 60, h: 52 };

export class SceneManager implements App {
  readonly save = new Save();
  private scene: Scene | null = null;

  constructor(canvas: HTMLCanvasElement) {
    canvas.addEventListener('pointerdown', (e) => {
      audio.unlock();
      const r = canvas.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * GAME.width;
      const y = ((e.clientY - r.top) / r.height) * GAME.height;
      if (inside(MUTE, x, y)) return audio.toggleMute();
      this.scene?.tap?.(x, y);
    });
    window.addEventListener('keydown', (e) => {
      audio.unlock();
      if (e.code === 'KeyM') return audio.toggleMute();
      if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      this.scene?.key?.(e.code);
    });
  }

  go(scene: Scene): void {
    this.scene = scene;
  }

  update(dt: number): void {
    this.scene?.update(dt);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.scene?.draw(ctx);
    // 右上角静音按钮
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(MUTE.x, MUTE.y, MUTE.w, MUTE.h);
    drawText(ctx, audio.muted ? '🔇' : '🔊', MUTE.x + MUTE.w / 2, MUTE.y + MUTE.h / 2, 32, '#fff', 'center', false);
  }
}
