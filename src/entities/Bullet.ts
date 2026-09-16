import Phaser from 'phaser';

/**
 * 子弹实体 — 从 Arcade.Sprite 继承
 * 注意: 父类 Phaser.Physics.Arcade.Sprite 的构造函数已经调用了
 *       scene.add.existing(this) + scene.physics.add.existing(this),
 *       不要再重复调用, 否则会在 body.enable=true 时触发 allowGravity 重置
 */
export class Bullet extends Phaser.Physics.Arcade.Sprite {
  public damage = 20;
  public fromPlayer = true;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture);
    this.setDepth(50);
    // 子弹不受重力影响, 水平飞出屏幕
    const b = this.body as Phaser.Physics.Arcade.Body;
    b.setAllowGravity(false);
    b.setSize(24, 8);
    b.setOffset(8, 4);
  }

  /**
   * 发射子弹
   * @param vx 水平速度
   * @param vy 垂直速度
   * @param damage 伤害
   * @param fromPlayer 是否为玩家发射
   */
  public fire(vx: number, vy: number, damage: number, fromPlayer = true): void {
    this.damage = damage;
    this.fromPlayer = fromPlayer;

    // 关键: 对象池复用时 body.enable 会被重新打开, Phaser 会强制设 allowGravity=true
    // 所以每次 fire 必须重新关闭重力
    const b = this.body as Phaser.Physics.Arcade.Body | undefined;
    if (b) {
      b.setAllowGravity(false);
      b.setSize(24, 8);
      b.setOffset(8, 4);
    }

    this.setVelocity(vx, vy);
    // 根据方向翻转
    this.setFlipX(vx < 0);
    // 生命周期: 飞出屏幕或超时销毁
    this.scene.time.delayedCall(1500, () => {
      if (this.active) this.destroy();
    });
  }
}
