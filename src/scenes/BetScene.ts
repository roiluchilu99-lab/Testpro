import { getCharacter } from '../battle/characters';
import { GAME } from '../config/game';
import { getOdds } from '../config/odds';
import { audio } from '../core/Audio';
import type { App, Scene } from '../core/SceneManager';
import { newSeed } from '../core/SceneManager';
import { drawAvatar, drawBg, drawButton, drawText, inside, type Rect } from '../ui/widgets';
import { BattleScene } from './BattleScene';
import { ModeSelectScene } from './ModeSelectScene';
import { TopUpScene } from './TopUpScene';

export interface BetInfo {
  /** 押的一方：0 = 1P，1 = 2P */
  side: 0 | 1;
  amount: number;
  odds: number;
}

const SIDE: Rect[] = [
  { x: 40, y: 640, w: 300, h: 110 },
  { x: 380, y: 640, w: 300, h: 110 },
];
// 金额档位 + 「全部押上」
const AMOUNT_Y = 830;
const AMOUNT_W = 150;
const amountRect = (i: number): Rect => ({ x: 40 + i * (AMOUNT_W + 13.3), y: AMOUNT_Y, w: AMOUNT_W, h: 90 });
const GO: Rect = { x: 110, y: 990, w: 500, h: 100 };
const WATCH: Rect = { x: 160, y: 1110, w: 400, h: 70 };
const TOPUP: Rect = { x: 110, y: 990, w: 500, h: 100 };
const BACK: Rect = { x: 20, y: 20, w: 140, h: 60 };

// VS 画面 + 下注：选押哪一方、押多少，也可以直接观战
export class BetScene implements Scene {
  private side: 0 | 1 = 0;
  /** 金额档位下标；档位数 = 全部押上 */
  private amountIdx = 0;
  private odds: [number, number];

  constructor(
    private app: App,
    private ids: [string, string],
  ) {
    this.odds = getOdds(ids[0], ids[1]);
    if (!this.canBet(this.amountIdx)) this.amountIdx = GAME.bet.amounts.length;
  }

  private get coins(): number {
    return this.app.save.data.coins;
  }

  private amountOf(i: number): number {
    return i < GAME.bet.amounts.length ? GAME.bet.amounts[i] : this.coins;
  }

  private canBet(i: number): boolean {
    return this.coins > 0 && (i >= GAME.bet.amounts.length || GAME.bet.amounts[i] <= this.coins);
  }

  update(): void {
    // 金币变化后（如充值）保证选中的档位仍然可押
    if (!this.canBet(this.amountIdx)) this.amountIdx = GAME.bet.amounts.length;
  }

  tap(x: number, y: number): void {
    if (inside(BACK, x, y)) return this.app.go(new ModeSelectScene(this.app));
    if (this.coins === 0) {
      if (inside(TOPUP, x, y)) this.topUp();
    } else {
      SIDE.forEach((r, i) => {
        if (inside(r, x, y)) this.side = i as 0 | 1;
      });
      for (let i = 0; i <= GAME.bet.amounts.length; i++) {
        if (inside(amountRect(i), x, y) && this.canBet(i)) this.amountIdx = i;
      }
      if (inside(GO, x, y)) this.fight(true);
    }
    if (inside(WATCH, x, y)) this.fight(false);
  }

  key(code: string): void {
    const n = GAME.bet.amounts.length + 1;
    if (code === 'Escape') return this.app.go(new ModeSelectScene(this.app));
    if (this.coins === 0) {
      if (code === 'Enter') this.topUp();
      else if (code === 'Space') this.fight(false);
      return;
    }
    const prev = (this.amountIdx + n - 1) % n;
    const next = (this.amountIdx + 1) % n;
    if (code === 'ArrowLeft' || code === 'ArrowRight') this.side = this.side === 0 ? 1 : 0;
    else if (code === 'ArrowUp' && this.canBet(prev)) this.amountIdx = prev;
    else if (code === 'ArrowDown' && this.canBet(next)) this.amountIdx = next;
    else if (code === 'Enter') this.fight(true);
    else if (code === 'Space') this.fight(false);
  }

  /** 金币用完时去充值，充完回到这个下注画面 */
  private topUp(): void {
    audio.play('confirm');
    this.app.go(new TopUpScene(this.app, () => new BetScene(this.app, this.ids)));
  }

  private fight(withBet: boolean): void {
    const bet: BetInfo | null = withBet
      ? { side: this.side, amount: this.amountOf(this.amountIdx), odds: this.odds[this.side] }
      : null;
    audio.play('confirm');
    this.app.go(new BattleScene(this.app, this.ids, newSeed(), bet));
  }

  draw(ctx: CanvasRenderingContext2D): void {
    drawBg(ctx);
    drawButton(ctx, BACK, '← 戻る', { fill: 'rgba(255,255,255,0.08)', size: 26 });
    drawText(ctx, `コイン ${this.coins}`, GAME.width / 2, 50, 34, '#f5b800');

    // VS 画面：左右角色 + 中间 VS
    for (let p = 0; p < 2; p++) {
      const c = getCharacter(this.ids[p]);
      const x = p === 0 ? 40 + 150 : GAME.width - 40 - 150;
      drawText(ctx, `${p + 1}P`, x, 160, 38, p === 0 ? '#ff4d4d' : '#4aa3ff');
      drawAvatar(ctx, x, 300, 90, c.color);
      drawText(ctx, c.name, x, 440, 40);
      drawText(ctx, c.desc, x, 490, 18, '#aaa', 'center', false);
    }
    drawText(ctx, 'VS', GAME.width / 2, 300, 100, '#f5b800');

    if (this.coins === 0) {
      drawText(ctx, 'コインがなくなりました', GAME.width / 2, 700, 40, '#ff8a80');
      drawButton(ctx, TOPUP, 'コインをチャージする', { fill: '#2e9e5b', size: 36 });
    } else {
      drawText(ctx, 'どちらが勝つ？', GAME.width / 2, 580, 36);
      SIDE.forEach((r, i) => {
        const on = this.side === i;
        drawButton(ctx, r, '', { fill: on ? '#2e6fd6' : 'rgba(255,255,255,0.06)', stroke: on ? '#8fb8ff' : '#333a47' });
        drawText(ctx, `${i + 1}P 勝利`, r.x + r.w / 2, r.y + 38, 34, on ? '#fff' : '#aaa');
        drawText(ctx, `×${this.odds[i].toFixed(2)}`, r.x + r.w / 2, r.y + 78, 30, '#f5b800');
      });
      for (let i = 0; i <= GAME.bet.amounts.length; i++) {
        const on = this.amountIdx === i;
        drawButton(ctx, amountRect(i), i < GAME.bet.amounts.length ? String(GAME.bet.amounts[i]) : 'ALL IN', {
          fill: on ? '#c98b00' : 'rgba(255,255,255,0.06)',
          stroke: on ? '#f5b800' : '#333a47',
          size: 30,
          disabled: !this.canBet(i),
        });
      }
      const amount = this.amountOf(this.amountIdx);
      drawText(ctx, `当たり時 +${Math.round(amount * this.odds[this.side])}　外れ −${amount}`, GAME.width / 2, 950, 28, '#ccc', 'center', false);
      drawButton(ctx, GO, 'この内容でバトル！', { fill: '#2e9e5b', size: 38 });
    }
    drawButton(ctx, WATCH, '賭けずに観戦', { fill: 'rgba(255,255,255,0.08)', size: 28 });
    drawText(ctx, '←→ 1P/2P / ↑↓ 金額 / Enter 決定 / Space 観戦', GAME.width / 2, GAME.height - 40, 20, '#666', 'center', false);
  }
}
