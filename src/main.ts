/**
 * 生化危机 · 横版枪战 — LittleJS 重写版
 *
 * 关键改进: 使用 LittleJS 内置触屏手柄, 彻底告别手写按钮坐标 bug
 * - touchGamepadEnable = true → 引擎自动渲染虚拟摇杆 + 按钮
 * - gamepadStick(0) 获取移动方向
 * - gamepadWasPressed(0/1/2) 检测射击/跳跃/换弹
 */
import * as LJ from 'littlejsengine';
import {
  vec2,
  setTouchGamepadEnable,
  setTouchGamepadButtonCount,
  setTouchGamepadLeftStick,
  setTouchGamepadAnalog,
  setTouchGamepadAlpha,
  setTouchGamepadSize,
  setTouchGamepadVibration,
  setVibrateEnable,
  setCanvasPixelated,
  setTilesPixelated,
  setCanvasMaxSize,
  setObjectDefaultDamping,
  setObjectDefaultFriction,
} from 'littlejsengine';
import type { Vector2, Color } from 'littlejsengine';
import {
  Player, Zombie, Bullet, Obstacle,
  COLORS, WORLD_WIDTH,
  type ZombieType, type ObstacleType,
} from './entities';

// === 全局游戏状态 ===
let player: Player;
let zombies: Zombie[] = [];
let bullets: Bullet[] = [];
let obstacles: Obstacle[] = [];
let waveNum = 1;
let zombiesRemaining = 0;
let spawnTimer = 0;
let gameOver = false;
let victory = false;
let gameStarted = false;
let waveText = '';
let waveTextTimer = 0;

const GROUND_LEVEL_Y = -8;

// === 引擎初始化 ===
function gameInit(): void {
  // 触屏手柄 — LittleJS 内置, 自动渲染 + 处理坐标
  setTouchGamepadEnable(true);
  setTouchGamepadButtonCount(3);
  setTouchGamepadLeftStick(true);
  setTouchGamepadAnalog(true);
  setTouchGamepadAlpha(0.5);
  setTouchGamepadSize(80);
  setTouchGamepadVibration(30);
  setVibrateEnable(true);

  // 画面设置
  setCanvasPixelated(true);
  setTilesPixelated(true);
  setCanvasMaxSize(vec2(1280, 720));
  LJ.setCameraScale(32);

  // 物理设置
  LJ.setGravity(vec2(0, -0.012));
  setObjectDefaultDamping(0.9);
  setObjectDefaultFriction(0.3);

  startGame();
}

function startGame(): void {
  LJ.engineObjectsDestroy(true);
  zombies = [];
  bullets = [];
  obstacles = [];
  gameOver = false;
  victory = false;
  waveNum = 1;
  zombiesRemaining = 4;
  spawnTimer = 120;

  // 创建地面 (大静态物体)
  const ground = new Obstacle(
    vec2(WORLD_WIDTH / 2, GROUND_LEVEL_Y - 4),
    vec2(WORLD_WIDTH, 8),
    'container'
  );
  ground.color = COLORS.ground;

  createObstacles();

  player = new Player(vec2(20, 0));
  gameStarted = true;
  showWaveText('WAVE 1');
}

function createObstacles(): void {
  const obsData: { x: number; type: ObstacleType }[] = [
    { x: 60,  type: 'barrel' },
    { x: 85,  type: 'car' },
    { x: 120, type: 'barrel' },
    { x: 145, type: 'container' },
    { x: 180, type: 'car' },
    { x: 210, type: 'barrel' },
    { x: 240, type: 'container' },
    { x: 275, type: 'car' },
    { x: 310, type: 'barrel' },
    { x: 340, type: 'container' },
  ];
  for (const o of obsData) {
    let w: number, h: number;
    switch (o.type) {
      case 'barrel': w = 2; h = 3; break;
      case 'container': w = 6; h = 5; break;
      case 'car': w = 5; h = 3; break;
    }
    const obs = new Obstacle(
      vec2(o.x, GROUND_LEVEL_Y + h / 2),
      vec2(w, h),
      o.type
    );
    obstacles.push(obs);
  }
}

function showWaveText(text: string): void {
  waveText = text;
  waveTextTimer = 120;
}

// === 每帧更新 ===
function gameUpdate(): void {
  if (!gameStarted || gameOver) {
    if (gameOver && (LJ.keyWasPressed('Space') || LJ.gamepadWasPressed(9))) {
      startGame();
    }
    return;
  }

  // === 移动 (触屏摇杆 or 键盘) ===
  const stick = LJ.gamepadStick(0);
  let moveDir = stick.x;
  if (LJ.keyIsDown('ArrowLeft') || LJ.keyIsDown('KeyA')) moveDir = -1;
  else if (LJ.keyIsDown('ArrowRight') || LJ.keyIsDown('KeyD')) moveDir = 1;
  player.move(moveDir);

  // === 跳跃 ===
  if (LJ.gamepadWasPressed(1) || LJ.keyWasPressed('ArrowUp') || LJ.keyWasPressed('KeyW') || LJ.keyWasPressed('Space')) {
    player.jump();
  }

  // === 射击 ===
  if (LJ.gamepadIsDown(0) || LJ.keyIsDown('KeyJ')) {
    player.tryFire();
  }

  // === 换弹 ===
  if (LJ.gamepadWasPressed(2) || LJ.keyWasPressed('KeyR')) {
    player.startReload();
  }

  // === 僵尸 AI ===
  for (const z of zombies) {
    if (!z.destroyed) z.setPlayer(player);
  }

  // === 碰撞检测 (手动 AABB) ===
  // 子弹 vs 僵尸
  for (const b of bullets) {
    if (b.destroyed) continue;
    for (const z of zombies) {
      if (z.destroyed) continue;
      if (overlap(b, z)) {
        z.takeDamage(b.damage);
        b.destroy();
        if (z.hp <= 0) {
          player.score += z.score;
          player.kills++;
          if (Math.random() < 0.2) {
            if (Math.random() < 0.5) player.heal(20);
            else player.addAmmo(15);
          }
        }
        break;
      }
    }
  }
  // 子弹 vs 障碍物
  for (const b of bullets) {
    if (b.destroyed) continue;
    for (const o of obstacles) {
      if (o.destroyed) continue;
      if (overlap(b, o)) {
        o.takeDamage(b.damage);
        b.destroy();
        break;
      }
    }
  }
  // 僵尸 vs 玩家
  for (const z of zombies) {
    if (z.destroyed) continue;
    if (overlap(z, player)) {
      if (z.canAttack()) {
        player.takeDamage(z.damage);
        const dir = Math.sign(player.pos.x - z.pos.x) || 1;
        player.velocity.x = dir * 0.25;
        player.velocity.y = 0.15;
      }
    }
  }

  // 清理销毁的对象
  bullets = bullets.filter(b => !b.destroyed);
  zombies = zombies.filter(z => !z.destroyed);
  obstacles = obstacles.filter(o => !o.destroyed);

  if (player.hp <= 0) {
    gameOver = true;
    player.destroy();
  }

  // 波次生成
  if (zombiesRemaining > 0) {
    spawnTimer--;
    if (spawnTimer <= 0) {
      spawnZombie();
      zombiesRemaining--;
      spawnTimer = 80 - Math.min(waveNum * 5, 40);
    }
  } else if (zombies.length === 0) {
    if (waveNum < 3) {
      waveNum++;
      zombiesRemaining = 3 + waveNum;
      spawnTimer = 120;
      showWaveText(`WAVE ${waveNum}`);
    } else {
      victory = true;
      gameOver = true;
    }
  }

  if (waveTextTimer > 0) waveTextTimer--;
}

function overlap(a: { pos: Vector2; size: Vector2 }, b: { pos: Vector2; size: Vector2 }): boolean {
  return Math.abs(a.pos.x - b.pos.x) < (a.size.x + b.size.x) / 2 &&
         Math.abs(a.pos.y - b.pos.y) < (a.size.y + b.size.y) / 2;
}

function spawnZombie(): void {
  const side = Math.random() < 0.5 ? 'left' : 'right';
  const x = side === 'left'
    ? Math.max(2, player.pos.x - 40 - Math.random() * 20)
    : Math.min(WORLD_WIDTH - 2, player.pos.x + 40 + Math.random() * 20);
  const y = GROUND_LEVEL_Y + 2;

  let type: ZombieType = 'normal';
  const r = Math.random();
  if (waveNum >= 3 && r < 0.2) type = 'tank';
  else if (waveNum >= 2 && r < 0.45) type = 'fast';

  zombies.push(new Zombie(vec2(x, y), type, waveNum));
}

// === 渲染前: 背景世界 ===
function gameRender(): void {
  if (!gameStarted) return;

  const targetX = player.destroyed ? LJ.cameraPos.x : player.pos.x;
  LJ.setCameraPos(vec2(targetX, GROUND_LEVEL_Y + 3));

  // 天空背景
  LJ.drawRect(
    vec2(LJ.cameraPos.x, GROUND_LEVEL_Y + 10),
    vec2(WORLD_WIDTH, 30),
    COLORS.bg, 0, false
  );

  // 远景建筑剪影
  for (let i = 0; i < 20; i++) {
    const bx = i * 25 + (LJ.cameraPos.x * 0.1 % 25);
    const bh = 8 + Math.sin(i * 1.7) * 4;
    LJ.drawRect(
      vec2(bx, GROUND_LEVEL_Y + bh / 2),
      vec2(18, bh),
      new LJ.Color(0.08, 0.08, 0.12), 0, false
    );
  }

  // 地面
  LJ.drawRect(
    vec2(LJ.cameraPos.x, GROUND_LEVEL_Y - 4),
    vec2(WORLD_WIDTH, 8),
    COLORS.ground, 0, false
  );
  LJ.drawRect(
    vec2(LJ.cameraPos.x, GROUND_LEVEL_Y),
    vec2(WORLD_WIDTH, 0.3),
    COLORS.groundTop, 0, false
  );
}

// === 渲染后: HUD ===
function gameRenderPost(): void {
  if (!gameStarted) return;

  const screenW = LJ.mainCanvasSize.x;
  const screenH = LJ.mainCanvasSize.y;

  if (gameOver) {
    const text = victory ? '★ 胜利! 浣熊市突围成功 ★' : '你已倒下...';
    const color = victory ? COLORS.accent : new LJ.Color(0.8, 0.2, 0.2);
    LJ.drawTextScreen(text, vec2(screenW / 2, screenH / 2 - 20), 48, color,
      4, new LJ.Color(0, 0, 0), 'center', 'monospace', 'bold');
    LJ.drawTextScreen(`得分 ${player.score}  击杀 ${player.kills}`,
      vec2(screenW / 2, screenH / 2 + 20), 24, new LJ.Color(1, 1, 1),
      2, new LJ.Color(0, 0, 0), 'center', 'monospace', 'bold');
    LJ.drawTextScreen('按 SPACE 或触屏重新开始',
      vec2(screenW / 2, screenH / 2 + 60), 16, new LJ.Color(0.7, 0.7, 0.7),
      1, new LJ.Color(0, 0, 0), 'center', 'monospace');
    return;
  }

  // HP 条
  const hpW = 200, hpH = 16, hpX = 16, hpY = 16;
  drawRectScreen(vec2(hpX + hpW / 2, hpY + hpH / 2), vec2(hpW, hpH), COLORS.hpBg);
  const hpR = Math.max(0, player.hp / player.maxHp);
  drawRectScreen(vec2(hpX + hpW * hpR / 2, hpY + hpH / 2), vec2(hpW * hpR, hpH),
    hpR > 0.3 ? COLORS.hp : new LJ.Color(0.9, 0.3, 0.3));
  LJ.drawTextScreen(`HP ${Math.ceil(player.hp)}/${player.maxHp}`, vec2(hpX + 8, hpY + 2), 12,
    new LJ.Color(1, 1, 1), 1, new LJ.Color(0, 0, 0), 'left', 'monospace', 'bold');

  // 弹药
  if (player.reloading) {
    LJ.drawTextScreen('RELOADING...', vec2(16, 40), 16, new LJ.Color(1, 0.8, 0.2),
      1, new LJ.Color(0, 0, 0), 'left', 'monospace', 'bold');
    const rpW = 160;
    drawRectScreen(vec2(16 + rpW / 2, 62), vec2(rpW, 4), COLORS.hpBg);
    drawRectScreen(vec2(16 + rpW * player.reloadProgress / 2, 62),
      vec2(rpW * player.reloadProgress, 4), new LJ.Color(0.5, 0.8, 1));
  } else {
    LJ.drawTextScreen(`弹药 ${player.ammo}/${player.maxAmmo}`, vec2(16, 40), 18,
      new LJ.Color(1, 0.85, 0.1), 1, new LJ.Color(0, 0, 0), 'left', 'monospace', 'bold');
  }

  // 得分 + 波次
  LJ.drawTextScreen(`SCORE ${player.score}  KILLS ${player.kills}`,
    vec2(screenW - 16, 16), 18, new LJ.Color(1, 1, 1),
    1, new LJ.Color(0, 0, 0), 'right', 'monospace', 'bold');
  LJ.drawTextScreen(`WAVE ${waveNum}  剩余 ${zombiesRemaining + zombies.length}`,
    vec2(screenW - 16, 40), 14, COLORS.accent,
    1, new LJ.Color(0, 0, 0), 'right', 'monospace', 'bold');

  // 波次提示
  if (waveTextTimer > 0) {
    const alpha = waveTextTimer < 30 ? waveTextTimer / 30 : 1;
    const c = new LJ.Color(1, 0.09, 0.27, alpha);
    LJ.drawTextScreen(waveText, vec2(screenW / 2, screenH / 2 - 60), 36, c,
      3, new LJ.Color(0, 0, 0, alpha), 'center', 'monospace', 'bold');
  }

  // 触屏按钮标签
  if (LJ.isTouchDevice) {
    const labels = ['射', '跳', '弹'];
    const labelColors = [new LJ.Color(1, 1, 1), new LJ.Color(1, 1, 1), new LJ.Color(0.13, 0.13, 0.13)];
    for (let i = 0; i < 3; i++) {
      const bx = screenW - 60 - i * 65;
      LJ.drawTextScreen(labels[i], vec2(bx, screenH - 55), 18, labelColors[i],
        2, new LJ.Color(0, 0, 0, 0.5), 'center', 'monospace', 'bold');
    }
  }
}

function drawRectScreen(pos: Vector2, size: Vector2, color: Color): void {
  LJ.drawRect(pos, size, color, 0, false, true);
}

// === 启动引擎 ===
LJ.engineInit(
  gameInit,
  gameUpdate,
  () => {},
  gameRender,
  gameRenderPost,
  []
);
