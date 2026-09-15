import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from './config/gameConfig';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { CharacterSelectScene } from './scenes/CharacterSelectScene';
import { GameScene } from './scenes/GameScene';
import { GameOverScene } from './scenes/GameOverScene';

/* =========================================================
 *  终极方案: 完全禁用 Phaser 自动缩放, 手动计算 Letterbox
 *
 *  为什么之前 FIT/RESIZE 都失败:
 *  - FIT + CENTER_BOTH: Phaser 会用 CSS transform + translate 把 canvas
 *    居中, 但移动端横竖屏切换后 canvas 可能被浏览器或 Phaser 改了
 *    pixel size, 再叠加 --vh / 安全区 / DPR 差异 -> 偏移裁切
 *  - RESIZE + NO_CENTER: Phaser resize 时会把 canvas.width/height
 *    (像素属性) 设成 viewport 像素, 再用 CSS width/height 100% 填满,
 *    但 Phaser internal projection 可能和 camera.view bounds 不一致
 *
 *  终极策略 (经验证的最稳方案):
 *  1. Phaser.Scale.NONE —— 彻底禁用 Phaser 所有 scale/mode/autoCenter
 *  2. Phaser config.width/height = GAME_WIDTH × GAME_HEIGHT (固定)
 *  3. 我们自己:
 *     a) 计算视口 scale = min(innerW/GAME_WIDTH, innerH/GAME_HEIGHT)
 *     b) canvas.style.width = GAME_WIDTH * scale + 'px'
 *        canvas.style.height = GAME_HEIGHT * scale + 'px'
 *     c) 居中: canvas.style.left = (innerW - GAME_WIDTH * scale)/2 + 'px'
 *              canvas.style.top  = (innerH - GAME_HEIGHT * scale)/2 + 'px'
 *     d) canvas.style.transform = 'none' (关键!)
 *  4. 这跟 FIT 模式的 letterbox 算法完全一致, 但完全绕过 Phaser 的
 *     ScaleManager 任何 transform/translate 逻辑
 *  5. camera.view 永远是 GAME_WIDTH × GAME_HEIGHT 逻辑世界 ——
 *     所有 Scene 内坐标/UI 用的都是这个逻辑世界坐标, 永远一致
 * ========================================================= */

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-root',
  // 世界逻辑分辨率: 固定 16:9
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: `#${COLORS.bgDark.toString(16).padStart(6, '0')}`,
  scale: {
    // NONE = 彻底禁用 Phaser 自动缩放/居中, 我们自己来
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.NO_CENTER,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
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

/* ---------- 手动 Letterbox 居中 ---------- */
function applyManualLetterbox() {
  const canvas = game.scale.canvas;
  if (!canvas) return;

  const w = window.innerWidth;
  const h = window.innerHeight;

  // letterbox scale: 保持 16:9, 小的那个边贴紧
  const scale = Math.min(w / GAME_WIDTH, h / GAME_HEIGHT);
  const cssW = GAME_WIDTH * scale;
  const cssH = GAME_HEIGHT * scale;

  // 绝对定位居中 —— 不用 transform, 只用 left/top
  canvas.style.position = 'absolute';
  canvas.style.transform = 'none';            // 关键: 禁用一切 transform
  canvas.style.left = ((w - cssW) / 2) + 'px';
  canvas.style.top = ((h - cssH) / 2) + 'px';
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  canvas.style.margin = '0';
  canvas.style.padding = '0';
  canvas.style.display = 'block';

  // 父容器也必须定位 canvas 用 absolute
  const parent = canvas.parentElement;
  if (parent) {
    parent.style.position = 'relative';
    parent.style.width = w + 'px';
    parent.style.height = h + 'px';
    parent.style.overflow = 'hidden';
  }

  // 告诉 Phaser scale manager 视口尺寸 (虽然 NONE 模式下它不做什么)
  game.scale.resize(w, h);
}

function refreshScale() {
  // 等浏览器完成旋转 / 地址栏伸缩
  setTimeout(() => {
    applyManualLetterbox();
    // 通知所有活跃场景 orientationchange, 让它们重排 HUD (如果需要)
    game.scene.getScenes(true).forEach((scene) => {
      scene.events.emit('orientationchange', window.innerWidth, window.innerHeight);
    });
  }, 250);
}

// Phaser ready 后立刻 apply
game.events.once(Phaser.Core.Events.READY, () => {
  applyManualLetterbox();
});

// 监听所有尺寸变化
window.addEventListener('orientationchange', refreshScale);
window.addEventListener('resize', refreshScale);
// iOS Safari: 地址栏伸缩也会触发 orientationchange, 但有时没有
// 再补一个 setTimeout 兜底
window.addEventListener('orientationchange', () => {
  setTimeout(applyManualLetterbox, 500);
});

// visibility change
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    game.scene.getScenes(true).forEach((s) => game.scene.pause(s));
  } else {
    game.scene.getScenes().forEach((s) => {
      if (!s.scene.isActive()) return;
      game.scene.resume(s);
    });
    applyManualLetterbox();
  }
});

document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());
