import { GAME } from '../config/game';
import { audio } from '../core/Audio';
import type { App, Scene } from '../core/SceneManager';
import { drawBg, drawButton, drawText, inside, type Rect } from '../ui/widgets';

type Phase = 'plans' | 'card' | 'processing' | 'success';

const { plans, testCard, processTime, adminAmounts, inputLock } = GAME.topup;

const BACK: Rect = { x: 20, y: 20, w: 140, h: 60 };
const planRect = (i: number): Rect => ({ x: 90, y: 340 + i * 125, w: 540, h: 105 });
const adminRect = (i: number): Rect => ({ x: 90 + i * 280, y: 960, w: 260, h: 90 });
const PAY: Rect = { x: 110, y: 1040, w: 500, h: 100 };
const DONE: Rect = { x: 110, y: 1000, w: 500, h: 100 };

/** URL に ?admin が付いているときだけ管理者モード */
const isAdmin = (): boolean => new URLSearchParams(location.search).has('admin');

// コインチャージ（デモ決済）：プラン選択 → カード（固定のテストカード）→ 処理中 → 完了。
// 実際の請求は一切発生せず、カード情報の入力・保存・送信も行わない
export class TopUpScene implements Scene {
  private phase: Phase = 'plans';
  private cursor = 1;
  /** 現在の画面に入ってからの経過秒 */
  private age = 0;
  private plan: { coins: number; price: number } = plans[0];
  /** 管理者チャージ直後の通知 */
  private toast: { text: string; t: number } | null = null;
  private readonly admin = isAdmin();

  /** back：チャージ画面を出たあとに戻る画面 */
  constructor(
    private app: App,
    private back: () => Scene,
  ) {}

  private go(phase: Phase): void {
    this.phase = phase;
    this.age = 0;
  }

  update(dt: number): void {
    this.age += dt;
    if (this.toast) {
      this.toast.t -= dt;
      if (this.toast.t <= 0) this.toast = null;
    }
    if (this.phase === 'processing' && this.age >= processTime) this.complete();
  }

  private complete(): void {
    this.app.save.addCoins(this.plan.coins);
    audio.play('coin');
    this.go('success');
  }

  private choose(i: number): void {
    audio.play('confirm');
    this.plan = plans[i];
    this.go('card');
  }

  private adminCharge(amount: number): void {
    this.app.save.addCoins(amount);
    audio.play('coin');
    this.toast = { text: `+${amount} コイン（管理者）`, t: 1.2 };
  }

  private leave(): void {
    this.app.go(this.back());
  }

  tap(x: number, y: number): void {
    if (this.age < inputLock) return;
    if (this.phase === 'processing') return;
    if (this.phase === 'plans') {
      if (inside(BACK, x, y)) return this.leave();
      plans.forEach((_, i) => {
        if (inside(planRect(i), x, y)) this.choose(i);
      });
      if (this.admin) {
        adminAmounts.forEach((a, i) => {
          if (inside(adminRect(i), x, y)) this.adminCharge(a);
        });
      }
    } else if (this.phase === 'card') {
      if (inside(BACK, x, y)) this.go('plans');
      else if (inside(PAY, x, y)) this.pay();
    } else if (inside(DONE, x, y)) {
      this.leave();
    }
  }

  key(code: string): void {
    if (this.age < inputLock) return;
    if (this.phase === 'plans') {
      if (code === 'ArrowUp') this.cursor = (this.cursor + plans.length - 1) % plans.length;
      else if (code === 'ArrowDown') this.cursor = (this.cursor + 1) % plans.length;
      else if (code === 'Enter' || code === 'Space') this.choose(this.cursor);
      else if (code === 'Escape') this.leave();
    } else if (this.phase === 'card') {
      if (code === 'Enter' || code === 'Space') this.pay();
      else if (code === 'Escape') this.go('plans');
    } else if (this.phase === 'success') {
      if (code === 'Enter' || code === 'Space' || code === 'Escape') this.leave();
    }
  }

  private pay(): void {
    audio.play('confirm');
    this.go('processing');
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const cx = GAME.width / 2;
    drawBg(ctx);
    if (this.phase === 'plans') this.drawPlans(ctx, cx);
    else if (this.phase === 'card') this.drawCard(ctx, cx);
    else if (this.phase === 'processing') this.drawProcessing(ctx, cx);
    else this.drawSuccess(ctx, cx);
  }

  /** どの画面にも出す注意書き */
  private banner(ctx: CanvasRenderingContext2D, y: number): void {
    ctx.fillStyle = '#f5b800';
    ctx.fillRect(40, y, GAME.width - 80, 64);
    drawText(ctx, 'デモ決済・実際の請求は発生しません', GAME.width / 2, y + 32, 30, '#14161c');
  }

  private drawPlans(ctx: CanvasRenderingContext2D, cx: number): void {
    drawButton(ctx, BACK, '← 戻る', { fill: 'rgba(255,255,255,0.08)', size: 26 });
    drawText(ctx, 'コインチャージ', cx, 130, 60);
    drawText(ctx, `所持コイン ${this.app.save.data.coins}`, cx, 205, 36, '#f5b800');
    this.banner(ctx, 240);
    plans.forEach((p, i) => {
      const r = planRect(i);
      const on = this.cursor === i;
      drawButton(ctx, r, '', { fill: on ? '#2e6fd6' : 'rgba(255,255,255,0.06)', stroke: on ? '#8fb8ff' : '#333a47' });
      drawText(ctx, `+${p.coins} コイン`, r.x + 30, r.y + r.h / 2, 38, '#fff', 'left');
      drawText(ctx, `デモ価格 ¥${p.price}`, r.x + r.w - 30, r.y + r.h / 2, 28, '#f5b800', 'right');
    });
    if (this.admin) {
      drawText(ctx, '管理者モード（無料チャージ）', cx, 920, 30, '#ff8a80');
      adminAmounts.forEach((a, i) => {
        drawButton(ctx, adminRect(i), `+${a}`, { fill: '#c0392b', size: 34 });
      });
      if (this.toast) drawText(ctx, this.toast.text, cx, 1090, 36, '#4cd964');
    }
    drawText(ctx, '↑↓ プラン / Enter 決定 / Esc 戻る', cx, GAME.height - 40, 20, '#666', 'center', false);
  }

  private drawCard(ctx: CanvasRenderingContext2D, cx: number): void {
    drawButton(ctx, BACK, '← 戻る', { fill: 'rgba(255,255,255,0.08)', size: 26 });
    drawText(ctx, 'お支払い（デモ）', cx, 130, 56);
    this.banner(ctx, 175);
    drawText(ctx, `+${this.plan.coins} コイン　デモ価格 ¥${this.plan.price}`, cx, 290, 34, '#f5b800');

    // カード
    const grad = ctx.createLinearGradient(60, 340, 660, 640);
    grad.addColorStop(0, '#3a4a8c');
    grad.addColorStop(1, '#8e44ad');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(60, 340, 600, 300, 24);
    ctx.fill();
    ctx.fillStyle = '#d9b44a';
    ctx.beginPath();
    ctx.roundRect(100, 400, 80, 60, 10);
    ctx.fill();
    drawText(ctx, 'DEMO CARD', 620, 380, 24, 'rgba(255,255,255,0.7)', 'right');
    drawText(ctx, testCard.number, 100, 530, 44, '#fff', 'left');
    drawText(ctx, testCard.name, 100, 595, 28, '#fff', 'left');
    drawText(ctx, `VALID THRU ${testCard.expiry}`, 620, 595, 26, '#fff', 'right');

    // 入力欄（固定値・編集不可）
    const rows: [string, string][] = [
      ['カード番号', testCard.number],
      ['有効期限', testCard.expiry],
      ['セキュリティコード', testCard.cvc],
    ];
    rows.forEach(([label, value], i) => {
      const y = 680 + i * 100;
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(60, y, 600, 80);
      drawText(ctx, label, 80, y + 24, 22, '#aaa', 'left', false);
      drawText(ctx, value, 80, y + 54, 30, '#888', 'left');
      drawText(ctx, 'テスト用（変更不可）', 640, y + 40, 22, '#666', 'right', false);
    });
    drawButton(ctx, PAY, '支払う（デモ）', { fill: '#2e9e5b', size: 40 });
    drawText(ctx, 'カード情報は入力・保存・送信されません', cx, GAME.height - 60, 22, '#666', 'center', false);
  }

  private drawProcessing(ctx: CanvasRenderingContext2D, cx: number): void {
    this.banner(ctx, 175);
    drawText(ctx, '決済処理中…', cx, 520, 52);
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.arc(cx, 700, 70, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#8fb8ff';
    ctx.beginPath();
    const a = this.age * 6;
    ctx.arc(cx, 700, 70, a, a + Math.PI * 1.2);
    ctx.stroke();
    ctx.lineCap = 'butt';
    drawText(ctx, 'そのままお待ちください', cx, 860, 28, '#888', 'center', false);
  }

  private drawSuccess(ctx: CanvasRenderingContext2D, cx: number): void {
    this.banner(ctx, 175);
    // 緑の丸にチェックマーク
    ctx.fillStyle = '#2e9e5b';
    ctx.beginPath();
    ctx.arc(cx, 440, 100, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 48, 442);
    ctx.lineTo(cx - 12, 480);
    ctx.lineTo(cx + 52, 400);
    ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    drawText(ctx, '決済完了', cx, 610, 64);
    drawText(ctx, `+${this.plan.coins} コイン`, cx, 700, 52, '#4cd964');
    drawText(ctx, `所持コイン ${this.app.save.data.coins}`, cx, 790, 40, '#f5b800');
    drawText(ctx, 'デモ決済のため、請求は発生していません', cx, 880, 24, '#888', 'center', false);
    drawButton(ctx, DONE, '続ける', { fill: '#2e9e5b', size: 40 });
  }
}
