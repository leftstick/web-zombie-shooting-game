/**
 * 像素艺术生成器 —— 暴徒猎手风格
 *
 * 关键修复: 调色板必须全部用**单字符**代号!
 *   art 数组里每个像素 = 1 个字符, 调色板 key 也必须是 1 个字符
 *   之前用 hh/hm/hs 这种双字符代号, 在 art 数组里 h 查不到颜色 → 全黑
 *
 * 单字符调色板 (所有角色通用映射约定):
 *   K = 轮廓/最暗
 *   H = 头发高光
 *   I = 头发主色
 *   J = 头发阴影
 *   L = 皮肤高光
 *   M = 皮肤主色
 *   N = 皮肤阴影
 *   E = 眼白
 *   P = 瞳孔色
 *   T = 衣服高光 (制服/旗袍/夹克)
 *   U = 衣服主色
 *   V = 衣服阴影
 *   G = 战术背心/护甲 (叠在衣服外)
 *   R = 护膝/护腕 (深灰)
 *   B = 腰带
 *   Q = 枪身主色
 *   C = 枪身高光 (金属)
 *   O = 靴子
 *   W = 手套/枪套/内搭
 *   X = 裤子/黑丝
 *   A = 特亮 (徽章/金属反光)
 *   F = 枪口闪光
 *   Z = 血
 *   Y = 皮肤特亮
 */
import Phaser from 'phaser';

export const PX = 3;

function renderArt(
  gfx: Phaser.GameObjects.Graphics,
  art: string[],
  palette: Record<string, number>,
  px = PX
): { w: number; h: number } {
  const rows = art.length;
  const cols = Math.max(...art.map(r => r.length));
  for (let y = 0; y < rows; y++) {
    const row = art[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const color = palette[ch];
      if (color === undefined) continue;
      gfx.fillStyle(color, 1);
      gfx.fillRect(x * px, y * px, px, px);
    }
  }
  return { w: cols * px, h: rows * px };
}

/* ============================================================
 *  调色板 —— 单字符代号!
 * ============================================================ */

function leonPalette(): Record<string, number> {
  return {
    K: 0x080808,
    H: 0xc8a060, I: 0x8b6838, J: 0x5a4020,  // 金发
    L: 0xf4d4a8, M: 0xe0b080, N: 0x9a6a40, Y: 0xffe8c8,  // 皮肤
    E: 0xffffff, P: 0x1a3a6a,  // 蓝眼
    T: 0x2a4a7a, U: 0x1a3a5c, V: 0x0d2033,  // 蓝制服
    G: 0x7a7a7a,  // 灰战术背心
    R: 0x3a3a3a,  // 护膝
    B: 0x4a3520,  // 腰带
    Q: 0x3a3a3a, C: 0x8a8a8a,  // 手枪
    O: 0x1a1a1a,  // 靴
    W: 0x3a2510,  // 手套
    X: 0x1a1f30,  // 裤
    A: 0xffd700,  // RPD 徽章
    F: 0xfff176,
  };
}

function clairePalette(): Record<string, number> {
  return {
    K: 0x080808,
    H: 0xef5350, I: 0xc62828, J: 0x8e1414,  // 红发马尾
    L: 0xf4d4a8, M: 0xe0b080, N: 0x9a6a40, Y: 0xffe8c8,
    E: 0xffffff, P: 0x2e7d32,  // 绿眼
    T: 0xef5350, U: 0xc62828, V: 0x8e1414,  // 红夹克
    G: 0x4a4a4a,  // 护肩
    R: 0x1a1a1a,  // 护膝
    B: 0x1a1a1a,  // 腰带
    Q: 0x2a2a2a, C: 0x7a7a7a,  // SMG
    O: 0x3e2723,  // 靴
    W: 0x1a1a1a,  // 手套
    X: 0x1a1a1a,  // 黑裤
    F: 0xfff176,
  };
}

function adaPalette(): Record<string, number> {
  return {
    K: 0x080808,
    H: 0x3a3a3a, I: 0x1a1a1a, J: 0x050505,  // 黑发髻
    L: 0xf4d4a8, M: 0xe0b080, N: 0x9a6a40, Y: 0xffe8c8,
    E: 0xffffff, P: 0xb71c1c,  // 红眼
    T: 0xd32f2f, U: 0xb71c1c, V: 0x7f1010,  // 红旗袍
    G: 0x4a4a4a,
    R: 0x1a1a1a,
    B: 0x1a1a1a,
    Q: 0x3e2723, C: 0x8d6e63,  // 左轮金属
    O: 0x1a0e08,
    W: 0x050505,
    X: 0x0a0a0a,  // 黑丝
    A: 0xffd700,  // 旗袍盘扣
    F: 0xfff176,
  };
}

/* ============================================================
 *  里昂 站姿 (40×50)
 * ============================================================ */
const LEON_STAND = [
  '........................................',
  '......KKKKKKKKKK.......................',  // 1 头发顶
  '....KHHHHHHHHHHHK......................',  // 2 金发高光
  '....KHHHHHHHHIIMK......................',  // 3 金发+额头
  '....KHHIIIIIIIIIMK.....................',  // 4 头发过渡
  '....KIIIIIIMMMMMK......................',  // 5 额头皮肤
  '....KIIIIIIMMMMMK......................',  // 6 金发刘海遮额头
  '....KMMNMMMMNMMMK......................',  // 7 眼圈阴影
  '....KMMEEPMEMEEMMK.....................',  // 8 眼白+蓝瞳孔
  '....KMMNMMMMMMMMK......................',  // 9 眼下
  '....KMMMMMMMMMMMK......................',  // 10 脸颊
  '....KYYMMMMMMYYK.......................',  // 11 嘴唇
  '......KKKKKKK..........................',  // 12 下巴
  '.......KKK.............................',  // 13 脖子
  '....KKKKMMMMKKKK.......................',  // 14 肩
  '...KGGGGGGGGGGGK.......QQQQQQ..........',  // 15 战术背心+枪
  '...KGGTGGGTGGTGGK.....QCCCCQC.........',  // 16 装甲板+枪管高光
  '...KGGGGGGGGGGGK.....QCCCCQC..........',  // 17
  '...KGGGGGGGGGGGK.....QQQQQQQ..........',  // 18
  '...KGGGGGGGGGGGK.....QQQQQQQQ.........',  // 19
  '...KGGGGGGGGGGGK.....QQQQQQQQQ........',  // 20
  '...KGGGGGGGGGGGK......QQQQQQQ.........',  // 21
  '...KGGGGGGGGGGGK.......QQQQQQ.........',  // 22
  '....KMMMMMMMMMK.........KKKKK..........',  // 23 手臂/手
  '....KWWWWWWWWK.........................',  // 24 另一只手套
  '....KKKKKKKKKKK........................',  // 25 躯干底
  '....KBBBBBBBBBBK........................',  // 26 腰带
  '....KKKKKKKKKKK........................',  // 27
  '....KTTTTTTTTTTK........................',  // 28 蓝裤上
  '....KTTTTTTTTTTK........................',  // 29
  '....KTTTTTTTTTTK........................',  // 30
  '....KVVVVVVVVVK.........................',  // 31 裤阴影
  '...KRRRRRRRRRRK.........................',  // 32 护膝
  '...KRKKKKKKKKRK.........................',  // 33 护膝细节
  '...KRRRRRRRRRRK.........................',  // 34
  '....KTTTTTTTTTK.........................',  // 35 裤下
  '....KTTTTTTTTTK.........................',  // 36
  '....KVVVVVVVVVK.........................',  // 37
  '....KTTTTTTTTTK.........................',  // 38 前腿
  '....KVVVVVVVVVK.........................',  // 39
  '....KKKKKKKKKKK.........................',  // 40 裤脚
  '...KOOOOOOOOOOK.........................',  // 41 靴
  '...KOOCOOCOOCOK.........................',  // 42 鞋带
  '...KOOOOOOOOOOK.........................',  // 43
  '...KKKKKKKKKKKK.........................',  // 44 靴底
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
];

/* Leon 瞄准 — 身体前倾, 枪前伸 */
const LEON_AIM = [
  '........................................',
  '......KKKKKKKKKK.......................',
  '....KHHHHHHHHHHHK......................',
  '....KHHHHHHHHIIMK......................',
  '....KHHIIIIIIIIIMK.....................',
  '....KIIIIIIMMMMMK......................',
  '....KIIIIIIMMMMMK......................',
  '....KMMNMMMMNMMMK......................',
  '....KMMEEPMEMEEMMK.....................',
  '....KMMNMMMMMMMMK......................',
  '....KMMMMMMMMMMMK......................',
  '....KYYMMMMMMYYK.......................',
  '......KKKKKKK..........................',
  '.......KKK.............................',
  '....KKKKMMMMKKKKKKKKKKKKKKKKKKK........',  // 14 肩前倾
  '...KGGGGGGGGGGGGGGGGGGGGGGGGGGGKKKKKKK.',  // 15 战术背心+手臂完全前伸
  '...KGGGGGGGGGGGGQQQQQQQQQQQQQQQQQQQQQQQ',  // 16 枪全长
  '...KGGTGGGTGGTGGGQCCCCCCCCCCCCCCCCCCCC',  // 17 装甲板+枪管金属
  '...KGGGGGGGGGGGGQQQQQQQQQQQQQQQQQQQQQQQ',  // 18
  '...KGGGGGGGGGGGGQQQQQQQQQQQQQQQQQQQQQQQ',  // 19
  '...KGGGGGGGGGGGGQQQQQQQQQQQQQQQQQQQQQQQ',  // 20
  '...KGGGGGGGGGGGGQQQQQQQQQQQQQQQQQQQQQQQ',  // 21
  '...KGGGGGGGGGGGGQQQQQQQQQQQQQQQQQQQQQQQ',  // 22
  '....KMMMMMMMMMMMKKKKKKKKKKKKKKKKKKKFF..',  // 23 枪口闪光
  '....KWWWWWWWWWWWKKKKKKKKKKKKKKKKKKKFF..',  // 24
  '....KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK...',  // 25
  '....KBBBBBBBBBBK........................',
  '....KKKKKKKKKKK........................',
  '....KTTTTTTTTTTK........................',
  '....KTTTTTTTTTTK........................',
  '....KTTTTTTTTTTK........................',
  '....KVVVVVVVVVK.........................',
  '...KRRRRRRRRRRK.........................',
  '...KRKKKKKKKKRK.........................',
  '...KRRRRRRRRRRK.........................',
  '....KTTTTTTTTTK.........................',
  '....KTTTTTTTTTK.........................',
  '....KVVVVVVVVVK.........................',
  '....KTTTTTTTTTK.........................',
  '....KVVVVVVVVVK.........................',
  '....KKKKKKKKKKK.........................',
  '...KOOOOOOOOOOK.........................',
  '...KOOCOOCOOCOK.........................',
  '...KOOOOOOOOOOK.........................',
  '...KKKKKKKKKKKK.........................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
];

/* ============================================================
 *  克莱尔 站姿
 * ============================================================ */
const CLAIRE_STAND = [
  '........................................',
  '......KKKKKKKK..........................',  // 1 头发顶
  '....KHHHHHHHHK.........KKKK............',  // 2 红发+马尾
  '....KHHHHHHHHK.........KIHH............',  // 3
  '....KHHHHHHIIK.........KIHH............',  // 4
  '....KHHHIIIIIK.........KIHH............',  // 5
  '....KIIIIMMMMMK........KKKK............',  // 6 额头
  '....KIIIIMMMMMK........................',  // 7 刘海
  '....KMMNMMMMNMMK........................',  // 8 眼圈
  '....KMEEPMEPEEMK........................',  // 9 绿眼睛
  '....KMMNMMMMMMMK........................',  // 10
  '....KMMMMMMMMMMK........................',  // 11
  '....KYYMMMMMMYYK........................',  // 12
  '......KKKKKKK...........................',  // 13 下巴
  '.......KKK..............................',  // 14 脖子
  '....KKKKMMMMKKKK........................',  // 15 肩
  '...KTTTTTTTTTTK......QQQQQQ............',  // 16 红夹克+SMG
  '...KTTTUTTTUTTTK....QCCCCQC............',  // 17 夹克拉链+枪管
  '...KTTTTTTTTTTK.....QCCCCQC............',  // 18
  '...KTTTTTTTTTTK.....QQQQQQQ............',  // 19
  '...KTTTTTTTTTTK.....QQQQQQQQ...........',  // 20
  '...KTTTTTTTTTTK......QQQQQQ............',  // 21
  '...KTTTTTTTTTTK.......QQQQQ............',  // 22
  '....KMMMMMMMMK.........KKKK.............',  // 23
  '....KWWWWWWWWK..........................',  // 24 手套
  '....KKKKKKKKKKK.........................',  // 25
  '....KBBBBBBBBBBK........................',  // 26 腰带
  '....KKKKKKKKKKK........................',  // 27
  '....KXXXXXXXXXK.........................',  // 28 黑裤
  '....KXXXXXXXXXK.........................',  // 29
  '....KXXXXXXXXXK.........................',  // 30
  '....KXXXXXXXXXK.........................',  // 31
  '...KRRRRRRRRRRK.........................',  // 32 护膝
  '...KRKKKKKKKKRK.........................',  // 33
  '...KRRRRRRRRRRK.........................',  // 34
  '....KXXXXXXXXXK.........................',  // 35
  '....KXXXXXXXXXK.........................',  // 36
  '....KXXXXXXXXXK.........................',  // 37
  '....KXXXXXXXXXK.........................',  // 38
  '....KXXXXXXXXXK.........................',  // 39
  '....KKKKKKKKKKK.........................',  // 40
  '...KOOOOOOOOOOK.........................',  // 41 靴
  '...KOOCOOCOOCOK.........................',  // 42
  '...KOOOOOOOOOOK.........................',  // 43
  '...KKKKKKKKKKKK.........................',  // 44
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
];

const CLAIRE_AIM = [
  '........................................',
  '......KKKKKKKK..........................',
  '....KHHHHHHHHK.........KKKK............',
  '....KHHHHHHHHK.........KIHH............',
  '....KHHHHHHIIK.........KIHH............',
  '....KHHHIIIIIK.........KIHH............',
  '....KIIIIMMMMMK........KKKK............',
  '....KIIIIMMMMMK........................',
  '....KMMNMMMMNMMK........................',
  '....KMEEPMEPEEMK........................',
  '....KMMNMMMMMMMK........................',
  '....KMMMMMMMMMMK........................',
  '....KYYMMMMMMYYK........................',
  '......KKKKKKK...........................',
  '.......KKK..............................',
  '....KKKKMMMMKKKKKKKKKKKKKKKKKKKK.......',  // 15 肩前倾
  '...KTTTTTTTTTTTTTTTTTTTTTTTTTTTKKKKKK..',  // 16 夹克+手臂完全前伸
  '...KTTTUTTTUTTTTTTQQQQQQQQQQQQQQQQQQQQQ',  // 17 SMG 全长
  '...KTTTTTTTTTTTTTTQCCCCCCCCCCCCCCCCCCCC',  // 18
  '...KTTTTTTTTTTTTTTQQQQQQQQQQQQQQQQQQQQQ',  // 19
  '...KTTTTTTTTTTTTTTQQQQQQQQQQQQQQQQQQQQQ',  // 20
  '...KTTTTTTTTTTTTTTQQQQQQQQQQQQQQQQQQQQQ',  // 21
  '...KTTTTTTTTTTTTTTQQQQQQQQQQQQQQQQQQQQQ',  // 22
  '....KMMMMMMMMMMMKKKKKKKKKKKKKKKKKKKFF..',  // 23 枪口闪光
  '....KWWWWWWWWWWWKKKKKKKKKKKKKKKKKKKFF..',  // 24
  '....KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK...',  // 25
  '....KBBBBBBBBBBK........................',
  '....KKKKKKKKKKK........................',
  '....KXXXXXXXXXK.........................',
  '....KXXXXXXXXXK.........................',
  '....KXXXXXXXXXK.........................',
  '....KXXXXXXXXXK.........................',
  '...KRRRRRRRRRRK.........................',
  '...KRKKKKKKKKRK.........................',
  '...KRRRRRRRRRRK.........................',
  '....KXXXXXXXXXK.........................',
  '....KXXXXXXXXXK.........................',
  '....KXXXXXXXXXK.........................',
  '....KXXXXXXXXXK.........................',
  '....KXXXXXXXXXK.........................',
  '....KKKKKKKKKKK.........................',
  '...KOOOOOOOOOOK.........................',
  '...KOOCOOCOOCOK.........................',
  '...KOOOOOOOOOOK.........................',
  '...KKKKKKKKKKKK.........................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
];

/* ============================================================
 *  艾达 站姿 (黑发髻 + 红旗袍 + 左轮)
 * ============================================================ */
const ADA_STAND = [
  '........................................',
  '....KKKK................................',  // 1 发髻
  '...KHHHHK...............................',  // 2
  '...KHHHHK...............................',  // 3
  '....KKKKK...............................',  // 4
  '.....KKKKKK.............................',  // 5 头开始
  '....KHHHHHHK............................',  // 6
  '....KHHIIIIIK...........................',  // 7 头发遮额头
  '....KIIIIMMMMMK.........................',  // 8
  '....KMMNMMMMNMMK........................',  // 9 眼圈
  '....KMERPMEPEMK.........................',  // 10 红眼
  '....KMMNMMMMMMMK........................',  // 11
  '....KMMMMMMMMMMK........................',  // 12
  '....KYYMMMMMMYYK........................',  // 13 红唇
  '......KKKKKKK...........................',  // 14
  '.......KKK..............................',  // 15 脖子
  '....KKKKMMMMKKKK........................',  // 16 肩
  '...KTTTTTTTTTTK......QQQQQQ............',  // 17 旗袍+左轮
  '...KTTTUTTTUTTTK....QCCCCQC............',  // 18 盘扣+枪管
  '...KTTTTTTTTTTK.....QCCCCQC............',  // 19
  '...KTTTTTTTTTTK.....QQQQQQQ............',  // 20
  '...KTTTTTTTTTTK......QQQQQQ............',  // 21
  '...KTTTTTTTTTTK.......QQQQQ............',  // 22
  '....KMMMMMMMMK..........................',  // 23
  '....KWWWWWWWWK..........................',  // 24 手套
  '....KKKKKKKKKKK.........................',  // 25
  '....KBBBBBBBBBBK........................',  // 26 腰带
  '....KKKKKKKKKKK........................',  // 27
  '....KTTTTTTTTTTK........................',  // 28 旗袍下
  '....KTTTTTTTTTTK........................',  // 29
  '....KTTTTTTTTTTK........................',  // 30
  '....KTTTTTTTTTTK........................',  // 31
  '....KTTTTTTTTTTK........................',  // 32
  '....KTTTTTTTTTTK........................',  // 33
  '....KVVVVVVVVVK.........................',  // 34
  '....KTTTTTTTTTTK........................',  // 35
  '....KTTTTTTTTTTK........................',  // 36
  '....KTTTTTTTTTTK........................',  // 37
  '....KTTTTTTTTTTK........................',  // 38
  '....KKKKKKKKKKK.........................',  // 39 开衩
  '....KXXXXXXXXK..........................',  // 40 黑丝腿
  '....KXXXXXXXXK..........................',  // 41
  '....KXXXXXXXXK..........................',  // 42
  '....KKKKKKKKKKK.........................',  // 43
  '...KOOOOOOOOOOK.........................',  // 44 靴
  '...KOOOOOOOOOOK.........................',  // 45
  '...KKKKKKKKKKKK.........................',  // 46
  '........................................',
  '........................................',
  '........................................',
];

const ADA_AIM = [
  '........................................',
  '....KKKK................................',
  '...KHHHHK...............................',
  '...KHHHHK...............................',
  '....KKKKK...............................',
  '.....KKKKKK.............................',
  '....KHHHHHHK............................',
  '....KHHIIIIIK...........................',
  '....KIIIIMMMMMK.........................',
  '....KMMNMMMMNMMK........................',
  '....KMERPMEPEMK.........................',
  '....KMMNMMMMMMMK........................',
  '....KMMMMMMMMMMK........................',
  '....KYYMMMMMMYYK........................',
  '......KKKKKKK...........................',
  '.......KKK..............................',
  '....KKKKMMMMKKKKKKKKKKKKKKKKKKKK.......',  // 17
  '...KTTTTTTTTTTTTTTTTTTTTTTTTTTTKKKKKK..',  // 18 旗袍+手臂
  '...KTTTUTTTUTTTTTTQQQQQQQQQQQQQQQQQQQQQ',  // 19 左轮全长
  '...KTTTTTTTTTTTTTTQCCCCCCCCCCCCCCCCCCCC',  // 20
  '...KTTTTTTTTTTTTTTQQQQQQQQQQQQQQQQQQQQQ',  // 21
  '...KTTTTTTTTTTTTTTQQQQQQQQQQQQQQQQQQQQQ',  // 22
  '...KTTTTTTTTTTTTTTQQQQQQQQQQQQQQQQQQQQQ',  // 23
  '....KMMMMMMMMMMMKKKKKKKKKKKKKKKKKKKFF..',  // 24 枪口闪光
  '....KWWWWWWWWWWWKKKKKKKKKKKKKKKKKKKFF..',  // 25
  '....KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK...',  // 26
  '....KBBBBBBBBBBK........................',
  '....KKKKKKKKKKK........................',
  '....KTTTTTTTTTTK........................',
  '....KTTTTTTTTTTK........................',
  '....KTTTTTTTTTTK........................',
  '....KTTTTTTTTTTK........................',
  '....KTTTTTTTTTTK........................',
  '....KTTTTTTTTTTK........................',
  '....KVVVVVVVVVK.........................',
  '....KTTTTTTTTTTK........................',
  '....KTTTTTTTTTTK........................',
  '....KTTTTTTTTTTK........................',
  '....KKKKKKKKKKK.........................',
  '....KXXXXXXXXK..........................',
  '....KXXXXXXXXK..........................',
  '....KXXXXXXXXK..........................',
  '....KKKKKKKKKKK.........................',
  '...KOOOOOOOOOOK.........................',
  '...KOOOOOOOOOOK.........................',
  '...KKKKKKKKKKKK.........................',
  '........................................',
  '........................................',
  '........................................',
];

/* ============================================================
 *  导出
 * ============================================================ */

export function makeLeonTexture(scene: Phaser.Scene): void {
  const p = leonPalette();
  const g = scene.add.graphics();
  renderArt(g, LEON_STAND, p);
  g.generateTexture('player-leon', 40 * PX, 45 * PX);
  g.destroy();

  const g2 = scene.add.graphics();
  renderArt(g2, LEON_AIM, p);
  g2.generateTexture('player-leon-aim', 40 * PX, 45 * PX);
  g2.destroy();
}

export function makeClaireTexture(scene: Phaser.Scene): void {
  const p = clairePalette();
  const g = scene.add.graphics();
  renderArt(g, CLAIRE_STAND, p);
  g.generateTexture('player-claire', 40 * PX, 45 * PX);
  g.destroy();

  const g2 = scene.add.graphics();
  renderArt(g2, CLAIRE_AIM, p);
  g2.generateTexture('player-claire-aim', 40 * PX, 45 * PX);
  g2.destroy();
}

export function makeAdaTexture(scene: Phaser.Scene): void {
  const p = adaPalette();
  const g = scene.add.graphics();
  renderArt(g, ADA_STAND, p);
  g.generateTexture('player-ada', 40 * PX, 47 * PX);
  g.destroy();

  const g2 = scene.add.graphics();
  renderArt(g2, ADA_AIM, p);
  g2.generateTexture('player-ada-aim', 40 * PX, 47 * PX);
  g2.destroy();
}

/* ============================================================
 *  僵尸 — 保持简单 (已用单字符代号)
 * ============================================================ */
const ZOMBIE_BASE = [
  '....................',
  '.....KKKKKKK........',
  '....KHHHHHHHK.......',
  '....KHHHHHHHK.......',
  '....KMMMMMMMK.......',
  '....KMRRRRMMK.......',
  '....KMMMMMMMK.......',
  '....KMMMMMMMK.......',
  '....KKKKKKKKKKK.....',
  '..KKKKKKKKKKKKKKK...',
  '.KHHHHHHHHHHHHHHHK..',
  '.KHHHRRRHHHRHHHHHHK.',
  'KHHHHHHHHHHHHHHHHHHK',
  'KHHHHHHHHHHHHHHHHHHK',
  '.KSSSSSSSSSSSSSSK...',
  '..KKKKKKKKKKKKK.....',
  '....KMMMMMMMK.......',
  '....KMRRRRRMK.......',
  '....KMMMMMMMK.......',
  '....KKKKKKK.........',
  '....KSSSSSK.........',
  '....KSSSSSK.........',
  '....KKKKKKK.........',
  '....................',
];

function makeZombieTexture(scene: Phaser.Scene, key: string, paletteOverride?: Record<string, number>): void {
  const pal: Record<string, number> = {
    K: 0x0a0a0a,
    H: 0x7a9a40,
    M: 0x6b8e23,
    S: 0x3a5a16,
    R: 0xcc0000,
    ...paletteOverride,
  };
  const g = scene.add.graphics();
  renderArt(g, ZOMBIE_BASE, pal);
  g.fillStyle(pal.M, 1);
  for (let i = 0; i < 14; i++) g.fillRect((20 + i) * PX, 11 * PX, PX, PX);
  g.fillStyle(pal.S, 1);
  for (let i = 0; i < 10; i++) g.fillRect((-1 - i) * PX, 11 * PX, PX, PX);
  g.generateTexture(key, 34 * PX, 24 * PX);
  g.destroy();
}

export function makeZombies(scene: Phaser.Scene): void {
  makeZombieTexture(scene, 'zombie-normal');
  makeZombieTexture(scene, 'zombie-fast', { M: 0x8fbc8f, H: 0xa0d8a0 });
  makeZombieTexture(scene, 'zombie-tank', { M: 0x3a5a20, H: 0x4a7a28 });
}

/* ============================================================
 *  BOSS — 舔食者
 * ============================================================ */
const LICKER = [
  '................................',
  '................................',
  '...........SSSSSSSSSSSS........',
  '..........SSSSSSSSSSSSSS.......',
  '.........GGGGGGGGGGGGGGGG......',
  '........GGGGGGGGGGGGGGGGGG.....',
  '.....GGGGGGGGGGGGGGGGGGGGGG....',
  '....GGGGGGGGGGGGGGGGGGGGGGGG...',
  '...GGGGWWGGGGGGGGGGGGGGGGGGGG..',
  '...GGGGWWWWWWWWWWWWGGGGGGGGGG..',
  '....GGGGGGGGGGGGGGGGGGGGGGGG...',
  '.....GGGGGGGGGGGGGGGGGGGGGG....',
  '..GGG....GGGGGGGGGGGGG....GGG..',
  '.GGG......GGGGGGGGGGG......GGG.',
  'GGGGG.......GGGGGGGGG.......GGG',
  'GGG..........GGGGGGG..........GG',
  'G.............GGGGG............G',
  '...............GGG.............',
  '................G..............',
  '..............................T',
];

export function makeLickerTexture(scene: Phaser.Scene): void {
  const g = scene.add.graphics();
  renderArt(g, LICKER, { S: 0x2a1a10, G: 0x6b5a42, W: 0xe8dcc8 });
  g.fillStyle(0xff0000, 1);
  g.fillRect(20 * PX, 6 * PX, 2 * PX, 2 * PX);
  g.generateTexture('licker', 32 * PX, 20 * PX);
  g.destroy();

  const g2 = scene.add.graphics();
  g2.fillStyle(0xcc0000, 1);
  for (let i = 0; i < 12; i++) g2.fillRect(i * PX, 0, PX, PX);
  g2.fillStyle(0x8a0000, 1);
  g2.fillRect(0, 0, PX, PX);
  g2.generateTexture('licker-tongue', 12 * PX, PX);
  g2.destroy();
}

/* ============================================================
 *  障碍物 / 装饰 / 背景 — 保持
 * ============================================================ */
function makeBoxArt(
  scene: Phaser.Scene, key: string, w: number, h: number,
  pal: { base: number; dark: number; light: number }
): void {
  const g = scene.add.graphics();
  g.fillStyle(pal.base, 1);
  g.fillRect(0, 0, w * PX, h * PX);
  g.fillStyle(pal.light, 1);
  g.fillRect(0, 0, w * PX, PX * 2);
  g.fillStyle(pal.dark, 1);
  g.fillRect((w - 2) * PX, 0, PX * 2, h * PX);
  g.fillRect(0, (h - 2) * PX, w * PX, PX * 2);
  g.lineStyle(PX, 0x000000, 0.6);
  g.strokeRect(0, 0, w * PX, h * PX);
  for (let x = PX * 4; x < w * PX; x += PX * 4) {
    g.fillStyle(pal.dark, 0.5);
    g.fillRect(x, PX * 4, PX, h * PX - PX * 8);
  }
  g.generateTexture(key, w * PX, h * PX);
  g.destroy();
}

export function makeObstacles(scene: Phaser.Scene): void {
  makeBoxArt(scene, 'obstacle-container', 16, 10, { base: 0x2e7d32, dark: 0x1b5e20, light: 0x4caf50 });
  makeBoxArt(scene, 'obstacle-car-red', 24, 12, { base: 0xc62828, dark: 0x8e1414, light: 0xef5350 });
  makeBoxArt(scene, 'obstacle-car-blue', 24, 12, { base: 0x1565c0, dark: 0x0d47a1, light: 0x42a5f5 });
  makeBoxArt(scene, 'obstacle-barrel', 8, 10, { base: 0x616161, dark: 0x424242, light: 0x9e9e9e });
  const g = scene.add.graphics();
  g.fillStyle(0xfafafa, 1);
  g.fillRect(0, 0, 6 * PX, 4 * PX);
  g.fillStyle(0x212121, 1);
  for (let x = 0; x < 6 * PX; x += PX * 2) g.fillRect(x, 0, PX, 4 * PX);
  g.generateTexture('obstacle-cone', 6 * PX, 4 * PX);
  g.destroy();
}

export function makeDecorations(scene: Phaser.Scene): void {
  const bg = scene.add.graphics();
  bg.fillStyle(0xffeb3b, 1);
  bg.fillRect(0, 0, 5, 2);
  bg.generateTexture('bullet-yellow', 5, 2);
  bg.destroy();

  const br = scene.add.graphics();
  br.fillStyle(0xff5252, 1);
  br.fillRect(0, 0, 5, 2);
  br.generateTexture('bullet-red', 5, 2);
  br.destroy();

  const bo = scene.add.graphics();
  bo.fillStyle(0xff9800, 1);
  bo.fillRect(0, 0, 5, 2);
  bo.generateTexture('bullet-orange', 5, 2);
  bo.destroy();

  const flash = scene.add.graphics();
  flash.fillStyle(0xfff9c4, 1);
  flash.fillCircle(6, 3, 6);
  flash.fillStyle(0xffeb3b, 0.9);
  flash.fillCircle(6, 3, 3);
  flash.generateTexture('muzzle-flash', 12, 10);
  flash.destroy();

  const blood = scene.add.graphics();
  blood.fillStyle(0xb71c1c, 1);
  blood.fillRect(0, 0, 3, 3);
  blood.generateTexture('blood-particle', 3, 3);
  blood.destroy();

  const ground = scene.add.graphics();
  ground.fillStyle(0x2a2a2e, 1);
  ground.fillRect(0, 0, 64, 64);
  ground.fillStyle(0x3a3a40, 1);
  for (let i = 0; i < 64; i += 8) ground.fillRect(0, i, 64, 1);
  ground.lineStyle(2, 0xffc107, 0.5);
  ground.beginPath();
  ground.moveTo(0, 0);
  ground.lineTo(64, 0);
  ground.strokePath();
  ground.generateTexture('ground-tile', 64, 64);
  ground.destroy();

  const bgArt = scene.add.graphics();
  bgArt.fillStyle(0x0a0a0c, 1);
  bgArt.fillRect(0, 0, 1280, 720);
  bgArt.fillStyle(0x1a1a20, 1);
  let bx = 0;
  while (bx < 1280) {
    const bw = 80 + Math.floor(Math.random() * 80);
    const bh = 120 + Math.floor(Math.random() * 280);
    bgArt.fillRect(bx, 720 - bh - 120, bw, bh);
    bgArt.fillStyle(0x3a3a42, 0.5);
    for (let wy = 720 - bh - 100; wy < 720 - 120; wy += 24) {
      for (let wx = bx + 8; wx < bx + bw - 8; wx += 20) {
        if (Math.random() > 0.6) bgArt.fillRect(wx, wy, 10, 14);
      }
    }
    bgArt.fillStyle(0x1a1a20, 1);
    bx += bw;
  }
  bgArt.generateTexture('city-bg', 1280, 720);
  bgArt.destroy();

  const road = scene.add.graphics();
  road.fillStyle(0x1c1c22, 1);
  road.fillRect(0, 0, 256, 120);
  road.fillStyle(0x2a2a32, 1);
  road.fillRect(0, 0, 256, 10);
  road.fillStyle(0xffc107, 0.4);
  for (let x = 20; x < 256; x += 40) road.fillRect(x, 60, 20, 4);
  road.generateTexture('road-strip', 256, 120);
  road.destroy();
}

export function makePickups(scene: Phaser.Scene): void {
  const ammo = scene.add.graphics();
  ammo.fillStyle(0xffc107, 1);
  ammo.fillRoundedRect(0, 0, 30, 22, 3);
  ammo.lineStyle(2, 0x000000, 0.8);
  ammo.strokeRoundedRect(0, 0, 30, 22, 3);

  const hp = scene.add.graphics();
  hp.fillStyle(0xe53935, 1);
  hp.fillRoundedRect(0, 0, 30, 22, 3);
  hp.lineStyle(2, 0x000000, 0.8);
  hp.strokeRoundedRect(0, 0, 30, 22, 3);
  hp.fillStyle(0xffffff, 1);
  hp.fillRect(12, 4, 6, 14);
  hp.fillRect(5, 8, 20, 6);
  hp.generateTexture('pickup-health', 30, 22);
  hp.destroy();
}

export function generateAllPixelArt(scene: Phaser.Scene): void {
  scene.add.text(0, 0, '', {})?.destroy();
  makeLeonTexture(scene);
  makeClaireTexture(scene);
  makeAdaTexture(scene);
  makeZombies(scene);
  makeLickerTexture(scene);
  makeObstacles(scene);
  makeDecorations(scene);
  makePickups(scene);
}
