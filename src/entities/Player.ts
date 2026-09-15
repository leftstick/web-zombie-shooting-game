import Phaser from 'phaser';
import { GROUND_HEIGHT, GAME_HEIGHT, WORLD_WIDTH } from '../config/gameConfig';
import type { CharacterConfig } from '../characters/characterData';
import { Bullet } from './Bullet';

/**
 * 玩家实体
 * - 左右移动 + 跳跃
 * - 射击 (按武器配置处理射速/弹匣/散射/换弹)
 * - 生命值管理
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  public charConfig: CharacterConfig;
  public hp: number;
  public maxHp: number;
  public ammo: number;
  public maxAmmo: number;
  public score = 0;
  public kills = 0;
  public facing: 1 | -1 = 1; // 1 右, -1 左
  public isReloading = false;
  public isInvincible = false;

  private fireCooldown = 0;
  private reloadTimer = 0;
  private groundY: number;
  private bullets: Phaser.Physics.Arcade.Group;
  private muzzleFlash?: Phaser.GameObjects.Sprite;
  private inputRef: {
    moveAxis: number;
    firing: boolean;
    consumeJump: () => boolean;
    consumeReload: () => boolean;
  };

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    charConfig: CharacterConfig,
    bullets: Phaser.Physics.Arcade.Group,
    inputRef: Player['inputRef']
  ) {
    super(scene, x, y, `player-${charConfig.id}`);
    this.charConfig = charConfig;
    this.hp = charConfig.maxHp;
    this.maxHp = charConfig.maxHp;
    this.maxAmmo = charConfig.weapon.magSize;
    this.ammo = charConfig.weapon.magSize;
    this.bullets = bullets;
    this.inputRef = inputRef;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(40);
    this.body!.setSize(this.width * 0.55, this.height * 0.85);
    this.body!.setOffset(this.width * 0.22, this.height * 0.12);
    this.setCollideWorldBounds(true);
    this.setBounce(0);

    // 地面 Y
    this.groundY = GAME_HEIGHT - GROUND_HEIGHT;

    // 枪口闪光
    this.muzzleFlash = scene.add.sprite(0, 0, 'muzzle-flash');
    this.muzzleFlash.setVisible(false);
    this.muzzleFlash.setDepth(41);
  }

  public takeDamage(amount: number): void {
    if (this.isInvincible) return;
    this.hp -= amount;
    this.setTint(0xff0000);
    this.isInvincible = true;
    this.scene.time.delayedCall(600, () => {
      this.isInvincible = false;
      this.clearTint();
    });
    // 屏幕震动
    this.scene.cameras.main.shake(200, 0.005);
  }

  public heal(amount: number): void {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  public addAmmo(amount: number): void {
    this.ammo = Math.min(this.maxAmmo, this.ammo + amount);
  }

  public update(_time: number, delta: number): void {
    if (!this.active) return;
    const w = this.charConfig.weapon;

    // ---- 水平移动 ----
    const axis = this.inputRef.moveAxis;
    if (axis !== 0) {
      this.setVelocityX(axis * this.charConfig.moveSpeed);
      this.facing = axis > 0 ? 1 : -1;
      this.setFlipX(this.facing === -1);
    } else {
      this.setVelocityX(0);
    }

    // ---- 跳跃 ----
    if (this.inputRef.consumeJump() && this.body!.blocked.down) {
      this.setVelocityY(-620);
    }

    // ---- 射击 ----
    if (this.fireCooldown > 0) this.fireCooldown -= delta;

    if (this.inputRef.firing && !this.isReloading && this.fireCooldown <= 0) {
      if (this.ammo > 0) {
        this.shoot();
      } else {
        // 弹匣空, 自动换弹
        this.startReload();
      }
    }

    // ---- 换弹 ----
    if (this.inputRef.consumeReload() && !this.isReloading && this.ammo < this.maxAmmo) {
      this.startReload();
    }

    if (this.isReloading) {
      this.reloadTimer -= delta;
      if (this.reloadTimer <= 0) {
        this.finishReload();
      }
    }

    // ---- 更新枪口闪光位置 ----
    if (this.muzzleFlash) {
      const offsetX = this.facing === 1 ? 28 : -28;
      this.muzzleFlash.setPosition(this.x + offsetX, this.y - 6);
      this.muzzleFlash.setFlipX(this.facing === -1);
    }
  }

  private shoot(): void {
    const w = this.charConfig.weapon;
    this.ammo -= 1;
    this.fireCooldown = w.fireRate;

    // 后坐力
    this.setVelocityX(this.body!.velocity.x - this.facing * w.recoil * 2);

    // 枪口闪光
    if (this.muzzleFlash) {
      this.muzzleFlash.setVisible(true);
      this.scene.time.delayedCall(60, () => {
        if (this.muzzleFlash) this.muzzleFlash.setVisible(false);
      });
    }

    // 发射子弹 (支持散射)
    const baseAngle = this.facing === 1 ? 0 : Math.PI;
    for (let i = 0; i < w.pellets; i++) {
      const spreadRad = Phaser.Math.DegToRad(
        (Math.random() - 0.5) * 2 * w.spread
      );
      const angle = baseAngle + spreadRad;
      const vx = Math.cos(angle) * w.bulletSpeed;
      const vy = Math.sin(angle) * w.bulletSpeed;

      const bullet = this.bullets.get(
        this.x + this.facing * 30,
        this.y - 6
      ) as Bullet;
      if (bullet) {
        bullet.setActive(true);
        bullet.setVisible(true);
        bullet.body!.enable = true;
        bullet.fire(vx, vy, w.damage, true);
      }
    }

    // 射击音效占位 (可后续替换)
  }

  private startReload(): void {
    this.isReloading = true;
    this.reloadTimer = this.charConfig.weapon.reloadTime;
  }

  private finishReload(): void {
    this.isReloading = false;
    this.ammo = this.maxAmmo;
  }

  public get reloadProgress(): number {
    if (!this.isReloading) return 0;
    return 1 - this.reloadTimer / this.charConfig.weapon.reloadTime;
  }
}
