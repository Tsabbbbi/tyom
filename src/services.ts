import type { CharacterId } from './game/assets/sprites';
import { HandTracker } from './game/systems/HandTracking';
import { InputManager } from './game/systems/InputManager';

/** Long-lived singletons shared by Phaser scenes and the DOM UI. */
export const tracker = new HandTracker();
export const input = new InputManager();

export const session = {
  character: 'devil' as CharacterId,
  /** 'camera' once the user chose hand controls; 'keyboard' when they skipped. */
  controlMode: 'keyboard' as 'camera' | 'keyboard',
};

tracker.subscribe({
  onLandmarks(lm, ts) {
    input.ingestLandmarks(lm, ts);
  },
  onStatus(status) {
    if (status !== 'ready') input.clearGesture();
  },
});

export interface Flow {
  toMenu(): void;
  toSelect(): void;
  toSetup(): void;
  showHowTo(): void;
  showSettings(from: 'menu' | 'pause'): void;
  startGame(): void;
  pause(): void;
  resume(): void;
  restart(): void;
  victory(timeMs: number): void;
}
export const flow = {} as Flow;
