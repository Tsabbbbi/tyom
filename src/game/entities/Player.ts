import Phaser from 'phaser';
import { HITBOX, rectHitsSolid } from '../data/libraryMap';
import type { Direction } from '../systems/GestureClassifier';
import { DIR_ROWS, FRAME_COLS, type CharacterId, type Dir } from '../assets/sprites';
import { audio } from '../systems/AudioManager';

export const PLAYER_SPEED = 165; // px / s, constant (no acceleration)
const NUDGE = 10; // corner-assist range in px

export function registerCharacterAnims(scene: Phaser.Scene, id: CharacterId): void {
  const key = `char-${id}`;
  DIR_ROWS.forEach((dir, row) => {
    const base = row * FRAME_COLS;
    const idle = `${id}-idle-${dir}`;
    const walk = `${id}-walk-${dir}`;
    if (!scene.anims.exists(idle)) {
      scene.anims.create({ key: idle, frames: [0, 1].map((i) => ({ key, frame: base + i })), frameRate: 2.5, repeat: -1 });
    }
    if (!scene.anims.exists(walk)) {
      scene.anims.create({ key: walk, frames: [2, 3, 4, 5].map((i) => ({ key, frame: base + i })), frameRate: 9, repeat: -1 });
    }
  });
}

export class Player {
  readonly sprite: Phaser.GameObjects.Sprite;
  private shadow: Phaser.GameObjects.Ellipse;
  /** Feet position in world pixels. */
  x: number;
  y: number;
  facing: Dir = 'down';
  moving = false;

  constructor(scene: Phaser.Scene, readonly id: CharacterId, x: number, y: number) {
    this.x = x;
    this.y = y;
    registerCharacterAnims(scene, id);
    this.shadow = scene.add.ellipse(x, y - 2, 22, 8, 0x000000, 0.3);
    this.sprite = scene.add.sprite(x, y + 1, `char-${id}`, 0).setOrigin(0.5, 1);
    this.sprite.play(`${id}-idle-down`);
    this.syncSprite();
  }

  get hitbox(): { x: number; y: number; w: number; h: number } {
    return { x: this.x - HITBOX.w / 2, y: this.y - HITBOX.h, w: HITBOX.w, h: HITBOX.h };
  }

  private free(x: number, y: number): boolean {
    return !rectHitsSolid(x - HITBOX.w / 2, y - HITBOX.h, HITBOX.w, HITBOX.h);
  }

  /** Advance one frame. `dir` null means stand still. */
  /** False once the scene has shut down and Phaser destroyed the sprite. */
  get alive(): boolean {
    return !!this.sprite.scene && this.sprite.active;
  }

  update(dtSec: number, dir: Direction | null): void {
    if (!this.alive) return;
    let moved = false;
    if (dir) {
      this.facing = dir;
      const step = PLAYER_SPEED * dtSec;
      const vx = dir === 'left' ? -step : dir === 'right' ? step : 0;
      const vy = dir === 'up' ? -step : dir === 'down' ? step : 0;
      moved = this.tryMove(vx, vy);
      if (!moved) audio.bump();
    }
    this.setMoving(moved);
    this.syncSprite();
    if (moved) audio.footstep();
  }

  private tryMove(vx: number, vy: number): boolean {
    const nx = this.x + vx;
    const ny = this.y + vy;
    if (this.free(nx, ny)) {
      this.x = nx;
      this.y = ny;
      return true;
    }
    // Corner assist: when clipping a corner, slide sideways toward the nearest opening.
    const stepLen = Math.abs(vx) + Math.abs(vy);
    for (let n = 1; n <= NUDGE; n++) {
      for (const sgn of [1, -1]) {
        const tx = vx === 0 ? this.x + sgn * n : nx;
        const ty = vy === 0 ? this.y + sgn * n : ny;
        if (!this.free(tx, ty)) continue;
        const slide = Math.min(n, stepLen);
        const fx = vx === 0 ? this.x + sgn * slide : nx;
        const fy = vy === 0 ? this.y + sgn * slide : ny;
        if (this.free(fx, fy)) {
          this.x = fx;
          this.y = fy;
          return true;
        }
      }
    }
    // Partial move up to the obstacle edge so the player can stand flush against walls.
    const sx = Math.sign(vx);
    const sy = Math.sign(vy);
    let moved = false;
    for (let i = 0; i < Math.ceil(Math.abs(vx || vy)); i++) {
      if (this.free(this.x + sx, this.y + sy)) {
        this.x += sx;
        this.y += sy;
        moved = true;
      } else break;
    }
    return moved;
  }

  setMoving(m: boolean): void {
    if (!this.alive) return;
    if (m === this.moving && this.sprite.anims.currentAnim?.key.endsWith(this.facing)) return;
    this.moving = m;
    this.sprite.play(`${this.id}-${m ? 'walk' : 'idle'}-${this.facing}`, true);
  }

  stop(): void {
    this.setMoving(false);
  }

  teleport(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.syncSprite();
  }

  private syncSprite(): void {
    if (!this.alive) return;
    const px = Math.round(this.x);
    const py = Math.round(this.y);
    this.sprite.setPosition(px, py + 1);
    this.shadow.setPosition(px, py - 2);
    this.sprite.setDepth(py);
    this.shadow.setDepth(py - 1);
  }

  destroy(): void {
    this.sprite.destroy();
    this.shadow.destroy();
  }
}
