/**
 * 游戏全局常量
 */

// 设计分辨率 (横屏 16:9)
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

// 物理世界 (关卡比屏幕宽, 可横向滚动)
export const WORLD_WIDTH = 4096;
export const WORLD_HEIGHT = GAME_HEIGHT;

// 地面高度 (距离画布底部)
export const GROUND_HEIGHT = 120;

// 颜色主题 (生化危机暗黑风)
export const COLORS = {
  bgDark: 0x0a0a0c,
  bgMid: 0x16161a,
  ground: 0x2b2b30,
  groundTop: 0x3a3a42,
  player: 0x4fc3f7,
  leon: 0x5dade2,
  claire: 0xff7043,
  ada: 0xee2a4a,
  zombie: 0x6b8e23,
  zombieDark: 0x3e5012,
  bullet: 0xffeb3b,
  blood: 0xb71c1c,
  hp: 0xe53935,
  hpBg: 0x424242,
  ammo: 0xffeb3b,
  ui: 0xe0e0e0,
  accent: 0xff1744,
};

// 游戏状态键 (用于 localStorage / 场景间传值)
export const STORAGE_KEYS = {
  selectedCharacter: 'bio_selected_character',
  highScore: 'bio_high_score',
};
