/**
 * 像素艺术生成器 —— 障碍物/背景/粒子/拾取物/BOSS/角色头像
 * 角色和僵尸精灵由外部 PNG 提供 (在 PreloadScene 加载)
 */
import Phaser from 'phaser';

export const PX = 3;

function renderArt(
  gfx: Phaser.GameObjects.Graphics,
  art: string[],
  palette: Record<string, number>,
  px = PX
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
      gfx.fillRect(x * px, y * px, px, px);
    }
  }
  return { w: cols * px, h: rows * px };
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
  renderArt(g, LICKER, { S: 0x2a1a10, G: 0x6b5a42, W: 0xe8dcc8 });
  g.fillStyle(0xff0000, 1);
  g.fillRect(20 * PX, 6 * PX, 2 * PX, 2 * PX);
  g.generateTexture('licker', 32 * PX, 20 * PX);
  g.destroy();
}

/* ============================================================
 *  障碍物
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
  // 路障 — 橙白条纹
  g.fillStyle(0xff6f00, 1);
  g.fillRect(0, 0, 18, 12);
  g.fillStyle(0xffffff, 1);
  g.fillRect(0, 0, 18, 4);
  g.fillRect(0, 8, 18, 4);
  g.generateTexture('obstacle-cone', 18, 12);
  g.destroy();
}

/* ============================================================
 *  粒子 / 子弹 / 枪口闪光 / 拾取物 / 城市背景 / 地面
 * ============================================================ */
export function makeParticlesAndBullets(scene: Phaser.Scene): void {
  // 血液粒子 (深红色小方块)
  const blood = scene.add.graphics();
  blood.fillStyle(0x8b0000, 1);
  blood.fillCircle(1.5, 1.5, 1.5);
  blood.generateTexture('blood-particle', 4, 4);
  blood.destroy();

  // 黄色小圆点 — 火花/弹壳
  const spark = scene.add.graphics();
  spark.fillStyle(0xffeb3b, 1);
  spark.fillCircle(2, 2, 2);
  spark.generateTexture('spark-particle', 5, 5);
  spark.destroy();

  // 枪口闪光 — 圆形光晕
  const flash = scene.add.graphics();
  flash.fillStyle(0xffff80, 1);
  flash.fillCircle(8, 4, 8);
  flash.fillStyle(0xffeb3b, 0.9);
  flash.fillCircle(8, 4, 5);
  flash.fillStyle(0xff9800, 0.8);
  flash.fillCircle(8, 4, 3);
  flash.generateTexture('muzzle-flash', 16, 10);
  flash.destroy();
}

export function makePickups(scene: Phaser.Scene): void {
  // 医疗包 (红十字)
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

  // 弹药箱 (黄色)
  const ammo = scene.add.graphics();
  ammo.fillStyle(0xf9a825, 1);
  ammo.fillRoundedRect(0, 0, 28, 20, 2);
  ammo.lineStyle(2, 0x000000, 0.8);
  ammo.strokeRoundedRect(0, 0, 28, 20, 2);
  ammo.fillStyle(0x000000, 1);
  ammo.fillRect(4, 4, 20, 4);
  ammo.fillStyle(0xffffff, 1);
  ammo.fillRect(10, 10, 3, 6);
  ammo.fillRect(15, 10, 3, 6);
  ammo.fillRect(20, 10, 3, 6);
  ammo.generateTexture('pickup-ammo', 28, 20);
  ammo.destroy();
}

/**
 * 生成一张 1280x720 的城市废墟背景 — 分层视差, 暗色调, 生化危机风
 */
export function makeCityBg(scene: Phaser.Scene): void {
  const W = 1280, H = 720;
  const g = scene.add.graphics();

  // 天空渐变 (暗红 → 深紫 → 黑)
  g.fillGradientStyle(0x3a0a0a, 0x3a0a0a, 0x0a0a1a, 0x0a0a1a, 1);
  g.fillRect(0, 0, W, H);

  // 远景 — 最暗的山脊 (视差层 1)
  g.fillStyle(0x0d0d14, 1);
  const farY = H - 380;
  let fx = 0;
  while (fx < W + 80) {
    const bw = 100 + Math.floor(Math.random() * 120);
    const bh = 60 + Math.floor(Math.random() * 100);
    g.fillRect(fx, farY - bh, bw, bh + 380);
    fx += bw + 20;
  }

  // 中景 — 暗楼 (视差层 2)  + 破损窗户
  g.fillStyle(0x15151c, 1);
  const midY = H - 240;
  let mx = -40;
  const rng = mulberry32(12345);
  while (mx < W + 100) {
    const bw = 70 + Math.floor(rng() * 90);
    const bh = 80 + Math.floor(rng() * 180);
    g.fillRect(mx, midY - bh, bw, bh + 240);
    // 窗户 (带些许灯光)
    for (let wy = midY - bh + 16; wy < midY - 16; wy += 20) {
      for (let wx = mx + 10; wx < mx + bw - 10; wx += 16) {
        const r = rng();
        if (r < 0.12) {
          // 亮窗 — 橙色
          g.fillStyle(0xff9800, 0.7 + rng() * 0.3);
          g.fillRect(wx, wy, 8, 10);
          g.fillStyle(0x15151c, 1);
        } else if (r < 0.5) {
          // 暗窗
          g.fillStyle(0x2a2a35, 1);
          g.fillRect(wx, wy, 8, 10);
          g.fillStyle(0x15151c, 1);
        }
      }
    }
    g.fillStyle(0x15151c, 1);
    mx += bw + 10;
  }

  // 近景 — 更亮一点的建筑边缘 / 招牌
  g.fillStyle(0x1e1e2a, 1);
  const nearY = H - 160;
  let nx = -20;
  while (nx < W + 60) {
    const bw = 90 + Math.floor(rng() * 70);
    const bh = 40 + Math.floor(rng() * 80);
    g.fillRect(nx, nearY - bh, bw, bh + 160);
    // 偶尔有红/黄色广告招牌
    if (rng() < 0.3) {
      const sh = 8 + Math.floor(rng() * 10);
      g.fillStyle(rng() < 0.5 ? 0xff1744 : 0xffc107, 0.5 + rng() * 0.5);
      g.fillRect(nx + 6, nearY - bh + 20, bw - 12, sh);
      g.fillStyle(0x1e1e2a, 1);
    }
    nx += bw + 8;
  }

  // 底部雾霭渐黑 (让地面区域自然过渡)
  g.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.7);
  g.fillRect(0, H - 100, W, 100);

  // 暗角 (让中心突出)
  g.fillStyle(0x000000, 0.3);
  // 简单画几个大矩形做暗角
  g.fillRect(0, 0, 80, H);
  g.fillRect(W - 80, 0, 80, H);

  g.generateTexture('city-bg', W, H);
  g.destroy();

  // 同时生成 3 张视差层 (far / mid / near), 每块 640px 高方便 tileSprite 滚动
  makeCityBgLayer(scene, 'bg-far', 1280, 480, 0x0a0a12, 0x12121a, 15, 30, 0.08);
  makeCityBgLayer(scene, 'bg-mid', 1280, 500, 0x12121a, 0x1e1e28, 22, 50, 0.25);
  makeCityBgLayer(scene, 'bg-near', 1280, 520, 0x1a1a25, 0x2a2a38, 30, 70, 0.45);
}

function makeCityBgLayer(
  scene: Phaser.Scene, key: string, W: number, H: number,
  darkColor: number, lightColor: number,
  minH: number, maxH: number, windowProb: number
): void {
  const g = scene.add.graphics();
  g.fillStyle(darkColor, 1);
  g.fillRect(0, 0, W, H);
  const rng = mulberry32(key.charCodeAt(0) * 9999 + H);
  let x = -20;
  const baseY = H;
  while (x < W + 80) {
    const bw = 60 + Math.floor(rng() * 100);
    const bh = minH + Math.floor(rng() * (maxH - minH));
    g.fillStyle(lightColor, 1);
    g.fillRect(x, baseY - bh, bw, bh);
    // 窗户
    for (let wy = baseY - bh + 14; wy < baseY - 14; wy += 18) {
      for (let wx = x + 8; wx < x + bw - 8; wx += 14) {
        if (rng() < windowProb) {
          const cr = rng();
          if (cr < 0.2) {
            g.fillStyle(0xff9800, 0.6 + rng() * 0.4);
          } else {
            g.fillStyle(0x3a3a48, 1);
          }
          g.fillRect(wx, wy, 6, 8);
          g.fillStyle(lightColor, 1);
        }
      }
    }
    x += bw + 6;
  }
  g.generateTexture(key, W, H);
  g.destroy();
}

/** 简单可控随机数 (mulberry32) */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 角色小头像 (用于 GameOverScene 结算页) — 简化版
 */
export function makeCharacterAvatars(scene: Phaser.Scene): void {
  // 里昂: 红黑配色
  const leon = scene.add.graphics();
  leon.fillStyle(0x1a1a1a, 1);
  leon.fillRoundedRect(0, 0, 80, 100, 8);
  leon.fillStyle(0xf5f5dc, 1);
  leon.fillCircle(40, 28, 18); // 头
  leon.fillStyle(0x2c1810, 1);
  leon.fillRect(22, 14, 36, 12); // 头发
  leon.fillStyle(0x1565c0, 1);
  leon.fillRect(12, 48, 56, 44); // 身体 (夹克)
  leon.fillStyle(0x000000, 1);
  leon.fillRect(12, 48, 56, 6); // 腰带
  leon.fillStyle(0xffffff, 1);
  leon.fillRect(30, 58, 20, 4); // 汗衫边
  leon.generateTexture('player-leon', 80, 100);
  leon.destroy();

  // 克莱尔: 红头发, 夹克
  const claire = scene.add.graphics();
  claire.fillStyle(0x1a1a1a, 1);
  claire.fillRoundedRect(0, 0, 80, 100, 8);
  claire.fillStyle(0xf5deb3, 1);
  claire.fillCircle(40, 28, 18);
  claire.fillStyle(0xc62828, 1);
  claire.fillRect(20, 12, 40, 26);
  claire.fillStyle(0xff7043, 1);
  claire.fillRect(12, 48, 56, 44);
  claire.fillStyle(0x000000, 1);
  claire.fillRect(12, 48, 56, 5);
  claire.generateTexture('player-claire', 80, 100);
  claire.destroy();

  // 艾达: 深色衣服 + 红围巾
  const ada = scene.add.graphics();
  ada.fillStyle(0x1a1a1a, 1);
  ada.fillRoundedRect(0, 0, 80, 100, 8);
  ada.fillStyle(0xf5deb3, 1);
  ada.fillCircle(40, 28, 18);
  ada.fillStyle(0x1a1a1a, 1);
  ada.fillRect(22, 12, 36, 22);
  ada.fillStyle(0x1e1e1e, 1);
  ada.fillRect(12, 48, 56, 44);
  ada.fillStyle(0xee2a4a, 1);
  ada.fillRect(24, 42, 32, 10);
  ada.generateTexture('player-ada', 80, 100);
  ada.destroy();
}

export function makeGroundTile(scene: Phaser.Scene): void {
  // 一个 64x120 的地面/道路 tile (可平铺)
  const g = scene.add.graphics();
  // 路面主色
  g.fillStyle(0x1c1c22, 1);
  g.fillRect(0, 0, 64, 120);
  // 路面顶部亮线
  g.fillStyle(0x2a2a32, 1);
  g.fillRect(0, 0, 64, 4);
  // 中间的黄色虚线
  g.fillStyle(0xffc107, 0.55);
  for (let x = 4; x < 60; x += 16) g.fillRect(x, 56, 10, 4);
  // 路面裂纹
  g.lineStyle(1, 0x0a0a0c, 0.6);
  g.beginPath();
  g.moveTo(8, 12); g.lineTo(14, 20);
  g.moveTo(40, 60); g.lineTo(48, 72);
  g.moveTo(20, 96); g.lineTo(28, 108);
  g.strokePath();
  g.generateTexture('road-strip', 64, 120);
  g.destroy();

  // 纯地面纹理 (底下部分)
  const ground = scene.add.graphics();
  ground.fillStyle(0x14141a, 1);
  ground.fillRect(0, 0, 64, 64);
  ground.fillStyle(0x1e1e26, 1);
  ground.fillRect(0, 0, 64, 2);
  ground.generateTexture('ground-tile', 64, 64);
  ground.destroy();
}

/** 程序化子弹 (比外部 PNG 更可定制) */
export function makeBulletTexture(scene: Phaser.Scene): void {
  const W = 64, H = 16;
  const g = scene.add.graphics();
  // 拖尾 — 从暗到亮渐变
  for (let i = 0; i < W; i++) {
    const t = i / W; // 0 (头) → 1 (尾)
    // 亮度: 头部亮黄, 尾部暗红
    const alpha = 1 - t * 0.4;
    if (t < 0.15) {
      // 头部 — 明亮白色弹头
      g.fillStyle(0xffffff, alpha);
    } else if (t < 0.4) {
      // 近段 — 金黄色
      g.fillStyle(0xffeb3b, alpha);
    } else if (t < 0.75) {
      // 中段 — 橙色
      g.fillStyle(0xff9800, alpha);
    } else {
      // 尾段 — 红橙
      g.fillStyle(0xe64a00, alpha * 0.8);
    }
    g.fillRect(i, H / 2 - 1, 1, 2);
    if (t < 0.5) {
      g.fillRect(i, H / 2 - 2, 1, 4); // 中间加粗
    }
  }
  // 头部光晕
  g.fillStyle(0xffffff, 0.8);
  g.fillCircle(2, H / 2, 4);
  g.fillStyle(0xffeb3b, 0.9);
  g.fillCircle(2, H / 2, 2);

  g.generateTexture('bullet-trail', W, H);
  g.destroy();
}

/** 汇总 */
export function generateAllPixelArt(scene: Phaser.Scene): void {
  makeLickerTexture(scene);
  makeObstacles(scene);
  makeParticlesAndBullets(scene);
  makePickups(scene);
  makeCityBg(scene);
  makeCharacterAvatars(scene);
  makeGroundTile(scene);
  makeBulletTexture(scene);
}
