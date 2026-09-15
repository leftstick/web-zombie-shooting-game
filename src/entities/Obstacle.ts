import Phaser from 'phaser';

/** 障碍物类型及其硬度 */
export type ObstacleType = 'container' | 'car-red' | 'car-blue' | 'barrel' | 'cone';

const OBSTACLE_STATS: Record<ObstacleType, { hp: number; dmgBonus: number; walkable: boolean }> = {
  container: { hp: 200, dmgBonus: 1, walkable: true },   // 最硬, 可站
  'car-red': { hp: 120, dmgBonus: 1, walkable: true },
  'car-blue': { hp: 120, dmgBonus: 1, walkable: true },
  barrel: { hp: 40, dmgBonus: 50, walkable: false },     // 打爆会爆炸
  cone: { hp: 10, dmgBonus: 0, walkable: false },
};

/** 可摧毁障碍物: 容器 / 车辆 / 油桶 / 路障
 *  - 有 hp, 被子弹打减血
 *  - 血量到 0 爆炸/摧毁
 *  - 顶部可站立 (walkable 为 true)
 */
export class Obstacle extends Phaser.Physics.Arcade.Image {
  public type: ObstacleType;
  public maxHp: number;
  public hp: number;
  public walkable: boolean;
  public dmgBonus: number; // 油桶打爆的爆炸伤害

  constructor(scene: Phaser.Scene, x: number, y: number, type: ObstacleType) {
    const textureKey = `obstacle-${type}`;
    super(scene, x, y, textureKey);
    this.type = type;
    const stats = OBSTACLE_STATS[type];
    this.maxHp = stats.hp;
    this.hp = stats.hp;
    this.walkable = stats.walkable;
    this.dmgBonus = stats.dmgBonus;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setImmovable(true);
    this.body!.setSize(this.width - 6, this.height - 4);
    this.body!.setOffset(3, 2);
    this.setCollideWorldBounds(true);

    // 血条
    const barW = Math.min(this.width, 80);
    this.hpBarBg = scene.add.rectangle(x, y - this.height / 2 - 12, barW, 5, 0x333333, 0.9);
    this.hpBarBg.setScrollFactor(0).setDepth(10);
    this.hpBarBg.setVisible(false);
    this.hpBar = scene.add.rectangle(x, y - this.height / 2 - 12, barW, 5, 0xff5252, 1);
    this.hpBar.setScrollFactor(0).setDepth(11);
    this.hpBar.setVisible(false);
    (this.hpBarBg as any)._barW = barW;
  }

  private hpBar!: Phaser.GameObjects.Rectangle;
  private hpBarBg!: Phaser.GameObjects.Rectangle;
  private hurtTimer = 0;

  public takeDamage(amount: number): void {
    this.hp -= amount;
    this.hurtTimer = 80;
    this.setTint(0xff5252);
    // 显示血条
    this.hpBarBg.setVisible(true);
    this.hpBar.setVisible(true);
    const barW = (this.hpBarBg as any)._barW;
    const ratio = Math.max(0, this.hp / this.maxHp);
    this.hpBar.width = barW * ratio;
    // 跟着物体走
    this.hpBarBg.setPosition(this.x, this.y - this.height / 2 - 12);
    this.hpBar.setPosition(this.x, this.y - this.height / 2 - 12);

    if (this.hp <= 0) {
      this.destroyObstacle();
    }
  }

  private destroyObstacle(): void {
    const scene = this.scene;
    const x = this.x;
    const y = this.y;

    if (this.type === 'barrel') {
      // 爆炸粒子 + 伤害周围
      scene.add.particles(0, 0, 'blood-particle', {
        x, y,
        speed: { min: 100, max: 300 },
        angle: { min: 0, max: 360 },
        lifespan: 400,
        quantity: 30,
        scale: { start: 1.6, end: 0 },
        emitting: false,
      }).explode(30);
      // 爆炸光
      const flash = scene.add.circle(x, y, 80, 0xff9800, 0.6);
      scene.tweens.add({
        targets: flash, alpha: 0, scale: 2, duration: 200,
        onComplete: () => flash.destroy(),
      });
      scene.cameras.main.shake(200, 0.008);
      // 触发爆炸伤害事件, GameScene 会处理范围
      scene.events.emit('barrel-explode', x, y, this.dmgBonus);
    } else {
      // 普通摧毁: 碎片
      scene.add.particles(0, 0, 'blood-particle', {
        x, y,
        speed: { min: 40, max: 140 },
        angle: { min: 0, max: 360 },
        lifespan: 350,
        quantity: 10,
        scale: { start: 1.2, end: 0 },
        emitting: false,
      }).explode(10);
    }

    this.hpBarBg.destroy();
    this.hpBar.destroy();
    this.destroy();
  }

  public update(_t: number, delta: number): void {
    if (!this.active) return;
    if (this.hurtTimer > 0) {
      this.hurtTimer -= delta;
      if (this.hurtTimer <= 0) this.clearTint();
    }
    // 血条跟随 (但障碍物可能被 destroy 前)
    if (this.hpBarBg && this.hpBarBg.active) {
      this.hpBarBg.setPosition(this.x, this.y - this.height / 2 - 12);
      this.hpBar.setPosition(this.x, this.y - this.height / 2 - 12);
    }
  }
}
