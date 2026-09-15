/**
 * 输入管理器
 * - PC: 键盘 A/D 移动, W/空格 跳跃, J/鼠标 射击, R 换弹, ESC 暂停
 * - 移动端: 左侧虚拟摇杆移动, 右侧 射击/跳跃/换弹 按钮
 * 统一对外暴露 moveAxis(-1~1), jumpPressed, firing, reloadPressed
 */
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig';

export class InputManager {
  public moveAxis = 0; // -1 左, 0 静止, 1 右
  public jumpPressed = false; // 单次触发
  public firing = false; // 持续射击
  public reloadPressed = false; // 单次触发
  public isMobile = false;

  private scene: Phaser.Scene;
  private keys!: {
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    jump: Phaser.Input.Keyboard.Key;
    fire: Phaser.Input.Keyboard.Key;
    reload: Phaser.Input.Keyboard.Key;
  };

  // 移动端虚拟控件
  private joystickBase?: Phaser.GameObjects.Container;
  private joystickKnob?: Phaser.GameObjects.Arc;
  private joystickPointerId: number | null = null;
  private joystickCenter = new Phaser.Geom.Point(0, 0);
  private joystickRadius = 80;

  private btnFire?: Phaser.GameObjects.Arc;
  private btnJump?: Phaser.GameObjects.Arc;
  private btnReload?: Phaser.GameObjects.Arc;

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
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || ('ontouchstart' in window && navigator.maxTouchPoints > 0);
  }

  private setupKeyboard(): void {
    const kb = this.scene.input.keyboard;
    if (!kb) return;
    this.keys = {
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      jump: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      fire: kb.addKey(Phaser.Input.Keyboard.KeyCodes.J),
      reload: kb.addKey(Phaser.Input.Keyboard.KeyCodes.R),
    };
    // 空格也可跳跃
    kb.on('keydown-SPACE', () => {
      this.jumpPressed = true;
    });
  }

  private setupTouchControls(): void {
    const cam = this.scene.cameras.main;
    const w = GAME_WIDTH;
    const h = GAME_HEIGHT;

    // ---- 左侧虚拟摇杆 ----
    const baseX = 160;
    const baseY = h - 160;
    this.joystickCenter.setTo(baseX, baseY);

    const baseCircle = this.scene.add.circle(0, 0, this.joystickRadius, 0xffffff, 0.15);
    baseCircle.setStrokeStyle(3, 0xffffff, 0.4);
    this.joystickKnob = this.scene.add.circle(0, 0, 36, 0xffffff, 0.35);
    this.joystickKnob.setStrokeStyle(2, 0xffffff, 0.6);

    this.joystickBase = this.scene.add.container(baseX, baseY, [baseCircle, this.joystickKnob]);
    this.joystickBase.setScrollFactor(0);
    this.joystickBase.setDepth(1000);
    this.joystickBase.setSize(this.joystickRadius * 2, this.joystickRadius * 2);
    this.joystickBase.setInteractive(
      new Phaser.Geom.Circle(0, 0, this.joystickRadius),
      Phaser.Geom.Circle.Contains
    );

    // ---- 右侧按钮 ----
    const rightBaseX = w - 160;
    const rightBaseY = h - 160;

    this.btnFire = this.makeTouchButton(rightBaseX, rightBaseY, 60, 0xff1744, '射');
    this.btnJump = this.makeTouchButton(rightBaseX - 120, rightBaseY - 40, 48, 0x4fc3f7, '跳');
    this.btnReload = this.makeTouchButton(rightBaseX - 40, rightBaseY - 120, 44, 0xffc107, '弹');

    // 绑定事件
    this.scene.input.on('pointerdown', this.onPointerDown, this);
    this.scene.input.on('pointermove', this.onPointerMove, this);
    this.scene.input.on('pointerup', this.onPointerUp, this);
    this.scene.input.on('pointercancel', this.onPointerUp, this);
  }

  private makeTouchButton(
    x: number,
    y: number,
    radius: number,
    color: number,
    label: string
  ): Phaser.GameObjects.Arc {
    const btn = this.scene.add.circle(x, y, radius, color, 0.35);
    btn.setStrokeStyle(3, color, 0.8);
    btn.setScrollFactor(0);
    btn.setDepth(1000);
    btn.setInteractive(
      new Phaser.Geom.Circle(x, y, radius),
      Phaser.Geom.Circle.Contains
    );
    const txt = this.scene.add.text(x, y, label, {
      fontSize: '22px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    txt.setOrigin(0.5);
    txt.setScrollFactor(0);
    txt.setDepth(1001);
    return btn;
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    // 摇杆
    if (this.pointerInCircle(pointer, this.joystickCenter.x, this.joystickCenter.y, this.joystickRadius)) {
      if (this.joystickPointerId === null) {
        this.joystickPointerId = pointer.id;
        this.updateJoystick(pointer);
      }
      return;
    }
    // 按钮
    if (this.btnFire && this.pointerInCircle(pointer, this.btnFire.x, this.btnFire.y, this.btnFire.radius)) {
      this.firing = true;
      return;
    }
    if (this.btnJump && this.pointerInCircle(pointer, this.btnJump.x, this.btnJump.y, this.btnJump.radius)) {
      this.jumpPressed = true;
      return;
    }
    if (this.btnReload && this.pointerInCircle(pointer, this.btnReload.x, this.btnReload.y, this.btnReload.radius)) {
      this.reloadPressed = true;
      return;
    }
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.joystickPointerId === pointer.id) {
      this.updateJoystick(pointer);
    }
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (this.joystickPointerId === pointer.id) {
      this.joystickPointerId = null;
      this.moveAxis = 0;
      if (this.joystickKnob) this.joystickKnob.setPosition(0, 0);
    }
    if (this.btnFire && this.pointerInCircle(pointer, this.btnFire.x, this.btnFire.y, this.btnFire.radius)) {
      this.firing = false;
    }
  }

  private updateJoystick(pointer: Phaser.Input.Pointer): void {
    const dx = pointer.x - this.joystickCenter.x;
    const dy = pointer.y - this.joystickCenter.y;
    const dist = Math.min(Math.hypot(dx, dy), this.joystickRadius);
    const angle = Math.atan2(dy, dx);
    const kx = Math.cos(angle) * dist;
    const ky = Math.sin(angle) * dist;
    if (this.joystickKnob) this.joystickKnob.setPosition(kx, ky);
    // 只取水平轴作为移动 (横版)
    this.moveAxis = Math.abs(kx) < 8 ? 0 : Math.sign(kx) * Math.min(1, dist / this.joystickRadius);
  }

  private pointerInCircle(
    pointer: Phaser.Input.Pointer,
    cx: number,
    cy: number,
    r: number
  ): boolean {
    return Math.hypot(pointer.x - cx, pointer.y - cy) <= r;
  }

  /** 每帧更新键盘输入 (调用后 jumpPressed/reloadPressed 会被消费) */
  public update(): void {
    const k = this.keys;
    if (!k) return;
    // 键盘移动
    let kbAxis = 0;
    if (k.left.isDown) kbAxis -= 1;
    if (k.right.isDown) kbAxis += 1;
    if (kbAxis !== 0) this.moveAxis = kbAxis;
    else if (!this.isMobile || this.joystickPointerId === null) {
      this.moveAxis = 0;
    }
    // 键盘跳跃
    if (Phaser.Input.Keyboard.JustDown(k.jump)) {
      this.jumpPressed = true;
    }
    // 键盘射击 (按住 J 持续射击)
    this.firing = k.fire.isDown || this.firing;
    if (!k.fire.isDown && !this.isTouchFiring()) {
      this.firing = false;
    }
    // 换弹
    if (Phaser.Input.Keyboard.JustDown(k.reload)) {
      this.reloadPressed = true;
    }
  }

  private isTouchFiring(): boolean {
    // 移动端 firing 状态由 pointer 事件维护
    return this.isMobile && this.firing;
  }

  /** 消费单次触发信号 */
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

  public destroy(): void {
    this.scene.input.off('pointerdown', this.onPointerDown, this);
    this.scene.input.off('pointermove', this.onPointerMove, this);
    this.scene.input.off('pointerup', this.onPointerUp, this);
    this.scene.input.off('pointercancel', this.onPointerUp, this);
  }
}
