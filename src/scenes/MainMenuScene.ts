import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig';

/**
 * MainMenuScene - 主菜单
 */
export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenuScene');
  }

  create(): void {
    // 背景
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'city-bg').setAlpha(0.6);
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55).setOrigin(0);

    // 标题
    const title = this.add
      .text(GAME_WIDTH / 2, 180, 'BIOHAZARD', {
        fontSize: '88px',
        color: '#ff1744',
        fontStyle: 'bold',
        letterSpacing: 12,
        stroke: '#000000',
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: title,
      alpha: 0.6,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add
      .text(GAME_WIDTH / 2, 260, '生化危机 · 浣熊市突围', {
        fontSize: '28px',
        color: '#e0e0e0',
        letterSpacing: 6,
      })
      .setOrigin(0.5);

    // 开始按钮
    const startBtn = this.createButton(GAME_WIDTH / 2, 400, '开始游戏', () => {
      this.scene.start('CharacterSelectScene');
    });

    // 操作说明
    const help = this.add
      .text(
        GAME_WIDTH / 2,
        540,
        [
          'PC: A/D 移动 · W/空格 跳跃 · J 射击 · R 换弹',
          '移动端: 左摇杆移动 · 右按钮 射/跳/弹  (请横屏游玩)',
        ],
        {
          fontSize: '18px',
          color: '#9e9e9e',
          align: 'center',
          lineSpacing: 8,
        }
      )
      .setOrigin(0.5);

    // 底部版本
    this.add
      .text(GAME_WIDTH - 20, GAME_HEIGHT - 20, 'v0.1.0', {
        fontSize: '14px',
        color: '#616161',
      })
      .setOrigin(1);
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const w = 280;
    const h = 64;
    const bg = this.add.rectangle(0, 0, w, h, COLORS.accent, 0.85);
    bg.setStrokeStyle(2, 0xffffff, 0.9);
    const txt = this.add
      .text(0, 0, label, {
        fontSize: '26px',
        color: '#ffffff',
        fontStyle: 'bold',
        letterSpacing: 4,
      })
      .setOrigin(0.5);

    const container = this.add.container(x, y, [bg, txt]);
    container.setSize(w, h);
    container.setInteractive(
      new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
      Phaser.Geom.Rectangle.Contains
    );

    container.on('pointerover', () => bg.setFillStyle(0xffff5252, 1));
    container.on('pointerout', () => bg.setFillStyle(COLORS.accent, 0.85));
    container.on('pointerdown', () => {
      bg.setScale(0.96);
      onClick();
    });
    container.on('pointerup', () => bg.setScale(1));

    return container;
  }
}
