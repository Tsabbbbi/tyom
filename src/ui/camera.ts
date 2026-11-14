import { drawLandmarks, type TrackerStatus } from '../game/systems/HandTracking';
import { settings } from '../game/systems/Settings';
import type { Direction } from '../game/systems/GestureClassifier';
import { input, session, tracker } from '../services';

const ARROW: Record<Direction, string> = { up: '▲ UP', down: '▼ DOWN', left: '◀ LEFT', right: '▶ RIGHT' };

type Mode = 'hidden' | 'setup' | 'hud';

/** Owns the single camera-preview DOM node (#cam) and keeps it in sync with tracker + gesture state. */
class CameraUI {
  readonly el = document.getElementById('cam') as HTMLElement;
  readonly video = document.getElementById('cam-video') as HTMLVideoElement;
  readonly overlay = document.getElementById('cam-overlay') as HTMLCanvasElement;
  private statusEl = document.getElementById('cam-status') as HTMLElement;
  private mode: Mode = 'hidden';
  private listeners = new Set<() => void>();

  init(): void {
    this.overlay.width = 320;
    this.overlay.height = 240;
    tracker.subscribe({
      onStatus: () => {
        if (tracker.status !== 'ready') drawLandmarks(this.overlay, null, null);
        this.render();
        this.listeners.forEach((l) => l());
      },
      onLandmarks: (lm) => drawLandmarks(this.overlay, lm, input.gestureState.direction),
    });
    input.subscribe(() => {
      this.render();
      this.listeners.forEach((l) => l());
    });
    settings.subscribe(() => this.render());
    this.render();
  }

  onChange(l: () => void): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  setMode(mode: Mode, slot?: HTMLElement): void {
    this.mode = mode;
    if (mode === 'setup' && slot) slot.appendChild(this.el);
    else document.getElementById('app')!.appendChild(this.el);
    this.render();
  }

  /** Request the camera and start tracking (needs a user gesture on some browsers). */
  async enable(): Promise<void> {
    session.controlMode = 'camera';
    await tracker.start(this.video);
    if (tracker.status !== 'ready') session.controlMode = 'keyboard';
    this.render();
  }

  disable(): void {
    tracker.stop();
    input.clearGesture();
    this.render();
  }

  private statusLabel(s: TrackerStatus): { text: string; cls: string } {
    switch (s) {
      case 'ready':
        return { text: 'CAMERA ON', cls: 'ok' };
      case 'requesting-camera':
        return { text: 'ALLOW CAMERA…', cls: 'wait' };
      case 'loading-model':
        return { text: 'LOADING TRACKER…', cls: 'wait' };
      case 'denied':
        return { text: 'CAMERA BLOCKED', cls: 'bad' };
      case 'no-camera':
        return { text: 'NO CAMERA', cls: 'bad' };
      case 'error':
        return { text: 'CAMERA ERROR', cls: 'bad' };
      default:
        return { text: session.controlMode === 'keyboard' ? 'KEYBOARD MODE' : 'CAMERA OFF', cls: 'off' };
    }
  }

  render(): void {
    const s = settings.value;
    const camOn = tracker.status === 'ready';
    const cam = this.statusLabel(tracker.status);
    const g = input.gestureState;
    this.el.className = `cam cam--${this.mode}${s.mirror ? ' cam--mirror' : ''}`;
    const showFrame = this.mode === 'setup' || (this.mode === 'hud' && camOn && s.showCamera);
    this.el.classList.toggle('cam--noframe', !showFrame);
    this.el.classList.toggle('cam--hidden', this.mode === 'hidden');
    const hand = camOn ? (g.handDetected ? '<span class="ok">HAND DETECTED</span>' : '<span class="off">NO HAND</span>') : '<span class="off">NO HAND</span>';
    const dir = g.direction ? `<span class="ok">${ARROW[g.direction]}</span>` : '<span class="off">STOP</span>';
    this.statusEl.innerHTML = `
      <div class="cam__row"><i class="dot ${cam.cls}"></i>${cam.text}</div>
      <div class="cam__row"><i class="dot ${camOn && g.handDetected ? 'ok' : 'off'}"></i>${hand}</div>
      <div class="cam__row"><i class="dot ${g.direction ? 'ok' : 'off'}"></i>POINT: ${dir}</div>`;
  }
}

export const camera = new CameraUI();
