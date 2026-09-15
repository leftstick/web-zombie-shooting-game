import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig';

/**
 * PreloadScene — 加载所有外部素材 (sprites + tilesets + maps)
 * 使用相对路径 ./assets/ 兼容 GitHub Pages 项目页
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload(): void {
    // === 角色精灵 (3 帧动画: f1=站立, f2=走1, f3=走2) ===
    this.load.image('leon-f1', './assets/sprites/leon-f1.png');
    this.load.image('leon-f2', './assets/sprites/leon-f2.png');
    this.load.image('leon-f3', './assets/sprites/leon-f3.png');
    this.load.image('claire-f1', './assets/sprites/claire-f1.png');
    this.load.image('claire-f2', './assets/sprites/claire-f2.png');
    this.load.image('claire-f3', './assets/sprites/claire-f3.png');
    this.load.image('ada-f1', './assets/sprites/ada-f1.png');
    this.load.image('ada-f2', './assets/sprites/ada-f2.png');
    this.load.image('ada-f3', './assets/sprites/ada-f3.png');

    // === 僵尸精灵 ===
    this.load.image('zombie-f1', './assets/sprites/zombie-f1.png');
    this.load.image('zombie-f2', './assets/sprites/zombie-f2.png');
    this.load.image('zombie-f3', './assets/sprites/zombie-f3.png');

    // === 地图 tileset + Tiled JSON ===
    this.load.image('game-tiles', './assets/tilesets/game-tiles.png');
    this.load.tilemapTiledJSON('level1', './assets/maps/level1.json');

    // === 进度条 ===
    const barW = 480;
    const barH = 24;
    const x = (GAME_WIDTH - barW) / 2;
    const y = GAME_HEIGHT / 2;

    this.add.rectangle(x, y, barW, barH, COLORS.hpBg).setOrigin(0);
    const bar = this.add.rectangle(x + 2, y + 2, 0, barH - 4, COLORS.accent).setOrigin(0);

    this.add.text(GAME_WIDTH / 2, y - 60, 'LOADING...', {
      fontSize: '28px', color: '#ffffff', fontStyle: 'bold', letterSpacing: 6,
    }).setOrigin(0.5);

    this.load.on('progress', (p: number) => {
      bar.width = (barW - 4) * p;
    });

    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.error('[PreloadScene] FAILED:', file.key, file.src);
    });
  }

  create(): void {
    // 创建动画 (全局只创建一次)
    this.createAnimations();
    this.scene.start('MainMenuScene');
  }

  private createAnimations(): void {
    // 玩家走路动画 (3帧循环)
    for (const char of ['leon', 'claire', 'ada']) {
      if (!this.anims.exists(`${char}-walk`)) {
        this.anims.create({
          key: `${char}-walk`,
          frames: [
            { key: `${char}-f1` },
            { key: `${char}-f2` },
            { key: `${char}-f3` },
          ],
          frameRate: 8,
          repeat: -1,
        });
      }
      if (!this.anims.exists(`${char}-idle`)) {
        this.anims.create({
          key: `${char}-idle`,
          frames: [{ key: `${char}-f1` }],
          frameRate: 1,
        });
      }
    }

    // 僵尸走路动画
    if (!this.anims.exists('zombie-walk')) {
      this.anims.create({
        key: 'zombie-walk',
        frames: [
          { key: 'zombie-f1' },
          { key: 'zombie-f2' },
          { key: 'zombie-f3' },
        ],
        frameRate: 6,
        repeat: -1,
      });
    }
  }
}
