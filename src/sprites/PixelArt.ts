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
 *  角色像素图 (16x24 逻辑像素, PX=3 后 48x72)
 *  风格: 暴徒猎手 — 方正块体 + 头部大 + 四肢粗短 + 持枪臂水平前伸
 *  生化危机特征: 衣服配色/发式/标志性装备
 * ============================================================ */

/** 通用暴徒猎手风格人体 (16x24 逻辑像素) */
const BASE_HUMAN = [
  '................', // 0
  '......HHHH......', // 1 发顶高光
  '.....HHHHHH.....', // 2
  '....SSSSSSSS....', // 3
  '....SSSSSSSS....', // 4 头发阴影
  '....FFFFFFFF....', // 5 脸
  '....FFFFFFFF....', // 6
  '....FFFFFFFF....', // 7
  '....SSSSSSSS....', // 8 下巴阴影
  '....BBBBBBBB....', // 9 脖子/衣领
  '...TTTTTTTTTT...', // 10 上身顶
  '...TTTTTTTTTT...', // 11
  '..TTTTTTTTTTTT..', // 12
  '..TTTTTTTTTTTT..', // 13
  '..TTTTTTTTTTTT..', // 14
  '..TTTTTTTTTTTT..', // 15
  '...TTTTTTTTTT...', // 16
  '....TT....TT....', // 17 腰带/髋
  '....PP....PP....', // 18 腿
  '....PP....PP....', // 19
  '....PP....PP....', // 20
  '....KK....KK....', // 21 靴
  '....KK....KK....', // 22
  '................', // 23
];

function makePlayerTexture(
  scene: Phaser.Scene,
  key: string,
  opts: {
    skin?: number;
    hair?: number;
    hairHighlight?: number;
    pants?: number;
    shirt?: number;
    shirtDark?: number;
    boots?: number;
    gun?: number;
    gunBarrel?: number;
    aimGun?: boolean; // 是否持枪前伸 (站立 vs 瞄准)
    gunVariant?: 'pistol' | 'smg' | 'revolver' | 'shotgun';
    extraArt?: string[]; // 额外特征 (墨镜/领带等) 16x24
    extraColor?: number;
  }
): void {
  const g = scene.add.graphics();

  // 主图 (站立)
  drawPixelArt(g, BASE_HUMAN, {
    H: opts.hairHighlight ?? 0xffffff,
    S: opts.hair ?? 0x2b1a0a,
    F: opts.skin ?? 0xf4c9a0,
    B: opts.shirtDark ?? 0x333333,
    T: opts.shirt ?? 0x2e7d32,
    P: opts.pants ?? 0x455a64,
    K: opts.boots ?? 0x212121,
  });

  // 持枪臂 —— 暴徒猎手经典: 手臂水平前伸, 枪紧贴身体
  if (opts.aimGun) {
    // 伸出左臂 + 枪 (朝右)
    const len = opts.gunVariant === 'shotgun' ? 10 : opts.gunVariant === 'smg' ? 9 : opts.gunVariant === 'revolver' ? 6 : 7;
    for (let i = 0; i < len; i++) {
      // 手臂 (皮肤)
      g.fillStyle(opts.skin ?? 0xf4c9a0, 1);
      g.fillRect((16 + i) * PX, 12 * PX, PX, PX);
      // 枪体 (深色金属)
      g.fillStyle(opts.gun ?? 0x1a1a1a, 1);
      g.fillRect((16 + i) * PX, 10 * PX, PX, 2 * PX);
    }
    // 枪口
    g.fillStyle(opts.gunBarrel ?? 0xffeb3b, 1);
    g.fillRect((16 + len) * PX, 10 * PX, PX, 2 * PX);
  } else {
    // 站姿: 双臂两侧自然下垂, 枪挂在身侧
    g.fillStyle(opts.skin ?? 0xf4c9a0, 1);
    g.fillRect(0, 12 * PX, PX, 5 * PX);
    g.fillRect(15 * PX, 12 * PX, PX, 5 * PX);
    // 手枪 (挂腰)
    g.fillStyle(opts.gun ?? 0x1a1a1a, 1);
    g.fillRect(14 * PX, 16 * PX, 2 * PX, 3 * PX);
  }

  g.generateTexture(key, 18 * PX, 24 * PX);
  g.destroy();
}

/* --- 里昂: 棕发 蓝警服 皮带 手枪 --- */
export function makeLeonTexture(scene: Phaser.Scene): void {
  makePlayerTexture(scene, 'player-leon', {
    hair: 0x4a2c1a, // 深棕
    hairHighlight: 0x6b4423,
    skin: 0xf4c9a0,
    shirt: 0x1a3a5c,   // 深蓝警服
    shirtDark: 0x0f2033,
    pants: 0x0d1f33,
    boots: 0x2a2a2a,
    gun: 0x1a1a1a,
    aimGun: false,
    gunVariant: 'pistol',
  });
  makePlayerTexture(scene, 'player-leon-aim', {
    hair: 0x4a2c1a,
    hairHighlight: 0x6b4423,
    skin: 0xf4c9a0,
    shirt: 0x1a3a5c,
    shirtDark: 0x0f2033,
    pants: 0x0d1f33,
    boots: 0x2a2a2a,
    gun: 0x1a1a1a,
    aimGun: true,
    gunVariant: 'pistol',
  });
}

/* --- 克莱尔: 红发 红夹克 摩托皮衣 MQ9冲锋枪 --- */
export function makeClaireTexture(scene: Phaser.Scene): void {
  makePlayerTexture(scene, 'player-claire', {
    hair: 0xc62828,
    hairHighlight: 0xef5350,
    skin: 0xf4c9a0,
    shirt: 0xc62828,   // 红夹克
    shirtDark: 0x8e1414,
    pants: 0x212121,
    boots: 0x3e2723,
    gun: 0x1a1a1a,
    aimGun: false,
    gunVariant: 'smg',
  });
  makePlayerTexture(scene, 'player-claire-aim', {
    hair: 0xc62828,
    hairHighlight: 0xef5350,
    skin: 0xf4c9a0,
    shirt: 0xc62828,
    shirtDark: 0x8e1414,
    pants: 0x212121,
    boots: 0x3e2723,
    gun: 0x1a1a1a,
    aimGun: true,
    gunVariant: 'smg',
  });
}

/* --- 艾达王: 黑发 红旗袍 黑裤 AMR左轮 --- */
export function makeAdaTexture(scene: Phaser.Scene): void {
  makePlayerTexture(scene, 'player-ada', {
    hair: 0x0a0a0a,
    hairHighlight: 0x3a3a3a,
    skin: 0xf4c9a0,
    shirt: 0xb71c1c,   // 红旗袍
    shirtDark: 0x7f1010,
    pants: 0x0a0a0a,
    boots: 0x1a1a1a,
    gun: 0x3e2723,     // 左轮铜色
    aimGun: false,
    gunVariant: 'revolver',
  });
  makePlayerTexture(scene, 'player-ada-aim', {
    hair: 0x0a0a0a,
    hairHighlight: 0x3a3a3a,
    skin: 0xf4c9a0,
    shirt: 0xb71c1c,
    shirtDark: 0x7f1010,
    pants: 0x0a0a0a,
    boots: 0x1a1a1a,
    gun: 0x3e2723,
    aimGun: true,
    gunVariant: 'revolver',
  });
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
