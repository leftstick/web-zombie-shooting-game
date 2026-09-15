/**
 * 像素艺术生成器 —— 只生成障碍物/背景/装饰等非角色元素
 * 角色和僵尸改用外部 AI 生成的 PNG (在 PreloadScene 加载)
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

  const g2 = scene.add.graphics();
  g2.fillStyle(0xcc0000, 1);
  for (let i = 0; i < 12; i++) g2.fillRect(i * PX, 0, PX, PX);
  g2.fillStyle(0x8a0000, 1);
  g2.fillRect(0, 0, PX, PX);
  g2.generateTexture('licker-tongue', 12 * PX, PX);
  g2.destroy();
}

/* ============================================================
 *  障碍物 / 装饰 / 背景 / 拾取物
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

export function makePickups(scene: Phaser.Scene): void {
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

/** 程序化生成的像素素材 (角色/僵尸 改为外部 PNG) */
export function generateAllPixelArt(scene: Phaser.Scene): void {
  makeLickerTexture(scene);
  makeObstacles(scene);
  makeDecorations(scene);
  makePickups(scene);
}
