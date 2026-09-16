/**
 * 游戏实体 — 玩家 / 僵尸 / 子弹 / 障碍物
 * 全部继承 EngineObject, 使用 LittleJS 内置物理引擎
 */
import * as LJ from 'littlejsengine';
import type { Vector2, Color } from 'littlejsengine';

// === 颜色主题 (生化危机风 — 调亮到 Canvas2D 可见级别) ===
export const COLORS: Record<string, Color> = {
  // 天空渐变 (从上到下)
  skyTop:     new LJ.Color(0.45, 0.28, 0.32),   // 暗红灰
  skyBottom:  new LJ.Color(0.22, 0.25, 0.35),   // 暗蓝灰
  // 远景
  farBuilding: new LJ.Color(0.18, 0.20, 0.28),
  midBuilding: new LJ.Color(0.28, 0.30, 0.38),
  // 地面
  ground:      new LJ.Color(0.35, 0.32, 0.30),   // 混凝土灰
  groundTop:   new LJ.Color(0.50, 0.46, 0.42),   // 亮面
  groundLine:  new LJ.Color(0.55, 0.52, 0.48),   // 分割线
  // 玩家
  player:      new LJ.Color(0.35, 0.75, 0.95),   // 亮蓝 (Leon)
  playerAda:   new LJ.Color(0.85, 0.35, 0.35),   // 红 (Ada)
  playerClaire:new LJ.Color(0.85, 0.65, 0.40),   // 棕 (Claire)
  playerSkin:  new LJ.Color(0.95, 0.80, 0.65),   // 肤色
  playerBoots: new LJ.Color(0.20, 0.20, 0.22),   // 靴子
  playerHair:  new LJ.Color(0.15, 0.12, 0.10),   // 头发
  // 僵尸
  zombie:      new LJ.Color(0.55, 0.70, 0.25),   // 绿
  zombieFast:  new LJ.Color(0.85, 0.35, 0.25),   // 红
  zombieTank:  new LJ.Color(0.35, 0.35, 0.42),   // 深灰
  zombieSkin:  new LJ.Color(0.70, 0.82, 0.38),   // 僵尸皮肤
  zombieBlood: new LJ.Color(0.60, 0.15, 0.15),   // 干血
  // 子弹
  bullet:      new LJ.Color(1.0, 0.92, 0.15),    // 亮黄
  bulletTrail: new LJ.Color(1.0, 0.75, 0.25),    // 橙
  // 血液粒子
  blood:       new LJ.Color(0.85, 0.18, 0.18),
  // UI
  hp:          new LJ.Color(0.95, 0.25, 0.25),
  hpBg:        new LJ.Color(0.30, 0.30, 0.30),
  // 障碍物
  barrel:      new LJ.Color(0.70, 0.30, 0.18),   // 红桶
  container:   new LJ.Color(0.40, 0.48, 0.58),   // 蓝集装箱
  containerStripe: new LJ.Color(0.75, 0.70, 0.35),
  car:         new LJ.Color(0.55, 0.20, 0.20),   // 废车
  carWindow:   new LJ.Color(0.20, 0.22, 0.28),
  carWheel:    new LJ.Color(0.12, 0.12, 0.14),
  // 强调色
  accent:      new LJ.Color(1.0, 0.12, 0.30),
  textDim:     new LJ.Color(0.75, 0.75, 0.75),
};

export const WORLD_WIDTH = 400;

export type CharType = 'leon' | 'ada' | 'claire';

export interface CharConfig {
  hp: number;
  maxHp: number;
  ammo: number;
  maxAmmo: number;
  fireCooldown: number;
  bulletDamage: number;
  color: Color;
  name: string;
}

export function getCharConfig(char: CharType): CharConfig {
  switch (char) {
    case 'ada':
      return { hp: 120, maxHp: 120, ammo: 25, maxAmmo: 25, fireCooldown: 7, bulletDamage: 20, color: COLORS.playerAda, name: 'Ada' };
    case 'claire':
      return { hp: 180, maxHp: 180, ammo: 30, maxAmmo: 30, fireCooldown: 12, bulletDamage: 25, color: COLORS.playerClaire, name: 'Claire' };
    default: // leon
      return { hp: 150, maxHp: 150, ammo: 30, maxAmmo: 30, fireCooldown: 10, bulletDamage: 20, color: COLORS.player, name: 'Leon' };
  }
}

/* ============================================================
 *  玩家
 * ============================================================ */
export class Player extends LJ.EngineObject {
  hp: number;
  maxHp: number;
  ammo: number;
  maxAmmo: number;
  score = 0;
  kills = 0;
  facing = 1;
  fireCooldown: number;
  bulletDamage: number;
  reloading = false;
  private reloadTimer = 0;
  private invincibleTime = 0;
  charType: CharType;

  constructor(pos: Vector2, charType: CharType = 'leon') {
    const cfg = getCharConfig(charType);
    super(pos, LJ.vec2(2, 3.5));
    this.charType = charType;
    this.hp = cfg.hp;
    this.maxHp = cfg.maxHp;
    this.ammo = cfg.ammo;
    this.maxAmmo = cfg.maxAmmo;
    this.fireCooldown = cfg.fireCooldown;
    this.bulletDamage = cfg.bulletDamage;
    this.color = cfg.color;
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
    this.fireCooldown = this.constructorFireCooldown;
    this.velocity.x -= this.facing * 0.1;
    // 发射子弹
    new Bullet(LJ.vec2(this.pos.x + this.facing * 1.5, this.pos.y + 0.3), this.facing, this.bulletDamage);
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

  // 存原始 fireCooldown 用于重置 (因为 this.fireCooldown 在 update 里递减)
  private get constructorFireCooldown(): number {
    return getCharConfig(this.charType).fireCooldown;
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

  // 自定义 render — 强制用 drawRect 画亮色方块
  render(): void {
    if (this.destroyed) return;
    // 身体 (用 drawRect, 默认走 Canvas2D)
    LJ.drawRect(this.pos, this.size, this.color);
    // 头部 (小方块)
    const headSize = LJ.vec2(1.0, 1.0);
    LJ.drawRect(LJ.vec2(this.pos.x, this.pos.y + this.size.y / 2 - headSize.y / 2), headSize, COLORS.playerSkin);
    // 头发
    LJ.drawRect(LJ.vec2(this.pos.x, this.pos.y + this.size.y / 2 - headSize.y / 2 + 0.3), LJ.vec2(1.0, 0.25), COLORS.playerHair);
    // 枪
    LJ.drawRect(LJ.vec2(this.pos.x + this.facing * 0.8, this.pos.y - 0.3), LJ.vec2(0.6, 0.15), new LJ.Color(0.3, 0.3, 0.35));
    // 靴子
    LJ.drawRect(LJ.vec2(this.pos.x - 0.4, this.pos.y - this.size.y / 2 + 0.1), LJ.vec2(0.35, 0.15), COLORS.playerBoots);
    LJ.drawRect(LJ.vec2(this.pos.x + 0.4, this.pos.y - this.size.y / 2 + 0.1), LJ.vec2(0.35, 0.15), COLORS.playerBoots);
  }
}

/* ============================================================
 *  子弹 — 水平飞行, 无重力
 * ============================================================ */
export class Bullet extends LJ.EngineObject {
  damage: number;
  life = 120;
  facing: number;

  constructor(pos: Vector2, facing: number, damage: number = 20) {
    super(pos, LJ.vec2(1.5, 0.5));
    this.facing = facing;
    this.damage = damage;
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

  // 自定义 render
  render(): void {
    if (this.destroyed) return;
    // 子弹主体
    LJ.drawRect(this.pos, this.size, COLORS.bullet);
    // 弹头
    LJ.drawRect(LJ.vec2(this.pos.x - this.facing * 0.75, this.pos.y), LJ.vec2(0.3, 0.4), new LJ.Color(1, 0.75, 0.25));
    // 拖尾
    LJ.drawRect(LJ.vec2(this.pos.x + this.facing * 1.0, this.pos.y), LJ.vec2(0.6, 0.3), COLORS.bulletTrail);
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
  }

  canAttack(): boolean {
    if (this.attackCooldown > 0) return false;
    this.attackCooldown = 60;
    return true;
  }

  takeDamage(dmg: number): void {
    this.hp -= dmg;
    this.color = new LJ.Color(1, 0.4, 0.4);
    new LJ.ParticleEmitter(
      this.pos, 0, 0.5, 0.2, 80, Math.PI, undefined,
      COLORS.blood, COLORS.blood,
      new LJ.Color(0.3, 0.05, 0.05), new LJ.Color(0.2, 0.03, 0.03),
      0.3, 0.15, 0, 0.2
    );
    if (this.hp <= 0) this.destroy();
  }

  // 自定义 render
  render(): void {
    if (this.destroyed) return;
    // 身体
    LJ.drawRect(this.pos, this.size, this.color);
    // 皮肤色块 (不同类型不同)
    const skinSize = LJ.vec2(this.size.x * 0.8, this.size.y * 0.4);
    const skinY = this.pos.y + this.size.y / 2 - skinSize.y / 2;
    LJ.drawRect(LJ.vec2(this.pos.x, skinY), skinSize, COLORS.zombieSkin);
    // 血渍
    const bloodSize = LJ.vec2(this.size.x * 0.5, this.size.y * 0.15);
    LJ.drawRect(LJ.vec2(this.pos.x, this.pos.y - this.size.y / 2 + 0.3), bloodSize, COLORS.zombieBlood);
    // HP 条
    if (this.hp < this.maxHp) {
      const w = this.size.x;
      const hpR = this.hp / this.maxHp;
      LJ.drawRect(LJ.vec2(this.pos.x, this.pos.y + this.size.y / 2 + 0.3),
        LJ.vec2(w, 0.15), COLORS.hpBg);
      LJ.drawRect(
        LJ.vec2(this.pos.x - w / 2 + w * hpR / 2, this.pos.y + this.size.y / 2 + 0.3),
        LJ.vec2(w * hpR, 0.15), COLORS.hp);
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

  // 自定义 render — 让障碍物看起来像真东西
  render(): void {
    if (this.destroyed) return;
    // 主色块
    LJ.drawRect(this.pos, this.size, this.color);

    // 细节: 根据类型画不同装饰
    switch (this.type) {
      case 'barrel':
        // 桶箍 (两条深色横条)
        LJ.drawRect(LJ.vec2(this.pos.x, this.pos.y + 0.5), LJ.vec2(this.size.x, 0.15), new LJ.Color(0.35, 0.15, 0.08));
        LJ.drawRect(LJ.vec2(this.pos.x, this.pos.y - 0.5), LJ.vec2(this.size.x, 0.15), new LJ.Color(0.35, 0.15, 0.08));
        break;
      case 'container':
        // 黄色警示条纹
        LJ.drawRect(LJ.vec2(this.pos.x, this.pos.y + this.size.y / 2 - 0.2),
          LJ.vec2(this.size.x, 0.15), COLORS.containerStripe);
        LJ.drawRect(LJ.vec2(this.pos.x, this.pos.y - this.size.y / 2 + 0.2),
          LJ.vec2(this.size.x, 0.15), COLORS.containerStripe);
        break;
      case 'car':
        // 车窗
        const winSize = LJ.vec2(this.size.x * 0.7, this.size.y * 0.35);
        LJ.drawRect(LJ.vec2(this.pos.x, this.pos.y + this.size.y * 0.15), winSize, COLORS.carWindow);
        // 轮子
        LJ.drawRect(LJ.vec2(this.pos.x - this.size.x / 2 + 0.5, this.pos.y - this.size.y / 2 + 0.2),
          LJ.vec2(0.8, 0.5), COLORS.carWheel);
        LJ.drawRect(LJ.vec2(this.pos.x + this.size.x / 2 - 0.5, this.pos.y - this.size.y / 2 + 0.2),
          LJ.vec2(0.8, 0.5), COLORS.carWheel);
        break;
    }
  }
}
