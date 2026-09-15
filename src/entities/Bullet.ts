import Phaser from 'phaser';

/**
 * 子弹实体
 */
export class Bullet extends Phaser.Physics.Arcade.Sprite {
  public damage = 20;
  public fromPlayer = true;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(50);
    this.body!.setSize(16, 4);
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
    this.setVelocity(vx, vy);
    // 根据方向翻转
    this.setFlipX(vx < 0);
    // 生命周期: 飞出屏幕或超时销毁
    this.scene.time.delayedCall(1500, () => {
      if (this.active) this.destroy();
    });
  }
}
