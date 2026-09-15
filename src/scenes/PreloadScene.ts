import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig';

/**
 * PreloadScene — 加载所有外部 PNG 资源
 * BootScene 只生成程序化纹理, 外部资源在这里加载
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload(): void {
    // 加载外部 PNG 资源 (AI 生成的像素艺术)
    this.load.image('player-leon', './assets/leon.png');
    this.load.image('player-leon-aim', './assets/leon.png');
    this.load.image('player-claire', './assets/claire.png');
    this.load.image('player-claire-aim', './assets/claire.png');
    this.load.image('player-ada', './assets/ada.png');
    this.load.image('player-ada-aim', './assets/ada.png');
    this.load.image('zombie-normal', './assets/zombie.png');
    this.load.image('zombie-fast', './assets/zombie.png');
    this.load.image('zombie-tank', './assets/zombie.png');

    // 进度条
    const barW = 480;
    const barH = 24;
    const x = (GAME_WIDTH - barW) / 2;
    const y = GAME_HEIGHT / 2;

    const bg = this.add.rectangle(x, y, barW, barH, COLORS.hpBg).setOrigin(0);
    const bar = this.add.rectangle(x + 2, y + 2, 0, barH - 4, COLORS.accent).setOrigin(0);

    const tip = this.add
      .text(GAME_WIDTH / 2, y - 60, 'LOADING...', {
        fontSize: '28px',
        color: '#ffffff',
        fontStyle: 'bold',
        letterSpacing: 6,
      })
      .setOrigin(0.5);

    this.load.on('progress', (p: number) => {
      bar.width = (barW - 4) * p;
    });

    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.error('[PreloadScene] FAILED to load:', file.key, file.src);
      tip.setText('LOAD FAILED: ' + file.key);
      tip.setColor('#ff4444');
    });
  }

  create(): void {
    // Phaser 会在所有 load.image 完成后自动触发 create()
    // 不用检查 totalToLoad, 直接跳转
    this.time.delayedCall(300, () => {
      this.scene.start('MainMenuScene');
    });
  }
}
