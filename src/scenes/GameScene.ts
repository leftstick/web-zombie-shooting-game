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

/**
 * GameScene — 横版枪战主场景
 * 世界尺寸: 4096 x 720, 横向滚动
 * 地面: 代码程序化生成 (不再依赖 Tiled)
 */
export class GameScene extends Phaser.Scene {
  private inputManager!: InputManager;
  private player!: Player;
  private bullets!: Phaser.Physics.Arcade.Group;
  private zombies!: Phaser.Physics.Arcade.Group;
  private pickups!: Phaser.Physics.Arcade.Group;
  private obstacles!: Phaser.Physics.Arcade.Group;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;

  private characterId!: CharacterId;
  private level = 1;
  private zombiesRemaining = 0;
  private spawnTimer = 0;
  private waveNum = 0;
  private bossActive = false;
  private licker?: Licker;

  // 视差背景 tileSprite
  private bgFar?: Phaser.GameObjects.TileSprite;
  private bgMid?: Phaser.GameObjects.TileSprite;
  private bgNear?: Phaser.GameObjects.TileSprite;

  private playerInputState!: {
    moveAxis: number;
    firing: boolean;
    consumeJump: () => boolean;
    consumeReload: () => boolean;
    consumeFire: () => boolean;
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
    console.log('[GameScene] create() 开始...');
    try {
    // === 物理世界边界 ===
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, GAME_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, GAME_HEIGHT);

    // === 视差背景 (3 层) ===
    this.createParallaxBackground();

    // === 地面 + 平台 (代码程序化生成) ===
    this.createGroundAndPlatforms();

    // === 实体组 ===
    this.bullets = this.physics.add.group({
      classType: Bullet, defaultKey: 'bullet-trail', maxSize: 80, runChildUpdate: true,
    });
    this.zombies = this.physics.add.group({
      classType: Zombie, maxSize: 50, runChildUpdate: true,
    });
    this.pickups = this.physics.add.group({
      classType: Pickup, maxSize: 20,
    });
    this.obstacles = this.physics.add.group({
      immovable: true, allowGravity: false,
    });
    this.platforms = this.physics.add.staticGroup();

    // === 关卡障碍物布置 ===
    this.createLevelObstacles();

    // === 输入 + 玩家 ===
    this.inputManager = new InputManager(this);
    this.playerInputState = {
      moveAxis: 0,
      firing: false,
      consumeJump: () => this.inputManager.consumeJump(),
      consumeReload: () => this.inputManager.consumeReload(),
      consumeFire: () => this.inputManager.consumeFire(),
    };
    const charConfig = getCharacter(this.characterId);
    // 地面顶的 Y 坐标 (玩家脚底站在这里)
    const groundTopY = GAME_HEIGHT - GROUND_HEIGHT;
    this.player = new Player(this, 120, groundTopY - 90, charConfig, this.bullets, this.playerInputState);

    // === 相机 ===
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(GAME_WIDTH * 0.3, GAME_HEIGHT * 0.5);

    // === 碰撞 ===
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.zombies, this.platforms);
    this.physics.add.collider(this.player, this.obstacles);
    this.physics.add.collider(this.zombies, this.obstacles);

    // 子弹 vs 僵尸 / 障碍物
    this.physics.add.overlap(this.bullets, this.zombies, this.onBulletZombie, undefined, this);
    this.physics.add.overlap(this.bullets, this.obstacles, this.onBulletObstacle, undefined, this);

    // 玩家 vs 僵尸 / 拾取物
    this.physics.add.overlap(this.player, this.zombies, this.onPlayerZombie, undefined, this);
    this.physics.add.overlap(this.player, this.pickups, this.onPlayerPickup, undefined, this);

    // 僵尸子弹 vs 玩家 (预留)
    this.physics.add.overlap(this.player, this.bullets, (_p: any, b: any) => {
      if (!b.fromPlayer) { this.player.takeDamage(b.damage); b.destroy(); }
    });

    // === 事件 ===
    this.events.on('barrel-explode', this.onBarrelExplode, this);
    this.events.on('boss-tongue-hit', (dmg: number) => this.player.takeDamage(dmg));

    // === HUD ===
    this.createHUD();
    this.startFirstWave();
    console.log('[GameScene] create() 完成!');
    } catch (err) {
      console.error('[GameScene] create() 崩溃:', err);
      this.add.text(GAME_WIDTH/2, GAME_HEIGHT/2,
        `场景加载失败:\n${err instanceof Error ? err.message : String(err)}`,
        { fontSize: '20px', color: '#ff1744', align: 'center' }
      ).setOrigin(0.5).setScrollFactor(0);
    }
  }

  /* ============================================================
   *  背景 / 地面 / 平台
   * ============================================================ */

  /** 3 层视差背景 — 用 TileSprite 横向滚动 */
  private createParallaxBackground(): void {
    // 最暗的远景层 — 几乎不动
    this.bgFar = this.add.tileSprite(
      WORLD_WIDTH / 2, GAME_HEIGHT - 240,
      WORLD_WIDTH, 480, 'bg-far'
    );
    this.bgFar.setOrigin(0.5, 1);
    this.bgFar.setScrollFactor(0.08);
    this.bgFar.setDepth(-20);

    // 中景 — 慢速移动
    this.bgMid = this.add.tileSprite(
      WORLD_WIDTH / 2, GAME_HEIGHT - 170,
      WORLD_WIDTH, 340, 'bg-mid'
    );
    this.bgMid.setOrigin(0.5, 1);
    this.bgMid.setScrollFactor(0.25);
    this.bgMid.setDepth(-18);

    // 近景建筑 — 较快移动
    this.bgNear = this.add.tileSprite(
      WORLD_WIDTH / 2, GAME_HEIGHT - 100,
      WORLD_WIDTH, 240, 'bg-near'
    );
    this.bgNear.setOrigin(0.5, 1);
    this.bgNear.setScrollFactor(0.5);
    this.bgNear.setDepth(-16);

    // 天空背景 (纯暗色渐变 — 用 Graphics 画一块大矩形)
    const sky = this.add.graphics();
    sky.fillStyle(0x0a0a12, 1);
    sky.fillRect(0, 0, WORLD_WIDTH, GAME_HEIGHT);
    sky.setScrollFactor(0); // 固定不动
    sky.setDepth(-30);
  }

  /**
   * 程序化生成地面 + 浮空平台
   * - 地面碰撞体: 用 StaticGroup.create('pixel') 生成 (BootScene 生成的 1x1 占位纹理)
   * - 视觉层: 独立的 rectangle / tileSprite 盖在碰撞体上方
   * - 浮空平台: 同理
   */
  private createGroundAndPlatforms(): void {
    const groundTop = GAME_HEIGHT - GROUND_HEIGHT; // = 600

    // === 主地面碰撞体 (StaticGroup.create 自动生成 static body) ===
    // 用 BootScene 里生成的 1x1 占位纹理 'pixel'
    const groundBody = this.platforms.create(
      WORLD_WIDTH / 2, groundTop + GROUND_HEIGHT / 2, 'pixel'
    ) as Phaser.Physics.Arcade.Image;
    groundBody.setDisplaySize(WORLD_WIDTH, GROUND_HEIGHT);
    groundBody.setOrigin(0.5, 0.5);
    groundBody.setDepth(-6);
    groundBody.setTint(0x14141a); // 用 tint 给一个深色底
    groundBody.body!.setSize(WORLD_WIDTH, GROUND_HEIGHT); // 精确碰撞体尺寸

    // === 路面装饰层 (road-strip tileSprite) — 盖在地面顶部 ===
    const roadTop = this.add.tileSprite(
      0, groundTop, WORLD_WIDTH, 40, 'road-strip'
    );
    roadTop.setOrigin(0, 0.5);
    roadTop.setDepth(-4);

    // === 路面黄色边缘线 ===
    const roadEdge = this.add.rectangle(
      0, groundTop, WORLD_WIDTH, 4, 0xffc107, 0.45
    );
    roadEdge.setOrigin(0, 0.5);
    roadEdge.setDepth(-3);

    // === 浮空平台 — 用同样的 StaticGroup.create('pixel') 方式 ===
    const platSpecs: { x: number; y: number; w: number }[] = [
      { x: 600,  y: groundTop - 150, w: 140 },
      { x: 1350, y: groundTop - 180, w: 180 },
      { x: 2100, y: groundTop - 120, w: 160 },
      { x: 2900, y: groundTop - 200, w: 200 },
      { x: 3600, y: groundTop - 140, w: 160 },
    ];
    for (const p of platSpecs) {
      this.createPlatformBody(p.x, p.y, p.w);
    }
  }

  private createPlatformBody(cx: number, cy: number, w: number): void {
    const h = 16;
    // 碰撞体
    const plat = this.platforms.create(cx, cy, 'pixel') as Phaser.Physics.Arcade.Image;
    plat.setDisplaySize(w, h);
    plat.setOrigin(0.5, 0.5);
    plat.setDepth(-5);
    plat.setTint(0x2a2a32);
    plat.body!.setSize(w, h);

    // 顶部亮线 (视觉装饰)
    const topLine = this.add.rectangle(cx, cy - h / 2 + 1, w, 2, 0x3a3a44);
    topLine.setDepth(-4);
  }

  /* ============================================================
   *  障碍物 (关卡布置)
   * ============================================================ */

  /** 浣熊市关卡布置 — 车辆/集装箱/油桶散布 */
  private createLevelObstacles(): void {
    const groundTop = GAME_HEIGHT - GROUND_HEIGHT; // 600
    const obs: { x: number; type: ObstacleType }[] = [
      { x: 500,  type: 'barrel' },
      { x: 700,  type: 'car-red' },
      { x: 1050, type: 'barrel' },
      { x: 1200, type: 'cone' },
      { x: 1400, type: 'container' },
      { x: 1800, type: 'car-blue' },
      { x: 2050, type: 'barrel' },
      { x: 2200, type: 'barrel' },
      { x: 2450, type: 'container' },
      { x: 2850, type: 'car-red' },
      { x: 3100, type: 'car-blue' },
      { x: 3400, type: 'container' },
      { x: 3800, type: 'barrel' },
    ];
    obs.forEach((o) => {
      const h = this.obstacleHeight(o.type);
      const w = this.obstacleWidth(o.type);
      const y = groundTop - h / 2;
      const obsObj = new Obstacle(this, o.x, y, o.type);
      this.obstacles.add(obsObj);
      // 修正碰撞体大小 (Obstacle 构造函数已做了 setImmovable, 这里确保加入组)
      const body = obsObj.body as Phaser.Physics.Arcade.Body;
      if (body) {
        body.setSize(w - 6, h - 4);
        body.setOffset(3, 2);
      }
    });
  }

  private obstacleHeight(t: ObstacleType): number {
    switch (t) {
      case 'container': return 90;
      case 'car-red':
      case 'car-blue': return 48;
      case 'barrel': return 36;
      case 'cone': return 20;
    }
  }
  private obstacleWidth(t: ObstacleType): number {
    switch (t) {
      case 'container': return 96;
      case 'car-red':
      case 'car-blue': return 72;
      case 'barrel': return 24;
      case 'cone': return 24;
    }
  }

  /* ============================================================
   *  波次管理
   * ============================================================ */

  private startFirstWave(): void {
    this.waveNum = 1;
    this.bossActive = false;
    this.spawnTimer = 1000;
    this.zombiesRemaining = 6;
    this.waveText.setText(`WAVE ${this.waveNum}  剩余 ${this.zombiesRemaining}`);
  }

  private startBossWave(): void {
    this.waveNum++;
    this.bossActive = true;
    this.zombiesRemaining = 0;
    this.waveText.setText('⚠ LICKER 出没 ⚠');

    const groundTop = GAME_HEIGHT - GROUND_HEIGHT;
    const bossX = 3700;
    this.licker = new Licker(this, bossX, groundTop - 40);
    this.licker.setPlayer(this.player);
    this.physics.add.collider(this.licker, this.platforms);
    this.physics.add.collider(this.licker, this.obstacles);
    this.physics.add.overlap(this.player, this.licker, (_p, b: any) => {
      if (b && b.attackDmg !== undefined) this.player.takeDamage(b.attackDmg);
    });
    this.physics.add.overlap(this.bullets, this.licker, (bu: any, b: any) => {
      if (b && b.hp !== undefined) { b.takeDamage((bu as Bullet).damage); (bu as Bullet).destroy(); }
    });

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
    const cam = this.cameras.main;
    const viewLeft = cam.scrollX - 100;
    const viewRight = cam.scrollX + GAME_WIDTH + 100;

    const side = Math.random() < 0.5 ? 'left' : 'right';
    let spawnX = side === 'left'
      ? Math.max(viewLeft, 80)
      : Math.min(viewRight, WORLD_WIDTH - 80);

    // 距离玩家至少 400px
    const dist = spawnX - this.player.x;
    if (Math.abs(dist) < 400) {
      spawnX = spawnX < this.player.x
        ? this.player.x - 450
        : this.player.x + 450;
      spawnX = Math.max(80, Math.min(WORLD_WIDTH - 80, spawnX));
    }

    const groundTop = GAME_HEIGHT - GROUND_HEIGHT;
    const spawnY = groundTop - 30;
    const r = Math.random();
    let type: ZombieType = 'normal';
    if (this.waveNum >= 4 && r < 0.25) type = 'tank';
    else if (this.waveNum >= 2 && r < 0.5) type = 'fast';
    const z = new Zombie(this, spawnX, spawnY, type);
    z.setPlayer(this.player);
    this.zombies.add(z);
  }

  /* ============================================================
   *  碰撞回调
   * ============================================================ */

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
        const groundTop = GAME_HEIGHT - GROUND_HEIGHT;
        const p = new Pickup(this, z.x, groundTop - 30, type);
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
    this.add.particles(b.x, b.y, 'spark-particle', {
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
    this.obstacles.children.iterate((o) => {
      const oo = o as Obstacle;
      if (!oo || !oo.active) return true;
      if (oo.type === 'barrel' && Math.hypot(oo.x - x, oo.y - y) < R) {
        oo.takeDamage(999);
      }
      return true;
    });
  }

  /* ============================================================
   *  HUD
   * ============================================================ */

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

  /* ============================================================
   *  主循环
   * ============================================================ */

  update(time: number, delta: number): void {
    this.inputManager.update();
    this.playerInputState.moveAxis = this.inputManager.moveAxis;
    this.playerInputState.firing = this.inputManager.firing;
    this.player.update(time, delta);

    // 僵尸 / 障碍 / Boss
    this.zombies.children.iterate((z) => { const zz = z as Zombie; if (zz && zz.active) zz.update(time, delta); return true; });
    this.obstacles.children.iterate((o) => { const oo = o as Obstacle; if (oo && oo.active) oo.update(time, delta); return true; });
    if (this.licker && this.licker.active) this.licker.update(time, delta);

    // 子弹出界销毁
    this.bullets.children.iterate((b) => {
      const bb = b as Bullet;
      if (bb && bb.active && (bb.x < -50 || bb.x > WORLD_WIDTH + 50)) bb.destroy();
      return true;
    });

    // 波次生成
    if (!this.bossActive && this.zombiesRemaining > 0) {
      this.spawnTimer -= delta;
      if (this.spawnTimer <= 0) {
        this.spawnZombie();
        this.zombiesRemaining--;
        this.waveText.setText(`WAVE ${this.waveNum}  剩余 ${this.zombiesRemaining}`);
        this.spawnTimer = 1200 - this.waveNum * 100;
      }
    } else if (!this.bossActive && this.zombiesRemaining <= 0 &&
               this.zombies.countActive(true) === 0) {
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

    // 视差背景随相机滚动做 tileOffset (额外的微滚动效果)
    const camScrollX = this.cameras.main.scrollX;
    if (this.bgFar) this.bgFar.tilePositionX = camScrollX * 0.08;
    if (this.bgMid) this.bgMid.tilePositionX = camScrollX * 0.25;
    if (this.bgNear) this.bgNear.tilePositionX = camScrollX * 0.5;

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
