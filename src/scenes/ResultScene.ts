import type { Battle } from '../battle/Battle';
import { GAME } from '../config/game';
import { audio } from '../core/Audio';
import type { App, Scene } from '../core/SceneManager';
import { drawAvatar, drawBg, drawButton, drawText, inside, type Rect } from '../ui/widgets';
import type { BetInfo } from './BetScene';
import { ModeSelectScene } from './ModeSelectScene';
import { TitleScene } from './TitleScene';

const AGAIN: Rect = { x: 110, y: 1000, w: 500, h: 90 };
const TITLE: Rect = { x: 110, y: 1110, w: 500, h: 80 };
/** 金币数字滚动到最终值所用时间（秒） */
const ROLL = 1;

// 结算画面：胜者、本局数据、下注结果与金币变化
export class ResultScene implements Scene {
  private from: number;
  private to: number;
  /** 本局金币变化；没下注为 null */
  private delta: number | null = null;
  private outcome: '当たり' | '外れ' | '引き分け' | null = null;
  private time = 0;

  constructor(
    private app: App,
    private battle: Battle,
    bet: BetInfo | null,
  ) {
    const save = app.save;
    this.from = save.data.coins;
    const winner = battle.result?.winner ?? null;
    if (bet) {
      if (!winner) {
        // 平局退还赌注
        this.outcome = '引き分け';
        this.delta = 0;
      } else if (winner.player === bet.side) {
        this.outcome = '当たり';
        this.delta = Math.round(bet.amount * bet.odds);
      } else {
        this.outcome = '外れ';
        this.delta = -bet.amount;
      }
      save.addCoins(this.delta);
    }
    save.record(bet ? { hit: this.outcome === '当たり' } : null);
    this.to = save.data.coins;
    audio.play('win');
    if (this.delta) setTimeout(() => audio.play('coin'), 500);
  }

  update(dt: number): void {
    this.time += dt;
  }

  tap(x: number, y: number): void {
    if (inside(AGAIN, x, y)) this.again();
    else if (inside(TITLE, x, y)) this.app.go(new TitleScene(this.app));
  }

  key(code: string): void {
    if (code === 'Enter' || code === 'Space') this.again();
    else if (code === 'Escape') this.app.go(new TitleScene(this.app));
  }

  private again(): void {
    this.app.go(new ModeSelectScene(this.app));
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const cx = GAME.width / 2;
    const { winner } = this.battle.result!;
    drawBg(ctx);

    if (winner) {
      drawAvatar(ctx, cx, 200, 90, winner.color);
      drawText(ctx, `P${winner.player + 1} ${winner.name}`, cx, 335, 44, winner.color);
      drawText(ctx, '勝利！', cx, 415, 76);
    } else {
      drawText(ctx, '引き分け', cx, 300, 76);
    }

    const reason = this.battle.result!.reason === 'ko' ? 'KO' : 'タイムアップ';
    const hpText = winner ? `　勝者HP ${Math.ceil(winner.hp)}/${winner.maxHp}` : '';
    drawText(ctx, `${reason}　${this.battle.time.toFixed(1)} 秒${hpText}`, cx, 490, 28, '#ccc', 'center', false);
    if (!this.battle.ffa) this.drawStats(ctx);

    if (this.delta !== null) {
      const sign = this.delta > 0 ? '+' : this.delta < 0 ? '−' : '±';
      const color = this.delta > 0 ? '#4cd964' : this.delta < 0 ? '#ff5252' : '#ccc';
      const text =
        this.outcome === '当たり'
          ? `当たり！ ${sign}${Math.abs(this.delta)} コイン`
          : this.outcome === '外れ'
            ? `外れ… ${sign}${Math.abs(this.delta)} コイン`
            : '引き分け：賭け金は返却';
      drawText(ctx, text, cx, 830, 44, color);
      const k = Math.min(1, this.time / ROLL);
      drawText(ctx, `所持コイン ${Math.round(this.from + (this.to - this.from) * k)}`, cx, 900, 38, '#f5b800');
    } else {
      drawText(ctx, '賭けなしの観戦', cx, 830, 36, '#888');
    }

    drawText(ctx, `seed ${this.battle.seed}`, GAME.width - 16, GAME.height - 24, 22, '#666', 'right', false);
    drawButton(ctx, AGAIN, 'もう一戦', { fill: '#2e9e5b', size: 40 });
    drawButton(ctx, TITLE, 'タイトルへ', { fill: 'rgba(255,255,255,0.08)', size: 30 });
  }

  /** 双方的本局数据：造成伤害 / 命中次数 / 回复量 */
  private drawStats(ctx: CanvasRenderingContext2D): void {
    const cx = GAME.width / 2;
    const [a, b] = this.battle.balls;
    drawText(ctx, `P1 ${a.name}`, cx - 215, 550, 26, a.color);
    drawText(ctx, `P2 ${b.name}`, cx + 215, 550, 26, b.color);
    const rows: [string, number, number][] = [
      ['与ダメージ', a.damageDealt, b.damageDealt],
      ['ヒット数', a.hits, b.hits],
      ['HP回復', a.healed, b.healed],
    ];
    rows.forEach(([label, va, vb], i) => {
      const y = 610 + i * 55;
      drawText(ctx, label, cx, y, 24, '#999', 'center', false);
      drawText(ctx, String(va), cx - 215, y, 38);
      drawText(ctx, String(vb), cx + 215, y, 38);
    });
  }
}
