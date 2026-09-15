import Phaser from 'phaser';

export type ZombieType = 'normal' | 'fast' | 'tank';

interface ZombieStats {
  hp: number;
  speed: number;
  damage: number;
  score: number;
  texture: string;
  scale: number;
}

const ZOMBIE_STATS: Record<ZombieType, ZombieStats> = {
  // 僵尸精灵帧是 120x200, 统一用 'zombie-f1' 作为初始帧
  normal: { hp: 60, speed: 60, damage: 10, score: 100, texture: 'zombie-f1', scale: 1.0 },
  fast: { hp: 35, speed: 130, damage: 8, score: 150, texture: 'zombie-f1', scale: 0.9 },
  tank: { hp: 180, speed: 35, damage: 25, score: 300, texture: 'zombie-f1', scale: 1.2 },
};

/**
 * 僵尸敌人
 * - 朝玩家方向缓慢移动
 * - 接触玩家造成伤害
 * - 被击中后短暂硬直
 */
export class Zombie extends Phaser.Physics.Arcade.Sprite {
  public type: ZombieType;
  public hp: number;
  public maxHp: number;
  public speed: number;
  public damage: number;
  public score: number;
  private hurtTimer = 0;
  private attackCooldown = 0;
  private playerRef?: Phaser.Physics.Arcade.Sprite;

  constructor(scene: Phaser.Scene, x: number, y: number, type: ZombieType) {
    const stats = ZOMBIE_STATS[type];
    super(scene, x, y, stats.texture);
    this.type = type;
    this.hp = stats.hp;
    this.maxHp = stats.hp;
    this.speed = stats.speed;
    this.damage = stats.damage;
    this.score = stats.score;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(30);
    this.setScale(stats.scale);
    this.body!.setSize(this.width * 0.6, this.height * 0.85);
    this.body!.setOffset(this.width * 0.2, this.height * 0.1);
    this.setCollideWorldBounds(true);
  }

  public setPlayer(player: Phaser.Physics.Arcade.Sprite): void {
    this.playerRef = player;
  }

  public takeDamage(amount: number): void {
    this.hp -= amount;
    this.hurtTimer = 120;
    this.setTint(0xff0000);
    // 受击粒子
    this.scene.add.particles(0, 0, 'blood-particle', {
      x: this.x,
      y: this.y - this.height / 2,
      speed: { min: 60, max: 160 },
      angle: { min: 0, max: 360 },
      lifespan: 300,
      quantity: 6,
      scale: { start: 1, end: 0 },
      emitting: false,
    }).explode(6, this.x, this.y - this.height / 2);

    if (this.hp <= 0) {
      this.die();
    }
  }

  private die(): void {
    // 死亡爆裂粒子
    this.scene.add.particles(0, 0, 'blood-particle', {
      x: this.x,
      y: this.y,
      speed: { min: 80, max: 220 },
      angle: { min: 0, max: 360 },
      lifespan: 500,
      quantity: 12,
      scale: { start: 1.4, end: 0 },
      emitting: false,
    }).explode(12, this.x, this.y);

    this.destroy();
  }

  public update(_time: number, delta: number): void {
    if (!this.active) return;
    // 受击硬直恢复
    if (this.hurtTimer > 0) {
      this.hurtTimer -= delta;
      if (this.hurtTimer <= 0) this.clearTint();
      this.setVelocityX(0);
      return;
    }

    // 朝玩家移动
    if (this.playerRef && this.playerRef.active) {
      const dir = Math.sign(this.playerRef.x - this.x);
      this.setVelocityX(dir * this.speed);
      this.setFlipX(dir < 0);
      // 播放走路动画
      if (this.anims.currentAnim?.key !== 'zombie-walk') {
        this.play('zombie-walk');
      }
    }

    // 攻击冷却
    if (this.attackCooldown > 0) {
      this.attackCooldown -= delta;
    }
  }

  /** 是否可攻击 (冷却结束) */
  public canAttack(): boolean {
    return this.attackCooldown <= 0;
  }

  public triggerAttackCooldown(): void {
    this.attackCooldown = 800;
  }
}
