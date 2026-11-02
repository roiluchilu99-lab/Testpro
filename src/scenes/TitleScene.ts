import type { App, Scene } from '../core/SceneManager';
import { GAME } from '../config/game';
import { audio } from '../core/Audio';
import { drawBg, drawButton, drawText, inside, type Rect } from '../ui/widgets';
import { ModeSelectScene } from './ModeSelectScene';
import { TopUpScene } from './TopUpScene';

const START: Rect = { x: 160, y: 820, w: 400, h: 100 };
const TOPUP: Rect = { x: 160, y: 950, w: 400, h: 80 };

// 标题画面：显示金币与战绩
export class TitleScene implements Scene {
  constructor(private app: App) {}

  update(): void {}

  draw(ctx: CanvasRenderingContext2D): void {
    const d = this.app.save.data;
    const cx = GAME.width / 2;
    drawBg(ctx);
    drawText(ctx, 'ボールアリーナ', cx, 330, 84);
    drawText(ctx, '全自動バトル × 勝敗予想', cx, 420, 34, '#8fb8ff');

    drawText(ctx, `所持コイン  ${d.coins}`, cx, 560, 44, '#f5b800');
    drawText(ctx, `最高コイン ${d.maxCoins}`, cx, 620, 30, '#aaa', 'center', false);
    const rate = d.bets > 0 ? Math.round((d.hits / d.bets) * 100) : 0;
    drawText(ctx, `総試合 ${d.games}　当たり ${d.hits} / ${d.bets}（${rate}%）`, cx, 670, 30, '#aaa', 'center', false);

    drawButton(ctx, START, 'スタート', { fill: '#2e9e5b', size: 48 });
    drawButton(ctx, TOPUP, 'コインチャージ', { fill: 'rgba(255,255,255,0.08)', stroke: '#f5b800', size: 32 });
    drawText(ctx, 'ゲーム内コインのみ使用。現実のお金は一切関係ありません', cx, GAME.height - 50, 20, '#666', 'center', false);
  }

  tap(x: number, y: number): void {
    if (inside(START, x, y)) this.start();
    else if (inside(TOPUP, x, y)) this.topUp();
  }

  key(code: string): void {
    if (code === 'Enter' || code === 'Space') this.start();
  }

  private topUp(): void {
    audio.play('confirm');
    this.app.go(new TopUpScene(this.app, () => new TitleScene(this.app)));
  }

  private start(): void {
    audio.play('confirm');
    this.app.go(new ModeSelectScene(this.app));
  }
}
