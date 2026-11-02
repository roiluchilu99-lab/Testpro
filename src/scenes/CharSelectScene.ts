import { REGISTRY } from '../battle/characters';
import { GAME } from '../config/game';
import { audio } from '../core/Audio';
import { lobbyRng } from '../core/Random';
import type { App, Scene } from '../core/SceneManager';
import { drawAvatar, drawBg, drawButton, drawText, inside, type Rect } from '../ui/widgets';
import { BetScene } from './BetScene';
import { ModeSelectScene } from './ModeSelectScene';

const CELL = 148;
const GAP = 16;
const GRID_X = (GAME.width - GAME.select.cols * CELL - (GAME.select.cols - 1) * GAP) / 2;
const GRID_Y = 620;
const PANEL_W = 330;
const PANEL_Y = 130;
const PANEL_H = 420;
const BACK: Rect = { x: 20, y: 20, w: 140, h: 60 };
const CURSOR_COLORS = ['#ff4d4d', '#4aa3ff'];
const FLASH = 0.35;

// 格子下标：0..n-1 为角色，n 为「随机」，之后是「？」占位
const RANDOM_CELL = REGISTRY.length;
const SLOTS = Math.max(GAME.select.slots, REGISTRY.length + 1);

const cellRect = (i: number): Rect => ({
  x: GRID_X + (i % GAME.select.cols) * (CELL + GAP),
  y: GRID_Y + Math.floor(i / GAME.select.cols) * (CELL + GAP),
  w: CELL,
  h: CELL,
});

// 拳皇式选人：1P（红框）先选，2P（蓝框）再选，可选同一角色
export class CharSelectScene implements Scene {
  private phase = 0;
  private picks: number[] = [];
  private cursor = 0;
  /** 确认后的闪烁倒计时；归零后再进入下一步 */
  private flash = 0;
  private time = 0;

  constructor(private app: App) {}

  update(dt: number): void {
    this.time += dt;
    if (this.flash <= 0) return;
    this.flash -= dt;
    if (this.flash > 0) return;
    if (this.picks.length === 2) {
      this.app.go(new BetScene(this.app, [REGISTRY[this.picks[0]].id, REGISTRY[this.picks[1]].id]));
    } else {
      this.phase = 1;
    }
  }

  tap(x: number, y: number): void {
    if (this.flash > 0) return;
    if (inside(BACK, x, y)) return this.back();
    for (let i = 0; i <= RANDOM_CELL; i++) {
      if (inside(cellRect(i), x, y)) {
        this.cursor = i;
        this.confirm();
      }
    }
  }

  key(code: string): void {
    if (this.flash > 0) return;
    const cols = GAME.select.cols;
    const before = this.cursor;
    const n = RANDOM_CELL + 1;
    if (code === 'ArrowLeft') this.cursor = (this.cursor + n - 1) % n;
    else if (code === 'ArrowRight') this.cursor = (this.cursor + 1) % n;
    else if (code === 'ArrowUp' && this.cursor >= cols) this.cursor -= cols;
    else if (code === 'ArrowDown' && this.cursor + cols < n) this.cursor += cols;
    else if (code === 'Enter' || code === 'Space') this.confirm();
    else if (code === 'Escape') this.back();
    if (this.cursor !== before) audio.play('blip');
  }

  private confirm(): void {
    const pick = this.cursor === RANDOM_CELL ? lobbyRng.int(REGISTRY.length) : this.cursor;
    this.picks.push(pick);
    audio.play('confirm');
    this.flash = FLASH;
  }

  private back(): void {
    if (this.phase === 1) {
      this.phase = 0;
      this.picks.pop();
    } else {
      this.app.go(new ModeSelectScene(this.app));
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    drawBg(ctx);
    drawText(ctx, '選手選択', GAME.width / 2, 70, 52);
    drawButton(ctx, BACK, '← 戻る', { fill: 'rgba(255,255,255,0.08)', size: 26 });

    for (let p = 0; p < 2; p++) this.drawPanel(ctx, p);

    for (let i = 0; i < SLOTS; i++) {
      const r = cellRect(i);
      const mid = r.x + r.w / 2;
      const midY = r.y + r.h / 2;
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#333a47';
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      if (i < REGISTRY.length) {
        drawAvatar(ctx, mid, midY - 14, 42, REGISTRY[i].color);
        drawText(ctx, REGISTRY[i].name, mid, r.y + r.h - 22, 22);
      } else if (i === RANDOM_CELL) {
        drawText(ctx, '？', mid, midY - 14, 64, '#8fb8ff');
        drawText(ctx, 'ランダム', mid, r.y + r.h - 22, 22, '#8fb8ff');
      } else {
        ctx.globalAlpha = 0.3;
        drawText(ctx, '？', mid, midY, 64, '#888');
        ctx.globalAlpha = 1;
      }
    }

    // 已确认的选择：实线框；当前光标：闪烁框
    for (let p = 0; p < this.picks.length; p++) this.frame(ctx, this.picks[p], p, p === this.picks.length - 1 && this.flash > 0);
    if (this.flash <= 0) this.frame(ctx, this.cursor, this.phase, true);

    drawText(ctx, '矢印キーで移動 / Enterで決定 / Escで戻る', GAME.width / 2, GAME.height - 50, 22, '#666', 'center', false);
  }

  private frame(ctx: CanvasRenderingContext2D, cell: number, p: number, blink: boolean): void {
    if (blink && Math.floor(this.time * 8) % 2 === 0) return;
    const r = cellRect(cell);
    // 两方框重叠时错开一点，避免互相遮住
    const inset = 3 + p * 6;
    ctx.lineWidth = 5;
    ctx.strokeStyle = CURSOR_COLORS[p];
    ctx.strokeRect(r.x + inset, r.y + inset, r.w - inset * 2, r.h - inset * 2);
    drawText(ctx, `${p + 1}P`, r.x + 24 + p * 100, r.y + 20, 22, CURSOR_COLORS[p]);
  }

  /** 两侧的大号角色展示区：已选 / 光标所指 / 等待 */
  private drawPanel(ctx: CanvasRenderingContext2D, p: number): void {
    const x = p === 0 ? 20 : GAME.width - 20 - PANEL_W;
    const mid = x + PANEL_W / 2;
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(x, PANEL_Y, PANEL_W, PANEL_H);
    ctx.lineWidth = 3;
    ctx.strokeStyle = CURSOR_COLORS[p];
    ctx.strokeRect(x, PANEL_Y, PANEL_W, PANEL_H);
    drawText(ctx, `${p + 1}P`, mid, PANEL_Y + 36, 40, CURSOR_COLORS[p]);

    const cell = p < this.picks.length ? this.picks[p] : p === this.phase ? this.cursor : -1;
    if (cell < 0) return drawText(ctx, '待機中…', mid, PANEL_Y + 220, 30, '#666');
    if (cell === RANDOM_CELL) {
      drawText(ctx, '？', mid, PANEL_Y + 150, 110, '#8fb8ff');
      return drawText(ctx, 'ランダム', mid, PANEL_Y + 260, 38);
    }
    const c = REGISTRY[cell];
    drawAvatar(ctx, mid, PANEL_Y + 140, 70, c.color);
    drawText(ctx, c.name, mid, PANEL_Y + 250, 38);
    drawText(ctx, c.desc, mid, PANEL_Y + 292, 20, '#aaa', 'center', false);
    const bars: [string, number][] = [['攻撃', c.stats.atk], ['防御', c.stats.def], ['速度', c.stats.spd]];
    bars.forEach(([label, v], k) => {
      const y = PANEL_Y + 335 + k * 28;
      drawText(ctx, label, x + 24, y, 20, '#ccc', 'left');
      for (let s = 0; s < 5; s++) {
        ctx.fillStyle = s < v ? c.color : '#2a2f3a';
        ctx.fillRect(x + 90 + s * 44, y - 9, 38, 18);
      }
    });
  }
}
