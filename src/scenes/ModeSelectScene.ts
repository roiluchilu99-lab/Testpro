import type { App, Scene } from '../core/SceneManager';
import { GAME } from '../config/game';
import { audio } from '../core/Audio';
import { drawBg, drawButton, drawText, inside, type Rect } from '../ui/widgets';
import { CharSelectScene } from './CharSelectScene';
import { FfaSelectScene } from './FfaSelectScene';
import { RandomScene } from './RandomScene';
import { TitleScene } from './TitleScene';

const ITEMS = [
  { label: '選手を選ぶ', sub: 'P1 / P2 を自分で選択', fill: '#2e6fd6' },
  { label: 'ランダム対戦', sub: 'スロットで対戦カードを決定', fill: '#8e44ad' },
  { label: '大乱闘', sub: '3〜16人で勝負（賭けなし）', fill: '#c0392b' },
];
const BTN = (i: number): Rect => ({ x: 110, y: 400 + i * 190, w: 500, h: 150 });
const BACK: Rect = { x: 20, y: 20, w: 140, h: 60 };

// 模式选择：选人 / 随机 / 大乱斗
export class ModeSelectScene implements Scene {
  private cursor = 0;

  constructor(private app: App) {}

  update(): void {}

  draw(ctx: CanvasRenderingContext2D): void {
    drawBg(ctx);
    drawText(ctx, 'モード選択', GAME.width / 2, 200, 64);
    drawText(ctx, `コイン ${this.app.save.data.coins}`, GAME.width / 2, 290, 34, '#f5b800');
    ITEMS.forEach((it, i) => {
      const r = BTN(i);
      drawButton(ctx, r, '', { fill: it.fill, stroke: this.cursor === i ? '#fff' : undefined });
      drawText(ctx, it.label, r.x + r.w / 2, r.y + 55, 44);
      drawText(ctx, it.sub, r.x + r.w / 2, r.y + 108, 24, 'rgba(255,255,255,0.8)', 'center', false);
    });
    drawButton(ctx, BACK, '← 戻る', { fill: 'rgba(255,255,255,0.08)', size: 26 });
  }

  tap(x: number, y: number): void {
    if (inside(BACK, x, y)) return this.app.go(new TitleScene(this.app));
    ITEMS.forEach((_, i) => {
      if (inside(BTN(i), x, y)) this.choose(i);
    });
  }

  key(code: string): void {
    if (code === 'ArrowUp' || code === 'ArrowDown') audio.play('blip');
    if (code === 'ArrowUp') this.cursor = (this.cursor + ITEMS.length - 1) % ITEMS.length;
    else if (code === 'ArrowDown') this.cursor = (this.cursor + 1) % ITEMS.length;
    else if (code === 'Enter' || code === 'Space') this.choose(this.cursor);
    else if (code === 'Escape') this.app.go(new TitleScene(this.app));
  }

  private choose(i: number): void {
    audio.play('confirm');
    if (i === 0) this.app.go(new CharSelectScene(this.app));
    else if (i === 1) this.app.go(new RandomScene(this.app));
    else this.app.go(new FfaSelectScene(this.app));
  }
}
