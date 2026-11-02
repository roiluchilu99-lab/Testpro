import { GAME } from './config/game';
import { SceneManager } from './core/SceneManager';
import { TitleScene } from './scenes/TitleScene';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

// 画布等比缩放，居中，黑边由 body 背景提供
function resize(): void {
  const scale = Math.min(window.innerWidth / GAME.width, window.innerHeight / GAME.height);
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = `${GAME.width * scale}px`;
  canvas.style.height = `${GAME.height * scale}px`;
  canvas.width = Math.round(GAME.width * scale * dpr);
  canvas.height = Math.round(GAME.height * scale * dpr);
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

const app = new SceneManager(canvas);
app.go(new TitleScene(app));

let last = performance.now();
function frame(now: number): void {
  const dt = (now - last) / 1000;
  last = now;
  app.update(dt);
  app.draw(ctx);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
