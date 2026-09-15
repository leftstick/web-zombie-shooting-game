import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, GAME_HEIGHT, STORAGE_KEYS } from '../config/gameConfig';
import { getCharacter, type CharacterId } from '../characters/characterData';

interface GameOverData {
  victory: boolean;
  score: number;
  kills: number;
  level: number;
  characterId: CharacterId;
}

/**
 * GameOverScene - 结算界面
 */
export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  create(data: GameOverData): void {
    const { victory, score, kills, level, characterId } = data;
    const char = getCharacter(characterId);

    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'city-bg').setAlpha(0.4);
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.75).setOrigin(0);

    const title = victory ? 'VICTORY' : 'GAME OVER';
    const titleColor = victory ? 0x4fc3f7 : 0xff1744;

    this.add
      .text(GAME_WIDTH / 2, 150, title, {
        fontSize: '72px',
        color: `#${titleColor.toString(16).padStart(6, '0')}`,
        fontStyle: 'bold',
        letterSpacing: 10,
        stroke: '#000000',
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 230, victory ? '你成功逃出了浣熊市!' : '你被僵尸吞没了...', {
        fontSize: '22px',
        color: '#e0e0e0',
      })
      .setOrigin(0.5);

    // 角色头像
    const avatar = this.add.image(GAME_WIDTH / 2, 330, `player-${char.id}`);
    avatar.setScale(2);

    // 战绩
    const highScore = parseInt(localStorage.getItem(STORAGE_KEYS.highScore) || '0', 10);
    const isNewRecord = score >= highScore && score > 0;

    const stats = [
      `角色: ${char.name}`,
      `武器: ${char.weapon.name}`,
      `到达关卡: 第 ${level} 关`,
      `击杀数: ${kills}`,
      `得分: ${score}`,
      `最高分: ${highScore}${isNewRecord ? '  ★ 新纪录!' : ''}`,
    ];

    this.add
      .text(GAME_WIDTH / 2, 430, stats, {
        fontSize: '20px',
        color: '#ffffff',
        align: 'center',
        lineSpacing: 10,
      })
      .setOrigin(0.5);

    // 按钮
    this.createButton(GAME_WIDTH / 2 - 140, 620, '再来一局', () => {
      this.scene.start('CharacterSelectScene');
    });
    this.createButton(GAME_WIDTH / 2 + 140, 620, '返回主菜单', () => {
      this.scene.start('MainMenuScene');
    });
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void
  ): void {
    const w = 220;
    const h = 56;
    const bg = this.add.rectangle(x, y, w, h, COLORS.accent, 0.85);
    bg.setStrokeStyle(2, 0xffffff, 0.9);
    const txt = this.add
      .text(x, y, label, {
        fontSize: '22px',
        color: '#ffffff',
        fontStyle: 'bold',
        letterSpacing: 3,
      })
      .setOrigin(0.5);

    const zone = this.add.zone(x, y, w, h);
    zone.setInteractive();
    zone.on('pointerover', () => bg.setFillStyle(0xff5252, 1));
    zone.on('pointerout', () => bg.setFillStyle(COLORS.accent, 0.85));
    zone.on('pointerdown', () => {
      bg.setScale(0.96);
      onClick();
    });
    zone.on('pointerup', () => bg.setScale(1));
  }
}
