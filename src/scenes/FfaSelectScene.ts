import type { App, Scene } from '../core/SceneManager';
import { SelectScreen } from '../ui/SelectScreen';
import { newSeed } from '../core/SceneManager';
import { BattleScene } from './BattleScene';
import { drawButton, inside, type Rect } from '../ui/widgets';
import { ModeSelectScene } from './ModeSelectScene';

const BACK: Rect = { x: 20, y: 20, w: 140, h: 60 };

// 大乱斗选人：沿用原有选手选择界面（锁定为大乱斗），不下注
export class FfaSelectScene implements Scene {
  private screen = new SelectScreen('ffa');

  constructor(private app: App) {}

  update(): void {}

  draw(ctx: CanvasRenderingContext2D): void {
    this.screen.draw(ctx);
    drawButton(ctx, BACK, '← 戻る', { fill: 'rgba(255,255,255,0.08)', size: 26 });
  }

  tap(x: number, y: number): void {
    if (inside(BACK, x, y)) return this.app.go(new ModeSelectScene(this.app));
    if (this.screen.tap(x, y)) this.start();
  }

  key(code: string): void {
    if (code === 'Space' || code === 'Enter') this.start();
    else if (code === 'Escape') this.app.go(new ModeSelectScene(this.app));
  }

  private start(): void {
    this.app.go(new BattleScene(this.app, this.screen.ids, newSeed(), null));
  }
}
