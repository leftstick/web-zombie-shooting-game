import Phaser from 'phaser';
import { generateAllPixelArt } from '../sprites/PixelArt';

/**
 * BootScene — 生成少量程序化纹理 (枪口闪光、子弹、拾取物等)
 * 角色/僵尸/地图已改为外部 PNG + Tiled JSON, 在 PreloadScene 加载
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    generateAllPixelArt(this);
    this.scene.start('PreloadScene');
  }
}
