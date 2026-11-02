import { GAME } from '../config/game';

// 存档：金币与战绩，存入 localStorage
export interface SaveData {
  coins: number;
  /** 总局数 */
  games: number;
  /** 下过注的局数 */
  bets: number;
  /** 猜中次数 */
  hits: number;
  maxCoins: number;
}

const KEY = 'ballArena.save';

const fresh = (): SaveData => ({
  coins: GAME.bet.initialCoins,
  games: 0,
  bets: 0,
  hits: 0,
  maxCoins: GAME.bet.initialCoins,
});

export class Save {
  data: SaveData = fresh();

  constructor() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) this.data = { ...fresh(), ...JSON.parse(raw) };
    } catch {
      // 存档损坏或不可用时使用初始值
    }
  }

  /** 修改金币并同步最高纪录 */
  addCoins(delta: number): void {
    this.data.coins = Math.max(0, this.data.coins + delta);
    this.data.maxCoins = Math.max(this.data.maxCoins, this.data.coins);
    this.flush();
  }

  /** 记录一局结果；bet 为 null 表示没有下注 */
  record(bet: { hit: boolean } | null): void {
    this.data.games++;
    if (bet) {
      this.data.bets++;
      if (bet.hit) this.data.hits++;
    }
    this.flush();
  }

  flush(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      // 忽略写入失败
    }
  }
}
