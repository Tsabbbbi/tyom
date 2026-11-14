import Phaser from 'phaser';
import { registerCharacterAnims } from '../entities/Player';
import { session } from '../../services';
import { createBackdrop } from './backdrop';
import { VIEW_H, VIEW_W } from '../config';

export class VictoryScene extends Phaser.Scene {
  constructor() {
    super('Victory');
  }

  create(): void {
    createBackdrop(this, { rays: true, warm: true });
    const id = session.character;
    registerCharacterAnims(this, id);

    const stage = this.add.ellipse(VIEW_W / 2, VIEW_H - 22, 200, 34, 0x000000, 0.35).setDepth(10);
    const hero = this.add.sprite(VIEW_W / 2, VIEW_H - 26, `char-${id}`, 0).setOrigin(0.5, 1).setScale(4).setDepth(11);
    hero.play(`${id}-walk-down`);
    this.tweens.add({ targets: hero, y: VIEW_H - 62, duration: 380, yoyo: true, repeat: -1, ease: 'Quad.out' });
    this.tweens.add({ targets: stage, scaleX: 0.8, duration: 380, yoyo: true, repeat: -1, ease: 'Quad.out' });

    const colors = [0x00539b, 0xd8b36a, 0xf2e6c9, 0x5fa3ee, 0xffd34d, 0xff6b8b];
    this.time.addEvent({
      delay: 45,
      loop: true,
      callback: () => {
        const c = this.add.rectangle(Phaser.Math.Between(0, VIEW_W), -10, Phaser.Math.Between(4, 8), Phaser.Math.Between(4, 8), colors[Phaser.Math.Between(0, colors.length - 1)]).setDepth(20);
        this.tweens.add({
          targets: c,
          y: VIEW_H + 20,
          x: c.x + Phaser.Math.Between(-80, 80),
          angle: Phaser.Math.Between(-540, 540),
          duration: Phaser.Math.Between(2200, 4200),
          onComplete: () => c.destroy(),
        });
      },
    });
    this.cameras.main.fadeIn(500, 11, 18, 38);
  }
}
