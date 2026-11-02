import { GAME } from '../config/game';
import { REGISTRY } from '../battle/characters';
import { playerColor } from '../battle/Renderer';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Mode = 'duel' | 'ffa';

const PANEL_W = 320;
const PANEL_GAP = 20;
const PANEL_X0 = (GAME.width - PANEL_W * 2 - PANEL_GAP) / 2;
const CARD_Y0 = 290;
const CARD_H = 120;
const CARD_GAP = 16;
const START: Rect = { x: 160, y: 1110, w: 400, h: 90 };
const TOGGLE: Record<Mode, Rect> = {
  duel: { x: 110, y: 150, w: 240, h: 56 },
  ffa: { x: 370, y: 150, w: 240, h: 56 },
};
const MODE_LABEL: Record<Mode, string> = { duel: '1 vs 1', ffa: '大乱闘' };

// 大乱斗：两列、每列 8 行
const ROWS_PER_COL = 8;
const ROW_W = 320;
const ROW_H = 84;
const ROW_GAP = 8;
const ROW_Y0 = 240;
const ROW_X0 = (GAME.width - ROW_W * 2 - PANEL_GAP) / 2;
const CHIP_R = 24;
const ADD: Rect = { x: 160, y: 1010, w: 400, h: 70 };
const MIN_FFA = 3;

const inside = (r: Rect, x: number, y: number): boolean =>
  x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

// 选手选择界面：1v1 时 P1 / P2 各选一名英雄；大乱斗时可任意增减选手
export class SelectScreen {
  mode: Mode = 'duel';

  /** 传入 mode 时锁定该模式，不显示模式切换 */
  constructor(lockMode?: Mode) {
    if (lockMode) this.mode = lockMode;
    this.locked = lockMode !== undefined;
  }
  private readonly locked: boolean;
  /** 1v1：两位选手当前选中的角色下标 */
  readonly duelPicks: [number, number] = [0, 1];
  /** 大乱斗：每位选手选中的角色下标 */
  readonly ffaPicks: number[] = [0, 1, 2];

  get ids(): string[] {
    const picks = this.mode === 'duel' ? this.duelPicks : this.ffaPicks;
    return picks.map((i) => REGISTRY[i].id);
  }

  private card(player: number, i: number): Rect {
    return {
      x: PANEL_X0 + player * (PANEL_W + PANEL_GAP),
      y: CARD_Y0 + i * (CARD_H + CARD_GAP),
      w: PANEL_W,
      h: CARD_H,
    };
  }

  private row(i: number): Rect {
    const col = Math.floor(i / ROWS_PER_COL);
    return {
      x: ROW_X0 + col * (ROW_W + PANEL_GAP),
      y: ROW_Y0 + (i % ROWS_PER_COL) * (ROW_H + ROW_GAP),
      w: ROW_W,
      h: ROW_H,
    };
  }

  private chipStep(): number {
    return Math.min(64, (ROW_W - 110 - 50) / REGISTRY.length);
  }

  private chipCenter(i: number, k: number): { x: number; y: number } {
    const r = this.row(i);
    return { x: r.x + 108 + k * this.chipStep(), y: r.y + 34 };
  }

  private remove(i: number): Rect {
    const r = this.row(i);
    return { x: r.x + r.w - 44, y: r.y + 6, w: 38, h: 38 };
  }

  /** 处理点击（逻辑坐标）；点中开始按钮返回 true */
  tap(x: number, y: number): boolean {
    if (inside(START, x, y)) return true;
    for (const m of ['duel', 'ffa'] as Mode[]) {
      if (!this.locked && inside(TOGGLE[m], x, y)) this.mode = m;
    }
    if (this.mode === 'duel') {
      for (let p = 0; p < 2; p++) {
        for (let i = 0; i < REGISTRY.length; i++) {
          if (inside(this.card(p, i), x, y)) this.duelPicks[p] = i;
        }
      }
      return false;
    }

    const n = this.ffaPicks.length;
    if (n < GAME.maxPlayers && inside(ADD, x, y)) {
      this.ffaPicks.push(n % REGISTRY.length);
      return false;
    }
    for (let i = 0; i < n; i++) {
      if (n > MIN_FFA && inside(this.remove(i), x, y)) {
        this.ffaPicks.splice(i, 1);
        return false;
      }
      for (let k = 0; k < REGISTRY.length; k++) {
        const c = this.chipCenter(i, k);
        if (Math.hypot(x - c.x, y - c.y) <= CHIP_R + 8) this.ffaPicks[i] = k;
      }
    }
    return false;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const { width, height } = GAME;
    ctx.fillStyle = '#14161c';
    ctx.fillRect(0, 0, width, height);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 64px sans-serif';
    ctx.fillText('選手選択', width / 2, 100);

    // 模式切换
    for (const m of this.locked ? [] : (['duel', 'ffa'] as Mode[])) {
      const r = TOGGLE[m];
      const on = this.mode === m;
      ctx.fillStyle = on ? '#2e6fd6' : 'rgba(255,255,255,0.06)';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.lineWidth = 2;
      ctx.strokeStyle = on ? '#8fb8ff' : '#333a47';
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = on ? '#fff' : '#aaa';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText(MODE_LABEL[m], r.x + r.w / 2, r.y + r.h / 2);
    }

    if (this.mode === 'duel') this.drawDuel(ctx);
    else this.drawFfa(ctx);

    // 开始按钮
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#2e9e5b';
    ctx.fillRect(START.x, START.y, START.w, START.h);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText('バトル開始', width / 2, START.y + START.h / 2);
    ctx.fillStyle = '#666';
    ctx.font = '22px sans-serif';
    ctx.fillText('スペースキーでも開始できます', width / 2, height - 36);
  }

  private drawDuel(ctx: CanvasRenderingContext2D): void {
    for (let p = 0; p < 2; p++) {
      const color = playerColor(p);
      const cx = PANEL_X0 + p * (PANEL_W + PANEL_GAP) + PANEL_W / 2;
      ctx.textAlign = 'center';
      ctx.fillStyle = color;
      ctx.font = 'bold 44px sans-serif';
      ctx.fillText(`Player ${p + 1}`, cx, 250);

      REGISTRY.forEach((c, i) => {
        const r = this.card(p, i);
        const sel = this.duelPicks[p] === i;
        ctx.fillStyle = sel ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)';
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.lineWidth = sel ? 5 : 2;
        ctx.strokeStyle = sel ? color : '#333a47';
        ctx.strokeRect(r.x, r.y, r.w, r.h);

        ctx.beginPath();
        ctx.arc(r.x + 55, r.y + r.h / 2, 34, 0, Math.PI * 2);
        ctx.fillStyle = c.color;
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#fff';
        ctx.stroke();

        ctx.textAlign = 'left';
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 30px sans-serif';
        ctx.fillText(c.name, r.x + 105, r.y + 40);
        ctx.fillStyle = '#aaa';
        ctx.font = '19px sans-serif';
        ctx.fillText(c.desc, r.x + 105, r.y + 82);
      });
    }
  }

  private drawFfa(ctx: CanvasRenderingContext2D): void {
    const n = this.ffaPicks.length;
    for (let i = 0; i < n; i++) {
      const r = this.row(i);
      const color = playerColor(i);
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
      ctx.strokeRect(r.x, r.y, r.w, r.h);

      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      ctx.font = 'bold 34px sans-serif';
      ctx.fillText(`P${i + 1}`, r.x + 14, r.y + 34);

      REGISTRY.forEach((c, k) => {
        const p = this.chipCenter(i, k);
        const sel = this.ffaPicks[i] === k;
        ctx.beginPath();
        ctx.arc(p.x, p.y, CHIP_R, 0, Math.PI * 2);
        ctx.fillStyle = c.color;
        ctx.globalAlpha = sel ? 1 : 0.4;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.lineWidth = sel ? 5 : 2;
        ctx.strokeStyle = sel ? '#fff' : '#333a47';
        ctx.stroke();
      });
      ctx.fillStyle = '#ddd';
      ctx.font = '20px sans-serif';
      ctx.fillText(REGISTRY[this.ffaPicks[i]].name, r.x + 14, r.y + 66);

      if (n > MIN_FFA) {
        const x = this.remove(i);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(x.x, x.y, x.w, x.h);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 28px sans-serif';
        ctx.fillText('×', x.x + x.w / 2, x.y + x.h / 2 + 1);
      }
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (n < GAME.maxPlayers) {
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(ADD.x, ADD.y, ADD.w, ADD.h);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#8fb8ff';
      ctx.strokeRect(ADD.x, ADD.y, ADD.w, ADD.h);
      ctx.fillStyle = '#8fb8ff';
      ctx.font = 'bold 30px sans-serif';
      ctx.fillText(`＋ 選手を追加 (${n}/${GAME.maxPlayers})`, ADD.x + ADD.w / 2, ADD.y + ADD.h / 2);
    } else {
      ctx.fillStyle = '#888';
      ctx.font = '26px sans-serif';
      ctx.fillText(`最大 ${GAME.maxPlayers} 人`, width(), ADD.y + ADD.h / 2);
    }
  }
}

function width(): number {
  return GAME.width / 2;
}
