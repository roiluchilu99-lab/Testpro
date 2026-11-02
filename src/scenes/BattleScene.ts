import { Battle, type BattleResult } from '../battle/Battle';
import { Particles } from '../battle/Effects';
import { drawBattle } from '../battle/Renderer';
import { GAME } from '../config/game';
import { audio } from '../core/Audio';
import type { App, Scene } from '../core/SceneManager';
import type { BetInfo } from './BetScene';
import { ResultScene } from './ResultScene';

const { fx } = GAME;

// 战斗场景：固定时间步长 + 累加器；把战斗事件转成音效与特效；
// 致命一击后进入慢动作 + 镜头推近，结束后进入结算
export class BattleScene implements Scene {
  private battle: Battle;
  private acc = 0;
  private particles = new Particles();
  private shake = 0;
  /** 分出胜负后已过的真实时间 */
  private endTime = 0;
  /** 致命一击的位置（镜头推近的目标） */
  private focus = { x: GAME.width / 2, y: GAME.height / 2 };
  private slowmo = false;
  private done = false;

  constructor(
    private app: App,
    ids: string[],
    seed: number,
    private bet: BetInfo | null,
  ) {
    this.battle = new Battle(ids, seed);
  }

  // 经 getter 读取，避免 TS 在 step 循环后把 battle.result 误收窄成 null
  private get result(): BattleResult | null {
    return this.battle.result;
  }

  update(dt: number): void {
    // 限制单帧累积时间，防止切后台回来后疯狂追帧
    dt = Math.min(dt, GAME.maxFrameTime);
    this.shake *= Math.exp(-dt * fx.shake.decay);

    if (!this.battle.result) {
      this.acc += dt;
      while (this.acc >= GAME.step && !this.battle.result) {
        this.battle.step(GAME.step);
        this.acc -= GAME.step;
      }
      this.handleEvents();
      this.particles.update(dt);
      if (this.result) this.slowmo = this.result.reason === 'ko';
      return;
    }

    // 分出胜负后：慢动作期间特效按缩放后的时间推进
    this.endTime += dt;
    const scale = this.slowmo ? fx.slowmo.scale : 1;
    this.battle.stepEffects(dt * scale);
    this.particles.update(dt * scale);
    if (this.endTime >= (this.slowmo ? fx.slowmo.duration : fx.timeoutHold)) this.finish();
  }

  /** 消费本帧的战斗事件：音效、粒子、震动 */
  private handleEvents(): void {
    const amp = fx.shake.enabled ? fx.shake.amplitude : 0;
    for (const e of this.battle.events) {
      switch (e.type) {
        case 'wall':
          audio.play('wall');
          break;
        case 'shoot':
          audio.play('shoot');
          break;
        case 'heal':
          audio.play('heal');
          break;
        case 'charge':
          audio.play('thunder');
          break;
        case 'hit':
          audio.play(e.kind === 'arrow' ? 'arrowHit' : 'hit');
          this.particles.burst(e.x, e.y, e.color, fx.hitParticles, 260);
          if (e.heavy) this.shake = Math.max(this.shake, amp);
          break;
        case 'fatal':
          audio.play('fatal');
          audio.play('kill');
          this.particles.burst(e.x, e.y, e.color, fx.fatalParticles, 480);
          this.shake = Math.max(this.shake, amp * fx.shake.fatalMul);
          this.focus = { x: e.x, y: e.y };
          break;
      }
    }
    this.battle.events.length = 0;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, GAME.width, GAME.height);
    ctx.save();

    // 镜头：慢动作期间向致命一击处推近
    if (this.slowmo) {
      const k = Math.min(1, this.endTime / fx.slowmo.zoomTime);
      const ease = 1 - (1 - k) * (1 - k);
      const zoom = 1 + (fx.slowmo.zoom - 1) * ease;
      const cx = GAME.width / 2 + (this.focus.x - GAME.width / 2) * ease;
      const cy = GAME.height / 2 + (this.focus.y - GAME.height / 2) * ease;
      ctx.translate(GAME.width / 2, GAME.height / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-cx, -cy);
    }
    if (this.shake > 0.3) {
      ctx.translate((Math.random() - 0.5) * 2 * this.shake, (Math.random() - 0.5) * 2 * this.shake);
    }

    drawBattle(ctx, this.battle);
    this.particles.draw(ctx);
    ctx.restore();

    if (this.battle.result) {
      const winner = this.battle.result.winner;
      ctx.fillStyle = winner ? winner.color : '#fff';
      ctx.font = 'bold 56px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.battle.result.reason === 'ko' ? 'K.O.' : 'TIME UP', GAME.width / 2, GAME.height - 90);
    }
  }

  // 结束后点击或按键可跳过
  tap(): void {
    if (this.battle.result) this.finish();
  }

  key(code: string): void {
    if (this.battle.result && (code === 'Space' || code === 'Enter')) this.finish();
  }

  private finish(): void {
    if (this.done) return;
    this.done = true;
    this.app.go(new ResultScene(this.app, this.battle, this.bet));
  }
}
