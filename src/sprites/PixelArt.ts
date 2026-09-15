/**
 * 像素艺术生成器 —— 暴徒猎手 + 生化危机风格
 *
 * 核心升级:
 *   - 40×60 逻辑像素 (PX=3 → 120×180 屏幕像素) — 足够放细节
 *   - 角色部件化: 头/颈/躯干(战术背心)/腰带+Pouch/2臂持枪/2腿+护膝/靴
 *   - 5 层着色: 轮廓 → 阴影 → 主色 → 高光 → 特亮
 *   - 双手握持枪支 (参考图标志性姿态)
 *   - 战术装备完整: 防弹衣装甲板/腰带 pouch/护膝/护腕
 *   - 精确像素点阵 (每列每行手动设计, 不再程序生成矩形)
 */
import Phaser from 'phaser';

export const PX = 3;

/* ============================================================
 *  渲染工具: 把字符串数组按调色板渲染成纹理
 *  '.' = 透明, 其他字符从 palette 查颜色
 * ============================================================ */
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
 *  里昂·S·肯尼迪 — 金发 RPD 蓝制服 + 灰色战术背心 + 手枪
 *  40×60 逻辑像素, 面向右
 *
 *  调色板代号 (5 层着色):
 *    K = 轮廓/最暗
 *    S = 阴影
 *    M = 主色
 *    H = 高光
 *    L = 特亮/反射
 *    还有角色特定代号见下方每个 palette
 * ============================================================ */

const LEON_PALETTE: Record<string, number> = {
  K: 0x080808,         // 轮廓
  // 头发 (金棕)
  hh: 0xc8a060, hm: 0x8b6838, hs: 0x5a4020,
  // 皮肤
  sh: 0xf4d4a8, sm: 0xe0b080, sd: 0x9a6a40,
  // 眼白+瞳孔
  ew: 0xffffff, ep: 0x1a3a6a,
  // RPD 蓝制服
  th: 0x2a4a7a, tm: 0x1a3a5c, ts: 0x0d2033,
  // 灰色战术背心 (叠在制服外)
  vh: 0x7a7a7a, vm: 0x4a4a4a, vs: 0x2a2a2a,
  // 护膝/护腕 (深灰)
  kh: 0x5a5a5a, km: 0x3a3a3a, ks: 0x1a1a1a,
  // 腰带 + pouch
  bh: 0x4a3520, bm: 0x2a1f10, bs: 0x151008,
  // 枪 (手枪)
  gh: 0x6a6a6a, gm: 0x3a3a3a, gs: 0x151515,
  gg: 0x8a8a8a,        // 枪管金属高光
  // 靴子
  oh: 0x3a3a3a, om: 0x1a1a1a, os: 0x050505,
  // 特亮
  a: 0xffd700,         // RPD 徽章金色
  f: 0xfff176,         // 枪口闪光
  // 手套/枪套
  wh: 0x3a2510, wm: 0x1a1508,
};

/* Leon 站姿 (40×60) — 像素点阵, 面向右 */
const LEON_STAND = [
  // 0123456789012345678901234567890123456789
  '........................................', // 0
  '......KKKKKKKKKK.......................', // 1 头发顶
  '....KhhhhhhhhhhhhK.....................', // 2
  '....KhhhhhhhhhhmK......................', // 3 金发高光
  '....KhhhhhmhhmhmK.....................', // 4
  '....KhhmmmmmmmmK.......................', // 5 额头
  '....KhhmmmmmmmmK.......................', // 6 金发刘海遮额头
  '....KshshmmmssmK.......................', // 7 眼 (阴影)
  '....KseepsmmessK.......................', // 8 眼白+瞳孔
  '....KssmmmmmssK........................', // 9 眼下方
  '....KshmmmmshK.........................', // 10 脸颊
  '....KhhmmmmmhK.........................', // 11 嘴唇
  '......KKKKKKK..........................', // 12 下巴
  '.......KKKK............................', // 13 脖子
  '....KKKKmmmmKKKK.......................', // 14 肩
  '...KvvvvvvvvvvvK........KKKKKK.........', // 15 战术背心+手臂
  '...KvvvvvvvvvvvK.......KgggghhK........', // 16 枪开始
  '...KvsvsbsvsbsvK.......KgggghhK........', // 17 背心装甲板 + 枪身
  '...KvvvvvvvvvvvK.......KgggggggK.......', // 18
  '...KvvvvvvvvvvvK.......KggggggggK......', // 19 枪管延伸
  '...KvvvvvvvvvvvK.......KggggggggK......', // 20
  '...KvvvvvvvvvvvK.......KgggggggK.......', // 21
  '...KvvvvvvvvvvvK........KgggggK........', // 22
  '....KsssssssssK.........KKKKKK.........', // 23 手臂/枪过渡
  '....KwwwwwwwwwK........................', // 24 另一只手 (腰侧)
  '....KKKKKKKKKKK........................', // 25 躯干底
  '....KbhbhbhbhbK........................', // 26 腰带
  '....KbhbhbhbhbK........................', // 27 腰带 pouch
  '....KKKKKKKKKKK........................', // 28
  '....KtmtmtmtmtmK........................', // 29 裤上
  '....KtmtmtmtmtmK........................', // 30
  '....KtmtmtmtmtmK........................', // 31
  '....KtmtmtmtmtmK........................', // 32
  '...KkkkkkkkkkkkK........................', // 33 护膝
  '...KkmkmkmkmkmK........................', // 34 护膝细节
  '...KkkkkkkkkkkkK........................', // 35
  '....KtmtmtmtmtmK........................', // 36 裤下
  '....KtmtmtmtmtmK........................', // 37
  '....KtmtmtmtmtmK........................', // 38
  '....KtmtmtmtmtmK........................', // 39
  '....KtmtmtmtmtmK........................', // 40
  '....KtmtmtmtmtmK........................', // 41
  '....KmtmtmtmtmtmK.......................', // 42 前腿 (靠近镜头)
  '....KmtmtmtmtmtmK.......................', // 43
  '....KKKKKKKKKKKK........................', // 44 裤脚
  '...KoooooooooooK........................', // 45 靴顶
  '...KooomooomooK........................', // 46 鞋带
  '...KooomooomooK........................', // 47
  '...KoooooooooooK........................', // 48
  '...KoooooooooooK........................', // 49 靴身
  '...KosKosKosKosK........................', // 50 鞋底
  '...KosKosKosKosK........................', // 51
  '....KKKKKKKKKKK.........................', // 52
  '........................................', // 53
  '........................................', // 54
  '........................................', // 55
  '........................................', // 56
  '........................................', // 57
  '........................................', // 58
  '........................................', // 59
];

/* Leon 瞄准姿势 — 身体前倾, 枪前伸更远, 枪口闪光 */
const LEON_AIM = [
  '........................................',
  '......KKKKKKKKKK.......................',
  '....KhhhhhhhhhhhhK.....................',
  '....KhhhhhhhhhhmK......................',
  '....KhhhhhmhhmhmK.....................',
  '....KhhmmmmmmmmK.......................',
  '....KhhmmmmmmmmK.......................',
  '....KshshmmmssmK.......................',
  '....KseepsmmessK.......................',
  '....KssmmmmmssK........................',
  '....KshmmmmshK.........................',
  '....KhhmmmmmhK.........................',
  '......KKKKKKK..........................',
  '.......KKKK............................',
  '....KKKKmmmmKKKKKKKKKKKKKKKKKKKK.......', // 14 肩前倾
  '...KvvvvvvvvvvvvvvvvvvvvvvvvvvvK.......', // 15 躯干+手臂完全前伸
  '...KvvvvvvvvvvvvvgggggggggggggggK......', // 16 枪全长
  '...KvsvsbsvsbsvvvgggggggggggggggK......', // 17
  '...KvvvvvvvvvvvvvgggggggggggggggK......', // 18
  '...KvvvvvvvvvvvvvgggggggggggggggK......', // 19
  '...KvvvvvvvvvvvvvgggggggggggggggK......', // 20
  '...KvvvvvvvvvvvvvgggggggggggggggK......', // 21
  '...KvvvvvvvvvvvvvgggggggggggggggK......', // 22
  '...KssssssssssssssKKKKKKKKKKKf........', // 23 枪口闪光 f
  '...KwwwwwwwwwwwwwKKKKKKKKKKKf..........', // 24
  '....KKKKKKKKKKKKKKKKKKKKKKKKKK.........', // 25
  '....KbhbhbhbhbK........................', // 26 腰带
  '....KbhbhbhbhbK........................', // 27
  '....KKKKKKKKKKK........................', // 28
  '....KtmtmtmtmtmK........................', // 29 裤
  '....KtmtmtmtmtmK........................', // 30
  '....KtmtmtmtmtmK........................', // 31
  '....KtmtmtmtmtmK........................', // 32
  '...KkkkkkkkkkkkK........................', // 33 护膝
  '...KkmkmkmkmkmK........................', // 34
  '...KkkkkkkkkkkkK........................', // 35
  '....KtmtmtmtmtmK........................', // 36
  '....KtmtmtmtmtmK........................', // 37
  '....KtmtmtmtmtmK........................', // 38
  '....KtmtmtmtmtmK........................', // 39
  '....KtmtmtmtmtmK........................', // 40
  '....KtmtmtmtmtmK........................', // 41
  '....KmtmtmtmtmtmK.......................', // 42 前腿
  '....KmtmtmtmtmtmK.......................', // 43
  '....KKKKKKKKKKKK........................', // 44
  '...KoooooooooooK........................', // 45 靴
  '...KooomooomooK........................', // 46
  '...KooomooomooK........................', // 47
  '...KoooooooooooK........................', // 48
  '...KoooooooooooK........................', // 49
  '...KosKosKosKosK........................', // 50 鞋底
  '...KosKosKosKosK........................', // 51
  '....KKKKKKKKKKK.........................', // 52
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
];

/* ============================================================
 *  克莱尔·雷德菲尔德 — 红马尾 红夹克 黑裤 冲锋枪
 * ============================================================ */
const CLAIRE_PALETTE: Record<string, number> = {
  K: 0x080808,
  // 红头发 (马尾)
  hh: 0xef5350, hm: 0xc62828, hs: 0x8e1414,
  // 皮肤
  sh: 0xf4d4a8, sm: 0xe0b080, sd: 0x9a6a40,
  ew: 0xffffff, ep: 0x2e7d32,  // 绿色眼睛
  // 红夹克
  th: 0xef5350, tm: 0xc62828, ts: 0x8e1414,
  // 黑色内搭
  jh: 0x4a4a4a, jm: 0x1a1a1a, js: 0x050505,
  // 护膝
  kh: 0x3a3a3a, km: 0x1a1a1a, ks: 0x050505,
  // 腰带
  bh: 0x3a3a3a, bm: 0x1a1a1a, bs: 0x050505,
  // 冲锋枪 (MP5 风格)
  gh: 0x5a5a5a, gm: 0x2a2a2a, gs: 0x0a0a0a,
  gg: 0x7a7a7a,
  // 靴
  oh: 0x3a2510, om: 0x1a0e08, os: 0x050505,
  // 手套
  wh: 0x1a1a1a, wm: 0x050505,
  // 裤 (黑)
  ph: 0x3a3a3a, pm: 0x1a1a1a, ps: 0x050505,
  f: 0xfff176,
};

const CLAIRE_STAND = [
  '........................................',
  '......KKKKKKKK..........................', // 0 头发顶
  '....KhhhhhhhhK..........................',
  '....KhhhhhhhhK..........................',
  '....KhhhhhhmhK.....KKK.................', // 4 马尾开始
  '....KhhhhmmmmK.....KKK.................',
  '....KhhhmmmmmmK....KKK.................',
  '....KshshmmssmK....KKK.................',
  '....KseepsmmessK...KKK.................', // 8 绿眼睛
  '....KssmmmmmsK.....KKK.................',
  '....KshmmmmshK.....KKK.................',
  '....KhhmmmmhK......KKK.................',
  '......KKKKKKK.......KKK................',
  '.......KKKK........KKKKK...............', // 13 脖子+马尾
  '....KKKKmmmmKKK....KKKKK...............', // 14 肩
  '...KtttttttttttK...KKKKK...KKKKKK......', // 15 红夹克
  '...KttttttttttttK..KKKKK..KgggghhK.....', // 16 手臂+SMG
  '...Ktstststststsk..KKKKK..KgggghhK.....', // 17 夹克拉链+枪身
  '...KttttttttttttK..KKKKK..KggggggK.....', // 18
  '...KttttttttttttK..KKKKK..KggggggK.....', // 19
  '...KttttttttttttK..KKKKK..KggggggK.....', // 20
  '...KttttttttttttK..KKKKK..KKKKKKKK.....', // 21
  '...KttttttttttttK..KKKKK...............', // 22
  '....KssssssssssK...KKKKK...............', // 23
  '....KwwwwwwwwwwK........................', // 24 手
  '....KKKKKKKKKKK........................', // 25
  '....KbhbhbhbhbK........................', // 26 腰带
  '....KKKKKKKKKKK........................', // 27
  '....KpmpmpmpmpmK........................', // 28 黑裤
  '....KpmpmpmpmpmK........................', // 29
  '....KpmpmpmpmpmK........................', // 30
  '....KpmpmpmpmpmK........................', // 31
  '...KkkkkkkkkkkkK........................', // 32 护膝
  '...KkmkmkmkmkmK........................', // 33
  '...KkkkkkkkkkkkK........................', // 34
  '....KpmpmpmpmpmK........................', // 35
  '....KpmpmpmpmpmK........................', // 36
  '....KpmpmpmpmpmK........................', // 37
  '....KpmpmpmpmpmK........................', // 38
  '....KpmpmpmpmpmK........................', // 39
  '....KpmpmpmpmpmK........................', // 40
  '....KpmpmpmpmpmK........................', // 41
  '....KpmpmpmpmpmK........................', // 42
  '....KpmpmpmpmpmK........................', // 43
  '....KKKKKKKKKKK........................', // 44
  '...KoooooooooooK........................', // 45 靴
  '...KooomooomooK........................', // 46
  '...KooomooomooK........................', // 47
  '...KoooooooooooK........................', // 48
  '...KosKosKosKosK........................', // 49
  '...KosKosKosKosK........................', // 50
  '....KKKKKKKKKKK.........................', // 51
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
];

const CLAIRE_AIM = [
  '........................................',
  '......KKKKKKKK..........................',
  '....KhhhhhhhhK..........................',
  '....KhhhhhhhhK..........................',
  '....KhhhhhhmhK.....KKK.................',
  '....KhhhhmmmmK.....KKK.................',
  '....KhhhmmmmmmK....KKK.................',
  '....KshshmmssmK....KKK.................',
  '....KseepsmmessK...KKK.................',
  '....KssmmmmmsK.....KKK.................',
  '....KshmmmmshK.....KKK.................',
  '....KhhmmmmhK......KKK.................',
  '......KKKKKKK.......KKK................',
  '.......KKKK........KKKKK...............',
  '....KKKKmmmmKKK....KKKKKKKKKKKKKKKKKK..', // 14 肩前倾
  '...KtttttttttttttttttttttttttttKKKKKKK.', // 15 夹克+手臂+SMG
  '...KtttttttttttttgggggggggggggggggKKKKK', // 16
  '...KtstststststttgggggggggggggggggKKKKK', // 17
  '...KtttttttttttttgggggggggggggggggKKKKK', // 18
  '...KtttttttttttttgggggggggggggggggKKKKK', // 19
  '...KtttttttttttttgggggggggggggggggKKKKK', // 20
  '...KtttttttttttttgggggggggggggggggKKKKK', // 21
  '...KtttttttttttttgggggggggggggggggKKKKK', // 22
  '...KsssssssssssssKKKKKKKKKKKKKKKf......', // 23 枪口闪光
  '...KwwwwwwwwwwwwwKKKKKKKKKKKKKKKf......', // 24
  '....KKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.....', // 25
  '....KbhbhbhbhbK........................',
  '....KKKKKKKKKKK........................',
  '....KpmpmpmpmpmK........................',
  '....KpmpmpmpmpmK........................',
  '....KpmpmpmpmpmK........................',
  '....KpmpmpmpmpmK........................',
  '...KkkkkkkkkkkkK........................',
  '...KkmkmkmkmkmK........................',
  '...KkkkkkkkkkkkK........................',
  '....KpmpmpmpmpmK........................',
  '....KpmpmpmpmpmK........................',
  '....KpmpmpmpmpmK........................',
  '....KpmpmpmpmpmK........................',
  '....KpmpmpmpmpmK........................',
  '....KpmpmpmpmpmK........................',
  '....KpmpmpmpmpmK........................',
  '....KpmpmpmpmpmK........................',
  '....KpmpmpmpmpmK........................',
  '....KKKKKKKKKKK........................',
  '...KoooooooooooK........................',
  '...KooomooomooK........................',
  '...KooomooomooK........................',
  '...KoooooooooooK........................',
  '...KosKosKosKosK........................',
  '...KosKosKosKosK........................',
  '....KKKKKKKKKKK.........................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
];

/* ============================================================
 *  艾达·王 — 黑发髻 红旗袍 左轮手枪
 * ============================================================ */
const ADA_PALETTE: Record<string, number> = {
  K: 0x080808,
  // 黑发
  hh: 0x3a3a3a, hm: 0x1a1a1a, hs: 0x050505,
  // 皮肤
  sh: 0xf4d4a8, sm: 0xe0b080, sd: 0x9a6a40,
  ew: 0xffffff, ep: 0xb71c1c,  // 红眼
  // 红旗袍
  th: 0xd32f2f, tm: 0xb71c1c, ts: 0x7f1010,
  // 腰带
  bh: 0x3a3a3a, bm: 0x1a1a1a, bs: 0x050505,
  // 左轮 (金属色)
  gh: 0x8d6e63, gm: 0x3e2723, gs: 0x1a0e08,
  gg: 0xbdbdbd,
  // 靴
  oh: 0x3a2510, om: 0x1a0e08, os: 0x050505,
  // 裤 (黑丝)
  ph: 0x2a2a2a, pm: 0x0a0a0a, ps: 0x000000,
  // 手套
  wh: 0x1a1a1a, wm: 0x050505,
  // 旗袍盘扣等
  a: 0xffd700,
  f: 0xfff176,
};

const ADA_STAND = [
  '........................................',
  '....KKKK................................', // 0 发髻
  '...KhhhhK...............................',
  '...KhhhhK...............................',
  '...KhhhhK...............................',
  '....KKKKK...............................',
  '.....KKKKKK.............................', // 5 头开始
  '....KhhhhhhhK...........................',
  '....KhhhmmmmhK..........................',
  '....KhhmmmmmmK..........................',
  '....KshshmmssmK..........................',
  '....KseepsmmessK.........................', // 10 红眼
  '....KssmmmmmssK..........................',
  '....KshmmmmshK...........................',
  '....KhhmmmmhK............................',
  '......KKKKKKK...........................',
  '.......KKKK.............................', // 16 脖子
  '....KKKKmmmmKKKK........................', // 17 肩
  '...Ktttttttttttk...KKKKK................', // 18 旗袍
  '...KttttttttttttK..KggghhK..............', // 19 手臂+左轮
  '...Ktstststststsk..KggghhK..............', // 20 旗袍盘扣
  '...Kttttttttttttk..KgggggK..............',
  '...Kttttttttttttk..KgggggK..............',
  '...Kttttttttttttk..KgggggK..............',
  '...Kttttttttttttk..KKKKKKK..............',
  '...Kttttttttttttk.......................',
  '...Kttttttttttttk.......................',
  '....KssssssssssK........................',
  '....KwwwwwwwwwK.........................',
  '....KKKKKKKKKKK.........................', // 28 腰带
  '....KbhbhbhbhbK.........................',
  '....KbhbhbhbhbK.........................',
  '....KKKKKKKKKKK.........................',
  '....KtmtmtmtmtmK.........................', // 32 旗袍下
  '....KtmtmtmtmtmK.........................',
  '....KtmtmtmtmtmK.........................',
  '....KtmtmtmtmtmK.........................',
  '....KtmtmtmtmtmK.........................',
  '....KtmtmtmtmtmK.........................',
  '....KtmtmtmtmtmK.........................',
  '....KtmtmtmtmtmK.........................',
  '....KtmtmtmtmtmK.........................',
  '....KtmtmtmtmtmK.........................',
  '....KtmtmtmtmtmK.........................',
  '....KKKKKKKKKKK.........................', // 44 旗袍开衩
  '....KpmpmpmpmpmK........................', // 45 黑丝腿
  '....KpmpmpmpmpmK........................',
  '....KpmpmpmpmpmK........................',
  '....KpmpmpmpmpmK........................',
  '....KpmpmpmpmpmK........................',
  '....KKKKKKKKKKK.........................',
  '...KoooooooooooK........................', // 51 靴
  '...KooomooomooK........................',
  '...KoooooooooooK........................',
  '...KosKosKosKosK........................',
  '....KKKKKKKKKKK.........................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
];

const ADA_AIM = [
  '........................................',
  '....KKKK................................',
  '...KhhhhK...............................',
  '...KhhhhK...............................',
  '...KhhhhK...............................',
  '....KKKKK...............................',
  '.....KKKKKK.............................',
  '....KhhhhhhhK...........................',
  '....KhhhmmmmhK..........................',
  '....KhhmmmmmmK..........................',
  '....KshshmmssmK..........................',
  '....KseepsmmessK.........................',
  '....KssmmmmmssK..........................',
  '....KshmmmmshK...........................',
  '....KhhmmmmhK............................',
  '......KKKKKKK...........................',
  '.......KKKK.............................',
  '....KKKKmmmmKKKKKKKKKKKKKKKKKKK.........',
  '...KtttttttttttttttttttttttttttKKKKKK...', // 18
  '...KttttttttttttgggggggggggggggggKKKKK..', // 19 左轮全长
  '...KtstststststtgggggggggggggggggKKKKK..', // 20
  '...KttttttttttttgggggggggggggggggKKKKK..', // 21
  '...KttttttttttttgggggggggggggggggKKKKK..', // 22
  '...KttttttttttttgggggggggggggggggKKKKK..', // 23
  '...KttttttttttttgggggggggggggggggKKKKK..', // 24
  '...KttttttttttttgggggggggggggggggKKKKK..', // 25
  '...KttttttttttttKKKKKKKKKKKKKKKKKf......', // 26 枪口闪光
  '....KssssssssssKKKKKKKKKKKKKKKKKf.......', // 27
  '....KwwwwwwwwwK.........................',
  '....KKKKKKKKKKK.........................',
  '....KbhbhbhbhbK.........................',
  '....KKKKKKKKKKK.........................',
  '....KtmtmtmtmtmK.........................',
  '....KtmtmtmtmtmK.........................',
  '....KtmtmtmtmtmK.........................',
  '....KtmtmtmtmtmK.........................',
  '....KtmtmtmtmtmK.........................',
  '....KtmtmtmtmtmK.........................',
  '....KtmtmtmtmtmK.........................',
  '....KtmtmtmtmtmK.........................',
  '....KtmtmtmtmtmK.........................',
  '....KtmtmtmtmtmK.........................',
  '....KKKKKKKKKKK.........................',
  '....KpmpmpmpmpmK........................',
  '....KpmpmpmpmpmK........................',
  '....KpmpmpmpmpmK........................',
  '....KpmpmpmpmpmK........................',
  '....KpmpmpmpmpmK........................',
  '....KKKKKKKKKKK.........................',
  '...KoooooooooooK........................',
  '...KooomooomooK........................',
  '...KoooooooooooK........................',
  '...KosKosKosKosK........................',
  '....KKKKKKKKKKK.........................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
];

/* ============================================================
 *  导出接口
 * ============================================================ */

export function makeLeonTexture(scene: Phaser.Scene): void {
  const g = scene.add.graphics();
  renderArt(g, LEON_STAND, LEON_PALETTE);
  g.generateTexture('player-leon', 40 * PX, 55 * PX);  // 只到 row 52 有像素
  g.destroy();

  const g2 = scene.add.graphics();
  renderArt(g2, LEON_AIM, LEON_PALETTE);
  g2.generateTexture('player-leon-aim', 40 * PX, 53 * PX);
  g2.destroy();
}

export function makeClaireTexture(scene: Phaser.Scene): void {
  const g = scene.add.graphics();
  renderArt(g, CLAIRE_STAND, CLAIRE_PALETTE);
  g.generateTexture('player-claire', 40 * PX, 52 * PX);
  g.destroy();

  const g2 = scene.add.graphics();
  renderArt(g2, CLAIRE_AIM, CLAIRE_PALETTE);
  g2.generateTexture('player-claire-aim', 40 * PX, 52 * PX);
  g2.destroy();
}

export function makeAdaTexture(scene: Phaser.Scene): void {
  const g = scene.add.graphics();
  renderArt(g, ADA_STAND, ADA_PALETTE);
  g.generateTexture('player-ada', 40 * PX, 55 * PX);
  g.destroy();

  const g2 = scene.add.graphics();
  renderArt(g2, ADA_AIM, ADA_PALETTE);
  g2.generateTexture('player-ada-aim', 40 * PX, 52 * PX);
  g2.destroy();
}

/* ============================================================
 *  僵尸 — Huntdown 风格: 前伸手臂 + 破衣 + 血渍
 *  20×24 逻辑像素
 * ============================================================ */
const ZOMBIE_BASE = [
  '....................',
  '.....KKKKKKK........',
  '....KHHHHHHHK.......',
  '....KHHHHHHHK.......',
  '....KMMMMMMMK.......',  // 头
  '....KMRRMMRRK.......',  // 红眼
  '....KMMMMMMMK.......',
  '....KMMMMMMMK.......',
  '....KKKKKKKKKKK.....',
  '..KKKKKKKKKKKKKKK...',
  '.KHHHHHHHHHHHHHHHK..',  // 前伸手臂 (Huntdown 经典姿态)
  '.KHHRRRHHHHRHHHHHHK.',  // 破衣+血
  'KHHHHHHHHHHHHHHHHHHK',  // 破上衣
  'KHHHHHHHHHHHHHHHHHHK',
  '.KSSSSSSSSSSSSSSK...',
  '..KKKKKKKKKKKKK.....',
  '....KMMMMMMMK.......',  // 破裤
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
  // 前伸手臂延伸
  g.fillStyle(pal.M, 1);
  for (let i = 0; i < 14; i++) g.fillRect((20 + i) * PX, 11 * PX, PX, PX);
  g.fillStyle(pal.S, 1);
  for (let i = 0; i < 10; i++) g.fillRect((-1 - i) * PX, 11 * PX, PX, PX);
  g.generateTexture(key, 34 * PX, 24 * PX);
  g.destroy();
}

export function makeZombies(scene: Phaser.Scene): void {
  makeZombieTexture(scene, 'zombie-normal');
  makeZombieTexture(scene, 'zombie-fast', { M: 0x8fbc8f, H: 0xa0d8a0, K: 0x0a0a0a });
  makeZombieTexture(scene, 'zombie-tank', { M: 0x3a5a20, H: 0x4a7a28 });
}

/* ============================================================
 *  BOSS — 舔食者 (Licker)
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
 *  障碍物 / 装饰 / 背景 — 保持原有
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

/** 一键生成所有像素素材 */
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
