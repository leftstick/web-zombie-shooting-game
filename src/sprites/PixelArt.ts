/**
 * 像素艺术生成器 —— 暴徒猎手 (Huntdown) 风格
 *
 * Huntdown 风格要点:
 *   - 24×32 逻辑像素 (PX=3, 实际 72×96)
 *   - 侧面视角, 身体前倾 (射击姿态)
 *   - 持枪手臂前伸, 枪口指向前方
 *   - 4-5 层着色 (高光/主色/中间/阴影/暗部)
 *   - 轮廓线 (1px 深色描边) 保证 silhouette 清晰
 *   - 头发/脸型/服装差异化 — 远看能认出是谁
 */
import Phaser from 'phaser';

export const PX = 3;

/* ============================================================
 *  通用绘图工具
 * ============================================================ */

/** 画像素点阵: 'X'=主色 '.'=透明, '1'='2'='3'=各层色 */
function drawArt(
  gfx: Phaser.GameObjects.Graphics,
  art: string[],
  palette: Record<string, number>,
  pxSize: number = PX,
  ox = 0, oy = 0
): { w: number; h: number } {
  const rows = art.length;
  const cols = Math.max(...art.map(r => r.length));
  for (let y = 0; y < rows; y++) {
    const row = art[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const color = palette[ch];
      if (color === undefined) continue;
      gfx.fillStyle(color, 1);
      gfx.fillRect(ox + x * pxSize, oy + y * pxSize, pxSize, pxSize);
    }
  }
  return { w: cols * pxSize, h: rows * pxSize };
}

/* ============================================================
 *  角色模板 (24×32, 面向右)
 *  Huntdown 风格: 前倾 + 持枪前伸 + 多层着色
 *
 *  颜色代号约定:
 *    轮廓/暗部: 'K'
 *    高光:       'H'
 *    主色:       'M'
 *    阴影:       'S'
 *    眼睛白:     'W'
 *    枪口火:     'F'
 * ============================================================ */

/**
 * 里昂·S·肯尼迪 — 棕发 RPD蓝背心 手枪
 * 姿态: 身体略前倾, 持枪前伸瞄准
 */
const LEON_STAND = [
  '........................',
  '.....KKKKKKKK...........',  // 头发顶
  '....KHHHHHHHK...........',  // 头发高光
  '....KHHMMMMHK...........',
  '....KMMMMMMK............',  // 头
  '....KMMSMMMK............',
  '....KMSSMSSK............',  // 眼
  '....KWMSWMSK............',  // 眼白+瞳孔
  '....KMSSSSSK............',
  '....KMMMMMMK............',  // 脸
  '....KSSSSSSK............',
  '.....KKKKKKK............',  // 下巴
  '......KKKK..............',  // 脖子
  '....KKKMMMMKK...........',  // 肩
  '...KHMMMMMMMK...........',  // 躯干 (蓝)
  '...KMMMMMMMMK..KKKKK....',  // 手臂前伸
  '...KMMSSSSMMK.KHHHHHK...',  // 手枪
  '...KMMSSSSMMKKHHHHHHK...',
  '...KMMMMMMMMKKMMMMMMK...',
  '....KMMMMMMMKKMMMMMMK...',
  '....KMMMMMMMKKKKKKKKK...',
  '....KKKSSSSK............',
  '.....KMMMMK.............',  // 腰带
  '.....KMMMMK.............',
  '....KMMMMMMK............',  // 裤
  '....KMMMMMMK............',
  '....KMSSSSMK............',
  '....KMSSSSMK............',
  '...KKMMMMMMKK...........',  // 靴
  '...KKKKKKKKKK...........',
  '........................',
  '........................',
];

const LEON_AIM = [
  '........................',
  '.....KKKKKKKK...........',
  '....KHHHHHHHK...........',
  '....KHHMMMMHK...........',
  '....KMMMMMMK............',
  '....KMMSMMMK............',
  '....KMSSMSSK............',
  '....KWMSWMSK............',
  '....KMSSSSSK............',
  '....KMMMMMMK............',
  '....KSSSSSSK............',
  '.....KKKKKKK............',
  '......KKKK..............',
  '...KKKKMMMMKK...........',  // 肩前倾
  '..KHMMMMMMMMKKKKKKK.....',  // 躯干
  '..KMMMMMMMMMMHHHHHHK....',  // 手臂+枪前伸
  '..KMMSSSSMMMMHHHHHHHK...',
  '..KMMSSSSMMMMMMMMMMMK...',
  '..KMMMMMMMMMMMMMMMMMK...',
  '...KMMMMMMMMK.FFFFFF....',  // 枪口闪光
  '...KMMMMMMMMK.KKKKKK....',
  '....KKSSSSSK............',
  '.....KMMMMK.............',
  '.....KMMMMK.............',
  '....KMMMMMMK............',
  '....KMMMMMMK............',
  '....KMSSSSMK............',
  '....KMSSSSMK............',
  '...KKMMMMMMKK...........',
  '...KKKKKKKKKK...........',
  '........................',
  '........................',
];

/**
 * 克莱尔·雷德菲尔德 — 红马尾 红夹克 冲锋枪
 */
const CLAIRE_STAND = [
  '........................',
  '......KKKKKK............',  // 头发顶
  '.....KHHHHHHK...........',
  '.....KHHMMMMK...........',
  '.....KMMMMMMK.KKK.......',  // 马尾
  '.....KMMMMMMK.HHK.......',
  '.....KMMSSMMK.KKK.......',
  '.....KWMSWMSK.KKK.......',
  '.....KMMMMMMK.KKK.......',
  '.....KMMMMMMK.KKK.......',
  '.....KSSSSSSK.KKK.......',
  '......KKKKKKK...........',
  '.......KKKK.............',
  '....KKKMMMMMKK..........',  // 肩
  '...KHHMMMMMMMK..KKKK....',  // 红夹克
  '...KHHMMMMMMMMKHHHHK....',  // 手臂+枪
  '...KMMSSSSMMMMKHHHHK....',
  '...KMMSSSSMMMMKMMMMK....',
  '...KMMMMMMMMMMKMMMMK....',
  '....KMMMMMMMMK.KKKKK....',
  '....KMMMMMMMMK..........',
  '....KKKSSSSKK...........',
  '.....KMMMMK.............',
  '.....KMMMMK.............',
  '....KMMMMMMK............',  // 黑裤
  '....KMMMMMMK............',
  '....KMSSSSMK............',
  '....KMSSSSMK............',
  '...KKMMMMMMKK...........',
  '...KKKKKKKKKK...........',
  '........................',
  '........................',
];

const CLAIRE_AIM = [
  '........................',
  '......KKKKKK............',
  '.....KHHHHHHK...........',
  '.....KHHMMMMK...........',
  '.....KMMMMMMK.KKK.......',
  '.....KMMMMMMK.HHK.......',
  '.....KMMSSMMK.KKK.......',
  '.....KWMSWMSK.KKK.......',
  '.....KMMMMMMK.KKK.......',
  '.....KMMMMMMK.KKK.......',
  '.....KSSSSSSK.KKK.......',
  '......KKKKKKK...........',
  '.......KKKK.............',
  '...KKKKMMMMMMK..........',
  '..KHHMMMMMMMMKKKKKKKK...',
  '..KHHMMMMMMMMMMHHHHHHK..',
  '..KMMSSSSMMMMMMHHHHHHK..',
  '..KMMSSSSMMMMMMMMMMMMK..',
  '..KMMMMMMMMMMMMMMMMMMK..',
  '...KMMMMMMMMMMFFFFFF....',  // 枪口闪光
  '...KMMMMMMMMMMKKKKKK....',
  '....KKSSSSSK............',
  '.....KMMMMK.............',
  '.....KMMMMK.............',
  '....KMMMMMMK............',
  '....KMMMMMMK............',
  '....KMSSSSMK............',
  '....KMSSSSMK............',
  '...KKMMMMMMKK...........',
  '...KKKKKKKKKK...........',
  '........................',
  '........................',
];

/**
 * 艾达·王 — 黑发髻 红旗袍 左轮手枪
 */
const ADA_STAND = [
  '........................',
  '....KKKK................',  // 发髻
  '...KHHHHK...............',
  '...KMMMMK...............',
  '....KKKKK...............',
  '.....KKKKKK.............',  // 头
  '....KHHHHHHK............',
  '....KHHMMMMHK...........',
  '....KMMSSMMMK...........',
  '....KWMSWMSK............',
  '....KMMMMMMMK...........',
  '....KMMMMMMMK...........',
  '.....KKKKKKKK...........',
  '......KKKK..............',
  '....KKKMMMMMKK..........',  // 旗袍肩
  '...KHHMMMMMMMK..KKK.....',  // 旗袍身体
  '...KHHMMMMMMMMKHHHK.....',  // 手臂+左轮
  '...KMMSSSSMMMMKHHHK.....',
  '...KMMSSSSMMMMKMMMK.....',
  '...KMMMMMMMMMMKMMMK.....',
  '....KMMMMMMMMMKKKKK.....',
  '....KMMMMMMMMMK.........',
  '....KKKKSSSKKKK.........',
  '......KMMMK.............',
  '......KMMMK.............',
  '.....KMMMMMK............',
  '.....KMMMMMK............',
  '.....KMSSSMK............',
  '.....KMSSSMK............',
  '....KKMMMMMKK...........',
  '....KKKKKKKKK...........',
  '........................',
];

const ADA_AIM = [
  '........................',
  '....KKKK................',
  '...KHHHHK...............',
  '...KMMMMK...............',
  '....KKKKK...............',
  '.....KKKKKK.............',
  '....KHHHHHHK............',
  '....KHHMMMMHK...........',
  '....KMMSSMMMK...........',
  '....KWMSWMSK............',
  '....KMMMMMMMK...........',
  '....KMMMMMMMK...........',
  '.....KKKKKKKK...........',
  '......KKKK..............',
  '...KKKKMMMMMMK..........',
  '..KHHMMMMMMMMKKKKKKK....',
  '..KHHMMMMMMMMMMHHHHHK...',
  '..KMMSSSSMMMMMMHHHHHK...',
  '..KMMSSSSMMMMMMMMMMMK...',
  '..KMMMMMMMMMMMMMMMMMK...',
  '...KMMMMMMMMMMFFFFFF....',
  '...KMMMMMMMMMMKKKKKK....',
  '....KMMMMMMMMMK.........',
  '....KKKSSSKKKKK.........',
  '......KMMMK.............',
  '.....KMMMMMK............',
  '.....KMMMMMK............',
  '.....KMSSSMK............',
  '.....KMSSSMK............',
  '....KKMMMMMKK...........',
  '....KKKKKKKKK...........',
  '........................',
];

/* ============================================================
 *  角色色板 —— Huntdown 风格: 深轮廓 + 明亮主色 + 多层着色
 * ============================================================ */

function makeLeonPalette(): Record<string, number> {
  return {
    K: 0x0d0d0d,       // 轮廓/最暗
    H_hair: 0x8b5a2b,  // 头发高光
    M_hair: 0x5a3a1a,  // 头发主
    S_hair: 0x3a2010,  // 头发阴影
    H_skin: 0xf4c9a0,  // 皮肤高光
    M_skin: 0xe0b080,  // 皮肤主
    S_skin: 0xa07050,  // 皮肤阴影
    H_shirt: 0x2a4a7a, // 蓝背心高光
    M_shirt: 0x1a3a5c, // 蓝背心主
    S_shirt: 0x0d2033, // 蓝背心阴影
    H_pants: 0x3a4050, // 裤高光
    M_pants: 0x1a1f30, // 裤主
    S_pants: 0x0d1018, // 裤阴影
    boots: 0x1a1a1a,
    belt: 0x3a2510,
    H_gun: 0x5a5a5a,   // 枪管高光
    M_gun: 0x2a2a2a,   // 枪主
    S_gun: 0x0a0a0a,   // 枪阴影
    W: 0xffffff,
    eye: 0x1565c0,
    F: 0xfff176,       // 枪口闪光
    badge: 0xffd700,   // RPD 徽章 (预留)
  };
}

function makeClairePalette(): Record<string, number> {
  return {
    K: 0x0d0d0d,
    H_hair: 0xef5350,
    M_hair: 0xc62828,
    S_hair: 0x8e1414,
    H_skin: 0xf4c9a0,
    M_skin: 0xe0b080,
    S_skin: 0xa07050,
    H_shirt: 0xef5350,  // 红夹克
    M_shirt: 0xc62828,
    S_shirt: 0x8e1414,
    H_pants: 0x3a3a3a,
    M_pants: 0x212121,
    S_pants: 0x111111,
    boots: 0x3e2723,
    belt: 0x1a1a1a,
    H_gun: 0x5a5a5a,
    M_gun: 0x2a2a2a,
    S_gun: 0x0a0a0a,
    W: 0xffffff,
    eye: 0x4caf50,
    F: 0xfff176,
  };
}

function makeAdaPalette(): Record<string, number> {
  return {
    K: 0x0d0d0d,
    H_hair: 0x3a3a3a,
    M_hair: 0x1a1a1a,
    S_hair: 0x050505,
    H_skin: 0xf4c9a0,
    M_skin: 0xe0b080,
    S_skin: 0xa07050,
    H_shirt: 0xd32f2f,  // 红旗袍
    M_shirt: 0xb71c1c,
    S_shirt: 0x7f1010,
    H_pants: 0x1a1a1a,  // 黑丝
    M_pants: 0x0a0a0a,
    S_pants: 0x000000,
    boots: 0x0a0a0a,
    belt: 0x1a1a1a,
    H_gun: 0x8d6e63,    // 左轮金属
    M_gun: 0x3e2723,
    S_gun: 0x1a0e08,
    W: 0xffffff,
    eye: 0xb71c1c,
    F: 0xfff176,
  };
}

/* ============================================================
 *  渲染函数 —— 把 Huntdown 风格 art 数组 + 色板渲染成纹理
 *  关键: 把 art 中的颜色代号 (H/M/S/K) 映射到实际颜色
 * ============================================================ */

function makeCharacterTexture(
  scene: Phaser.Scene,
  key: string,
  art: string[],
  palette: Record<string, number>,
  // 角色类型决定各部位颜色映射
  type: 'leon' | 'claire' | 'ada'
): void {
  const p = palette;

  // 不同角色部位颜色映射
  const colorMap: Record<string, number> = {};

  if (type === 'leon') {
    colorMap['K'] = p.K;
    colorMap['H'] = p.H_skin;      // 头/皮肤高光
    colorMap['M'] = p.M_skin;      // 头/皮肤主
    colorMap['S'] = p.S_skin;      // 头/皮肤阴影
    colorMap['W'] = p.W;
    colorMap['F'] = p.F;
  } else if (type === 'claire') {
    colorMap['K'] = p.K;
    colorMap['H'] = p.H_skin;
    colorMap['M'] = p.M_skin;
    colorMap['S'] = p.S_skin;
    colorMap['W'] = p.W;
    colorMap['F'] = p.F;
  } else {
    colorMap['K'] = p.K;
    colorMap['H'] = p.H_skin;
    colorMap['M'] = p.M_skin;
    colorMap['S'] = p.S_skin;
    colorMap['W'] = p.W;
    colorMap['F'] = p.F;
  }

  // 额外部位色 — 渲染时需要按位置区分头发/衣服/枪/裤
  // 因为 art 中同一字符在不同行代表不同部位, 我们用逐行替换的方式
  // 更简单: 直接生成完整的字符→颜色映射, 按行号区分
  const rows = art.length;

  const g = scene.add.graphics();

  for (let y = 0; y < rows; y++) {
    const row = art[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;

      // 根据行号和列号判断部位
      // 头: 行 0-12
      // 躯干+手臂+枪: 行 13-22
      // 腰带+裤+靴: 行 23-31
      let color = colorMap[ch];

      if (color === undefined) {
        // 特殊颜色代号
        if (ch === 'K') color = p.K;
        else if (ch === 'W') color = p.W;
        else if (ch === 'F') color = p.F;
        else {
          // 根据行号和字符推断部位颜色
          if (y <= 12) {
            // 头部区域
            if (ch === 'H') color = p.H_skin;
            else if (ch === 'M') color = p.M_skin;
            else if (ch === 'S') color = p.S_skin;
            // 头发 (行 0-4)
            if (y <= 4) {
              if (ch === 'H') color = p.H_hair;
              else if (ch === 'M') color = p.M_hair;
              else if (ch === 'S') color = p.S_hair;
            }
            // 马尾/发髻 (右侧延伸)
            if (x >= 20 && ch === 'K') color = p.M_hair;
          } else if (y >= 13 && y <= 22) {
            // 躯干 + 手臂 + 枪
            if (ch === 'H') color = p.H_shirt;
            else if (ch === 'M') color = p.M_shirt;
            else if (ch === 'S') color = p.S_shirt;
            // 枪区域 (右侧 x >= 16)
            if (x >= 16) {
              if (ch === 'H') color = p.H_gun;
              else if (ch === 'M') color = p.M_gun;
              else if (ch === 'S') color = p.S_gun;
            }
          } else if (y >= 23) {
            // 腰带 + 裤 + 靴
            if (y === 23 || y === 24) {
              // 腰带
              color = p.belt;
            } else {
              if (ch === 'H') color = p.H_pants;
              else if (ch === 'M') color = p.M_pants;
              else if (ch === 'S') color = p.S_pants;
              // 靴子 (行 29+)
              if (y >= 29) {
                color = p.boots;
              }
            }
          }
        }
      }

      if (color === undefined) continue;
      g.fillStyle(color, 1);
      g.fillRect(x * PX, y * PX, PX, PX);
    }
  }

  g.generateTexture(key, 24 * PX, 32 * PX);
  g.destroy();
}

/* ============================================================
 *  导出接口 —— 保持原有函数名, 内部完全重写
 * ============================================================ */

export function makeLeonTexture(scene: Phaser.Scene): void {
  const pal = makeLeonPalette();
  makeCharacterTexture(scene, 'player-leon', LEON_STAND, pal, 'leon');
  makeCharacterTexture(scene, 'player-leon-aim', LEON_AIM, pal, 'leon');
}

export function makeClaireTexture(scene: Phaser.Scene): void {
  const pal = makeClairePalette();
  makeCharacterTexture(scene, 'player-claire', CLAIRE_STAND, pal, 'claire');
  makeCharacterTexture(scene, 'player-claire-aim', CLAIRE_AIM, pal, 'claire');
}

export function makeAdaTexture(scene: Phaser.Scene): void {
  const pal = makeAdaPalette();
  makeCharacterTexture(scene, 'player-ada', ADA_STAND, pal, 'ada');
  makeCharacterTexture(scene, 'player-ada-aim', ADA_AIM, pal, 'ada');
}

/* ============================================================
 *  僵尸 (Huntdown 风格: 前伸手臂 + 破衣 + 血渍)
 * ============================================================ */

const ZOMBIE_BASE = [
  '................',
  '.....KKKKK......',
  '....KHHHHHK.....',
  '....KHHHHHK.....',
  '....KGGGGGK.....',  // 头
  '....KGRGGGRK....',  // 红眼
  '....KGGGGGK.....',
  '....KGGGGGK.....',
  '....KKKKKKKK....',
  '..KKKKKKKKKKKK..',
  '.KHHHHHHHHHHHHK.',  // 前伸手臂
  '.KHHRRRHHHHRHHK.',  // 破衣+血
  'KHHHHHHHHHHHHHHK',  // 破上衣
  'KHHHHHHHHHHHHHHK',
  '.KSSSSSSSSSSSK..',
  '..KKKKKKKKKKK...',
  '....KGGGGGK.....',  // 破裤
  '....KGRGGGK.....',
  '....KGGGGGK.....',
  '....KKKKKKK.....',
  '....KSSSSSK.....',
  '....KSSSSSK.....',
  '....KKKKKKK.....',
  '................',
];

function makeZombieTexture(scene: Phaser.Scene, key: string, paletteOverride?: Record<string, number>): void {
  const g = scene.add.graphics();
  const pal = {
    K: 0x0d0d0d,
    H: 0x7a9a40,  // 皮肤亮
    M: 0x6b8e23,  // 皮肤主
    S: 0x4a6b16,  // 皮肤阴影
    G: 0x6b8e23,
    R: 0xcc0000,
    ...paletteOverride,
  };

  drawArt(g, ZOMBIE_BASE, pal);
  // 前伸手臂 (Huntdown 僵尸经典姿态)
  g.fillStyle(pal.G, 1);
  for (let i = 0; i < 12; i++) {
    g.fillRect((16 + i) * PX, 10 * PX, PX, PX);
  }
  g.fillStyle(pal.S, 1);
  for (let i = 0; i < 8; i++) {
    g.fillRect((-1 - i) * PX, 10 * PX, PX, PX);
  }

  g.generateTexture(key, 20 * PX, 24 * PX);
  g.destroy();
}

export function makeZombies(scene: Phaser.Scene): void {
  makeZombieTexture(scene, 'zombie-normal');
  makeZombieTexture(scene, 'zombie-fast', { G: 0x8fbc8f, H: 0xa0d8a0, M: 0x8fbc8f, K: 0x0d0d0d });
  makeZombieTexture(scene, 'zombie-tank', { G: 0x3a5a20, H: 0x4a7a28, M: 0x3a5a20 });
}

/* ============================================================
 *  BOSS — 舔食者 (Licker)
 * ============================================================ */
const LICKER = [
  '................................',
  '................................',
  '...........SSSSSSSSSSSS........',
  '..........SSSSSSSSSSSSSS.......',
  '.........GGGGGGGGGGGGGGGG......',
  '........GGGGGGGGGGGGGGGGGG.....',
  '.....GGGGGGGGGGGGGGGGGGGGGG....',
  '....GGGGGGGGGGGGGGGGGGGGGGGG...',
  '...GGGGWWGGGGGGGGGGGGGGGGGGGG..',
  '...GGGGWWWWWWWWWWWWGGGGGGGGGG..',
  '....GGGGGGGGGGGGGGGGGGGGGGGG...',
  '.....GGGGGGGGGGGGGGGGGGGGGG....',
  '..GGG....GGGGGGGGGGGGG....GGG..',
  '.GGG......GGGGGGGGGGG......GGG.',
  'GGGGG.......GGGGGGGGG.......GGG',
  'GGG..........GGGGGGG..........GG',
  'G.............GGGGG............G',
  '...............GGG.............',
  '................G..............',
  '..............................T',
];

export function makeLickerTexture(scene: Phaser.Scene): void {
  const g = scene.add.graphics();
  const palette = { S: 0x2a1a10, G: 0x6b5a42, W: 0xe8dcc8, R: 0x9a0000 };
  drawArt(g, LICKER, palette);
  g.fillStyle(0xff0000, 1);
  g.fillRect(20 * PX, 6 * PX, 2 * PX, 2 * PX);
  g.generateTexture('licker', 32 * PX, 20 * PX);
  g.destroy();

  const g2 = scene.add.graphics();
  g2.fillStyle(0xcc0000, 1);
  for (let i = 0; i < 12; i++) g2.fillRect(i * PX, 0, PX, PX);
  g2.fillStyle(0x8a0000, 1);
  g2.fillRect(0, 0, PX, PX);
  g2.generateTexture('licker-tongue', 12 * PX, PX);
  g2.destroy();
}

/* ============================================================
 *  障碍物 — 车辆 / 集装箱 / 油桶
 * ============================================================ */

function makeBoxArt(
  scene: Phaser.Scene, key: string, w: number, h: number,
  pal: { base: number; dark: number; light: number }
): void {
  const g = scene.add.graphics();
  g.fillStyle(pal.base, 1);
  g.fillRect(0, 0, w * PX, h * PX);
  g.fillStyle(pal.light, 1);
  g.fillRect(0, 0, w * PX, PX * 2);
  g.fillStyle(pal.dark, 1);
  g.fillRect((w - 2) * PX, 0, PX * 2, h * PX);
  g.fillRect(0, (h - 2) * PX, w * PX, PX * 2);
  g.lineStyle(PX, 0x000000, 0.6);
  g.strokeRect(0, 0, w * PX, h * PX);
  for (let x = PX * 4; x < w * PX; x += PX * 4) {
    g.fillStyle(pal.dark, 0.5);
    g.fillRect(x, PX * 4, PX, h * PX - PX * 8);
  }
  g.generateTexture(key, w * PX, h * PX);
  g.destroy();
}

export function makeObstacles(scene: Phaser.Scene): void {
  makeBoxArt(scene, 'obstacle-container', 16, 10, { base: 0x2e7d32, dark: 0x1b5e20, light: 0x4caf50 });
  makeBoxArt(scene, 'obstacle-car-red', 24, 12, { base: 0xc62828, dark: 0x8e1414, light: 0xef5350 });
  makeBoxArt(scene, 'obstacle-car-blue', 24, 12, { base: 0x1565c0, dark: 0x0d47a1, light: 0x42a5f5 });
  makeBoxArt(scene, 'obstacle-barrel', 8, 10, { base: 0x616161, dark: 0x424242, light: 0x9e9e9e });
  const g = scene.add.graphics();
  g.fillStyle(0xfafafa, 1);
  g.fillRect(0, 0, 6 * PX, 4 * PX);
  g.fillStyle(0x212121, 1);
  for (let x = 0; x < 6 * PX; x += PX * 2) g.fillRect(x, 0, PX, 4 * PX);
  g.generateTexture('obstacle-cone', 6 * PX, 4 * PX);
  g.destroy();
}

/* ============================================================
 *  子弹 / 粒子 / 枪口闪光 / 地面 / 背景
 * ============================================================ */

export function makeDecorations(scene: Phaser.Scene): void {
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

  const flash = scene.add.graphics();
  flash.fillStyle(0xfff9c4, 1);
  flash.fillCircle(6, 3, 6);
  flash.fillStyle(0xffeb3b, 0.9);
  flash.fillCircle(6, 3, 3);
  flash.generateTexture('muzzle-flash', 12, 10);
  flash.destroy();

  const blood = scene.add.graphics();
  blood.fillStyle(0xb71c1c, 1);
  blood.fillRect(0, 0, 3, 3);
  blood.generateTexture('blood-particle', 3, 3);
  blood.destroy();

  const ground = scene.add.graphics();
  ground.fillStyle(0x2a2a2e, 1);
  ground.fillRect(0, 0, 64, 64);
  ground.fillStyle(0x3a3a40, 1);
  for (let i = 0; i < 64; i += 8) ground.fillRect(0, i, 64, 1);
  ground.lineStyle(2, 0xffc107, 0.5);
  ground.beginPath();
  ground.moveTo(0, 0);
  ground.lineTo(64, 0);
  ground.strokePath();
  ground.generateTexture('ground-tile', 64, 64);
  ground.destroy();

  const bgArt = scene.add.graphics();
  bgArt.fillStyle(0x0a0a0c, 1);
  bgArt.fillRect(0, 0, 1280, 720);
  bgArt.fillStyle(0x1a1a20, 1);
  let bx = 0;
  while (bx < 1280) {
    const bw = 80 + Math.floor(Math.random() * 80);
    const bh = 120 + Math.floor(Math.random() * 280);
    bgArt.fillRect(bx, 720 - bh - 120, bw, bh);
    bgArt.fillStyle(0x3a3a42, 0.5);
    for (let wy = 720 - bh - 100; wy < 720 - 120; wy += 24) {
      for (let wx = bx + 8; wx < bx + bw - 8; wx += 20) {
        if (Math.random() > 0.6) bgArt.fillRect(wx, wy, 10, 14);
      }
    }
    bgArt.fillStyle(0x1a1a20, 1);
    bx += bw;
  }
  bgArt.generateTexture('city-bg', 1280, 720);
  bgArt.destroy();

  const road = scene.add.graphics();
  road.fillStyle(0x1c1c22, 1);
  road.fillRect(0, 0, 256, 120);
  road.fillStyle(0x2a2a32, 1);
  road.fillRect(0, 0, 256, 10);
  road.fillStyle(0xffc107, 0.4);
  for (let x = 20; x < 256; x += 40) road.fillRect(x, 60, 20, 4);
  road.generateTexture('road-strip', 256, 120);
  road.destroy();
}

/* ============================================================
 *  拾取物
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
  scene.add.text(0, 0, '', {})?.destroy();
  makeLeonTexture(scene);
  makeClaireTexture(scene);
  makeAdaTexture(scene);
  makeZombies(scene);
  makeLickerTexture(scene);
  makeObstacles(scene);
  makeDecorations(scene);
  makePickups(scene);
}
