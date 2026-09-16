/**
 * 暴徒猎手 (Huntdown) 风格触屏控件 + 键盘输入统一接口
 *
 * 关键设计:
 * - 左摇杆 (移动) + 右侧三个大按钮 (射 / 跳 / 弹)
 * - 不使用 setScrollFactor(0), 每帧根据 camera.scroll 手动更新 UI 位置
 * - 射击: tap 单发 (不是按住连发), 通过 consumeFire() 一次性消费
 * - 跳跃: tap 单次 (consumeJump)
 * - 换弹: tap 单次 (consumeReload)
 * - 每个按钮都有按压视觉反馈 + 震动
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
  pressedThisFrame: boolean;  // 本帧是否刚刚被按下 (用于单次触发)
}

export class InputManager implements InputSnapshot {
  public moveAxis = 0;
  public jumpPressed = false;
  public firing = false;
  public reloadPressed = false;
  public isMobile: boolean;

  private scene: Phaser.Scene;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  // ---- 摇杆 ----
  private joystickBase?: Phaser.GameObjects.Arc;
  private joystickKnob?: Phaser.GameObjects.Arc;
  private joystickBorder?: Phaser.GameObjects.Arc;
  private joystickPointer: TouchState = { pointerId: -1, active: false, pressedThisFrame: false };
  private joystickCenterX = 160;
  private joystickCenterY = 0;
  private joystickRadius = 80;

  // ---- 按钮 (全部用中文标签) ----
  private btnFire?: Phaser.GameObjects.Arc;
  private btnFireLabel?: Phaser.GameObjects.Text;
  private btnJump?: Phaser.GameObjects.Arc;
  private btnJumpLabel?: Phaser.GameObjects.Text;
  private btnReload?: Phaser.GameObjects.Arc;
  private btnReloadLabel?: Phaser.GameObjects.Text;

  // 屏幕锚点 (相对 camera view) — 按钮布局拉开间距, 好按
  private anchors = {
    joystickBaseX: 160,
    joystickBaseY: 0,
    // 射击 (最大最显眼, 右下)
    fireX: 0, fireY: 0,
    // 跳跃 (右上, 蓝色, 比射小一点)
    jumpX: 0, jumpY: 0,
    // 换弹 (中间右, 黄色)
    reloadX: 0, reloadY: 0,
  };

  private firePointer: TouchState = { pointerId: -1, active: false, pressedThisFrame: false };
  private jumpPointer: TouchState = { pointerId: -1, active: false, pressedThisFrame: false };
  private reloadPointer: TouchState = { pointerId: -1, active: false, pressedThisFrame: false };

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
    return isTouch || isUA;
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
   *  触屏控件 — 左侧大摇杆 + 右侧三个中文按钮
   * ============================================================ */
  private setupTouchControls(): void {
    // 摇杆: 左下
    this.joystickCenterY = GAME_HEIGHT - 160;
    this.anchors.joystickBaseX = this.joystickCenterX;
    this.anchors.joystickBaseY = this.joystickCenterY;

    // 右侧按钮布局 — 三角形拉开间距
    // 射 (最大最红, 右下)
    this.anchors.fireX = GAME_WIDTH - 150;
    this.anchors.fireY = GAME_HEIGHT - 170;
    // 跳 (蓝色, 右上)
    this.anchors.jumpX = GAME_WIDTH - 270;
    this.anchors.jumpY = GAME_HEIGHT - 310;
    // 弹 (黄色, 中间)
    this.anchors.reloadX = GAME_WIDTH - 270;
    this.anchors.reloadY = GAME_HEIGHT - 160;

    // 摇杆
    const baseX = this.joystickCenterX;
    const baseY = this.joystickCenterY;
    this.joystickBorder = this.scene.add.circle(baseX, baseY, this.joystickRadius + 12, 0xffffff, 0.08);
    this.joystickBorder.setStrokeStyle(3, 0xffffff, 0.5);
    this.joystickBorder.setDepth(1000).setInteractive();

    this.joystickBase = this.scene.add.circle(baseX, baseY, this.joystickRadius, 0xffffff, 0.18);
    this.joystickBase.setStrokeStyle(3, 0xffffff, 0.4);
    this.joystickBase.setDepth(1001).setInteractive();

    this.joystickKnob = this.scene.add.circle(baseX, baseY, 36, 0xffffff, 0.5);
    this.joystickKnob.setStrokeStyle(2, 0xffffff, 0.8);
    this.joystickKnob.setDepth(1002).setInteractive();

    // 按钮 — 全中文标签
    this.btnFire = this.makeButton(this.anchors.fireX, this.anchors.fireY, 72, 0xff1744, '射');
    this.btnFireLabel = this.scene.add.text(this.anchors.fireX, this.anchors.fireY, '射', {
      fontSize: '34px', color: '#fff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(1005);

    this.btnJump = this.makeButton(this.anchors.jumpX, this.anchors.jumpY, 52, 0x2196f3, '跳');
    this.btnJumpLabel = this.scene.add.text(this.anchors.jumpX, this.anchors.jumpY, '跳', {
      fontSize: '28px', color: '#fff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(1005);

    this.btnReload = this.makeButton(this.anchors.reloadX, this.anchors.reloadY, 48, 0xffc107, '弹');
    this.btnReloadLabel = this.scene.add.text(this.anchors.reloadX, this.anchors.reloadY, '弹', {
      fontSize: '26px', color: '#222', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(1005);

    this.bindJoystick();
    this.bindButton(this.btnFire, this.firePointer, 'fire');
    this.bindButton(this.btnJump, this.jumpPointer, 'jump');
    this.bindButton(this.btnReload, this.reloadPointer, 'reload');

    this.followCamera();
  }

  private makeButton(x: number, y: number, radius: number, color: number, _label: string): Phaser.GameObjects.Arc {
    const btn = this.scene.add.circle(x, y, radius, color, 0.45);
    btn.setStrokeStyle(3, color, 0.9);
    btn.setDepth(1004);
    btn.setInteractive(
      new Phaser.Geom.Circle(0, 0, radius),
      Phaser.Geom.Circle.Contains
    );
    (btn as any)._radius = radius;
    (btn as any)._baseFill = color;
    return btn;
  }

  /** 每帧根据 camera scroll 更新所有 UI 元素的 world position */
  private followCamera(): void {
    const cam = this.scene.cameras.main;
    const ox = cam.scrollX;
    const oy = cam.scrollY;

    const jx = this.anchors.joystickBaseX + ox;
    const jy = this.anchors.joystickBaseY + oy;
    this.joystickBase?.setPosition(jx, jy);
    this.joystickBorder?.setPosition(jx, jy);
    if (this.joystickKnob) {
      const dx = this.joystickKnob.x - (this.joystickBase?.x ?? jx);
      const dy = this.joystickKnob.y - (this.joystickBase?.y ?? jy);
      this.joystickKnob.setPosition(jx + dx, jy + dy);
    }

    const updateBtn = (btn?: Phaser.GameObjects.Arc, label?: Phaser.GameObjects.Text, ax = 0, ay = 0) => {
      const wx = ax + ox;
      const wy = ay + oy;
      btn?.setPosition(wx, wy);
      label?.setPosition(wx, wy);
    };

    updateBtn(this.btnFire, this.btnFireLabel, this.anchors.fireX, this.anchors.fireY);
    updateBtn(this.btnJump, this.btnJumpLabel, this.anchors.jumpX, this.anchors.jumpY);
    updateBtn(this.btnReload, this.btnReloadLabel, this.anchors.reloadX, this.anchors.reloadY);
  }

  private bindJoystick(): void {
    if (!this.joystickBase || !this.joystickKnob) return;

    const onDown = (pointer: Phaser.Input.Pointer) => {
      if (this.joystickPointer.active) return;
      this.joystickPointer.pointerId = pointer.id;
      this.joystickPointer.active = true;
      this.joystickPointer.pressedThisFrame = true;
      this.updateJoystick(pointer);
      this.joystickBorder?.setStrokeStyle(4, 0xffffff, 0.9);
      this.scene.input.on('pointermove', this.handleJoystickMove, this);
      this.scene.input.on('pointerup', this.handleJoystickUp, this);
      this.scene.input.on('pointerupoutside', this.handleJoystickUp, this);
    };

    this.joystickBase.on('pointerdown', onDown);
    this.joystickKnob.on('pointerdown', onDown);
    this.joystickBorder?.on('pointerdown', onDown);
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
    const jx = this.anchors.joystickBaseX + this.scene.cameras.main.scrollX;
    const jy = this.anchors.joystickBaseY + this.scene.cameras.main.scrollY;
    this.joystickKnob?.setPosition(jx, jy);
    this.joystickBorder?.setStrokeStyle(3, 0xffffff, 0.5);
    this.scene.input.off('pointermove', this.handleJoystickMove, this);
    this.scene.input.off('pointerup', this.handleJoystickUp, this);
    this.scene.input.off('pointerupoutside', this.handleJoystickUp, this);
  }

  private updateJoystick(pointer: Phaser.Input.Pointer): void {
    const jx = this.anchors.joystickBaseX + this.scene.cameras.main.scrollX;
    const jy = this.anchors.joystickBaseY + this.scene.cameras.main.scrollY;
    const dx = pointer.worldX - jx;
    const dy = pointer.worldY - jy;
    const dist = Math.min(Math.hypot(dx, dy), this.joystickRadius);
    if (dist < 4) {
      this.moveAxis = 0;
      this.joystickKnob?.setPosition(jx, jy);
      return;
    }
    const angle = Math.atan2(dy, dx);
    const kx = Math.cos(angle) * dist;
    const ky = Math.sin(angle) * dist;
    this.joystickKnob?.setPosition(jx + kx, jy + ky);
    this.moveAxis = Math.sign(kx) * Math.min(1, dist / this.joystickRadius);
  }

  /**
   * 按钮绑定 — 每次 pointerdown 都标记 pressedThisFrame=true (供 consumeFire/consumeJump/consumeReload 消费)
   * 所有按钮都是 tap 单次触发, 不按住连发
   */
  private bindButton(btn: Phaser.GameObjects.Arc, state: TouchState, type: 'fire' | 'jump' | 'reload'): void {
    const onDown = (pointer: Phaser.Input.Pointer) => {
      if (state.active) return;
      state.active = true;
      state.pointerId = pointer.id;
      state.pressedThisFrame = true;
      // 按压反馈: 缩小 + 加深 + 边框加粗 + 震动
      btn.setScale(0.85);
      (btn as any).setFillStyle?.((btn as any)._baseFill, 0.9);
      btn.setStrokeStyle(4, (btn as any)._baseFill, 1.0);
      if (navigator.vibrate) navigator.vibrate(20);

      if (type === 'fire') this.firing = true;
      if (type === 'jump') this.jumpPressed = true;
      if (type === 'reload') this.reloadPressed = true;
    };
    const onUp = (pointer: Phaser.Input.Pointer) => {
      if (!state.active || pointer.id !== state.pointerId) return;
      state.active = false;
      state.pointerId = -1;
      state.pressedThisFrame = false;
      // 回弹
      btn.setScale(1);
      (btn as any).setFillStyle?.((btn as any)._baseFill, 0.45);
      btn.setStrokeStyle(3, (btn as any)._baseFill, 0.9);

      // 松开后所有按钮状态都复位 (tap 模式)
      if (type === 'fire') this.firing = false;
    };
    btn.on('pointerdown', onDown);
    btn.on('pointerup', onUp);
    btn.on('pointerupoutside', onUp);
    btn.on('pointercancel', onUp);
  }

  /* ============================================================
   *  每帧更新
   * ============================================================ */

  public update(): InputSnapshot {
    if (this.isMobile) {
      this.followCamera();
    }

    const k = this.keys;
    if (!k) return this.snapshot();

    // 键盘移动 (触屏摇杆 > 键盘)
    let kbAxis = 0;
    if (k.left?.isDown) kbAxis -= 1;
    if (k.right?.isDown) kbAxis += 1;
    if (!this.isMobile || !this.joystickPointer.active) {
      this.moveAxis = kbAxis !== 0 ? kbAxis : 0;
    }

    // 键盘: jump / reload / fire 都是单次触发
    if (Phaser.Input.Keyboard.JustDown(k.jump)) this.jumpPressed = true;
    if (Phaser.Input.Keyboard.JustDown((k as any).jumpSpace)) this.jumpPressed = true;
    if (Phaser.Input.Keyboard.JustDown(k.reload)) this.reloadPressed = true;
    // fire 键盘也改成单次
    if (Phaser.Input.Keyboard.JustDown(k.fire)) this.firing = true;
    else if (!this.firePointer.active) this.firing = false;

    return this.snapshot();
  }

  /** 消费一次 fire 按下事件 — 发射单发子弹 */
  public consumeFire(): boolean {
    // 触屏按钮: firing 在 pointerdown 时 true, pointerup 时 false
    // 我们把它当作一个一次性事件消费掉
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
