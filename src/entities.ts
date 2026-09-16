/**
 * 游戏实体 — 玩家 / 僵尸 / 子弹 / 障碍物
 * 全部继承 EngineObject, 使用 LittleJS 内置物理引擎
 */
import * as LJ from 'littlejsengine';
import type { Vector2, Color } from 'littlejsengine';

// === 颜色主题 (生化危机暗黑风) ===
export const COLORS: Record<string, Color> = {
  bg: new LJ.Color(0.04, 0.04, 0.06),
  ground: new LJ.Color(0.14, 0.14, 0.18),
  groundTop: new LJ.Color(0.22, 0.22, 0.28),
  player: new LJ.Color(0.3, 0.68, 0.82),
  zombie: new LJ.Color(0.42, 0.55, 0.15),
  zombieFast: new LJ.Color(0.6, 0.2, 0.15),
  zombieTank: new LJ.Color(0.2, 0.2, 0.25),
  bullet: new LJ.Color(1, 0.85, 0.1),
  blood: new LJ.Color(0.72, 0.11, 0.11),
  hp: new LJ.Color(0.9, 0.2, 0.2),
  hpBg: new LJ.Color(0.25, 0.25, 0.25),
  barrel: new LJ.Color(0.55, 0.2, 0.1),
  container: new LJ.Color(0.2, 0.25, 0.3),
  car: new LJ.Color(0.35, 0.12, 0.12),
  accent: new LJ.Color(1, 0.09, 0.27),
};

export const WORLD_WIDTH = 400;

/* ============================================================
 *  玩家
 * ============================================================ */
export class Player extends LJ.EngineObject {
  hp = 150;
  maxHp = 150;
  ammo = 30;
  maxAmmo = 30;
  score = 0;
  kills = 0;
  facing = 1;
  private fireCooldown = 0;
  reloading = false;
  private reloadTimer = 0;
  private invincibleTime = 0;

  constructor(pos: Vector2) {
    super(pos, LJ.vec2(2, 3.5));
    this.color = COLORS.player;
    this.renderOrder = 10;
    this.gravityScale = 1;
    this.mass = 1;
    this.setCollision(true, false, true, true);
  }

  update(): void {
    if (this.destroyed) return;
    if (this.invincibleTime > 0) this.invincibleTime--;
    if (this.fireCooldown > 0) this.fireCooldown--;
    if (this.reloading) {
      this.reloadTimer--;
      if (this.reloadTimer <= 0) {
        this.reloading = false;
        this.ammo = this.maxAmmo;
      }
    }
    if (this.invincibleTime > 0 && Math.floor(this.invincibleTime / 3) % 2 === 0) {
      this.color = new LJ.Color(1, 0.2, 0.2);
    } else {
      this.color = COLORS.player;
    }
  }

  move(dir: number): void {
    if (dir !== 0) {
      this.velocity.x = dir * 0.3;
      this.facing = dir > 0 ? 1 : -1;
      this.mirror = this.facing === -1;
    } else {
      this.velocity.x = 0;
    }
  }

  jump(): void {
    if (this.groundObject) this.velocity.y = 0.5;
  }

  tryFire(): void {
    if (this.fireCooldown > 0 || this.reloading) return;
    if (this.ammo <= 0) { this.startReload(); return; }
    this.ammo--;
    this.fireCooldown = 10;
    this.velocity.x -= this.facing * 0.1;
    // 发射子弹 (Bullet 构造函数已自动加入 engineObjects, 不要重复 push)
    new Bullet(LJ.vec2(this.pos.x + this.facing * 1.5, this.pos.y + 0.3), this.facing);
    // 枪口闪光粒子
    new LJ.ParticleEmitter(
      LJ.vec2(this.pos.x + this.facing * 1.5, this.pos.y + 0.3), // pos
      0,           // angle
      0.1,         // emitSize
      0.1,         // emitTime
      200,         // emitRate
      Math.PI,     // emitConeAngle
      undefined,   // tileInfo
      new LJ.Color(1, 0.9, 0.3),  // colorStartA
      new LJ.Color(1, 0.5, 0.1),  // colorStartB
      new LJ.Color(0.3, 0.1, 0),  // colorEndA
      new LJ.Color(0.1, 0, 0),   // colorEndB
      0.15,        // particleTime
      0.2,         // sizeStart
      0,           // sizeEnd
      0.3          // speed
    );
  }

  startReload(): void {
    if (this.reloading || this.ammo >= this.maxAmmo) return;
    this.reloading = true;
    this.reloadTimer = 90;
  }

  get reloadProgress(): number {
    return this.reloading ? 1 - this.reloadTimer / 90 : 0;
  }

  takeDamage(dmg: number): void {
    if (this.invincibleTime > 0) return;
    this.hp -= dmg;
    this.invincibleTime = 60;
  }

  heal(amount: number): void { this.hp = Math.min(this.maxHp, this.hp + amount); }
  addAmmo(amount: number): void { this.ammo = Math.min(this.maxAmmo, this.ammo + amount); }
}

/* ============================================================
 *  子弹 — 水平飞行, 无重力
 * ============================================================ */
export class Bullet extends LJ.EngineObject {
  damage = 20;
  life = 120;
  facing: number;

  constructor(pos: Vector2, facing: number) {
    super(pos, LJ.vec2(1.5, 0.5));
    this.facing = facing;
    this.color = COLORS.bullet;
    this.renderOrder = 20;
    this.velocity.x = facing * 1.2;
    this.gravityScale = 0;
    this.mass = 0;
    this.damping = 1;
    this.setCollision(false, false, false, true);
    this.mirror = facing === -1;
  }

  update(): void {
    if (this.destroyed) return;
    this.life--;
    if (this.life <= 0) this.destroy();
    if (this.pos.x < -10 || this.pos.x > WORLD_WIDTH + 10) this.destroy();
  }

  render(): void {
    // 显式 useWebGL=false, 强制 Canvas2D 渲染 (避免 WebGL 回退时的渲染问题)
    LJ.drawRect(this.pos, this.size, COLORS.bullet, 0, false);
    LJ.drawRect(LJ.vec2(this.pos.x - this.facing * 0.5, this.pos.y),
      LJ.vec2(0.5, 0.2), new LJ.Color(1, 1, 0.6), 0, false);
  }
}

/* ============================================================
 *  僵尸
 * ============================================================ */
export type ZombieType = 'normal' | 'fast' | 'tank';

export class Zombie extends LJ.EngineObject {
  hp: number;
  maxHp: number;
  damage: number;
  type: ZombieType;
  speed: number;
  score: number;
  private attackCooldown = 0;
  private player: Player | null = null;
  private hitFlash = 0;

  constructor(pos: Vector2, type: ZombieType = 'normal', waveLevel = 1) {
    let size: Vector2, hp: number, dmg: number, spd: number, scr: number, color: Color;
    switch (type) {
      case 'fast':
        size = LJ.vec2(1.5, 3); hp = 30 + waveLevel * 5; dmg = 5; spd = 0.22; scr = 150;
        color = COLORS.zombieFast; break;
      case 'tank':
        size = LJ.vec2(3, 4); hp = 100 + waveLevel * 15; dmg = 15; spd = 0.08; scr = 300;
        color = COLORS.zombieTank; break;
      default:
        size = LJ.vec2(2, 3.2); hp = 50 + waveLevel * 8; dmg = 8; spd = 0.14; scr = 100;
        color = COLORS.zombie;
    }
    super(pos, size);
    this.type = type;
    this.hp = hp; this.maxHp = hp;
    this.damage = dmg; this.speed = spd; this.score = scr;
    this.color = color;
    this.renderOrder = 5;
    this.gravityScale = 1;
    this.mass = type === 'tank' ? 3 : 1;
    this.setCollision(true, false, true, true);
    this.mirror = true;
  }

  setPlayer(p: Player): void { this.player = p; }

  update(): void {
    if (this.destroyed || !this.player) return;
    const dx = this.player.pos.x - this.pos.x;
    if (Math.abs(dx) > 1) {
      const dir = Math.sign(dx);
      this.velocity.x = dir * this.speed;
      this.mirror = dir === -1;
    } else {
      this.velocity.x = 0;
    }
    if (this.attackCooldown > 0) this.attackCooldown--;
    if (this.hitFlash > 0) {
      this.hitFlash--;
      if (this.hitFlash === 0) {
        this.color = this.type === 'fast' ? COLORS.zombieFast
          : this.type === 'tank' ? COLORS.zombieTank : COLORS.zombie;
      }
    }
  }

  canAttack(): boolean {
    if (this.attackCooldown > 0) return false;
    this.attackCooldown = 60;
    return true;
  }

  takeDamage(dmg: number): void {
    this.hp -= dmg;
    this.color = new LJ.Color(1, 0.4, 0.4);
    this.hitFlash = 6;
    new LJ.ParticleEmitter(
      this.pos, 0, 0.5, 0.2, 80, Math.PI, undefined,
      COLORS.blood, COLORS.blood,
      new LJ.Color(0.3, 0.05, 0.05), new LJ.Color(0.2, 0.03, 0.03),
      0.3, 0.15, 0, 0.2
    );
    if (this.hp <= 0) this.destroy();
  }

  render(): void {
    super.render();
    if (this.hp < this.maxHp) {
      const w = this.size.x;
      const hpR = this.hp / this.maxHp;
      LJ.drawRect(LJ.vec2(this.pos.x, this.pos.y + this.size.y / 2 + 0.3),
        LJ.vec2(w, 0.15), COLORS.hpBg, 0, false);
      LJ.drawRect(
        LJ.vec2(this.pos.x - w / 2 + w * hpR / 2, this.pos.y + this.size.y / 2 + 0.3),
        LJ.vec2(w * hpR, 0.15), COLORS.hp, 0, false);
    }
  }
}

/* ============================================================
 *  障碍物 — 静态固体
 * ============================================================ */
export type ObstacleType = 'barrel' | 'container' | 'car';

export class Obstacle extends LJ.EngineObject {
  type: ObstacleType;
  hp: number;

  constructor(pos: Vector2, size: Vector2, type: ObstacleType) {
    let color: Color;
    switch (type) {
      case 'barrel': color = COLORS.barrel; break;
      case 'container': color = COLORS.container; break;
      case 'car': color = COLORS.car; break;
    }
    super(pos, size);
    this.type = type;
    this.color = color;
    this.renderOrder = 3;
    this.hp = type === 'barrel' ? 50 : type === 'container' ? 999999 : 150;
    this.mass = 0;
    this.setCollision(true, true, false, true);
  }

  takeDamage(dmg: number): void {
    this.hp -= dmg;
    if (this.hp <= 0) {
      if (this.type === 'barrel') {
        new LJ.ParticleEmitter(
          this.pos, 0, 0.3, 0.3, 100, Math.PI, undefined,
          new LJ.Color(1, 0.5, 0), new LJ.Color(1, 0.2, 0),
          new LJ.Color(0.3, 0.1, 0), new LJ.Color(0.2, 0.05, 0),
          0.5, 0.3, 0, 0.5
        );
      }
      this.destroy();
    }
  }
}
