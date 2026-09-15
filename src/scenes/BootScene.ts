import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig';

/**
 * BootScene - 初始化, 生成占位纹理
 * 由于无外部美术资源, 所有 sprite 均用 Graphics 生成纹理
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    this.generateTextures();
    this.scene.start('PreloadScene');
  }

  private generateTextures(): void {
    // 玩家纹理 (用几何图形代替角色美术)
    this.makePlayerTexture('player-leon', 0x5dade2);
    this.makePlayerTexture('player-claire', 0xff7043);
    this.makePlayerTexture('player-ada', 0xee2a4a);
    this.makePlayerTexture('player-leon-aim', 0x5dade2, true);
    this.makePlayerTexture('player-claire-aim', 0xff7043, true);
    this.makePlayerTexture('player-ada-aim', 0xee2a4a, true);

    // 僵尸
    this.makeZombieTexture('zombie-normal', COLORS.zombie, COLORS.zombieDark, 36, 56);
    this.makeZombieTexture('zombie-fast', 0x9acd32, 0x556b2f, 30, 50);
    this.makeZombieTexture('zombie-tank', 0x6b8e23, 0x2f4f1f, 52, 78);

    // 子弹
    const bulletGfx = this.add.graphics();
    bulletGfx.fillStyle(0xffeb3b, 1);
    bulletGfx.fillRoundedRect(0, -2, 16, 4, 2);
    bulletGfx.generateTexture('bullet-yellow', 16, 4);
    bulletGfx.destroy();

    const bulletGfx2 = this.add.graphics();
    bulletGfx2.fillStyle(0xff5252, 1);
    bulletGfx2.fillRoundedRect(0, -2, 16, 4, 2);
    bulletGfx2.generateTexture('bullet-red', 16, 4);
    bulletGfx2.destroy();

    const bulletGfx3 = this.add.graphics();
    bulletGfx3.fillStyle(0xff9800, 1);
    bulletGfx3.fillRoundedRect(0, -2, 16, 4, 2);
    bulletGfx3.generateTexture('bullet-orange', 16, 4);
    bulletGfx3.destroy();

    // 地面砖块
    const groundGfx = this.add.graphics();
    groundGfx.fillStyle(COLORS.ground, 1);
    groundGfx.fillRect(0, 0, 64, 64);
    groundGfx.lineStyle(2, COLORS.groundTop, 1);
    groundGfx.strokeRect(0, 0, 64, 64);
    groundGfx.lineStyle(1, 0x1a1a1d, 1);
    for (let i = 0; i < 64; i += 16) {
      groundGfx.lineBetween(0, i, 64, i);
      groundGfx.lineBetween(i, 0, i, 64);
    }
    groundGfx.generateTexture('ground-tile', 64, 64);
    groundGfx.destroy();

    // 拾取物 (弹药箱/医疗包)
    this.makePickupTexture('pickup-ammo', 0xffc107, 'A');
    this.makePickupTexture('pickup-health', 0xe53935, '+');

    // 背景远景 (城市废墟剪影)
    this.makeCityBgTexture();

    // 枪口闪光
    const flashGfx = this.add.graphics();
    flashGfx.fillStyle(0xfff9c4, 1);
    flashGfx.fillCircle(12, 0, 10);
    flashGfx.fillStyle(0xffeb3b, 0.9);
    flashGfx.fillCircle(12, 0, 6);
    flashGfx.generateTexture('muzzle-flash', 24, 20);
    flashGfx.destroy();

    // 血迹/粒子
    const bloodGfx = this.add.graphics();
    bloodGfx.fillStyle(COLORS.blood, 1);
    bloodGfx.fillCircle(6, 6, 6);
    bloodGfx.generateTexture('blood-particle', 12, 12);
    bloodGfx.destroy();
  }

  private makePlayerTexture(key: string, color: number, aiming = false): void {
    const g = this.add.graphics();
    const w = 44;
    const h = 64;
    // 身体
    g.fillStyle(color, 1);
    g.fillRoundedRect(8, 20, 28, 36, 6);
    // 头
    g.fillStyle(0xffcc99, 1);
    g.fillCircle(22, 14, 12);
    // 头发
    g.fillStyle(0x2b2b2b, 1);
    g.fillCircle(22, 8, 10);
    // 腿
    g.fillStyle(0x2c3e50, 1);
    g.fillRect(10, 56, 10, 10);
    g.fillRect(24, 56, 10, 10);
    // 手臂 + 枪
    if (aiming) {
      g.fillStyle(0xffcc99, 1);
      g.fillRect(30, 26, 18, 6);
      g.fillStyle(0x1a1a1a, 1);
      g.fillRect(44, 24, 14, 8);
    } else {
      g.fillStyle(0xffcc99, 1);
      g.fillRect(2, 28, 10, 6);
      g.fillRect(32, 28, 10, 6);
      g.fillStyle(0x1a1a1a, 1);
      g.fillRect(38, 30, 10, 4);
    }
    g.generateTexture(key, w, h);
    g.destroy();
  }

  private makeZombieTexture(
    key: string,
    bodyColor: number,
    darkColor: number,
    w: number,
    h: number
  ): void {
    const g = this.add.graphics();
    // 身体
    g.fillStyle(bodyColor, 1);
    g.fillRoundedRect(w * 0.18, h * 0.3, w * 0.64, h * 0.55, 6);
    // 头
    g.fillStyle(0x8fbc8f, 1);
    g.fillCircle(w / 2, h * 0.2, w * 0.28);
    // 眼睛 (红)
    g.fillStyle(0xff0000, 1);
    g.fillCircle(w * 0.38, h * 0.18, 3);
    g.fillCircle(w * 0.62, h * 0.18, 3);
    // 嘴
    g.fillStyle(0x1a1a1a, 1);
    g.fillRect(w * 0.38, h * 0.27, w * 0.24, 4);
    // 手臂前伸
    g.fillStyle(darkColor, 1);
    g.fillRect(0, h * 0.35, w * 0.22, 10);
    g.fillRect(w * 0.78, h * 0.35, w * 0.22, 10);
    // 腿
    g.fillStyle(darkColor, 1);
    g.fillRect(w * 0.22, h * 0.85, w * 0.2, h * 0.15);
    g.fillRect(w * 0.58, h * 0.85, w * 0.2, h * 0.15);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  private makePickupTexture(key: string, color: number, label: string): void {
    const g = this.add.graphics();
    g.fillStyle(color, 0.9);
    g.fillRoundedRect(0, 0, 32, 24, 4);
    g.lineStyle(2, 0xffffff, 0.9);
    g.strokeRoundedRect(0, 0, 32, 24, 4);
    g.generateTexture(key, 32, 24);
    g.destroy();
    // 文字叠加在 texture 生成后由实体自身添加 text
    void label;
  }

  private makeCityBgTexture(): void {
    const g = this.add.graphics();
    g.fillStyle(0x0a0a0c, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    // 远景建筑剪影
    g.fillStyle(0x141418, 1);
    for (let i = 0; i < 12; i++) {
      const bw = Phaser.Math.Between(80, 160);
      const bh = Phaser.Math.Between(150, 380);
      const bx = i * 110;
      g.fillRect(bx, GAME_HEIGHT - bh - 120, bw, bh);
      // 窗户
      g.fillStyle(0x2a2a30, 0.6);
      for (let wy = 0; wy < bh - 20; wy += 24) {
        for (let wx = 0; wx < bw - 16; wx += 22) {
          if (Math.random() > 0.4) {
            g.fillRect(bx + 8 + wx, GAME_HEIGHT - bh - 120 + 10 + wy, 10, 14);
          }
        }
      }
      g.fillStyle(0x141418, 1);
    }
    g.generateTexture('city-bg', GAME_WIDTH, GAME_HEIGHT);
    g.destroy();
  }
}
