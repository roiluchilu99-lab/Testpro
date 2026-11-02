import { GAME } from '../config/game';
import type { Battle } from './Battle';

export function playerColor(i: number): string {
  return GAME.playerColors[i % GAME.playerColors.length];
}

// 战斗画面渲染（只读 Battle 状态）
export function drawBattle(ctx: CanvasRenderingContext2D, battle: Battle): void {
  const { width, height, arena: A } = GAME;
  const { balls } = battle;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);

  // 场地
  battle.arena.path(ctx);
  ctx.fillStyle = A.bgColor;
  ctx.fill();
  ctx.lineWidth = A.lineWidth;
  ctx.strokeStyle = A.lineColor;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // 标题与计时（大乱斗场地很大，文字缩小并放到最上方）
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  const left = Math.max(0, battle.timeLimit - battle.time);
  if (battle.ffa) {
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText(`大乱闘 残り ${battle.alive.length} / ${balls.length} 人`, width / 2, 70);
    ctx.font = '30px sans-serif';
    ctx.fillStyle = '#aaa';
    ctx.fillText(`残り ${Math.ceil(left)} 秒`, width / 2, 125);
  } else {
    ctx.font = 'bold 56px sans-serif';
    ctx.fillText(`${balls[0].name} vs ${balls[1].name}`, width / 2, 150);
    ctx.font = '32px sans-serif';
    ctx.fillStyle = '#aaa';
    ctx.fillText(`残り ${Math.ceil(left)} 秒`, width / 2, 220);
  }

  // 战斗元素（已淘汰的球不再显示）
  const living = balls.filter((b) => !b.dead);
  for (const b of living) {
    // 吸住期间：被吸的球剧烈抖动，吸血鬼轻微抖动（只影响画面，不影响战斗逻辑）
    const amp = b.grabbedBy
      ? GAME.grabShake.victim
      : living.some((o) => o.grabbedBy === b)
        ? GAME.grabShake.vampire
        : 0;
    ctx.save();
    if (amp) ctx.translate((Math.random() - 0.5) * 2 * amp, (Math.random() - 0.5) * 2 * amp);
    b.draw(ctx);
    ctx.restore();
  }
  for (const p of battle.projectiles) p.draw(ctx);
  for (const t of battle.texts) t.draw(ctx);
  // 选手标识 P1 / P2 / ...
  for (const b of living) {
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#000';
    ctx.strokeText(`P${b.player + 1}`, b.x, b.y + b.radius + 22);
    ctx.fillStyle = playerColor(b.player);
    ctx.fillText(`P${b.player + 1}`, b.x, b.y + b.radius + 22);
  }

  // 种子（便于复现）
  ctx.textAlign = 'right';
  ctx.font = '22px sans-serif';
  ctx.fillStyle = '#666';
  ctx.fillText(`seed ${battle.seed}`, width - 16, height - 24);
}
