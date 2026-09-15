import Phaser from 'phaser';
import { generateAllPixelArt } from '../sprites/PixelArt';

/**
 * BootScene — 用程序化像素艺术生成所有纹理 (暴徒猎手 + 生化危机风格)
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
