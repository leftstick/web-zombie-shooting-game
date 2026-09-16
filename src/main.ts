/**
 * 生化危机 · 横版枪战 — LittleJS 重写版
 *
 * 核心修复:
 * - 相机跟随玩家移动 (x 轴)
 * - 调亮所有颜色, Canvas2D 下清晰可见
 * - 去掉 useWebGL=false 参数 (默认 Canvas2D 路径)
 * - 加 HTML DOM overlay 做封面/角色选择/GameOver
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
  setCanvasClearColor,
} from 'littlejsengine';
import type { Vector2, Color } from 'littlejsengine';
import {
  Player, Zombie, Bullet, Obstacle,
  COLORS, WORLD_WIDTH,
  type ZombieType, type ObstacleType, type CharType,
} from './entities';

// === 游戏状态机 ===
type GameState = 'menu' | 'playing' | 'gameOver';
let gameState: GameState = 'menu';
let selectedChar: CharType = 'leon';

// === 全局游戏变量 ===
let player: Player;
let zombies: Zombie[] = [];
let bullets: Bullet[] = [];
let obstacles: Obstacle[] = [];
let waveNum = 1;
let zombiesRemaining = 0;
let spawnTimer = 0;
let victory = false;
let waveText = '';
let waveTextTimer = 0;

// 相机 y 位置 (固定在地面上方)
const GROUND_LEVEL_Y = -8;

// === DOM 元素 ===
const $ = (id: string) => document.getElementById(id)!;
const overlay = $('overlay');
const screenCover = $('screen-cover');
const screenChar = $('screen-char');
const screenGo = $('screen-go');
const hint = $('hint');
const goTitle = $('go-title');
const goWave = $('go-wave');
const goKills = $('go-kills');
const goScore = $('go-score');

function showScreen(screen: HTMLElement): void {
  [screenCover, screenChar, screenGo].forEach(s => s.classList.add('hidden'));
  screen.classList.remove('hidden');
}

function hideAllScreens(): void {
  [screenCover, screenChar, screenGo].forEach(s => s.classList.add('hidden'));
}

function bindOverlayEvents(): void {
  // 封面 → 角色选择
  $('btn-start').addEventListener('click', () => showScreen(screenChar));

  // 封面 → 操作说明 (简单 alert)
  $('btn-howto').addEventListener('click', () => {
    alert(
      '【操作说明】\n\n' +
      '触屏:\n' +
      '· 左摇杆 移动\n' +
      '· 右按钮① 射击 ②跳跃 ③换弹\n\n' +
      '键盘:\n' +
      '· ←/→ 或 A/D 移动\n' +
      '· ↑/W/Space 跳跃\n' +
      '· J 射击  R 换弹\n\n' +
      '目标: 击退 3 波僵尸, 生存到最后!'
    );
  });

  // 角色选择卡片
  document.querySelectorAll('.char-card').forEach(cardEl => {
    const card = cardEl as HTMLElement;
    card.addEventListener('click', () => {
      document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedChar = card.dataset.char as CharType;
    });
  });

  // 确认出击 → 开始游戏
  $('btn-confirm').addEventListener('click', () => {
    hideAllScreens();
    hint.style.display = 'none';
    gameState = 'playing';
    // 小延迟让 overlay 消失后再启动游戏
    setTimeout(() => startGame(), 50);
  });

  // 返回封面
  $('btn-back').addEventListener('click', () => showScreen(screenCover));

  // Game Over → 再战
  $('btn-retry').addEventListener('click', () => {
    hideAllScreens();
    gameState = 'playing';
    setTimeout(() => startGame(), 50);
  });

  // Game Over → 主菜单
  $('btn-menu').addEventListener('click', () => {
    gameState = 'menu';
    showScreen(screenCover);
    hint.style.display = '';
  });
}

// === 引擎初始化 ===
function gameInit(): void {
  // 绑定 DOM 事件
  bindOverlayEvents();

  // Canvas2D 清屏色 (深灰, 不是纯黑)
  setCanvasClearColor(new LJ.Color(0.08, 0.06, 0.10));

  // 触屏手柄
  setTouchGamepadEnable(true);
  setTouchGamepadButtonCount(3);
  setTouchGamepadLeftStick(true);
  setTouchGamepadAnalog(true);
  setTouchGamepadAlpha(0.5);
  setTouchGamepadSize(80);
  setTouchGamepadVibration(30);
  setVibrateEnable(true);

  // 画面
  setCanvasPixelated(true);
  setTilesPixelated(true);
  setCanvasMaxSize(vec2(1280, 720));
  LJ.setCameraScale(32);

  // 物理
  LJ.setGravity(vec2(0, -0.012));
  setObjectDefaultDamping(0.9);
  setObjectDefaultFriction(0.3);

  // 初始停在菜单
  gameState = 'menu';
  showScreen(screenCover);
}

function startGame(): void {
  // 清除所有旧对象
  LJ.engineObjectsDestroy(true);
  zombies = [];
  bullets = [];
  obstacles = [];
  victory = false;
  waveNum = 1;
  zombiesRemaining = 4;
  spawnTimer = 120;

  // 相机初始位置
  LJ.setCameraPos(vec2(10, GROUND_LEVEL_Y + 3));

  // 创建地面 (大静态物体)
  const ground = new Obstacle(
    vec2(WORLD_WIDTH / 2, GROUND_LEVEL_Y - 4),
    vec2(WORLD_WIDTH, 8),
    'container'
  );
  ground.color = COLORS.ground;

  createObstacles();

  // 创建玩家 (初始位置偏左, 给相机跟随留出空间)
  player = new Player(vec2(10, 0), selectedChar);
  showWaveText('WAVE 1');
}

function createObstacles(): void {
  const obsData: { x: number; type: ObstacleType }[] = [
    { x: 50,  type: 'barrel' },
    { x: 75,  type: 'car' },
    { x: 110, type: 'barrel' },
    { x: 135, type: 'container' },
    { x: 170, type: 'car' },
    { x: 200, type: 'barrel' },
    { x: 230, type: 'container' },
    { x: 265, type: 'car' },
    { x: 300, type: 'barrel' },
    { x: 330, type: 'container' },
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
  // 没有开始/没有 player, 不做游戏逻辑
  if (gameState !== 'playing' || !player) return;

  // 相机跟随玩家 x 轴, 限制在世界范围内
  if (!player.destroyed) {
    const targetCamX = Math.max(5, Math.min(WORLD_WIDTH - 5, player.pos.x));
    // 平滑跟随
    const cur = LJ.cameraPos;
    LJ.setCameraPos(
      vec2(cur.x + (targetCamX - cur.x) * 0.1, GROUND_LEVEL_Y + 3)
    );
  }

  if (player.destroyed && gameState === 'playing') {
    // Player.destroy() 在 HP<=0 时被调用, 这里检查是否要结束游戏
    // (由下面的 hp<=0 处理)
  }

  // === 移动 ===
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

  // === 碰撞 ===
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

  // 清理
  bullets = bullets.filter(b => !b.destroyed);
  zombies = zombies.filter(z => !z.destroyed);
  obstacles = obstacles.filter(o => !o.destroyed);

  if (player.hp <= 0 && gameState === 'playing') {
    gameState = 'gameOver';
    player.destroy();
    showGameOver(false);
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
      gameState = 'gameOver';
      showGameOver(true);
    }
  }

  if (waveTextTimer > 0) waveTextTimer--;
}

function showGameOver(won: boolean): void {
  goTitle.textContent = won ? '★ 胜 利 ★' : '你 已 倒 下';
  goTitle.className = 'go-title ' + (won ? 'win' : 'dead');
  goWave.textContent = String(waveNum);
  goKills.textContent = String(player.kills);
  goScore.textContent = String(player.score);
  // 延迟一下让玩家看到倒地状态
  setTimeout(() => showScreen(screenGo), 800);
}

function overlap(a: { pos: Vector2; size: Vector2 }, b: { pos: Vector2; size: Vector2 }): boolean {
  return Math.abs(a.pos.x - b.pos.x) < (a.size.x + b.size.x) / 2 &&
         Math.abs(a.pos.y - b.pos.y) < (a.size.y + b.size.y) / 2;
}

function spawnZombie(): void {
  const side = Math.random() < 0.5 ? 'left' : 'right';
  const camX = LJ.cameraPos.x;
  const x = side === 'left'
    ? Math.max(2, camX - 30 - Math.random() * 15)
    : Math.min(WORLD_WIDTH - 2, camX + 30 + Math.random() * 15);
  const y = GROUND_LEVEL_Y + 2;

  let type: ZombieType = 'normal';
  const r = Math.random();
  if (waveNum >= 3 && r < 0.2) type = 'tank';
  else if (waveNum >= 2 && r < 0.45) type = 'fast';

  zombies.push(new Zombie(vec2(x, y), type, waveNum));
}

// === 渲染前: 背景世界 ===
function gameRender(): void {
  // 天空渐变 (从上到下)
  drawSkyGradient();

  // 远景建筑剪影 (多层视差)
  for (let i = 0; i < 25; i++) {
    const baseX = i * 18;
    const parallax = LJ.cameraPos.x * 0.15;
    const bx = baseX - (parallax % 18);
    const bh = 6 + Math.sin(i * 1.3) * 5 + (i % 3) * 2;
    LJ.drawRect(
      vec2(bx, GROUND_LEVEL_Y + bh / 2),
      vec2(14, bh),
      COLORS.farBuilding
    );
  }
  for (let i = 0; i < 20; i++) {
    const baseX = i * 25;
    const parallax = LJ.cameraPos.x * 0.35;
    const bx = baseX - (parallax % 25);
    const bh = 10 + Math.sin(i * 2.1) * 6;
    LJ.drawRect(
      vec2(bx, GROUND_LEVEL_Y + bh / 2),
      vec2(18, bh),
      COLORS.midBuilding
    );
  }

  // 地面 (分成两段, 相机两侧各一段)
  const camX = LJ.cameraPos.x;
  // 相机左段
  LJ.drawRect(
    vec2(camX - 500, GROUND_LEVEL_Y - 4),
    vec2(1000, 8),
    COLORS.ground
  );
  // 地面亮线
  LJ.drawRect(
    vec2(camX - 500, GROUND_LEVEL_Y),
    vec2(1000, 0.4),
    COLORS.groundTop
  );

  // 地面裂缝/细节 (小色块)
  for (let i = 0; i < 15; i++) {
    const baseX = i * 14;
    const parallax = camX * 0.8;
    const dx = baseX - (parallax % 14);
    LJ.drawRect(
      vec2(dx, GROUND_LEVEL_Y + 0.15),
      vec2(2, 0.1),
      COLORS.groundLine
    );
  }
}

function drawSkyGradient(): void {
  // 用 drawRectGradient 从上到下画天空
  LJ.drawRectGradient(
    vec2(LJ.cameraPos.x, GROUND_LEVEL_Y + 15),
    vec2(WORLD_WIDTH + 1000, 30),
    COLORS.skyTop,
    COLORS.skyBottom
  );
}

// === 渲染后: HUD ===
function gameRenderPost(): void {
  if (gameState !== 'playing' || !player || player.destroyed) return;

  const screenW = LJ.mainCanvasSize.x;
  const screenH = LJ.mainCanvasSize.y;

  // HP 条
  const hpW = 200, hpH = 18, hpX = 16, hpY = 16;
  drawRectScreen(vec2(hpX + hpW / 2, hpY + hpH / 2), vec2(hpW, hpH), COLORS.hpBg);
  const hpR = Math.max(0, player.hp / player.maxHp);
  drawRectScreen(vec2(hpX + hpW * hpR / 2, hpY + hpH / 2), vec2(hpW * hpR, hpH),
    hpR > 0.3 ? COLORS.hp : new LJ.Color(1, 0.5, 0.3));
  LJ.drawTextScreen(`HP ${Math.ceil(player.hp)}/${player.maxHp}`, vec2(hpX + 8, hpY + 3), 13,
    new LJ.Color(1, 1, 1), 1, new LJ.Color(0, 0, 0), 'left', 'monospace', 'bold');

  // 弹药
  if (player.reloading) {
    LJ.drawTextScreen('RELOADING...', vec2(16, 42), 16, new LJ.Color(1, 0.8, 0.2),
      1, new LJ.Color(0, 0, 0), 'left', 'monospace', 'bold');
    const rpW = 160;
    drawRectScreen(vec2(16 + rpW / 2, 64), vec2(rpW, 5), COLORS.hpBg);
    drawRectScreen(vec2(16 + rpW * player.reloadProgress / 2, 64),
      vec2(rpW * player.reloadProgress, 5), new LJ.Color(0.5, 0.8, 1));
  } else {
    LJ.drawTextScreen(`弹药 ${player.ammo}/${player.maxAmmo}`, vec2(16, 42), 18,
      new LJ.Color(1, 0.92, 0.2), 1, new LJ.Color(0, 0, 0), 'left', 'monospace', 'bold');
  }

  // 得分 + 波次
  LJ.drawTextScreen(`SCORE ${player.score}  KILLS ${player.kills}`,
    vec2(screenW - 16, 16), 18, new LJ.Color(1, 1, 1),
    1, new LJ.Color(0, 0, 0), 'right', 'monospace', 'bold');
  LJ.drawTextScreen(`WAVE ${waveNum}  剩余 ${zombiesRemaining + zombies.length}`,
    vec2(screenW - 16, 42), 14, COLORS.accent,
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
    for (let i = 0; i < 3; i++) {
      const bx = screenW - 60 - i * 65;
      LJ.drawTextScreen(labels[i], vec2(bx, screenH - 55), 18,
        new LJ.Color(1, 1, 1), 2, new LJ.Color(0, 0, 0, 0.5), 'center', 'monospace', 'bold');
    }
  }
}

function drawRectScreen(pos: Vector2, size: Vector2, color: Color): void {
  LJ.drawRect(pos, size, color, 0, true, true);
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
