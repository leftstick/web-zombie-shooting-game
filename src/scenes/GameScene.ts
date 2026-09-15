import Phaser from 'phaser';
import {
  COLORS,
  GAME_WIDTH,
  GAME_HEIGHT,
  GROUND_HEIGHT,
  WORLD_WIDTH,
  STORAGE_KEYS,
} from '../config/gameConfig';
import { getCharacter, type CharacterId } from '../characters/characterData';
import { InputManager } from '../input/InputManager';
import { Player } from '../entities/Player';
import { Zombie, type ZombieType } from '../entities/Zombie';
import { Bullet } from '../entities/Bullet';
import { Pickup } from '../entities/Pickup';

interface GameSceneData {
  characterId: CharacterId;
}

/**
 * GameScene - 核心游戏场景
 * - 关卡: 玩家向右推进, 消灭僵尸到达终点过关
 * - HUD: 生命/弹药/分数/波次
 * - 僵尸波次生成
 */
export class GameScene extends Phaser.Scene {
  private inputManager!: InputManager;
  private player!: Player;
  private bullets!: Phaser.Physics.Arcade.Group;
  private zombies!: Phaser.Physics.Arcade.Group;
  private pickups!: Phaser.Physics.Arcade.Group;
  private ground!: Phaser.Physics.Arcade.StaticGroup;

  private characterId!: CharacterId;
  private level = 1;
  private zombiesToSpawn = 0;
  private zombiesSpawned = 0;
  private spawnTimer = 0;
  private spawnInterval = 1800;
  private isLevelCleared = false;
  private exitZone?: Phaser.GameObjects.Rectangle;
  private exitText?: Phaser.GameObjects.Text;
  private playerInputState!: {
    moveAxis: number;
    firing: boolean;
    consumeJump: () => boolean;
    consumeReload: () => boolean;
  };

  // HUD 元素
  private hpBar!: Phaser.GameObjects.Rectangle;
  private hpText!: Phaser.GameObjects.Text;
  private ammoText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private reloadBar!: Phaser.GameObjects.Rectangle;
  private waveText!: Phaser.GameObjects.Text;
  private hpBarBg!: Phaser.GameObjects.Rectangle;

  constructor() {
    super('GameScene');
  }

  init(data: GameSceneData): void {
    this.characterId = data.characterId ?? 'leon';
  }

  create(): void {
    const charConfig = getCharacter(this.characterId);

    // 世界边界
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, GAME_HEIGHT);

    // 背景
    this.add
      .tileSprite(0, 0, WORLD_WIDTH, GAME_HEIGHT, 'city-bg')
      .setOrigin(0)
      .setScrollFactor(0.3)
      .setDepth(-10);
    this.add.rectangle(0, 0, WORLD_WIDTH, GAME_HEIGHT, 0x000000, 0.35)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(-9);

    // 地面
    this.createGround();

    // 组
    this.bullets = this.physics.add.group({
      classType: Bullet,
      maxSize: 60,
      runChildUpdate: true,
    });
    this.zombies = this.physics.add.group({
      classType: Zombie,
      maxSize: 40,
      runChildUpdate: true,
    });
    this.pickups = this.physics.add.group({
      classType: Pickup,
      maxSize: 20,
    });

    // 输入
    this.inputManager = new InputManager(this);

    // 玩家输入状态对象 (每帧从 inputManager 同步)
    const inputState = {
      moveAxis: 0,
      firing: false,
      consumeJump: () => this.inputManager.consumeJump(),
      consumeReload: () => this.inputManager.consumeReload(),
    };

    // 玩家
    this.player = new Player(
      this,
      100,
      GAME_HEIGHT - GROUND_HEIGHT - 32,
      charConfig,
      this.bullets,
      inputState
    );
    this.playerInputState = inputState;

    // 相机跟随
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, GAME_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(GAME_WIDTH * 0.3, GAME_HEIGHT);

    // 碰撞
    this.physics.add.collider(this.player, this.ground);
    this.physics.add.collider(this.zombies, this.ground);
    this.physics.add.overlap(this.bullets, this.zombies, this.onBulletHitZombie, undefined, this);
    this.physics.add.overlap(this.player, this.zombies, this.onPlayerTouchZombie, undefined, this);
    this.physics.add.overlap(this.player, this.pickups, this.onPlayerPickup, undefined, this);

    // 终点
    this.exitZone = this.add.rectangle(WORLD_WIDTH - 100, GAME_HEIGHT - GROUND_HEIGHT / 2, 60, GROUND_HEIGHT, 0x4fc3f7, 0.25);
    this.exitZone.setStrokeStyle(3, 0x4fc3f7, 0.9);
    this.exitText = this.add.text(WORLD_WIDTH - 100, GAME_HEIGHT - GROUND_HEIGHT - 40, 'EXIT\n出口', {
      fontSize: '20px',
      color: '#4fc3f7',
      align: 'center',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // HUD
    this.createHUD();

    // 开始第一波
    this.startWave(1);
  }

  private createGround(): void {
    this.ground = this.physics.add.staticGroup();
    const tileSize = 64;
    for (let x = 0; x < WORLD_WIDTH; x += tileSize) {
      const tile = this.ground.create(x + tileSize / 2, GAME_HEIGHT - GROUND_HEIGHT / 2, 'ground-tile');
      tile.setOrigin(0.5);
      tile.refreshBody();
    }
    // 地面顶部线
    const topLine = this.add.rectangle(0, GAME_HEIGHT - GROUND_HEIGHT, WORLD_WIDTH, 4, COLORS.groundTop);
    topLine.setOrigin(0, 0.5);
    topLine.setDepth(5);
  }

  private createHUD(): void {
    const cam = this.cameras.main;
    const margin = 20;

    // 生命条
    this.hpBarBg = this.add.rectangle(margin, margin, 260, 26, COLORS.hpBg).setOrigin(0).setScrollFactor(0).setDepth(100);
    this.hpBarBg.setStrokeStyle(2, 0xffffff, 0.6);
    this.hpBar = this.add.rectangle(margin + 2, margin + 2, 256, 22, COLORS.hp).setOrigin(0).setScrollFactor(0).setDepth(101);
    this.hpText = this.add.text(margin + 8, margin + 4, '', {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setScrollFactor(0).setDepth(102);

    // 弹药
    this.ammoText = this.add.text(margin, margin + 38, '', {
      fontSize: '20px',
      color: '#ffeb3b',
      fontStyle: 'bold',
    }).setScrollFactor(0).setDepth(101);

    // 换弹进度
    this.reloadBar = this.add.rectangle(margin, margin + 68, 200, 6, COLORS.hpBg).setOrigin(0).setScrollFactor(0).setDepth(101);
    this.reloadBar.setVisible(false);

    // 分数
    this.scoreText = this.add.text(GAME_WIDTH - margin, margin, 'SCORE 0', {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(101);

    // 波次
    this.waveText = this.add.text(GAME_WIDTH - margin, margin + 32, '', {
      fontSize: '16px',
      color: '#ff5252',
      fontStyle: 'bold',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(101);
  }

  private startWave(level: number): void {
    this.level = level;
    this.isLevelCleared = false;
    this.zombiesSpawned = 0;
    this.zombiesToSpawn = 6 + level * 3;
    this.spawnInterval = Math.max(700, 1800 - level * 120);
    this.spawnTimer = 500;

    this.waveText.setText(`WAVE ${level}  剩余 ${this.zombiesToSpawn}`);
  }

  private spawnZombie(): void {
    const cam = this.cameras.main;
    const spawnFromRight = Math.random() > 0.3;
    const x = spawnFromRight
      ? cam.scrollX + GAME_WIDTH + 60
      : cam.scrollX - 60;
    const y = GAME_HEIGHT - GROUND_HEIGHT - 30;

    // 根据关卡决定僵尸类型权重
    const r = Math.random();
    let type: ZombieType = 'normal';
    if (this.level >= 3 && r < 0.15) type = 'tank';
    else if (this.level >= 2 && r < 0.4) type = 'fast';

    const zombie = this.zombies.get(x, y, undefined, undefined) as Zombie | undefined;
    if (!zombie) return;
    // 由于 group 复用, 这里手动创建更稳妥
    const newZombie = new Zombie(this, x, y, type);
    this.zombies.add(newZombie);
    newZombie.setPlayer(this.player);

    this.zombiesSpawned++;
  }

  private onBulletHitZombie(
    bulletObj: any,
    zombieObj: any
  ): void {
    const bullet = bulletObj as Bullet;
    const zombie = zombieObj as Zombie;
    if (!bullet.active || !zombie.active) return;
    if (!bullet.fromPlayer) return;

    zombie.takeDamage(bullet.damage);
    bullet.destroy();

    if (zombie.hp <= 0) {
      this.player.score += zombie.score;
      this.player.kills += 1;
      // 概率掉落
      if (Math.random() < 0.18) {
        const pickupType = Math.random() < 0.5 ? 'health' : 'ammo';
        const pickup = new Pickup(this, zombie.x, zombie.y - 10, pickupType);
        this.pickups.add(pickup);
      }
    }
  }

  private onPlayerTouchZombie(
    playerObj: any,
    zombieObj: any
  ): void {
    const zombie = zombieObj as Zombie;
    if (!zombie.active || !zombie.canAttack()) return;
    this.player.takeDamage(zombie.damage);
    zombie.triggerAttackCooldown();
    // 击退
    const dir = Math.sign(this.player.x - zombie.x) || 1;
    this.player.setVelocityX(dir * 200);
    this.player.setVelocityY(-200);

    if (this.player.hp <= 0) {
      this.gameOver(false);
    }
  }

  private onPlayerPickup(
    _playerObj: any,
    pickupObj: any
  ): void {
    const pickup = pickupObj as Pickup;
    if (!pickup.active) return;
    if (pickup.type === 'health') {
      this.player.heal(30);
    } else {
      this.player.addAmmo(Math.ceil(this.player.maxAmmo * 0.5));
    }
    pickup.destroy();
  }

  update(time: number, delta: number): void {
    this.inputManager.update();

    // 同步玩家输入状态
    this.playerInputState.moveAxis = this.inputManager.moveAxis;
    this.playerInputState.firing = this.inputManager.firing;

    this.player.update(time, delta);

    // 僵尸更新
    this.zombies.children.iterate((z) => {
      const zombie = z as Zombie;
      if (zombie && zombie.active) zombie.update(time, delta);
      return true;
    });

    // 子弹超出边界销毁
    this.bullets.children.iterate((b) => {
      const bullet = b as Bullet;
      if (bullet && bullet.active) {
        if (bullet.x < -50 || bullet.x > WORLD_WIDTH + 50) bullet.destroy();
      }
      return true;
    });

    // 生成僵尸
    if (this.zombiesSpawned < this.zombiesToSpawn) {
      this.spawnTimer -= delta;
      if (this.spawnTimer <= 0) {
        this.spawnZombie();
        this.spawnTimer = this.spawnInterval;
        this.waveText.setText(`WAVE ${this.level}  剩余 ${this.zombiesToSpawn - this.zombiesSpawned}`);
      }
    }

    // 过关检测: 僵尸全部消灭且到达终点
    const remaining = this.zombies.countActive(true);
    if (this.zombiesSpawned >= this.zombiesToSpawn && remaining === 0 && !this.isLevelCleared) {
      this.isLevelCleared = true;
      this.waveText.setText(`WAVE ${this.level} CLEAR! 前往出口`);
    }

    if (this.isLevelCleared && this.exitZone) {
      if (
        this.player.x > this.exitZone.x - 30 &&
        this.player.x < this.exitZone.x + 30
      ) {
        this.levelComplete();
      }
    }

    // 更新 HUD
    this.updateHUD();

    // 掉出世界保护
    if (this.player.y > GAME_HEIGHT + 100) {
      this.player.hp = 0;
      this.gameOver(false);
    }
  }

  private updateHUD(): void {
    const hpRatio = Math.max(0, this.player.hp / this.player.maxHp);
    this.hpBar.width = 256 * hpRatio;
    this.hpBar.fillColor = hpRatio > 0.3 ? COLORS.hp : 0xff5252;
    this.hpText.setText(`HP ${Math.ceil(this.player.hp)}/${this.player.maxHp}`);

    if (this.player.isReloading) {
      this.ammoText.setText('RELOADING...');
      this.reloadBar.setVisible(true);
      this.reloadBar.width = 200 * this.player.reloadProgress;
    } else {
      this.ammoText.setText(`弹药 ${this.player.ammo} / ${this.player.maxAmmo}  [${this.player.charConfig.weapon.name}]`);
      this.reloadBar.setVisible(false);
    }

    this.scoreText.setText(`SCORE ${this.player.score}  KILLS ${this.player.kills}`);
  }

  private levelComplete(): void {
    this.isLevelCleared = false;
    // 奖励
    this.player.heal(20);
    this.player.addAmmo(this.player.maxAmmo);

    // 下一波
    this.startWave(this.level + 1);

    // 提示
    const hint = this.add.text(
      this.cameras.main.scrollX + GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      `关卡 ${this.level - 1} 完成!`,
      {
        fontSize: '48px',
        color: '#4fc3f7',
        fontStyle: 'bold',
        stroke: '#000',
        strokeThickness: 6,
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(200);
    this.tweens.add({
      targets: hint,
      alpha: 0,
      y: hint.y - 60,
      duration: 1500,
      onComplete: () => hint.destroy(),
    });

    if (this.level > 5) {
      // 通关全部5波
      this.gameOver(true);
    }
  }

  private gameOver(victory: boolean): void {
    const highScore = parseInt(localStorage.getItem(STORAGE_KEYS.highScore) || '0', 10);
    if (this.player.score > highScore) {
      localStorage.setItem(STORAGE_KEYS.highScore, String(this.player.score));
    }
    this.inputManager.destroy();
    this.scene.start('GameOverScene', {
      victory,
      score: this.player.score,
      kills: this.player.kills,
      level: this.level,
      characterId: this.characterId,
    });
  }
}
