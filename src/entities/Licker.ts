import Phaser from 'phaser';

/**
 * 舔食者 BOSS (Licker)
 * - 爬行, 快速冲刺 + 吐舌攻击 + 近战扑击
 * - 像素化皮肤, 外露大脑, 长舌头
 * - 三阶段血量: 全血量 / 半血狂暴 / 残血濒死
 */
export class Licker extends Phaser.Physics.Arcade.Image {
  public maxHp = 800;
  public hp = 800;
  public speed = 140;
  public attackDmg = 20;
  public score = 5000;

  private playerRef?: Phaser.Physics.Arcade.Sprite;
  private bossState: 'idle' | 'chase' | 'charge' | 'tongue' | 'leap' = 'idle';
  private bossStateTimer = 0;
  private attackCooldown = 0;
  private hurtTimer = 0;

  // 舌头显示
  private tongue?: Phaser.GameObjects.Rectangle;
  private tongueTimer = 0;

  // 血条
  private hpBarBg!: Phaser.GameObjects.Rectangle;
  private hpBar!: Phaser.GameObjects.Rectangle;
  private hpLabel!: Phaser.GameObjects.Text;

  // 阶段
  private phase: 1 | 2 | 3 = 1;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'licker');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(35);
    this.setScale(2.2); // 舔食者比普通僵尸大
    this.body!.setSize(this.width * 0.6, this.height * 0.6);
    this.body!.setOffset(this.width * 0.2, this.height * 0.4);
    this.setCollideWorldBounds(true);

    // 舌头 visual
    this.tongue = scene.add.rectangle(x, y + 20, 0, 4, 0xcc0000, 0.9);
    this.tongue.setOrigin(0.5, 0.5);
    this.tongue.setScrollFactor(0).setDepth(36);

    // Boss 血条 (屏幕顶部)
    const camW = scene.cameras.main.width;
    const barW = Math.min(camW * 0.55, 720);
    this.hpBarBg = scene.add.rectangle(camW / 2, 50, barW, 22, 0x1a1a1a)
      .setScrollFactor(0).setDepth(2000);
    this.hpBarBg.setStrokeStyle(2, 0xff1744, 1);
    this.hpBar = scene.add.rectangle(camW / 2 - barW / 2 + 2, 49, barW - 4, 18, 0xff1744)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(2001);
    this.hpLabel = scene.add.text(camW / 2, 30, '★ LICKER ★', {
      fontSize: '22px', color: '#ff1744', fontStyle: 'bold', letterSpacing: 6,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2002);
  }

  public setPlayer(player: Phaser.Physics.Arcade.Sprite): void {
    this.playerRef = player;
  }

  public takeDamage(amount: number): void {
    this.hp -= amount;
    this.hurtTimer = 120;
    this.setTint(0xffffff);

    // 更新血条
    const barW = (this.hpBarBg.width as number) - 4;
    this.hpBar.width = Math.max(0, barW * Math.max(0, this.hp / this.maxHp));

    // 阶段切换
    const ratio = this.hp / this.maxHp;
    if (this.phase === 1 && ratio < 0.5) {
      this.phase = 2;
      this.speed = 200;
      this.scene.cameras.main.shake(300, 0.012);
      this.scene.events.emit('boss-phase', 2);
    } else if (this.phase === 2 && ratio < 0.2) {
      this.phase = 3;
      this.speed = 260;
      this.attackDmg = 30;
      this.scene.cameras.main.shake(300, 0.015);
      this.scene.events.emit('boss-phase', 3);
    }

    // 血迹粒子
    this.scene.add.particles(0, 0, 'blood-particle', {
      x: this.x, y: this.y - this.height / 2,
      speed: { min: 60, max: 200 },
      angle: { min: 0, max: 360 },
      lifespan: 400, quantity: 6, scale: { start: 1.4, end: 0 },
      emitting: false,
    }).explode(6);

    if (this.hp <= 0) {
      this.die();
    }
  }

  private die(): void {
    const scene = this.scene;
    // 死亡爆炸粒子
    scene.add.particles(0, 0, 'blood-particle', {
      x: this.x, y: this.y,
      speed: { min: 100, max: 400 },
      angle: { min: 0, max: 360 },
      lifespan: 800, quantity: 40, scale: { start: 2, end: 0 },
      emitting: false,
    }).explode(40);
    scene.cameras.main.shake(500, 0.025);
    // 血条消失
    this.hpBarBg.destroy();
    this.hpBar.destroy();
    this.hpLabel.destroy();
    this.tongue?.destroy();
    scene.events.emit('boss-defeated', this.score);
    this.destroy();
  }

  public update(_time: number, delta: number): void {
    if (!this.active) return;
    if (this.hurtTimer > 0) {
      this.hurtTimer -= delta;
      if (this.hurtTimer <= 0) this.clearTint();
    }

    if (!this.playerRef || !this.playerRef.active) {
      this.setVelocityX(0);
      return;
    }

    // 始终朝向玩家
    const dir = Math.sign(this.playerRef.x - this.x);
    this.setFlipX(dir < 0);

    // 状态机: chase -> 选择攻击 -> attack -> cooldown -> chase
    this.bossStateTimer -= delta;
    this.attackCooldown -= delta;

    if (this.bossState === 'chase') {
      // 追击玩家
      this.setVelocityX(dir * this.speed);
      const dist = Math.abs(this.playerRef.x - this.x);
      if (dist < 60 && this.attackCooldown <= 0) {
        // 近战扑击
        this.bossState = 'leap';
        this.bossStateTimer = 350;
        this.setVelocityX(dir * this.speed * 2);
        this.setVelocityY(-400);
      } else if (dist < 400 && this.attackCooldown <= 0 && Math.random() < 0.01 * this.phase) {
        // 吐舌
        this.bossState = 'tongue';
        this.bossStateTimer = 500;
        this.tongueTimer = 0;
      }
    } else if (this.bossState === 'leap') {
      if (this.bossStateTimer <= 0 || (this.body as any).blocked?.down) {
        this.bossState = 'chase';
        this.attackCooldown = 900;
      }
    } else if (this.bossState === 'tongue') {
      // 伸出舌头
      this.tongueTimer += delta;
      const len = Math.min(160, this.tongueTimer / 3);
      if (this.tongue) {
        this.tongue.width = len;
        this.tongue.x = this.x + dir * (this.width / 2 + len / 2);
        this.tongue.y = this.y - 10;
        this.tongue.setVisible(len > 5);
      }
      if (this.bossStateTimer <= 0) {
        this.bossState = 'chase';
        this.attackCooldown = 1200;
        if (this.tongue) this.tongue.setVisible(false);
        // 检查舌头是否触到玩家
        if (Math.abs(this.playerRef.x - this.x) < 160 && this.playerRef.active) {
          this.scene.events.emit('boss-tongue-hit', this.attackDmg);
        }
      }
    }

    // 舌头每帧跟随
    if (this.tongue && this.bossState !== 'tongue') {
      this.tongue.setVisible(false);
    }
  }
}
