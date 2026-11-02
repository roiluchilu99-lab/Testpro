// 全局配置：所有与玩法无关的常量与数值集中在此
export const GAME = {
  // 逻辑分辨率（竖屏 9:16）
  width: 720,
  height: 1280,
  // 物理固定时间步长（秒）
  step: 1 / 60,
  // 单帧最多累积的真实时间，防止切后台回来后疯狂追帧
  maxFrameTime: 0.25,

  // 场地：正八边形，圆心与外接圆半径
  arena: {
    cx: 360,
    cy: 680,
    radius: 300,
    lineWidth: 6,
    lineColor: '#ffffff',
    bgColor: '#14161c',
  },

  // 大乱斗场地：几乎占满整个屏幕（八边形宽度 = 2 * radius * cos(22.5°) ≈ 702）
  arenaFfa: { radius: 380, cy: 720 },

  // 对局规则
  timeLimit: 60,
  // 开局两球离圆心的随机距离范围
  spawnMinDist: 80,
  spawnMaxDist: 180,

  // 先手判定：两球中心距离小于 engageDist 视为发生接触，
  // 先靠近的一方（位移量明显更大，比值 ≥ firstRatio）算先碰到；
  // 距离超过 disengageDist 才算分开
  contact: { engageDist: 110, disengageDist: 130, firstRatio: 1.5 },

  // 选手（P1 / P2 / ...）标识颜色，超出时循环使用
  playerColors: ['#4aa3ff', '#ff9f43', '#5ee08a', '#e86bd0', '#f2e052', '#4de3d6', '#ff6b6b', '#b08cff'],
  /** 大乱斗最多参加人数 */
  maxPlayers: 16,
  /** 大乱斗时间限制 */
  timeLimitFfa: 90,

  // 吸住时的抖动幅度（像素，仅视觉效果）
  grabShake: {
    victim: 7,
    vampire: 3,
  },

  // 下注（仅游戏内虚拟金币）
  bet: {
    initialCoins: 1000,
    amounts: [50, 100, 500],
    /** 没有胜率数据时的默认赔率 */
    defaultOdds: 1.9,
    /** 赔率 = payoutRate / 胜率，四舍五入到 oddsStep */
    payoutRate: 0.95,
    oddsStep: 0.05,
  },

  // 模拟充值（演示用，不涉及真实支付）：套餐里的价格只是展示，不会产生任何扣款
  topup: {
    plans: [
      { coins: 500, price: 100 },
      { coins: 1000, price: 180 },
      { coins: 5000, price: 800 },
      { coins: 10000, price: 1500 },
    ],
    /** 预填且不可编辑的测试卡 */
    testCard: { number: '4242 4242 4242 4242', name: 'TEST USER', expiry: '12/34', cvc: '123' },
    /** 「处理中」画面停留时间（秒） */
    processTime: 1.5,
    /** 管理者模式（URL 带 ?admin）可直接充入的金额 */
    adminAmounts: [1000, 10000],
    /** 画面切换后多久内忽略输入（秒），防止长按 Enter 连续跳过画面 */
    inputLock: 0.3,
  },

  // 选人界面：角色网格的列数与总格数（不足的格子显示「？」）
  select: { cols: 4, slots: 8 },

  // 随机模式：头像滚动的切换间隔与左右停下的时刻（秒）
  slot: { tick: 0.08, stopLeft: 1.2, stopRight: 1.8, hold: 0.8 },

  // 演出
  fx: {
    /** 受击闪白时长（秒） */
    flashTime: 0.06,
    /** 单次伤害达到该值算重击（触发屏幕震动） */
    heavyDamage: 5,
    /** 屏幕震动开关与幅度（像素） */
    shake: { enabled: true, amplitude: 10, fatalMul: 1.8, decay: 12 },
    /** 命中粒子数 / 被击败爆开的粒子数 */
    hitParticles: 7,
    fatalParticles: 48,
    /** 箭矢拖尾保留的历史位置数 */
    trailLen: 6,
    /** 致命一击慢动作：时间倍率、真实持续时间、镜头放大倍数与推近时间 */
    slowmo: { scale: 0.2, duration: 1.5, zoom: 1.6, zoomTime: 0.4 },
    /** 超时判定（无致命一击）后停留多久进入结算 */
    timeoutHold: 1,
  },

  // 飘字
  floatText: {
    life: 0.9,
    riseSpeed: 70,
    fontSize: 34,
    damageColor: '#ff5252',
    healColor: '#4cd964',
  },
} as const;
