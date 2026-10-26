/**
 * NEXUS — Universal Input Manager (Section 9).
 * Uses physical KeyboardEvent.code so BOTH French AZERTY (ZQSD) and English QWERTY (WASD) work automatically,
 * plus full custom key rebinding, Gamepad API support, and iframe-safe PointerLock + Drag/Arrow camera look.
 */

export const DEFAULT_KEYBINDS = {
  forward: 'KeyW',
  backward: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  jump: 'Space',
  sprint: 'ShiftLeft',
  interact: 'KeyE',
  dodge: 'KeyC',
  parry: 'KeyQ',
  heavy: 'KeyF',
  reload: 'KeyR',
  lockTarget: 'Tab',
  hint: 'KeyH',
  map: 'KeyM'
};

export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.bindings = { ...DEFAULT_KEYBINDS };
    try {
      const saved = JSON.parse(localStorage.getItem('nexus_keybinds_v1') || 'null');
      if (saved && typeof saved === 'object') Object.assign(this.bindings, saved);
    } catch {
      // ignore
    }

    this.keysDown = new Set();
    this.keysJustPressed = new Set();
    this.mouseButtons = new Set();
    this.mouseJustPressed = new Set();
    this.lookDeltaX = 0;
    this.lookDeltaY = 0;
    this.isPointerLocked = false;
    this.awaitingRebindAction = null;
    this.onRebindComplete = null;
    this._dragging = false;
    this._lastClientX = 0;
    this._lastClientY = 0;

    this._bindEvents();
  }

  _bindEvents() {
    window.addEventListener('keydown', (e) => {
      if (this.awaitingRebindAction) {
        e.preventDefault();
        if (e.code !== 'Escape') {
          this.bindings[this.awaitingRebindAction] = e.code;
          try {
            localStorage.setItem('nexus_keybinds_v1', JSON.stringify(this.bindings));
          } catch {
            // ignore
          }
        }
        const cb = this.onRebindComplete;
        this.awaitingRebindAction = null;
        if (cb) cb(this.bindings);
        return;
      }
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        if (document.activeElement === document.body || document.activeElement === this.canvas) {
          e.preventDefault();
        }
      }
      if (!this.keysDown.has(e.code)) {
        this.keysJustPressed.add(e.code);
      }
      this.keysDown.add(e.code);
    });

    window.addEventListener('keyup', (e) => {
      this.keysDown.delete(e.code);
    });

    window.addEventListener('blur', () => {
      this.keysDown.clear();
      this.mouseButtons.clear();
      this._dragging = false;
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.canvas;
    });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    this.canvas.addEventListener('mousedown', (e) => {
      this.mouseButtons.add(e.button);
      this.mouseJustPressed.add(e.button);
      this._dragging = true;
      this._lastClientX = e.clientX;
      this._lastClientY = e.clientY;
    });

    window.addEventListener('mouseup', (e) => {
      this.mouseButtons.delete(e.button);
      if (this.mouseButtons.size === 0) this._dragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isPointerLocked) {
        this.lookDeltaX += e.movementX * 0.0024;
        this.lookDeltaY += e.movementY * 0.0020;
      } else if (this._dragging) {
        const dx = e.clientX - this._lastClientX;
        const dy = e.clientY - this._lastClientY;
        this._lastClientX = e.clientX;
        this._lastClientY = e.clientY;
        this.lookDeltaX += dx * 0.0042;
        this.lookDeltaY += dy * 0.0034;
      }
    });
  }

  requestPointerCaptureSafe() {
    if (!this.canvas || this.isPointerLocked) return;
    try {
      const p = this.canvas.requestPointerLock?.();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch {
      // Safe fallback to drag/keyboard look inside restricted iframes
    }
  }

  releasePointerCaptureSafe() {
    try {
      if (document.pointerLockElement) document.exitPointerLock?.();
    } catch {
      // ignore
    }
  }

  startRebind(actionName, callback) {
    this.awaitingRebindAction = actionName;
    this.onRebindComplete = callback;
  }

  resetDefaultBinds() {
    this.bindings = { ...DEFAULT_KEYBINDS };
    try {
      localStorage.setItem('nexus_keybinds_v1', JSON.stringify(this.bindings));
    } catch {
      // ignore
    }
  }

  isActionDown(action) {
    const code = this.bindings[action];
    if (code && this.keysDown.has(code)) return true;
    // Secondary ergonomic aliases
    if (action === 'sprint' && this.keysDown.has('ShiftRight')) return true;
    if (action === 'dodge' && this.keysDown.has('AltLeft')) return true;
    return false;
  }

  wasActionPressed(action) {
    const code = this.bindings[action];
    if (code && this.keysJustPressed.has(code)) return true;
    if (action === 'dodge' && this.keysJustPressed.has('AltLeft')) return true;
    return false;
  }

  pollGamepadState(dt) {
    const gpState = {
      moveX: 0,
      moveZ: 0,
      sprint: false,
      jump: false,
      primary: false,
      secondary: false,
      interact: false,
      dodge: false,
      parry: false,
      reload: false
    };
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return gpState;
    const pads = navigator.getGamepads();
    const gp = pads && (pads[0] || pads[1]);
    if (!gp) return gpState;

    const dead = (v) => (Math.abs(v) > 0.18 ? v : 0);
    gpState.moveX = dead(gp.axes[0] || 0);
    gpState.moveZ = dead(gp.axes[1] || 0);
    this.lookDeltaX += dead(gp.axes[2] || 0) * 2.4 * dt;
    this.lookDeltaY += dead(gp.axes[3] || 0) * 1.8 * dt;

    gpState.jump = Boolean(gp.buttons[0]?.pressed);
    gpState.dodge = Boolean(gp.buttons[1]?.pressed);
    gpState.interact = Boolean(gp.buttons[2]?.pressed);
    gpState.reload = Boolean(gp.buttons[3]?.pressed);
    gpState.parry = Boolean(gp.buttons[4]?.pressed);
    gpState.secondary = Boolean(gp.buttons[6]?.pressed);
    gpState.primary = Boolean(gp.buttons[7]?.pressed);
    gpState.sprint = Boolean(gp.buttons[10]?.pressed);
    return gpState;
  }

  consumeFrameDeltas(dt) {
    if (this.keysDown.has('ArrowLeft')) this.lookDeltaX -= 2.1 * dt;
    if (this.keysDown.has('ArrowRight')) this.lookDeltaX += 2.1 * dt;
    if (this.keysDown.has('ArrowUp')) this.lookDeltaY -= 1.45 * dt;
    if (this.keysDown.has('ArrowDown')) this.lookDeltaY += 1.45 * dt;

    const dx = this.lookDeltaX;
    const dy = this.lookDeltaY;
    this.lookDeltaX = 0;
    this.lookDeltaY = 0;
    this.keysJustPressed.clear();
    this.mouseJustPressed.clear();
    return { dx, dy };
  }
}
