/**
 * 暴徒猎手 (Huntdown) 风格触屏控件 + 键盘输入统一接口
 *
 * 关键设计:
 * - 左摇杆 (移动) + 右侧三个大按钮 (射 / 跳 / 弹)
 * - 全部 UI 元素 setScrollFactor(0) 固定在屏幕上
 * - 用 pointer.x/y (屏幕坐标) 做命中检测, 不再混用世界坐标
 * - 射击: tap 单发 (不是按住连发), 通过 consumeFire() 一次性消费
 * - 跳跃: tap 单次 (consumeJump)
 * - 换弹: tap 单次 (consumeReload)
 */
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig';

export interface InputSnapshot {
  moveAxis: number;
  jumpPressed: boolean;
  firing: boolean;
  reloadPressed: boolean;
  isMobile: boolean;
}

interface TouchState {
  pointerId: number;
  active: boolean;
}

export class InputManager implements InputSnapshot {
  public moveAxis = 0;
  public jumpPressed = false;
  public firing = false;
  public reloadPressed = false;
  public isMobile: boolean;

  private scene: Phaser.Scene;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  // 摇杆 —— 全部屏幕坐标
  private joystickBorder?: Phaser.GameObjects.Arc;
  private joystickBase?: Phaser.GameObjects.Arc;
  private joystickKnob?: Phaser.GameObjects.Arc;
  private joystickPointer: TouchState = { pointerId: -1, active: false };
  private readonly joystickCenterX = 160;
  private readonly joystickCenterY = GAME_HEIGHT - 160;
  private readonly joystickRadius = 80;

  // 按钮 —— Zone 做 hit area, setScrollFactor(0) 固定屏幕
  private btnFire?: Phaser.GameObjects.Zone;
  private btnFireLabel?: Phaser.GameObjects.Text;
  private btnJump?: Phaser.GameObjects.Zone;
  private btnJumpLabel?: Phaser.GameObjects.Text;
  private btnReload?: Phaser.GameObjects.Zone;
  private btnReloadLabel?: Phaser.GameObjects.Text;

  private firePointer: TouchState = { pointerId: -1, active: false };
  private jumpPointer: TouchState = { pointerId: -1, active: false };
  private reloadPointer: TouchState = { pointerId: -1, active: false };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.isMobile = this.detectMobile();
    this.setupKeyboard();
    if (this.isMobile) {
      this.setupTouchControls();
    }
  }

  private detectMobile(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent;
    const isTouch = 'ontouchstart' in window && navigator.maxTouchPoints > 0;
    const isUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const result = isTouch || isUA;
    console.log(`[InputManager] detectMobile: isTouch=${isTouch}, isUA=${isUA}("${ua.substring(0, 60)}") → ${result}`);
    return result;
  }

  private setupKeyboard(): void {
    const kb = this.scene.input.keyboard;
    if (!kb) return;
    this.keys = {
      left: kb.addKey('A'),
      right: kb.addKey('D'),
      jump: kb.addKey('W'),
      jumpSpace: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      fire: kb.addKey('J'),
      reload: kb.addKey('R'),
    } as any;
  }

  /* ============================================================
   *  触屏控件 — 全部 setScrollFactor(0), 屏幕固定
   * ============================================================ */
  private setupTouchControls(): void {
    // === 左摇杆 (全部屏幕坐标, setScrollFactor(0)) ===
    const bx = this.joystickCenterX;
    const by = this.joystickCenterY;

    this.joystickBorder = this.scene.add.circle(bx, by, this.joystickRadius + 12, 0xffffff, 0.08);
    this.joystickBorder.setStrokeStyle(3, 0xffffff, 0.5);
    this.joystickBorder.setScrollFactor(0).setDepth(1000).setInteractive();

    this.joystickBase = this.scene.add.circle(bx, by, this.joystickRadius, 0xffffff, 0.18);
    this.joystickBase.setStrokeStyle(3, 0xffffff, 0.4);
    this.joystickBase.setScrollFactor(0).setDepth(1001).setInteractive();

    this.joystickKnob = this.scene.add.circle(bx, by, 36, 0xffffff, 0.5);
    this.joystickKnob.setStrokeStyle(2, 0xffffff, 0.8);
    this.joystickKnob.setScrollFactor(0).setDepth(1002).setInteractive();

    // === 右侧三个按钮 (屏幕固定位置, setScrollFactor(0)) ===
    // 射 (大红, 右下)
    const fireX = GAME_WIDTH - 150, fireY = GAME_HEIGHT - 170;
    // 跳 (蓝色, 右上)
    const jumpX = GAME_WIDTH - 270, jumpY = GAME_HEIGHT - 310;
    // 弹 (黄色, 中间右)
    const reloadX = GAME_WIDTH - 270, reloadY = GAME_HEIGHT - 160;

    this.btnFire = this.makeButton(fireX, fireY, 72, 0xff1744);
    this.btnFireLabel = this.scene.add.text(fireX, fireY, '射', {
      fontSize: '34px', color: '#fff', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1005);

    this.btnJump = this.makeButton(jumpX, jumpY, 52, 0x2196f3);
    this.btnJumpLabel = this.scene.add.text(jumpX, jumpY, '跳', {
      fontSize: '28px', color: '#fff', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1005);

    this.btnReload = this.makeButton(reloadX, reloadY, 48, 0xffc107);
    this.btnReloadLabel = this.scene.add.text(reloadX, reloadY, '弹', {
      fontSize: '26px', color: '#222', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1005);

    this.bindJoystick();
    this.bindButton(this.btnFire, this.firePointer, 'fire');
    this.bindButton(this.btnJump, this.jumpPointer, 'jump');
    this.bindButton(this.btnReload, this.reloadPointer, 'reload');

    console.log('[InputManager] 触屏控件初始化完成');
  }

  /** 创建一个按钮: 视觉圆 (Arc) + 交互 Zone, 全部 setScrollFactor(0) */
  private makeButton(x: number, y: number, radius: number, color: number): Phaser.GameObjects.Zone {
    // 视觉圆 — 只是装饰
    const visual = this.scene.add.circle(x, y, radius, color, 0.45);
    visual.setStrokeStyle(3, color, 0.9);
    visual.setScrollFactor(0).setDepth(1004);

    // 交互 Zone — setScrollFactor(0) 固定屏幕, 用 Circle 做 hit area
    const zone = this.scene.add.zone(x, y, radius * 2, radius * 2);
    zone.setScrollFactor(0);
    zone.setDepth(1003);
    zone.setInteractive(
      new Phaser.Geom.Circle(0, 0, radius),
      Phaser.Geom.Circle.Contains
    );

    (zone as any)._visual = visual;
    (zone as any)._baseFill = color;
    return zone;
  }

  /* ============================================================
   *  摇杆 (用 pointer.x/y 屏幕坐标计算, 不再需要 camera scroll 修正)
   * ============================================================ */
  private bindJoystick(): void {
    const targets = [this.joystickBase, this.joystickKnob, this.joystickBorder].filter(Boolean);

    const onDown = (pointer: Phaser.Input.Pointer) => {
      if (this.joystickPointer.active) return;
      this.joystickPointer.pointerId = pointer.id;
      this.joystickPointer.active = true;
      this.updateJoystick(pointer);
      this.joystickBorder?.setStrokeStyle(4, 0xffffff, 0.9);
      this.scene.input.on('pointermove', this.handleJoystickMove, this);
      this.scene.input.on('pointerup', this.handleJoystickUp, this);
      this.scene.input.on('pointerupoutside', this.handleJoystickUp, this);
    };

    targets.forEach(t => t!.on('pointerdown', onDown));
  }

  private handleJoystickMove(pointer: Phaser.Input.Pointer): void {
    if (!this.joystickPointer.active || pointer.id !== this.joystickPointer.pointerId) return;
    this.updateJoystick(pointer);
  }

  private handleJoystickUp(pointer: Phaser.Input.Pointer): void {
    if (!this.joystickPointer.active || pointer.id !== this.joystickPointer.pointerId) return;
    this.joystickPointer.active = false;
    this.joystickPointer.pointerId = -1;
    this.moveAxis = 0;
    // 直接回到屏幕坐标原点, 不需要 camera scroll
    this.joystickKnob?.setPosition(this.joystickCenterX, this.joystickCenterY);
    this.joystickBorder?.setStrokeStyle(3, 0xffffff, 0.5);
    this.scene.input.off('pointermove', this.handleJoystickMove, this);
    this.scene.input.off('pointerup', this.handleJoystickUp, this);
    this.scene.input.off('pointerupoutside', this.handleJoystickUp, this);
  }

  private updateJoystick(pointer: Phaser.Input.Pointer): void {
    // 直接用 pointer.x / pointer.y (屏幕坐标) 和 joystickCenterX/Y 做对比
    // 因为摇杆 setScrollFactor(0) 固定在屏幕上, 所以屏幕坐标就是它的"本地坐标"
    const dx = pointer.x - this.joystickCenterX;
    const dy = pointer.y - this.joystickCenterY;
    const dist = Math.min(Math.hypot(dx, dy), this.joystickRadius);
    if (dist < 4) {
      this.moveAxis = 0;
      this.joystickKnob?.setPosition(this.joystickCenterX, this.joystickCenterY);
      return;
    }
    const angle = Math.atan2(dy, dx);
    const kx = Math.cos(angle) * dist;
    const ky = Math.sin(angle) * dist;
    this.joystickKnob?.setPosition(this.joystickCenterX + kx, this.joystickCenterY + ky);
    this.moveAxis = Math.sign(kx) * Math.min(1, dist / this.joystickRadius);
  }

  /* ============================================================
   *  按钮绑定
   * ============================================================ */
  private bindButton(btn: Phaser.GameObjects.Zone, state: TouchState, type: 'fire' | 'jump' | 'reload'): void {
    const visual = (btn as any)._visual as Phaser.GameObjects.Arc;
    const baseFill = (btn as any)._baseFill as number;

    const onDown = (pointer: Phaser.Input.Pointer) => {
      if (state.active) return;
      state.active = true;
      state.pointerId = pointer.id;
      console.log(`[InputManager] ${type} pointerdown! ptr=(${pointer.x.toFixed(0)},${pointer.y.toFixed(0)}) screen`);
      // 视觉反馈
      visual.setScale(0.85);
      visual.setFillStyle(baseFill, 0.9);
      visual.setStrokeStyle(4, baseFill, 1.0);
      if (navigator.vibrate) navigator.vibrate(20);
      if (type === 'fire') this.firing = true;
      if (type === 'jump') this.jumpPressed = true;
      if (type === 'reload') this.reloadPressed = true;
    };
    const onUp = (pointer: Phaser.Input.Pointer) => {
      if (!state.active || pointer.id !== state.pointerId) return;
      state.active = false;
      state.pointerId = -1;
      console.log(`[InputManager] ${type} pointerup!`);
      visual.setScale(1);
      visual.setFillStyle(baseFill, 0.45);
      visual.setStrokeStyle(3, baseFill, 0.9);
      if (type === 'fire') this.firing = false;
    };
    btn.on('pointerdown', onDown);
    btn.on('pointerup', onUp);
    btn.on('pointerupoutside', onUp);
    btn.on('pointercancel', onUp);
  }

  /* ============================================================
   *  每帧更新 — 不再有 followCamera! 全部靠 setScrollFactor(0) 自动固定
   * ============================================================ */

  public update(): InputSnapshot {
    const k = this.keys;

    // 键盘移动 (触屏摇杆 > 键盘)
    let kbAxis = 0;
    if (k?.left?.isDown) kbAxis -= 1;
    if (k?.right?.isDown) kbAxis += 1;
    if (!this.isMobile || !this.joystickPointer.active) {
      this.moveAxis = kbAxis !== 0 ? kbAxis : 0;
    }

    // 键盘: jump / reload / fire 都是单次触发
    if (Phaser.Input.Keyboard.JustDown(k?.jump)) this.jumpPressed = true;
    if (Phaser.Input.Keyboard.JustDown((k as any)?.jumpSpace)) this.jumpPressed = true;
    if (Phaser.Input.Keyboard.JustDown(k?.reload)) this.reloadPressed = true;
    if (Phaser.Input.Keyboard.JustDown(k?.fire)) this.firing = true;
    else if (!this.firePointer.active) this.firing = false;

    return this.snapshot();
  }

  public consumeFire(): boolean {
    if (this.firing) {
      this.firing = false;
      return true;
    }
    return false;
  }

  public consumeJump(): boolean {
    const v = this.jumpPressed;
    this.jumpPressed = false;
    return v;
  }

  public consumeReload(): boolean {
    const v = this.reloadPressed;
    this.reloadPressed = false;
    return v;
  }

  private snapshot(): InputSnapshot {
    return {
      moveAxis: this.moveAxis,
      jumpPressed: this.jumpPressed,
      firing: this.firing,
      reloadPressed: this.reloadPressed,
      isMobile: this.isMobile,
    };
  }

  public destroy(): void {
    this.joystickBase?.destroy();
    this.joystickKnob?.destroy();
    this.joystickBorder?.destroy();
    this.btnFire?.destroy();
    this.btnFireLabel?.destroy();
    this.btnJump?.destroy();
    this.btnJumpLabel?.destroy();
    this.btnReload?.destroy();
    this.btnReloadLabel?.destroy();
  }
}
