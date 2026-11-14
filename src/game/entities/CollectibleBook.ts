import Phaser from 'phaser';
import type { BookSpot } from '../data/libraryMap';
import { tileCenter } from '../data/libraryMap';

export const PICKUP_RADIUS = 24;

export class CollectibleBook {
  readonly x: number;
  readonly y: number;
  collected = false;
  private sprite: Phaser.GameObjects.Image;
  private glow: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Ellipse;
  private sparkTimer: Phaser.Time.TimerEvent;

  constructor(private scene: Phaser.Scene, readonly spot: BookSpot) {
    const c = tileCenter(spot.tx, spot.ty);
    this.x = c.x;
    this.y = c.y;
    this.glow = scene.add.image(c.x, c.y - 12, 'glow-dot').setBlendMode(Phaser.BlendModes.ADD).setDepth(c.y + 6).setScale(1.6).setAlpha(0.7);
    this.shadow = scene.add.ellipse(c.x, c.y + 8, 18, 6, 0x000000, 0.3).setDepth(c.y + 5);
    this.sprite = scene.add.image(c.x, c.y - 12, `book-${spot.id}`).setDepth(c.y + 8);
    scene.tweens.add({ targets: this.sprite, y: c.y - 18, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    scene.tweens.add({ targets: this.glow, alpha: { from: 0.4, to: 0.95 }, scale: { from: 1.3, to: 1.9 }, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    scene.tweens.add({ targets: this.shadow, scaleX: { from: 1, to: 0.75 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.sparkTimer = scene.time.addEvent({ delay: 380, loop: true, callback: () => this.spark() });
  }

  private spark(): void {
    if (this.collected) return;
    const s = this.scene.add
      .image(this.x + Phaser.Math.Between(-16, 16), this.y - 12 + Phaser.Math.Between(-18, 10), 'spark')
      .setDepth(this.y + 20)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(Phaser.Math.Between(1, 2));
    this.scene.tweens.add({ targets: s, alpha: 0, y: s.y - 10, duration: 700, onComplete: () => s.destroy() });
  }

  overlaps(hit: { x: number; y: number; w: number; h: number }): boolean {
    // distance from the book centre to the player's hitbox rect
    const cx = Phaser.Math.Clamp(this.x, hit.x, hit.x + hit.w);
    const cy = Phaser.Math.Clamp(this.y, hit.y, hit.y + hit.h);
    return Math.hypot(this.x - cx, this.y - cy) <= PICKUP_RADIUS;
  }

  collect(): void {
    if (this.collected) return;
    this.collected = true;
    this.sparkTimer.remove();
    this.scene.tweens.killTweensOf([this.sprite, this.glow, this.shadow]);
    this.shadow.destroy();
    this.scene.tweens.add({
      targets: [this.sprite, this.glow],
      y: '-=34',
      scale: { from: 1, to: 1.7 },
      alpha: 0,
      duration: 420,
      ease: 'Back.out',
      onComplete: () => {
        this.sprite.destroy();
        this.glow.destroy();
      },
    });
    // burst
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const p = this.scene.add.image(this.x, this.y - 12, 'spark').setDepth(this.y + 30).setBlendMode(Phaser.BlendModes.ADD).setScale(2);
      this.scene.tweens.add({
        targets: p,
        x: this.x + Math.cos(a) * 46,
        y: this.y - 12 + Math.sin(a) * 36,
        alpha: 0,
        duration: 520,
        ease: 'Cubic.out',
        onComplete: () => p.destroy(),
      });
    }
  }
}
