import {
  classifyGesture,
  GestureSmoother,
  type ClassificationResult,
  type Direction,
  type Landmark,
} from './GestureClassifier';
import { settings } from './Settings';

const KEY_MAP: Record<string, Direction> = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
};

/** A gesture older than this is considered stale (tracking stalled) and ignored. */
const GESTURE_TTL_MS = 300;

export interface GestureState {
  handDetected: boolean;
  direction: Direction | null;
  reason: ClassificationResult['reason'];
}

type StateListener = (s: GestureState) => void;

/**
 * Combines keyboard and hand-gesture input.
 * Priority (deterministic): keyboard (most recently pressed held key) > gesture > nothing.
 */
export class InputManager {
  private keyStack: Direction[] = [];
  private smoother = new GestureSmoother({ framesToSwitch: 2, framesToStop: 2 });
  private gestureDir: Direction | null = null;
  private lastGestureAt = 0;
  private hand = false;
  private reason: ClassificationResult['reason'] = 'no-hand';
  private listeners = new Set<StateListener>();
  private lastEmitted = '';
  /** Called when the window loses focus / tab hidden (used to auto-pause). */
  onFocusLost: (() => void) | null = null;
  /** Escape / P pressed. */
  onPauseKey: (() => void) | null = null;

  constructor() {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) {
        if (KEY_MAP[e.code]) e.preventDefault();
        return;
      }
      const d = KEY_MAP[e.code];
      if (d) {
        if (!(e.target instanceof HTMLInputElement)) e.preventDefault();
        this.keyStack = this.keyStack.filter((k) => k !== d);
        this.keyStack.push(d);
      } else if (e.code === 'Escape' || e.code === 'KeyP') {
        this.onPauseKey?.();
      }
    });
    window.addEventListener('keyup', (e) => {
      const d = KEY_MAP[e.code];
      if (d) this.keyStack = this.keyStack.filter((k) => k !== d);
    });
    const lost = () => {
      this.clear();
      this.onFocusLost?.();
    };
    window.addEventListener('blur', lost);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) lost();
    });
  }

  subscribe(l: StateListener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  /** Feed landmarks from the tracker (or mocks in tests). `null` = no hand visible. */
  ingestLandmarks(lm: Landmark[] | null, now = performance.now()): ClassificationResult {
    if (!lm) {
      // Tracking lost: clear immediately, never keep a stale direction.
      this.smoother.reset();
      this.gestureDir = null;
      this.hand = false;
      this.reason = 'no-hand';
      this.emit();
      return { direction: null, angle: null, reason: 'no-hand' };
    }
    const result = classifyGesture(lm, { mirrored: settings.value.mirror }, this.smoother.direction);
    this.gestureDir = this.smoother.update(result.direction);
    this.lastGestureAt = now;
    this.hand = true;
    this.reason = result.reason;
    this.emit();
    return result;
  }

  /** Reset all gesture state (camera stopped, scene change). */
  clearGesture(): void {
    this.smoother.reset();
    this.gestureDir = null;
    this.hand = false;
    this.reason = 'no-hand';
    this.emit();
  }

  clear(): void {
    this.keyStack = [];
    this.clearGesture();
  }

  /** The direction the player should walk this frame. */
  direction(now = performance.now()): Direction | null {
    const k = this.keyStack[this.keyStack.length - 1];
    if (k) return k;
    if (this.gestureDir && now - this.lastGestureAt <= GESTURE_TTL_MS) return this.gestureDir;
    return null;
  }

  get gestureState(): GestureState {
    const fresh = performance.now() - this.lastGestureAt <= GESTURE_TTL_MS;
    return {
      handDetected: this.hand && fresh,
      direction: this.gestureDir && fresh ? this.gestureDir : null,
      reason: this.reason,
    };
  }

  /** Re-emits state; also expires stale gestures. */
  tick(): void {
    this.emit();
  }

  private emit(): void {
    const s = this.gestureState;
    const sig = `${s.handDetected}|${s.direction}`;
    if (sig === this.lastEmitted) return;
    this.lastEmitted = sig;
    this.listeners.forEach((l) => l(s));
  }
}
