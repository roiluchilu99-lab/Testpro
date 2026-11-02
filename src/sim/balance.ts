// 无画面批量模拟：统计各对局的胜率与平均时长，用于调平衡和填写 config/odds.ts
// 用法：npm run sim [-- 局数 [角色1 角色2]]，不指定角色时跑所有 2 人组合
import { GAME } from '../config/game';
import { Battle } from '../battle/Battle';
import { REGISTRY } from '../battle/characters';

// 仅在 Node 中运行，不为一个 argv 引入 @types/node
declare const process: { argv: string[] };

const count = Number(process.argv[2]) || 1000;
const pairs: [string, string][] =
  process.argv[3] && process.argv[4]
    ? [[process.argv[3], process.argv[4]]]
    : REGISTRY.flatMap((a, i) => REGISTRY.slice(i).map((b): [string, string] => [a.id, b.id]));

// 每个种子交换双方出场顺序各打一次，抵消先后手带来的偏差；w1/w2 按角色 id1/id2 统计
function runPair(id1: string, id2: string): { w1: number; w2: number; draw: number; avgTime: number } {
  let w1 = 0;
  let w2 = 0;
  let draw = 0;
  let total = 0;
  for (let seed = 1; seed <= count; seed++) {
    for (const swap of [false, true]) {
      const battle = new Battle(swap ? [id2, id1] : [id1, id2], seed);
      while (!battle.result) battle.step(GAME.step);
      total += battle.time;
      const w = battle.result.winner;
      if (!w) draw++;
      else if ((w.player === 0) !== swap) w1++;
      else w2++;
    }
  }
  return { w1, w2, draw, avgTime: total / (count * 2) };
}

console.log(`每组 ${count * 2} 局（种子 1..${count}，双方各占 1P/2P 一半）`);
const rates: string[] = [];
for (const [a, b] of pairs) {
  const r = runPair(a, b);
  // 胜率按 角色1 胜 /（角色1 胜 + 角色2 胜）计算，平局不计入（与赔率结算一致，平局退还）
  const rate = r.w1 / (r.w1 + r.w2 || 1);
  // 镜像对局双方相同，胜率按定义取 0.5（实测的偏差只是随机波动）
  rates.push(`  '${a}|${b}': ${a === b ? 0.5 : rate.toFixed(3)},`);
  console.log(
    `${a} vs ${b}: ${a}胜 ${r.w1} / ${b}胜 ${r.w2} / 平局 ${r.draw}  胜率 ${(rate * 100).toFixed(1)}%  平均 ${r.avgTime.toFixed(1)}s`,
  );
}

console.log('\n// 可粘贴到 config/odds.ts 的 WIN_RATE：');
console.log(rates.join('\n'));
