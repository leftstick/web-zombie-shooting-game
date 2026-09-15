import Phaser from 'phaser';
import {
  GAME_WIDTH, GAME_HEIGHT, GROUND_HEIGHT, WORLD_WIDTH, COLORS,
} from '../config/gameConfig';
import { getCharacter, type CharacterId } from '../characters/characterData';
import { InputManager } from '../input/InputManager';
import { Player } from '../entities/Player';
import { Zombie, type ZombieType } from '../entities/Zombie';
import { Bullet } from '../entities/Bullet';
import { Pickup } from '../entities/Pickup';
import { Obstacle, type ObstacleType } from '../entities/Obstacle';
import { Licker } from '../entities/Licker';

interface GameSceneData { characterId: CharacterId; }

export class GameScene extends Phaser.Scene {
  private inputManager!: InputManager;
  private player!: Player;
  private bullets!: Phaser.Physics.Arcade.Group;
  private zombies!: Phaser.Physics.Arcade.Group;
  private pickups!: Phaser.Physics.Arcade.Group;
  private obstacles!: Phaser.Physics.Arcade.Group;
  private ground!: Phaser.Physics.Arcade.StaticGroup;

  private characterId!: CharacterId;
  private level = 1;
  private zombiesRemaining = 0;
  private spawnTimer = 0;
  private waveNum = 0;
  private bossActive = false;
  private licker?: Licker;

  private playerInputState!: {
    moveAxis: number; firing: boolean;
    consumeJump: () => boolean; consumeReload: () => boolean;
  };

  // HUD
  private hpBarBg!: Phaser.GameObjects.Rectangle;
  private hpBar!: Phaser.GameObjects.Rectangle;
  private hpText!: Phaser.GameObjects.Text;
  private ammoText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private reloadBar!: Phaser.GameObjects.Rectangle;

  constructor() { super('GameScene'); }

  init(data: GameSceneData): void {
    this.characterId = data.characterId ?? 'leon';
  }

  create(): void {
    const charConfig = getCharacter(this.characterId);
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, GAME_HEIGHT);

    // 背景 (视差)
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'city-bg')
      .setScrollFactor(0.25).setDepth(-10);

    // 地面组
    this.createGround();

    // 障碍物 (关卡设计)
    this.obstacles = this.physics.add.group({ immovable: true, allowGravity: false });
    this.createLevelObstacles();

    // 实体组
    this.bullets = this.physics.add.group({ classType: Bullet, maxSize: 80, runChildUpdate: true });
    this.zombies = this.physics.add.group({ classType: Zombie, maxSize: 50, runChildUpdate: true });
    this.pickups = this.physics.add.group({ classType: Pickup, maxSize: 20 });

    // 输入 + 玩家
    this.inputManager = new InputManager(this);
    this.playerInputState = {
      moveAxis: 0, firing: false,
      consumeJump: () => this.inputManager.consumeJump(),
      consumeReload: () => this.inputManager.consumeReload(),
    };
    this.player = new Player(this, 100, GAME_HEIGHT - GROUND_HEIGHT - 60,
      charConfig, this.bullets, this.playerInputState);

    // 相机
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, GAME_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(GAME_WIDTH * 0.35, GAME_HEIGHT);

    // 碰撞
    this.physics.add.collider(this.player, this.ground);
    this.physics.add.collider(this.player, this.obstacles);
    this.physics.add.collider(this.zombies, this.ground);
    this.physics.add.collider(this.zombies, this.obstacles);
    this.physics.add.overlap(this.bullets, this.zombies, this.onBulletZombie, undefined, this);
    this.physics.add.overlap(this.bullets, this.obstacles, this.onBulletObstacle, undefined, this);
    this.physics.add.overlap(this.player, this.zombies, this.onPlayerZombie, undefined, this);
    this.physics.add.overlap(this.player, this.pickups, this.onPlayerPickup, undefined, this);
    this.physics.add.overlap(this.player, this.bullets, (_, b: any) => {
      if (!b.fromPlayer) { this.player.takeDamage(b.damage); b.destroy(); }
    });

    // 事件: 油桶爆炸 + Boss 舌头 + Boss 扑击
    this.events.on('barrel-explode', this.onBarrelExplode, this);
    this.events.on('boss-tongue-hit', (dmg: number) => this.player.takeDamage(dmg));

    this.createHUD();
    this.startFirstWave();
  }

  private createGround(): void {
    this.ground = this.physics.add.staticGroup();
    const tileSize = 64;
    for (let x = 0; x < WORLD_WIDTH; x += tileSize) {
      const t = this.ground.create(x + tileSize / 2, GAME_HEIGHT - GROUND_HEIGHT / 2, 'ground-tile');
      (t as Phaser.Physics.Arcade.Image).refreshBody();
    }
    // 路面 (颜色不同)
    const road = this.add.tileSprite(0, GAME_HEIGHT - GROUND_HEIGHT + 10, WORLD_WIDTH, 20, 'road-strip');
    road.setOrigin(0, 0.5).setDepth(2);
    // 地面顶线
    this.add.rectangle(0, GAME_HEIGHT - GROUND_HEIGHT, WORLD_WIDTH, 4, COLORS.groundTop)
      .setOrigin(0, 0.5).setDepth(5);
  }

  /** 浣熊市关卡布置 — 车辆/集装箱/油桶散布 */
  private createLevelObstacles(): void {
    const floorY = GAME_HEIGHT - GROUND_HEIGHT;
    const obs: { x: number; type: ObstacleType }[] = [
      { x: 500,  type: 'barrel' },
      { x: 700,  type: 'car-red' },
      { x: 1050, type: 'barrel' },
      { x: 1200, type: 'cone' },
      { x: 1400, type: 'container' },  // 大集装箱挡路, 可站顶
      { x: 1800, type: 'car-blue' },
      { x: 2050, type: 'barrel' },
      { x: 2200, type: 'barrel' },
      { x: 2450, type: 'container' },
      { x: 2850, type: 'car-red' },
      { x: 3100, type: 'car-blue' },
      { x: 3400, type: 'container' },  // Boss 战之前的最后一道障碍
      { x: 3800, type: 'barrel' },
    ];
    obs.forEach((o) => {
      const h = this.obstacleHeight(o.type);
      const w = this.obstacleWidth(o.type);
      const y = floorY - h / 2;
      const obsObj = new Obstacle(this, o.x, y, o.type);
      this.obstacles.add(obsObj);
      // 强制 immovable (StaticGroup 已自动)
    });
  }

  private obstacleHeight(t: ObstacleType): number {
    switch (t) {
      case 'container': return 60;
      case 'car-red':
      case 'car-blue': return 36;
      case 'barrel': return 30;
      case 'cone': return 12;
    }
  }
  private obstacleWidth(t: ObstacleType): number {
    switch (t) {
      case 'container': return 72;
      case 'car-red':
      case 'car-blue': return 72;
      case 'barrel': return 24;
      case 'cone': return 18;
    }
  }

  /* ---- 波次 ---- */
  private startFirstWave(): void {
    this.waveNum = 1;
    this.bossActive = false;
    this.spawnTimer = 1000;
    this.zombiesRemaining = 6;
    this.waveText.setText(`WAVE ${this.waveNum}  剩余 ${this.zombiesRemaining}`);
  }

  /** 最终一波: Boss 登场 */
  private startBossWave(): void {
    this.waveNum++;
    this.bossActive = true;
    this.zombiesRemaining = 0;
    this.waveText.setText('⚠ LICKER 出没 ⚠');

    const bossX = 3700;
    this.licker = new Licker(this, bossX, GAME_HEIGHT - GROUND_HEIGHT - 40);
    this.licker.setPlayer(this.player);
    // Boss 与玩家/障碍物碰撞
    this.physics.add.collider(this.licker, this.ground);
    this.physics.add.collider(this.licker, this.obstacles);
    this.physics.add.overlap(this.player, this.licker, (_p, b: any) => {
      if (b && b.attackDmg !== undefined) this.player.takeDamage(b.attackDmg);
    });
    this.physics.add.overlap(this.bullets, this.licker, (_bu, b: any) => {
      if (b && b.hp !== undefined) { b.takeDamage((_bu as Bullet).damage); (_bu as Bullet).destroy(); }
    });

    // Boss 阶段/击败事件
    this.events.on('boss-phase', (phase: number) => {
      this.waveText.setText(`LICKER 进入第 ${phase} 阶段!`);
      this.add.tween({ targets: this.waveText, alpha: 0.5, duration: 500, yoyo: true, repeat: 2 });
    });
    this.events.on('boss-defeated', () => {
      this.bossActive = false;
      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2,
        '★ 胜利! 浣熊市突围成功 ★', {
          fontSize: '52px', color: '#ff1744', fontStyle: 'bold',
          stroke: '#000', strokeThickness: 6,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2000);
      this.time.delayedCall(2500, () => {
        this.scene.start('GameOverScene', {
          victory: true,
          score: this.player.score,
          kills: this.player.kills,
          level: this.waveNum,
          characterId: this.characterId,
        });
      });
    });

    this.cameras.main.shake(600, 0.015);
  }

  private spawnZombie(): void {
    // 从 camera 视野外侧出生, 给玩家反应时间
    const cam = this.cameras.main;
    const viewLeft = cam.scrollX - 80;
    const viewRight = cam.scrollX + GAME_WIDTH + 80;

    // 随机选择一侧出生
    const side = Math.random() < 0.5 ? 'left' : 'right';
    let spawnX = side === 'left'
      ? Math.max(viewLeft, 80)
      : Math.min(viewRight, WORLD_WIDTH - 80);

    // 保险: 距离玩家至少 400px
    const dist = spawnX - this.player.x;
    if (Math.abs(dist) < 400) {
      spawnX = spawnX < this.player.x
        ? this.player.x - 450
        : this.player.x + 450;
      spawnX = Math.max(80, Math.min(WORLD_WIDTH - 80, spawnX));
    }

    const spawnY = GAME_HEIGHT - GROUND_HEIGHT - 30;
    const r = Math.random();
    let type: ZombieType = 'normal';
    if (this.waveNum >= 4 && r < 0.25) type = 'tank';
    else if (this.waveNum >= 2 && r < 0.5) type = 'fast';
    const z = new Zombie(this, spawnX, spawnY, type);
    z.setPlayer(this.player);
    this.zombies.add(z);
  }

  private spawnTimerFire(): void {
    this.spawnZombie();
    this.zombiesRemaining--;
    this.waveText.setText(`WAVE ${this.waveNum}  剩余 ${this.zombiesRemaining}`);
  }

  /* ---- 碰撞回调 ---- */
  private onBulletZombie(_bu: any, zo: any): void {
    const b = _bu as Bullet, z = zo as Zombie;
    if (!b.active || !z.active || !b.fromPlayer) return;
    z.takeDamage(b.damage);
    b.destroy();
    if (z.hp <= 0) {
      this.player.score += z.score;
      this.player.kills++;
      if (Math.random() < 0.2) {
        const type = Math.random() < 0.5 ? 'health' : 'ammo';
        const p = new Pickup(this, z.x, z.y, type);
        this.pickups.add(p);
      }
    }
  }

  private onBulletObstacle(_bu: any, oo: any): void {
    const b = _bu as Bullet, o = oo as Obstacle;
    if (!b.active || !o.active || !b.fromPlayer) return;
    o.takeDamage(b.damage);
    b.destroy();
    // 弹壳火花
    this.add.particles(b.x, b.y, 'blood-particle', {
      speed: { min: 20, max: 80 }, lifespan: 200, quantity: 3,
      scale: { start: 0.8, end: 0 }, emitting: false,
    }).explode(3);
  }

  private onPlayerZombie(_po: any, zo: any): void {
    const z = zo as Zombie;
    if (!z.active || !z.canAttack()) return;
    this.player.takeDamage(z.damage);
    z.triggerAttackCooldown();
    const dir = Math.sign(this.player.x - z.x) || 1;
    this.player.setVelocityX(dir * 250);
    this.player.setVelocityY(-250);
    if (this.player.hp <= 0) this.triggerGameOver();
  }

  private onPlayerPickup(_po: any, pu: any): void {
    const p = pu as Pickup;
    if (!p.active) return;
    if (p.type === 'health') this.player.heal(30);
    else this.player.addAmmo(Math.ceil(this.player.maxAmmo * 0.5));
    p.destroy();
  }

  private onBarrelExplode(x: number, y: number, radius: number): void {
    // 范围伤害: 玩家 & 附近僵尸
    const R = 120;
    if (this.player.active && Math.hypot(this.player.x - x, this.player.y - y) < R) {
      this.player.takeDamage(radius * 0.4);
    }
    this.zombies.children.iterate((z) => {
      const zz = z as Zombie;
      if (zz && zz.active && Math.hypot(zz.x - x, zz.y - y) < R) {
        zz.takeDamage(radius);
        this.player.score += 50;
      }
      return true;
    });
    // 附近油桶连锁引爆
    this.obstacles.children.iterate((o) => {
      const oo = o as Obstacle;
      if (!oo || !oo.active) return true;
      if (oo.type === 'barrel' && Math.hypot(oo.x - x, oo.y - y) < R) {
        oo.takeDamage(999); // 连锁爆
      }
      return true;
    });
  }

  /* ---- HUD ---- */
  private createHUD(): void {
    const m = 20;
    const w = 260;
    this.hpBarBg = this.add.rectangle(m, m, w, 26, COLORS.hpBg).setOrigin(0).setScrollFactor(0).setDepth(100);
    this.hpBarBg.setStrokeStyle(2, 0xffffff, 0.6);
    this.hpBar = this.add.rectangle(m + 2, m + 2, w - 4, 22, COLORS.hp).setOrigin(0).setScrollFactor(0).setDepth(101);
    this.hpText = this.add.text(m + 10, m + 5, '', {
      fontSize: '14px', color: '#fff', fontStyle: 'bold',
    }).setScrollFactor(0).setDepth(102);
    this.ammoText = this.add.text(m, m + 40, '', {
      fontSize: '20px', color: '#ffeb3b', fontStyle: 'bold',
    }).setScrollFactor(0).setDepth(101);
    this.reloadBar = this.add.rectangle(m, m + 72, 200, 6, COLORS.hpBg).setOrigin(0).setScrollFactor(0).setDepth(101);
    this.reloadBar.setVisible(false);
    this.scoreText = this.add.text(GAME_WIDTH - m, m, 'SCORE 0', {
      fontSize: '20px', color: '#fff', fontStyle: 'bold',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(101);
    this.waveText = this.add.text(GAME_WIDTH - m, m + 32, '', {
      fontSize: '18px', color: '#ff5252', fontStyle: 'bold',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(101);
  }

  private updateHUD(): void {
    const hpR = Math.max(0, this.player.hp / this.player.maxHp);
    this.hpBar.width = (this.hpBarBg.width as number) * hpR;
    this.hpBar.fillColor = hpR > 0.3 ? COLORS.hp : 0xff5252;
    this.hpText.setText(`HP ${Math.ceil(this.player.hp)}/${this.player.maxHp}`);
    if (this.player.isReloading) {
      this.ammoText.setText('RELOADING...');
      this.reloadBar.setVisible(true);
      this.reloadBar.width = 200 * this.player.reloadProgress;
    } else {
      this.ammoText.setText(`弹药 ${this.player.ammo} / ${this.player.maxAmmo}`);
      this.reloadBar.setVisible(false);
    }
    this.scoreText.setText(`SCORE ${this.player.score}  KILLS ${this.player.kills}`);
  }

  /* ---- 主循环 ---- */
  update(time: number, delta: number): void {
    this.inputManager.update();
    this.playerInputState.moveAxis = this.inputManager.moveAxis;
    this.playerInputState.firing = this.inputManager.firing;
    this.player.update(time, delta);

    // 僵尸 + Boss + 障碍物 更新
    this.zombies.children.iterate((z) => {
      const zz = z as Zombie;
      if (zz && zz.active) zz.update(time, delta);
      return true;
    });
    this.obstacles.children.iterate((o) => {
      const oo = o as Obstacle;
      if (oo && oo.active) oo.update(time, delta);
      return true;
    });
    if (this.licker && this.licker.active) this.licker.update(time, delta);

    // 僵尸子弹出界销毁
    this.bullets.children.iterate((b) => {
      const bb = b as Bullet;
      if (bb && bb.active && (bb.x < -50 || bb.x > WORLD_WIDTH + 50)) bb.destroy();
      return true;
    });

    // 生成逻辑
    if (!this.bossActive && this.zombiesRemaining > 0) {
      this.spawnTimer -= delta;
      if (this.spawnTimer <= 0) {
        this.spawnTimerFire();
        this.spawnTimer = 1200 - this.waveNum * 100;
      }
    } else if (!this.bossActive && this.zombiesRemaining <= 0 &&
               this.zombies.countActive(true) === 0) {
      // 切换下一波 / Boss
      if (this.waveNum < 3) {
        this.waveNum++;
        this.zombiesRemaining = 5 + this.waveNum * 2;
        this.spawnTimer = 1500;
        this.waveText.setText(`WAVE ${this.waveNum}  准备...`);
      } else {
        this.startBossWave();
      }
    }

    // 掉出世界
    if (this.player.y > GAME_HEIGHT + 100) this.triggerGameOver();

    this.updateHUD();
  }

  private triggerGameOver(): void {
    this.inputManager.destroy();
    this.scene.start('GameOverScene', {
      victory: false,
      score: this.player.score,
      kills: this.player.kills,
      level: this.waveNum,
      characterId: this.characterId,
    });
  }

  public destroy(): void {
    this.events.off('barrel-explode', this.onBarrelExplode, this);
    this.inputManager.destroy();
  }
}
