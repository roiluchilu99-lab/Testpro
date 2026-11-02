// 角色数值配置（数据驱动）。初始值来自开发说明书，之后通过模拟调平衡。
export interface BaseCharacterConfig {
  id: string;
  name: string;
  color: string;
  hp: number;
  /** 移动速率 px/s（恒定） */
  speed: number;
  /** 球体半径 */
  radius: number;
}

export interface VampireConfig extends BaseCharacterConfig {
  /** 单次伤害 */
  damage: number;
  /** 攻击冷却（秒） */
  cooldown: number;
  /** 吸血比例（1 = 回复等量血量） */
  lifesteal: number;
  /** 两颗獠牙之间的夹角（度），以朝向敌人的方向为中心 */
  fangSpreadDeg: number;
  /** 獠牙中心到球心的距离 */
  fangOrbit: number;
  /** 獠牙判定半径 */
  fangRadius: number;
  /** 碰到对方后将其吸住的时间（秒） */
  grabDuration: number;
}

export interface ArcherConfig extends BaseCharacterConfig {
  /** 射击间隔（秒） */
  fireInterval: number;
  arrowSpeed: number;
  arrowDamage: number;
  arrowRadius: number;
  /** 每命中多少次，每轮多射 1 支 */
  streakEvery: number;
  /** 单轮最多箭数 */
  maxArrows: number;
  /** 相邻两支箭的夹角（度） */
  spreadDeg: number;
}

export interface SikongConfig extends BaseCharacterConfig {
  /** 技能冷却（秒），从一次冲刺结束开始计 */
  skillCooldown: number;
  /** 冲刺前的蓄力时间（秒） */
  chargeTime: number;
  /** 雷电位移距离 */
  dashDistance: number;
  /** 位移速度 px/s */
  dashSpeed: number;
  /** 冲刺路径上命中敌人的伤害 */
  damage: number;
  /** 雷电残影持续时间（秒） */
  trailLife: number;
  /** 弹飞：被击中者初始速度倍率 */
  knockMul: number;
  /** 弹飞：倍率衰减回 1 所需时间（秒） */
  knockTime: number;
}

export interface SwordsmanConfig extends BaseCharacterConfig {
  /** 单次伤害 */
  damage: number;
  /** 攻击冷却（秒） */
  cooldown: number;
  /** 剑绕球体旋转的角速度（弧度/秒） */
  spinSpeed: number;
  /** 剑身起点到球心的距离 */
  bladeStart: number;
  /** 剑身长度 */
  bladeLen: number;
  /** 剑身判定半径 */
  bladeWidth: number;
  /** 箭碰到剑时被反弹的概率（每支箭只判定一次） */
  reflectChance: number;
}

export const VAMPIRE: VampireConfig = {
  id: 'vampire',
  name: 'ヴァンパイア',
  color: '#d32f2f',
  hp: 100,
  speed: 260,
  radius: 40,
  damage: 4,
  cooldown: 0.2,
  // 每次咬 4 点伤害，回复 1 点（经模拟调平衡，规格初始值为 3 / 3）
  lifesteal: 0.25,
  fangSpreadDeg: 36,
  fangOrbit: 46,
  fangRadius: 16,
  grabDuration: 1,
};

export const ARCHER: ArcherConfig = {
  id: 'archer',
  name: 'アーチャー',
  color: '#8e44ad',
  hp: 100,
  speed: 220,
  radius: 40,
  fireInterval: 0.6,
  arrowSpeed: 700,
  arrowDamage: 2,
  arrowRadius: 5,
  streakEvery: 5,
  maxArrows: 5,
  spreadDeg: 12,
};

export const SIKONG: SikongConfig = {
  id: 'sikong',
  name: '雷神',
  color: '#f5b800',
  // 经模拟调平衡：血量 100 → 118，技能冷却 2 → 1.9，移速 240 → 250
  hp: 118,
  speed: 250,
  radius: 40,
  skillCooldown: 1.9,
  chargeTime: 0.3,
  dashDistance: 360,
  dashSpeed: 2200,
  damage: 15,
  trailLife: 0.4,
  knockMul: 5,
  knockTime: 0.5,
};

// 经模拟调平衡：低血量高伤害，剑长且转得快；箭只有一部分会被反弹，否则弓手几乎打不过
export const SWORDSMAN: SwordsmanConfig = {
  id: 'swordsman',
  name: '剣士',
  color: '#2e86de',
  hp: 70,
  speed: 240,
  radius: 40,
  damage: 23,
  cooldown: 0.3,
  spinSpeed: 8.5,
  bladeStart: 44,
  bladeLen: 60,
  bladeWidth: 16,
  reflectChance: 0.15,
};
