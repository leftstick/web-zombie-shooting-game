import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig';

/**
 * PreloadScene - 加载资源 (当前无外部资源, 作为占位 + 进度条展示)
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload(): void {
    // 加载外部 PNG 资源 (AI 生成的像素艺术)
    this.load.image('player-leon', '/assets/leon.png');
    this.load.image('player-leon-aim', '/assets/leon.png');  // 复用同一张, 翻转+缩放代替
    this.load.image('player-claire', '/assets/claire.png');
    this.load.image('player-claire-aim', '/assets/claire.png');
    this.load.image('player-ada', '/assets/ada.png');
    this.load.image('player-ada-aim', '/assets/ada.png');
    this.load.image('zombie-normal', '/assets/zombie.png');
    this.load.image('zombie-fast', '/assets/zombie.png');
    this.load.image('zombie-tank', '/assets/zombie.png');

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

    this.load.on('complete', () => {
      tip.setText('COMPLETE');
      this.time.delayedCall(300, () => {
        this.scene.start('MainMenuScene');
      });
    });
  }

  create(): void {
    // 没有外部资源时 Phaser 不会触发 progress/complete; 兜底直接跳转
    if (this.load.totalToLoad === 0) {
      this.time.delayedCall(400, () => {
        this.scene.start('MainMenuScene');
      });
    }
  }
}
