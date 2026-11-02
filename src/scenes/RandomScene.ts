import { REGISTRY } from '../battle/characters';
import { GAME } from '../config/game';
import { audio } from '../core/Audio';
import { lobbyRng } from '../core/Random';
import type { App, Scene } from '../core/SceneManager';
import { drawAvatar, drawBg, drawButton, drawText, inside, type Rect } from '../ui/widgets';
import { BetScene } from './BetScene';
import { ModeSelectScene } from './ModeSelectScene';

const BACK: Rect = { x: 20, y: 20, w: 140, h: 60 };
const REEL_W = 300;
const REEL_H = 420;
const REEL_Y = 380;

// 随机模式：两侧头像像老虎机一样滚动，先左后右停下，然后进入下注
export class RandomScene implements Scene {
  private time = 0;
  /** 最终结果在开局时就已决定，滚动只是演出 */
  private final = [lobbyRng.int(REGISTRY.length), lobbyRng.int(REGISTRY.length)];

  constructor(private app: App) {}

  private stopAt(side: number): number {
    return side === 0 ? GAME.slot.stopLeft : GAME.slot.stopRight;
  }

  /** 当前显示的角色下标：停下前按间隔轮换 */
  private shown(side: number): number {
    if (this.time >= this.stopAt(side)) return this.final[side];
    return (Math.floor(this.time / GAME.slot.tick) + side * 2) % REGISTRY.length;
  }

  update(dt: number): void {
    const before = [this.shown(0), this.shown(1)];
    const wasSpinning = [this.time < this.stopAt(0), this.time < this.stopAt(1)];
    this.time += dt;
    // 滚动中每次换图播放嘀嗒声，停下时「叮」
    for (let s = 0; s < 2; s++) {
      if (wasSpinning[s] && this.time >= this.stopAt(s)) audio.play('confirm');
      else if (wasSpinning[s] && this.shown(s) !== before[s]) audio.play('tick');
    }
    if (this.time >= GAME.slot.stopRight + GAME.slot.hold) {
      this.app.go(new BetScene(this.app, [REGISTRY[this.final[0]].id, REGISTRY[this.final[1]].id]));
    }
  }

  tap(x: number, y: number): void {
    if (inside(BACK, x, y)) this.app.go(new ModeSelectScene(this.app));
  }

  key(code: string): void {
    if (code === 'Escape') this.app.go(new ModeSelectScene(this.app));
  }

  draw(ctx: CanvasRenderingContext2D): void {
    drawBg(ctx);
    drawText(ctx, 'ランダム対戦', GAME.width / 2, 200, 60);
    drawButton(ctx, BACK, '← 戻る', { fill: 'rgba(255,255,255,0.08)', size: 26 });
    for (let side = 0; side < 2; side++) {
      const x = side === 0 ? 40 : GAME.width - 40 - REEL_W;
      const spinning = this.time < this.stopAt(side);
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(x, REEL_Y, REEL_W, REEL_H);
      ctx.lineWidth = 4;
      ctx.strokeStyle = spinning ? '#333a47' : '#f5b800';
      ctx.strokeRect(x, REEL_Y, REEL_W, REEL_H);
      const c = REGISTRY[this.shown(side)];
      drawAvatar(ctx, x + REEL_W / 2, REEL_Y + 190, 90, c.color);
      drawText(ctx, c.name, x + REEL_W / 2, REEL_Y + 340, 38, spinning ? '#888' : '#fff');
      drawText(ctx, `${side + 1}P`, x + REEL_W / 2, REEL_Y + 40, 36, side === 0 ? '#ff4d4d' : '#4aa3ff');
    }
    drawText(ctx, 'VS', GAME.width / 2, REEL_Y + REEL_H / 2, 64, '#f5b800');
  }
}
