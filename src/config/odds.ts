import { GAME } from './game';

// 各对局的预估胜率：键为 "1P角色id|2P角色id"，值为 1P 获胜概率。
// 由 npm run sim 模拟得出后填入（每个种子双方换位各打一次，共 2000 局）；没有数据的对局使用默认赔率。
export const WIN_RATE: Record<string, number> = {
  'vampire|vampire': 0.5,
  'vampire|archer': 0.522,
  'vampire|sikong': 0.539,
  'archer|archer': 0.5,
  'archer|sikong': 0.481,
  'sikong|sikong': 0.5,
  'vampire|swordsman': 0.623,
  'archer|swordsman': 0.513,
  'sikong|swordsman': 0.526,
  'swordsman|swordsman': 0.5,
};

const round = (v: number): number => Math.round(v / GAME.bet.oddsStep) * GAME.bet.oddsStep;

/** 返回 [押 1P 胜的赔率, 押 2P 胜的赔率] */
export function getOdds(id1: string, id2: string): [number, number] {
  const p = WIN_RATE[`${id1}|${id2}`] ?? (WIN_RATE[`${id2}|${id1}`] != null ? 1 - WIN_RATE[`${id2}|${id1}`] : null);
  if (p == null || p <= 0 || p >= 1) return [GAME.bet.defaultOdds, GAME.bet.defaultOdds];
  const fix = (v: number): number => Number(round(v).toFixed(2));
  return [fix(GAME.bet.payoutRate / p), fix(GAME.bet.payoutRate / (1 - p))];
}
