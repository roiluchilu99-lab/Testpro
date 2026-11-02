import { GAME } from '../config/game';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const inside = (r: Rect, x: number, y: number): boolean =>
  x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

export function drawBg(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#14161c';
  ctx.fillRect(0, 0, GAME.width, GAME.height);
}

export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  color = '#fff',
  align: CanvasTextAlign = 'center',
  bold = true,
): void {
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.font = `${bold ? 'bold ' : ''}${size}px sans-serif`;
  ctx.fillText(text, x, y);
}

export function drawButton(
  ctx: CanvasRenderingContext2D,
  r: Rect,
  label: string,
  opts: { fill?: string; stroke?: string; color?: string; size?: number; disabled?: boolean } = {},
): void {
  ctx.globalAlpha = opts.disabled ? 0.35 : 1;
  ctx.fillStyle = opts.fill ?? '#2e6fd6';
  ctx.fillRect(r.x, r.y, r.w, r.h);
  if (opts.stroke) {
    ctx.lineWidth = 4;
    ctx.strokeStyle = opts.stroke;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
  }
  drawText(ctx, label, r.x + r.w / 2, r.y + r.h / 2, opts.size ?? 36, opts.color ?? '#fff');
  ctx.globalAlpha = 1;
}

/** 角色头像：彩色圆 + 白描边 */
export function drawAvatar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = Math.max(3, r / 12);
  ctx.strokeStyle = '#fff';
  ctx.stroke();
}
