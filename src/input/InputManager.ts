/**
 * 暴徒猎手风格触屏控件 + 键盘输入统一接口
 *
 * 左侧: 虚拟摇杆 (中心160px, 半径80px, 追踪单指)
 * 右侧: 三个按钮 (大尺寸): 射击/跳跃/换弹
 *
 * 关键修复:
 * - 移动端 pointer 会被 Phaser 处理, 但我们自己的 overlay (rotate-hint) 已在竖屏隐藏
 * - 按钮用 Phaser.GameObjects.Arc + Circle.setInteractive, 不依赖 DOM
 * - 每个 pointer 在 down/move/up 全程追踪, 避免多指冲突
 */
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig';

export interface InputSnapshot {
  moveAxis: number;       // -1 左, 0 停, 1 右
  jumpPressed: boolean;    // 单次触发 (消费后清空)
  firing: boolean;         // 持续射击
  reloadPressed: boolean;  // 单次触发
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
  public isMobile;

  private scene: Phaser.Scene;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  // ---- 摇杆 ----
  private joystickBase?: Phaser.GameObjects.Arc;
  private joystickKnob?: Phaser.GameObjects.Arc;
  private joystickBorder?: Phaser.GameObjects.Arc;
  private joystickPointer: TouchState = { pointerId: -1, active: false };
  private joystickCenterX = 160;
  private joystickCenterY = 0;
  private joystickRadius = 80;

  // ---- 按钮 ----
  private btnFire?: Phaser.GameObjects.Arc;
  private btnFireLabel?: Phaser.GameObjects.Text;
  private btnJump?: Phaser.GameObjects.Arc;
  private btnJumpLabel?: Phaser.GameObjects.Text;
  private btnReload?: Phaser.GameObjects.Arc;
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

    kb.on('keydown-SPACE', () => { this.jumpPressed = true; });
  }

  /* =========================================================
   *  暴徒猎手风格 — 左侧大摇杆 + 右侧大按钮
   * ========================================================= */
  private setupTouchControls(): void {
    // 摇杆中心: 左下区域, 靠左下角留间距
    this.joystickCenterY = GAME_HEIGHT - 160;

    const baseX = this.joystickCenterX;
    const baseY = this.joystickCenterY;

    // 摇杆外圈 (透明圆 显示边界)
    this.joystickBorder = this.scene.add.circle(baseX, baseY, this.joystickRadius + 10, 0xffffff, 0.08);
    this.joystickBorder.setStrokeStyle(3, 0xffffff, 0.5);
    this.joystickBorder.setScrollFactor(0).setDepth(1000).setInteractive();

    // 摇杆内圈 (实际按下区域)
    this.joystickBase = this.scene.add.circle(baseX, baseY, this.joystickRadius, 0xffffff, 0.18);
    this.joystickBase.setStrokeStyle(3, 0xffffff, 0.4);
    this.joystickBase.setScrollFactor(0).setDepth(1001);

    // 摇杆头 (可拖拽的圆球)
    this.joystickKnob = this.scene.add.circle(baseX, baseY, 36, 0xffffff, 0.5);
    this.joystickKnob.setStrokeStyle(2, 0xffffff, 0.8);
    this.joystickKnob.setScrollFactor(0).setDepth(1002);

    // ---- 右侧按钮区 ----
    const rightX = GAME_WIDTH - 150;
    const bottomY = GAME_HEIGHT - 160;

    // 射击按钮 (最大、最醒目)
    this.btnFire = this.makeButton(rightX, bottomY, 62, 0xff1744, '射');
    this.btnFireLabel = this.scene.add.text(rightX, bottomY, '射', {
      fontSize: '26px', color: '#fff', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1005);

    // 跳跃按钮 (右上)
    this.btnJump = this.makeButton(rightX - 110, bottomY - 40, 46, 0x4fc3f7, '跳');
    this.btnJumpLabel = this.scene.add.text(rightX - 110, bottomY - 40, '跳', {
      fontSize: '20px', color: '#fff', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1005);

    // 换弹按钮 (右下)
    this.btnReload = this.makeButton(rightX - 40, bottomY - 110, 42, 0xffc107, '弹');
    this.btnReloadLabel = this.scene.add.text(rightX - 40, bottomY - 110, '弹', {
      fontSize: '18px', color: '#000', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1005);

    // 绑定 pointer 事件 (每个按钮独立追踪)
    this.bindJoystick();
    this.bindButton(this.btnFire, this.firePointer, 'fire');
    this.bindButton(this.btnJump, this.jumpPointer, 'jump');
    this.bindButton(this.btnReload, this.reloadPointer, 'reload');
  }

  private makeButton(x: number, y: number, radius: number, color: number, label: string): Phaser.GameObjects.Arc {
    const btn = this.scene.add.circle(x, y, radius, color, 0.45);
    btn.setStrokeStyle(3, color, 0.9);
    btn.setScrollFactor(0).setDepth(1004);
    btn.setInteractive(
      new Phaser.Geom.Circle(x, y, radius),
      Phaser.Geom.Circle.Contains
    );
    (btn as any)._radius = radius;
    (btn as any)._baseFill = color;
    return btn;
  }

  private bindJoystick(): void {
    if (!this.joystickBase || !this.joystickKnob) return;

    this.joystickBase.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.joystickPointer.active) return;
      this.joystickPointer.pointerId = pointer.id;
      this.joystickPointer.active = true;
      this.updateJoystick(pointer);
      this.scene.input.on('pointermove', this.handleJoystickMove, this);
      this.scene.input.on('pointerup', this.handleJoystickUp, this);
      this.scene.input.on('pointerupoutside', this.handleJoystickUp, this);
    });
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
    this.joystickKnob?.setPosition(this.joystickCenterX, this.joystickCenterY);
    this.scene.input.off('pointermove', this.handleJoystickMove, this);
    this.scene.input.off('pointerup', this.handleJoystickUp, this);
    this.scene.input.off('pointerupoutside', this.handleJoystickUp, this);
  }

  private updateJoystick(pointer: Phaser.Input.Pointer): void {
    const dx = pointer.x - this.joystickCenterX;
    const dy = pointer.y - this.joystickCenterY;
    const dist = Math.min(Math.hypot(dx, dy), this.joystickRadius);
    const angle = Math.atan2(dy, dx);
    const kx = Math.cos(angle) * dist;
    const ky = Math.sin(angle) * dist;
    this.joystickKnob?.setPosition(this.joystickCenterX + kx, this.joystickCenterY + ky);
    // 水平轴 (横版游戏只需要左右移动)
    const hRatio = Math.abs(kx) < 6 ? 0 : Math.sign(kx) * Math.min(1, dist / this.joystickRadius);
    this.moveAxis = hRatio;
  }

  private bindButton(btn: Phaser.GameObjects.Arc, state: TouchState, type: 'fire' | 'jump' | 'reload'): void {
    btn.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (state.active) return;
      state.active = true;
      state.pointerId = pointer.id;
      // 视觉按压: 加深
      (btn as Phaser.GameObjects.Arc).setScale(0.92);
      if (type === 'fire') this.firing = true;
      if (type === 'jump') this.jumpPressed = true;
      if (type === 'reload') this.reloadPressed = true;
    });
    const upHandler = (pointer: Phaser.Input.Pointer) => {
      if (!state.active || pointer.id !== state.pointerId) return;
      state.active = false;
      state.pointerId = -1;
      btn.setScale(1);
      if (type === 'fire') this.firing = false;
    };
    btn.on('pointerup', upHandler);
    btn.on('pointerupoutside', upHandler);
    // 手指滑出按钮也应释放: 注册全局 move 检查
    btn.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!state.active || pointer.id !== state.pointerId) return;
      const r = (btn as any)._radius;
      const cx = btn.x, cy = btn.y;
      const dist = Math.hypot(pointer.x - cx, pointer.y - cy);
      if (dist > r * 1.2) {
        // 滑出 — 继续按住 fire 不松, 但不再 jump/reload
        if (type === 'fire') {
          // fire 保持持续; 滑出不松开
        } else {
          state.active = false;
          state.pointerId = -1;
          btn.setScale(1);
        }
      }
    });
  }

  /* =========================================================
   *  每帧更新 (键盘 + 触屏混合)
   * ========================================================= */
  public update(): InputSnapshot {
    const k = this.keys;
    if (!k) return this.snapshot();

    // 键盘移动 (优先级: 触屏摇杆 > 键盘)
    let kbAxis = 0;
    if (k.left?.isDown) kbAxis -= 1;
    if (k.right?.isDown) kbAxis += 1;
    if (!this.isMobile || !this.joystickPointer.active) {
      this.moveAxis = kbAxis !== 0 ? kbAxis : 0;
    }

    // 跳跃单次触发
    if (Phaser.Input.Keyboard.JustDown(k.jump)) this.jumpPressed = true;
    if (Phaser.Input.Keyboard.JustDown((k as any).jumpSpace)) this.jumpPressed = true;

    // 射击 (按住 J)
    if (k.fire?.isDown) {
      this.firing = true;
    } else if (!this.firePointer.active) {
      this.firing = false;
    }

    // 换弹单次
    if (Phaser.Input.Keyboard.JustDown(k.reload)) this.reloadPressed = true;

    return this.snapshot();
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

  /** 场景销毁时清理 */
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
