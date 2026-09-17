/* ============================================================
 *  CONTRA: HARD CORPS — 纯 Canvas 移植版
 *  无任何依赖, 手机/电脑均可玩
 * ============================================================ */

(() => {
'use strict';

// ==================== 常量 ====================
const WORLD_W = 4800;          // 世界宽度
const GROUND_Y = 460;          // 地面 y (世界坐标)
const GRAVITY = 1800;          // 重力 px/s^2
const PLAYER_SPEED = 230;      // 玩家移动速度 px/s
const JUMP_VEL = -680;         // 跳跃初速度
const BULLET_SPEED = 900;      // 子弹速度 px/s
const TILE = 32;               // 瓦片大小

// 画布 — 固定内部分辨率, CSS 缩放适配屏幕
const BASE_W = 1280, BASE_H = 720;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = BASE_W;
canvas.height = BASE_H;
ctx.imageSmoothingEnabled = false;

let VIEW_W = BASE_W, VIEW_H = BASE_H;
let scaleX = 1, scaleY = 1;

function resize() {
  const sw = window.innerWidth, sh = window.innerHeight;
  scaleX = sw / BASE_W;
  scaleY = sh / BASE_H;
  // 保持比例 (contain) — 横屏游戏优先填满
  const s = Math.max(scaleX, scaleY);
  canvas.style.width = (BASE_W * s) + 'px';
  canvas.style.height = (BASE_H * s) + 'px';
  canvas.style.position = 'fixed';
  canvas.style.left = ((sw - BASE_W * s) / 2) + 'px';
  canvas.style.top = ((sh - BASE_H * s) / 2) + 'px';
  ctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resize);
resize();

// ==================== 工具 ====================
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist2 = (ax, ay, bx, by) => { const dx = ax-bx, dy = ay-by; return dx*dx+dy*dy; };
const rectOverlap = (a, b) => a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;

// 世界坐标 → 屏幕坐标
let cameraX = 0, cameraY = 0;
const toSX = x => x - cameraX;
const toSY = y => y - cameraY;

// ==================== 输入 ====================
const keys = {};
const keyDown = k => !!keys[k];
window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

// 触屏虚拟按键
const touch = { left:0, right:0, up:0, down:0, fire:false, jump:false, bomb:false, switch:false, jumpPressed:false, switchPressed:false, bombPressed:false };

// 虚拟摇杆区域
function setupTouch() {
  const btnSize = Math.min(BASE_W, BASE_H) * 0.13;
  const padR = btnSize * 1.2;

  // 摇杆中心 (基于 1280x720 内部分辨率)
  const stickCX = padR + 20, stickCY = BASE_H - padR - 30;
  let stickActive = false, stickId = null, stickDX = 0, stickDY = 0;

  // 按钮位置 (右下)
  const btns = [
    { id:'fire',   cx: BASE_W - padR*2 - 40, cy: BASE_H - padR - 30, r: btnSize*0.55, label:'射' },
    { id:'jump',   cx: BASE_W - padR*1 - 20,  cy: BASE_H - padR*2 - 30, r: btnSize*0.55, label:'跳' },
    { id:'switch', cx: BASE_W - padR*3 - 60,  cy: BASE_H - padR*2 - 30, r: btnSize*0.45, label:'换' },
    { id:'bomb',   cx: BASE_W - padR*1 - 20,  cy: BASE_H - padR*0.3 - 10, r: btnSize*0.4, label:'炸' },
  ];

  // 触屏坐标 → 画布内部分辨率坐标
  function toCanvasXY(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (BASE_W / rect.width),
      y: (clientY - rect.top) * (BASE_H / rect.height)
    };
  }

  function resetTouch() {
    touch.left = touch.right = touch.up = touch.down = 0;
    touch.fire = false;
    stickActive = false; stickId = null; stickDX = 0; stickDY = 0;
  }

  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      const { x, y } = toCanvasXY(t.clientX, t.clientY);
      // 摇杆区 (左下 45%)
      if (x < BASE_W * 0.45 && y > BASE_H * 0.4) {
        stickActive = true; stickId = t.identifier;
        stickDX = x - stickCX; stickDY = y - stickCY;
        updateStick();
        continue;
      }
      // 按钮
      for (const b of btns) {
        const d = Math.hypot(x - b.cx, y - b.cy);
        if (d < b.r + 10) {
          if (b.id === 'fire') touch.fire = true;
          if (b.id === 'jump') { touch.jump = true; touch.jumpPressed = true; }
          if (b.id === 'switch') { touch.switch = true; touch.switchPressed = true; }
          if (b.id === 'bomb') { touch.bomb = true; touch.bombPressed = true; }
        }
      }
    }
  }, { passive:false });

  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === stickId) {
        const { x, y } = toCanvasXY(t.clientX, t.clientY);
        stickDX = x - stickCX; stickDY = y - stickCY;
        updateStick();
      }
    }
  }, { passive:false });

  canvas.addEventListener('touchend', e => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === stickId) { stickActive = false; stickId = null; stickDX = 0; stickDY = 0; updateStick(); }
    }
    touch.fire = false; touch.jump = false; touch.switch = false; touch.bomb = false;
  }, { passive:false });

  canvas.addEventListener('touchcancel', resetTouch, { passive:false });

  function updateStick() {
    const len = Math.hypot(stickDX, stickDY);
    const max = padR * 0.8;
    if (len > max) { stickDX = stickDX / len * max; stickDY = stickDY / len * max; }
    touch.left = stickDX < -10 ? -stickDX / max : 0;
    touch.right = stickDX > 10 ? stickDX / max : 0;
    touch.up = stickDY < -10 ? -stickDY / max : 0;
    touch.down = stickDY > 10 ? stickDY / max : 0;
  }

  window.__drawTouch = () => {
    if (!stickActive && !touch.fire && !touch.jump && !touch.switch && !touch.bomb) return;
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#aaa'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(stickCX, stickCY, padR, 0, Math.PI*2); ctx.stroke();
    if (stickActive) {
      ctx.fillStyle = '#888';
      ctx.beginPath(); ctx.arc(stickCX + stickDX, stickCY + stickDY, btnSize*0.4, 0, Math.PI*2); ctx.fill();
    }
    // 按钮
    for (const b of btns) {
      ctx.strokeStyle = b.id === 'fire' ? '#ff4040' : b.id === 'jump' ? '#40a0ff' : b.id === 'bomb' ? '#ffaa00' : '#aaa';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(b.cx, b.cy, b.r, 0, Math.PI*2); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = `bold ${btnSize*0.35}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(b.label, b.cx, b.cy);
    }
    ctx.restore();
  };
}

// ==================== 角色配置 ====================
const CHARS = {
  ray:    { name:'Ray',    color:'#d04040', pants:'#2244aa', speed:1.0, jump:1.0, weapons:['vulcan','crash','spread','homing'] },
  sheena: { name:'Sheena', color:'#ffb080', pants:'#cc4488', speed:1.15, jump:1.05, weapons:['plasma','grenade','laser','fanlaser'] },
  fang:   { name:'Fang',   color:'#888888', pants:'#aa6633', speed:0.95, jump:1.0, weapons:['photon','firefist','flame','plasmaball'] },
  browny: { name:'Browny', color:'#cccc00', pants:'#556677', speed:1.0, jump:0.9, weapons:['wavelaser','boomerang','ballchain','orb'] },
};

// ==================== 玩家 ====================
class Player {
  constructor(x, y, charKey) {
    this.x = x; this.y = y;
    this.w = 36; this.h = 56;
    this.vx = 0; this.vy = 0;
    this.charKey = charKey;
    this.cfg = CHARS[charKey];
    this.facing = 1;
    this.onGround = false;
    this.lives = 3;
    this.hp = 1;  // 魂斗罗风格: 1 hit 死 (但有 3 条命)
    this.invuln = 0;  // 无敌帧
    this.slideTime = 0;  // 滑铲
    this.bombs = 2;
    this.weaponIdx = 0;
    this.fireCooldown = 0;
    this.aimAngle = 0;  // 射击角度
    this.dead = false;
    this.hoverTime = 0;  // Browny 悬浮
  }

  get weapon() { return this.cfg.weapons[this.weaponIdx]; }

  switchWeapon() { this.weaponIdx = (this.weaponIdx + 1) % this.cfg.weapons.length; }

  update(dt) {
    if (this.dead) return;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.slideTime > 0) this.slideTime -= dt;

    // 输入
    const left = keyDown('ArrowLeft') || keyDown('KeyA') || touch.left > 0.3;
    const right = keyDown('ArrowRight') || keyDown('KeyD') || touch.right > 0.3;
    const up = keyDown('ArrowUp') || keyDown('KeyW') || touch.up > 0.3;
    const down = keyDown('ArrowDown') || keyDown('KeyS') || touch.down > 0.3;
    const jumpHeld = keyDown('Space') || keyDown('ArrowUp') || keyDown('KeyW') || touch.jump;
    const jumpPressed = keyWasPressed('Space') || keyWasPressed('ArrowUp') || keyWasPressed('KeyW') || touch.jumpPressed;
    const fire = keyDown('KeyJ') || touch.fire;
    const switchW = keyWasPressed('KeyK') || touch.switchPressed;
    const bomb = keyWasPressed('KeyL') || touch.bombPressed;

    touch.jumpPressed = false; touch.switchPressed = false; touch.bombPressed = false;

    // 移动
    const spd = PLAYER_SPEED * this.cfg.speed;
    if (this.slideTime <= 0) {
      if (left && !right) { this.vx = -spd; this.facing = -1; }
      else if (right && !left) { this.vx = spd; this.facing = 1; }
      else this.vx = 0;
    }

    // 跳跃
    if (jumpPressed && this.onGround) {
      this.vy = JUMP_VEL * this.cfg.jump;
      this.onGround = false;
    }
    // Browny 悬浮
    if (this.charKey === 'browny' && !this.onGround && jumpHeld && this.hoverTime < 1.5) {
      this.vy = Math.max(this.vy, -120);
      this.hoverTime += dt;
    }
    if (this.onGround) this.hoverTime = 0;

    // 滑铲 (下+跳)
    if (down && jumpPressed && this.onGround) {
      this.slideTime = 0.4;
      this.vx = this.facing * 380;
      this.invuln = Math.max(this.invuln, 0.4);
    }

    // 武器切换
    if (switchW) this.switchWeapon();

    // 射击
    if (fire && this.fireCooldown <= 0) {
      this.shoot();
      this.fireCooldown = weaponConfig[this.weapon].cooldown;
    }
    if (this.fireCooldown > 0) this.fireCooldown -= dt;

    // 炸弹
    if (bomb && this.bombs > 0) { this.useBomb(); this.bombs--; }

    // 瞄准角度
    this.aimAngle = this.computeAim(left, right, up, down);

    // 物理
    this.vy += GRAVITY * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // 地面
    if (this.y + this.h >= GROUND_Y) {
      this.y = GROUND_Y - this.h;
      this.vy = 0;
      this.onGround = true;
    } else this.onGround = false;

    // 平台碰撞
    for (const p of platforms) {
      if (this.vy >= 0 &&
          this.x + this.w > p.x && this.x < p.x + p.w &&
          this.y + this.h >= p.y && this.y + this.h <= p.y + 24) {
        this.y = p.y - this.h;
        this.vy = 0;
        this.onGround = true;
      }
    }

    // 世界边界
    this.x = clamp(this.x, 0, WORLD_W - this.w);
  }

  computeAim(left, right, up, down) {
    // 8 方向瞄准
    let dx = this.facing, dy = 0;
    if (up) dy = -1;
    else if (down && this.onGround) dy = 0;  // 蹲下时水平
    else if (down) dy = 1;
    if (up && (left || right)) { dx = left ? -1 : 1; dy = -1; }
    else if (down && (left || right)) { dx = left ? -1 : 1; dy = 1; }
    else if (left) { dx = -1; dy = 0; }
    else if (right) { dx = 1; dy = 0; }
    return Math.atan2(dy, dx);
  }

  shoot() {
    const muzzleX = this.x + this.w / 2 + Math.cos(this.aimAngle) * 20;
    const muzzleY = this.y + this.h / 2 + Math.sin(this.aimAngle) * 20 - 6;
    fireWeapon(this.weapon, muzzleX, muzzleY, this.aimAngle, this.facing);
  }

  useBomb() {
    // 全屏伤害
    screenShake = 0.5;
    for (const e of enemies) e.hp -= 50;
    for (let i = 0; i < 40; i++) particles.push(new Particle(rand(0, VIEW_W), rand(0, VIEW_H), rand(-200,200), rand(-300,50), rand(0.3,0.8), `hsl(${rand(20,50)},100%,${rand(40,70)}%)`));
  }

  hit() {
    if (this.invuln > 0 || this.slideTime > 0) return;
    this.hp--;
    if (this.hp <= 0) {
      this.dead = true;
      this.lives--;
      for (let i = 0; i < 30; i++) particles.push(new Particle(this.x+this.w/2, this.y+this.h/2, rand(-300,300), rand(-400,50), rand(0.4,1), `hsl(${rand(0,40)},100%,50%)`));
      if (this.lives > 0) {
        setTimeout(() => respawnPlayer(), 1000);
      } else {
        setTimeout(() => gameOver(false), 1200);
      }
    }
  }

  draw() {
    if (this.dead) return;
    if (this.invuln > 0 && Math.floor(this.invuln * 8) % 2 === 0) return;
    const sx = toSX(this.x), sy = toSY(this.y);
    const sliding = this.slideTime > 0;
    const scale = sliding ? 0.6 : 1;
    const h = this.h * scale;
    const yy = sliding ? sy + this.h - h : sy;
    drawPixelChar(ctx, sx, yy, this.w, h, this.charKey, this.facing, this.aimAngle, sliding);
  }
}

// ==================== 像素画角色绘制 ====================
// 在 (x,y) 处绘制一个 w x h 的角色 (x,y 为左上角)
function drawPixelChar(c, x, y, w, h, charKey, facing, aimAngle, sliding) {
  c.save();
  if (facing === -1) {
    c.translate(x + w, y);
    c.scale(-1, 1);
  } else {
    c.translate(x, y);
  }
  const u = w / 14; // 单位像素宽度
  const v = h / 22; // 单位像素高度
  const px = (cx, cy, cw, ch, color) => {
    c.fillStyle = color;
    c.fillRect(cx * u, cy * v, cw * u, ch * v);
  };

  const skin = '#ffd8b0', skinShade = '#e0a878';
  const black = '#1a1a1a', darkGray = '#444', gray = '#777';

  if (charKey === 'ray') {
    const red = '#d02020', redDark = '#8a1010', blue = '#2244aa', blueDark = '#162a6a';
    // 头巾
    px(4, 0, 6, 2, red); px(3, 1, 8, 1, redDark);
    // 脸
    px(4, 2, 6, 4, skin); px(4, 5, 6, 1, skinShade);
    px(5, 3, 1, 1, black); px(8, 3, 1, 1, black); // 眼睛
    // 身体(红背心)
    px(3, 6, 8, 5, red); px(3, 6, 8, 1, redDark);
    px(6, 6, 2, 5, '#ffcc00'); // 背带
    // 手臂
    px(2, 7, 1, 4, skin); px(11, 7, 1, 4, skin);
    // 枪
    c.save();
    c.translate(12 * u, 9 * v);
    c.rotate(aimAngle || 0);
    c.fillStyle = darkGray;
    c.fillRect(0, -1*v, 8*u, 2*v);
    c.fillStyle = '#888';
    c.fillRect(7*u, -1.5*v, 1*u, 3*v);
    c.restore();
    // 裤子
    px(4, 11, 3, 6, blue); px(7, 11, 3, 6, blue);
    px(4, 11, 6, 1, blueDark);
    // 靴子
    px(3, 17, 4, 3, black); px(7, 17, 4, 3, black);
    px(3, 19, 4, 1, darkGray); px(7, 19, 4, 1, darkGray);
  }
  else if (charKey === 'sheena') {
    const pink = '#d04080', pinkDark = '#8a2050', dark = '#2a1a3a', hair = '#e8c060';
    // 头发
    px(3, 0, 8, 3, hair); px(3, 1, 1, 5, hair); px(10, 1, 1, 5, hair);
    // 脸
    px(4, 3, 6, 4, skin); px(4, 6, 6, 1, skinShade);
    px(5, 4, 1, 1, black); px(8, 4, 1, 1, black);
    // 身体(粉色战斗服)
    px(3, 7, 8, 5, pink); px(3, 7, 8, 1, pinkDark);
    // 手臂
    px(2, 8, 1, 4, skin); px(11, 8, 1, 4, skin);
    // 枪
    c.save();
    c.translate(12 * u, 10 * v);
    c.rotate(aimAngle || 0);
    c.fillStyle = darkGray;
    c.fillRect(0, -1*v, 8*u, 2*v);
    c.restore();
    // 裤子
    px(4, 12, 3, 5, dark); px(7, 12, 3, 5, dark);
    // 靴子
    px(3, 17, 4, 3, black); px(7, 17, 4, 3, black);
  }
  else if (charKey === 'fang') {
    const fur = '#999', furDark = '#666', brown = '#7a4a28', mech = '#556677', orange = '#ff6600';
    // 狼头
    px(4, 0, 6, 2, fur); px(3, 1, 1, 1, fur); px(10, 1, 1, 1, fur); // 耳朵
    px(4, 1, 6, 4, fur); px(4, 5, 6, 1, furDark);
    px(5, 3, 1, 1, orange); px(8, 3, 1, 1, orange); // 眼睛(发光)
    px(6, 5, 2, 1, black); // 嘴
    // 身体(棕色战术背心)
    px(3, 6, 8, 6, brown); px(3, 6, 8, 1, '#5a3018');
    px(5, 7, 4, 4, furDark);
    // 机械臂(左手)
    px(1, 7, 2, 5, mech); px(0, 10, 2, 2, darkGray);
    // 右臂+枪
    c.save();
    c.translate(12 * u, 9 * v);
    c.rotate(aimAngle || 0);
    c.fillStyle = darkGray;
    c.fillRect(0, -1.5*v, 9*u, 3*v);
    c.restore();
    // 腿
    px(4, 12, 3, 5, fur); px(7, 12, 3, 5, fur);
    px(4, 12, 6, 1, furDark);
    // 靴子
    px(3, 17, 4, 3, black); px(7, 17, 4, 3, black);
  }
  else if (charKey === 'browny') {
    const yellow = '#d4b800', yellowDark = '#8a7800', metal = '#556677', metalDark = '#334455', eye = '#00ddff';
    // 天线
    px(6, 0, 1, 2, metal); px(5, 0, 3, 1, eye);
    // 圆头
    px(3, 2, 8, 5, yellow); px(3, 2, 8, 1, yellowDark);
    px(4, 1, 6, 1, yellow); px(4, 7, 6, 1, yellowDark);
    // 单眼
    px(5, 4, 4, 2, black); px(6, 4, 2, 2, eye);
    // 身体
    px(3, 8, 8, 7, metal); px(3, 8, 8, 1, metalDark);
    px(5, 9, 4, 5, '#6688aa');
    // 手臂
    px(2, 9, 1, 4, metal); px(11, 9, 1, 4, metal);
    // 枪
    c.save();
    c.translate(12 * u, 11 * v);
    c.rotate(aimAngle || 0);
    c.fillStyle = darkGray;
    c.fillRect(0, -1*v, 7*u, 2*v);
    c.restore();
    // 短腿
    px(4, 15, 3, 3, metalDark); px(7, 15, 3, 3, metalDark);
    px(3, 18, 4, 2, black); px(7, 18, 4, 2, black);
  }
  c.restore();
}

// ==================== 子弹 ====================
class Bullet {
  constructor(x, y, vx, vy, dmg, color, size = 4, life = 1.2, fromPlayer = true) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.dmg = dmg; this.color = color; this.size = size;
    this.life = life; this.fromPlayer = fromPlayer;
    this.dead = false;
  }
  update(dt) {
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.life -= dt;
    if (this.life <= 0 || this.x < cameraX - 100 || this.x > cameraX + VIEW_W + 100 || this.y < -100 || this.y > GROUND_Y + 100) this.dead = true;
  }
  draw() {
    ctx.fillStyle = this.color;
    ctx.fillRect(toSX(this.x) - this.size/2, toSY(this.y) - this.size/2, this.size, this.size);
  }
}

// ==================== 武器系统 ====================
const weaponConfig = {
  vulcan:     { cooldown: 0.08, dmg: 8,  color: '#ffef50' },
  crash:      { cooldown: 0.35, dmg: 30, color: '#ff8030' },
  spread:     { cooldown: 0.18, dmg: 7,  color: '#50d0ff' },
  homing:     { cooldown: 0.22, dmg: 12, color: '#ff50c0' },
  plasma:     { cooldown: 0.12, dmg: 14, color: '#a060ff' },
  grenade:    { cooldown: 0.4,  dmg: 35, color: '#50ff80' },
  laser:      { cooldown: 0.3,  dmg: 28, color: '#ff3030' },
  fanlaser:   { cooldown: 0.25, dmg: 9,  color: '#40ffff' },
  photon:     { cooldown: 0.14, dmg: 11, color: '#ffff00' },
  firefist:   { cooldown: 0.5,  dmg: 45, color: '#ff6000' },
  flame:      { cooldown: 0.1,  dmg: 5,  color: '#ffaa00' },
  plasmaball: { cooldown: 0.6,  dmg: 50, color: '#00ff88' },
  wavelaser:  { cooldown: 0.16, dmg: 16, color: '#4488ff' },
  boomerang:  { cooldown: 0.3,  dmg: 20, color: '#cccccc' },
  ballchain:  { cooldown: 0.25, dmg: 18, color: '#aa88ff' },
  orb:        { cooldown: 0.2,  dmg: 10, color: '#ffaa00' },
};

function fireWeapon(name, x, y, angle, facing) {
  const cfg = weaponConfig[name];
  const spd = BULLET_SPEED;
  const ca = Math.cos(angle), sa = Math.sin(angle);

  switch (name) {
    case 'vulcan':
    case 'plasma':
    case 'photon':
    case 'wavelaser':
      bullets.push(new Bullet(x, y, ca * spd, sa * spd, cfg.dmg, cfg.color, 5));
      break;
    case 'crash':
    case 'grenade':
    case 'plasmaball':
      bullets.push(new Bullet(x, y, ca * spd * 0.7, sa * spd * 0.7, cfg.dmg, cfg.color, 8, 1.5));
      break;
    case 'spread':
      for (let i = -2; i <= 2; i++) {
        const a = angle + i * 0.18;
        bullets.push(new Bullet(x, y, Math.cos(a)*spd, Math.sin(a)*spd, cfg.dmg, cfg.color, 4));
      }
      break;
    case 'fanlaser':
      for (let i = -1; i <= 1; i++) {
        const a = angle + i * 0.22;
        bullets.push(new Bullet(x, y, Math.cos(a)*spd, Math.sin(a)*spd, cfg.dmg, cfg.color, 6));
      }
      break;
    case 'laser':
      bullets.push(new Bullet(x, y, ca * spd * 1.3, sa * spd * 1.3, cfg.dmg, cfg.color, 10, 0.8));
      break;
    case 'firefist':
      bullets.push(new Bullet(x, y, ca * spd * 0.5, sa * spd * 0.5, cfg.dmg, cfg.color, 14, 0.4));
      break;
    case 'flame':
      for (let i = 0; i < 3; i++) {
        const a = angle + rand(-0.2, 0.2);
        bullets.push(new Bullet(x, y, Math.cos(a)*spd*0.6, Math.sin(a)*spd*0.6, cfg.dmg, cfg.color, 5, 0.3));
      }
      break;
    case 'homing':
      bullets.push(new Bullet(x, y, ca * spd * 0.8, sa * spd * 0.8, cfg.dmg, cfg.color, 5, 1.5));
      break;
    case 'boomerang':
      bullets.push(new Bullet(x, y, ca * spd * 0.5, sa * spd * 0.5, cfg.dmg, cfg.color, 8, 2));
      break;
    case 'ballchain':
      for (let i = 0; i < 4; i++) {
        const a = angle + i * Math.PI / 2;
        bullets.push(new Bullet(x, y, Math.cos(a)*spd*0.4, Math.sin(a)*spd*0.4, cfg.dmg, cfg.color, 6, 0.8));
      }
      break;
    case 'orb':
      // 环绕玩家的球
      orbCount++;
      bullets.push(new Bullet(x, y, 0, 0, cfg.dmg, cfg.color, 8, 3));
      break;
  }
}

// ==================== 敌人 ====================
class Enemy {
  constructor(x, y, type) {
    this.x = x; this.y = y; this.type = type;
    this.dead = false; this.hitFlash = 0;
    this.shootTimer = rand(0.5, 2);
    this.t = 0;

    switch (type) {
      case 'soldier':
        this.w = 24; this.h = 40; this.hp = 15; this.speed = 35; this.score = 100;
        this.color = '#557755'; break;
      case 'robot':
        this.w = 30; this.h = 36; this.hp = 30; this.speed = 22; this.score = 200;
        this.color = '#888'; break;
      case 'flyer':
        this.w = 28; this.h = 22; this.hp = 12; this.speed = 70; this.score = 150;
        this.color = '#aa4488'; this.flyY = y; break;
      case 'turret':
        // 改为缓慢移动的撞击型敌人 (不再固定炮塔)
        this.w = 28; this.h = 24; this.hp = 40; this.speed = 18; this.score = 250;
        this.color = '#776644'; break;
      case 'boss':
        this.w = 120; this.h = 100; this.hp = 600; this.speed = 28; this.score = 5000;
        this.color = '#882222'; this.phase = 0; break;
    }
    this.vx = -this.speed;
    this.vy = 0;
  }

  update(dt) {
    this.t += dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;

    switch (this.type) {
      case 'soldier':
      case 'robot':
        this.vy += GRAVITY * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        if (this.y + this.h >= GROUND_Y) { this.y = GROUND_Y - this.h; this.vy = 0; }
        // 朝玩家走 (只靠撞击造成伤害, 不再开枪)
        if (player && !player.dead) this.vx = Math.sign(player.x - this.x) * this.speed;
        break;
      case 'flyer':
        // 飞行, 上下波动 (不再开枪, 靠撞击)
        this.y = this.flyY + Math.sin(this.t * 3) * 40;
        this.x += this.vx * dt;
        if (player && !player.dead) this.vx = Math.sign(player.x - this.x) * this.speed;
        break;
      case 'turret':
        // 改为缓慢移动的撞击型敌人 (不再开枪)
        this.vy += GRAVITY * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        if (this.y + this.h >= GROUND_Y) { this.y = GROUND_Y - this.h; this.vy = 0; }
        if (player && !player.dead) this.vx = Math.sign(player.x - this.x) * this.speed;
        break;
      case 'boss':
        this.updateBoss(dt);
        break;
    }

    if (this.hp <= 0) {
      this.dead = true;
      score += this.score;
      kills++;
      for (let i = 0; i < 15; i++) particles.push(new Particle(this.x+this.w/2, this.y+this.h/2, rand(-200,200), rand(-300,50), rand(0.3,0.8), this.color));
    }
  }

  updateBoss(dt) {
    // Boss 在地面附近左右移动 (不再开枪, 靠撞击 + 跳跃砸地造成伤害)
    this.vy += GRAVITY * 0.3 * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.y + this.h >= GROUND_Y) { this.y = GROUND_Y - this.h; this.vy = 0; }
    // 朝玩家追击
    if (player && !player.dead) this.vx = Math.sign(player.x - this.x) * this.speed;
    // 边界反弹
    if (this.x < cameraX + 100 || this.x + this.w > cameraX + VIEW_W - 100) this.vx *= -1;
    // 跳
    if (this.t % 4 < dt && this.y + this.h >= GROUND_Y - 1) {
      this.vy = -500;
    }
  }

  hit(dmg) { this.hp -= dmg; this.hitFlash = 0.08; }

  draw() {
    const sx = toSX(this.x), sy = toSY(this.y);
    ctx.fillStyle = this.hitFlash > 0 ? '#fff' : this.color;
    ctx.fillRect(sx, sy, this.w, this.h);
    // 眼睛
    ctx.fillStyle = '#f00';
    ctx.fillRect(sx + 4, sy + 6, 4, 4);
    ctx.fillRect(sx + this.w - 8, sy + 6, 4, 4);
    if (this.type === 'boss') {
      // Boss 血条
      const bw = 200;
      const hpR = clamp(this.hp / 600, 0, 1);
      ctx.fillStyle = '#400';
      ctx.fillRect(BASE_W/2 - bw/2, 20, bw, 14);
      ctx.fillStyle = '#f33';
      ctx.fillRect(BASE_W/2 - bw/2, 20, bw * hpR, 14);
      ctx.strokeStyle = '#fff';
      ctx.strokeRect(BASE_W/2 - bw/2, 20, bw, 14);
      ctx.fillStyle = '#fff';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('BOSS', BASE_W/2, 31);
    }
  }
}

// ==================== 粒子 ====================
class Particle {
  constructor(x, y, vx, vy, life, color) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.life = life; this.maxLife = life; this.color = color;
  }
  update(dt) {
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.vy += GRAVITY * 0.3 * dt;
    this.life -= dt;
  }
  draw() {
    ctx.globalAlpha = clamp(this.life / this.maxLife, 0, 1);
    ctx.fillStyle = this.color;
    ctx.fillRect(toSX(this.x), toSY(this.y), 4, 4);
    ctx.globalAlpha = 1;
  }
}

// ==================== 全局状态 ====================
let player = null;
let bullets = [];
let enemies = [];
let particles = [];
let platforms = [];
let pickups = [];  // 武器胶囊
let spawnQueue = [];
let spawnIndex = 0;
let score = 0;
let kills = 0;
let orbCount = 0;
let screenShake = 0;
let gameState = 'menu';  // menu | playing | gameOver
let levelEnd = false;
let bossSpawned = false;

// 按键"刚按下"检测
const prevKeys = {};
function keyWasPressed(code) {
  const now = !!keys[code];
  const was = !!prevKeys[code];
  return now && !was;
}

// ==================== 关卡 ====================
function buildLevel() {
  platforms = [];
  spawnQueue = [];
  pickups = [];
  bossSpawned = false;
  levelEnd = false;

  // 平台 (x, y, w)
  const plats = [
    [400, 380, 120], [700, 340, 100], [1000, 380, 140],
    [1350, 350, 120], [1650, 300, 100], [1900, 380, 160],
    [2250, 340, 120], [2550, 300, 100], [2850, 380, 140],
    [3150, 350, 120], [3450, 320, 140], [3800, 380, 120],
  ];
  for (const [x, y, w] of plats) platforms.push({ x, y, w, h: 16 });

  // 敌人出生点 (x, y, type)
  const spawns = [
    [600, GROUND_Y, 'soldier'], [850, 340, 'flyer'], [1100, GROUND_Y, 'robot'],
    [1300, GROUND_Y, 'soldier'], [1500, 340, 'flyer'], [1700, GROUND_Y, 'turret'],
    [1850, GROUND_Y, 'soldier'], [2050, 340, 'flyer'], [2200, GROUND_Y, 'robot'],
    [2400, GROUND_Y, 'soldier'], [2500, 300, 'flyer'], [2700, GROUND_Y, 'turret'],
    [2900, GROUND_Y, 'robot'], [3050, 340, 'flyer'], [3250, GROUND_Y, 'soldier'],
    [3400, GROUND_Y, 'robot'], [3600, 340, 'flyer'], [3750, GROUND_Y, 'turret'],
  ];
  for (const [x, y, type] of spawns) spawnQueue.push({ x, y, type });

  // 武器胶囊
  pickups.push({ x: 500, y: 360, w: 16, h: 16, taken: false });
  pickups.push({ x: 1200, y: 360, w: 16, h: 16, taken: false });
  pickups.push({ x: 2100, y: 320, w: 16, h: 16, taken: false });
  pickups.push({ x: 3000, y: 360, w: 16, h: 16, taken: false });
}

// ==================== 游戏控制 ====================
function startGame(charKey) {
  buildLevel();
  player = new Player(60, GROUND_Y - 50, charKey);
  bullets = []; enemies = []; particles = [];
  score = 0; kills = 0; orbCount = 0;
  screenShake = 0;
  gameState = 'playing';
  cameraX = 0; cameraY = 0;
}

function respawnPlayer() {
  if (!player) return;
  player.dead = false;
  player.hp = 1;
  player.invuln = 2;
  player.x = clamp(cameraX + 100, 60, WORLD_W - 100);
  player.y = GROUND_Y - 100;
  player.vx = 0; player.vy = 0;
  player.weaponIdx = 0;  // 死亡丢失武器
}

function gameOver(won) {
  gameState = 'gameOver';
  document.getElementById('go-title').textContent = won ? 'MISSION COMPLETE' : 'MISSION FAILED';
  document.getElementById('go-title').className = 'go-title ' + (won ? 'win' : 'dead');
  document.getElementById('go-kills').textContent = kills;
  document.getElementById('go-score').textContent = score;
  showScreen('screen-go');
}

function showScreen(id) {
  document.querySelectorAll('#overlay .screen').forEach(s => s.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}
function hideAllScreens() {
  document.querySelectorAll('#overlay .screen').forEach(s => s.classList.add('hidden'));
}

// ==================== 碰撞 ====================
function checkCollisions() {
  // 玩家子弹 → 敌人
  for (const b of bullets) {
    if (!b.fromPlayer || b.dead) continue;
    for (const e of enemies) {
      if (e.dead) continue;
      if (b.x > e.x && b.x < e.x + e.w && b.y > e.y && b.y < e.y + e.h) {
        e.hit(b.dmg);
        b.dead = true;
        for (let i = 0; i < 4; i++) particles.push(new Particle(b.x, b.y, rand(-100,100), rand(-100,100), 0.2, b.color));
        break;
      }
    }
  }

  // 敌人子弹 → 玩家
  if (player && !player.dead) {
    for (const b of bullets) {
      if (b.fromPlayer || b.dead) continue;
      if (b.x > player.x && b.x < player.x + player.w && b.y > player.y && b.y < player.y + player.h) {
        b.dead = true;
        player.hit();
      }
    }
    // 敌人接触玩家
    for (const e of enemies) {
      if (e.dead) continue;
      if (e.x < player.x + player.w && e.x + e.w > player.x &&
          e.y < player.y + player.h && e.y + e.h > player.y) {
        player.hit();
      }
    }
  }

  // 玩家 → 武器胶囊
  for (const p of pickups) {
    if (p.taken) continue;
    if (player && !player.dead &&
        p.x < player.x + player.w && p.x + p.w > player.x &&
        p.y < player.y + player.h && p.y + p.h > player.y) {
      p.taken = true;
      player.weaponIdx = (player.weaponIdx + 1) % player.cfg.weapons.length;
      score += 200;
    }
  }
}

// ==================== 生成敌人 ====================
function spawnLogic() {
  // 根据相机位置生成敌人
  while (spawnIndex < spawnQueue.length && spawnQueue[spawnIndex].x < cameraX + VIEW_W + 200) {
    const s = spawnQueue[spawnIndex];
    enemies.push(new Enemy(s.x, s.y, s.type));
    spawnIndex++;
  }

  // Boss: 到达关卡末尾
  if (!bossSpawned && cameraX > WORLD_W - VIEW_W - 400) {
    bossSpawned = true;
    enemies.push(new Enemy(WORLD_W - 300, GROUND_Y - 100, 'boss'));
  }

  // 检查关卡结束 (Boss 死亡)
  if (bossSpawned && enemies.every(e => e.dead || e.type !== 'boss')) {
    const bossAlive = enemies.some(e => e.type === 'boss' && !e.dead);
    if (!bossAlive) {
      setTimeout(() => gameOver(true), 1500);
      bossSpawned = 'done';
    }
  }
}

// ==================== 主循环 ====================
let lastTime = performance.now();
function loop(now) {
  let dt = (now - lastTime) / 1000;
  lastTime = now;
  if (dt > 0.05) dt = 0.05;  // 限制最大步长

  // 保存上一帧按键
  for (const k in keys) prevKeys[k] = keys[k];

  if (gameState === 'playing') {
    update(dt);
  }
  render();

  requestAnimationFrame(loop);
}

function update(dt) {
  if (player) player.update(dt);

  // 相机跟随
  if (player && !player.dead) {
    const targetX = clamp(player.x - VIEW_W * 0.4, 0, WORLD_W - VIEW_W);
    cameraX += (targetX - cameraX) * 0.1;
  }
  if (screenShake > 0) {
    cameraX += rand(-8, 8);
    cameraY = rand(-8, 8);
    screenShake -= dt;
  } else cameraY = 0;

  // 生成
  spawnLogic();

  // 更新
  for (const b of bullets) b.update(dt);
  for (const e of enemies) e.update(dt);
  for (const p of particles) p.update(dt);

  // 碰撞
  checkCollisions();

  // 清理
  bullets = bullets.filter(b => !b.dead);
  enemies = enemies.filter(e => !e.dead);
  particles = particles.filter(p => p.life > 0);

  // 玩家出界掉落
  if (player && player.y > GROUND_Y + 200) {
    player.hp = 0;
    player.hit();
  }
}

// ==================== 渲染 ====================
// 画一排建筑 (offset: 视差偏移, baseY: 地面基线, w/h: 建筑宽高范围, spacing: 间距, withWindows)
function drawBuildings(offset, baseY, w, hMin, hMax, withWindows) {
  const period = w + 40; // 建筑周期
  const startIdx = Math.floor(offset / period) - 1;
  const endIdx = startIdx + Math.ceil(BASE_W / period) + 3;
  for (let i = startIdx; i < endIdx; i++) {
    const seed = Math.abs(i * 73 + Math.floor(offset / period) * 131) % 1000;
    const bx = i * period - offset;
    const bh = hMin + (seed % (hMax - hMin));
    const by = baseY - bh;
    // 建筑主体
    ctx.fillRect(bx, by, w, bh);
    // 顶部装饰
    ctx.fillRect(bx + 4, by - 8, w - 8, 8);
    if (withWindows) {
      ctx.fillStyle = '#ffd860';
      const cols = Math.floor(w / 26);
      const rows = Math.floor(bh / 30);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const lit = ((i * 7 + r * 3 + c * 5 + seed) % 4) < 2;
          if (lit) {
            ctx.globalAlpha = 0.7 + ((seed + r + c) % 3) * 0.1;
            ctx.fillRect(bx + 8 + c * 26, by + 12 + r * 30, 12, 16);
          }
        }
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#1e1430';
    }
  }
}

function render() {
  // 天空渐变
  const grad = ctx.createLinearGradient(0, 0, 0, BASE_H);
  grad.addColorStop(0, '#0d0520');
  grad.addColorStop(0.5, '#1a0a2e');
  grad.addColorStop(0.85, '#2d1538');
  grad.addColorStop(1, '#3d2030');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, BASE_W, BASE_H);

  // 月亮
  ctx.fillStyle = '#f0e8c0';
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.arc(BASE_W - 200, 120, 50, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // 远景建筑剪影 (视差 0.2)
  ctx.fillStyle = '#120a22';
  drawBuildings(cameraX * 0.2, BASE_H - 180, 130, 80, 220, false);
  // 中景建筑 (视差 0.45) — 带窗户
  ctx.fillStyle = '#1e1430';
  drawBuildings(cameraX * 0.45, BASE_H - 130, 160, 110, 260, true);

  // 地面
  ctx.fillStyle = '#2a1d28';
  ctx.fillRect(0, toSY(GROUND_Y), BASE_W, BASE_H - toSY(GROUND_Y));
  // 地面顶线
  ctx.fillStyle = '#5a4030';
  ctx.fillRect(0, toSY(GROUND_Y), BASE_W, 6);
  // 地面纹理
  ctx.fillStyle = '#3a2828';
  for (let i = 0; i < 60; i++) {
    const tx = ((i * 80 - cameraX) % (BASE_W + 160) + BASE_W + 160) % (BASE_W + 160) - 80;
    ctx.fillRect(tx, toSY(GROUND_Y) + 10, 40, 5);
  }
  // 地面裂缝
  ctx.fillStyle = '#1a1012';
  for (let i = 0; i < 20; i++) {
    const tx = ((i * 200 - cameraX * 0.9) % (BASE_W + 200) + BASE_W + 200) % (BASE_W + 200) - 100;
    ctx.fillRect(tx, toSY(GROUND_Y) + 30, 2, 30);
  }

  // 平台
  ctx.fillStyle = '#3a4a5a';
  for (const p of platforms) {
    const px = toSX(p.x), py = toSY(p.y);
    if (px + p.w < 0 || px > BASE_W) continue;
    ctx.fillRect(px, py, p.w, p.h);
    ctx.fillStyle = '#5a7088';
    ctx.fillRect(px, py, p.w, 4);
    ctx.fillStyle = '#2a3a4a';
    ctx.fillRect(px, py + p.h - 3, p.w, 3);
    ctx.fillStyle = '#3a4a5a';
  }

  // 武器胶囊
  for (const p of pickups) {
    if (p.taken) continue;
    const flash = Math.sin(performance.now() / 100) * 0.3 + 0.7;
    ctx.globalAlpha = flash;
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(toSX(p.x), toSY(p.y), p.w, p.h);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('P', toSX(p.x) + p.w/2, toSY(p.y) + 12);
    ctx.globalAlpha = 1;
  }

  // 玩家
  if (player) player.draw();

  // 敌人
  for (const e of enemies) e.draw();

  // 子弹
  for (const b of bullets) b.draw();

  // 粒子
  for (const p of particles) p.draw();

  // HUD
  drawHUD();

  // 触屏按键
  if (window.__drawTouch) window.__drawTouch();
}

function drawHUD() {
  if (!player) return;
  // 生命
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('LIFE ' + player.lives, 16, 28);
  // 炸弹
  ctx.fillText('BOMB ' + player.bombs, 16, 50);
  // 得分
  ctx.textAlign = 'right';
  ctx.fillText('SCORE ' + score, BASE_W - 16, 28);
  ctx.fillText('KILLS ' + kills, BASE_W - 16, 50);
  // 武器
  ctx.textAlign = 'left';
  ctx.fillStyle = weaponConfig[player.weapon].color;
  ctx.font = 'bold 14px monospace';
  ctx.fillText('WEAPON: ' + player.weapon.toUpperCase(), 16, BASE_H - 16);
}

// ==================== DOM 事件 ====================
let selectedChar = 'ray';

function bindDOM() {
  // 绘制角色选择卡的像素画立绘
  document.querySelectorAll('.char-card').forEach(card => {
    const canvas = card.querySelector('.char-sprite');
    if (!canvas) return;
    const cctx = canvas.getContext('2d');
    cctx.imageSmoothingEnabled = false;
    cctx.clearRect(0, 0, canvas.width, canvas.height);
    // 立绘稍大, 居中绘制
    drawPixelChar(cctx, 8, 0, 48, 72, card.dataset.char, 1, 0, false);
  });

  document.getElementById('btn-start').addEventListener('click', () => showScreen('screen-char'));
  document.getElementById('btn-howto').addEventListener('click', () => {
    alert('【操作说明】\n\n键盘:\n  A/D 或 ←/→ 移动\n  W/↑/空格 跳跃\n  S/↓ 蹲下 (向下跳)\n  J 射击\n  K 切换武器\n  L 炸弹\n  ↓+跳 滑铲(无敌)\n\n触屏:\n  左摇杆移动\n  右侧: 射/跳/换/炸\n\n目标: 击败 Boss, 通关!');
  });
  document.querySelectorAll('.char-card').forEach(c => {
    c.addEventListener('click', () => {
      document.querySelectorAll('.char-card').forEach(x => x.classList.remove('selected'));
      c.classList.add('selected');
      selectedChar = c.dataset.char;
    });
  });
  document.getElementById('btn-confirm').addEventListener('click', () => {
    hideAllScreens();
    startGame(selectedChar);
  });
  document.getElementById('btn-back').addEventListener('click', () => showScreen('screen-cover'));
  document.getElementById('btn-retry').addEventListener('click', () => { hideAllScreens(); startGame(selectedChar); });
  document.getElementById('btn-menu').addEventListener('click', () => showScreen('screen-cover'));
}

// ==================== 启动 ====================
bindDOM();
setupTouch();
showScreen('screen-cover');
requestAnimationFrame(loop);

})();
