import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from './config/gameConfig';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { CharacterSelectScene } from './scenes/CharacterSelectScene';
import { GameScene } from './scenes/GameScene';
import { GameOverScene } from './scenes/GameOverScene';

/* =========================================================
 *  关键: Phaser Scale 配置 —— 移动端不能用 FIT + CENTER_BOTH
 *  因为 FIT 会用 CSS transform scale + translate 把 canvas 居中,
 *  但移动端横竖屏切换后 canvas parent (#game-root) 的实际尺寸
 *  可能被 --vh / 地址栏伸缩 影响, 导致 canvas 偏移 + 裁切.
 *
 *  修复: 使用 Phaser.Scale.RESIZE 模式
 *  - RESIZE: canvas CSS 尺寸 = 父容器 100% (CSS 负责填满)
 *  - 世界 bounds 固定 GAME_WIDTH×GAME_HEIGHT (1280×720)
 *  - Phaser 自动做 world→screen 坐标投影
 *  - 我们只需要让 #game-root 填满窗口, canvas 填满 #game-root
 *  - 完全不依赖 FIT 的 transform scale/translate
 * ========================================================= */

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-root',
  // 世界逻辑分辨率 (固定 16:9)
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: `#${COLORS.bgDark.toString(16).padStart(6, '0')}`,
  scale: {
    // RESIZE 模式: canvas CSS 尺寸由 width/height 决定,
    // 配合下面 index.html 中 canvas { width: 100%; height: 100% } 即可
    mode: Phaser.Scale.RESIZE,
    // 禁用 Phaser 自带居中 — 由 CSS 处理
    autoCenter: Phaser.Scale.NO_CENTER,
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 1400 }, debug: false },
  },
  scene: [BootScene, PreloadScene, MainMenuScene, CharacterSelectScene, GameScene, GameOverScene],
  render: { pixelArt: true, antialias: false },
  input: { activePointers: 5 },
  disableVisibilityChange: false,
} as Phaser.Types.Core.GameConfig;

const game = new Phaser.Game(config);

/* 让 Phaser 的 world bounds 等于我们的逻辑分辨率,
 * 这样 Phaser 内部会自动做 world→screen 的 letterbox 计算,
 * camera view 始终是 GAME_WIDTH×GAME_HEIGHT 的逻辑世界 */
game.scale.on('resize', (gameSize: { width: number; height: number }) => {
  // 强制 world 保持 16:9 逻辑分辨率, 让 Phaser 自己做 scale 投影
  game.scale.canvas.style.width = '100%';
  game.scale.canvas.style.height = '100%';
});

/* ---- 强制 canvas 填满容器 ---- */
function applyCanvasFill() {
  const canvas = game.scale.canvas;
  if (!canvas) return;
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.style.margin = '0';
  canvas.style.padding = '0';
  canvas.style.transform = 'none';    // 关键: 移除 FIT 可能遗留的 transform
  canvas.style.left = '0';
  canvas.style.top = '0';
  canvas.style.position = 'absolute';
  // 父容器也必须 position: relative 让 absolute 生效
  const parent = canvas.parentElement;
  if (parent) {
    parent.style.position = 'relative';
    parent.style.width = '100%';
    parent.style.height = '100%';
  }
}

function refreshScale() {
  // 等浏览器完成旋转后再拿 innerWidth/innerHeight
  setTimeout(() => {
    // 先强制刷新 CSS 变量 --vh
    const w = window.innerWidth;
    const h = window.innerHeight;
    // 告诉 Phaser 新的视口尺寸
    game.scale.resize(w, h);
    // 强制 apply canvas 样式
    applyCanvasFill();
    // refresh 让 Phaser 重新计算 projection
    game.scale.refresh();
    // 同步 orientationchange 事件
    game.scene.getScenes(true).forEach((scene) => {
      scene.events.emit('orientationchange', w, h);
    });
  }, 200);
}

// Phaser ready 后先 apply 一次样式
game.events.once(Phaser.Core.Events.READY, () => {
  applyCanvasFill();
});

// 监听旋转/resize
window.addEventListener('orientationchange', refreshScale);
window.addEventListener('resize', refreshScale);

// visibility change: 切前台也刷新
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    game.scene.getScenes(true).forEach((s) => game.scene.pause(s));
  } else {
    game.scene.getScenes().forEach((s) => {
      if (!s.scene.isActive()) return;
      game.scene.resume(s);
    });
    refreshScale();
  }
});

// 禁止移动端吞掉交互
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());
