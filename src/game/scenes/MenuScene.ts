import Phaser from 'phaser';
import { createBackdrop } from './backdrop';

/** Animated backdrop behind the DOM title screen / tutorial / settings. */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }
  create(): void {
    createBackdrop(this);
  }
}
