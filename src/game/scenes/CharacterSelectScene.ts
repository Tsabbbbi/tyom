import Phaser from 'phaser';
import { createBackdrop } from './backdrop';

export class CharacterSelectScene extends Phaser.Scene {
  constructor() {
    super('CharacterSelect');
  }
  create(): void {
    createBackdrop(this, { warm: true });
  }
}
