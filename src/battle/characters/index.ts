import { ARCHER, SIKONG, SWORDSMAN, VAMPIRE } from '../../config/characters';
import type { Ball } from '../Ball';
import { Archer } from './Archer';
import { Sikong } from './Sikong';
import { Swordsman } from './Swordsman';
import { Vampire } from './Vampire';

// 角色注册表：新增角色只需在此登记，选人/随机/下注界面自动读取
export type BallFactory = (x: number, y: number, angle: number) => Ball;

export interface CharacterEntry {
  id: string;
  name: string;
  color: string;
  /** 选人界面的技能简介 */
  desc: string;
  /** 能力评级 1~5（攻击/防御/速度），仅用于选人界面展示 */
  stats: { atk: number; def: number; spd: number };
  create: BallFactory;
}

export const REGISTRY: CharacterEntry[] = [
  {
    id: VAMPIRE.id,
    name: VAMPIRE.name,
    color: VAMPIRE.color,
    desc: '牙で噛みつき、HPを吸収',
    stats: { atk: 4, def: 3, spd: 4 },
    create: (x, y, a) => new Vampire(VAMPIRE, x, y, a),
  },
  {
    id: ARCHER.id,
    name: ARCHER.name,
    color: ARCHER.color,
    desc: '連続で矢を放つ',
    stats: { atk: 3, def: 2, spd: 3 },
    create: (x, y, a) => new Archer(ARCHER, x, y, a),
  },
  {
    id: SIKONG.id,
    name: SIKONG.name,
    color: SIKONG.color,
    desc: '雷電ダッシュで敵を貫く',
    stats: { atk: 5, def: 2, spd: 3 },
    create: (x, y, a) => new Sikong(SIKONG, x, y, a),
  },
  {
    id: SWORDSMAN.id,
    name: SWORDSMAN.name,
    color: SWORDSMAN.color,
    desc: '回転する剣で斬り、矢を跳ね返す',
    stats: { atk: 3, def: 4, spd: 3 },
    create: (x, y, a) => new Swordsman(SWORDSMAN, x, y, a),
  },
];

export function getCharacter(id: string): CharacterEntry {
  const c = REGISTRY.find((e) => e.id === id);
  if (!c) throw new Error(`未知角色: ${id}`);
  return c;
}
