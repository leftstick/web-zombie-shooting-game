import Phaser from 'phaser';

export type PickupType = 'ammo' | 'health';

/**
 * 拾取物: 弹药箱(黄) / 医疗包(红)
 */
export class Pickup extends Phaser.Physics.Arcade.Sprite {
  public type: PickupType;
  public amount = 0;
  private label?: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, type: PickupType) {
    const texture = type === 'ammo' ? 'pickup-ammo' : 'pickup-health';
    super(scene, x, y, texture);
    this.type = type;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(40);
    this.setImmovable(true);
    (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

    // 标签文字 (独立对象跟随)
    const label = type === 'ammo' ? 'A' : '+';
    const color = type === 'ammo' ? '#000000' : '#ffffff';
    this.label = scene.add
      .text(x, y, label, { fontSize: '16px', color, fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(41);

    // 浮动动画
    scene.tweens.add({
      targets: this,
      y: y - 6,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  public preUpdate(_time: number, _delta: number): void {
    if (this.label) {
      this.label.setPosition(this.x, this.y);
    }
  }

  public destroy(fromScene?: boolean): void {
    this.label?.destroy();
    super.destroy(fromScene);
  }
}
