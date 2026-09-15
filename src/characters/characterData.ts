/**
 * 角色与枪械数据定义
 * 主角: 里昂 / 克莱尔 / 艾达王
 * 每人初始枪械不同, 体现差异化玩法
 */

export type CharacterId = 'leon' | 'claire' | 'ada';

export interface WeaponConfig {
  /** 武器名称 */
  name: string;
  /** 单发伤害 */
  damage: number;
  /** 射速 (ms/发) */
  fireRate: number;
  /** 弹匣容量 */
  magSize: number;
  /** 子弹速度 (px/s) */
  bulletSpeed: number;
  /** 单发子弹数 (霰弹类 >1) */
  pellets: number;
  /** 散射角度 (度) */
  spread: number;
  /** 换弹时间 (ms) */
  reloadTime: number;
  /** 子弹颜色 */
  bulletColor: number;
  /** 后坐力 (px) */
  recoil: number;
}

export interface CharacterConfig {
  id: CharacterId;
  name: string;
  nameEn: string;
  /** 角色主题色 */
  color: number;
  /** 最大生命值 */
  maxHp: number;
  /** 移动速度 (px/s) */
  moveSpeed: number;
  /** 初始武器 */
  weapon: WeaponConfig;
  /** 角色简介 */
  desc: string;
}

export const CHARACTERS: Record<CharacterId, CharacterConfig> = {
  leon: {
    id: 'leon',
    name: '里昂·S·肯尼迪',
    nameEn: 'Leon S. Kennedy',
    color: 0x5dade2,
    maxHp: 120,
    moveSpeed: 260,
    desc: '浣熊市新人警察, 均衡型, 手枪精准可靠',
    weapon: {
      name: 'Matilda 手枪',
      damage: 25,
      fireRate: 280,
      magSize: 12,
      bulletSpeed: 1100,
      pellets: 1,
      spread: 1.5,
      reloadTime: 1200,
      bulletColor: 0xffeb3b,
      recoil: 4,
    },
  },
  claire: {
    id: 'claire',
    name: '克莱尔·雷德菲尔德',
    nameEn: 'Claire Redfield',
    color: 0xff7043,
    maxHp: 100,
    moveSpeed: 290,
    desc: '寻找哥哥的少女, 机动型, 冲锋枪高射速',
    weapon: {
      name: 'MQ9 冲锋枪',
      damage: 12,
      fireRate: 95,
      magSize: 30,
      bulletSpeed: 1000,
      pellets: 1,
      spread: 4,
      reloadTime: 1600,
      bulletColor: 0xff9800,
      recoil: 2,
    },
  },
  ada: {
    id: 'ada',
    name: '艾达·王',
    nameEn: 'Ada Wong',
    color: 0xee2a4a,
    maxHp: 90,
    moveSpeed: 310,
    desc: '神秘女特工, 爆发型, 左轮手枪单发高伤',
    weapon: {
      name: 'AMR 左轮手枪',
      damage: 70,
      fireRate: 650,
      magSize: 6,
      bulletSpeed: 1300,
      pellets: 1,
      spread: 0.8,
      reloadTime: 1800,
      bulletColor: 0xff5252,
      recoil: 10,
    },
  },
};

export const CHARACTER_LIST: CharacterConfig[] = [
  CHARACTERS.leon,
  CHARACTERS.claire,
  CHARACTERS.ada,
];

export function getCharacter(id: CharacterId): CharacterConfig {
  return CHARACTERS[id] ?? CHARACTERS.leon;
}
