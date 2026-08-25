export interface InputSnapshot {
  moveX: number; // -1..1 strafe (right positive)
  moveY: number; // -1..1 forward positive
  lookDX: number; // yaw delta since last poll
  lookDY: number; // pitch delta since last poll
  firing: boolean;
  ads: boolean;
  sprint: boolean;
  jumpPressed: boolean; // edge
  reloadPressed: boolean; // edge
  weaponSelect: number | null; // edge, 0-based index
  weaponCycle: 1 | -1 | null; // edge
  pointerLocked: boolean;
}

const KEY_TO_DIGIT: Record<string, number> = {
  Digit1: 0,
  Digit2: 1,
  Digit3: 2,
  Digit4: 3,
  Digit5: 4,
};

export function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

export class InputController {
  private keys = new Set<string>();
  private mouseDX = 0;
  private mouseDY = 0;
  private mobileLookDX = 0;
  private mobileLookDY = 0;
  private mobileMoveX = 0;
  private mobileMoveY = 0;
  private mouseFiring = false;
  private mobileFiring = false;
  private mouseAds = false;
  private mobileAds = false;
  private mobileSprint = false;
  private jumpEdge = false;
  private reloadEdge = false;
  private weaponSelectEdge: number | null = null;
  private weaponCycleEdge: 1 | -1 | null = null;
  private locked = false;
  private canvas: HTMLCanvasElement | null = null;
  readonly sensitivity = { mouse: 0.0022, touch: 0.0032 };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.locked) return;
    this.mouseDX += e.movementX * this.sensitivity.mouse;
    this.mouseDY += e.movementY * this.sensitivity.mouse;
  };

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys.add(e.code);
    if (e.code === "Space") this.jumpEdge = true;
    if (e.code === "KeyR") this.reloadEdge = true;
    if (e.code in KEY_TO_DIGIT) this.weaponSelectEdge = KEY_TO_DIGIT[e.code];
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private onMouseDown = (e: MouseEvent) => {
    if (!this.locked) return;
    if (e.button === 0) this.mouseFiring = true;
    if (e.button === 2) this.mouseAds = true;
  };

  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) this.mouseFiring = false;
    if (e.button === 2) this.mouseAds = false;
  };

  private onWheel = (e: WheelEvent) => {
    this.weaponCycleEdge = e.deltaY > 0 ? 1 : -1;
  };

  private onContextMenu = (e: Event) => e.preventDefault();

  private onPointerLockChange = () => {
    this.locked = document.pointerLockElement === this.canvas;
  };

  attach(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("mouseup", this.onMouseUp);
    window.addEventListener("wheel", this.onWheel);
    canvas.addEventListener("contextmenu", this.onContextMenu);
    document.addEventListener("pointerlockchange", this.onPointerLockChange);
  }

  dispose() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("mousemove", this.onMouseMove);
    window.removeEventListener("mousedown", this.onMouseDown);
    window.removeEventListener("mouseup", this.onMouseUp);
    window.removeEventListener("wheel", this.onWheel);
    this.canvas?.removeEventListener("contextmenu", this.onContextMenu);
    document.removeEventListener("pointerlockchange", this.onPointerLockChange);
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
  }

  requestPointerLock() {
    this.canvas?.requestPointerLock();
  }

  isPointerLocked() {
    return this.locked;
  }

  // --- mobile touch UI hooks (driven by React overlay components) ---
  setMobileMove(x: number, y: number) {
    this.mobileMoveX = Math.max(-1, Math.min(1, x));
    this.mobileMoveY = Math.max(-1, Math.min(1, y));
  }

  addMobileLook(dx: number, dy: number) {
    this.mobileLookDX += dx * this.sensitivity.touch;
    this.mobileLookDY += dy * this.sensitivity.touch;
  }

  setMobileFiring(v: boolean) {
    this.mobileFiring = v;
  }

  setMobileAds(v: boolean) {
    this.mobileAds = v;
  }

  setMobileSprint(v: boolean) {
    this.mobileSprint = v;
  }

  triggerMobileJump() {
    this.jumpEdge = true;
  }

  triggerMobileReload() {
    this.reloadEdge = true;
  }

  selectMobileWeapon(index: number) {
    this.weaponSelectEdge = index;
  }

  cycleMobileWeapon(dir: 1 | -1) {
    this.weaponCycleEdge = dir;
  }

  /** Reads and clears the per-frame accumulators. Call once per render frame. */
  poll(): InputSnapshot {
    const keyMoveX = (this.keys.has("KeyD") ? 1 : 0) - (this.keys.has("KeyA") ? 1 : 0);
    const keyMoveY = (this.keys.has("KeyW") ? 1 : 0) - (this.keys.has("KeyS") ? 1 : 0);

    const snapshot: InputSnapshot = {
      moveX: keyMoveX !== 0 ? keyMoveX : this.mobileMoveX,
      moveY: keyMoveY !== 0 ? keyMoveY : this.mobileMoveY,
      lookDX: this.mouseDX + this.mobileLookDX,
      lookDY: this.mouseDY + this.mobileLookDY,
      firing: this.mouseFiring || this.mobileFiring,
      ads: this.mouseAds || this.mobileAds,
      sprint: this.keys.has("ShiftLeft") || this.keys.has("ShiftRight") || this.mobileSprint,
      jumpPressed: this.jumpEdge,
      reloadPressed: this.reloadEdge,
      weaponSelect: this.weaponSelectEdge,
      weaponCycle: this.weaponCycleEdge,
      pointerLocked: this.locked,
    };

    this.mouseDX = 0;
    this.mouseDY = 0;
    this.mobileLookDX = 0;
    this.mobileLookDY = 0;
    this.jumpEdge = false;
    this.reloadEdge = false;
    this.weaponSelectEdge = null;
    this.weaponCycleEdge = null;

    return snapshot;
  }
}
