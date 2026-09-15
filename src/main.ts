import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from './config/gameConfig';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { CharacterSelectScene } from './scenes/CharacterSelectScene';
import { GameScene } from './scenes/GameScene';
import { GameOverScene } from './scenes/GameOverScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-root',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: `#${COLORS.bgDark.toString(16).padStart(6, '0')}`,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 1400 },
      debug: false,
    },
  },
  scene: [
    BootScene,
    PreloadScene,
    MainMenuScene,
    CharacterSelectScene,
    GameScene,
    GameOverScene,
  ],
  render: {
    pixelArt: true,
    antialias: false,
  },
  input: {
    activePointers: 3,
  },
  disableVisibilityChange: false,
} as Phaser.Types.Core.GameConfig;

// 启动游戏
const game = new Phaser.Game(config);

// 旋转/resize 时强制刷新 Phaser 画布
function refreshScale() {
  // 双保险: 先延迟让浏览器完成旋转
  setTimeout(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    game.scale.resize(w, h);
    // FIT 模式下还要 refresh 内部缩放计算
    game.scale.refresh();
    // 通知所有场景 (场景自行处理)
    game.scene.getScenes(true).forEach((scene) => {
      scene.events.emit('orientationchange', w, h);
    });
  }, 150);
}

window.addEventListener('orientationchange', refreshScale);
window.addEventListener('resize', refreshScale);

// visibility change 处理
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // 页面隐藏 — 暂停所有活跃场景
    game.scene.getScenes(true).forEach((s) => game.scene.pause(s));
  } else {
    game.scene.getScenes().forEach((s) => {
      if (!s.scene.isActive()) return;
      game.scene.resume(s);
    });
    refreshScale();
  }
});

// 禁止双击缩放
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());
