/**
 * 像素艺术生成器 —— 全程序化生成, 暴徒猎手 + 生化危机混合风格
 * 所有素材都用 Graphics 的 fillRect 逐像素绘制, 保证像素风格统一
 *
 * 像素块大小 (px): PX = 3, 即每个逻辑像素对应 3 个屏幕像素
 */
import Phaser from 'phaser';

export const PX = 3; // 每个逻辑像素 = 3 真实像素

/** 用颜色代码绘制像素点阵: 'X'=主色 '.'=透明, 'S'=阴影, 'H'=高光 */
function drawPixelArt(
  gfx: Phaser.GameObjects.Graphics,
  art: string[],
  palette: Record<string, number>,
  pxSize: number = PX,
  originX = 0,
  originY = 0,
  flipX = false,
  flipY = false
): { w: number; h: number } {
  const rows = art.length;
  const cols = Math.max(...art.map((r) => r.length));
  for (let y = 0; y < rows; y++) {
    const row = art[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const color = palette[ch];
      if (color === undefined) continue;
      const dx = flipX ? originX + (cols - 1 - x) * pxSize : originX + x * pxSize;
      const dy = flipY ? originY + (rows - 1 - y) * pxSize : originY + y * pxSize;
      gfx.fillStyle(color, 1);
      gfx.fillRect(dx, dy, pxSize, pxSize);
    }
  }
  return { w: cols * pxSize, h: rows * pxSize };
}

/* ============================================================
 *  角色像素图 (24x32 逻辑像素, PX=3 后 72x96)
 *  侧面视角 (横版射击游戏标准) + 多层着色
 *  风格: 暴徒猎手 — 侧脸轮廓 + 持枪前伸 + 方正块体
 * ============================================================ */

/**
 * 绘制侧面视角角色
 * canvas: 24x32 逻辑像素, 原点左上角
 * 角色面向右侧
 */
function drawSideCharacter(
  gfx: Phaser.GameObjects.Graphics,
  pal: {
    hairHi: number;    hair: number;    hairSh: number;
    skinHi: number;    skin: number;    skinSh: number;
    shirtHi: number;   shirt: number;   shirtSh: number;
    pantsHi: number;   pants: number;   pantsSh: number;
    boots: number;     bootsSh: number;
    belt: number;
    gun: number;       gunMetal: number;
    eye: number;       acc?: number;     // 配饰色 (徽章/领带等)
  },
  opts: {
    hairStyle: 'short' | 'ponytail' | 'bun';
    shirtType: 'vest' | 'jacket' | 'dress';
    gunVariant: 'pistol' | 'smg' | 'revolver';
    aimGun: boolean;
  }
): void {
  const p = PX;

  // === 头部 (行 0-12) ===
  // 后脑勺 + 头发
  gfx.fillStyle(pal.hair, 1);
  gfx.fillRect(5 * p, 1 * p, 8 * p, 3 * p);     // 头顶
  gfx.fillRect(4 * p, 2 * p, 1 * p, 4 * p);    // 后脑
  // 头发高光
  gfx.fillStyle(pal.hairHi, 1);
  gfx.fillRect(6 * p, 1 * p, 4 * p, 1 * p);
  gfx.fillRect(5 * p, 2 * p, 1 * p, 1 * p);
  // 头发阴影
  gfx.fillStyle(pal.hairSh, 1);
  gfx.fillRect(4 * p, 5 * p, 1 * p, 2 * p);

  // 马尾辫 (克莱尔)
  if (opts.hairStyle === 'ponytail') {
    gfx.fillStyle(pal.hair, 1);
    gfx.fillRect(2 * p, 3 * p, 3 * p, 5 * p);
    gfx.fillStyle(pal.hairHi, 1);
    gfx.fillRect(2 * p, 3 * p, 1 * p, 3 * p);
    gfx.fillStyle(pal.hairSh, 1);
    gfx.fillRect(2 * p, 7 * p, 3 * p, 1 * p);
  }
  // 发髻 (艾达)
  if (opts.hairStyle === 'bun') {
    gfx.fillStyle(pal.hair, 1);
    gfx.fillRect(3 * p, 0 * p, 3 * p, 2 * p);
    gfx.fillStyle(pal.hairHi, 1);
    gfx.fillRect(3 * p, 0 * p, 2 * p, 1 * p);
  }

  // 脸部 (侧面)
  gfx.fillStyle(pal.skin, 1);
  gfx.fillRect(6 * p, 4 * p, 6 * p, 7 * p);     // 脸主体
  gfx.fillStyle(pal.skinHi, 1);
  gfx.fillRect(6 * p, 4 * p, 1 * p, 3 * p);     // 额头高光
  gfx.fillRect(8 * p, 4 * p, 1 * p, 1 * p);
  gfx.fillStyle(pal.skinSh, 1);
  gfx.fillRect(11 * p, 4 * p, 1 * p, 7 * p);    // 下颌阴影
  gfx.fillRect(9 * p, 10 * p, 3 * p, 1 * p);

  // 眼睛
  gfx.fillStyle(0xffffff, 1);
  gfx.fillRect(9 * p, 6 * p, 2 * p, 1 * p);
  gfx.fillStyle(pal.eye, 1);
  gfx.fillRect(10 * p, 6 * p, 1 * p, 1 * p);

  // 鼻子
  gfx.fillStyle(pal.skinSh, 1);
  gfx.fillRect(12 * p, 7 * p, 1 * p, 2 * p);

  // 嘴
  gfx.fillStyle(0x8a3030, 1);
  gfx.fillRect(11 * p, 9 * p, 2 * p, 1 * p);

  // 脖子
  gfx.fillStyle(pal.skinSh, 1);
  gfx.fillRect(7 * p, 11 * p, 3 * p, 2 * p);

  // === 躯干 (行 13-21) ===
  gfx.fillStyle(pal.shirt, 1);
  gfx.fillRect(5 * p, 13 * p, 8 * p, 9 * p);     // 主体
  gfx.fillStyle(pal.shirtHi, 1);
  gfx.fillRect(5 * p, 13 * p, 8 * p, 1 * p);    // 肩部高光
  gfx.fillRect(5 * p, 13 * p, 1 * p, 9 * p);    // 背部高光
  gfx.fillStyle(pal.shirtSh, 1);
  gfx.fillRect(11 * p, 14 * p, 2 * p, 8 * p);   // 腹部阴影
  gfx.fillRect(5 * p, 21 * p, 8 * p, 1 * p);    // 底边阴影

  // 服装细节
  if (opts.shirtType === 'vest') {
    // RPD 背心: 前拉链 + 徽章
    gfx.fillStyle(pal.shirtSh, 1);
    gfx.fillRect(10 * p, 14 * p, 1 * p, 7 * p); // 拉链
    if (pal.acc !== undefined) {
      gfx.fillStyle(pal.acc, 1);
      gfx.fillRect(11 * p, 16 * p, 2 * p, 2 * p); // RPD 徽章
    }
  } else if (opts.shirtType === 'jacket') {
    // 夹克: 翻领 + 拉链
    gfx.fillStyle(pal.shirtSh, 1);
    gfx.fillRect(10 * p, 13 * p, 3 * p, 1 * p); // 翻领
    gfx.fillRect(11 * p, 14 * p, 1 * p, 7 * p); // 拉链
    gfx.fillStyle(pal.shirtHi, 1);
    gfx.fillRect(9 * p, 14 * p, 1 * p, 6 * p);  // 领翻折
  } else if (opts.shirtType === 'dress') {
    // 旗袍: 立领 + 盘扣 + 开衩
    gfx.fillStyle(pal.shirtSh, 1);
    gfx.fillRect(10 * p, 13 * p, 1 * p, 3 * p);  // 立领
    gfx.fillRect(11 * p, 17 * p, 1 * p, 1 * p);  // 盘扣
    gfx.fillRect(11 * p, 19 * p, 1 * p, 1 * p);
    gfx.fillStyle(pal.skin, 1);
    gfx.fillRect(11 * p, 21 * p, 2 * p, 1 * p);  // 开衩露腿
  }

  // 腰带
  gfx.fillStyle(pal.belt, 1);
  gfx.fillRect(5 * p, 21 * p, 8 * p, 1 * p);

  // === 手臂 + 枪 ===
  if (opts.aimGun) {
    // 前伸手臂 (面向右伸出)
    const armLen = opts.gunVariant === 'smg' ? 6 : 5;
    gfx.fillStyle(pal.skin, 1);
    gfx.fillRect(13 * p, 15 * p, armLen * p, 2 * p);  // 手臂
    gfx.fillStyle(pal.skinHi, 1);
    gfx.fillRect(13 * p, 15 * p, armLen * p, 1 * p);  // 手臂高光
    // 手
    gfx.fillStyle(pal.skinSh, 1);
    gfx.fillRect((13 + armLen) * p, 15 * p, 1 * p, 2 * p);
    // 枪
    const gunStart = (14 + armLen) * p;
    const gunLen = opts.gunVariant === 'smg' ? 5 : 4;
    gfx.fillStyle(pal.gun, 1);
    gfx.fillRect(gunStart, 15 * p, gunLen * p, 2 * p);
    gfx.fillStyle(pal.gunMetal, 1);
    gfx.fillRect(gunStart, 15 * p, gunLen * p, 1 * p);  // 枪管金属高光
    // 枪口
    gfx.fillStyle(0xffd700, 1);
    gfx.fillRect((gunStart + gunLen) * p, 15 * p, 1 * p, 2 * p);
  } else {
    // 站姿: 手臂自然弯曲在身侧
    gfx.fillStyle(pal.shirt, 1);
    gfx.fillRect(12 * p, 14 * p, 2 * p, 5 * p);   // 上臂
    gfx.fillStyle(pal.shirtSh, 1);
    gfx.fillRect(13 * p, 14 * p, 1 * p, 5 * p);
    // 前臂 + 手
    gfx.fillStyle(pal.skin, 1);
    gfx.fillRect(13 * p, 18 * p, 1 * p, 3 * p);
    gfx.fillStyle(pal.skinSh, 1);
    gfx.fillRect(13 * p, 20 * p, 1 * p, 1 * p);
    // 腰间枪套
    gfx.fillStyle(pal.gun, 1);
    gfx.fillRect(11 * p, 18 * p, 2 * p, 3 * p);
  }

  // === 腿 (行 22-27) ===
  // 前腿 (右, 靠近镜头)
  gfx.fillStyle(pal.pants, 1);
  gfx.fillRect(8 * p, 22 * p, 3 * p, 6 * p);
  gfx.fillStyle(pal.pantsHi, 1);
  gfx.fillRect(8 * p, 22 * p, 1 * p, 6 * p);
  gfx.fillStyle(pal.pantsSh, 1);
  gfx.fillRect(10 * p, 22 * p, 1 * p, 6 * p);

  // 后腿 (左, 远离镜头)
  gfx.fillStyle(pal.pantsSh, 1);
  gfx.fillRect(5 * p, 22 * p, 3 * p, 6 * p);

  // === 靴子 (行 28-31) ===
  // 前靴
  gfx.fillStyle(pal.boots, 1);
  gfx.fillRect(7 * p, 28 * p, 5 * p, 3 * p);    // 前靴
  gfx.fillStyle(pal.bootsSh, 1);
  gfx.fillRect(10 * p, 28 * p, 2 * p, 3 * p);
  gfx.fillRect(7 * p, 30 * p, 5 * p, 1 * p);   // 鞋底
  // 后靴
  gfx.fillStyle(pal.bootsSh, 1);
  gfx.fillRect(4 * p, 28 * p, 4 * p, 3 * p);
  gfx.fillRect(4 * p, 30 * p, 4 * p, 1 * p);
}

function makePlayerTexture(
  scene: Phaser.Scene,
  key: string,
  opts: {
    skin?: number;
    skinHi?: number;
    skinSh?: number;
    hair?: number;
    hairHi?: number;
    hairSh?: number;
    pants?: number;
    pantsHi?: number;
    pantsSh?: number;
    shirt?: number;
    shirtHi?: number;
    shirtSh?: number;
    boots?: number;
    bootsSh?: number;
    belt?: number;
    gun?: number;
    gunMetal?: number;
    eye?: number;
    acc?: number;
    hairStyle: 'short' | 'ponytail' | 'bun';
    shirtType: 'vest' | 'jacket' | 'dress';
    gunVariant: 'pistol' | 'smg' | 'revolver';
    aimGun: boolean;
  }
): void {
  const g = scene.add.graphics();
  drawSideCharacter(g, {
    hairHi: opts.hairHi ?? 0xffffff,
    hair: opts.hair ?? 0x2b1a0a,
    hairSh: opts.hairSh ?? 0x1a0e04,
    skinHi: opts.skinHi ?? 0xf4c9a0,
    skin: opts.skin ?? 0xe0b080,
    skinSh: opts.skinSh ?? 0xb08050,
    shirtHi: opts.shirtHi ?? 0xffffff,
    shirt: opts.shirt ?? 0x2e7d32,
    shirtSh: opts.shirtSh ?? 0x1a3a1a,
    pantsHi: opts.pantsHi ?? 0x607080,
    pants: opts.pants ?? 0x455a64,
    pantsSh: opts.pantsSh ?? 0x2a3a44,
    boots: opts.boots ?? 0x212121,
    bootsSh: opts.bootsSh ?? 0x111111,
    belt: opts.belt ?? 0x3e2723,
    gun: opts.gun ?? 0x1a1a1a,
    gunMetal: opts.gunMetal ?? 0x424242,
    eye: opts.eye ?? 0x1a237e,
    acc: opts.acc,
  }, {
    hairStyle: opts.hairStyle,
    shirtType: opts.shirtType,
    gunVariant: opts.gunVariant,
    aimGun: opts.aimGun,
  });
  g.generateTexture(key, 24 * PX, 32 * PX);
  g.destroy();
}

/* --- 里昂: 棕发 RPD蓝背心 战术裤 手枪 --- */
export function makeLeonTexture(scene: Phaser.Scene): void {
  const base = {
    hairHi: 0x8b5a2b,  hair: 0x5a3a1a,  hairSh: 0x3a2010,
    skinHi: 0xf4c9a0,  skin: 0xe0b080,  skinSh: 0xa07050,
    shirtHi: 0x2a4a7a, shirt: 0x1a3a5c,  shirtSh: 0x0d2033,
    pantsHi: 0x2a3040, pants: 0x1a1f30,  pantsSh: 0x0d1018,
    boots: 0x2a2a2a,   bootsSh: 0x111111,
    belt: 0x3a2510,
    gun: 0x1a1a1a,     gunMetal: 0x424242,
    eye: 0x1565c0,     acc: 0xffd700,
    hairStyle: 'short' as const,
    shirtType: 'vest' as const,
    gunVariant: 'pistol' as const,
  };
  makePlayerTexture(scene, 'player-leon', { ...base, aimGun: false });
  makePlayerTexture(scene, 'player-leon-aim', { ...base, aimGun: true });
}

/* --- 克莱尔: 红马尾 红夹克 黑裤 冲锋枪 --- */
export function makeClaireTexture(scene: Phaser.Scene): void {
  const base = {
    hairHi: 0xef5350,  hair: 0xc62828,  hairSh: 0x8e1414,
    skinHi: 0xf4c9a0,  skin: 0xe0b080,  skinSh: 0xa07050,
    shirtHi: 0xef5350, shirt: 0xc62828,  shirtSh: 0x8e1414,
    pantsHi: 0x3a3a3a, pants: 0x212121,  pantsSh: 0x111111,
    boots: 0x3e2723,   bootsSh: 0x1a0e08,
    belt: 0x1a1a1a,
    gun: 0x1a1a1a,     gunMetal: 0x424242,
    eye: 0x4caf50,     acc: 0xffeb3b,
    hairStyle: 'ponytail' as const,
    shirtType: 'jacket' as const,
    gunVariant: 'smg' as const,
  };
  makePlayerTexture(scene, 'player-claire', { ...base, aimGun: false });
  makePlayerTexture(scene, 'player-claire-aim', { ...base, aimGun: true });
}

/* --- 艾达王: 黑发髻 红旗袍 黑丝 左轮 --- */
export function makeAdaTexture(scene: Phaser.Scene): void {
  const base = {
    hairHi: 0x4a4a4a,  hair: 0x1a1a1a,  hairSh: 0x0a0a0a,
    skinHi: 0xf4c9a0,  skin: 0xe0b080,  skinSh: 0xa07050,
    shirtHi: 0xd32f2f, shirt: 0xb71c1c,  shirtSh: 0x7f1010,
    pantsHi: 0x2a2a2a, pants: 0x0a0a0a,  pantsSh: 0x000000,
    boots: 0x1a1a1a,   bootsSh: 0x000000,
    belt: 0x1a1a1a,
    gun: 0x3e2723,     gunMetal: 0x8d6e63,
    eye: 0xb71c1c,     acc: 0xffd700,
    hairStyle: 'bun' as const,
    shirtType: 'dress' as const,
    gunVariant: 'revolver' as const,
  };
  makePlayerTexture(scene, 'player-ada', { ...base, aimGun: false });
  makePlayerTexture(scene, 'player-ada-aim', { ...base, aimGun: true });
}

/* ============================================================
 *  僵尸 (16x24) — 绿灰皮肤 + 破衣 + 血渍 + 前伸手臂
 * ============================================================ */
const ZOMBIE_BASE = [
  '................',
  '......SSSS......', // 头发
  '.....SSSSSS.....',
  '....GGGGGGGG....', // 额头
  '....GGGGGGGG....',
  '....RRGGGGRR....', // 红眼 + 肉
  '....GGGGGGGG....',
  '....GGGGGGGG....',
  '....GGGGGGGG....',
  '....BBBBBBBB....',
  '..UUUUUUUUUUUU..', // 破上衣 (紫)
  '..UUURUUUUURUU..', // 破洞 + 血
  '..UUUUUUUUUUUU..',
  '..UUUUUUUUUUUU..',
  '...UUUUUUUUUU...',
  '....KKKKKKKK....', // 破裤
  '....KKRRKKKK....',
  '....KKKKKKKK....',
  '....PPPPPPPP....',
  '....PPPPPPPP....',
  '................',
  '................',
  '................',
  '................',
];

function makeZombieTexture(scene: Phaser.Scene, key: string, paletteOverride?: Record<string, number>): void {
  const g = scene.add.graphics();
  const pal = {
    S: 0x1a1a1a,
    G: 0x6b8e23,
    R: 0xcc0000,
    B: 0x333333,
    U: 0x3a1c4a,
    K: 0x4a3a2a,
    P: 0x1a1a1a,
    ...paletteOverride,
  };
  drawPixelArt(g, ZOMBIE_BASE, pal);

  // 前伸手臂 — 暴徒猎手风格: 僵尸双手前伸抓向玩家
  g.fillStyle(pal.G, 1);
  for (let i = 0; i < 10; i++) {
    g.fillRect((16 + i) * PX, 11 * PX, PX, PX);
  }
  g.fillStyle(pal.G, 1);
  for (let i = 0; i < 6; i++) {
    g.fillRect((-1 - i) * PX, 11 * PX, PX, PX);
  }

  g.generateTexture(key, 18 * PX, 24 * PX);
  g.destroy();
}

export function makeZombies(scene: Phaser.Scene): void {
  makeZombieTexture(scene, 'zombie-normal');
  makeZombieTexture(scene, 'zombie-fast', { G: 0x8fbc8f, K: 0x333333 });
  makeZombieTexture(scene, 'zombie-tank', { G: 0x3a5a20, U: 0x2a3a4a, K: 0x4a4a4a });
}

/* ============================================================
 *  BOSS — 舔食者 (Licker)
 *  参考生化危机: 光滑无毛 皮肤灰褐色 脑外露 利爪 长舌头 爬行姿态
 *  尺寸: 32x20 逻辑像素 (爬行: 宽 > 高)
 * ============================================================ */
const LICKER = [
  '................................',
  '................................',
  '...........SSSSSSSSSSSS........', // 背部脊刺
  '..........SSSSSSSSSSSSSS.......',
  '.........GGGGGGGGGGGGGGGG......', // 主体 (灰褐)
  '........GGGGGGGGGGGGGGGGGG.....',
  '.....GGGGGGGGGGGGGGGGGGGGGG....',
  '....GGGGGGGGGGGGGGGGGGGGGGGG...',
  '...GGGGWWGGGGGGGGGGGGGGGGGGGG..', // 白色大脑外露
  '...GGGGWWWWWWWWWWWWGGGGGGGGGG..',
  '....GGGGGGGGGGGGGGGGGGGGGGGG...',
  '.....GGGGGGGGGGGGGGGGGGGGGG....',
  '..GGG....GGGGGGGGGGGGG....GGG..', // 前爪
  '.GGG......GGGGGGGGGGG......GGG.',
  'GGGGG.......GGGGGGGGG.......GGG',
  'GGG..........GGGGGGG..........GG',
  'G.............GGGGG............G',
  '...............GGG.............',
  '................G..............',
  '..............................T', // 舌头占位 (运行时可动画)
];

export function makeLickerTexture(scene: Phaser.Scene): void {
  const g = scene.add.graphics();
  const palette = {
    S: 0x2a1a10,  // 脊刺 深棕
    G: 0x6b5a42,  // 皮肤 灰褐
    W: 0xe8dcc8,  // 大脑 奶白
    R: 0x9a0000,  // 舌肉红
  };
  drawPixelArt(g, LICKER, palette);

  // 血眼
  g.fillStyle(0xff0000, 1);
  g.fillRect(20 * PX, 6 * PX, 2 * PX, 2 * PX);

  g.generateTexture('licker', 32 * PX, 20 * PX);
  g.destroy();

  // 舔食者舌头贴图 (用于吐舌攻击)
  const g2 = scene.add.graphics();
  g2.fillStyle(0xcc0000, 1);
  for (let i = 0; i < 12; i++) {
    g2.fillRect(i * PX, 0, PX, PX);
  }
  g2.fillStyle(0x8a0000, 1);
  g2.fillRect(0, 0, PX, PX);
  g2.generateTexture('licker-tongue', 12 * PX, PX);
  g2.destroy();
}

/* ============================================================
 *  障碍物 — 车辆 / 集装箱 / 油桶 (可摧毁)
 * ============================================================ */

function makeBoxArt(
  scene: Phaser.Scene,
  key: string,
  width: number, // 逻辑像素宽
  height: number,
  palette: { base: number; dark: number; light: number; accent?: number }
): void {
  const g = scene.add.graphics();
  // 主体
  g.fillStyle(palette.base, 1);
  g.fillRect(0, 0, width * PX, height * PX);
  // 顶高光
  g.fillStyle(palette.light, 1);
  g.fillRect(0, 0, width * PX, PX * 2);
  // 右阴影
  g.fillStyle(palette.dark, 1);
  g.fillRect((width - 2) * PX, 0, PX * 2, height * PX);
  // 底阴影
  g.fillRect(0, (height - 2) * PX, width * PX, PX * 2);
  // 边界线
  g.lineStyle(PX, 0x000000, 0.6);
  g.strokeRect(0, 0, width * PX, height * PX);
  // 细节: 竖条纹
  for (let x = PX * 4; x < width * PX; x += PX * 4) {
    g.fillStyle(palette.dark, 0.5);
    g.fillRect(x, PX * 4, PX, height * PX - PX * 8);
  }
  g.generateTexture(key, width * PX, height * PX);
  g.destroy();
}

export function makeObstacles(scene: Phaser.Scene): void {
  // 集装箱 (绿/蓝) — 最硬
  makeBoxArt(scene, 'obstacle-container', 16, 10, {
    base: 0x2e7d32,
    dark: 0x1b5e20,
    light: 0x4caf50,
  });

  // 汽车 (红/蓝/黄) — 中等硬度
  makeBoxArt(scene, 'obstacle-car-red', 24, 12, {
    base: 0xc62828,
    dark: 0x8e1414,
    light: 0xef5350,
  });
  makeBoxArt(scene, 'obstacle-car-blue', 24, 12, {
    base: 0x1565c0,
    dark: 0x0d47a1,
    light: 0x42a5f5,
  });

  // 油桶 (灰) — 弱, 可打爆
  makeBoxArt(scene, 'obstacle-barrel', 8, 10, {
    base: 0x616161,
    dark: 0x424242,
    light: 0x9e9e9e,
    accent: 0xff5722,
  });

  // 路障 (白条纹) — 弱
  const g = scene.add.graphics();
  g.fillStyle(0xfafafa, 1);
  g.fillRect(0, 0, 6 * PX, 4 * PX);
  g.fillStyle(0x212121, 1);
  for (let x = 0; x < 6 * PX; x += PX * 2) {
    g.fillRect(x, 0, PX, 4 * PX);
  }
  g.generateTexture('obstacle-cone', 6 * PX, 4 * PX);
  g.destroy();
}

/* ============================================================
 *  子弹 / 粒子 / 枪口闪光 / 地面 / 背景
 * ============================================================ */

export function makeDecorations(scene: Phaser.Scene): void {
  // 子弹 (像素方头)
  const bg = scene.add.graphics();
  bg.fillStyle(0xffeb3b, 1);
  bg.fillRect(0, 0, 5, 2);
  bg.generateTexture('bullet-yellow', 5, 2);
  bg.destroy();

  const br = scene.add.graphics();
  br.fillStyle(0xff5252, 1);
  br.fillRect(0, 0, 5, 2);
  br.generateTexture('bullet-red', 5, 2);
  br.destroy();

  const bo = scene.add.graphics();
  bo.fillStyle(0xff9800, 1);
  bo.fillRect(0, 0, 5, 2);
  bo.generateTexture('bullet-orange', 5, 2);
  bo.destroy();

  // 枪口闪光
  const flash = scene.add.graphics();
  flash.fillStyle(0xfff9c4, 1);
  flash.fillCircle(6, 3, 6);
  flash.fillStyle(0xffeb3b, 0.9);
  flash.fillCircle(6, 3, 3);
  flash.generateTexture('muzzle-flash', 12, 10);
  flash.destroy();

  // 血迹粒子 (像素方块)
  const blood = scene.add.graphics();
  blood.fillStyle(0xb71c1c, 1);
  blood.fillRect(0, 0, 3, 3);
  blood.generateTexture('blood-particle', 3, 3);
  blood.destroy();

  // 地面瓦片 (柏油路 + 黄线)
  const ground = scene.add.graphics();
  ground.fillStyle(0x2a2a2e, 1);
  ground.fillRect(0, 0, 64, 64);
  ground.fillStyle(0x3a3a40, 1);
  for (let i = 0; i < 64; i += 8) {
    ground.fillRect(0, i, 64, 1);
  }
  ground.lineStyle(2, 0xffc107, 0.5);
  ground.beginPath();
  ground.moveTo(0, 0);
  ground.lineTo(64, 0);
  ground.strokePath();
  ground.generateTexture('ground-tile', 64, 64);
  ground.destroy();

  // 远景: 浣熊市街道 (像素城市剪影)
  const bgArt = scene.add.graphics();
  bgArt.fillStyle(0x0a0a0c, 1);
  bgArt.fillRect(0, 0, 1280, 720);
  bgArt.fillStyle(0x1a1a20, 1);
  let bx = 0;
  while (bx < 1280) {
    const bw = 80 + Math.floor(Math.random() * 80);
    const bh = 120 + Math.floor(Math.random() * 280);
    bgArt.fillRect(bx, 720 - bh - 120, bw, bh);
    // 窗户 (随机亮)
    bgArt.fillStyle(0x3a3a42, 0.5);
    for (let wy = 720 - bh - 100; wy < 720 - 120; wy += 24) {
      for (let wx = bx + 8; wx < bx + bw - 8; wx += 20) {
        if (Math.random() > 0.6) {
          bgArt.fillRect(wx, wy, 10, 14);
        }
      }
    }
    bgArt.fillStyle(0x1a1a20, 1);
    bx += bw;
  }
  bgArt.generateTexture('city-bg', 1280, 720);
  bgArt.destroy();

  // 地面延伸 (用于关卡地面)
  const road = scene.add.graphics();
  road.fillStyle(0x1c1c22, 1);
  road.fillRect(0, 0, 256, 120);
  road.fillStyle(0x2a2a32, 1);
  road.fillRect(0, 0, 256, 10);
  road.fillStyle(0xffc107, 0.4);
  for (let x = 20; x < 256; x += 40) {
    road.fillRect(x, 60, 20, 4);
  }
  road.generateTexture('road-strip', 256, 120);
  road.destroy();
}

/* ============================================================
 *  弹药箱 / 医疗包 拾取物
 * ============================================================ */
export function makePickups(scene: Phaser.Scene): void {
  const ammo = scene.add.graphics();
  ammo.fillStyle(0xffc107, 1);
  ammo.fillRoundedRect(0, 0, 30, 22, 3);
  ammo.lineStyle(2, 0x000000, 0.8);
  ammo.strokeRoundedRect(0, 0, 30, 22, 3);

  const hp = scene.add.graphics();
  hp.fillStyle(0xe53935, 1);
  hp.fillRoundedRect(0, 0, 30, 22, 3);
  hp.lineStyle(2, 0x000000, 0.8);
  hp.strokeRoundedRect(0, 0, 30, 22, 3);
  hp.fillStyle(0xffffff, 1);
  hp.fillRect(12, 4, 6, 14);
  hp.fillRect(5, 8, 20, 6);
  hp.generateTexture('pickup-health', 30, 22);
  hp.destroy();
}

/** 一键生成所有像素素材 */
export function generateAllPixelArt(scene: Phaser.Scene): void {
  scene.add.text(0, 0, '', {})?.destroy(); // 防 TS unused
  makeLeonTexture(scene);
  makeClaireTexture(scene);
  makeAdaTexture(scene);
  makeZombies(scene);
  makeLickerTexture(scene);
  makeObstacles(scene);
  makeDecorations(scene);
  makePickups(scene);
}
