/**
 * 暴徒猎手 (Huntdown) 风格触屏控件 + 键盘输入统一接口
 *
 * 关键修复:
 * - 不使用 setScrollFactor(0), 改为每帧根据 camera.scroll 手动更新 UI 位置
 *   → 彻底解决 scrollFactor 对象 hit area 坐标和世界坐标不匹配的问题
 * - 摇杆 base 必须 setInteractive() 才能接收 pointerdown
 * - 每个 pointer 全程追踪 (down→move→up), 避免多指冲突
 * - pointerdown 阶段立即更新状态, 点击也能触发
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

  // 屏幕锚点 (相对 camera view)
  private anchors = {
    joystickBaseX: 160,
    joystickBaseY: 0,  // set in setup
    fireX: 0, fireY: 0,
    jumpX: 0, jumpY: 0,
    reloadX: 0, reloadY: 0,
  };

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
   *  不用 setScrollFactor(0), 每帧手动跟随 camera
   * ========================================================= */
  private setupTouchControls(): void {
    // 摇杆中心: 左下区域
    this.joystickCenterY = GAME_HEIGHT - 160;
    this.anchors.joystickBaseX = this.joystickCenterX;
    this.anchors.joystickBaseY = this.joystickCenterY;

    // 右侧按钮锚点 (屏幕相对坐标)
    this.anchors.fireX = GAME_WIDTH - 150;
    this.anchors.fireY = GAME_HEIGHT - 160;
    this.anchors.jumpX = GAME_WIDTH - 150 - 110;
    this.anchors.jumpY = GAME_HEIGHT - 160 - 40;
    this.anchors.reloadX = GAME_WIDTH - 150 - 40;
    this.anchors.reloadY = GAME_HEIGHT - 160 - 110;

    // 初始位置 (camera scrollX=0 时)
    const baseX = this.joystickCenterX;
    const baseY = this.joystickCenterY;

    // 摇杆外圈 (透明圆 显示边界)
    this.joystickBorder = this.scene.add.circle(baseX, baseY, this.joystickRadius + 10, 0xffffff, 0.08);
    this.joystickBorder.setStrokeStyle(3, 0xffffff, 0.5);
    this.joystickBorder.setDepth(1000).setInteractive();

    // 摇杆内圈 (**必须 setInteractive()** — 否则 pointerdown 不触发)
    this.joystickBase = this.scene.add.circle(baseX, baseY, this.joystickRadius, 0xffffff, 0.18);
    this.joystickBase.setStrokeStyle(3, 0xffffff, 0.4);
    this.joystickBase.setDepth(1001).setInteractive();

    // 摇杆头 (可拖拽的圆球, 也需要 interactive 确保能接收 pointerdown)
    this.joystickKnob = this.scene.add.circle(baseX, baseY, 36, 0xffffff, 0.5);
    this.joystickKnob.setStrokeStyle(2, 0xffffff, 0.8);
    this.joystickKnob.setDepth(1002).setInteractive();

    // ---- 右侧按钮区 ----
    this.btnFire = this.makeButton(this.anchors.fireX, this.anchors.fireY, 62, 0xff1744, '射');
    this.btnFireLabel = this.scene.add.text(this.anchors.fireX, this.anchors.fireY, '射', {
      fontSize: '26px', color: '#fff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(1005);

    this.btnJump = this.makeButton(this.anchors.jumpX, this.anchors.jumpY, 46, 0x4fc3f7, '跳');
    this.btnJumpLabel = this.scene.add.text(this.anchors.jumpX, this.anchors.jumpY, '跳', {
      fontSize: '20px', color: '#fff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(1005);

    this.btnReload = this.makeButton(this.anchors.reloadX, this.anchors.reloadY, 42, 0xffc107, '弹');
    this.btnReloadLabel = this.scene.add.text(this.anchors.reloadX, this.anchors.reloadY, '弹', {
      fontSize: '18px', color: '#000', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(1005);

    this.bindJoystick();
    this.bindButton(this.btnFire, this.firePointer, 'fire');
    this.bindButton(this.btnJump, this.jumpPointer, 'jump');
    this.bindButton(this.btnReload, this.reloadPointer, 'reload');

    // 第一次跟随 camera
    this.followCamera();
  }

  private makeButton(x: number, y: number, radius: number, color: number, _label: string): Phaser.GameObjects.Arc {
    const btn = this.scene.add.circle(x, y, radius, color, 0.45);
    btn.setStrokeStyle(3, color, 0.9);
    btn.setDepth(1004);
    // 用 Circle shape 做 hit area, 坐标用 local (0,0) — Phaser 会自动加按钮的 world position
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

    // 摇杆
    const jx = this.anchors.joystickBaseX + ox;
    const jy = this.anchors.joystickBaseY + oy;
    this.joystickBase?.setPosition(jx, jy);
    this.joystickBorder?.setPosition(jx, jy);
    // knob 位置也要更新, 先算相对偏移
    if (this.joystickKnob) {
      const dx = this.joystickKnob.x - (this.joystickBase?.x ?? jx);
      const dy = this.joystickKnob.y - (this.joystickBase?.y ?? jy);
      this.joystickKnob.setPosition(jx + dx, jy + dy);
    }

    // 按钮
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
      this.updateJoystick(pointer);
      // 视觉反馈: 边框加粗
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

  private bindButton(btn: Phaser.GameObjects.Arc, state: TouchState, type: 'fire' | 'jump' | 'reload'): void {
    const onDown = (pointer: Phaser.Input.Pointer) => {
      if (state.active) return;
      state.active = true;
      state.pointerId = pointer.id;
      // 视觉按压
      btn.setScale(0.88);
      (btn as any).setFillStyle?.((btn as any)._baseFill, 0.7);
      if (type === 'fire') this.firing = true;
      if (type === 'jump') this.jumpPressed = true;
      if (type === 'reload') this.reloadPressed = true;
    };
    const onUp = (pointer: Phaser.Input.Pointer) => {
      if (!state.active || pointer.id !== state.pointerId) return;
      state.active = false;
      state.pointerId = -1;
      btn.setScale(1);
      (btn as any).setFillStyle?.((btn as any)._baseFill, 0.45);
      if (type === 'fire') this.firing = false;
    };
    btn.on('pointerdown', onDown);
    btn.on('pointerup', onUp);
    btn.on('pointerupoutside', onUp);
  }

  /* =========================================================
   *  每帧更新
   * ========================================================= */
  public update(): InputSnapshot {
    // 移动端: 跟随 camera (修复 scrollFactor hit area 错位)
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

    if (Phaser.Input.Keyboard.JustDown(k.jump)) this.jumpPressed = true;
    if (Phaser.Input.Keyboard.JustDown((k as any).jumpSpace)) this.jumpPressed = true;

    if (k.fire?.isDown) {
      this.firing = true;
    } else if (!this.firePointer.active) {
      this.firing = false;
    }

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
