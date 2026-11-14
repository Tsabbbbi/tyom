import Phaser from 'phaser';
import { BOOKS, DESK, HITBOX, MAP, PILLARS, PLANTS, SPAWN, TABLES, TILE, WORLD_H, WORLD_W, tileCenter } from '../data/libraryMap';
import { CollectibleBook } from '../entities/CollectibleBook';
import { Player } from '../entities/Player';
import { audio } from '../systems/AudioManager';
import { flow, input, session } from '../../services';
import { hud } from '../../ui/hud';
import { VIEW_H, VIEW_W } from '../config';

export type PlayState = 'playing' | 'paused' | 'won';

export class LibraryScene extends Phaser.Scene {
  player!: Player;
  books: CollectibleBook[] = [];
  collected = 0;
  state: PlayState = 'playing';
  elapsedMs = 0;
  private winning = false;

  constructor() {
    super('Library');
  }

  create(): void {
    this.collected = 0;
    this.elapsedMs = 0;
    this.state = 'playing';
    this.winning = false;
    this.books = [];

    this.add.image(0, 0, 'base').setOrigin(0, 0).setDepth(0);

    MAP.shelfRuns.forEach((run, i) => {
      const bottom = (run.y + 1) * TILE;
      this.add.image(run.x * TILE, bottom, `shelf-${i}`).setOrigin(0, 1).setDepth(bottom);
    });
    TABLES.forEach((t, i) => {
      const bottom = (t.y + t.h) * TILE;
      this.add.image(t.x * TILE, bottom, `table-${i}`).setOrigin(0, 1).setDepth(bottom - 2);
      this.add.ellipse(t.x * TILE + (t.w * TILE) / 2, bottom + 2, t.w * TILE + 6, 12, 0x000000, 0.22).setDepth(bottom - 3);
    });
    {
      const bottom = (DESK.y + 1) * TILE;
      this.add.image(DESK.x * TILE, bottom, 'desk').setOrigin(0, 1).setDepth(bottom - 2);
    }
    for (const p of PILLARS) {
      const bottom = (p.ty + 1) * TILE;
      this.add.image(p.tx * TILE, bottom, 'pillar').setOrigin(0, 1).setDepth(bottom - 2);
    }
    for (const p of PLANTS) {
      const bottom = (p.ty + 1) * TILE;
      this.add.image(p.tx * TILE, bottom, 'plant').setOrigin(0, 1).setDepth(bottom - 2);
    }

    const spawn = tileCenter(SPAWN.tx, SPAWN.ty);
    this.player = new Player(this, session.character, spawn.x, spawn.y + HITBOX.h / 2);
    this.books = BOOKS.map((b) => new CollectibleBook(this, b));

    // warm lighting + dust
    this.add.image(0, 0, 'glow-map').setOrigin(0, 0).setDepth(9000).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.8);
    for (let i = 0; i < 70; i++) {
      const m = this.add.image(Phaser.Math.Between(60, WORLD_W - 60), Phaser.Math.Between(100, WORLD_H - 60), 'px').setDepth(9001).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD).setTint(0xffe6a8);
      this.tweens.add({
        targets: m,
        x: m.x + Phaser.Math.Between(-40, 40),
        y: m.y - Phaser.Math.Between(20, 60),
        alpha: { from: 0, to: 0.7 },
        duration: Phaser.Math.Between(2500, 5000),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 4000),
        ease: 'Sine.inOut',
      });
    }

    const cam = this.cameras.main;
    cam.setBounds(0, 0, WORLD_W, WORLD_H);
    cam.setRoundPixels(true);
    cam.startFollow(this.player.sprite, true, 0.14, 0.14, 0, 24);
    cam.centerOn(this.player.x, this.player.y);
    cam.fadeIn(450, 11, 18, 38);
    cam.setViewport(0, 0, VIEW_W, VIEW_H);

    hud.reset(BOOKS.length);
    audio.playMusic('library');
  }

  update(time: number, delta: number): void {
    const dt = Math.min(delta, 50) / 1000;
    if (this.state === 'playing') {
      this.elapsedMs += delta;
      const dir = input.direction();
      this.player.update(dt, dir);
      const hit = this.player.hitbox;
      for (const b of this.books) {
        if (!b.collected && b.overlaps(hit)) this.collectBook(b);
      }
    } else {
      this.player.stop();
    }
    input.tick();
    hud.minimap.update(
      this.player.x,
      this.player.y - HITBOX.h / 2,
      this.books.filter((b) => !b.collected),
      time,
    );
  }

  private collectBook(b: CollectibleBook): void {
    b.collect();
    this.collected++;
    hud.setBooks(this.collected, BOOKS.length);
    hud.toast(`BOOK COLLECTED!`, b.spot.title);
    audio.bookCollect();
    if (this.collected >= BOOKS.length) {
      this.win();
    } else {
      audio.voice(this.collected === 3 ? 'Great job!' : 'Book collected!');
    }
  }

  private win(): void {
    if (this.winning) return;
    this.winning = true;
    this.state = 'won';
    input.clear();
    this.player.stop();
    audio.fanfare();
    window.setTimeout(() => audio.voice('Library complete!'), 500);
    const cam = this.cameras.main;
    cam.flash(500, 255, 240, 180);
    cam.zoomTo(1.5, 1200, 'Sine.easeInOut');
    // little celebration hop + confetti
    this.tweens.add({ targets: this.player.sprite, y: this.player.sprite.y - 14, duration: 180, yoyo: true, repeat: 3, ease: 'Quad.out' });
    const colors = [0x00539b, 0xd8b36a, 0xf2e6c9, 0x5fa3ee, 0xffd34d];
    for (let i = 0; i < 70; i++) {
      const c = this.add.rectangle(this.player.x, this.player.y - 40, 4, 4, colors[i % colors.length]).setDepth(9500);
      this.tweens.add({
        targets: c,
        x: this.player.x + Phaser.Math.Between(-150, 150),
        y: this.player.y + Phaser.Math.Between(-130, 60),
        angle: Phaser.Math.Between(-360, 360),
        alpha: 0,
        duration: Phaser.Math.Between(900, 1600),
        ease: 'Cubic.out',
        onComplete: () => c.destroy(),
      });
    }
    this.time.delayedCall(2200, () => flow.victory(this.elapsedMs));
  }

  setPaused(p: boolean): void {
    if (this.state === 'won') return;
    this.state = p ? 'paused' : 'playing';
    if (p) {
      input.clear();
      this.player.stop();
    }
  }

  /** Debug / test helper */
  teleportToTile(tx: number, ty: number): void {
    const c = tileCenter(tx, ty);
    this.player.teleport(c.x, c.y + HITBOX.h / 2);
    this.cameras.main.centerOn(this.player.x, this.player.y);
  }
}
