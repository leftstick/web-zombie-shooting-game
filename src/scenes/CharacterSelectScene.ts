import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, GAME_HEIGHT, STORAGE_KEYS } from '../config/gameConfig';
import { CHARACTER_LIST, type CharacterConfig } from '../characters/characterData';

/**
 * CharacterSelectScene - 角色选择 (里昂 / 克莱尔 / 艾达王)
 */
export class CharacterSelectScene extends Phaser.Scene {
  private selectedIndex = 0;
  private cards: Phaser.GameObjects.Container[] = [];

  constructor() {
    super('CharacterSelectScene');
  }

  create(): void {
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'city-bg').setAlpha(0.5);
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6).setOrigin(0);

    this.add
      .text(GAME_WIDTH / 2, 90, '选择角色', {
        fontSize: '48px',
        color: '#ffffff',
        fontStyle: 'bold',
        letterSpacing: 8,
      })
      .setOrigin(0.5);

    // 三个角色卡片
    const cardW = 320;
    const cardH = 440;
    const gap = 40;
    const totalW = cardW * 3 + gap * 2;
    const startX = (GAME_WIDTH - totalW) / 2 + cardW / 2;

    CHARACTER_LIST.forEach((char, idx) => {
      const card = this.createCard(startX + idx * (cardW + gap), 330, cardW, cardH, char, idx);
      this.cards.push(card);
    });

    // 确认按钮 — 和 MainMenuScene 完全相同的模式 (已验证可用)
    this.createButton(GAME_WIDTH / 2, 620, '确认出战', () => {
      console.log('[CharacterSelect] 确认出战被点击!');
      const char = CHARACTER_LIST[this.selectedIndex];
      localStorage.setItem(STORAGE_KEYS.selectedCharacter, char.id);
      this.scene.start('GameScene', { characterId: char.id });
    });

    // 键盘快捷
    this.input.keyboard?.on('keydown-LEFT', () => this.moveSelection(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.moveSelection(1));
    this.input.keyboard?.on('keydown-ENTER', () => {
      const char = CHARACTER_LIST[this.selectedIndex];
      localStorage.setItem(STORAGE_KEYS.selectedCharacter, char.id);
      this.scene.start('GameScene', { characterId: char.id });
    });

    this.refreshSelection();
  }

  private createCard(
    x: number,
    y: number,
    w: number,
    h: number,
    char: CharacterConfig,
    idx: number
  ): Phaser.GameObjects.Container {
    const bg = this.add.rectangle(0, 0, w, h, 0x1a1a1f, 0.92);
    bg.setStrokeStyle(3, char.color, 0.9);

    // 角色立绘 (侧面像素画)
    const avatar = this.add.image(0, -h / 2 + 130, `${char.id}-f1`);
    avatar.setScale(0.5);

    // 名字
    const name = this.add
      .text(0, -h / 2 + 240, char.name, {
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const nameEn = this.add
      .text(0, -h / 2 + 272, char.nameEn, {
        fontSize: '14px',
        color: '#9e9e9e',
      })
      .setOrigin(0.5);

    // 武器信息
    const weaponLabel = this.add
      .text(0, -h / 2 + 310, `初始武器: ${char.weapon.name}`, {
        fontSize: '16px',
        color: '#ffc107',
      })
      .setOrigin(0.5);

    // 属性条
    const statsY = -h / 2 + 350;
    const hpBar = this.makeStatBar(0, statsY, '生命', char.maxHp / 120, 0xe53935);
    const spdBar = this.makeStatBar(0, statsY + 28, '速度', char.moveSpeed / 310, 0x4fc3f7);
    const dmgBar = this.makeStatBar(0, statsY + 56, '伤害', char.weapon.damage / 70, 0xffc107);

    // 描述
    const desc = this.add
      .text(0, statsY + 92, char.desc, {
        fontSize: '13px',
        color: '#bdbdbd',
        align: 'center',
        wordWrap: { width: w - 40 },
      })
      .setOrigin(0.5);

    const container = this.add.container(x, y, [
      bg,
      avatar,
      name,
      nameEn,
      weaponLabel,
      ...hpBar,
      ...spdBar,
      ...dmgBar,
      desc,
    ]);
    // 用 zone 做卡片点击区域
    const cardZone = this.add.zone(x, y, w, h);
    cardZone.setInteractive();
    cardZone.on('pointerdown', () => {
      this.selectedIndex = idx;
      this.refreshSelection();
    });

    return container;
  }

  private makeStatBar(
    x: number,
    y: number,
    label: string,
    ratio: number,
    color: number
  ): Phaser.GameObjects.GameObject[] {
    const labelTxt = this.add
      .text(x - 120, y, label, { fontSize: '13px', color: '#e0e0e0' })
      .setOrigin(0, 0.5);
    const barBg = this.add.rectangle(x - 60, y, 160, 10, COLORS.hpBg).setOrigin(0, 0.5);
    const bar = this.add
      .rectangle(x - 60, y, 160 * ratio, 10, color)
      .setOrigin(0, 0.5);
    return [labelTxt, barBg, bar];
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const w = 240;
    const h = 56;
    const bg = this.add.rectangle(0, 0, w, h, COLORS.accent, 0.9);
    bg.setStrokeStyle(2, 0xffffff, 0.9);
    const txt = this.add
      .text(0, 0, label, {
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold',
        letterSpacing: 4,
      })
      .setOrigin(0.5);
    const container = this.add.container(x, y, [bg, txt]);

    // 用 zone 做交互区域 — 和 GameOverScene 完全相同的模式
    const zone = this.add.zone(x, y, w, h);
    zone.setInteractive();
    zone.on('pointerdown', () => {
      console.log(`[CharacterSelect] 按钮 "${label}" pointerdown!`);
      bg.setFillStyle(0xd50000, 1);
      onClick();
    });
    zone.on('pointerover', () => bg.setFillStyle(0xff5252, 1));
    zone.on('pointerout', () => bg.setFillStyle(COLORS.accent, 0.9));
    zone.on('pointerup', () => bg.setFillStyle(COLORS.accent, 0.9));

    return container;
  }

  private moveSelection(dir: number): void {
    this.selectedIndex =
      (this.selectedIndex + dir + CHARACTER_LIST.length) % CHARACTER_LIST.length;
    this.refreshSelection();
  }

  private refreshSelection(): void {
    this.cards.forEach((card, idx) => {
      const isSel = idx === this.selectedIndex;
      card.setScale(isSel ? 1.06 : 1);
      const bg = card.list[0] as Phaser.GameObjects.Rectangle;
      bg.setFillStyle(isSel ? 0x2a2a35 : 0x1a1a1f, isSel ? 1 : 0.92);
      bg.setStrokeStyle(isSel ? 5 : 3, isSel ? 0xffffff : CHARACTER_LIST[idx].color, 1);
    });
  }
}
